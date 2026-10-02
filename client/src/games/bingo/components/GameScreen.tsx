// Bingo (75-ball) game screen: setup (name + computer opponents) then play.
// The caller auto-draws every ~3s with elapsed-time catch-up, so a
// backgrounded tab never stalls the game. Bots daub every ball perfectly
// but wait 0.5–2.5s before claiming — a fast human can beat them to CLAIM.
import { useEffect, useMemo, useRef, useState } from 'react';
import type { GameScreenProps } from '../../types.ts';
import { useI18n } from '../../../i18n/index.ts';
import { Avatar, Button, Card } from '../../../shared/ui/index.ts';
import { playSound } from '../../../shared/sound.ts';
import { track } from '../../../shared/analytics.ts';
import {
  randomExampleName,
  randomExampleNames,
} from '../../../shared/names.ts';
import {
  COLUMNS,
  FREE_COL,
  FREE_ROW,
  TOTAL_BALLS,
  bestPattern,
  checkPatterns,
  generateCard,
  patternProgress,
  shuffledBalls,
  type Ball,
  type BingoCard,
  type PatternId,
} from '../logic/bingo.ts';
import { botClaimDelay, botDaubedCount } from '../logic/bot.ts';
import './bingo.css';

type Phase = 'setup' | 'play';

interface Seat {
  name: string;
  isBot: boolean;
  card: BingoCard;
  color: string;
}

interface Winner {
  name: string;
  pattern: PatternId;
  isBot: boolean;
}

const DRAW_MS = 3000;
const MAX_BOTS = 5;
const SEAT_COLORS = [
  '#4f46e5',
  '#16a34a',
  '#dc2626',
  '#d97706',
  '#0ea5e9',
  '#7c3aed',
];

/** Fill {placeholders} in a translated template (i18n has no interpolation). */
function fmt(template: string, vars: Record<string, string | number>): string {
  let out = template;
  for (const [k, v] of Object.entries(vars)) {
    out = out.split(`{${k}}`).join(String(v));
  }
  return out;
}

function patternNameKey(p: PatternId): string {
  switch (p) {
    case 'line':
      return 'bingo.patternLine';
    case 'four-corners':
      return 'bingo.patternFourCorners';
    case 'blackout':
      return 'bingo.patternBlackout';
  }
}

export default function GameScreen({
  onFinish,
  onExit,
}: GameScreenProps): JSX.Element {
  const { t } = useI18n();

  const [phase, setPhase] = useState<Phase>('setup');
  const [playerName, setPlayerName] = useState('');
  const [botCount, setBotCount] = useState(MAX_BOTS);
  const namePh = useMemo(() => randomExampleName(), []);
  const botNames = useMemo(() => randomExampleNames(botCount), [botCount]);

  const [seats, setSeats] = useState<Seat[]>([]);
  const [ballQueue, setBallQueue] = useState<Ball[]>([]);
  const [drawnCount, setDrawnCount] = useState(0);
  const [humanDaubed, setHumanDaubed] = useState<Set<number>>(new Set());
  const [paused, setPaused] = useState(false);
  const [winner, setWinner] = useState<Winner | null>(null);

  const timersRef = useRef<number[]>([]);
  const lastDrawAt = useRef(0);
  const drawnCountRef = useRef(0);
  const pausedRef = useRef(false);
  const winnerRef = useRef<Winner | null>(null);
  const scheduledRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      for (const id of timers) {
        window.clearTimeout(id);
        window.clearInterval(id);
      }
    };
  }, []);

  useEffect(() => {
    drawnCountRef.current = drawnCount;
  }, [drawnCount]);

  function after(ms: number, fn: () => void): void {
    timersRef.current.push(window.setTimeout(fn, ms));
  }

  // Auto-caller with elapsed-time catch-up: if the tab was backgrounded,
  // every missed 3s window draws on return instead of stalling.
  useEffect(() => {
    if (phase !== 'play') return;
    lastDrawAt.current = Date.now();
    const id = window.setInterval(() => {
      if (winnerRef.current) return;
      const now = Date.now();
      if (pausedRef.current) {
        lastDrawAt.current = now;
        return;
      }
      let elapsed = now - lastDrawAt.current;
      let draws = 0;
      while (
        elapsed >= DRAW_MS &&
        drawnCountRef.current + draws < TOTAL_BALLS
      ) {
        draws += 1;
        elapsed -= DRAW_MS;
      }
      if (draws > 0) {
        lastDrawAt.current = now - elapsed;
        setDrawnCount((prev) => Math.min(TOTAL_BALLS, prev + draws));
        playSound('pop');
      }
    }, 500);
    timersRef.current.push(id);
    return () => window.clearInterval(id);
  }, [phase]);

  const drawnSet = useMemo(() => {
    const s = new Set<number>();
    for (let i = 0; i < drawnCount; i += 1) {
      const b = ballQueue[i];
      if (b) s.add(b.n);
    }
    return s;
  }, [ballQueue, drawnCount]);

  const currentBall: Ball | null =
    drawnCount > 0 ? (ballQueue[drawnCount - 1] ?? null) : null;
  const recentBalls = useMemo(
    () =>
      ballQueue
        .slice(Math.max(0, drawnCount - 6), Math.max(0, drawnCount - 1))
        .reverse(),
    [ballQueue, drawnCount],
  );

  function declareWinner(
    name: string,
    pattern: PatternId,
    isBot: boolean,
  ): void {
    if (winnerRef.current) return;
    const w: Winner = { name, pattern, isBot };
    winnerRef.current = w;
    setWinner(w);
    playSound('win');
    track('game_completed', { game: 'bingo' });
    after(1700, () => {
      onFinish({
        title: fmt(t('bingo.winner'), { name }),
        winner: name,
        lines: [
          {
            label: t('bingo.winPattern'),
            value: t(patternNameKey(pattern)),
          },
          {
            label: t('bingo.ballsToWin'),
            value: String(drawnCountRef.current),
          },
        ],
      });
    });
  }

  // Bots daub everything instantly; schedule their claim with a human-like
  // delay so a sharp player can beat them to the button.
  useEffect(() => {
    if (phase !== 'play' || winner || drawnCount === 0) return;
    seats.forEach((seat, i) => {
      if (!seat.isBot || scheduledRef.current.has(i)) return;
      const best = bestPattern(checkPatterns(seat.card, drawnSet));
      if (!best) return;
      scheduledRef.current.add(i);
      after(botClaimDelay(), () => {
        if (winnerRef.current) return;
        playSound('correct');
        declareWinner(seat.name, best, true);
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drawnCount]);

  const human = seats[0];
  const humanPatterns = useMemo(() => {
    if (!human || human.isBot || winner) return [];
    return checkPatterns(human.card, humanDaubed);
  }, [human, humanDaubed, winner]);

  function startGame(): void {
    const raw = playerName.trim();
    const list: Seat[] = [
      {
        name: raw === '' ? namePh : raw,
        isBot: false,
        card: generateCard(),
        color: SEAT_COLORS[0]!,
      },
    ];
    botNames.forEach((bn, i) => {
      list.push({
        name: bn,
        isBot: true,
        card: generateCard(),
        color: SEAT_COLORS[(i + 1) % SEAT_COLORS.length]!,
      });
    });
    setSeats(list);
    setBallQueue(shuffledBalls());
    setDrawnCount(0);
    setHumanDaubed(new Set());
    setPaused(false);
    pausedRef.current = false;
    setWinner(null);
    winnerRef.current = null;
    scheduledRef.current = new Set();
    setPhase('play');
    track('game_started', { game: 'bingo' });
    playSound('click');
  }

  function togglePause(): void {
    const next = !paused;
    pausedRef.current = next;
    setPaused(next);
    playSound('click');
  }

  function handleDaub(n: number): void {
    if (winner || drawnCount === 0) return;
    if (!drawnSet.has(n) || humanDaubed.has(n)) return; // mis-daub ignored
    playSound('click');
    setHumanDaubed((prev) => new Set(prev).add(n));
  }

  function handleClaim(p: PatternId): void {
    const seat = seats[0];
    if (!seat || winner) return;
    // Re-validate: the button only appears for completed patterns.
    if (!checkPatterns(seat.card, humanDaubed).includes(p)) return;
    playSound('correct');
    declareWinner(seat.name, p, false);
  }

  function cellAriaLabel(v: number | null): string {
    if (v === null) return t('bingo.free');
    if (humanDaubed.has(v)) return fmt(t('bingo.cellDaubed'), { n: v });
    if (drawnSet.has(v)) return fmt(t('bingo.cellCalled'), { n: v });
    return fmt(t('bingo.cellNotCalled'), { n: v });
  }

  if (phase === 'setup') {
    return (
      <div className="bg-wrap">
        <Card title={t('games.bingo.name')}>
          <p className="bg-desc">{t('games.bingo.desc')}</p>
          <div className="bg-field">
            <label className="bg-label" htmlFor="bg-name">
              {t('bingo.yourName')}
            </label>
            <input
              id="bg-name"
              value={playerName}
              placeholder={namePh}
              maxLength={20}
              autoComplete="off"
              onChange={(e) => setPlayerName(e.target.value)}
            />
          </div>
          <div className="bg-field">
            <span className="bg-label">{t('bingo.bots')}</span>
            <div
              className="bg-count-row"
              role="group"
              aria-label={t('bingo.bots')}
            >
              {[1, 2, 3, 4, 5].map((n) => (
                <Button
                  key={n}
                  variant={botCount === n ? 'primary' : 'secondary'}
                  size="md"
                  onClick={() => setBotCount(n)}
                >
                  {n}
                </Button>
              ))}
            </div>
          </div>
          <ul className="bg-seats" aria-label={t('bingo.bots')}>
            <li className="bg-seat">
              <Avatar name={playerName.trim() || namePh} color={SEAT_COLORS[0]} size={32} />
              <span>{playerName.trim() || namePh}</span>
              <span className="bg-seat__tag" aria-hidden>
                🙂
              </span>
            </li>
            {botNames.map((bn, i) => (
              <li className="bg-seat" key={bn}>
                <Avatar
                  name={bn}
                  color={SEAT_COLORS[(i + 1) % SEAT_COLORS.length]}
                  size={32}
                />
                <span>{bn}</span>
                <span className="bg-seat__tag" aria-hidden>
                  🤖
                </span>
              </li>
            ))}
          </ul>
          <p className="bg-muted">{t('bingo.computerThinking')}</p>
          <Button variant="primary" size="lg" fullWidth onClick={startGame}>
            {t('bingo.startGame')}
          </Button>
        </Card>
      </div>
    );
  }

  if (!human) return <></>;
  const bots = seats.slice(1);

  return (
    <div className="bg-wrap">
      <div className="bg-topbar">
        <span className="bg-title">🔢 {t('games.bingo.name')}</span>
        <div className="bg-topbar__actions">
          <Button variant="secondary" size="sm" onClick={togglePause}>
            {paused ? t('bingo.callResume') : t('bingo.callPaused')}
          </Button>
          <Button variant="ghost" size="sm" onClick={onExit}>
            {t('bingo.exitGame')}
          </Button>
        </div>
      </div>

      {winner ? (
        <div className="bg-winbanner" aria-live="polite">
          {winner.isBot
            ? fmt(t('bingo.botClaimed'), {
                name: winner.name,
                pattern: t(patternNameKey(winner.pattern)),
              })
            : fmt(t('bingo.winner'), { name: winner.name })}
        </div>
      ) : null}

      <Card>
        <div className="bg-caller">
          <div
            className="bg-ball"
            key={currentBall ? currentBall.n : 'none'}
            aria-live="polite"
            aria-label={
              currentBall
                ? `${currentBall.letter} ${currentBall.n}`
                : t('bingo.waitingFirstBall')
            }
          >
            {currentBall ? (
              <>
                <span className="bg-ball__letter">{currentBall.letter}</span>
                <span className="bg-ball__num">{currentBall.n}</span>
              </>
            ) : (
              <span className="bg-ball__waiting">
                {t('bingo.waitingFirstBall')}
              </span>
            )}
          </div>
          <div className="bg-caller__meta">
            <div className="bg-recent" aria-label={t('bingo.recentBalls')}>
              {recentBalls.map((b) => (
                <span key={b.n} className="bg-chip">
                  {b.letter}
                  {b.n}
                </span>
              ))}
            </div>
            <div className="bg-count" aria-live="polite">
              <strong>{drawnCount}</strong> / {TOTAL_BALLS}
            </div>
          </div>
        </div>
      </Card>

      {!human.isBot ? (
        <Card title={t('bingo.yourCard')}>
          <p className="bg-hint">{t('bingo.daubHint')}</p>
          <div className="bg-grid" role="group" aria-label={t('bingo.yourCard')}>
            {COLUMNS.map((c) => (
              <div
                key={c.letter}
                className={`bg-colhead bg-colhead--${c.letter}`}
                aria-hidden="true"
              >
                {c.letter}
              </div>
            ))}
            {human.card.map((row, r) =>
              row.map((v, c) => {
                const isFree = r === FREE_ROW && c === FREE_COL;
                const daubed = isFree || (v !== null && humanDaubed.has(v));
                const called = v !== null && drawnSet.has(v);
                const cls =
                  'bg-cell' +
                  (daubed ? ' bg-cell--daubed' : '') +
                  (isFree ? ' bg-cell--free' : '') +
                  (called && !daubed ? ' bg-cell--called' : '');
                return (
                  <button
                    type="button"
                    key={`${r}-${c}`}
                    className={cls}
                    disabled={isFree || daubed || !called}
                    aria-pressed={daubed}
                    aria-label={cellAriaLabel(v)}
                    onClick={() => {
                      if (v !== null) handleDaub(v);
                    }}
                  >
                    <span className="bg-cell__num">
                      {isFree ? t('bingo.free') : v}
                    </span>
                  </button>
                );
              }),
            )}
          </div>
        </Card>
      ) : null}

      {humanPatterns.length > 0 ? (
        <div className="bg-claims">
          <p className="bg-claimhint">
            {fmt(t('bingo.claimHint'), {
              pattern: t(patternNameKey(humanPatterns[0]!)),
            })}
          </p>
          {humanPatterns.map((p) => (
            <div className="bg-claim" key={p}>
              <Button
                variant="success"
                size="lg"
                fullWidth
                onClick={() => handleClaim(p)}
              >
                {fmt(t('bingo.claim'), {
                  pattern: t(patternNameKey(p)),
                })}
              </Button>
            </div>
          ))}
        </div>
      ) : null}

      {bots.length > 0 ? (
        <Card title={t('bingo.bots')}>
          <div className="bg-bots">
            {bots.map((seat, i) => {
              const prog = patternProgress(seat.card, drawnSet);
              return (
                <div className="bg-bot" key={`${i}-${seat.name}`}>
                  <div className="bg-bot__head">
                    <Avatar name={seat.name} color={seat.color} size={32} />
                    <span className="bg-bot__name">{seat.name}</span>
                    <span className="bg-bot__count">
                      {fmt(t('bingo.botDaubed'), {
                        count: botDaubedCount(seat.card, drawnSet),
                      })}
                    </span>
                  </div>
                  <div className="bg-minigrid" aria-hidden="true">
                    {seat.card.map((row, r) =>
                      row.map((v, c) => {
                        const on =
                          r === FREE_ROW && c === FREE_COL
                            ? true
                            : v !== null && drawnSet.has(v);
                        return (
                          <span
                            key={`${r}-${c}`}
                            className={
                              'bg-minicell' + (on ? ' bg-minicell--on' : '')
                            }
                          />
                        );
                      }),
                    )}
                  </div>
                  <div className="bg-bot__prog">
                    ⚡ {fmt(t('bingo.botProgress'), { covered: prog.line })}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      ) : null}
    </div>
  );
}
