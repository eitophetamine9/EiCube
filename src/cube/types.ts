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

export const FACE_COLORS: Record<Face, string> = {
  U: '#f8fafc', // White
  D: '#facc15', // Yellow
  F: '#16a34a', // Green
  B: '#2563eb', // Blue
  R: '#dc2626', // Red
  L: '#ea580c', // Orange
};

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
export const PYRA_COLORS: Record<string, string> = {
  U: '#facc15', // Yellow
  L: '#16a34a', // Green
  R: '#dc2626', // Red
  B: '#2563eb', // Blue
};
