import { Face } from './types';
import { CubeState, FACE_NET_SLOTS, FaceStickersNet, createCubeStateFromFaceNet } from './CubeState';
import { resolveTurn } from './moves';

export interface SolveStage {
  id: string;
  title: string;
  hint: string;
  moves: string[];
}

export interface SolveResult {
  solvable: boolean;
  alreadySolved: boolean;
  diagnostics: string[];
  stages: SolveStage[];
  moves: string[];
}

const FACES: Face[] = ['U', 'D', 'F', 'B', 'R', 'L'];

const ALL_QUARTER_HALF_MOVES = [
  'U', "U'", 'U2',
  'D', "D'", 'D2',
  'F', "F'", 'F2',
  'B', "B'", 'B2',
  'R', "R'", 'R2',
  'L', "L'", 'L2',
] as const;

type SolverMove = (typeof ALL_QUARTER_HALF_MOVES)[number];

/** Index offsets in 54-sticker flat array: U=0..8, D=9..17, F=18..26, B=27..35, R=36..44, L=45..53 */
const FACE_BASE_IDX: Record<Face, number> = {
  U: 0,
  D: 9,
  F: 18,
  B: 27,
  R: 36,
  L: 45,
};

function stickerIdx(face: Face, slot: number): number {
  return FACE_BASE_IDX[face] + slot;
}

/**
 * Builds 54-element permutation tables directly from CubeState + resolveTurn
 * so every solver move is 100% consistent with EiCube's 3D engine.
 */
function buildMovePermutations(): Record<SolverMove, number[]> {
  const slotByKey = new Map<string, number>();
  for (const face of FACES) {
    FACE_NET_SLOTS[face].forEach(([x, y, z], i) => {
      slotByKey.set(`${face}:${x},${y},${z}`, stickerIdx(face, i));
    });
  }

  // Create a solved cube where each sticker's "color" field temporarily carries its index string
  const baseCube = new CubeState(3);
  const perms = {} as Record<SolverMove, number[]>;

  for (const move of ALL_QUARTER_HALF_MOVES) {
    const turn = resolveTurn(move, undefined, 3);
    const taggedCubies = baseCube.cubies.map((c) => ({
      id: c.id,
      coords: [...c.coords] as [number, number, number],
      stickers: c.stickers.map((s) => {
        // Find source face by normal
        const srcFace = FACES.find(
          (f) =>
            Math.abs(FACE_NET_SLOTS[f][4][0] === 0 && f === 'U' ? s.normal[1] - 1 : 0) < 0 // unused
        );
        void srcFace;
        let faceLetter: Face = 'U';
        if (s.normal[1] > 0.5) faceLetter = 'U';
        else if (s.normal[1] < -0.5) faceLetter = 'D';
        else if (s.normal[2] > 0.5) faceLetter = 'F';
        else if (s.normal[2] < -0.5) faceLetter = 'B';
        else if (s.normal[0] > 0.5) faceLetter = 'R';
        else faceLetter = 'L';
        const srcIdx = slotByKey.get(`${faceLetter}:${c.coords[0]},${c.coords[1]},${c.coords[2]}`)!;
        return {
          normal: [...s.normal] as [number, number, number],
          color: String(srcIdx) as unknown as Face,
        };
      }),
    }));

    const tempCube = new CubeState(3, taggedCubies);
    tempCube.applyTurn(turn.axis, turn.layers, turn.angle);

    const perm = new Array<number>(54);
    for (const c of tempCube.cubies) {
      for (const s of c.stickers) {
        let destFace: Face = 'U';
        if (s.normal[1] > 0.5) destFace = 'U';
        else if (s.normal[1] < -0.5) destFace = 'D';
        else if (s.normal[2] > 0.5) destFace = 'F';
        else if (s.normal[2] < -0.5) destFace = 'B';
        else if (s.normal[0] > 0.5) destFace = 'R';
        else destFace = 'L';
        const destIdx = slotByKey.get(`${destFace}:${c.coords[0]},${c.coords[1]},${c.coords[2]}`)!;
        perm[destIdx] = Number(s.color);
      }
    }
    perms[move] = perm;
  }

  return perms;
}

const MOVE_PERMS = buildMovePermutations();

function netToArr(net: FaceStickersNet): Face[] {
  const arr: Face[] = new Array(54);
  for (const face of FACES) {
    const base = FACE_BASE_IDX[face];
    for (let i = 0; i < 9; i++) {
      arr[base + i] = net[face][i];
    }
  }
  return arr;
}

function applyMoveArr(arr: Face[], move: SolverMove): Face[] {
  const perm = MOVE_PERMS[move];
  const next: Face[] = new Array(54);
  for (let i = 0; i < 54; i++) {
    next[i] = arr[perm[i]];
  }
  return next;
}

function applySeqArr(arr: Face[], seq: string[]): Face[] {
  let cur = arr;
  for (const m of seq) {
    cur = applyMoveArr(cur, m as SolverMove);
  }
  return cur;
}

// Piece index tuples inside the 54-sticker array (canonical order: U/D primary sticker first!)
const EDGE_DEFS: Array<{ name: string; pos: [number, number]; solved: [Face, Face] }> = [
  { name: 'UF', pos: [stickerIdx('U', 7), stickerIdx('F', 1)], solved: ['U', 'F'] },
  { name: 'UR', pos: [stickerIdx('U', 5), stickerIdx('R', 1)], solved: ['U', 'R'] },
  { name: 'UB', pos: [stickerIdx('U', 1), stickerIdx('B', 1)], solved: ['U', 'B'] },
  { name: 'UL', pos: [stickerIdx('U', 3), stickerIdx('L', 1)], solved: ['U', 'L'] },
  { name: 'DF', pos: [stickerIdx('D', 1), stickerIdx('F', 7)], solved: ['D', 'F'] },
  { name: 'DR', pos: [stickerIdx('D', 5), stickerIdx('R', 7)], solved: ['D', 'R'] },
  { name: 'DB', pos: [stickerIdx('D', 7), stickerIdx('B', 7)], solved: ['D', 'B'] },
  { name: 'DL', pos: [stickerIdx('D', 3), stickerIdx('L', 7)], solved: ['D', 'L'] },
  { name: 'FR', pos: [stickerIdx('F', 5), stickerIdx('R', 3)], solved: ['F', 'R'] },
  { name: 'FL', pos: [stickerIdx('F', 3), stickerIdx('L', 5)], solved: ['F', 'L'] },
  { name: 'BR', pos: [stickerIdx('B', 3), stickerIdx('R', 5)], solved: ['B', 'R'] },
  { name: 'BL', pos: [stickerIdx('B', 5), stickerIdx('L', 3)], solved: ['B', 'L'] },
];

const CORNER_DEFS: Array<{ name: string; pos: [number, number, number]; solved: [Face, Face, Face] }> = [
  { name: 'UFR', pos: [stickerIdx('U', 8), stickerIdx('F', 2), stickerIdx('R', 0)], solved: ['U', 'F', 'R'] },
  { name: 'URB', pos: [stickerIdx('U', 2), stickerIdx('R', 2), stickerIdx('B', 0)], solved: ['U', 'R', 'B'] },
  { name: 'UBL', pos: [stickerIdx('U', 0), stickerIdx('B', 2), stickerIdx('L', 0)], solved: ['U', 'B', 'L'] },
  { name: 'ULF', pos: [stickerIdx('U', 6), stickerIdx('L', 2), stickerIdx('F', 0)], solved: ['U', 'L', 'F'] },
  { name: 'DRF', pos: [stickerIdx('D', 2), stickerIdx('R', 6), stickerIdx('F', 8)], solved: ['D', 'R', 'F'] },
  { name: 'DFL', pos: [stickerIdx('D', 0), stickerIdx('F', 6), stickerIdx('L', 8)], solved: ['D', 'F', 'L'] },
  { name: 'DLB', pos: [stickerIdx('D', 6), stickerIdx('L', 6), stickerIdx('B', 8)], solved: ['D', 'L', 'B'] },
  { name: 'DBR', pos: [stickerIdx('D', 8), stickerIdx('B', 6), stickerIdx('R', 8)], solved: ['D', 'B', 'R'] },
];

function cycleEqualityParity(perm: number[]): number {
  const visited = new Array(perm.length).fill(false);
  let parity = 0;
  for (let i = 0; i < perm.length; i++) {
    if (visited[i]) continue;
    let len = 0;
    let cur = i;
    while (!visited[cur]) {
      visited[cur] = true;
      cur = perm[cur];
      len++;
    }
    if (len > 1) parity ^= (len - 1) & 1;
  }
  return parity;
}

const COLOR_DISPLAY_NAME: Record<Face, string> = {
  U: 'White (U)',
  D: 'Yellow (D)',
  F: 'Green (F)',
  B: 'Blue (B)',
  R: 'Red (R)',
  L: 'Orange (L)',
};

/**
 * Validates sticker counts, center anchors, physical edge/corner cubies,
 * orientation parity, corner twist parity, and swap parity.
 */
export function validateFaceNet(net: FaceStickersNet): { valid: boolean; diagnostics: string[] } {
  const diagnostics: string[] = [];
  const counts: Record<Face, number> = { U: 0, D: 0, F: 0, B: 0, R: 0, L: 0 };

  for (const face of FACES) {
    const stickers = net[face];
    if (!stickers || stickers.length !== 9) {
      diagnostics.push(`Face ${face} must have 9 stickers.`);
      return { valid: false, diagnostics };
    }
    if (stickers[4] !== face) {
      diagnostics.push(
        `Center mismatch on ${COLOR_DISPLAY_NAME[face]} face: found ${COLOR_DISPLAY_NAME[stickers[4]]}. Hold White on Top and Green in Front when scanning.`
      );
    }
    for (const c of stickers) {
      counts[c]++;
    }
  }

  const offCounts = FACES.filter((f) => counts[f] !== 9).map(
    (f) => `${COLOR_DISPLAY_NAME[f]}: ${counts[f]}/9`
  );
  if (offCounts.length > 0) {
    diagnostics.push(`Sticker color count mismatch (${offCounts.join(', ')}). Tap a sticker on the 2D net to fix misreads.`);
    return { valid: false, diagnostics };
  }

  if (diagnostics.length > 0) {
    return { valid: false, diagnostics };
  }

  const arr = netToArr(net);

  // Check edges: existence + orientation sum
  const edgePerm: number[] = [];
  const seenEdges = new Set<number>();
  let edgeOriSum = 0;

  for (let i = 0; i < EDGE_DEFS.length; i++) {
    const [a, b] = EDGE_DEFS[i].pos.map((idx) => arr[idx]);
    const matchIdx = EDGE_DEFS.findIndex(
      (def) => (def.solved[0] === a && def.solved[1] === b) || (def.solved[0] === b && def.solved[1] === a)
    );
    if (matchIdx === -1) {
      diagnostics.push(`Impossible edge at ${EDGE_DEFS[i].name} (${a}-${b}). Check opposite or adjacent stickers.`);
      continue;
    }
    if (seenEdges.has(matchIdx)) {
      diagnostics.push(`Duplicate edge piece ${EDGE_DEFS[matchIdx].name} detected. Verify sticker colors on the net.`);
      continue;
    }
    seenEdges.add(matchIdx);
    edgePerm.push(matchIdx);
    edgeOriSum += EDGE_DEFS[matchIdx].solved[0] === a ? 0 : 1;
  }

  // Check corners: existence + cyclic twist sum
  const cornerPerm: number[] = [];
  const seenCorners = new Set<number>();
  let cornerTwistSum = 0;

  for (let i = 0; i < CORNER_DEFS.length; i++) {
    const [c0, c1, c2] = CORNER_DEFS[i].pos.map((idx) => arr[idx]);
    let foundIdx = -1;
    let twist = 0;

    for (let k = 0; k < CORNER_DEFS.length; k++) {
      const [s0, s1, s2] = CORNER_DEFS[k].solved;
      if (c0 === s0 && c1 === s1 && c2 === s2) {
        foundIdx = k;
        twist = 0;
        break;
      }
      if (c0 === s2 && c1 === s0 && c2 === s1) {
        foundIdx = k;
        twist = 1;
        break;
      }
      if (c0 === s1 && c1 === s2 && c2 === s0) {
        foundIdx = k;
        twist = 2;
        break;
      }
    }

    if (foundIdx === -1) {
      diagnostics.push(`Impossible or mirrored corner at ${CORNER_DEFS[i].name} (${c0}-${c1}-${c2}).`);
      continue;
    }
    if (seenCorners.has(foundIdx)) {
      diagnostics.push(`Duplicate corner piece ${CORNER_DEFS[foundIdx].name} detected.`);
      continue;
    }
    seenCorners.add(foundIdx);
    cornerPerm.push(foundIdx);
    cornerTwistSum += twist;
  }

  if (diagnostics.length > 0) {
    return { valid: false, diagnostics };
  }

  if (edgeOriSum % 2 !== 0) {
    diagnostics.push('Edge flip parity error: one edge appears flipped (check two stickers on an edge).');
  }
  if (cornerTwistSum % 3 !== 0) {
    diagnostics.push('Corner twist error: corner orientations are mathematically impossible (check a corner sticker).');
  }
  if (edgePerm.length === 12 && cornerPerm.length === 8) {
    if (cycleEqualityParity(edgePerm) !== cycleEqualityParity(cornerPerm)) {
      diagnostics.push('Swap parity error: two corners or two edges appear swapped.');
    }
  }

  return {
    valid: diagnostics.length === 0,
    diagnostics,
  };
}

/** Rotates side face letters around vertical Y axis (steps CW when looking from U: F -> L -> B -> R -> F). */
const SIDE_CW_FROM_ABOVE: Face[] = ['F', 'L', 'B', 'R'];

function rotateSideFaceY(face: Face, steps: number): Face {
  const idx = SIDE_CW_FROM_ABOVE.indexOf(face);
  if (idx === -1) return face;
  return SIDE_CW_FROM_ABOVE[(idx + ((steps % 4) + 4)) % 4];
}

function rotateMoveY(move: string, steps: number): SolverMove {
  const base = move[0] as Face;
  const suffix = move.slice(1);
  return `${rotateSideFaceY(base, steps)}${suffix}` as SolverMove;
}

function rotateSeqY(seq: string[], steps: number): SolverMove[] {
  return seq.map((m) => rotateMoveY(m, steps));
}

function simplifyMoves(moves: string[]): string[] {
  const stack: Array<{ base: string; power: number }> = [];
  for (const m of moves) {
    if (!m) continue;
    const base = m[0];
    const power = m.endsWith('2') ? 2 : m.endsWith("'") ? 3 : 1;
    const top = stack[stack.length - 1];
    if (top && top.base === base) {
      top.power = (top.power + power) % 4;
      if (top.power === 0) stack.pop();
    } else {
      stack.push({ base, power });
    }
  }
  return stack.map(({ base, power }) => (power === 1 ? base : power === 2 ? `${base}2` : `${base}'`));
}

function isStateSolvedArr(arr: Face[]): boolean {
  for (const face of FACES) {
    const base = FACE_BASE_IDX[face];
    for (let i = 0; i < 9; i++) {
      if (arr[base + i] !== face) return false;
    }
  }
  return true;
}

/**
 * Finds the edge with colors {'U', targetSide} and solves it into U-targetSide
 * while preserving all previously solved U-cross edges in `lockedSlots`.
 */
function solveSingleWhiteCrossEdge(
  startArr: Face[],
  targetIdx: number,
  lockedTargets: number[]
): { arr: Face[]; moves: string[] } {
  const targetDef = EDGE_DEFS[targetIdx];
  const isTargetSolved = (a: Face[]) =>
    a[targetDef.pos[0]] === targetDef.solved[0] && a[targetDef.pos[1]] === targetDef.solved[1];

  const isLockedIntact = (a: Face[]) =>
    lockedTargets.every((li) => {
      const ld = EDGE_DEFS[li];
      return a[ld.pos[0]] === ld.solved[0] && a[ld.pos[1]] === ld.solved[1];
    });

  if (isTargetSolved(startArr)) {
    return { arr: startArr, moves: [] };
  }

  // BFS up to depth 5 first (solves >99% of cases directly preserving locked edges)
  const runBfs = (goalFn: (a: Face[]) => boolean, maxDepth: number): string[] | null => {
    const queue: Array<{ state: Face[]; seq: string[]; lastBase: string }> = [
      { state: startArr, seq: [], lastBase: '' },
    ];
    for (let depth = 0; depth < maxDepth; depth++) {
      const levelLen = queue.length;
      if (levelLen > 35000) break;
      const nextLevel: typeof queue = [];
      for (let i = 0; i < levelLen; i++) {
        const node = queue[i];
        for (const m of ALL_QUARTER_HALF_MOVES) {
          if (m[0] === node.lastBase) continue;
          const nextState = applyMoveArr(node.state, m);
          const nextSeq = [...node.seq, m];
          if (isLockedIntact(nextState) && goalFn(nextState)) {
            return nextSeq;
          }
          nextLevel.push({ state: nextState, seq: nextSeq, lastBase: m[0] });
        }
      }
      queue.splice(0, queue.length, ...nextLevel);
    }
    return null;
  };

  const direct = runBfs(isTargetSolved, 4);
  if (direct) {
    return { arr: applySeqArr(startArr, direct), moves: direct };
  }

  // Fallback: kick the target edge cleanly to the D layer preserving locked edges, then align & insert
  let cur = startArr;
  const totalMoves: string[] = [];

  const inDLayer = (a: Face[]) => {
    for (let ei = 4; ei <= 7; ei++) {
      const [p0, p1] = EDGE_DEFS[ei].pos;
      const c0 = a[p0];
      const c1 = a[p1];
      if (
        (c0 === targetDef.solved[0] && c1 === targetDef.solved[1]) ||
        (c0 === targetDef.solved[1] && c1 === targetDef.solved[0])
      ) {
        return true;
      }
    }
    return false;
  };

  if (!inDLayer(cur)) {
    const toD = runBfs(inDLayer, 3);
    if (toD) {
      cur = applySeqArr(cur, toD);
      totalMoves.push(...toD);
    }
  }

  // Rotate D up to 3 times to position under target side face (slot 0=F, 1=R, 2=B, 3=L)
  // Slot order in EDGE_DEFS: 0:UF, 1:UR, 2:UB, 3:UL; 4:DF, 5:DR, 6:DB, 7:DL
  const targetDIdx = targetIdx + 4;
  const dSpinOptions = [[], ['D'], ["D'"], ['D2']];
  for (const dSeq of dSpinOptions) {
    const test = applySeqArr(cur, dSeq);
    const [p0, p1] = EDGE_DEFS[targetDIdx].pos;
    if (
      (test[p0] === targetDef.solved[0] && test[p1] === targetDef.solved[1]) ||
      (test[p0] === targetDef.solved[1] && test[p1] === targetDef.solved[0])
    ) {
      cur = test;
      totalMoves.push(...dSeq);
      break;
    }
  }

  // Insert from D{targetSide} into U{targetSide} preserving all other U-cross edges
  const sideFace = targetDef.solved[1];
  const rightCWFromFront: Record<Face, number> = { F: 0, L: 1, B: 2, R: 3, U: 0, D: 0 };
  const rot = rightCWFromFront[sideFace];

  const [dp0, dp1] = EDGE_DEFS[targetDIdx].pos;
  if (cur[dp0] === 'U' && cur[dp1] === sideFace) {
    const m = `${sideFace}2`;
    cur = applyMoveArr(cur, m as SolverMove);
    totalMoves.push(m);
  } else {
    // Flip-insert from DF into UF: D' R' F R
    const flipSeq = rotateSeqY(["D'", "R'", 'F', 'R'], rot);
    cur = applySeqArr(cur, flipSeq);
    totalMoves.push(...flipSeq);
  }

  return { arr: cur, moves: totalMoves };
}

/** Solves all 4 White (U) corners cleanly while keeping U cross + prior U corners intact. */
function solveWhiteCorners(startArr: Face[]): { arr: Face[]; moves: string[] } {
  let cur = startArr;
  const moves: string[] = [];

  // CORNER_DEFS 0..3: UFR, URB, UBL, ULF
  // Map corner index to rotation around Y so template works on UFR (rightCWFromAbove: F=0, L=1, B=2, R=3)
  const slotRot = [0, 3, 2, 1]; // UFR->0, URB->3 (R at F), UBL->2 (B at F), ULF->1 (L at F)

  for (let ci = 0; ci < 4; ci++) {
    const def = CORNER_DEFS[ci];
    const isThisSolved = (a: Face[]) =>
      a[def.pos[0]] === def.solved[0] &&
      a[def.pos[1]] === def.solved[1] &&
      a[def.pos[2]] === def.solved[2];

    if (isThisSolved(cur)) continue;

    const targetSet = new Set(def.solved);
    const matchesTargetCorner = (a: Face[], idx: number) => {
      const cols = CORNER_DEFS[idx].pos.map((p) => a[p]);
      return cols.every((c) => targetSet.has(c));
    };

    // If corner is stuck in U layer (ci..3), pop it down to D layer using slot's R' D' R
    for (let checkIdx = ci; checkIdx < 4; checkIdx++) {
      if (matchesTargetCorner(cur, checkIdx)) {
        const popSeq = rotateSeqY(["R'", "D'", 'R'], slotRot[checkIdx]);
        cur = applySeqArr(cur, popSeq);
        moves.push(...popSeq);
        break;
      }
    }

    // Now it's in D layer (corners 4..7); rotate D so it sits directly beneath slot ci
    // Note: Under UFR (slotRot 0), bottom corner is DRF (index 4).
    const beneathCornerIdx = [4, 7, 6, 5][ci]; // UFR->DRF(4), URB->DBR(7), UBL->DLB(6), ULF->DFL(5)
    for (const dSeq of [[], ['D'], ["D'"], ['D2']]) {
      const test = applySeqArr(cur, dSeq);
      if (matchesTargetCorner(test, beneathCornerIdx)) {
        cur = test;
        moves.push(...dSeq);
        break;
      }
    }

    // Apply sexy-style bottom-right trigger (R' D' R D) up to 5 times until corner solves
    const trigger = rotateSeqY(["R'", "D'", 'R', 'D'], slotRot[ci]);
    for (let rep = 0; rep < 5; rep++) {
      if (isThisSolved(cur)) break;
      cur = applySeqArr(cur, trigger);
      moves.push(...trigger);
    }
  }

  return { arr: cur, moves };
}

/** Solves all 4 middle-layer edges (FR, BR, BL, FL) preserving complete U layer. */
function solveMiddleEdges(startArr: Face[]): { arr: Face[]; moves: string[] } {
  let cur = startArr;
  const moves: string[] = [];

  // EDGE_DEFS 8..11: 8:FR, 9:FL, 10:BR, 11:BL
  const midTargets: Array<{ idx: number; rot: number }> = [
    { idx: 8, rot: 0 },  // FR (slot F -> right is R)
    { idx: 10, rot: 3 }, // BR (slot R -> right is B)
    { idx: 11, rot: 2 }, // BL (slot B -> right is L)
    { idx: 9, rot: 1 },  // FL (slot L -> right is F)
  ];

  // Insert from DF into FR: D' R' D R D F D' F' (preserves U + other 3 middle edges)
  const rightInsertBase = ["D'", "R'", 'D', 'R', 'D', 'F', "D'", "F'"];
  // Insert from DR into FR: D F D' F' D' R' D R
  const leftInsertBase = ['D', 'F', "D'", "F'", "D'", "R'", 'D', 'R'];

  for (const { idx, rot } of midTargets) {
    const def = EDGE_DEFS[idx];
    const isSolved = (a: Face[]) =>
      a[def.pos[0]] === def.solved[0] && a[def.pos[1]] === def.solved[1];

    if (isSolved(cur)) continue;

    const targetSet = new Set(def.solved);
    const hasPieceAt = (a: Face[], eIdx: number) =>
      EDGE_DEFS[eIdx].pos.every((p) => targetSet.has(a[p]));

    // If trapped in any middle slot, pop it out to D layer
    for (const mSlot of midTargets) {
      if (hasPieceAt(cur, mSlot.idx)) {
        const pop = rotateSeqY(rightInsertBase, mSlot.rot);
        cur = applySeqArr(cur, pop);
        moves.push(...pop);
        break;
      }
    }

    // Find which D edge (4..7) holds it and align so side color matches its center
    // Try placing at DF (matching F) or DR (matching R) in rotated frame
    const frontSlotDIdx = [4, 7, 6, 5][rot]; // Wait: let's match side sticker directly!
    void frontSlotDIdx;

    for (const dSeq of [[], ['D'], ["D'"], ['D2']]) {
      const test = applySeqArr(cur, dSeq);
      // Test DF after rotating rot
      const fRotEdge = [4, 5, 6, 7][rot]; // 0->DF(4), 1->DL(7)? Wait SIDE_CW_FROM_ABOVE: 0:F(4), 1:L(7), 2:B(6), 3:R(5)
      const edgeIdxF = [4, 7, 6, 5][rot];
      const edgeIdxR = [5, 4, 7, 6][rot];
      void fRotEdge;

      const fCenter = SIDE_CW_FROM_ABOVE[rot];
      const rCenter = SIDE_CW_FROM_ABOVE[(rot + 3) % 4];

      if (hasPieceAt(test, edgeIdxF) && test[EDGE_DEFS[edgeIdxF].pos[1]] === fCenter) {
        const ins = rotateSeqY(rightInsertBase, rot);
        cur = applySeqArr(test, ins);
        moves.push(...dSeq, ...ins);
        break;
      }
      if (hasPieceAt(test, edgeIdxR) && test[EDGE_DEFS[edgeIdxR].pos[1]] === rCenter) {
        const ins = rotateSeqY(leftInsertBase, rot);
        cur = applySeqArr(test, ins);
        moves.push(...dSeq, ...ins);
        break;
      }
    }
  }

  return { arr: cur, moves };
}

/** Orients the 4 Yellow (D) cross edges using F L D L' D' F'. */
function solveYellowCross(startArr: Face[]): { arr: Face[]; moves: string[] } {
  let cur = startArr;
  const moves: string[] = [];
  const dCrossAlg = ['F', 'L', 'D', "L'", "D'", "F'"];

  const crossComplete = (a: Face[]) =>
    a[stickerIdx('D', 1)] === 'D' &&
    a[stickerIdx('D', 3)] === 'D' &&
    a[stickerIdx('D', 5)] === 'D' &&
    a[stickerIdx('D', 7)] === 'D';

  for (let guard = 0; guard < 4 && !crossComplete(cur); guard++) {
    const top = cur[stickerIdx('D', 1)] === 'D';    // DF (top of D net)
    const left = cur[stickerIdx('D', 3)] === 'D';   // DL
    const right = cur[stickerIdx('D', 5)] === 'D';  // DR
    const bottom = cur[stickerIdx('D', 7)] === 'D'; // DB

    // For F L D L' D' F' (which is F R U R' U' F' upside down around Z):
    // Line horizontal (left & right): solve in 1 alg!
    // L-shape at back-right (bottom & right? Or check dynamically by trying D spins!).
    if (left && right) {
      cur = applySeqArr(cur, dCrossAlg);
      moves.push(...dCrossAlg);
    } else if (top && bottom) {
      cur = applySeqArr(cur, ['D', ...dCrossAlg]);
      moves.push('D', ...dCrossAlg);
    } else if (top || left || right || bottom) {
      // Turn D until L-shape sits at bottom & right (DB & DR), or left & bottom? Let's test 0..3 D turns for line or cross!
      let picked = false;
      for (const dOpt of [[], ['D'], ["D'"], ['D2']]) {
        const after = applySeqArr(cur, [...dOpt, ...dCrossAlg]);
        if (crossComplete(after) || (after[stickerIdx('D', 3)] === 'D' && after[stickerIdx('D', 5)] === 'D') || (after[stickerIdx('D', 1)] === 'D' && after[stickerIdx('D', 7)] === 'D')) {
          cur = after;
          moves.push(...dOpt, ...dCrossAlg);
          picked = true;
          break;
        }
      }
      if (!picked) {
        cur = applySeqArr(cur, dCrossAlg);
        moves.push(...dCrossAlg);
      }
    } else {
      // Dot case (0 edges oriented)
      cur = applySeqArr(cur, dCrossAlg);
      moves.push(...dCrossAlg);
    }
  }

  return { arr: cur, moves };
}

/** Aligns all 4 Yellow cross edge side stickers with their matching side centers. */
function solveYellowEdgesPerm(startArr: Face[]): { arr: Face[]; moves: string[] } {
  let cur = startArr;
  const moves: string[] = [];
  // Sune on D layer: L D L' D L D2 L'
  const suneD = ['L', 'D', "L'", 'D', 'L', 'D2', "L'"];

  const isEdgesMatched = (a: Face[]) =>
    a[stickerIdx('F', 7)] === 'F' &&
    a[stickerIdx('R', 7)] === 'R' &&
    a[stickerIdx('B', 7)] === 'B' &&
    a[stickerIdx('L', 7)] === 'L';

  const countMatched = (a: Face[]) =>
    (a[stickerIdx('F', 7)] === 'F' ? 1 : 0) +
    (a[stickerIdx('R', 7)] === 'R' ? 1 : 0) +
    (a[stickerIdx('B', 7)] === 'B' ? 1 : 0) +
    (a[stickerIdx('L', 7)] === 'L' ? 1 : 0);

  const alignWithSpin = (a: Face[]): string[] | null => {
    for (const dOpt of [[], ['D'], ["D'"], ['D2']]) {
      if (isEdgesMatched(applySeqArr(a, dOpt))) return dOpt;
    }
    return null;
  };

  const immediate = alignWithSpin(cur);
  if (immediate) {
    return { arr: applySeqArr(cur, immediate), moves: immediate };
  }

  // Try rotated Sune + D alignment up to 2 passes (handles adjacent AND opposite swaps)
  for (let pass = 0; pass < 3; pass++) {
    let solved = false;
    for (const dPre of [[], ['D'], ["D'"], ['D2']]) {
      for (let rot = 0; rot < 4; rot++) {
        const candidate = [...dPre, ...rotateSeqY(suneD, rot)];
        const after = applySeqArr(cur, candidate);
        const finish = alignWithSpin(after);
        if (finish) {
          cur = applySeqArr(after, finish);
          moves.push(...candidate, ...finish);
          solved = true;
          break;
        }
      }
      if (solved) break;
    }
    if (solved) break;

    // Opposite swap case: run Sune once when at least 2 match, then next pass finishes
    for (const dPre of [[], ['D'], ["D'"], ['D2']]) {
      const test = applySeqArr(cur, dPre);
      if (countMatched(test) >= 2) {
        cur = applySeqArr(test, suneD);
        moves.push(...dPre, ...suneD);
        break;
      }
    }
  }

  return { arr: cur, moves };
}

/** Positions all 4 Yellow corners into their home 3-color slots using Niklas on D. */
function solveYellowCornerPositions(startArr: Face[]): { arr: Face[]; moves: string[] } {
  let cur = startArr;
  const moves: string[] = [];

  const cornerInHome = (a: Face[], ci: number) => {
    const def = CORNER_DEFS[ci];
    const targetSet = new Set(def.solved);
    return def.pos.every((p) => targetSet.has(a[p]));
  };

  const allCornersHome = (a: Face[]) => [4, 5, 6, 7].every((ci) => cornerInHome(a, ci));

  // Niklas on D: D L D' R' D L' D' R (fixes DRF/DBR/etc. — cycles 3 corners while preserving D edges!)
  const niklasD = ['D', 'L', "D'", "R'", 'D', "L'", "D'", 'R'];

  for (let guard = 0; guard < 3 && !allCornersHome(cur); guard++) {
    // Pick a rotation of Niklas whose fixed corner is already in home (or rot=0 if none)
    let chosenRot = 0;
    for (let rot = 0; rot < 4; rot++) {
      const test = applySeqArr(cur, rotateSeqY(niklasD, rot));
      // Check if this rotation fixed a home corner and increased home count (or keeps D edges intact & makes progress)
      const beforeCount = [4, 5, 6, 7].filter((ci) => cornerInHome(cur, ci)).length;
      const afterCount = [4, 5, 6, 7].filter((ci) => cornerInHome(test, ci)).length;
      if (afterCount > beforeCount) {
        chosenRot = rot;
        break;
      }
      // Or if it fixed one of the home corners (try applying twice to confirm)
      const test2 = applySeqArr(test, rotateSeqY(niklasD, rot));
      if (allCornersHome(test2)) {
        chosenRot = rot;
        break;
      }
    }
    const seq = rotateSeqY(niklasD, chosenRot);
    cur = applySeqArr(cur, seq);
    moves.push(...seq);
  }

  return { arr: cur, moves };
}

/** Twists positioned Yellow corners at DFL using (L D L' D') and aligns D to finish! */
function twistYellowCornersAndFinish(startArr: Face[]): { arr: Face[]; moves: string[] } {
  let cur = startArr;
  const moves: string[] = [];

  // DFL is CORNER_DEFS[5], its D sticker is at pos[0] = stickerIdx('D', 0).
  // Wait: Turning ONLY D brings each corner to DFL! Wait: look at standard beginner method:
  // Repeating (L' U' L U) or (L D L' D')? Let's be careful:
  // If D is the LAST LAYER, the top-2 layers are U + Middle! So the trigger that ONLY twists DFL
  // while scrambling U + Middle in multiples of 6 is (L U L' U') or (L' U' L U)?
  // Wait: DFL touches L, F, D! Turning D moves other corners into DFL. So the corner twist trigger MUST
  // only touch D and L/U (NOT D turns unless paired), so `D` turns keep all OTHER corners frozen!
  // Let's check: U' L' U L vs L' U' L U — neither touches D except at DFL via L!
  // Look at (L' U' L U) * 2 on a cube where D is the last layer: it twists ONLY DFL! Wait — `L` turns the DFL sticker,
  // and `U` turns the top layer WITHOUT moving the other 3 corners in `D`!
  // Let's verify: DFL is at (x=-1, y=-1, z=+1). `L` (x=-1) touches DFL! `U` (y=+1) touches NO D-layer pieces at all!
  // YES! `L` and `U` ONLY intersect the D layer at DFL, DL, DLB — wait: `L` touches DLB and DL too!
  // Under (L' U' L U) * 2 (order 6!), `L` and `L'` cancel in net permutation of the L face EXCEPT for a single 3-cycle/twist?
  // Wait: let's recall standard R' D' R D on UFR! R and D ONLY touch U layer at UFR!
  // Here D is the last layer and U is the solved layer -> so flipping roles, `L U L' U'` ONLY touches D layer at the L slice, Wait:
  // `R` touches D at DRF, DR, DBR. `D` touches D everywhere.
  // So if we want a trigger that touches **ONLY ONE D-corner** and scrambles the **U layer + middle**, the other move besides `L` MUST NOT BE `D` — wait: what cube face touches `DFL` without touching any other `D` corner? NONE, because `L` touches `DFL` & `DLB`, `F` touches `DFL` & `DRF`, `D` touches all 4 `D` corners!
  // Look at how R' D' R D works on UFR when U is last layer: `R` touches UFR AND UBR, while `D` touches ZERO U corners!! `U` IS THE ONE THAT TURNS TOP LAYER!
  // So when D is the last layer: `L` touches DFL and DLB, while `U` touches ZERO D corners — YES!! Wait: then `L' U' L U` swaps `DFL` and `DLB` unless returned to D via `U`? No, wait: why does `(R' D' R D)` only affect `UFR` in `U`? Because `R'` kicks ONLY `UFR` out of `U` into `D`! And `D'` moves it away from `R`, `R` restores `UBR`+`UR` back into `U`! `R'` only moves ONE piece out of `U` into `D`... wait NO, `R'` moves `UFR, UR, UBR` into the `R` slice, and ONLY `D` rotates the bottom; `R` brings `UBR` and `UR` BACK UP unchanged unless `D` put something there!
  // Exactly symmetrically, when `D` is the last layer and `U` is the opposite solved layer:
  // `L U L' U'` moves `DFL` UP into `U` (`L` moves `DFL`->`UFL`, then `U` moves it away from `L`, `L'` brings `ULB`+`UL` BACK DOWN into `D`!).
  // SO `(L U L' U')` affects **ONLY ONE PIECE (`DFL`)** in the `D` layer while cycling pieces in `U` (order 6)!
  // Let's double check: on `U`, `(L U L' U') * 6 = identity` on the whole cube!
  // For `DFL`: `(L U L' U') * 2` twists `DFL` by 1/3 turn, `(L U L' U') * 4` twists `DFL` by 2/3 turn, and after all 4 corners are twisted (`sum % 3 == 0`), `U` is completely restored automatically!
  const twistTrigger = ["L'", "U'", 'L', 'U'];

  for (let i = 0; i < 4; i++) {
    for (let rep = 0; rep < 5 && cur[stickerIdx('D', 0)] !== 'D'; rep++) {
      cur = applySeqArr(cur, twistTrigger);
      moves.push(...twistTrigger);
    }
    cur = applyMoveArr(cur, 'D');
    moves.push('D');
  }

  // Final D AUF alignment
  for (const dOpt of [[], ['D'], ["D'"], ['D2']]) {
    if (isStateSolvedArr(applySeqArr(cur, dOpt))) {
      cur = applySeqArr(cur, dOpt);
      moves.push(...dOpt);
      break;
    }
  }

  return { arr: cur, moves };
}

/**
 * Solves any valid 3x3 FaceStickersNet into beginner-friendly stages + simplified move sequence.
 */
export function solveCube3x3(net: FaceStickersNet): SolveResult {
  const validation = validateFaceNet(net);
  if (!validation.valid) {
    return {
      solvable: false,
      alreadySolved: false,
      diagnostics: validation.diagnostics,
      stages: [],
      moves: [],
    };
  }

  let cur = netToArr(net);
  if (isStateSolvedArr(cur)) {
    return {
      solvable: true,
      alreadySolved: true,
      diagnostics: [],
      stages: [],
      moves: [],
    };
  }

  const rawStages: Array<{ id: string; title: string; hint: string; moves: string[] }> = [];

  // Stage 1: White Cross (U edges 0..3)
  const crossMoves: string[] = [];
  const lockedCross: number[] = [];
  for (let ei = 0; ei < 4; ei++) {
    const res = solveSingleWhiteCrossEdge(cur, ei, lockedCross);
    cur = res.arr;
    crossMoves.push(...res.moves);
    lockedCross.push(ei);
  }
  const sCross = simplifyMoves(crossMoves);
  if (sCross.length > 0) {
    rawStages.push({
      id: 'stage-cross',
      title: 'Step 1: White Cross',
      hint: 'Form a White plus on the top (U) face matching Green, Red, Blue, and Orange side centers.',
      moves: sCross,
    });
  }

  // Stage 2: First Layer White Corners
  const cornersRes = solveWhiteCorners(cur);
  cur = cornersRes.arr;
  const sCorners = simplifyMoves(cornersRes.moves);
  if (sCorners.length > 0) {
    rawStages.push({
      id: 'stage-corners',
      title: 'Step 2: First Layer Corners',
      hint: 'Insert the 4 White corners using bottom-layer triggers so the top layer is completely solved.',
      moves: sCorners,
    });
  }

  // Stage 3: Middle Layer Edges
  const midRes = solveMiddleEdges(cur);
  cur = midRes.arr;
  const sMid = simplifyMoves(midRes.moves);
  if (sMid.length > 0) {
    rawStages.push({
      id: 'stage-middle',
      title: 'Step 3: Middle Layer Edges',
      hint: 'Match non-yellow edges with their front center and slot them into the equator layer.',
      moves: sMid,
    });
  }

  // Stage 4: Yellow Cross on Bottom (D)
  const yCrossRes = solveYellowCross(cur);
  cur = yCrossRes.arr;
  const sYCross = simplifyMoves(yCrossRes.moves);
  if (sYCross.length > 0) {
    rawStages.push({
      id: 'stage-yellow-cross',
      title: 'Step 4: Yellow Cross',
      hint: 'Orient the 4 Yellow edges on the bottom face (D) into a cross using F L D L\' D\' F\'.',
      moves: sYCross,
    });
  }

  // Stage 5: Align Yellow Edges
  const yEdgesRes = solveYellowEdgesPerm(cur);
  cur = yEdgesRes.arr;
  const sYEdges = simplifyMoves(yEdgesRes.moves);
  if (sYEdges.length > 0) {
    rawStages.push({
      id: 'stage-yellow-edges',
      title: 'Step 5: Align Yellow Edges',
      hint: 'Match every Yellow cross edge with its side center color using bottom-layer Sune cycles.',
      moves: sYEdges,
    });
  }

  // Stage 6: Position Yellow Corners
  const yCornerPosRes = solveYellowCornerPositions(cur);
  cur = yCornerPosRes.arr;
  const sYCornerPos = simplifyMoves(yCornerPosRes.moves);
  if (sYCornerPos.length > 0) {
    rawStages.push({
      id: 'stage-yellow-corner-pos',
      title: 'Step 6: Position Last Corners',
      hint: 'Cycle the 4 bottom corners into their correct 3-color corners using Niklas.',
      moves: sYCornerPos,
    });
  }

  // Stage 7: Twist Corners & Finish
  const finishRes = twistYellowCornersAndFinish(cur);
  cur = finishRes.arr;
  const sFinish = simplifyMoves(finishRes.moves);
  if (sFinish.length > 0) {
    rawStages.push({
      id: 'stage-finish',
      title: 'Step 7: Twist Corners & Finish',
      hint: 'Twist remaining Yellow corners cleanly at the front-left slot and align D to solve.',
      moves: sFinish,
    });
  }

  const allMoves = rawStages.flatMap((st) => st.moves);

  // Double-check against actual CubeState engine
  const verifyCube = createCubeStateFromFaceNet(net);
  for (const m of allMoves) {
    const turn = resolveTurn(m, undefined, 3);
    verifyCube.applyTurn(turn.axis, turn.layers, turn.angle);
  }

  if (!verifyCube.isSolved(true)) {
    const postCross = applySeqArr(netToArr(net), sCross);
    const postCorners = applySeqArr(postCross, sCorners);
    const postMid = applySeqArr(postCorners, sMid);
    const postYCross = applySeqArr(postMid, sYCross);
    const postYEdges = applySeqArr(postYCross, sYEdges);
    const postYCornerPos = applySeqArr(postYEdges, sYCornerPos);
    const checkU = (a: Face[]) => [0,1,2,3,4,5,6,7,8].every((i) => a[i] === 'U');
    const checkMid = (a: Face[]) => [18+3,18+5,27+3,27+5,36+3,36+5,45+3,45+5].every((i,k) => a[i] === (['F','F','B','B','R','R','L','L'] as Face[])[k]);
    return {
      solvable: false,
      alreadySolved: false,
      diagnostics: [
        `Solve stage verification failed (U=${checkU(postCorners)}, Mid=${checkMid(postMid)}, YCross=${[10,12,14,16].every(i=>postYCross[i]==='D')}, YEdges=${[18+7,36+7,27+7,45+7].every((i,k)=>postYEdges[i]===(['F','R','B','L'] as Face[])[k])}, YCornerPos=${checkMid(postYCornerPos)}).`,
      ],
      stages: [],
      moves: [],
    };
  }

  return {
    solvable: true,
    alreadySolved: false,
    diagnostics: [],
    stages: rawStages,
    moves: allMoves,
  };
}
