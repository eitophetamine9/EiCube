import { Face, Axis, ResolvedTurn, FaceOrientationMap } from './types';

export interface MoveDefinition {
  axis: Axis;
  layers: number[];
  baseAngle: number; // angle for single clockwise turn
}

/**
 * Standard WCA angle convention:
 * Clockwise rotation looking from outside the face toward the center.
 * R: normal [1,0,0], turns around X with angle -pi/2
 * L: normal [-1,0,0], turns around X with angle +pi/2 (since opposite normal)
 * U: normal [0,1,0], turns around Y with angle -pi/2
 * D: normal [0,-1,0], turns around Y with angle +pi/2
 * F: normal [0,0,1], turns around Z with angle -pi/2
 * B: normal [0,0,-1], turns around Z with angle +pi/2
 */
export function getFaceMoveDefinition(face: Face, size: number = 3): MoveDefinition {
  const maxCoord = (size - 1) / 2;
  switch (face) {
    case 'R':
      return { axis: 'x', layers: [maxCoord], baseAngle: -Math.PI / 2 };
    case 'L':
      return { axis: 'x', layers: [-maxCoord], baseAngle: Math.PI / 2 };
    case 'U':
      return { axis: 'y', layers: [maxCoord], baseAngle: -Math.PI / 2 };
    case 'D':
      return { axis: 'y', layers: [-maxCoord], baseAngle: Math.PI / 2 };
    case 'F':
      return { axis: 'z', layers: [maxCoord], baseAngle: -Math.PI / 2 };
    case 'B':
      return { axis: 'z', layers: [-maxCoord], baseAngle: Math.PI / 2 };
  }
}

/**
 * Resolves a move (standard or view-relative) into physical turn parameters:
 * axis, active layer indices, and rotation angle.
 */
export function resolveTurn(
  moveNotation: string,
  faceMap?: FaceOrientationMap,
  size: number = 3
): ResolvedTurn {
  const clean = moveNotation.trim();
  const maxCoord = (size - 1) / 2;

  // Extract base and suffix
  let base = clean;
  let suffix = '';
  if (clean.endsWith("2'") || clean.endsWith("'2") || clean.endsWith('2')) {
    suffix = '2';
    base = clean.replace(/2'?|'2/, '');
  } else if (clean.endsWith("'")) {
    suffix = "'";
    base = clean.slice(0, -1);
  }

  // Multiplier for angle: regular = 1, prime = -1, double = 2
  const multiplier = suffix === "'" ? -1 : suffix === '2' ? 2 : 1;

  // Check if standard face move (R, L, U, D, F, B)
  const faceUpper = base.toUpperCase();
  const isFace = ['R', 'L', 'U', 'D', 'F', 'B'].includes(faceUpper);
  const isWide = ['r', 'l', 'u', 'd', 'f', 'b'].includes(base) || (base.length === 2 && base.endsWith('w'));
  const isSlice = ['M', 'E', 'S'].includes(base.toUpperCase());
  const isRotation = ['x', 'y', 'z'].includes(base.toLowerCase());

  // Determine which target face to act on
  let targetFace: Face = 'F';

  if (isFace || isWide) {
    const rawFace = (isWide && base.endsWith('w') ? base[0].toUpperCase() : base.toUpperCase()) as Face;
    targetFace = faceMap ? faceMap[rawFace] : rawFace;
  }

  // Wide moves: 2 layers
  if (isWide) {
    const faceDef = getFaceMoveDefinition(targetFace, size);
    // Include the center layer (0) along with the outer layer
    const wideLayers = faceDef.layers.concat([0]);
    return {
      axis: faceDef.axis,
      layers: wideLayers,
      angle: faceDef.baseAngle * multiplier,
      notation: clean,
      viewFace: targetFace,
    };
  }

  // Standard Face move
  if (isFace) {
    const faceDef = getFaceMoveDefinition(targetFace, size);
    return {
      axis: faceDef.axis,
      layers: faceDef.layers,
      angle: faceDef.baseAngle * multiplier,
      notation: clean,
      viewFace: targetFace,
    };
  }

  // Slice moves:
  // M follows L (between L and R)
  // E follows D (between D and U)
  // S follows F (between F and B)
  if (isSlice) {
    const sliceChar = base.toUpperCase();
    let refFace: Face = 'L';
    if (sliceChar === 'M') {
      refFace = faceMap ? faceMap['L'] : 'L';
    } else if (sliceChar === 'E') {
      refFace = faceMap ? faceMap['D'] : 'D';
    } else if (sliceChar === 'S') {
      refFace = faceMap ? faceMap['F'] : 'F';
    }

    const faceDef = getFaceMoveDefinition(refFace, size);
    return {
      axis: faceDef.axis,
      layers: [0], // middle slice
      angle: faceDef.baseAngle * multiplier,
      notation: clean,
      viewFace: refFace,
    };
  }

  // Whole cube rotations:
  // x follows R
  // y follows U
  // z follows F
  if (isRotation) {
    const rotChar = base.toLowerCase();
    let refFace: Face = 'R';
    if (rotChar === 'x') {
      refFace = faceMap ? faceMap['R'] : 'R';
    } else if (rotChar === 'y') {
      refFace = faceMap ? faceMap['U'] : 'U';
    } else if (rotChar === 'z') {
      refFace = faceMap ? faceMap['F'] : 'F';
    }

    const faceDef = getFaceMoveDefinition(refFace, size);
    // All layers
    const allLayers: number[] = [];
    for (let i = 0; i < size; i++) {
      allLayers.push(i - maxCoord);
    }

    return {
      axis: faceDef.axis,
      layers: allLayers,
      angle: faceDef.baseAngle * multiplier,
      notation: clean,
      viewFace: refFace,
    };
  }

  // Fallback to F
  const fallbackDef = getFaceMoveDefinition('F', size);
  return {
    axis: fallbackDef.axis,
    layers: fallbackDef.layers,
    angle: fallbackDef.baseAngle * multiplier,
    notation: clean,
  };
}
