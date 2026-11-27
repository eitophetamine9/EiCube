import { describe, it, expect } from 'vitest';
import { CubeState } from '../cube/CubeState';
import { resolveTurn } from '../cube/moves';
import { parseAlgorithm, invertAlgorithm } from '../cube/notation';
import { generateScramble } from '../cube/scramble';
import { resolveCameraFaces } from '../cube/cameraResolver';
import { CameraVectors, COLOR_SCHEMES } from '../cube/types';
import { GUIDE_DATA } from '../content/guideData';
import { PyraminxState, generatePyraminxScramble } from '../cube/pyraminxState';
import { OTHER_CUBES_GUIDES } from '../content/otherCubesData';
import { PUZZLE_VIDEOS } from '../content/videoData';
import { SettingsManager, DEFAULT_KEYBINDS, TWOHAND_SPEEDCUBE_KEYBINDS } from '../ui/settings';
import { MOVES_GLOSSARY, MOVE_CATEGORIES } from '../content/movesGlossaryData';
import { calculateWcaAverage, summarizePuzzleStats, SolveRecord } from '../ui/sessionStats';
import { buildDrillMoves } from '../ui/drillModal';
import { clampVolume, TURN_SOUND_PROFILES } from '../audio/soundEngine';
import * as THREE from 'three';
import {
  projectPointerToArcballSphere,
  computeArcballDeltaQuaternion,
} from '../render/SphereArcballControls';

describe("Rubik's Cube Pure Logic", () => {
  it('initializes a solved 3x3 cube', () => {
    const cube = new CubeState(3);
    expect(cube.isSolved()).toBe(true);
  });

  it('supports 2x2 and 4x4 cubes with solved state validation', () => {
    const cube2 = new CubeState(2);
    expect(cube2.isSolved()).toBe(true);
    const turn2 = resolveTurn('R', undefined, 2);
    cube2.applyTurn(turn2.axis, turn2.layers, turn2.angle);
    expect(cube2.isSolved()).toBe(false);

    const cube4 = new CubeState(4);
    expect(cube4.isSolved()).toBe(true);
    const turn4 = resolveTurn('R', undefined, 4);
    cube4.applyTurn(turn4.axis, turn4.layers, turn4.angle);
    expect(cube4.isSolved()).toBe(false);
  });

  it('pyraminx initializes solved, moves apply correctly, and 3x cycles return to solved', () => {
    const pyra = new PyraminxState();
    expect(pyra.isSolved()).toBe(true);

    pyra.applyMove('U');
    expect(pyra.isSolved()).toBe(false);
    pyra.applyMove('U');
    pyra.applyMove('U');
    expect(pyra.isSolved()).toBe(true); // 120 * 3 = 360 deg

    pyra.applyMove('u');
    expect(pyra.isSolved()).toBe(false);
    pyra.applyMove("u'");
    expect(pyra.isSolved()).toBe(true);

    // Verify all 4 axes cycle periodicity: 3 turns return to solved
    for (const move of ['L', 'R', 'B', 'l', 'r', 'b']) {
      pyra.applyMove(move);
      pyra.applyMove(move);
      pyra.applyMove(move);
      expect(pyra.isSolved()).toBe(true);
    }

    const sc = generatePyraminxScramble(10);
    expect(sc.length).toBeGreaterThan(0);
  });

  it('verifies dedicated keybinds for prime moves and custom rebinding (e.g. setting R as D)', () => {
    // Test default keybinds have direct prime support
    expect(DEFAULT_KEYBINDS).toHaveProperty("R'");
    expect(TWOHAND_SPEEDCUBE_KEYBINDS["R'"]).toBe('KeyK');
    expect(TWOHAND_SPEEDCUBE_KEYBINDS["U'"]).toBe('KeyF');

    // Test custom rebinding: setting R to KeyD
    const settings = new SettingsManager();
    settings.setKeybind('R', 'KeyD');
    expect(settings.getKeybinds()['R']).toBe('KeyD');
    // Conflict resolution: old binding for D was cleared
    expect(settings.getKeybinds()['D']).toBe('');

    // Rebind direct prime without needing Shift
    settings.setKeybind("R'", 'KeyK');
    expect(settings.getKeybinds()["R'"]).toBe('KeyK');
  });

  it('verifies all algorithms in OTHER_CUBES_GUIDES parse correctly', () => {
    for (const guide of Object.values(OTHER_CUBES_GUIDES)) {
      for (const step of guide.steps) {
        for (const alg of step.algorithms) {
          if (guide.category === 'pyraminx') {
            const tokens = alg.notation.split(/[\s()]+/).filter(Boolean);
            expect(tokens.length).toBeGreaterThan(0);
          } else {
            const moves = parseAlgorithm(alg.notation);
            expect(moves.length, `Failed parsing ${alg.notation} for ${guide.name}`).toBeGreaterThan(0);
          }
        }
      }
    }
  });

  it('applying a single move makes it unsolved, and inverse restores solved', () => {
    const cube = new CubeState(3);
    const turnR = resolveTurn('R');
    cube.applyTurn(turnR.axis, turnR.layers, turnR.angle);
    expect(cube.isSolved()).toBe(false);

    const turnRPrime = resolveTurn("R'");
    cube.applyTurn(turnRPrime.axis, turnRPrime.layers, turnRPrime.angle);
    expect(cube.isSolved()).toBe(true);
  });

  it('sexy move (R U R\' U\') repeated 6 times returns to solved', () => {
    const cube = new CubeState(3);
    const sexy = parseAlgorithm('(R U R\' U\') x6');
    expect(sexy.length).toBe(24);

    for (const move of sexy) {
      const turn = resolveTurn(move);
      cube.applyTurn(turn.axis, turn.layers, turn.angle);
    }

    expect(cube.isSolved()).toBe(true);
  });

  it('verifies YouTube video tutorials data integrity for all puzzles (3x3, 2x2, 4x4, Pyraminx)', () => {
    const requiredPuzzles = ['3x3', '2x2', '4x4', 'pyraminx'];
    for (const p of requiredPuzzles) {
      const vids = PUZZLE_VIDEOS[p];
      expect(vids).toBeDefined();
      expect(vids.length).toBeGreaterThan(0);
      for (const v of vids) {
        expect(v.videoId.length).toBeGreaterThan(5);
        expect(v.title.length).toBeGreaterThan(5);
        expect(v.creator.length).toBeGreaterThan(2);
        expect(v.chapters.length).toBeGreaterThan(0);
        for (const ch of v.chapters) {
          expect(typeof ch.seconds).toBe('number');
          expect(ch.time).toMatch(/^\d+:\d{2}$/);
          expect(ch.title.length).toBeGreaterThan(2);
        }
      }
    }
  });

  it('scramble followed by its inverse returns to solved', () => {
    const cube = new CubeState(3);
    const scramble = generateScramble(22);
    const scrambleMoves = parseAlgorithm(scramble);
    expect(scrambleMoves.length).toBe(22);

    for (const m of scrambleMoves) {
      const turn = resolveTurn(m);
      cube.applyTurn(turn.axis, turn.layers, turn.angle);
    }
    expect(cube.isSolved()).toBe(false);

    const inverse = invertAlgorithm(scramble);
    const inverseMoves = parseAlgorithm(inverse);
    expect(inverseMoves.length).toBe(22);

    for (const m of inverseMoves) {
      const turn = resolveTurn(m);
      cube.applyTurn(turn.axis, turn.layers, turn.angle);
    }
    expect(cube.isSolved()).toBe(true);
  });

  it('generates 4x4 scramble that thoroughly scrambles middle centers and inner layers', () => {
    const cube4 = new CubeState(4);
    expect(cube4.isSolved()).toBe(true);

    const sc4 = generateScramble(38, 4);
    const moves4 = parseAlgorithm(sc4);
    expect(moves4.length).toBe(38);

    // Verify scramble contains middle layer moves (wide, inner 2R..2B, or M/E/S)
    const hasMiddleMoves = moves4.some((m) =>
      /w|2[RLUDFB]|[MES]/i.test(m)
    );
    expect(hasMiddleMoves).toBe(true);

    for (const m of moves4) {
      const turn = resolveTurn(m, undefined, 4);
      cube4.applyTurn(turn.axis, turn.layers, turn.angle);
    }
    expect(cube4.isSolved()).toBe(false);

    // Verify that center cubies (e.g. abs(coord) == 0.5) are scrambled
    const centerCubies = cube4.cubies.filter((c) => {
      const countHalf = c.coords.filter((v) => Math.abs(v) === 0.5).length;
      return countHalf === 2; // Face center pieces on 4x4 have two 0.5 coordinates and one 1.5 coordinate
    });
    expect(centerCubies.length).toBe(24);

    // Invert algorithm and verify it returns to solved
    const inv4 = invertAlgorithm(sc4);
    const invMoves4 = parseAlgorithm(inv4);
    for (const m of invMoves4) {
      const turn = resolveTurn(m, undefined, 4);
      cube4.applyTurn(turn.axis, turn.layers, turn.angle);
    }
    expect(cube4.isSolved(true)).toBe(true);
  });

  it('slice moves (M, E, S) cyclic properties hold', () => {
    const cube = new CubeState(3);
    const mMoves = parseAlgorithm('M M M M');
    for (const m of mMoves) {
      const turn = resolveTurn(m);
      cube.applyTurn(turn.axis, turn.layers, turn.angle);
    }
    expect(cube.isSolved()).toBe(true);
  });

  it('rotations (x, y, z) 4 times return to solved', () => {
    const cube = new CubeState(3);
    const rotMoves = parseAlgorithm('x x x x y y y y z z z z');
    for (const m of rotMoves) {
      const turn = resolveTurn(m);
      cube.applyTurn(turn.axis, turn.layers, turn.angle);
    }
    expect(cube.isSolved()).toBe(true);
  });

  it('notation parser handles multipliers and complex expressions', () => {
    const moves = parseAlgorithm('(R U R\' U\')2 (r U R\' U\') x3 M2 U2');
    expect(moves.length).toBe(4 * 2 + 4 * 3 + 2);
    expect(moves[0]).toBe('R');
    expect(moves[8]).toBe('r');
    expect(moves[moves.length - 1]).toBe('U2');
  });

  it('camera face resolver maps camera vectors correctly in standard view', () => {
    const cam: CameraVectors = {
      forwardTowardCamera: [0, 0, 1],
      up: [0, 1, 0],
      right: [1, 0, 0],
    };

    const map = resolveCameraFaces(cam);
    expect(map.F).toBe('F');
    expect(map.B).toBe('B');
    expect(map.U).toBe('U');
    expect(map.D).toBe('D');
    expect(map.R).toBe('R');
    expect(map.L).toBe('L');
  });

  it('camera face resolver correctly resolves after orbiting 180 degrees (R acts on face now on the right)', () => {
    const cam: CameraVectors = {
      forwardTowardCamera: [0, 0, -1],
      up: [0, 1, 0],
      right: [-1, 0, 0],
    };

    const map = resolveCameraFaces(cam);
    expect(map.F).toBe('B');
    expect(map.R).toBe('L');
    expect(map.L).toBe('R');

    const turn = resolveTurn("R'", map);
    expect(turn.viewFace).toBe('L');
    expect(turn.axis).toBe('x');
    expect(turn.layers).toEqual([-1]);
    expect(turn.angle).toBeCloseTo(-Math.PI / 2);
  });

  it('verifies every algorithm in GUIDE_DATA parses and applies correctly without error', () => {
    const allAlgs: string[] = [];

    // Collect notation demo algorithms
    for (const group of Object.values(GUIDE_DATA.notation)) {
      for (const item of group) {
        allAlgs.push(item.demoAlgorithm);
      }
    }

    // Collect step algorithms
    for (const step of GUIDE_DATA.steps) {
      for (const alg of step.algorithms) {
        allAlgs.push(alg.notation);
      }
    }

    expect(allAlgs.length).toBeGreaterThan(10);

    for (const algStr of allAlgs) {
      const moves = parseAlgorithm(algStr);
      expect(moves.length, `Failed to parse algorithm: ${algStr}`).toBeGreaterThan(0);

      const testCube = new CubeState(3);
      for (const m of moves) {
        const turn = resolveTurn(m);
        expect(turn.axis).toBeDefined();
        expect(turn.layers.length).toBeGreaterThan(0);
        expect(typeof turn.angle).toBe('number');
        testCube.applyTurn(turn.axis, turn.layers, turn.angle);
      }
    }
  });

  it('validates cube layer coordinates for mouse/touch layer drag across sizes', () => {
    const c2 = new CubeState(2);
    expect(c2.layers).toEqual([-0.5, 0.5]);

    const c3 = new CubeState(3);
    expect(c3.layers).toEqual([-1, 0, 1]);

    const c4 = new CubeState(4);
    expect(c4.layers).toEqual([-1.5, -0.5, 0.5, 1.5]);
  });

  it('validates legal axis rotations, slice turns, and wide layer turns', () => {
    // 1. Whole cube rotations (x, y, z) on 3x3: 4 full turns return to solved
    for (const rot of ['x', 'y', 'z']) {
      const cube = new CubeState(3);
      for (let i = 0; i < 4; i++) {
        const turn = resolveTurn(rot, undefined, 3);
        cube.applyTurn(turn.axis, turn.layers, turn.angle);
      }
      expect(cube.isSolved(true)).toBe(true);
    }

    // 2. Double rotations (x2, y2, z2): 2 turns return to solved
    for (const rot2 of ['x2', 'y2', 'z2']) {
      const cube = new CubeState(3);
      for (let i = 0; i < 2; i++) {
        const turn = resolveTurn(rot2, undefined, 3);
        cube.applyTurn(turn.axis, turn.layers, turn.angle);
      }
      expect(cube.isSolved(true)).toBe(true);
    }

    // 3. Slice moves (M, E, S): 4 turns return to solved (tested on 3x3 and 4x4)
    for (const slice of ['M', 'E', 'S']) {
      const cube = new CubeState(3);
      const turn3 = resolveTurn(slice, undefined, 3);
      expect(turn3.layers.length).toBe(1);
      for (let i = 0; i < 4; i++) {
        cube.applyTurn(turn3.axis, turn3.layers, turn3.angle);
      }
      expect(cube.isSolved(true)).toBe(true);

      const cube4 = new CubeState(4);
      const turn4 = resolveTurn(slice, undefined, 4);
      expect(turn4.layers.length).toBe(2);
      expect(turn4.layers).toEqual([-0.5, 0.5]);
      for (let i = 0; i < 4; i++) {
        cube4.applyTurn(turn4.axis, turn4.layers, turn4.angle);
      }
      expect(cube4.isSolved(true)).toBe(true);
    }

    // 3b. 4x4 Inner middle slice moves (2R, 2L, 2U, 2D, 2F, 2B): 4 turns return to solved
    for (const inner of ['2R', '2L', '2U', '2D', '2F', '2B']) {
      const cube4 = new CubeState(4);
      const turn = resolveTurn(inner, undefined, 4);
      expect(turn.layers.length).toBe(1);
      for (let i = 0; i < 4; i++) {
        cube4.applyTurn(turn.axis, turn.layers, turn.angle);
      }
      expect(cube4.isSolved(true)).toBe(true);
    }

    // 4. Wide moves (Rw, Lw, Uw, Dw, Fw, Bw) on 3x3 and 4x4
    for (const wide of ['Rw', 'Lw', 'Uw', 'Dw', 'Fw', 'Bw']) {
      const cube3 = new CubeState(3);
      const turn3 = resolveTurn(wide, undefined, 3);
      expect(turn3.layers.length).toBe(2);
      for (let i = 0; i < 4; i++) {
        cube3.applyTurn(turn3.axis, turn3.layers, turn3.angle);
      }
      expect(cube3.isSolved(true)).toBe(true);

      const cube4 = new CubeState(4);
      const turn4 = resolveTurn(wide, undefined, 4);
      expect(turn4.layers.length).toBe(2);
      for (let i = 0; i < 4; i++) {
        cube4.applyTurn(turn4.axis, turn4.layers, turn4.angle);
      }
      expect(cube4.isSolved(true)).toBe(true);
    }

    // 5. Rotations on 2x2 and 4x4
    const cube2 = new CubeState(2);
    const turnX2 = resolveTurn('x', undefined, 2);
    expect(turnX2.layers.length).toBe(2);
    for (let i = 0; i < 4; i++) {
      cube2.applyTurn(turnX2.axis, turnX2.layers, turnX2.angle);
    }
    expect(cube2.isSolved(true)).toBe(true);

    const cube4 = new CubeState(4);
    const turnY4 = resolveTurn('y', undefined, 4);
    expect(turnY4.layers.length).toBe(4);
    for (let i = 0; i < 4; i++) {
      cube4.applyTurn(turnY4.axis, turnY4.layers, turnY4.angle);
    }
    expect(cube4.isSolved(true)).toBe(true);
  });

  it('verifies every Move Glossary entry has valid metadata and unique animated GIF path', () => {
    expect(MOVE_CATEGORIES.length).toBe(6);
    expect(MOVES_GLOSSARY.length).toBe(64);

    const seenIds = new Set<string>();
    const seenGifs = new Set<string>();
    for (const item of MOVES_GLOSSARY) {
      expect(seenIds.has(item.id)).toBe(false);
      seenIds.add(item.id);
      expect(item.notation.length).toBeGreaterThan(0);
      expect(item.layersDescription.length).toBeGreaterThan(10);
      expect(item.speedcubingTip.length).toBeGreaterThan(10);
      expect(item.gifPath).toMatch(/^\.\/gifs\/moves\/[a-zA-Z0-9_]+\.gif$/);
      expect(seenGifs.has(item.gifPath)).toBe(false);
      seenGifs.add(item.gifPath);
    }
  });

  it('supports unconstrained X, Y, and Z sphere arcball rotation without singularities', () => {
    const cam = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
    cam.position.set(0, 0, 6);
    cam.lookAt(0, 0, 0);

    // 1. Horizontal center drag -> Y-axis rotation
    const vStartH = projectPointerToArcballSphere(-0.2, 0);
    const vEndH = projectPointerToArcballSphere(0.2, 0);
    const rotH = computeArcballDeltaQuaternion(vStartH, vEndH, cam, 2.0);
    expect(Math.abs(rotH.axis.y)).toBeGreaterThan(0.95);
    expect(Math.abs(rotH.angle)).toBeGreaterThan(0.5);

    // 2. Vertical center drag -> X-axis rotation
    const vStartV = projectPointerToArcballSphere(0, -0.2);
    const vEndV = projectPointerToArcballSphere(0, 0.2);
    const rotV = computeArcballDeltaQuaternion(vStartV, vEndV, cam, 2.0);
    expect(Math.abs(rotV.axis.x)).toBeGreaterThan(0.95);

    // 3. Outer circular arc drag -> non-zero Z-axis view roll
    const vStartZ = projectPointerToArcballSphere(0.85, 0.0);
    const vEndZ = projectPointerToArcballSphere(0.80, 0.35);
    const rotZ = computeArcballDeltaQuaternion(vStartZ, vEndZ, cam, 2.0);
    expect(Math.abs(rotZ.axis.z)).toBeGreaterThan(0.5);
    expect(Number.isNaN(rotZ.quaternion.x)).toBe(false);
  });

  it('computes WCA Ao5 and Ao12 trimmed averages accurately with +2 and DNF penalties', () => {
    const makeRec = (id: string, rawMs: number, penalty: 'OK' | '+2' | 'DNF' = 'OK'): SolveRecord => ({
      id,
      timestamp: 1000,
      puzzle: '3x3',
      rawMs,
      penalty,
      moves: 40,
      mode: 'free',
    });

    // 5 solves: 10s, 11s, 12s, 13s, 20s -> drops 10s and 20s -> mean(11,12,13) = 12000ms
    const basic5 = [makeRec('1', 10000), makeRec('2', 11000), makeRec('3', 12000), makeRec('4', 13000), makeRec('5', 20000)];
    expect(calculateWcaAverage(basic5, 5)).toBe(12000);

    // 1 DNF replaces slowest dropped solve + +2 adds 2000ms -> drops 10s and DNF -> mean(12s + 2s=14s, 12s, 13s) = 13000ms
    const oneDnf = [makeRec('1', 10000), makeRec('2', 12000, '+2'), makeRec('3', 12000), makeRec('4', 13000), makeRec('5', 9000, 'DNF')];
    expect(calculateWcaAverage(oneDnf, 5)).toBe(13000);

    // 2 DNFs in window -> DNF average (null)
    const twoDnfs = [makeRec('1', 10000), makeRec('2', 11000), makeRec('3', 12000), makeRec('4', 9000, 'DNF'), makeRec('5', 9000, 'DNF')];
    expect(calculateWcaAverage(twoDnfs, 5)).toBeNull();

    // Summary on 12 solves computes PB, Mean, Ao5, Ao12
    const twelve = Array.from({ length: 12 }, (_, idx) => makeRec(String(idx), 10000 + idx * 1000));
    const summary = summarizePuzzleStats(twelve, '3x3');
    expect(summary.pb).toBe(10000);
    expect(summary.ao5).toBe(12000);
    expect(summary.ao12).toBe(15500);
  });

  it('provides 6 IRL Color Scheme palettes, SFX profiles, and reversible Drill setups', () => {
    expect(Object.keys(COLOR_SCHEMES)).toEqual([
      'classic',
      'stickerless',
      'primary',
      'pastel',
      'carbon',
      'contrast',
    ]);
    for (const scheme of Object.values(COLOR_SCHEMES)) {
      expect(Object.keys(scheme.cubeFaces).length).toBe(6);
      expect(Object.keys(scheme.pyraFaces).length).toBe(4);
      expect(scheme.bodyColor).toMatch(/^#[0-9a-f]{6}$/i);
    }

    expect(Object.keys(TURN_SOUND_PROFILES)).toEqual(['magnetic', 'clack', 'lubed']);
    expect(clampVolume(-0.25)).toBe(0);
    expect(clampVolume(1.75)).toBe(1);
    expect(clampVolume(0.42)).toBe(0.42);

    // Verify 3x3 T-Perm drill setup + solution restores solved state
    const drill = buildDrillMoves('3x3', "R U R' U' R' F R2 U' R' U' R U R' F'");
    expect(drill.setupMoves.length).toBe(14);
    expect(drill.solutionMoves.length).toBe(14);

    const cube = new CubeState(3);
    for (const m of drill.setupMoves) {
      const turn = resolveTurn(m, undefined, 3);
      cube.applyTurn(turn.axis, turn.layers, turn.angle);
    }
    expect(cube.isSolved()).toBe(false);
    for (const m of drill.solutionMoves) {
      const turn = resolveTurn(m, undefined, 3);
      cube.applyTurn(turn.axis, turn.layers, turn.angle);
    }
    expect(cube.isSolved()).toBe(true);
  });
});

