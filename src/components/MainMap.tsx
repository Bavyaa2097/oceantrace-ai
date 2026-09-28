import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { Vessel, SpillIncident } from '../types';
import { enableMapInteractionOnFocus } from '../utils/leafletInteraction';
import { AisObservation, AisVesselSummary } from '../services/aisApi';

interface MainMapProps {
  spillIncident?: SpillIncident;
  vessels?: Vessel[];
  selectedVesselId?: string | null;
  onSelectVessel?: (vessel: Vessel) => void;
  onSelectVesselAndNavigate?: (vesselId: string) => void;
  showDriftPath?: boolean;
  showOriginZone?: boolean;
  showVessels?: boolean;
  heightClass?: string;
  autoCenterTrigger?: number;
  liveInvestigation?: {
    focus: { lat: number; lon: number };
    radiusKm: number;
    observations: AisObservation[];
    vessels: AisVesselSummary[];
  };
}

function escapePopupText(value: string | null | undefined): string {
  return (value ?? '—').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character] ?? character);
}

export const MainMap: React.FC<MainMapProps> = ({
  spillIncident,
  vessels = [],
  selectedVesselId = null,
  onSelectVessel,
  onSelectVesselAndNavigate,
  showDriftPath = true,
  showOriginZone = true,
  showVessels = true,
  heightClass = "h-[480px] lg:h-[580px]",
  autoCenterTrigger = 0,
  liveInvestigation,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layersRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapRef.current) {
      // Center map on Lakshadweep Sea oil spill region (10.810 N, 72.360 E)
      const map = L.map(mapContainerRef.current, {
        center: liveInvestigation
          ? [liveInvestigation.focus.lat, liveInvestigation.focus.lon]
          : [10.810, 72.360],
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
    if (!layerGroup || !map) return;

    map.invalidateSize();
    layerGroup.clearLayers();

    if (liveInvestigation) {
      const { focus, radiusKm, observations, vessels: summaries } = liveInvestigation;
      const focusPoint: L.LatLngExpression = [focus.lat, focus.lon];
      const radius = L.circle(focusPoint, {
        radius: radiusKm * 1000,
        color: '#38bdf8',
        fillColor: '#38bdf8',
        fillOpacity: 0.08,
        weight: 2,
      }).addTo(layerGroup);
      radius.bindPopup(`Investigation search radius: ${radiusKm} km`);

      const focusIcon = L.divIcon({
        className: 'live-investigation-focus-marker',
        html: '<div style="white-space:nowrap;border:2px solid #fff;background:#176b87;color:#fff;border-radius:9999px;padding:5px 9px;font:600 11px sans-serif;box-shadow:0 1px 6px #0008">Investigation focus</div>',
        iconAnchor: [10, 10],
      });
      L.marker(focusPoint, { icon: focusIcon })
        .addTo(layerGroup)
        .bindPopup(`Investigation focus<br/>Latitude: ${focus.lat}<br/>Longitude: ${focus.lon}`);

      const vesselGroups = new Map<string, AisObservation[]>();
      observations.forEach((observation, index) => {
        const identity = observation.id ?? observation.mmsi;
        const key = identity ? `vessel:${identity}` : `observation:${index}`;
        const group = vesselGroups.get(key) ?? [];
        group.push(observation);
        vesselGroups.set(key, group);
      });

      const bounds = radius.getBounds();
      observations.forEach((observation) => {
        if (
          Number.isFinite(observation.lat) &&
          Number.isFinite(observation.lon) &&
          observation.lat >= -90 && observation.lat <= 90 &&
          observation.lon >= -180 && observation.lon <= 180
        ) {
          bounds.extend([observation.lat, observation.lon]);
        }
      });

      vesselGroups.forEach((group) => {
        const validObservations = group.filter((observation) =>
          Number.isFinite(observation.lat) &&
          Number.isFinite(observation.lon) &&
          observation.lat >= -90 && observation.lat <= 90 &&
          observation.lon >= -180 && observation.lon <= 180
        );
        const representative = [...validObservations].sort((first, second) =>
          second.date.localeCompare(first.date)
        )[0];
        if (!representative) return;

        const vesselSummary = summaries.find((vessel) =>
          (representative.id !== null && vessel.id === representative.id) ||
          (representative.mmsi !== null && vessel.mmsi === representative.mmsi)
        );
        const distances = group
          .map((observation) => observation.distanceKm)
          .filter(Number.isFinite);
        const minimumDistanceKm = distances.length > 0 ? Math.min(...distances) : null;
        const label = representative.name ?? representative.mmsi ?? 'Unidentified vessel';
        const locationGroups = new Map<string, AisObservation[]>();
        validObservations.forEach((observation) => {
          const key = `${observation.lat},${observation.lon}`;
          const locationGroup = locationGroups.get(key) ?? [];
          locationGroup.push(observation);
          locationGroups.set(key, locationGroup);
        });

        locationGroups.forEach((locationGroup) => {
          const location = locationGroup[0];
          const marker = L.circleMarker([location.lat, location.lon], {
            radius: 7,
            color: '#fff',
            weight: 1.5,
            fillColor: '#f0a43a',
            fillOpacity: 0.95,
          }).addTo(layerGroup);

          const vesselId = representative.id || representative.mmsi || '';
          const btnId = `view-vessel-btn-${vesselId.replace(/[^a-zA-Z0-9]/g, '_')}`;

          marker.bindPopup(`
            <div class="font-sans text-xs space-y-1">
              <strong class="text-sm font-bold text-[#173b43] block">${escapePopupText(label)}</strong>
              <div>MMSI: ${escapePopupText(representative.mmsi)}</div>
              <div>Vessel type: ${escapePopupText(representative.type)}</div>
              <div>Flag: ${escapePopupText(representative.flag)}</div>
              <div>Observation count: ${vesselSummary?.observationCount ?? group.length}</div>
              <div>Minimum distance: ${minimumDistanceKm === null ? '—' : `${minimumDistanceKm.toFixed(1)} km`}</div>
              <div class="mt-1 text-[11px] text-slate-500">AIS-derived vessel presence · GFW grid-cell center</div>
              ${vesselId ? `
                <button
                  id="${btnId}"
                  type="button"
                  style="margin-top:8px;width:100%;border-radius:6px;background:#176b87;padding:5px 8px;font-size:11px;font-weight:700;color:#fff;border:none;cursor:pointer;"
                >
                  View Vessel Evidence
                </button>
              ` : ''}
            </div>
          `);

          marker.on('popupopen', () => {
            if (!vesselId) return;
            const btn = document.getElementById(btnId);
            if (btn) {
              btn.onclick = () => {
                onSelectVesselAndNavigate?.(vesselId);
              };
            }
          });
        });
      });

      bounds.extend(focusPoint);
      map.fitBounds(bounds, { padding: [28, 28], maxZoom: 13 });

      const animTimer = requestAnimationFrame(() => {
        if (mapRef.current) {
          mapRef.current.invalidateSize();
          mapRef.current.fitBounds(bounds, { padding: [28, 28], maxZoom: 13 });
        }
      });

      return () => {
        cancelAnimationFrame(animTimer);
      };
    }

    if (!spillIncident) return;

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
          onSelectVessel?.(vessel);
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
  }, [spillIncident, vessels, selectedVesselId, showDriftPath, showOriginZone, showVessels, onSelectVessel, liveInvestigation]);

  // Keep page scrolling natural until the user explicitly focuses the map.
  useEffect(() => {
    const mapContainer = mapContainerRef.current;
    const map = mapRef.current;
    if (!mapContainer || !map) return;

    return enableMapInteractionOnFocus(map, mapContainer);
  }, []);

  // Trigger invalidateSize whenever the container resizes or mounts inside modal overlays
  useEffect(() => {
    const container = mapContainerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver(() => {
      if (mapRef.current) {
        mapRef.current.invalidateSize();
      }
    });

    resizeObserver.observe(container);

    const timer1 = setTimeout(() => {
      if (mapRef.current) mapRef.current.invalidateSize();
    }, 100);

    const timer2 = setTimeout(() => {
      if (mapRef.current) mapRef.current.invalidateSize();
    }, 300);

    return () => {
      resizeObserver.disconnect();
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, []);

  // Handle Auto-Center Map on Demo Scenario trigger
  useEffect(() => {
    if (mapRef.current && autoCenterTrigger > 0) {
      mapRef.current.flyTo([10.810, 72.360], 11, { duration: 1.5 });
    }
  }, [autoCenterTrigger]);

  return (
    <div className={`ocean-map relative w-full ${heightClass} rounded-2xl overflow-hidden border border-cyan-500/30 glass-panel shadow-2xl`}>
      {liveInvestigation ? (
        <>
          <div className="absolute left-14 top-3 z-[400] max-w-[calc(100%-4.5rem)] rounded-lg border border-[var(--ot-border)] bg-[var(--ot-card)]/90 backdrop-blur-md px-3 py-1 text-[11px] font-semibold text-[var(--ot-text)] shadow-sm">
            LIVE INVESTIGATION · {liveInvestigation.observations.length} AIS-derived vessel presence observations
          </div>
          <div className="absolute bottom-3 left-3 z-[400] max-w-[240px] rounded-lg border border-[var(--ot-border)] bg-[var(--ot-card)]/90 backdrop-blur-md p-2 text-[10px] text-[var(--ot-text)] shadow-sm space-y-1 pointer-events-none">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full border border-white bg-[#f0a43a]" />
              <span>AIS-derived vessel presence</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full border-2 border-white bg-[#176b87]" />
              <span>Investigation focus</span>
            </div>
          </div>
        </>
      ) : (
        <div className="absolute top-3 left-14 z-[400] flex items-center gap-2 bg-navy-900/95 backdrop-blur-md px-3 py-1 rounded-lg border border-cyan-500/30 text-xs">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
          <span className="font-mono font-semibold text-slate-100 text-[11px]">SURVEILLANCE RADAR: LAKSHADWEEP SEA (10.842° N, 72.431° E)</span>
        </div>
      )}

      {/* Map Container */}
      <div ref={mapContainerRef} className="w-full h-full min-h-[380px]" style={{ width: '100%', height: '100%', minHeight: '380px' }} />

      {/* Map Legend Overlay */}
      {!liveInvestigation && <div className="absolute bottom-3 left-3 z-[400] bg-navy-900/95 backdrop-blur-md p-3 rounded-xl border border-cyan-500/30 text-[10px] font-mono space-y-1 shadow-xl hidden sm:block">
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
      </div>}
    </div>
  );
};
