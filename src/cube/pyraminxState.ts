/**
 * Pure logical representation of a Pyraminx puzzle.
 * 4 triangular faces:
 * - Face 0: Front (Green, 'G')
 * - Face 1: Right (Red, 'R')
 * - Face 2: Left/Back (Blue, 'B')
 * - Face 3: Bottom (Yellow, 'Y')
 *
 * Each face has 9 triangular stickers indexed 0..8:
 *       /\
 *      / 0\
 *     /----\
 *    / 1\ 2/ 3\
 *   /----\-----\
 *  / 4\ 5/ 6\ 7/ 8\
 *  ----------------
 */

export type PyraColor = 'G' | 'R' | 'B' | 'Y';

export const PYRA_COLOR_HEX: Record<PyraColor, string> = {
  Y: '#facc15', // Yellow (Bottom)
  G: '#16a34a', // Green (Front)
  R: '#dc2626', // Red (Right)
  B: '#2563eb', // Blue (Back)
};

export class PyraminxState {
  // 4 faces, each with 9 stickers
  faces: PyraColor[][];

  constructor(faces?: PyraColor[][]) {
    if (faces) {
      this.faces = faces.map((f) => [...f]);
    } else {
      this.faces = this.createSolvedFaces();
    }
  }

  private createSolvedFaces(): PyraColor[][] {
    const colors: PyraColor[] = ['G', 'R', 'B', 'Y'];
    return colors.map((col) => Array(9).fill(col));
  }

  reset(): void {
    this.faces = this.createSolvedFaces();
  }

  clone(): PyraminxState {
    return new PyraminxState(this.faces);
  }

  isSolved(): boolean {
    for (let f = 0; f < 4; f++) {
      const targetColor = this.faces[f][0];
      for (let s = 1; s < 9; s++) {
        if (this.faces[f][s] !== targetColor) return false;
      }
    }
    return true;
  }

  /**
   * Applies Pyraminx moves:
   * Main moves: U, U', L, L', R, R', B, B'
   * Tip moves: u, u', l, l', r, r', b, b'
   */
  applyMove(moveStr: string): void {
    const m = moveStr.trim();
    const isPrime = m.endsWith("'");
    const base = m.replace("'", '');

    const turns = isPrime ? 2 : 1; // 120° turn clockwise or 240° (= counter-clockwise)
    for (let i = 0; i < turns; i++) {
      this.applySingleTurn(base);
    }
  }

  private applySingleTurn(base: string): void {
    // Face indices: 0: Front(G), 1: Right(R), 2: Back(B), 3: Bottom(Y)
    switch (base) {
      // Top tip 'u'
      case 'u': {
        const temp = this.faces[0][0];
        this.faces[0][0] = this.faces[1][0];
        this.faces[1][0] = this.faces[2][0];
        this.faces[2][0] = temp;
        break;
      }
      // Top layer 'U' (includes tip u + center pieces 1,2,3)
      case 'U': {
        this.applySingleTurn('u');
        // cycle pieces 1, 2, 3 across faces 0, 1, 2
        for (const idx of [1, 2, 3]) {
          const temp = this.faces[0][idx];
          this.faces[0][idx] = this.faces[1][idx];
          this.faces[1][idx] = this.faces[2][idx];
          this.faces[2][idx] = temp;
        }
        break;
      }

      // Left tip 'l' (affects piece 4 on Front, piece 8 on Back, piece 4 on Bottom)
      case 'l': {
        const temp = this.faces[0][4];
        this.faces[0][4] = this.faces[2][8];
        this.faces[2][8] = this.faces[3][4];
        this.faces[3][4] = temp;
        break;
      }
      // Left layer 'L'
      case 'L': {
        this.applySingleTurn('l');
        const temp = [this.faces[0][1], this.faces[0][2], this.faces[0][5]];
        this.faces[0][1] = this.faces[2][7];
        this.faces[0][2] = this.faces[2][6];
        this.faces[0][5] = this.faces[2][5];

        this.faces[2][7] = this.faces[3][1];
        this.faces[2][6] = this.faces[3][2];
        this.faces[2][5] = this.faces[3][5];

        this.faces[3][1] = temp[0];
        this.faces[3][2] = temp[1];
        this.faces[3][5] = temp[2];
        break;
      }

      // Right tip 'r' (affects piece 8 on Front, piece 8 on Bottom, piece 4 on Right)
      case 'r': {
        const temp = this.faces[0][8];
        this.faces[0][8] = this.faces[3][8];
        this.faces[3][8] = this.faces[1][4];
        this.faces[1][4] = temp;
        break;
      }
      // Right layer 'R'
      case 'R': {
        this.applySingleTurn('r');
        const temp = [this.faces[0][3], this.faces[0][6], this.faces[0][7]];
        this.faces[0][3] = this.faces[3][3];
        this.faces[0][6] = this.faces[3][6];
        this.faces[0][7] = this.faces[3][7];

        this.faces[3][3] = this.faces[1][1];
        this.faces[3][6] = this.faces[1][5];
        this.faces[3][7] = this.faces[1][2];

        this.faces[1][1] = temp[0];
        this.faces[1][5] = temp[1];
        this.faces[1][2] = temp[2];
        break;
      }

      // Back tip 'b'
      case 'b': {
        const temp = this.faces[1][8];
        this.faces[1][8] = this.faces[3][0];
        this.faces[3][0] = this.faces[2][4];
        this.faces[2][4] = temp;
        break;
      }
      // Back layer 'B'
      case 'B': {
        this.applySingleTurn('b');
        const temp = [this.faces[1][7], this.faces[1][6], this.faces[1][3]];
        this.faces[1][7] = this.faces[3][7];
        this.faces[1][6] = this.faces[3][6];
        this.faces[1][3] = this.faces[3][3];

        this.faces[3][7] = this.faces[2][1];
        this.faces[3][6] = this.faces[2][5];
        this.faces[3][3] = this.faces[2][2];

        this.faces[2][1] = temp[0];
        this.faces[2][5] = temp[1];
        this.faces[2][2] = temp[2];
        break;
      }
    }
  }
}

export function generatePyraminxScramble(length: number = 15): string {
  const layerMoves = ['U', "U'", 'L', "L'", 'R', "R'", 'B', "B'"];
  const tips = ['u', "u'", 'l', "l'", 'r', "r'", 'b', "b'"];
  const scramble: string[] = [];

  let lastBase = '';
  for (let i = 0; i < length; i++) {
    const valid = layerMoves.filter((m) => m[0] !== lastBase);
    const chosen = valid[Math.floor(Math.random() * valid.length)];
    scramble.push(chosen);
    lastBase = chosen[0];
  }

  // Add 1 to 3 random tip moves at the end
  const numTips = 1 + Math.floor(Math.random() * 3);
  const usedTips = new Set<string>();
  for (let i = 0; i < numTips; i++) {
    const validTips = tips.filter((t) => !usedTips.has(t[0]));
    if (validTips.length > 0) {
      const chosenTip = validTips[Math.floor(Math.random() * validTips.length)];
      scramble.push(chosenTip);
      usedTips.add(chosenTip[0]);
    }
  }

  return scramble.join(' ');
}
