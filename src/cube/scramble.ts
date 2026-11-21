import { Face } from './types';

const FACES: Face[] = ['U', 'D', 'L', 'R', 'F', 'B'];
const SUFFIXES = ['', "'", '2'];

// Group faces by axis to avoid consecutive moves along the same axis (e.g. R L R)
const OPPOSITE_FACE: Record<Face, Face> = {
  U: 'D',
  D: 'U',
  L: 'R',
  R: 'L',
  F: 'B',
  B: 'F',
};

/**
 * Generates a valid standard 20-25 move scramble sequence.
 * Enforces:
 * 1. No consecutive moves on the same face.
 * 2. No consecutive conflicting moves on opposite faces of same axis (e.g. R L R).
 */
export function generateScramble(length: number = 22): string {
  const scramble: string[] = [];
  let prevFace: Face | null = null;
  let secondPrevFace: Face | null = null;

  for (let i = 0; i < length; i++) {
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
