// Tests for the server-authoritative private poker rooms.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, rmdirSync, unlinkSync } from 'node:fs';
import type { Request, Response } from 'express';
import {
  applyPokerAction,
  autoPlayAbsent,
  broadcastPoker,
  clearPokerReports,
  clearPokerRooms,
  closePokerRoom,
  computePokerReport,
  createPokerRoom,
  dealNextHand,
  engineSeatOf,
  getPokerReport,
  getPokerRoom,
  joinPokerRoom,
  loadPokerReportsFromDisk,
  pausePokerRoom,
  playerBySeat,
  pokerActionHandler,
  pokerCreateRoomHandler,
  pokerJoinHandler,
  pokerRebuyHandler,
  pokerReportHandler,
  pokerStartHandler,
  pokerStateHandler,
  publicTablePlayers,
  rebuyPokerChips,
  removePokerPlayer,
  resumePokerRoom,
  roomSeatOf,
  seatForToken,
  setPokerConnected,
  startPokerGame,
  sweepPokerReports,
  sweepPokerRooms,
  togglePokerReady,
  validatePokerReport,
  type PokerClient,
  type PokerRoom,
} from './pokerRooms.ts';
import * as pokerMod from './pokerRooms.ts';

// ---------------------------------------------------------------------------
// Fake express req/res
// ---------------------------------------------------------------------------

function fakeReq(opts: {
  params?: Record<string, string>;
  query?: Record<string, string>;
  headers?: Record<string, string>;
  body?: Record<string, unknown>;
}): Request {
  return {
    params: opts.params ?? {},
    query: opts.query ?? {},
    headers: opts.headers ?? {},
    body: opts.body ?? {},
    ip: '127.0.0.1',
    on: () => {},
  } as unknown as Request;
}

interface Captured {
  status: number;
  body: unknown;
}

function fakeRes(): { res: Response; cap: Captured } {
  const cap: Captured = { status: 200, body: undefined };
  const res = {
    status(code: number) {
      cap.status = code;
      return res;
    },
    json(obj: unknown) {
      cap.body = obj;
      return res;
    },
  } as unknown as Response;
  return { res, cap };
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const BASE_CONFIG: Record<string, unknown> = {
  roomName: 'Friday Night',
  hostName: 'Host',
  maxPlayers: 8,
  startingStack: 1000,
  smallBlind: 10,
  bigBlind: 20,
  minBuyIn: 1000,
  maxBuyIn: 0,
  rebuyMin: 100,
  rebuyMax: 500,
  maxRebuys: 5,
  rebuysMidHand: false,
  allowLateJoin: true,
  durationMin: 0,
};

function makeRoom(overrides: Record<string, unknown> = {}): {
  room: PokerRoom;
  hostToken: string;
  hostPlayerToken: string;
} {
  const r = createPokerRoom({ ...BASE_CONFIG, ...overrides });
  assert.equal(r.ok, true);
  if (!r.ok) throw new Error('room setup failed');
  return {
    room: r.room,
    hostToken: r.room.hostToken,
    hostPlayerToken: r.host.playerToken,
  };
}

function addPlayer(
  room: PokerRoom,
  name: string,
  buyIn = 1000,
): { seat: number; token: string } {
  const j = joinPokerRoom(room, { name, buyIn });
  assert.equal(j.ok, true);
  if (!j.ok) throw new Error(`join failed for ${name}`);
  return { seat: j.seat, token: j.playerToken };
}

/** Ready the host + every joined player, then start. */
function startGame(room: PokerRoom, hostPlayerToken: string): void {
  for (const p of room.players) {
    if (p.removed) continue;
    const t = togglePokerReady(room, p.playerToken);
    assert.equal(t.ok, true);
  }
  void hostPlayerToken;
  const s = startPokerGame(room);
  assert.equal(s.ok, true);
}

/** Play the current hand out by folding the actor until it completes. */
function foldOutHand(room: PokerRoom, tokens: Map<number, string>): void {
  for (let i = 0; i < 60; i++) {
    const st = room.engineState;
    if (!st || st.street === 'complete') return;
    const actorRoomSeat = roomSeatOf(room, st.actorSeat);
    const token = tokens.get(actorRoomSeat);
    assert.ok(token, `no token for seat ${actorRoomSeat}`);
    const r = applyPokerAction(room, { token, action: { type: 'fold' } });
    assert.equal(r.ok, true);
  }
  throw new Error('hand did not complete');
}

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------

test('create: valid config returns code + hostToken, host is seat 0', () => {
  const { res, cap } = fakeRes();
  pokerCreateRoomHandler(fakeReq({ body: { ...BASE_CONFIG } }), res);
  assert.equal(cap.status, 200);
  const body = cap.body as Record<string, unknown>;
  assert.equal(typeof body.code, 'string');
  assert.equal((body.code as string).length, 5);
  assert.equal(typeof body.hostToken, 'string');
  assert.equal((body.hostToken as string).length > 0, true);
  assert.equal(body.seat, 0);
  const summary = body.summary as Record<string, unknown>;
  assert.equal(summary.roomName, 'Friday Night');
  assert.equal(summary.status, 'lobby');
  clearPokerRooms();
});

test('create: maxPlayers 9 is rejected', () => {
  const r = createPokerRoom({ ...BASE_CONFIG, maxPlayers: 9 });
  assert.equal(r.ok, false);
  if (!r.ok) assert.match(r.error, /maxPlayers/);
});

test('create: minBuyIn above maxBuyIn is rejected', () => {
  const r = createPokerRoom({ ...BASE_CONFIG, minBuyIn: 2000, maxBuyIn: 1000 });
  assert.equal(r.ok, false);
  if (!r.ok) assert.match(r.error, /maxBuyIn/);
});

test('create: smallBlind >= bigBlind is rejected', () => {
  const bad1 = createPokerRoom({ ...BASE_CONFIG, smallBlind: 20, bigBlind: 20 });
  assert.equal(bad1.ok, false);
  const bad2 = createPokerRoom({ ...BASE_CONFIG, smallBlind: 40, bigBlind: 20 });
  assert.equal(bad2.ok, false);
});

test('create: minBuyIn below the small blind is rejected', () => {
  const r = createPokerRoom({ ...BASE_CONFIG, minBuyIn: 5, smallBlind: 10 });
  assert.equal(r.ok, false);
});

test('create: rebuyMin above rebuyMax is rejected', () => {
  const r = createPokerRoom({ ...BASE_CONFIG, rebuyMin: 500, rebuyMax: 100 });
  assert.equal(r.ok, false);
});

// ---------------------------------------------------------------------------
// Join
// ---------------------------------------------------------------------------

test('join: 8 players OK, 9th is refused, no duplicate seats', () => {
  const { room } = makeRoom({ maxPlayers: 8 });
  const seats = new Set<number>([0]);
  for (let i = 1; i < 8; i++) {
    const j = joinPokerRoom(room, { name: `P${i}`, buyIn: 1000 });
    assert.equal(j.ok, true);
    if (j.ok) seats.add(j.seat);
  }
  assert.equal(seats.size, 8);
  const ninth = joinPokerRoom(room, { name: 'P9', buyIn: 1000 });
  assert.equal(ninth.ok, false);
  if (!ninth.ok) assert.ok(ninth.status === 403 || ninth.status === 400);
  clearPokerRooms();
});

test('join: wrong password -> 403', () => {
  const { room } = makeRoom({ password: 'secret' });
  const bad = joinPokerRoom(room, { name: 'Intruder', buyIn: 1000, password: 'nope' });
  assert.equal(bad.ok, false);
  if (!bad.ok) assert.equal(bad.status, 403);
  const good = joinPokerRoom(room, { name: 'Friend', buyIn: 1000, password: 'secret' });
  assert.equal(good.ok, true);
  clearPokerRooms();
});

test('join: buyIn below min or above max -> 400', () => {
  const { room } = makeRoom({ minBuyIn: 1000, maxBuyIn: 2000 });
  const low = joinPokerRoom(room, { name: 'Low', buyIn: 999 });
  assert.equal(low.ok, false);
  if (!low.ok) assert.equal(low.status, 400);
  const high = joinPokerRoom(room, { name: 'High', buyIn: 2001 });
  assert.equal(high.ok, false);
  if (!high.ok) assert.equal(high.status, 400);
  clearPokerRooms();
});

test('join: duplicate name -> 400', () => {
  const { room } = makeRoom();
  const dup = joinPokerRoom(room, { name: 'host', buyIn: 1000 });
  assert.equal(dup.ok, false);
  if (!dup.ok) assert.equal(dup.status, 400);
  clearPokerRooms();
});

test('join: same idem returns the same seat with no double ledger entry', () => {
  const { room } = makeRoom();
  const buyinsBefore = room.ledger.filter((e) => e.kind === 'buyin' && !e.voided).length;
  const first = joinPokerRoom(room, { name: 'Idem', buyIn: 1000, idem: 'abc123' });
  assert.equal(first.ok, true);
  const second = joinPokerRoom(room, { name: 'Idem', buyIn: 1000, idem: 'abc123' });
  assert.equal(second.ok, true);
  if (first.ok && second.ok) {
    assert.equal(second.seat, first.seat);
    assert.equal(second.playerToken, first.playerToken);
  }
  const buyinsAfter = room.ledger.filter((e) => e.kind === 'buyin' && !e.voided).length;
  assert.equal(buyinsAfter, buyinsBefore + 1);
  clearPokerRooms();
});

test('join: late join while playing sits out when allowed', () => {
  const { room, hostPlayerToken } = makeRoom();
  const p1 = addPlayer(room, 'P1');
  startGame(room, hostPlayerToken);
  const late = joinPokerRoom(room, { name: 'Late', buyIn: 1000 });
  assert.equal(late.ok, true);
  if (late.ok) {
    assert.equal(late.sittingOut, true);
    const pl = playerBySeat(room, late.seat);
    assert.equal(pl?.inEngine, false);
  }
  void p1;
  clearPokerRooms();
});

test('join: late join refused with 403 when allowLateJoin is false', () => {
  const { room, hostPlayerToken } = makeRoom({ allowLateJoin: false });
  addPlayer(room, 'P1');
  startGame(room, hostPlayerToken);
  const late = joinPokerRoom(room, { name: 'Late', buyIn: 1000 });
  assert.equal(late.ok, false);
  if (!late.ok) assert.equal(late.status, 403);
  clearPokerRooms();
});

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

test('start: bad host token -> 403 (handler level)', () => {
  const { room } = makeRoom();
  addPlayer(room, 'P1');
  for (const p of room.players) togglePokerReady(room, p.playerToken);
  const { res, cap } = fakeRes();
  pokerStartHandler(
    fakeReq({ params: { code: room.code }, headers: { 'x-host-token': 'bogus' } }),
    res,
  );
  assert.equal(cap.status, 403);
  clearPokerRooms();
});

test('start: fewer than 2 ready players -> 400', () => {
  const { room, hostPlayerToken } = makeRoom();
  togglePokerReady(room, hostPlayerToken); // only the host is ready
  const s = startPokerGame(room);
  assert.equal(s.ok, false);
  if (!s.ok) assert.equal(s.status, 400);
  clearPokerRooms();
});

test('start: engine rejects impossible blinds (caught -> 400, never throws)', () => {
  const { room, hostPlayerToken } = makeRoom({
    smallBlind: 10,
    bigBlind: 2000,
    minBuyIn: 1000,
  });
  addPlayer(room, 'P1', 1000);
  togglePokerReady(room, hostPlayerToken);
  const p1 = room.players.find((p) => p.name === 'P1');
  if (p1) togglePokerReady(room, p1.playerToken);
  const s = startPokerGame(room);
  assert.equal(s.ok, false);
  if (!s.ok) assert.equal(s.status, 400);
  assert.equal(room.status, 'lobby');
  clearPokerRooms();
});

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

function twoPlayerGame(): {
  room: PokerRoom;
  hostToken: string;
  hostPlayerToken: string;
  p1: { seat: number; token: string };
} {
  const { room, hostToken, hostPlayerToken } = makeRoom();
  const p1 = addPlayer(room, 'P1');
  startGame(room, hostPlayerToken);
  return { room, hostToken, hostPlayerToken, p1 };
}

test('action: wrong seat -> 403', () => {
  const { room, hostPlayerToken, p1 } = twoPlayerGame();
  const st = room.engineState;
  assert.ok(st);
  const actorRoomSeat = roomSeatOf(room, st.actorSeat);
  const wrongToken = actorRoomSeat === 0 ? p1.token : hostPlayerToken;
  const r = applyPokerAction(room, { token: wrongToken, action: { type: 'fold' } });
  assert.equal(r.ok, false);
  if (!r.ok) assert.equal(r.status, 403);
  clearPokerRooms();
});

test('action: check facing a bet -> 400', () => {
  const { room, hostPlayerToken, p1 } = twoPlayerGame();
  const st = room.engineState;
  assert.ok(st);
  // Heads-up: seat 0 (button/SB) acts first preflop facing the big blind.
  const actorRoomSeat = roomSeatOf(room, st.actorSeat);
  const token = actorRoomSeat === 0 ? hostPlayerToken : p1.token;
  const r = applyPokerAction(room, { token, action: { type: 'check' } });
  assert.equal(r.ok, false);
  if (!r.ok) assert.equal(r.status, 400);
  clearPokerRooms();
});

test('action: bet below the minimum -> 400; valid check advances the actor', () => {
  const { room, hostPlayerToken, p1 } = twoPlayerGame();
  const tokens = new Map<number, string>([
    [0, hostPlayerToken],
    [1, p1.token],
  ]);
  const st0 = room.engineState;
  assert.ok(st0);
  // Preflop heads-up: seat 0 acts first.
  assert.equal(roomSeatOf(room, st0.actorSeat), 0);
  // Bet into an existing bet / below the big blind -> 400.
  const badBet = applyPokerAction(room, {
    token: hostPlayerToken,
    action: { type: 'bet', amount: 10 },
  });
  assert.equal(badBet.ok, false);
  if (!badBet.ok) assert.equal(badBet.status, 400);
  // Call, then the big blind checks: flop is dealt.
  const call = applyPokerAction(room, { token: hostPlayerToken, action: { type: 'call' } });
  assert.equal(call.ok, true);
  const checkBB = applyPokerAction(room, { token: p1.token, action: { type: 'check' } });
  assert.equal(checkBB.ok, true);
  if (checkBB.ok) assert.equal(checkBB.street, 'flop');
  // On the flop with nothing to call, a 5-chip bet is below the 20 minimum.
  const st = room.engineState;
  assert.ok(st);
  const flopActor = roomSeatOf(room, st.actorSeat);
  const tinyBet = applyPokerAction(room, {
    token: tokens.get(flopActor),
    action: { type: 'bet', amount: 5 },
  });
  assert.equal(tinyBet.ok, false);
  if (!tinyBet.ok) assert.equal(tinyBet.status, 400);
  // A valid check advances the actor to the other seat.
  const check = applyPokerAction(room, {
    token: tokens.get(flopActor),
    action: { type: 'check' },
  });
  assert.equal(check.ok, true);
  if (check.ok) assert.equal(check.actorSeat, flopActor === 0 ? 1 : 0);
  clearPokerRooms();
});

test('action: unknown token -> 403; action on a closed room -> 410', () => {
  const existedBefore = diskReportBackupExists();
  try {
    const { room, hostToken } = twoPlayerGame();
  const r = applyPokerAction(room, { token: 'nope', action: { type: 'fold' } });
  assert.equal(r.ok, false);
  if (!r.ok) assert.equal(r.status, 403);
  closePokerRoom(room, 'test');
  const st = room.engineState;
  void st;
  const after = applyPokerAction(room, { token: 'nope', action: { type: 'fold' } });
  assert.equal(after.ok, false);
  if (!after.ok) assert.equal(after.status, 410);
  void hostToken;
  } finally {
    clearPokerRooms();
    clearPokerReports();
    cleanupDiskBackup(existedBefore);
  }
});

test('action: idempotent retry with the same idem returns the same result', () => {
  const { room, hostPlayerToken } = twoPlayerGame();
  const first = applyPokerAction(room, {
    token: hostPlayerToken,
    action: { type: 'call' },
    idem: 'act-1',
  });
  assert.equal(first.ok, true);
  const second = applyPokerAction(room, {
    token: hostPlayerToken,
    action: { type: 'call' },
    idem: 'act-1',
  });
  assert.equal(second.ok, true);
  assert.deepEqual(second, first);
  clearPokerRooms();
});

// ---------------------------------------------------------------------------
// Hole-card privacy
// ---------------------------------------------------------------------------

test('state: seat 1 sees myCards; public players expose no cards; host sees only seat-0 cards', () => {
  const { room, hostToken, hostPlayerToken, p1 } = twoPlayerGame();
  const st = room.engineState;
  assert.ok(st);
  const es0 = engineSeatOf(room, 0);
  const es1 = engineSeatOf(room, 1);
  const hole0 = JSON.stringify(st.players[es0]?.hole ?? []);
  const hole1 = JSON.stringify(st.players[es1]?.hole ?? []);
  assert.notEqual(hole0, hole1);

  const { res, cap } = fakeRes();
  pokerStateHandler(
    fakeReq({
      params: { code: room.code },
      headers: { 'x-poker-token': p1.token },
    }),
    res,
  );
  assert.equal(cap.status, 200);
  const asP1 = cap.body as Record<string, unknown>;
  assert.equal(JSON.stringify(asP1.myCards), hole1);
  // Public player list must not leak anyone's cards.
  const playersJson = JSON.stringify(asP1.players);
  assert.ok(!playersJson.includes('"hole"'));
  assert.ok(!playersJson.includes('"cards"'));

  const { res: res2, cap: cap2 } = fakeRes();
  pokerStateHandler(
    fakeReq({
      params: { code: room.code },
      headers: { 'x-poker-token': hostToken },
    }),
    res2,
  );
  assert.equal(cap2.status, 200);
  const asHost = cap2.body as Record<string, unknown>;
  // Host token resolves to seat 0: only seat 0's own cards are visible.
  assert.equal(asHost.mySeat, 0);
  assert.equal(JSON.stringify(asHost.myCards), hole0);
  void hostPlayerToken;
  clearPokerRooms();
});

// ---------------------------------------------------------------------------
// Rebuy
// ---------------------------------------------------------------------------

test('rebuy: below min -> 400', () => {
  const { room, hostPlayerToken } = twoPlayerGame();
  const r = rebuyPokerChips(room, { token: hostPlayerToken, amount: 50 });
  assert.equal(r.ok, false);
  if (!r.ok) assert.equal(r.status, 400);
  clearPokerRooms();
});

test('rebuy: mid-hand when rebuysMidHand=false -> 409', () => {
  const { room, hostPlayerToken } = twoPlayerGame();
  const st = room.engineState;
  assert.ok(st && st.street !== 'complete');
  const r = rebuyPokerChips(room, { token: hostPlayerToken, amount: 200 });
  assert.equal(r.ok, false);
  if (!r.ok) assert.equal(r.status, 409);
  clearPokerRooms();
});

test('rebuy: valid between hands grows the stack and writes a ledger tx; over maxRebuys -> 400', () => {
  const { room, hostToken, hostPlayerToken } = makeRoom({ maxRebuys: 1 });
  const p1j = addPlayer(room, 'P1');
  void p1j;
  startGame(room, hostPlayerToken);
  const tokens = new Map<number, string>([
    [0, hostPlayerToken],
    [1, p1j.token],
  ]);
  foldOutHand(room, tokens);
  const st = room.engineState;
  assert.ok(st && st.street === 'complete');

  const before = publicTablePlayers(room).find((p) => p.seat === 0)?.stack ?? -1;
  const rebuysBefore = room.ledger.filter((e) => e.kind === 'rebuy' && !e.voided).length;
  const r = rebuyPokerChips(room, { token: hostPlayerToken, amount: 200 });
  assert.equal(r.ok, true);
  if (r.ok) {
    assert.equal(r.stack, before + 200);
    assert.equal(r.rebuysUsed, 1);
    assert.equal(typeof r.txId, 'string');
  }
  const rebuysAfter = room.ledger.filter((e) => e.kind === 'rebuy' && !e.voided).length;
  assert.equal(rebuysAfter, rebuysBefore + 1);
  const player = playerBySeat(room, 0);
  assert.equal(player?.rebuys.length, 1);

  const over = rebuyPokerChips(room, { token: hostPlayerToken, amount: 200 });
  assert.equal(over.ok, false);
  if (!over.ok) assert.equal(over.status, 400);
  void hostToken;
  clearPokerRooms();
});

test('rebuy: mid-hand allowed when rebuysMidHand=true', () => {
  const { room, hostPlayerToken } = makeRoom({ rebuysMidHand: true });
  addPlayer(room, 'P1');
  startGame(room, hostPlayerToken);
  const st = room.engineState;
  assert.ok(st && st.street !== 'complete');
  const before = publicTablePlayers(room).find((p) => p.seat === 0)?.stack ?? -1;
  const r = rebuyPokerChips(room, { token: hostPlayerToken, amount: 200 });
  assert.equal(r.ok, true);
  if (r.ok) assert.equal(r.stack, before + 200);
  clearPokerRooms();
});

// ---------------------------------------------------------------------------
// Disconnect / auto-play
// ---------------------------------------------------------------------------

test('disconnect: the actor is auto-played (check-if-free-else-fold) immediately', () => {
  const { room, hostPlayerToken } = twoPlayerGame();
  const st = room.engineState;
  assert.ok(st);
  const actorRoomSeat = roomSeatOf(room, st.actorSeat);
  const before = st.actorSeat;
  const ok = setPokerConnected(room, actorRoomSeat, false);
  assert.equal(ok, true);
  const player = playerBySeat(room, actorRoomSeat);
  assert.ok(player?.lastAction?.includes('auto'));
  const cur = room.engineState;
  assert.ok(cur);
  // Either the hand ended or action moved on.
  assert.ok(cur.street === 'complete' || cur.actorSeat !== before);
  void hostPlayerToken;
  clearPokerRooms();
});

test('disconnect + reconnect round-trips presence', () => {
  const { room, p1 } = twoPlayerGame();
  assert.equal(setPokerConnected(room, p1.seat, false), true);
  assert.equal(playerBySeat(room, p1.seat)?.connected, false);
  assert.equal(setPokerConnected(room, p1.seat, true), true);
  assert.equal(playerBySeat(room, p1.seat)?.connected, true);
  clearPokerRooms();
});

// ---------------------------------------------------------------------------
// Pause / resume / remove
// ---------------------------------------------------------------------------

test('pause: mid-hand -> 409; between hands -> ok; resume restores playing', () => {
  const { room, hostPlayerToken, p1 } = twoPlayerGame();
  const mid = pausePokerRoom(room);
  assert.equal(mid.ok, false);
  if (!mid.ok) assert.equal(mid.status, 409);
  const tokens = new Map<number, string>([
    [0, hostPlayerToken],
    [1, p1.token],
  ]);
  foldOutHand(room, tokens);
  const between = pausePokerRoom(room);
  assert.equal(between.ok, true);
  assert.equal(room.status, 'paused');
  const resume = resumePokerRoom(room);
  assert.equal(resume.ok, true);
  assert.equal(room.status, 'playing');
  clearPokerRooms();
});

test('remove: lobby only, host cannot be removed, buyin voided', () => {
  const { room } = makeRoom();
  const p1 = addPlayer(room, 'P1');
  const removed = removePokerPlayer(room, p1.seat);
  assert.equal(removed.ok, true);
  assert.equal(playerBySeat(room, p1.seat), undefined);
  const voided = room.ledger.filter((e) => e.seat === p1.seat && e.voided).length;
  assert.ok(voided >= 1);
  const hostGone = removePokerPlayer(room, 0);
  assert.equal(hostGone.ok, false);
  clearPokerRooms();
});

test('dealNextHand seats waiting late-joiners at the next hand boundary', () => {
  const { room, hostPlayerToken, p1 } = twoPlayerGame();
  const late = addPlayer(room, 'Late');
  assert.equal(playerBySeat(room, late.seat)?.inEngine, false);
  const tokens = new Map<number, string>([
    [0, hostPlayerToken],
    [1, p1.token],
  ]);
  foldOutHand(room, tokens);
  assert.equal(dealNextHand(room), true);
  const st = room.engineState;
  assert.ok(st && st.street !== 'complete' && st.handNumber === 2);
  assert.equal(playerBySeat(room, late.seat)?.inEngine, true);
  assert.ok(engineSeatOf(room, late.seat) >= 0);
  clearPokerRooms();
});

// ---------------------------------------------------------------------------
// Close + settlement report + persistent report store
// ---------------------------------------------------------------------------

const REPORTS_FILE = 'server/data/poker-reports.json';

function diskReportBackupExists(): boolean {
  return existsSync(REPORTS_FILE);
}

function cleanupDiskBackup(existedBefore: boolean): void {
  if (!existedBefore && existsSync(REPORTS_FILE)) {
    try {
      unlinkSync(REPORTS_FILE);
    } catch {
      // best-effort
    }
    try {
      rmdirSync('server/data');
    } catch {
      // dir not empty or already gone
    }
  }
}

test('close: mid-hand close auto-plays out; report math matches the scenario', () => {
  const existedBefore = diskReportBackupExists();
  try {
    const { room, hostPlayerToken } = makeRoom({ maxPlayers: 8, maxRebuys: 5 });
    const tokens = new Map<number, string>([[0, hostPlayerToken]]);
    // Scenario seats: host=0, P1..P6 = seats 1..6.
    const names = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6'];
    names.forEach((n) => {
      const p = addPlayer(room, n, 1000);
      tokens.set(p.seat, p.token);
    });
    for (const p of room.players) {
      if (!p.removed) togglePokerReady(room, p.playerToken);
    }
    const started = startPokerGame(room);
    assert.equal(started.ok, true);
    const st = room.engineState;
    assert.ok(st && st.street !== 'complete'); // hand in progress

    // Rebuys for P2 (seat 2) and P5 (seat 5) are real ledger entries.
    // A hand is in progress, so force the boundary to keep this white-box.
    st.street = 'complete';
    const r1 = rebuyPokerChips(room, { token: tokens.get(2), amount: 500 });
    assert.equal(r1.ok, true);
    const r4 = rebuyPokerChips(room, { token: tokens.get(5), amount: 500 });
    assert.equal(r4.ok, true);

    // Scenario final stacks (host never played: final = buyIn = 1000).
    // Note: the brief's example had P5 at 500, which leaves 500 chips
    // unaccounted (nets sum to -500, not 0). Zero-sum requires every chip
    // somewhere, so P5's final stack is 1000 here (net -500).
    const finals = new Map<number, number>([
      [0, 1000],
      [1, 2000],
      [2, 2000],
      [3, 700],
      [4, 500],
      [5, 1000],
      [6, 800],
    ]);
    for (const [seat, chips] of finals) {
      const es = engineSeatOf(room, seat);
      assert.ok(es >= 0);
      const ep = st.players[es];
      if (ep) ep.chips = chips;
    }

    const report = closePokerRoom(room, 'test');
    assert.ok(report);
    assert.equal(room.status, 'closed');

    // nets = final - contributed:
    // P1 +1000, P2 +500, Host 0, P6 -200, P3 -300, P4 -500, P5 -500.
    const nets = report.players.map((p) => p.net);
    assert.deepEqual(nets, [1000, 500, 0, -200, -300, -500, -500]);
    assert.deepEqual(report.players.map((p) => p.seat), [1, 2, 0, 6, 3, 4, 5]);
    assert.equal(nets.reduce((a, b) => a + b, 0), 0);
    assert.deepEqual(report.totals, { buyIns: 7000, rebuys: 1000, final: 8000 });
    assert.equal(report.balanced, true);
    assert.equal(report.discrepancy, 0);
    assert.deepEqual(report.topWinner, { seat: 1, name: 'P1', net: 1000 });
    assert.deepEqual(report.biggestLoss, { seat: 5, name: 'P5', net: -500 });
    assert.equal(report.handsPlayed, 1);

    // Report is retrievable from the in-memory store by code.
    const stored = getPokerReport(room.code);
    assert.deepEqual(stored, report);

    // Disk backup was written (best-effort).
    assert.equal(diskReportBackupExists(), true);

    // Simulated restart: drop memory, reload from disk, report is back.
    clearPokerReports();
    assert.equal(getPokerReport(room.code), undefined);
    const loaded = loadPokerReportsFromDisk();
    assert.ok(loaded >= 1);
    assert.deepEqual(getPokerReport(room.code), report);

    // The report endpoint serves from the store even after live rooms are gone.
    clearPokerRooms();
    const { res, cap } = fakeRes();
    pokerReportHandler(fakeReq({ params: { code: room.code } }), res);
    assert.equal(cap.status, 200);
    assert.deepEqual(
      (cap.body as { code: string }).code,
      room.code,
    );
  } finally {
    clearPokerRooms();
    clearPokerReports();
    cleanupDiskBackup(existedBefore);
  }
});

test('report: unknown or expired code -> 404', () => {
  clearPokerReports();
  const { res, cap } = fakeRes();
  pokerReportHandler(fakeReq({ params: { code: 'ZZZZZ' } }), res);
  assert.equal(cap.status, 404);
  assert.deepEqual(cap.body, { error: 'report not found or expired' });
});

test('report: no endpoint lists all reports (no enumeration)', () => {
  // Module surface: nothing shaped like a list-all.
  for (const key of Object.keys(pokerMod)) {
    assert.ok(
      !/listall|allreports|listreports/i.test(key),
      `suspicious export: ${key}`,
    );
  }
  // Mounted routes: the only /report route is per-code.
  const serverSrc = readFileSync('server/src/server.ts', 'utf8');
  const reportRoutes = serverSrc
    .split('\n')
    .filter((l) => l.includes('/api/poker/rooms') && l.includes('report'));
  assert.deepEqual(
    reportRoutes.map((l) => l.trim()),
    [
      "app.get('/api/poker/rooms/:code/report', pokerReportHandler);",
    ],
  );
});

test('validatePokerReport: balanced true; tampered stack -> balanced false', () => {
  const mk = (): import('./pokerRooms.ts').PokerReport => ({
    roomName: 'T',
    code: 'ABCDE',
    startedAt: 1,
    endedAt: 2,
    durationSec: 1,
    handsPlayed: 3,
    totals: { buyIns: 2000, rebuys: 0, final: 2000 },
    balanced: true,
    discrepancy: 0,
    players: [
      { seat: 0, name: 'A', initialBuyIn: 1000, rebuys: 0, contributed: 1000, finalChips: 1500, net: 500, handsPlayed: 3, handsWon: 2 },
      { seat: 1, name: 'B', initialBuyIn: 1000, rebuys: 0, contributed: 1000, finalChips: 500, net: -500, handsPlayed: 3, handsWon: 1 },
    ],
    topWinner: { seat: 0, name: 'A', net: 500 },
    biggestLoss: { seat: 1, name: 'B', net: -500 },
  });
  const good = validatePokerReport(mk());
  assert.equal(good.balanced, true);
  assert.equal(good.discrepancy, 0);
  const tampered = mk();
  tampered.players[0] = { ...tampered.players[0], finalChips: 1600 };
  const bad = validatePokerReport(tampered);
  assert.equal(bad.balanced, false);
  assert.equal(bad.discrepancy, -100);
});

// ---------------------------------------------------------------------------
// Concurrency, broadcast, sweep
// ---------------------------------------------------------------------------

test('concurrent joins: exactly maxPlayers seats, no duplicates', () => {
  const { room } = makeRoom({ maxPlayers: 4 });
  const results = Array.from({ length: 12 }, (_, i) =>
    joinPokerRoom(room, { name: `Racer${i}`, buyIn: 1000 }),
  );
  const okSeats = results
    .filter((r) => r.ok)
    .map((r) => (r.ok ? r.seat : -1));
  assert.deepEqual([...okSeats].sort((a, b) => a - b), [1, 2, 3]);
  assert.equal(new Set(okSeats).size, okSeats.length);
  for (const r of results) {
    if (!r.ok) assert.equal(r.status, 403);
  }
  clearPokerRooms();
});

test('autoPlayAbsent: a disconnected actor is auto-played directly', () => {
  const { room } = twoPlayerGame();
  const st = room.engineState;
  assert.ok(st);
  const actorRoomSeat = roomSeatOf(room, st.actorSeat);
  const player = playerBySeat(room, actorRoomSeat);
  assert.ok(player);
  player.connected = false; // simulate a dead socket without the handler
  autoPlayAbsent(room);
  assert.ok(player.lastAction?.includes('auto-absent'));
  clearPokerRooms();
});

test('join broadcasts a players event to SSE clients', () => {
  const { room } = makeRoom();
  const chunks: string[] = [];
  const client: PokerClient = {
    write: (chunk: string) => {
      chunks.push(chunk);
    },
    on: () => {},
    isHost: true,
  };
  room.clients.add(client);
  const j = joinPokerRoom(room, { name: 'Watcher', buyIn: 1000 });
  assert.equal(j.ok, true);
  assert.equal(chunks.length, 1);
  assert.ok(chunks[0]?.includes('players'));
  assert.ok(chunks[0]?.includes('Watcher'));
  broadcastPoker(room, 'ping', { n: 1 });
  assert.equal(chunks.length, 2);
  clearPokerRooms();
});

test('sweep: live rooms keep their timers; only expired rooms are cleared', () => {
  const { room, hostPlayerToken } = twoPlayerGame();
  void hostPlayerToken;
  assert.ok(room.engineState && room.engineState.street !== 'complete');
  const removed = sweepPokerRooms(Date.now());
  assert.equal(removed, 0);
  assert.equal(getPokerRoom(room.code)?.code, room.code);
  // The turn timer survived the sweep.
  assert.ok(room.turnExpiresAt !== null && room.turnTimer !== undefined);
  clearPokerRooms();
});

test('sweep: expired rooms and reports are removed', () => {
  const { room } = makeRoom();
  const removedRooms = sweepPokerRooms(Date.now() + 5 * 60 * 60 * 1000);
  assert.ok(removedRooms >= 1);
  assert.equal(getPokerRoom(room.code), undefined);

  const existedBefore = diskReportBackupExists();
  try {
    clearPokerReports();
    const g = twoPlayerGame();
    const st = g.room.engineState;
    assert.ok(st);
    st.street = 'complete';
    closePokerRoom(g.room, 'test');
    assert.equal(sweepPokerReports(Date.now()), 0);
    const removedReports = sweepPokerReports(Date.now() + 31 * 24 * 60 * 60 * 1000);
    assert.ok(removedReports >= 1);
    assert.equal(getPokerReport(g.room.code), undefined);
  } finally {
    clearPokerRooms();
    clearPokerReports();
    cleanupDiskBackup(existedBefore);
  }
});
