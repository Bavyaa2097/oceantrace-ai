import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { SpillDetection } from './components/SpillDetection';
import { CorrelationModal } from './components/CorrelationModal';
import { IncidentTimeline } from './components/IncidentTimeline';
import { TrajectoryPlayer } from './components/TrajectoryPlayer';
import { InvestigationReport } from './components/InvestigationReport';
import { AIPipeline } from './components/AIPipeline';
import { LandingPage } from './components/LandingPage';
import { LoginPage } from './components/LoginPage';
import { WorkspaceSidebar } from './components/WorkspaceSidebar';
import { LiveInvestigationStatus } from './components/SpillDetection';
import { AuthProvider, useAuth } from './context/AuthContext';

import { Vessel } from './types';
import { Activity, ArrowRight, AlertTriangle } from 'lucide-react';

import {
  createNewInvestigationRecord,
  InvestigationRecord,
} from './services/investigationStore';
import {
  deleteUserInvestigation,
  listUserInvestigations,
  loadUserInvestigation,
  saveUserInvestigation,
} from './services/investigationRepository';

const AppContent: React.FC = () => {
  const { user, profile, signOut } = useAuth();
  const activeUserId = user?.id || profile?.id;
  const isDemoMode = false;

  const [activeTab, setActiveTab] = useState<string>('landing');
  const [selectedVessel, setSelectedVessel] = useState<Vessel | null>(null);
  const [isCorrelationOpen, setIsCorrelationOpen] = useState<boolean>(false);
  const [showAdminAuditLogs, setShowAdminAuditLogs] = useState<boolean>(false);
  const [resetInvestigationKey, setResetInvestigationKey] = useState(0);

  const [currentInvestigationId, setCurrentInvestigationId] = useState<string>('OT-20260928-1001');
  const [savedInvestigations, setSavedInvestigations] = useState<InvestigationRecord[]>([]);
  const [selectedLoadedRecord, setSelectedLoadedRecord] = useState<InvestigationRecord | null>(null);
  const [deleteConfirmationId, setDeleteConfirmationId] = useState<string | null>(null);
  const [persistenceError, setPersistenceError] = useState<string | null>(null);
  const isRestoringInvestigationRef = React.useRef<boolean>(false);
  const lastSavedHashRef = React.useRef<string>('');
  const isSaveInProgressRef = React.useRef<boolean>(false);

  const getRecordStateHash = (record: InvestigationRecord): string => {
    return JSON.stringify({
      id: record.id,
      status: record.status,
      bbox: record.sentinel1.bbox,
      from: record.sentinel1.from,
      to: record.sentinel1.to,
      acqId: record.sentinel1.selectedAcquisition?.id || null,
      searchStatus: record.sentinel1.searchStatus,
      candId: record.sar.selectedAnomalyCandidateId,
      sarStatus: record.sar.analysisStatus,
      lat: record.focus.lat,
      lon: record.focus.lon,
      radiusKm: record.focus.radiusKm,
      focusSource: record.focus.focusSource,
      compAcqId: record.comparison.comparisonAcquisition?.id || null,
      compStatus: record.comparison.comparisonStatus,
      aisStatus: record.ais.aisStatus,
      selectedVesselId: record.ais.selectedVesselId,
      obsCount: record.ais.observations.length,
      vesselsCount: record.ais.uniqueVessels.length,
      corrStatus: record.correlation.correlationStatus,
    });
  };

  const refreshSavedInvestigations = async () => {
    const res = await listUserInvestigations(activeUserId);
    if (res.error) {
      setPersistenceError(res.error);
    } else if (res.data) {
      setSavedInvestigations(res.data);
    }
  };

  useEffect(() => {
    void refreshSavedInvestigations();
  }, [activeUserId]);

  const handleOpenSavedInvestigation = async (id: string) => {
    setPersistenceError(null);
    isRestoringInvestigationRef.current = true;

    const res = await loadUserInvestigation(id, activeUserId);
    if (res.error) {
      setPersistenceError(res.error);
      isRestoringInvestigationRef.current = false;
      return;
    }

    const record = res.data;
    if (!record) {
      isRestoringInvestigationRef.current = false;
      return;
    }

    lastSavedHashRef.current = getRecordStateHash(record);

    setCurrentInvestigationId(record.id);
    setSelectedLoadedRecord(record);
    setLiveInvestigationStatus({
      started: true,
      searchStatus: record.sentinel1.searchStatus,
      acquisitionDatetime: record.sentinel1.selectedAcquisition?.datetime || null,
      anomalyCandidateCount: record.sar.sarAnalysis ? record.sar.sarAnalysis.candidates.length : (record.sar.selectedAnomalyCandidateId ? 1 : null),
      focus: record.focus.lat !== null && record.focus.lon !== null ? `${record.focus.lat.toFixed(5)}, ${record.focus.lon.toFixed(5)}` : null,
      aisObservationCount: record.ais.observations.length,
      aisUniqueVesselCount: record.ais.uniqueVessels.length,
      correlationStatus: record.correlation.correlationStatus,
      bbox: record.sentinel1.bbox,
      from: record.sentinel1.from,
      to: record.sentinel1.to,
      acquisition: record.sentinel1.selectedAcquisition,
      candidates: record.sar.sarAnalysis?.candidates || null,
      selectedAnomalyCandidateId: record.sar.selectedAnomalyCandidateId,
      latitude: record.focus.lat !== null ? String(record.focus.lat) : undefined,
      longitude: record.focus.lon !== null ? String(record.focus.lon) : undefined,
      radiusKm: String(record.focus.radiusKm),
      candidateFocusStatus: record.focus.focusSource === 'sar-derived' ? 'derived' : (record.focus.focusSource as any),
      comparisonAcquisition: record.comparison.comparisonAcquisition,
      comparisonState: record.comparison.comparisonStatus as any,
      comparison: record.comparison.comparisonResult,
      comparisonCompletedAt: record.comparison.comparisonCompletedAt,
      aisState: record.ais.aisStatus as any,
      aisResult: record.ais.observations.length > 0 || record.ais.uniqueVessels.length > 0 ? {
        ok: true,
        service: 'GFW AIS Candidate Search',
        investigation: {
          lat: record.focus.lat || 0,
          lon: record.focus.lon || 0,
          from: record.ais.observationWindow?.from || '',
          to: record.ais.observationWindow?.to || '',
          radiusKm: record.focus.radiusKm,
        },
        observationCount: record.ais.observations.length,
        uniqueVesselCount: record.ais.uniqueVessels.length,
        observations: record.ais.observations,
        vessels: record.ais.uniqueVessels,
      } : null,
      selectedVesselId: record.ais.selectedVesselId,
      correlationState: record.correlation.correlationStatus === 'Complete' ? 'success' : 'idle',
      correlationResult: record.correlation.result,
      correlationCompletedAt: record.correlation.correlationCompletedAt,
    });
    setActiveTab('spill-analysis');
  };

  const [liveInvestigationStatus, setLiveInvestigationStatus] = useState<LiveInvestigationStatus>({
    started: false,
    searchStatus: 'Not searched',
    acquisitionDatetime: null,
    anomalyCandidateCount: null,
    focus: null,
    aisObservationCount: null,
    aisUniqueVesselCount: null,
    correlationStatus: 'Not calculated',
  });

  const isWorkspaceTab = !['landing', 'login'].includes(activeTab);

  const buildInvestigationRecord = (
    invId: string,
    status: LiveInvestigationStatus
  ): InvestigationRecord => {
    return {
      id: invId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: status.started
        ? status.correlationStatus === 'Complete'
          ? 'Correlated'
          : status.focus
          ? 'Focus Set'
          : 'In Progress'
        : 'Draft',
      sentinel1: {
        bbox: status.bbox || [72.0, 10.0, 72.8, 11.2],
        from: status.from || '',
        to: status.to || '',
        acquisitionsCount: status.acquisition ? 1 : 0,
        selectedAcquisition: status.acquisition || null,
        searchStatus: status.searchStatus,
      },
      sar: {
        imageUrl: null,
        sarAnalysis: null,
        selectedAnomalyCandidateId: status.selectedAnomalyCandidateId || null,
        analysisStatus: status.anomalyCandidateCount !== null ? 'Complete' : 'Not analyzed',
        analysisCompletedAt: status.analysisCompletedAt || null,
      },
      focus: {
        lat: status.latitude ? Number(status.latitude) : null,
        lon: status.longitude ? Number(status.longitude) : null,
        radiusKm: status.radiusKm ? Number(status.radiusKm) : 25,
        focusSource: status.candidateFocusStatus === 'derived' ? 'sar-derived' : (status.candidateFocusStatus || null),
      },
      comparison: {
        comparisonAcquisition: status.comparisonAcquisition || null,
        comparisonAnalysis: null,
        comparisonStatus: status.comparisonState || 'Not run',
        comparisonError: null,
        comparisonResult: status.comparison || null,
        comparisonCompletedAt: status.comparisonCompletedAt || null,
      },
      ais: {
        observationWindow: status.aisResult ? { from: status.aisResult.investigation.from, to: status.aisResult.investigation.to } : null,
        observations: status.aisResult?.observations || [],
        uniqueVessels: status.aisResult?.vessels || [],
        selectedVesselId: status.selectedVesselId || null,
        aisStatus: status.aisResult ? 'Complete' : 'Not searched',
      },
      correlation: {
        result: status.correlationResult || null,
        correlationStatus: status.correlationStatus,
        correlationCompletedAt: status.correlationCompletedAt || null,
      },
      report: {
        reportReady: Boolean(status.started && status.acquisitionDatetime && status.anomalyCandidateCount !== null && status.focus),
        generatedAt: null,
      },
    };
  };

  const handleStatusChange = React.useCallback((status: LiveInvestigationStatus) => {
    setLiveInvestigationStatus(status);
    if (isRestoringInvestigationRef.current) {
      return;
    }
    if (!status.started || !activeUserId || isSaveInProgressRef.current) {
      return;
    }

    const record = buildInvestigationRecord(currentInvestigationId, status);
    const currentHash = getRecordStateHash(record);

    if (lastSavedHashRef.current === currentHash) {
      return;
    }

    isSaveInProgressRef.current = true;
    lastSavedHashRef.current = currentHash;

    void saveUserInvestigation(record, activeUserId).then((res) => {
      isSaveInProgressRef.current = false;
      if (res.error) {
        setPersistenceError(res.error);
      } else {
        void refreshSavedInvestigations();
      }
    });
  }, [activeUserId, currentInvestigationId]);

  const handleSaveCurrentInvestigation = async () => {
    setPersistenceError(null);
    const record = buildInvestigationRecord(currentInvestigationId, liveInvestigationStatus);
    const currentHash = getRecordStateHash(record);
    lastSavedHashRef.current = currentHash;
    const res = await saveUserInvestigation(record, activeUserId);
    if (res.error) {
      setPersistenceError(res.error);
    } else {
      void refreshSavedInvestigations();
    }
  };

  const handleStartNewInvestigation = async () => {
    setPersistenceError(null);
    isRestoringInvestigationRef.current = false;
    const newRecord = createNewInvestigationRecord();
    const newHash = getRecordStateHash(newRecord);
    lastSavedHashRef.current = newHash;

    setCurrentInvestigationId(newRecord.id);
    setSelectedLoadedRecord(newRecord);
    setLiveInvestigationStatus({
      started: true,
      searchStatus: newRecord.sentinel1.searchStatus,
      acquisitionDatetime: null,
      anomalyCandidateCount: null,
      focus: null,
      aisObservationCount: null,
      aisUniqueVesselCount: null,
      correlationStatus: 'Not calculated',
      bbox: newRecord.sentinel1.bbox,
      from: newRecord.sentinel1.from,
      to: newRecord.sentinel1.to,
    });
    setResetInvestigationKey((key) => key + 1);
    setActiveTab('spill-analysis');

    if (activeUserId) {
      isSaveInProgressRef.current = true;
      const res = await saveUserInvestigation(newRecord, activeUserId);
      isSaveInProgressRef.current = false;
      if (res.error) {
        setPersistenceError(res.error);
      } else {
        void refreshSavedInvestigations();
      }
    }
  };

  const handleDeleteSavedInvestigation = async (id: string) => {
    setPersistenceError(null);
    const res = await deleteUserInvestigation(id, activeUserId);
    if (res.error) {
      setPersistenceError(res.error);
    } else {
      void refreshSavedInvestigations();
    }
    setDeleteConfirmationId(null);
  };

  useEffect(() => {
    const revealElements = Array.from(document.querySelectorAll<HTMLElement>('.reveal'));
    if (revealElements.length === 0) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      revealElements.forEach((element) => element.classList.add('is-visible'));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -32px 0px' }
    );

    revealElements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, [activeTab]);

  const handleLoginSuccess = () => {
    setActiveTab('dashboard');
  };

  const handleLogout = async () => {
    await signOut();
    setLiveInvestigationStatus({
      started: false,
      searchStatus: 'Not searched',
      acquisitionDatetime: null,
      anomalyCandidateCount: null,
      focus: null,
      aisObservationCount: null,
      aisUniqueVesselCount: null,
      correlationStatus: 'Not calculated',
    });
    setSelectedLoadedRecord(null);
    setActiveTab('login');
  };

  const handleExplorePlatform = () => {
    if (profile) {
      setActiveTab('dashboard');
    } else {
      setActiveTab('login');
    }
  };

  const hasLiveEvidence = Boolean(
    liveInvestigationStatus.acquisitionDatetime ||
    liveInvestigationStatus.anomalyCandidateCount !== null ||
    liveInvestigationStatus.aisObservationCount !== null
  );
  const workspaceStatusLabels: Record<string, string | null> = {
    'spill-analysis': liveInvestigationStatus.acquisitionDatetime ? '✓ Observation' : null,
    'drift-analysis': liveInvestigationStatus.focus ? '✓ Focus set' : null,
    'vessel-intelligence': liveInvestigationStatus.aisUniqueVesselCount !== null
      ? `✓ ${liveInvestigationStatus.aisUniqueVesselCount} vessels`
      : null,
    timeline: hasLiveEvidence ? '✓ Evidence' : null,
    trajectory: liveInvestigationStatus.aisObservationCount
      ? `✓ ${liveInvestigationStatus.aisObservationCount} observations`
      : 'Awaiting vessel',
    reports: liveInvestigationStatus.started && liveInvestigationStatus.acquisitionDatetime && liveInvestigationStatus.anomalyCandidateCount !== null && liveInvestigationStatus.focus ? '✓ Ready' : 'Pending',
    'ai-pipeline': liveInvestigationStatus.started ? '✓ Active' : 'Idle',
  };

  const liveAisResult = liveInvestigationStatus.aisResult;
  const liveSelectedVessel = liveAisResult?.vessels.find(
    (vessel) => vessel.id === liveInvestigationStatus.selectedVesselId,
  ) ?? null;

  const liveTimelineEvents = [
    liveInvestigationStatus.acquisitionDatetime
      ? {
          label: 'Sentinel-1 acquisition selected',
          detail: liveInvestigationStatus.acquisition?.id ?? 'Selected catalogue acquisition',
          timestamp: liveInvestigationStatus.acquisitionDatetime,
        }
      : null,
    liveInvestigationStatus.analysisCompletedAt
      ? {
          label: 'SAR anomaly analysis completed',
          detail: `${liveInvestigationStatus.anomalyCandidateCount ?? 0} candidate regions`,
          timestamp: liveInvestigationStatus.analysisCompletedAt,
        }
      : null,
    liveInvestigationStatus.focus
      ? {
          label: 'Investigation focus set',
          detail: liveInvestigationStatus.candidateFocusStatus === 'derived'
            ? 'Focus derived from selected SAR anomaly'
            : 'Focus manually adjusted in Drift & Origin',
          timestamp: null,
        }
      : null,
    liveInvestigationStatus.comparisonState === 'success' && liveInvestigationStatus.comparisonAcquisition?.datetime
      ? {
          label: 'SAR comparison completed',
          detail: `Comparison observation: ${liveInvestigationStatus.comparisonAcquisition.datetime}`,
          timestamp: liveInvestigationStatus.comparisonCompletedAt ?? null,
        }
      : null,
    liveAisResult
      ? {
          label: 'AIS vessel-presence search completed',
          detail: `${liveAisResult.observationCount} observations · ${liveAisResult.uniqueVesselCount} vessels · ${liveAisResult.investigation.from} – ${liveAisResult.investigation.to}`,
          timestamp: null,
        }
      : null,
    liveInvestigationStatus.correlationState === 'success'
      ? {
          label: 'Correlation analysis completed',
          detail: `${liveInvestigationStatus.correlationResult?.uniqueVesselCount ?? 0} vessels assessed`,
          timestamp: liveInvestigationStatus.correlationCompletedAt ?? null,
        }
      : null,
  ].filter((event): event is { label: string; detail: string; timestamp: string | null } => event !== null);

  const isProtectedWorkspaceView = isWorkspaceTab && !profile;

  return (
    <div className="app-shell theme-bright min-h-screen text-[#172A33] flex flex-col font-sans selection:bg-[#176B87] selection:text-white">
      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentUser={profile}
        onOpenAuth={() => setActiveTab('login')}
        onLogout={handleLogout}
        workspaceMode={isWorkspaceTab}
        showDesktopNavigation={!isWorkspaceTab}
        workspaceStatusLabels={workspaceStatusLabels}
      />

      <div className="flex min-h-0 flex-1">
      {isWorkspaceTab && (
        <WorkspaceSidebar
          activeTab={activeTab}
          onNavigate={setActiveTab}
          investigationStarted={liveInvestigationStatus.started}
          statusLabels={workspaceStatusLabels}
        />
      )}
      <div className="flex min-w-0 flex-1 flex-col">
      {/* Role Notice Indicator Banner */}
      {profile && (
        <div className="bg-white border-b border-[#D9E3E7] py-2 px-4 text-xs flex items-center justify-between text-[#647780]">
          <div className="flex items-center gap-2 max-w-7xl mx-auto w-full">
            <span className="text-[#176B87] font-semibold">Active session:</span>
            <span>{profile.name}</span>
            <span>•</span>
            <span className="px-2 py-0.5 rounded bg-[#E8F2F4] text-[#176B87] border border-[#BFD8DF] font-semibold text-[10px]">
              {profile.role}
            </span>
            <span>•</span>
            <span className="text-slate-500 truncate hidden sm:inline">{profile.organization}</span>

            {profile.role === 'Viewer / Authority' && (
              <span className="ml-auto text-[#a66f11] font-semibold bg-[#fff7e6] border border-[#e8c978] px-2 py-0.5 rounded text-[10px]">
                Read-only access
              </span>
            )}

            {profile.role === 'Administrator' && (
              <button
                onClick={() => setShowAdminAuditLogs(true)}
                className="ml-auto text-[#176B87] hover:text-[#123B4A] font-semibold bg-[#F4F7F8] border border-[#D9E3E7] hover:border-[#176B87] px-2 py-1 rounded text-[10px] flex items-center gap-1 transition-all"
              >
                <Activity className="w-3 h-3 text-blue-400" />
                <span>System audit logs</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className={`min-w-0 flex-1 w-full px-4 sm:px-6 lg:px-8 py-6 ${activeTab === 'landing' ? 'home-main mx-auto' : isWorkspaceTab ? 'max-w-none' : 'mx-auto max-w-7xl'}`}>
        
        {/* Persistence Error Alert */}
        {persistenceError && (
          <div role="alert" className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3.5 text-xs text-red-600 font-mono flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{persistenceError}</span>
            </div>
            <button onClick={() => setPersistenceError(null)} className="font-bold underline text-xs shrink-0 ml-2">
              Dismiss
            </button>
          </div>
        )}

        {/* Protected Workspace Prompt */}
        {isProtectedWorkspaceView ? (
          <LoginPage onLoginSuccess={handleLoginSuccess} />
        ) : (
          <>
            {/* LOGIN PAGE TAB */}
            {activeTab === 'login' && (
              <LoginPage onLoginSuccess={handleLoginSuccess} />
            )}

            {/* LANDING PAGE TAB */}
            {activeTab === 'landing' && (
              <LandingPage
                onExplore={handleExplorePlatform}
                onLoginClick={() => setActiveTab('login')}
              />
            )}

            {/* DASHBOARD TAB */}
            {activeTab === 'dashboard' && (
              <div className="space-y-6">
                <div className="reveal flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 border-b border-[#d9e3e7] pb-5">
                  <div>
                    <p className="text-xs font-semibold text-[#176b87] tracking-wide">Operations overview</p>
                    <h1 className="text-2xl sm:text-3xl font-bold text-[#173b43] mt-1">Maritime watch desk</h1>
                    <p className="text-sm text-[#60727a] mt-1">
                      Review the current live investigation or begin a new Sentinel-1 observation search.
                    </p>
                  </div>
                </div>

                <div className="rounded-lg border border-[var(--ot-border)] bg-[var(--ot-card)] p-3">
                  <div className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--ot-muted)]">Investigation workflow</div>
                  <ol className="flex flex-wrap items-center gap-2 text-[11px]">
                    {[
                      { label: 'Sentinel-1', complete: liveInvestigationStatus.acquisitionDatetime !== null },
                      { label: 'SAR anomaly', complete: liveInvestigationStatus.anomalyCandidateCount !== null },
                      { label: 'Focus', complete: liveInvestigationStatus.focus !== null },
                      { label: 'AIS', complete: liveInvestigationStatus.aisObservationCount !== null },
                      { label: 'Correlation', complete: liveInvestigationStatus.correlationStatus === 'Complete' },
                      { label: 'Report', complete: Boolean(liveInvestigationStatus.started && liveInvestigationStatus.acquisitionDatetime && liveInvestigationStatus.anomalyCandidateCount !== null && liveInvestigationStatus.focus) },
                    ].map(({ label, complete }, index) => (
                      <React.Fragment key={label}>
                        {index > 0 && <span className="text-[var(--ot-muted)]" aria-hidden="true">→</span>}
                        <li className={`rounded-full border px-2.5 py-1 ${
                          complete
                            ? 'border-[var(--ot-primary)]/40 bg-[var(--ot-primary-soft)] font-semibold text-[var(--ot-primary)]'
                            : 'border-[var(--ot-border)] text-[var(--ot-muted)]'
                        }`}>
                          {label}
                        </li>
                      </React.Fragment>
                    ))}
                  </ol>
                </div>

                {liveInvestigationStatus.started ? (
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h2 className="text-base font-bold font-mono text-[var(--ot-text)]">
                          CURRENT INVESTIGATION: {currentInvestigationId}
                        </h2>
                        <p className="mt-0.5 text-xs text-[var(--ot-text-secondary)] font-mono">
                          Real-state investigation findings.
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleSaveCurrentInvestigation}
                          className="rounded-md bg-[var(--ot-primary)] px-3 py-2 text-xs font-bold text-white hover:bg-[var(--ot-primary-dark)] transition-all shadow-sm"
                        >
                          Save Investigation
                        </button>
                        <button
                          type="button"
                          onClick={handleStartNewInvestigation}
                          className="rounded-md border border-[var(--ot-border)] px-3 py-2 text-xs font-bold text-[var(--ot-text-secondary)] hover:border-[var(--ot-primary)] hover:text-[var(--ot-primary)] transition-all"
                        >
                          Start New / Reset
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4 font-mono">
                      {[
                        ['Investigation ID', currentInvestigationId],
                        ['Sentinel-1 catalogue', liveInvestigationStatus.searchStatus],
                        ['Selected acquisition', liveInvestigationStatus.acquisitionDatetime ?? 'None selected'],
                        ['Area of interest', liveInvestigationStatus.bbox
                          ? `${liveInvestigationStatus.bbox[0]}, ${liveInvestigationStatus.bbox[1]} – ${liveInvestigationStatus.bbox[2]}, ${liveInvestigationStatus.bbox[3]}`
                          : 'Not set'],
                        ['SAR anomaly candidates', liveInvestigationStatus.anomalyCandidateCount === null ? 'Not analyzed' : `${liveInvestigationStatus.anomalyCandidateCount} regions`],
                        ['Investigation focus', liveInvestigationStatus.focus ?? 'Not set'],
                        ['AIS observations / vessels', liveInvestigationStatus.aisObservationCount === null
                          ? 'Not searched'
                          : `${liveInvestigationStatus.aisObservationCount} obs · ${liveInvestigationStatus.aisUniqueVesselCount ?? 0} vessels`],
                        ['Correlation status', liveInvestigationStatus.correlationStatus],
                      ].map(([label, value]) => (
                        <div key={label} className="rounded-lg border border-[var(--ot-border)] bg-[var(--ot-card)] p-4">
                          <div className="text-[10px] uppercase font-bold text-[var(--ot-muted)] tracking-wider">{label}</div>
                          <div className="mt-1.5 break-words text-xs font-bold text-[var(--ot-text)]">{value}</div>
                        </div>
                      ))}
                    </div>

                    {savedInvestigations.length > 0 && (
                      <div className="mt-6 rounded-lg border border-[var(--ot-border)] bg-[var(--ot-card)] p-4 space-y-3 font-mono">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--ot-text)]">
                          Saved Live Investigations ({savedInvestigations.length})
                        </h3>
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-[var(--ot-shell)] text-[var(--ot-muted)] border-b border-[var(--ot-border)]">
                              <tr>
                                <th className="p-2 font-bold">Record ID</th>
                                <th className="p-2 font-bold">Created / Updated</th>
                                <th className="p-2 font-bold">Status</th>
                                <th className="p-2 font-bold">Sentinel-1 Acquisition</th>
                                <th className="p-2 font-bold">AIS Vessels</th>
                                <th className="p-2 font-bold">Report Status</th>
                                <th className="p-2 font-bold text-right">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--ot-border)] text-[var(--ot-text-secondary)]">
                              {savedInvestigations.map((inv) => (
                                <tr key={inv.id}>
                                  <td className="p-2 font-bold text-[var(--ot-text)]">{inv.id}</td>
                                  <td className="p-2 text-[11px]">
                                    <div>{new Date(inv.createdAt).toLocaleDateString()}</div>
                                    <div className="text-[10px] text-[var(--ot-muted)]">Upd: {new Date(inv.updatedAt).toLocaleTimeString()}</div>
                                  </td>
                                  <td className="p-2">{inv.status}</td>
                                  <td className="p-2">{inv.sentinel1.selectedAcquisition?.datetime ? new Date(inv.sentinel1.selectedAcquisition.datetime).toISOString().replace('T', ' ').slice(0, 16) : 'None'}</td>
                                  <td className="p-2">{inv.ais.uniqueVessels.length} vessels ({inv.ais.observations.length} obs)</td>
                                  <td className="p-2">
                                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${inv.report.reportReady ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-slate-500/10 text-slate-400 border border-slate-500/20'}`}>
                                      {inv.report.reportReady ? '✓ Ready' : 'Pending'}
                                    </span>
                                  </td>
                                  <td className="p-2 text-right">
                                    <button
                                      type="button"
                                      onClick={() => void handleOpenSavedInvestigation(inv.id)}
                                      className="mr-2 rounded bg-[var(--ot-primary)] px-2 py-1 text-[11px] font-bold text-white hover:bg-[var(--ot-primary-dark)]"
                                    >
                                      Open
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setDeleteConfirmationId(inv.id)}
                                      className="px-2 py-1 text-red-500 hover:underline text-[11px] font-bold"
                                    >
                                      Delete
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="glass-panel rounded-xl border p-6 sm:p-8 space-y-4">
                      <h2 className="text-lg font-bold font-mono text-[var(--ot-text)]">No live investigation started</h2>
                      <p className="text-sm text-[var(--ot-text-secondary)]">
                        Start by defining an area of interest and time window to query real Sentinel-1 SAR satellite observations from Copernicus.
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-2">
                        <div className="p-3 rounded-lg border border-[var(--ot-border)] bg-[var(--ot-shell)] space-y-1">
                          <div className="font-mono font-bold text-xs text-[var(--ot-text)]">1. SENTINEL-1 SAR</div>
                          <div className="text-[11px] text-[var(--ot-text-secondary)]">Real GRD catalogue search & VV grayscale image retrieval.</div>
                        </div>
                        <div className="p-3 rounded-lg border border-[var(--ot-border)] bg-[var(--ot-shell)] space-y-1">
                          <div className="font-mono font-bold text-xs text-[var(--ot-text)]">2. ANOMALY DETECTOR</div>
                          <div className="text-[11px] text-[var(--ot-text-secondary)]">Deterministic backscatter intensity segmentation.</div>
                        </div>
                        <div className="p-3 rounded-lg border border-[var(--ot-border)] bg-[var(--ot-shell)] space-y-1">
                          <div className="font-mono font-bold text-xs text-[var(--ot-text)]">3. GFW AIS PRESENCE</div>
                          <div className="text-[11px] text-[var(--ot-text-secondary)]">AIS vessel grid-cell presence from Global Fishing Watch.</div>
                        </div>
                        <div className="p-3 rounded-lg border border-[var(--ot-border)] bg-[var(--ot-shell)] space-y-1">
                          <div className="font-mono font-bold text-xs text-[var(--ot-text)]">4. CORRELATION</div>
                          <div className="text-[11px] text-[var(--ot-text-secondary)]">Transparent 4-factor spatio-temporal heuristic.</div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleStartNewInvestigation}
                        className="mt-4 rounded-lg bg-[var(--ot-primary)] px-5 py-3 text-sm font-bold text-white hover:bg-[var(--ot-primary-dark)] transition-all shadow-sm"
                      >
                        Start New Investigation
                      </button>
                    </div>

                    {savedInvestigations.length > 0 && (
                      <div className="rounded-xl border border-[var(--ot-border)] bg-[var(--ot-card)] p-5 space-y-3 font-mono">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--ot-text)]">
                          Saved Live Investigations ({savedInvestigations.length})
                        </h3>
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-[var(--ot-shell)] text-[var(--ot-muted)] border-b border-[var(--ot-border)]">
                              <tr>
                                <th className="p-2.5 font-bold">Record ID</th>
                                <th className="p-2.5 font-bold">Created / Updated</th>
                                <th className="p-2.5 font-bold">Status</th>
                                <th className="p-2.5 font-bold">Sentinel-1 Acquisition</th>
                                <th className="p-2.5 font-bold">AIS Vessels</th>
                                <th className="p-2.5 font-bold">Report Status</th>
                                <th className="p-2.5 font-bold text-right">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--ot-border)] text-[var(--ot-text-secondary)]">
                              {savedInvestigations.map((inv) => (
                                <tr key={inv.id}>
                                  <td className="p-2.5 font-bold text-[var(--ot-text)]">{inv.id}</td>
                                  <td className="p-2.5 text-[11px]">
                                    <div>{new Date(inv.createdAt).toLocaleDateString()}</div>
                                    <div className="text-[10px] text-[var(--ot-muted)]">Upd: {new Date(inv.updatedAt).toLocaleTimeString()}</div>
                                  </td>
                                  <td className="p-2.5">{inv.status}</td>
                                  <td className="p-2.5">{inv.sentinel1.selectedAcquisition?.datetime ? new Date(inv.sentinel1.selectedAcquisition.datetime).toISOString().replace('T', ' ').slice(0, 16) : 'None'}</td>
                                  <td className="p-2.5">{inv.ais.uniqueVessels.length} vessels ({inv.ais.observations.length} obs)</td>
                                  <td className="p-2.5">
                                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${inv.report.reportReady ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-slate-500/10 text-slate-400 border border-slate-500/20'}`}>
                                      {inv.report.reportReady ? '✓ Ready' : 'Pending'}
                                    </span>
                                  </td>
                                  <td className="p-2.5 text-right">
                                    <button
                                      type="button"
                                      onClick={() => void handleOpenSavedInvestigation(inv.id)}
                                      className="mr-2 rounded bg-[var(--ot-primary)] px-2.5 py-1 text-xs font-bold text-white hover:bg-[var(--ot-primary-dark)]"
                                    >
                                      Open
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setDeleteConfirmationId(inv.id)}
                                      className="px-2.5 py-1 text-red-500 hover:underline text-xs font-bold"
                                    >
                                      Delete
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* The investigation component remains mounted throughout the workspace to retain Live state. */}
            <div className={
              ['spill-analysis', 'drift-analysis', 'vessel-intelligence'].includes(activeTab)
                ? ''
                : 'hidden'
            }>
              <SpillDetection
                isDemoMode={false}
                loadedRecord={selectedLoadedRecord}
                workspaceTab={
                  activeTab === 'dashboard' || activeTab === 'spill-analysis' || activeTab === 'drift-analysis' || activeTab === 'vessel-intelligence'
                    ? activeTab
                    : 'dashboard'
                }
                onNavigateToMap={() => setActiveTab('vessel-intelligence')}
                onContinueToDrift={() => setActiveTab('drift-analysis')}
                resetRequestKey={resetInvestigationKey}
                onStatusChange={handleStatusChange}
              />
            </div>

            {/* TIMELINE TAB */}
            {activeTab === 'timeline' && (
              liveInvestigationStatus.started ? (
                <section className="glass-panel mx-auto w-full max-w-5xl rounded-xl border p-5 sm:p-6 space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h1 className="text-lg font-bold font-mono text-[var(--ot-text)]">Investigation Timeline Chronology</h1>
                      <p className="mt-1 text-xs text-[var(--ot-text-secondary)] font-mono">Actual evidence timestamps from current live investigation state.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab('trajectory')}
                      className="px-3 py-1.5 rounded-lg bg-[var(--ot-primary)] text-white text-xs font-bold flex items-center gap-1"
                    >
                      <span>Continue to Trajectory</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  {liveTimelineEvents.length > 0 ? (
                    <ol className="mt-5 space-y-3 font-mono">
                      {liveTimelineEvents.map((event, index) => (
                        <li key={`${event.label}-${index}`} className="flex min-w-0 gap-3 rounded-lg border border-[var(--ot-border)] bg-[var(--ot-shell)] p-3.5">
                          <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[var(--ot-primary)]" />
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-[var(--ot-text)]">{event.label}</div>
                            <div className="mt-1 break-words text-xs leading-5 text-[var(--ot-text-secondary)]">{event.detail}</div>
                            {event.timestamp && (
                              <time className="mt-1 block text-[11px] text-[var(--ot-muted)]" dateTime={event.timestamp}>
                                {new Date(event.timestamp).toLocaleString()}
                              </time>
                            )}
                          </div>
                        </li>
                      ))}
                    </ol>
                  ) : (
                    <p className="mt-4 rounded-md border border-[var(--ot-border)] bg-[var(--ot-shell)] p-3 text-xs font-mono text-[var(--ot-text-secondary)]">
                      No live investigation timeline is available yet.
                    </p>
                  )}
                </section>
              ) : (
                <section className="glass-panel mx-auto w-full max-w-5xl rounded-xl border p-5 sm:p-6">
                  <h1 className="text-lg font-bold font-mono text-[var(--ot-text)]">Investigation Timeline</h1>
                  <p className="mt-2 text-xs font-mono text-[var(--ot-text-secondary)]">No live investigation timeline is available yet.</p>
                </section>
              )
            )}

            {/* TRAJECTORY REPLAY TAB */}
            {activeTab === 'trajectory' && (
              <section className="glass-panel mx-auto w-full max-w-6xl rounded-xl border p-5 sm:p-6 space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h1 className="text-lg font-bold font-mono text-[var(--ot-text)]">Vessel Trajectory Evidence</h1>
                    <p className="text-xs text-[var(--ot-text-secondary)] font-mono">Actual AIS-derived vessel observations from Global Fishing Watch.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('reports')}
                    className="px-3 py-1.5 rounded-lg bg-[var(--ot-primary)] text-white text-xs font-bold flex items-center gap-1"
                  >
                    <span>Open Report</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
                {liveAisResult && liveAisResult.observations.length > 0 ? (
                  <div className="space-y-4 font-mono">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="rounded-lg border border-[var(--ot-border)] bg-[var(--ot-shell)] p-3">
                        <div className="text-[10px] text-[var(--ot-muted)] uppercase font-bold">Selected Vessel</div>
                        <div className="mt-1 text-xs font-bold text-[var(--ot-text)]">
                          {liveSelectedVessel
                            ? `${liveSelectedVessel.name ?? liveSelectedVessel.id}${liveSelectedVessel.mmsi ? ` · MMSI ${liveSelectedVessel.mmsi}` : ''}`
                            : 'No vessel selected'}
                        </div>
                      </div>
                      <div className="rounded-lg border border-[var(--ot-border)] bg-[var(--ot-shell)] p-3">
                        <div className="text-[10px] text-[var(--ot-muted)] uppercase font-bold">Investigation Period</div>
                        <div className="mt-1 break-words text-xs font-bold text-[var(--ot-text)]">
                          {liveAisResult.investigation.from} – {liveAisResult.investigation.to}
                        </div>
                      </div>
                    </div>
                    <p className="rounded-lg border border-amber-500/20 bg-amber-900/10 p-3 text-xs leading-5 text-amber-300">
                      AIS positions represent GFW grid-cell centers, not exact vessel fixes. Observations are shown individually; no connected route is inferred.
                    </p>
                    <div className="max-h-[28rem] max-w-full overflow-auto rounded-lg border border-[var(--ot-border)]">
                      <table className="w-full min-w-[680px] text-left text-xs">
                        <thead className="sticky top-0 bg-[var(--ot-shell)] text-[var(--ot-muted)]">
                          <tr>
                            <th className="px-3 py-2 font-bold">Vessel</th>
                            <th className="px-3 py-2 font-bold">MMSI</th>
                            <th className="px-3 py-2 font-bold">Observation Time</th>
                            <th className="px-3 py-2 font-bold">Latitude</th>
                            <th className="px-3 py-2 font-bold">Longitude</th>
                            <th className="px-3 py-2 font-bold">Location Type</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--ot-border)] text-[var(--ot-text-secondary)]">
                          {liveAisResult.observations
                            .filter((observation) => !liveInvestigationStatus.selectedVesselId || observation.id === liveInvestigationStatus.selectedVesselId)
                            .map((observation, index) => (
                              <tr key={`${observation.id ?? observation.mmsi ?? 'observation'}-${observation.date}-${index}`}>
                                <td className="px-3 py-2 font-bold text-[var(--ot-text)]">{observation.name ?? observation.id ?? 'Unknown vessel'}</td>
                                <td className="px-3 py-2">{observation.mmsi ?? '—'}</td>
                                <td className="px-3 py-2">{observation.date}</td>
                                <td className="px-3 py-2">{observation.lat}</td>
                                <td className="px-3 py-2">{observation.lon}</td>
                                <td className="px-3 py-2">GFW grid-cell center</td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <p className="mt-2 text-xs font-mono text-[var(--ot-text-secondary)]">No vessel trajectory data is available yet.</p>
                )}
              </section>
            )}

            {/* REPORTS TAB */}
            {activeTab === 'reports' && (
              <InvestigationReport
                isDemoMode={isDemoMode}
                spillIncident={null as any}
                topCandidates={[]}
                liveStatus={liveInvestigationStatus}
                investigationId={currentInvestigationId}
                onNavigateToPipeline={() => setActiveTab('ai-pipeline')}
              />
            )}

            {/* AI PIPELINE TAB */}
            {activeTab === 'ai-pipeline' && (
              <AIPipeline
                isDemoMode={isDemoMode}
                liveStatus={liveInvestigationStatus}
              />
            )}
          </>
        )}
      </main>
      </div>
      </div>

      {/* Delete Saved Investigation Confirmation Modal */}
      {deleteConfirmationId && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-black/60">
          <div className="relative w-full max-w-md glass-panel rounded-xl border border-[#26334d] p-6 shadow-2xl space-y-4 font-mono">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Confirm Delete Record</h3>
            <p className="text-xs text-slate-300">
              Delete investigation {deleteConfirmationId}? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmationId(null)}
                className="px-3 py-1.5 rounded bg-[#182238] text-slate-300 hover:text-white text-xs font-bold border border-[#26334d]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleDeleteSavedInvestigation(deleteConfirmationId)}
                className="px-3 py-1.5 rounded bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-sm"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Audit Logs Modal (For Administrator Role) */}
      {showAdminAuditLogs && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-black/60">
          <div className="relative w-full max-w-xl glass-panel rounded-xl border border-[#26334d] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#1e2a42] pb-3">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-blue-400" />
                <h3 className="font-mono font-bold text-sm text-white">SYSTEM AUDIT LOGS & USER ACCESS</h3>
              </div>
              <button onClick={() => setShowAdminAuditLogs(false)} className="text-slate-400 hover:text-white font-mono text-xs">✕ CLOSE</button>
            </div>

            <p className="text-xs text-slate-300 font-mono">
              User identity: {profile?.name || 'Unauthenticated'} · Role: {profile?.role || 'None'} · Database RLS: Active (`auth.uid() = user_id`)
            </p>
          </div>
        </div>
      )}

      {/* Correlation Modal View */}
      {isCorrelationOpen && selectedVessel && (
        <CorrelationModal
          vessel={selectedVessel}
          onClose={() => setIsCorrelationOpen(false)}
          onPlayTrajectory={(v) => {
            setSelectedVessel(v);
            setIsCorrelationOpen(false);
            setActiveTab('trajectory');
          }}
          onViewTimeline={() => {
            setIsCorrelationOpen(false);
            setActiveTab('timeline');
          }}
        />
      )}

      {/* Footer */}
      <footer className="border-t border-[#d9e3e7] bg-[#eef4f2] py-4 px-4 text-center text-xs text-[#60727a]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            🌊 <strong>OceanTrace</strong> · Maritime environmental intelligence
          </div>
          <div className="text-[11px] text-slate-600">
            Satellite imagery and AIS correlation for marine environmental surveillance
          </div>
        </div>
      </footer>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};
