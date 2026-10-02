// Medium-hard Ludo bot: scores every legal move and picks the best.
// Pure function — no React, no side effects (rng only for jitter).

import {
  BASE,
  FINISHED,
  MAX_TRACK_PROGRESS,
  SAFE_SQUARES,
  absoluteSquare,
  capturesFor,
  isDangerous,
  isSafeLanding,
} from './ludo.ts';
import type { LudoMove, LudoState } from './ludo.ts';

/** Hypothetical state after a move (token moved, captures resolved). */
function stateAfterMove(
  state: LudoState,
  playerIdx: number,
  move: LudoMove,
): LudoState {
  const abs =
    move.to >= 0 && move.to <= MAX_TRACK_PROGRESS
      ? absoluteSquare(playerIdx, move.to)
      : -1;
  const canCapture = abs >= 0 && !SAFE_SQUARES.has(abs);
  return {
    ...state,
    players: state.players.map((p, pi) => {
      if (pi === playerIdx) {
        return {
          ...p,
          tokens: p.tokens.map((t, i) => (i === move.token ? move.to : t)),
        };
      }
      if (!canCapture) return p;
      return {
        ...p,
        tokens: p.tokens.map((t) =>
          t >= 0 &&
          t <= MAX_TRACK_PROGRESS &&
          absoluteSquare(pi, t) === abs
            ? BASE
            : t,
        ),
      };
    }),
  };
}

function scoreMove(
  state: LudoState,
  playerIdx: number,
  move: LudoMove,
  rng: () => number,
): number {
  let score = 0;
  // Capturing is the biggest swing — take it.
  score += 100 * capturesFor(state, playerIdx, move);
  // Finishing a token is nearly as valuable.
  if (move.to === FINISHED) score += 80;
  // Getting a token out of base develops the position.
  if (move.from === BASE) score += 30;
  // Safe squares can't be captured.
  if (isSafeLanding(playerIdx, move.to)) score += 40;
  // Prefer pushing the furthest token forward.
  if (move.from >= 0) score += 2 * (move.to - move.from);
  // Don't hang a token where it can be captured next turn.
  if (isDangerous(stateAfterMove(state, playerIdx, move), playerIdx, move.to)) {
    score -= 30;
  }
  // Small jitter so play doesn't feel robotic.
  score += rng() * 10 - 5;
  return score;
}

/**
 * Pick the best of the legal moves. Returns null when there are none.
 * `roll` is informational (the score is move-based). Deterministic for a
 * fixed rng.
 */
export function chooseMove(
  state: LudoState,
  playerIdx: number,
  roll: number,
  moves: LudoMove[],
  rng: () => number = Math.random,
): LudoMove | null {
  void roll;
  if (moves.length === 0) return null;
  let best: LudoMove = moves[0]!;
  let bestScore = -Infinity;
  for (const m of moves) {
    const s = scoreMove(state, playerIdx, m, rng);
    if (s > bestScore) {
      bestScore = s;
      best = m;
    }
  }
  return best;
}
