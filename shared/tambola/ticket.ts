// Tambola (Housie) ticket generation.
//
// A ticket is 3 rows × 9 columns with exactly 15 numbers, 5 per row.
// Column c may only hold numbers from its range:
//   col 0 → 1–9, col 8 → 80–90, otherwise col c → c*10 .. c*10+9.
// Each column holds 1–3 numbers, sorted ascending top-to-bottom, no repeats.
//
// Generation algorithm:
//   (a) Column counts: every column starts at 1 (9 numbers placed), then 6
//       more cells are distributed by bumping random columns, capped at 3
//       per column. Total = 15.
//   (b) Row placement: columns are processed in random order and each
//       column's k cells go into the k currently least-filled rows (stable
//       sort keeps the random order for ties, so ties break randomly).
//       Then repair: while some row is overfull (>5) and another is
//       underfull (<5), move one cell from the overfull row to the underfull
//       row inside a column that occupies the overfull row but not the
//       underfull one. Such a column always exists: the overfull row spans
//       ≥6 distinct columns, the underfull row spans ≤4, so at least 2
//       columns cover the overfull row only. Each move reduces the total
//       imbalance Σ|rowTotal − 5| by exactly 2, so this terminates with all
//       rows at exactly 5.
//   (c) Number fill: for each column, draw `count` distinct numbers from its
//       range (partial Fisher–Yates on the range pool), sort them ascending,
//       and place them top-to-bottom into the rows holding a cell.

export type Ticket = (number | null)[][]; // 3 rows × 9 cols

function randInt(rng: () => number, n: number): number {
  return Math.floor(rng() * n);
}

function shuffled<T>(arr: T[], rng: () => number): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = randInt(rng, i + 1);
    const tmp = a[i]!;
    a[i] = a[j]!;
    a[j] = tmp;
  }
  return a;
}

/** Inclusive number range for a ticket column. */
export function columnRange(col: number): { min: number; max: number } {
  if (col === 0) return { min: 1, max: 9 };
  if (col === 8) return { min: 80, max: 90 };
  return { min: col * 10, max: col * 10 + 9 };
}

export function generateTicket(rng: () => number = Math.random): Ticket {
  // (a) Column counts: start all at 1, distribute 6 more with cap 3.
  const colCounts: number[] = [1, 1, 1, 1, 1, 1, 1, 1, 1];
  let placed = 9;
  while (placed < 15) {
    const c = randInt(rng, 9);
    const cur = colCounts[c];
    if (cur !== undefined && cur < 3) {
      colCounts[c] = cur + 1;
      placed += 1;
    }
  }

  // (b) Place each column's cells into rows so every row totals exactly 5.
  const cellInRow: boolean[][] = [];
  for (let c = 0; c < 9; c++) cellInRow.push([false, false, false]);
  const rowTotals = [0, 0, 0];

  for (const c of shuffled([0, 1, 2, 3, 4, 5, 6, 7, 8], rng)) {
    const k = colCounts[c] ?? 1;
    // Stable sort on a shuffled array => random tie-break among equal totals.
    const rows = shuffled([0, 1, 2], rng).sort(
      (a, b) => (rowTotals[a] ?? 0) - (rowTotals[b] ?? 0),
    );
    for (let i = 0; i < k; i++) {
      const r = rows[i] ?? 0;
      const colCells = cellInRow[c];
      if (colCells) colCells[r] = true;
      rowTotals[r] = (rowTotals[r] ?? 0) + 1;
    }
  }

  // Repair any residual imbalance (see algorithm comment above).
  for (;;) {
    const over = rowTotals.findIndex((v) => v > 5);
    const under = rowTotals.findIndex((v) => v < 5);
    if (over === -1 || under === -1) break;
    let moved = false;
    for (let c = 0; c < 9 && !moved; c++) {
      const colCells = cellInRow[c];
      if (colCells && (colCells[over] ?? false) && !(colCells[under] ?? false)) {
        colCells[over] = false;
        colCells[under] = true;
        rowTotals[over] = (rowTotals[over] ?? 0) - 1;
        rowTotals[under] = (rowTotals[under] ?? 0) + 1;
        moved = true;
      }
    }
    if (!moved) break; // unreachable by the proof above; never hang
  }

  // (c) Sample distinct numbers per column, sort, fill top-to-bottom.
  const ticket: Ticket = [];
  for (let r = 0; r < 3; r++) {
    const row: (number | null)[] = [];
    for (let c = 0; c < 9; c++) row.push(null);
    ticket.push(row);
  }

  for (let c = 0; c < 9; c++) {
    const k = colCounts[c] ?? 1;
    const { min, max } = columnRange(c);
    const pool: number[] = [];
    for (let n = min; n <= max; n++) pool.push(n);
    // Partial Fisher–Yates: draw k distinct numbers.
    const drawn: number[] = [];
    for (let i = 0; i < k; i++) {
      const j = i + randInt(rng, pool.length - i);
      const tmp = pool[i]!;
      pool[i] = pool[j]!;
      pool[j] = tmp;
      drawn.push(pool[i]!);
    }
    drawn.sort((x, y) => x - y);
    let d = 0;
    const colCells = cellInRow[c] ?? [false, false, false];
    for (let r = 0; r < 3; r++) {
      if (colCells[r] ?? false) {
        const row = ticket[r];
        const v = drawn[d];
        if (row && v !== undefined) {
          row[c] = v;
          d += 1;
        }
      }
    }
  }

  return ticket;
}

/** Canonical string form of a ticket, for uniqueness checks. */
export function ticketKey(t: Ticket): string {
  return t
    .map((row) => row.map((cell) => (cell === null ? '' : String(cell))).join(','))
    .join('|');
}

/** Generate `n` pairwise-unique tickets. */
export function generateTickets(n: number, rng: () => number = Math.random): Ticket[] {
  const seen = new Set<string>();
  const out: Ticket[] = [];
  let guard = 0;
  while (out.length < n && guard < n * 1000 + 100) {
    guard += 1;
    const t = generateTicket(rng);
    const key = ticketKey(t);
    if (!seen.has(key)) {
      seen.add(key);
      out.push(t);
    }
  }
  return out;
}
