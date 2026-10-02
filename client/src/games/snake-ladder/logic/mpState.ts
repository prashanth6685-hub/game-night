// Shared multiplayer state shape for Snake & Ladder rooms. Kept in logic
// (no React, no mp imports) so the same-device setup screen can create the
// initial room state WITHOUT pulling the whole multiplayer module graph
// into the game's main chunk.

import { createGame } from './game.ts';
import type { SlState } from './game.ts';
import type { SlDifficulty } from './board.ts';

export interface SlMpConfig {
  extraTurnOnSix: boolean;
  difficulty: SlDifficulty;
}

export interface SlMpState {
  game: SlState;
  dice: number;
  lastRoll: number | null;
  lastEvent: 'ladder' | 'snake' | 'stay' | 'six' | null;
  lastMoverSeat: number | null;
  /** Square landed on before the snake/ladder applied (for the glide). */
  lastFrom: number | null;
}

export function initialSlMpState(
  names: string[],
  config: SlMpConfig,
): SlMpState {
  return {
    game: createGame(names, config.extraTurnOnSix, config.difficulty),
    dice: 6,
    lastRoll: null,
    lastEvent: null,
    lastMoverSeat: null,
    lastFrom: null,
  };
}
