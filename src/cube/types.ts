export type Face = 'U' | 'D' | 'F' | 'B' | 'R' | 'L';

export type Axis = 'x' | 'y' | 'z';

export type Vector3Tuple = [number, number, number];

export interface StickerState {
  normal: Vector3Tuple;
  color: Face;
}

export interface CubieState {
  id: string;
  coords: Vector3Tuple;
  stickers: StickerState[];
}

export type MoveSuffix = '' | "'" | '2';

export interface AtomicMove {
  base: string; // e.g. 'R', 'U', 'M', 'x', 'r'
  suffix: MoveSuffix;
  viewRelative: boolean;
  notation: string;
}

export interface ResolvedTurn {
  axis: Axis;
  layers: number[];
  angle: number; // in radians: positive or negative
  notation: string;
  viewFace?: Face;
}

export interface CameraVectors {
  right: Vector3Tuple;
  up: Vector3Tuple;
  forwardTowardCamera: Vector3Tuple;
}

export interface FaceOrientationMap {
  F: Face;
  B: Face;
  U: Face;
  D: Face;
  R: Face;
  L: Face;
}

export const FACE_NORMALS: Record<Face, Vector3Tuple> = {
  R: [1, 0, 0],
  L: [-1, 0, 0],
  U: [0, 1, 0],
  D: [0, -1, 0],
  F: [0, 0, 1],
  B: [0, 0, -1],
};

export type ColorSchemeId =
  | 'classic'
  | 'stickerless'
  | 'primary'
  | 'pastel'
  | 'carbon';

export interface ColorSchemePalette {
  id: ColorSchemeId;
  name: string;
  bodyColor: string;
  isStickerless: boolean;
  cubeFaces: Record<Face, string>;
  pyraFaces: Record<PyraFace, string>;
}

export const COLOR_SCHEMES: Record<ColorSchemeId, ColorSchemePalette> = {
  classic: {
    id: 'classic',
    name: 'Classic Black Bezel',
    bodyColor: '#111317',
    isStickerless: false,
    cubeFaces: {
      U: '#f8fafc',
      D: '#facc15',
      F: '#16a34a',
      B: '#2563eb',
      R: '#dc2626',
      L: '#ea580c',
    },
    pyraFaces: {
      U: '#facc15',
      L: '#16a34a',
      R: '#dc2626',
      B: '#2563eb',
    },
  },
  stickerless: {
    id: 'stickerless',
    name: 'Stickerless Bright',
    bodyColor: '#262b33',
    isStickerless: true,
    cubeFaces: {
      U: '#ffffff',
      D: '#fde047',
      F: '#22c55e',
      B: '#3b82f6',
      R: '#ef4444',
      L: '#fb923c',
    },
    pyraFaces: {
      U: '#fde047',
      L: '#22c55e',
      R: '#ef4444',
      B: '#3b82f6',
    },
  },
  primary: {
    id: 'primary',
    name: 'Primary Internals',
    bodyColor: '#e5dcc8',
    isStickerless: false,
    cubeFaces: {
      U: '#ffffff',
      D: '#facc15',
      F: '#16a34a',
      B: '#2563eb',
      R: '#dc2626',
      L: '#f97316',
    },
    pyraFaces: {
      U: '#facc15',
      L: '#16a34a',
      R: '#dc2626',
      B: '#2563eb',
    },
  },
  pastel: {
    id: 'pastel',
    name: 'Macaron Pastel',
    bodyColor: '#090b0e',
    isStickerless: false,
    cubeFaces: {
      U: '#f8fafc',
      D: '#fef08a',
      F: '#34d399',
      B: '#38bdf8',
      R: '#fb7185',
      L: '#fbbf24',
    },
    pyraFaces: {
      U: '#fef08a',
      L: '#34d399',
      R: '#fb7185',
      B: '#38bdf8',
    },
  },
  carbon: {
    id: 'carbon',
    name: 'Carbon Contrast',
    bodyColor: '#0b0d10',
    isStickerless: false,
    cubeFaces: {
      U: '#e2e8f0',
      D: '#eab308',
      F: '#15803d',
      B: '#1d4ed8',
      R: '#b91c1c',
      L: '#c2410c',
    },
    pyraFaces: {
      U: '#eab308',
      L: '#15803d',
      R: '#b91c1c',
      B: '#1d4ed8',
    },
  },
};

export const FACE_COLORS: Record<Face, string> = COLOR_SCHEMES.classic.cubeFaces;

export const FACE_NAMES: Record<Face, string> = {
  U: 'Up (White)',
  D: 'Down (Yellow)',
  F: 'Front (Green)',
  B: 'Back (Blue)',
  R: 'Right (Red)',
  L: 'Left (Orange)',
};

// Pyraminx types
export type PyraFace = 'U' | 'L' | 'R' | 'B'; // or Yellow, Green, Red, Blue
export const PYRA_COLORS: Record<string, string> = COLOR_SCHEMES.classic.pyraFaces;
