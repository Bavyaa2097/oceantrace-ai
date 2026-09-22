import React, { useState } from 'react';
import { Upload, Cpu, CheckCircle2, AlertTriangle, Eye, Layers, RefreshCw } from 'lucide-react';
import { SpillIncident } from '../types';

interface SpillDetectionProps {
  spillIncident: SpillIncident;
  onNavigateToMap: () => void;
}

export const SpillDetection: React.FC<SpillDetectionProps> = ({
  spillIncident,
  onNavigateToMap,
}) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [detectionComplete, setDetectionComplete] = useState<boolean>(true);

  const processingStages = [
    { id: 1, title: 'Image Preprocessing', desc: 'Speckle filtering, radiometric calibration & georeferencing' },
    { id: 2, title: 'SAR Feature Extraction', desc: 'Backscatter intensity & VV/VH polarization texture analysis' },
    { id: 3, title: 'Oil-Slick Segmentation', desc: 'ResNet50-UNet deep neural network inference on ocean surface' },
    { id: 4, title: 'Boundary Detection', desc: 'Polygon contour vectorization & geodesic area computation' },
    { id: 5, title: 'Confidence Calculation', desc: 'Probability scoring & look-alike false-positive filtering' },
  ];

  const handleSimulatedUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        setSelectedImage(evt.target?.result as string);
        setDetectionComplete(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const runAIDetection = () => {
    setIsProcessing(true);
    setDetectionComplete(false);
    setCurrentStep(1);

    const interval = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev >= 5) {
          clearInterval(interval);
          setIsProcessing(false);
          setDetectionComplete(true);
          return 5;
        }
        return prev + 1;
      });
    }, 700);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="glass-panel p-6 rounded-xl border border-[#26334d]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-blue-600/15 text-blue-400 border border-blue-500/25 text-xs font-mono font-semibold">
                SAR AI WORKBENCH
              </span>
              <span className="text-xs font-mono text-amber-400 bg-amber-900/20 border border-amber-500/20 px-2 py-0.5 rounded">
                DEMO MODE
              </span>
            </div>
            <h1 className="text-2xl font-extrabold text-white mt-1 font-mono">
              SATELLITE OIL SPILL DETECTION
            </h1>
            <p className="text-sm text-slate-400 mt-0.5">
              Upload Synthetic Aperture Radar (SAR) satellite imagery to run real-time deep learning oil slick segmentation models.
            </p>
          </div>
          <button
            onClick={runAIDetection}
            disabled={isProcessing}
            className="flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm transition-all disabled:opacity-50 shadow-sm"
          >
            <Cpu className={`w-5 h-5 ${isProcessing ? 'animate-spin' : ''}`} />
            <span>{isProcessing ? 'PROCESSING AI MODEL...' : 'RUN AI DETECTION'}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Image Uploader & Stage Monitor */}
        <div className="lg:col-span-6 space-y-6">
          {/* Drag & Drop Upload Card */}
          <div className="glass-panel p-6 rounded-xl border border-[#26334d] text-center">
            <h3 className="font-mono font-bold text-sm text-slate-200 mb-3 text-left">
              UPLOAD SATELLITE IMAGE (SAR / OPTICAL)
            </h3>

            <div className="border-2 border-dashed border-[#26334d] hover:border-blue-500/40 rounded-xl p-8 bg-[#0f1624] transition-all cursor-pointer relative">
              <input
                type="file"
                accept="image/png, image/jpeg, image/tiff"
                onChange={handleSimulatedUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div className="flex flex-col items-center justify-center space-y-3">
                <div className="w-14 h-14 rounded-full bg-blue-600/10 border border-blue-500/25 text-blue-400 flex items-center justify-center">
                  <Upload className="w-7 h-7" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">
                    Drop satellite image here, or <span className="text-blue-400 underline">browse</span>
                  </p>
                  <p className="text-xs text-slate-500 mt-1 font-mono">
                    Supported formats: PNG / JPG / TIFF (Sentinel-1 SAR VV/VH preferred)
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between">
              <span className="text-xs text-slate-500 font-mono">Sample: Sentinel-1_SAR_ArabianSea_20260914.tiff</span>
              <button
                onClick={runAIDetection}
                disabled={isProcessing}
                className="px-3 py-1.5 rounded bg-[#182238] hover:bg-[#1e2a44] text-slate-300 text-xs font-mono border border-[#26334d] transition-all"
              >
                Reload Demo Image
              </button>
            </div>
          </div>

          {/* AI Pipeline 5-Stage Execution Sequence */}
          <div className="glass-panel p-6 rounded-xl border border-[#26334d] space-y-3">
            <h3 className="font-mono font-bold text-sm text-slate-200 flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-400" />
              AI DETECTION PIPELINE SEQUENCE
            </h3>

            <div className="space-y-2 mt-3">
              {processingStages.map((stage) => {
                const isCurrent = isProcessing && currentStep === stage.id;
                const isDone = detectionComplete || currentStep > stage.id;

                return (
                  <div
                    key={stage.id}
                    className={`p-3 rounded-lg border transition-all flex items-center justify-between ${
                      isCurrent
                        ? 'bg-blue-600/10 border-blue-500/40 text-white'
                        : isDone
                        ? 'bg-[#0f1624] border-[#26334d] text-slate-200'
                        : 'bg-[#0b0f19] border-[#1e2a42] text-slate-500'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center font-mono text-xs font-bold ${
                          isDone
                            ? 'bg-emerald-600 text-white'
                            : isCurrent
                            ? 'bg-blue-600 text-white animate-pulse'
                            : 'bg-[#182238] text-slate-500'
                        }`}
                      >
                        {isDone ? <CheckCircle2 className="w-4 h-4" /> : stage.id}
                      </div>
                      <div>
                        <div className="text-xs font-bold font-mono">{stage.title}</div>
                        <div className="text-[11px] text-slate-500">{stage.desc}</div>
                      </div>
                    </div>

                    {isCurrent && (
                      <span className="text-[10px] font-mono text-blue-400 font-semibold px-2 py-0.5 rounded bg-blue-600/10 border border-blue-500/25">
                        PROCESSING...
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: AI Model Output Preview & Segmentation Results */}
        <div className="lg:col-span-6 space-y-6">
          <div className="glass-panel p-6 rounded-xl border border-[#26334d] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#1e2a42]">
              <h3 className="font-mono font-bold text-sm text-slate-200">
                SAR SEGMENTATION OUTPUT PREVIEW
              </h3>
              {detectionComplete && (
                <span className="px-2.5 py-1 rounded bg-red-900/30 border border-red-500/25 text-red-400 text-xs font-mono font-bold flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  OIL SLICK DETECTED
                </span>
              )}
            </div>

            {/* Satellite Image Display Canvas */}
            <div className="relative w-full h-[320px] rounded-xl overflow-hidden border border-[#26334d] bg-[#0b0f19] flex items-center justify-center">
              <div className="absolute inset-0 bg-gradient-to-br from-[#0b0f19] via-[#0d1424] to-[#0b0f19]" />

              {/* Simulated SAR Speckle Texture */}
              <div
                className="absolute inset-0 opacity-10 pointer-events-none"
                style={{
                  backgroundImage: `radial-gradient(#3b82f6 1px, transparent 1px)`,
                  backgroundSize: '8px 8px',
                }}
              />

              {/* Highlighted Oil Slick Boundary Overlay */}
              {detectionComplete && (
                <div className="relative z-10 text-center space-y-2">
                  <div className="relative p-6 rounded-xl bg-red-900/25 border-2 border-red-500/60 max-w-sm">
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded bg-red-700 text-white font-mono text-[10px] font-bold">
                      SEGMENTATION MASK (CONFIDENCE: {spillIncident.confidence}%)
                    </div>
                    <div className="text-red-400 font-mono font-extrabold text-lg">
                      DARK ANOMALY SLICK MASK
                    </div>
                    <p className="text-xs text-slate-300 mt-1">
                      Polygon Boundary area calculated at <strong>{spillIncident.areaKm2} km²</strong>
                    </p>
                    <div className="mt-2 text-[11px] font-mono text-slate-400">
                      Center: {spillIncident.coordinates.lat}° N, {spillIncident.coordinates.lng}° E
                    </div>
                  </div>
                </div>
              )}

              {isProcessing && (
                <div className="relative z-10 flex flex-col items-center justify-center text-blue-400 space-y-2">
                  <RefreshCw className="w-10 h-10 animate-spin" />
                  <p className="font-mono text-xs font-bold">Running SAR Neural Network Inference...</p>
                </div>
              )}
            </div>

            {/* AI Results Summary Metrics */}
            {detectionComplete && (
              <div className="p-4 rounded-lg bg-[#0f1624] border border-[#1e2a42] space-y-3">
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-2.5 rounded bg-[#0b0f19] border border-[#26334d]">
                    <span className="text-slate-500 block font-mono text-[10px]">DETECTION CONFIDENCE</span>
                    <span className="text-lg font-bold font-mono text-blue-400">{spillIncident.confidence}%</span>
                  </div>
                  <div className="p-2.5 rounded bg-[#0b0f19] border border-[#26334d]">
                    <span className="text-slate-500 block font-mono text-[10px]">ESTIMATED SURFACE AREA</span>
                    <span className="text-lg font-bold font-mono text-orange-400">{spillIncident.areaKm2} km²</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-[#1e2a42]">
                  <div>
                    <div className="text-xs font-bold text-white font-mono">Geographic Location</div>
                    <div className="text-xs text-slate-500 font-mono">
                      {spillIncident.coordinates.lat}° N, {spillIncident.coordinates.lng}° E (Lakshadweep Basin)
                    </div>
                  </div>
                  <button
                    onClick={onNavigateToMap}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-all shadow-sm"
                  >
                    <Eye className="w-4 h-4" />
                    <span>VIEW ON MAP</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
