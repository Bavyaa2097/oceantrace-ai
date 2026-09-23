import React from 'react';
import { AlertCircle, Cpu, ShieldCheck } from 'lucide-react';

export const JudgeBanner: React.FC = () => {
  return (
    <div className="judge-strip border-b border-[#DCE7F0] bg-white px-4 py-2 sm:px-6">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-2.5">
        {/* Title & Tagline */}
        <div className="flex items-center gap-3">
          <div className="hidden rounded-md border border-[#C9E3F7] bg-[#E8F4FF] p-1.5 text-[#0B74DE] sm:block">
            <Cpu className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xs font-bold uppercase tracking-widest text-blue-400 font-mono">
                MARITIME ENVIRONMENTAL MONITORING
              </h2>
              <span className="rounded border border-[#F8DDA6] bg-[#FFF6E5] px-1.5 py-0.5 font-mono text-[10px] text-[#A66A12]">
                SAMPLE WORKSPACE
              </span>
            </div>
            <p className="text-sm font-semibold text-[#12304A]">
              Observe. Understand. Act.
            </p>
          </div>
        </div>

        {/* Operational value proposition */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 w-full md:w-auto text-xs">
          {/* PROBLEM */}
          <div className="flex items-center gap-2 rounded-lg border border-[#F2D0D0] bg-[#FFF0F0] p-1.5">
            <div className="shrink-0 rounded bg-[#E85D5D]/10 p-1 text-[#C34848]">
              <AlertCircle className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="font-mono text-[10px] font-bold text-[#C34848]">1. OBSERVATION</span>
              <p className="text-[11px] leading-tight text-[#526B80]">Find changes across open water</p>
            </div>
          </div>

          {/* SOLUTION */}
          <div className="flex items-center gap-2 rounded-lg border border-[#C9E3F7] bg-[#E8F4FF] p-1.5">
            <div className="shrink-0 rounded bg-white p-1 text-[#0B74DE]">
              <Cpu className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="font-mono text-[10px] font-bold text-[#0B74DE]">2. ANALYSIS</span>
              <p className="text-[11px] leading-tight text-[#526B80]">Connect imagery, drift and vessel tracks</p>
            </div>
          </div>

          {/* RESULT */}
          <div className="flex items-center gap-2 rounded-lg border border-[#C9E6D8] bg-[#E9F8F1] p-1.5">
            <div className="shrink-0 rounded bg-white p-1 text-[#20A66A]">
              <ShieldCheck className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="font-mono text-[10px] font-bold text-[#188653]">3. REVIEW</span>
              <p className="text-[11px] leading-tight text-[#526B80]">Build a clear investigation record</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
