// Ludo game screen: setup (2-4 seats, human/computer) then play on a
// classic 15x15 board with dice, captures, safe squares, and bot turns.
import { useEffect, useMemo, useRef, useState } from 'react';
import type { GameScreenProps } from '../../types.ts';
import { useI18n } from '../../../i18n/index.ts';
import { Avatar, Button, Card, ConfirmDialog } from '../../../shared/ui/index.ts';
import { playSound } from '../../../shared/sound.ts';
import { track } from '../../../shared/analytics.ts';
import {
  BASE,
  FINISHED,
  PLAYER_COLORS,
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
import { chooseMove } from '../logic/bot.ts';
import './ludo.css';
import { randomExampleNames } from '../../../shared/names.ts';

type Phase = 'setup' | 'play';

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

export default function GameScreen({ onFinish, onExit }: GameScreenProps) {
  const { t } = useI18n();

  const [phase, setPhase] = useState<Phase>('setup');
  const [playerCount, setPlayerCount] = useState(2);
  const [names, setNames] = useState<string[]>(['', '', '', '']);
  const [kinds, setKinds] = useState<boolean[]>([false, false, false, false]);
  const namePhs = useMemo(() => randomExampleNames(4), []);

  const [game, setGame] = useState<LudoState | null>(null);
  const [dice, setDice] = useState(6);
  const [rolling, setRolling] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [pendingMoves, setPendingMoves] = useState<LudoMove[] | null>(null);
  const [pendingRoll, setPendingRoll] = useState(1);
  const [highlight, setHighlight] = useState<string | null>(null);
  const [confirmEnd, setConfirmEnd] = useState(false);

  const timersRef = useRef<number[]>([]);
  const rollingRef = useRef(false);

  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      for (const id of timers) {
        window.clearTimeout(id);
        window.clearInterval(id);
      }
    };
  }, []);

  function after(ms: number, fn: () => void): void {
    timersRef.current.push(window.setTimeout(fn, ms));
  }

  function setRollingBoth(v: boolean): void {
    rollingRef.current = v;
    setRolling(v);
  }

  function startGame(): void {
    const resolved = Array.from({ length: playerCount }, (_, i) => {
      const raw = (names[i] ?? '').trim();
      return raw === '' ? fmt(t('ludo.player'), { n: i + 1 }) : raw;
    });
    const bots = Array.from(
      { length: playerCount },
      (_, i) => kinds[i] ?? false,
    );
    setGame(createGame(resolved, bots));
    setDice(6);
    setRollingBoth(false);
    setMessage(null);
    setPendingMoves(null);
    setHighlight(null);
    setPhase('play');
    track('game_started', { game: 'ludo' });
    playSound('click');
  }

  function quickVsComputer(): void {
    const bots = randomExampleNames(3);
    setPlayerCount(4);
    setKinds([false, true, true, true]);
    setNames((prev) => [
      prev[0] ?? '',
      bots[0] ?? '',
      bots[1] ?? '',
      bots[2] ?? '',
    ]);
    playSound('click');
  }

  function finishWithWinner(state: LudoState): void {
    const ranked = state.players
      .map((p, i) => ({ p, i }))
      .sort(
        (a, b) =>
          finishedCount(b.p) - finishedCount(a.p) ||
          totalProgress(b.p) - totalProgress(a.p),
      );
    const top = ranked[0];
    const name = top ? top.p.name : '';
    onFinish({
      title: fmt(t('ludo.winner'), { name }),
      winner: name,
      lines: ranked.map(({ p }) => ({
        label: `${p.isBot ? `${t('ludo.botBadge')} ` : ''}${p.name}`,
        value: fmt(t('ludo.tokensHome'), { count: finishedCount(p) }),
      })),
    });
  }

  function endGameNow(): void {
    const g = game;
    if (!g) return;
    setConfirmEnd(false);
    track('game_abandoned', { game: 'ludo' });
    finishWithWinner(g);
  }

  function applyChosen(
    g: LudoState,
    moverIdx: number,
    move: LudoMove,
    roll: number,
  ): void {
    const mover = g.players[moverIdx];
    if (!mover) return;
    const { state, events, extraTurn, capturedPlayers } = applyMove(
      g,
      moverIdx,
      move,
      roll,
    );
    setGame(state);
    setPendingMoves(null);
    setRollingBoth(false);
    const destKey = tokenCellKey(state, moverIdx, move.token);
    setHighlight(destKey);
    if (destKey) {
      after(1400, () => setHighlight((h) => (h === destKey ? null : h)));
    }

    if (events.includes('win')) {
      playSound('win');
      setMessage(fmt(t('ludo.winner'), { name: mover.name }));
      track('game_completed', { game: 'ludo' });
      after(1600, () => finishWithWinner(state));
      return;
    }
    const parts: string[] = [];
    if (events.includes('capture')) {
      playSound('correct');
      const victims = capturedPlayers
        .map((pi) => state.players[pi]?.name ?? '')
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
    if (extraTurn) parts.push(t('ludo.extraTurn'));
    setMessage(parts.join(' ') || null);
  }

  function resolveRoll(g: LudoState, roll: number): void {
    const moverIdx = g.turn;
    const mover = g.players[moverIdx];
    if (!mover) {
      setRollingBoth(false);
      return;
    }
    if (isForfeit(g, roll)) {
      playSound('skip');
      setMessage(fmt(t('ludo.forfeit'), { name: mover.name }));
      after(1100, () => {
        setGame(passTurn(g));
        setRollingBoth(false);
      });
      return;
    }
    const moves = legalMoves(g, moverIdx, roll);
    if (moves.length === 0) {
      playSound('skip');
      setMessage(fmt(t('ludo.noMoves'), { name: mover.name }));
      after(1100, () => {
        setGame(passTurn(g));
        setRollingBoth(false);
      });
      return;
    }
    if (mover.isBot) {
      after(750, () => {
        const pick = chooseMove(g, moverIdx, roll, moves);
        if (pick) applyChosen(g, moverIdx, pick, roll);
        else {
          setGame(passTurn(g));
          setRollingBoth(false);
        }
      });
      return;
    }
    setPendingMoves(moves);
    setPendingRoll(roll);
    setRollingBoth(false);
    setMessage(t('ludo.chooseToken'));
  }

  function doRoll(): void {
    const g = game;
    if (!g || rollingRef.current || g.winner !== null || pendingMoves) return;
    const mover = g.players[g.turn];
    if (!mover) return;
    playSound('dice');
    setRollingBoth(true);
    setMessage(
      mover.isBot
        ? `${fmt(t('ludo.turnOf'), { name: mover.name })} ${t('ludo.thinking')}`
        : t('ludo.rolling'),
    );
    setHighlight(null);
    const iv = window.setInterval(() => setDice(rollDice()), 90);
    timersRef.current.push(iv);
    after(650, () => {
      window.clearInterval(iv);
      const roll = rollDice();
      setDice(roll);
      resolveRoll(g, roll);
    });
  }

  // Bot driver: when a bot's turn is up and nothing is in flight, roll.
  useEffect(() => {
    if (phase !== 'play' || !game || game.winner !== null || rolling || pendingMoves) {
      return;
    }
    const p = game.players[game.turn];
    if (!p || !p.isBot) return;
    const id = window.setTimeout(() => doRoll(), 900);
    return () => window.clearTimeout(id);
  });

  function describeMove(g: LudoState, m: LudoMove, roll: number): string {
    const label =
      m.from === BASE
        ? fmt(t('ludo.moveOut'), { token: m.token + 1 })
        : fmt(t('ludo.moveBy'), { token: m.token + 1, roll });
    const tags: string[] = [];
    if (capturesFor(g, g.turn, m) > 0) tags.push(t('ludo.capturesTag'));
    if (m.to === FINISHED) tags.push(t('ludo.finishesTag'));
    else if (isSafeLanding(g.turn, m.to)) tags.push(t('ludo.safeTag'));
    return [label, ...tags].join(' ');
  }

  // ---------- setup phase ----------

  if (phase === 'setup' || !game) {
    return (
      <div className="lu-wrap">
        <Card title={t('ludo.setupTitle')}>
          <div className="lu-setup">
            <div className="lu-field">
              <span className="lu-label">{t('ludo.playerCount')}</span>
              <div
                className="lu-count-row"
                role="group"
                aria-label={t('ludo.playerCount')}
              >
                {[2, 3, 4].map((n) => (
                  <Button
                    key={n}
                    variant={playerCount === n ? 'primary' : 'secondary'}
                    size="md"
                    onClick={() => setPlayerCount(n)}
                  >
                    {n}
                  </Button>
                ))}
              </div>
            </div>
            {Array.from({ length: playerCount }, (_, i) => {
              const isBot = kinds[i] ?? false;
              return (
                <div className="lu-seat" key={i}>
                  <div className="lu-seat__head">
                    <span
                      className="lu-dot"
                      style={{ backgroundColor: PLAYER_COLORS[i] ?? '#888' }}
                      aria-hidden
                    />
                    <span className="lu-seat__name">
                      {fmt(t('ludo.player'), { n: i + 1 })}
                    </span>
                  </div>
                  <input
                    id={`ludo-name-${i}`}
                    value={names[i] ?? ''}
                    placeholder={namePhs[i] ?? ''}
                    maxLength={20}
                    autoComplete="off"
                    aria-label={fmt(t('ludo.player'), { n: i + 1 })}
                    onChange={(e) =>
                      setNames((prev) =>
                        prev.map((v, j) => (j === i ? e.target.value : v)),
                      )
                    }
                  />
                  <div
                    className="lu-kind"
                    role="group"
                    aria-label={fmt(t('ludo.player'), { n: i + 1 })}
                  >
                    <button
                      type="button"
                      className={isBot ? '' : 'lu-kind--on'}
                      onClick={() =>
                        setKinds((prev) =>
                          prev.map((v, j) => (j === i ? false : v)),
                        )
                      }
                    >
                      {t('ludo.human')}
                    </button>
                    <button
                      type="button"
                      className={isBot ? 'lu-kind--on' : ''}
                      onClick={() =>
                        setKinds((prev) =>
                          prev.map((v, j) => (j === i ? true : v)),
                        )
                      }
                    >
                      {t('ludo.computer')}
                    </button>
                  </div>
                </div>
              );
            })}
            <Button variant="secondary" size="lg" fullWidth onClick={quickVsComputer}>
              {t('ludo.playVsComputer')}
            </Button>
            <Button variant="primary" size="lg" fullWidth onClick={startGame}>
              {t('ludo.startGame')}
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // ---------- play phase ----------

  const current = game.players[game.turn];
  if (!current) return null;
  const turnText = fmt(t('ludo.turnOf'), { name: current.name });
  const canRoll =
    !rolling && !pendingMoves && game.winner === null && !current.isBot;

  const movable = new Map<string, LudoMove>();
  (pendingMoves ?? []).forEach((m) => movable.set(`${game.turn}:${m.token}`, m));

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
    if (move) {
      return (
        <button
          key={key}
          type="button"
          className={cls}
          style={{ backgroundColor: pl.color }}
          aria-label={describeMove(game!, move, pendingRoll)}
          onClick={() => applyChosen(game!, game!.turn, move, pendingRoll)}
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
  // center home cell: finished tokens per player
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
  // decorative center corners
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
  // bases
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

  return (
    <div className="lu-wrap">
      <div className="lu-topbar">
        <div className="lu-turn">
          <Avatar name={current.name} color={current.color} size={44} />
          <span className="lu-turn-text">
            {turnText}
            {current.isBot ? ` ${t('ludo.botBadge')}` : ''}
          </span>
        </div>
        <div className="lu-topbar__actions">
          <Button variant="ghost" size="sm" onClick={() => setConfirmEnd(true)}>
            {t('ludo.endGame')}
          </Button>
          <Button variant="ghost" size="sm" onClick={onExit}>
            {t('ludo.exit')}
          </Button>
        </div>
      </div>

      <div className="lu-dice-row">
        <button
          type="button"
          className={`lu-dice${rolling ? ' lu-dice--rolling' : ''}`}
          disabled={!canRoll}
          onClick={doRoll}
          aria-label={t('ludo.rollDice')}
        >
          <span aria-hidden>{DICE_FACES[dice - 1] ?? '⚅'}</span>
        </button>
      </div>

      <div className="lu-message" aria-live="polite">
        {message ?? (rolling ? t('ludo.rolling') : ' ')}
      </div>

      {pendingMoves && !current.isBot && (
        <div className="lu-moves" role="group" aria-label={t('ludo.chooseToken')}>
          {pendingMoves.map((m) => (
            <Button
              key={m.token}
              variant="secondary"
              size="lg"
              fullWidth
              onClick={() => applyChosen(game, game.turn, m, pendingRoll)}
            >
              {describeMove(game, m, pendingRoll)}
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
            {p.isBot ? `${t('ludo.botBadge')} ` : ''}
            {p.name}: {fmt(t('ludo.tokensHome'), { count: finishedCount(p) })}
          </span>
        ))}
      </div>

      <ConfirmDialog
        open={confirmEnd}
        title={t('ludo.endGameTitle')}
        message={t('ludo.endGameMessage')}
        confirmLabel={t('ludo.endGameConfirm')}
        cancelLabel={t('ludo.cancel')}
        onConfirm={endGameNow}
        onCancel={() => setConfirmEnd(false)}
        danger
      />
    </div>
  );
}
