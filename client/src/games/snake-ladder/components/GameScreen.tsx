// Snake & Ladder game screen: setup (player count, names, extra-turn rule)
// then play (dice roll, boustrophedon board, snakes/ladders, win flow).
import { useEffect, useRef, useState } from 'react';
import type { GameScreenProps } from '../../types.ts';
import { useI18n } from '../../../i18n/index.ts';
import { Avatar, Button, Card, ConfirmDialog } from '../../../shared/ui/index.ts';
import { playSound } from '../../../shared/sound.ts';
import { track } from '../../../shared/analytics.ts';
import {
  LADDERS,
  SNAKES,
  rollDice,
  squareToRowCol,
} from '../logic/board.ts';
import { applyRoll, createGame } from '../logic/game.ts';
import type { SlPlayer, SlState } from '../logic/game.ts';
import './snakeladder.css';

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

/** Players sorted by position, leader first. */
function ranked(game: SlState): SlPlayer[] {
  return [...game.players].sort((a, b) => b.pos - a.pos);
}

export default function GameScreen({ onFinish }: GameScreenProps) {
  const { t } = useI18n();

  const [phase, setPhase] = useState<Phase>('setup');
  const [playerCount, setPlayerCount] = useState(2);
  const [names, setNames] = useState<string[]>(['', '', '', '']);
  const [extraTurnOnSix, setExtraTurnOnSix] = useState(true);

  const [game, setGame] = useState<SlState | null>(null);
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
    const resolved = Array.from({ length: playerCount }, (_, i) => {
      const raw = (names[i] ?? '').trim();
      return raw === '' ? `${t('snakeladder.player')} ${i + 1}` : raw;
    });
    setGame(createGame(resolved, extraTurnOnSix));
    setMessage(null);
    setHighlight(null);
    setDice(6);
    setPhase('play');
    track('game_started', { game: 'snake-ladder' });
    playSound('click');
  }

  function finishWithWinner(state: SlState): void {
    const leaders = ranked(state);
    const leader = leaders[0];
    const name = leader ? leader.name : t('snakeladder.endGame');
    onFinish({
      title: fmt(t('snakeladder.winner'), { name }),
      winner: name,
      lines: leaders.map((p) => ({ label: p.name, value: String(p.pos) })),
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
      setGame(next);
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
        playSound('correct');
        setMessage(
          fmt(t('snakeladder.climbedLadder'), {
            name: mover.name,
            square: finalPos,
          }),
        );
      } else if (event === 'snake') {
        playSound('skip');
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
    });
  }

  if (phase === 'setup' || !game) {
    return (
      <div className="sl-wrap">
        <Card title={t('snakeladder.setupTitle')}>
          <div className="sl-setup">
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
                  placeholder={`${t('snakeladder.player')} ${i + 1}`}
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
            <label className="sl-toggle">
              <input
                type="checkbox"
                checked={extraTurnOnSix}
                onChange={(e) => setExtraTurnOnSix(e.target.checked)}
              />
              <span>{t('snakeladder.extraTurn')}</span>
            </label>
            <Button variant="primary" size="lg" fullWidth onClick={startGame}>
              {t('snakeladder.startGame')}
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const current = game.players[game.turn];
  if (!current) return null;
  const turnText = fmt(t('snakeladder.turnOf'), { name: current.name });

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
        {message ?? (rolling ? t('snakeladder.rolling') : ' ')}
      </div>

      <Button
        variant="primary"
        size="lg"
        fullWidth
        disabled={rolling || game.winner !== null}
        onClick={handleRoll}
        ariaLabel={`${t('snakeladder.rollDice')}: ${turnText}`}
      >
        {t('snakeladder.rollDice')}
      </Button>

      <div className="sl-board">
        {CELLS.map(({ n, row, col }) => {
          const tokens: Array<{ p: SlPlayer; i: number }> = [];
          game.players.forEach((p, i) => {
            if (p.pos === n) tokens.push({ p, i });
          });
          return (
            <div
              key={n}
              className={`sl-cell${(row + col) % 2 === 0 ? ' sl-cell-alt' : ''}${highlight === n ? ' sl-cell-hl' : ''}`}
              style={{ gridRow: row + 1, gridColumn: col + 1 }}
            >
              <span className="sl-num">{n}</span>
              {SNAKES[n] !== undefined && (
                <span className="sl-mark" aria-hidden>
                  🐍
                </span>
              )}
              {LADDERS[n] !== undefined && (
                <span className="sl-mark" aria-hidden>
                  🪜
                </span>
              )}
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
      </div>

      <div className="sl-standings" aria-label={t('snakeladder.positions')}>
        {ranked(game).map((p, idx) => (
          <span
            key={`${idx}-${p.name}`}
            className="sl-chip"
            style={{ borderColor: p.color }}
          >
            <i style={{ backgroundColor: p.color }} aria-hidden />
            {p.name}: {p.pos}
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
