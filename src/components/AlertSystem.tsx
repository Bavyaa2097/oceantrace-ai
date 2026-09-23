import React from 'react';
import { AlertOctagon, X, Eye, ArrowRight, ShieldAlert } from 'lucide-react';
import { SpillIncident } from '../types';

interface AlertSystemProps {
  spillIncident: SpillIncident;
  onInvestigate: () => void;
  onViewMap: () => void;
  onDismiss: () => void;
}

export const AlertSystem: React.FC<AlertSystemProps> = ({
  spillIncident,
  onInvestigate,
  onViewMap,
  onDismiss,
}) => {
  return (
    <div className="alert-system fixed bottom-6 right-6 z-[500] max-w-md w-full glass-panel rounded-2xl border-2 border-red-500/80 p-5 shadow-[0_0_30px_rgba(239,68,68,0.3)] animate-bounce-slow">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-red-950 text-red-400 border border-red-500/40">
            <AlertOctagon className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
              <span className="font-mono font-extrabold text-xs text-red-400 tracking-wider">
                🔴 HIGH PRIORITY ALERT
              </span>
            </div>
            <h3 className="alert-system-title font-bold text-sm">New Oil Slick Detected</h3>
          </div>
        </div>

        <button
          onClick={onDismiss}
          className="alert-system-dismiss p-1 rounded-md"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="alert-system-details mt-3 space-y-1.5 text-xs font-mono p-3 rounded-lg">
        <div><strong>Location:</strong> {spillIncident.coordinates.lat}° N, {spillIncident.coordinates.lng}° E</div>
        <div><strong>Confidence:</strong> <span className="text-cyan-400 font-bold">{spillIncident.confidence}%</span></div>
        <div className="alert-system-warning font-semibold mt-1">
          ⚠️ Potential vessel correlation detected (MV Ocean Star - 90.3%)
        </div>
      </div>

      <div className="mt-4 flex gap-2">
        <button
          onClick={onInvestigate}
          className="flex-1 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold text-xs transition-all shadow flex items-center justify-center gap-1"
        >
          <ShieldAlert className="w-4 h-4" />
          <span>INVESTIGATE</span>
        </button>

        <button
          onClick={onViewMap}
          className="alert-system-map flex-1 py-2 rounded-lg font-bold text-xs transition-all flex items-center justify-center gap-1"
        >
          <Eye className="w-4 h-4" />
          <span>VIEW MAP</span>
        </button>
      </div>
    </div>
  );
};
