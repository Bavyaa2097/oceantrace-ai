import React from 'react';
import { Wind, Compass, Clock, Target, ArrowLeft, MapPin } from 'lucide-react';
import { SpillIncident } from '../types';
import { MainMap } from './MainMap';

interface DriftAnalysisProps {
  spillIncident: SpillIncident;
  onNavigateToVessels: () => void;
}

export const DriftAnalysis: React.FC<DriftAnalysisProps> = ({
  spillIncident,
  onNavigateToVessels,
}) => {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="glass-panel p-6 rounded-xl border border-[#26334d]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-blue-600/15 text-blue-400 border border-blue-500/25 text-xs font-mono font-semibold">
                HYDRODYNAMIC BACKTRACKING
              </span>
              <span className="text-xs font-mono text-amber-400 bg-amber-900/20 border border-amber-500/20 px-2 py-0.5 rounded">
                SAMPLE DATA
              </span>
            </div>
            <h1 className="text-2xl font-extrabold text-white mt-1 font-mono">
              Drift & probable source origin analysis
            </h1>
            <p className="text-sm text-slate-400 mt-0.5">
              Reverse Lagrangian particle tracking using real-time NOAA GFS atmospheric winds and HYCOM ocean current vectors.
            </p>
          </div>

          <button
            onClick={onNavigateToVessels}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-sm transition-all"
          >
            <span>CORRELATE WITH AIS VESSELS</span>
            <ArrowLeft className="w-4 h-4 rotate-180" />
          </button>
        </div>
      </div>

      {/* Environmental Parameters Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Wind */}
        <div className="glass-panel p-4 rounded-xl border border-[#26334d]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-slate-500 font-semibold">ATMOSPHERIC WIND</span>
            <Wind className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-xl font-bold font-mono text-white mt-2">
            18 km/h <span className="text-sm text-slate-500 font-normal">NE</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">NOAA GFS 0.25° Grid</p>
        </div>

        {/* Ocean Current */}
        <div className="glass-panel p-4 rounded-xl border border-[#26334d]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-slate-500 font-semibold">OCEAN SURFACE CURRENT</span>
            <Compass className="w-4 h-4 text-teal-400" />
          </div>
          <div className="text-xl font-bold font-mono text-white mt-2">
            1.7 knots <span className="text-sm text-slate-500 font-normal">NE Flow</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">HYCOM Ocean Circulation</p>
        </div>

        {/* Drift Duration */}
        <div className="glass-panel p-4 rounded-xl border border-[#26334d]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-slate-500 font-semibold">ESTIMATED DRIFT DURATION</span>
            <Clock className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-xl font-bold font-mono text-white mt-2">
            4h 20m <span className="text-sm text-slate-500 font-normal">(260 mins)</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Release time ~13:30 UTC</p>
        </div>

        {/* Origin Confidence */}
        <div className="glass-panel p-4 rounded-xl border border-[#26334d]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-slate-500 font-semibold">ORIGIN CONFIDENCE</span>
            <Target className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xl font-bold font-mono text-amber-400 mt-2">
            82% <span className="text-sm text-slate-500 font-normal">High Probability</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Radius: 4.5 km zone</p>
        </div>
      </div>

      {/* Main Map View for Drift Backtracking */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8">
          <MainMap
            spillIncident={spillIncident}
            vessels={[]}
            selectedVesselId={null}
            onSelectVessel={() => {}}
            showVessels={false}
            heightClass="h-[520px]"
          />
        </div>

        {/* Right Detail Card */}
        <div className="lg:col-span-4 space-y-4">
          <div className="glass-panel p-5 rounded-xl border border-[#26334d] space-y-4">
            <h3 className="font-mono font-bold text-sm text-slate-200 border-b border-[#1e2a42] pb-2">
              DRIFT MODEL SUMMARY
            </h3>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-lg bg-[#0f1624] border border-[#1e2a42]">
                <div className="flex items-center gap-2 text-red-400 font-mono font-bold">
                  <MapPin className="w-4 h-4" />
                  <span>Current Slick Position</span>
                </div>
                <div className="mt-1 font-mono text-slate-200">
                  {spillIncident.coordinates.lat}° N, {spillIncident.coordinates.lng}° E
                </div>
                <div className="text-[11px] text-slate-500">Observed at 14:32 UTC (Sentinel-1 SAR)</div>
              </div>

              <div className="p-3 rounded-lg bg-blue-600/8 border border-blue-500/25">
                <div className="flex items-center gap-2 text-blue-300 font-mono font-bold">
                  <Target className="w-4 h-4" />
                  <span>Calculated Origin Probability Zone</span>
                </div>
                <div className="mt-1 font-mono text-blue-200 font-bold">
                  {spillIncident.originCoordinates.lat}° N, {spillIncident.originCoordinates.lng}° E
                </div>
                <div className="text-[11px] text-slate-400">Target radius: 4,500 meters (Confidence: 82%)</div>
              </div>

              <div className="p-3 rounded-lg bg-[#0f1624] border border-[#1e2a42] space-y-1">
                <div className="font-bold text-white font-mono text-xs">Backtracking Methodology</div>
                <p className="text-[11px] leading-relaxed text-slate-400">
                  The reverse drift algorithm solves the 2D advection-diffusion transport equation backward in time to project the historical oil slick centroid back to its probable discharge event location.
                </p>
              </div>
            </div>

            <button
              onClick={onNavigateToVessels}
              className="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-all shadow-sm flex items-center justify-center gap-2"
            >
              <span>CROSS-CORRELATE WITH AIS TRAJECTORIES</span>
              <ArrowLeft className="w-4 h-4 rotate-180" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
