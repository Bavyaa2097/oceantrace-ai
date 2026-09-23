import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import { Play, Pause, RotateCcw, Ship, Compass, MapPin, Gauge } from 'lucide-react';
import { Vessel, SpillIncident } from '../types';
import { enableMapInteractionOnFocus } from '../utils/leafletInteraction';

interface TrajectoryPlayerProps {
  vessel: Vessel;
  spillIncident: SpillIncident;
}

export const TrajectoryPlayer: React.FC<TrajectoryPlayerProps> = ({ vessel, spillIncident }) => {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const animatedMarkerRef = useRef<L.Marker | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);

  const trackPoints = vessel.historicalTrack;
  const currentPoint = trackPoints[currentIndex] || trackPoints[0];

  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [10.810, 72.360],
        zoom: 11,
        zoomControl: false,
        attributionControl: false,
        dragging: false,
        touchZoom: false,
        doubleClickZoom: false,
        scrollWheelZoom: false,
        boxZoom: false,
        keyboard: false,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(map);

      mapRef.current = map;
      layerGroupRef.current = L.layerGroup().addTo(map);
    }

    const map = mapRef.current;
    const layerGroup = layerGroupRef.current;
    if (!layerGroup) return;

    layerGroup.clearLayers();

    // 1. Draw Oil Slick Polygon
    L.polygon(spillIncident.slickPolygon, {
      color: '#f97316',
      fillColor: '#ef4444',
      fillOpacity: 0.5,
      weight: 2,
    }).addTo(layerGroup);

    // 2. Draw Probable Origin Zone
    L.circle(spillIncident.originCircle.center, {
      radius: spillIncident.originCircle.radiusMeters,
      color: '#0284c7',
      fillColor: '#0284c7',
      fillOpacity: 0.2,
      weight: 2,
      dashArray: '6, 6',
    }).addTo(layerGroup);

    // 3. Draw Complete Historical Trajectory Line
    const coords: [number, number][] = trackPoints.map(p => [p.lat, p.lng]);
    L.polyline(coords, {
      color: '#f97316',
      weight: 3,
      opacity: 0.9,
      dashArray: '4, 4',
    }).addTo(layerGroup);

    // 4. Draw Waypoint Markers
    trackPoints.forEach((pt, idx) => {
      const isOriginPass = idx === 2; // 13:00 UTC pass
      const waypointIcon = L.divIcon({
        className: 'waypoint-marker',
        html: `
          <div class="w-3 h-3 rounded-full ${isOriginPass ? 'bg-amber-400 border-2 border-amber-200 animate-ping' : 'bg-blue-500'} shadow-md"></div>
        `,
        iconAnchor: [6, 6],
      });
      L.marker([pt.lat, pt.lng], { icon: waypointIcon })
        .addTo(layerGroup)
        .bindPopup(`<b>Waypoint ${idx + 1}</b><br/>Time: ${pt.timestamp}<br/>Speed: ${pt.speedKnots} kn`);
    });

    // 5. Create Animated Vessel Marker
    const vesselIcon = L.divIcon({
      className: 'animated-vessel-icon',
      html: `
        <div class="relative flex items-center justify-center">
          <span class="animate-ping absolute inline-flex h-8 w-8 rounded-full bg-amber-400 opacity-75"></span>
          <div class="relative px-2.5 py-1 rounded-full bg-amber-500 text-slate-950 font-mono font-bold text-xs shadow-xl border border-white flex items-center gap-1">
            <span>🚢</span>
            <span>${vessel.name}</span>
          </div>
        </div>
      `,
      iconAnchor: [40, 15],
    });

    const marker = L.marker([currentPoint.lat, currentPoint.lng], { icon: vesselIcon }).addTo(layerGroup);
    animatedMarkerRef.current = marker;

  }, [vessel, spillIncident]);

  useEffect(() => {
    const mapContainer = mapContainerRef.current;
    const map = mapRef.current;
    if (!mapContainer || !map) return;

    return enableMapInteractionOnFocus(map, mapContainer);
  }, []);

  // Update marker position during playback
  useEffect(() => {
    if (animatedMarkerRef.current && currentPoint) {
      animatedMarkerRef.current.setLatLng([currentPoint.lat, currentPoint.lng]);
      mapRef.current?.panTo([currentPoint.lat, currentPoint.lng], { animate: true });
    }
  }, [currentIndex, currentPoint]);

  // Playback timer
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isPlaying) {
      timer = setInterval(() => {
        setCurrentIndex((prev) => {
          if (prev >= trackPoints.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 1500);
    }
    return () => clearInterval(timer);
  }, [isPlaying, trackPoints.length]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="glass-panel p-6 rounded-xl border border-[#26334d]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-blue-600/15 text-blue-400 border border-blue-500/25 text-xs font-mono font-semibold">
                ANIMATED REPLAY ENGINE
              </span>
              <span className="text-xs font-mono text-amber-400 bg-amber-900/20 border border-amber-500/20 px-2 py-0.5 rounded">
                SAMPLE DATA
              </span>
            </div>
            <h1 className="text-2xl font-extrabold text-white mt-1 font-mono">
              Vessel historical trajectory replay
            </h1>
            <p className="text-sm text-slate-400 mt-0.5">
              Animate vessel movement along recorded AIS tracks to verify spatial-temporal overlap with the probable oil slick origin.
            </p>
          </div>

          {/* Playback Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-sm transition-all"
            >
              {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
              <span>{isPlaying ? 'PAUSE PLAYBACK' : 'PLAY TRAJECTORY'}</span>
            </button>

            <button
              onClick={() => {
                setIsPlaying(false);
                setCurrentIndex(0);
              }}
              className="p-2.5 rounded-lg bg-[#182238] hover:bg-[#1e2a44] text-slate-300 border border-[#26334d] transition-all"
              title="Reset Playback"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Map & Live Metrics Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8">
          <div className="relative w-full h-[520px] rounded-xl overflow-hidden border border-[#26334d] glass-panel shadow-lg">
            <div ref={mapContainerRef} className="w-full h-full" />
          </div>
        </div>

        {/* Live Playback Telemetry Box */}
        <div className="lg:col-span-4 space-y-4">
          <div className="glass-panel p-5 rounded-xl border border-[#26334d] space-y-4">
            <h3 className="font-mono font-bold text-sm text-white border-b border-[#1e2a42] pb-2 flex items-center justify-between">
              <span>AIS TELEMETRY PANEL</span>
              <span className="text-blue-400 text-xs">{currentIndex + 1} / {trackPoints.length} WAYPOINTS</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-lg bg-[#0f1624] border border-[#1e2a42] space-y-1">
                <span className="text-slate-500 font-mono text-[10px]">CURRENT BROADCAST TIMESTAMP</span>
                <div className="text-lg font-bold font-mono text-blue-400">{currentPoint.timestamp}</div>
              </div>

              <div className="p-3 rounded-lg bg-[#0f1624] border border-[#1e2a42] space-y-1">
                <span className="text-slate-500 font-mono text-[10px]">COORDINATES</span>
                <div className="font-mono text-white text-sm">
                  {currentPoint.lat}° N, {currentPoint.lng}° E
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="p-2.5 rounded bg-[#0f1624] border border-[#1e2a42]">
                  <span className="text-slate-500 font-mono text-[10px]">SPEED</span>
                  <div className="font-mono text-white font-bold text-sm">{currentPoint.speedKnots} kn</div>
                </div>

                <div className="p-2.5 rounded bg-[#0f1624] border border-[#1e2a42]">
                  <span className="text-slate-500 font-mono text-[10px]">COURSE</span>
                  <div className="font-mono text-teal-400 font-bold text-sm">{currentPoint.courseDeg}°</div>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-amber-900/10 border border-amber-500/20 space-y-1">
                <span className="text-amber-400 font-mono text-[10px] font-semibold">PROXIMITY STATUS</span>
                <p className="text-xs text-slate-300">
                  {currentIndex === 2
                    ? '⚠️ CRITICAL INTERSECTION: Vessel passed within 1.4 km of oil slick probable origin.'
                    : 'Transiting marine navigation corridor.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
