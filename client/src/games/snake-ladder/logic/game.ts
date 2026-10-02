// Snake & Ladder game state machine.
// Pure — applyRoll never mutates its input; it returns a new state.
// Tested in game.test.ts.
import { applyMove } from './board.ts';
import type { MoveEvent } from './board.ts';

export interface SlPlayer {
  name: string;
  color: string;
  /** Square 0 = off the board (token has not entered yet). */
  pos: number;
}

export interface SlState {
  players: SlPlayer[];
  /** Index of the player whose turn it is. */
  turn: number;
  /** Index of the winning player, or null while the game is in progress. */
  winner: number | null;
  extraTurnOnSix: boolean;
}

const PALETTE: string[] = ['#ef4444', '#3b82f6', '#22c55e', '#f59e0b'];

export function createGame(
  names: string[],
  extraTurnOnSix: boolean,
): SlState {
  return {
    players: names.map((name, i) => ({
      name,
      color: PALETTE[i % PALETTE.length] ?? '#9ca3af',
      pos: 0,
    })),
    turn: 0,
    winner: null,
    extraTurnOnSix,
  };
}

export interface RollResult {
  state: SlState;
  event: MoveEvent;
  /** True when the same player rolls again (rolled a 6 with the rule on). */
  extraTurn: boolean;
}

/**
 * Apply a dice roll for the current player: move their token, detect a
 * win at exactly 100, and advance the turn (or grant an extra turn on a
 * 6 when the rule is enabled — never after the winning roll).
 */
export function applyRoll(state: SlState, roll: number): RollResult {
  const moverIdx = state.turn;
  if (moverIdx < 0 || moverIdx >= state.players.length) {
    throw new RangeError(`invalid turn index ${moverIdx}`);
  }
  const players = state.players.map((p) => ({ ...p }));
  const mover = players[moverIdx] as SlPlayer;
  const move = applyMove(mover.pos, roll);
  mover.pos = move.pos;

  let winner = state.winner;
  if (winner === null && move.pos === 100) {
    winner = moverIdx;
  }
  const extraTurn = state.extraTurnOnSix && roll === 6 && winner === null;
  const turn =
    winner !== null || extraTurn ? moverIdx : (moverIdx + 1) % players.length;

  return {
    state: { players, turn, winner, extraTurnOnSix: state.extraTurnOnSix },
    event: move.event,
    extraTurn,
  };
}
