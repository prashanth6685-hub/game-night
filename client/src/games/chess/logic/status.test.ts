// Unit tests for logic/status.ts using the real chess.js engine.
// Run from the repo root: node --test client/src/games/chess/logic/status.test.ts
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Chess } from 'chess.js';
import { getStatus } from './status.ts';

describe('getStatus', () => {
  it("fool's mate is checkmate, black wins", () => {
    const chess = new Chess();
    chess.move('f3');
    chess.move('e5');
    chess.move('g4');
    chess.move('Qh4#');
    const s = getStatus(chess);
    assert.equal(s.checkmate, true);
    assert.equal(s.gameOver, true);
    assert.equal(s.turn, 'w');
    assert.equal(s.resultText, 'black');
  });

  it('kingside castling succeeds', () => {
    const chess = new Chess('r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w KQkq - 0 1');
    const move = chess.move({ from: 'e1', to: 'g1' });
    assert.equal(move.san, 'O-O');
    const king = chess.get('g1');
    const rook = chess.get('f1');
    assert.deepEqual(king, { type: 'k', color: 'w' });
    assert.deepEqual(rook, { type: 'r', color: 'w' });
  });

  it('en passant capture succeeds', () => {
    const chess = new Chess(
      'rnbqkbnr/ppp1pppp/8/3pP3/8/8/PPPP1PPP/RNBQKBNR w KQkq d6 0 3',
    );
    const move = chess.move({ from: 'e5', to: 'd6' });
    assert.equal(move.san, 'exd6');
    assert.deepEqual(chess.get('d6'), { type: 'p', color: 'w' });
    assert.equal(chess.get('d5'), undefined);
  });

  it('promotion to queen lands a white queen on a8', () => {
    const chess = new Chess('8/P7/8/8/8/8/k6K/8 w - - 0 1');
    chess.move({ from: 'a7', to: 'a8', promotion: 'q' });
    const rows = chess.board();
    const a8 = rows[0]?.[0];
    assert.ok(a8, 'a8 should hold a piece');
    assert.equal(a8.square, 'a8');
    assert.equal(a8.type, 'q');
    assert.equal(a8.color, 'w');
  });

  it('stalemate is a draw', () => {
    const chess = new Chess('k7/8/1QK5/8/8/8/8/8 b - - 0 1');
    const s = getStatus(chess);
    assert.equal(s.stalemate, true);
    assert.equal(s.gameOver, true);
    assert.equal(s.resultText, 'draw');
  });

  it('king vs king+bishop is a draw (insufficient material)', () => {
    const chess = new Chess('k7/8/8/8/8/8/8/KB6 w - - 0 1');
    const s = getStatus(chess);
    assert.equal(chess.isInsufficientMaterial(), true);
    assert.equal(s.draw, true);
    assert.equal(s.gameOver, true);
    assert.equal(s.resultText, 'draw');
  });

  it('threefold repetition is detected', () => {
    const chess = new Chess();
    for (let i = 0; i < 2; i++) {
      chess.move('Nf3');
      chess.move('Nf6');
      chess.move('Ng1');
      chess.move('Ng8');
    }
    assert.equal(chess.isThreefoldRepetition(), true);
    const s = getStatus(chess);
    assert.equal(s.draw, true);
    assert.equal(s.gameOver, true);
    assert.equal(s.resultText, 'draw');
  });

  it('initial position is not over, white to move, no check', () => {
    const chess = new Chess();
    const s = getStatus(chess);
    assert.equal(s.gameOver, false);
    assert.equal(s.turn, 'w');
    assert.equal(s.inCheck, false);
    assert.equal(s.checkmate, false);
    assert.equal(s.resultText, null);
  });
});
