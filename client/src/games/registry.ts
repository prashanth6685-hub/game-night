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

type AnyScreenModule =
  | { default: ComponentType<GameScreenProps> }
  | { default: ComponentType<MpScreenProps> };

/**
 * Load a game chunk, recovering from the classic stale-deploy failure:
 * after a new deploy, a phone holding the old page requests chunk files
 * that no longer exist. Retry once, then reload the page (fresh index +
 * fresh chunks) — guarded so it can never loop.
 */
function withRetry<T extends AnyScreenModule>(load: () => Promise<T>): () => Promise<T> {
  return async () => {
    try {
      const mod = await load();
      try {
        sessionStorage.removeItem('gn-chunk-reload');
      } catch {
        // ignore
      }
      return mod;
    } catch (err) {
      let last = 0;
      try {
        last = Number(sessionStorage.getItem('gn-chunk-reload') ?? 0);
      } catch {
        // ignore
      }
      if (Date.now() - last > 30000) {
        try {
          sessionStorage.setItem('gn-chunk-reload', String(Date.now()));
        } catch {
          // ignore
        }
        window.location.reload();
        // Keep Suspense waiting while the page reloads.
        return new Promise<T>(() => {});
      }
      throw err;
    }
  };
}

export const GAMES: RegisteredGame[] = [
  {
    meta: bingoMeta,
    load: withRetry(() => import('./bingo/index.ts')),
    loadMp: withRetry(() => import('./bingo/multiplayer/MpGame.tsx')),
  },
  {
    meta: dumbCharadesMeta,
    load: withRetry(() => import('./dumb-charades/index.ts')),
    loadMp: withRetry(() => import('./dumb-charades/multiplayer/MpGame.tsx')),
  },
  {
    meta: ludoMeta,
    load: withRetry(() => import('./ludo/index.ts')),
    loadMp: withRetry(() => import('./ludo/multiplayer/MpGame.tsx')),
  },
  { meta: tambolaMeta, load: withRetry(() => import('./tambola/index.ts')) },
  {
    meta: snakeLadderMeta,
    load: withRetry(() => import('./snake-ladder/index.ts')),
    loadMp: withRetry(() => import('./snake-ladder/multiplayer/MpGame.tsx')),
  },
  {
    meta: chessMeta,
    load: withRetry(() => import('./chess/index.ts')),
    loadMp: withRetry(() => import('./chess/multiplayer/MpGame.tsx')),
  },
];

export function getGame(id: string): RegisteredGame | undefined {
  return GAMES.find((g) => g.meta.id === id);
}
