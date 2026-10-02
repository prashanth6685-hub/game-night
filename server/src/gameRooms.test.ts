// Tests for the generic multi-phone room system (all games except Tambola).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  cleanName,
  createMpRoom,
  endMpGame,
  getMpRoom,
  joinMpPlayer,
  normalizeMpCode,
  postMpIntent,
  postMpState,
  startMpGame,
  sweepMpRooms,
  type MpClient,
} from './gameRooms.ts';

function fakeClient(playerId?: string): { client: MpClient; chunks: string[] } {
  const chunks: string[] = [];
  const client: MpClient = {
    write: (chunk: string) => {
      chunks.push(chunk);
    },
    on: () => {},
    playerId,
    isHost: playerId === undefined,
  };
  return { client, chunks };
}

test('createMpRoom gives the host seat 0 and a 5-char code', () => {
  const { room, host } = createMpRoom('ludo', 'Host', { seats: 4 }, 4);
  assert.equal(room.code.length, 5);
  assert.equal(host.seat, 0);
  assert.equal(room.status, 'lobby');
  assert.equal(room.maxPlayers, 4);
  assert.equal(getMpRoom(room.code.toLowerCase()), room);
});

test('normalizeMpCode uppercases and strips junk', () => {
  assert.equal(normalizeMpCode(' ab-123 '), 'AB123');
});

test('cleanName strips controls and collapses whitespace', () => {
  assert.equal(cleanName('  Ram   Kumar '), 'Ram Kumar');
  assert.equal(cleanName('   '), '');
});

test('players join in seat order; duplicate name rejoins the same seat', () => {
  const { room, host } = createMpRoom('chess', 'Host', null, 2);
  const a = joinMpPlayer(room, 'Pinky');
  assert.equal(a.ok, true);
  if (a.ok) assert.equal(a.player.seat, 1);
  const again = joinMpPlayer(room, 'pinky');
  assert.equal(again.ok, true);
  if (again.ok) {
    assert.equal(again.rejoined, true);
    assert.equal(again.player.seat, 1);
  }
  const full = joinMpPlayer(room, 'Third');
  assert.equal(full.ok, false);
  if (!full.ok) assert.equal(full.error, 'room-full');
  assert.equal(host.seat, 0);
});

test('cannot join after start; state writes need the current version', () => {
  const { room, host } = createMpRoom('snake-ladder', 'Host', null, 4);
  const p = joinMpPlayer(room, 'Bujji');
  assert.equal(p.ok, true);
  if (!p.ok) return;
  assert.equal(startMpGame(room, { turn: 0 }), true);
  assert.equal(startMpGame(room, { turn: 0 }), false);
  const late = joinMpPlayer(room, 'Late');
  assert.equal(late.ok, false);

  const stale = postMpState(room, p.player.id, p.player.token, { turn: 1 }, 99);
  assert.equal(stale.ok, false);
  if (!stale.ok) assert.equal(stale.error, 'stale-version');

  const good = postMpState(room, p.player.id, p.player.token, { turn: 0 }, 1);
  assert.equal(good.ok, true);
  if (good.ok) assert.equal(good.version, 2);
  assert.deepEqual(room.state, { turn: 0 });

  const badAuth = postMpState(room, host.id, 'wrong-token', { turn: 1 }, 2);
  assert.equal(badAuth.ok, false);
  if (!badAuth.ok) assert.equal(badAuth.error, 'auth');
});

test('intents broadcast to everyone; DMs reach only the target player', () => {
  const { room, host } = createMpRoom('dumb-charades', 'Host', null, 10);
  const p = joinMpPlayer(room, 'Actor');
  assert.equal(p.ok, true);
  if (!p.ok) return;
  const hostConn = fakeClient(host.id);
  const actorConn = fakeClient(p.player.id);
  const other = joinMpPlayer(room, 'Guesser');
  assert.equal(other.ok, true);
  if (!other.ok) return;
  const guesserConn = fakeClient(other.player.id);
  room.clients.add(hostConn.client);
  room.clients.add(actorConn.client);
  room.clients.add(guesserConn.client);

  assert.equal(
    postMpIntent(room, host.id, host.token, 'word', { word: 'Baahubali' }, p.player.id),
    true,
  );
  assert.equal(actorConn.chunks.length, 1);
  assert.match(actorConn.chunks[0] ?? '', /Baahubali/);
  assert.equal(hostConn.chunks.length, 0);
  assert.equal(guesserConn.chunks.length, 0);

  assert.equal(postMpIntent(room, host.id, host.token, 'score', { a: 1 }), true);
  assert.equal(hostConn.chunks.length, 1);
  assert.equal(actorConn.chunks.length, 2);
  assert.equal(guesserConn.chunks.length, 1);
});

test('endMpGame ends once and sweep removes stale rooms', () => {
  const { room } = createMpRoom('bingo', 'Host', null, 6);
  endMpGame(room, { winner: 'Host' });
  assert.equal(room.status, 'ended');
  endMpGame(room, { winner: 'Other' });
  assert.deepEqual(room.results, { winner: 'Host' });
  const removed = sweepMpRooms(Date.now() + 31 * 60 * 1000);
  assert.ok(removed >= 1);
  assert.equal(getMpRoom(room.code), undefined);
});
