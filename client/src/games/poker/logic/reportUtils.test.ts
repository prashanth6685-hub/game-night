// Tests for games/poker/logic/reportUtils.ts
// Run: node --test client/src/games/poker/logic/reportUtils.test.ts (from repo root)
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  biggestLossName,
  deleteReportEntry,
  formatDateTime,
  formatDuration,
  getReportEntry,
  listReports,
  netLabel,
  playersByNet,
  reportSummaryText,
  saveReportEntry,
  topWinnerName,
  totalInvested,
  totalRebuyAmount,
  totalsLabel,
} from './reportUtils.ts';
import type { ReportStorage, SavedReportEntry } from './reportUtils.ts';
import type { PokerReport, PokerReportPlayer } from './pokerRooms.ts';

function memStore(): ReportStorage {
  const map = new Map<string, string>();
  return {
    getItem: (k) => (map.has(k) ? (map.get(k) as string) : null),
    setItem: (k, v) => {
      map.set(k, v);
    },
    removeItem: (k) => {
      map.delete(k);
    },
  };
}

function player(
  name: string,
  net: number,
  rebuys = 500,
  initialBuyIn = 1000,
): PokerReportPlayer {
  return {
    seat: 0,
    name,
    initialBuyIn,
    rebuys,
    contributed: initialBuyIn + rebuys,
    finalChips: initialBuyIn + rebuys + net,
    net,
    handsPlayed: 10,
    handsWon: 3,
  };
}

function report(code: string): PokerReport {
  return {
    roomName: 'Friday Game',
    code,
    startedAt: 1786722000000,
    endedAt: 1786725725000,
    durationSec: 3725,
    handsPlayed: 24,
    totals: { buyIns: 4000, rebuys: 1000, final: 5000 },
    balanced: true,
    discrepancy: 0,
    players: [player('B', -200), player('A', 800, 0), player('C', 0)],
    topWinner: { seat: 1, name: 'A', net: 800 },
    biggestLoss: { seat: 0, name: 'B', net: -200 },
  };
}

describe('report store (localStorage backend)', () => {
  it('saves and retrieves entries keyed by room code, case-insensitive', () => {
    const store = memStore();
    saveReportEntry('ab12', report('AB12'), store);
    const got = getReportEntry('AB12', store);
    assert.ok(got);
    assert.equal(got.code, 'AB12');
    assert.equal(got.report.roomName, 'Friday Game');
    // lowercase lookup hits the same entry
    assert.ok(getReportEntry('ab12', store));
    assert.equal(getReportEntry('ZZ99', store), null);
  });

  it('re-saving the same code replaces the entry (no duplicates)', () => {
    const store = memStore();
    saveReportEntry('AB12', report('AB12'), store);
    saveReportEntry('ab12', { ...report('AB12'), handsPlayed: 30 }, store);
    const list = listReports(store);
    assert.equal(list.length, 1);
    assert.equal(list[0]?.report.handsPlayed, 30);
  });

  it('lists newest first', () => {
    const store = memStore();
    saveReportEntry('AA', report('AA'), store);
    saveReportEntry('BB', report('BB'), store);
    const list = listReports(store);
    assert.deepEqual(
      list.map((e: SavedReportEntry) => e.code),
      ['BB', 'AA'],
    );
  });

  it('deletes entries by code', () => {
    const store = memStore();
    saveReportEntry('AA', report('AA'), store);
    saveReportEntry('BB', report('BB'), store);
    deleteReportEntry('aa', store);
    assert.equal(listReports(store).length, 1);
    assert.equal(getReportEntry('AA', store), null);
  });

  it('ignores corrupt store contents', () => {
    const store = memStore();
    store.setItem('poker-reports', 'not-json{{{');
    assert.deepEqual(listReports(store), []);
    assert.equal(getReportEntry('AA', store), null);
  });
});

describe('report math helpers', () => {
  it('sorts players by net descending without mutating', () => {
    const ps = [player('B', -200), player('A', 800), player('C', 0)];
    const sorted = playersByNet(ps);
    assert.deepEqual(
      sorted.map((p) => p.name),
      ['A', 'C', 'B'],
    );
    assert.equal(ps[0]?.name, 'B');
  });

  it('totals rebuys and invested chips', () => {
    const p = player('A', 100);
    assert.equal(totalRebuyAmount(p), 500);
    assert.equal(totalInvested(p), 1500);
    assert.equal(totalRebuyAmount(player('Z', 0, 0)), 0);
  });

  it('reads winner/loser names from the report objects', () => {
    const r = report('AB12');
    assert.equal(topWinnerName(r), 'A');
    assert.equal(biggestLossName(r), 'B');
    assert.equal(topWinnerName({ ...r, topWinner: null }), null);
  });

  it('formats net labels', () => {
    assert.equal(netLabel(150), '+150');
    assert.equal(netLabel(-40), '-40');
    assert.equal(netLabel(0), '±0');
  });

  it('formats durations', () => {
    assert.equal(formatDuration(3725), '1h 2m');
    assert.equal(formatDuration(95), '1m 35s');
    assert.equal(formatDuration(7), '7s');
    assert.equal(formatDuration(0), '0s');
  });

  it('formats ms-epoch timestamps', () => {
    const s = formatDateTime(1786722000000);
    assert.ok(s.length > 0);
    assert.equal(formatDateTime(undefined), '');
    assert.equal(formatDateTime(null), '');
  });

  it('summarizes totals in any shape', () => {
    assert.equal(totalsLabel(5000), '5000');
    assert.equal(
      totalsLabel({ buyIns: 4000, rebuys: 1000, final: 5000 }),
      'buyIns: 4000 · rebuys: 1000 · final: 5000',
    );
    assert.equal(totalsLabel(null), '—');
    assert.equal(totalsLabel(undefined), '—');
  });

  it('builds a copy-paste summary text', () => {
    const text = reportSummaryText(report('AB12'));
    assert.ok(text.includes('Friday Game (AB12)'));
    assert.ok(text.includes('✓ Balanced'));
    assert.ok(text.includes('1h 2m'));
    const lines = text.split('\n');
    // ranked by net: A first
    assert.ok(lines.findIndex((l) => l.startsWith('A:')) < lines.findIndex((l) => l.startsWith('B:')));
    assert.ok(text.includes('A: +800'));
    assert.ok(text.includes('🏆'));
    assert.ok(text.includes('B: -200'));
    assert.ok(text.includes('📉'));
    assert.ok(text.includes('C: ±0'));
  });
});
