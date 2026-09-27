export interface AisCandidatesInput {
  lat: number;
  lon: number;
  from: string;
  to: string;
  radiusKm: number;
}

export interface AisInvestigation {
  lat: number;
  lon: number;
  from: string;
  to: string;
  radiusKm: number;
}

export interface AisObservation {
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

export interface AisVesselSummary {
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

export interface AisCandidatesResponse {
  ok: true;
  service: string;
  investigation: AisInvestigation;
  observationCount: number;
  uniqueVesselCount: number;
  observations: AisObservation[];
  vessels: AisVesselSummary[];
}

interface AisErrorResponse {
  error?: string;
  upstreamStatus?: number;
}

export class AisApiError extends Error {
  readonly status?: number;
  readonly upstreamStatus?: number;

  constructor(message: string, status?: number, upstreamStatus?: number) {
    super(message);
    this.name = 'AisApiError';
    this.status = status;
    this.upstreamStatus = upstreamStatus;
  }
}

async function readError(response: Response): Promise<AisApiError> {
  let details: AisErrorResponse | undefined;
  try {
    const payload: unknown = await response.json();
    if (typeof payload === 'object' && payload !== null && !Array.isArray(payload)) {
      const candidate = payload as AisErrorResponse;
      details = {
        ...(typeof candidate.error === 'string' ? { error: candidate.error } : {}),
        ...(typeof candidate.upstreamStatus === 'number'
          ? { upstreamStatus: candidate.upstreamStatus }
          : {}),
      };
    }
  } catch {
    // Use the HTTP status when the endpoint did not return JSON.
  }

  if (details?.upstreamStatus === 429) {
    return new AisApiError('GFW is rate-limiting reports. Wait briefly before trying again.', response.status, 429);
  }
  if (response.status === 400) {
    return new AisApiError('The AIS investigation parameters are invalid.', response.status);
  }
  if (response.status === 500) {
    return new AisApiError('The AIS service is not configured. Please try again later.', response.status);
  }
  if (response.status === 502) {
    return new AisApiError('Global Fishing Watch is temporarily unavailable. Please try again later.', response.status, details?.upstreamStatus);
  }

  return new AisApiError(
    details?.error ?? `AIS candidate search failed (${response.status}).`,
    response.status,
    details?.upstreamStatus
  );
}

export async function getAisCandidates(
  input: AisCandidatesInput
): Promise<AisCandidatesResponse> {
  const query = new URLSearchParams({
    lat: String(input.lat),
    lon: String(input.lon),
    from: input.from,
    to: input.to,
    radiusKm: String(input.radiusKm),
  });

  let response: Response;
  try {
    response = await fetch(`/api/ais/candidates?${query.toString()}`, { method: 'GET' });
  } catch {
    throw new AisApiError('Unable to reach the AIS service. Check your network connection.');
  }

  if (!response.ok) throw await readError(response);

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new AisApiError('AIS candidate search returned an invalid response.', response.status);
  }

  if (
    typeof payload !== 'object' ||
    payload === null ||
    Array.isArray(payload) ||
    !('ok' in payload) ||
    payload.ok !== true ||
    !('investigation' in payload) ||
    !('observationCount' in payload) ||
    !('uniqueVesselCount' in payload) ||
    !('observations' in payload) ||
    !('vessels' in payload) ||
    !Number.isInteger(payload.observationCount) ||
    !Number.isInteger(payload.uniqueVesselCount) ||
    !Array.isArray(payload.observations) ||
    !Array.isArray(payload.vessels)
  ) {
    throw new AisApiError('AIS candidate search returned an invalid response.', response.status);
  }

  return payload as AisCandidatesResponse;
}
