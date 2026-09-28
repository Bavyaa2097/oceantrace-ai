import React, { useState } from 'react';
import { FileText, Download, RefreshCw, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';
import { SpillIncident, Vessel } from '../types';
import { LiveInvestigationStatus } from './SpillDetection';

export interface InvestigationReportProps {
  isDemoMode?: boolean;
  spillIncident?: SpillIncident;
  topCandidates?: Vessel[];
  liveStatus?: LiveInvestigationStatus;
  investigationId?: string;
  onNavigateToPipeline?: () => void;
  onRefreshReport?: () => void;
}

export const InvestigationReport: React.FC<InvestigationReportProps> = ({
  isDemoMode = true,
  spillIncident,
  topCandidates = [],
  liveStatus,
  investigationId = 'OT-LIVE-RECORD',
  onNavigateToPipeline,
  onRefreshReport,
}) => {
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  const handlePrintReport = () => {
    setIsGenerating(true);
    setTimeout(() => {
      window.print();
      setIsGenerating(false);
    }, 600);
  };

  if (!isDemoMode && liveStatus) {
    const isReady = Boolean(
      liveStatus.started &&
      liveStatus.acquisitionDatetime &&
      liveStatus.anomalyCandidateCount !== null &&
      liveStatus.focus
    );

    if (!isReady) {
      return (
        <div className="space-y-6 max-w-4xl mx-auto">
          <div className="glass-panel p-6 rounded-xl border border-[var(--ot-border)]">
            <h1 className="text-lg font-bold text-[var(--ot-text)] font-mono">Live Investigation Report</h1>
            <p className="mt-2 text-sm text-[var(--ot-text-secondary)]">
              An investigation report is not available until live findings are assembled.
            </p>
            <div className="mt-4 rounded-lg border border-[var(--ot-border)] bg-[var(--ot-shell)] p-4 space-y-2 text-xs font-mono">
              <div className="font-bold text-[var(--ot-text)] uppercase tracking-wider mb-2">Required Investigation Evidence Checklist:</div>
              <div className="flex items-center gap-2">
                <span className={liveStatus.started ? 'text-emerald-500' : 'text-slate-400'}>
                  {liveStatus.started ? '✓' : '○'} Investigation started
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className={liveStatus.acquisitionDatetime ? 'text-emerald-500' : 'text-slate-400'}>
                  {liveStatus.acquisitionDatetime ? '✓' : '○'} Sentinel-1 acquisition selected ({liveStatus.acquisitionDatetime || 'Pending'})
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className={liveStatus.anomalyCandidateCount !== null ? 'text-emerald-500' : 'text-slate-400'}>
                  {liveStatus.anomalyCandidateCount !== null ? '✓' : '○'} SAR surface anomaly analyzed ({liveStatus.anomalyCandidateCount !== null ? `${liveStatus.anomalyCandidateCount} candidates` : 'Pending'})
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className={liveStatus.focus ? 'text-emerald-500' : 'text-slate-400'}>
                  {liveStatus.focus ? '✓' : '○'} Investigation focus established ({liveStatus.focus || 'Pending'})
                </span>
              </div>
            </div>
          </div>
        </div>
      );
    }

    const selectedAnomaly = liveStatus.candidates?.find(
      (c) => c.id === liveStatus.selectedAnomalyCandidateId
    ) || liveStatus.candidates?.[0];

    const correlationResult = liveStatus.correlationResult;
    const topCorrelatedVessel = correlationResult?.vessels?.[0];

    return (
      <div className="space-y-6 max-w-5xl mx-auto print:max-w-none print:m-0 print:p-0">
        {/* Header Bar */}
        <div className="glass-panel p-5 rounded-xl border border-[var(--ot-border)] flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded bg-emerald-900/20 text-emerald-400 border border-emerald-500/30 text-xs font-mono font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              LIVE INVESTIGATION REPORT READY
            </div>
            <h1 className="text-xl font-bold font-mono text-[var(--ot-text)] mt-1">
              RECORD: {investigationId}
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {onRefreshReport && (
              <button
                type="button"
                onClick={onRefreshReport}
                className="px-3 py-2 rounded-lg bg-[var(--ot-shell)] hover:bg-[var(--ot-card)] text-[var(--ot-text)] border border-[var(--ot-border)] font-semibold text-xs flex items-center gap-1.5 transition-all"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Refresh report</span>
              </button>
            )}
            <button
              type="button"
              onClick={handlePrintReport}
              disabled={isGenerating}
              className="px-4 py-2 rounded-lg bg-[var(--ot-primary)] hover:bg-[var(--ot-primary-dark)] text-white font-bold text-xs shadow-sm flex items-center gap-1.5 transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isGenerating ? 'Compiling…' : 'Print PDF'}</span>
            </button>
          </div>
        </div>

        {/* Printable Document */}
        <div className="glass-panel rounded-xl border border-[var(--ot-border)] p-8 shadow-xl space-y-6 bg-[var(--ot-card)] print:bg-white print:text-black print:border-none print:shadow-none">
          {/* Header */}
          <div className="flex justify-between items-start border-b border-[var(--ot-border)] pb-4 print:border-black">
            <div>
              <div className="text-xs font-mono font-bold text-[var(--ot-muted)] uppercase tracking-wider">
                OCEANTRACE AI · LIVE MARITIME SURVEILLANCE REPORT
              </div>
              <h2 className="text-2xl font-extrabold font-mono text-[var(--ot-text)] mt-1 print:text-black">
                INVESTIGATION RECORD: {investigationId}
              </h2>
              <div className="text-xs font-mono text-[var(--ot-muted)] mt-0.5">
                Area: {liveStatus.bbox ? `${liveStatus.bbox[0]}, ${liveStatus.bbox[1]} – ${liveStatus.bbox[2]}, ${liveStatus.bbox[3]}` : 'Not set'}
              </div>
            </div>
            <div className="text-right font-mono text-xs">
              <div className="px-2.5 py-1 rounded border border-[var(--ot-border)] bg-[var(--ot-shell)] font-bold text-[var(--ot-primary)]">
                LIVE INVESTIGATION
              </div>
              <div className="text-[var(--ot-muted)] mt-1.5">Date: {new Date().toLocaleDateString('en-GB')}</div>
            </div>
          </div>

          {/* Section 1: Sentinel-1 Observation */}
          <div className="rounded-lg border border-[var(--ot-border)] bg-[var(--ot-shell)] p-4 space-y-2">
            <h3 className="font-mono font-bold text-xs text-[var(--ot-primary)] uppercase tracking-wider">
              1. SENTINEL-1 SATELLITE OBSERVATION
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs font-mono">
              <div>
                <span className="text-[var(--ot-muted)] block text-[10px]">ACQUISITION ID</span>
                <span className="font-bold text-[var(--ot-text)] break-all">{liveStatus.acquisition?.id || 'Selected'}</span>
              </div>
              <div>
                <span className="text-[var(--ot-muted)] block text-[10px]">OBSERVATION TIME</span>
                <span className="font-bold text-[var(--ot-text)]">{liveStatus.acquisitionDatetime || 'Not recorded'}</span>
              </div>
              <div>
                <span className="text-[var(--ot-muted)] block text-[10px]">PLATFORM / SENSOR</span>
                <span className="font-bold text-[var(--ot-text)]">{liveStatus.acquisition?.properties?.platform || 'Sentinel-1'}</span>
              </div>
              <div>
                <span className="text-[var(--ot-muted)] block text-[10px]">ORBIT / MODE</span>
                <span className="font-bold text-[var(--ot-text)]">
                  {liveStatus.acquisition?.properties?.orbitDirection || 'DESCENDING'} / {liveStatus.acquisition?.properties?.instrumentMode || 'IW'}
                </span>
              </div>
            </div>
          </div>

          {/* Section 2: SAR Anomaly Analysis */}
          <div className="rounded-lg border border-[var(--ot-border)] bg-[var(--ot-shell)] p-4 space-y-3">
            <h3 className="font-mono font-bold text-xs text-[var(--ot-primary)] uppercase tracking-wider">
              2. SAR SURFACE-ANOMALY ANALYSIS
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
              <div>
                <span className="text-[var(--ot-muted)] block text-[10px]">TOTAL ANOMALY REGIONS</span>
                <span className="font-bold text-amber-400">{liveStatus.anomalyCandidateCount ?? 0} candidates</span>
              </div>
              <div>
                <span className="text-[var(--ot-muted)] block text-[10px]">SELECTED CANDIDATE</span>
                <span className="font-bold text-[var(--ot-text)]">
                  {selectedAnomaly ? `Candidate #${selectedAnomaly.id}` : 'None'}
                </span>
              </div>
              <div>
                <span className="text-[var(--ot-muted)] block text-[10px]">MEASUREMENTS</span>
                <span className="font-bold text-[var(--ot-text)]">
                  {selectedAnomaly ? `${selectedAnomaly.pixelArea} px · Contrast ${(selectedAnomaly.contrast * 100).toFixed(1)}%` : '—'}
                </span>
              </div>
            </div>
          </div>

          {/* Section 3: Multi-Observation SAR Comparison */}
          <div className="rounded-lg border border-[var(--ot-border)] bg-[var(--ot-shell)] p-4 space-y-2">
            <h3 className="font-mono font-bold text-xs text-[var(--ot-primary)] uppercase tracking-wider">
              3. MULTI-OBSERVATION SAR COMPARISON
            </h3>
            {liveStatus.comparisonState === 'success' && liveStatus.comparison ? (
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs font-mono">
                <div>
                  <span className="text-[var(--ot-muted)] block text-[10px]">COMPARISON TIME</span>
                  <span className="font-bold text-[var(--ot-text)]">{liveStatus.comparisonAcquisition?.datetime || '—'}</span>
                </div>
                <div>
                  <span className="text-[var(--ot-muted)] block text-[10px]">PERSISTENT PATTERNS</span>
                  <span className="font-bold text-teal-400">
                    {liveStatus.comparison.items.filter((i) => i.status === 'persistent').length}
                  </span>
                </div>
                <div>
                  <span className="text-[var(--ot-muted)] block text-[10px]">NEW PATTERNS</span>
                  <span className="font-bold text-blue-400">
                    {liveStatus.comparison.items.filter((i) => i.status === 'new').length}
                  </span>
                </div>
                <div>
                  <span className="text-[var(--ot-muted)] block text-[10px]">DISAPPEARED PATTERNS</span>
                  <span className="font-bold text-red-400">
                    {liveStatus.comparison.items.filter((i) => i.status === 'disappeared').length}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-[var(--ot-text-secondary)] font-mono">
                Multi-observation comparison: {liveStatus.comparisonState === 'loading' ? 'Comparing…' : 'Not completed'}
              </p>
            )}
          </div>

          {/* Section 4: Investigation Focus */}
          <div className="rounded-lg border border-[var(--ot-border)] bg-[var(--ot-shell)] p-4 space-y-2">
            <h3 className="font-mono font-bold text-xs text-[var(--ot-primary)] uppercase tracking-wider">
              4. GEOGRAPHIC INVESTIGATION FOCUS
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
              <div>
                <span className="text-[var(--ot-muted)] block text-[10px]">COORDINATES</span>
                <span className="font-bold text-[var(--ot-text)]">{liveStatus.focus || 'Not set'}</span>
              </div>
              <div>
                <span className="text-[var(--ot-muted)] block text-[10px]">SEARCH RADIUS</span>
                <span className="font-bold text-[var(--ot-text)]">{liveStatus.radiusKm ? `${liveStatus.radiusKm} km` : '25 km'}</span>
              </div>
              <div>
                <span className="text-[var(--ot-muted)] block text-[10px]">FOCUS SOURCE</span>
                <span className="font-bold text-[var(--ot-text)]">
                  {liveStatus.candidateFocusStatus === 'derived'
                    ? 'Derived from selected SAR anomaly'
                    : liveStatus.candidateFocusStatus === 'manual'
                      ? 'Focus manually adjusted'
                      : 'Manual focus'}
                </span>
              </div>
            </div>
          </div>

          {/* Section 5: AIS Vessel Presence & Correlation */}
          <div className="rounded-lg border border-[var(--ot-border)] bg-[var(--ot-shell)] p-4 space-y-3">
            <h3 className="font-mono font-bold text-xs text-[var(--ot-primary)] uppercase tracking-wider">
              5. AIS-DERIVED VESSEL PRESENCE & HEURISTIC CORRELATION
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
              <div>
                <span className="text-[var(--ot-muted)] block text-[10px]">OBSERVATIONS EVALUATED</span>
                <span className="font-bold text-[var(--ot-text)]">{liveStatus.aisObservationCount ?? 0}</span>
              </div>
              <div>
                <span className="text-[var(--ot-muted)] block text-[10px]">UNIQUE VESSELS</span>
                <span className="font-bold text-[var(--ot-text)]">{liveStatus.aisUniqueVesselCount ?? 0}</span>
              </div>
              <div>
                <span className="text-[var(--ot-muted)] block text-[10px]">CORRELATION STATUS</span>
                <span className="font-bold text-blue-400">{liveStatus.correlationStatus}</span>
              </div>
            </div>

            {topCorrelatedVessel && (
              <div className="mt-3 p-3 rounded border border-[var(--ot-border)] bg-[var(--ot-card)] space-y-2 font-mono text-xs">
                <div className="font-bold text-[var(--ot-text)]">
                  Highest Indicator Vessel: {topCorrelatedVessel.name || topCorrelatedVessel.id} {topCorrelatedVessel.mmsi ? `(MMSI: ${topCorrelatedVessel.mmsi})` : ''}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                  <div>Spatial Factor: <strong>{topCorrelatedVessel.factors.spatialScore}%</strong></div>
                  <div>Temporal Factor: <strong>{topCorrelatedVessel.factors.temporalScore}%</strong></div>
                  <div>Persistence Factor: <strong>{topCorrelatedVessel.factors.persistenceScore}%</strong></div>
                  <div>Spread Factor: <strong>{topCorrelatedVessel.factors.observationSpreadScore}%</strong></div>
                </div>
                <div className="text-amber-400 font-bold">
                  Overall Correlation Indicator: {topCorrelatedVessel.correlationIndicator}%
                </div>
              </div>
            )}
          </div>

          {/* Section 6: Required Disclaimers */}
          <div className="rounded-lg border border-amber-500/20 bg-amber-900/10 p-4 space-y-2 text-xs font-mono text-amber-300">
            <div className="font-bold uppercase tracking-wider flex items-center gap-1.5 text-amber-400">
              <AlertTriangle className="w-4 h-4" />
              MANDATORY DATA INTERPRETATION DISCLAIMERS
            </div>
            <ul className="list-disc pl-4 space-y-1 text-[11px] leading-relaxed text-slate-300">
              <li>SAR anomaly candidates are image-based surface patterns and are not confirmed oil spills.</li>
              <li>AIS positions represent GFW grid-cell centers, not exact vessel fixes.</li>
              <li>AIS presence is observational and does not establish responsibility for an event.</li>
              <li>Correlation is a transparent OceanTrace heuristic, not a probability or proof of responsibility.</li>
            </ul>
          </div>

          {/* Footer controls */}
          <div className="pt-4 border-t border-[var(--ot-border)] flex flex-col sm:flex-row justify-between items-center gap-3 print:hidden">
            <div className="text-xs text-[var(--ot-muted)] font-mono">
              Report automatically synthesized from shared live investigation state.
            </div>
            {onNavigateToPipeline && (
              <button
                type="button"
                onClick={onNavigateToPipeline}
                className="px-4 py-2 rounded-lg bg-[var(--ot-shell)] hover:bg-[var(--ot-card)] text-[var(--ot-primary)] border border-[var(--ot-border)] font-bold text-xs flex items-center gap-1.5 transition-all"
              >
                <span>View Analysis Pipeline</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Demo Mode Fallback
  return (
    <div className="space-y-6 max-w-5xl mx-auto print:max-w-none print:m-0 print:p-0">
      {/* Header Banner (Hidden on print) */}
      <div className="report-banner glass-panel p-6 rounded-xl border print:hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-500/30 text-xs font-mono font-bold">
                ENFORCEMENT BRIEFING
              </span>
              <span className="text-xs font-mono text-amber-400 bg-amber-950/60 border border-amber-500/30 px-2 py-0.5 rounded">
                DEMO DATA
              </span>
            </div>
            <h1 className="text-2xl font-extrabold text-white mt-1 font-mono">
              MARITIME SPILL INVESTIGATION DOSSIER
            </h1>
            <p className="text-sm text-slate-300">
              Official evidence synthesis report combining Sentinel-1 SAR oil slick segmentations with AIS spatio-temporal vessel trajectories.
            </p>
          </div>

          <button
            onClick={handlePrintReport}
            disabled={isGenerating}
            className="flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-[#176B68] hover:bg-[#145452] text-white font-bold text-xs shadow-sm transition-all"
          >
            <Download className="w-4 h-4" />
            <span>{isGenerating ? 'COMPILING REPORT...' : 'GENERATE REPORT / PRINT PDF'}</span>
          </button>
        </div>
      </div>

      {/* Printable Report Document Card */}
      <div className="report-document glass-panel rounded-2xl border p-8 shadow-2xl space-y-8 print:bg-white print:text-black print:border-none print:shadow-none">
        {/* Document Header */}
        <div className="report-document-header flex justify-between items-start border-b pb-6 print:border-black">
          <div>
            <div className="report-kicker text-xs font-mono font-bold tracking-wider">
              OCEANTRACE AI • MARITIME SURVEILLANCE DOSSIER
            </div>
            <h2 className="report-document-title text-2xl font-extrabold font-mono mt-1">
              INCIDENT REPORT: {spillIncident?.id || 'INC-DEMO-01'}
            </h2>
            <p className="report-muted text-xs print:text-gray-600 font-mono mt-0.5">
              Classification: RESTRICTED // ENVIRONMENTAL SURVEILLANCE BRIEF
            </p>
          </div>

          <div className="text-right font-mono text-xs">
            <div className="report-status px-3 py-1 rounded border font-bold">
              STATUS: HIGH PRIORITY
            </div>
            <div className="report-muted mt-2">Issued: {new Date().toLocaleDateString('en-GB')}</div>
          </div>
        </div>

        {/* Incident Summary Metadata Grid */}
        <div className="report-metadata grid grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-xl border print:bg-gray-50 print:border-gray-300">
          <div>
            <span className="report-muted text-[10px] font-mono print:text-gray-500 block uppercase">INCIDENT TYPE</span>
            <span className="report-value text-sm font-bold print:text-black font-mono">Marine Oil Spill</span>
          </div>

          <div>
            <span className="report-muted text-[10px] font-mono print:text-gray-500 block uppercase">DETECTED TIME</span>
            <span className="report-value text-sm font-bold print:text-black font-mono">{spillIncident?.detectionTime || '14:32 UTC'}</span>
          </div>

          <div>
            <span className="report-muted text-[10px] font-mono print:text-gray-500 block uppercase">CURRENT LOCATION</span>
            <span className="report-accent text-sm font-bold print:text-blue-700 font-mono">
              {spillIncident?.coordinates.lat || '10.842'}° N, {spillIncident?.coordinates.lng || '72.431'}° E
            </span>
          </div>

          <div>
            <span className="report-muted text-[10px] font-mono print:text-gray-500 block uppercase">ESTIMATED AREA</span>
            <span className="text-sm font-bold text-orange-400 print:text-orange-700 font-mono">
              {spillIncident?.areaKm2 || '18.6'} km²
            </span>
          </div>
        </div>

        {/* Potential Candidate Ranking Table */}
        <div className="space-y-3">
          <h3 className="report-value font-mono font-bold text-sm print:text-black uppercase">
            POTENTIAL VESSEL CORRELATION CANDIDATES (RANKED)
          </h3>

          <table className="report-table w-full text-left text-xs font-mono border print:border-gray-300">
            <thead className="print:bg-gray-100 print:text-gray-700 print:border-gray-300">
              <tr>
                <th className="p-3">Rank</th>
                <th className="p-3">Vessel Name</th>
                <th className="p-3">MMSI</th>
                <th className="p-3">Spatial Match</th>
                <th className="p-3">Temporal Match</th>
                <th className="p-3">Trajectory Match</th>
                <th className="p-3">Overall Correlation</th>
              </tr>
            </thead>
            <tbody className="print:divide-gray-300 print:text-black">
              {topCandidates.slice(0, 3).map((vessel, index) => (
                <tr key={vessel.id} className={index === 0 ? 'bg-amber-950/20 print:bg-yellow-50' : ''}>
                  <td className="p-3 font-bold text-amber-400 print:text-amber-700">#{index + 1}</td>
                  <td className="p-3 font-bold">{vessel.name}</td>
                  <td className="p-3">{vessel.mmsi}</td>
                  <td className="p-3">{vessel.spatialScore}%</td>
                  <td className="p-3">{vessel.temporalScore}%</td>
                  <td className="p-3">{vessel.trajectoryScore}%</td>
                  <td className="p-3 font-bold text-amber-400 print:text-amber-700">{vessel.overallCorrelation}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Sign-off & Disclaimer Footer */}
        <div className="pt-6 border-t border-slate-800 print:border-gray-400 text-xs text-slate-400 print:text-gray-600 flex justify-between items-end">
          <div className="space-y-1">
            <p className="font-mono">
              <strong>DISCLAIMER:</strong> Correlation indicates a candidate for further investigation and does not establish legal responsibility.
            </p>
            <p className="text-[11px] font-mono">Generated by the OCEANTRACE AI maritime intelligence platform</p>
          </div>
          <div className="text-right font-mono">
            <div className="border-b border-slate-700 print:border-gray-400 pb-1 font-bold text-white print:text-black">
              OFFICER SIGNATURE: ____________________
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
