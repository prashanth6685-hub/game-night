// Snake & Ladder game screen: setup (player count, names, extra-turn rule)
// then play (dice roll, boustrophedon board, snakes/ladders, win flow).
import { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react';
import type { GameScreenProps } from '../../types.ts';
import { useI18n } from '../../../i18n/index.ts';
import { Avatar, Button, Card, ConfirmDialog } from '../../../shared/ui/index.ts';
import { playSound } from '../../../shared/sound.ts';
import { track } from '../../../shared/analytics.ts';
import {
  applyMove,
  boardSet,
  rollDice,
  squareToRowCol,
} from '../logic/board.ts';
import type { SlDifficulty } from '../logic/board.ts';
import { BoardOverlay, squareCenterPct } from './BoardOverlay.tsx';
import { applyRoll, createGame } from '../logic/game.ts';
import type { SlPlayer, SlState } from '../logic/game.ts';
import './snakeladder.css';
import { randomExampleNames } from '../../../shared/names.ts';
import { initialSlMpState } from '../logic/mpState.ts';

// The multi-phone lobby (QR code, room polling) is only needed when the
// user picks that mode — load it on demand so the base game chunk stays
// small and never depends on the multiplayer module graph to open.
const MpLobby = lazy(() =>
  import('../../../shared/mp/MpLobby.tsx').then((m) => ({ default: m.MpLobby })),
);

type Phase = 'setup' | 'play';

const DICE_FACES = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];

const CELLS: Array<{ n: number; row: number; col: number }> = [];
for (let n = 1; n <= 100; n += 1) {
  const { row, col } = squareToRowCol(n);
  CELLS.push({ n, row, col });
}

/** Fill {placeholders} in a translated template (i18n has no interpolation). */
function fmt(template: string, vars: Record<string, string | number>): string {
  let out = template;
  for (const [k, v] of Object.entries(vars)) {
    out = out.split(`{${k}}`).join(String(v));
  }
  return out;
}

/** Players sorted by position, leader first (keeps original index for bot flags). */
function ranked(game: SlState): Array<{ p: SlPlayer; i: number }> {
  return game.players
    .map((p, i) => ({ p, i }))
    .sort((a, b) => b.p.pos - a.p.pos);
}

export default function GameScreen({ onFinish }: GameScreenProps) {
  const { t } = useI18n();

  const [phase, setPhase] = useState<Phase>('setup');
  const [playerCount, setPlayerCount] = useState(2);
  const [names, setNames] = useState<string[]>(['', '', '', '']);
  const namePhs = useMemo(() => randomExampleNames(playerCount), [playerCount]);
  const [extraTurnOnSix, setExtraTurnOnSix] = useState(true);
  const [vsComputer, setVsComputer] = useState(false);
  const [mpMode, setMpMode] = useState(false);
  const [showMpLobby, setShowMpLobby] = useState(false);
  /** Bot names for seats 2-4 in vs-computer mode (stable for the setup screen). */
  const botNames = useMemo(() => randomExampleNames(3), []);
  /** Player indices that are computer-controlled in the running game. */
  const [botIdx, setBotIdx] = useState<Set<number>>(new Set());

  const [game, setGame] = useState<SlState | null>(null);
  const [difficulty, setDifficulty] = useState<SlDifficulty>('medium');
  const [anim, setAnim] = useState<{
    idx: number;
    square: number;
    glide: boolean;
  } | null>(null);
  const [dice, setDice] = useState(6);
  const [rolling, setRolling] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [highlight, setHighlight] = useState<number | null>(null);
  const [confirmEnd, setConfirmEnd] = useState(false);

  const timersRef = useRef<number[]>([]);
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

  function every(ms: number, fn: () => void): number {
    const id = window.setInterval(fn, ms);
    timersRef.current.push(id);
    return id;
  }

  function startGame(): void {
    let resolved: string[];
    let bots: Set<number>;
    if (vsComputer) {
      const raw = (names[0] ?? '').trim();
      const human = raw === '' ? `${t('snakeladder.player')} 1` : raw;
      resolved = [human, ...botNames];
      bots = new Set([1, 2, 3]);
    } else {
      resolved = Array.from({ length: playerCount }, (_, i) => {
        const raw = (names[i] ?? '').trim();
        return raw === '' ? `${t('snakeladder.player')} ${i + 1}` : raw;
      });
      bots = new Set();
    }
    setBotIdx(bots);
    setGame(createGame(resolved, extraTurnOnSix, difficulty));
    setAnim(null);
    setMessage(null);
    setHighlight(null);
    setDice(6);
    setPhase('play');
    track('game_started', {
      game: 'snake-ladder',
      vsComputer,
    });
    playSound('click');
  }

  function finishWithWinner(state: SlState): void {
    const leaders = ranked(state);
    const leader = leaders[0];
    const name = leader ? leader.p.name : t('snakeladder.endGame');
    onFinish({
      title: fmt(t('snakeladder.winner'), { name }),
      winner: name,
      lines: leaders.map(({ p }) => ({ label: p.name, value: String(p.pos) })),
    });
  }

  function endGameNow(): void {
    const g = game;
    if (!g) return;
    setConfirmEnd(false);
    track('game_abandoned', { game: 'snake-ladder' });
    finishWithWinner(g);
  }

  function handleRoll(): void {
    const g = game;
    if (!g || rolling || g.winner !== null) return;
    const moverIdx = g.turn;
    const mover = g.players[moverIdx];
    if (!mover) return;

    playSound('dice');
    setRolling(true);
    setMessage(null);
    setHighlight(null);

    const iv = every(90, () => setDice(rollDice()));
    after(600, () => {
      window.clearInterval(iv);
      const roll = rollDice();
      setDice(roll);
      const { state: next, event, extraTurn } = applyRoll(g, roll);
      const moved = next.players[moverIdx];
      const finalPos = moved ? moved.pos : mover.pos;
      // Square the token landed on before any snake/ladder applies.
      const landed = applyMove(mover.pos, roll, boardSet(g.difficulty)).from;

      const finish = (): void => {
        setGame(next);
        setAnim(null);
        setRolling(false);
        setHighlight(finalPos);
        after(1100, () =>
          setHighlight((h) => (h === finalPos ? null : h)),
        );

        if (next.winner !== null) {
          const w = next.players[next.winner];
          const wName = w ? w.name : mover.name;
          playSound('win');
          setMessage(fmt(t('snakeladder.winner'), { name: wName }));
          track('game_completed', { game: 'snake-ladder' });
          after(1400, () => finishWithWinner(next));
          return;
        }
        if (event === 'ladder') {
          setMessage(
            fmt(t('snakeladder.climbedLadder'), {
              name: mover.name,
              square: finalPos,
            }),
          );
        } else if (event === 'snake') {
          setMessage(
            fmt(t('snakeladder.slidSnake'), {
              name: mover.name,
              square: finalPos,
            }),
          );
        } else if (finalPos === mover.pos) {
          // Overshot 100: exact roll needed, token stayed put.
          setMessage(fmt(t('snakeladder.stayedPut'), { name: mover.name }));
        } else if (extraTurn) {
          setMessage(t('snakeladder.extraTurnNote'));
        }
      };

      // Walk the token square by square so everyone sees the journey,
      // then glide it up the ladder / down the snake across the board.
      const steps: number[] = [];
      for (let s = mover.pos + 1; s <= landed; s += 1) steps.push(s);
      if (steps.length === 0) {
        finish();
        return;
      }
      let i = 0;
      setAnim({ idx: moverIdx, square: mover.pos, glide: false });
      const stepIv = every(190, () => {
        const s = steps[i];
        if (s === undefined) {
          window.clearInterval(stepIv);
          return;
        }
        setAnim({ idx: moverIdx, square: s, glide: false });
        i += 1;
        if (i >= steps.length) {
          window.clearInterval(stepIv);
          if (event) {
            playSound(event === 'ladder' ? 'correct' : 'skip');
            after(220, () => {
              setAnim({ idx: moverIdx, square: finalPos, glide: true });
              after(780, finish);
            });
          } else {
            after(120, finish);
          }
        }
      });
    });
  }

  if (showMpLobby) {
    const hostName = (names[0] ?? '').trim() || (namePhs[0] ?? 'Player 1');
    return (
      <div className="sl-wrap">
        <Suspense fallback={<p style={{ textAlign: 'center' }}>{t('common.loading')}</p>}>
        <MpLobby
          gameId="snake-ladder"
          hostName={hostName}
          config={{ extraTurnOnSix, difficulty }}
          minPlayers={2}
          maxPlayers={4}
          buildInitialState={(players) =>
            initialSlMpState(
              [...players].sort((a, b) => a.seat - b.seat).map((p) => p.name),
              { extraTurnOnSix, difficulty },
            )
          }
          onStart={(s) => {
            window.location.hash = `#/mp/snake-ladder/${s.code}`;
          }}
          onCancel={() => setShowMpLobby(false)}
        />
        </Suspense>
      </div>
    );
  }

  if (phase === 'setup' || !game) {
    return (
      <div className="sl-wrap">
        <Card title={t('snakeladder.setupTitle')}>
          <div className="sl-setup">
            <div
              className="sl-count-row"
              role="group"
              aria-label={t('snakeladder.vsComputer')}
            >
              <Button
                variant={!vsComputer && !mpMode ? 'primary' : 'secondary'}
                size="md"
                onClick={() => {
                  setVsComputer(false);
                  setMpMode(false);
                }}
              >
                👥 {t('snakeladder.passAndPlay')}
              </Button>
              <Button
                variant={vsComputer && !mpMode ? 'primary' : 'secondary'}
                size="md"
                onClick={() => {
                  setVsComputer(true);
                  setMpMode(false);
                }}
              >
                🖥 {t('snakeladder.vsComputer')}
              </Button>
              <Button
                variant={mpMode ? 'primary' : 'secondary'}
                size="md"
                onClick={() => {
                  setMpMode(true);
                  setVsComputer(false);
                }}
              >
                📲 {t('mp.multiPhone')}
              </Button>
            </div>
            {mpMode ? (
              <div className="sl-field">
                <label className="sl-label" htmlFor="sl-name-0">
                  {t('mp.yourName')}
                </label>
                <input
                  id="sl-name-0"
                  value={names[0] ?? ''}
                  placeholder={namePhs[0] ?? ''}
                  maxLength={20}
                  autoComplete="off"
                  onChange={(e) =>
                    setNames((prev) =>
                      prev.map((v, j) => (j === 0 ? e.target.value : v)),
                    )
                  }
                />
                <p className="sl-label">{t('mp.multiPhoneDesc')}</p>
              </div>
            ) : vsComputer ? (
              <>
                <div className="sl-field">
                  <label className="sl-label" htmlFor="sl-name-0">
                    {t('snakeladder.playerName')} 1
                  </label>
                  <input
                    id="sl-name-0"
                    value={names[0] ?? ''}
                    placeholder={namePhs[0] ?? ''}
                    maxLength={20}
                    autoComplete="off"
                    onChange={(e) =>
                      setNames((prev) =>
                        prev.map((v, j) => (j === 0 ? e.target.value : v)),
                      )
                    }
                  />
                </div>
                <div className="sl-field">
                  <span className="sl-label">{t('snakeladder.computerOpponents')}</span>
                  <div className="sl-bots">
                    {botNames.map((b, k) => (
                      <span key={k} className="sl-chip">
                        🤖 {b}
                      </span>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="sl-field">
                  <span className="sl-label">{t('snakeladder.playerCount')}</span>
                  <div
                    className="sl-count-row"
                    role="group"
                    aria-label={t('snakeladder.playerCount')}
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
                {Array.from({ length: playerCount }, (_, i) => (
                  <div className="sl-field" key={i}>
                    <label className="sl-label" htmlFor={`sl-name-${i}`}>
                      {t('snakeladder.playerName')} {i + 1}
                    </label>
                    <input
                      id={`sl-name-${i}`}
                      value={names[i] ?? ''}
                      placeholder={namePhs[i] ?? ''}
                      maxLength={20}
                      autoComplete="off"
                      onChange={(e) =>
                        setNames((prev) =>
                          prev.map((v, j) => (j === i ? e.target.value : v)),
                        )
                      }
                    />
                  </div>
                ))}
              </>
            )}
            <div className="sl-field">
              <span className="sl-label">{t('snakeladder.difficulty')}</span>
              <div
                className="sl-count-row"
                role="group"
                aria-label={t('snakeladder.difficulty')}
              >
                {(
                  [
                    ['easy', t('snakeladder.easy')],
                    ['medium', t('snakeladder.medium')],
                    ['hard', t('snakeladder.hard')],
                  ] as Array<[SlDifficulty, string]>
                ).map(([d, label]) => (
                  <Button
                    key={d}
                    variant={difficulty === d ? 'primary' : 'secondary'}
                    size="md"
                    onClick={() => setDifficulty(d)}
                  >
                    {label}
                  </Button>
                ))}
              </div>
              <span className="sl-label" style={{ fontWeight: 400 }}>
                {difficulty === 'easy'
                  ? t('snakeladder.easyDesc')
                  : difficulty === 'hard'
                    ? t('snakeladder.hardDesc')
                    : t('snakeladder.mediumDesc')}
              </span>
            </div>
            <label className="sl-toggle">
              <input
                type="checkbox"
                checked={extraTurnOnSix}
                onChange={(e) => setExtraTurnOnSix(e.target.checked)}
              />
              <span>{t('snakeladder.extraTurn')}</span>
            </label>
            <Button
              variant="primary"
              size="lg"
              fullWidth
              onClick={() => {
                if (mpMode) {
                  playSound('click');
                  setShowMpLobby(true);
                } else {
                  startGame();
                }
              }}
            >
              {mpMode ? `📲 ${t('mp.createRoom')}` : t('snakeladder.startGame')}
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const current = game.players[game.turn];
  const isBotTurn =
    current !== undefined && botIdx.has(game.turn) && game.winner === null;

  // Computer players roll automatically after a short "thinking" pause.
  // The effect re-fires after every move, so extra turns chain naturally.
  const rollRef = useRef(handleRoll);
  rollRef.current = handleRoll;
  useEffect(() => {
    if (!isBotTurn || rolling) return;
    const id = window.setTimeout(() => rollRef.current(), 1100);
    return () => window.clearTimeout(id);
  }, [isBotTurn, rolling, game]);

  if (!current) return null;
  const turnText = fmt(t('snakeladder.turnOf'), {
    name: isBotTurn ? `🤖 ${current.name}` : current.name,
  });

  return (
    <div className="sl-wrap">
      <div className="sl-topbar">
        <div className="sl-turn">
          <Avatar name={current.name} color={current.color} size={44} />
          <span className="sl-turn-text">{turnText}</span>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setConfirmEnd(true)}>
          {t('snakeladder.endGame')}
        </Button>
      </div>

      <div className="sl-dice-row">
        <span
          className={`sl-dice${rolling ? ' sl-dice-rolling' : ''}`}
          aria-hidden
        >
          {DICE_FACES[dice - 1] ?? '⚄'}
        </span>
      </div>

      <div className="sl-message" aria-live="polite">
        {message ??
          (isBotTurn
            ? fmt(t('snakeladder.botThinking'), { name: current.name })
            : rolling
              ? t('snakeladder.rolling')
              : '\u00a0')}
      </div>

      <Button
        variant="primary"
        size="lg"
        fullWidth
        disabled={rolling || game.winner !== null || isBotTurn}
        onClick={handleRoll}
        ariaLabel={`${t('snakeladder.rollDice')}: ${turnText}`}
      >
        {isBotTurn
          ? fmt(t('snakeladder.botThinking'), { name: current.name })
          : t('snakeladder.rollDice')}
      </Button>

      <div className="sl-board">
        {CELLS.map(({ n, row, col }) => {
          const tokens: Array<{ p: SlPlayer; i: number }> = [];
          game.players.forEach((p, i) => {
            if (p.pos === n && anim?.idx !== i) tokens.push({ p, i });
          });
          return (
            <div
              key={n}
              className={`sl-cell${(row + col) % 2 === 0 ? ' sl-cell-alt' : ''}${highlight === n ? ' sl-cell-hl' : ''}`}
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
        {anim && anim.square >= 1 && (
          <span
            className={`sl-anim-token${anim.glide ? ' glide' : ' hop'}`}
            style={{
              ...squareCenterPct(anim.square),
              backgroundColor: game.players[anim.idx]?.color ?? '#888',
            }}
            aria-hidden
          >
            {(game.players[anim.idx]?.name.trim().charAt(0).toUpperCase() ?? '?') || '?'}
          </span>
        )}
      </div>

      <div className="sl-standings" aria-label={t('snakeladder.positions')}>
        {ranked(game).map(({ p, i }, idx) => (
          <span
            key={`${idx}-${p.name}`}
            className="sl-chip"
            style={{ borderColor: p.color }}
          >
            <i style={{ backgroundColor: p.color }} aria-hidden />
            {botIdx.has(i) ? '🤖 ' : ''}{p.name}: {p.pos}
          </span>
        ))}
      </div>

      <ConfirmDialog
        open={confirmEnd}
        title={t('snakeladder.endGameTitle')}
        message={t('snakeladder.endGameMessage')}
        confirmLabel={t('snakeladder.endGameConfirm')}
        cancelLabel={t('snakeladder.cancel')}
        onConfirm={endGameNow}
        onCancel={() => setConfirmEnd(false)}
        danger
      />
    </div>
  );
}
