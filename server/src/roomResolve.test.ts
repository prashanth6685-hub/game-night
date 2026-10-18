// Tests for the universal room-code resolver (GET /api/rooms/resolve/:code
// backing logic): a code entered on ANY join screen must route to the game
// that owns the room, irrespective of which game's join screen it was typed
// on.

import { describe, test } from 'node:test';
import assert from 'node:assert';
import { createMpRoom, clearMpRooms } from './gameRooms.ts';
import { createPokerRoom, clearPokerRooms } from './pokerRooms.ts';
import { createRoom as createTambolaRoom } from './tambolaRooms.ts';
import { normalizeResolveCode, resolveRoomKind } from './roomResolve.ts';

const POKER_CONFIG: Record<string, unknown> = {
  roomName: 'Resolve Test',
  hostName: 'Host',
  maxPlayers: 8,
  startingStack: 1000,
  smallBlind: 10,
  bigBlind: 20,
  minBuyIn: 500,
  maxBuyIn: 0,
  rebuyMin: 100,
  rebuyMax: 500,
  maxRebuys: 5,
  rebuysMidHand: false,
  allowLateJoin: true,
  durationMin: 0,
};

describe('roomResolve', () => {
  test('resolves a poker room code to kind poker', () => {
    clearPokerRooms();
    const r = createPokerRoom({ ...POKER_CONFIG });
    assert.equal(r.ok, true);
    if (!r.ok) throw new Error('setup failed');
    const resolved = resolveRoomKind(r.room.code);
    assert.deepEqual(resolved, { kind: 'poker', code: r.room.code });
    clearPokerRooms();
  });

  test('resolves a generic multi-phone room code with its gameId', () => {
    clearMpRooms();
    const { room } = createMpRoom('ludo', 'Host', null, 4);
    const resolved = resolveRoomKind(room.code);
    assert.deepEqual(resolved, { kind: 'mp', code: room.code, gameId: 'ludo' });
    clearMpRooms();
  });

  test('resolves a tambola room code to kind tambola', () => {
    const room = createTambolaRoom(['early-five']);
    const resolved = resolveRoomKind(room.code);
    assert.deepEqual(resolved, { kind: 'tambola', code: room.code });
  });

  test('returns null for unknown or blank codes', () => {
    assert.equal(resolveRoomKind('ZZZZZ'), null);
    assert.equal(resolveRoomKind(''), null);
    assert.equal(resolveRoomKind('   '), null);
  });

  test('normalizes lowercase and noisy input', () => {
    clearPokerRooms();
    const r = createPokerRoom({ ...POKER_CONFIG });
    assert.equal(r.ok, true);
    if (!r.ok) throw new Error('setup failed');
    const lower = r.room.code.toLowerCase();
    const resolved = resolveRoomKind(`  ${lower} `);
    assert.deepEqual(resolved, { kind: 'poker', code: r.room.code });
    clearPokerRooms();
  });

  test('normalizeResolveCode strips non-alphanumerics', () => {
    assert.equal(normalizeResolveCode('ab-12'), 'AB12');
    assert.equal(normalizeResolveCode(''), '');
  });
});
