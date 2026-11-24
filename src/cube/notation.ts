/**
 * Normalizes and expands Rubik's cube notation strings.
 * Supports:
 * - Basic moves: R, L, U, D, F, B
 * - Inverses: R', L', etc.
 * - Double moves: R2, L2, etc.
 * - Slices: M, E, S, M', M2, etc.
 * - Rotations: x, y, z, x', x2, etc.
 * - Wide moves: r, l, u, d, f, b, Rw, Lw, etc.
 * - Multipliers / groups: (R U R' U') x2, (R U R' U') * 3, (R U R' U')2
 */

export function normalizeMove(token: string): string {
  let t = token.trim();
  if (!t) return '';

  // Handle 4x4 inner slice moves like 2R, 2L, etc.
  if (/^2[RLUDFB]/i.test(t)) {
    const face = t[1].toUpperCase();
    const suffix = t.slice(2).replace(/2'|'2/, '2');
    return `2${face}${suffix}`;
  }

  // Replace wide move forms like Rw -> r, Lw -> l
  if (/^[RLUDFB]w/i.test(t)) {
    const face = t[0].toLowerCase();
    const suffix = t.slice(2);
    t = face + suffix;
  }

  // Handle double primes like 2' -> 2
  t = t.replace(/2'|'2/, '2');

  return t;
}

export function invertMove(move: string): string {
  const norm = normalizeMove(move);
  if (!norm) return '';

  if (norm.endsWith('2')) {
    return norm; // 180 turn inverse is itself
  }
  if (norm.endsWith("'")) {
    return norm.slice(0, -1);
  }
  return norm + "'";
}

export function parseAlgorithm(input: string): string[] {
  let str = input.trim();
  if (!str) return [];

  // Remove comments if any
  str = str.replace(/\/\/.*$/gm, '');

  // Expand parenthesized expressions with multipliers, e.g.:
  // (R U R' U') x2, (R U R' U')2, (R U R' U') * 3
  const groupRegex = /\(([^)]+)\)\s*(?:[x*X]\s*(\d+)|(\d+))?/g;

  while (groupRegex.test(str)) {
    str = str.replace(groupRegex, (_match, groupContent, mult1, mult2) => {
      const times = parseInt(mult1 || mult2 || '1', 10);
      const expanded: string[] = [];
      for (let i = 0; i < times; i++) {
        expanded.push(groupContent.trim());
      }
      return ' ' + expanded.join(' ') + ' ';
    });
  }

  // Split by whitespace or commas
  const tokens = str
    .split(/[\s,]+/)
    .map(normalizeMove)
    .filter((t) => t.length > 0 && isValidMoveToken(t));

  return tokens;
}

export function isValidMoveToken(token: string): boolean {
  return /^(?:2[RLUDFB]|[RLUDFBMESxyzrludfb])(?:w)?['2]?$/i.test(token);
}

export function invertAlgorithm(input: string): string {
  const moves = parseAlgorithm(input);
  return moves.reverse().map(invertMove).join(' ');
}
