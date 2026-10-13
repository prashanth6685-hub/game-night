// 7-card best-5-card Texas Hold'em hand evaluator.
// Pure logic — no React, no DOM. Tested in handEval.test.ts.
import type { Card } from './cards.ts';

export type HandRankName =
  | 'high-card'
  | 'one-pair'
  | 'two-pair'
  | 'three-of-a-kind'
  | 'straight'
  | 'flush'
  | 'full-house'
  | 'four-of-a-kind'
  | 'straight-flush'
  | 'royal-flush';

export interface EvaluatedHand {
  /** 0=high card .. 8=straight flush (royal flush is category 8 with name 'royal-flush'). */
  readonly category: number;
  readonly name: HandRankName;
  /** Descending significant ranks, e.g. full house aces-full-of-kings -> [14,13]. */
  readonly tiebreak: readonly number[];
  /** The 5 cards forming the hand. */
  readonly best: readonly Card[];
}

const CATEGORY: Record<HandRankName, number> = {
  'high-card': 0,
  'one-pair': 1,
  'two-pair': 2,
  'three-of-a-kind': 3,
  straight: 4,
  flush: 5,
  'full-house': 6,
  'four-of-a-kind': 7,
  'straight-flush': 8,
  'royal-flush': 8,
};

function make(name: HandRankName, tiebreak: readonly number[], best: readonly Card[]): EvaluatedHand {
  return { category: CATEGORY[name], name, tiebreak, best };
}

interface RankGroup {
  rank: number;
  cards: Card[];
}

/**
 * Highest straight top-card among descending unique ranks, or 0 if none.
 * Ace plays low (wheel A-2-3-4-5 -> 5).
 */
function straightHigh(descUniqueRanks: readonly number[]): number {
  const ranks = [...descUniqueRanks];
  if (ranks[0] === 14) ranks.push(1); // ace-low sentinel
  let run = 1;
  for (let i = 1; i < ranks.length; i++) {
    const prev = ranks[i - 1] as number;
    const cur = ranks[i] as number;
    if (cur === prev - 1) {
      run++;
      // run cards are ranks[i-4..i]; prev (ranks[i-1]) is the 4th of the 5,
      // so the top of the straight is prev + 3.
      if (run === 5) return prev + 3;
    } else if (cur !== prev) {
      run = 1;
    }
  }
  return 0;
}

/** One card per requested rank (first card of each rank group). */
function pickByRank(groups: ReadonlyMap<number, Card[]>, ranks: readonly number[]): Card[] {
  const out: Card[] = [];
  for (const r of ranks) {
    const g = groups.get(r === 1 ? 14 : r);
    if (g && g.length > 0) out.push(g[0] as Card);
  }
  return out;
}

/** The 5 cards forming a straight with the given high card. */
function straightCards(groups: ReadonlyMap<number, Card[]>, high: number): Card[] {
  const ranks = high === 5 ? [5, 4, 3, 2, 14] : [high, high - 1, high - 2, high - 3, high - 4];
  return pickByRank(groups, ranks);
}

/** Highest n cards (already rank-sorted desc) whose ranks are not excluded. */
function kickers(desc: readonly Card[], excludeRanks: ReadonlySet<number>, n: number): Card[] {
  const out: Card[] = [];
  for (const c of desc) {
    if (out.length >= n) break;
    if (!excludeRanks.has(c.rank)) out.push(c);
  }
  return out;
}

/**
 * Best 5-card hand from ALL cards given (5, 6 or 7; more also work).
 * Never throws on array input: empty/short arrays -> category 0 high-card
 * with whatever cards exist. Duplicate cards are treated as given.
 */
export function evaluate(cards: readonly Card[]): EvaluatedHand {
  const valid: Card[] = [];
  if (Array.isArray(cards)) {
    for (const c of cards) {
      if (c && typeof c.rank === 'number' && typeof c.suit === 'string') valid.push(c);
    }
  }
  if (valid.length === 0) return make('high-card', [], []);

  const desc = [...valid].sort((a, b) => b.rank - a.rank);
  if (valid.length < 5) {
    // Not enough for a real hand: high-card with whatever exists.
    return make('high-card', desc.map((c) => c.rank), desc);
  }

  const byRank = new Map<number, Card[]>();
  for (const c of desc) {
    const g = byRank.get(c.rank);
    if (g) g.push(c);
    else byRank.set(c.rank, [c]);
  }
  const groups: RankGroup[] = [...byRank.entries()]
    .map(([rank, groupCards]) => ({ rank, cards: groupCards }))
    .sort((a, b) => b.cards.length - a.cards.length || b.rank - a.rank);

  const bySuit = new Map<string, Card[]>();
  for (const c of desc) {
    const g = bySuit.get(c.suit);
    if (g) g.push(c);
    else bySuit.set(c.suit, [c]);
  }
  const flushGroup = [...bySuit.values()].find((g) => g.length >= 5);

  const uniqueRanks = [...byRank.keys()].sort((a, b) => b - a);

  // --- Straight flush (and royal) ---
  if (flushGroup) {
    const suitRanks = [...new Set(flushGroup.map((c) => c.rank))].sort((a, b) => b - a);
    const sfHigh = straightHigh(suitRanks);
    if (sfHigh > 0) {
      const suitByRank = new Map<number, Card[]>();
      for (const c of flushGroup) {
        const g = suitByRank.get(c.rank);
        if (g) g.push(c);
        else suitByRank.set(c.rank, [c]);
      }
      const best = straightCards(suitByRank, sfHigh);
      if (sfHigh === 14) return make('royal-flush', [14], best);
      return make('straight-flush', [sfHigh], best);
    }
  }

  // --- Four of a kind ---
  const quad = groups.find((g) => g.cards.length >= 4);
  if (quad) {
    const k = kickers(desc, new Set([quad.rank]), 1);
    const best = [...quad.cards.slice(0, 4), ...k];
    const tiebreak = [quad.rank, ...(k[0] ? [k[0].rank] : [])];
    return make('four-of-a-kind', tiebreak, best);
  }

  // --- Full house (a second trips counts as the pair) ---
  const trip = groups.find((g) => g.cards.length >= 3);
  const pairForHouse = trip
    ? groups.find((g) => g !== trip && g.cards.length >= 2)
    : undefined;
  if (trip && pairForHouse) {
    const best = [...trip.cards.slice(0, 3), ...pairForHouse.cards.slice(0, 2)];
    return make('full-house', [trip.rank, pairForHouse.rank], best);
  }

  // --- Flush ---
  if (flushGroup) {
    const best = flushGroup.slice(0, 5);
    return make('flush', best.map((c) => c.rank), best);
  }

  // --- Straight ---
  const stHigh = straightHigh(uniqueRanks);
  if (stHigh > 0) {
    return make('straight', [stHigh], straightCards(byRank, stHigh));
  }

  // --- Three of a kind ---
  if (trip) {
    const ks = kickers(desc, new Set([trip.rank]), 2);
    const best = [...trip.cards.slice(0, 3), ...ks];
    return make('three-of-a-kind', [trip.rank, ...ks.map((c) => c.rank)], best);
  }

  // --- Two pair (three pairs possible: use top two) ---
  const pairs = groups.filter((g) => g.cards.length >= 2).sort((a, b) => b.rank - a.rank);
  if (pairs.length >= 2) {
    const hp = pairs[0] as RankGroup;
    const lp = pairs[1] as RankGroup;
    const ks = kickers(desc, new Set([hp.rank, lp.rank]), 1);
    const best = [...hp.cards.slice(0, 2), ...lp.cards.slice(0, 2), ...ks];
    return make('two-pair', [hp.rank, lp.rank, ...(ks[0] ? [ks[0].rank] : [])], best);
  }

  // --- One pair ---
  if (pairs.length === 1) {
    const p = pairs[0] as RankGroup;
    const ks = kickers(desc, new Set([p.rank]), 3);
    const best = [...p.cards.slice(0, 2), ...ks];
    return make('one-pair', [p.rank, ...ks.map((c) => c.rank)], best);
  }

  // --- High card ---
  const best = desc.slice(0, 5);
  return make('high-card', best.map((c) => c.rank), best);
}

/**
 * Compare two evaluated hands. >0 if a wins, <0 if b wins, 0 on a tie.
 * Compares category first, then tiebreak ranks element-wise.
 */
export function compareHands(a: EvaluatedHand, b: EvaluatedHand): number {
  if (a.category !== b.category) return a.category > b.category ? 1 : -1;
  const n = Math.min(a.tiebreak.length, b.tiebreak.length);
  for (let i = 0; i < n; i++) {
    const x = a.tiebreak[i] as number;
    const y = b.tiebreak[i] as number;
    if (x !== y) return x > y ? 1 : -1;
  }
  return 0;
}
