// Snake & Ladder — multi-phone (QR) play. Each friend is a seat on their own
// phone; only the seat whose turn it is can roll, and the roll is applied
// with the shared game logic and posted as the next room snapshot.

import { useEffect, useRef, useState } from 'react';
import type { MpScreenProps } from '../../types.ts';
import { useI18n } from '../../../i18n/index.ts';
import { Avatar, Button } from '../../../shared/ui/index.ts';
import { playSound } from '../../../shared/sound.ts';
import { getMpSession } from '../../../shared/mp/session.ts';
import { useMpRoom } from '../../../shared/mp/useMpRoom.ts';
import { MpWaitingRoom } from '../../../shared/mp/MpWaiting.tsx';
import { applyMove, boardSet, rollDice, squareToRowCol } from '../logic/board.ts';
import type { SlDifficulty } from '../logic/board.ts';
import { applyRoll, createGame } from '../logic/game.ts';
import type { SlPlayer, SlState } from '../logic/game.ts';
import { BoardOverlay, squareCenterPct } from '../components/BoardOverlay.tsx';
import { initialSlMpState } from '../logic/mpState.ts';
import type { SlMpConfig, SlMpState } from '../logic/mpState.ts';

export { initialSlMpState };
export type { SlMpConfig, SlMpState };
import '../components/snakeladder.css';

const DICE_FACES = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];

const CELLS: Array<{ n: number; row: number; col: number }> = [];
for (let n = 1; n <= 100; n += 1) {
  const { row, col } = squareToRowCol(n);
  CELLS.push({ n, row, col });
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
  const [rolling, setRolling] = useState(false);
  const [glide, setGlide] = useState<{
    idx: number;
    square: number;
    glide: boolean;
  } | null>(null);
  const finishedRef = useRef(false);

  const mpState = room.state as SlMpState | null;
  const game = mpState?.game ?? null;

  // Animate ladder climbs / snake slides on every phone: when a new state
  // lands with a ladder/snake event, glide the mover's token across the
  // board from the square it landed on to its final square.
  useEffect(() => {
    if (!mpState) return;
    const mover = mpState.lastMoverSeat;
    if (mover === null || mpState.lastFrom === null) return;
    if (mpState.lastEvent !== 'ladder' && mpState.lastEvent !== 'snake')
      return;
    const finalPos = mpState.game.players[mover]?.pos ?? 0;
    if (finalPos === mpState.lastFrom) return;
    setGlide({ idx: mover, square: mpState.lastFrom, glide: false });
    const t1 = window.setTimeout(
      () => setGlide({ idx: mover, square: finalPos, glide: true }),
      350,
    );
    const t2 = window.setTimeout(() => setGlide(null), 1250);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room.stateVersion]);

  // When someone wins, every phone shows the results screen.
  useEffect(() => {
    if (!game || game.winner === null || finishedRef.current) return;
    finishedRef.current = true;
    playSound('win');
    const winner = game.players[game.winner];
    const lines = [...game.players]
      .sort((a, b) => b.pos - a.pos)
      .map((p) => ({ label: p.name, value: String(p.pos) }));
    if (room.isHost) {
      void room.endGame({ winnerSeat: game.winner });
    }
    onFinish({
      title: fmt(t('snakeladder.winner'), { name: winner?.name ?? '' }),
      winner: winner?.name,
      lines,
    });
  }, [game, onFinish, room, t]);

  if (room.status === 'lobby' || !mpState || !game) {
    return <MpWaitingRoom room={room} onExit={onExit} />;
  }

  const mySeat = session.seat;
  const current = game.players[game.turn];
  const isMyTurn = game.turn === mySeat && game.winner === null;

  const handleRoll = async (): Promise<void> => {
    if (!isMyTurn || rolling) return;
    setRolling(true);
    playSound('dice');
    const roll = rollDice();
    // Brief shuffle animation feel, then commit the real roll.
    window.setTimeout(() => {
      void (async () => {
        const moverIdx = game.turn;
        const before = game.players[moverIdx]?.pos ?? 0;
        const { state: next, event, extraTurn } = applyRoll(game, roll);
        const after = next.players[moverIdx]?.pos ?? before;
        const landedFrom = applyMove(before, roll, boardSet(game.difficulty)).from;
        const lastEvent: SlMpState['lastEvent'] =
          event === 'ladder'
            ? 'ladder'
            : event === 'snake'
              ? 'snake'
              : after === before
                ? 'stay'
                : extraTurn
                  ? 'six'
                  : null;
        const nextState: SlMpState = {
          game: next,
          dice: roll,
          lastRoll: roll,
          lastEvent,
          lastMoverSeat: moverIdx,
          lastFrom: landedFrom,
        };
        await room.postState(nextState);
        setRolling(false);
      })();
    }, 450);
  };

  const moverName =
    mpState.lastMoverSeat !== null
      ? (game.players[mpState.lastMoverSeat]?.name ?? '')
      : '';
  const message =
    mpState.lastEvent === 'ladder'
      ? fmt(t('snakeladder.climbedLadder'), {
          name: moverName,
          square: game.players[mpState.lastMoverSeat ?? 0]?.pos ?? '',
        })
      : mpState.lastEvent === 'snake'
        ? fmt(t('snakeladder.slidSnake'), {
            name: moverName,
            square: game.players[mpState.lastMoverSeat ?? 0]?.pos ?? '',
          })
        : mpState.lastEvent === 'stay'
          ? fmt(t('snakeladder.stayedPut'), { name: moverName })
          : mpState.lastEvent === 'six'
            ? t('snakeladder.extraTurnNote')
            : null;

  return (
    <div className="sl-wrap">
      <div className={`mp-turn-banner${isMyTurn ? ' mine' : ''}`}>
        {isMyTurn
          ? fmt(t('snakeladder.yourRoll'), { name: current?.name ?? '' })
          : fmt(t('snakeladder.theirRoll'), { name: current?.name ?? '' })}
        {!room.connected && <span> · {t('mp.reconnecting')}</span>}
      </div>

      <div className="sl-topbar">
        <div className="sl-turn">
          <Avatar name={current?.name ?? '?'} color={current?.color ?? '#888'} size={44} />
          <span className="sl-turn-text">
            {isMyTurn
              ? fmt(t('snakeladder.yourRoll'), { name: current?.name ?? '' })
              : fmt(t('snakeladder.theirRoll'), { name: current?.name ?? '' })}
          </span>
        </div>
      </div>

      <div className="sl-dice-row">
        <button
          type="button"
          className={`sl-dice sl-dice-btn${rolling ? ' sl-dice-rolling' : ''}`}
          disabled={!isMyTurn || rolling}
          onClick={() => void handleRoll()}
          aria-label={t('snakeladder.rollDice')}
        >
          {rolling ? '🎲' : (DICE_FACES[(mpState.dice ?? 6) - 1] ?? '⚄')}
        </button>
      </div>

      <div className="sl-message" aria-live="polite">
        {message ?? (rolling ? t('snakeladder.rolling') : ' ')}
      </div>

      <Button
        variant="primary"
        size="lg"
        fullWidth
        disabled={!isMyTurn || rolling}
        onClick={() => void handleRoll()}
      >
        {isMyTurn ? t('snakeladder.rollDice') : fmt(t('mp.waitingForTurn'), { name: current?.name ?? '' })}
      </Button>

      <div className="sl-board">
        {CELLS.map(({ n, row, col }) => {
          const tokens: Array<{ p: SlPlayer; i: number }> = [];
          game.players.forEach((p, i) => {
            if (p.pos === n && glide?.idx !== i) tokens.push({ p, i });
          });
          return (
            <div
              key={n}
              className={`sl-cell${(row + col) % 2 === 0 ? ' sl-cell-alt' : ''}`}
              style={{ gridRow: row + 1, gridColumn: col + 1 }}
            >
              <span className="sl-num">{n}</span>
              {tokens.length > 0 && (
                <div className="sl-tokens">
                  {tokens.map(({ p, i }, k) => {
                    const initial = p.name.trim().charAt(0).toUpperCase();
                    return (
                      <span
                        key={`${i}-${p.name}`}
                        className="sl-token"
                        title={p.name}
                        style={{
                          backgroundColor: p.color,
                          zIndex: i === game.turn ? 30 : 10 + k,
                          marginLeft: k === 0 ? 0 : '-14%',
                        }}
                      >
                        {initial === '' ? '?' : initial}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
        <BoardOverlay set={boardSet(game.difficulty)} />
        {glide && glide.square >= 1 && (
          <span
            className={`sl-anim-token${glide.glide ? ' glide' : ' hop'}`}
            style={{
              ...squareCenterPct(glide.square),
              backgroundColor: game.players[glide.idx]?.color ?? '#888',
            }}
            aria-hidden
          >
            {(game.players[glide.idx]?.name.trim().charAt(0).toUpperCase() ?? '?') || '?'}
          </span>
        )}
      </div>

      <div className="sl-standings" aria-label={t('snakeladder.positions')}>
        {[...game.players]
          .map((p, i) => ({ p, i }))
          .sort((a, b) => b.p.pos - a.p.pos)
          .map(({ p, i }) => (
            <span key={i} className="sl-chip" style={{ borderColor: p.color }}>
              <i style={{ backgroundColor: p.color }} aria-hidden />
              {p.name}
              {i === mySeat ? ` (${t('mp.you')})` : ''}: {p.pos}
            </span>
          ))}
      </div>

      <Button variant="ghost" fullWidth onClick={onExit}>
        {t('mp.leave')}
      </Button>
    </div>
  );
}
