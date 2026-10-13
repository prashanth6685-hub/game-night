// Tests for the Texas Hold'em engine (engine.ts).
// Run: node --test shared/poker/engine.test.ts
// (or bash scripts/run-tests.sh from the repo root)
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { applyAction, createTable, legalActions, potTotal, rebuy, startHand } from './engine.ts';
import type { PokerAction, PokerEvent, PokerState, Street } from './engine.ts';
import type { Card, Suit } from './cards.ts';
import { makeDeck } from './cards.ts';

const rng = () => 0.5;

function table(
  names: string[] = ['Ann', 'Ben', 'Cat'],
  stack = 1000,
  sb = 10,
  bb = 20,
): PokerState {
  return createTable({
    names,
    isBot: names.map(() => true),
    startingStack: stack,
    smallBlind: sb,
    bigBlind: bb,
    random: rng,
  });
}

function mustStart(s: PokerState): { state: PokerState; events: PokerEvent[] } {
  const r = startHand(s);
  if (!r.ok) throw new Error(`startHand failed: ${r.error}`);
  return r;
}

function mustAct(
  s: PokerState,
  seat: number,
  action: PokerAction,
): { state: PokerState; events: PokerEvent[] } {
  const r = applyAction(s, seat, action);
  if (!r.ok) throw new Error(`applyAction failed: ${r.error}`);
  return r;
}

function mustFailAct(s: PokerState, seat: number, action: PokerAction): string {
  const r = applyAction(s, seat, action);
  assert.equal(r.ok, false, 'expected applyAction to fail');
  if (r.ok) throw new Error('unreachable');
  return r.error;
}

function C(rank: number, suit: Suit): Card {
  return { rank, suit };
}

function chipSum(s: PokerState): number {
  return s.players.reduce((n, p) => n + p.chips, 0);
}

interface SeatSpec {
  chips: number;
  bet?: number;
  committed?: number;
  hole?: Card[];
  folded?: boolean;
  allIn?: boolean;
  acted?: boolean;
}

/** Build an arbitrary mid-hand state for deterministic scenario tests. */
function customState(o: {
  seats: SeatSpec[];
  button?: number;
  street?: Street;
  community?: Card[];
  toCall?: number;
  minRaiseTo?: number;
  lastIncrement?: number;
  actorSeat?: number;
  sb?: number;
  bb?: number;
}): PokerState {
  const players = o.seats.map((sp, i) => ({
    seat: i,
    name: `P${i}`,
    isBot: true,
    chips: sp.chips,
    bet: sp.bet ?? 0,
    handCommitted: sp.committed ?? 0,
    hole: sp.hole ? [...sp.hole] : [],
    folded: sp.folded ?? false,
    allIn: sp.allIn ?? false,
    eliminated: false,
    acted: sp.acted ?? false,
  }));
  return {
    players,
    button: o.button ?? 0,
    handNumber: 1,
    street: o.street ?? 'river',
    community: o.community ? [...o.community] : [],
    deck: makeDeck(),
    toCall: o.toCall ?? 0,
    minRaiseTo: o.minRaiseTo ?? 20,
    lastIncrement: o.lastIncrement ?? 20,
    actorSeat: o.actorSeat ?? -1,
    smallBlind: o.sb ?? 10,
    bigBlind: o.bb ?? 20,
    winners: [],
    showdown: null,
    random: rng,
  };
}

/** Play a hand to completion with check/call-only bots. */
function finishHand(s0: PokerState): PokerState {
  let s = s0;
  for (let i = 0; i < 500; i++) {
    if (s.street === 'complete') return s;
    const actor = s.actorSeat;
    assert.ok(actor >= 0, 'hand stalled with no actor');
    const legal = legalActions(s, actor);
    const action: PokerAction = legal.some((a) => a.type === 'check')
      ? { type: 'check' }
      : legal.some((a) => a.type === 'call')
        ? { type: 'call' }
        : { type: 'fold' };
    s = mustAct(s, actor, action).state;
  }
  throw new Error('hand did not finish within 500 actions');
}

// ---------------------------------------------------------------------------

describe('createTable', () => {
  it('creates the initial table state', () => {
    const t = table(['Ann', 'Ben']);
    assert.equal(t.street, 'complete');
    assert.equal(t.handNumber, 0);
    assert.equal(t.button, -1);
    assert.equal(t.actorSeat, -1);
    assert.equal(t.players.length, 2);
    assert.equal(t.players[0]?.name, 'Ann');
    assert.equal(t.players[0]?.seat, 0);
    assert.equal(t.players[0]?.chips, 1000);
    assert.equal(t.players[1]?.isBot, true);
    assert.equal(t.smallBlind, 10);
    assert.equal(t.bigBlind, 20);
  });

  it('throws on invalid configs', () => {
    assert.throws(() => table(['Solo']), /2-8/);
    assert.throws(() => table(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i']), /2-8/);
    assert.throws(
      () =>
        createTable({ names: ['a', 'b'], isBot: [true], startingStack: 100, smallBlind: 5, bigBlind: 10 }),
      /same length/,
    );
    assert.throws(() => table(['a', 'b'], 100, 10, 10), /smallBlind/); // sb !< bb
    assert.throws(() => table(['a', 'b'], 100, 20, 10), /smallBlind/); // sb > bb
    assert.throws(() => table(['a', 'b'], 100, 0, 10), /smallBlind/); // sb = 0
    assert.throws(() => table(['a', 'b'], 50, 5, 100), /smallBlind/); // bb > stack
  });
});

describe('startHand', () => {
  it('posts blinds heads-up: button is SB and acts first', () => {
    const { state: s, events } = mustStart(table(['Ann', 'Ben']));
    assert.equal(s.handNumber, 1);
    assert.equal(s.button, 0);
    assert.equal(s.street, 'preflop');
    assert.equal(s.players[0]?.bet, 10);
    assert.equal(s.players[0]?.chips, 990);
    assert.equal(s.players[1]?.bet, 20);
    assert.equal(s.players[1]?.chips, 980);
    assert.equal(s.toCall, 20);
    assert.equal(s.minRaiseTo, 40);
    assert.equal(s.actorSeat, 0);
    assert.equal(s.players[0]?.hole.length, 2);
    assert.equal(s.players[1]?.hole.length, 2);
    assert.equal(s.deck.length, 48);
    assert.deepEqual(events, [
      { kind: 'blind', seat: 0, amount: 10, blind: 'small' },
      { kind: 'blind', seat: 1, amount: 20, blind: 'big' },
      { kind: 'deal' },
      { kind: 'street', street: 'preflop' },
    ]);
  });

  it('posts blinds 3-handed: SB=button+1, BB=button+2, UTG acts first', () => {
    const { state: s } = mustStart(table());
    assert.equal(s.button, 0);
    assert.equal(s.players[0]?.bet, 0);
    assert.equal(s.players[1]?.bet, 10);
    assert.equal(s.players[2]?.bet, 20);
    assert.equal(s.actorSeat, 0);
    assert.equal(s.deck.length, 46);
  });

  it('fails when a hand is already in progress', () => {
    const s = mustStart(table(['Ann', 'Ben'])).state;
    const r = startHand(s);
    assert.equal(r.ok, false);
  });

  it('fails with fewer than 2 active players', () => {
    const t = table(['Ann', 'Ben']);
    const gone = t.players[1];
    assert.ok(gone);
    gone.chips = 0;
    gone.eliminated = true;
    const r = startHand(t);
    assert.equal(r.ok, false);
  });

  it('short-stacked blind posts all-in for whatever is left', () => {
    const t = table(['Ann', 'Ben']);
    const ann = t.players[0];
    assert.ok(ann);
    ann.chips = 5;
    const { state: s, events } = mustStart(t);
    assert.equal(s.players[0]?.bet, 5);
    assert.equal(s.players[0]?.chips, 0);
    assert.equal(s.players[0]?.allIn, true);
    assert.equal(events[0]?.kind, 'blind');
    if (events[0]?.kind === 'blind') assert.equal(events[0].amount, 5);
    // Button is all-in, so the big blind acts first.
    assert.equal(s.actorSeat, 1);
  });

  it('rotates the button and resets the table on the next hand', () => {
    let s = mustStart(table()).state;
    // Everyone folds to the BB (seat 2).
    s = mustAct(s, 0, { type: 'fold' }).state;
    s = mustAct(s, 1, { type: 'fold' }).state;
    assert.equal(s.street, 'complete');
    const r2 = mustStart(s);
    assert.equal(r2.state.button, 1);
    assert.equal(r2.state.handNumber, 2);
    assert.deepEqual(r2.state.community, []);
    for (const p of r2.state.players) {
      assert.equal(p.hole.length, 2);
      assert.equal(p.folded, false);
      assert.equal(p.acted, false);
      assert.equal(p.allIn, false);
    }
    // Seat 2 won the 30-chip pot, then posted the SB (10); seat 0 posted BB (20).
    assert.equal(r2.state.players[2]?.chips, 1000);
    assert.equal(r2.state.players[2]?.bet, 10);
    assert.equal(r2.state.players[0]?.chips, 980);
    assert.equal(r2.state.players[0]?.bet, 20);
    assert.equal(r2.state.players[1]?.chips, 990);
  });
});

describe('preflop action order and the BB option', () => {
  it('heads-up: button calls, BB checks, flop is dealt', () => {
    let s = mustStart(table(['Ann', 'Ben'])).state;
    s = mustAct(s, 0, { type: 'call' }).state;
    assert.equal(s.players[0]?.bet, 20);
    assert.equal(s.actorSeat, 1);
    s = mustAct(s, 1, { type: 'check' }).state;
    assert.equal(s.street, 'flop');
    assert.equal(s.community.length, 3);
    assert.equal(s.toCall, 0);
  });

  it('BB can raise the option and action returns to the button', () => {
    let s = mustStart(table(['Ann', 'Ben'])).state;
    s = mustAct(s, 0, { type: 'call' }).state;
    s = mustAct(s, 1, { type: 'raise', amount: 60 }).state;
    assert.equal(s.toCall, 60);
    assert.equal(s.minRaiseTo, 100);
    assert.equal(s.actorSeat, 0);
    assert.equal(s.players[0]?.acted, false);
  });

  it('3-handed folds to the BB: BB wins uncontested', () => {
    let s = mustStart(table()).state;
    s = mustAct(s, 0, { type: 'fold' }).state;
    const { state: done, events } = mustAct(s, 1, { type: 'fold' });
    assert.equal(done.street, 'complete');
    assert.equal(done.actorSeat, -1);
    assert.equal(done.showdown, null);
    assert.equal(done.winners.length, 1);
    const w = done.winners[0];
    assert.ok(w);
    assert.deepEqual(w.winnerSeats, [2]);
    assert.equal(w.amount, 30);
    assert.equal(w.each, 30);
    assert.equal(w.handName, 'fold');
    assert.equal(done.players[2]?.chips, 1010);
    assert.ok(events.some((e) => e.kind === 'hand-end'));
  });
});

describe('applyAction validation', () => {
  it('rejects the wrong seat', () => {
    const s = mustStart(table(['Ann', 'Ben'])).state;
    assert.equal(s.actorSeat, 0);
    const err = mustFailAct(s, 1, { type: 'call' });
    assert.match(err, /not the actor/);
  });

  it('rejects acting when no hand is in progress', () => {
    const err = mustFailAct(table(['Ann', 'Ben']), 0, { type: 'check' });
    assert.match(err, /no hand in progress/);
  });

  it('rejects check facing a bet', () => {
    const s = mustStart(table(['Ann', 'Ben'])).state;
    mustFailAct(s, 0, { type: 'check' });
  });

  it('rejects bet into an existing bet', () => {
    const s = mustStart(table(['Ann', 'Ben'])).state;
    mustFailAct(s, 0, { type: 'bet', amount: 40 });
  });

  it('rejects raise with nothing to raise', () => {
    let s = mustStart(table(['Ann', 'Ben'])).state;
    s = mustAct(s, 0, { type: 'call' }).state;
    s = mustAct(s, 1, { type: 'check' }).state;
    assert.equal(s.street, 'flop');
    mustFailAct(s, s.actorSeat, { type: 'raise', amount: 40 });
  });

  it('rejects an opening bet below the big blind', () => {
    let s = mustStart(table(['Ann', 'Ben'])).state;
    s = mustAct(s, 0, { type: 'call' }).state;
    s = mustAct(s, 1, { type: 'check' }).state;
    mustFailAct(s, s.actorSeat, { type: 'bet', amount: 15 });
  });

  it('rejects a raise below minRaiseTo but accepts exactly minRaiseTo', () => {
    const s = mustStart(table(['Ann', 'Ben'])).state;
    assert.equal(s.minRaiseTo, 40);
    mustFailAct(s, 0, { type: 'raise', amount: 30 });
    const r = mustAct(s, 0, { type: 'raise', amount: 40 });
    assert.equal(r.state.toCall, 40);
    assert.equal(r.state.minRaiseTo, 60);
    assert.equal(r.state.lastIncrement, 20);
  });

  it('rejects a raise above the max (bet + chips)', () => {
    const s = mustStart(table(['Ann', 'Ben'])).state;
    mustFailAct(s, 0, { type: 'raise', amount: 5000 });
  });

  it('rejects call with nothing to call', () => {
    let s = mustStart(table(['Ann', 'Ben'])).state;
    s = mustAct(s, 0, { type: 'call' }).state;
    s = mustAct(s, 1, { type: 'check' }).state;
    mustFailAct(s, s.actorSeat, { type: 'call' });
  });
});

describe('betting mechanics', () => {
  it('a full raise reopens betting for everyone else', () => {
    let s = customState({
      street: 'flop',
      community: [C(2, 'hearts'), C(7, 'diamonds'), C(9, 'clubs')],
      button: 0,
      toCall: 0,
      actorSeat: 1,
      seats: [
        { chips: 1000, acted: true },
        { chips: 1000, acted: true },
        { chips: 1000, acted: false },
      ],
    });
    // P2 skipped action above; fix the turn order: seat 2 acts first here.
    s = { ...s, actorSeat: 2 };
    s = mustAct(s, 2, { type: 'bet', amount: 20 }).state;
    assert.equal(s.toCall, 20);
    assert.equal(s.minRaiseTo, 40);
    assert.equal(s.players[0]?.acted, false);
    assert.equal(s.players[1]?.acted, false);
    assert.equal(s.actorSeat, 0);
    s = mustAct(s, 0, { type: 'call' }).state;
    s = mustAct(s, 1, { type: 'fold' }).state;
    assert.equal(s.street, 'turn');
  });

  it('a short all-in raise lifts toCall but does NOT reopen betting', () => {
    let s = customState({
      street: 'flop',
      community: [C(2, 'hearts'), C(7, 'diamonds'), C(9, 'clubs')],
      button: 0,
      toCall: 20,
      lastIncrement: 20,
      minRaiseTo: 40,
      actorSeat: 1,
      seats: [
        { chips: 980, bet: 20, committed: 120, acted: true },
        { chips: 25, bet: 0, committed: 100, acted: false },
        { chips: 980, bet: 20, committed: 120, acted: true },
      ],
    });
    s = mustAct(s, 1, { type: 'all-in' }).state;
    assert.equal(s.players[1]?.bet, 25);
    assert.equal(s.players[1]?.allIn, true);
    assert.equal(s.toCall, 25);
    assert.equal(s.minRaiseTo, 45);
    // acted flags untouched: the short raise did not reopen betting.
    assert.equal(s.players[0]?.acted, true);
    assert.equal(s.players[2]?.acted, true);
    // Seat 2 still owes 5 more, then seat 0.
    assert.equal(s.actorSeat, 2);
    s = mustAct(s, 2, { type: 'call' }).state;
    assert.equal(s.players[2]?.bet, 25);
    s = mustAct(s, 0, { type: 'call' }).state;
    assert.equal(s.street, 'turn');
    assert.equal(s.community.length, 4);
  });

  it('a full all-in raise DOES reopen betting', () => {
    let s = customState({
      street: 'flop',
      community: [C(2, 'hearts'), C(7, 'diamonds'), C(9, 'clubs')],
      button: 0,
      toCall: 20,
      lastIncrement: 20,
      minRaiseTo: 40,
      actorSeat: 1,
      seats: [
        { chips: 980, bet: 20, committed: 120, acted: true },
        { chips: 100, bet: 0, committed: 100, acted: false },
        { chips: 980, bet: 20, committed: 120, acted: true },
      ],
    });
    s = mustAct(s, 1, { type: 'all-in' }).state;
    assert.equal(s.toCall, 100);
    assert.equal(s.lastIncrement, 80);
    assert.equal(s.minRaiseTo, 180);
    assert.equal(s.players[0]?.acted, false);
    assert.equal(s.players[2]?.acted, false);
  });

  it('an all-in call short of toCall leaves toCall unchanged', () => {
    let s = customState({
      street: 'flop',
      community: [C(2, 'hearts'), C(7, 'diamonds'), C(9, 'clubs')],
      button: 0,
      toCall: 20,
      actorSeat: 1,
      seats: [
        { chips: 980, bet: 20, acted: true },
        { chips: 15, bet: 0, acted: false },
        { chips: 980, bet: 0, acted: false },
      ],
    });
    const { state: done, events } = mustAct(s, 1, { type: 'call' });
    assert.equal(done.players[1]?.bet, 15);
    assert.equal(done.players[1]?.chips, 0);
    assert.equal(done.players[1]?.allIn, true);
    assert.equal(done.toCall, 20);
    const last = events[events.length - 1];
    assert.equal(last?.kind, 'action');
    if (last?.kind === 'action') assert.equal(last.chips, 15);
  });

  it('action events report the chips committed', () => {
    const s = mustStart(table(['Ann', 'Ben'])).state;
    const { events } = mustAct(s, 0, { type: 'call' });
    const last = events[events.length - 1];
    assert.deepEqual(last, { kind: 'action', seat: 0, action: { type: 'call' }, chips: 10 });
  });

  it('does not mutate the input state', () => {
    const s = mustStart(table(['Ann', 'Ben'])).state;
    const before = JSON.stringify(s.players);
    mustAct(s, 0, { type: 'call' });
    assert.equal(JSON.stringify(s.players), before);
    assert.equal(s.players[0]?.chips, 990);
  });
});

describe('legalActions', () => {
  it('facing a bet: fold/call/raise/all-in, no check, no bet', () => {
    const s = mustStart(table(['Ann', 'Ben'])).state;
    const types = legalActions(s, 0).map((a) => a.type).sort();
    assert.deepEqual(types, ['all-in', 'call', 'fold', 'raise']);
    const call = legalActions(s, 0).find((a) => a.type === 'call');
    assert.ok(call && call.type === 'call');
    assert.equal(call.amount, 10);
    const raise = legalActions(s, 0).find((a) => a.type === 'raise');
    assert.ok(raise && raise.type === 'raise');
    assert.equal(raise.minTo, 40);
    assert.equal(raise.maxTo, 1000);
    assert.equal(raise.toCall, 10);
  });

  it('with no bet: fold/check/bet/all-in, no call, no raise', () => {
    let s = mustStart(table(['Ann', 'Ben'])).state;
    s = mustAct(s, 0, { type: 'call' }).state;
    s = mustAct(s, 1, { type: 'check' }).state;
    const actions = legalActions(s, s.actorSeat);
    const types = actions.map((a) => a.type).sort();
    assert.deepEqual(types, ['all-in', 'bet', 'check', 'fold']);
    const bet = actions.find((a) => a.type === 'bet');
    assert.ok(bet && bet.type === 'bet');
    assert.equal(bet.min, 20);
    assert.equal(bet.max, 980);
  });

  it('short stack cannot open-bet below the big blind', () => {
    const s = customState({
      street: 'flop',
      community: [C(2, 'hearts'), C(7, 'diamonds'), C(9, 'clubs')],
      button: 0,
      toCall: 0,
      actorSeat: 0,
      seats: [{ chips: 15, acted: false }, { chips: 1000, acted: false }],
    });
    const types = legalActions(s, 0).map((a) => a.type).sort();
    assert.deepEqual(types, ['all-in', 'check', 'fold']);
  });

  it('returns [] for players who cannot act or when no hand is live', () => {
    const t = table(['Ann', 'Ben']);
    assert.deepEqual(legalActions(t, 0), []);
    const s = customState({
      street: 'flop',
      community: [C(2, 'hearts'), C(7, 'diamonds'), C(9, 'clubs')],
      seats: [
        { chips: 1000, acted: false },
        { chips: 0, allIn: true, committed: 50 },
      ],
    });
    assert.deepEqual(legalActions(s, 1), []);
  });
});

describe('showdown and side pots', () => {
  const board = [C(3, 'clubs'), C(5, 'diamonds'), C(8, 'spades'), C(11, 'hearts'), C(9, 'clubs')];

  it('builds side pots: short all-in can only win the main pot', () => {
    let s = customState({
      street: 'river',
      community: board,
      button: 0,
      actorSeat: 1,
      seats: [
        { chips: 0, committed: 50, allIn: true, acted: true, hole: [C(14, 'spades'), C(14, 'diamonds')] },
        { chips: 850, committed: 150, acted: false, hole: [C(7, 'clubs'), C(2, 'diamonds')] },
        { chips: 850, committed: 150, acted: false, hole: [C(13, 'spades'), C(13, 'diamonds')] },
      ],
    });
    s = mustAct(s, 1, { type: 'check' }).state;
    const { state: done } = mustAct(s, 2, { type: 'check' });
    assert.equal(done.street, 'complete');
    assert.equal(done.winners.length, 2);
    const [main, side] = done.winners;
    assert.ok(main && side);
    assert.equal(main.potIndex, 0);
    assert.equal(main.amount, 150);
    assert.deepEqual(main.winnerSeats, [0]);
    assert.equal(main.handName, 'one-pair');
    assert.equal(side.potIndex, 1);
    assert.equal(side.amount, 200);
    assert.deepEqual(side.winnerSeats, [2]);
    assert.equal(side.handName, 'one-pair');
    assert.equal(done.players[0]?.chips, 150);
    assert.equal(done.players[1]?.chips, 850);
    assert.equal(done.players[2]?.chips, 1050);
    // Chip conservation: 1700 on stacks + 350 in pots = 2050 out.
    assert.equal(chipSum(done), 2050);
    assert.equal(done.showdown?.length, 3);
  });

  it('flush beats straight', () => {
    let s = customState({
      street: 'river',
      community: [C(2, 'hearts'), C(5, 'hearts'), C(9, 'hearts'), C(12, 'clubs'), C(3, 'diamonds')],
      button: 0,
      actorSeat: 1,
      seats: [
        { chips: 900, committed: 100, acted: false, hole: [C(14, 'hearts'), C(7, 'hearts')] },
        { chips: 900, committed: 100, acted: false, hole: [C(4, 'spades'), C(6, 'spades')] },
      ],
    });
    s = mustAct(s, 1, { type: 'check' }).state;
    const { state: done } = mustAct(s, 0, { type: 'check' });
    assert.equal(done.winners.length, 1);
    const w = done.winners[0];
    assert.ok(w);
    assert.deepEqual(w.winnerSeats, [0]);
    assert.equal(w.amount, 200);
    assert.equal(w.handName, 'flush');
    assert.equal(done.players[0]?.chips, 1100);
    assert.equal(done.players[1]?.chips, 900);
  });

  it('identical hands split the pot; odd chip goes clockwise from the button', () => {
    let s = customState({
      street: 'river',
      community: [C(13, 'spades'), C(13, 'hearts'), C(5, 'diamonds'), C(5, 'clubs'), C(9, 'hearts')],
      button: 1,
      actorSeat: 2,
      seats: [
        { chips: 900, committed: 100, acted: false, hole: [C(14, 'spades'), C(2, 'clubs')] },
        { chips: 900, committed: 100, acted: false, hole: [C(14, 'diamonds'), C(3, 'clubs')] },
        { chips: 900, committed: 100, acted: false, hole: [C(14, 'clubs'), C(4, 'clubs')] },
        { chips: 900, committed: 100, acted: false, hole: [C(12, 'spades'), C(11, 'diamonds')] },
      ],
    });
    for (const seat of [2, 3, 0, 1]) s = mustAct(s, seat, { type: 'check' }).state;
    assert.equal(s.street, 'complete');
    assert.equal(s.winners.length, 1);
    const w = s.winners[0];
    assert.ok(w);
    assert.equal(w.amount, 400);
    assert.equal(w.each, 133);
    assert.equal(w.handName, 'two-pair');
    // Button is seat 1: odd chip order is 1, then 2, then 0.
    assert.deepEqual(w.winnerSeats, [1, 2, 0]);
    assert.equal(s.players[0]?.chips, 1033);
    assert.equal(s.players[1]?.chips, 1034);
    assert.equal(s.players[2]?.chips, 1033);
    assert.equal(s.players[3]?.chips, 900);
  });

  it('eliminates a player who loses their last chips at showdown', () => {
    let s = customState({
      street: 'river',
      community: [C(14, 'spades'), C(13, 'diamonds'), C(12, 'clubs'), C(11, 'hearts'), C(3, 'spades')],
      button: 0,
      actorSeat: 1,
      seats: [
        { chips: 0, committed: 50, allIn: true, acted: true, hole: [C(7, 'clubs'), C(2, 'diamonds')] },
        { chips: 950, committed: 50, acted: false, hole: [C(14, 'diamonds'), C(2, 'clubs')] },
      ],
    });
    const { state: done, events } = mustAct(s, 1, { type: 'check' });
    assert.equal(done.street, 'complete');
    assert.equal(done.players[0]?.eliminated, true);
    assert.equal(done.players[1]?.chips, 1050);
    assert.ok(events.some((e) => e.kind === 'eliminated' && e.seat === 0));
    assert.ok(events.some((e) => e.kind === 'showdown'));
    assert.ok(events.some((e) => e.kind === 'hand-end'));
  });

  it('showdown exposes every non-folded player hand', () => {
    let s = customState({
      street: 'river',
      community: board,
      button: 0,
      actorSeat: 1,
      seats: [
        { chips: 900, committed: 100, acted: false, hole: [C(14, 'spades'), C(14, 'diamonds')] },
        { chips: 900, committed: 100, acted: false, hole: [C(7, 'clubs'), C(2, 'diamonds')] },
      ],
    });
    s = mustAct(s, 1, { type: 'check' }).state;
    const { state: done } = mustAct(s, 0, { type: 'check' });
    assert.equal(done.showdown?.length, 2);
    assert.equal(done.showdown?.[0]?.handName, 'one-pair');
    assert.equal(done.showdown?.[0]?.best.length, 5);
    assert.equal(done.showdown?.[0]?.hole.length, 2);
  });
});

describe('run-out when no betting is possible', () => {
  it('deals out the board when everyone is all-in from the blinds', () => {
    const t = table(['Ann', 'Ben'], 20);
    const ann = t.players[0];
    assert.ok(ann);
    ann.chips = 10;
    const { state: s, events } = mustStart(t);
    assert.equal(s.street, 'complete');
    assert.equal(s.community.length, 5);
    assert.ok(s.winners.length >= 1);
    assert.equal(s.showdown?.length, 2);
    assert.equal(chipSum(s), 30);
    const streets = events.filter((e) => e.kind === 'street').map((e) => (e.kind === 'street' ? e.street : ''));
    assert.deepEqual(streets, ['preflop', 'flop', 'turn', 'river']);
  });
});

describe('rebuy', () => {
  it('rebuys an eliminated player between hands', () => {
    const t = table(['Ann', 'Ben']);
    const ben = t.players[1];
    assert.ok(ben);
    ben.eliminated = true;
    ben.chips = 0;
    const r = rebuy(t, 1, 500);
    assert.equal(r.ok, true);
    if (!r.ok) throw new Error('unreachable');
    assert.equal(r.state.players[1]?.chips, 500);
    assert.equal(r.state.players[1]?.eliminated, false);
    // And they are dealt in on the next hand.
    const h = mustStart(r.state);
    assert.equal(h.state.players[1]?.hole.length, 2);
  });

  it('rejects rebuy for a live player, bad amounts, and mid-hand', () => {
    const t = table(['Ann', 'Ben']);
    assert.equal(rebuy(t, 0, 500).ok, false);
    const ben = t.players[1];
    assert.ok(ben);
    ben.eliminated = true;
    ben.chips = 0;
    assert.equal(rebuy(t, 1, 0).ok, false);
    assert.equal(rebuy(t, 1, -50).ok, false);
    const live = mustStart(table(['Ann', 'Ben'])).state;
    assert.equal(rebuy(live, 1, 500).ok, false);
    assert.equal(rebuy(t, 9, 500).ok, false);
  });
});

describe('potTotal and conservation', () => {
  it('potTotal sums handCommitted', () => {
    const s = mustStart(table()).state;
    assert.equal(potTotal(s), 30);
    assert.equal(potTotal(table()), 0);
  });

  it('total chips stay constant across a full random hand', () => {
    const s = mustStart(table(['Ann', 'Ben', 'Cat', 'Dan'])).state;
    const done = finishHand(s);
    assert.equal(done.street, 'complete');
    assert.equal(chipSum(done), 4000);
    assert.ok(done.winners.length >= 1);
  });

  it('total chips stay constant across several hands', () => {
    let s = table(['Ann', 'Ben', 'Cat']);
    for (let h = 0; h < 3; h++) {
      s = finishHand(mustStart(s).state);
      assert.equal(chipSum(s), 3000);
    }
  });
});

describe('pot reset after hand completion', () => {
  it('potTotal is 0 and commitments are cleared after a showdown hand', () => {
    const done = finishHand(mustStart(table(['Ann', 'Ben', 'Cat'])).state);
    assert.equal(done.street, 'complete');
    assert.equal(potTotal(done), 0);
    for (const p of done.players) {
      assert.equal(p.handCommitted, 0);
      assert.equal(p.bet, 0);
    }
  });

  it('potTotal is 0 after an uncontested (fold-win) hand', () => {
    let s = mustStart(table(['Ann', 'Ben'])).state;
    // Ann (seat 0) is small blind heads-up and acts first: everyone folds to Ben... force it:
    // make Ben fold everything: drive actions until complete, folding non-button players.
    let guard = 0;
    while (s.street !== 'complete' && guard++ < 50) {
      const seat = s.actorSeat;
      const r = applyAction(s, seat, { type: 'fold' });
      assert.equal(r.ok, true);
      s = r.state;
    }
    assert.equal(s.street, 'complete');
    assert.equal(potTotal(s), 0);
    for (const p of s.players) {
      assert.equal(p.handCommitted, 0);
      assert.equal(p.bet, 0);
    }
  });
});

describe('player count 2-8', () => {
  const mk = (n: number): string[] => Array.from({ length: n }, (_, i) => `P${i + 1}`);

  it('createTable accepts 2, 7 and 8 players', () => {
    for (const n of [2, 7, 8]) {
      const t = table(mk(n));
      assert.equal(t.players.length, n);
      assert.equal(t.street, 'complete');
    }
  });

  it('startHand succeeds with 2, 7 and 8 players and deals 2 hole cards each', () => {
    for (const n of [2, 7, 8]) {
      const s = mustStart(table(mk(n))).state;
      assert.equal(s.street, 'preflop');
      for (const p of s.players) {
        assert.equal(p.hole.length, 2);
      }
      assert.equal(s.deck.length, 52 - 2 * n);
      assert.ok(s.actorSeat >= 0);
      assert.ok(s.actorSeat < n);
    }
  });

  it('rejects 9+ players with a clean thrown error', () => {
    assert.throws(() => table(mk(9)), /poker: need 2-8 players/);
    assert.throws(
      () =>
        createTable({
          names: mk(9),
          isBot: mk(9).map(() => false),
          startingStack: 100,
          smallBlind: 5,
          bigBlind: 10,
        }),
      /poker: need 2-8 players/,
    );
  });

  it('still rejects fewer than 2 players', () => {
    assert.throws(() => table(mk(1)), /poker: need 2-8 players/);
    assert.throws(
      () =>
        createTable({
          names: [],
          isBot: [],
          startingStack: 100,
          smallBlind: 5,
          bigBlind: 10,
        }),
      /poker: need 2-8 players/,
    );
  });
});

describe('8-player hand', () => {
  const mk8 = (): string[] => Array.from({ length: 8 }, (_, i) => `P${i + 1}`);

  it('a full simulated 8-player hand completes with chips conserved', () => {
    const done = finishHand(mustStart(table(mk8())).state);
    assert.equal(done.street, 'complete');
    assert.equal(potTotal(done), 0);
    const total = done.players.reduce((sum, p) => sum + p.chips, 0);
    assert.equal(total, 8 * 1000);
    for (const p of done.players) {
      assert.equal(p.handCommitted, 0);
      assert.equal(p.bet, 0);
      assert.ok(p.chips >= 0);
    }
  });

  it('blinds land on the two seats left of the button', () => {
    const s = mustStart(table(mk8())).state;
    assert.equal(s.button, 0);
    assert.equal(s.players[1]?.bet, 10); // SB
    assert.equal(s.players[2]?.bet, 20); // BB
    assert.equal(s.actorSeat, 3); // action starts left of the BB
    assert.equal(s.toCall, 20);
  });
});

describe('heads-up blind rules', () => {
  it('button posts the small blind and acts first preflop', () => {
    const s = mustStart(table(['Ann', 'Ben'])).state;
    assert.equal(s.button, 0);
    const sb = s.players[0];
    const bb = s.players[1];
    assert.equal(sb?.bet, 10);
    assert.equal(bb?.bet, 20);
    assert.equal(sb?.chips, 990);
    assert.equal(bb?.chips, 980);
    // Heads-up: the button/SB acts first preflop and can still call/raise.
    assert.equal(s.actorSeat, 0);
    assert.equal(s.toCall, 20);
    const legal = legalActions(s, 0).map((a) => a.type);
    assert.ok(legal.includes('call'));
    assert.ok(legal.includes('raise'));
  });

  it('3-handed: SB is left of button, action starts left of the BB', () => {
    const s = mustStart(table(['A', 'B', 'C'])).state;
    assert.equal(s.button, 0);
    assert.equal(s.players[1]?.bet, 10); // SB
    assert.equal(s.players[2]?.bet, 20); // BB
    assert.equal(s.actorSeat, 0); // wraps around left of BB
  });

  it('a full heads-up hand completes with chips conserved', () => {
    const done = finishHand(mustStart(table(['Ann', 'Ben'])).state);
    assert.equal(done.street, 'complete');
    const total = done.players.reduce((sum, p) => sum + p.chips, 0);
    assert.equal(total, 2 * 1000);
    assert.equal(potTotal(done), 0);
  });
});
