// Tests for games/ludo/logic/ludo.ts
// Run: node --test client/src/games/ludo/logic/ludo.test.ts (from repo root)
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  BASE,
  FINISHED,
  applyMove,
  createGame,
  finishedCount,
  isForfeit,
  legalMoves,
  passTurn,
  totalProgress,
} from './ludo.ts';
import type { LudoState } from './ludo.ts';

/** Deterministic rng: always picks the first option. */
const rng0 = () => 0;

/** createGame with custom token layouts and turn. */
function setup(
  tokens: number[][],
  turn = 0,
  consecutiveSixes = 0,
): LudoState {
  const s = createGame(
    tokens.map((_, i) => `P${i + 1}`),
    [],
    rng0,
  );
  return {
    ...s,
    turn,
    consecutiveSixes,
    players: s.players.map((p, i) => ({ ...p, tokens: [...(tokens[i] ?? [])] })),
  };
}

describe('createGame', () => {
  it('creates 2-4 players with 4 tokens in base and a valid starting turn', () => {
    const s = createGame(['A', 'B', 'C'], [false, true, false], rng0);
    assert.equal(s.players.length, 3);
    assert.deepEqual(
      s.players.map((p) => p.tokens),
      [
        [BASE, BASE, BASE, BASE],
        [BASE, BASE, BASE, BASE],
        [BASE, BASE, BASE, BASE],
      ],
    );
    assert.deepEqual(
      s.players.map((p) => p.color),
      ['#ef4444', '#22c55e', '#eab308'],
    );
    assert.deepEqual(
      s.players.map((p) => p.isBot),
      [false, true, false],
    );
    assert.equal(s.turn, 0);
    assert.equal(s.winner, null);
    assert.equal(s.consecutiveSixes, 0);
  });

  it('rejects player counts outside 2-4', () => {
    assert.throws(() => createGame(['A'], [], rng0));
    assert.throws(() => createGame(['A', 'B', 'C', 'D', 'E'], [], rng0));
  });
});

describe('legalMoves', () => {
  it('a token leaves base only on a 6', () => {
    const s = setup([
      [BASE, BASE, BASE, BASE],
      [BASE, BASE, BASE, BASE],
    ]);
    assert.deepEqual(legalMoves(s, 0, 5), []);
    assert.deepEqual(legalMoves(s, 0, 6), [
      { token: 0, from: BASE, to: 0 },
      { token: 1, from: BASE, to: 0 },
      { token: 2, from: BASE, to: 0 },
      { token: 3, from: BASE, to: 0 },
    ]);
  });

  it('needs an exact roll to finish; overshoot is not a legal move', () => {
    const s = setup([
      [55, BASE, BASE, BASE],
      [BASE, BASE, BASE, BASE],
    ]);
    assert.deepEqual(legalMoves(s, 0, 2), [{ token: 0, from: 55, to: 57 }]);
    assert.deepEqual(legalMoves(s, 0, 3), []);
    const s2 = setup([
      [56, BASE, BASE, BASE],
      [BASE, BASE, BASE, BASE],
    ]);
    assert.deepEqual(legalMoves(s2, 0, 1), [{ token: 0, from: 56, to: 57 }]);
    assert.deepEqual(legalMoves(s2, 0, 2), []);
  });

  it('finished tokens never move', () => {
    const s = setup([
      [FINISHED, BASE, BASE, BASE],
      [BASE, BASE, BASE, BASE],
    ]);
    assert.ok(
      legalMoves(s, 0, 6).every((m) => m.token !== 0),
    );
  });

  it('returns no moves on the third consecutive six (forfeit)', () => {
    const s = setup(
      [
        [10, BASE, BASE, BASE],
        [BASE, BASE, BASE, BASE],
      ],
      0,
      2,
    );
    assert.equal(isForfeit(s, 6), true);
    assert.deepEqual(legalMoves(s, 0, 6), []);
    assert.equal(isForfeit(s, 5), false);
  });
});

describe('applyMove', () => {
  it('captures an opponent token on a non-safe square', () => {
    // A token0 at progress 4 (absolute 4). B token0 at progress 49
    // (absolute (13+49)%52 = 10, not safe).
    const s = setup([
      [4, BASE, BASE, BASE],
      [49, BASE, BASE, BASE],
    ]);
    const { state, events, extraTurn, capturedPlayers } = applyMove(
      s,
      0,
      { token: 0, from: 4, to: 10 },
      6,
    );
    assert.equal(state.players[1]?.tokens[0], BASE);
    assert.ok(events.includes('capture'));
    assert.deepEqual(capturedPlayers, [1]);
    assert.equal(extraTurn, true);
    assert.equal(state.turn, 0);
    assert.equal(state.consecutiveSixes, 1);
  });

  it('safe squares are immune to capture (star square)', () => {
    // Absolute 8 is a star square. A token0 at progress 8 (absolute 8).
    // B token0 at progress 41 -> rolls 6 -> progress 47 -> absolute
    // (13+47)%52 = 8. Safe: no capture.
    const s = setup([
      [8, BASE, BASE, BASE],
      [41, BASE, BASE, BASE],
    ]);
    const { state, events } = applyMove(
      s,
      1,
      { token: 0, from: 41, to: 47 },
      6,
    );
    assert.equal(state.players[0]?.tokens[0], 8);
    assert.ok(!events.includes('capture'));
    assert.ok(events.includes('safe-landing'));
  });

  it('start squares are immune to capture', () => {
    // Absolute 13 is B's start (safe). A token0 at progress 13 (absolute 13).
    // B leaves base onto progress 0 (absolute 13). No capture.
    const s = setup([
      [13, BASE, BASE, BASE],
      [BASE, BASE, BASE, BASE],
    ]);
    const { state } = applyMove(s, 1, { token: 0, from: BASE, to: 0 }, 6);
    assert.equal(state.players[0]?.tokens[0], 13);
    assert.equal(state.players[1]?.tokens[0], 0);
  });

  it('reports leave-base and token-home events', () => {
    const s = setup([
      [BASE, 56, BASE, BASE],
      [BASE, BASE, BASE, BASE],
    ]);
    const r1 = applyMove(s, 0, { token: 0, from: BASE, to: 0 }, 6);
    assert.ok(r1.events.includes('leave-base'));
    const r2 = applyMove(s, 0, { token: 1, from: 56, to: 57 }, 1);
    assert.ok(r2.events.includes('token-home'));
    assert.equal(r2.extraTurn, false);
    assert.equal(r2.state.turn, 1);
  });

  it('grants an extra turn on a 6 and passes the turn otherwise', () => {
    const s = setup([
      [0, BASE, BASE, BASE],
      [BASE, BASE, BASE, BASE],
    ]);
    const six = applyMove(s, 0, { token: 0, from: 0, to: 6 }, 6);
    assert.equal(six.extraTurn, true);
    assert.equal(six.state.turn, 0);
    const other = applyMove(s, 0, { token: 0, from: 0, to: 3 }, 3);
    assert.equal(other.extraTurn, false);
    assert.equal(other.state.turn, 1);
    assert.equal(other.state.consecutiveSixes, 0);
  });

  it('detects the win when the last token reaches home', () => {
    const s = setup([
      [57, 57, 57, 56],
      [10, BASE, BASE, BASE],
    ]);
    const { state, events, extraTurn } = applyMove(
      s,
      0,
      { token: 3, from: 56, to: 57 },
      1,
    );
    assert.equal(state.winner, 0);
    assert.ok(events.includes('win'));
    assert.equal(extraTurn, false);
  });

  it('passTurn moves to the next player and resets sixes', () => {
    const s = setup(
      [
        [10, BASE, BASE, BASE],
        [BASE, BASE, BASE, BASE],
      ],
      0,
      2,
    );
    const next = passTurn(s);
    assert.equal(next.turn, 1);
    assert.equal(next.consecutiveSixes, 0);
  });
});

describe('standings helpers', () => {
  it('finishedCount and totalProgress', () => {
    const s = setup([
      [57, 57, 10, BASE],
      [BASE, BASE, BASE, BASE],
    ]);
    const p = s.players[0]!;
    assert.equal(finishedCount(p), 2);
    assert.equal(totalProgress(p), 57 + 57 + 10);
  });
});
