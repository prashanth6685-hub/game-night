import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { PACKS, CATEGORIES, LANGUAGES } from './index.ts';
import type { CharadesPack, CharadesDifficulty } from './types.ts';

const MIN_COUNTS: Record<string, number> = {
  'movies:en': 40, 'movies:te': 40, 'movies:hi': 30,
  'tv:en': 20, 'tv:te': 20, 'tv:hi': 20,
  'songs:en': 15, 'songs:te': 15, 'songs:hi': 15,
  'people:en': 30, 'animals:en': 30, 'places:en': 30, 'food:en': 30,
  'books:en': 20, 'actions:en': 40, 'funny:en': 30,
};

const VALID_DIFFICULTIES: CharadesDifficulty[] = ['easy', 'medium', 'hard', 'veryhard'];
const TELUGU_RE = /[ఀ-౿]/;

function keyOf(p: CharadesPack): string {
  return `${p.category}:${p.language}`;
}

describe('charades data packs', () => {
  it('covers every expected pack', () => {
    const keys = new Set(PACKS.map(keyOf));
    for (const key of Object.keys(MIN_COUNTS)) {
      assert.ok(keys.has(key), `missing pack ${key}`);
    }
  });

  it('every pack meets its minimum count', () => {
    for (const p of PACKS) {
      const key = keyOf(p);
      const min = MIN_COUNTS[key];
      assert.ok(min !== undefined, `unexpected pack ${key}`);
      assert.ok(p.items.length >= min, `${key}: has ${p.items.length}, needs ${min}`);
    }
  });

  it('every item has a non-empty name and a valid difficulty', () => {
    for (const p of PACKS) {
      for (const item of p.items) {
        assert.ok(typeof item.name === 'string' && item.name.trim().length > 0, `empty name in ${keyOf(p)}`);
        assert.ok(VALID_DIFFICULTIES.includes(item.difficulty), `bad difficulty "${item.difficulty}" in ${keyOf(p)}`);
      }
    }
  });

  it('no case-insensitive duplicate names within any pack', () => {
    for (const p of PACKS) {
      const seen = new Set<string>();
      for (const item of p.items) {
        const k = item.name.toLowerCase();
        assert.ok(!seen.has(k), `duplicate "${item.name}" in ${keyOf(p)}`);
        seen.add(k);
      }
    }
  });

  it('Telugu movie pack names contain Telugu script characters', () => {
    const te = PACKS.find((p) => p.category === 'movies' && p.language === 'te');
    assert.ok(te, 'telugu movies pack missing');
    for (const item of te.items) {
      assert.ok(TELUGU_RE.test(item.name), `no Telugu script in "${item.name}"`);
    }
  });

  it('all packs have valid language/category values', () => {
    const langs = new Set(LANGUAGES.map((l) => l.id));
    const cats = new Set(CATEGORIES.map((c) => c.id));
    for (const p of PACKS) {
      assert.ok(langs.has(p.language), `bad language "${p.language}"`);
      assert.ok(cats.has(p.category), `bad category "${p.category}"`);
    }
  });
});
