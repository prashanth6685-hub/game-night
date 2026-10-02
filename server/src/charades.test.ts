// Tests for the AI custom-category endpoint pieces:
// prompt builder, sanitizer, input validation, rate limiter, and the
// express handler (fetch mocked — no network in tests).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Request, Response } from 'express';
import {
  buildPrompt,
  charadesGenerateHandler,
  createRateLimiter,
  generateWords,
  sanitizeWords,
  validateGenerateInput,
  DEFAULT_COUNT,
  MAX_COUNT,
} from './charades.ts';
import type { FetchLike, GenerateInput } from './charades.ts';

const baseInput: GenerateInput = {
  category: 'cricketers',
  language: 'en',
  difficulty: 'medium',
  count: 30,
};

// ---------- prompt builder ----------

test('buildPrompt includes category, language, difficulty and JSON-array instruction', () => {
  const p = buildPrompt(baseInput);
  assert.match(p, /cricketers/);
  assert.match(p, /medium/);
  assert.match(p, /JSON array of strings/);
  assert.match(p, /family-friendly/i);
  assert.match(p, /No duplicates/);
  assert.match(p, /1 to 5 words/);
  assert.match(p, /no other text/i);
});

test('buildPrompt asks for Telugu script for te', () => {
  const p = buildPrompt({ ...baseInput, language: 'te' });
  assert.match(p, /Telugu script/);
  assert.match(p, /బాహుబలి/);
});

test('buildPrompt uses the requested count', () => {
  const p = buildPrompt({ ...baseInput, count: 12 });
  assert.match(p, /exactly 12 items/);
});

// ---------- sanitizer ----------

test('sanitizeWords passes through a valid JSON array', () => {
  assert.deepEqual(
    sanitizeWords('["Baahubali", "Pushpa", "Eega"]'),
    ['Baahubali', 'Pushpa', 'Eega'],
  );
});

test('sanitizeWords extracts arrays wrapped in markdown code fences', () => {
  const raw = 'Here you go:\n```json\n["Alpha", "Beta"]\n```\nEnjoy!';
  assert.deepEqual(sanitizeWords(raw), ['Alpha', 'Beta']);
});

test('sanitizeWords removes duplicates case-insensitively', () => {
  assert.deepEqual(sanitizeWords('["Virat", "virat", "VIRAT", "Rohit"]'), [
    'Virat',
    'Rohit',
  ]);
});

test('sanitizeWords drops non-strings, empties and over-long items', () => {
  const long = 'x'.repeat(101);
  const raw = JSON.stringify(['ok', 42, null, '', '   ', long, { a: 1 }, 'fine']);
  assert.deepEqual(sanitizeWords(raw), ['ok', 'fine']);
});

test('sanitizeWords trims and collapses inner whitespace', () => {
  assert.deepEqual(sanitizeWords('["  Sachin   Tendulkar  "]'), [
    'Sachin Tendulkar',
  ]);
});

test('sanitizeWords caps the list at 40 items', () => {
  const many = Array.from({ length: 60 }, (_, i) => `Item ${i}`);
  const out = sanitizeWords(JSON.stringify(many));
  assert.equal(out.length, MAX_COUNT);
  assert.equal(out[0], 'Item 0');
});

test('sanitizeWords returns [] for garbage and empty input', () => {
  assert.deepEqual(sanitizeWords(''), []);
  assert.deepEqual(sanitizeWords('not json at all'), []);
  assert.deepEqual(sanitizeWords('{"a": 1}'), []);
  assert.deepEqual(sanitizeWords('[1, 2, 3]'), []);
});

// ---------- validation ----------

test('validateGenerateInput accepts a valid body', () => {
  const r = validateGenerateInput({
    category: 'basketball players',
    language: 'hi',
    difficulty: 'hard',
  });
  assert.equal(r.ok, true);
  if (r.ok) {
    assert.equal(r.value.category, 'basketball players');
    assert.equal(r.value.count, DEFAULT_COUNT);
  }
});

test('validateGenerateInput rejects bad input', () => {
  assert.equal(validateGenerateInput(null).ok, false);
  assert.equal(
    validateGenerateInput({ category: 'x', language: 'en', difficulty: 'easy' }).ok,
    false,
  );
  assert.equal(
    validateGenerateInput({ category: 'a'.repeat(61), language: 'en', difficulty: 'easy' }).ok,
    false,
  );
  assert.equal(
    validateGenerateInput({ category: 'movies', language: 'fr', difficulty: 'easy' }).ok,
    false,
  );
  assert.equal(
    validateGenerateInput({ category: 'movies', language: 'en', difficulty: 'extreme' }).ok,
    false,
  );
  assert.equal(
    validateGenerateInput({ category: 'movies', language: 'en', difficulty: 'easy', count: 2.5 }).ok,
    false,
  );
});

test('validateGenerateInput strips control chars and clamps count', () => {
  const r = validateGenerateInput({
    category: 'ab\x00\x1fcd',
    language: 'en',
    difficulty: 'very-hard',
    count: 999,
  });
  assert.equal(r.ok, true);
  if (r.ok) {
    assert.equal(r.value.category, 'abcd');
    assert.equal(r.value.count, MAX_COUNT);
  }
});

// ---------- rate limiter ----------

test('createRateLimiter allows N hits then blocks, window expiry re-allows', () => {
  const limiter = createRateLimiter(3, 1000);
  const t0 = 1_000_000;
  assert.equal(limiter.check('ip', t0), true);
  assert.equal(limiter.check('ip', t0 + 10), true);
  assert.equal(limiter.check('ip', t0 + 20), true);
  assert.equal(limiter.check('ip', t0 + 30), false);
  // Other keys unaffected.
  assert.equal(limiter.check('other', t0 + 40), true);
  // After the window slides past, quota returns.
  assert.equal(limiter.check('ip', t0 + 1001), true);
});

// ---------- generateWords (fetch mocked) ----------

function mockFetch(responseText: string, ok = true): FetchLike {
  return async () => ({
    ok,
    text: async () => responseText,
  });
}

test('generateWords returns the sanitized list on success', async () => {
  const words = await generateWords(
    baseInput,
    mockFetch('["Alpha", "alpha", "Beta"]'),
  );
  assert.deepEqual(words, ['Alpha', 'Beta']);
});

test('generateWords returns [] when the LLM call fails', async () => {
  assert.deepEqual(
    await generateWords(baseInput, mockFetch('boom', false)),
    [],
  );
  assert.deepEqual(
    await generateWords(baseInput, mockFetch('not json {{{')),
    [],
  );
  const throwing: FetchLike = async () => {
    throw new Error('network down');
  };
  assert.deepEqual(await generateWords(baseInput, throwing), []);
});

test('generateWords posts a JSON body with messages and model', async () => {
  let seenUrl = '';
  let seenBody = '';
  const spy: FetchLike = async (url, init) => {
    seenUrl = url;
    seenBody = init?.body ?? '';
    return { ok: true, text: async () => '["x"]' };
  };
  await generateWords(baseInput, spy);
  assert.equal(seenUrl, 'https://text.pollinations.ai/');
  const body = JSON.parse(seenBody) as {
    model: string;
    messages: { role: string; content: string }[];
  };
  assert.equal(body.model, 'openai');
  assert.equal(body.messages.length, 1);
  assert.match(body.messages[0]?.content ?? '', /cricketers/);
});

// ---------- express handler ----------

class FakeRes {
  statusCode = 200;
  payload: unknown = undefined;
  status(code: number): this {
    this.statusCode = code;
    return this;
  }
  json(data: unknown): this {
    this.payload = data;
    return this;
  }
}

function fakeReq(body: unknown, ip = '9.9.9.9'): Request {
  return { body, ip } as unknown as Request;
}

function fakeRes(): FakeRes & Response {
  return new FakeRes() as unknown as FakeRes & Response;
}

test('handler returns 200 with cleaned words on success', async () => {
  const handler = charadesGenerateHandler({
    fetchImpl: mockFetch('["Virat Kohli", "virat kohli", "MS Dhoni"]'),
  });
  const req = fakeReq({ category: 'cricketers', language: 'en', difficulty: 'easy' });
  const res = fakeRes();
  await handler(req, res);
  assert.equal(res.statusCode, 200);
  assert.deepEqual((res.payload as { words: string[] }).words, [
    'Virat Kohli',
    'MS Dhoni',
  ]);
});

test('handler returns 503 with the friendly message when generation fails', async () => {
  const handler = charadesGenerateHandler({
    fetchImpl: mockFetch('sorry, no json here'),
  });
  const req = fakeReq({ category: 'cricketers', language: 'en', difficulty: 'easy' });
  const res = fakeRes();
  await handler(req, res);
  assert.equal(res.statusCode, 503);
  assert.equal(
    (res.payload as { error: string }).error,
    'generation failed, try again or pick a preset category',
  );
});

test('handler returns 400 for invalid input', async () => {
  const handler = charadesGenerateHandler({ fetchImpl: mockFetch('["a"]') });
  const req = fakeReq({ category: 'x', language: 'en', difficulty: 'easy' });
  const res = fakeRes();
  await handler(req, res);
  assert.equal(res.statusCode, 400);
  assert.match((res.payload as { error: string }).error, /2-60/);
});

test('handler returns 429 after the rate limit trips', async () => {
  const handler = charadesGenerateHandler({
    fetchImpl: mockFetch('["a", "b"]'),
    limiter: createRateLimiter(2, 60_000),
  });
  const ip = '1.1.1.1';
  for (let i = 0; i < 2; i++) {
    const res = fakeRes();
    await handler(fakeReq({ category: 'cats', language: 'en', difficulty: 'easy' }, ip), res);
    assert.equal(res.statusCode, 200);
  }
  const blocked = fakeRes();
  await handler(fakeReq({ category: 'cats', language: 'en', difficulty: 'easy' }, ip), blocked);
  assert.equal(blocked.statusCode, 429);
});
