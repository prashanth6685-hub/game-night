// Tambola winning-pattern definitions and checking.
//
// A cell counts as "marked" when it holds a number that is in `called`.

import type { Ticket } from './ticket.ts';

export type PatternId =
  | 'early-five'
  | 'top-line'
  | 'middle-line'
  | 'bottom-line'
  | 'four-corners'
  | 'full-house';

export const PATTERNS: Array<{ id: PatternId; nameKey: string }> = [
  { id: 'early-five', nameKey: 'tambola.patterns.earlyFive' },
  { id: 'top-line', nameKey: 'tambola.patterns.topLine' },
  { id: 'middle-line', nameKey: 'tambola.patterns.middleLine' },
  { id: 'bottom-line', nameKey: 'tambola.patterns.bottomLine' },
  { id: 'four-corners', nameKey: 'tambola.patterns.fourCorners' },
  { id: 'full-house', nameKey: 'tambola.patterns.fullHouse' },
];

function cellValue(ticket: Ticket, r: number, c: number): number | null {
  const v = ticket[r]?.[c];
  return v === undefined ? null : v;
}

function isMarked(ticket: Ticket, r: number, c: number, called: Set<number>): boolean {
  const v = cellValue(ticket, r, c);
  return v !== null && called.has(v);
}

/** All numbers actually printed in row r (skips empty cells). */
function rowNumbers(ticket: Ticket, r: number): number[] {
  const out: number[] = [];
  for (let c = 0; c < 9; c++) {
    const v = cellValue(ticket, r, c);
    if (v !== null) out.push(v);
  }
  return out;
}

export function checkPattern(
  ticket: Ticket,
  called: Set<number>,
  pattern: PatternId,
): boolean {
  switch (pattern) {
    case 'early-five': {
      let count = 0;
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 9; c++) {
          if (isMarked(ticket, r, c, called)) count += 1;
        }
      }
      return count >= 5;
    }
    case 'top-line':
    case 'middle-line':
    case 'bottom-line': {
      const r = pattern === 'top-line' ? 0 : pattern === 'middle-line' ? 1 : 2;
      const nums = rowNumbers(ticket, r);
      return nums.length > 0 && nums.every((n) => called.has(n));
    }
    case 'four-corners': {
      // Corners may be empty cells — use the first/last actual numbers.
      const top = rowNumbers(ticket, 0);
      const bottom = rowNumbers(ticket, 2);
      if (top.length === 0 || bottom.length === 0) return false;
      const corners = [
        top[0]!,
        top[top.length - 1]!,
        bottom[0]!,
        bottom[bottom.length - 1]!,
      ];
      return corners.every((n) => called.has(n));
    }
    case 'full-house': {
      let count = 0;
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 9; c++) {
          const v = cellValue(ticket, r, c);
          if (v !== null) {
            count += 1;
            if (!called.has(v)) return false;
          }
        }
      }
      return count > 0;
    }
  }
}

export interface PatternCell {
  r: number;
  c: number;
}

/**
 * The cells to outline in the claim-verify view: the cells that must be
 * marked for the pattern to hold. For early-five there is no fixed set, so
 * it returns every numbered cell (the eligible pool).
 */
export function patternCells(ticket: Ticket, pattern: PatternId): PatternCell[] {
  const cells: PatternCell[] = [];
  const pushRowNumbers = (r: number): void => {
    for (let c = 0; c < 9; c++) {
      if (cellValue(ticket, r, c) !== null) cells.push({ r, c });
    }
  };
  switch (pattern) {
    case 'early-five':
    case 'full-house':
      pushRowNumbers(0);
      pushRowNumbers(1);
      pushRowNumbers(2);
      return cells;
    case 'top-line':
      pushRowNumbers(0);
      return cells;
    case 'middle-line':
      pushRowNumbers(1);
      return cells;
    case 'bottom-line':
      pushRowNumbers(2);
      return cells;
    case 'four-corners': {
      const corners: PatternCell[] = [];
      for (const r of [0, 2]) {
        let first = -1;
        let last = -1;
        for (let c = 0; c < 9; c++) {
          if (cellValue(ticket, r, c) !== null) {
            if (first === -1) first = c;
            last = c;
          }
        }
        if (first !== -1 && last !== -1) {
          corners.push({ r, c: first });
          if (last !== first) corners.push({ r, c: last });
        }
      }
      return corners;
    }
  }
}
