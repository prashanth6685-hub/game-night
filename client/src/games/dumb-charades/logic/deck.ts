// A shuffled, no-replacement word deck for Dumb Charades.
// Fisher-Yates shuffle with an injectable RNG (seed it in tests).
//
// Exhaustion behaviour: when every word has been drawn, the deck reshuffles
// the FULL pool and keeps dealing — a long party game never runs dry.
// `next()` returns null only when the pool itself was empty.
import type { CharadesItem } from '../data/types.ts';

export interface Deck {
  /** Draw the next word, or null when the pool was empty. */
  next(): CharadesItem | null;
  /** Words left before the next reshuffle. */
  remaining(): number;
  /** Size of the full pool. */
  total(): number;
}

export function createDeck(
  items: CharadesItem[],
  rng: () => number = Math.random,
): Deck {
  const pool = [...items];
  let order: number[] = [];
  let pos = 0;

  const shuffle = (): void => {
    order = pool.map((_, i) => i);
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      const a = order[i] as number;
      order[i] = order[j] as number;
      order[j] = a;
    }
    pos = 0;
  };

  shuffle();

  return {
    next(): CharadesItem | null {
      if (pool.length === 0) return null;
      if (pos >= order.length) shuffle();
      const idx = order[pos] as number;
      pos += 1;
      return pool[idx] as CharadesItem;
    },
    remaining(): number {
      return order.length - pos;
    },
    total(): number {
      return pool.length;
    },
  };
}
