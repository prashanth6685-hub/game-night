// AI-generated custom categories for Dumb Charades.
// Server-side generation via the free Pollinations text API (no key needed).
// Nothing is persisted: generated words live only in the API response.
//
// Pure, unit-testable pieces: buildPrompt, sanitizeWords, validateGenerateInput,
// createRateLimiter. The express handler is a thin adapter over them.
import type { Request, Response } from 'express';

export type GenLanguage = 'en' | 'te' | 'hi';
export type GenDifficulty = 'easy' | 'medium' | 'hard' | 'very-hard';

export interface GenerateInput {
  category: string;
  language: GenLanguage;
  difficulty: GenDifficulty;
  count: number;
}

export const DEFAULT_COUNT = 30;
export const MAX_COUNT = 40;
export const MAX_ITEM_LEN = 100;
export const GENERATION_TIMEOUT_MS = 25000;
export const RATE_LIMIT_PER_HOUR = 20;

const POLLINATIONS_URL = 'https://text.pollinations.ai/';

const LANG_INSTRUCTIONS: Record<GenLanguage, string> = {
  en: 'English',
  te: 'Telugu — write every item in Telugu script (Telugu Unicode characters, e.g. "బాహుబలి")',
  hi: 'Hindi — write every item in Devanagari script where natural',
};

/** Build the LLM prompt. Pure function — unit-tested. */
export function buildPrompt(input: GenerateInput): string {
  return [
    'You are a family party game assistant creating a Dumb Charades word list.',
    `Generate exactly ${input.count} items for the category "${input.category}".`,
    `Language: ${LANG_INSTRUCTIONS[input.language]}.`,
    `Difficulty: ${input.difficulty} — pick items a casual family audience would know at this level.`,
    'Rules:',
    '- Family-friendly only: suitable for all ages, nothing offensive or inappropriate.',
    '- Each item must be 1 to 5 words.',
    '- No duplicates or near-duplicates.',
    '- Respond with ONLY a JSON array of strings, e.g. ["Item One", "Item Two"].',
    '- No markdown, no code fences, no explanations, no other text.',
  ].join('\n');
}

function tryParseArray(text: string): unknown[] | null {
  try {
    const parsed: unknown = JSON.parse(text);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Extract a clean string[] from raw LLM output.
 * Tolerant: direct JSON.parse first, then regex-extract the first [...] block
 * (handles markdown code fences). Drops non-strings, empties, over-long
 * items; dedupes case-insensitively; caps at MAX_COUNT.
 */
export function sanitizeWords(raw: string): string[] {
  const text = raw.trim();
  let arr = tryParseArray(text);
  if (arr === null) {
    const m = /\[[\s\S]*\]/.exec(text);
    arr = m ? tryParseArray(m[0]) : null;
  }
  if (arr === null) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of arr) {
    if (typeof item !== 'string') continue;
    const s = item.trim().replace(/\s+/g, ' ');
    if (s.length === 0 || s.length > MAX_ITEM_LEN) continue;
    const key = s.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(s);
    if (out.length >= MAX_COUNT) break;
  }
  return out;
}

export type ValidateResult =
  | { ok: true; value: GenerateInput }
  | { ok: false; error: string };

/** Validate + normalize the request body. Pure function — unit-tested. */
export function validateGenerateInput(body: unknown): ValidateResult {
  if (typeof body !== 'object' || body === null) {
    return { ok: false, error: 'invalid request body' };
  }
  const b = body as Record<string, unknown>;
  const rawCategory = typeof b.category === 'string' ? b.category : '';
  // Strip control characters (never trust raw input into a prompt).
  const category = rawCategory.replace(/[\u0000-\u001F\u007F]/g, '').trim();
  if (category.length < 2 || category.length > 60) {
    return { ok: false, error: 'category must be 2-60 characters' };
  }
  const language = b.language;
  if (language !== 'en' && language !== 'te' && language !== 'hi') {
    return { ok: false, error: 'language must be one of: en, te, hi' };
  }
  const difficulty = b.difficulty;
  if (
    difficulty !== 'easy' &&
    difficulty !== 'medium' &&
    difficulty !== 'hard' &&
    difficulty !== 'very-hard'
  ) {
    return {
      ok: false,
      error: 'difficulty must be one of: easy, medium, hard, very-hard',
    };
  }
  let count = DEFAULT_COUNT;
  if (b.count !== undefined) {
    if (typeof b.count !== 'number' || !Number.isInteger(b.count)) {
      return { ok: false, error: 'count must be an integer' };
    }
    count = Math.min(Math.max(b.count, 5), MAX_COUNT);
  }
  return { ok: true, value: { category, language, difficulty, count } };
}

export interface RateLimiter {
  /** Returns true if the key is still within quota. */
  check(key: string, now?: number): boolean;
}

/** Sliding-window in-memory rate limiter. Pure enough to unit-test. */
export function createRateLimiter(
  limit: number,
  windowMs: number,
): RateLimiter {
  const hits = new Map<string, number[]>();
  return {
    check(key: string, now: number = Date.now()): boolean {
      const cutoff = now - windowMs;
      const recent = (hits.get(key) ?? []).filter((t) => t > cutoff);
      if (recent.length >= limit) {
        hits.set(key, recent);
        return false;
      }
      recent.push(now);
      hits.set(key, recent);
      if (hits.size > 2000) {
        for (const [k, v] of hits) {
          const last = v[v.length - 1];
          if (v.length === 0 || (last !== undefined && last <= cutoff)) {
            hits.delete(k);
          }
        }
      }
      return true;
    },
  };
}

/** Minimal fetch shape so tests can inject a mock. */
export interface FetchLike {
  (
    url: string,
    init?: {
      method?: string;
      headers?: Record<string, string>;
      body?: string;
      signal?: AbortSignal;
    },
  ): Promise<{ ok: boolean; text(): Promise<string> }>;
}

/**
 * Call the LLM and return sanitized words.
 * Never throws: any failure (timeout, network, bad response) → [].
 */
export async function generateWords(
  input: GenerateInput,
  fetchImpl: FetchLike = fetch as unknown as FetchLike,
): Promise<string[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), GENERATION_TIMEOUT_MS);
  try {
    const res = await fetchImpl(POLLINATIONS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'openai',
        messages: [{ role: 'user', content: buildPrompt(input) }],
      }),
      signal: controller.signal,
    });
    if (!res.ok) return [];
    return sanitizeWords(await res.text());
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

export interface CharadesDeps {
  fetchImpl?: FetchLike;
  limiter?: RateLimiter;
}

/** Express adapter: validation → rate limit → generate → JSON. Never crashes. */
export function charadesGenerateHandler(deps: CharadesDeps = {}) {
  const limiter =
    deps.limiter ?? createRateLimiter(RATE_LIMIT_PER_HOUR, 60 * 60 * 1000);
  return async (req: Request, res: Response): Promise<void> => {
    try {
      const ip = req.ip ?? 'unknown';
      if (!limiter.check(ip)) {
        res
          .status(429)
          .json({ error: 'too many requests — please wait a while and try again' });
        return;
      }
      const parsed = validateGenerateInput(req.body);
      if (!parsed.ok) {
        res.status(400).json({ error: parsed.error });
        return;
      }
      const words = await generateWords(parsed.value, deps.fetchImpl);
      if (words.length === 0) {
        res.status(503).json({
          error: 'generation failed, try again or pick a preset category',
        });
        return;
      }
      res.json({ words, category: parsed.value.category });
    } catch {
      res.status(503).json({
        error: 'generation failed, try again or pick a preset category',
      });
    }
  };
}
