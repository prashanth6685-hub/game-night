// Tests for shared/poker/handEval.ts
// Run: node --test shared/poker/handEval.test.ts (from repo root)
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { compareHands, evaluate } from './handEval.ts';
import type { Card, Suit } from './cards.ts';

/** Build cards from codes like 'As', 'Td', '7h'. */
function h(...codes: string[]): Card[] {
  return codes.map((code) => {
    const r = code[0] as string;
    let rank: number;
    switch (r) {
      case 'T': rank = 10; break;
      case 'J': rank = 11; break;
      case 'Q': rank = 12; break;
      case 'K': rank = 13; break;
      case 'A': rank = 14; break;
      default: rank = Number(r);
    }
    let suit: Suit;
    switch (code[1]) {
      case 's': suit = 'spades'; break;
      case 'h': suit = 'hearts'; break;
      case 'd': suit = 'diamonds'; break;
      case 'c': suit = 'clubs'; break;
      default: throw new Error(`bad card code ${code}`);
    }
    return { rank, suit };
  });
}

const HIGH_CARD = h('Ks', 'Qd', 'Jc', '9h', '7s', '5d', '3c');
const ONE_PAIR = h('Ks', 'Kd', '9h', '7s', '5d', '3c', '2h');
const TWO_PAIR = h('Ks', 'Kd', '9h', '9s', '5d', '3c', '2h');
const TRIPS = h('Ks', 'Kd', 'Kh', '9s', '5d', '3c', '2h');
const STRAIGHT = h('9s', '8d', '7h', '6c', '5s', 'Kd', '2c');
const FLUSH = h('As', 'Ks', 'Qs', 'Js', '9s', '5d', '3c');
const FULL_HOUSE = h('Ks', 'Kd', 'Kh', '9s', '9d', '3c', '2h');
const QUADS = h('Ks', 'Kd', 'Kh', 'Kc', '9s', '5d', '3c');
const STRAIGHT_FLUSH = h('9s', '8s', '7s', '6s', '5s', 'Kd', '2c');
const ROYAL = h('As', 'Ks', 'Qs', 'Js', 'Ts', '5d', '3c');

describe('hand categories', () => {
  const cases: Array<[string, Card[], number, string]> = [
    ['high-card', HIGH_CARD, 0, 'high-card'],
    ['one-pair', ONE_PAIR, 1, 'one-pair'],
    ['two-pair', TWO_PAIR, 2, 'two-pair'],
    ['three-of-a-kind', TRIPS, 3, 'three-of-a-kind'],
    ['straight', STRAIGHT, 4, 'straight'],
    ['flush', FLUSH, 5, 'flush'],
    ['full-house', FULL_HOUSE, 6, 'full-house'],
    ['four-of-a-kind', QUADS, 7, 'four-of-a-kind'],
    ['straight-flush', STRAIGHT_FLUSH, 8, 'straight-flush'],
    ['royal-flush', ROYAL, 8, 'royal-flush'],
  ];
  for (const [label, cards, category, name] of cases) {
    it(`detects ${label} with category ${category}`, () => {
      const ev = evaluate(cards);
      assert.equal(ev.category, category);
      assert.equal(ev.name, name);
      assert.equal(ev.best.length, 5, `${label}: best must be exactly 5 cards`);
    });
  }
});

describe('ranking hierarchy', () => {
  const ladder: Array<[string, Card[]]> = [
    ['high-card', HIGH_CARD],
    ['one-pair', ONE_PAIR],
    ['two-pair', TWO_PAIR],
    ['three-of-a-kind', TRIPS],
    ['straight', STRAIGHT],
    ['flush', FLUSH],
    ['full-house', FULL_HOUSE],
    ['four-of-a-kind', QUADS],
    ['straight-flush', STRAIGHT_FLUSH],
    ['royal-flush', ROYAL],
  ];
  it('every rank beats the one directly below it', () => {
    for (let i = 1; i < ladder.length; i++) {
      const [loName, loCards] = ladder[i - 1] as [string, Card[]];
      const [hiName, hiCards] = ladder[i] as [string, Card[]];
      const lo = evaluate(loCards);
      const hi = evaluate(hiCards);
      assert.ok(compareHands(hi, lo) > 0, `${hiName} must beat ${loName}`);
      assert.ok(compareHands(lo, hi) < 0, `${loName} must lose to ${hiName}`);
    }
  });
  it('flush beats straight and full house beats flush numerically', () => {
    assert.ok(evaluate(FLUSH).category > evaluate(STRAIGHT).category);
    assert.ok(evaluate(FULL_HOUSE).category > evaluate(FLUSH).category);
    assert.ok(evaluate(STRAIGHT_FLUSH).category > evaluate(QUADS).category);
  });
});

describe('straights', () => {
  it('detects the ace-low wheel with high card 5', () => {
    const ev = evaluate(h('As', '2d', '3h', '4c', '5s', 'Kd', '9c'));
    assert.equal(ev.name, 'straight');
    assert.deepEqual([...ev.tiebreak], [5]);
  });

  it('wheel loses to a 6-high straight', () => {
    const wheel = evaluate(h('As', '2d', '3h', '4c', '5s', 'Kd', '9c'));
    const six = evaluate(h('6s', '5d', '4h', '3c', '2s', 'Kd', '9c'));
    assert.ok(compareHands(wheel, six) < 0);
    assert.ok(compareHands(six, wheel) > 0);
  });

  it('detects broadway (ace-high straight)', () => {
    const ev = evaluate(h('As', 'Kd', 'Qh', 'Jc', 'Ts', '2d', '3c'));
    assert.equal(ev.name, 'straight');
    assert.deepEqual([...ev.tiebreak], [14]);
  });

  it('picks the highest possible straight from 7 cards', () => {
    const ev = evaluate(h('4s', '5d', '6h', '7c', '8s', '9d', 'Tc'));
    assert.equal(ev.name, 'straight');
    assert.deepEqual([...ev.tiebreak], [10]);
  });

  it('wheel straight-flush is a straight-flush, not a royal', () => {
    const ev = evaluate(h('As', '2s', '3s', '4s', '5s', 'Kd', '9c'));
    assert.equal(ev.name, 'straight-flush');
    assert.equal(ev.category, 8);
    assert.deepEqual([...ev.tiebreak], [5]);
  });
});

describe('royal flush', () => {
  it('names T-J-Q-K-A suited royal-flush at category 8', () => {
    const ev = evaluate(ROYAL);
    assert.equal(ev.name, 'royal-flush');
    assert.equal(ev.category, 8);
    assert.deepEqual([...ev.tiebreak], [14]);
    assert.equal(ev.best.length, 5);
  });

  it('royal flush beats a king-high straight flush', () => {
    const kHigh = evaluate(h('Ks', 'Qs', 'Js', 'Ts', '9s', '5d', '3c'));
    assert.equal(kHigh.name, 'straight-flush');
    assert.ok(compareHands(evaluate(ROYAL), kHigh) > 0);
  });

  it('higher straight flush wins when both are straight flushes', () => {
    const nine = evaluate(STRAIGHT_FLUSH);
    const eight = evaluate(h('8d', '7d', '6d', '5d', '4d', 'Kc', '2h'));
    assert.ok(compareHands(nine, eight) > 0);
    assert.ok(compareHands(eight, nine) < 0);
  });
});

describe('straight flush vs four of a kind', () => {
  it('a 9-high straight flush beats quad aces', () => {
    const sf = evaluate(STRAIGHT_FLUSH);
    const quadAces = evaluate(h('As', 'Ad', 'Ah', 'Ac', 'Kd', 'Qh', '2c'));
    assert.equal(quadAces.name, 'four-of-a-kind');
    assert.ok(compareHands(sf, quadAces) > 0, 'category must trump raw rank');
  });
});

describe('full house', () => {
  it('trips decide between competing full houses', () => {
    const acesFull = evaluate(h('As', 'Ad', 'Ah', 'Ks', 'Kd', '3c', '2h'));
    const kingsFull = evaluate(h('Ks', 'Kd', 'Kh', 'As', 'Ad', '3c', '2h'));
    assert.deepEqual([...acesFull.tiebreak], [14, 13]);
    assert.deepEqual([...kingsFull.tiebreak], [13, 14]);
    assert.ok(compareHands(acesFull, kingsFull) > 0);
  });

  it('pair decides when trips match', () => {
    const a = evaluate(h('Ks', 'Kd', 'Kh', 'As', 'Ad', '3c', '2h'));
    const b = evaluate(h('Ks', 'Kd', 'Kh', 'Qs', 'Qd', '3c', '2h'));
    assert.ok(compareHands(a, b) > 0);
  });

  it('double trips play as the higher trips full of the lower trips', () => {
    const ev = evaluate(h('As', 'Ad', 'Ah', 'Ks', 'Kd', 'Kc', 'Qh'));
    assert.equal(ev.name, 'full-house');
    assert.deepEqual([...ev.tiebreak], [14, 13]);
  });
});

describe('flush', () => {
  it('uses the top 5 suited cards with descending tiebreak', () => {
    const ev = evaluate(h('As', 'Ks', 'Qs', 'Js', '8s', '7s', '2d'));
    assert.equal(ev.name, 'flush');
    assert.deepEqual([...ev.tiebreak], [14, 13, 12, 11, 8]);
  });

  it('flush beats straight', () => {
    assert.ok(compareHands(evaluate(FLUSH), evaluate(STRAIGHT)) > 0);
  });

  it('higher flush wins; identical flushes tie', () => {
    const nut = evaluate(h('As', 'Ks', 'Qs', 'Js', '9s', '2d', '3c'));
    const weak = evaluate(h('As', 'Ks', 'Qs', 'Js', '8s', '2d', '3c'));
    assert.ok(compareHands(nut, weak) > 0);
    assert.equal(compareHands(nut, evaluate(h('As', 'Ks', 'Qs', 'Js', '9s', '2d', '3c'))), 0);
  });
});

describe('pairs and kickers', () => {
  it('kicker decides one-pair ties', () => {
    const p1 = evaluate(h('Ks', 'Kd', 'Ah', 'Qh', '9c', '7s', '2d'));
    const p2 = evaluate(h('Ks', 'Kd', 'Ah', 'Qh', '8c', '7s', '2d'));
    assert.deepEqual([...p1.tiebreak], [13, 14, 12, 9]);
    assert.ok(compareHands(p1, p2) > 0);
    assert.ok(compareHands(p2, p1) < 0);
  });

  it('higher pair wins regardless of kickers', () => {
    const queens = evaluate(h('Qs', 'Qd', 'Ah', '9c', '7s', '3d', '2h'));
    const jacks = evaluate(h('Js', 'Jd', 'Ah', 'Kc', '9s', '7d', '3c'));
    assert.ok(compareHands(queens, jacks) > 0);
  });

  it('two pair with same pairs is decided by the kicker', () => {
    const p1 = evaluate(h('Ks', 'Kd', 'Qh', 'Qs', 'Ah', '7c', '2d'));
    const p2 = evaluate(h('Ks', 'Kd', 'Qh', 'Qs', 'Jh', '7c', '2d'));
    assert.deepEqual([...p1.tiebreak], [13, 12, 14]);
    assert.deepEqual([...p2.tiebreak], [13, 12, 11]);
    assert.ok(compareHands(p1, p2) > 0);
  });

  it('uses the top two pairs when three pairs are present', () => {
    const ev = evaluate(h('Ks', 'Kd', 'Qh', 'Qs', 'Jc', 'Jd', '2s'));
    assert.equal(ev.name, 'two-pair');
    assert.deepEqual([...ev.tiebreak], [13, 12, 11]);
  });

  it('quad kicker decides', () => {
    const a = evaluate(h('9s', '9d', '9h', '9c', 'As', '5d', '3c'));
    const b = evaluate(h('9s', '9d', '9h', '9c', 'Ks', '5d', '3c'));
    assert.deepEqual([...a.tiebreak], [9, 14]);
    assert.ok(compareHands(a, b) > 0);
  });

  it('three of a kind keeps the two best kickers', () => {
    const ev = evaluate(h('Ks', 'Kd', 'Kh', 'As', 'Qd', '7c', '2h'));
    assert.deepEqual([...ev.tiebreak], [13, 14, 12]);
  });
});

describe('ties and split pots', () => {
  it('identical boards tie even with different hole cards', () => {
    // Royal flush on the board: hole cards cannot change anything.
    const board = ['As', 'Ks', 'Qs', 'Js', 'Ts'];
    const p1 = evaluate(h(...board, '2c', '3d'));
    const p2 = evaluate(h(...board, '4h', '5s'));
    assert.equal(p1.name, 'royal-flush');
    assert.equal(compareHands(p1, p2), 0);
    assert.equal(compareHands(p2, p1), 0);
  });

  it('same straight from different kickers ties', () => {
    const a = evaluate(h('9s', '8d', '7h', '6c', '5s', 'Kd', '2c'));
    const b = evaluate(h('9h', '8c', '7d', '6s', '5h', 'Ad', '3c'));
    assert.equal(compareHands(a, b), 0);
  });

  it('counterfeited pair: board straight plays for both players', () => {
    // Board 8-7-6-5-4 is a straight; pocket 8s are counterfeited.
    const board = ['8c', '7s', '6d', '5h', '4c'];
    const p1 = evaluate(h(...board, '8s', '8d'));
    const p2 = evaluate(h(...board, '7h', '6c'));
    assert.equal(p1.name, 'straight', 'pocket pair must not outrank the board straight');
    assert.equal(p2.name, 'straight');
    assert.equal(compareHands(p1, p2), 0);
  });
});

describe('robustness', () => {
  it('never throws on empty or short arrays', () => {
    const empty = evaluate([]);
    assert.equal(empty.category, 0);
    assert.equal(empty.name, 'high-card');
    assert.deepEqual([...empty.tiebreak], []);
    assert.deepEqual([...empty.best], []);

    const two = evaluate(h('As', 'Kd'));
    assert.equal(two.category, 0);
    assert.equal(two.best.length, 2);
    assert.deepEqual([...two.tiebreak], [14, 13]);

    const four = evaluate(h('As', 'Kd', 'Qh', 'Jc'));
    assert.equal(four.category, 0);
    assert.equal(four.best.length, 4);
  });

  it('treats duplicate cards as given without crashing', () => {
    const ev = evaluate(h('As', 'As', 'As', 'As', 'Ks'));
    assert.equal(ev.name, 'four-of-a-kind');
    assert.equal(ev.category, 7);
  });

  it('handles 5- and 6-card inputs', () => {
    const five = evaluate(h('Ts', 'Js', 'Qs', 'Ks', 'As'));
    assert.equal(five.name, 'royal-flush');
    assert.equal(five.best.length, 5);

    const six = evaluate(h('As', 'Ks', 'Qs', 'Js', '9s', '2d'));
    assert.equal(six.name, 'flush');
    assert.deepEqual([...six.tiebreak], [14, 13, 12, 11, 9]);
  });

  it('best always holds exactly 5 cards for 5+ card inputs', () => {
    const fixtures = [HIGH_CARD, ONE_PAIR, TWO_PAIR, TRIPS, STRAIGHT, FLUSH, FULL_HOUSE, QUADS, STRAIGHT_FLUSH, ROYAL];
    for (const f of fixtures) {
      assert.equal(evaluate(f).best.length, 5);
    }
  });

  it('high card tiebreak is the descending ranks of the best five', () => {
    const ev = evaluate(HIGH_CARD);
    assert.deepEqual([...ev.tiebreak], [13, 12, 11, 9, 7]);
  });
});
