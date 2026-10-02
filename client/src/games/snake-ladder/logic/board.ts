// Snake & Ladder board data and movement rules.
// Pure logic — no React, no DOM. Tested in board.test.ts.

/** Ladders: landing square -> destination square. */
export const LADDERS: Record<number, number> = {
  1: 38,
  4: 14,
  9: 31,
  21: 42,
  28: 84,
  36: 44,
  51: 67,
  71: 91,
  80: 100,
};

/** Snakes: head square -> tail square. */
export const SNAKES: Record<number, number> = {
  16: 6,
  47: 26,
  49: 11,
  56: 53,
  62: 19,
  64: 60,
  87: 24,
  93: 73,
  95: 75,
  98: 78,
};

/** Roll a six-sided die. Pass a seeded rng in tests for determinism. */
export function rollDice(rng: () => number = Math.random): number {
  return 1 + Math.floor(rng() * 6);
}

export type MoveEvent = 'ladder' | 'snake' | null;

export interface MoveResult {
  /** Final square after the move, including any snake/ladder. */
  pos: number;
  /** What happened on the landing square, if anything. */
  event: MoveEvent;
  /**
   * The square the token landed on before any snake/ladder applied.
   * When the roll overshoots 100 (illegal move), this equals the start
   * square since the token never actually moved.
   */
  from: number;
}

/**
 * Move a token from `pos` by `roll` squares.
 *
 * Exact-100 rule: a roll that would take the token past square 100 is
 * illegal — the token stays where it is this turn (event null).
 * Otherwise the token lands on pos + roll, then climbs a ladder or
 * slides down a snake if the landing square has one.
 */
export function applyMove(pos: number, roll: number): MoveResult {
  const landed = pos + roll;
  if (landed > 100) {
    return { pos, event: null, from: pos };
  }
  const ladderTo = LADDERS[landed];
  if (ladderTo !== undefined) {
    return { pos: ladderTo, event: 'ladder', from: landed };
  }
  const snakeTo = SNAKES[landed];
  if (snakeTo !== undefined) {
    return { pos: snakeTo, event: 'snake', from: landed };
  }
  return { pos: landed, event: null, from: landed };
}

export interface RowCol {
  row: number;
  col: number;
}

/**
 * Map square 1..100 to boustrophedon grid coordinates for rendering.
 * row 9 is the bottom row, row 0 the top row. Columns run left-to-right
 * on odd rows and right-to-left on even rows:
 * n=1 -> {9,0}, n=10 -> {9,9}, n=11 -> {8,9}, n=100 -> {0,0}.
 */
export function squareToRowCol(n: number): RowCol {
  const row = 9 - Math.floor((n - 1) / 10);
  const i = (n - 1) % 10;
  const col = row % 2 === 1 ? i : 9 - i;
  return { row, col };
}
