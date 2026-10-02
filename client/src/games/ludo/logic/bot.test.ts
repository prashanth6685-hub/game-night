// Tests for games/ludo/logic/bot.ts
// Run: node --test client/src/games/ludo/logic/bot.test.ts (from repo root)
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { BASE, createGame, legalMoves } from './ludo.ts';
import type { LudoState } from './ludo.ts';
import { chooseMove } from './bot.ts';

/** Deterministic rng: jitter is exactly 0. */
const rngMid = () => 0.5;

function setup(tokens: number[][], turn = 0): LudoState {
  const s = createGame(
    tokens.map((_, i) => `P${i + 1}`),
    [],
    () => 0,
  );
  return {
    ...s,
    turn,
    players: s.players.map((p, i) => ({ ...p, tokens: [...(tokens[i] ?? [])] })),
  };
}

describe('chooseMove', () => {
  it('returns null when there are no legal moves', () => {
    assert.equal(
      chooseMove(
        setup([
          [BASE, BASE, BASE, BASE],
          [BASE, BASE, BASE, BASE],
        ]),
        0,
        5,
        [],
        rngMid,
      ),
      null,
    );
  });

  it('prefers capturing an opponent over leaving base', () => {
    // A token0 at progress 4 (absolute 4). B token0 at progress 49
    // (absolute 10 — capturable). A rolls 6.
    const s = setup([
      [4, BASE, BASE, BASE],
      [49, BASE, BASE, BASE],
    ]);
    const moves = legalMoves(s, 0, 6);
    assert.ok(moves.length > 1);
    const pick = chooseMove(s, 0, 6, moves, rngMid);
    // token0 4 -> 10 captures B.
    assert.deepEqual(pick, { token: 0, from: 4, to: 10 });
  });

  it('prefers finishing a token over other moves', () => {
    const s = setup([
      [56, 20, BASE, BASE],
      [BASE, BASE, BASE, BASE],
    ]);
    const moves = legalMoves(s, 0, 1);
    const pick = chooseMove(s, 0, 1, moves, rngMid);
    assert.deepEqual(pick, { token: 0, from: 56, to: 57 });
  });

  it('avoids leaving a token capturable when a safe alternative exists', () => {
    // A token0 at progress 20 (absolute 20, unsafe). B token0 at progress 4
    // (absolute 17) — 3 squares behind, so 20 -> 22 would hang the token.
    // A token1 at progress 6 (absolute 6) -> 8 lands on a safe star.
    const s = setup([
      [20, 6, BASE, BASE],
      [4, BASE, BASE, BASE],
    ]);
    const moves = legalMoves(s, 0, 2);
    assert.equal(moves.length, 2);
    const pick = chooseMove(s, 0, 2, moves, rngMid);
    assert.deepEqual(pick, { token: 1, from: 6, to: 8 });
  });

  it('moves a token out of base on a 6 when that is the only move', () => {
    const s = setup([
      [BASE, BASE, BASE, BASE],
      [BASE, BASE, BASE, BASE],
    ]);
    const moves = legalMoves(s, 0, 6);
    const pick = chooseMove(s, 0, 6, moves, rngMid);
    assert.deepEqual(pick, { token: 0, from: BASE, to: 0 });
  });

  it('is deterministic for a fixed rng', () => {
    const s = setup([
      [12, 30, BASE, BASE],
      [40, BASE, BASE, BASE],
    ]);
    const moves = legalMoves(s, 0, 4);
    const a = chooseMove(s, 0, 4, moves, () => 0.123);
    const b = chooseMove(s, 0, 4, moves, () => 0.123);
    assert.deepEqual(a, b);
  });
});
