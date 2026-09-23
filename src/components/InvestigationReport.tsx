import React, { useState } from 'react';
import { FileText, Download, Printer, ShieldCheck, AlertTriangle, ExternalLink, CheckCircle2 } from 'lucide-react';
import { SpillIncident, Vessel } from '../types';

interface InvestigationReportProps {
  spillIncident: SpillIncident;
  topCandidates: Vessel[];
}

export const InvestigationReport: React.FC<InvestigationReportProps> = ({
  spillIncident,
  topCandidates,
}) => {
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  const handlePrintReport = () => {
    setIsGenerating(true);
    setTimeout(() => {
      window.print();
      setIsGenerating(false);
    }, 600);
  };

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
                SAMPLE DATA
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
              INCIDENT REPORT: {spillIncident.id}
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
            <span className="report-value text-sm font-bold print:text-black font-mono">{spillIncident.detectionTime}</span>
          </div>

          <div>
            <span className="report-muted text-[10px] font-mono print:text-gray-500 block uppercase">CURRENT LOCATION</span>
            <span className="report-accent text-sm font-bold print:text-blue-700 font-mono">
              {spillIncident.coordinates.lat}° N, {spillIncident.coordinates.lng}° E
            </span>
          </div>

          <div>
            <span className="report-muted text-[10px] font-mono print:text-gray-500 block uppercase">ESTIMATED AREA</span>
            <span className="text-sm font-bold text-orange-400 print:text-orange-700 font-mono">
              {spillIncident.areaKm2} km²
            </span>
          </div>
        </div>

        {/* Probable Origin & Hydrodynamic Parameters */}
        <div className="report-findings p-5 rounded-xl border print:bg-gray-50 print:border-gray-300 space-y-3">
          <h3 className="report-accent font-mono font-bold text-sm print:text-blue-900 uppercase">
            HYDRODYNAMIC BACKTRACKING FINDINGS
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div>
              <span className="text-slate-400 print:text-gray-500 font-mono">PROBABLE ORIGIN COORDS:</span>
              <div className="font-mono font-bold text-white print:text-black">
                {spillIncident.originCoordinates.lat}° N, {spillIncident.originCoordinates.lng}° E
              </div>
            </div>

            <div>
              <span className="text-slate-400 print:text-gray-500 font-mono">WIND & CURRENT VECTORS:</span>
              <div className="font-mono font-bold text-white print:text-black">
                Wind {spillIncident.windSpeedKmh} km/h {spillIncident.windDirection} | Current {spillIncident.driftSpeedKnots} kn
              </div>
            </div>

            <div>
              <span className="text-slate-400 print:text-gray-500 font-mono">BACKWARD DRIFT DURATION:</span>
              <div className="font-mono font-bold text-white print:text-black">
                {spillIncident.driftDurationMinutes / 60} hours (Release ~13:30 UTC)
              </div>
            </div>
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
          <div>
            <p className="font-mono">
              <strong>DISCLAIMER:</strong> Correlation indicates a candidate for further investigation and does not establish legal responsibility.
            </p>
            <p className="text-[11px] mt-1 font-mono">Generated by the OCEANTRACE AI maritime intelligence platform</p>
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
