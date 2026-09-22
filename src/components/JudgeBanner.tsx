import React from 'react';
import { AlertCircle, Cpu, ShieldCheck } from 'lucide-react';

export const JudgeBanner: React.FC = () => {
  return (
    <div className="judge-strip bg-[#0d1424] border-b border-[#1e2a42] py-2 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-2.5">
        {/* Title & Tagline */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:block p-1.5 rounded-md bg-blue-600/15 border border-blue-500/20 text-blue-400">
            <Cpu className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xs font-bold uppercase tracking-widest text-blue-400 font-mono">
                MARITIME ENVIRONMENTAL INTELLIGENCE
              </h2>
              <span className="text-[10px] text-amber-400/80 font-mono bg-amber-900/20 border border-amber-500/20 px-1.5 py-0.5 rounded">
                DEMO DATA
              </span>
            </div>
            <p className="text-sm font-semibold text-white">
              Detect. Trace. Correlate.
            </p>
          </div>
        </div>

        {/* 30-Second Judge Value Proposition Flow */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 w-full md:w-auto text-xs">
          {/* PROBLEM */}
          <div className="flex items-center gap-2 bg-[#131b2e] border border-[#2a1f24] rounded-lg p-1.5">
            <div className="p-1 rounded bg-red-900/30 text-red-400 shrink-0">
              <AlertCircle className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="font-bold text-red-400 font-mono text-[10px]">1. THE PROBLEM</span>
              <p className="text-[11px] text-slate-400 leading-tight">Sea spills are hard to detect & trace</p>
            </div>
          </div>

          {/* SOLUTION */}
          <div className="flex items-center gap-2 bg-[#131b2e] border border-[#1a2540] rounded-lg p-1.5">
            <div className="p-1 rounded bg-blue-600/15 text-blue-400 shrink-0">
              <Cpu className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="font-bold text-blue-400 font-mono text-[10px]">2. THE SOLUTION</span>
              <p className="text-[11px] text-slate-400 leading-tight">AI slick segmentation + AIS drift correlation</p>
            </div>
          </div>

          {/* RESULT */}
          <div className="flex items-center gap-2 bg-[#131b2e] border border-[#1a2a22] rounded-lg p-1.5">
            <div className="p-1 rounded bg-emerald-900/25 text-emerald-400 shrink-0">
              <ShieldCheck className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="font-bold text-emerald-400 font-mono text-[10px]">3. THE RESULT</span>
              <p className="text-[11px] text-slate-400 leading-tight">Identifies candidate vessels for investigation</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
