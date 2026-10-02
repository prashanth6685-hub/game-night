// Chess game screen: setup phase (player names) -> play phase (board + panel).
// The mutable chess.js engine lives in a ref; `version` state forces re-renders.
import { useEffect, useRef, useState } from 'react';
import { Chess } from 'chess.js';
import type { Color, Move, PieceSymbol, Square } from 'chess.js';
import { useI18n } from '../../../i18n/index.ts';
import type { GameResult, GameScreenProps } from '../../types.ts';
import { Button, Card, Modal, ConfirmDialog } from '../../../shared/ui/index.ts';
import { playSound } from '../../../shared/sound.ts';
import { track } from '../../../shared/analytics.ts';
import { getStatus, type ChessStatus } from '../logic/status.ts';
import ChessBoard, { type LegalTarget } from './ChessBoard.tsx';
import './chess.css';

type Phase = 'setup' | 'play';
type PromotionPiece = 'q' | 'r' | 'b' | 'n';

const PROMOTION_PIECES: PromotionPiece[] = ['q', 'r', 'b', 'n'];

const START_COUNT: Record<PieceSymbol, number> = {
  p: 8,
  n: 2,
  b: 2,
  r: 2,
  q: 1,
  k: 1,
};
// Strongest-first display order for captured pieces.
const CAPTURE_ORDER: PieceSymbol[] = ['q', 'r', 'b', 'n', 'p'];

function glyphFor(color: Color, type: PieceSymbol): string {
  const glyphs: Record<string, string> = {
    wk: '♔',
    wq: '♕',
    wr: '♖',
    wb: '♗',
    wn: '♘',
    wp: '♙',
    bk: '♚',
    bq: '♛',
    br: '♜',
    bb: '♝',
    bn: '♞',
    bp: '♟',
  };
  return glyphs[`${color}${type}`] ?? '';
}

export default function GameScreen({ onFinish }: GameScreenProps) {
  const { t } = useI18n();
  const chessRef = useRef<Chess | null>(null);
  const finishTimer = useRef<number | null>(null);
  const moveListRef = useRef<HTMLDivElement | null>(null);

  const [phase, setPhase] = useState<Phase>('setup');
  const [whiteNameInput, setWhiteNameInput] = useState('');
  const [blackNameInput, setBlackNameInput] = useState('');
  const [version, setVersion] = useState(0);
  const [orientation, setOrientation] = useState<'w' | 'b'>('w');
  const [selected, setSelected] = useState<string | null>(null);
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null);
  const [pendingPromo, setPendingPromo] = useState<{
    from: string;
    to: string;
    color: Color;
  } | null>(null);
  const [finished, setFinished] = useState(false);
  const [resignOpen, setResignOpen] = useState(false);
  const [newGameOpen, setNewGameOpen] = useState(false);

  useEffect(() => {
    return () => {
      if (finishTimer.current !== null) window.clearTimeout(finishTimer.current);
    };
  }, []);

  // Keep the move list pinned to the latest move.
  useEffect(() => {
    const el = moveListRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [version]);

  const refresh = (): void => setVersion((v) => v + 1);

  const chess = chessRef.current;
  const status: ChessStatus | null = chess ? getStatus(chess) : null;

  const whiteName = whiteNameInput.trim() || t('chess.player1');
  const blackName = blackNameInput.trim() || t('chess.player2');

  const legalTargets = (from: string): LegalTarget[] => {
    const c = chessRef.current;
    if (!c) return [];
    return c
      .moves({ square: from as Square, verbose: true })
      .map((m) => ({
        to: m.to,
        capture: m.flags.includes('c') || m.flags.includes('e'),
      }));
  };

  const drawReason = (c: Chess, s: ChessStatus): string => {
    if (s.stalemate) return t('chess.stalemate');
    if (c.isInsufficientMaterial()) return t('chess.insufficient');
    if (c.isThreefoldRepetition()) return t('chess.threefold');
    if (c.isDrawByFiftyMoves()) return t('chess.fiftyMove');
    return t('chess.draw');
  };

  const checkGameOver = (c: Chess): void => {
    const s = getStatus(c);
    if (!s.gameOver || finished) return;
    setFinished(true);
    playSound('win');
    const winnerName =
      s.resultText === 'white'
        ? whiteName
        : s.resultText === 'black'
          ? blackName
          : null;
    const reason = s.checkmate ? t('chess.checkmate') : drawReason(c, s);
    const result: GameResult = {
      title: winnerName
        ? t('chess.youWin').replace('{name}', winnerName)
        : t('chess.gameDraw'),
      lines: [
        { label: t('chess.result'), value: reason },
        { label: t('chess.moves'), value: String(c.history().length) },
      ],
    };
    if (winnerName) result.winner = winnerName;
    finishTimer.current = window.setTimeout(() => {
      onFinish(result);
    }, 1200);
  };

  const doMove = (from: string, to: string, promotion?: PromotionPiece): void => {
    const c = chessRef.current;
    if (!c || finished) return;
    try {
      const m: Move = c.move({ from, to, promotion });
      setSelected(null);
      setLastMove({ from: m.from, to: m.to });
      playSound('move');
      refresh();
      checkGameOver(c);
    } catch {
      setSelected(null);
    }
  };

  const onSquareTap = (square: string): void => {
    const c = chessRef.current;
    if (!c || finished || pendingPromo) return;
    if (selected && square !== selected) {
      const target = legalTargets(selected).find((tgt) => tgt.to === square);
      if (target) {
        const moving = c.get(selected as Square);
        const destRank = square[1];
        const needsPromotion =
          moving?.type === 'p' &&
          ((moving.color === 'w' && destRank === '8') ||
            (moving.color === 'b' && destRank === '1'));
        if (needsPromotion && moving) {
          playSound('click');
          setPendingPromo({ from: selected, to: square, color: moving.color });
          return;
        }
        doMove(selected, square);
        return;
      }
    }
    if (square === selected) {
      setSelected(null);
      return;
    }
    const piece = c.get(square as Square);
    if (piece && piece.color === c.turn()) {
      playSound('click');
      setSelected(square);
    } else {
      setSelected(null);
    }
  };

  const choosePromotion = (piece: PromotionPiece): void => {
    const p = pendingPromo;
    setPendingPromo(null);
    if (p) doMove(p.from, p.to, piece);
  };

  const startGame = (): void => {
    if (finishTimer.current !== null) {
      window.clearTimeout(finishTimer.current);
      finishTimer.current = null;
    }
    chessRef.current = new Chess();
    setFinished(false);
    setSelected(null);
    setLastMove(null);
    setPendingPromo(null);
    setOrientation('w');
    setResignOpen(false);
    setNewGameOpen(false);
    setPhase('play');
    track('game_started', { game: 'chess' });
    refresh();
  };

  const undoMove = (): void => {
    const c = chessRef.current;
    if (!c || finished) return;
    const undone = c.undo();
    if (undone) {
      playSound('click');
      setSelected(null);
      const h = c.history({ verbose: true });
      const last = h[h.length - 1];
      setLastMove(last ? { from: last.from, to: last.to } : null);
      refresh();
    }
  };

  const resign = (): void => {
    const c = chessRef.current;
    if (!c || finished) return;
    if (finishTimer.current !== null) window.clearTimeout(finishTimer.current);
    setFinished(true);
    setResignOpen(false);
    const winnerName = c.turn() === 'w' ? blackName : whiteName;
    onFinish({
      title: t('chess.youWin').replace('{name}', winnerName),
      winner: winnerName,
      lines: [{ label: t('chess.result'), value: t('chess.resign') }],
    });
  };

  /** Pieces of the opponent that `color` has captured, strongest first. */
  const capturedBy = (color: Color): PieceSymbol[] => {
    const c = chessRef.current;
    if (!c) return [];
    const onBoard: Record<PieceSymbol, number> = {
      p: 0,
      n: 0,
      b: 0,
      r: 0,
      q: 0,
      k: 0,
    };
    for (const row of c.board()) {
      for (const cell of row) {
        if (cell && cell.color !== color) onBoard[cell.type] += 1;
      }
    }
    const out: PieceSymbol[] = [];
    for (const type of CAPTURE_ORDER) {
      const missing = START_COUNT[type] - onBoard[type];
      for (let i = 0; i < missing; i++) out.push(type);
    }
    return out;
  };

  const kingInCheckSquare = (): string | null => {
    const c = chessRef.current;
    if (!c || !status || !status.inCheck) return null;
    for (const row of c.board()) {
      for (const cell of row) {
        if (cell && cell.type === 'k' && cell.color === status.turn) {
          return cell.square;
        }
      }
    }
    return null;
  };

  if (phase === 'setup' || !chess || !status) {
    return (
      <Card title={t('chess.setupTitle')}>
        <div className="chess-setup">
          <label>
            {t('chess.whiteName')}
            <input
              value={whiteNameInput}
              onChange={(e) => setWhiteNameInput(e.target.value)}
              placeholder={t('chess.player1')}
              maxLength={24}
              autoComplete="off"
            />
          </label>
          <label>
            {t('chess.blackName')}
            <input
              value={blackNameInput}
              onChange={(e) => setBlackNameInput(e.target.value)}
              placeholder={t('chess.player2')}
              maxLength={24}
              autoComplete="off"
            />
          </label>
          <Button variant="primary" size="lg" fullWidth onClick={startGame}>
            {t('chess.startGame')}
          </Button>
        </div>
      </Card>
    );
  }

  const turnName = status.turn === 'w' ? whiteName : blackName;
  const history = chess.history();
  const pairs: Array<{ num: number; white: string; black?: string }> = [];
  for (let i = 0; i < history.length; i += 2) {
    pairs.push({ num: i / 2 + 1, white: history[i] ?? '', black: history[i + 1] });
  }
  const whiteCaptured = capturedBy('w');
  const blackCaptured = capturedBy('b');

  const bannerTitle =
    status.resultText === 'white'
      ? t('chess.youWin').replace('{name}', whiteName)
      : status.resultText === 'black'
        ? t('chess.youWin').replace('{name}', blackName)
        : t('chess.gameDraw');

  return (
    <div className="chess-game">
      <ChessBoard
        board={chess.board()}
        orientation={orientation}
        selected={selected}
        targets={selected ? legalTargets(selected) : []}
        lastMove={lastMove}
        checkSquare={kingInCheckSquare()}
        disabled={finished}
        onSquareTap={onSquareTap}
      />

      <div className="chess-panel">
        {finished && status.gameOver ? (
          <div className="chess-result-banner">{bannerTitle}</div>
        ) : (
          <div className="chess-turn">
            <span className={`turn-dot ${status.turn}`} />
            <span>
              {status.turn === 'w' ? t('chess.whiteToMove') : t('chess.blackToMove')}
              {' — '}
              {turnName}
            </span>
            {status.inCheck && (
              <span className="chess-check-badge">{t('chess.check')}</span>
            )}
          </div>
        )}

        <div className="chess-captured">
          <div className="moves-title">{t('chess.captured')}</div>
          <div className="chess-captured-row">
            <span className="cap-label">{whiteName}</span>
            <span className="cap-pieces">
              {whiteCaptured.map((p, i) => (
                <span key={`w${i}`} className="cap-glyph-b">
                  {glyphFor('b', p)}
                </span>
              ))}
            </span>
          </div>
          <div className="chess-captured-row">
            <span className="cap-label">{blackName}</span>
            <span className="cap-pieces">
              {blackCaptured.map((p, i) => (
                <span key={`b${i}`} className="cap-glyph-w">
                  {glyphFor('w', p)}
                </span>
              ))}
            </span>
          </div>
        </div>

        <div className="chess-moves">
          <div className="moves-title">{t('chess.moves')}</div>
          <div className="chess-move-list" ref={moveListRef}>
            {pairs.map((p) => (
              <span key={p.num}>
                <span className="move-num">{p.num}.</span> {p.white}
                {p.black ? ` ${p.black} ` : ' '}
              </span>
            ))}
          </div>
        </div>

        <div className="chess-controls">
          <Button
            variant="secondary"
            size="sm"
            disabled={finished || history.length === 0}
            onClick={undoMove}
          >
            {t('chess.undo')}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setOrientation((o) => (o === 'w' ? 'b' : 'w'))}
          >
            {t('chess.flip')}
          </Button>
          <Button
            variant="danger"
            size="sm"
            disabled={finished}
            onClick={() => setResignOpen(true)}
          >
            {t('chess.resign')}
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setNewGameOpen(true)}>
            {t('chess.newGame')}
          </Button>
        </div>
      </div>

      <Modal
        open={pendingPromo !== null}
        onClose={() => setPendingPromo(null)}
        title={t('chess.promotion')}
      >
        <p>{t('chess.choosePromotion')}</p>
        <div className="chess-promo-grid">
          {PROMOTION_PIECES.map((p) => (
            <button
              key={p}
              type="button"
              className="chess-promo-btn"
              onClick={() => choosePromotion(p)}
              aria-label={p}
            >
              {pendingPromo && glyphFor(pendingPromo.color, p)}
            </button>
          ))}
        </div>
      </Modal>

      <ConfirmDialog
        open={resignOpen}
        title={t('chess.resign')}
        message={t('chess.confirmResign').replace('{name}', turnName)}
        confirmLabel={t('chess.resign')}
        cancelLabel={t('chess.cancel')}
        onConfirm={resign}
        onCancel={() => setResignOpen(false)}
        danger
      />

      <ConfirmDialog
        open={newGameOpen}
        title={t('chess.newGame')}
        message={t('chess.confirmNewGame')}
        confirmLabel={t('chess.newGame')}
        cancelLabel={t('chess.cancel')}
        onConfirm={startGame}
        onCancel={() => setNewGameOpen(false)}
      />
    </div>
  );
}
