import { describe, test } from 'node:test';
import assert from 'node:assert';
import {
  generateTicket,
  generateTickets,
  ticketKey,
  columnRange,
} from './ticket.ts';
import type { Ticket } from './ticket.ts';

// Deterministic PRNG (mulberry32) so test runs are reproducible.
function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let z = s;
    z = Math.imul(z ^ (z >>> 15), z | 1);
    z ^= z + Math.imul(z ^ (z >>> 7), z | 61);
    return ((z ^ (z >>> 14)) >>> 0) / 4294967296;
  };
}

function validateTicket(t: Ticket): void {
  assert.strictEqual(t.length, 3, 'ticket has exactly 3 rows');
  const seen = new Set<number>();
  let total = 0;
  for (let r = 0; r < 3; r++) {
    const row = t[r];
    assert.ok(row, `row ${r} exists`);
    assert.strictEqual(row.length, 9, `row ${r} has exactly 9 columns`);
    let rowCount = 0;
    for (let c = 0; c < 9; c++) {
      const v = row[c];
      if (v !== null && v !== undefined) {
        rowCount += 1;
        total += 1;
        assert.ok(!seen.has(v), `no duplicate number ${v}`);
        seen.add(v);
        const { min, max } = columnRange(c);
        assert.ok(
          v >= min && v <= max,
          `number ${v} in col ${c} is within range ${min}-${max}`,
        );
      }
    }
    assert.strictEqual(rowCount, 5, `row ${r} has exactly 5 numbers`);
  }
  assert.strictEqual(total, 15, 'ticket has exactly 15 numbers');
  for (let c = 0; c < 9; c++) {
    const nums: number[] = [];
    for (let r = 0; r < 3; r++) {
      const v = t[r]?.[c];
      if (v !== null && v !== undefined) nums.push(v);
    }
    assert.ok(
      nums.length >= 1 && nums.length <= 3,
      `column ${c} holds 1-3 numbers (got ${nums.length})`,
    );
    for (let i = 1; i < nums.length; i++) {
      assert.ok(
        (nums[i] as number) > (nums[i - 1] as number),
        `column ${c} sorted ascending top-to-bottom`,
      );
    }
  }
}

describe('generateTicket', () => {
  test('200 generated tickets are each valid', () => {
    const rng = mulberry32(12345);
    for (let i = 0; i < 200; i++) {
      validateTicket(generateTicket(rng));
    }
  });

  test('default rng (Math.random) also produces valid tickets', () => {
    for (let i = 0; i < 20; i++) {
      validateTicket(generateTicket());
    }
  });

  test('column ranges are correct', () => {
    assert.deepStrictEqual(columnRange(0), { min: 1, max: 9 });
    assert.deepStrictEqual(columnRange(8), { min: 80, max: 90 });
    assert.deepStrictEqual(columnRange(3), { min: 30, max: 39 });
  });
});

describe('ticketKey', () => {
  test('stable for the same ticket object', () => {
    const t = generateTicket(mulberry32(7));
    assert.strictEqual(ticketKey(t), ticketKey(t));
  });

  test('equal for structurally identical tickets', () => {
    const a = generateTicket(mulberry32(99));
    const b: Ticket = a.map((row) => row.slice());
    assert.strictEqual(ticketKey(a), ticketKey(b));
  });
});

describe('generateTickets', () => {
  test('50 tickets are all unique', () => {
    const tickets = generateTickets(50, mulberry32(2024));
    assert.strictEqual(tickets.length, 50);
    const keys = new Set(tickets.map(ticketKey));
    assert.strictEqual(keys.size, 50, 'all 50 ticket keys are distinct');
    for (const t of tickets) validateTicket(t);
  });

  test('zero tickets returns empty array', () => {
    assert.deepStrictEqual(generateTickets(0), []);
  });
});
