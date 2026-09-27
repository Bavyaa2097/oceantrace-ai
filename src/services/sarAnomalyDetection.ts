export interface SarAnomalyCandidate {
  id: number;
  boundingBox: {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
    width: number;
    height: number;
  };
  pixelArea: number;
  centroid: {
    x: number;
    y: number;
  };
  meanIntensity: number;
  contrast: number;
}

export interface SarAnomalyAnalysis {
  width: number;
  height: number;
  backgroundIntensity: number;
  thresholdIntensity: number;
  candidates: SarAnomalyCandidate[];
}

const EDGE_EXCLUSION_MARGIN = 16;
const MIN_REGION_AREA = 12;
const MAX_IMAGE_DIMENSION = 4096;
const MIN_DARKNESS_DELTA = 12;
const MAD_MULTIPLIER = 2.5;
const NEAR_BLACK_INTENSITY = 2;
const NEAR_BLACK_COMPONENT_MEAN = 4;
const NEAR_BLACK_COMPONENT_FRACTION = 0.8;
const MAX_CANDIDATES = 10;

function percentile(sortedValues: number[], fraction: number): number {
  const index = Math.min(sortedValues.length - 1, Math.floor(sortedValues.length * fraction));
  return sortedValues[index];
}

function luminanceAt(data: Uint8ClampedArray, index: number): number {
  return 0.2126 * data[index] + 0.7152 * data[index + 1] + 0.0722 * data[index + 2];
}

export async function analyzeSarImage(imageUrl: string): Promise<SarAnomalyAnalysis> {
  const image = new Image();
  image.decoding = 'async';
  image.src = imageUrl;
  try {
    await image.decode();
  } catch {
    throw new Error('The SAR image could not be decoded for surface-pattern analysis.');
  }

  const { naturalWidth: width, naturalHeight: height } = image;
  if (
    width <= EDGE_EXCLUSION_MARGIN * 2 ||
    height <= EDGE_EXCLUSION_MARGIN * 2 ||
    width > MAX_IMAGE_DIMENSION ||
    height > MAX_IMAGE_DIMENSION
  ) {
    throw new Error('The SAR image dimensions are not supported for browser analysis.');
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('A browser canvas is unavailable for SAR image analysis.');

  context.drawImage(image, 0, 0);
  let pixels: ImageData;
  try {
    pixels = context.getImageData(0, 0, width, height);
  } catch {
    throw new Error('The SAR image pixels could not be read for analysis.');
  }

  const intensities = new Float32Array(width * height);
  const backgroundSamples: number[] = [];
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const pixelIndex = y * width + x;
      const intensity = luminanceAt(pixels.data, pixelIndex * 4);
      intensities[pixelIndex] = intensity;
      if (
        x >= EDGE_EXCLUSION_MARGIN && x < width - EDGE_EXCLUSION_MARGIN &&
        y >= EDGE_EXCLUSION_MARGIN && y < height - EDGE_EXCLUSION_MARGIN
      ) {
        backgroundSamples.push(intensity);
      }
    }
  }

  const validBackgroundSamples = backgroundSamples.filter(
    (intensity) => intensity > NEAR_BLACK_INTENSITY,
  );
  const samplesForBackground = validBackgroundSamples.length > 0
    ? validBackgroundSamples
    : backgroundSamples;
  samplesForBackground.sort((a, b) => a - b);
  const backgroundIntensity = samplesForBackground.length > 0
    ? percentile(samplesForBackground, 0.5)
    : 0;
  const deviations = samplesForBackground.map((value) => Math.abs(value - backgroundIntensity));
  deviations.sort((a, b) => a - b);
  const medianAbsoluteDeviation = percentile(deviations, 0.5);
  const darknessDelta = Math.max(MIN_DARKNESS_DELTA, MAD_MULTIPLIER * medianAbsoluteDeviation);
  const thresholdIntensity = Math.max(0, backgroundIntensity - darknessDelta);
  const visited = new Uint8Array(width * height);
  const queue = new Int32Array(width * height);
  const candidates: SarAnomalyCandidate[] = [];

  for (let y = EDGE_EXCLUSION_MARGIN; y < height - EDGE_EXCLUSION_MARGIN; y += 1) {
    for (let x = EDGE_EXCLUSION_MARGIN; x < width - EDGE_EXCLUSION_MARGIN; x += 1) {
      const start = y * width + x;
      if (visited[start] || intensities[start] >= thresholdIntensity) continue;

      let head = 0;
      let tail = 0;
      let sumIntensity = 0;
      let nearBlackPixelCount = 0;
      let sumX = 0;
      let sumY = 0;
      let minX = x;
      let minY = y;
      let maxX = x;
      let maxY = y;
      let touchesExclusionMargin = false;
      visited[start] = 1;
      queue[tail] = start;
      tail += 1;

      while (head < tail) {
        const pixel = queue[head];
        head += 1;
        const pixelX = pixel % width;
        const pixelY = Math.floor(pixel / width);
        const intensity = intensities[pixel];
        sumIntensity += intensity;
        if (intensity <= NEAR_BLACK_INTENSITY) nearBlackPixelCount += 1;
        sumX += pixelX;
        sumY += pixelY;
        if (
          pixelX === EDGE_EXCLUSION_MARGIN ||
          pixelX === width - EDGE_EXCLUSION_MARGIN - 1 ||
          pixelY === EDGE_EXCLUSION_MARGIN ||
          pixelY === height - EDGE_EXCLUSION_MARGIN - 1
        ) {
          touchesExclusionMargin = true;
        }
        minX = Math.min(minX, pixelX);
        minY = Math.min(minY, pixelY);
        maxX = Math.max(maxX, pixelX);
        maxY = Math.max(maxY, pixelY);

        for (let offsetY = -1; offsetY <= 1; offsetY += 1) {
          for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
            if (offsetX === 0 && offsetY === 0) continue;
            const neighborX = pixelX + offsetX;
            const neighborY = pixelY + offsetY;
            if (
              neighborX < EDGE_EXCLUSION_MARGIN || neighborX >= width - EDGE_EXCLUSION_MARGIN ||
              neighborY < EDGE_EXCLUSION_MARGIN || neighborY >= height - EDGE_EXCLUSION_MARGIN
            ) {
              continue;
            }

            const neighbor = neighborY * width + neighborX;
            if (visited[neighbor] || intensities[neighbor] >= thresholdIntensity) continue;
            visited[neighbor] = 1;
            queue[tail] = neighbor;
            tail += 1;
          }
        }
      }

      const meanIntensity = sumIntensity / tail;
      const nearBlackFraction = nearBlackPixelCount / tail;
      if (
        tail < MIN_REGION_AREA ||
        touchesExclusionMargin ||
        (
          meanIntensity <= NEAR_BLACK_COMPONENT_MEAN &&
          nearBlackFraction >= NEAR_BLACK_COMPONENT_FRACTION
        )
      ) {
        continue;
      }

      candidates.push({
        id: 0,
        boundingBox: {
          minX,
          minY,
          maxX,
          maxY,
          width: maxX - minX + 1,
          height: maxY - minY + 1,
        },
        pixelArea: tail,
        centroid: {
          x: sumX / tail,
          y: sumY / tail,
        },
        meanIntensity,
        contrast: backgroundIntensity > 0
          ? (backgroundIntensity - meanIntensity) / backgroundIntensity
          : 0,
      });
    }
  }

  candidates.sort((first, second) =>
    second.pixelArea - first.pixelArea ||
    second.contrast - first.contrast ||
    first.boundingBox.minY - second.boundingBox.minY ||
    first.boundingBox.minX - second.boundingBox.minX
  );

  return {
    width,
    height,
    backgroundIntensity,
    thresholdIntensity,
    candidates: candidates.slice(0, MAX_CANDIDATES).map((candidate, index) => ({
      ...candidate,
      id: index + 1,
    })),
  };
}
