// Presentational chess board: renders an 8x8 grid from chess.js board() output.
// All game state lives in the parent (GameScreen); this component only renders
// squares, pieces, highlights and forwards taps.
import type { Color, PieceSymbol, Square } from 'chess.js';
import { PIECE_GLYPHS } from '../pieces.ts';

export interface LegalTarget {
  to: string;
  capture: boolean;
}

export interface LastMove {
  from: string;
  to: string;
}

interface ChessBoardProps {
  board: ({ square: Square; type: PieceSymbol; color: Color } | null)[][];
  orientation: 'w' | 'b';
  selected: string | null;
  targets: LegalTarget[];
  lastMove: LastMove | null;
  /** Square of the king currently in check, or null. */
  checkSquare: string | null;
  disabled: boolean;
  onSquareTap: (square: string) => void;
}

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

export default function ChessBoard({
  board,
  orientation,
  selected,
  targets,
  lastMove,
  checkSquare,
  disabled,
  onSquareTap,
}: ChessBoardProps) {
  const bySquare = new Map<string, { type: PieceSymbol; color: Color }>();
  for (const row of board) {
    for (const cell of row) {
      if (cell) bySquare.set(cell.square, { type: cell.type, color: cell.color });
    }
  }
  const targetMap = new Map<string, boolean>();
  for (const t of targets) targetMap.set(t.to, t.capture);

  // Display order: white orientation shows rank 8 at top, file a at left.
  const displayRanks = orientation === 'w'
    ? [8, 7, 6, 5, 4, 3, 2, 1]
    : [1, 2, 3, 4, 5, 6, 7, 8];
  const displayFiles = orientation === 'w' ? FILES : [...FILES].reverse();

  const squares: Array<{
    square: string;
    piece: { type: PieceSymbol; color: Color } | undefined;
    dark: boolean;
    showRank: boolean;
    showFile: boolean;
    rankLabel: string;
    fileLabel: string;
  }> = [];
  displayRanks.forEach((rank, rowIdx) => {
    displayFiles.forEach((file, colIdx) => {
      const square = `${file}${rank}`;
      const fileIdx = FILES.indexOf(file);
      // a1 is dark: dark when (fileIndex + rankIndex) is even (rankIndex 0-based).
      const dark = (fileIdx + (rank - 1)) % 2 === 0;
      squares.push({
        square,
        piece: bySquare.get(square),
        dark,
        showRank: colIdx === 0,
        showFile: rowIdx === displayRanks.length - 1,
        rankLabel: String(rank),
        fileLabel: file,
      });
    });
  });

  return (
    <div className="chess-board-wrap">
      <div className="chess-board" role="grid" aria-label="Chess board">
        {squares.map((s) => {
          const isSelected = selected === s.square;
          const isLastMove =
            lastMove !== null && (lastMove.from === s.square || lastMove.to === s.square);
          const isCheck = checkSquare === s.square;
          const targetCapture = targetMap.get(s.square);
          const classNames = [
            'chess-square',
            s.dark ? 'sq-dark' : 'sq-light',
            isSelected ? 'sq-selected' : '',
            isLastMove ? 'sq-lastmove' : '',
            isCheck ? 'sq-check' : '',
            targetCapture === true ? 'sq-capture' : '',
          ]
            .filter(Boolean)
            .join(' ');
          // Both colors share one glyph set — only the CSS class differs.
          const glyph = s.piece ? PIECE_GLYPHS[s.piece.type] : null;
          return (
            <button
              key={s.square}
              type="button"
              role="gridcell"
              aria-label={s.square}
              className={classNames}
              disabled={disabled}
              onClick={() => onSquareTap(s.square)}
            >
              {s.showRank && (
                <span className="chess-coord coord-rank">{s.rankLabel}</span>
              )}
              {s.showFile && (
                <span className="chess-coord coord-file">{s.fileLabel}</span>
              )}
              {glyph && (
                <span className={`chess-piece piece-${s.piece?.color}`}>{glyph}</span>
              )}
              {targetMap.has(s.square) && targetCapture !== true && (
                <span className="chess-dot" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
