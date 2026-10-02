// Tests for games/snake-ladder/logic/game.ts
// Run: node --test client/src/games/snake-ladder/logic/game.test.ts (from repo root)
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { applyRoll, createGame } from './game.ts';
import type { SlState } from './game.ts';

/** Build a state on top of createGame with custom positions/turn. */
function withPositions(
  state: SlState,
  positions: number[],
  turn = 0,
): SlState {
  return {
    ...state,
    turn,
    players: state.players.map((p, i) => ({ ...p, pos: positions[i] ?? 0 })),
  };
}

describe('createGame', () => {
  it('assigns palette colors in order and starts everyone at 0', () => {
    const s = createGame(['A', 'B', 'C', 'D'], true);
    assert.deepEqual(
      s.players.map((p) => p.color),
      ['#ef4444', '#3b82f6', '#22c55e', '#f59e0b'],
    );
    assert.deepEqual(
      s.players.map((p) => p.pos),
      [0, 0, 0, 0],
    );
    assert.equal(s.turn, 0);
    assert.equal(s.winner, null);
    assert.equal(s.extraTurnOnSix, true);
  });

  it('wraps the palette for more than 4 players', () => {
    const s = createGame(['A', 'B', 'C', 'D', 'E'], false);
    assert.equal(s.players[4]?.color, '#ef4444');
  });
});

describe('applyRoll', () => {
  it('rotates turns across 3 players', () => {
    let s = createGame(['A', 'B', 'C'], false);
    s = applyRoll(s, 2).state;
    assert.equal(s.turn, 1);
    s = applyRoll(s, 2).state;
    assert.equal(s.turn, 2);
    s = applyRoll(s, 2).state;
    assert.equal(s.turn, 0);
  });

  it('moves only the current player and updates their position', () => {
    const s = createGame(['A', 'B'], false);
    const { state: next } = applyRoll(s, 3);
    assert.equal(next.players[0]?.pos, 3);
    assert.equal(next.players[1]?.pos, 0);
  });

  it('grants an extra turn on a 6 when the rule is enabled', () => {
    const s = createGame(['A', 'B'], true);
    const { state: next, extraTurn } = applyRoll(s, 6);
    assert.equal(extraTurn, true);
    assert.equal(next.turn, 0);
    assert.equal(next.winner, null);
  });

  it('does not grant an extra turn on a 6 when the rule is disabled', () => {
    const s = createGame(['A', 'B'], false);
    const { state: next, extraTurn } = applyRoll(s, 6);
    assert.equal(extraTurn, false);
    assert.equal(next.turn, 1);
  });

  it('does not grant an extra turn on a non-6 roll', () => {
    const s = createGame(['A', 'B'], true);
    const { state: next, extraTurn } = applyRoll(s, 4);
    assert.equal(extraTurn, false);
    assert.equal(next.turn, 1);
  });

  it('detects the win at exactly 100 and grants no extra turn', () => {
    const s = withPositions(createGame(['A', 'B', 'C'], true), [94, 10, 20]);
    const { state: next, extraTurn } = applyRoll(s, 6);
    assert.equal(next.players[0]?.pos, 100);
    assert.equal(next.winner, 0);
    assert.equal(extraTurn, false);
    // game over: turn stays with the winner, no rotation
    assert.equal(next.turn, 0);
  });

  it('detects a win by ladder (79 + 1 lands on 80 -> 100)', () => {
    const s = withPositions(createGame(['A', 'B'], true), [79, 0]);
    const { state: next, event } = applyRoll(s, 1);
    assert.equal(event, 'ladder');
    assert.equal(next.winner, 0);
  });

  it('reports ladder and snake events from the move', () => {
    const s = createGame(['A', 'B'], false);
    assert.equal(applyRoll(s, 1).event, 'ladder'); // 0 + 1 -> square 1 -> 38
    const s2 = withPositions(s, [15, 0]);
    assert.equal(applyRoll(s2, 1).event, 'snake'); // 15 + 1 -> 16 -> 6
  });

  it('overshoot keeps the token in place and passes the turn', () => {
    const s = withPositions(createGame(['A', 'B'], true), [97, 50]);
    const { state: next, event } = applyRoll(s, 5);
    assert.equal(next.players[0]?.pos, 97);
    assert.equal(event, null);
    assert.equal(next.turn, 1);
  });

  it('does not mutate the input state', () => {
    const s = createGame(['A', 'B'], true);
    const before = JSON.stringify(s);
    applyRoll(s, 6);
    assert.equal(JSON.stringify(s), before);
  });

  it('throws on an out-of-range turn index', () => {
    const s = { ...createGame(['A'], true), turn: 5 };
    assert.throws(() => applyRoll(s, 3), RangeError);
  });
});
