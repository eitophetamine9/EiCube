import { Face } from './types';

const FACES: Face[] = ['U', 'D', 'L', 'R', 'F', 'B'];
const WIDE_FACES = ['Uw', 'Dw', 'Lw', 'Rw', 'Fw', 'Bw'];
const INNER_SLICES = ['2U', '2D', '2L', '2R', '2F', '2B', 'M', 'E', 'S'];
const SUFFIXES = ['', "'", '2'];

// Group faces by axis to avoid consecutive moves along the same axis (e.g. R L R)
const OPPOSITE_FACE: Record<string, string> = {
  U: 'D',
  D: 'U',
  L: 'R',
  R: 'L',
  F: 'B',
  B: 'F',
  M: 'R',
  E: 'U',
  S: 'B',
};

/**
 * Generates an authentic 4x4 scramble sequence including outer face moves,
 * wide double-layer moves, and inner middle slices (M, E, S, 2R..2B) to
 * thoroughly scramble both outer edges and inner middle centers.
 */
export function generate4x4Scramble(length: number = 38): string {
  const scramble: string[] = [];
  let prevBase = '';
  let secondPrevBase = '';

  for (let i = 0; i < length; i++) {
    // Distribute moves across depths:
    // ~40% outer face moves (U, D, L, R, F, B)
    // ~35% wide double-layer moves (Uw, Dw, Lw, Rw, Fw, Bw)
    // ~25% middle / inner slice moves (M, E, S, 2U, 2D, 2L, 2R, 2F, 2B)
    const rand = Math.random();
    let movePool: string[];
    if (rand < 0.40) {
      movePool = FACES;
    } else if (rand < 0.75) {
      movePool = WIDE_FACES;
    } else {
      movePool = INNER_SLICES;
    }

    const validMoves = movePool.filter((m) => {
      if (m === prevBase) return false;
      const cleanM = m.replace(/^[2w]/, '').replace(/[w]$/, '');
      const cleanPrev = prevBase.replace(/^[2w]/, '').replace(/[w]$/, '');
      const cleanSecond = secondPrevBase.replace(/^[2w]/, '').replace(/[w]$/, '');
      if (cleanM === cleanPrev) return false;
      if (
        cleanSecond &&
        cleanM === cleanSecond &&
        cleanPrev &&
        OPPOSITE_FACE[cleanM] === cleanPrev
      ) {
        return false;
      }
      return true;
    });

    const poolToUse = validMoves.length > 0 ? validMoves : movePool;
    const chosenBase = poolToUse[Math.floor(Math.random() * poolToUse.length)];
    const chosenSuffix = SUFFIXES[Math.floor(Math.random() * SUFFIXES.length)];

    scramble.push(`${chosenBase}${chosenSuffix}`);

    secondPrevBase = prevBase;
    prevBase = chosenBase;
  }

  return scramble.join(' ');
}

/**
 * Generates a valid standard scramble sequence for any cube size.
 * Automatically utilizes wide and middle slice moves for 4x4.
 */
export function generateScramble(length?: number, size: number = 3): string {
  if (size === 4) {
    return generate4x4Scramble(length ?? 38);
  }

  const actualLen = length ?? (size === 2 ? 14 : 22);
  const scramble: string[] = [];
  let prevFace: Face | null = null;
  let secondPrevFace: Face | null = null;

  for (let i = 0; i < actualLen; i++) {
    const validFaces = FACES.filter((face) => {
      if (face === prevFace) return false;
      if (
        secondPrevFace &&
        face === secondPrevFace &&
        prevFace &&
        OPPOSITE_FACE[face] === prevFace
      ) {
        return false;
      }
      return true;
    });

    const chosenFace = validFaces[Math.floor(Math.random() * validFaces.length)];
    const chosenSuffix = SUFFIXES[Math.floor(Math.random() * SUFFIXES.length)];

    scramble.push(`${chosenFace}${chosenSuffix}`);

    secondPrevFace = prevFace;
    prevFace = chosenFace;
  }

  return scramble.join(' ');
}
