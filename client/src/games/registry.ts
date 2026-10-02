// Game registry — the ONLY place that knows the list of games.
// To add a game: create games/<id>/ (see games/types.ts contract) and add one entry here.
import type { ComponentType } from 'react';
import type { GameMeta, GameScreenProps, MpScreenProps } from './types.ts';
import { meta as tambolaMeta } from './tambola/meta.ts';
import { meta as snakeLadderMeta } from './snake-ladder/meta.ts';
import { meta as chessMeta } from './chess/meta.ts';
import { meta as bingoMeta } from './bingo/meta.ts';
import { meta as dumbCharadesMeta } from './dumb-charades/meta.ts';
import { meta as ludoMeta } from './ludo/meta.ts';

export interface RegisteredGame {
  meta: GameMeta;
  load: () => Promise<{ default: ComponentType<GameScreenProps> }>;
  /** Multi-phone (QR) screen. Absent only for Tambola (own room system). */
  loadMp?: () => Promise<{ default: ComponentType<MpScreenProps> }>;
}

export const GAMES: RegisteredGame[] = [
  {
    meta: bingoMeta,
    load: () => import('./bingo/index.ts'),
    loadMp: () => import('./bingo/multiplayer/MpGame.tsx'),
  },
  {
    meta: dumbCharadesMeta,
    load: () => import('./dumb-charades/index.ts'),
    loadMp: () => import('./dumb-charades/multiplayer/MpGame.tsx'),
  },
  {
    meta: ludoMeta,
    load: () => import('./ludo/index.ts'),
    loadMp: () => import('./ludo/multiplayer/MpGame.tsx'),
  },
  { meta: tambolaMeta, load: () => import('./tambola/index.ts') },
  {
    meta: snakeLadderMeta,
    load: () => import('./snake-ladder/index.ts'),
    loadMp: () => import('./snake-ladder/multiplayer/MpGame.tsx'),
  },
  {
    meta: chessMeta,
    load: () => import('./chess/index.ts'),
    loadMp: () => import('./chess/multiplayer/MpGame.tsx'),
  },
];

export function getGame(id: string): RegisteredGame | undefined {
  return GAMES.find((g) => g.meta.id === id);
}
