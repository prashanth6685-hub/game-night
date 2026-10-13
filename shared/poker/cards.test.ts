// Tests for shared/poker/cards.ts
// Run: node --test shared/poker/cards.test.ts (from repo root)
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  cardName,
  isRed,
  makeDeck,
  rankLabel,
  shuffle,
  suitSymbol,
} from './cards.ts';
import type { Card } from './cards.ts';

/** Deterministic RNG (mulberry32). */
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

function key(c: Card): string {
  return `${c.rank}-${c.suit}`;
}

describe('makeDeck', () => {
  it('builds 52 unique cards', () => {
    const deck = makeDeck();
    assert.equal(deck.length, 52);
    assert.equal(new Set(deck.map(key)).size, 52);
  });

  it('has 13 ranks in each of the 4 suits', () => {
    const deck = makeDeck();
    for (const suit of ['spades', 'hearts', 'diamonds', 'clubs'] as const) {
      const ranks = deck.filter((c) => c.suit === suit).map((c) => c.rank).sort((a, b) => a - b);
      assert.deepEqual(ranks, [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]);
    }
  });

  it('returns a fresh deck each call', () => {
    const a = makeDeck();
    const b = makeDeck();
    assert.notEqual(a, b);
    assert.deepEqual(a, b);
  });
});

describe('shuffle', () => {
  it('returns a new array and never mutates the input', () => {
    const deck = makeDeck();
    const snapshot = deck.map((c) => ({ ...c }));
    const shuffled = shuffle(deck, mulberry32(42));
    assert.notEqual(shuffled, deck);
    assert.deepEqual(deck, snapshot, 'input deck must be unchanged');
  });

  it('preserves the full multiset of 52 cards', () => {
    const deck = makeDeck();
    const shuffled = shuffle(deck, mulberry32(7));
    assert.equal(shuffled.length, 52);
    const sorted = (cs: Card[]) => cs.map(key).sort();
    assert.deepEqual(sorted(shuffled), sorted(deck));
  });

  it('is deterministic with the same seeded RNG', () => {
    const deck = makeDeck();
    const a = shuffle(deck, mulberry32(123));
    const b = shuffle(deck, mulberry32(123));
    assert.deepEqual(a, b);
  });

  it('differs with different seeds (overwhelmingly likely)', () => {
    const deck = makeDeck();
    const a = shuffle(deck, mulberry32(1)).map(key).join(',');
    const b = shuffle(deck, mulberry32(2)).map(key).join(',');
    assert.notEqual(a, b);
  });

  it('works with the default Math.random and does not mutate input', () => {
    const deck = makeDeck();
    const before = deck.map(key).join(',');
    const shuffled = shuffle(deck);
    assert.equal(shuffled.length, 52);
    assert.equal(deck.map(key).join(','), before);
  });
});

describe('labels and helpers', () => {
  it('rankLabel covers 2..A', () => {
    const expected = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];
    for (let r = 2; r <= 14; r++) {
      assert.equal(rankLabel(r), expected[r - 2]);
    }
  });

  it('suitSymbol returns the unicode symbols', () => {
    assert.equal(suitSymbol('spades'), '♠');
    assert.equal(suitSymbol('hearts'), '♥');
    assert.equal(suitSymbol('diamonds'), '♦');
    assert.equal(suitSymbol('clubs'), '♣');
  });

  it('isRed is true only for hearts and diamonds', () => {
    assert.equal(isRed('hearts'), true);
    assert.equal(isRed('diamonds'), true);
    assert.equal(isRed('spades'), false);
    assert.equal(isRed('clubs'), false);
  });

  it('cardName formats as rank label + suit code', () => {
    assert.equal(cardName({ rank: 14, suit: 'spades' }), 'As');
    assert.equal(cardName({ rank: 10, suit: 'diamonds' }), 'Td');
    assert.equal(cardName({ rank: 7, suit: 'hearts' }), '7h');
    assert.equal(cardName({ rank: 2, suit: 'clubs' }), '2c');
    assert.equal(cardName({ rank: 12, suit: 'clubs' }), 'Qc');
  });
});
