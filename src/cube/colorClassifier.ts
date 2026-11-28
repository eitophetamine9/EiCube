import { Face } from './types';

export type RgbColor = [number, number, number];
export type LabColor = [number, number, number];

export interface SampledFaceGrid {
  face: Face;
  stickers: Face[];
  cellRgb: RgbColor[];
}

export const STANDARD_FACE_RGB: Record<Face, RgbColor> = {
  U: [242, 245, 248], // White
  D: [246, 208, 32],  // Yellow
  F: [24, 158, 72],   // Green
  B: [34, 92, 212],   // Blue
  R: [212, 38, 42],   // Red
  L: [242, 114, 24],  // Orange
};

/** Converts sRGB [0..255] to perceptual CIE L*a*b*. */
export function rgbToLab([r8, g8, b8]: RgbColor): LabColor {
  const toLinear = (c: number) => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  const r = toLinear(r8);
  const g = toLinear(g8);
  const b = toLinear(b8);

  // Observer = 2 deg, Illuminant = D65
  const x = (r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047;
  const y = (r * 0.2126 + g * 0.7152 + b * 0.0722) / 1.0;
  const z = (r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883;

  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const fx = f(x);
  const fy = f(y);
  const fz = f(z);

  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

function labDistanceSq(a: LabColor, b: LabColor): number {
  const dl = (a[0] - b[0]) * 0.75; // Slightly downweight luminance to tolerate shadows
  const da = a[1] - b[1];
  const db = a[2] - b[2];
  return dl * dl + da * da + db * db;
}

/** Classifies a single RGB sample against calibrated center anchors or defaults. */
export function classifyRgbColor(
  rgb: RgbColor,
  calibratedRefs?: Partial<Record<Face, RgbColor>>
): Face {
  const lab = rgbToLab(rgb);
  const faces: Face[] = ['U', 'D', 'F', 'B', 'R', 'L'];
  let bestFace: Face = 'U';
  let bestDist = Infinity;

  for (const face of faces) {
    const refRgb = calibratedRefs?.[face] ?? STANDARD_FACE_RGB[face];
    const refLab = rgbToLab(refRgb);
    const d = labDistanceSq(lab, refLab);
    if (d < bestDist) {
      bestDist = d;
      bestFace = face;
    }
  }
  return bestFace;
}

/**
 * Samples the inner 3x3 cells from a centered square region of RGBA image data.
 * Avoids dark plastic borders by sampling the central 36% of each sub-cell.
 */
export function sampleGridRgbFromImageData(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  cropFraction: number = 0.72
): RgbColor[] {
  const minDim = Math.min(width, height);
  const boxSize = Math.max(9, Math.floor(minDim * cropFraction));
  const startX = Math.floor((width - boxSize) / 2);
  const startY = Math.floor((height - boxSize) / 2);
  const cellSize = boxSize / 3;

  const results: RgbColor[] = [];
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      const cx0 = Math.floor(startX + col * cellSize + cellSize * 0.32);
      const cx1 = Math.max(cx0 + 1, Math.floor(startX + col * cellSize + cellSize * 0.68));
      const cy0 = Math.floor(startY + row * cellSize + cellSize * 0.32);
      const cy1 = Math.max(cy0 + 1, Math.floor(startY + row * cellSize + cellSize * 0.68));

      let rSum = 0;
      let gSum = 0;
      let bSum = 0;
      let count = 0;

      for (let y = cy0; y < cy1; y++) {
        for (let x = cx0; x < cx1; x++) {
          if (x < 0 || x >= width || y < 0 || y >= height) continue;
          const idx = (y * width + x) * 4;
          rSum += data[idx];
          gSum += data[idx + 1];
          bSum += data[idx + 2];
          count++;
        }
      }

      if (count === 0) {
        results.push([128, 128, 128]);
      } else {
        results.push([
          Math.round(rSum / count),
          Math.round(gSum / count),
          Math.round(bSum / count),
        ]);
      }
    }
  }
  return results;
}

/**
 * Re-classifies all sampled faces using each face's captured center cell (index 4)
 * as the color calibration anchor.
 */
export function reclassifyAllFacesWithCenters(
  capturedRgbByFace: Partial<Record<Face, RgbColor[]>>
): Partial<Record<Face, Face[]>> {
  const calibratedRefs: Partial<Record<Face, RgbColor>> = {};
  const faces: Face[] = ['U', 'D', 'F', 'B', 'R', 'L'];

  for (const face of faces) {
    const cells = capturedRgbByFace[face];
    if (cells && cells.length === 9) {
      calibratedRefs[face] = cells[4];
    }
  }

  const out: Partial<Record<Face, Face[]>> = {};
  for (const face of faces) {
    const cells = capturedRgbByFace[face];
    if (cells && cells.length === 9) {
      out[face] = cells.map((rgb, idx) => (idx === 4 ? face : classifyRgbColor(rgb, calibratedRefs)));
    }
  }
  return out;
}

/** Samples an HTMLImageElement or HTMLVideoElement via an offscreen canvas. */
export function sampleRgbFromMediaSource(
  source: CanvasImageSource,
  srcWidth: number,
  srcHeight: number,
  cropFraction: number = 0.72,
  mirrorHorizontal: boolean = false
): RgbColor[] {
  const canvas = document.createElement('canvas');
  const targetSize = 180;
  canvas.width = targetSize;
  canvas.height = targetSize;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return Array(9).fill([128, 128, 128]);

  const minSide = Math.min(srcWidth, srcHeight);
  const sx = (srcWidth - minSide) / 2;
  const sy = (srcHeight - minSide) / 2;

  ctx.save();
  if (mirrorHorizontal) {
    ctx.translate(targetSize, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(source, sx, sy, minSide, minSide, 0, 0, targetSize, targetSize);
  ctx.restore();

  const imgData = ctx.getImageData(0, 0, targetSize, targetSize);
  return sampleGridRgbFromImageData(imgData.data, targetSize, targetSize, cropFraction);
}
