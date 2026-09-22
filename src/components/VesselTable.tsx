import React, { useState } from 'react';
import { Search, Ship, ShieldAlert, CheckCircle2, ChevronRight } from 'lucide-react';
import { Vessel } from '../types';

interface VesselTableProps {
  vessels: Vessel[];
  selectedVesselId: string | null;
  onSelectVessel: (vessel: Vessel) => void;
}

export const VesselTable: React.FC<VesselTableProps> = ({
  vessels,
  selectedVesselId,
  onSelectVessel,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const filteredVessels = vessels.filter((vessel) => {
    const matchesSearch =
      vessel.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      vessel.mmsi.toLowerCase().includes(searchQuery.toLowerCase()) ||
      vessel.flag.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesType = typeFilter === 'all' || vessel.type.toLowerCase().includes(typeFilter.toLowerCase());

    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="glass-panel p-6 rounded-xl border border-[#26334d]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-blue-600/15 text-blue-400 border border-blue-500/25 text-xs font-mono font-semibold">
                AIS LIVE INTELLIGENCE
              </span>
              <span className="text-xs font-mono text-amber-400 bg-amber-900/20 border border-amber-500/20 px-2 py-0.5 rounded">
                DEMO DATA
              </span>
            </div>
            <h1 className="text-2xl font-extrabold text-white mt-1 font-mono">
              VESSEL TRAJECTORY & PROXIMITY INDEX
            </h1>
            <p className="text-sm text-slate-400 mt-0.5">
              Cross-correlate AIS position broadcasts of 1,284 tracked marine traffic vessels against the calculated spill release origin.
            </p>
          </div>

          {/* Search & Filter Controls */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search vessel or MMSI..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 rounded-lg bg-[#0f1624] border border-[#26334d] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50 w-full sm:w-60 transition-colors"
              />
            </div>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-2 rounded-lg bg-[#0f1624] border border-[#26334d] text-xs text-white focus:outline-none focus:border-blue-500/50 transition-colors"
            >
              <option value="all">All Vessel Types</option>
              <option value="tanker">Tanker Ships</option>
              <option value="container">Container Ships</option>
              <option value="carrier">Bulk Carriers</option>
            </select>
          </div>
        </div>
      </div>

      {/* Vessels Table Card */}
      <div className="glass-panel rounded-xl border border-[#26334d] overflow-hidden shadow-lg">
        <div className="p-4 border-b border-[#1e2a42] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Ship className="w-5 h-5 text-blue-400" />
            <h3 className="font-mono font-bold text-sm text-white">TRACKED VESSELS ({filteredVessels.length})</h3>
          </div>
          <span className="text-xs text-slate-500 font-mono">
            Sorted by Spatio-Temporal Correlation Score
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-sans">
            <thead className="bg-[#0f1624] text-slate-500 font-mono text-[11px] uppercase tracking-wider border-b border-[#1e2a42]">
              <tr>
                <th className="py-3 px-4">Vessel</th>
                <th className="py-3 px-4">MMSI</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Last Position</th>
                <th className="py-3 px-4">Speed / Course</th>
                <th className="py-3 px-4">Dist. to Origin</th>
                <th className="py-3 px-4">Time Diff</th>
                <th className="py-3 px-4">Correlation</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-[#1e2a42] font-mono text-slate-300">
              {filteredVessels.map((vessel) => {
                const isSelected = selectedVesselId === vessel.id;
                const isHighCorrelation = vessel.overallCorrelation > 80;

                return (
                  <tr
                    key={vessel.id}
                    onClick={() => onSelectVessel(vessel)}
                    className={`cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-blue-600/10 text-white'
                        : isHighCorrelation
                        ? 'bg-amber-900/10 hover:bg-amber-900/20'
                        : 'hover:bg-[#0f1624]'
                    }`}
                  >
                    <td className="py-3.5 px-4 font-bold font-sans">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${isHighCorrelation ? 'bg-amber-400' : 'bg-blue-400'}`} />
                        <span className="text-white text-sm">{vessel.name}</span>
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono">Flag: {vessel.flag}</span>
                    </td>

                    <td className="py-3.5 px-4 text-slate-400">{vessel.mmsi}</td>
                    <td className="py-3.5 px-4 text-slate-400 font-sans">{vessel.type}</td>
                    <td className="py-3.5 px-4 text-slate-400">
                      {vessel.lastPosition.lat}° N, {vessel.lastPosition.lng}° E
                    </td>
                    <td className="py-3.5 px-4 text-slate-400">
                      {vessel.speedKnots} kn / {vessel.courseDeg}°
                    </td>
                    <td className="py-3.5 px-4 font-bold text-blue-300">
                      {vessel.distanceToOriginKm} km
                    </td>
                    <td className="py-3.5 px-4 text-slate-400">
                      {vessel.timeDiffHours} hrs
                    </td>

                    <td className="py-3.5 px-4 font-bold">
                      <div className="flex items-center gap-2">
                        <div className="w-12 bg-[#0b0f19] rounded-full h-1.5 overflow-hidden border border-[#26334d]">
                          <div
                            className={`h-full rounded-full ${
                              isHighCorrelation ? 'bg-amber-500' : 'bg-blue-600'
                            }`}
                            style={{ width: `${vessel.overallCorrelation}%` }}
                          />
                        </div>
                        <span className={isHighCorrelation ? 'text-amber-400 text-sm' : 'text-blue-400'}>
                          {vessel.overallCorrelation}%
                        </span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-[10px] font-semibold ${
                          isHighCorrelation
                            ? 'bg-amber-900/25 text-amber-400 border border-amber-500/20'
                            : 'bg-[#0f1624] text-slate-500 border border-[#26334d]'
                        }`}
                      >
                        {isHighCorrelation ? <ShieldAlert className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
                        {vessel.status}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectVessel(vessel);
                        }}
                        className="px-3 py-1.5 rounded bg-[#182238] hover:bg-blue-600 text-blue-400 hover:text-white font-semibold text-xs border border-blue-500/25 hover:border-blue-500 transition-all flex items-center gap-1 ml-auto"
                      >
                        <span>INSPECT</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
