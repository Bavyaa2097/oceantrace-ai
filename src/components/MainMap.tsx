import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { Vessel, SpillIncident } from '../types';
import { enableMapInteractionOnFocus } from '../utils/leafletInteraction';

interface MainMapProps {
  spillIncident: SpillIncident;
  vessels: Vessel[];
  selectedVesselId: string | null;
  onSelectVessel: (vessel: Vessel) => void;
  showDriftPath?: boolean;
  showOriginZone?: boolean;
  showVessels?: boolean;
  heightClass?: string;
  autoCenterTrigger?: number;
}

export const MainMap: React.FC<MainMapProps> = ({
  spillIncident,
  vessels,
  selectedVesselId,
  onSelectVessel,
  showDriftPath = true,
  showOriginZone = true,
  showVessels = true,
  heightClass = "h-[480px] lg:h-[580px]",
  autoCenterTrigger = 0,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layersRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapRef.current) {
      // Center map on Lakshadweep Sea oil spill region (10.810 N, 72.360 E)
      const map = L.map(mapContainerRef.current, {
        center: [10.810, 72.360],
        zoom: 11,
        zoomControl: false,
        attributionControl: true,
        dragging: false,
        touchZoom: false,
        doubleClickZoom: false,
        scrollWheelZoom: false,
        boxZoom: false,
        keyboard: false,
      });

      // OpenStreetMap provides a reliable, no-key geographic basemap for the demo.
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors',
      }).addTo(map);

      // Custom zoom control
      L.control.zoom({ position: 'topleft' }).addTo(map);

      mapRef.current = map;
      layersRef.current = L.layerGroup().addTo(map);
    }

    const map = mapRef.current;
    const layerGroup = layersRef.current;
    if (!layerGroup) return;

    layerGroup.clearLayers();

    // 1. Draw Detected Oil Slick Polygon (10.842° N, 72.431° E)
    const slickPolygon = L.polygon(spillIncident.slickPolygon, {
      color: '#f97316',
      fillColor: '#ef4444',
      fillOpacity: 0.55,
      weight: 2.5,
      dashArray: '4, 4',
      className: 'slick-pulse-animation',
    }).addTo(layerGroup);

    slickPolygon.bindPopup(`
      <div class="font-sans">
        <div class="flex items-center gap-1 text-red-400 font-mono font-bold text-xs">
          <span>🛢 OIL SLICK DETECTED</span>
        </div>
        <div class="mt-1 text-xs text-slate-200 font-mono space-y-0.5">
          <div><strong class="text-slate-400">Confidence:</strong> ${spillIncident.confidence}%</div>
          <div><strong class="text-slate-400">Estimated Area:</strong> ${spillIncident.areaKm2} km²</div>
          <div><strong class="text-slate-400">Detection Time:</strong> ${spillIncident.detectionTime}</div>
          <div><strong class="text-slate-400">Coordinates:</strong> ${spillIncident.coordinates.lat}° N, ${spillIncident.coordinates.lng}° E</div>
        </div>
      </div>
    `);

    // Clean Slick Center Marker
    const slickIcon = L.divIcon({
      className: 'custom-slick-marker',
      html: `
        <div class="relative flex items-center justify-center">
          <span class="animate-ping absolute inline-flex h-6 w-6 rounded-full bg-red-500 opacity-75"></span>
          <div class="relative bg-red-600 border border-red-200 text-white px-2 py-0.5 rounded font-mono text-[10px] font-bold shadow-lg">
            🛢 SPILL
          </div>
        </div>
      `,
      iconAnchor: [24, 10],
    });
    L.marker([spillIncident.coordinates.lat, spillIncident.coordinates.lng], { icon: slickIcon })
      .addTo(layerGroup)
      .bindPopup(`<b>OIL SLICK CENTER</b><br/>Coordinates: 10.842° N, 72.431° E<br/>Area: ${spillIncident.areaKm2} km²`);

    // 2. Draw Probable Origin Zone Circle (10.761° N, 72.218° E)
    if (showOriginZone) {
      const originCircle = L.circle(spillIncident.originCircle.center, {
        radius: spillIncident.originCircle.radiusMeters,
        color: '#06b6d4',
        fillColor: '#06b6d4',
        fillOpacity: 0.2,
        weight: 2,
        dashArray: '6, 6',
      }).addTo(layerGroup);

      originCircle.bindPopup(`
        <div class="font-sans">
          <div class="text-cyan-400 font-mono font-bold text-xs">📍 PROBABLE ORIGIN REGION</div>
          <p class="text-xs text-slate-300 mt-1">Calculated origin confidence: <strong>${spillIncident.originConfidence}%</strong></p>
          <div class="text-xs text-slate-400 font-mono mt-0.5">Center: ${spillIncident.originCoordinates.lat}° N, ${spillIncident.originCoordinates.lng}° E</div>
        </div>
      `);

      const originMarkerIcon = L.divIcon({
        className: 'origin-marker',
        html: `
          <div class="bg-navy-900/90 border border-cyan-400 text-cyan-300 px-2 py-0.5 rounded font-mono text-[10px] font-bold shadow-md">
            📍 ORIGIN
          </div>
        `,
        iconAnchor: [28, 10],
      });
      L.marker(spillIncident.originCircle.center, { icon: originMarkerIcon }).addTo(layerGroup);
    }

    // 3. Draw Backward Hydrodynamic Drift Path
    if (showDriftPath) {
      const driftPolyline = L.polyline(spillIncident.driftPath, {
        color: '#38bdf8',
        weight: 2.5,
        dashArray: '6, 6',
        opacity: 0.9,
      }).addTo(layerGroup);

      driftPolyline.bindPopup(`
        <div class="text-xs font-mono">
          <strong class="text-cyan-400">ESTIMATED BACKWARD DRIFT PATH</strong>
          <br/>Duration: ${spillIncident.driftDurationMinutes / 60} hrs
          <br/>Wind: ${spillIncident.windSpeedKmh} km/h ${spillIncident.windDirection}
          <br/>Current: ${spillIncident.driftSpeedKnots} knots
        </div>
      `);
    }

    // 4. Draw Compact Uncluttered Vessel Markers
    if (showVessels) {
      vessels.forEach((vessel) => {
        const isSelected = selectedVesselId === vessel.id;
        const isTopCandidate = vessel.overallCorrelation > 80;

        // Historical Track Polyline
        const trackPoints: [number, number][] = vessel.historicalTrack.map(pt => [pt.lat, pt.lng]);
        L.polyline(trackPoints, {
          color: isTopCandidate ? '#f97316' : '#2563eb',
          weight: isSelected ? 3.5 : isTopCandidate ? 2.5 : 1.5,
          opacity: isSelected ? 1.0 : isTopCandidate ? 0.9 : 0.4,
          dashArray: isTopCandidate ? undefined : '3, 3',
        }).addTo(layerGroup);

        // Compact Uncluttered Vessel Marker Icon (Prevents Label Overlap!)
        const vesselIcon = L.divIcon({
          className: 'custom-vessel-marker',
          html: isTopCandidate ? `
            <div class="group relative cursor-pointer flex items-center">
              <span class="animate-ping absolute -inset-1 rounded-full bg-amber-400 opacity-75"></span>
              <div class="relative flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500 border border-amber-200 text-slate-950 font-mono text-[10px] font-bold shadow-lg">
                <span>🚢</span>
                <span class="truncate max-w-[75px]">${vessel.name}</span>
                <span class="bg-slate-950 text-amber-400 px-1 rounded text-[9px]">${vessel.overallCorrelation}%</span>
              </div>
            </div>
          ` : `
            <div class="w-6 h-6 rounded-full bg-blue-600 border border-blue-200 text-white flex items-center justify-center text-[11px] shadow-md hover:scale-125 transition-transform cursor-pointer">
              🚢
            </div>
          `,
          iconSize: isTopCandidate ? [120, 24] : [24, 24],
          iconAnchor: isTopCandidate ? [60, 12] : [12, 12],
        });

        const marker = L.marker([vessel.lastPosition.lat, vessel.lastPosition.lng], { icon: vesselIcon })
          .addTo(layerGroup);

        marker.on('click', () => {
          onSelectVessel(vessel);
        });

        marker.bindPopup(`
          <div class="font-sans text-xs">
            <div class="font-bold text-white text-sm flex items-center justify-between">
              <span>${vessel.name}</span>
              <span class="${isTopCandidate ? 'text-amber-400' : 'text-cyan-400'} font-mono">${vessel.overallCorrelation}% Match</span>
            </div>
            <div class="text-slate-400 text-[11px] font-mono mt-0.5">MMSI: ${vessel.mmsi} | Type: ${vessel.type}</div>
            <div class="mt-2 space-y-1 text-slate-300">
              <div><strong>Distance to Origin:</strong> ${vessel.distanceToOriginKm} km</div>
              <div><strong>Speed:</strong> ${vessel.speedKnots} kn | <strong>Course:</strong> ${vessel.courseDeg}°</div>
              <div><strong>Status:</strong> <span class="text-cyan-300">${vessel.status}</span></div>
            </div>
          </div>
        `);
      });
    }
  }, [spillIncident, vessels, selectedVesselId, showDriftPath, showOriginZone, showVessels, onSelectVessel]);

  // Keep page scrolling natural until the user explicitly focuses the map.
  useEffect(() => {
    const mapContainer = mapContainerRef.current;
    const map = mapRef.current;
    if (!mapContainer || !map) return;

    return enableMapInteractionOnFocus(map, mapContainer);
  }, []);

  // Handle Auto-Center Map on Demo Scenario trigger
  useEffect(() => {
    if (mapRef.current && autoCenterTrigger > 0) {
      mapRef.current.flyTo([10.810, 72.360], 11, { duration: 1.5 });
    }
  }, [autoCenterTrigger]);

  return (
    <div className={`ocean-map relative w-full ${heightClass} rounded-2xl overflow-hidden border border-cyan-500/30 glass-panel shadow-2xl`}>
      {/* Map Header Overlay */}
      <div className="absolute top-3 left-14 z-[400] flex items-center gap-2 bg-navy-900/95 backdrop-blur-md px-3 py-1 rounded-lg border border-cyan-500/30 text-xs">
        <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
        <span className="font-mono font-semibold text-slate-100 text-[11px]">SURVEILLANCE RADAR: LAKSHADWEEP SEA (10.842° N, 72.431° E)</span>
      </div>

      {/* Map Container */}
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* Map Legend Overlay */}
      <div className="absolute bottom-3 left-3 z-[400] bg-navy-900/95 backdrop-blur-md p-3 rounded-xl border border-cyan-500/30 text-[10px] font-mono space-y-1 shadow-xl hidden sm:block">
        <div className="text-slate-400 font-bold mb-0.5 border-b border-slate-700/60 pb-0.5">MAP LEGEND</div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded bg-red-500/80 border border-orange-400 inline-block" />
          <span className="text-slate-200">Oil Slick (10.842° N, 72.431° E)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full border border-cyan-400 bg-cyan-500/20 inline-block" />
          <span className="text-slate-200">Probable Origin (10.761° N, 72.218° E)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-0.5 border-b-2 border-dashed border-sky-400 inline-block" />
          <span className="text-slate-200">Backward Drift Path</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-400 inline-block animate-pulse" />
          <span className="text-amber-300 font-semibold">Top Candidate (MV Ocean Star - 90.3%)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
          <span className="text-slate-300">Tracked Vessel Traffic</span>
        </div>
      </div>
    </div>
  );
};
