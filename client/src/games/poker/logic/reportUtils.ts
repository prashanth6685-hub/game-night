// Persistent match-history helpers for private poker rooms.
// Every report the client participated in is cached in localStorage under
// 'poker-reports', keyed by room code: { code, savedAt, report } entries.
// The per-client list comes ONLY from localStorage (the server exposes no
// list endpoint). Room-code lookup hits the server first (authoritative,
// works on any device — the server keeps reports 30 days) and falls back
// to the local entry.
// Pure functions + an injectable storage backend so this stays testable
// under node's test runner (no localStorage there).

import type { PokerReport, PokerReportPlayer } from './pokerRooms.ts';

export const REPORT_STORE_KEY = 'poker-reports';

export interface SavedReportEntry {
  code: string;
  savedAt: string;
  report: PokerReport;
}

/** Minimal storage surface; localStorage satisfies it in the browser. */
export interface ReportStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

function normalizeCode(code: string): string {
  return code.trim().toUpperCase();
}

function parseStore(raw: string | null): SavedReportEntry[] {
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr)) return [];
    return arr.filter(
      (e): e is SavedReportEntry =>
        typeof e === 'object' &&
        e !== null &&
        typeof (e as SavedReportEntry).code === 'string' &&
        typeof (e as SavedReportEntry).report === 'object' &&
        (e as SavedReportEntry).report !== null,
    );
  } catch {
    return [];
  }
}

/** Newest first. */
export function listReports(store: ReportStorage): SavedReportEntry[] {
  return parseStore(store.getItem(REPORT_STORE_KEY)).sort((a, b) =>
    b.savedAt.localeCompare(a.savedAt),
  );
}

export function getReportEntry(
  code: string,
  store: ReportStorage,
): SavedReportEntry | null {
  const want = normalizeCode(code);
  for (const e of parseStore(store.getItem(REPORT_STORE_KEY))) {
    if (normalizeCode(e.code) === want) return e;
  }
  return null;
}

/** Insert or replace the entry for this room code. Returns the new list. */
export function saveReportEntry(
  code: string,
  report: PokerReport,
  store: ReportStorage,
): SavedReportEntry[] {
  const want = normalizeCode(code);
  const entry: SavedReportEntry = {
    code: want,
    savedAt: new Date().toISOString(),
    report,
  };
  const rest = parseStore(store.getItem(REPORT_STORE_KEY)).filter(
    (e) => normalizeCode(e.code) !== want,
  );
  const next = [entry, ...rest].slice(0, 100);
  try {
    store.setItem(REPORT_STORE_KEY, JSON.stringify(next));
  } catch {
    // storage full / private mode — the in-memory list still returns
  }
  return next;
}

export function deleteReportEntry(
  code: string,
  store: ReportStorage,
): SavedReportEntry[] {
  const want = normalizeCode(code);
  const next = parseStore(store.getItem(REPORT_STORE_KEY)).filter(
    (e) => normalizeCode(e.code) !== want,
  );
  try {
    store.setItem(REPORT_STORE_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
  return next;
}

// ------------------------------------------------- browser convenience ----

function browserStore(): ReportStorage | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    return localStorage;
  } catch {
    return null;
  }
}

/** Save a report the client participated in. No-op outside a browser. */
export function saveReport(code: string, report: PokerReport): void {
  const store = browserStore();
  if (store) saveReportEntry(code, report, store);
}

export function listSavedReports(): SavedReportEntry[] {
  const store = browserStore();
  return store ? listReports(store) : [];
}

export function getLocalReport(code: string): SavedReportEntry | null {
  const store = browserStore();
  return store ? getReportEntry(code, store) : null;
}

// ------------------------------------------------------- report math ------

/** Players sorted by net, descending. Does not mutate the input. */
export function playersByNet(
  players: readonly PokerReportPlayer[],
): PokerReportPlayer[] {
  return [...players].sort((a, b) => b.net - a.net);
}

/** Total rebuy chips for a player (the server reports an amount, not a count). */
export function totalRebuyAmount(p: PokerReportPlayer): number {
  return p.rebuys;
}

export function totalInvested(p: PokerReportPlayer): number {
  return p.initialBuyIn + p.rebuys;
}

export function topWinnerName(report: PokerReport): string | null {
  return report.topWinner?.name ?? null;
}

export function biggestLossName(report: PokerReport): string | null {
  return report.biggestLoss?.name ?? null;
}

export function netLabel(net: number): string {
  if (net > 0) return `+${net}`;
  if (net < 0) return `${net}`;
  return '±0';
}

export function formatDuration(totalSec: number): string {
  const s = Math.max(0, Math.floor(totalSec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${sec}s`;
  return `${sec}s`;
}

/** Accepts the server's ms-epoch timestamps (or ISO strings, defensively). */
export function formatDateTime(ts: number | string | undefined | null): string {
  if (ts === undefined || ts === null || ts === '') return '';
  const d = typeof ts === 'number' ? new Date(ts) : new Date(ts);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString();
}

/** Human-readable one-line summary of the server's `totals` field,
 *  whatever shape it arrives in. */
export function totalsLabel(totals: unknown): string {
  if (typeof totals === 'number') return String(totals);
  if (typeof totals === 'object' && totals !== null) {
    const t = totals as Record<string, unknown>;
    const parts: string[] = [];
    for (const k of ['buyIns', 'rebuys', 'final']) {
      const v = t[k];
      if (typeof v === 'number') parts.push(`${k}: ${v}`);
    }
    if (parts.length > 0) return parts.join(' · ');
    const nums = Object.values(t).filter(
      (v): v is number => typeof v === 'number',
    );
    if (nums.length > 0) return String(nums.reduce((a, b) => a + b, 0));
  }
  return '—';
}

/** Plain-text summary for the "Copy summary" button. */
export function reportSummaryText(report: PokerReport): string {
  const lines: string[] = [];
  lines.push(`🃏 ${report.roomName} (${report.code})`);
  lines.push(
    `Duration ${formatDuration(report.durationSec)} · ${report.handsPlayed} hands · ${
      report.balanced ? '✓ Balanced' : '⚠ Unbalanced'
    }`,
  );
  lines.push('');
  const top = topWinnerName(report);
  const worst = biggestLossName(report);
  for (const p of playersByNet(report.players)) {
    const flag = top === p.name ? ' 🏆' : worst === p.name ? ' 📉' : '';
    lines.push(
      `${p.name}: ${netLabel(p.net)} (in ${totalInvested(p)}, won ${p.handsWon}/${p.handsPlayed})${flag}`,
    );
  }
  return lines.join('\n');
}
