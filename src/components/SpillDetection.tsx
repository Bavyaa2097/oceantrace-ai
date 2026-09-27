import React, { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Eye,
  Image as ImageIcon,
  Layers,
  RefreshCw,
  Satellite,
  Upload,
} from 'lucide-react';
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
  const requestId = useRef(0);

  useEffect(() => {
    return () => {
      requestId.current += 1;
    };
  }, []);

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

  const resetSelectedObservation = () => {
    requestId.current += 1;
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
                          disabled={isDemoMode || imageState === 'loading'}
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
                  SAR observation loaded. Processing is constrained by the selected catalogue ID, acquisition time and available metadata filters. Sentinel Hub does not accept a catalogue item ID directly, so exact scene identity cannot be guaranteed when multiple source scenes share those filters. Oil-slick classification is a separate processing stage.
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
