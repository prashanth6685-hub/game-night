// Tests for games/poker/logic/bots.ts
// Run: node --test client/src/games/poker/logic/bots.test.ts (from repo root)
// (or bash scripts/run-tests.sh from the repo root)
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { applyAction, createTable, legalActions, potTotal, startHand } from './engine.ts';
import type { LegalAction, PokerAction, PokerState, Street } from './engine.ts';
import type { Card } from './cards.ts';
import { makeDeck, shuffle } from './cards.ts';
import { chooseBotAction } from './bots.ts';
import type { BotPersonality } from './bots.ts';

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

const PERSONALITIES: readonly BotPersonality[] = [
  'conservative',
  'aggressive',
  'balanced',
  'beginner',
];

function card(rank: number, suit: Card['suit']): Card {
  return { rank, suit };
}

function newTable(playerCount: number, stack: number, seed: number): PokerState {
  const names = Array.from({ length: playerCount }, (_, i) => `P${i}`);
  return createTable({
    names,
    isBot: names.map(() => true),
    startingStack: stack,
    smallBlind: 5,
    bigBlind: 10,
    random: mulberry32(seed),
  });
}

/**
 * Build a plausible mid-hand state by hand (no real dealing). The bot at
 * `seat` holds `hole`; the board is `community`. Everyone else's hole cards
 * are left empty — the bot must never need them.
 */
function rigSpot(opts: {
  seed: number;
  seat?: number;
  hole?: readonly Card[];
  community?: readonly Card[];
  street?: Street;
  toCall?: number;
  myBet?: number;
  pot?: number;
}): { state: PokerState; seat: number } {
  const s = newTable(4, 1000, opts.seed);
  const seat = opts.seat ?? 2;
  const street = opts.street ?? 'preflop';
  const toCall = opts.toCall ?? 0;
  const myBet = Math.min(opts.myBet ?? 0, toCall);
  s.street = street;
  s.button = 0;
  s.actorSeat = seat;
  s.toCall = toCall;
  s.lastIncrement = 20;
  s.minRaiseTo = toCall + 20;
  const hole = opts.hole ?? [card(14, 'spades'), card(13, 'spades')];
  const community = opts.community ?? [];
  const pot = opts.pot ?? 60;
  // Spread the pot across everyone's committed chips.
  const shares = [0.4, 0.25, 0.2, 0.15];
  for (let i = 0; i < s.players.length; i++) {
    const p = s.players[i];
    if (!p) continue;
    const share = shares[i] ?? 0.1;
    if (i === seat) {
      p.hole = [...hole];
      p.bet = myBet;
      p.chips = 1000 - myBet;
      p.handCommitted = myBet + Math.round(pot * share);
    } else {
      p.hole = [];
      p.bet = 0;
      p.chips = 1000;
      p.handCommitted = Math.round(pot * share);
    }
    p.acted = true;
  }
  s.community = [...community];
  return { state: s, seat };
}

/** The returned action must be constructible from legalActions(state, seat). */
function assertLegal(state: PokerState, seat: number, action: PokerAction): void {
  const legal = legalActions(state, seat);
  const types = new Set(legal.map((a) => a.type));
  assert.ok(
    types.has(action.type),
    `action ${action.type} not in legal set [${[...types].join(',')}]`,
  );
  if (action.type === 'bet') {
    const la = legal.find((a): a is Extract<LegalAction, { type: 'bet' }> => a.type === 'bet');
    assert.ok(la, 'bet not legal');
    assert.ok(
      action.amount >= la.min && action.amount <= la.max,
      `bet ${action.amount} outside [${la.min},${la.max}]`,
    );
  }
  if (action.type === 'raise') {
    const la = legal.find(
      (a): a is Extract<LegalAction, { type: 'raise' }> => a.type === 'raise',
    );
    assert.ok(la, 'raise not legal');
    assert.ok(
      action.amount >= la.minTo && action.amount <= la.maxTo,
      `raise ${action.amount} outside [${la.minTo},${la.maxTo}]`,
    );
  }
}

/** Play one full hand with bot personalities; assert every action applies. */
function playHand(
  playerCount: number,
  stack: number,
  seed: number,
  personalities: readonly BotPersonality[],
): { hands: number; actions: number } {
  const rng = mulberry32(seed);
  let state = newTable(playerCount, stack, seed);
  const totalChips = playerCount * stack;
  const start = startHand(state);
  assert.equal(start.ok, true, `startHand failed: ${!start.ok ? start.error : ''}`);
  if (!start.ok) throw new Error('unreachable');
  state = start.state;

  let actions = 0;
  while (state.street !== 'complete') {
    assert.ok(actions < 500, 'hand did not terminate within 500 actions');
    const seat = state.actorSeat;
    assert.ok(seat >= 0, 'no actor with hand in progress');
    // Chip conservation: chips on table + in stacks stays constant.
    let chips = 0;
    for (const p of state.players) chips += p.chips;
    assert.equal(chips + potTotal(state), totalChips, 'chips leaked mid-hand');
    const personality = personalities[seat] ?? 'balanced';
    const action = chooseBotAction(state, seat, personality, rng);
    assertLegal(state, seat, action);
    const res = applyAction(state, seat, action);
    assert.equal(res.ok, true, `applyAction rejected bot action: ${!res.ok ? res.error : ''}`);
    if (!res.ok) throw new Error('unreachable');
    state = res.state;
    actions++;
  }
  let chips = 0;
  for (const p of state.players) chips += p.chips;
  assert.equal(chips, totalChips, 'chips not conserved after hand');
  return { hands: 1, actions };
}

// ---------------------------------------------------------------------------
// Legality fuzz: full simulated hands
// ---------------------------------------------------------------------------

describe('chooseBotAction legality (full-hand fuzz)', () => {
  it('plays many full hands with every bot action applying cleanly', () => {
    let totalActions = 0;
    let hands = 0;
    for (let seed = 1; seed <= 40; seed++) {
      const playerCount = 2 + (seed % 5); // 2..6 players
      const stack = seed % 7 === 0 ? 25 : 1000; // sometimes short-stacked
      const personalities: BotPersonality[] = Array.from(
        { length: playerCount },
        (_, i) => PERSONALITIES[(seed + i) % PERSONALITIES.length] as BotPersonality,
      );
      const r = playHand(playerCount, stack, seed * 7919, personalities);
      hands += r.hands;
      totalActions += r.actions;
    }
    assert.ok(hands === 40, `expected 40 hands, got ${hands}`);
    assert.ok(totalActions > 200, `expected real play, got ${totalActions} actions`);
  });

  it('survives heads-up micro-stack all-in wars', () => {
    for (let seed = 101; seed <= 110; seed++) {
      playHand(2, 30, seed, ['aggressive', 'aggressive']);
    }
  });

  it('handles a table of pure beginners without crashing', () => {
    for (let seed = 201; seed <= 210; seed++) {
      playHand(6, 1000, seed, ['beginner', 'beginner', 'beginner', 'beginner', 'beginner', 'beginner']);
    }
  });
});

// ---------------------------------------------------------------------------
// Legality on synthetic edge states
// ---------------------------------------------------------------------------

describe('chooseBotAction on synthetic states', () => {
  it('returns only legal actions across random rigged spots', () => {
    const streets: Street[] = ['preflop', 'flop', 'turn', 'river'];
    for (let seed = 1; seed <= 300; seed++) {
      const rng = mulberry32(seed);
      const deck = shuffle(makeDeck(), rng);
      const street = streets[Math.floor(rng() * streets.length)] ?? 'preflop';
      const boardCount = street === 'preflop' ? 0 : street === 'flop' ? 3 : street === 'turn' ? 4 : 5;
      const hole: Card[] = [];
      const community: Card[] = [];
      for (let i = 0; i < 2; i++) {
        const c = deck.pop();
        if (c) hole.push(c);
      }
      for (let i = 0; i < boardCount; i++) {
        const c = deck.pop();
        if (c) community.push(c);
      }
      const toCallChoices = [0, 10, 20, 40, 80, 200];
      const toCall = toCallChoices[Math.floor(rng() * toCallChoices.length)] ?? 0;
      const myBet = toCall > 0 && rng() < 0.5 ? 10 : 0;
      const { state, seat } = rigSpot({
        seed,
        hole,
        community,
        street,
        toCall,
        myBet,
        pot: Math.floor(rng() * 300),
      });
      for (const personality of PERSONALITIES) {
        const action = chooseBotAction(state, seat, personality, mulberry32(seed));
        assertLegal(state, seat, action);
      }
    }
  });

  it('falls back gracefully when it is not the bot turn', () => {
    const { state, seat } = rigSpot({ seed: 7, toCall: 0 });
    const notActor = (seat + 1) % 4;
    for (const personality of PERSONALITIES) {
      const action = chooseBotAction(state, notActor, personality, mulberry32(7));
      // Not the actor: fold (legal) is the preferred fallback.
      assert.equal(action.type, 'fold');
    }
  });

  it('returns a legal fallback on a completed hand', () => {
    const s = newTable(3, 1000, 9);
    assert.equal(s.street, 'complete');
    for (const personality of PERSONALITIES) {
      const action = chooseBotAction(s, 0, personality, mulberry32(9));
      assert.equal(action.type, 'fold');
    }
  });

  it('never touches other players hole cards (frozen)', () => {
    const { state, seat } = rigSpot({
      seed: 11,
      hole: [card(9, 'hearts'), card(9, 'diamonds')],
      community: [card(2, 'clubs'), card(7, 'spades'), card(12, 'hearts')],
      street: 'flop',
      toCall: 20,
      myBet: 0,
    });
    for (const p of state.players) {
      if (p.seat !== seat) {
        p.hole = [card(14, 'spades'), card(14, 'hearts')]; // aces the bot must not see
        Object.freeze(p.hole);
      }
    }
    for (const personality of PERSONALITIES) {
      const action = chooseBotAction(state, seat, personality, mulberry32(11));
      assertLegal(state, seat, action);
      // A bot that peeked would play aces-strong; with 99 on a Q-high board
      // facing a bet it must not suddenly play like it holds pocket aces.
      assert.notEqual(action.type, 'all-in');
    }
  });
});

// ---------------------------------------------------------------------------
// Personality tendencies
// ---------------------------------------------------------------------------

describe('personality tendencies', () => {
  it('conservative folds 7-2 offsuit preflop to a raise', () => {
    const { state, seat } = rigSpot({
      seed: 21,
      hole: [card(7, 'clubs'), card(2, 'diamonds')],
      street: 'preflop',
      toCall: 30,
      myBet: 10,
      pot: 45,
    });
    const action = chooseBotAction(state, seat, 'conservative', mulberry32(21));
    assert.equal(action.type, 'fold');
  });

  it('never folds pocket aces preflop (any personality)', () => {
    for (const personality of PERSONALITIES) {
      const { state, seat } = rigSpot({
        seed: 22,
        hole: [card(14, 'spades'), card(14, 'hearts')],
        street: 'preflop',
        toCall: 30,
        myBet: 10,
        pot: 45,
      });
      const action = chooseBotAction(state, seat, personality, mulberry32(22));
      assert.ok(
        action.type === 'raise' || action.type === 'call',
        `${personality} did ${action.type} with pocket aces`,
      );
    }
  });

  it('aggressive bets/raises more often than conservative', () => {
    const counts: Record<BotPersonality, number> = {
      conservative: 0,
      aggressive: 0,
      balanced: 0,
      beginner: 0,
    };
    const streets: Street[] = ['preflop', 'flop', 'turn', 'river'];
    const SAMPLES = 400;
    for (let seed = 1; seed <= SAMPLES; seed++) {
      const rng = mulberry32(seed * 31 + 7);
      const deck = shuffle(makeDeck(), rng);
      const street = streets[Math.floor(rng() * streets.length)] ?? 'preflop';
      const boardCount = street === 'preflop' ? 0 : street === 'flop' ? 3 : street === 'turn' ? 4 : 5;
      const hole: Card[] = [];
      const community: Card[] = [];
      for (let i = 0; i < 2; i++) {
        const c = deck.pop();
        if (c) hole.push(c);
      }
      for (let i = 0; i < boardCount; i++) {
        const c = deck.pop();
        if (c) community.push(c);
      }
      const toCall = rng() < 0.5 ? 0 : 20;
      const { state, seat } = rigSpot({ seed, hole, community, street, toCall, myBet: 0 });
      for (const personality of PERSONALITIES) {
        // Same random stream per personality so the difference is the profile.
        const action = chooseBotAction(state, seat, personality, mulberry32(seed));
        if (action.type === 'bet' || action.type === 'raise' || action.type === 'all-in') {
          counts[personality]++;
        }
      }
    }
    assert.ok(
      counts.aggressive > counts.conservative,
      `aggressive (${counts.aggressive}) should bet/raise more than conservative (${counts.conservative})`,
    );
    assert.ok(
      counts.balanced > counts.conservative,
      `balanced (${counts.balanced}) should bet/raise more than conservative (${counts.conservative})`,
    );
    assert.ok(
      counts.beginner < counts.aggressive,
      `beginner (${counts.beginner}) should bet/raise less than aggressive (${counts.aggressive})`,
    );
  });

  it('beginner calls loosely with draws facing a bet', () => {
    // Four to a flush on the flop, facing a half-pot-ish bet.
    const { state, seat } = rigSpot({
      seed: 23,
      hole: [card(9, 'hearts'), card(5, 'hearts')],
      community: [card(2, 'hearts'), card(7, 'hearts'), card(13, 'clubs')],
      street: 'flop',
      toCall: 40,
      myBet: 0,
      pot: 100,
    });
    const action = chooseBotAction(state, seat, 'beginner', mulberry32(23));
    assert.ok(
      action.type === 'call' || action.type === 'raise',
      `beginner should chase the flush draw, did ${action.type}`,
    );
  });
});
