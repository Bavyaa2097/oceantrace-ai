import React, { useState } from 'react';
import { Play, ChevronRight, X, Minus, Maximize2 } from 'lucide-react';

interface DemoRunnerProps {
  currentDemoStep: number;
  totalSteps: number;
  stepName: string;
  isDemoRunning: boolean;
  onNextStep: () => void;
  onStopDemo: () => void;
}

export const DemoRunner: React.FC<DemoRunnerProps> = ({
  currentDemoStep,
  totalSteps,
  stepName,
  isDemoRunning,
  onNextStep,
  onStopDemo,
}) => {
  const [isMinimized, setIsMinimized] = useState<boolean>(false);

  if (!isDemoRunning) return null;

  // Render Minimized Pill Badge
  if (isMinimized) {
    return (
      <div className="fixed bottom-4 left-4 z-[500] flex items-center gap-2 px-3.5 py-2 rounded-full glass-panel border border-[#26334d] shadow-lg animate-fade-in font-mono text-xs">
        <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
        <span className="font-semibold text-blue-300 text-[11px]">
          ▶ SCENARIO RUNNING ({currentDemoStep}/{totalSteps})
        </span>
        <button
          onClick={() => setIsMinimized(false)}
          className="p-1 rounded bg-[#182238] hover:bg-[#1e2a44] text-slate-400 hover:text-white ml-1 transition-all"
          title="Expand Demo Scenario Panel"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={onStopDemo}
          className="p-1 rounded bg-[#182238] hover:bg-red-900/40 text-slate-400 hover:text-red-400 transition-all"
          title="Stop Demo"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  // Render Full Compact Floating Panel (Bottom-Left)
  return (
    <div className="fixed bottom-4 left-4 z-[500] max-w-xs w-full glass-panel rounded-xl border border-[#26334d] p-3.5 shadow-xl animate-fade-in space-y-2.5 font-mono text-xs">
      <div className="flex items-center justify-between border-b border-[#1e2a42] pb-1.5">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
          <span className="font-bold text-[11px] text-blue-300">GUIDED SCENARIO</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsMinimized(true)}
            className="p-1 rounded hover:bg-[#182238] text-slate-500 hover:text-white transition-all"
            title="Minimize Panel"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onStopDemo}
            className="p-1 rounded hover:bg-red-900/30 text-slate-500 hover:text-red-400 transition-all"
            title="Stop Demo"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="flex justify-between items-center text-[10px] text-slate-400">
          <span>Step {currentDemoStep} of {totalSteps}</span>
          <span className="text-blue-400 font-bold">{Math.round((currentDemoStep / totalSteps) * 100)}%</span>
        </div>

        <div className="w-full bg-[#0b0f19] rounded-full h-1.5 overflow-hidden border border-[#26334d]">
          <div
            className="bg-blue-600 h-full rounded-full transition-all duration-500"
            style={{ width: `${(currentDemoStep / totalSteps) * 100}%` }}
          />
        </div>

        <div className="p-2 rounded bg-[#0f1624] border border-[#26334d] text-[11px] text-slate-200 leading-tight">
          {stepName}
        </div>
      </div>

      <button
        onClick={onNextStep}
        className="w-full py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-all flex items-center justify-center gap-1 shadow-sm"
      >
        <span>NEXT STEP</span>
        <ChevronRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
