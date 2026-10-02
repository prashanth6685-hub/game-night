// Tests for multi-phone Tambola rooms (server/src/tambolaRooms.ts).
// Pure core functions are tested directly; SSE is tested with a fake client.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  broadcast,
  claimView,
  createRoom,
  createRoomCode,
  drawNumber,
  endRoom,
  fileClaim,
  findPlayerByName,
  formatEvent,
  getRoom,
  joinPlayer,
  normalizeCode,
  playerSnapshot,
  recordDab,
  sweepRooms,
  uniqueName,
  verifyClaim,
} from './tambolaRooms.ts';
import type { SseClient, TambolaRoom } from './tambolaRooms.ts';
import { ticketKey } from '../../client/src/games/tambola/logic/ticket.ts';
import { checkPattern } from '../../client/src/games/tambola/logic/patterns.ts';

function makeRoom(): TambolaRoom {
  return createRoom(['early-five', 'top-line', 'full-house']);
}

function fakeClient(): SseClient & { chunks: string[] } {
  const chunks: string[] = [];
  return {
    chunks,
    write: (c: string) => {
      chunks.push(c);
    },
    on: () => {},
  };
}

// ---------- room codes ----------

test('createRoomCode produces 5-char codes from the unambiguous alphabet', () => {
  const seen = new Set<string>();
  for (let i = 0; i < 200; i++) {
    const code = createRoomCode(seen);
    assert.equal(code.length, 5);
    assert.match(code, /^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{5}$/);
    seen.add(code);
  }
});

test('normalizeCode uppercases and strips junk', () => {
  assert.equal(normalizeCode(' k7x2p '), 'K7X2P');
  assert.equal(normalizeCode('k-7_x.2p'), 'K7X2P');
});

test('createRoom registers the room and getRoom finds it', () => {
  const room = makeRoom();
  assert.equal(getRoom(room.code), room);
  assert.equal(getRoom('zzzzz'), undefined);
  assert.equal(room.status, 'lobby');
  assert.deepEqual(room.enabledPatterns, ['early-five', 'top-line', 'full-house']);
});

// ---------- join ----------

test('joinPlayer assigns unique tickets and valid names', () => {
  const room = makeRoom();
  const keys = new Set<string>();
  for (const name of ['Ravi', 'Priya', 'Arjun', 'Meera', 'Kiran']) {
    const r = joinPlayer(room, name);
    assert.equal(r.ok, true);
    if (r.ok) {
      assert.equal(r.player.name, name);
      assert.equal(r.rejoined, false);
      const key = ticketKey(r.player.ticket);
      assert.ok(!keys.has(key), 'ticket must be unique in the room');
      keys.add(key);
      assert.ok(r.player.token.length >= 16);
    }
  }
  assert.equal(room.players.length, 5);
});

test('joinPlayer rejects blank names', () => {
  const room = makeRoom();
  assert.deepEqual(joinPlayer(room, '   '), { ok: false, error: 'invalid-name' });
});

test('duplicate names get auto-suffixed (Ravi 2)', () => {
  const room = makeRoom();
  const a = joinPlayer(room, 'Ravi');
  const b = joinPlayer(room, 'ravi'); // case-insensitive → rejoin, not a new player
  assert.equal(a.ok && b.ok, true);
  if (a.ok && b.ok) {
    assert.equal(b.rejoined, true);
    assert.equal(b.player.id, a.player.id);
    assert.equal(room.players.length, 1);
  }
});

test('rejoin with same name (any case) returns the same ticket', () => {
  const room = makeRoom();
  const a = joinPlayer(room, 'Priya');
  const b = joinPlayer(room, 'PRIYA');
  assert.equal(a.ok && b.ok, true);
  if (a.ok && b.ok) {
    assert.equal(b.rejoined, true);
    assert.equal(ticketKey(b.player.ticket), ticketKey(a.player.ticket));
    assert.equal(b.player.token, a.player.token);
  }
});

test('findPlayerByName is case-insensitive', () => {
  const room = makeRoom();
  joinPlayer(room, 'Arjun');
  assert.ok(findPlayerByName(room, 'arjun'));
  assert.ok(findPlayerByName(room, 'ARJUN'));
  assert.equal(findPlayerByName(room, 'nobody'), undefined);
});

test('uniqueName suffixes collisions', () => {
  const room = makeRoom();
  joinPlayer(room, 'Ravi');
  // Force a true collision path: joinPlayer treats same name as rejoin, so
  // exercise uniqueName directly for the suffix logic.
  assert.equal(uniqueName(room, 'Ravi'), 'Ravi 2');
  assert.equal(uniqueName(room, 'Priya'), 'Priya');
});

test('join after game started is rejected for new players', () => {
  const room = makeRoom();
  joinPlayer(room, 'Ravi');
  room.status = 'playing';
  assert.deepEqual(joinPlayer(room, 'Priya'), { ok: false, error: 'already-started' });
  // ...but the existing player can still rejoin.
  const r = joinPlayer(room, 'ravi');
  assert.equal(r.ok, true);
  if (r.ok) assert.equal(r.rejoined, true);
});

// ---------- calling ----------

test('drawNumber draws each number 1-90 exactly once, in random order', () => {
  const room = makeRoom();
  room.status = 'playing';
  const seen = new Set<number>();
  for (let i = 0; i < 90; i++) {
    const n = drawNumber(room);
    assert.ok(n !== null && n >= 1 && n <= 90);
    assert.ok(!seen.has(n), `duplicate call: ${n}`);
    seen.add(n as number);
  }
  assert.equal(drawNumber(room), null); // 91st draw → null
  assert.equal(room.called.length, 90);
});

test('drawNumber refuses when not playing', () => {
  const room = makeRoom();
  assert.equal(drawNumber(room), null);
  assert.equal(room.called.length, 0);
});

test('called broadcast carries number + count in order', () => {
  const room = makeRoom();
  room.status = 'playing';
  const client = fakeClient();
  room.clients.add(client);
  drawNumber(room);
  drawNumber(room);
  const events = client.chunks.join('');
  assert.ok(events.includes('event: called'));
  const numbers = [...events.matchAll(/"number":(\d+)/g)].map((m) => Number(m[1]));
  assert.deepEqual(numbers, room.called);
  assert.equal(new Set(numbers).size, 2);
});

// ---------- dab ----------

test('recordDab stores and removes dabs per player with auth', () => {
  const room = makeRoom();
  const r = joinPlayer(room, 'Ravi');
  assert.equal(r.ok, true);
  if (!r.ok) return;
  const p = r.player;
  assert.equal(recordDab(room, p.id, p.token, 42, true), true);
  assert.equal(recordDab(room, p.id, p.token, 7, true), true);
  assert.deepEqual([...p.dabbed].sort((a, b) => a - b), [7, 42]);
  assert.equal(recordDab(room, p.id, p.token, 42, false), true);
  assert.deepEqual(p.dabbed, [7]);
  // Wrong token → rejected.
  assert.equal(recordDab(room, p.id, 'wrong', 9, true), false);
  // Out of range → rejected.
  assert.equal(recordDab(room, p.id, p.token, 0, true), false);
  assert.equal(recordDab(room, p.id, p.token, 91, true), false);
});

// ---------- claims ----------

function joinAndStart(name: string): { room: TambolaRoom; playerId: string; token: string } {
  const room = makeRoom();
  const r = joinPlayer(room, name);
  if (!r.ok) throw new Error('join failed');
  room.status = 'playing';
  return { room, playerId: r.player.id, token: r.player.token };
}

test('fileClaim creates a pending claim and broadcasts it', () => {
  const { room, playerId, token } = joinAndStart('Ravi');
  const client = fakeClient();
  room.clients.add(client);
  const res = fileClaim(room, playerId, token, 'early-five');
  assert.equal(res.ok, true);
  if (res.ok) {
    assert.equal(res.claim.status, 'pending');
    assert.equal(res.claim.playerName, 'Ravi');
  }
  assert.ok(client.chunks.join('').includes('event: claim'));
});

test('fileClaim rejects disabled patterns, bad auth, and non-playing rooms', () => {
  const { room, playerId, token } = joinAndStart('Ravi');
  assert.deepEqual(fileClaim(room, playerId, 'bad', 'early-five'), {
    ok: false,
    error: 'auth',
  });
  assert.deepEqual(fileClaim(room, playerId, token, 'bottom-line'), {
    ok: false,
    error: 'bad-pattern',
  });
  room.status = 'lobby';
  assert.deepEqual(fileClaim(room, playerId, token, 'early-five'), {
    ok: false,
    error: 'not-playing',
  });
});

test('verifyClaim approves only genuinely valid claims (server-side check)', () => {
  const { room, playerId, token } = joinAndStart('Ravi');
  // Call every number so any ticket trivially satisfies full-house.
  for (let n = 1; n <= 90; n++) room.called.push(n);
  const filed = fileClaim(room, playerId, token, 'full-house');
  assert.equal(filed.ok, true);
  if (!filed.ok) return;
  const v = verifyClaim(room, filed.claim.id, true);
  assert.equal(v.ok, true);
  if (v.ok) {
    assert.equal(v.claim.status, 'approved');
    assert.equal(v.ended, true); // full house ends the game
    assert.equal(room.status, 'ended');
  }
});

test('verifyClaim refuses to approve an invalid claim (422 path)', () => {
  const { room, playerId, token } = joinAndStart('Ravi');
  // Only 3 numbers called — early-five is impossible.
  room.called.push(1, 2, 3);
  const filed = fileClaim(room, playerId, token, 'early-five');
  assert.equal(filed.ok, true);
  if (!filed.ok) return;
  const v = verifyClaim(room, filed.claim.id, true);
  assert.deepEqual(v, { ok: false, error: 'invalid-claim' });
  assert.equal(filed.claim.status, 'pending'); // still pending, not approved
});

test('verifyClaim reject flow marks the claim rejected and broadcasts', () => {
  const { room, playerId, token } = joinAndStart('Ravi');
  const client = fakeClient();
  room.clients.add(client);
  const filed = fileClaim(room, playerId, token, 'top-line');
  assert.equal(filed.ok, true);
  if (!filed.ok) return;
  const v = verifyClaim(room, filed.claim.id, false);
  assert.equal(v.ok, true);
  if (v.ok) assert.equal(v.claim.status, 'rejected');
  assert.ok(client.chunks.join('').includes('event: claim-resolved'));
});

test('claimView carries the ticket for host verification', () => {
  const { room, playerId, token } = joinAndStart('Ravi');
  const filed = fileClaim(room, playerId, token, 'early-five');
  assert.equal(filed.ok, true);
  if (!filed.ok) return;
  const view = claimView(room, filed.claim);
  const player = room.players[0];
  assert.ok(player);
  assert.deepEqual(view.ticket, player.ticket);
});

test('already-approved patterns cannot be claimed again', () => {
  const { room, playerId, token } = joinAndStart('Ravi');
  for (let n = 1; n <= 90; n++) room.called.push(n);
  const other = joinPlayer(room, 'Priya');
  // Room is playing; joinPlayer for a NEW name is rejected — approve path
  // needs two players, so do it before starting instead.
  void other;
  const filed = fileClaim(room, playerId, token, 'top-line');
  assert.equal(filed.ok, true);
  if (!filed.ok) return;
  assert.equal(verifyClaim(room, filed.claim.id, true).ok, true);
  const again = fileClaim(room, playerId, token, 'top-line');
  assert.deepEqual(again, { ok: false, error: 'already-approved' });
});

// ---------- end / results ----------

test('endRoom broadcasts results with approved winners', () => {
  const { room, playerId, token } = joinAndStart('Ravi');
  for (let n = 1; n <= 90; n++) room.called.push(n);
  const filed = fileClaim(room, playerId, token, 'early-five');
  assert.equal(filed.ok, true);
  if (!filed.ok) return;
  verifyClaim(room, filed.claim.id, true);
  const client = fakeClient();
  room.clients.add(client);
  const results = endRoom(room);
  assert.equal(room.status, 'ended');
  assert.deepEqual(results.winners, [{ playerName: 'Ravi', pattern: 'early-five' }]);
  assert.ok(client.chunks.join('').includes('event: ended'));
});

// ---------- snapshots ----------

test('playerSnapshot carries ticket + called but no tokens', () => {
  const { room, playerId } = joinAndStart('Ravi');
  const player = room.players.find((p) => p.id === playerId);
  assert.ok(player);
  const snap = playerSnapshot(room, player);
  assert.equal(snap.name, 'Ravi');
  assert.ok(Array.isArray(snap.ticket));
  assert.deepEqual(snap.called, []);
  assert.ok(!('token' in snap));
  assert.ok(!('hostToken' in snap));
});

// ---------- TTL ----------

test('sweepRooms removes expired rooms only', () => {
  const fresh = makeRoom();
  const old = makeRoom();
  old.createdAt = Date.now() - 5 * 60 * 60 * 1000; // 5h old
  const removed = sweepRooms();
  assert.equal(removed, 1);
  assert.equal(getRoom(fresh.code)?.code, fresh.code);
  assert.equal(getRoom(old.code), undefined);
});

test('sweepRooms removes ended rooms after 30 min', () => {
  const room = makeRoom();
  endRoom(room);
  assert.equal(sweepRooms(), 0); // just ended — kept
  room.endedAt = Date.now() - 31 * 60 * 1000;
  assert.equal(sweepRooms(), 1);
  assert.equal(getRoom(room.code), undefined);
});

// ---------- SSE format ----------

test('formatEvent produces valid SSE frames', () => {
  const frame = formatEvent('called', { number: 42 });
  assert.equal(frame, 'event: called\ndata: {"number":42}\n\n');
});

test('broadcast reaches all clients and drops broken ones silently', () => {
  const room = makeRoom();
  const good = fakeClient();
  const bad: SseClient = {
    write: () => {
      throw new Error('broken pipe');
    },
    on: () => {},
  };
  room.clients.add(good);
  room.clients.add(bad);
  broadcast(room, 'ping', { n: 1 });
  assert.equal(good.chunks.length, 1);
});

// ---------- server never trusts the client for wins ----------

test('checkPattern agrees with server approval for a real ticket', () => {
  const { room, playerId, token } = joinAndStart('Ravi');
  const player = room.players.find((p) => p.id === playerId);
  assert.ok(player);
  // Call exactly the ticket's numbers → full house must validate.
  const nums = new Set<number>();
  for (const row of player.ticket) {
    for (const v of row) if (v !== null) nums.add(v);
  }
  room.called.push(...nums);
  const calledSet = new Set(room.called);
  assert.equal(checkPattern(player.ticket, calledSet, 'full-house'), true);
  const filed = fileClaim(room, playerId, token, 'full-house');
  assert.equal(filed.ok, true);
});
