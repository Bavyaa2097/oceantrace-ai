import React from 'react';
import { Ship, Droplet, Satellite, AlertTriangle } from 'lucide-react';
import { TimelineEvent } from '../types';

interface IncidentTimelineProps {
  events: TimelineEvent[];
  onSelectEvent?: (event: TimelineEvent) => void;
}

export const IncidentTimeline: React.FC<IncidentTimelineProps> = ({ events }) => {
  const getIcon = (iconType: string) => {
    switch (iconType) {
      case 'ship':
        return <Ship className="w-5 h-5 text-amber-400" />;
      case 'droplet':
        return <Droplet className="w-5 h-5 text-blue-400" />;
      case 'satellite':
        return <Satellite className="w-5 h-5 text-teal-400" />;
      default:
        return <AlertTriangle className="w-5 h-5 text-red-400" />;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="glass-panel p-6 rounded-xl border border-[#26334d]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-blue-600/15 text-blue-400 border border-blue-500/25 text-xs font-mono font-semibold">
                TEMPORAL CHRONOLOGY
              </span>
              <span className="text-xs font-mono text-amber-400 bg-amber-900/20 border border-amber-500/20 px-2 py-0.5 rounded">
                DEMO DATA
              </span>
            </div>
            <h1 className="text-2xl font-extrabold text-white mt-1 font-mono">
              INCIDENT EVENT CHRONOLOGY TIMELINE
            </h1>
            <p className="text-sm text-slate-400 mt-0.5">
              Visualizing the sequential trajectory correlation between vessel passage, estimated slick release, satellite acquisition, and current drift position.
            </p>
          </div>
        </div>
      </div>

      {/* Horizontal Interactive Timeline Flow */}
      <div className="glass-panel p-8 rounded-xl border border-[#26334d] overflow-x-auto shadow-lg">
        <div className="min-w-[800px]">
          {/* Progress Connecting Line */}
          <div className="relative flex items-center justify-between my-8">
            <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-[#1e2a42] -translate-y-1/2 z-0">
              <div className="h-full bg-gradient-to-r from-amber-500 via-blue-500 to-red-500 w-full rounded-full" />
            </div>

            {events.map((evt, idx) => (
              <div key={evt.id} className="relative z-10 flex flex-col items-center group cursor-pointer">
                {/* Time Badge */}
                <div className="mb-3 px-3 py-1 rounded-full bg-[#0f1624] border border-[#26334d] text-blue-300 font-mono text-xs font-semibold shadow-sm">
                  {evt.timeLabel} UTC
                </div>

                {/* Event Node Icon Circle */}
                <div className="w-14 h-14 rounded-full bg-[#131b2e] border-2 border-[#26334d] group-hover:border-blue-500/50 flex items-center justify-center transition-transform group-hover:scale-110">
                  {getIcon(evt.iconType)}
                </div>

                {/* Event Label Box */}
                <div className="mt-4 w-52 p-3 rounded-lg bg-[#0f1624] border border-[#1e2a42] text-center space-y-1 group-hover:border-blue-500/30 transition-all">
                  <div className="text-xs font-bold text-white font-mono line-clamp-1">{evt.title}</div>
                  <div className="text-[11px] text-slate-500 font-mono">
                    {evt.location.lat}° N, {evt.location.lng}° E
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Detailed Event Cards */}
          <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {events.map((evt) => (
              <div key={`card-${evt.id}`} className="p-4 rounded-lg bg-[#0f1624] border border-[#1e2a42] space-y-2">
                <div className="flex items-center justify-between border-b border-[#1e2a42] pb-2">
                  <span className="font-mono text-xs font-semibold text-blue-400">{evt.timestamp}</span>
                  <span className="text-[10px] font-mono text-slate-500">STEP {evt.id}</span>
                </div>
                <h4 className="font-bold text-white text-sm">{evt.title}</h4>
                <p className="text-xs text-slate-400 leading-relaxed">{evt.description}</p>
                {evt.vesselName && (
                  <div className="mt-2 text-[11px] font-mono text-amber-400 bg-amber-900/15 p-1.5 rounded border border-amber-500/20">
                    Vessel: <strong>{evt.vesselName}</strong>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
