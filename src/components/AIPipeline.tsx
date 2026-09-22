import React, { useState } from 'react';
import { ArrowDown, Cpu, CheckCircle2 } from 'lucide-react';
import { AI_PIPELINE_STEPS } from '../data/demoData';

export const AIPipeline: React.FC = () => {
  const [activeStepId, setActiveStepId] = useState<number | null>(null);

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
          SYSTEM DATA FLOW ARCHITECTURE
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
