import { describe, test } from 'node:test';
import assert from 'node:assert';
import { createCaller } from './caller.ts';

function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let z = s;
    z = Math.imul(z ^ (z >>> 15), z | 1);
    z ^= z + Math.imul(z ^ (z >>> 7), z | 61);
    return ((z ^ (z >>> 14)) >>> 0) / 4294967296;
  };
}

describe('createCaller', () => {
  test('90 calls yield every number 1-90 exactly once', () => {
    const caller = createCaller(mulberry32(42));
    const drawn: number[] = [];
    for (let i = 0; i < 90; i++) {
      const n = caller.call();
      assert.ok(n !== null, `call ${i + 1} returns a number`);
      drawn.push(n);
    }
    assert.strictEqual(new Set(drawn).size, 90, 'no duplicates drawn');
    const sorted = drawn.slice().sort((a, b) => a - b);
    for (let n = 1; n <= 90; n++) {
      assert.strictEqual(sorted[n - 1], n, `number ${n} was drawn`);
    }
    assert.strictEqual(caller.remaining(), 0);
    assert.strictEqual(caller.called.length, 90);
  });

  test('91st call returns null', () => {
    const caller = createCaller(mulberry32(1));
    for (let i = 0; i < 90; i++) caller.call();
    assert.strictEqual(caller.call(), null);
    assert.strictEqual(caller.call(), null, 'stays null afterwards');
  });

  test('reset() restores the caller', () => {
    const caller = createCaller(mulberry32(9));
    for (let i = 0; i < 37; i++) caller.call();
    assert.strictEqual(caller.remaining(), 90 - 37);
    assert.ok(caller.isCalled(caller.called[0] as number));
    caller.reset();
    assert.strictEqual(caller.remaining(), 90);
    assert.strictEqual(caller.called.length, 0);
    assert.ok(!caller.isCalled(5), 'isCalled false after reset');
    const n = caller.call();
    assert.ok(n !== null && n >= 1 && n <= 90);
    assert.ok(caller.isCalled(n), 'isCalled true for the drawn number');
  });

  test('seeded rng is deterministic', () => {
    const a = createCaller(mulberry32(777));
    const b = createCaller(mulberry32(777));
    const seqA: Array<number | null> = [];
    const seqB: Array<number | null> = [];
    for (let i = 0; i < 90; i++) {
      seqA.push(a.call());
      seqB.push(b.call());
    }
    assert.deepStrictEqual(seqA, seqB);
  });

  test('different seeds shuffle differently', () => {
    const a = createCaller(mulberry32(1));
    const b = createCaller(mulberry32(2));
    const seqA: Array<number | null> = [];
    const seqB: Array<number | null> = [];
    for (let i = 0; i < 90; i++) {
      seqA.push(a.call());
      seqB.push(b.call());
    }
    assert.notDeepStrictEqual(seqA, seqB);
  });
});
