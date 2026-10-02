import { describe, test } from 'node:test';
import assert from 'node:assert';
import {
  EXAMPLE_NAMES,
  randomExampleName,
  randomExampleNames,
} from './names.ts';

describe('randomExampleName', () => {
  test('returns only names from the approved list', () => {
    for (let i = 0; i < 50; i += 1) {
      const name = randomExampleName();
      assert.ok(
        (EXAMPLE_NAMES as readonly string[]).includes(name),
        `unexpected name: ${name}`,
      );
    }
  });

  test('is deterministic with an injected rng', () => {
    assert.equal(randomExampleName(() => 0), 'Chintu');
    assert.equal(randomExampleName(() => 0.999), 'Ganga');
  });

  test('covers all six names over many draws', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 200; i += 1) seen.add(randomExampleName());
    assert.equal(seen.size, 6);
  });
});

describe('randomExampleNames', () => {
  test('returns N distinct names', () => {
    const names = randomExampleNames(4);
    assert.equal(names.length, 4);
    assert.equal(new Set(names).size, 4);
    for (const n of names) {
      assert.ok((EXAMPLE_NAMES as readonly string[]).includes(n));
    }
  });

  test('caps at the list size', () => {
    assert.equal(randomExampleNames(99).length, 6);
  });
});
