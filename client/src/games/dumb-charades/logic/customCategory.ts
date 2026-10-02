// Client for the AI custom-category endpoint (POST /api/charades/generate).
// Generated words are session-only: never written to disk.
import type {
  CharadesDifficulty,
  CharadesLang,
} from '../data/types.ts';

export type ApiDifficulty = 'easy' | 'medium' | 'hard' | 'very-hard';

export interface CustomCategoryResult {
  category: string;
  words: string[];
}

/**
 * Map the setup-screen difficulty to the API's difficulty.
 * 'all' has no meaning for generation — 'medium' is the neutral default.
 */
export function toApiDifficulty(
  d: CharadesDifficulty | 'all',
): ApiDifficulty {
  if (d === 'veryhard') return 'very-hard';
  if (d === 'all') return 'medium';
  return d;
}

export async function generateCustomWords(opts: {
  category: string;
  language: CharadesLang;
  difficulty: CharadesDifficulty | 'all';
  count?: number;
}): Promise<CustomCategoryResult> {
  const res = await fetch('/api/charades/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      category: opts.category,
      language: opts.language,
      difficulty: toApiDifficulty(opts.difficulty),
      count: opts.count ?? 30,
    }),
  });
  let data: { words?: unknown; error?: unknown } = {};
  try {
    data = (await res.json()) as { words?: unknown; error?: unknown };
  } catch {
    data = {};
  }
  if (!res.ok) {
    const msg =
      typeof data.error === 'string' && data.error.length > 0
        ? data.error
        : 'generation failed';
    throw new Error(msg);
  }
  const words = Array.isArray(data.words)
    ? data.words.filter(
        (w): w is string => typeof w === 'string' && w.length > 0,
      )
    : [];
  if (words.length === 0) throw new Error('generation failed');
  return { category: opts.category, words };
}
