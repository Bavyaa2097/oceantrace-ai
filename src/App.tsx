import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { MetricCards } from './components/MetricCards';
import { MainMap } from './components/MainMap';
import { SpillAnalysisPanel } from './components/SpillAnalysisPanel';
import { SpillDetection } from './components/SpillDetection';
import { DriftAnalysis } from './components/DriftAnalysis';
import { VesselTable } from './components/VesselTable';
import { CorrelationModal } from './components/CorrelationModal';
import { IncidentTimeline } from './components/IncidentTimeline';
import { TrajectoryPlayer } from './components/TrajectoryPlayer';
import { InvestigationReport } from './components/InvestigationReport';
import { AIPipeline } from './components/AIPipeline';
import { AlertSystem } from './components/AlertSystem';
import { DemoRunner } from './components/DemoRunner';
import { LandingPage } from './components/LandingPage';
import { LoginPage } from './components/LoginPage';
import { WorkspaceSidebar } from './components/WorkspaceSidebar';
import { LiveInvestigationStatus } from './components/SpillDetection';

import { INITIAL_SPILL_INCIDENT, TRACKED_VESSELS, TIMELINE_EVENTS } from './data/demoData';
import { Vessel } from './types';
import { ShieldCheck, Eye, Lock, FileText, Database, Activity } from 'lucide-react';

const InvestigationPlaceholder: React.FC<{ title: string }> = ({ title }) => (
  <section className="glass-panel mx-auto max-w-4xl rounded-xl border p-6 sm:p-8">
    <h1 className="text-lg font-bold text-[var(--ot-text)]">{title}</h1>
    <p className="mt-2 text-sm text-[var(--ot-text-secondary)]">
      No sample or simulated results are shown in Live Mode.
    </p>
  </section>
);

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('landing');
  const [isDemoMode, setIsDemoMode] = useState<boolean>(true);
  const [selectedVessel, setSelectedVessel] = useState<Vessel | null>(TRACKED_VESSELS[0]);
  const [isCorrelationOpen, setIsCorrelationOpen] = useState<boolean>(false);
  const [showAlertModal, setShowAlertModal] = useState<boolean>(true);
  const [autoCenterTrigger, setAutoCenterTrigger] = useState<number>(0);
  const [showAdminAuditLogs, setShowAdminAuditLogs] = useState<boolean>(false);
  const [isNightMode, setIsNightMode] = useState<boolean>(() => localStorage.getItem('oceantrace_theme') === 'night');
  const [resetInvestigationKey, setResetInvestigationKey] = useState(0);
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

  // Authentication & Role State (localStorage persistence)
  const [currentUser, setCurrentUser] = useState<{
    name: string;
    email: string;
    role: 'Investigator' | 'Administrator' | 'Viewer / Authority';
    organization: string;
  } | null>(null);

  useEffect(() => {
    const savedUser = localStorage.getItem('oceantrace_user');
    if (savedUser) {
      try {
        setCurrentUser(JSON.parse(savedUser));
      } catch (e) {
        console.error("Failed to parse saved user session", e);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('oceantrace_theme', isNightMode ? 'night' : 'bright');
  }, [isNightMode]);

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

  // Demo Runner States
  const [isDemoRunning, setIsDemoRunning] = useState<boolean>(false);
  const [currentDemoStep, setCurrentDemoStep] = useState<number>(1);

  const demoSteps = [
    { step: 1, tab: 'spill-analysis', name: '1. Load the Sentinel-1 SAR scene' },
    { step: 2, tab: 'spill-analysis', name: '2. Segment the slick and trace its boundary' },
    { step: 3, tab: 'spill-analysis', name: '3. Review detection confidence (94.7%)' },
    { step: 4, tab: 'drift-analysis', name: '4. Reconstruct the backward drift path' },
    { step: 5, tab: 'drift-analysis', name: '5. Locate the probable origin zone' },
    { step: 6, tab: 'vessel-intelligence', name: '6. Cross-match 1,284 AIS vessel tracks' },
    { step: 7, tab: 'vessel-intelligence', name: '7. Review the leading candidate vessel' },
    { step: 8, tab: 'dashboard', name: '8. Open the spatio-temporal correlation view', openModal: true },
    { step: 9, tab: 'reports', name: '9. Compile the incident investigation report' },
  ];

  const handleRunDemoScenario = () => {
    setIsDemoRunning(true);
    setCurrentDemoStep(1);
    setActiveTab(demoSteps[0].tab);
    setAutoCenterTrigger(prev => prev + 1);
  };

  const handleNextDemoStep = () => {
    if (currentDemoStep >= demoSteps.length) {
      setIsDemoRunning(false);
      return;
    }

    const nextIndex = currentDemoStep;
    const stepConfig = demoSteps[nextIndex];
    setCurrentDemoStep(nextIndex + 1);
    setActiveTab(stepConfig.tab);

    if (stepConfig.openModal) {
      setIsCorrelationOpen(true);
    }
  };

  const handleToggleDemoMode = (demoState: boolean) => {
    setIsDemoMode(demoState);
    if (!demoState) {
      setShowAlertModal(false);
      setSelectedVessel(null);
      setIsCorrelationOpen(false);
      setIsDemoRunning(false);
    }
  };

  const handleSelectVessel = (vessel: Vessel) => {
    setSelectedVessel(vessel);
    setIsCorrelationOpen(true);
  };

  const handleLoginSuccess = (user: {
    name: string;
    email: string;
    role: 'Investigator' | 'Administrator' | 'Viewer / Authority';
    organization: string;
  }) => {
    setCurrentUser(user);
    setActiveTab('dashboard');
  };

  const handleLogout = () => {
    localStorage.removeItem('oceantrace_user');
    setCurrentUser(null);
    setActiveTab('login');
  };

  const handleExplorePlatform = () => {
    if (currentUser) {
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
    reports: 'Not generated',
    'ai-pipeline': 'Informational',
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
            ? 'Derived from selected SAR anomaly candidate'
            : 'Coordinates entered in Drift & Origin',
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

  return (
    <div className={`app-shell ${isNightMode ? 'theme-night' : 'theme-bright'} min-h-screen text-[#172A33] flex flex-col font-sans selection:bg-[#176B87] selection:text-white`}>
      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isDemoMode={isDemoMode}
        setIsDemoMode={handleToggleDemoMode}
        onRunDemoScenario={handleRunDemoScenario}
        isDemoRunning={isDemoRunning}
        currentUser={currentUser}
        onOpenAuth={() => setActiveTab('login')}
        onLogout={handleLogout}
        isNightMode={isNightMode}
        onToggleTheme={() => setIsNightMode((current) => !current)}
        workspaceMode={isWorkspaceTab}
        showDesktopNavigation={!isWorkspaceTab}
        workspaceStatusLabels={isDemoMode ? {} : workspaceStatusLabels}
      />

      <div className="flex min-h-0 flex-1">
      {isWorkspaceTab && (
        <WorkspaceSidebar
          activeTab={activeTab}
          onNavigate={setActiveTab}
          isDemoMode={isDemoMode}
          investigationStarted={liveInvestigationStatus.started}
          statusLabels={workspaceStatusLabels}
        />
      )}
      <div className="flex min-w-0 flex-1 flex-col">
      {/* Role Notice Indicator Banner */}
      {currentUser && (
        <div className="bg-white border-b border-[#D9E3E7] py-2 px-4 text-xs flex items-center justify-between text-[#647780]">
          <div className="flex items-center gap-2 max-w-7xl mx-auto w-full">
            <span className="text-[#176B87] font-semibold">Active session:</span>
            <span>{currentUser.name}</span>
            <span>•</span>
            <span className="px-2 py-0.5 rounded bg-[#E8F2F4] text-[#176B87] border border-[#BFD8DF] font-semibold text-[10px]">
              {currentUser.role}
            </span>
            <span>•</span>
            <span className="text-slate-500 truncate hidden sm:inline">{currentUser.organization}</span>

            {currentUser.role === 'Viewer / Authority' && (
              <span className="ml-auto text-[#a66f11] font-semibold bg-[#fff7e6] border border-[#e8c978] px-2 py-0.5 rounded text-[10px]">
              Read-only access
              </span>
            )}

            {currentUser.role === 'Administrator' && (
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
        
        {/* LOGIN PAGE TAB */}
        {activeTab === 'login' && (
          <LoginPage onLoginSuccess={handleLoginSuccess} />
        )}

        {/* LANDING PAGE TAB */}
        {activeTab === 'landing' && (
          <LandingPage
            onExplore={handleExplorePlatform}
            onRunDemo={handleRunDemoScenario}
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
                  {isDemoMode
                    ? 'Review active alerts, vessel movements, and the latest satellite observations.'
                    : 'Review the current investigation or begin a new Sentinel-1 observation search.'}
                </p>
              </div>
              {isDemoMode && (
                <div className="text-xs text-[#60727a] sm:text-right">
                  <span className="inline-flex items-center gap-1.5 text-[#237e73] font-semibold">
                    <span className="w-2 h-2 rounded-full bg-[#2f8f83]" />
                    Sample feeds operational
                  </span>
                  <span className="block mt-1">Last refreshed 14 Sep 2026 · 12:10 UTC</span>
                </div>
              )}
            </div>
            {!isDemoMode && (
              <div className="rounded-lg border border-[var(--ot-border)] bg-[var(--ot-card)] p-3">
                <div className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--ot-muted)]">Investigation workflow</div>
                <ol className="flex flex-wrap items-center gap-2 text-[11px]">
                  {[
                    { label: 'Sentinel-1', complete: liveInvestigationStatus.acquisitionDatetime !== null },
                    { label: 'SAR anomaly', complete: liveInvestigationStatus.anomalyCandidateCount !== null },
                    { label: 'Focus', complete: liveInvestigationStatus.focus !== null },
                    { label: 'AIS', complete: liveInvestigationStatus.aisObservationCount !== null },
                    { label: 'Correlation', complete: liveInvestigationStatus.correlationStatus === 'Complete' },
                    { label: 'Report', complete: false },
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
            )}
            {isDemoMode ? (
              <>
                <MetricCards />
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                  <div className="reveal lg:col-span-8">
                    <MainMap
                      spillIncident={INITIAL_SPILL_INCIDENT}
                      vessels={TRACKED_VESSELS}
                      selectedVesselId={selectedVessel?.id || null}
                      onSelectVessel={handleSelectVessel}
                      autoCenterTrigger={autoCenterTrigger}
                    />
                  </div>
                  <div className="reveal lg:col-span-4">
                    <SpillAnalysisPanel
                      spillIncident={INITIAL_SPILL_INCIDENT}
                      topCandidateVessel={TRACKED_VESSELS[0]}
                      onNavigateToAnalysis={() => setActiveTab('spill-analysis')}
                      onInspectVessel={handleSelectVessel}
                    />
                  </div>
                </div>
              </>
            ) : (
              liveInvestigationStatus.started ? (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h2 className="text-base font-semibold text-[var(--ot-text)]">Current investigation</h2>
                      <p className="mt-1 text-sm text-[var(--ot-text-secondary)]">
                        Live status from this workspace. No sample results are included.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setResetInvestigationKey((key) => key + 1)}
                      className="rounded-md border border-[var(--ot-border)] px-3 py-2 text-xs font-semibold text-[var(--ot-text-secondary)] hover:border-[var(--ot-primary)] hover:text-[var(--ot-primary)]"
                    >
                      Reset Investigation
                    </button>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {[
                      ['Sentinel-1 catalogue', liveInvestigationStatus.searchStatus],
                      ['Selected acquisition', liveInvestigationStatus.acquisitionDatetime ?? 'None selected'],
                      ['Area of interest', liveInvestigationStatus.bbox
                        ? `${liveInvestigationStatus.bbox[0]}, ${liveInvestigationStatus.bbox[1]} – ${liveInvestigationStatus.bbox[2]}, ${liveInvestigationStatus.bbox[3]}`
                        : 'Not set'],
                      ['Observation period', liveInvestigationStatus.from && liveInvestigationStatus.to
                        ? `${liveInvestigationStatus.from} – ${liveInvestigationStatus.to}`
                        : 'Not set'],
                      ['SAR anomaly candidates', liveInvestigationStatus.anomalyCandidateCount === null ? 'Not analyzed' : String(liveInvestigationStatus.anomalyCandidateCount)],
                      ['Investigation focus', liveInvestigationStatus.focus ?? 'Not set'],
                      ['AIS observations / vessels', liveInvestigationStatus.aisObservationCount === null
                        ? 'Not searched'
                        : `${liveInvestigationStatus.aisObservationCount} / ${liveInvestigationStatus.aisUniqueVesselCount ?? 0}`],
                      ['Correlation', liveInvestigationStatus.correlationStatus],
                    ].map(([label, value]) => (
                      <div key={label} className="rounded-lg border border-[var(--ot-border)] bg-[var(--ot-card)] p-4">
                        <div className="text-xs text-[var(--ot-muted)]">{label}</div>
                        <div className="mt-2 break-words text-sm font-semibold text-[var(--ot-text)]">{value}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="glass-panel rounded-xl border p-6 sm:p-8">
                  <h2 className="text-lg font-bold text-[var(--ot-text)]">No live investigation started</h2>
                  <p className="mt-2 text-sm text-[var(--ot-text-secondary)]">
                    Start by defining an area and time range for a Sentinel-1 catalogue search.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setResetInvestigationKey((key) => key + 1);
                      setActiveTab('spill-analysis');
                    }}
                    className="mt-4 rounded-md bg-[var(--ot-primary)] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[var(--ot-primary-dark)]"
                  >
                    Start New Investigation
                  </button>
                </div>
              )
            )}
          </div>
        )}

        {/* The investigation component remains mounted throughout the workspace to retain Live state. */}
        <div className={
          (!isDemoMode && ['spill-analysis', 'drift-analysis', 'vessel-intelligence'].includes(activeTab)) ||
          (isDemoMode && activeTab === 'spill-analysis')
            ? ''
            : 'hidden'
        }>
          <SpillDetection
            isDemoMode={isDemoMode}
            workspaceTab={
              activeTab === 'dashboard' || activeTab === 'spill-analysis' || activeTab === 'drift-analysis' || activeTab === 'vessel-intelligence'
                ? activeTab
                : 'dashboard'
            }
            onNavigateToMap={() => setActiveTab('vessel-intelligence')}
            onContinueToDrift={() => setActiveTab('drift-analysis')}
            resetRequestKey={resetInvestigationKey}
            onStatusChange={setLiveInvestigationStatus}
          />
        </div>

        {/* DRIFT & ORIGIN TAB */}
        {isDemoMode && activeTab === 'drift-analysis' && (
          <DriftAnalysis
            spillIncident={INITIAL_SPILL_INCIDENT}
            onNavigateToVessels={() => setActiveTab('vessel-intelligence')}
          />
        )}

        {/* VESSEL INTELLIGENCE TAB */}
        {isDemoMode && activeTab === 'vessel-intelligence' && (
          <VesselTable
            vessels={TRACKED_VESSELS}
            selectedVesselId={selectedVessel?.id || null}
            onSelectVessel={handleSelectVessel}
          />
        )}

        {/* TIMELINE TAB */}
        {activeTab === 'timeline' && (
          isDemoMode
            ? <IncidentTimeline events={TIMELINE_EVENTS} />
            : liveInvestigationStatus.started ? (
              <section className="glass-panel mx-auto w-full max-w-5xl rounded-xl border p-5 sm:p-6">
                <h1 className="text-lg font-bold text-[var(--ot-text)]">Investigation timeline</h1>
                <p className="mt-1 text-sm text-[var(--ot-text-secondary)]">Evidence chronology from the current Live investigation state.</p>
                {liveTimelineEvents.length > 0 ? (
                  <ol className="mt-5 space-y-3">
                    {liveTimelineEvents.map((event, index) => (
                      <li key={`${event.label}-${index}`} className="flex min-w-0 gap-3 rounded-lg border border-[var(--ot-border)] bg-[var(--ot-shell)] p-3">
                        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[var(--ot-primary)]" />
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-[var(--ot-text)]">{event.label}</div>
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
                  <p className="mt-4 rounded-md border border-[var(--ot-border)] bg-[var(--ot-shell)] p-3 text-sm text-[var(--ot-text-secondary)]">
                    No evidence events are available yet.
                  </p>
                )}
              </section>
            ) : (
              <section className="glass-panel mx-auto w-full max-w-5xl rounded-xl border p-5 sm:p-6">
                <h1 className="text-lg font-bold text-[var(--ot-text)]">Investigation timeline</h1>
                <p className="mt-2 text-sm text-[var(--ot-text-secondary)]">No live investigation timeline is available yet.</p>
              </section>
            )
        )}

        {/* TRAJECTORY REPLAY TAB */}
        {activeTab === 'trajectory' && (
          isDemoMode
            ? <TrajectoryPlayer
                vessel={selectedVessel || TRACKED_VESSELS[0]}
                spillIncident={INITIAL_SPILL_INCIDENT}
              />
            : (
              <section className="glass-panel mx-auto w-full max-w-6xl rounded-xl border p-5 sm:p-6">
                <h1 className="text-lg font-bold text-[var(--ot-text)]">Vessel trajectory evidence</h1>
                {liveAisResult && liveAisResult.observations.length > 0 ? (
                  <div className="mt-4 space-y-4">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="rounded-lg border border-[var(--ot-border)] bg-[var(--ot-shell)] p-3">
                        <div className="text-xs text-[var(--ot-muted)]">Selected vessel</div>
                        <div className="mt-1 text-sm font-semibold text-[var(--ot-text)]">
                          {liveSelectedVessel
                            ? `${liveSelectedVessel.name ?? liveSelectedVessel.id}${liveSelectedVessel.mmsi ? ` · MMSI ${liveSelectedVessel.mmsi}` : ''}`
                            : 'No vessel selected'}
                        </div>
                      </div>
                      <div className="rounded-lg border border-[var(--ot-border)] bg-[var(--ot-shell)] p-3">
                        <div className="text-xs text-[var(--ot-muted)]">Investigation period</div>
                        <div className="mt-1 break-words text-sm font-semibold text-[var(--ot-text)]">
                          {liveAisResult.investigation.from} – {liveAisResult.investigation.to}
                        </div>
                      </div>
                    </div>
                    <p className="rounded-lg border border-[var(--ot-border)] bg-[var(--ot-shell)] p-3 text-xs leading-5 text-[var(--ot-text-secondary)]">
                      Locations below are AIS-derived GFW grid-cell-center observations, not exact vessel fixes. Observations are shown individually; no connected route is inferred.
                    </p>
                    <div className="max-h-[28rem] max-w-full overflow-auto rounded-lg border border-[var(--ot-border)]">
                      <table className="w-full min-w-[680px] text-left text-xs">
                        <thead className="sticky top-0 bg-[var(--ot-shell)] text-[var(--ot-text-secondary)]">
                          <tr>
                            <th className="px-3 py-2 font-semibold">Vessel</th>
                            <th className="px-3 py-2 font-semibold">MMSI</th>
                            <th className="px-3 py-2 font-semibold">Observation time</th>
                            <th className="px-3 py-2 font-semibold">Latitude</th>
                            <th className="px-3 py-2 font-semibold">Longitude</th>
                            <th className="px-3 py-2 font-semibold">Location type</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--ot-border)]">
                          {liveAisResult.observations
                            .filter((observation) => !liveInvestigationStatus.selectedVesselId || observation.id === liveInvestigationStatus.selectedVesselId)
                            .map((observation, index) => (
                              <tr key={`${observation.id ?? observation.mmsi ?? 'observation'}-${observation.date}-${index}`}>
                                <td className="px-3 py-2 text-[var(--ot-text)]">{observation.name ?? observation.id ?? 'Unknown vessel'}</td>
                                <td className="px-3 py-2 text-[var(--ot-text-secondary)]">{observation.mmsi ?? '—'}</td>
                                <td className="px-3 py-2 text-[var(--ot-text-secondary)]">{observation.date}</td>
                                <td className="px-3 py-2 text-[var(--ot-text-secondary)]">{observation.lat}</td>
                                <td className="px-3 py-2 text-[var(--ot-text-secondary)]">{observation.lon}</td>
                                <td className="px-3 py-2 text-[var(--ot-text-secondary)]">GFW grid-cell center</td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                    {liveInvestigationStatus.selectedVesselId && liveAisResult.observations.every(
                      (observation) => observation.id !== liveInvestigationStatus.selectedVesselId,
                    ) && (
                      <p className="text-xs text-[var(--ot-text-secondary)]">No observations are available for the selected vessel.</p>
                    )}
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-[var(--ot-text-secondary)]">No vessel trajectory data is available yet.</p>
                )}
              </section>
            )
        )}

        {/* REPORTS TAB */}
        {activeTab === 'reports' && (
          isDemoMode
            ? <InvestigationReport
                spillIncident={INITIAL_SPILL_INCIDENT}
                topCandidates={TRACKED_VESSELS}
              />
            : <InvestigationPlaceholder title="An investigation report is not available until live findings are assembled." />
        )}

        {/* AI PIPELINE TAB */}
        {activeTab === 'ai-pipeline' && (
          isDemoMode
            ? <AIPipeline />
            : <InvestigationPlaceholder title="No automated analysis is running for this live investigation." />
        )}
      </main>
      </div>
      </div>

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

            {isDemoMode ? (
              <div className="space-y-2 text-xs font-mono">
                <div className="p-2.5 rounded bg-[#0f1624] border border-[#1e2a42] flex justify-between">
                  <span className="text-blue-300">12:05 UTC • USER LOGIN</span>
                  <span className="text-slate-500">Capt. Rajesh Kumar (Investigator)</span>
                </div>
                <div className="p-2.5 rounded bg-[#0f1624] border border-[#1e2a42] flex justify-between">
                  <span className="text-teal-300">11:42 UTC • SAR MODEL RUN</span>
                  <span className="text-slate-500">Sentinel-1 Segmentation (94.7%)</span>
                </div>
                <div className="p-2.5 rounded bg-[#0f1624] border border-[#1e2a42] flex justify-between">
                  <span className="text-amber-300">11:15 UTC • CORRELATION MATCH</span>
                  <span className="text-slate-500">MV Ocean Star (90.3% Score)</span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-[var(--ot-text-secondary)]">No live audit records are available.</p>
            )}
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

      {/* High Priority Emergency Alert Banner */}
      {isDemoMode && showAlertModal && (
        <AlertSystem
          spillIncident={INITIAL_SPILL_INCIDENT}
          onInvestigate={() => {
            setShowAlertModal(false);
            handleSelectVessel(TRACKED_VESSELS[0]);
          }}
          onViewMap={() => {
            setShowAlertModal(false);
            setActiveTab('dashboard');
          }}
          onDismiss={() => setShowAlertModal(false)}
        />
      )}

      {/* Guided scenario controller */}
      <DemoRunner
        currentDemoStep={currentDemoStep}
        totalSteps={demoSteps.length}
        stepName={demoSteps[currentDemoStep - 1]?.name || ''}
        isDemoRunning={isDemoRunning}
        onNextStep={handleNextDemoStep}
        onStopDemo={() => setIsDemoRunning(false)}
      />

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
