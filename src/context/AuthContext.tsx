import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { isSupabaseConfigured, supabase } from '../services/supabaseClient';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: 'Investigator' | 'Administrator' | 'Viewer / Authority';
  organization: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  isLoading: boolean;
  authError: string | null;
  isConfigured: boolean;
  signIn: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  signUp: (email: string, password: string, fullName: string, organization: string) => Promise<{ ok: boolean; requiresConfirmation?: boolean; error?: string }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ ok: boolean; error?: string }>;
  clearAuthError: () => void;
  // Local fallback sign in for unconfigured dev environment only
  signInLocalMock: (mockUser: UserProfile) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const isConfigured = isSupabaseConfigured();

  const fetchUserProfile = async (currentUser: User): Promise<UserProfile> => {
    if (!supabase) {
      return {
        id: currentUser.id,
        name: currentUser.email?.split('@')[0].toUpperCase() || 'USER',
        email: currentUser.email || '',
        role: 'Investigator',
        organization: 'Indian Maritime Surveillance Authority',
      };
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .maybeSingle();

      if (data) {
        const rawRole = (data.role || '').toLowerCase();
        let formattedRole: 'Investigator' | 'Administrator' | 'Viewer / Authority' = 'Investigator';
        if (rawRole === 'administrator' || rawRole === 'admin') {
          formattedRole = 'Administrator';
        } else if (rawRole === 'viewer' || rawRole === 'viewer / authority') {
          formattedRole = 'Viewer / Authority';
        }

        return {
          id: data.id,
          name: data.full_name || currentUser.email?.split('@')[0].toUpperCase() || 'USER',
          email: currentUser.email || '',
          role: formattedRole,
          organization: data.organization || 'Maritime Intelligence Authority',
        };
      }
    } catch (e) {
      console.warn('Profile fetch exception, falling back to metadata:', e);
    }

    // Fallback to user metadata if profile table query is pending
    const meta = currentUser.user_metadata || {};
    return {
      id: currentUser.id,
      name: meta.full_name || currentUser.email?.split('@')[0].toUpperCase() || 'USER',
      email: currentUser.email || '',
      role: 'Investigator',
      organization: meta.organization || 'Indian Maritime Surveillance Authority',
    };
  };

  useEffect(() => {
    if (!isConfigured || !supabase) {
      // Check localStorage for unconfigured local session fallback
      const savedUser = localStorage.getItem('oceantrace_user');
      if (savedUser) {
        try {
          const parsed = JSON.parse(savedUser);
          setProfile(parsed);
        } catch {
          // ignore
        }
      }
      setIsLoading(false);
      return;
    }

    let mounted = true;

    // Get initial session
    void supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      if (!mounted) return;
      setSession(initialSession);
      setUser(initialSession?.user ?? null);
      if (initialSession?.user) {
        void fetchUserProfile(initialSession.user).then((p) => {
          if (mounted) setProfile(p);
          if (mounted) setIsLoading(false);
        });
      } else {
        setIsLoading(false);
      }
    });

    // Listen to Auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      if (!mounted) return;
      setSession(currentSession);
      setUser(currentSession?.user ?? null);

      if (currentSession?.user) {
        void fetchUserProfile(currentSession.user).then((p) => {
          if (mounted) setProfile(p);
        });
      } else {
        setProfile(null);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [isConfigured]);

  const signIn = async (email: string, password: string): Promise<{ ok: boolean; error?: string }> => {
    setAuthError(null);
    if (!isConfigured || !supabase) {
      return { ok: false, error: 'Supabase authentication is not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.' };
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setAuthError(error.message);
        return { ok: false, error: error.message };
      }
      if (data.user) {
        const userProfile = await fetchUserProfile(data.user);
        setProfile(userProfile);
      }
      return { ok: true };
    } catch (err: any) {
      const msg = err.message || 'An unexpected authentication error occurred.';
      setAuthError(msg);
      return { ok: false, error: msg };
    }
  };

  const signUp = async (
    email: string,
    password: string,
    fullName: string,
    organization: string
  ): Promise<{ ok: boolean; requiresConfirmation?: boolean; error?: string }> => {
    setAuthError(null);
    if (!isConfigured || !supabase) {
      return { ok: false, error: 'Supabase authentication is not configured.' };
    }

    try {
      const siteUrl = window.location.origin;
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${siteUrl}`,
          data: {
            full_name: fullName,
            organization: organization || 'Maritime Surveillance',
            role: 'investigator', // Always default new accounts to investigator
          },
        },
      });

      if (error) {
        setAuthError(error.message);
        return { ok: false, error: error.message };
      }

      if (data.user && !data.session) {
        return { ok: true, requiresConfirmation: true };
      }

      if (data.user && data.session) {
        const userProfile = await fetchUserProfile(data.user);
        setProfile(userProfile);
        return { ok: true, requiresConfirmation: false };
      }

      return { ok: true, requiresConfirmation: true };
    } catch (err: any) {
      const msg = err.message || 'Signup failed.';
      setAuthError(msg);
      return { ok: false, error: msg };
    }
  };

  const signOut = async (): Promise<void> => {
    setProfile(null);
    setUser(null);
    setSession(null);
    localStorage.removeItem('oceantrace_user');
    if (isConfigured && supabase) {
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.error('Sign out error:', err);
      }
    }
  };

  const resetPassword = async (email: string): Promise<{ ok: boolean; error?: string }> => {
    setAuthError(null);
    if (!isConfigured || !supabase) {
      return { ok: false, error: 'Supabase is not configured.' };
    }

    try {
      const siteUrl = window.location.origin;
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${siteUrl}`,
      });
      if (error) {
        setAuthError(error.message);
        return { ok: false, error: error.message };
      }
      return { ok: true };
    } catch (err: any) {
      const msg = err.message || 'Password reset request failed.';
      setAuthError(msg);
      return { ok: false, error: msg };
    }
  };

  const signInLocalMock = (mockUser: UserProfile) => {
    setProfile(mockUser);
    localStorage.setItem('oceantrace_user', JSON.stringify(mockUser));
  };

  const clearAuthError = () => setAuthError(null);

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        isLoading,
        authError,
        isConfigured,
        signIn,
        signUp,
        signOut,
        resetPassword,
        clearAuthError,
        signInLocalMock,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
