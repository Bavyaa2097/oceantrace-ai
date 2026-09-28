import React, { useState } from 'react';
import { ArrowDown, Cpu, CheckCircle2 } from 'lucide-react';
import { LiveInvestigationStatus } from './SpillDetection';

export interface AIPipelineProps {
  isDemoMode?: boolean;
  liveStatus?: LiveInvestigationStatus;
}

export const AIPipeline: React.FC<AIPipelineProps> = ({
  isDemoMode = true,
  liveStatus,
}) => {
  const [activeStepId, setActiveStepId] = useState<number | null>(null);

  if (!isDemoMode && liveStatus) {
    const liveStages = [
      {
        id: 1,
        title: 'Sentinel-1 catalogue search',
        desc: 'Copernicus Sentinel-1 GRD catalogue query',
        icon: '📡',
        state: liveStatus.searchStatus.includes('returned') ? 'Complete' : liveStatus.searchStatus.includes('Searching') ? 'Running' : 'Awaiting input',
        result: liveStatus.searchStatus,
      },
      {
        id: 2,
        title: 'SAR observation retrieval',
        desc: 'Real VV grayscale radar image fetching',
        icon: '🛠️',
        state: liveStatus.imageReady ? 'Complete' : liveStatus.acquisitionDatetime ? 'Running' : 'Awaiting input',
        result: liveStatus.acquisitionDatetime ? `Acquisition ${liveStatus.acquisitionDatetime}` : 'No observation loaded',
      },
      {
        id: 3,
        title: 'Deterministic SAR anomaly analysis',
        desc: 'Browser canvas backscatter intensity & connected component dark region extraction',
        icon: '📐',
        state: liveStatus.anomalyCandidateCount !== null ? 'Complete' : liveStatus.imageReady ? 'Running' : 'Awaiting input',
        result: liveStatus.anomalyCandidateCount !== null ? `${liveStatus.anomalyCandidateCount} candidate regions detected` : 'Not analyzed',
      },
      {
        id: 4,
        title: 'Investigation focus establishment',
        desc: 'Geographic coordinate focus & search radius boundary definition',
        icon: '🎯',
        state: liveStatus.focus ? 'Complete' : 'Awaiting input',
        result: liveStatus.focus ? `${liveStatus.focus} (${liveStatus.candidateFocusStatus === 'derived' ? 'SAR-derived' : 'Manual'})` : 'Focus not set',
      },
      {
        id: 5,
        title: 'Multi-observation SAR comparison',
        desc: 'Geographic IoU candidate bounding box pattern persistence analysis',
        icon: '🔄',
        state: liveStatus.comparisonState === 'success' ? 'Complete' : liveStatus.comparisonState === 'loading' ? 'Running' : 'Not run',
        result: liveStatus.comparisonState === 'success' ? `${liveStatus.comparison?.items.length ?? 0} comparison items` : liveStatus.comparisonState === 'loading' ? 'Comparing…' : 'Not run',
      },
      {
        id: 6,
        title: 'GFW AIS vessel-presence search',
        desc: 'Global Fishing Watch grid-cell center vessel presence retrieval',
        icon: '🚢',
        state: liveStatus.aisObservationCount !== null ? 'Complete' : liveStatus.aisState === 'loading' ? 'Running' : 'Awaiting input',
        result: liveStatus.aisObservationCount !== null ? `${liveStatus.aisObservationCount} observations · ${liveStatus.aisUniqueVesselCount ?? 0} unique vessels` : 'Not searched',
      },
      {
        id: 7,
        title: 'Spatial / temporal correlation heuristic',
        desc: 'Multi-factor spatial, temporal, persistence, and spread indicator scoring',
        icon: '⚡',
        state: liveStatus.correlationStatus === 'Complete' ? 'Complete' : liveStatus.correlationStatus === 'Calculating' ? 'Running' : 'Not calculated',
        result: liveStatus.correlationStatus === 'Complete' ? `${liveStatus.correlationResult?.uniqueVesselCount ?? 0} vessels evaluated` : liveStatus.correlationStatus,
      },
      {
        id: 8,
        title: 'Investigation report assembly',
        desc: 'State-driven evidence synthesis & disclaimer compilation',
        icon: '📄',
        state: (liveStatus.started && liveStatus.acquisitionDatetime && liveStatus.anomalyCandidateCount !== null && liveStatus.focus) ? 'Complete' : 'Awaiting input',
        result: (liveStatus.started && liveStatus.acquisitionDatetime && liveStatus.anomalyCandidateCount !== null && liveStatus.focus) ? 'Live investigation report ready' : 'Awaiting evidence',
      },
    ];

    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Header Banner */}
        <div className="glass-panel p-6 rounded-xl border border-[var(--ot-border)] text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-600/15 border border-blue-500/25 text-blue-400 text-xs font-mono font-semibold mb-2">
            <Cpu className="w-3.5 h-3.5" />
            LIVE ANALYSIS PIPELINE STATUS
          </div>
          <h1 className="text-2xl font-extrabold text-[var(--ot-text)] font-mono">
            LIVE INVESTIGATION PIPELINE
          </h1>
          <p className="text-sm text-[var(--ot-text-secondary)] max-w-xl mx-auto mt-1">
            Real-time pipeline processing state across Sentinel-1 observation, deterministic SAR anomaly detection, AIS vessel presence, and heuristic correlation.
          </p>
        </div>

        {/* Pipeline Nodes Flow */}
        <div className="glass-panel p-6 sm:p-8 rounded-xl border border-[var(--ot-border)] space-y-3 shadow-lg bg-[var(--ot-card)]">
          {liveStages.map((node, index) => {
            const isSelected = activeStepId === node.id;
            const isDone = node.state === 'Complete';
            const isRunning = node.state === 'Running';

            return (
              <React.Fragment key={node.title}>
                <div
                  onClick={() => setActiveStepId(isSelected ? null : node.id)}
                  className={`p-4 rounded-lg border transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    isDone
                      ? 'bg-[var(--ot-shell)] border-emerald-500/30'
                      : isRunning
                        ? 'bg-blue-600/10 border-blue-500/40'
                        : 'bg-[var(--ot-shell)] border-[var(--ot-border)] opacity-75'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-[var(--ot-card)] border border-[var(--ot-border)] flex items-center justify-center text-lg shrink-0">
                      {node.icon}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-blue-400 font-semibold">STAGE 0{node.id}</span>
                        <h3 className="font-mono font-bold text-sm text-[var(--ot-text)] truncate">{node.title}</h3>
                      </div>
                      <p className="text-xs text-[var(--ot-text-secondary)] mt-0.5">{node.desc}</p>
                      <p className="text-[11px] font-mono text-blue-400 mt-1 font-semibold">{node.result}</p>
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center">
                    <span className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold uppercase tracking-wider ${
                      isDone
                        ? 'bg-emerald-900/25 text-emerald-400 border border-emerald-500/30'
                        : isRunning
                          ? 'bg-blue-600/20 text-blue-300 border border-blue-500/30 animate-pulse'
                          : 'bg-[var(--ot-card)] text-[var(--ot-muted)] border border-[var(--ot-border)]'
                    }`}>
                      {node.state}
                    </span>
                  </div>
                </div>

                {index < liveStages.length - 1 && (
                  <div className="flex justify-center py-0.5">
                    <ArrowDown className="w-4 h-4 text-[var(--ot-muted)]" />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    );
  }

  // Demo Pipeline View
  const pipelineNodes = [
    { title: 'SATELLITE IMAGE ACQUISITION', desc: 'Sentinel-1 SAR C-band Ground Range Detected (GRD) data', icon: '📡' },
    { title: 'IMAGE PREPROCESSING', desc: 'Lee Filter speckle reduction, radiometric calibration & georeferencing', icon: '🛠️' },
    { title: 'AI OIL-SLICK DETECTION', desc: 'ResNet50-UNet deep neural network backscatter classification', icon: '🧠' },
    { title: 'SPILL SEGMENTATION', desc: 'Vector boundary polygonization & area measurement', icon: '📐' },
    { title: 'DRIFT MODEL', desc: 'Reverse hydrodynamic advection-diffusion transport simulation', icon: '🌊' },
    { title: 'PROBABLE ORIGIN', desc: 'Backtracked origin probability Gaussian spatial heatmap', icon: '🎯' },
    { title: 'AIS VESSEL DATA', desc: 'Real-time & historical trajectory broadcast ingestion', icon: '🚢' },
    { title: 'SPATIO-TEMPORAL CORRELATION', desc: 'Multi-factor spatio-temporal proximity & vector alignment scoring', icon: '⚡' },
    { title: 'CANDIDATE VESSELS', desc: 'Ranked candidate list with legal disclaimer', icon: '🔍' },
    { title: 'INVESTIGATION REPORT', desc: 'Enforcement dossier compilation for Coast Guard agencies', icon: '📄' },
  ];

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header Banner */}
      <div className="glass-panel p-6 rounded-xl border border-[#26334d] text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-600/15 border border-blue-500/25 text-blue-400 text-xs font-mono font-semibold mb-2">
          <Cpu className="w-3.5 h-3.5" />
          SYSTEM DATA FLOW ARCHITECTURE (DEMO)
        </div>
        <h1 className="text-2xl font-extrabold text-white font-mono">
          AI PIPELINE & CORRELATION WORKFLOW
        </h1>
        <p className="text-sm text-slate-400 max-w-xl mx-auto mt-1">
          End-to-end data processing workflow from satellite SAR imagery ingestion to final vessel correlation report generation.
        </p>
      </div>

      {/* Visual Vertical Flow Diagram */}
      <div className="glass-panel p-8 rounded-xl border border-[#26334d] space-y-3 shadow-lg">
        {pipelineNodes.map((node, index) => {
          const isSelected = activeStepId === index;

          return (
            <React.Fragment key={node.title}>
              {/* Node Card */}
              <div
                onClick={() => setActiveStepId(isSelected ? null : index)}
                className={`p-4 rounded-lg border transition-all cursor-pointer flex items-center justify-between ${
                  isSelected
                    ? 'bg-blue-600/10 border-blue-500/40'
                    : 'bg-[#0f1624] border-[#1e2a42] hover:border-blue-500/30'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-[#0b0f19] border border-[#26334d] flex items-center justify-center text-lg">
                    {node.icon}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-blue-400 font-semibold">STEP 0{index + 1}</span>
                      <h3 className="font-mono font-bold text-sm text-white">{node.title}</h3>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">{node.desc}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 font-mono text-xs">
                  <span className="px-2 py-0.5 rounded bg-emerald-900/25 text-emerald-400 border border-emerald-500/20 font-semibold text-[10px] flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    ACTIVE
                  </span>
                </div>
              </div>

              {/* Arrow Connection */}
              {index < pipelineNodes.length - 1 && (
                <div className="flex justify-center py-0.5">
                  <ArrowDown className="w-4 h-4 text-slate-600" />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
