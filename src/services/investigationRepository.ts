import { isSupabaseConfigured, supabase } from './supabaseClient';
import {
  InvestigationRecord,
  listSavedInvestigations as listLocalStorageInvestigations,
  saveInvestigation as saveLocalStorageInvestigation,
  loadInvestigation as loadLocalStorageInvestigation,
  deleteInvestigation as deleteLocalStorageInvestigation,
} from './investigationStore';

/**
 * Clean persistence repository abstraction for OceanTrace AI.
 * 
 * Strict Error Handling Rule:
 * When Supabase is configured and the user is authenticated, database query failures
 * will NOT silently fall back to localStorage. A clear persistence error is returned.
 * Local fallback is used ONLY when Supabase is intentionally unconfigured.
 */

export interface RepositoryOperationResult<T> {
  data?: T;
  ok?: boolean;
  error?: string;
}

export const listUserInvestigations = async (
  userId?: string
): Promise<RepositoryOperationResult<InvestigationRecord[]>> => {
  if (!isSupabaseConfigured() || !supabase) {
    // Intentionally unconfigured: safe local development fallback
    return { ok: true, data: listLocalStorageInvestigations() };
  }

  if (!userId) {
    return { ok: true, data: [] };
  }

  try {
    const { data, error } = await supabase
      .from('investigations')
      .select('id, investigation_id, status, data, created_at, updated_at')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Supabase listUserInvestigations error:', error);
      return {
        ok: false,
        error: `Database persistence error (${error.code || 'RLS/Query'}): ${error.message}. Saved records could not be fetched from Supabase.`,
      };
    }

    const records: InvestigationRecord[] = (data || []).map((row) => {
      const rec = row.data as InvestigationRecord;
      return {
        ...rec,
        id: row.investigation_id || rec.id,
        createdAt: row.created_at || rec.createdAt,
        updatedAt: row.updated_at || rec.updatedAt,
        status: row.status || rec.status,
      };
    });

    return { ok: true, data: records };
  } catch (err: any) {
    console.error('Database connection exception:', err);
    return {
      ok: false,
      error: `Database connection failure: ${err.message || 'Unable to connect to Supabase database.'}`,
    };
  }
};

export const saveUserInvestigation = async (
  record: InvestigationRecord,
  userId?: string
): Promise<RepositoryOperationResult<void>> => {
  if (!isSupabaseConfigured() || !supabase) {
    saveLocalStorageInvestigation(record);
    return { ok: true };
  }

  if (!userId) {
    return {
      ok: false,
      error: 'Authentication required. Cannot save investigation without an authenticated user ID.',
    };
  }

  try {
    const cleanData = JSON.parse(JSON.stringify(record));

    const payload = {
      investigation_id: record.id,
      user_id: userId,
      status: record.status || 'Draft',
      title: `Investigation ${record.id}`,
      data: cleanData,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('investigations')
      .upsert(payload, { onConflict: 'investigation_id' });

    if (error) {
      console.error('Supabase saveUserInvestigation query error:', error);
      const isRls = error.code === '42501' || (error.message && error.message.toLowerCase().includes('row-level security'));
      const errorCategory = isRls ? 'RLS Policy Error' : `Database Error (${error.code || 'Query Failed'})`;
      return {
        ok: false,
        error: `${errorCategory}: ${error.message || 'Error saving to database'}. Record ${record.id} was not saved to Supabase.`,
      };
    }

    // Also update active ID in localStorage for seamless browser tab Rehydration
    saveLocalStorageInvestigation(record);

    return { ok: true };
  } catch (err: any) {
    console.error('Database save exception:', err);
    const msg = err?.message || String(err) || 'Unknown runtime error during database save.';
    const isFetchError = msg.includes('Failed to fetch') || msg.includes('NetworkError');
    const category = isFetchError ? 'Network/Connection Error' : 'Database Runtime Exception';
    return {
      ok: false,
      error: `${category}: ${msg}. Record ${record.id} was not saved to Supabase.`,
    };
  }
};

export const loadUserInvestigation = async (
  investigationId: string,
  userId?: string
): Promise<RepositoryOperationResult<InvestigationRecord | null>> => {
  if (!isSupabaseConfigured() || !supabase) {
    const local = loadLocalStorageInvestigation(investigationId);
    return { ok: true, data: local };
  }

  if (!userId) {
    return { ok: false, error: 'User must be authenticated to load private database records.' };
  }

  try {
    const { data, error } = await supabase
      .from('investigations')
      .select('data, created_at, updated_at, status, investigation_id')
      .eq('investigation_id', investigationId)
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error('Supabase loadUserInvestigation query error:', error);
      return {
        ok: false,
        error: `Database persistence error (${error.code || 'Query Failed'}): ${error.message}. Investigation ${investigationId} could not be loaded from Supabase.`,
      };
    }

    if (!data) {
      return { ok: true, data: null };
    }

    const rec = data.data as InvestigationRecord;
    const loadedRecord: InvestigationRecord = {
      ...rec,
      id: data.investigation_id || rec.id || investigationId,
      createdAt: data.created_at || rec.createdAt,
      updatedAt: data.updated_at || rec.updatedAt,
      status: data.status || rec.status,
    };
    return { ok: true, data: loadedRecord };
  } catch (err: any) {
    console.error('Database load exception:', err);
    return {
      ok: false,
      error: `Database load exception: ${err?.message || String(err) || 'Failed to fetch investigation record.'}`,
    };
  }
};

export const deleteUserInvestigation = async (
  investigationId: string,
  userId?: string
): Promise<RepositoryOperationResult<void>> => {
  if (!isSupabaseConfigured() || !supabase) {
    deleteLocalStorageInvestigation(investigationId);
    return { ok: true };
  }

  if (!userId) {
    return { ok: false, error: 'User must be authenticated to delete investigation records.' };
  }

  try {
    const { error } = await supabase
      .from('investigations')
      .delete()
      .eq('investigation_id', investigationId)
      .eq('user_id', userId);

    if (error) {
      console.error('Supabase deleteUserInvestigation error:', error);
      return {
        ok: false,
        error: `Database persistence error (${error.code || 'RLS'}): ${error.message}. Delete operation rejected by server.`,
      };
    }

    deleteLocalStorageInvestigation(investigationId);
    return { ok: true };
  } catch (err: any) {
    console.error('Database delete exception:', err);
    return {
      ok: false,
      error: `Database delete exception: ${err?.message || String(err) || 'Failed to execute delete query.'}`,
    };
  }
};
