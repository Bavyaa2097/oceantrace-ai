interface CandidatesRequest {
  method?: string;
  query?: Record<string, string | string[] | undefined>;
}

interface VesselObservation {
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

interface VesselSummary {
  id: string;
  name: string | null;
  mmsi: string | null;
  type: string | null;
  flag: string | null;
  observationCount: number;
  minimumDistanceKm: number;
  firstObserved: string;
  lastObserved: string;
}

interface ApiResponse {
  ok: boolean;
  service: string;
  error?: string;
  upstreamStatus?: number;
  investigation?: {
    lat: number;
    lon: number;
    from: string;
    to: string;
    radiusKm: number;
  };
  observationCount?: number;
  uniqueVesselCount?: number;
  observations?: VesselObservation[];
  vessels?: VesselSummary[];
}

interface ResponseWriter {
  setHeader(name: string, value: string): void;
  status(code: number): {
    json(body: ApiResponse): unknown;
  };
}

interface ParsedObservationDate {
  date: string;
  startTimestamp: number;
  endTimestamp: number;
}

const SERVICE = 'OceanTrace AIS API';
const GFW_URL = 'https://gateway.api.globalfishingwatch.org/v3/4wings/report';
const REQUEST_TIMEOUT_MS = 30_000;
const DATASET = 'public-global-presence:latest';
const EARTH_RADIUS_KM = 6371.0088;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getSingleQueryValue(
  query: CandidatesRequest['query'],
  key: string
): string | null {
  const value = query?.[key];
  return typeof value === 'string' ? value : null;
}

function parseIsoDateTime(value: string | null): number | null {
  if (!value) return null;

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

function getNumber(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string' || value.trim() === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function getString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value : null;
}

function getIdentifier(value: unknown): string | null {
  if (typeof value === 'string' && value.trim() !== '') return value;
  return typeof value === 'number' && Number.isFinite(value) ? String(value) : null;
}

function parseObservationDate(row: Record<string, unknown>): ParsedObservationDate | null {
  const date = getString(row.date);
  if (!date) return null;

  const timestamp = parseIsoDateTime(date);
  if (timestamp !== null) {
    return {
      date,
      startTimestamp: timestamp,
      endTimestamp: timestamp + 1,
    };
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const dayStart = Date.parse(`${date}T00:00:00.000Z`);
  if (!Number.isFinite(dayStart) || new Date(dayStart).toISOString().slice(0, 10) !== date) {
    return null;
  }

  const hour = getNumber(row.hour);
  if (hour !== null && Number.isInteger(hour) && hour >= 0 && hour <= 23) {
    const hourStart = dayStart + hour * 60 * 60 * 1000;
    return { date, startTimestamp: hourStart, endTimestamp: hourStart + 60 * 60 * 1000 };
  }

  return { date, startTimestamp: dayStart, endTimestamp: dayStart + 24 * 60 * 60 * 1000 };
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
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function makeBoundingBox(lat: number, lon: number, radiusKm: number): [number, number, number, number] {
  const latitudeDelta = radiusKm / 111.32;
  const minLat = Math.max(-90, lat - latitudeDelta);
  const maxLat = Math.min(90, lat + latitudeDelta);
  const reachesPole = minLat <= -90 || maxLat >= 90;
  const longitudeScale = 111.32 * Math.cos(lat * Math.PI / 180);
  const longitudeDelta = reachesPole || Math.abs(longitudeScale) < 1e-9
    ? 180
    : radiusKm / longitudeScale;
  const crossesDateLine = lon - longitudeDelta <= -180 || lon + longitudeDelta >= 180;
  const minLon = crossesDateLine ? -180 : lon - longitudeDelta;
  const maxLon = crossesDateLine ? 180 : lon + longitudeDelta;

  return [minLon, minLat, maxLon, maxLat];
}

function toUtcDate(timestamp: number): string {
  return new Date(timestamp).toISOString().slice(0, 10);
}

function getRows(payload: unknown): Record<string, unknown>[] | null {
  if (!isRecord(payload) || !Array.isArray(payload.entries)) return null;

  const rows: Record<string, unknown>[] = [];
  for (const entry of payload.entries) {
    if (!isRecord(entry)) continue;

    for (const [datasetVersion, datasetRows] of Object.entries(entry)) {
      if (!datasetVersion.startsWith('public-global-presence:') || !Array.isArray(datasetRows)) continue;
      for (const row of datasetRows) {
        if (isRecord(row)) rows.push(row);
      }
    }
  }

  return rows;
}

function normalizeObservation(
  row: Record<string, unknown>,
  investigationLat: number,
  investigationLon: number,
  fromTimestamp: number,
  toTimestamp: number,
  radiusKm: number
): { observation: VesselObservation; observedAt: number } | null {
  const lat = getNumber(row.lat);
  const lon = getNumber(row.lon);
  const parsedDate = parseObservationDate(row);
  if (
    lat === null || lat < -90 || lat > 90 ||
    lon === null || lon < -180 || lon > 180 ||
    !parsedDate ||
    parsedDate.startTimestamp > toTimestamp ||
    parsedDate.endTimestamp <= fromTimestamp
  ) {
    return null;
  }

  const distanceKm = haversineDistanceKm(investigationLat, investigationLon, lat, lon);
  if (distanceKm > radiusKm) return null;

  const getRowString = (...keys: string[]): string | null => {
    for (const key of keys) {
      const value = getString(row[key]);
      if (value !== null) return value;
    }
    return null;
  };
  const id = getIdentifier(row.vesselId ?? row.vessel_id);

  return {
    observation: {
      id,
      name: getRowString('shipName', 'ship_name'),
      mmsi: getIdentifier(row.mmsi),
      type: getRowString('vesselType', 'vessel_type'),
      flag: getRowString('flag'),
      lat,
      lon,
      date: parsedDate.date,
      activityHours: getNumber(row.hours),
      locationType: 'grid_cell_center',
      distanceKm,
    },
    observedAt: parsedDate.startTimestamp,
  };
}

function observationKey(observation: VesselObservation): string {
  return JSON.stringify([
    observation.id,
    observation.date,
    observation.lat,
    observation.lon,
    observation.activityHours,
  ]);
}

function buildVesselSummaries(
  observations: Array<{ observation: VesselObservation; observedAt: number }>
): VesselSummary[] {
  const vessels = new Map<string, {
    summary: VesselSummary;
    firstTimestamp: number;
    lastTimestamp: number;
  }>();

  for (const { observation, observedAt } of observations) {
    if (observation.id === null) continue;

    const existing = vessels.get(observation.id);
    if (!existing) {
      vessels.set(observation.id, {
        summary: {
          id: observation.id,
          name: observation.name,
          mmsi: observation.mmsi,
          type: observation.type,
          flag: observation.flag,
          observationCount: 1,
          minimumDistanceKm: observation.distanceKm,
          firstObserved: observation.date,
          lastObserved: observation.date,
        },
        firstTimestamp: observedAt,
        lastTimestamp: observedAt,
      });
      continue;
    }

    existing.summary.observationCount += 1;
    existing.summary.minimumDistanceKm = Math.min(
      existing.summary.minimumDistanceKm,
      observation.distanceKm
    );
    if (existing.summary.name === null) existing.summary.name = observation.name;
    if (existing.summary.mmsi === null) existing.summary.mmsi = observation.mmsi;
    if (existing.summary.type === null) existing.summary.type = observation.type;
    if (existing.summary.flag === null) existing.summary.flag = observation.flag;
    if (observedAt < existing.firstTimestamp) {
      existing.firstTimestamp = observedAt;
      existing.summary.firstObserved = observation.date;
    }
    if (observedAt > existing.lastTimestamp) {
      existing.lastTimestamp = observedAt;
      existing.summary.lastObserved = observation.date;
    }
  }

  return Array.from(vessels.values())
    .map(({ summary }) => summary)
    .sort((a, b) => a.minimumDistanceKm - b.minimumDistanceKm);
}

export default async function handler(req: CandidatesRequest, res: ResponseWriter): Promise<void> {
  res.setHeader('Allow', 'GET');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'GET') {
    res.status(405).json({ ok: false, service: SERVICE, error: 'method_not_allowed' });
    return;
  }

  const lat = getNumber(getSingleQueryValue(req.query, 'lat'));
  const lon = getNumber(getSingleQueryValue(req.query, 'lon'));
  const fromParameter = getSingleQueryValue(req.query, 'from');
  const toParameter = getSingleQueryValue(req.query, 'to');
  const radiusKm = getNumber(getSingleQueryValue(req.query, 'radiusKm'));
  const fromTimestamp = parseIsoDateTime(fromParameter);
  const toTimestamp = parseIsoDateTime(toParameter);

  if (
    lat === null || lat < -90 || lat > 90 ||
    lon === null || lon < -180 || lon > 180 ||
    radiusKm === null || radiusKm <= 0 || radiusKm > 200 ||
    fromTimestamp === null || toTimestamp === null || fromTimestamp > toTimestamp
  ) {
    res.status(400).json({ ok: false, service: SERVICE, error: 'invalid_query' });
    return;
  }

  const token = process.env.GFW_API_TOKEN;
  if (!token) {
    res.status(500).json({ ok: false, service: SERVICE, error: 'configuration_missing' });
    return;
  }

  const [minLon, minLat, maxLon, maxLat] = makeBoundingBox(lat, lon, radiusKm);
  const startDate = toUtcDate(fromTimestamp);
  const lastRequestedDate = toUtcDate(toTimestamp);
  const endExclusive = new Date(`${lastRequestedDate}T00:00:00.000Z`);
  endExclusive.setUTCDate(endExclusive.getUTCDate() + 1);
  const endDate = endExclusive.toISOString().slice(0, 10);
  const geojson = {
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [minLon, minLat],
        [maxLon, minLat],
        [maxLon, maxLat],
        [minLon, maxLat],
        [minLon, minLat],
      ]],
    },
  };

  const url = new URL(GFW_URL);
  url.searchParams.set('datasets[0]', DATASET);
  url.searchParams.set('date-range', `${startDate},${endDate}`);
  url.searchParams.set('temporal-resolution', 'HOURLY');
  url.searchParams.set('spatial-resolution', 'HIGH');
  url.searchParams.set('spatial-aggregation', 'false');
  url.searchParams.set('group-by', 'VESSEL_ID');
  url.searchParams.set('format', 'JSON');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const upstream = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ geojson }),
      signal: controller.signal,
    });

    if (!upstream.ok) {
      console.warn('GFW vessel candidate request failed', {
        status: upstream.status,
        endpoint: '4wings_report',
        count: 0,
      });
      res.status(502).json({
        ok: false,
        service: SERVICE,
        error: upstream.status === 401
          ? 'upstream_authentication_failed'
          : upstream.status === 403
            ? 'access_denied'
            : upstream.status === 429
              ? 'rate_limited'
              : 'upstream_error',
        upstreamStatus: upstream.status,
      });
      return;
    }

    const payload: unknown = await upstream.json();
    const rows = getRows(payload);
    if (!rows) {
      res.status(502).json({
        ok: false,
        service: SERVICE,
        error: 'invalid_upstream_response',
        upstreamStatus: upstream.status,
      });
      return;
    }

    const uniqueObservations = new Map<string, { observation: VesselObservation; observedAt: number }>();
    for (const row of rows) {
      const normalized = normalizeObservation(
        row,
        lat,
        lon,
        fromTimestamp,
        toTimestamp,
        radiusKm
      );
      if (!normalized) continue;
      const key = observationKey(normalized.observation);
      if (!uniqueObservations.has(key)) uniqueObservations.set(key, normalized);
    }

    const observations = Array.from(uniqueObservations.values())
      .sort((a, b) => a.observation.distanceKm - b.observation.distanceKm);
    const vessels = buildVesselSummaries(observations);

    console.info('GFW vessel candidate request complete', {
      status: upstream.status,
      endpoint: '4wings_report',
      count: observations.length,
    });
    res.status(200).json({
      ok: true,
      service: SERVICE,
      investigation: {
        lat,
        lon,
        from: fromParameter!,
        to: toParameter!,
        radiusKm,
      },
      observationCount: observations.length,
      uniqueVesselCount: vessels.length,
      observations: observations.map(({ observation }) => observation),
      vessels,
    });
  } catch {
    console.warn('GFW vessel candidate request failed', {
      status: 502,
      endpoint: '4wings_report',
      count: 0,
    });
    res.status(502).json({
      ok: false,
      service: SERVICE,
      error: 'upstream_error',
    });
  } finally {
    clearTimeout(timeout);
  }
}
