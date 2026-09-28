import { SatelliteAcquisition, SatelliteBoundingBox } from './satelliteApi';
import { SarAnomalyAnalysis } from './sarAnomalyDetection';
import { SarAnomalyComparison } from './sarAnomalyComparison';
import { AisObservation, AisVesselSummary } from './aisApi';
import { AisCorrelationResponse } from './correlationApi';

export interface InvestigationRecord {
  id: string; // e.g. OT-20260928-8492
  createdAt: string;
  updatedAt: string;
  status: string; // 'Draft' | 'Acquisition Selected' | 'SAR Analyzed' | 'Focus Set' | 'AIS Searched' | 'Correlated' | 'Report Ready'
  
  sentinel1: {
    bbox: SatelliteBoundingBox;
    from: string;
    to: string;
    acquisitionsCount: number;
    selectedAcquisition: SatelliteAcquisition | null;
    searchStatus: string;
  };
  
  sar: {
    imageUrl: string | null;
    sarAnalysis: SarAnomalyAnalysis | null;
    selectedAnomalyCandidateId: number | null;
    analysisStatus: string;
    analysisCompletedAt: string | null;
  };
  
  focus: {
    lat: number | null;
    lon: number | null;
    radiusKm: number;
    focusSource: 'sar-derived' | 'manual' | 'unavailable' | null;
  };
  
  comparison: {
    comparisonAcquisition: SatelliteAcquisition | null;
    comparisonAnalysis: SarAnomalyAnalysis | null;
    comparisonStatus: string;
    comparisonError: string | null;
    comparisonResult: SarAnomalyComparison | null;
    comparisonCompletedAt: string | null;
  };
  
  ais: {
    observationWindow: { from: string; to: string } | null;
    observations: AisObservation[];
    uniqueVessels: AisVesselSummary[];
    selectedVesselId: string | null;
    aisStatus: string;
  };
  
  correlation: {
    result: AisCorrelationResponse | null;
    correlationStatus: string;
    correlationCompletedAt: string | null;
  };
  
  report: {
    reportReady: boolean;
    generatedAt: string | null;
  };
}

const STORAGE_KEY = 'oceantrace_saved_investigations';
const ACTIVE_ID_KEY = 'oceantrace_active_investigation_id';

function generateInvestigationId(): string {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomSuffix = Math.floor(1000 + Math.random() * 9000).toString();
  return `OT-${dateStr}-${randomSuffix}`;
}

export function createNewInvestigationRecord(bbox?: SatelliteBoundingBox, from?: string, to?: string): InvestigationRecord {
  const now = new Date().toISOString();
  return {
    id: generateInvestigationId(),
    createdAt: now,
    updatedAt: now,
    status: 'Draft',
    sentinel1: {
      bbox: bbox || [72.0, 10.0, 72.8, 11.2],
      from: from || '',
      to: to || '',
      acquisitionsCount: 0,
      selectedAcquisition: null,
      searchStatus: 'Not searched',
    },
    sar: {
      imageUrl: null,
      sarAnalysis: null,
      selectedAnomalyCandidateId: null,
      analysisStatus: 'Not analyzed',
      analysisCompletedAt: null,
    },
    focus: {
      lat: null,
      lon: null,
      radiusKm: 25,
      focusSource: null,
    },
    comparison: {
      comparisonAcquisition: null,
      comparisonAnalysis: null,
      comparisonStatus: 'Not run',
      comparisonError: null,
      comparisonResult: null,
      comparisonCompletedAt: null,
    },
    ais: {
      observationWindow: null,
      observations: [],
      uniqueVessels: [],
      selectedVesselId: null,
      aisStatus: 'Not searched',
    },
    correlation: {
      result: null,
      correlationStatus: 'Not calculated',
      correlationCompletedAt: null,
    },
    report: {
      reportReady: false,
      generatedAt: null,
    },
  };
}

export function listSavedInvestigations(): InvestigationRecord[] {
  try {
    const json = localStorage.getItem(STORAGE_KEY);
    if (!json) return [];
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveInvestigation(record: InvestigationRecord): void {
  try {
    const list = listSavedInvestigations();
    const index = list.findIndex((item) => item.id === record.id);
    const updatedRecord = { ...record, updatedAt: new Date().toISOString() };
    if (index >= 0) {
      list[index] = updatedRecord;
    } else {
      list.unshift(updatedRecord);
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    localStorage.setItem(ACTIVE_ID_KEY, record.id);
  } catch (err) {
    console.warn('Failed to save investigation to localStorage', err);
  }
}

export function loadInvestigation(id: string): InvestigationRecord | null {
  const list = listSavedInvestigations();
  const found = list.find((item) => item.id === id);
  if (found) {
    localStorage.setItem(ACTIVE_ID_KEY, found.id);
    return found;
  }
  return null;
}

export function deleteInvestigation(id: string): void {
  try {
    const list = listSavedInvestigations().filter((item) => item.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    if (localStorage.getItem(ACTIVE_ID_KEY) === id) {
      localStorage.removeItem(ACTIVE_ID_KEY);
    }
  } catch (err) {
    console.warn('Failed to delete investigation from localStorage', err);
  }
}

export function getActiveInvestigationId(): string | null {
  return localStorage.getItem(ACTIVE_ID_KEY);
}
