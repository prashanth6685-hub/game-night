// Tests for createDeck — seeded RNG so draws are deterministic.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createDeck } from './deck.ts';
import type { CharadesDifficulty, CharadesItem } from '../data/types.ts';

const easy = 'easy' as CharadesDifficulty;

function items(n: number): CharadesItem[] {
  return Array.from({ length: n }, (_, i) => ({
    name: `word-${i}`,
    difficulty: easy,
  }));
}

/** Deterministic PRNG (mulberry32). */
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

test('draws every item exactly once before any repeat', () => {
  const deck = createDeck(items(6), mulberry32(42));
  const drawn = new Set<string>();
  for (let i = 0; i < 6; i++) {
    const item = deck.next();
    assert.ok(item, 'expected a word');
    assert.ok(!drawn.has(item.name), `duplicate draw: ${item.name}`);
    drawn.add(item.name);
  }
  assert.equal(drawn.size, 6);
});

test('remaining() counts down as words are drawn', () => {
  const deck = createDeck(items(4), mulberry32(7));
  assert.equal(deck.remaining(), 4);
  deck.next();
  assert.equal(deck.remaining(), 3);
  deck.next();
  deck.next();
  assert.equal(deck.remaining(), 1);
});

test('total() reports the full pool size', () => {
  assert.equal(createDeck(items(9), mulberry32(1)).total(), 9);
  assert.equal(createDeck([], mulberry32(1)).total(), 0);
});

test('reshuffles after exhaustion and keeps dealing full cycles', () => {
  const deck = createDeck(items(5), mulberry32(99));
  // Two full cycles: each block of 5 draws must contain every word once.
  for (let cycle = 0; cycle < 2; cycle++) {
    const seen = new Set<string>();
    for (let i = 0; i < 5; i++) {
      const item = deck.next();
      assert.ok(item, `cycle ${cycle}: expected a word`);
      assert.ok(!seen.has(item.name), `cycle ${cycle}: repeat of ${item.name}`);
      seen.add(item.name);
    }
    assert.equal(seen.size, 5);
  }
});

test('remaining() resets after a reshuffle', () => {
  const deck = createDeck(items(3), mulberry32(5));
  deck.next();
  deck.next();
  deck.next();
  assert.equal(deck.remaining(), 0);
  const item = deck.next(); // triggers reshuffle
  assert.ok(item);
  assert.equal(deck.remaining(), 2);
});

test('empty pool: next() returns null, remaining/total are 0', () => {
  const deck = createDeck([], mulberry32(1));
  assert.equal(deck.next(), null);
  assert.equal(deck.remaining(), 0);
  assert.equal(deck.total(), 0);
});

test('constant rng still deals a full permutation before repeating', () => {
  const deck = createDeck(items(4), () => 0.5);
  const seen = new Set<string>();
  for (let i = 0; i < 4; i++) {
    const item = deck.next();
    assert.ok(item);
    assert.ok(!seen.has(item.name));
    seen.add(item.name);
  }
  assert.equal(seen.size, 4);
});
