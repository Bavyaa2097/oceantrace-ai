import { AisObservation } from './aisApi';

export interface AisCorrelationInput {
  investigationPoint: {
    lat: number;
    lon: number;
  };
  satelliteObservationTime: string;
  radiusKm: number;
  from: string;
  to: string;
  observations: Array<Pick<
    AisObservation,
    'id' | 'name' | 'mmsi' | 'type' | 'flag' | 'lat' | 'lon' | 'date' | 'activityHours' | 'locationType'
  >>;
}

export interface AisCorrelationInvestigation {
  lat: number;
  lon: number;
  radiusKm: number;
  satelliteObservationTime: string;
  from: string;
  to: string;
}

export interface AisCorrelationFactors {
  spatialScore: number;
  temporalScore: number;
  persistenceScore: number;
}

export interface AisCorrelationVessel {
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
  factors: AisCorrelationFactors;
  basis: string[];
}

export interface AisCorrelationResponse {
  ok: true;
  service: 'OceanTrace AIS Correlation';
  investigation: AisCorrelationInvestigation;
  observationCount: number;
  uniqueVesselCount: number;
  vessels: AisCorrelationVessel[];
  limitations: string[];
}

interface CorrelationErrorResponse {
  error?: string;
  upstreamStatus?: number;
}

export class CorrelationApiError extends Error {
  readonly status?: number;
  readonly upstreamStatus?: number;

  constructor(message: string, status?: number, upstreamStatus?: number) {
    super(message);
    this.name = 'CorrelationApiError';
    this.status = status;
    this.upstreamStatus = upstreamStatus;
  }
}

async function readError(response: Response): Promise<CorrelationApiError> {
  let details: CorrelationErrorResponse | undefined;
  try {
    const payload: unknown = await response.json();
    if (typeof payload === 'object' && payload !== null && !Array.isArray(payload)) {
      const candidate = payload as CorrelationErrorResponse;
      details = {
        ...(typeof candidate.error === 'string' ? { error: candidate.error } : {}),
        ...(typeof candidate.upstreamStatus === 'number'
          ? { upstreamStatus: candidate.upstreamStatus }
          : {}),
      };
    }
  } catch {
    // Fall back to a status-based message when the API response is not JSON.
  }

  if (details?.upstreamStatus === 429) {
    return new CorrelationApiError(
      'Global Fishing Watch is rate-limiting reports. Wait briefly before trying again.',
      response.status,
      429
    );
  }
  if (response.status === 400) {
    return new CorrelationApiError('The correlation request is invalid.', response.status);
  }
  if (response.status === 500) {
    return new CorrelationApiError(
      details?.error === 'configuration_missing'
        ? 'The AIS service is not configured.'
        : 'Correlation calculation failed on the server. Please try again.',
      response.status
    );
  }
  if (response.status === 502) {
    return new CorrelationApiError(
      'Global Fishing Watch could not complete the request.',
      response.status,
      details?.upstreamStatus
    );
  }

  return new CorrelationApiError(
    details?.error ?? `Correlation request failed (${response.status}).`,
    response.status,
    details?.upstreamStatus
  );
}

export async function getAisCorrelation(
  input: AisCorrelationInput
): Promise<AisCorrelationResponse> {
  const requestBody: AisCorrelationInput = {
    ...input,
    observations: input.observations.map((observation) => ({
      id: observation.id,
      name: observation.name,
      mmsi: observation.mmsi,
      type: observation.type,
      flag: observation.flag,
      lat: observation.lat,
      lon: observation.lon,
      date: observation.date,
      activityHours: observation.activityHours,
      locationType: observation.locationType,
    })),
  };

  let response: Response;
  try {
    response = await fetch('/api/ais/correlation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });
  } catch {
    throw new CorrelationApiError('Unable to reach the correlation service. Check your network connection.');
  }

  if (!response.ok) throw await readError(response);

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new CorrelationApiError('Correlation service returned an invalid response.', response.status);
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
    !('vessels' in payload) ||
    !('limitations' in payload) ||
    !Number.isInteger(payload.observationCount) ||
    !Number.isInteger(payload.uniqueVesselCount) ||
    !Array.isArray(payload.vessels) ||
    !Array.isArray(payload.limitations)
  ) {
    throw new CorrelationApiError('Correlation service returned an invalid response.', response.status);
  }

  return payload as AisCorrelationResponse;
}
