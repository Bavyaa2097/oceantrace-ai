import { SpillIncident, Vessel, TimelineEvent, AIPipelineStep } from '../types';

export const INITIAL_SPILL_INCIDENT: SpillIncident = {
  id: 'INC-2026-0914-01',
  status: 'DETECTED',
  confidence: 94.7,
  areaKm2: 18.6,
  detectionTime: '14 Sep 2026 • 14:32 UTC',
  coordinates: { lat: 10.842, lng: 72.431 },
  originCoordinates: { lat: 10.761, lng: 72.218 },
  driftDirection: 'NE',
  driftSpeedKnots: 1.7,
  windSpeedKmh: 18,
  windDirection: 'NE',
  driftDurationMinutes: 260, // 4h 20m
  originConfidence: 82,
  modelUsed: 'SAR Image Segmentation Model (ResNet50-UNet)',
  slickPolygon: [
    [10.852, 72.420],
    [10.865, 72.438],
    [10.848, 72.455],
    [10.830, 72.442],
    [10.825, 72.425],
    [10.838, 72.415],
    [10.852, 72.420],
  ],
  originCircle: {
    center: [10.761, 72.218],
    radiusMeters: 4500,
  },
  driftPath: [
    [10.761, 72.218],
    [10.781, 72.271],
    [10.802, 72.325],
    [10.823, 72.378],
    [10.842, 72.431],
  ]
};

export const TRACKED_VESSELS: Vessel[] = [
  {
    id: 'vessel-1',
    name: 'MV Ocean Star',
    mmsi: 'Demo-MMSI-001',
    type: 'Crude Oil Tanker',
    flag: 'Panama',
    destination: 'Port of Kochi (IN)',
    callsign: '3E2910',
    lastPosition: { lat: 10.920, lng: 72.610 },
    speedKnots: 14.2,
    courseDeg: 55,
    distanceToOriginKm: 1.4,
    timeDiffHours: 0.5,
    spatialScore: 92,
    temporalScore: 89,
    trajectoryScore: 94,
    directionScore: 86,
    overallCorrelation: 90.3,
    status: 'High Correlation Candidate',
    historicalTrack: [
      { lat: 10.650, lng: 71.930, timestamp: '12:00 UTC', speedKnots: 14.5, courseDeg: 52 },
      { lat: 10.710, lng: 72.080, timestamp: '12:30 UTC', speedKnots: 14.4, courseDeg: 53 },
      { lat: 10.758, lng: 72.212, timestamp: '13:00 UTC', speedKnots: 14.2, courseDeg: 55 },
      { lat: 10.810, lng: 72.340, timestamp: '13:30 UTC', speedKnots: 14.3, courseDeg: 54 },
      { lat: 10.865, lng: 72.470, timestamp: '14:00 UTC', speedKnots: 14.1, courseDeg: 56 },
      { lat: 10.920, lng: 72.610, timestamp: '14:32 UTC', speedKnots: 14.2, courseDeg: 55 },
    ]
  },
  {
    id: 'vessel-2',
    name: 'MV Blue Horizon',
    mmsi: 'Demo-MMSI-002',
    type: 'Chemical Tanker',
    flag: 'Liberia',
    destination: 'Mumbai Port',
    callsign: 'A8QK2',
    lastPosition: { lat: 11.050, lng: 72.180 },
    speedKnots: 16.8,
    courseDeg: 340,
    distanceToOriginKm: 18.2,
    timeDiffHours: 1.8,
    spatialScore: 48,
    temporalScore: 35,
    trajectoryScore: 45,
    directionScore: 40,
    overallCorrelation: 42.1,
    status: 'Moderate Proximity',
    historicalTrack: [
      { lat: 10.450, lng: 72.300, timestamp: '12:00 UTC', speedKnots: 16.5, courseDeg: 338 },
      { lat: 10.750, lng: 72.240, timestamp: '13:00 UTC', speedKnots: 16.8, courseDeg: 340 },
      { lat: 11.050, lng: 72.180, timestamp: '14:00 UTC', speedKnots: 16.8, courseDeg: 340 },
    ]
  },
  {
    id: 'vessel-3',
    name: 'MV Sea Falcon',
    mmsi: 'Demo-MMSI-003',
    type: 'Container Ship',
    flag: 'Marshall Islands',
    destination: 'Colombo (LK)',
    callsign: 'V7AK9',
    lastPosition: { lat: 10.510, lng: 72.820 },
    speedKnots: 19.5,
    courseDeg: 135,
    distanceToOriginKm: 34.7,
    timeDiffHours: 2.4,
    spatialScore: 30,
    temporalScore: 25,
    trajectoryScore: 32,
    directionScore: 27,
    overallCorrelation: 28.5,
    status: 'Low Correlation',
    historicalTrack: [
      { lat: 10.820, lng: 72.510, timestamp: '12:00 UTC', speedKnots: 19.2, courseDeg: 135 },
      { lat: 10.660, lng: 72.670, timestamp: '13:00 UTC', speedKnots: 19.5, courseDeg: 135 },
      { lat: 10.510, lng: 72.820, timestamp: '14:00 UTC', speedKnots: 19.5, courseDeg: 135 },
    ]
  },
  {
    id: 'vessel-4',
    name: 'MV Eastern Pearl',
    mmsi: 'Demo-MMSI-004',
    type: 'Bulk Carrier',
    flag: 'Singapore',
    destination: 'Mangalore Port',
    callsign: '9V8812',
    lastPosition: { lat: 11.200, lng: 72.750 },
    speedKnots: 12.0,
    courseDeg: 20,
    distanceToOriginKm: 58.1,
    timeDiffHours: 3.2,
    spatialScore: 18,
    temporalScore: 14,
    trajectoryScore: 16,
    directionScore: 12,
    overallCorrelation: 15.2,
    status: 'Cleared',
    historicalTrack: [
      { lat: 10.900, lng: 72.640, timestamp: '12:00 UTC', speedKnots: 12.0, courseDeg: 20 },
      { lat: 11.050, lng: 72.695, timestamp: '13:00 UTC', speedKnots: 12.0, courseDeg: 20 },
      { lat: 11.200, lng: 72.750, timestamp: '14:00 UTC', speedKnots: 12.0, courseDeg: 20 },
    ]
  },
  {
    id: 'vessel-5',
    name: 'MV Coral Wind',
    mmsi: 'Demo-MMSI-005',
    type: 'Trawler / Fishing Vessel',
    flag: 'India',
    destination: 'Kavaratti (IN)',
    callsign: 'VWC402',
    lastPosition: { lat: 10.320, lng: 72.110 },
    speedKnots: 7.4,
    courseDeg: 210,
    distanceToOriginKm: 62.4,
    timeDiffHours: 4.1,
    spatialScore: 10,
    temporalScore: 8,
    trajectoryScore: 9,
    directionScore: 8,
    overallCorrelation: 8.7,
    status: 'Cleared',
    historicalTrack: [
      { lat: 10.480, lng: 72.200, timestamp: '12:00 UTC', speedKnots: 7.2, courseDeg: 210 },
      { lat: 10.400, lng: 72.155, timestamp: '13:00 UTC', speedKnots: 7.4, courseDeg: 210 },
      { lat: 10.320, lng: 72.110, timestamp: '14:00 UTC', speedKnots: 7.4, courseDeg: 210 },
    ]
  }
];

export const TIMELINE_EVENTS: TimelineEvent[] = [
  {
    id: 'evt-1',
    timestamp: '13:00 UTC',
    timeLabel: '13:00',
    title: 'Vessel Passes Probable Origin Zone',
    description: 'MV Ocean Star (MMSI: Demo-MMSI-001) passes within 1.4 km of calculated origin coordinates (10.761° N, 72.218° E).',
    type: 'vessel_pass',
    location: { lat: 10.758, lng: 72.212 },
    vesselName: 'MV Ocean Star',
    iconType: 'ship'
  },
  {
    id: 'evt-2',
    timestamp: '13:30 UTC',
    timeLabel: '13:30',
    title: 'Estimated Spill Release Window',
    description: 'Hydrodynamic backtracking drift model estimates discharge occurred around 13:30 UTC under 18 km/h NE wind and 1.7 kn current.',
    type: 'spill_release',
    location: { lat: 10.781, lng: 72.271 },
    iconType: 'droplet'
  },
  {
    id: 'evt-3',
    timestamp: '14:32 UTC',
    timeLabel: '14:32',
    title: 'Satellite Detects Oil Slick',
    description: 'Sentinel-1 SAR Satellite imagery captured dark slick pattern covering 18.6 km² with 94.7% AI segmentation confidence.',
    type: 'satellite_detect',
    location: { lat: 10.842, lng: 72.431 },
    iconType: 'satellite'
  },
  {
    id: 'evt-4',
    timestamp: '18:52 UTC',
    timeLabel: '18:52',
    title: 'Observed Spill Position & Tracking',
    description: 'Active monitoring slick position updated to 10.842° N, 72.431° E. AIS vessel trajectory spatio-temporal correlation completed.',
    type: 'current_obs',
    location: { lat: 10.842, lng: 72.431 },
    iconType: 'alert-triangle'
  }
];

export const AI_PIPELINE_STEPS: AIPipelineStep[] = [
  {
    id: 1,
    name: 'SATELLITE IMAGE ACQUISITION',
    description: 'Sentinel-1 C-band Synthetic Aperture Radar (SAR) Ground Range Detected (GRD) image ingested.',
    processingTimeMs: 420,
    status: 'completed',
    resultSummary: 'VV/VH Polarization captured at 10m spatial resolution'
  },
  {
    id: 2,
    name: 'IMAGE PREPROCESSING',
    description: 'Lee Filter speckle reduction, radiometric calibration, and terrain correction applied.',
    processingTimeMs: 680,
    status: 'completed',
    resultSummary: 'Noise ratio reduced by 84.2%'
  },
  {
    id: 3,
    name: 'AI OIL-SLICK SEGMENTATION',
    description: 'ResNet50-UNet Deep Learning classifier identifies dark sea surface anomaly areas.',
    processingTimeMs: 1250,
    status: 'completed',
    resultSummary: 'Feature mask identified with 94.7% confidence'
  },
  {
    id: 4,
    name: 'SPILL BOUNDARY POLYGONIZATION',
    description: 'Contour extraction & geodesic spatial area measurement calculated.',
    processingTimeMs: 310,
    status: 'completed',
    resultSummary: 'Polygon computed: 18.6 km² total surface area'
  },
  {
    id: 5,
    name: 'HYDRODYNAMIC DRIFT MODEL',
    description: 'Reverse drift particle simulation using NOAA GFS Wind (18 km/h) & HYCOM Ocean Current (1.7 kn).',
    processingTimeMs: 890,
    status: 'completed',
    resultSummary: 'Estimated release origin: 10.761° N, 72.218° E (Duration: 4h 20m)'
  },
  {
    id: 6,
    name: 'AIS VESSEL SPATIO-TEMPORAL CORRELATION',
    description: 'Cross-matching 1,284 vessel trajectories with origin boundary and time window.',
    processingTimeMs: 540,
    status: 'completed',
    resultSummary: 'MV Ocean Star identified with 90.3% correlation score'
  },
  {
    id: 7,
    name: 'INVESTIGATION REPORT GENERATION',
    description: 'Synthesizing evidence package for Coast Guard & Environmental Enforcement Agencies.',
    processingTimeMs: 200,
    status: 'completed',
    resultSummary: 'Report INC-2026-0914-01 compiled successfully'
  }
];

