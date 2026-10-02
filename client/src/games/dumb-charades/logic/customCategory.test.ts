// Tests for the custom-category client: difficulty mapping only.
// (The fetch call itself is exercised against the real endpoint in manual QA;
// the server side is fully unit-tested in server/src/charades.test.ts.)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toApiDifficulty } from './customCategory.ts';

test('toApiDifficulty maps setup difficulties to API difficulties', () => {
  assert.equal(toApiDifficulty('easy'), 'easy');
  assert.equal(toApiDifficulty('medium'), 'medium');
  assert.equal(toApiDifficulty('hard'), 'hard');
  assert.equal(toApiDifficulty('veryhard'), 'very-hard');
  assert.equal(toApiDifficulty('all'), 'medium');
});
