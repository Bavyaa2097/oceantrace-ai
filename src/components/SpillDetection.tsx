import React, { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  ExternalLink,
  Eye,
  Image as ImageIcon,
  Layers,
  MapPin,
  RefreshCw,
  Satellite,
  Search,
  Upload,
} from 'lucide-react';
import {
  AisApiError,
  AisCandidatesResponse,
  AisObservation,
  AisVesselSummary,
  getAisCandidates,
} from '../services/aisApi';
import {
  AisCorrelationResponse,
  AisCorrelationVessel,
  CorrelationApiError,
  getAisCorrelation,
} from '../services/correlationApi';
import {
  getSatelliteImage,
  SatelliteAcquisition,
  SatelliteApiError,
  SatelliteBoundingBox,
  SatelliteSearchInput,
  searchSatelliteAcquisitions,
} from '../services/satelliteApi';

interface SpillDetectionProps {
  isDemoMode: boolean;
  onNavigateToMap: () => void;
}

type RequestState = 'idle' | 'loading' | 'success' | 'error';
type StageState = 'pending' | 'active' | 'complete';

const DEFAULT_BBOX: SatelliteBoundingBox = [72.0, 10.0, 72.8, 11.2];
const DEFAULT_RADIUS_KM = 25;
const AIS_TIME_WINDOW_MS = 6 * 60 * 60 * 1000;

function toLocalDateTimeInput(date: Date): string {
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return localDate.toISOString().slice(0, 16);
}

function formatAcquisitionDate(value?: string): string {
  if (!value) return 'Not provided';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function getApiErrorMessage(error: unknown, fallback: string): string {
  if (!(error instanceof SatelliteApiError)) return fallback;

  if (error.status === 400) return 'Check the bounding box and date/time range, then try again.';
  if (error.status === 500) return 'Satellite service configuration is unavailable. Please try again later.';
  if (error.status === 502) return 'Copernicus could not complete the request. Please try again later.';
  if (error.status === undefined) return 'Unable to reach the satellite service. Check your network connection.';
  return error.message || fallback;
}

function getAisErrorMessage(error: unknown): string {
  if (error instanceof AisApiError) return error.message;
  return 'AIS-derived vessel presence could not be retrieved. Please try again.';
}

function getCorrelationErrorMessage(error: unknown): string {
  if (error instanceof CorrelationApiError) return error.message;
  return 'Spatial and temporal correlation could not be calculated. Please try again.';
}

function getBoundingBoxCenter(bbox?: SatelliteBoundingBox): { lat: number; lon: number } | null {
  if (
    !bbox ||
    bbox.length !== 4 ||
    bbox.some((coordinate) => !Number.isFinite(coordinate)) ||
    bbox[0] < -180 || bbox[0] > 180 ||
    bbox[2] < -180 || bbox[2] > 180 ||
    bbox[1] < -90 || bbox[1] > 90 ||
    bbox[3] < -90 || bbox[3] > 90 ||
    bbox[0] >= bbox[2] ||
    bbox[1] >= bbox[3]
  ) {
    return null;
  }

  return {
    lat: (bbox[1] + bbox[3]) / 2,
    lon: (bbox[0] + bbox[2]) / 2,
  };
}

function formatDistance(distanceKm: number): string {
  return `${distanceKm.toFixed(1)} km`;
}

export const SpillDetection: React.FC<SpillDetectionProps> = ({
  isDemoMode,
  onNavigateToMap,
}) => {
  const now = new Date();
  const monthAgo = new Date(now);
  monthAgo.setDate(monthAgo.getDate() - 30);

  const [bboxFields, setBboxFields] = useState<string[]>(DEFAULT_BBOX.map(String));
  const [fromValue, setFromValue] = useState(toLocalDateTimeInput(monthAgo));
  const [toValue, setToValue] = useState(toLocalDateTimeInput(now));
  const [acquisitions, setAcquisitions] = useState<SatelliteAcquisition[]>([]);
  const [searchState, setSearchState] = useState<RequestState>('idle');
  const [imageState, setImageState] = useState<RequestState>('idle');
  const [selectedAcquisition, setSelectedAcquisition] = useState<SatelliteAcquisition | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [localImageUrl, setLocalImageUrl] = useState<string | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [localImageName, setLocalImageName] = useState<string | null>(null);
  const [investigationLat, setInvestigationLat] = useState('');
  const [investigationLon, setInvestigationLon] = useState('');
  const [searchRadiusKm, setSearchRadiusKm] = useState(String(DEFAULT_RADIUS_KM));
  const [aisState, setAisState] = useState<RequestState>('idle');
  const [aisResult, setAisResult] = useState<AisCandidatesResponse | null>(null);
  const [aisError, setAisError] = useState<string | null>(null);
  const [selectedVesselId, setSelectedVesselId] = useState<string | null>(null);
  const [correlationState, setCorrelationState] = useState<RequestState>('idle');
  const [correlationResult, setCorrelationResult] = useState<AisCorrelationResponse | null>(null);
  const [correlationError, setCorrelationError] = useState<string | null>(null);
  const [selectedCorrelationVesselId, setSelectedCorrelationVesselId] = useState<string | null>(null);
  const requestId = useRef(0);
  const aisRequestId = useRef(0);
  const correlationRequestId = useRef(0);
  const aisRequestInFlight = useRef(false);
  const correlationRequestInFlight = useRef(false);

  useEffect(() => {
    return () => {
      requestId.current += 1;
      aisRequestId.current += 1;
      correlationRequestId.current += 1;
    };
  }, []);

  useEffect(() => {
    if (!isDemoMode) return;
    aisRequestId.current += 1;
    setAisResult(null);
    setAisError(null);
    setSelectedVesselId(null);
    setAisState(aisRequestInFlight.current ? 'loading' : 'idle');
    correlationRequestId.current += 1;
    setCorrelationResult(null);
    setCorrelationError(null);
    setSelectedCorrelationVesselId(null);
    setCorrelationState(correlationRequestInFlight.current ? 'loading' : 'idle');
  }, [isDemoMode]);

  useEffect(() => {
    return () => {
      if (imageUrl) URL.revokeObjectURL(imageUrl);
    };
  }, [imageUrl]);

  useEffect(() => {
    return () => {
      if (localImageUrl) URL.revokeObjectURL(localImageUrl);
    };
  }, [localImageUrl]);

  const validateParameters = (): SatelliteSearchInput | null => {
    const coordinates = bboxFields.map((value) => Number(value));
    if (
      coordinates.length !== 4 ||
      bboxFields.some((value) => value.trim() === '') ||
      coordinates.some((coordinate) => !Number.isFinite(coordinate)) ||
      coordinates[0] < -180 || coordinates[0] > 180 ||
      coordinates[2] < -180 || coordinates[2] > 180 ||
      coordinates[1] < -90 || coordinates[1] > 90 ||
      coordinates[3] < -90 || coordinates[3] > 90 ||
      coordinates[0] >= coordinates[2] ||
      coordinates[1] >= coordinates[3]
    ) {
      setSearchError('Enter a valid bounding box: longitude must be within −180 to 180, latitude within −90 to 90, and minimum values must be lower than maximum values.');
      return null;
    }

    const fromDate = new Date(fromValue);
    const toDate = new Date(toValue);
    if (
      !fromValue ||
      !toValue ||
      Number.isNaN(fromDate.getTime()) ||
      Number.isNaN(toDate.getTime()) ||
      fromDate.getTime() > toDate.getTime()
    ) {
      setSearchError('Enter a valid date/time range with the start earlier than or equal to the end.');
      return null;
    }

    return {
      bbox: coordinates as SatelliteBoundingBox,
      from: fromDate.toISOString(),
      to: toDate.toISOString(),
    };
  };

  const clearAisResults = () => {
    aisRequestId.current += 1;
    setAisResult(null);
    setAisError(null);
    setSelectedVesselId(null);
    setAisState(aisRequestInFlight.current ? 'loading' : 'idle');
    correlationRequestId.current += 1;
    setCorrelationResult(null);
    setCorrelationError(null);
    setSelectedCorrelationVesselId(null);
    setCorrelationState(correlationRequestInFlight.current ? 'loading' : 'idle');
  };

  const resetSelectedObservation = () => {
    requestId.current += 1;
    clearAisResults();
    setSelectedAcquisition(null);
    setImageUrl(null);
    setImageState('idle');
    setImageError(null);
    setAcquisitions([]);
    setSearchState('idle');
    setSearchError(null);
  };

  const handleSearch = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSearchError(null);

    if (isDemoMode) {
      setSearchError('Switch to Live mode to search the Copernicus Sentinel-1 catalogue. No live results are requested in Demo mode.');
      return;
    }

    const input = validateParameters();
    if (!input) return;

    setSearchState('loading');
    setAcquisitions([]);
    setSelectedAcquisition(null);
    setImageUrl(null);
    setImageState('idle');
    setImageError(null);
    clearAisResults();
    const currentRequestId = ++requestId.current;
    setSearchState('loading');

    try {
      const results = await searchSatelliteAcquisitions(input);
      if (requestId.current !== currentRequestId) return;
      setAcquisitions(results);
      setSearchState('success');
    } catch (error) {
      if (requestId.current !== currentRequestId) return;
      setSearchError(getApiErrorMessage(error, 'Satellite catalogue search failed.'));
      setSearchState('error');
    }
  };

  const handleSelectAcquisition = async (acquisition: SatelliteAcquisition) => {
    if (isDemoMode) return;
    if (aisRequestInFlight.current) return;
    clearAisResults();
    const center = getBoundingBoxCenter(acquisition.bbox);
    setInvestigationLat(center ? String(center.lat) : '');
    setInvestigationLon(center ? String(center.lon) : '');
    setSearchRadiusKm(String(DEFAULT_RADIUS_KM));
    if (!acquisition.id) {
      setSelectedAcquisition(acquisition);
      setImageUrl(null);
      setImageState('error');
      setImageError('This catalogue record does not include an acquisition ID, so its image cannot be requested.');
      return;
    }
    const searchInput = validateParameters();
    if (!searchInput) return;

    const currentRequestId = ++requestId.current;
    setSelectedAcquisition(acquisition);
    setImageUrl(null);
    setImageError(null);
    setImageState('loading');

    const acquisitionTime = acquisition.datetime;
    const imageInput: SatelliteSearchInput = {
      bbox: acquisition.bbox ?? searchInput.bbox,
      from: acquisitionTime ?? searchInput.from,
      to: acquisitionTime ?? searchInput.to,
    };

    try {
      const imageBlob = await getSatelliteImage({
        ...imageInput,
        acquisitionId: acquisition.id,
      });
      if (requestId.current !== currentRequestId) return;
      setImageUrl(URL.createObjectURL(imageBlob));
      setImageState('success');
    } catch (error) {
      if (requestId.current !== currentRequestId) return;
      setImageError(getApiErrorMessage(error, 'Could not retrieve this SAR observation.'));
      setImageState('error');
    }
  };

  const handleFindAisCandidates = async () => {
    setAisError(null);

    if (isDemoMode) return;
    if (!selectedAcquisition) {
      setAisError('Select a Sentinel-1 acquisition before searching AIS-derived vessel presence.');
      return;
    }
    if (aisRequestInFlight.current) return;

    const lat = Number(investigationLat);
    const lon = Number(investigationLon);
    const radiusKm = Number(searchRadiusKm);
    if (
      investigationLat.trim() === '' ||
      investigationLon.trim() === '' ||
      !Number.isFinite(lat) || lat < -90 || lat > 90 ||
      !Number.isFinite(lon) || lon < -180 || lon > 180 ||
      searchRadiusKm.trim() === '' ||
      !Number.isFinite(radiusKm) || radiusKm < 1 || radiusKm > 200
    ) {
      setAisError('Enter a valid investigation point and a search radius from 1 to 200 km.');
      return;
    }

    const acquisitionTimestamp = selectedAcquisition.datetime
      ? Date.parse(selectedAcquisition.datetime)
      : Number.NaN;
    if (!Number.isFinite(acquisitionTimestamp)) {
      setAisError('This catalogue acquisition does not include a valid observation time for the AIS search.');
      return;
    }

    const from = new Date(acquisitionTimestamp - AIS_TIME_WINDOW_MS).toISOString();
    const to = new Date(acquisitionTimestamp + AIS_TIME_WINDOW_MS).toISOString();
    const currentRequestId = ++aisRequestId.current;
    aisRequestInFlight.current = true;
    setAisState('loading');
    setAisResult(null);
    setSelectedVesselId(null);
    correlationRequestId.current += 1;
    setCorrelationResult(null);
    setCorrelationError(null);
    setSelectedCorrelationVesselId(null);
    setCorrelationState('idle');

    try {
      const result = await getAisCandidates({ lat, lon, from, to, radiusKm });
      if (aisRequestId.current !== currentRequestId) return;
      setAisResult(result);
      setAisState('success');
    } catch (error) {
      if (aisRequestId.current !== currentRequestId) return;
      setAisError(getAisErrorMessage(error));
      setAisState('error');
    } finally {
      aisRequestInFlight.current = false;
      if (aisRequestId.current !== currentRequestId) {
        setAisState('idle');
      }
    }
  };

  const handleCalculateCorrelation = async () => {
    setCorrelationError(null);
    if (isDemoMode || correlationRequestInFlight.current) return;
    if (!selectedAcquisition || !aisResult || aisState !== 'success') {
      setCorrelationError('Select an acquisition and complete AIS presence search before calculating correlation.');
      return;
    }

    const lat = Number(investigationLat);
    const lon = Number(investigationLon);
    const radiusKm = Number(searchRadiusKm);
    if (
      investigationLat.trim() === '' ||
      investigationLon.trim() === '' ||
      !Number.isFinite(lat) || lat < -90 || lat > 90 ||
      !Number.isFinite(lon) || lon < -180 || lon > 180 ||
      searchRadiusKm.trim() === '' ||
      !Number.isFinite(radiusKm) || radiusKm < 1 || radiusKm > 200
    ) {
      setCorrelationError('Enter a valid investigation point and a radius from 1 to 200 km.');
      return;
    }

    const satelliteTimestamp = selectedAcquisition.datetime
      ? Date.parse(selectedAcquisition.datetime)
      : Number.NaN;
    if (!Number.isFinite(satelliteTimestamp)) {
      setCorrelationError('The selected acquisition does not include a valid observation time.');
      return;
    }

    const currentRequestId = ++correlationRequestId.current;
    correlationRequestInFlight.current = true;
    setCorrelationState('loading');
    setCorrelationResult(null);
    setSelectedCorrelationVesselId(null);

    try {
      const result = await getAisCorrelation({
        investigationPoint: { lat, lon },
        satelliteObservationTime: new Date(satelliteTimestamp).toISOString(),
        radiusKm,
        from: aisResult.investigation.from,
        to: aisResult.investigation.to,
        observations: aisResult.observations.map((observation) => ({
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
      });
      if (correlationRequestId.current !== currentRequestId) return;
      setCorrelationResult(result);
      setCorrelationState('success');
    } catch (error) {
      if (correlationRequestId.current !== currentRequestId) return;
      setCorrelationError(getCorrelationErrorMessage(error));
      setCorrelationState('error');
    } finally {
      correlationRequestInFlight.current = false;
      if (correlationRequestId.current !== currentRequestId) {
        setCorrelationState('idle');
      }
    }
  };

  const handleLocalImage = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setLocalImageUrl(URL.createObjectURL(file));
    setLocalImageName(file.name);
    event.target.value = '';
  };

  const currentBounds = bboxFields.map(Number);
  const searchInputValid =
    bboxFields.every((value) => value.trim() !== '') &&
    currentBounds.every(Number.isFinite) &&
    currentBounds[0] >= -180 && currentBounds[0] <= 180 &&
    currentBounds[2] >= -180 && currentBounds[2] <= 180 &&
    currentBounds[1] >= -90 && currentBounds[1] <= 90 &&
    currentBounds[3] >= -90 && currentBounds[3] <= 90 &&
    currentBounds[0] < currentBounds[2] &&
    currentBounds[1] < currentBounds[3] &&
    Boolean(fromValue && toValue) &&
    !Number.isNaN(new Date(fromValue).getTime()) &&
    !Number.isNaN(new Date(toValue).getTime()) &&
    new Date(fromValue).getTime() <= new Date(toValue).getTime();

  const selectedAcquisitionTimestamp = selectedAcquisition?.datetime
    ? Date.parse(selectedAcquisition.datetime)
    : Number.NaN;
  const aisWindowFrom = Number.isFinite(selectedAcquisitionTimestamp)
    ? new Date(selectedAcquisitionTimestamp - AIS_TIME_WINDOW_MS).toISOString()
    : null;
  const aisWindowTo = Number.isFinite(selectedAcquisitionTimestamp)
    ? new Date(selectedAcquisitionTimestamp + AIS_TIME_WINDOW_MS).toISOString()
    : null;
  const nearestVessels = aisResult
    ? [...aisResult.vessels]
        .sort((first, second) => first.minimumDistanceKm - second.minimumDistanceKm)
        .slice(0, 10)
    : [];
  const selectedVessel: AisVesselSummary | null = selectedVesselId
    ? aisResult?.vessels.find((vessel) => vessel.id === selectedVesselId) ?? null
    : null;
  const selectedVesselObservations: AisObservation[] = selectedVessel
    ? aisResult?.observations
        .filter((observation) => observation.id === selectedVessel.id)
        .sort((first, second) => first.date.localeCompare(second.date)) ?? []
    : [];
  const correlationVessels = correlationResult
    ? [...correlationResult.vessels].slice(0, 10)
    : [];
  const selectedCorrelationVessel: AisCorrelationVessel | null = selectedCorrelationVesselId
    ? correlationResult?.vessels.find((vessel) => vessel.id === selectedCorrelationVesselId) ?? null
    : null;
  const investigationPointValid =
    investigationLat.trim() !== '' &&
    investigationLon.trim() !== '' &&
    Number.isFinite(Number(investigationLat)) &&
    Number(investigationLat) >= -90 &&
    Number(investigationLat) <= 90 &&
    Number.isFinite(Number(investigationLon)) &&
    Number(investigationLon) >= -180 &&
    Number(investigationLon) <= 180;
  const investigationRadiusValid =
    searchRadiusKm.trim() !== '' &&
    Number.isFinite(Number(searchRadiusKm)) &&
    Number(searchRadiusKm) >= 1 &&
    Number(searchRadiusKm) <= 200;
  const canCalculateCorrelation =
    !isDemoMode &&
    selectedAcquisition !== null &&
    Number.isFinite(selectedAcquisitionTimestamp) &&
    investigationPointValid &&
    investigationRadiusValid &&
    aisState === 'success' &&
    aisResult !== null;

  const stages: Array<{ title: string; detail: string; state: StageState; status: string }> = [
    {
      title: 'Define Area of Interest',
      detail: 'Set bounding box and observation period.',
      state: searchState === 'success' || searchState === 'loading' ? 'complete' : 'pending',
      status: searchState === 'success' || searchState === 'loading' ? 'Ready' : 'Pending',
    },
    {
      title: 'Search Sentinel-1 catalogue',
      detail: 'Query real Sentinel-1 GRD catalogue records.',
      state: searchState === 'loading' ? 'active' : searchState === 'success' ? 'complete' : 'pending',
      status: searchState === 'loading' ? 'Searching' : searchState === 'success' ? 'Complete' : 'Pending',
    },
    {
      title: 'Select satellite acquisition',
      detail: 'Choose a returned catalogue acquisition.',
      state: selectedAcquisition ? 'complete' : 'pending',
      status: selectedAcquisition ? 'Selected' : 'Pending',
    },
    {
      title: 'Retrieve SAR observation',
      detail: 'Request the real VV grayscale image.',
      state: imageState === 'loading' ? 'active' : imageState === 'success' ? 'complete' : 'pending',
      status: imageState === 'loading' ? 'Retrieving' : imageState === 'success' ? 'Ready' : 'Pending',
    },
    {
      title: 'Prepare for spill analysis',
      detail: 'Classification is a separate, not-yet-connected stage.',
      state: 'pending',
      status: 'Not implemented',
    },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <section className="glass-panel rounded-xl border p-5 sm:p-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-md border border-[#3C8D63]/25 bg-[#E7F2EB] px-2 py-1 text-xs font-semibold text-[#2C704D]">
                <Satellite className="h-3.5 w-3.5" />
                SATELLITE OBSERVATION
              </span>
              <span className="rounded-md border border-[var(--ot-border)] px-2 py-1 text-xs font-medium text-[var(--ot-text-secondary)]">
                {isDemoMode ? 'DEMO MODE' : 'LIVE CATALOGUE'}
              </span>
            </div>
            <h1 className="mt-2 text-xl font-bold text-[var(--ot-text)] sm:text-2xl">Sentinel-1 GRD observation</h1>
            <p className="mt-1 max-w-3xl text-sm text-[var(--ot-text-secondary)]">
              Search the Copernicus catalogue and retrieve a SAR image for the selected area and time range. The image is an observation, not an oil-spill classification.
            </p>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-5">
          <section className="glass-panel rounded-xl border p-5 sm:p-6">
            <h2 className="flex items-center gap-2 text-sm font-bold text-[var(--ot-text)]">
              <Satellite className="h-4 w-4 text-[var(--ot-primary)]" />
              INVESTIGATION PARAMETERS
            </h2>
            <form className="mt-4 space-y-4" onSubmit={handleSearch}>
              <fieldset className="space-y-2">
                <legend className="text-xs font-semibold text-[var(--ot-text-secondary)]">
                  Area of Interest · Bounding box
                </legend>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    ['minLon', 'Minimum longitude'],
                    ['minLat', 'Minimum latitude'],
                    ['maxLon', 'Maximum longitude'],
                    ['maxLat', 'Maximum latitude'],
                  ].map(([label, ariaLabel], index) => (
                    <label key={label} className="space-y-1 text-[11px] text-[var(--ot-muted)]">
                      <span>{label}</span>
                      <input
                        aria-label={ariaLabel}
                        type="number"
                        step="any"
                        value={bboxFields[index]}
                        onChange={(event) => {
                          const next = [...bboxFields];
                          next[index] = event.target.value;
                          setBboxFields(next);
                          resetSelectedObservation();
                        }}
                        className="w-full rounded-md border border-[var(--ot-border)] bg-[var(--ot-card)] px-3 py-2 text-sm text-[var(--ot-text)]"
                      />
                    </label>
                  ))}
                </div>
              </fieldset>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="space-y-1 text-[11px] text-[var(--ot-muted)]">
                  <span>From date/time</span>
                  <input
                    aria-label="From date and time"
                    type="datetime-local"
                    value={fromValue}
                    onChange={(event) => {
                      setFromValue(event.target.value);
                      resetSelectedObservation();
                    }}
                    className="w-full rounded-md border border-[var(--ot-border)] bg-[var(--ot-card)] px-3 py-2 text-sm text-[var(--ot-text)]"
                  />
                </label>
                <label className="space-y-1 text-[11px] text-[var(--ot-muted)]">
                  <span>To date/time</span>
                  <input
                    aria-label="To date and time"
                    type="datetime-local"
                    value={toValue}
                    onChange={(event) => {
                      setToValue(event.target.value);
                      resetSelectedObservation();
                    }}
                    className="w-full rounded-md border border-[var(--ot-border)] bg-[var(--ot-card)] px-3 py-2 text-sm text-[var(--ot-text)]"
                  />
                </label>
              </div>

              {isDemoMode && (
                <p className="rounded-lg border border-[var(--ot-border)] bg-[var(--ot-shell)] p-3 text-xs leading-5 text-[var(--ot-text-secondary)]">
                  Demo mode is active. Switch to Live mode in the navigation bar to query the real Copernicus catalogue. No sample acquisitions are shown here.
                </p>
              )}

              {searchError && (
                <p role="alert" className="flex items-start gap-2 rounded-lg border border-[#B84E4B]/30 bg-[#B84E4B]/10 p-3 text-xs leading-5 text-[#B84E4B]">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{searchError}</span>
                </p>
              )}

              <button
                type="submit"
                disabled={isDemoMode || searchState === 'loading' || !searchInputValid}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--ot-primary)] px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-[var(--ot-primary-dark)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {searchState === 'loading' ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Satellite className="h-4 w-4" />}
                {searchState === 'loading' ? 'SEARCHING CATALOGUE…' : 'SEARCH SENTINEL-1'}
              </button>
            </form>
          </section>

          <section className="glass-panel rounded-xl border p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 text-sm font-bold text-[var(--ot-text)]">
                <Layers className="h-4 w-4 text-[var(--ot-primary)]" />
                OBSERVATION WORKFLOW
              </h2>
              <span className="text-[10px] font-medium text-[var(--ot-muted)]">No simulated processing</span>
            </div>
            <ol className="mt-4 space-y-2">
              {stages.map((stage, index) => (
                <li
                  key={stage.title}
                  className="flex items-center justify-between gap-3 rounded-lg border p-3"
                  style={{
                    borderColor: stage.state === 'pending' ? 'var(--ot-border)' : 'color-mix(in srgb, var(--ot-primary) 45%, var(--ot-border))',
                    backgroundColor: stage.state === 'pending' ? 'var(--ot-shell)' : 'var(--ot-primary-soft)',
                    color: stage.state === 'pending' ? 'var(--ot-text-secondary)' : 'var(--ot-primary)',
                  }}
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--ot-card)] text-xs font-bold">
                      {stage.state === 'complete' ? <CheckCircle2 className="h-4 w-4" /> : index + 1}
                    </span>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold">{stage.title}</div>
                      <div className="mt-0.5 text-[11px] text-[var(--ot-text-secondary)]">{stage.detail}</div>
                    </div>
                  </div>
                  <span className="shrink-0 text-[10px] font-semibold">{stage.status}</span>
                </li>
              ))}
            </ol>
          </section>

          <section className="glass-panel rounded-xl border p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-bold text-[var(--ot-text)]">ACQUISITIONS FOUND</h2>
              {searchState === 'success' && (
                <span className="rounded-full bg-[var(--ot-primary-soft)] px-2.5 py-1 text-xs font-semibold text-[var(--ot-primary)]">
                  {acquisitions.length} {acquisitions.length === 1 ? 'acquisition' : 'acquisitions'}
                </span>
              )}
            </div>

            {searchState === 'idle' && (
              <p className="mt-3 text-xs leading-5 text-[var(--ot-text-secondary)]">
                Set an area and time range, then search to retrieve real catalogue records.
              </p>
            )}
            {searchState === 'success' && acquisitions.length === 0 && (
              <p className="mt-3 rounded-lg border border-[var(--ot-border)] bg-[var(--ot-shell)] p-3 text-xs text-[var(--ot-text-secondary)]">
                No Sentinel-1 GRD acquisitions were returned for this area and time range.
              </p>
            )}
            {searchState === 'error' && !searchError && (
              <p className="mt-3 text-xs text-[var(--ot-text-secondary)]">Catalogue search failed.</p>
            )}

            {acquisitions.length > 0 && (
              <div className="mt-4 space-y-3">
                {acquisitions.map((acquisition, index) => {
                  const isSelected = selectedAcquisition === acquisition;
                  return (
                    <article key={acquisition.id ?? `${acquisition.datetime ?? 'acquisition'}-${index}`} className="rounded-lg border border-[var(--ot-border)] p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 space-y-1 text-xs">
                          {acquisition.id && (
                            <p className="break-all font-semibold text-[var(--ot-text)]">{acquisition.id}</p>
                          )}
                          {acquisition.datetime && (
                            <p className="flex items-center gap-1.5 text-[var(--ot-text-secondary)]">
                              <Clock3 className="h-3.5 w-3.5 shrink-0" />
                              {formatAcquisitionDate(acquisition.datetime)}
                            </p>
                          )}
                          {acquisition.properties?.platform && (
                            <p className="text-[var(--ot-text-secondary)]">Platform: {acquisition.properties.platform}</p>
                          )}
                          {acquisition.properties?.orbitDirection && (
                            <p className="text-[var(--ot-text-secondary)]">Orbit: {acquisition.properties.orbitDirection}</p>
                          )}
                          {acquisition.properties?.instrumentMode && (
                            <p className="text-[var(--ot-text-secondary)]">Instrument mode: {acquisition.properties.instrumentMode}</p>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => void handleSelectAcquisition(acquisition)}
                          disabled={isDemoMode || imageState === 'loading' || aisState === 'loading'}
                          className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-[var(--ot-border)] px-2.5 py-2 text-[10px] font-semibold text-[var(--ot-primary)] hover:bg-[var(--ot-primary-soft)] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {imageState === 'loading' && isSelected
                            ? <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                            : <Eye className="h-3.5 w-3.5" />}
                          VIEW OBSERVATION
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        <div className="space-y-6 lg:col-span-7">
          <section className="glass-panel space-y-4 rounded-xl border p-5 sm:p-6">
            <div className="flex flex-col justify-between gap-2 border-b border-[var(--ot-border)] pb-3 sm:flex-row sm:items-center">
              <div>
                <h2 className="text-sm font-bold text-[var(--ot-text)]">SAR IMAGE</h2>
                <p className="mt-1 text-xs text-[var(--ot-text-secondary)]">
                  Sentinel-1 GRD · VV grayscale backscatter visualization
                </p>
              </div>
              {selectedAcquisition?.datetime && (
                <div className="text-xs text-[var(--ot-text-secondary)]">
                  <span className="font-semibold text-[var(--ot-text)]">OBSERVATION TIME</span>
                  <span className="ml-2">{formatAcquisitionDate(selectedAcquisition.datetime)}</span>
                </div>
              )}
            </div>

            <div className="relative flex min-h-[320px] w-full items-center justify-center overflow-hidden rounded-lg border border-[#3B4650] bg-[#171B20] p-3 sm:min-h-[440px]">
              {imageUrl ? (
                <>
                  <img
                    src={imageUrl}
                    alt={`Sentinel-1 SAR observation${selectedAcquisition?.datetime ? ` from ${selectedAcquisition.datetime}` : ''}`}
                    className="max-h-[520px] w-full object-contain"
                  />
                  {selectedAcquisition && (
                    <div className="absolute left-3 top-3 max-w-[calc(100%-1.5rem)] rounded-md bg-[#171B20]/85 px-3 py-2 text-[10px] leading-5 text-white shadow backdrop-blur-sm">
                      <div className="font-semibold">Sentinel-1 · SAR IMAGE</div>
                      {selectedAcquisition.datetime && <div>OBSERVATION TIME: {formatAcquisitionDate(selectedAcquisition.datetime)}</div>}
                      {selectedAcquisition.properties?.platform && <div>PLATFORM: {selectedAcquisition.properties.platform}</div>}
                      {selectedAcquisition.properties?.orbitDirection && <div>ORBIT: {selectedAcquisition.properties.orbitDirection}</div>}
                      {selectedAcquisition.properties?.instrumentMode && <div>INSTRUMENT MODE: {selectedAcquisition.properties.instrumentMode}</div>}
                    </div>
                  )}
                </>
              ) : imageState === 'loading' ? (
                <div className="flex flex-col items-center gap-3 text-[#B2BCC5]">
                  <RefreshCw className="h-9 w-9 animate-spin text-[#74A9CF]" />
                  <p className="text-sm">Retrieving SAR observation…</p>
                </div>
              ) : imageError ? (
                <p role="alert" className="max-w-md text-center text-sm text-[#D47C76]">{imageError}</p>
              ) : (
                <div className="flex max-w-md flex-col items-center gap-3 text-center text-[#B2BCC5]">
                  <ImageIcon className="h-10 w-10 text-[#8996A1]" />
                  <p className="text-sm">Select an acquisition to retrieve its SAR observation.</p>
                </div>
              )}
            </div>

            {imageUrl && (
              <div className="flex flex-col justify-between gap-3 rounded-lg border border-[var(--ot-border)] bg-[var(--ot-shell)] p-3 sm:flex-row sm:items-center">
                <p className="text-xs leading-5 text-[var(--ot-text-secondary)]">
                  Observation constrained to the selected catalogue acquisition time and available Sentinel-1 metadata.
                </p>
                <button
                  type="button"
                  onClick={onNavigateToMap}
                  disabled={!selectedAcquisition || imageState !== 'success'}
                  className="inline-flex shrink-0 items-center justify-center gap-2 rounded-md bg-[var(--ot-primary)] px-3 py-2 text-xs font-semibold text-white hover:bg-[var(--ot-primary-dark)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Eye className="h-4 w-4" />
                  VIEW ON MAP
                </button>
              </div>
            )}
          </section>

          {selectedAcquisition && !isDemoMode && (
            <section className="glass-panel space-y-5 rounded-xl border p-5 sm:p-6">
              <div className="flex flex-col justify-between gap-2 border-b border-[var(--ot-border)] pb-3 sm:flex-row sm:items-start">
                <div>
                  <h2 className="flex items-center gap-2 text-sm font-bold text-[var(--ot-text)]">
                    <MapPin className="h-4 w-4 text-[var(--ot-primary)]" />
                    INVESTIGATION FOCUS
                  </h2>
                  <p className="mt-1 text-xs text-[var(--ot-text-secondary)]">
                    Set the point to examine for AIS-derived vessel presence. This is not automatically a spill location.
                  </p>
                </div>
                <a
                  href="https://globalfishingwatch.org"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-[var(--ot-primary)] hover:underline"
                >
                  Powered by Global Fishing Watch
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <label className="space-y-1 text-[11px] text-[var(--ot-muted)]">
                  <span>Investigation point · Latitude</span>
                  <input
                    aria-label="Investigation point latitude"
                    type="number"
                    min="-90"
                    max="90"
                    step="any"
                    value={investigationLat}
                    onChange={(event) => {
                      clearAisResults();
                      setInvestigationLat(event.target.value);
                    }}
                    className="w-full rounded-md border border-[var(--ot-border)] bg-[var(--ot-card)] px-3 py-2 text-sm text-[var(--ot-text)]"
                  />
                </label>
                <label className="space-y-1 text-[11px] text-[var(--ot-muted)]">
                  <span>Investigation point · Longitude</span>
                  <input
                    aria-label="Investigation point longitude"
                    type="number"
                    min="-180"
                    max="180"
                    step="any"
                    value={investigationLon}
                    onChange={(event) => {
                      clearAisResults();
                      setInvestigationLon(event.target.value);
                    }}
                    className="w-full rounded-md border border-[var(--ot-border)] bg-[var(--ot-card)] px-3 py-2 text-sm text-[var(--ot-text)]"
                  />
                </label>
                <label className="space-y-1 text-[11px] text-[var(--ot-muted)]">
                  <span>Search radius (km)</span>
                  <input
                    aria-label="AIS search radius in kilometers"
                    type="number"
                    min="1"
                    max="200"
                    step="any"
                    value={searchRadiusKm}
                    onChange={(event) => {
                      clearAisResults();
                      setSearchRadiusKm(event.target.value);
                    }}
                    className="w-full rounded-md border border-[var(--ot-border)] bg-[var(--ot-card)] px-3 py-2 text-sm text-[var(--ot-text)]"
                  />
                </label>
              </div>

              {!getBoundingBoxCenter(selectedAcquisition.bbox) && (
                <p className="text-xs text-[var(--ot-text-secondary)]">
                  This catalogue record has no valid bounding box for an initial point. Enter the investigation point manually.
                </p>
              )}

              <div className="flex flex-col gap-2 rounded-lg border border-[var(--ot-border)] bg-[var(--ot-shell)] p-3 text-xs text-[var(--ot-text-secondary)]">
                <span className="font-semibold text-[var(--ot-text)]">Observation time window</span>
                {aisWindowFrom && aisWindowTo ? (
                  <span>{formatAcquisitionDate(aisWindowFrom)} – {formatAcquisitionDate(aisWindowTo)} (±6 hours from selected acquisition)</span>
                ) : (
                  <span>A valid observation time is required on the selected acquisition.</span>
                )}
              </div>

              {aisError && (
                <p role="alert" className="flex items-start gap-2 rounded-lg border border-[#B84E4B]/30 bg-[#B84E4B]/10 p-3 text-xs leading-5 text-[#B84E4B]">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{aisError}</span>
                </p>
              )}

              <button
                type="button"
                onClick={() => void handleFindAisCandidates()}
                disabled={aisState === 'loading'}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--ot-primary)] px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-[var(--ot-primary-dark)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {aisState === 'loading'
                  ? <RefreshCw className="h-4 w-4 animate-spin" />
                  : <Search className="h-4 w-4" />}
                {aisState === 'loading' ? 'SEARCHING AIS PRESENCE…' : 'FIND AIS VESSEL PRESENCE'}
              </button>

              {aisResult && (
                <div className="space-y-4 border-t border-[var(--ot-border)] pt-4">
                  <div>
                    <h3 className="text-sm font-bold text-[var(--ot-text)]">AIS-DERIVED VESSEL PRESENCE</h3>
                    <p className={`mt-2 rounded-lg border p-3 text-xs ${
                      aisResult.observationCount > 0
                        ? 'border-[var(--ot-primary)]/30 bg-[var(--ot-primary-soft)] text-[var(--ot-text)]'
                        : 'border-[var(--ot-border)] bg-[var(--ot-shell)] text-[var(--ot-text-secondary)]'
                    }`}>
                      {aisResult.observationCount > 0
                        ? 'AIS presence detected within search radius'
                        : 'No AIS-derived vessel presence found within the search radius and time window.'}
                    </p>
                  </div>

                  <dl className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
                    <div className="rounded-md border border-[var(--ot-border)] p-3">
                      <dt className="text-[var(--ot-muted)]">Observations found</dt>
                      <dd className="mt-1 font-semibold text-[var(--ot-text)]">{aisResult.observationCount}</dd>
                    </div>
                    <div className="rounded-md border border-[var(--ot-border)] p-3">
                      <dt className="text-[var(--ot-muted)]">Unique vessels found</dt>
                      <dd className="mt-1 font-semibold text-[var(--ot-text)]">{aisResult.uniqueVesselCount}</dd>
                    </div>
                    <div className="rounded-md border border-[var(--ot-border)] p-3">
                      <dt className="text-[var(--ot-muted)]">Search radius</dt>
                      <dd className="mt-1 font-semibold text-[var(--ot-text)]">{aisResult.investigation.radiusKm} km</dd>
                    </div>
                    <div className="rounded-md border border-[var(--ot-border)] p-3">
                      <dt className="text-[var(--ot-muted)]">Time window</dt>
                      <dd className="mt-1 font-semibold text-[var(--ot-text)]">
                        {formatAcquisitionDate(aisResult.investigation.from)} – {formatAcquisitionDate(aisResult.investigation.to)}
                      </dd>
                    </div>
                  </dl>

                  <div className="overflow-x-auto rounded-lg border border-[var(--ot-border)]">
                    <table className="w-full min-w-[680px] text-left text-xs">
                      <thead className="bg-[var(--ot-shell)] text-[var(--ot-text-secondary)]">
                        <tr>
                          <th className="px-3 py-2 font-semibold">Vessel</th>
                          <th className="px-3 py-2 font-semibold">MMSI</th>
                          <th className="px-3 py-2 font-semibold">Type</th>
                          <th className="px-3 py-2 font-semibold">Flag</th>
                          <th className="px-3 py-2 font-semibold">Minimum distance</th>
                          <th className="px-3 py-2 font-semibold">Observation count</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--ot-border)]">
                        {nearestVessels.map((vessel) => (
                          <tr key={vessel.id} className={selectedVesselId === vessel.id ? 'bg-[var(--ot-primary-soft)]' : ''}>
                            <td className="px-3 py-2">
                              <button
                                type="button"
                                onClick={() => setSelectedVesselId(vessel.id)}
                                className="font-semibold text-[var(--ot-primary)] hover:underline"
                              >
                                {vessel.name ?? vessel.id}
                              </button>
                            </td>
                            <td className="px-3 py-2 text-[var(--ot-text-secondary)]">{vessel.mmsi ?? '—'}</td>
                            <td className="px-3 py-2 text-[var(--ot-text-secondary)]">{vessel.type ?? '—'}</td>
                            <td className="px-3 py-2 text-[var(--ot-text-secondary)]">{vessel.flag ?? '—'}</td>
                            <td className="px-3 py-2 text-[var(--ot-text-secondary)]">{formatDistance(vessel.minimumDistanceKm)}</td>
                            <td className="px-3 py-2 text-[var(--ot-text-secondary)]">{vessel.observationCount}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {nearestVessels.length === 0 && (
                      <p className="p-3 text-xs text-[var(--ot-text-secondary)]">No unique vessel records were available for this search.</p>
                    )}
                  </div>

                  {selectedVessel && (
                    <div className="space-y-3 rounded-lg border border-[var(--ot-border)] p-4">
                      <div>
                        <h4 className="text-xs font-bold text-[var(--ot-text)]">VESSEL OBSERVATIONS</h4>
                        <p className="mt-1 text-xs text-[var(--ot-text-secondary)]">
                          {[selectedVessel.name, selectedVessel.mmsi, selectedVessel.type, selectedVessel.flag]
                            .filter(Boolean)
                            .join(' · ') || selectedVessel.id}
                        </p>
                      </div>
                      <div className="space-y-2">
                        {selectedVesselObservations.map((observation, index) => (
                          <article
                            key={`${observation.date}-${observation.lat}-${observation.lon}-${index}`}
                            className="grid grid-cols-1 gap-2 rounded-md bg-[var(--ot-shell)] p-3 text-xs sm:grid-cols-4"
                          >
                            <div>
                              <div className="text-[var(--ot-muted)]">Observation date/time</div>
                              <div className="mt-1 text-[var(--ot-text)]">{observation.date}</div>
                            </div>
                            <div>
                              <div className="text-[var(--ot-muted)]">Distance</div>
                              <div className="mt-1 text-[var(--ot-text)]">{formatDistance(observation.distanceKm)}</div>
                            </div>
                            <div>
                              <div className="text-[var(--ot-muted)]">Location type</div>
                              <div className="mt-1 text-[var(--ot-text)]">GFW grid-cell center</div>
                            </div>
                            <div>
                              <div className="text-[var(--ot-muted)]">Activity hours</div>
                              <div className="mt-1 text-[var(--ot-text)]">{observation.activityHours ?? '—'}</div>
                            </div>
                          </article>
                        ))}
                        {selectedVesselObservations.length === 0 && (
                          <p className="text-xs text-[var(--ot-text-secondary)]">No detailed observations were returned for this vessel.</p>
                        )}
                      </div>
                    </div>
                  )}

                  <p className="text-[11px] leading-5 text-[var(--ot-muted)]">
                    Coordinates represent GFW grid-cell centers, not exact AIS fixes. Presence is observational and does not establish responsibility for an event.
                  </p>
                </div>
              )}

              {aisResult && (
                <section className="space-y-4 border-t border-[var(--ot-border)] pt-5">
                  <div>
                    <h3 className="text-sm font-bold text-[var(--ot-text)]">SPATIAL / TEMPORAL CORRELATION</h3>
                    <p className="mt-1 text-xs leading-5 text-[var(--ot-text-secondary)]">
                      A transparent ordering based on spatial proximity, temporal proximity, repeated AIS-derived presence, and observation spread across returned observations. It is not a probability or an assessment of responsibility.
                    </p>
                  </div>

                  {correlationError && (
                    <p role="alert" className="flex items-start gap-2 rounded-lg border border-[#B84E4B]/30 bg-[#B84E4B]/10 p-3 text-xs leading-5 text-[#B84E4B]">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>{correlationError}</span>
                    </p>
                  )}

                  <button
                    type="button"
                    onClick={() => void handleCalculateCorrelation()}
                    disabled={!canCalculateCorrelation || correlationState === 'loading'}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-[var(--ot-primary)] px-4 py-3 text-sm font-bold text-[var(--ot-primary)] transition-colors hover:bg-[var(--ot-primary-soft)] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {correlationState === 'loading'
                      ? <RefreshCw className="h-4 w-4 animate-spin" />
                      : <Layers className="h-4 w-4" />}
                    {correlationState === 'loading' ? 'CALCULATING CORRELATION…' : 'CALCULATE CORRELATION'}
                  </button>

                  {correlationResult && (
                    <div className="space-y-4">
                      <h4 className="text-xs font-bold text-[var(--ot-text)]">Correlation analysis complete</h4>
                      <p className="rounded-lg border border-[var(--ot-border)] bg-[var(--ot-shell)] p-3 text-xs leading-5 text-[var(--ot-text-secondary)]">
                        {correlationResult.vessels.length > 0
                          ? 'Correlation indicator calculated from spatial proximity, temporal proximity, AIS-derived presence persistence, and observation spread.'
                          : 'No AIS-derived vessel presence was found within the requested spatial and temporal window.'}
                      </p>

                      <dl className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-3">
                        <div className="rounded-md border border-[var(--ot-border)] p-3">
                          <dt className="text-[var(--ot-muted)]">Observations evaluated</dt>
                          <dd className="mt-1 font-semibold text-[var(--ot-text)]">{correlationResult.observationCount}</dd>
                        </div>
                        <div className="rounded-md border border-[var(--ot-border)] p-3">
                          <dt className="text-[var(--ot-muted)]">Unique vessels</dt>
                          <dd className="mt-1 font-semibold text-[var(--ot-text)]">{correlationResult.uniqueVesselCount}</dd>
                        </div>
                        <div className="rounded-md border border-[var(--ot-border)] p-3">
                          <dt className="text-[var(--ot-muted)]">Ordering</dt>
                          <dd className="mt-1 font-semibold text-[var(--ot-text)]">Indicator, then distance</dd>
                        </div>
                      </dl>

                      {correlationVessels.length > 0 && (
                        <div className="overflow-x-auto rounded-lg border border-[var(--ot-border)]">
                          <table className="w-full min-w-[760px] text-left text-xs">
                            <thead className="bg-[var(--ot-shell)] text-[var(--ot-text-secondary)]">
                              <tr>
                                <th className="px-3 py-2 font-semibold">Vessel</th>
                                <th className="px-3 py-2 font-semibold">MMSI</th>
                                <th className="px-3 py-2 font-semibold">Correlation indicator</th>
                                <th className="px-3 py-2 font-semibold">Minimum distance</th>
                                <th className="px-3 py-2 font-semibold">Nearest observation</th>
                                <th className="px-3 py-2 font-semibold">Observation count</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--ot-border)]">
                              {correlationVessels.map((vessel) => (
                                <tr
                                  key={vessel.id}
                                  className={selectedCorrelationVesselId === vessel.id ? 'bg-[var(--ot-primary-soft)]' : ''}
                                >
                                  <td className="px-3 py-2">
                                    <button
                                      type="button"
                                      onClick={() => setSelectedCorrelationVesselId(vessel.id)}
                                      className="font-semibold text-[var(--ot-primary)] hover:underline"
                                    >
                                      {vessel.name ?? vessel.id}
                                    </button>
                                  </td>
                                  <td className="px-3 py-2 text-[var(--ot-text-secondary)]">{vessel.mmsi ?? '—'}</td>
                                  <td className="px-3 py-2 font-semibold text-[var(--ot-text)]">{vessel.correlationIndicator}</td>
                                  <td className="px-3 py-2 text-[var(--ot-text-secondary)]">{formatDistance(vessel.metrics.minimumDistanceKm)}</td>
                                  <td className="px-3 py-2 text-[var(--ot-text-secondary)]">{vessel.closestObservationTime ?? 'Date-level only'}</td>
                                  <td className="px-3 py-2 text-[var(--ot-text-secondary)]">{vessel.metrics.observationCount}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {selectedCorrelationVessel && (
                        <div className="space-y-3 rounded-lg border border-[var(--ot-border)] p-4">
                          <div>
                            <h5 className="text-xs font-bold text-[var(--ot-text)]">
                              {selectedCorrelationVessel.name ?? selectedCorrelationVessel.id}
                            </h5>
                            <p className="mt-1 text-xs text-[var(--ot-text-secondary)]">
                              {[selectedCorrelationVessel.mmsi, selectedCorrelationVessel.type, selectedCorrelationVessel.flag]
                                .filter(Boolean)
                                .join(' · ') || 'No additional vessel metadata returned'}
                            </p>
                          </div>
                          <dl className="grid grid-cols-1 gap-3 text-xs sm:grid-cols-2">
                            <div className="rounded-md bg-[var(--ot-shell)] p-3">
                              <dt className="text-[var(--ot-muted)]">Spatial factor</dt>
                              <dd className="mt-1 font-semibold text-[var(--ot-text)]">{selectedCorrelationVessel.factors.spatialScore.toFixed(3)}</dd>
                            </div>
                            <div className="rounded-md bg-[var(--ot-shell)] p-3">
                              <dt className="text-[var(--ot-muted)]">Temporal factor</dt>
                              <dd className="mt-1 font-semibold text-[var(--ot-text)]">
                                {selectedCorrelationVessel.factors.temporalScore.toFixed(3)}
                                {selectedCorrelationVessel.temporalPrecision === 'date' ? ' · date-level only' : ''}
                              </dd>
                            </div>
                            <div className="rounded-md bg-[var(--ot-shell)] p-3">
                              <dt className="text-[var(--ot-muted)]">Persistence factor</dt>
                              <dd className="mt-1 font-semibold text-[var(--ot-text)]">{selectedCorrelationVessel.factors.persistenceScore.toFixed(3)}</dd>
                            </div>
                            <div className="rounded-md bg-[var(--ot-shell)] p-3">
                              <dt className="text-[var(--ot-muted)]">Observation spread factor</dt>
                              <dd className="mt-1 font-semibold text-[var(--ot-text)]">{selectedCorrelationVessel.factors.observationSpreadScore.toFixed(3)}</dd>
                            </div>
                          </dl>
                          <dl className="grid grid-cols-1 gap-3 text-xs sm:grid-cols-2">
                            <div className="rounded-md bg-[var(--ot-shell)] p-3">
                              <dt className="text-[var(--ot-muted)]">Maximum observation separation</dt>
                              <dd className="mt-1 font-semibold text-[var(--ot-text)]">{formatDistance(selectedCorrelationVessel.metrics.maximumObservationSeparationKm)}</dd>
                            </div>
                            <div className="rounded-md bg-[var(--ot-shell)] p-3">
                              <dt className="text-[var(--ot-muted)]">Minimum temporal difference</dt>
                              <dd className="mt-1 font-semibold text-[var(--ot-text)]">
                                {selectedCorrelationVessel.metrics.minimumTemporalDifferenceHours === null
                                  ? 'Date-level only'
                                  : `${selectedCorrelationVessel.metrics.minimumTemporalDifferenceHours.toFixed(2)} hours`}
                              </dd>
                            </div>
                          </dl>
                          <div>
                            <h6 className="text-xs font-semibold text-[var(--ot-text)]">Basis / explanation</h6>
                            {selectedCorrelationVessel.basis.length > 0 ? (
                              <ul className="mt-1 list-inside list-disc text-xs text-[var(--ot-text-secondary)]">
                                {selectedCorrelationVessel.basis.map((reason) => <li key={reason}>{reason}</li>)}
                              </ul>
                            ) : (
                              <p className="mt-1 text-xs text-[var(--ot-text-secondary)]">No positive factors were available for explanation.</p>
                            )}
                          </div>
                          <p className="text-[11px] text-[var(--ot-muted)]">
                            Location type: GFW grid-cell center · Temporal precision: {selectedCorrelationVessel.temporalPrecision}
                          </p>
                        </div>
                      )}
                      <p className="text-[11px] leading-5 text-[var(--ot-muted)]">
                        Correlation indicator is a transparent OceanTrace heuristic, not a probability or proof of responsibility. AIS presence alone does not establish that a vessel caused an oil spill.
                      </p>
                    </div>
                  )}
                </section>
              )}
            </section>
          )}

          <section className="glass-panel rounded-xl border p-5 sm:p-6">
            <div className="flex items-center gap-2">
              <Upload className="h-4 w-4 text-[var(--ot-muted)]" />
              <h2 className="text-sm font-bold text-[var(--ot-text)]">LOCAL IMAGE TESTING</h2>
              <span className="text-[10px] text-[var(--ot-muted)]">Secondary · not a live satellite observation</span>
            </div>
            <label className="mt-3 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-[var(--ot-border)] bg-[var(--ot-shell)] p-5 text-center hover:border-[var(--ot-primary)]">
              <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleLocalImage} className="sr-only" />
              <Upload className="h-5 w-5 text-[var(--ot-muted)]" />
              <span className="text-xs font-semibold text-[var(--ot-text-secondary)]">Choose a local image for display testing</span>
              <span className="text-[10px] text-[var(--ot-muted)]">This file is not uploaded or analyzed.</span>
            </label>
            {localImageUrl && (
              <div className="mt-4 flex flex-col gap-3 rounded-lg border border-[var(--ot-border)] p-3 sm:flex-row sm:items-center">
                <img src={localImageUrl} alt="Local testing image preview" className="h-20 w-28 rounded bg-[#171B20] object-contain" />
                <div>
                  <p className="text-xs font-semibold text-[var(--ot-text)]">{localImageName}</p>
                  <p className="mt-1 text-[11px] text-[var(--ot-text-secondary)]">Local preview only. No detection or classification is performed.</p>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};
