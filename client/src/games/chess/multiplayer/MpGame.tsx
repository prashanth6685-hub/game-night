// Chess — multi-phone (QR) play. Each player is a seat on their own phone:
// seat 0 plays White (the host), seat 1 plays Black. The shared room state
// is just { fen, moves, resignedSeat } — every phone rebuilds the same
// chess.js position from the FEN, and only the side-to-move seat may post
// the next position, exactly like the pass-and-play screen's rules.

import { useEffect, useMemo, useRef, useState } from 'react';
import { Chess } from 'chess.js';
import type { Color, Move, PieceSymbol, Square } from 'chess.js';
import { glyphFor as glyphForPiece } from '../pieces.ts';
import type { MpScreenProps } from '../../types.ts';
import { useI18n } from '../../../i18n/index.ts';
import { Button, ConfirmDialog, Modal } from '../../../shared/ui/index.ts';
import { playSound } from '../../../shared/sound.ts';
import { getMpSession } from '../../../shared/mp/session.ts';
import { useMpRoom } from '../../../shared/mp/useMpRoom.ts';
import { MpWaitingRoom } from '../../../shared/mp/MpWaiting.tsx';
import { getStatus } from '../logic/status.ts';
import type { ChessStatus } from '../logic/status.ts';
import ChessBoard, { type LegalTarget } from '../components/ChessBoard.tsx';
import '../components/chess.css';

export interface ChessMpState {
  fen: string;
  moves: string[];
  /** Seat that resigned (0 = White, 1 = Black), or null while nobody has. */
  resignedSeat: number | null;
}

export function initialChessMpState(): ChessMpState {
  return { fen: new Chess().fen(), moves: [], resignedSeat: null };
}

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

function glyphFor(_color: Color, type: PieceSymbol): string {
  // Both colors share one glyph set — color only affects CSS styling.
  return glyphForPiece(type);
}

function fmt(template: string, vars: Record<string, string | number>): string {
  let out = template;
  for (const [k, v] of Object.entries(vars)) {
    out = out.split(`{${k}}`).join(String(v));
  }
  return out;
}

export default function MpGame({ code, onFinish, onExit }: MpScreenProps) {
  const session = getMpSession(code);
  if (!session) return null;
  return <MpPlay code={code} onFinish={onFinish} onExit={onExit} />;
}

function MpPlay({ code, onFinish, onExit }: MpScreenProps) {
  const { t } = useI18n();
  const session = getMpSession(code);
  if (!session) return null;
  const room = useMpRoom(session);

  const [selected, setSelected] = useState<string | null>(null);
  const [pendingPromo, setPendingPromo] = useState<{
    from: string;
    to: string;
    color: Color;
  } | null>(null);
  const [resignOpen, setResignOpen] = useState(false);
  const [posting, setPosting] = useState(false);
  // 💡 Hints toggle: when on, selecting a piece highlights every square it
  // can legally move to. Remembered across games on this device.
  const [hintsOn, setHintsOn] = useState<boolean>(() => {
    try {
      return localStorage.getItem('chess-hints') !== 'off';
    } catch {
      return true;
    }
  });
  const toggleHints = (): void => {
    setHintsOn((v) => {
      try {
        localStorage.setItem('chess-hints', v ? 'off' : 'on');
      } catch {
        // ignore
      }
      return !v;
    });
  };
  const finishedRef = useRef(false);
  const moveListRef = useRef<HTMLDivElement | null>(null);

  const mpState = room.state as ChessMpState | null;
  const fen = mpState?.fen ?? null;

  const chess = useMemo<Chess | null>(() => {
    if (!fen) return null;
    try {
      return new Chess(fen);
    } catch {
      return new Chess();
    }
  }, [fen]);

  const status: ChessStatus | null = chess ? getStatus(chess) : null;

  const mySeat = session.seat;
  const myColor: Color = mySeat === 0 ? 'w' : 'b';

  const whitePlayer = room.players.find((p) => p.seat === 0);
  const blackPlayer = room.players.find((p) => p.seat === 1);
  const whiteName = whitePlayer?.name ?? t('chess.player1');
  const blackName = blackPlayer?.name ?? t('chess.player2');

  const resignedSeat = mpState?.resignedSeat ?? null;
  const gameOver =
    resignedSeat !== null || (status !== null && status.gameOver);
  const winnerSeat: number | null =
    resignedSeat !== null
      ? resignedSeat === 0
        ? 1
        : 0
      : status?.resultText === 'white'
        ? 0
        : status?.resultText === 'black'
          ? 1
          : null;
  const winnerName =
    winnerSeat === 0 ? whiteName : winnerSeat === 1 ? blackName : null;

  const isMyTurn =
    !gameOver &&
    status !== null &&
    ((status.turn === 'w' && mySeat === 0) ||
      (status.turn === 'b' && mySeat === 1));

  // Selection never survives a position change (my move or theirs).
  useEffect(() => {
    setSelected(null);
    setPendingPromo(null);
  }, [fen]);

  // Keep the move list pinned to the latest move.
  useEffect(() => {
    const el = moveListRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [mpState?.moves.length]);

  const drawReason = (c: Chess, s: ChessStatus): string => {
    if (s.stalemate) return t('chess.stalemate');
    if (c.isInsufficientMaterial()) return t('chess.insufficient');
    if (c.isThreefoldRepetition()) return t('chess.threefold');
    if (c.isDrawByFiftyMoves()) return t('chess.fiftyMove');
    return t('chess.draw');
  };

  // When the game ends, every phone shows the results screen.
  useEffect(() => {
    if (!gameOver || !chess || !status || !mpState || finishedRef.current)
      return;
    finishedRef.current = true;
    playSound('win');
    const reason =
      resignedSeat !== null
        ? t('chess.resign')
        : status.checkmate
          ? t('chess.checkmate')
          : drawReason(chess, status);
    if (room.isHost) {
      void room.endGame({ winnerSeat });
    }
    onFinish({
      title: winnerName
        ? t('chess.youWin').replace('{name}', winnerName)
        : t('chess.gameDraw'),
      ...(winnerName ? { winner: winnerName } : {}),
      lines: [
        { label: t('chess.result'), value: reason },
        { label: t('chess.moves'), value: String(mpState.moves.length) },
      ],
    });
    // drawReason is stable enough via t; room identity changes per render
    // but finishedRef guards the one-shot finish.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameOver, chess, status, mpState, onFinish, room.isHost, t]);

  if (room.status === 'lobby' || !mpState || !chess || !status) {
    return <MpWaitingRoom room={room} onExit={onExit} />;
  }

  const legalTargets = (from: string): LegalTarget[] =>
    chess
      .moves({ square: from as Square, verbose: true })
      .map((m) => ({
        to: m.to,
        capture: m.flags.includes('c') || m.flags.includes('e'),
      }));

  const doMove = async (
    from: string,
    to: string,
    promotion?: PromotionPiece,
  ): Promise<void> => {
    if (!isMyTurn || posting) return;
    try {
      const m: Move = chess.move({ from, to, promotion });
      playSound('move');
      setSelected(null);
      setPosting(true);
      await room.postState({
        fen: chess.fen(),
        moves: [...mpState.moves, m.san],
        resignedSeat: null,
      });
    } catch {
      setSelected(null);
    } finally {
      setPosting(false);
    }
  };

  const onSquareTap = (square: string): void => {
    if (!isMyTurn || posting || pendingPromo) return;
    if (selected && square !== selected) {
      const target = legalTargets(selected).find((tgt) => tgt.to === square);
      if (target) {
        const moving = chess.get(selected as Square);
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
        void doMove(selected, square);
        return;
      }
    }
    if (square === selected) {
      setSelected(null);
      return;
    }
    const piece = chess.get(square as Square);
    if (piece && piece.color === chess.turn() && piece.color === myColor) {
      playSound('click');
      setSelected(square);
    } else {
      setSelected(null);
    }
  };

  const choosePromotion = (piece: PromotionPiece): void => {
    const p = pendingPromo;
    setPendingPromo(null);
    if (p) void doMove(p.from, p.to, piece);
  };

  const resign = async (): Promise<void> => {
    setResignOpen(false);
    if (gameOver || posting) return;
    setPosting(true);
    await room.postState({
      fen: mpState.fen,
      moves: mpState.moves,
      resignedSeat: mySeat,
    });
    setPosting(false);
  };

  /** Pieces of the opponent that `color` has captured, strongest first. */
  const capturedBy = (color: Color): PieceSymbol[] => {
    const onBoard: Record<PieceSymbol, number> = {
      p: 0,
      n: 0,
      b: 0,
      r: 0,
      q: 0,
      k: 0,
    };
    for (const row of chess.board()) {
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
    if (!status.inCheck) return null;
    for (const row of chess.board()) {
      for (const cell of row) {
        if (cell && cell.type === 'k' && cell.color === status.turn) {
          return cell.square;
        }
      }
    }
    return null;
  };

  const verbose = chess.history({ verbose: true });
  const last = verbose[verbose.length - 1];
  const lastMove = last ? { from: last.from, to: last.to } : null;

  const pairs: Array<{ num: number; white: string; black?: string }> = [];
  for (let i = 0; i < mpState.moves.length; i += 2) {
    pairs.push({
      num: i / 2 + 1,
      white: mpState.moves[i] ?? '',
      black: mpState.moves[i + 1],
    });
  }
  const whiteCaptured = capturedBy('w');
  const blackCaptured = capturedBy('b');

  const turnName = status.turn === 'w' ? whiteName : blackName;
  const myName = mySeat === 0 ? whiteName : blackName;

  const bannerTitle = winnerName
    ? t('chess.youWin').replace('{name}', winnerName)
    : t('chess.gameDraw');

  return (
    <div className="chess-game">
      <div className={`mp-turn-banner${isMyTurn ? ' mine' : ''}`}>
        {gameOver
          ? bannerTitle
          : isMyTurn
            ? `♟️ ${t('mp.yourTurn')}`
            : fmt(t('mp.waitingForTurn'), { name: turnName })}
        {!room.connected && <span> · {t('mp.reconnecting')}</span>}
      </div>

      <div className="chess-toolbar">
        <button
          type="button"
          className={`chess-hint-toggle${hintsOn ? ' on' : ''}`}
          onClick={toggleHints}
          aria-pressed={hintsOn}
        >
          <span className="toggle-pill" aria-hidden="true" />
          {t(hintsOn ? 'chess.hintsOn' : 'chess.hintsOff')}
        </button>
      </div>
      <ChessBoard
        board={chess.board()}
        orientation={myColor}
        selected={selected}
        targets={hintsOn && selected ? legalTargets(selected) : []}
        lastMove={lastMove}
        checkSquare={kingInCheckSquare()}
        disabled={!isMyTurn || posting || gameOver}
        onSquareTap={onSquareTap}
      />

      <div className="chess-panel">
        {gameOver ? (
          <div className="chess-result-banner">{bannerTitle}</div>
        ) : (
          <div className="chess-turn">
            <span className={`turn-dot ${status.turn}`} />
            <span>
              {status.turn === 'w'
                ? t('chess.whiteToMove')
                : t('chess.blackToMove')}
              {' — '}
              {turnName}
              {status.turn === myColor && ` (${t('mp.you')})`}
            </span>
            {status.inCheck && (
              <span className="chess-check-badge">{t('chess.check')}</span>
            )}
          </div>
        )}

        <div className="chess-captured">
          <div className="moves-title">{t('chess.captured')}</div>
          <div className="chess-captured-row">
            <span className="cap-label">
              ♔ {whiteName}
              {mySeat === 0 ? ` (${t('mp.you')})` : ''}
            </span>
            <span className="cap-pieces">
              {whiteCaptured.map((p, i) => (
                <span key={`w${i}`} className="cap-glyph-b">
                  {glyphFor('b', p)}
                </span>
              ))}
            </span>
          </div>
          <div className="chess-captured-row">
            <span className="cap-label">
              ♚ {blackName}
              {mySeat === 1 ? ` (${t('mp.you')})` : ''}
            </span>
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
            variant="danger"
            size="sm"
            disabled={gameOver || posting}
            onClick={() => setResignOpen(true)}
          >
            {t('chess.resign')}
          </Button>
          <Button variant="ghost" size="sm" onClick={onExit}>
            {t('mp.leave')}
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
              {pendingPromo && (
                <span className={`chess-piece piece-${pendingPromo.color}`}>
                  {glyphFor(pendingPromo.color, p)}
                </span>
              )}
            </button>
          ))}
        </div>
      </Modal>

      <ConfirmDialog
        open={resignOpen}
        title={t('chess.resign')}
        message={t('chess.confirmResign').replace('{name}', myName)}
        confirmLabel={t('chess.resign')}
        cancelLabel={t('chess.cancel')}
        onConfirm={() => void resign()}
        onCancel={() => setResignOpen(false)}
        danger
      />
    </div>
  );
}
