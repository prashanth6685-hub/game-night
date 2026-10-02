// Ludo — multi-phone (QR) play. Each friend is a seat on their own phone;
// only the seat whose turn it is can roll and move, and every action is
// applied with the shared pure logic and posted as the next room snapshot.

import { useEffect, useRef, useState } from 'react';
import type { MpScreenProps } from '../../types.ts';
import { useI18n } from '../../../i18n/index.ts';
import { Avatar, Button } from '../../../shared/ui/index.ts';
import { playSound } from '../../../shared/sound.ts';
import { getMpSession } from '../../../shared/mp/session.ts';
import type { MpSession } from '../../../shared/mp/session.ts';
import { useMpRoom } from '../../../shared/mp/useMpRoom.ts';
import { MpWaitingRoom } from '../../../shared/mp/MpWaiting.tsx';
import {
  BASE,
  FINISHED,
  START_OFFSETS,
  applyMove,
  capturesFor,
  createGame,
  finishedCount,
  isForfeit,
  isSafeLanding,
  legalMoves,
  passTurn,
  rollDice,
  totalProgress,
} from '../logic/ludo.ts';
import type { LudoMove, LudoState } from '../logic/ludo.ts';
import '../components/ludo.css';

export interface LudoMpConfig {
  seats: number;
}

export interface LudoMpState {
  game: LudoState;
  dice: number | null;
  phase: 'roll' | 'move';
}

export function initialLudoMpState(names: string[]): LudoMpState {
  return {
    game: createGame(
      names,
      names.map(() => false),
    ),
    dice: null,
    phase: 'roll',
  };
}

const DICE_FACES = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];

/** Absolute track index -> [row, col] on the 15x15 board (clockwise). */
const TRACK: ReadonlyArray<readonly [number, number]> = [
  [6, 1], [6, 2], [6, 3], [6, 4], [6, 5],
  [5, 6], [4, 6], [3, 6], [2, 6], [1, 6], [0, 6],
  [0, 7], [0, 8],
  [1, 8], [2, 8], [3, 8], [4, 8], [5, 8],
  [6, 9], [6, 10], [6, 11], [6, 12], [6, 13], [6, 14],
  [7, 14], [8, 14],
  [8, 13], [8, 12], [8, 11], [8, 10], [8, 9],
  [9, 8], [10, 8], [11, 8], [12, 8], [13, 8], [14, 8],
  [14, 7], [14, 6],
  [13, 6], [12, 6], [11, 6], [10, 6], [9, 6],
  [8, 5], [8, 4], [8, 3], [8, 2], [8, 1], [8, 0],
  [7, 0], [6, 0],
];

/** Home-stretch cells per seat (progress 51..56), leading into the center. */
const HOME: ReadonlyArray<ReadonlyArray<readonly [number, number]>> = [
  [[7, 1], [7, 2], [7, 3], [7, 4], [7, 5], [7, 6]], // red
  [[1, 7], [2, 7], [3, 7], [4, 7], [5, 7], [6, 7]], // green
  [[7, 13], [7, 12], [7, 11], [7, 10], [7, 9], [7, 8]], // yellow
  [[13, 7], [12, 7], [11, 7], [10, 7], [9, 7], [8, 7]], // blue
];

/** Top-left corner of each seat's 6x6 base. */
const BASE_RECT: ReadonlyArray<readonly [number, number]> = [
  [0, 0], [0, 9], [9, 9], [9, 0],
];

const STAR_ABS = new Set([8, 21, 34, 47]);

const TRACK_INFO = new Map<string, number>();
TRACK.forEach(([r, c], i) => TRACK_INFO.set(`${r},${c}`, i));
const HOME_INFO = new Map<string, { player: number; step: number }>();
HOME.forEach((cells, p) =>
  cells.forEach(([r, c], s) => HOME_INFO.set(`${r},${c}`, { player: p, step: s })),
);

/** Fill {placeholders} in a translated template (i18n has no interpolation). */
function fmt(template: string, vars: Record<string, string | number>): string {
  let out = template;
  for (const [k, v] of Object.entries(vars)) {
    out = out.split(`{${k}}`).join(String(v));
  }
  return out;
}

/** Board cell key for a token, or null when in base / finished. */
function tokenCellKey(state: LudoState, pi: number, ti: number): string | null {
  const tok = state.players[pi]?.tokens[ti];
  if (tok === undefined || tok === BASE || tok === FINISHED) return null;
  if (tok <= 50) {
    const cell = TRACK[(START_OFFSETS[pi]! + tok) % 52]!;
    return `${cell[0]},${cell[1]}`;
  }
  const cell = HOME[pi]![tok - 51]!;
  return `${cell[0]},${cell[1]}`;
}

export default function MpGame({ code, onFinish, onExit }: MpScreenProps) {
  const session = getMpSession(code);
  if (!session) return null;
  return (
    <MpPlay code={code} onFinish={onFinish} onExit={onExit} session={session} />
  );
}

interface MpPlayProps extends MpScreenProps {
  session: MpSession;
}

function MpPlay({ onFinish, onExit, session }: MpPlayProps) {
  const { t } = useI18n();
  const room = useMpRoom(session);
  const [rolling, setRolling] = useState(false);
  const [busy, setBusy] = useState(false);
  const [animDice, setAnimDice] = useState<number | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [highlight, setHighlight] = useState<string | null>(null);
  const finishedRef = useRef(false);
  const actingRef = useRef(false);

  const mpState = room.state as LudoMpState | null;
  const game = mpState?.game ?? null;

  // Transient notices fade on their own.
  useEffect(() => {
    if (!notice) return;
    const id = window.setTimeout(() => setNotice(null), 3200);
    return () => window.clearTimeout(id);
  }, [notice]);

  // When someone wins, every phone shows the results screen.
  useEffect(() => {
    if (!game || game.winner === null || finishedRef.current) return;
    finishedRef.current = true;
    playSound('win');
    const winner = game.players[game.winner];
    const ranked = game.players
      .map((p, i) => ({ p, i }))
      .sort(
        (a, b) =>
          finishedCount(b.p) - finishedCount(a.p) ||
          totalProgress(b.p) - totalProgress(a.p),
      );
    if (room.isHost) {
      void room.endGame({ winnerSeat: game.winner });
    }
    onFinish({
      title: fmt(t('ludo.winner'), { name: winner?.name ?? '' }),
      winner: winner?.name,
      lines: ranked.map(({ p }) => ({
        label: p.name,
        value: fmt(t('ludo.tokensHome'), { count: finishedCount(p) }),
      })),
    });
  }, [game, onFinish, room, t]);

  if (room.status === 'lobby' || !mpState || !game) {
    return <MpWaitingRoom room={room} onExit={onExit} />;
  }

  const mySeat = session.seat;
  const current = game.players[game.turn];
  const isMyTurn = game.turn === mySeat && game.winner === null;
  const inMovePhase = mpState.phase === 'move';
  const moves: LudoMove[] =
    inMovePhase && mpState.dice !== null
      ? legalMoves(game, game.turn, mpState.dice)
      : [];

  const handleRoll = (): void => {
    if (!isMyTurn || inMovePhase || rolling || actingRef.current) return;
    actingRef.current = true;
    setRolling(true);
    setNotice(null);
    setHighlight(null);
    playSound('dice');
    const iv = window.setInterval(() => setAnimDice(rollDice()), 90);
    window.setTimeout(() => {
      window.clearInterval(iv);
      const roll = rollDice();
      setAnimDice(roll);
      const mover = game.players[game.turn];
      const finish = (): void => {
        setRolling(false);
        setAnimDice(null);
        actingRef.current = false;
      };
      if (!mover) {
        finish();
        return;
      }
      if (isForfeit(game, roll)) {
        playSound('skip');
        setNotice(fmt(t('ludo.forfeit'), { name: mover.name }));
        window.setTimeout(() => {
          void room
            .postState({ game: passTurn(game), dice: roll, phase: 'roll' })
            .then(finish);
        }, 1000);
        return;
      }
      const legal = legalMoves(game, game.turn, roll);
      if (legal.length === 0) {
        playSound('skip');
        setNotice(fmt(t('ludo.noMoves'), { name: mover.name }));
        window.setTimeout(() => {
          void room
            .postState({ game: passTurn(game), dice: roll, phase: 'roll' })
            .then(finish);
        }, 1000);
        return;
      }
      void room.postState({ game, dice: roll, phase: 'move' }).then(finish);
    }, 500);
  };

  const handleMove = (move: LudoMove): void => {
    if (!isMyTurn || !inMovePhase || mpState.dice === null || busy) return;
    setBusy(true);
    const roll = mpState.dice;
    const mover = game.players[game.turn];
    const { state: next, events, extraTurn, capturedPlayers } = applyMove(
      game,
      game.turn,
      move,
      roll,
    );
    const parts: string[] = [];
    if (mover) {
      if (events.includes('capture')) {
        playSound('correct');
        const victims = capturedPlayers
          .map((pi) => next.players[pi]?.name ?? '')
          .filter((n) => n !== '')
          .join(', ');
        parts.push(fmt(t('ludo.captured'), { name: mover.name, victim: victims }));
      } else if (events.includes('token-home')) {
        playSound('correct');
        parts.push(fmt(t('ludo.tokenHome'), { name: mover.name }));
      } else if (events.includes('leave-base')) {
        parts.push(fmt(t('ludo.leftBase'), { name: mover.name }));
      } else if (events.includes('safe-landing')) {
        parts.push(fmt(t('ludo.safeLanding'), { name: mover.name }));
      }
    }
    if (extraTurn && !events.includes('win')) parts.push(t('ludo.extraTurn'));
    setNotice(parts.join(' ') || null);
    const destKey = tokenCellKey(next, game.turn, move.token);
    void room
      .postState({ game: next, dice: roll, phase: 'roll' })
      .then(() => {
        setBusy(false);
        setHighlight(destKey);
        if (destKey) {
          window.setTimeout(
            () => setHighlight((h) => (h === destKey ? null : h)),
            1400,
          );
        }
      });
  };

  function describeMove(m: LudoMove, roll: number): string {
    const label =
      m.from === BASE
        ? fmt(t('ludo.moveOut'), { token: m.token + 1 })
        : fmt(t('ludo.moveBy'), { token: m.token + 1, roll });
    const tags: string[] = [];
    if (capturesFor(game!, game!.turn, m) > 0) tags.push(t('ludo.capturesTag'));
    if (m.to === FINISHED) tags.push(t('ludo.finishesTag'));
    else if (isSafeLanding(game!.turn, m.to)) tags.push(t('ludo.safeTag'));
    return [label, ...tags].join(' ');
  }

  // ---------- board geometry (same model as the local game) ----------

  const movable = new Map<string, LudoMove>();
  if (isMyTurn && inMovePhase) {
    moves.forEach((m) => movable.set(`${game.turn}:${m.token}`, m));
  }

  const byCell = new Map<string, Array<{ pi: number; ti: number }>>();
  const baseTokens: number[][] = game.players.map(() => []);
  const homeTokens: number[] = game.players.map(() => 0);
  game.players.forEach((pl, pi) => {
    pl.tokens.forEach((tok, ti) => {
      if (tok === BASE) {
        baseTokens[pi]!.push(ti);
      } else if (tok === FINISHED) {
        homeTokens[pi]! += 1;
      } else {
        const key = tokenCellKey(game, pi, ti);
        if (key) {
          const list = byCell.get(key);
          if (list) list.push({ pi, ti });
          else byCell.set(key, [{ pi, ti }]);
        }
      }
    });
  });

  function tokenEl(pi: number, ti: number): JSX.Element {
    const pl = game!.players[pi]!;
    const key = `${pi}:${ti}`;
    const move = movable.get(key) ?? null;
    const cls = `lu-token${move ? ' lu-token--movable' : ''}`;
    if (move && mpState!.dice !== null) {
      const roll = mpState!.dice;
      return (
        <button
          key={key}
          type="button"
          className={cls}
          style={{ backgroundColor: pl.color }}
          aria-label={describeMove(move, roll)}
          disabled={busy}
          onClick={() => handleMove(move)}
        >
          {ti + 1}
        </button>
      );
    }
    return (
      <div key={key} className={cls} style={{ backgroundColor: pl.color }} title={pl.name}>
        {ti + 1}
      </div>
    );
  }

  const boardCells: JSX.Element[] = [];
  TRACK_INFO.forEach((abs, key) => {
    const [r, c] = key.split(',').map(Number) as [number, number];
    const startSeat = START_OFFSETS.indexOf(abs as (typeof START_OFFSETS)[number]);
    const startColor =
      startSeat >= 0 && startSeat < game.players.length
        ? game.players[startSeat]!.color
        : null;
    const toks = byCell.get(key) ?? [];
    boardCells.push(
      <div
        key={key}
        className={`lu-cell${highlight === key ? ' lu-cell--hl' : ''}`}
        style={{
          gridRow: r + 1,
          gridColumn: c + 1,
          backgroundColor: startColor ?? undefined,
        }}
      >
        {startColor ? (
          <span className="lu-start-mark" style={{ backgroundColor: startColor }} aria-hidden />
        ) : STAR_ABS.has(abs) ? (
          <span className="lu-star" aria-hidden>
            ★
          </span>
        ) : null}
        {toks.length > 0 && (
          <div className="lu-tokens">
            {toks.slice(0, 3).map(({ pi, ti }) => tokenEl(pi, ti))}
            {toks.length > 3 && (
              <span className="lu-count">+{toks.length - 3}</span>
            )}
          </div>
        )}
      </div>,
    );
  });
  HOME_INFO.forEach(({ player, step }, key) => {
    if (player >= game.players.length) return;
    const [r, c] = key.split(',').map(Number) as [number, number];
    const color = game.players[player]!.color;
    const toks = byCell.get(key) ?? [];
    boardCells.push(
      <div
        key={key}
        className={`lu-cell${highlight === key ? ' lu-cell--hl' : ''}`}
        style={{
          gridRow: r + 1,
          gridColumn: c + 1,
          backgroundColor: color,
          opacity: 0.92,
        }}
      >
        {toks.length > 0 && (
          <div className="lu-tokens">
            {toks.slice(0, 3).map(({ pi, ti }) => tokenEl(pi, ti))}
            {toks.length > 3 && (
              <span className="lu-count">+{toks.length - 3}</span>
            )}
          </div>
        )}
        {step === 5 && toks.length === 0 && (
          <span className="lu-star" style={{ color: '#fff' }} aria-hidden>
            ★
          </span>
        )}
      </div>,
    );
  });
  boardCells.push(
    <div
      key="center"
      className="lu-cell lu-center-cell"
      style={{ gridRow: 8, gridColumn: 8 }}
    >
      {game.players.map((pl, pi) =>
        (homeTokens[pi] ?? 0) > 0 ? (
          <div
            key={pi}
            className="lu-token"
            style={{ backgroundColor: pl.color }}
            title={`${pl.name}: ${homeTokens[pi]}`}
          >
            {homeTokens[pi]}
          </div>
        ) : (
          <div
            key={pi}
            className="lu-center-deco"
            style={{ backgroundColor: pl.color, width: '55%', height: '55%' }}
            aria-hidden
          />
        ),
      )}
    </div>,
  );
  const cornerColors: Array<[number, number, number]> = [
    [6, 6, 0],
    [6, 8, 1],
    [8, 8, 2],
    [8, 6, 3],
  ];
  cornerColors.forEach(([r, c, pi]) => {
    if (pi >= game.players.length) return;
    boardCells.push(
      <div
        key={`corner-${r}-${c}`}
        className="lu-cell"
        style={{
          gridRow: r + 1,
          gridColumn: c + 1,
          backgroundColor: game.players[pi]!.color,
          opacity: 0.35,
        }}
      />,
    );
  });
  game.players.forEach((pl, pi) => {
    const [br, bc] = BASE_RECT[pi]!;
    const inBase = baseTokens[pi]!;
    boardCells.push(
      <div
        key={`base-${pi}`}
        className="lu-cell lu-base"
        style={{
          gridRow: `${br + 1} / span 6`,
          gridColumn: `${bc + 1} / span 6`,
          backgroundColor: pl.color,
        }}
      >
        <div className="lu-base__inner">
          {[0, 1, 2, 3].map((ti) => (
            <div key={ti} className="lu-spot">
              {inBase.includes(ti) ? tokenEl(pi, ti) : null}
            </div>
          ))}
        </div>
      </div>,
    );
  });

  const rankedStandings = game.players
    .map((p, i) => ({ p, i }))
    .sort(
      (a, b) =>
        finishedCount(b.p) - finishedCount(a.p) ||
        totalProgress(b.p) - totalProgress(a.p),
    );

  const displayDice = animDice ?? mpState.dice ?? 6;
  const canRoll = isMyTurn && !inMovePhase && !rolling && game.winner === null;
  const message =
    notice ??
    (inMovePhase
      ? isMyTurn
        ? t('ludo.chooseToken')
        : fmt(t('mp.waitingForTurn'), { name: current?.name ?? '' })
      : rolling
        ? t('ludo.rolling')
        : null);

  return (
    <div className="lu-wrap">
      <div className={`mp-turn-banner${isMyTurn ? ' mine' : ''}`}>
        {isMyTurn
          ? `🎲 ${t('mp.yourTurn')}`
          : fmt(t('ludo.turnOf'), { name: current?.name ?? '' })}
        {!room.connected && <span> · {t('mp.reconnecting')}</span>}
      </div>

      <div className="lu-topbar">
        <div className="lu-turn">
          <Avatar name={current?.name ?? '?'} color={current?.color ?? '#888'} size={44} />
          <span className="lu-turn-text">
            {fmt(t('ludo.turnOf'), { name: current?.name ?? '' })}
          </span>
        </div>
        <div className="lu-topbar__actions">
          <Button variant="ghost" size="sm" onClick={onExit}>
            {t('mp.leave')}
          </Button>
        </div>
      </div>

      <div className="lu-dice-row">
        <button
          type="button"
          className={`lu-dice${rolling ? ' lu-dice--rolling' : ''}`}
          disabled={!canRoll}
          onClick={handleRoll}
          aria-label={t('ludo.rollDice')}
        >
          <span aria-hidden>{DICE_FACES[displayDice - 1] ?? '⚅'}</span>
        </button>
      </div>

      <div className="lu-message" aria-live="polite">
        {message ?? ' '}
      </div>

      <Button
        variant="primary"
        size="lg"
        fullWidth
        disabled={!canRoll && !(isMyTurn && inMovePhase)}
        onClick={handleRoll}
      >
        {isMyTurn
          ? inMovePhase
            ? t('ludo.chooseToken')
            : t('ludo.rollDice')
          : fmt(t('mp.waitingForTurn'), { name: current?.name ?? '' })}
      </Button>

      {isMyTurn && inMovePhase && mpState.dice !== null && (
        <div className="lu-moves" role="group" aria-label={t('ludo.chooseToken')}>
          {moves.map((m) => (
            <Button
              key={m.token}
              variant="secondary"
              size="lg"
              fullWidth
              disabled={busy}
              onClick={() => handleMove(m)}
            >
              {describeMove(m, mpState.dice!)}
            </Button>
          ))}
        </div>
      )}

      <div className="lu-board" role="img" aria-label={t('ludo.setupTitle')}>
        {boardCells}
      </div>

      <div className="lu-standings" aria-label={t('ludo.standings')}>
        {rankedStandings.map(({ p, i }) => (
          <span
            key={`${i}-${p.name}`}
            className="lu-chip"
            style={{ borderColor: p.color }}
          >
            <i style={{ backgroundColor: p.color }} aria-hidden />
            {p.name}
            {i === mySeat ? ` (${t('mp.you')})` : ''}:{' '}
            {fmt(t('ludo.tokensHome'), { count: finishedCount(p) })}
          </span>
        ))}
      </div>

      <Button variant="ghost" fullWidth onClick={onExit}>
        {t('mp.leave')}
      </Button>
    </div>
  );
}
