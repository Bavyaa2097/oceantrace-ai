import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { JudgeBanner } from './components/JudgeBanner';
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

import { INITIAL_SPILL_INCIDENT, TRACKED_VESSELS, TIMELINE_EVENTS } from './data/demoData';
import { Vessel } from './types';
import { ShieldCheck, Eye, Lock, FileText, Database, Activity } from 'lucide-react';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('landing');
  const [isDemoMode, setIsDemoMode] = useState<boolean>(true);
  const [selectedVessel, setSelectedVessel] = useState<Vessel | null>(TRACKED_VESSELS[0]);
  const [isCorrelationOpen, setIsCorrelationOpen] = useState<boolean>(false);
  const [showAlertModal, setShowAlertModal] = useState<boolean>(true);
  const [autoCenterTrigger, setAutoCenterTrigger] = useState<number>(0);
  const [showAdminAuditLogs, setShowAdminAuditLogs] = useState<boolean>(false);
  const [isNightMode, setIsNightMode] = useState<boolean>(() => localStorage.getItem('oceantrace_theme') === 'night');

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
    { step: 1, tab: 'spill-analysis', name: '1. Ingesting Sentinel-1 SAR Satellite Image' },
    { step: 2, tab: 'spill-analysis', name: '2. Segmenting Oil Slick & Extracting Boundary' },
    { step: 3, tab: 'spill-analysis', name: '3. Calculating Detection Confidence (94.7%)' },
    { step: 4, tab: 'drift-analysis', name: '4. Computing Hydrodynamic Backward Drift Path' },
    { step: 5, tab: 'drift-analysis', name: '5. Identifying Probable Origin Zone (10.761° N, 72.218° E)' },
    { step: 6, tab: 'vessel-intelligence', name: '6. Ingesting & Cross-matching 1,284 AIS Vessel Tracks' },
    { step: 7, tab: 'vessel-intelligence', name: '7. Highlighting Top Candidate Vessel (MV Ocean Star)' },
    { step: 8, tab: 'dashboard', name: '8. Displaying Spatio-Temporal Correlation Analysis (90.3%)', openModal: true },
    { step: 9, tab: 'reports', name: '9. Compiling Final Incident Investigation Dossier' },
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
      alert("Live satellite/AIS integrations can be connected during deployment.");
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
      />

      {/* SIH Judge 30-Second Value Proposition Banner */}
      <JudgeBanner />

      {/* Role Notice Indicator Banner */}
      {currentUser && (
        <div className="bg-white border-b border-[#D9E3E7] py-2 px-4 text-xs flex items-center justify-between text-[#647780]">
          <div className="flex items-center gap-2 max-w-7xl mx-auto w-full">
            <span className="text-[#176B87] font-semibold">Active session:</span>
            <span>{currentUser.name}</span>
            <span>•</span>
            <span className="px-2 py-0.5 rounded bg-[#E8F2F4] text-[#176B87] border border-[#BFD8DF] font-semibold text-[10px]">
              ROLE: {currentUser.role.toUpperCase()}
            </span>
            <span>•</span>
            <span className="text-slate-500 truncate hidden sm:inline">{currentUser.organization}</span>

            {currentUser.role === 'Viewer / Authority' && (
              <span className="ml-auto text-amber-400 font-semibold bg-amber-900/20 border border-amber-500/20 px-2 py-0.5 rounded text-[10px]">
                [READ-ONLY ACCESS MODE]
              </span>
            )}

            {currentUser.role === 'Administrator' && (
              <button
                onClick={() => setShowAdminAuditLogs(true)}
                className="ml-auto text-[#176B87] hover:text-[#123B4A] font-semibold bg-[#F4F7F8] border border-[#D9E3E7] hover:border-[#176B87] px-2 py-1 rounded text-[10px] flex items-center gap-1 transition-all"
              >
                <Activity className="w-3 h-3 text-blue-400" />
                <span>SYSTEM AUDIT LOGS</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
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
            {/* KPI Metrics Header */}
            <MetricCards />

            {/* Main Map + Side Panel Row */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
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
          </div>
        )}

        {/* SPILL ANALYSIS TAB */}
        {activeTab === 'spill-analysis' && (
          <SpillDetection
            spillIncident={INITIAL_SPILL_INCIDENT}
            onNavigateToMap={() => setActiveTab('dashboard')}
          />
        )}

        {/* DRIFT & ORIGIN TAB */}
        {activeTab === 'drift-analysis' && (
          <DriftAnalysis
            spillIncident={INITIAL_SPILL_INCIDENT}
            onNavigateToVessels={() => setActiveTab('vessel-intelligence')}
          />
        )}

        {/* VESSEL INTELLIGENCE TAB */}
        {activeTab === 'vessel-intelligence' && (
          <VesselTable
            vessels={TRACKED_VESSELS}
            selectedVesselId={selectedVessel?.id || null}
            onSelectVessel={handleSelectVessel}
          />
        )}

        {/* TIMELINE TAB */}
        {activeTab === 'timeline' && (
          <IncidentTimeline events={TIMELINE_EVENTS} />
        )}

        {/* TRAJECTORY REPLAY TAB */}
        {activeTab === 'trajectory' && (
          <TrajectoryPlayer
            vessel={selectedVessel || TRACKED_VESSELS[0]}
            spillIncident={INITIAL_SPILL_INCIDENT}
          />
        )}

        {/* REPORTS TAB */}
        {activeTab === 'reports' && (
          <InvestigationReport
            spillIncident={INITIAL_SPILL_INCIDENT}
            topCandidates={TRACKED_VESSELS}
          />
        )}

        {/* AI PIPELINE TAB */}
        {activeTab === 'ai-pipeline' && <AIPipeline />}
      </main>

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
      {showAlertModal && (
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

      {/* Demo Scenario Automated Overlay Controller */}
      <DemoRunner
        currentDemoStep={currentDemoStep}
        totalSteps={demoSteps.length}
        stepName={demoSteps[currentDemoStep - 1]?.name || ''}
        isDemoRunning={isDemoRunning}
        onNextStep={handleNextDemoStep}
        onStopDemo={() => setIsDemoRunning(false)}
      />

      {/* Footer */}
      <footer className="border-t border-[#1e2a42] bg-[#0d1424] py-4 px-4 text-center text-xs text-slate-500 font-mono">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            🌊 <strong>OCEANTRACE AI</strong> • Smart India Hackathon 2026 (SIH26143)
          </div>
          <div className="text-[11px] text-slate-600">
            Satellite Imagery & AIS Data Correlation for Marine Environmental Surveillance
          </div>
        </div>
      </footer>
    </div>
  );
};
