import { Face, Vector3Tuple, CameraVectors, FaceOrientationMap, FACE_NORMALS } from './types';

function dotProduct(a: Vector3Tuple, b: Vector3Tuple): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

/**
 * Resolves camera orientation to cube faces.
 *
 * View relative semantics:
 * - 'F': Face pointing toward camera (largest dot with forwardTowardCamera vector)
 * - 'B': Face pointing away from camera (-F)
 * - 'U': Top face (largest dot with camera Up, among remaining 4 faces perpendicular to F)
 * - 'D': Bottom face (-U)
 * - 'R': Right face (largest dot with camera Right, among remaining 2 faces perpendicular to F and U)
 * - 'L': Left face (-R)
 */
export function resolveCameraFaces(cam: CameraVectors): FaceOrientationMap {
  const allFaces: Face[] = ['U', 'D', 'F', 'B', 'R', 'L'];

  // 1. Find F (face normal pointing most directly toward camera)
  let bestF: Face = 'F';
  let maxDotF = -Infinity;
  for (const face of allFaces) {
    const dot = dotProduct(FACE_NORMALS[face], cam.forwardTowardCamera);
    if (dot > maxDotF) {
      maxDotF = dot;
      bestF = face;
    }
  }

  // Opposite face of F is B
  const oppositeMap: Record<Face, Face> = {
    U: 'D',
    D: 'U',
    F: 'B',
    B: 'F',
    R: 'L',
    L: 'R',
  };
  const bestB = oppositeMap[bestF];

  // 2. Find U among remaining 4 faces perpendicular to F
  const remainingForU = allFaces.filter((f) => f !== bestF && f !== bestB);
  let bestU = remainingForU[0];
  let maxDotU = -Infinity;
  for (const face of remainingForU) {
    const dot = dotProduct(FACE_NORMALS[face], cam.up);
    if (dot > maxDotU) {
      maxDotU = dot;
      bestU = face;
    }
  }
  const bestD = oppositeMap[bestU];

  // 3. Find R among remaining 2 faces
  const remainingForR = remainingForU.filter((f) => f !== bestU && f !== bestD);
  let bestR = remainingForR[0];
  let maxDotR = -Infinity;
  for (const face of remainingForR) {
    const dot = dotProduct(FACE_NORMALS[face], cam.right);
    if (dot > maxDotR) {
      maxDotR = dot;
      bestR = face;
    }
  }
  const bestL = oppositeMap[bestR];

  return {
    F: bestF,
    B: bestB,
    U: bestU,
    D: bestD,
    R: bestR,
    L: bestL,
  };
}
