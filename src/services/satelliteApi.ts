export type SatelliteBoundingBox = [minLon: number, minLat: number, maxLon: number, maxLat: number];

export interface SatelliteSearchInput {
  bbox: SatelliteBoundingBox;
  from: string;
  to: string;
}

export interface SatelliteImageInput extends SatelliteSearchInput {
  acquisitionId: string;
}

export interface SatelliteAcquisitionProperties {
  constellation?: string;
  platform?: string;
  orbitDirection?: string;
  instrumentMode?: string;
}

export interface SatelliteAcquisition {
  id?: string;
  datetime?: string;
  bbox?: SatelliteBoundingBox;
  geometry?: Record<string, unknown>;
  properties?: SatelliteAcquisitionProperties;
}

interface SatelliteSearchResponse {
  ok: true;
  count: number;
  items: SatelliteAcquisition[];
}

interface SatelliteErrorResponse {
  ok?: false;
  error?: string;
}

export class SatelliteApiError extends Error {
  readonly status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = 'SatelliteApiError';
    this.status = status;
  }
}

async function readError(response: Response): Promise<SatelliteApiError> {
  let details: SatelliteErrorResponse | undefined;

  try {
    const payload: unknown = await response.json();
    if (
      typeof payload === 'object' &&
      payload !== null &&
      !Array.isArray(payload) &&
      'error' in payload &&
      typeof payload.error === 'string'
    ) {
      details = payload as SatelliteErrorResponse;
    }
  } catch {
    // Use the status-based message when the server did not return JSON.
  }

  const messageByStatus: Record<number, string> = {
    400: 'The satellite search request is invalid.',
    500: 'Satellite service configuration is unavailable.',
    502: 'Copernicus could not complete the satellite request.',
  };

  return new SatelliteApiError(
    details?.error ?? messageByStatus[response.status] ?? `Satellite API request failed (${response.status}).`,
    response.status
  );
}

async function postJson(url: string, input: SatelliteSearchInput): Promise<Response> {
  try {
    return await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
  } catch {
    throw new SatelliteApiError('Unable to reach the satellite service. Check your network connection.');
  }
}

export async function searchSatelliteAcquisitions(
  input: SatelliteSearchInput
): Promise<SatelliteAcquisition[]> {
  const response = await postJson('/api/satellite/search', input);
  if (!response.ok) throw await readError(response);

  let payload: SatelliteSearchResponse;
  try {
    payload = (await response.json()) as SatelliteSearchResponse;
  } catch {
    throw new SatelliteApiError('Satellite search returned an invalid response.', response.status);
  }

  if (
    payload?.ok !== true ||
    !Number.isInteger(payload.count) ||
    payload.count < 0 ||
    !Array.isArray(payload.items)
  ) {
    throw new SatelliteApiError('Satellite search returned an invalid response.', response.status);
  }

  return payload.items;
}

export async function getSatelliteImage(input: SatelliteImageInput): Promise<Blob> {
  const response = await postJson('/api/satellite/image', input);
  if (!response.ok) throw await readError(response);

  const contentType = response.headers.get('Content-Type')?.split(';', 1)[0].trim().toLowerCase();
  if (contentType !== 'image/png') {
    throw new SatelliteApiError('Satellite image service returned a non-image response.', response.status);
  }

  try {
    return await response.blob();
  } catch {
    throw new SatelliteApiError('Unable to read the satellite image response.', response.status);
  }
}
