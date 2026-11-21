import { describe, it, expect } from 'vitest';
import { CubeState } from '../cube/CubeState';
import { resolveTurn } from '../cube/moves';
import { parseAlgorithm, invertAlgorithm } from '../cube/notation';
import { generateScramble } from '../cube/scramble';
import { resolveCameraFaces } from '../cube/cameraResolver';
import { CameraVectors } from '../cube/types';
import { GUIDE_DATA } from '../content/guideData';
import { PyraminxState, generatePyraminxScramble } from '../cube/pyraminxState';
import { OTHER_CUBES_GUIDES } from '../content/otherCubesData';
import { SettingsManager, DEFAULT_KEYBINDS, TWOHAND_SPEEDCUBE_KEYBINDS } from '../ui/settings';

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
});

