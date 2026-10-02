import { describe, test } from 'node:test';
import assert from 'node:assert';
import {
  COLUMNS,
  FREE_ROW,
  FREE_COL,
  TOTAL_BALLS,
  bestPattern,
  checkPatterns,
  generateCard,
  isCellCovered,
  isDaubed,
  patternProgress,
  shuffledBalls,
  type BingoCard,
} from './bingo.ts';

/** Deterministic rng cycling through values — good enough for tests. */
function seqRng(values: number[]): () => number {
  let i = 0;
  return () => {
    const v = values[i % values.length];
    i += 1;
    return v === undefined ? 0 : v;
  };
}

describe('generateCard', () => {
  test('is 5x5 with a FREE center', () => {
    const card = generateCard(seqRng([0.1, 0.5, 0.9]));
    assert.strictEqual(card.length, 5);
    for (const row of card) assert.strictEqual(row.length, 5);
    assert.strictEqual(card[FREE_ROW]![FREE_COL], null);
  });

  test('each column holds numbers from its own range, all unique', () => {
    for (let t = 0; t < 20; t += 1) {
      const card = generateCard();
      COLUMNS.forEach((col, c) => {
        const seen = new Set<number>();
        for (let r = 0; r < 5; r += 1) {
          if (r === FREE_ROW && c === FREE_COL) continue;
          const v = card[r]![c]!;
          assert.ok(
            v >= col.min && v <= col.max,
            `col ${col.letter} value ${v} out of range`,
          );
          assert.ok(!seen.has(v), `duplicate ${v} in column ${col.letter}`);
          seen.add(v);
        }
        assert.strictEqual(seen.size, c === 2 ? 4 : 5);
      });
    }
  });

  test('holds exactly 24 numbers + FREE', () => {
    const card = generateCard(seqRng([0.3]));
    let nums = 0;
    for (const row of card)
      for (const v of row) if (v !== null) nums += 1;
    assert.strictEqual(nums, 24);
  });
});

describe('shuffledBalls', () => {
  test('draws 75 unique balls covering 1-75 with correct letters', () => {
    const balls = shuffledBalls(seqRng([0.7, 0.2, 0.9, 0.4]));
    assert.strictEqual(balls.length, TOTAL_BALLS);
    const nums = new Set(balls.map((b) => b.n));
    assert.strictEqual(nums.size, 75);
    for (let n = 1; n <= 75; n += 1) assert.ok(nums.has(n), `missing ${n}`);
    for (const b of balls) {
      const col = COLUMNS.find((c) => b.n >= c.min && b.n <= c.max)!;
      assert.strictEqual(b.letter, col.letter);
    }
  });
});

describe('isCellCovered', () => {
  test('FREE center is always covered, even with nothing drawn', () => {
    const card = generateCard(seqRng([0.1]));
    assert.ok(isCellCovered(card, FREE_ROW, FREE_COL, new Set()));
  });

  test('number cells need their number drawn', () => {
    const card = generateCard(seqRng([0.1]));
    const v = card[0]![0]!;
    assert.ok(!isCellCovered(card, 0, 0, new Set()));
    assert.ok(isCellCovered(card, 0, 0, new Set([v])));
  });
});

describe('isDaubed', () => {
  test('true when the card holds the ball number', () => {
    const card = generateCard(seqRng([0.2]));
    const v = card[1]![3]!;
    assert.ok(isDaubed(card, { n: v, letter: 'G' }));
    assert.ok(!isDaubed(card, { n: v + 100, letter: '?' }));
  });
});

/** Fixed card: rows hold 1-5, 16-20, 31-35(+FREE), 46-50, 61-65. */
function fixedCard(): BingoCard {
  return [
    [1, 16, 31, 46, 61],
    [2, 17, 32, 47, 62],
    [3, 18, null, 48, 63],
    [4, 19, 34, 49, 64],
    [5, 20, 35, 50, 65],
  ];
}

describe('checkPatterns', () => {
  test('detects a completed row', () => {
    const p = checkPatterns(fixedCard(), new Set([1, 16, 31, 46, 61]));
    assert.ok(p.includes('line'));
    assert.ok(!p.includes('four-corners'));
    assert.ok(!p.includes('blackout'));
  });

  test('detects a completed column', () => {
    const p = checkPatterns(fixedCard(), new Set([16, 17, 18, 19, 20]));
    assert.ok(p.includes('line'));
  });

  test('detects a completed diagonal (FREE counts)', () => {
    const p = checkPatterns(fixedCard(), new Set([1, 17, 49, 65]));
    assert.ok(p.includes('line'));
  });

  test('detects four corners', () => {
    const p = checkPatterns(fixedCard(), new Set([1, 61, 5, 65]));
    assert.ok(p.includes('four-corners'));
    assert.ok(!p.includes('line'));
  });

  test('detects blackout when all 24 numbers are drawn', () => {
    const all: number[] = [];
    for (const row of fixedCard())
      for (const v of row) if (v !== null) all.push(v);
    const p = checkPatterns(fixedCard(), new Set(all));
    assert.ok(p.includes('blackout'));
  });

  test('no patterns with nothing drawn', () => {
    assert.deepStrictEqual(checkPatterns(fixedCard(), new Set()), []);
  });

  test('no line with only 4 of 5 in a row', () => {
    const p = checkPatterns(fixedCard(), new Set([1, 16, 31, 46]));
    assert.ok(!p.includes('line'));
  });
});

describe('patternProgress', () => {
  test('reports best-line / corners / blackout counts', () => {
    const prog = patternProgress(fixedCard(), new Set([1, 16, 31, 5, 65]));
    assert.strictEqual(prog.line, 3); // row 0 has 3 covered
    assert.strictEqual(prog.corners, 3); // 1, 5, 65 (61 missing)
    assert.strictEqual(prog.blackout, 6); // 5 numbers + FREE
  });
});

describe('bestPattern', () => {
  test('prefers blackout, then line, then corners', () => {
    assert.strictEqual(bestPattern(['line', 'four-corners']), 'line');
    assert.strictEqual(
      bestPattern(['line', 'four-corners', 'blackout']),
      'blackout',
    );
    assert.strictEqual(bestPattern(['four-corners']), 'four-corners');
    assert.strictEqual(bestPattern([]), null);
  });
});
