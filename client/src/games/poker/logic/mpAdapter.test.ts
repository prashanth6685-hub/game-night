// Tests for games/poker/logic/mpAdapter.ts
// Run: node --test client/src/games/poker/logic/mpAdapter.test.ts (from repo root)
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { adaptServerState, adaptVoiceBadges, rebuyTotal } from './mpAdapter.ts';
import type { PokerTableState, PokerPublicPlayer, PokerVoicePeerState } from './pokerRooms.ts';
import type { Card } from '../../../../../shared/poker/cards.ts';
import type { LegalAction } from '../../../../../shared/poker/engine.ts';

function card(rank: number): Card {
  return { rank, suit: 'hearts' };
}

function pub(
  seat: number,
  name: string,
  extra: Partial<PokerPublicPlayer> = {},
): PokerPublicPlayer {
  return {
    seat,
    name,
    stack: 1000,
    bet: 0,
    folded: false,
    allIn: false,
    sittingOut: false,
    connected: true,
    ready: true,
    lastAction: null,
    isHost: seat === 0,
    inEngine: true,
    ...extra,
  };
}

function config(): PokerTableState['config'] {
  return {
    maxPlayers: 8,
    startingStack: 1000,
    minBuyIn: 500,
    maxBuyIn: 0,
    smallBlind: 5,
    bigBlind: 10,
    rebuyMin: 500,
    rebuyMax: 2000,
    maxRebuys: 3,
    rebuysMidHand: false,
    allowLateJoin: true,
    durationMin: 0,
    hasPassword: false,
  };
}

function baseState(): PokerTableState {
  const call: LegalAction = { type: 'call', amount: 20 };
  return {
    code: 'K7Q2XD',
    roomName: 'Friday Game',
    status: 'playing',
    handNumber: 3,
    street: 'flop',
    button: 1,
    community: [card(10), card(11), card(12)],
    pot: 120,
    sidePots: [120],
    actorSeat: 1,
    toCall: 20,
    minRaiseTo: 40,
    turnExpiresAt: Date.now() + 25000,
    players: [
      pub(0, 'Host', { stack: 900, bet: 20 }),
      pub(1, 'Me', { stack: 800 }),
      pub(2, 'Zed', { stack: 1000, bet: 20, folded: true }),
    ],
    winners: [],
    showdownRevealed: null,
    mySeat: 1,
    myCards: [card(14), card(13)],
    myLegalActions: [{ type: 'fold' }, call, { type: 'raise', minTo: 40, maxTo: 800, toCall: 20 }, { type: 'all-in', amount: 800 }],
    ledger: [
      { seat: 0, name: 'Host', buyIn: 1000, rebuys: 0 },
      { seat: 1, name: 'Me', buyIn: 1000, rebuys: 500 },
      { seat: 2, name: 'Zed', buyIn: 1000, rebuys: 0 },
    ],
    config: config(),
  };
}

describe('adaptServerState', () => {
  it('rotates seats so my seat becomes 0', () => {
    const a = adaptServerState(baseState());
    assert.equal(a.table.players.length, 3);
    const me = a.table.players.find((p) => p.seat === 0);
    assert.equal(me?.name, 'Me');
    // actor was seat 1 (me) -> rotated actorSeat is 0
    assert.equal(a.table.actorSeat, 0);
    // button was seat 1 -> 0
    assert.equal(a.table.button, 0);
    // host was seat 0 -> rotated to 2
    const host = a.table.players.find((p) => p.name === 'Host');
    assert.equal(host?.seat, 2);
  });

  it('shows my hole cards face-up and opponents face-down mid-hand', () => {
    const a = adaptServerState(baseState());
    const me = a.table.players.find((p) => p.seat === 0);
    assert.deepEqual(me?.hole, [card(14), card(13)]);
    const host = a.table.players.find((p) => p.name === 'Host');
    assert.equal(host?.hole.length, 2);
    // folded opponent shows no cards
    const zed = a.table.players.find((p) => p.name === 'Zed');
    assert.equal(zed?.hole.length, 0);
    assert.equal(zed?.folded, true);
  });

  it('passes the server legal actions through untouched', () => {
    const a = adaptServerState(baseState());
    assert.deepEqual(
      a.legal.map((l) => l.type),
      ['fold', 'call', 'raise', 'all-in'],
    );
    const call = a.legal.find((l) => l.type === 'call');
    assert.equal(call && 'amount' in call ? call.amount : -1, 20);
  });

  it('passes empty legal actions when it is not my turn', () => {
    const s = baseState();
    s.actorSeat = 0; // host's turn
    s.myLegalActions = null;
    const a = adaptServerState(s);
    assert.deepEqual(a.legal, []);
    assert.equal(a.table.actorSeat, 2); // rotated
  });

  it('maps winners with rotated seats and showdown cards', () => {
    const s = baseState();
    s.street = 'complete';
    s.myCards = null;
    s.myLegalActions = null;
    s.winners = [
      { potIndex: 0, amount: 120, winnerSeats: [1], handName: 'one-pair', each: 120 },
    ];
    s.showdownRevealed = [
      { seat: 1, name: 'Me', handName: 'one-pair', hole: [card(14), card(13)], best: [] },
    ];
    const a = adaptServerState(s);
    assert.equal(a.table.street, 'complete');
    assert.deepEqual(a.table.winners[0]?.winnerSeats, [0]);
    assert.equal(a.table.winners[0]?.handName, 'one-pair');
    const me = a.table.players.find((p) => p.seat === 0);
    assert.deepEqual(me?.hole, [card(14), card(13)]);
    assert.equal(a.table.showdown?.[0]?.handName, 'one-pair');
  });

  it('reads the turn timer', () => {
    const a = adaptServerState(baseState());
    assert.ok(a.turnSecs !== null && a.turnSecs > 20 && a.turnSecs <= 25);
    const s = baseState();
    s.turnExpiresAt = null;
    assert.equal(adaptServerState(s).turnSecs, null);
  });

  it('exposes sitting-out and connection flags', () => {
    const s = baseState();
    s.players = [
      pub(0, 'Host'),
      pub(1, 'Me', { sittingOut: true, connected: false }),
    ];
    const a = adaptServerState(s);
    assert.equal(a.mySittingOut, true);
    assert.equal(a.myConnected, false);
  });

  it('reads rebuy totals from the ledger', () => {
    assert.equal(rebuyTotal(baseState().ledger, 1), 500);
    assert.equal(rebuyTotal(baseState().ledger, 0), 0);
    assert.equal(rebuyTotal([], 1), 0);
  });
});

describe('adaptVoiceBadges', () => {
  function vs(
    seat: number,
    extra: Partial<PokerVoicePeerState> = {},
  ): PokerVoicePeerState {
    return {
      seat,
      name: `P${seat}`,
      joined: true,
      muted: true,
      speaking: false,
      ...extra,
    };
  }

  it('maps server voice state to rotated seats with the right badges', () => {
    const voice = new Map([
      [1, vs(1, { muted: false, speaking: true })],
      [2, vs(2, { muted: true })],
      [3, vs(3, { muted: false })],
    ]);
    // mySeat=1, 4 players: seat 1 -> 0, seat 2 -> 1, seat 3 -> 2
    const badges = adaptVoiceBadges(voice, 1, 4);
    assert.equal(badges.get(0), 'speaking');
    assert.equal(badges.get(1), 'muted');
    assert.equal(badges.get(2), 'on');
    assert.equal(badges.has(3), false);
  });

  it('skips seats not in voice and maps local errors to error', () => {
    const voice = new Map([
      [0, vs(0, { joined: false, muted: false })],
      [1, vs(1, { muted: false, error: 'boom' })],
    ]);
    const badges = adaptVoiceBadges(voice, 0, 2, new Set([1]));
    assert.equal(badges.has(0), false); // not joined -> no badge
    assert.equal(badges.get(1), 'error');
  });

  it('server error flag beats muted/speaking', () => {
    const voice = new Map([[0, vs(0, { muted: false, speaking: true, error: 'x' })]]);
    assert.equal(adaptVoiceBadges(voice, 0, 2).get(0), 'error');
  });

  it('returns an empty map for missing voice state', () => {
    assert.equal(adaptVoiceBadges(undefined, 0, 4).size, 0);
  });
});
