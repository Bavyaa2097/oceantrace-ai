interface ImageRequest {
  method?: string;
  body?: unknown;
}

interface CatalogueFeature {
  id?: unknown;
  bbox?: unknown;
  properties?: unknown;
}

interface ErrorResponse {
  ok: false;
  error: string;
  status?: number;
}

interface ResponseWriter {
  setHeader(name: string, value: string): void;
  status(code: number): {
    json(body: ErrorResponse): unknown;
    send(body: Buffer): unknown;
  };
}

const TOKEN_URL =
  'https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token';
const CATALOG_URL = 'https://sh.dataspace.copernicus.eu/catalog/v1/search';
const PROCESS_URL = 'https://sh.dataspace.copernicus.eu/process/v1';
const AUTH_TIMEOUT_MS = 10_000;
const PROCESS_TIMEOUT_MS = 30_000;
const ACQUISITION_TIME_WINDOW_MS = 30_000;
const EVALSCRIPT = `//VERSION=3
function setup() {
  return {
    input: [{ bands: ["VV"] }],
    output: { bands: 1, sampleType: "UINT8" }
  };
}

function evaluatePixel(sample) {
  if (!Number.isFinite(sample.VV) || sample.VV <= 0) return [0];

  const backscatterDb = 10 * Math.log10(sample.VV);
  const grayscale = Math.max(0, Math.min(255, Math.round(((backscatterDb + 30) / 30) * 255)));
  return [grayscale];
}`;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isFiniteBbox(value: unknown): value is [number, number, number, number] {
  return Array.isArray(value) &&
    value.length === 4 &&
    value.every((coordinate) => typeof coordinate === 'number' && Number.isFinite(coordinate));
}

function parseIsoDateTime(value: unknown): number | null {
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

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

function sendError(
  res: ResponseWriter,
  status: number,
  error: string,
  details?: { status?: number }
): void {
  res.status(status).json({ ok: false, error, ...details });
}

function bboxesIntersect(
  first: number[],
  second: number[]
): boolean {
  return first[0] <= second[2] &&
    first[2] >= second[0] &&
    first[1] <= second[3] &&
    first[3] >= second[1];
}

function intersectBboxes(
  first: [number, number, number, number],
  second: [number, number, number, number]
): [number, number, number, number] | null {
  const intersection: [number, number, number, number] = [
    Math.max(first[0], second[0]),
    Math.max(first[1], second[1]),
    Math.min(first[2], second[2]),
    Math.min(first[3], second[3]),
  ];

  return intersection[0] < intersection[2] && intersection[1] < intersection[3]
    ? intersection
    : null;
}

function catalogueStringProperty(
  properties: Record<string, unknown>,
  keys: string[]
): string | undefined {
  for (const key of keys) {
    const value = properties[key];
    if (typeof value === 'string' && value.trim() !== '') return value;
  }
  return undefined;
}

function supportedEnum(
  value: string | undefined,
  allowedValues: readonly string[]
): string | undefined {
  if (!value) return undefined;
  const normalized = value.toUpperCase();
  return allowedValues.includes(normalized) ? normalized : undefined;
}

export default async function handler(req: ImageRequest, res: ResponseWriter): Promise<void> {
  res.setHeader('Allow', 'POST');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    sendError(res, 405, 'Method not allowed');
    return;
  }

  let requestBody = req.body;
  if (typeof requestBody === 'string') {
    try {
      requestBody = JSON.parse(requestBody) as unknown;
    } catch {
      sendError(res, 400, 'Request body must be valid JSON');
      return;
    }
  }

  if (!isRecord(requestBody)) {
    sendError(res, 400, 'Request body must be a JSON object');
    return;
  }

  const { acquisitionId, bbox, from, to } = requestBody;
  if (
    typeof acquisitionId !== 'string' ||
    acquisitionId.trim().length === 0 ||
    acquisitionId.length > 512 ||
    /[\u0000-\u001f\u007f]/.test(acquisitionId)
  ) {
    sendError(res, 400, 'acquisitionId must be a non-empty catalogue item ID');
    return;
  }

  if (
    !isFiniteBbox(bbox) ||
    bbox[0] >= bbox[2] ||
    bbox[1] >= bbox[3]
  ) {
    sendError(res, 400, 'bbox must contain four finite numbers with increasing bounds');
    return;
  }

  const fromTimestamp = parseIsoDateTime(from);
  const toTimestamp = parseIsoDateTime(to);
  if (fromTimestamp === null || toTimestamp === null || fromTimestamp > toTimestamp) {
    sendError(res, 400, 'from and to must be valid ISO datetimes in chronological order');
    return;
  }

  const clientId = process.env.CDSE_CLIENT_ID;
  const clientSecret = process.env.CDSE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    sendError(res, 500, 'Copernicus configuration is missing');
    return;
  }

  let accessToken: string;
  try {
    const tokenResponse = await fetchWithTimeout(
      TOKEN_URL,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: clientId,
          client_secret: clientSecret,
        }),
      },
      AUTH_TIMEOUT_MS
    );

    if (!tokenResponse.ok) {
      sendError(res, 502, 'Copernicus authentication failed');
      return;
    }

    const tokenPayload: unknown = await tokenResponse.json();
    if (
      !isRecord(tokenPayload) ||
      typeof tokenPayload.access_token !== 'string' ||
      tokenPayload.access_token.length === 0
    ) {
      sendError(res, 502, 'Copernicus authentication failed');
      return;
    }

    accessToken = tokenPayload.access_token;
  } catch {
    sendError(res, 502, 'Copernicus authentication failed');
    return;
  }

  let selectedDatetime: string;
  let selectedBbox: [number, number, number, number] | undefined;
  let selectedProperties: Record<string, unknown>;
  try {
    const catalogueResponse = await fetchWithTimeout(
      CATALOG_URL,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ids: [acquisitionId],
          bbox,
          datetime: `${from}/${to}`,
          collections: ['sentinel-1-grd'],
          limit: 1,
        }),
      },
      PROCESS_TIMEOUT_MS
    );

    if (!catalogueResponse.ok) {
      sendError(res, 502, 'Copernicus catalogue verification failed');
      return;
    }

    const cataloguePayload: unknown = await catalogueResponse.json();
    const features =
      isRecord(cataloguePayload) && Array.isArray(cataloguePayload.features)
        ? cataloguePayload.features as CatalogueFeature[]
        : [];
    const feature = features.find((item) => isRecord(item) && item.id === acquisitionId);
    if (!feature || !isRecord(feature.properties)) {
      sendError(res, 404, 'Selected acquisition was not found in the requested area and time range');
      return;
    }

    const datetime = feature.properties.datetime;
    const selectedTimestamp = parseIsoDateTime(datetime);
    if (selectedTimestamp === null || selectedTimestamp < fromTimestamp || selectedTimestamp > toTimestamp) {
      sendError(res, 502, 'Copernicus catalogue returned invalid acquisition metadata');
      return;
    }

    if (feature.bbox !== undefined) {
      if (!isFiniteBbox(feature.bbox) || !bboxesIntersect(feature.bbox, bbox)) {
        sendError(res, 404, 'Selected acquisition does not intersect the requested area');
        return;
      }
      selectedBbox = intersectBboxes(feature.bbox, bbox);
      if (!selectedBbox) {
        sendError(res, 404, 'Selected acquisition does not overlap the requested area');
        return;
      }
    }

    selectedDatetime = new Date(selectedTimestamp).toISOString();
    selectedProperties = feature.properties;
  } catch {
    sendError(res, 502, 'Copernicus catalogue verification failed');
    return;
  }

  try {
    const selectedTime = Date.parse(selectedDatetime);
    const dataFilter: Record<string, unknown> = {
      timeRange: {
        from: new Date(selectedTime - ACQUISITION_TIME_WINDOW_MS).toISOString(),
        to: new Date(selectedTime + ACQUISITION_TIME_WINDOW_MS).toISOString(),
      },
      mosaickingOrder: 'mostRecent',
    };
    const orbitDirection = supportedEnum(
      catalogueStringProperty(selectedProperties, ['sat:orbit_state', 'orbitDirection']),
      ['ASCENDING', 'DESCENDING']
    );
    if (orbitDirection) dataFilter.orbitDirection = orbitDirection;

    const acquisitionMode = supportedEnum(
      catalogueStringProperty(selectedProperties, ['sar:instrument_mode', 's1:instrument_mode', 'instrumentMode']),
      ['SM', 'IW', 'EW', 'WV']
    );
    if (acquisitionMode) dataFilter.acquisitionMode = acquisitionMode;

    const polarization = supportedEnum(
      catalogueStringProperty(selectedProperties, ['s1:polarization', 'sar:polarization', 'polarization']),
      ['DV', 'DH', 'SV', 'SH', 'HH', 'HV', 'VV', 'VH']
    );
    if (polarization) dataFilter.polarization = polarization;

    const processResponse = await fetchWithTimeout(
      PROCESS_URL,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          Accept: 'image/png',
        },
        body: JSON.stringify({
          input: {
            bounds: { bbox: selectedBbox ?? bbox },
            data: [
              {
                type: 'sentinel-1-grd',
                dataFilter,
              },
            ],
          },
          output: {
            width: 512,
            height: 512,
            responses: [
              {
                identifier: 'default',
                format: { type: 'image/png' },
              },
            ],
          },
          evalscript: EVALSCRIPT,
        }),
      },
      PROCESS_TIMEOUT_MS
    );

    if (!processResponse.ok) {
      console.error('Copernicus Processing API request failed', {
        status: processResponse.status,
        acquisitionIdPrefix: acquisitionId.slice(0, 16),
      });
      sendError(res, 502, 'Copernicus Processing API request failed', {
        status: processResponse.status,
      });
      return;
    }

    const contentType = processResponse.headers.get('content-type')?.split(';', 1)[0].trim().toLowerCase();
    if (contentType !== 'image/png') {
      sendError(res, 502, 'Copernicus Processing API returned an unexpected response');
      return;
    }

    const imageBytes = Buffer.from(await processResponse.arrayBuffer());
    const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    if (
      imageBytes.length < pngSignature.length ||
      !imageBytes.subarray(0, pngSignature.length).equals(pngSignature)
    ) {
      sendError(res, 502, 'Copernicus returned non-PNG image data');
      return;
    }

    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Disposition', 'inline');
    res.status(200).send(imageBytes);
  } catch {
    sendError(res, 502, 'Copernicus Processing API request failed');
  }
}
