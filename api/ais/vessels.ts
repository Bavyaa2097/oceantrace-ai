interface VesselsRequest {
  method?: string;
  query?: Record<string, string | string[] | undefined>;
}

interface VesselActivity {
  id: string;
  name: string | null;
  mmsi: string | null;
  type: string | null;
  flag: string | null;
  lat: number | null;
  lon: number | null;
  timestamp: null;
  date: string | null;
  speedKnots: null;
  courseDeg: null;
  activityHours: number | null;
  locationType: 'grid_cell_center';
}

interface ApiResponse {
  ok: boolean;
  service: string;
  error?: string;
  upstreamStatus?: number;
  upstreamMessage?: string;
  count?: number;
  vessels?: Array<VesselActivity | Record<string, string | number>>;
}

interface ResponseWriter {
  setHeader(name: string, value: string): void;
  status(code: number): {
    json(body: ApiResponse): unknown;
  };
}

const SERVICE = 'OceanTrace AIS API';
const GFW_URL = 'https://gateway.api.globalfishingwatch.org/v3/4wings/report';
const REQUEST_TIMEOUT_MS = 30_000;
const DATASET = 'public-global-presence:latest';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getSingleQueryValue(
  query: VesselsRequest['query'],
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

function toUtcDate(timestamp: number): string {
  return new Date(timestamp).toISOString().slice(0, 10);
}

function normalizeActivity(row: unknown): VesselActivity | null {
  if (!isRecord(row) || typeof row.vessel_id !== 'string' || row.vessel_id.trim() === '') {
    return null;
  }

  const getString = (value: unknown): string | null =>
    typeof value === 'string' && value.trim() !== '' ? value : null;
  const getNumber = (value: unknown): number | null =>
    typeof value === 'number' && Number.isFinite(value) ? value : null;

  return {
    id: row.vessel_id,
    name: getString(row.shipName),
    mmsi: getString(row.mmsi),
    type: getString(row.vessel_type),
    flag: getString(row.flag),
    lat: getNumber(row.lat),
    lon: getNumber(row.lon),
    timestamp: null,
    date: getString(row.date),
    speedKnots: null,
    courseDeg: null,
    activityHours: getNumber(row.hours),
    locationType: 'grid_cell_center',
  };
}

function extractActivityRows(payload: unknown): VesselActivity[] | null {
  if (!isRecord(payload) || !Array.isArray(payload.entries)) return null;

  const vessels: VesselActivity[] = [];
  for (const entry of payload.entries) {
    if (!isRecord(entry)) continue;

    for (const [datasetVersion, rows] of Object.entries(entry)) {
      if (!datasetVersion.startsWith('public-global-presence:') || !Array.isArray(rows)) continue;
      for (const row of rows) {
        const activity = normalizeActivity(row);
        if (activity) vessels.push(activity);
      }
    }
  }

  return vessels;
}

function normalizeRegionRow(row: unknown): Record<string, string | number> | null {
  if (!isRecord(row)) return null;

  const normalized: Record<string, string | number> = {};
  const gearType = row.geartype ?? row.gearType;
  if (typeof gearType === 'string' && gearType.trim() !== '') {
    normalized.gearType = gearType;
  }
  if (typeof row.hours === 'number' && Number.isFinite(row.hours)) {
    normalized.activityHours = row.hours;
  }
  if (typeof row.date === 'string' && row.date.trim() !== '') {
    normalized.date = row.date;
  }
  if (typeof row.lat === 'number' && Number.isFinite(row.lat)) {
    normalized.lat = row.lat;
  }
  if (typeof row.lon === 'number' && Number.isFinite(row.lon)) {
    normalized.lon = row.lon;
  }

  return Object.keys(normalized).length > 0 ? normalized : null;
}

function extractRegionRows(payload: unknown): Array<Record<string, string | number>> | null {
  if (!isRecord(payload) || !Array.isArray(payload.entries)) return null;

  const rows: Array<Record<string, string | number>> = [];
  for (const entry of payload.entries) {
    if (!isRecord(entry)) continue;

    for (const [datasetVersion, datasetRows] of Object.entries(entry)) {
      if (!datasetVersion.startsWith('public-global-presence:') || !Array.isArray(datasetRows)) continue;
      for (const row of datasetRows) {
        const normalized = normalizeRegionRow(row);
        if (normalized) rows.push(normalized);
      }
    }
  }

  return rows;
}

function sanitizeUpstreamMessage(value: unknown, token: string): string | undefined {
  if (typeof value !== 'string' || value.trim() === '') return undefined;

  const sanitized = value
    .split(token).join('[redacted]')
    .replace(/Bearer\s+\S+/gi, 'Bearer [redacted]')
    .replace(/[\r\n\t]+/g, ' ')
    .trim()
    .slice(0, 180);
  return sanitized || undefined;
}

async function get422DebugMessage(response: Response, token: string): Promise<string | undefined> {
  try {
    const payload: unknown = await response.json();
    if (!isRecord(payload)) return undefined;

    const messages = Array.isArray(payload.messages) ? payload.messages : [];
    const firstMessage = isRecord(messages[0]) ? messages[0] : null;
    const parts = [
      sanitizeUpstreamMessage(payload.error, token),
      sanitizeUpstreamMessage(firstMessage?.title, token),
      sanitizeUpstreamMessage(firstMessage?.detail, token),
    ].filter((part): part is string => part !== undefined);

    return parts.length > 0 ? parts.join(': ').slice(0, 360) : undefined;
  } catch {
    return undefined;
  }
}

export default async function handler(req: VesselsRequest, res: ResponseWriter): Promise<void> {
  res.setHeader('Allow', 'GET');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'GET') {
    res.status(405).json({
      ok: false,
      service: SERVICE,
      error: 'method_not_allowed',
    });
    return;
  }

  const bboxParameter = getSingleQueryValue(req.query, 'bbox');
  const regionIdParameter = getSingleQueryValue(req.query, 'regionId');
  const fromParameter = getSingleQueryValue(req.query, 'from');
  const toParameter = getSingleQueryValue(req.query, 'to');
  const regionId =
    regionIdParameter !== null && /^\d+$/.test(regionIdParameter)
      ? Number(regionIdParameter)
      : null;
  if (
    regionIdParameter !== null &&
    (regionId === null || !Number.isSafeInteger(regionId) || regionId <= 0)
  ) {
    res.status(400).json({
      ok: false,
      service: SERVICE,
      error: 'invalid_region_id',
    });
    return;
  }

  const bboxValues = bboxParameter?.split(',').map((coordinate) => Number(coordinate));
  if (
    regionId === null &&
    (
      !bboxValues ||
      bboxValues.length !== 4 ||
      bboxValues.some((coordinate) => !Number.isFinite(coordinate)) ||
      bboxValues[0] < -180 || bboxValues[0] > 180 ||
      bboxValues[2] < -180 || bboxValues[2] > 180 ||
      bboxValues[1] < -90 || bboxValues[1] > 90 ||
      bboxValues[3] < -90 || bboxValues[3] > 90 ||
      bboxValues[0] >= bboxValues[2] ||
      bboxValues[1] >= bboxValues[3]
    )
  ) {
    res.status(400).json({
      ok: false,
      service: SERVICE,
      error: 'invalid_bbox',
    });
    return;
  }

  const fromTimestamp = parseIsoDateTime(fromParameter);
  const toTimestamp = parseIsoDateTime(toParameter);
  if (fromTimestamp === null || toTimestamp === null || fromTimestamp > toTimestamp) {
    res.status(400).json({
      ok: false,
      service: SERVICE,
      error: 'invalid_date_range',
    });
    return;
  }

  const token = process.env.GFW_API_TOKEN;
  if (!token) {
    res.status(500).json({
      ok: false,
      service: SERVICE,
      error: 'configuration_missing',
    });
    return;
  }

  const startDate = toUtcDate(fromTimestamp);
  const lastRequestedDate = toUtcDate(toTimestamp);
  let endDate = lastRequestedDate;
  if (regionId === null || startDate === endDate) {
    const endExclusive = new Date(`${lastRequestedDate}T00:00:00.000Z`);
    endExclusive.setUTCDate(endExclusive.getUTCDate() + 1);
    endDate = endExclusive.toISOString().slice(0, 10);
  }

  const geojson = bboxValues
    ? {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'Polygon',
          coordinates: [[
            [bboxValues[0], bboxValues[1]],
            [bboxValues[2], bboxValues[1]],
            [bboxValues[2], bboxValues[3]],
            [bboxValues[0], bboxValues[3]],
            [bboxValues[0], bboxValues[1]],
          ]],
        },
      }
    : null;

  const url = new URL(GFW_URL);
  url.searchParams.set('datasets[0]', DATASET);
  url.searchParams.set('date-range', `${startDate},${endDate}`);
  url.searchParams.set('temporal-resolution', regionId !== null ? 'DAILY' : 'HOURLY');
  url.searchParams.set('spatial-resolution', regionId !== null ? 'LOW' : 'HIGH');
  url.searchParams.set('spatial-aggregation', 'false');
  url.searchParams.set('group-by', regionId !== null ? 'GEARTYPE' : 'VESSEL_ID');
  url.searchParams.set('format', 'JSON');

  let requestBody: Record<string, unknown>;
  if (regionId !== null) {
    requestBody = {
      region: {
        dataset: 'public-eez-areas',
        id: regionId,
      },
    };
  } else {
    requestBody = { geojson: geojson! };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const upstream = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });

    if (!upstream.ok) {
      const upstreamMessage =
        regionId !== null && upstream.status === 422
          ? await get422DebugMessage(upstream, token)
          : undefined;
      const apiStatus = upstream.status === 429 ? 429 : 502;
      const error =
        upstream.status === 401
          ? 'upstream_authentication_failed'
          : upstream.status === 403
            ? 'access_denied'
            : upstream.status === 429
              ? 'rate_limited'
              : 'upstream_error';
      console.warn('GFW 4Wings request failed', {
        status: upstream.status,
        message: upstreamMessage ?? 'Upstream request rejected',
      });
      res.status(apiStatus).json({
        ok: false,
        service: SERVICE,
        error,
        upstreamStatus: upstream.status,
        ...(upstreamMessage ? { upstreamMessage } : {}),
      });
      return;
    }

    const payload: unknown = await upstream.json();
    const vessels =
      regionId !== null
        ? extractRegionRows(payload)
        : extractActivityRows(payload);
    if (!vessels) {
      console.warn('GFW vessel activity response invalid', {
        status: upstream.status,
        endpoint: '4wings_report',
        count: 0,
      });
      res.status(502).json({
        ok: false,
        service: SERVICE,
        error: 'invalid_upstream_response',
        upstreamStatus: upstream.status,
      });
      return;
    }

    console.info('GFW vessel activity request complete', {
      status: upstream.status,
      endpoint: '4wings_report',
      count: vessels.length,
    });
    res.status(200).json({
      ok: true,
      service: SERVICE,
      count: vessels.length,
      vessels,
    });
  } catch {
    console.warn('GFW vessel activity request failed', {
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
