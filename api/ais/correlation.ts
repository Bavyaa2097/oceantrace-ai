interface CorrelationRequest {
  method?: string;
  body?: unknown;
}

interface CandidateObservation {
  id: string | null;
  name: string | null;
  mmsi: string | null;
  type: string | null;
  flag: string | null;
  lat: number;
  lon: number;
  date: string;
  activityHours: number | null;
  locationType: 'grid_cell_center';
  distanceKm: number;
}

interface CorrelationVessel {
  id: string;
  name: string | null;
  mmsi: string | null;
  type: string | null;
  flag: string | null;
  closestObservationTime: string | null;
  correlationIndicator: number;
  locationType: 'grid_cell_center';
  temporalPrecision: 'hour' | 'date';
  factors: {
    spatialScore: number;
    temporalScore: number;
    persistenceScore: number;
    observationSpreadScore: number;
  };
  metrics: {
    observationCount: number;
    minimumDistanceKm: number;
    minimumTemporalDifferenceHours: number | null;
    maximumObservationSeparationKm: number;
  };
  basis: string[];
}

interface CorrelationResponse {
  ok: boolean;
  service: string;
  error?: string;
  upstreamStatus?: number;
  investigation?: {
    lat: number;
    lon: number;
    radiusKm: number;
    satelliteObservationTime: string;
    from: string;
    to: string;
  };
  observationCount?: number;
  uniqueVesselCount?: number;
  vessels?: CorrelationVessel[];
  limitations?: string[];
}

interface ResponseWriter {
  setHeader(name: string, value: string): void;
  status(code: number): {
    json(body: CorrelationResponse): unknown;
  };
}

interface ParsedObservationTime {
  timestamp: number | null;
  dateStart: number;
  dateEnd: number;
  precision: 'hour' | 'date';
}

interface VesselAccumulator {
  id: string;
  name: string | null;
  mmsi: string | null;
  type: string | null;
  flag: string | null;
  observationCount: number;
  minimumDistanceKm: number;
  closestObservationTime: string | null;
  minimumTemporalDifferenceHours: number | null;
  maxSpatialScore: number;
  maxTemporalScore: number;
  maximumObservationSeparationKm: number;
  locations: Array<{ lat: number; lon: number }>;
  hasHourlyTime: boolean;
  basis: Set<string>;
  observationKeys: Set<string>;
}

const SERVICE = 'OceanTrace AIS Correlation';
const LIMITATIONS = [
  'AIS positions are represented as GFW grid-cell centers rather than exact vessel fixes.',
  'The correlation indicator is a transparent spatial/temporal heuristic, not a probability of responsibility.',
  'AIS presence alone does not establish that a vessel caused an oil spill.',
];
const SIX_HOURS_MS = 6 * 60 * 60 * 1000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseIsoTimestamp(value: unknown): number | null {
  if (typeof value !== 'string') return null;
  const match =
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(Z|([+-])(\d{2}):(\d{2}))$/.exec(value);
  if (!match) return null;

  const [, yearText, monthText, dayText, hourText, minuteText, secondText, , , offsetHourText, offsetMinuteText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const hour = Number(hourText);
  const minute = Number(minuteText);
  const second = Number(secondText);
  const offsetHour = Number(offsetHourText ?? 0);
  const offsetMinute = Number(offsetMinuteText ?? 0);
  const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const daysInMonth = [31, leapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1];
  if (
    month < 1 || month > 12 ||
    day < 1 || day > daysInMonth ||
    hour > 23 || minute > 59 || second > 59 ||
    offsetHour > 23 || offsetMinute > 59
  ) {
    return null;
  }

  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : null;
}

function parseObservationTime(value: unknown): ParsedObservationTime | null {
  if (typeof value !== 'string') return null;
  const exactTimestamp = parseIsoTimestamp(value);
  if (exactTimestamp !== null) {
    const dateStart = Date.parse(`${new Date(exactTimestamp).toISOString().slice(0, 10)}T00:00:00.000Z`);
    return {
      timestamp: exactTimestamp,
      dateStart,
      dateEnd: dateStart + 24 * 60 * 60 * 1000,
      precision: 'hour',
    };
  }

  const hourlyMatch = /^(\d{4}-\d{2}-\d{2}) (\d{2}):(\d{2})(?::(\d{2}))?$/.exec(value);
  if (hourlyMatch) {
    const [, calendarDate, hourText, minuteText, secondText] = hourlyMatch;
    const hour = Number(hourText);
    const minute = Number(minuteText);
    const second = Number(secondText ?? 0);
    const dateStart = Date.parse(`${calendarDate}T00:00:00.000Z`);
    if (
      !Number.isFinite(dateStart) ||
      new Date(dateStart).toISOString().slice(0, 10) !== calendarDate ||
      hour > 23 || minute > 59 || second > 59
    ) {
      return null;
    }
    return {
      timestamp: dateStart + hour * 60 * 60 * 1000 + minute * 60 * 1000 + second * 1000,
      dateStart,
      dateEnd: dateStart + 24 * 60 * 60 * 1000,
      precision: 'hour',
    };
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const dateStart = Date.parse(`${value}T00:00:00.000Z`);
  if (!Number.isFinite(dateStart) || new Date(dateStart).toISOString().slice(0, 10) !== value) {
    return null;
  }
  return {
    timestamp: null,
    dateStart,
    dateEnd: dateStart + 24 * 60 * 60 * 1000,
    precision: 'date',
  };
}

function finiteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function nullableString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value : null;
}

function haversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const radians = (degrees: number): number => degrees * Math.PI / 180;
  const deltaLat = radians(lat2 - lat1);
  const deltaLon = radians(lon2 - lon1);
  const startLat = radians(lat1);
  const endLat = radians(lat2);
  const a = Math.min(1, Math.max(0,
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(startLat) * Math.cos(endLat) * Math.sin(deltaLon / 2) ** 2
  ));
  return 6371.0088 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function parseCandidateObservation(
  value: unknown,
  investigationLat: number,
  investigationLon: number,
  radiusKm: number
): CandidateObservation | null {
  if (!isRecord(value)) return null;
  const lat = finiteNumber(value.lat);
  const lon = finiteNumber(value.lon);
  const date = typeof value.date === 'string' ? value.date : null;
  if (
    lat === null || lat < -90 || lat > 90 ||
    lon === null || lon < -180 || lon > 180 ||
    date === null ||
    parseObservationTime(date) === null ||
    (value.id !== undefined && value.id !== null && typeof value.id !== 'string') ||
    (value.name !== undefined && value.name !== null && typeof value.name !== 'string') ||
    (value.mmsi !== undefined && value.mmsi !== null && typeof value.mmsi !== 'string') ||
    (value.type !== undefined && value.type !== null && typeof value.type !== 'string') ||
    (value.flag !== undefined && value.flag !== null && typeof value.flag !== 'string') ||
    (value.activityHours !== undefined && value.activityHours !== null &&
      (finiteNumber(value.activityHours) === null || finiteNumber(value.activityHours)! < 0)) ||
    value.locationType !== 'grid_cell_center'
  ) {
    return null;
  }

  const distanceKm = haversineDistanceKm(investigationLat, investigationLon, lat, lon);
  if (distanceKm > radiusKm) return null;

  return {
    id: nullableString(value.id) ?? null,
    name: nullableString(value.name) ?? null,
    mmsi: nullableString(value.mmsi) ?? null,
    type: nullableString(value.type) ?? null,
    flag: nullableString(value.flag) ?? null,
    lat,
    lon,
    date,
    activityHours: finiteNumber(value.activityHours),
    locationType: 'grid_cell_center',
    distanceKm,
  };
}

function getObservationKey(observation: CandidateObservation): string {
  return JSON.stringify([
    observation.id,
    observation.date,
    observation.lat,
    observation.lon,
    observation.activityHours,
  ]);
}

function makeVesselSummaries(
  observations: CandidateObservation[],
  satelliteTimestamp: number,
  fromTimestamp: number,
  toTimestamp: number,
  radiusKm: number
): CorrelationVessel[] {
  const vessels = new Map<string, VesselAccumulator>();

  for (const observation of observations) {
    if (observation.id === null) continue;
    const parsedTime = parseObservationTime(observation.date);
    if (
      !parsedTime ||
      (parsedTime.timestamp !== null
        ? parsedTime.timestamp > toTimestamp || parsedTime.timestamp + 60 * 60 * 1000 <= fromTimestamp
        : parsedTime.dateEnd <= fromTimestamp || parsedTime.dateStart > toTimestamp)
    ) {
      continue;
    }

    const key = getObservationKey(observation);
    let vessel = vessels.get(observation.id);
    if (!vessel) {
      vessel = {
        id: observation.id,
        name: observation.name,
        mmsi: observation.mmsi,
        type: observation.type,
        flag: observation.flag,
        observationCount: 0,
        minimumDistanceKm: Number.POSITIVE_INFINITY,
        closestObservationTime: null,
        minimumTemporalDifferenceHours: null,
        maxSpatialScore: 0,
        maxTemporalScore: 0,
        maximumObservationSeparationKm: 0,
        locations: [],
        hasHourlyTime: false,
        basis: new Set<string>(),
        observationKeys: new Set<string>(),
      };
      vessels.set(observation.id, vessel);
    }

    if (vessel.observationKeys.has(key)) continue;
    vessel.observationKeys.add(key);
    vessel.observationCount += 1;
    vessel.minimumDistanceKm = Math.min(vessel.minimumDistanceKm, observation.distanceKm);
    for (const location of vessel.locations) {
      vessel.maximumObservationSeparationKm = Math.max(
        vessel.maximumObservationSeparationKm,
        haversineDistanceKm(location.lat, location.lon, observation.lat, observation.lon)
      );
    }
    vessel.locations.push({ lat: observation.lat, lon: observation.lon });

    const spatialScore = Math.max(0, 1 - observation.distanceKm / radiusKm);
    vessel.maxSpatialScore = Math.max(vessel.maxSpatialScore, spatialScore);
    if (spatialScore > 0) vessel.basis.add('nearest presence near the investigation point');

    if (parsedTime.timestamp !== null) {
      const timeDifferenceHours = Math.abs(parsedTime.timestamp - satelliteTimestamp) / (60 * 60 * 1000);
      const temporalScore = Math.max(0, 1 - timeDifferenceHours / 6);
      if (
        vessel.minimumTemporalDifferenceHours === null ||
        timeDifferenceHours < vessel.minimumTemporalDifferenceHours
      ) {
        vessel.minimumTemporalDifferenceHours = timeDifferenceHours;
        vessel.closestObservationTime = observation.date;
      }
      vessel.maxTemporalScore = Math.max(vessel.maxTemporalScore, temporalScore);
      vessel.hasHourlyTime = true;
      if (temporalScore > 0) vessel.basis.add('presence close to the satellite observation time');
    }

    if (vessel.name === null) vessel.name = observation.name;
    if (vessel.mmsi === null) vessel.mmsi = observation.mmsi;
    if (vessel.type === null) vessel.type = observation.type;
    if (vessel.flag === null) vessel.flag = observation.flag;
  }

  return Array.from(vessels.values())
    .map((vessel) => {
      const persistenceScore = Math.min(vessel.observationCount / 6, 1);
      if (vessel.observationCount > 1 && persistenceScore > 0) {
        vessel.basis.add('repeated presence observations');
      }
      const observationSpreadScore = Math.min(
        vessel.maximumObservationSeparationKm / radiusKm,
        1
      );
      if (vessel.maximumObservationSeparationKm > 0) {
        vessel.basis.add('presence observations span multiple grid-cell locations');
      }
      const correlationIndicator = Math.round(
        100 * (
          0.4 * vessel.maxSpatialScore +
          0.3 * vessel.maxTemporalScore +
          0.2 * persistenceScore +
          0.1 * observationSpreadScore
        )
      );

      return {
        id: vessel.id,
        name: vessel.name,
        mmsi: vessel.mmsi,
        type: vessel.type,
        flag: vessel.flag,
        closestObservationTime: vessel.closestObservationTime,
        correlationIndicator,
        locationType: 'grid_cell_center' as const,
        temporalPrecision: vessel.hasHourlyTime ? 'hour' as const : 'date' as const,
        factors: {
          spatialScore: vessel.maxSpatialScore,
          temporalScore: vessel.maxTemporalScore,
          persistenceScore,
          observationSpreadScore,
        },
        metrics: {
          observationCount: vessel.observationCount,
          minimumDistanceKm: vessel.minimumDistanceKm,
          minimumTemporalDifferenceHours: vessel.minimumTemporalDifferenceHours,
          maximumObservationSeparationKm: vessel.maximumObservationSeparationKm,
        },
        basis: Array.from(vessel.basis),
      };
    })
    .sort((first, second) =>
      second.correlationIndicator - first.correlationIndicator ||
      first.metrics.minimumDistanceKm - second.metrics.minimumDistanceKm
    );
}

export default async function handler(req: CorrelationRequest, res: ResponseWriter): Promise<void> {
  res.setHeader('Allow', 'POST');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, service: SERVICE, error: 'method_not_allowed' });
    return;
  }

  try {
  const body = req.body;
  if (!isRecord(body) || !('observations' in body)) {
    res.status(400).json({ ok: false, service: SERVICE, error: 'observations_required' });
    return;
  }
  if (!Array.isArray(body.observations)) {
    res.status(400).json({ ok: false, service: SERVICE, error: 'invalid_observations' });
    return;
  }
  if (body.observations.length > 2000) {
    res.status(413).json({ ok: false, service: SERVICE, error: 'too_many_observations' });
    return;
  }

  const investigationPoint = isRecord(body) && isRecord(body.investigationPoint)
    ? body.investigationPoint
    : null;
  const lat = finiteNumber(investigationPoint?.lat);
  const lon = finiteNumber(investigationPoint?.lon);
  const radiusKm = finiteNumber(isRecord(body) ? body.radiusKm : undefined);
  const satelliteObservationTime = isRecord(body) ? body.satelliteObservationTime : undefined;
  const from = isRecord(body) ? body.from : undefined;
  const to = isRecord(body) ? body.to : undefined;
  const satelliteTimestamp = parseIsoTimestamp(satelliteObservationTime);
  const fromTimestamp = parseIsoTimestamp(from);
  const toTimestamp = parseIsoTimestamp(to);

  if (
    lat === null || lat < -90 || lat > 90 ||
    lon === null || lon < -180 || lon > 180 ||
    radiusKm === null || radiusKm <= 0 || radiusKm > 200 ||
    satelliteTimestamp === null ||
    fromTimestamp === null || toTimestamp === null || fromTimestamp > toTimestamp ||
    satelliteTimestamp < fromTimestamp - SIX_HOURS_MS ||
    satelliteTimestamp > toTimestamp + SIX_HOURS_MS
  ) {
    res.status(400).json({ ok: false, service: SERVICE, error: 'invalid_request' });
    return;
  }

  console.info('correlation request received', {
    observationCount: body.observations.length,
    hasSatelliteTimestamp: satelliteTimestamp !== null,
    radiusKm,
  });
  const observations: CandidateObservation[] = [];
  for (const observation of body.observations) {
    const parsed = parseCandidateObservation(observation, lat, lon, radiusKm);
    if (!parsed) {
      res.status(400).json({ ok: false, service: SERVICE, error: 'invalid_observations' });
      return;
    }
    observations.push(parsed);
  }

  const uniqueObservations = new Map<string, CandidateObservation>();
  for (const observation of observations) {
    const parsedTime = parseObservationTime(observation.date);
    if (
      parsedTime &&
      (parsedTime.timestamp !== null
        ? parsedTime.timestamp <= toTimestamp && parsedTime.timestamp + 60 * 60 * 1000 > fromTimestamp
        : parsedTime.dateEnd > fromTimestamp && parsedTime.dateStart <= toTimestamp)
    ) {
      uniqueObservations.set(getObservationKey(observation), observation);
    }
  }
  const filteredObservations = Array.from(uniqueObservations.values());
  const vessels = makeVesselSummaries(
    filteredObservations,
    satelliteTimestamp,
    fromTimestamp,
    toTimestamp,
    radiusKm
  );

  console.info('correlation calculation complete', {
    filteredObservationCount: filteredObservations.length,
    uniqueVesselCount: vessels.length,
  });
  res.status(200).json({
    ok: true,
    service: SERVICE,
    investigation: {
      lat,
      lon,
      radiusKm,
      satelliteObservationTime: satelliteObservationTime as string,
      from: from as string,
      to: to as string,
    },
    observationCount: filteredObservations.length,
    uniqueVesselCount: vessels.length,
    vessels,
    limitations: LIMITATIONS,
  });
  } catch (error) {
    const errorName = error instanceof Error && /^[A-Za-z][A-Za-z0-9]*$/.test(error.name)
      ? error.name.slice(0, 80)
      : 'UnknownError';
    console.error('correlation calculation failed', {
      errorName,
      message: 'Unexpected correlation calculation error',
    });
    res.status(500).json({ ok: false, service: SERVICE, error: 'internal_error' });
  }
}
