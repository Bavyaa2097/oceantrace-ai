import React from 'react';
import { Waves, ArrowRight, Play, Cpu, ShieldCheck, Radar, Anchor, Globe } from 'lucide-react';

interface LandingPageProps {
  onExplore: () => void;
  onRunDemo: () => void;
  onLoginClick: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onExplore,
  onRunDemo,
  onLoginClick,
}) => {
  return (
    <div className="space-y-14 py-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Hero Section */}
      <section className="reveal relative ocean-gradient rounded-2xl p-8 sm:p-14 border border-[#0F4C5C] overflow-hidden shadow-[0_20px_45px_-25px_rgba(15,76,92,0.7)]">
        <div className="relative z-10 max-w-3xl space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#E9B44C]/20 border border-[#E9B44C]/40 text-[#FFE3A1] text-xs font-mono font-semibold tracking-wider">
            <Waves className="w-4 h-4" />
            <span>Smart India Hackathon 2026 • SIH26143</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight">
            Ocean intelligence, <br />
            <span className="text-[#79C8C1]">
              built to trace the unseen.
            </span>
          </h1>

          <p className="text-base sm:text-lg text-[#E6F0EE] leading-relaxed font-sans">
            AI-assisted detection of marine oil slicks from Synthetic Aperture Radar (SAR) satellite imagery and spatio-temporal correlation with AIS vessel trajectory broadcasts to identify potential discharge candidates.
          </p>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-4">
            <button
              onClick={onExplore}
              className="px-7 py-3.5 rounded-lg bg-[#E76F51] hover:bg-[#D85B3D] text-white font-semibold text-sm tracking-wide shadow-sm transition-all flex items-center justify-center gap-2"
            >
              <span>Explore platform</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={onRunDemo}
              className="px-7 py-3.5 rounded-lg bg-white/10 hover:bg-white/15 text-white font-semibold text-sm border border-white/25 transition-all flex items-center justify-center gap-2"
            >
              <Play className="w-4 h-4 fill-current text-blue-400" />
              <span>Run demo scenario</span>
            </button>
          </div>
        </div>

        {/* Decorative Watermark */}
        <div className="absolute right-6 bottom-6 opacity-5 pointer-events-none hidden lg:block">
          <Radar className="w-80 h-80 text-blue-400" />
        </div>
      </section>

      {/* 30-Second Value Proposition Grid */}
      <section className="reveal-group grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="reveal glass-panel p-6 rounded-xl border-l-4 border-l-[#C94C4C] space-y-3">
          <div className="w-9 h-9 rounded-lg bg-[#E76F51]/15 border border-[#E76F51]/35 text-[#D85B3D] flex items-center justify-center font-bold text-sm">
            01
          </div>
          <h3 className="font-bold text-sm text-[#123B4A]">The problem</h3>
          <p className="text-xs text-[#60727A] leading-relaxed">
            Offshore marine oil spills are frequently illegal, unannounced discharges occurring in deep waters, making detection slow and identifying the responsible vessel extremely challenging.
          </p>
        </div>

        <div className="reveal glass-panel p-6 rounded-xl border-l-4 border-l-[#176B87] space-y-3">
          <div className="w-9 h-9 rounded-lg bg-[#176B87]/12 border border-[#176B87]/25 text-[#176B87] flex items-center justify-center font-bold text-sm">
            02
          </div>
          <h3 className="font-bold text-sm text-[#123B4A]">The solution</h3>
          <p className="text-xs text-[#60727A] leading-relaxed">
            Sentinel-1 SAR satellite neural networks automatically segment oil slicks, while reverse hydrodynamic models drift the slick backward in time to intersect with historical AIS vessel coordinates.
          </p>
        </div>

        <div className="reveal glass-panel p-6 rounded-xl border-l-4 border-l-[#2A9D8F] space-y-3">
          <div className="w-9 h-9 rounded-lg bg-[#2F8F83]/12 border border-[#2F8F83]/25 text-[#237E73] flex items-center justify-center font-bold text-sm">
            03
          </div>
          <h3 className="font-bold text-sm text-[#123B4A]">The result</h3>
          <p className="text-xs text-[#60727A] leading-relaxed">
            Generates ranked multi-factor correlation scores for candidate vessels and compiles official enforcement dossiers for Coast Guard and maritime authorities.
          </p>
        </div>
      </section>

      {/* Core Platform Capabilities */}
      <section className="reveal space-y-6">
        <div className="text-center space-y-2">
          <span className="text-xs font-mono font-semibold text-[#0F667A] uppercase tracking-widest">
            SURVEILLANCE ARCHITECTURE
          </span>
          <h2 className="text-2xl font-bold text-[#123B4A]">
            End-to-end maritime intelligence workflow
          </h2>
        </div>

        <div className="reveal-group grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="reveal glass-panel p-5 rounded-xl border-t-4 border-t-[#176B87] space-y-2 hover:border-[#176B87] transition-all">
            <Cpu className="w-6 h-6 text-[#176B87]" />
            <h4 className="font-semibold text-sm text-[#123B4A]">SAR image segmentation</h4>
            <p className="text-xs text-[#647780]">ResNet50-UNet neural network trained on C-band VV/VH radar imagery.</p>
          </div>

          <div className="reveal glass-panel p-5 rounded-xl border-t-4 border-t-[#2F8F83] space-y-2 hover:border-[#2F8F83] transition-all">
            <Globe className="w-6 h-6 text-[#2F8F83]" />
            <h4 className="font-semibold text-sm text-[#123B4A]">Hydrodynamic backtracking</h4>
            <p className="text-xs text-[#647780]">Reverse particle drift transport under atmospheric wind & ocean currents.</p>
          </div>

          <div className="reveal glass-panel p-5 rounded-xl border-t-4 border-t-[#E9B44C] space-y-2 hover:border-[#E9B44C] transition-all">
            <Anchor className="w-6 h-6 text-[#C28A1F]" />
            <h4 className="font-semibold text-sm text-[#123B4A]">AIS trajectory match</h4>
            <p className="text-xs text-[#647780]">Multi-factor spatial, temporal, trajectory, and directional alignment scoring.</p>
          </div>

          <div className="reveal glass-panel p-5 rounded-xl border-t-4 border-t-[#E76F51] space-y-2 hover:border-[#E76F51] transition-all">
            <ShieldCheck className="w-6 h-6 text-[#D85B3D]" />
            <h4 className="font-semibold text-sm text-[#123B4A]">Investigation report</h4>
            <p className="text-xs text-[#647780]">Compliant evidence compilation for Coast Guard and enforcement agencies.</p>
          </div>
        </div>
      </section>
    </div>
  );
};
