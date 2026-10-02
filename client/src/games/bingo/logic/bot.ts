// Bot opponents for Bingo.
// Bots never miss a daub, so a bot's card state is fully determined by the
// drawn set — no per-ball bookkeeping needed. Their only "human" trait is a
// small random delay before claiming a completed pattern: a sharp human who
// daubs fast and hits CLAIM first can still beat them.
import type { BingoCard } from './bingo.ts';

/** Milliseconds a bot waits before claiming: 500–2500. */
export function botClaimDelay(rng: () => number = Math.random): number {
  return 500 + rng() * 2000;
}

/**
 * Covered cells on a bot's card. Bots daub every drawn ball instantly, so
 * this is just: FREE center + every drawn number on the card.
 */
export function botDaubedCount(
  card: BingoCard,
  drawn: Set<number>,
): number {
  let n = 0;
  for (let r = 0; r < 5; r += 1) {
    for (let c = 0; c < 5; c += 1) {
      const v = card[r]?.[c];
      if (v === null || v === undefined || drawn.has(v)) n += 1;
    }
  }
  return n;
}
