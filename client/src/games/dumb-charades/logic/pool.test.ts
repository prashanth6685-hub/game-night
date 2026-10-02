// Tests for buildPool — small inline sample packs only (never the real dataset).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildPool } from './pool.ts';
import type {
  CharadesCategory,
  CharadesDifficulty,
  CharadesLang,
  CharadesPack,
} from '../data/types.ts';

const en = 'en' as CharadesLang;
const te = 'te' as CharadesLang;
const movies = 'movies' as CharadesCategory;
const songs = 'songs' as CharadesCategory;
const easy = 'easy' as CharadesDifficulty;
const medium = 'medium' as CharadesDifficulty;
const hard = 'hard' as CharadesDifficulty;

const packs: CharadesPack[] = [
  {
    language: en,
    category: movies,
    items: [
      { name: 'Titanic', difficulty: easy },
      { name: 'Inception', difficulty: hard },
    ],
  },
  {
    language: en,
    category: songs,
    items: [{ name: 'Hello', difficulty: easy }],
  },
  {
    language: te,
    category: movies,
    items: [{ name: 'Baahubali', display: 'బాహుబలి', difficulty: medium }],
  },
];

test('filters by language', () => {
  const pool = buildPool(packs, {
    language: te,
    category: 'random',
    difficulty: 'all',
  });
  assert.deepEqual(
    pool.map((i) => i.name),
    ['Baahubali'],
  );
});

test('filters by category', () => {
  const pool = buildPool(packs, {
    language: en,
    category: movies,
    difficulty: 'all',
  });
  assert.deepEqual(
    pool.map((i) => i.name),
    ['Titanic', 'Inception'],
  );
});

test("'random' category combines every category of that language", () => {
  const pool = buildPool(packs, {
    language: en,
    category: 'random',
    difficulty: 'all',
  });
  assert.deepEqual(
    pool.map((i) => i.name).sort(),
    ['Hello', 'Inception', 'Titanic'],
  );
});

test('filters by difficulty', () => {
  const pool = buildPool(packs, {
    language: en,
    category: 'random',
    difficulty: easy,
  });
  assert.deepEqual(
    pool.map((i) => i.name).sort(),
    ['Hello', 'Titanic'],
  );
});

test("'all' difficulty applies no difficulty filter", () => {
  const pool = buildPool(packs, {
    language: en,
    category: movies,
    difficulty: 'all',
  });
  assert.equal(pool.length, 2);
});

test('impossible combination returns an empty pool', () => {
  const pool = buildPool(packs, {
    language: te,
    category: songs,
    difficulty: 'all',
  });
  assert.deepEqual(pool, []);
});

test('empty pack list returns an empty pool', () => {
  const pool = buildPool([], {
    language: en,
    category: 'random',
    difficulty: 'all',
  });
  assert.deepEqual(pool, []);
});
