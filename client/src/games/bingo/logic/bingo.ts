// 75-ball Bingo logic: card generation, ball drawing, pattern detection.
// Framework-free: no React imports here.

export type PatternId = 'line' | 'four-corners' | 'blackout';

export interface BingoColumn {
  letter: 'B' | 'I' | 'N' | 'G' | 'O';
  min: number;
  max: number;
}

export const COLUMNS: BingoColumn[] = [
  { letter: 'B', min: 1, max: 15 },
  { letter: 'I', min: 16, max: 30 },
  { letter: 'N', min: 31, max: 45 },
  { letter: 'G', min: 46, max: 60 },
  { letter: 'O', min: 61, max: 75 },
];

export interface Ball {
  n: number;
  letter: string;
}

/** 5×5 card. The center cell [2][2] is FREE and stored as null. */
export type BingoCard = (number | null)[][];

export const FREE_ROW = 2;
export const FREE_COL = 2;
export const TOTAL_BALLS = 75;

function randInt(rng: () => number, n: number): number {
  return Math.floor(rng() * n);
}

function shuffled<T>(arr: T[], rng: () => number): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = randInt(rng, i + 1);
    const tmp = a[i]!;
    a[i] = a[j]!;
    a[j] = tmp;
  }
  return a;
}

/** Full shuffled 75-ball draw sequence (B 1–15 … O 61–75). */
export function shuffledBalls(rng: () => number = Math.random): Ball[] {
  const balls: Ball[] = [];
  for (const col of COLUMNS) {
    for (let n = col.min; n <= col.max; n += 1) {
      balls.push({ n, letter: col.letter });
    }
  }
  return shuffled(balls, rng);
}

/**
 * A fresh 5×5 card: each column holds 5 distinct numbers from its range,
 * sorted top-to-bottom isn't required — numbers are placed randomly.
 * The center cell is FREE (null).
 */
export function generateCard(rng: () => number = Math.random): BingoCard {
  const card: BingoCard = [];
  for (let r = 0; r < 5; r += 1) {
    card.push([null, null, null, null, null]);
  }
  COLUMNS.forEach((col, c) => {
    const pool: number[] = [];
    for (let n = col.min; n <= col.max; n += 1) pool.push(n);
    const picks = shuffled(pool, rng).slice(0, 5);
    for (let r = 0; r < 5; r += 1) {
      if (r === FREE_ROW && c === FREE_COL) continue; // FREE center
      card[r]![c] = picks[r]!;
    }
  });
  return card;
}

/**
 * Is this cell covered? The FREE center is always covered; any other cell
 * needs its number in the drawn/daubed set.
 */
export function isCellCovered(
  card: BingoCard,
  r: number,
  c: number,
  drawn: Set<number>,
): boolean {
  const v = card[r]?.[c];
  if (v === null || v === undefined) return true; // FREE
  return drawn.has(v);
}

/**
 * Should this ball be daubed on this card — i.e. does the card hold the
 * ball's number? (The FREE center needs no ball.)
 */
export function isDaubed(card: BingoCard, ball: Ball): boolean {
  for (let r = 0; r < 5; r += 1) {
    for (let c = 0; c < 5; c += 1) {
      if (card[r]?.[c] === ball.n) return true;
    }
  }
  return false;
}

type Cell = [number, number];

const LINES: Cell[][] = (() => {
  const lines: Cell[][] = [];
  for (let r = 0; r < 5; r += 1) {
    const row: Cell[] = [];
    const col: Cell[] = [];
    for (let c = 0; c < 5; c += 1) {
      row.push([r, c]);
      col.push([c, r]);
    }
    lines.push(row, col);
  }
  lines.push([
    [0, 0],
    [1, 1],
    [2, 2],
    [3, 3],
    [4, 4],
  ]);
  lines.push([
    [0, 4],
    [1, 3],
    [2, 2],
    [3, 1],
    [4, 0],
  ]);
  return lines;
})();

const CORNERS: Cell[] = [
  [0, 0],
  [0, 4],
  [4, 0],
  [4, 4],
];

/** Patterns completed given the drawn/daubed set (FREE counts as covered). */
export function checkPatterns(
  card: BingoCard,
  drawn: Set<number>,
): PatternId[] {
  const out: PatternId[] = [];
  const covered = (r: number, c: number): boolean =>
    isCellCovered(card, r, c, drawn);
  if (LINES.some((line) => line.every(([r, c]) => covered(r, c)))) {
    out.push('line');
  }
  if (CORNERS.every(([r, c]) => covered(r, c))) {
    out.push('four-corners');
  }
  let all = true;
  for (let r = 0; r < 5 && all; r += 1) {
    for (let c = 0; c < 5; c += 1) {
      if (!covered(r, c)) {
        all = false;
        break;
      }
    }
  }
  if (all) out.push('blackout');
  return out;
}

export interface PatternProgress {
  /** Covered cells on the best (closest) line, out of 5. */
  line: number;
  /** Covered corners, out of 4. */
  corners: number;
  /** Covered cells overall, out of 25. */
  blackout: number;
}

/** Covered-cell counts toward each pattern — drives progress hints. */
export function patternProgress(
  card: BingoCard,
  drawn: Set<number>,
): PatternProgress {
  const covered = (r: number, c: number): boolean =>
    isCellCovered(card, r, c, drawn);
  let line = 0;
  for (const cells of LINES) {
    const n = cells.filter(([r, c]) => covered(r, c)).length;
    if (n > line) line = n;
  }
  const corners = CORNERS.filter(([r, c]) => covered(r, c)).length;
  let blackout = 0;
  for (let r = 0; r < 5; r += 1) {
    for (let c = 0; c < 5; c += 1) {
      if (covered(r, c)) blackout += 1;
    }
  }
  return { line, corners, blackout };
}

/** Highest-value completed pattern (blackout > line > four-corners). */
export function bestPattern(patterns: PatternId[]): PatternId | null {
  if (patterns.includes('blackout')) return 'blackout';
  if (patterns.includes('line')) return 'line';
  if (patterns.includes('four-corners')) return 'four-corners';
  return null;
}
