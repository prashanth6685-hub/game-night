// Tests for games/snake-ladder/logic/board.ts
// Run: node --test client/src/games/snake-ladder/logic/board.test.ts (from repo root)
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  LADDERS,
  SNAKES,
  applyMove,
  rollDice,
  squareToRowCol,
} from './board.ts';

/** Deterministic RNG (mulberry32) so dice tests don't depend on Math.random. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe('board data', () => {
  it('ladders always go up and snakes always go down', () => {
    for (const [from, to] of Object.entries(LADDERS)) {
      assert.ok(to > Number(from), `ladder ${from} -> ${to} must go up`);
    }
    for (const [from, to] of Object.entries(SNAKES)) {
      assert.ok(to < Number(from), `snake ${from} -> ${to} must go down`);
    }
  });

  it('no square is both a ladder foot and a snake head', () => {
    for (const k of Object.keys(LADDERS)) {
      assert.ok(!(k in SNAKES), `square ${k} is both ladder and snake`);
    }
  });
});

describe('rollDice', () => {
  it('returns integers 1-6 over 500 seeded rolls and hits every face', () => {
    const rng = mulberry32(12345);
    const seen = new Set<number>();
    for (let i = 0; i < 500; i++) {
      const r = rollDice(rng);
      assert.ok(
        Number.isInteger(r) && r >= 1 && r <= 6,
        `roll out of range: ${r}`,
      );
      seen.add(r);
    }
    assert.deepEqual([...seen].sort((a, b) => a - b), [1, 2, 3, 4, 5, 6]);
  });

  it('defaults to Math.random when no rng is given', () => {
    for (let i = 0; i < 50; i++) {
      const r = rollDice();
      assert.ok(r >= 1 && r <= 6, `roll out of range: ${r}`);
    }
  });
});

describe('applyMove', () => {
  it('climbs a ladder: pos 0 roll 1 lands on 1 -> climbs to 38', () => {
    assert.deepEqual(applyMove(0, 1), { pos: 38, event: 'ladder', from: 1 });
  });

  it('climbs a ladder to 100 (square 80 -> 100 is a winning ladder)', () => {
    assert.deepEqual(applyMove(79, 1), { pos: 100, event: 'ladder', from: 80 });
  });

  it('slides down a snake: pos 15 roll 1 lands on 16 -> slides to 6', () => {
    assert.deepEqual(applyMove(15, 1), { pos: 6, event: 'snake', from: 16 });
  });

  it('overshooting 100 stays put (exact-100 rule)', () => {
    assert.deepEqual(applyMove(97, 5), { pos: 97, event: null, from: 97 });
    assert.deepEqual(applyMove(99, 2), { pos: 99, event: null, from: 99 });
  });

  it('exact roll reaches 100', () => {
    assert.deepEqual(applyMove(97, 3), { pos: 100, event: null, from: 100 });
    assert.deepEqual(applyMove(94, 6), { pos: 100, event: null, from: 100 });
  });

  it('plain moves have no event', () => {
    assert.deepEqual(applyMove(0, 3), { pos: 3, event: null, from: 3 });
    // landing on 14 is fine: the ladder foot is at 4, not 14
    assert.deepEqual(applyMove(10, 4), { pos: 14, event: null, from: 14 });
    // landing on a ladder foot climbs
    assert.deepEqual(applyMove(2, 2), { pos: 14, event: 'ladder', from: 4 });
  });

  it('snake at 98 drops to 78 near the finish', () => {
    assert.deepEqual(applyMove(97, 1), { pos: 78, event: 'snake', from: 98 });
  });
});

describe('squareToRowCol', () => {
  it('maps the spec spot checks', () => {
    assert.deepEqual(squareToRowCol(1), { row: 9, col: 0 });
    assert.deepEqual(squareToRowCol(10), { row: 9, col: 9 });
    assert.deepEqual(squareToRowCol(11), { row: 8, col: 9 });
    assert.deepEqual(squareToRowCol(100), { row: 0, col: 0 });
  });

  it('zig-zags correctly at row boundaries', () => {
    assert.deepEqual(squareToRowCol(20), { row: 8, col: 0 });
    assert.deepEqual(squareToRowCol(21), { row: 7, col: 0 });
    assert.deepEqual(squareToRowCol(91), { row: 0, col: 9 });
    assert.deepEqual(squareToRowCol(99), { row: 0, col: 1 });
  });

  it('covers all 100 squares exactly once within the 10x10 grid', () => {
    const seen = new Set<string>();
    for (let n = 1; n <= 100; n++) {
      const { row, col } = squareToRowCol(n);
      assert.ok(row >= 0 && row <= 9 && col >= 0 && col <= 9, `n=${n} out of grid`);
      const key = `${row},${col}`;
      assert.ok(!seen.has(key), `duplicate cell for n=${n}`);
      seen.add(key);
    }
    assert.equal(seen.size, 100);
  });
});
