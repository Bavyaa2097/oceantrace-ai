import React from 'react';
import { AlertTriangle, Clock, MapPin, Compass, Cpu, ExternalLink } from 'lucide-react';
import { SpillIncident, Vessel } from '../types';

interface SpillAnalysisPanelProps {
  spillIncident: SpillIncident;
  topCandidateVessel: Vessel;
  onNavigateToAnalysis: () => void;
  onInspectVessel: (vessel: Vessel) => void;
}

export const SpillAnalysisPanel: React.FC<SpillAnalysisPanelProps> = ({
  spillIncident,
  topCandidateVessel,
  onNavigateToAnalysis,
  onInspectVessel,
}) => {
  return (
    <div className="glass-panel rounded-xl p-4 sm:p-5 border border-[#D9E3E7] space-y-3 flex flex-col justify-between h-full max-h-[580px] overflow-y-auto shadow-sm">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between pb-2.5 border-b border-[#D9E3E7]">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-[#FFF3F2] border border-[#E8BABA] text-[#C94C4C]">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-xs text-[#123B4A]">Oil spill analysis</h3>
              <p className="text-[10px] text-[#647780]">Incident: {spillIncident.id}</p>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded bg-[#FFF3F2] border border-[#E8BABA] text-[#C94C4C] text-[10px] font-semibold">
            {spillIncident.status}
          </span>
        </div>

        {/* Confidence Metric */}
        <div className="mt-3 p-2.5 rounded-lg bg-[#F4F7F8] border border-[#D9E3E7]">
          <div className="flex justify-between items-center text-[11px] font-mono mb-1.5">
            <span className="text-[#647780]">Detection confidence</span>
            <span className="text-[#176B87] font-bold">{spillIncident.confidence}%</span>
          </div>
          <div className="w-full bg-[#D9E3E7] rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-[#2A9D8F] h-full rounded-full transition-all duration-700"
              style={{ width: `${spillIncident.confidence}%` }}
            />
          </div>
        </div>

        {/* Detailed Attribute Grid */}
        <div className="mt-3 space-y-1.5 text-xs font-sans">
          <div className="flex items-center justify-between p-2 rounded bg-white border border-[#D9E3E7]">
            <span className="text-slate-500 text-[11px] flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-orange-400" />
              Estimated Spill Area:
            </span>
            <span className="font-semibold text-[#123B4A] text-xs">{spillIncident.areaKm2} km²</span>
          </div>

          <div className="flex items-center justify-between p-2 rounded bg-white border border-[#D9E3E7]">
            <span className="text-slate-500 text-[11px] flex items-center gap-1.5">
              <Clock className="w-3 h-3 text-blue-400" />
              Detection Time:
            </span>
            <span className="font-mono text-slate-300 text-[11px]">{spillIncident.detectionTime}</span>
          </div>

          <div className="flex items-center justify-between p-2 rounded bg-white border border-[#D9E3E7]">
            <span className="text-slate-500 text-[11px] flex items-center gap-1.5">
              <MapPin className="w-3 h-3 text-red-400" />
              Coordinates:
            </span>
            <span className="font-mono text-slate-300 text-[11px]">
              {spillIncident.coordinates.lat}° N, {spillIncident.coordinates.lng}° E
            </span>
          </div>

          <div className="flex items-center justify-between p-2 rounded bg-white border border-[#D9E3E7]">
            <span className="text-slate-500 text-[11px] flex items-center gap-1.5">
              <Compass className="w-3 h-3 text-blue-400" />
              Estimated Origin:
            </span>
            <span className="font-mono text-blue-300 text-[11px]">
              {spillIncident.originCoordinates.lat}° N, {spillIncident.originCoordinates.lng}° E
            </span>
          </div>

          <div className="flex items-center justify-between p-2 rounded bg-white border border-[#D9E3E7]">
            <span className="text-slate-500 text-[11px] flex items-center gap-1.5">
              <Compass className="w-3 h-3 text-sky-400" />
              Drift Direction:
            </span>
            <span className="font-mono text-slate-300 text-[11px]">
              {spillIncident.driftDirection} @ {spillIncident.driftSpeedKnots} kn
            </span>
          </div>

          <div className="flex items-center justify-between p-2 rounded bg-white border border-[#D9E3E7]">
            <span className="text-slate-500 text-[11px] flex items-center gap-1.5">
              <Cpu className="w-3 h-3 text-teal-400" />
              AI Model:
            </span>
            <span className="font-mono text-[10px] text-teal-400 truncate max-w-[140px]" title={spillIncident.modelUsed}>
              {spillIncident.modelUsed}
            </span>
          </div>
        </div>

        {/* Top Candidate Highlight */}
        <div className="mt-3 p-2.5 rounded-lg bg-[#FFF7E6] border border-[#E8C978]">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-mono font-bold text-amber-400 uppercase tracking-wider">
              TOP CANDIDATE VESSEL
            </span>
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-900/30 text-amber-400 border border-amber-500/20 font-semibold">
              {topCandidateVessel.overallCorrelation}% MATCH
            </span>
          </div>
          <div className="mt-1.5 flex items-center justify-between">
            <div>
              <div className="font-bold text-white text-xs">{topCandidateVessel.name}</div>
              <div className="text-[10px] font-mono text-slate-500">MMSI: {topCandidateVessel.mmsi}</div>
            </div>
            <button
              onClick={() => onInspectVessel(topCandidateVessel)}
              className="px-2.5 py-1 rounded bg-[#D89B27] hover:bg-[#A66F11] text-white text-xs font-bold transition-all"
            >
              Inspect
            </button>
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="pt-2 border-t border-[#D9E3E7]">
        <button
          onClick={onNavigateToAnalysis}
          className="w-full py-2 rounded-lg bg-[#E8F2F4] hover:bg-[#D9E3E7] text-[#176B87] border border-[#BFD8DF] hover:border-[#176B87] text-xs font-semibold transition-all flex items-center justify-center gap-1.5"
        >
          <span>Open spill workbench</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
