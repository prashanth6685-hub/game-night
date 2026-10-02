// SVG overlay that DRAWs every ladder and snake across the board: a ladder
// is two rails + rungs running from its foot (small square) up to its top
// (big square), and a snake is a wavy body from its head down to its tail.
// Rendered inside .sl-board (position: relative) above the cells, below
// the tokens. Purely visual — game rules live in logic/board.ts.

import { squareToRowCol } from '../logic/board.ts';
import type { BoardSet } from '../logic/board.ts';

interface Pt {
  x: number;
  y: number;
}

function center(n: number): Pt {
  const { row, col } = squareToRowCol(n);
  return { x: col * 10 + 5, y: row * 10 + 5 };
}

function sub(a: Pt, b: Pt): Pt {
  return { x: a.x - b.x, y: a.y - b.y };
}

function len(p: Pt): number {
  return Math.hypot(p.x, p.y);
}

function perp(p: Pt): Pt {
  const l = len(p) || 1;
  return { x: -p.y / l, y: p.x / l };
}

function at(a: Pt, b: Pt, t: number): Pt {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

function add(a: Pt, b: Pt): Pt {
  return { x: a.x + b.x, y: a.y + b.y };
}

function scale(p: Pt, s: number): Pt {
  return { x: p.x * s, y: p.y * s };
}

function LadderShape({ from, to }: { from: number; to: number }) {
  const a = center(from); // foot (small square)
  const b = center(to); // top (big square)
  const dir = sub(b, a);
  const side = scale(perp(dir), 1.7);
  const rungs = Math.max(2, Math.round(len(dir) / 9));
  const rungLines = [];
  for (let i = 1; i <= rungs; i += 1) {
    const t = i / (rungs + 1);
    const c = at(a, b, t);
    rungLines.push(
      <line
        key={i}
        x1={c.x - side.x}
        y1={c.y - side.y}
        x2={c.x + side.x}
        y2={c.y + side.y}
        stroke="#b45309"
        strokeWidth={0.55}
        strokeLinecap="round"
      />,
    );
  }
  return (
    <g aria-hidden>
      <line
        x1={a.x - side.x}
        y1={a.y - side.y}
        x2={b.x - side.x}
        y2={b.y - side.y}
        stroke="#92400e"
        strokeWidth={0.85}
        strokeLinecap="round"
      />
      <line
        x1={a.x + side.x}
        y1={a.y + side.y}
        x2={b.x + side.x}
        y2={b.y + side.y}
        stroke="#92400e"
        strokeWidth={0.85}
        strokeLinecap="round"
      />
      {rungLines}
    </g>
  );
}

function SnakeShape({ from, to }: { from: number; to: number }) {
  const head = center(from);
  const tail = center(to);
  const dir = sub(tail, head);
  const side = perp(dir);
  // Wavy body: sample the line and push points sideways with a sine.
  const pts: Pt[] = [];
  const steps = 14;
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    const wiggle = Math.sin(t * Math.PI * 2.4) * 2.1 * (1 - t * 0.35);
    pts.push(add(at(head, tail, t), scale(side, wiggle)));
  }
  const d = pts
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(' ');
  return (
    <g aria-hidden>
      <path
        d={d}
        fill="none"
        stroke="#16a34a"
        strokeWidth={1.15}
        strokeLinecap="round"
        opacity={0.9}
      />
      <circle cx={head.x} cy={head.y} r={2.1} fill="#15803d" />
      <circle cx={head.x - 0.7} cy={head.y - 0.6} r={0.38} fill="#fff" />
      <circle cx={head.x + 0.7} cy={head.y - 0.6} r={0.38} fill="#fff" />
    </g>
  );
}

export function BoardOverlay({ set }: { set: BoardSet }) {
  return (
    <svg
      className="sl-overlay"
      viewBox="0 0 100 100"
      aria-hidden
      focusable="false"
    >
      {Object.entries(set.ladders).map(([from, to]) => (
        <LadderShape key={`l${from}`} from={Number(from)} to={to} />
      ))}
      {Object.entries(set.snakes).map(([from, to]) => (
        <SnakeShape key={`s${from}`} from={Number(from)} to={to} />
      ))}
    </svg>
  );
}

/** Percent position (for the floating animated token) of a square center. */
export function squareCenterPct(n: number): { left: string; top: string } {
  if (n <= 0) return { left: '5%', top: '95%' };
  const c = center(n);
  return { left: `${c.x}%`, top: `${c.y}%` };
}
