// Shared chess piece glyphs — ONE set for both colors.
//
// The old code rendered white pieces with outline glyphs (♔♕♖♗♘♙) and black
// pieces with the filled variants (♚♛♜♝♞♟). Those are different drawings, so
// the two sides came out at different sizes and weights (very noticeable on
// iOS). Now both colors use the same glyphs and differ only in their CSS
// color treatment (see chess.css: .piece-w / .piece-b).
import type { PieceSymbol } from 'chess.js';

export const PIECE_GLYPHS: Record<PieceSymbol, string> = {
  k: '♚',
  q: '♛',
  r: '♜',
  b: '♝',
  n: '♞',
  p: '♟',
};

/** Color is not part of the lookup anymore — it only affects CSS styling. */
export function glyphFor(type: PieceSymbol): string {
  return PIECE_GLYPHS[type] ?? '';
}
