interface ImageRequest {
  method?: string;
  body?: unknown;
}

interface ErrorResponse {
  ok: false;
  error: string;
}

interface ResponseWriter {
  setHeader(name: string, value: string): void;
  status(code: number): {
    json(body: ErrorResponse): unknown;
    send(body: Uint8Array): unknown;
  };
}

const TOKEN_URL =
  'https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token';
const PROCESS_URL = 'https://sh.dataspace.copernicus.eu/process/v1';
const AUTH_TIMEOUT_MS = 10_000;
const PROCESS_TIMEOUT_MS = 30_000;
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
  error: string
): void {
  res.status(status).json({ ok: false, error });
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

  const { bbox, from, to } = requestBody;
  if (
    !Array.isArray(bbox) ||
    bbox.length !== 4 ||
    !bbox.every((coordinate) => typeof coordinate === 'number' && Number.isFinite(coordinate)) ||
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

  try {
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
            bounds: { bbox },
            data: [
              {
                type: 'sentinel-1-grd',
                dataFilter: {
                  timeRange: { from, to },
                },
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
      sendError(res, 502, 'Copernicus Processing API request failed');
      return;
    }

    const contentType = processResponse.headers.get('content-type')?.split(';', 1)[0].trim().toLowerCase();
    if (contentType !== 'image/png') {
      sendError(res, 502, 'Copernicus Processing API returned an unexpected response');
      return;
    }

    const imageBytes = new Uint8Array(await processResponse.arrayBuffer());
    if (imageBytes.length === 0) {
      sendError(res, 502, 'Copernicus Processing API returned an empty image');
      return;
    }

    res.setHeader('Content-Type', 'image/png');
    res.status(200).send(imageBytes);
  } catch {
    sendError(res, 502, 'Copernicus Processing API request failed');
  }
}
