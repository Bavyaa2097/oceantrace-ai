export interface Coordinate {
  lat: number;
  lng: number;
}

export interface TrackPoint extends Coordinate {
  timestamp: string;
  speedKnots: number;
  courseDeg: number;
}

export interface Vessel {
  id: string;
  name: string;
  mmsi: string;
  type: string;
  flag: string;
  destination: string;
  callsign: string;
  lastPosition: Coordinate;
  speedKnots: number;
  courseDeg: number;
  distanceToOriginKm: number;
  timeDiffHours: number;
  spatialScore: number;
  temporalScore: number;
  trajectoryScore: number;
  directionScore: number;
  overallCorrelation: number;
  status: 'High Correlation Candidate' | 'Moderate Proximity' | 'Low Correlation' | 'Cleared';
  historicalTrack: TrackPoint[];
}

export interface SpillIncident {
  id: string;
  status: string;
  confidence: number;
  areaKm2: number;
  detectionTime: string;
  coordinates: Coordinate;
  originCoordinates: Coordinate;
  driftDirection: string;
  driftSpeedKnots: number;
  windSpeedKmh: number;
  windDirection: string;
  driftDurationMinutes: number;
  originConfidence: number;
  modelUsed: string;
  slickPolygon: [number, number][];
  originCircle: {
    center: [number, number];
    radiusMeters: number;
  };
  driftPath: [number, number][];
}

export interface TimelineEvent {
  id: string;
  timestamp: string;
  timeLabel: string;
  title: string;
  description: string;
  type: 'vessel_pass' | 'spill_release' | 'satellite_detect' | 'current_obs';
  location: Coordinate;
  vesselName?: string;
  iconType: string;
}

export interface AIPipelineStep {
  id: number;
  name: string;
  description: string;
  processingTimeMs: number;
  status: 'idle' | 'running' | 'completed';
  resultSummary?: string;
}

