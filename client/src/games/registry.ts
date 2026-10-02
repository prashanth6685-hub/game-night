// Game registry — the ONLY place that knows the list of games.
// To add a game: create games/<id>/ (see games/types.ts contract) and add one entry here.
import type { ComponentType } from 'react';
import type { GameMeta, GameScreenProps } from './types.ts';
import { meta as tambolaMeta } from './tambola/meta.ts';
import { meta as snakeLadderMeta } from './snake-ladder/meta.ts';
import { meta as chessMeta } from './chess/meta.ts';
import { meta as dumbCharadesMeta } from './dumb-charades/meta.ts';

export interface RegisteredGame {
  meta: GameMeta;
  load: () => Promise<{ default: ComponentType<GameScreenProps> }>;
}

export const GAMES: RegisteredGame[] = [
  { meta: dumbCharadesMeta, load: () => import('./dumb-charades/index.ts') },
  { meta: tambolaMeta, load: () => import('./tambola/index.ts') },
  { meta: snakeLadderMeta, load: () => import('./snake-ladder/index.ts') },
  { meta: chessMeta, load: () => import('./chess/index.ts') },
];

export function getGame(id: string): RegisteredGame | undefined {
  return GAMES.find((g) => g.meta.id === id);
}
