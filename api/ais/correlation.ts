import getAisCandidates from './candidates';

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

interface CandidateResponse {
  ok: boolean;
  error?: string;
  upstreamStatus?: number;
  observations?: unknown[];
}

interface CorrelationVessel {
  id: string;
  name: string | null;
  mmsi: string | null;
  type: string | null;
  flag: string | null;
  observationCount: number;
  minimumDistanceKm: number;
  closestObservationTime: string | null;
  minimumTemporalDifferenceHours: number | null;
  correlationIndicator: number;
  locationType: 'grid_cell_center';
  temporalPrecision: 'hour' | 'date';
  factors: {
    spatialScore: number;
    temporalScore: number;
    persistenceScore: number;
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

function parseCandidateResponse(value: unknown): CandidateResponse | null {
  if (!isRecord(value) || typeof value.ok !== 'boolean') return null;

  return {
    ok: value.ok,
    ...(typeof value.error === 'string' ? { error: value.error } : {}),
    ...(typeof value.upstreamStatus === 'number' ? { upstreamStatus: value.upstreamStatus } : {}),
    ...(Array.isArray(value.observations) ? { observations: value.observations } : {}),
  };
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

function validCandidateObservation(
  value: unknown,
  investigationLat: number,
  investigationLon: number,
  radiusKm: number
): CandidateObservation | null {
  if (!isRecord(value)) return null;
  const lat = finiteNumber(value.lat);
  const lon = finiteNumber(value.lon);
  if (
    lat === null || lat < -90 || lat > 90 ||
    lon === null || lon < -180 || lon > 180 ||
    typeof value.date !== 'string' ||
    value.locationType !== 'grid_cell_center'
  ) {
    return null;
  }

  const distanceKm = haversineDistanceKm(investigationLat, investigationLon, lat, lon);
  if (distanceKm > radiusKm) return null;

  return {
    id: nullableString(value.id),
    name: nullableString(value.name),
    mmsi: nullableString(value.mmsi),
    type: nullableString(value.type),
    flag: nullableString(value.flag),
    lat,
    lon,
    date: value.date,
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

    const spatialScore = Math.max(0, 1 - observation.distanceKm / radiusKm);
    vessel.maxSpatialScore = Math.max(vessel.maxSpatialScore, spatialScore);
    if (spatialScore > 0) vessel.basis.add('near investigation point');

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
      if (temporalScore > 0) vessel.basis.add('close to observation time');
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
        vessel.basis.add('multiple presence observations');
      }
      const correlationIndicator = Math.round(
        100 * (
          0.5 * vessel.maxSpatialScore +
          0.35 * vessel.maxTemporalScore +
          0.15 * persistenceScore
        )
      );

      return {
        id: vessel.id,
        name: vessel.name,
        mmsi: vessel.mmsi,
        type: vessel.type,
        flag: vessel.flag,
        observationCount: vessel.observationCount,
        minimumDistanceKm: vessel.minimumDistanceKm,
        closestObservationTime: vessel.closestObservationTime,
        minimumTemporalDifferenceHours: vessel.minimumTemporalDifferenceHours,
        correlationIndicator,
        locationType: 'grid_cell_center' as const,
        temporalPrecision: vessel.hasHourlyTime ? 'hour' as const : 'date' as const,
        factors: {
          spatialScore: vessel.maxSpatialScore,
          temporalScore: vessel.maxTemporalScore,
          persistenceScore,
        },
        basis: Array.from(vessel.basis),
      };
    })
    .sort((first, second) =>
      second.correlationIndicator - first.correlationIndicator ||
      first.minimumDistanceKm - second.minimumDistanceKm
    );
}

async function fetchCandidateObservations(
  lat: number,
  lon: number,
  radiusKm: number,
  from: string,
  to: string
): Promise<{ status: number; response: CandidateResponse | null }> {
  let status = 200;
  let body: unknown;
  await getAisCandidates(
    {
      method: 'GET',
      query: {
        lat: String(lat),
        lon: String(lon),
        radiusKm: String(radiusKm),
        from,
        to,
      },
    },
    {
      setHeader: () => undefined,
      status: (nextStatus) => {
        status = nextStatus;
        return {
          json: (payload) => {
            body = payload;
            return undefined;
          },
        };
      },
    }
  );

  return {
    status,
    response: parseCandidateResponse(body),
  };
}

export default async function handler(req: CorrelationRequest, res: ResponseWriter): Promise<void> {
  res.setHeader('Allow', 'POST');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, service: SERVICE, error: 'method_not_allowed' });
    return;
  }

  const body = req.body;
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

  let observations: CandidateObservation[];
  if (isRecord(body) && Array.isArray(body.observations)) {
    const parsedObservations = body.observations
      .map((observation) => validCandidateObservation(observation, lat, lon, radiusKm))
      .filter((value): value is CandidateObservation => value !== null);
    if (parsedObservations.length !== body.observations.length) {
      res.status(400).json({ ok: false, service: SERVICE, error: 'invalid_observations' });
      return;
    }
    observations = parsedObservations;
  } else {
    const candidates = await fetchCandidateObservations(
      lat,
      lon,
      radiusKm,
      from as string,
      to as string
    );
    if (!candidates.response?.ok || !Array.isArray(candidates.response.observations)) {
      const upstreamStatus = candidates.response?.upstreamStatus;
      const responseStatus = candidates.status === 500 ? 500 : 502;
      res.status(responseStatus).json({
        ok: false,
        service: SERVICE,
        error: candidates.response?.error ?? 'upstream_error',
        ...(upstreamStatus !== undefined ? { upstreamStatus } : {}),
      });
      return;
    }
    observations = candidates.response.observations
      .map((observation) => validCandidateObservation(observation, lat, lon, radiusKm))
      .filter((value): value is CandidateObservation => value !== null);
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
}
