// Pure mapping from chess.js game state to UI-friendly status.
// No React here — safe to unit-test with node --test.
import type { Chess } from 'chess.js';

export interface ChessStatus {
  /** Side to move. */
  turn: 'w' | 'b';
  inCheck: boolean;
  checkmate: boolean;
  stalemate: boolean;
  /** Any draw condition: stalemate, fifty-move, threefold, insufficient material. */
  draw: boolean;
  gameOver: boolean;
  /**
   * Winner for the results screen: 'white' when black was checkmated,
   * 'black' when white was checkmated, 'draw' on any drawn game, else null.
   */
  resultText: 'white' | 'black' | 'draw' | null;
}

export function getStatus(chess: Chess): ChessStatus {
  const turn = chess.turn();
  const checkmate = chess.isCheckmate();
  const stalemate = chess.isStalemate();
  const draw = chess.isDraw();
  const gameOver = chess.isGameOver();

  let resultText: ChessStatus['resultText'] = null;
  if (checkmate) {
    // turn is the mated side, so the winner is the other side.
    resultText = turn === 'b' ? 'white' : 'black';
  } else if (gameOver && (stalemate || draw)) {
    resultText = 'draw';
  }

  return {
    turn,
    inCheck: chess.isCheck(),
    checkmate,
    stalemate,
    draw,
    gameOver,
    resultText,
  };
}
