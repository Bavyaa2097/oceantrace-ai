import { SatelliteBoundingBox } from './satelliteApi';
import { SarAnomalyAnalysis, SarAnomalyCandidate } from './sarAnomalyDetection';

export interface SarAnomalyComparisonItem {
  status: 'persistent' | 'new' | 'disappeared';
  firstCandidate: SarAnomalyCandidate | null;
  secondCandidate: SarAnomalyCandidate | null;
  geographicBoundingBoxOverlap: number | null;
}

export interface SarAnomalyComparison {
  items: SarAnomalyComparisonItem[];
  firstCandidateCount: number;
  secondCandidateCount: number;
}

interface GeographicBounds {
  west: number;
  south: number;
  east: number;
  north: number;
}

function isValidExtent(bbox: SatelliteBoundingBox): boolean {
  return bbox.length === 4 &&
    bbox.every(Number.isFinite) &&
    bbox[0] >= -180 && bbox[0] <= 180 &&
    bbox[2] >= -180 && bbox[2] <= 180 &&
    bbox[1] >= -90 && bbox[1] <= 90 &&
    bbox[3] >= -90 && bbox[3] <= 90 &&
    bbox[0] < bbox[2] &&
    bbox[1] < bbox[3];
}

function getGeographicBounds(
  candidate: SarAnomalyCandidate,
  analysis: SarAnomalyAnalysis,
  extent: SatelliteBoundingBox,
): GeographicBounds | null {
  if (
    !isValidExtent(extent) ||
    !Number.isFinite(analysis.width) ||
    !Number.isFinite(analysis.height) ||
    analysis.width <= 0 ||
    analysis.height <= 0 ||
    candidate.boundingBox.minX < 0 ||
    candidate.boundingBox.minY < 0 ||
    candidate.boundingBox.maxX >= analysis.width ||
    candidate.boundingBox.maxY >= analysis.height ||
    candidate.boundingBox.minX > candidate.boundingBox.maxX ||
    candidate.boundingBox.minY > candidate.boundingBox.maxY
  ) {
    return null;
  }

  const [minLon, minLat, maxLon, maxLat] = extent;
  const longitudeSpan = maxLon - minLon;
  const latitudeSpan = maxLat - minLat;
  return {
    west: minLon + (candidate.boundingBox.minX / analysis.width) * longitudeSpan,
    east: minLon + ((candidate.boundingBox.maxX + 1) / analysis.width) * longitudeSpan,
    north: maxLat - (candidate.boundingBox.minY / analysis.height) * latitudeSpan,
    south: maxLat - ((candidate.boundingBox.maxY + 1) / analysis.height) * latitudeSpan,
  };
}

function getIntersectionOverUnion(first: GeographicBounds, second: GeographicBounds): number {
  const intersectionWidth = Math.max(0, Math.min(first.east, second.east) - Math.max(first.west, second.west));
  const intersectionHeight = Math.max(0, Math.min(first.north, second.north) - Math.max(first.south, second.south));
  const intersection = intersectionWidth * intersectionHeight;
  if (intersection === 0) return 0;

  const firstArea = (first.east - first.west) * (first.north - first.south);
  const secondArea = (second.east - second.west) * (second.north - second.south);
  const union = firstArea + secondArea - intersection;
  return union > 0 ? intersection / union : 0;
}

export function compareSarAnomalyCandidates(
  firstAnalysis: SarAnomalyAnalysis,
  firstExtent: SatelliteBoundingBox,
  secondAnalysis: SarAnomalyAnalysis,
  secondExtent: SatelliteBoundingBox,
): SarAnomalyComparison {
  const firstBounds = new Map<number, GeographicBounds>();
  const secondBounds = new Map<number, GeographicBounds>();

  firstAnalysis.candidates.forEach((candidate) => {
    const bounds = getGeographicBounds(candidate, firstAnalysis, firstExtent);
    if (bounds) firstBounds.set(candidate.id, bounds);
  });
  secondAnalysis.candidates.forEach((candidate) => {
    const bounds = getGeographicBounds(candidate, secondAnalysis, secondExtent);
    if (bounds) secondBounds.set(candidate.id, bounds);
  });

  const possibleMatches: Array<{
    firstCandidate: SarAnomalyCandidate;
    secondCandidate: SarAnomalyCandidate;
    overlap: number;
  }> = [];
  firstAnalysis.candidates.forEach((firstCandidate) => {
    const first = firstBounds.get(firstCandidate.id);
    if (!first) return;

    secondAnalysis.candidates.forEach((secondCandidate) => {
      const second = secondBounds.get(secondCandidate.id);
      if (!second) return;
      const overlap = getIntersectionOverUnion(first, second);
      if (overlap >= 0.25) {
        possibleMatches.push({ firstCandidate, secondCandidate, overlap });
      }
    });
  });

  possibleMatches.sort((first, second) =>
    second.overlap - first.overlap ||
    first.firstCandidate.id - second.firstCandidate.id ||
    first.secondCandidate.id - second.secondCandidate.id
  );

  const matchedFirstIds = new Set<number>();
  const matchedSecondIds = new Set<number>();
  const items: SarAnomalyComparisonItem[] = [];
  possibleMatches.forEach(({ firstCandidate, secondCandidate, overlap }) => {
    if (
      matchedFirstIds.has(firstCandidate.id) ||
      matchedSecondIds.has(secondCandidate.id)
    ) {
      return;
    }
    matchedFirstIds.add(firstCandidate.id);
    matchedSecondIds.add(secondCandidate.id);
    items.push({
      status: 'persistent',
      firstCandidate,
      secondCandidate,
      geographicBoundingBoxOverlap: overlap,
    });
  });

  firstAnalysis.candidates.forEach((candidate) => {
    if (!matchedFirstIds.has(candidate.id)) {
      items.push({
        status: 'disappeared',
        firstCandidate: candidate,
        secondCandidate: null,
        geographicBoundingBoxOverlap: null,
      });
    }
  });
  secondAnalysis.candidates.forEach((candidate) => {
    if (!matchedSecondIds.has(candidate.id)) {
      items.push({
        status: 'new',
        firstCandidate: null,
        secondCandidate: candidate,
        geographicBoundingBoxOverlap: null,
      });
    }
  });

  return {
    items,
    firstCandidateCount: firstAnalysis.candidates.length,
    secondCandidateCount: secondAnalysis.candidates.length,
  };
}
