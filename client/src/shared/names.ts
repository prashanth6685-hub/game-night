// Example person names used in input placeholders across the app.
// Prashanth's pick: only these six names may appear as example names,
// chosen at random per input (useMemo/useState so they don't flicker).
export const EXAMPLE_NAMES = [
  'Chintu',
  'Pinky',
  'Nani',
  'Vani',
  'Bujji',
  'Ganga',
] as const;

export type ExampleName = (typeof EXAMPLE_NAMES)[number];

/** Random example name. Pass a custom rng in tests for determinism. */
export function randomExampleName(
  random: () => number = Math.random,
): ExampleName {
  const idx = Math.floor(random() * EXAMPLE_NAMES.length);
  const name = EXAMPLE_NAMES[idx];
  return name ?? EXAMPLE_NAMES[0]!;
}

/**
 * N distinct random example names (for side-by-side inputs like
 * chess Player 1 / Player 2, so placeholders never match).
 */
export function randomExampleNames(
  count: number,
  random: () => number = Math.random,
): ExampleName[] {
  const pool = [...EXAMPLE_NAMES];
  const out: ExampleName[] = [];
  const n = Math.min(Math.max(count, 0), pool.length);
  for (let i = 0; i < n; i += 1) {
    const idx = Math.floor(random() * pool.length);
    const name = pool.splice(idx, 1)[0];
    if (name !== undefined) out.push(name);
  }
  return out;
}
