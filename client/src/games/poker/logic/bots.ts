// Poker bot AI for Texas Hold'em Practice Mode.
// Pure TypeScript — no React, no I/O, no module-level mutable state.
//
// FAIRNESS: a bot may only ever read its own hole cards
// (`state.players[seat].hole`), the community cards, and public table
// information (bets, chips, pot, position, street, toCall). It never reads
// another player's `hole` array. The implementation below only indexes
// `hole` on the bot's own player object.

import { evaluate } from './handEval.ts';
import { legalActions, potTotal } from './engine.ts';
import type { LegalAction, PokerAction, PokerState } from './engine.ts';
import type { Card } from './cards.ts';

export type BotPersonality = 'conservative' | 'aggressive' | 'balanced' | 'beginner';

// ---------------------------------------------------------------------------
// Personality profiles
// ---------------------------------------------------------------------------

interface BotProfile {
  /** How often the bot bets/raises instead of checking/calling with a hand. */
  aggression: number;
  /** Probability of a bluff bet when checked to with a weak hand. */
  bluffFreq: number;
  /** Higher = folds more marginal hands. */
  tightness: number;
  /** Extra equity beyond raw pot odds required to call (>0 = nitty, <0 = loose). */
  callSlack: number;
  /** Bet sizing as a fraction of the pot: [min, max]. */
  betFrac: readonly [number, number];
  /** Raise sizing as a fraction of the pot added on top of the call. */
  raiseFrac: readonly [number, number];
  /** Random jitter added to hand strength so play varies hand to hand. */
  jitter: number;
}

const PROFILES: Record<BotPersonality, BotProfile> = {
  conservative: {
    aggression: 0.32,
    bluffFreq: 0.02,
    tightness: 0.8,
    callSlack: 0.1,
    betFrac: [0.5, 0.9],
    raiseFrac: [0.5, 0.9],
    jitter: 0.05,
  },
  aggressive: {
    aggression: 0.78,
    bluffFreq: 0.12,
    tightness: 0.35,
    callSlack: -0.02,
    betFrac: [0.6, 1.1],
    raiseFrac: [0.6, 1.2],
    jitter: 0.07,
  },
  balanced: {
    aggression: 0.55,
    bluffFreq: 0.06,
    tightness: 0.55,
    callSlack: 0.03,
    betFrac: [0.5, 0.85],
    raiseFrac: [0.5, 0.9],
    jitter: 0.06,
  },
  beginner: {
    aggression: 0.22,
    bluffFreq: 0.03,
    tightness: 0.25,
    callSlack: -0.15,
    betFrac: [0.4, 0.7],
    raiseFrac: [0.4, 0.7],
    jitter: 0.1,
  },
};

// ---------------------------------------------------------------------------
// Hand strength
// ---------------------------------------------------------------------------

function cardScore(rank: number): number {
  switch (rank) {
    case 14:
      return 10;
    case 13:
      return 8;
    case 12:
      return 7;
    case 11:
      return 6;
    default:
      return rank / 2;
  }
}

/** Chen-formula-style preflop score, 0..20 (20 = pocket aces). */
function chenScore(a: Card, b: Card): number {
  const hi = Math.max(cardScore(a.rank), cardScore(b.rank));
  if (a.rank === b.rank) return Math.max(5, hi * 2);
  let score = hi;
  if (a.suit === b.suit) score += 2;
  const gap = Math.abs(a.rank - b.rank) - 1;
  if (gap === 1) score -= 1;
  else if (gap === 2) score -= 2;
  else if (gap === 3) score -= 4;
  else if (gap >= 4) score -= 5;
  // Small straight bonus for connected cards below a queen high.
  if (gap <= 1 && hi < cardScore(12)) score += 1;
  return Math.max(0, Math.ceil(score));
}

const CATEGORY_STRENGTH: readonly number[] = [
  0.12, // high-card
  0.34, // one-pair (refined below)
  0.55, // two-pair
  0.66, // three-of-a-kind
  0.74, // straight
  0.8, // flush
  0.88, // full-house
  0.95, // four-of-a-kind
  1.0, // straight-flush / royal-flush
];

/** Highest rank on the board, or 0 if the board is empty. */
function boardHigh(community: readonly Card[]): number {
  let hi = 0;
  for (const c of community) hi = Math.max(hi, c.rank);
  return hi;
}

/**
 * Postflop strength of the bot's own hand, 0..1.
 * Only reads the bot's hole cards and the community cards.
 */
function postflopStrength(hole: readonly Card[], community: readonly Card[]): number {
  const hand = evaluate([...hole, ...community]);
  const base = CATEGORY_STRENGTH[hand.category] ?? 0.12;
  if (hand.category === 1 && hole.length === 2 && community.length >= 3) {
    // Refine one-pair: overpair > top pair > middle/under pair.
    const h0 = hole[0];
    const h1 = hole[1];
    if (h0 && h1) {
      const hi = boardHigh(community);
      if (h0.rank === h1.rank) {
        return h0.rank > hi ? 0.48 : 0.3;
      }
      const topPair = h0.rank === hi || h1.rank === hi;
      return topPair ? 0.44 : 0.3;
    }
  }
  return base;
}

/** Straight-draw / flush-draw equity bonus, 0..~0.2. */
function drawBonus(hole: readonly Card[], community: readonly Card[]): number {
  if (community.length < 3) return 0;
  const all = [...hole, ...community];
  const hand = evaluate(all);
  // Made straights/flushes (or better) don't need draw equity.
  if (hand.category >= 4) return 0;
  let bonus = 0;
  // Four to a flush.
  const suits = new Map<string, number>();
  for (const c of all) suits.set(c.suit, (suits.get(c.suit) ?? 0) + 1);
  for (const n of suits.values()) {
    if (n === 4) bonus += 0.12;
  }
  // Open-ended / gutshot straight draw: look for 4 ranks inside a 5-window.
  const ranks = new Set<number>();
  for (const c of all) {
    ranks.add(c.rank);
    if (c.rank === 14) ranks.add(1); // ace plays low
  }
  let bestRun = 0;
  for (let low = 1; low <= 10; low++) {
    let run = 0;
    for (let r = low; r < low + 5; r++) {
      if (ranks.has(r)) run++;
    }
    bestRun = Math.max(bestRun, run);
  }
  if (bestRun === 4) {
    // Open-ended when the missing rank is at an end, else gutshot.
    let openEnded = false;
    for (let low = 1; low <= 10; low++) {
      const present: boolean[] = [];
      for (let r = low; r < low + 5; r++) present.push(ranks.has(r));
      const missing = present.filter((p) => !p).length;
      if (missing === 1 && (!present[0] || !present[4])) openEnded = true;
    }
    bonus += openEnded ? 0.1 : 0.06;
  }
  return Math.min(0.2, bonus);
}

/** Combined 0..1 estimate of the bot's current hand + draw equity. */
function estimateEquity(hole: readonly Card[], community: readonly Card[]): number {
  if (community.length === 0) {
    const a = hole[0];
    const b = hole[1];
    if (!a || !b) return 0.1;
    return Math.min(1, chenScore(a, b) / 20);
  }
  const made = postflopStrength(hole, community);
  return Math.min(0.97, made + drawBonus(hole, community));
}

// ---------------------------------------------------------------------------
// Legal-action helpers
// ---------------------------------------------------------------------------

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

function findAction<T extends LegalAction['type']>(
  legal: readonly LegalAction[],
  type: T,
): Extract<LegalAction, { type: T }> | undefined {
  for (const a of legal) {
    if (a.type === type) return a as Extract<LegalAction, { type: T }>;
  }
  return undefined;
}

function roundChips(n: number): number {
  return Math.max(1, Math.round(n));
}

/** Map the first legal action to a no-amount PokerAction (last-resort fallback). */
function fallbackAction(legal: readonly LegalAction[]): PokerAction {
  const first = legal[0];
  if (!first) return { type: 'fold' };
  switch (first.type) {
    case 'fold':
      return { type: 'fold' };
    case 'check':
      return { type: 'check' };
    case 'call':
      return { type: 'call' };
    case 'bet':
      return { type: 'bet', amount: first.min };
    case 'raise':
      return { type: 'raise', amount: first.minTo };
    case 'all-in':
      return { type: 'all-in' };
  }
}

/** Late position (closer to the button) plays slightly looser preflop. */
function positionBonus(state: PokerState, seat: number): number {
  const n = state.players.length;
  if (n <= 2) return 0;
  const dist = (((seat - state.button) % n) + n) % n; // 1 = small blind ... n-1 = just before button
  return (dist / n) * 0.08;
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

/**
 * Choose an action for the bot at `seat`. Pure function of
 * (state, seat, personality, random). The returned action is always legal:
 * it is derived from `legalActions(state, seat)` with bet/raise amounts
 * clamped into the legal range.
 */
export function chooseBotAction(
  state: PokerState,
  seat: number,
  personality: BotPersonality,
  random: () => number = Math.random,
): PokerAction {
  const profile = PROFILES[personality];
  const legal = legalActions(state, seat);

  // Not our turn (or no actions): return the safest legal option.
  if (state.actorSeat !== seat || legal.length === 0) {
    if (findAction(legal, 'fold')) return { type: 'fold' };
    if (findAction(legal, 'check')) return { type: 'check' };
    return fallbackAction(legal);
  }

  const me = state.players[seat];
  if (!me) return fallbackAction(legal);

  // Own hole cards only — never another player's.
  const hole: readonly Card[] = me.hole;
  const community: readonly Card[] = state.community;

  let strength = estimateEquity(hole, community);
  if (state.street === 'preflop') strength += positionBonus(state, seat);
  strength = clamp(strength + (random() - 0.5) * 2 * profile.jitter, 0.01, 1);

  const pot = potTotal(state);
  const need = Math.max(0, state.toCall - me.bet);
  const facingBet = need > 0;

  const betAction = findAction(legal, 'bet');
  const raiseAction = findAction(legal, 'raise');

  const potFrac = (lo: number, hi: number): number =>
    lo + random() * Math.max(0, hi - lo);

  const makeBet = (): PokerAction | undefined => {
    if (!betAction) return undefined;
    const target = pot * potFrac(profile.betFrac[0], profile.betFrac[1]);
    const amount = roundChips(clamp(target, betAction.min, betAction.max));
    // A bet that would take the whole stack is cleaner as an all-in.
    if (amount >= me.chips) return { type: 'all-in' };
    return { type: 'bet', amount };
  };

  const makeRaise = (): PokerAction | undefined => {
    if (!raiseAction) return undefined;
    const target = state.toCall + pot * potFrac(profile.raiseFrac[0], profile.raiseFrac[1]);
    const amount = roundChips(clamp(target, raiseAction.minTo, raiseAction.maxTo));
    if (amount >= me.bet + me.chips) return { type: 'all-in' };
    return { type: 'raise', amount };
  };

  if (!facingBet) {
    // Nobody bet yet: bet strong hands and bluffs, else check.
    const desire = strength - 0.48;
    const betProb = clamp(0.2 + profile.aggression * 0.55 + desire * 1.7, 0, 1);
    if (random() < betProb) {
      const bet = makeBet();
      if (bet) return bet;
    } else if (strength < 0.35 && random() < profile.bluffFreq && pot > 0) {
      const bet = makeBet();
      if (bet) return bet;
    }
    if (findAction(legal, 'check')) return { type: 'check' };
    return fallbackAction(legal);
  }

  // Facing a bet: pot-odds-based fold/call/raise decision.
  const callAmount = Math.min(need, me.chips);
  const odds = callAmount / (pot + callAmount);
  const required = odds + profile.callSlack + profile.tightness * 0.06;

  // Never fold a near-monster; never throw away chips on a hopeless hand
  // facing a real bet.
  if (strength < 0.9 && strength < required) {
    // ...unless the call is trivially cheap, then see a card sometimes.
    if (callAmount <= state.bigBlind && random() < 0.65 - profile.tightness * 0.4) {
      if (findAction(legal, 'call')) return { type: 'call' };
    }
    if (findAction(legal, 'fold')) return { type: 'fold' };
    if (findAction(legal, 'call')) return { type: 'call' };
    return fallbackAction(legal);
  }

  // Strong enough to continue: raise with the best hands (and a rare bluff
  // raise from aggressive bots), otherwise call.
  const raiseProb = clamp((strength - 0.6) * 2.4 + profile.aggression * 0.3, 0, 0.95);
  if (random() < raiseProb) {
    const raise = makeRaise();
    if (raise) return raise;
  } else if (
    profile.bluffFreq > 0.08 &&
    strength < 0.45 &&
    random() < profile.bluffFreq * 0.5
  ) {
    const raise = makeRaise();
    if (raise) return raise;
  }
  if (findAction(legal, 'call')) return { type: 'call' };
  return fallbackAction(legal);
}
