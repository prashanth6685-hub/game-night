// Filters charades packs down to the playable word pool for a game setup.
// Pure function — no React, no randomness.
import type {
  CharadesCategory,
  CharadesDifficulty,
  CharadesItem,
  CharadesLang,
  CharadesPack,
} from '../data/types.ts';

export interface PoolOptions {
  language: CharadesLang;
  category: CharadesCategory | 'random';
  difficulty: CharadesDifficulty | 'all';
}

export function buildPool(
  packs: CharadesPack[],
  opts: PoolOptions,
): CharadesItem[] {
  const out: CharadesItem[] = [];
  for (const pack of packs) {
    if (pack.language !== opts.language) continue;
    if (opts.category !== 'random' && pack.category !== opts.category) continue;
    for (const item of pack.items) {
      if (opts.difficulty !== 'all' && item.difficulty !== opts.difficulty)
        continue;
      out.push(item);
    }
  }
  return out;
}
