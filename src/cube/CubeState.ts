import { Face, Axis, Vector3Tuple, CubieState, StickerState, FACE_NORMALS } from './types';

function rotateVector(v: Vector3Tuple, axis: Axis, angle: number): Vector3Tuple {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const [x, y, z] = v;

  let rx = x;
  let ry = y;
  let rz = z;

  if (axis === 'x') {
    ry = y * cos - z * sin;
    rz = y * sin + z * cos;
  } else if (axis === 'y') {
    rx = x * cos + z * sin;
    rz = -x * sin + z * cos;
  } else if (axis === 'z') {
    rx = x * cos - y * sin;
    ry = x * sin + y * cos;
  }

  // Snap to clean values
  const snap = (n: number) => {
    const rounded = Math.round(n * 2) / 2;
    return Math.abs(n - rounded) < 0.001 ? rounded : n;
  };

  return [snap(rx), snap(ry), snap(rz)];
}

export class CubeState {
  readonly size: number;
  cubies: CubieState[];

  get layers(): number[] {
    const maxCoord = (this.size - 1) / 2;
    const list: number[] = [];
    for (let i = 0; i < this.size; i++) {
      list.push(i - maxCoord);
    }
    return list;
  }

  constructor(size: number = 3, cubies?: CubieState[]) {
    this.size = size;
    if (cubies) {
      this.cubies = cubies;
    } else {
      this.cubies = this.createSolvedCubies();
    }
  }

  private createSolvedCubies(): CubieState[] {
    const list: CubieState[] = [];
    const maxCoord = (this.size - 1) / 2;

    for (let xIndex = 0; xIndex < this.size; xIndex++) {
      for (let yIndex = 0; yIndex < this.size; yIndex++) {
        for (let zIndex = 0; zIndex < this.size; zIndex++) {
          const x = xIndex - maxCoord;
          const y = yIndex - maxCoord;
          const z = zIndex - maxCoord;

          // Skip completely internal pieces for 3x3 or larger
          const isExterior =
            Math.abs(x) === maxCoord ||
            Math.abs(y) === maxCoord ||
            Math.abs(z) === maxCoord;

          if (!isExterior) continue;

          const stickers: StickerState[] = [];
          if (y === maxCoord) stickers.push({ normal: [0, 1, 0], color: 'U' });
          if (y === -maxCoord) stickers.push({ normal: [0, -1, 0], color: 'D' });
          if (z === maxCoord) stickers.push({ normal: [0, 0, 1], color: 'F' });
          if (z === -maxCoord) stickers.push({ normal: [0, 0, -1], color: 'B' });
          if (x === maxCoord) stickers.push({ normal: [1, 0, 0], color: 'R' });
          if (x === -maxCoord) stickers.push({ normal: [-1, 0, 0], color: 'L' });

          list.push({
            id: `cubie_${x}_${y}_${z}`,
            coords: [x, y, z],
            stickers,
          });
        }
      }
    }

    return list;
  }

  clone(): CubeState {
    const clonedCubies: CubieState[] = this.cubies.map((c) => ({
      id: c.id,
      coords: [...c.coords] as Vector3Tuple,
      stickers: c.stickers.map((s) => ({
        normal: [...s.normal] as Vector3Tuple,
        color: s.color,
      })),
    }));
    return new CubeState(this.size, clonedCubies);
  }

  reset(): void {
    this.cubies = this.createSolvedCubies();
  }

  applyTurn(axis: Axis, layers: number[], angle: number): void {
    const axisIdx = axis === 'x' ? 0 : axis === 'y' ? 1 : 2;

    for (const cubie of this.cubies) {
      const coord = cubie.coords[axisIdx];
      // Check if this cubie is in one of the active layers
      const inLayer = layers.some((l) => Math.abs(coord - l) < 0.01);
      if (!inLayer) continue;

      cubie.coords = rotateVector(cubie.coords, axis, angle);
      cubie.stickers = cubie.stickers.map((s) => ({
        color: s.color,
        normal: rotateVector(s.normal, axis, angle),
      }));
    }
  }

  isSolved(requireStandardOrientation: boolean = false): boolean {
    const faceKeys = Object.keys(FACE_NORMALS) as Face[];

    if (requireStandardOrientation) {
      for (const cubie of this.cubies) {
        for (const sticker of cubie.stickers) {
          const expectedNormal = FACE_NORMALS[sticker.color];
          const distSq =
            Math.pow(sticker.normal[0] - expectedNormal[0], 2) +
            Math.pow(sticker.normal[1] - expectedNormal[1], 2) +
            Math.pow(sticker.normal[2] - expectedNormal[2], 2);
          if (distSq > 0.01) return false;
        }
      }
      return true;
    }

    // Solved regardless of whole-cube rotation:
    // Each of the 6 face directions must have all stickers sharing the exact same color.
    const faceColors: Map<string, Set<Face>> = new Map();

    for (const face of faceKeys) {
      const normal = FACE_NORMALS[face];
      const key = normal.join(',');
      faceColors.set(key, new Set<Face>());
    }

    for (const cubie of this.cubies) {
      for (const sticker of cubie.stickers) {
        // Find which face normal this sticker aligns with
        for (const face of faceKeys) {
          const normal = FACE_NORMALS[face];
          const distSq =
            Math.pow(sticker.normal[0] - normal[0], 2) +
            Math.pow(sticker.normal[1] - normal[1], 2) +
            Math.pow(sticker.normal[2] - normal[2], 2);
          if (distSq < 0.01) {
            const key = normal.join(',');
            faceColors.get(key)!.add(sticker.color);
            break;
          }
        }
      }
    }

    const assignedColors = new Set<Face>();
    for (const colors of faceColors.values()) {
      if (colors.size !== 1) return false; // More than one color on this face
      const [col] = Array.from(colors);
      if (assignedColors.has(col)) return false; // Duplicate face color
      assignedColors.add(col);
    }

    return assignedColors.size === 6;
  }
}
