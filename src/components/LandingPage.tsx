import React from 'react';
import { ArrowRight, Play, Radar, Ship, Waves } from 'lucide-react';

interface LandingPageProps {
  onExplore: () => void;
  onRunDemo: () => void;
  onLoginClick: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onExplore,
  onRunDemo,
}) => {
  return (
    <div className="space-y-8 py-5 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <section className="reveal home-hero overflow-hidden rounded-2xl border border-[#DCE7F0] bg-[#E8F4FF] shadow-[0_4px_18px_rgba(18,48,74,0.08)]">
        <div className="grid min-h-[390px] lg:grid-cols-[0.92fr_1.08fr]">
          <div className="flex flex-col justify-center p-7 sm:p-10 lg:p-12">
            <div className="mb-5 inline-flex w-fit items-center gap-2 rounded-full border border-[#C9E3F7] bg-white/80 px-3 py-1.5 text-xs font-semibold text-[#0B74DE]">
              <Waves className="h-4 w-4" />
              <span>Maritime intelligence platform</span>
            </div>

            <h1 className="max-w-xl text-4xl font-bold leading-[1.05] tracking-tight text-[#12304A] sm:text-5xl">
              Smarter data.
              <span className="block text-[#0B74DE]">Healthier oceans.</span>
            </h1>

            <p className="mt-5 max-w-lg text-sm leading-6 text-[#526B80] sm:text-base">
              OceanTrace brings satellite observations, ocean drift analysis and vessel
              histories together to help investigators understand what is happening at sea.
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <button
                onClick={onExplore}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#0B74DE] px-5 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#075BB5]"
              >
                Explore dashboard
                <ArrowRight className="h-4 w-4" />
              </button>
              <button
                onClick={onRunDemo}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#B9D9F3] bg-white px-5 py-3 text-sm font-semibold text-[#0B74DE] transition-colors hover:bg-[#D8EDFF]"
              >
                <Play className="h-4 w-4 fill-current" />
                View guided scenario
              </button>
            </div>
          </div>

          <div className="hero-ocean-image relative min-h-[280px] overflow-hidden lg:min-h-full">
            <div className="absolute inset-0 bg-gradient-to-r from-[#E8F4FF]/75 via-transparent to-transparent lg:w-1/3" />
            <div className="hero-scanline absolute inset-0 opacity-30" />
            <div className="hero-target absolute left-[54%] top-[52%] h-40 w-40 -translate-x-1/2 -translate-y-1/2 sm:h-52 sm:w-52">
              <span className="absolute inset-0 rounded-full border border-white/70" />
              <span className="absolute inset-[18%] rounded-full border border-white/60" />
              <span className="absolute inset-[36%] rounded-full border border-white/55" />
              <span className="absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#20B8E6] ring-4 ring-white/70" />
              <span className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-white/35" />
              <span className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-white/35" />
            </div>
            <div className="absolute bottom-4 left-4 flex items-center gap-2 rounded-md bg-[#12304A]/80 px-3 py-2 text-[11px] font-semibold text-white backdrop-blur-sm">
              <Ship className="h-4 w-4 text-[#20B8E6]" />
              <span>Vessel track under review</span>
            </div>
            <div className="absolute right-4 top-4 rounded-md bg-white/85 px-2.5 py-1.5 text-[10px] font-semibold text-[#526B80] shadow-sm backdrop-blur-sm">
              North Arabian Sea · Observation view
            </div>
          </div>
        </div>
      </section>

      <section className="reveal-group grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="reveal rounded-xl border border-[#DCE7F0] bg-white p-5 shadow-[0_2px_8px_rgba(18,48,74,0.05)]">
          <div className="mb-3 flex items-center gap-3">
            <span className="text-lg font-bold text-[#0B74DE]">01</span>
            <h2 className="font-semibold text-[#12304A]">Spill detection</h2>
          </div>
          <p className="text-sm leading-5 text-[#526B80]">
            Identify unusual slick patterns in satellite observations across remote waters.
          </p>
        </div>
        <div className="reveal rounded-xl border border-[#DCE7F0] bg-white p-5 shadow-[0_2px_8px_rgba(18,48,74,0.05)]">
          <div className="mb-3 flex items-center gap-3">
            <span className="text-lg font-bold text-[#20B8E6]">02</span>
            <h2 className="font-semibold text-[#12304A]">Drift analysis</h2>
          </div>
          <p className="text-sm leading-5 text-[#526B80]">
            Estimate a probable source area by working back through wind and current conditions.
          </p>
        </div>
        <div className="reveal rounded-xl border border-[#DCE7F0] bg-white p-5 shadow-[0_2px_8px_rgba(18,48,74,0.05)]">
          <div className="mb-3 flex items-center gap-3">
            <span className="text-lg font-bold text-[#20A66A]">03</span>
            <h2 className="font-semibold text-[#12304A]">Vessel correlation</h2>
          </div>
          <p className="text-sm leading-5 text-[#526B80]">
            Compare vessel tracks with the estimated location and time window for investigator review.
          </p>
        </div>
      </section>

      <section className="reveal flex flex-col justify-between gap-4 border-b border-[#DCE7F0] pb-7 pt-2 sm:flex-row sm:items-end">
        <div>
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[#0B74DE]">
            Investigation workflow
          </span>
          <h2 className="mt-2 text-2xl font-bold text-[#12304A]">From observation to evidence</h2>
        </div>
        <div className="inline-flex items-center gap-2 text-xs text-[#667C8E]">
          <Radar className="h-4 w-4 text-[#20B8E6]" />
          Satellite, drift and AIS context in one workspace
        </div>
      </section>
    </div>
  );
};
