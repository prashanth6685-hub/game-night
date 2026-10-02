import { describe, test } from 'node:test';
import assert from 'node:assert';
import { generateCard } from './bingo.ts';
import { botClaimDelay, botDaubedCount } from './bot.ts';

describe('botClaimDelay', () => {
  test('stays within 500-2500ms', () => {
    for (let i = 0; i < 200; i += 1) {
      const d = botClaimDelay();
      assert.ok(d >= 500 && d <= 2500, `delay out of range: ${d}`);
    }
  });

  test('is deterministic with an injected rng', () => {
    assert.strictEqual(botClaimDelay(() => 0), 500);
    assert.strictEqual(botClaimDelay(() => 1), 2500);
    assert.strictEqual(botClaimDelay(() => 0.5), 1500);
  });
});

describe('botDaubedCount', () => {
  test('counts FREE as covered with nothing drawn', () => {
    const card = generateCard(() => 0.3);
    assert.strictEqual(botDaubedCount(card, new Set()), 1);
  });

  test('counts every drawn number on the card', () => {
    const card = generateCard(() => 0.3);
    const onCard: number[] = [];
    for (const row of card)
      for (const v of row) if (v !== null) onCard.push(v);
    // Bots daub everything drawn: full coverage = 25 with all numbers drawn.
    assert.strictEqual(botDaubedCount(card, new Set(onCard)), 25);
    // Partial: FREE + the drawn subset present on the card.
    const some = new Set(onCard.slice(0, 7));
    assert.strictEqual(botDaubedCount(card, some), 8);
    // Drawn numbers NOT on the card change nothing.
    assert.strictEqual(botDaubedCount(card, new Set([999])), 1);
  });
});
