// Tambola number caller: draws each number 1–90 exactly once, in random order.

export interface Caller {
  /** Numbers called so far, in call order. */
  called: number[];
  /** Draw one random uncalled number 1–90; null once all 90 are called. */
  call(): number | null;
  /** Clear all called numbers so the game can restart. */
  reset(): void;
  /** How many numbers are still uncalled (0–90). */
  remaining(): number;
  /** Whether a number has already been called. */
  isCalled(n: number): boolean;
}

export function createCaller(rng: () => number = Math.random): Caller {
  let remaining: number[] = [];
  const called: number[] = [];

  const reset = (): void => {
    remaining = [];
    for (let n = 1; n <= 90; n++) remaining.push(n);
    called.length = 0; // keep the same array identity for holders of `called`
  };
  reset();

  return {
    called,
    call(): number | null {
      if (remaining.length === 0) return null;
      const i = Math.floor(rng() * remaining.length);
      const n = remaining[i];
      if (n === undefined) return null;
      remaining.splice(i, 1);
      called.push(n);
      return n;
    },
    reset,
    remaining(): number {
      return remaining.length;
    },
    isCalled(n: number): boolean {
      return called.includes(n);
    },
  };
}
