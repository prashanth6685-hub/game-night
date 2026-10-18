// Tests for the universal room-code resolver helper: any code typed on any
// join screen must land the player on the right game's join screen.

import { describe, test, afterEach } from 'node:test';
import assert from 'node:assert';
import {
  resolveRoomCode,
  resolvedRoomJoinHash,
} from './resolveRoom.ts';

const realFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = realFetch;
});

function mockFetch(json: unknown, ok = true): void {
  globalThis.fetch = (async () =>
    ({
      ok,
      json: async () => json,
    }) as unknown as Response) as typeof fetch;
}

describe('resolveRoomCode', () => {
  test('returns the poker resolution', async () => {
    mockFetch({ kind: 'poker', code: 'AB12C' });
    assert.deepEqual(await resolveRoomCode('ab12c'), {
      kind: 'poker',
      code: 'AB12C',
    });
  });

  test('returns the mp resolution with gameId', async () => {
    mockFetch({ kind: 'mp', code: 'XY99Z', gameId: 'ludo' });
    assert.deepEqual(await resolveRoomCode('XY99Z'), {
      kind: 'mp',
      code: 'XY99Z',
      gameId: 'ludo',
    });
  });

  test('returns the tambola resolution', async () => {
    mockFetch({ kind: 'tambola', code: 'TM111' });
    assert.deepEqual(await resolveRoomCode('TM111'), {
      kind: 'tambola',
      code: 'TM111',
    });
  });

  test('returns null on 404 or network failure', async () => {
    mockFetch({ error: 'room not found' }, false);
    assert.equal(await resolveRoomCode('ZZZZZ'), null);
    globalThis.fetch = (() => {
      throw new Error('down');
    }) as unknown as typeof fetch;
    assert.equal(await resolveRoomCode('AB12C'), null);
  });

  test('returns null for blank input without calling fetch', async () => {
    let called = false;
    globalThis.fetch = (async () => {
      called = true;
      return { ok: true, json: async () => ({}) } as unknown as Response;
    }) as typeof fetch;
    assert.equal(await resolveRoomCode('   '), null);
    assert.equal(called, false);
  });
});

describe('resolvedRoomJoinHash', () => {
  test('maps each kind to its join screen', () => {
    assert.equal(
      resolvedRoomJoinHash({ kind: 'poker', code: 'AB12C' }),
      '#/poker/join/AB12C',
    );
    assert.equal(
      resolvedRoomJoinHash({ kind: 'mp', code: 'XY99Z', gameId: 'ludo' }),
      '#/join/XY99Z',
    );
    assert.equal(
      resolvedRoomJoinHash({ kind: 'tambola', code: 'TM111' }),
      '#/tambola/join/TM111',
    );
  });
});
