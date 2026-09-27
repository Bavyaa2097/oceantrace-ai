interface SearchRequest {
  method?: string;
  body?: unknown;
}

interface SearchResponse {
  ok: boolean;
  count?: number;
  items?: SatelliteItem[];
  error?: string;
}

interface ResponseWriter {
  setHeader(name: string, value: string): void;
  status(code: number): {
    json(body: SearchResponse): unknown;
  };
}

interface SatelliteItem {
  id?: string;
  datetime?: string;
  bbox?: number[];
  geometry?: Record<string, unknown>;
  properties?: Record<string, string>;
}

const TOKEN_URL =
  'https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token';
const CATALOG_URL = 'https://sh.dataspace.copernicus.eu/catalog/v1/search';
const REQUEST_TIMEOUT_MS = 15_000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseIsoDateTime(value: unknown): number | null {
  if (
    typeof value !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value)
  ) {
    return null;
  }

  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(Z|([+-])(\d{2}):(\d{2}))$/.exec(value);
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
  const isLeapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const daysInMonth = [31, isLeapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1];

  if (
    month < 1 || month > 12 || day < 1 || day > daysInMonth ||
    hour > 23 || minute > 59 || second > 59 ||
    offsetHour > 23 || offsetMinute > 59
  ) {
    return null;
  }

  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : null;
}

function normalizeItem(value: unknown): SatelliteItem | null {
  if (!isRecord(value)) return null;

  const item: SatelliteItem = {};
  if (typeof value.id === 'string') item.id = value.id;

  const properties = isRecord(value.properties) ? value.properties : undefined;
  if (properties && typeof properties.datetime === 'string') {
    item.datetime = properties.datetime;
  }

  if (
    Array.isArray(value.bbox) &&
    value.bbox.length === 4 &&
    value.bbox.every((coordinate) => typeof coordinate === 'number' && Number.isFinite(coordinate))
  ) {
    item.bbox = value.bbox;
  }

  if (isRecord(value.geometry)) item.geometry = value.geometry;

  if (properties) {
    const normalizedProperties: Record<string, string> = {};
    const propertyMappings: Array<[string, string]> = [
      ['constellation', 'constellation'],
      ['platform', 'platform'],
      ['sat:orbit_state', 'orbitDirection'],
      ['sar:instrument_mode', 'instrumentMode'],
    ];

    for (const [sourceKey, outputKey] of propertyMappings) {
      const propertyValue = properties[sourceKey];
      if (typeof propertyValue === 'string') {
        normalizedProperties[outputKey] = propertyValue;
      }
    }

    if (Object.keys(normalizedProperties).length > 0) {
      item.properties = normalizedProperties;
    }
  }

  if (Object.keys(item).length === 0) return null;
  return item;
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

export default async function handler(req: SearchRequest, res: ResponseWriter): Promise<void> {
  res.setHeader('Allow', 'POST');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'Method not allowed' });
    return;
  }

  let requestBody = req.body;
  if (typeof requestBody === 'string') {
    try {
      requestBody = JSON.parse(requestBody) as unknown;
    } catch {
      res.status(400).json({ ok: false, error: 'Request body must be valid JSON' });
      return;
    }
  }

  if (!isRecord(requestBody)) {
    res.status(400).json({ ok: false, error: 'Request body must be a JSON object' });
    return;
  }

  const { bbox, from, to } = requestBody;
  if (
    !Array.isArray(bbox) ||
    bbox.length !== 4 ||
    !bbox.every((coordinate) => typeof coordinate === 'number' && Number.isFinite(coordinate)) ||
    bbox[0] >= bbox[2] ||
    bbox[1] >= bbox[3]
  ) {
    res.status(400).json({ ok: false, error: 'bbox must contain four finite numbers with increasing bounds' });
    return;
  }

  const fromTimestamp = parseIsoDateTime(from);
  const toTimestamp = parseIsoDateTime(to);
  if (fromTimestamp === null || toTimestamp === null || fromTimestamp > toTimestamp) {
    res.status(400).json({ ok: false, error: 'from and to must be valid ISO datetimes in chronological order' });
    return;
  }

  const clientId = process.env.CDSE_CLIENT_ID;
  const clientSecret = process.env.CDSE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    res.status(500).json({ ok: false, error: 'Copernicus configuration is missing' });
    return;
  }

  let accessToken: string;
  try {
    const tokenResponse = await fetchWithTimeout(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });

    if (!tokenResponse.ok) {
      res.status(502).json({ ok: false, error: 'Copernicus authentication failed' });
      return;
    }

    const tokenPayload: unknown = await tokenResponse.json();
    if (
      !isRecord(tokenPayload) ||
      typeof tokenPayload.access_token !== 'string' ||
      tokenPayload.access_token.length === 0
    ) {
      res.status(502).json({ ok: false, error: 'Copernicus authentication failed' });
      return;
    }
    accessToken = tokenPayload.access_token;
  } catch {
    res.status(502).json({ ok: false, error: 'Copernicus authentication failed' });
    return;
  }

  try {
    const catalogResponse = await fetchWithTimeout(CATALOG_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        bbox,
        datetime: `${from}/${to}`,
        collections: ['sentinel-1-grd'],
        limit: 5,
      }),
    });

    if (!catalogResponse.ok) {
      res.status(502).json({ ok: false, error: 'Copernicus catalog search failed' });
      return;
    }

    const catalogPayload: unknown = await catalogResponse.json();
    if (!isRecord(catalogPayload) || !Array.isArray(catalogPayload.features)) {
      res.status(502).json({ ok: false, error: 'Copernicus catalog returned an invalid response' });
      return;
    }

    const items = catalogPayload.features
      .map(normalizeItem)
      .filter((item): item is SatelliteItem => item !== null);

    res.status(200).json({
      ok: true,
      count: items.length,
      items,
    });
  } catch {
    res.status(502).json({ ok: false, error: 'Copernicus catalog search failed' });
  }
}
