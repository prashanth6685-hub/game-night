import { describe, test } from 'node:test';
import assert from 'node:assert';
import { checkPattern, PATTERNS, patternCells } from './patterns.ts';
import type { Ticket } from './ticket.ts';

function makeTicket(rows: Array<Array<number | null>>): Ticket {
  const t: Ticket = [];
  for (const r of rows) t.push(r.slice());
  return t;
}

function emptyTicket(): Ticket {
  return makeTicket([
    [null, null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null, null],
  ]);
}

// Deterministic 15-number ticket. Corners: row0 first=4 last=84,
// row2 first=8 last=89.
const FIXTURE = makeTicket([
  [4, null, 12, null, 47, null, 63, null, 84],
  [null, 19, null, 35, null, 58, null, 76, 81],
  [8, null, 27, null, null, 54, 69, null, 89],
]);

const ROW0 = [4, 12, 47, 63, 84];
const ROW1 = [19, 35, 58, 76, 81];
const ROW2 = [8, 27, 54, 69, 89];
const ALL = [...ROW0, ...ROW1, ...ROW2];

function asSet(nums: number[]): Set<number> {
  return new Set(nums);
}

describe('checkPattern', () => {
  test('top-line true when every row-0 number is called', () => {
    assert.ok(checkPattern(FIXTURE, asSet(ROW0), 'top-line'));
  });

  test('top-line false when one row-0 number is uncalled', () => {
    const called = asSet(ROW0.filter((n) => n !== 47));
    assert.ok(!checkPattern(FIXTURE, called, 'top-line'));
  });

  test('middle-line true/false', () => {
    assert.ok(checkPattern(FIXTURE, asSet(ROW1), 'middle-line'));
    assert.ok(
      !checkPattern(FIXTURE, asSet(ROW1.filter((n) => n !== 35)), 'middle-line'),
    );
  });

  test('bottom-line true/false', () => {
    assert.ok(checkPattern(FIXTURE, asSet(ROW2), 'bottom-line'));
    assert.ok(!checkPattern(FIXTURE, asSet([]), 'bottom-line'));
  });

  test('line patterns ignore numbers from other rows', () => {
    assert.ok(!checkPattern(FIXTURE, asSet(ROW1), 'top-line'));
  });

  test('early-five true with any 5 marked cells', () => {
    assert.ok(checkPattern(FIXTURE, asSet([4, 19, 8, 27, 76]), 'early-five'));
  });

  test('early-five false with only 4 marked cells', () => {
    assert.ok(!checkPattern(FIXTURE, asSet([4, 19, 8, 27]), 'early-five'));
  });

  test('early-five true with more than 5 marked', () => {
    assert.ok(checkPattern(FIXTURE, asSet(ALL), 'early-five'));
  });

  test('four-corners true when the four corner numbers are called', () => {
    assert.ok(checkPattern(FIXTURE, asSet([4, 84, 8, 89]), 'four-corners'));
  });

  test('four-corners false when one corner is uncalled', () => {
    assert.ok(!checkPattern(FIXTURE, asSet([4, 84, 8]), 'four-corners'));
  });

  test('four-corners uses first/last numbers when corner cells are empty', () => {
    // Row 0's first/last actual numbers are 12 and 84 (col 0 is empty);
    // row 2's are 27 and 69 (col 0 and col 8 are empty).
    const t = makeTicket([
      [null, null, 12, null, 47, null, 63, null, 84],
      [null, 19, null, 35, null, 58, null, 76, null],
      [null, null, 27, null, null, 54, 69, null, null],
    ]);
    assert.ok(checkPattern(t, asSet([12, 84, 27, 69]), 'four-corners'));
    assert.ok(!checkPattern(t, asSet([12, 84, 27]), 'four-corners'));
  });

  test('full-house true only when all 15 numbers are called', () => {
    assert.ok(checkPattern(FIXTURE, asSet(ALL), 'full-house'));
    const missing = ALL.filter((n) => n !== 89);
    assert.ok(!checkPattern(FIXTURE, asSet(missing), 'full-house'));
    assert.ok(!checkPattern(FIXTURE, asSet([]), 'full-house'));
  });

  test('all patterns false on an empty ticket', () => {
    const t = emptyTicket();
    const called = asSet(ALL);
    for (const p of PATTERNS) {
      assert.ok(!checkPattern(t, called, p.id), `${p.id} false on empty ticket`);
    }
  });

  test('PATTERNS lists all six patterns with name keys', () => {
    assert.strictEqual(PATTERNS.length, 6);
    const ids = PATTERNS.map((p) => p.id).sort();
    assert.deepStrictEqual(ids, [
      'bottom-line',
      'early-five',
      'four-corners',
      'full-house',
      'middle-line',
      'top-line',
    ]);
    for (const p of PATTERNS) {
      assert.ok(
        p.nameKey.startsWith('tambola.patterns.'),
        `${p.id} nameKey namespaced`,
      );
    }
  });
});

describe('patternCells', () => {
  test('top-line returns the 5 row-0 cells', () => {
    const cells = patternCells(FIXTURE, 'top-line');
    assert.strictEqual(cells.length, 5);
    assert.ok(cells.every((c) => c.r === 0));
  });

  test('four-corners returns the first/last numbers of rows 0 and 2', () => {
    const cells = patternCells(FIXTURE, 'four-corners');
    assert.deepStrictEqual(cells, [
      { r: 0, c: 0 },
      { r: 0, c: 8 },
      { r: 2, c: 0 },
      { r: 2, c: 8 },
    ]);
  });

  test('full-house returns all 15 numbered cells', () => {
    assert.strictEqual(patternCells(FIXTURE, 'full-house').length, 15);
  });

  test('early-five returns all numbered cells (eligible pool)', () => {
    assert.strictEqual(patternCells(FIXTURE, 'early-five').length, 15);
  });
});
