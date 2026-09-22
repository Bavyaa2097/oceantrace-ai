import React from 'react';
import { X, ShieldAlert, CheckCircle2, Play, Calendar, AlertTriangle } from 'lucide-react';
import { Vessel } from '../types';

interface CorrelationModalProps {
  vessel: Vessel | null;
  onClose: () => void;
  onPlayTrajectory: (vessel: Vessel) => void;
  onViewTimeline: () => void;
}

export const CorrelationModal: React.FC<CorrelationModalProps> = ({
  vessel,
  onClose,
  onPlayTrajectory,
  onViewTimeline,
}) => {
  if (!vessel) return null;

  const factors = [
    {
      name: 'Spatial Proximity',
      score: vessel.spatialScore,
      desc: `Passed within ${vessel.distanceToOriginKm} km of calculated origin coordinates`,
    },
    {
      name: 'Time Compatibility',
      score: vessel.temporalScore,
      desc: `Broadcast timestamp window matches release time (${vessel.timeDiffHours} hrs diff)`,
    },
    {
      name: 'Trajectory Compatibility',
      score: vessel.trajectoryScore,
      desc: 'Historical track intersects origin boundary polygon',
    },
    {
      name: 'Direction Compatibility',
      score: vessel.directionScore,
      desc: `Heading vector aligns with surface wind & current drift path`,
    },
  ];

  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-black/60 animate-fade-in">
      <div className="relative w-full max-w-2xl glass-panel rounded-xl border border-[#26334d] p-6 shadow-2xl space-y-5 overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-start justify-between border-b border-[#1e2a42] pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded bg-amber-900/30 text-amber-400 border border-amber-500/20 text-[10px] font-mono font-bold flex items-center gap-1">
                <ShieldAlert className="w-3 h-3" />
                CORRELATION ANALYSIS
              </span>
              <span className="text-[10px] font-mono text-slate-500">INCIDENT MATCH</span>
            </div>
            <h2 className="text-xl font-extrabold text-white mt-1 font-mono">
              VESSEL CORRELATION ANALYSIS
            </h2>
            <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
              <span>Vessel: <strong className="text-white">{vessel.name}</strong></span>
              <span>•</span>
              <span className="font-mono">MMSI: {vessel.mmsi}</span>
              <span>•</span>
              <span>Type: {vessel.type}</span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-[#182238] hover:bg-[#1e2a44] text-slate-400 hover:text-white transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 4 Factor Breakdown Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {factors.map((factor) => (
            <div key={factor.name} className="p-3.5 rounded-lg bg-[#0f1624] border border-[#1e2a42] space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-mono font-semibold text-slate-200">{factor.name}</span>
                <span className="font-mono font-bold text-blue-400 text-sm">{factor.score}%</span>
              </div>
              <div className="w-full bg-[#0b0f19] rounded-full h-1.5 overflow-hidden border border-[#26334d]">
                <div
                  className="bg-blue-600 h-full rounded-full transition-all duration-700"
                  style={{ width: `${factor.score}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-500 leading-tight">{factor.desc}</p>
            </div>
          ))}
        </div>

        {/* Overall Score Highlight */}
        <div className="p-4 rounded-lg bg-amber-900/10 border border-amber-500/20 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <div className="text-[11px] font-mono font-bold text-amber-400 uppercase tracking-wider">
              ALGORITHMIC RESULT
            </div>
            <div className="text-2xl font-extrabold font-mono text-white mt-0.5">
              OVERALL CORRELATION: <span className="text-amber-400">{vessel.overallCorrelation}%</span>
            </div>
            <div className="mt-1 flex items-center gap-1.5 text-xs text-amber-300/80">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Status: <strong>Potential correlation candidate</strong></span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <button
              onClick={() => onPlayTrajectory(vessel)}
              className="px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-all flex items-center justify-center gap-1.5 shadow-sm"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>PLAY TRAJECTORY</span>
            </button>

            <button
              onClick={onViewTimeline}
              className="px-4 py-2.5 rounded-lg bg-[#182238] hover:bg-[#1e2a44] text-slate-200 font-bold text-xs border border-[#26334d] hover:border-blue-500/30 transition-all flex items-center justify-center gap-1.5"
            >
              <Calendar className="w-4 h-4" />
              <span>VIEW TIMELINE</span>
            </button>
          </div>
        </div>

        {/* Legal Disclaimer */}
        <div className="p-3 rounded-lg bg-[#0f1624] border border-[#1e2a42] text-[11px] text-slate-500 leading-normal flex items-start gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
          <p>
            <strong className="text-slate-400">DISCLAIMER:</strong> Correlation indicates a candidate for further investigation and does not establish legal responsibility. Spatio-temporal matching is based on AIS trajectory data, satellite imagery timestamps, and hydrodynamic drift calculations.
          </p>
        </div>
      </div>
    </div>
  );
};
