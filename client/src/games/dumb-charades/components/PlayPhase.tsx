// Play phase: hidden word card (actor only), timer, correct/skip scoring,
// team rotation, scoreboard, and end-of-game results.
import { useEffect, useRef, useState } from 'react';
import { useI18n } from '../../../i18n/index.ts';
import {
  Button,
  Card,
  ConfirmDialog,
  Scoreboard,
  Timer,
} from '../../../shared/ui/index.ts';
import { playSound } from '../../../shared/sound.ts';
import { track } from '../../../shared/analytics.ts';
import { PACKS } from '../data/index.ts';
import { buildPool } from '../logic/pool.ts';
import { createDeck } from '../logic/deck.ts';
import type { Deck } from '../logic/deck.ts';
import {
  completedRounds,
  isGameOver,
  isTie,
  nextTeamIndex,
  winnerIndex,
} from '../logic/turns.ts';
import type { CharadesItem } from '../data/types.ts';
import type { GameResult } from '../../types.ts';
import type { CharadesSetup, CharadesTeams } from './GameScreen.tsx';

interface PlayPhaseProps {
  setup: CharadesSetup;
  teams: CharadesTeams;
  onFinish: (result: GameResult) => void;
}

const TEAM_COLORS = ['#4f46e5', '#16a34a', '#f59e0b', '#dc2626'];
/** Pause between "Time's up!" and the automatic turn rotation. */
const TIMEUP_DELAY_MS = 2500;

export default function PlayPhase({ setup, teams, onFinish }: PlayPhaseProps) {
  const { t } = useI18n();

  // The deck lives in a ref: created once per game, never rebuilt by renders.
  const deckRef = useRef<Deck | null>(null);
  if (deckRef.current === null) {
    deckRef.current = createDeck(
      buildPool(PACKS, {
        language: setup.language,
        category: setup.category,
        difficulty: setup.difficulty,
      }),
    );
  }

  const teamCount = teams.names.length;
  const [item, setItem] = useState<CharadesItem | null>(() =>
    deckRef.current ? deckRef.current.next() : null,
  );
  const [revealed, setRevealed] = useState(false);
  const [scores, setScores] = useState<number[]>(() =>
    teams.names.map(() => 0),
  );
  const [teamIdx, setTeamIdx] = useState(0);
  const [turnsCompleted, setTurnsCompleted] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerStarted, setTimerStarted] = useState(false);
  const [timerKey, setTimerKey] = useState(0);
  const [timeUp, setTimeUp] = useState(false);
  const [confirmEnd, setConfirmEnd] = useState(false);

  const timeoutRef = useRef<number | null>(null);
  useEffect(
    () => () => {
      if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
    },
    [],
  );

  const drawNext = (): void => {
    const deck = deckRef.current;
    setItem(deck ? deck.next() : null);
    setRevealed(false);
  };

  const finishGame = (finalScores: number[], turnsDone: number): void => {
    playSound('win');
    track('game_completed', { game: 'dumb-charades' });
    const names = teams.names;
    const pts = t('charades.pts');
    const w = winnerIndex(finalScores);
    const tie = isTie(finalScores);
    const title = tie
      ? `🤝 ${t('charades.tie')}`
      : `🎉 ${names[w]} ${t('charades.wins')}`;
    const winner = tie
      ? undefined
      : `${names[w]} · ${finalScores[w] ?? 0} ${pts}`;
    const lines = names.map((n, i) => ({
      label: n,
      value: `${finalScores[i] ?? 0} ${pts}`,
    }));
    if (teams.rounds !== null) {
      lines.push({
        label: t('charades.rounds'),
        value: String(completedRounds(turnsDone, names.length)),
      });
    }
    onFinish({ title, winner, lines });
  };

  const endTurn = (): void => {
    const turnsDone = turnsCompleted + 1;
    if (isGameOver(turnsDone, teamCount, teams.rounds)) {
      finishGame(scores, turnsDone);
      return;
    }
    playSound('click');
    setTurnsCompleted(turnsDone);
    setTeamIdx(nextTeamIndex(teamIdx, teamCount));
    setTimerRunning(false);
    setTimerStarted(false);
    setTimerKey((k) => k + 1);
    setTimeUp(false);
    drawNext();
  };

  // endTurn is invoked from a setTimeout; always call the latest closure.
  const endTurnRef = useRef(endTurn);
  useEffect(() => {
    endTurnRef.current = endTurn;
  });

  const handleTimeUp = (): void => {
    setTimerRunning(false);
    setTimeUp(true);
    playSound('skip');
    timeoutRef.current = window.setTimeout(() => {
      endTurnRef.current();
    }, TIMEUP_DELAY_MS);
  };

  const handleTick = (remaining: number): void => {
    if (remaining <= 5 && remaining > 0) playSound('tick');
  };

  const handleCorrect = (): void => {
    playSound('correct');
    setScores((prev) =>
      prev.map((s, i) => (i === teamIdx ? s + 1 : s)),
    );
    drawNext();
  };

  const handleSkip = (): void => {
    playSound('skip');
    drawNext();
  };

  const startTimer = (): void => {
    playSound('click');
    setTimerStarted(true);
    setTimerRunning(true);
  };

  const pauseTimer = (): void => {
    playSound('click');
    setTimerRunning(false);
  };

  const resumeTimer = (): void => {
    playSound('click');
    setTimerRunning(true);
  };

  const timerAction = !timerStarted
    ? startTimer
    : timerRunning
      ? pauseTimer
      : resumeTimer;
  const timerActionLabel = !timerStarted
    ? t('charades.startTimer')
    : timerRunning
      ? t('charades.pause')
      : t('charades.resume');

  const wordMain = item ? (item.display ?? item.name) : '';
  const wordSub =
    item && item.display && item.display !== item.name
      ? item.name
      : undefined;

  const roundChip =
    teams.rounds === null
      ? `${t('charades.turn')} ${turnsCompleted + 1}`
      : `${t('charades.round')} ${completedRounds(turnsCompleted, teamCount) + 1}/${teams.rounds}`;

  const entries = teams.names.map((name, i) => ({
    name,
    score: scores[i] ?? 0,
    color: TEAM_COLORS[i % TEAM_COLORS.length],
  }));

  return (
    <div className="ch-screen">
      <div className="ch-banner">
        <span className="ch-banner-team">
          <span
            className="ch-team-dot"
            style={{
              background: TEAM_COLORS[teamIdx % TEAM_COLORS.length],
            }}
          />
          {teams.names[teamIdx]}
        </span>
        <span className="ch-chip">{roundChip}</span>
      </div>

      <Card>
        {timeUp ? (
          <div className="ch-wordcard">
            <div className="ch-timeup">⏰ {t('charades.timeUp')}</div>
          </div>
        ) : item ? (
          <div className="ch-wordcard">
            {!revealed ? (
              <>
                <button
                  type="button"
                  className="ch-word-hidden"
                  onClick={() => {
                    playSound('click');
                    setRevealed(true);
                  }}
                >
                  👁 {t('charades.reveal')}
                </button>
                <span className="ch-word-hint">{t('charades.actorOnly')}</span>
              </>
            ) : (
              <>
                <span className="ch-word-label">
                  {t('charades.yourWord')}
                </span>
                <span className="ch-word-main">{wordMain}</span>
                {wordSub ? (
                  <span className="ch-word-sub">{wordSub}</span>
                ) : null}
                <button
                  type="button"
                  className="ch-word-hide"
                  onClick={() => setRevealed(false)}
                >
                  {t('charades.hideWord')}
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="ch-empty">{t('charades.noWords')}</div>
        )}
      </Card>

      <div className="ch-timerwrap">
        <span className="ch-timer">
          <Timer
            key={timerKey}
            seconds={setup.timerSecs}
            running={timerRunning}
            onDone={handleTimeUp}
            onTick={handleTick}
          />
        </span>
        <Button
          variant="secondary"
          onClick={timerAction}
          disabled={timeUp || !item}
        >
          {timerActionLabel}
        </Button>
      </div>

      <div className="ch-actions">
        <Button
          variant="success"
          size="lg"
          onClick={handleCorrect}
          disabled={timeUp || !item}
        >
          ✓ {t('charades.correct')}
        </Button>
        <Button
          variant="secondary"
          size="lg"
          onClick={handleSkip}
          disabled={timeUp || !item}
        >
          {t('charades.skip')}
        </Button>
      </div>

      <div className="ch-turnrow">
        <Button
          variant="ghost"
          onClick={() => {
            playSound('click');
            endTurnRef.current();
          }}
          disabled={timeUp}
        >
          {t('charades.endTurn')} →
        </Button>
      </div>

      <Card title={t('charades.score')}>
        <Scoreboard entries={entries} />
      </Card>

      <div className="ch-endgame">
        <Button
          variant="danger"
          fullWidth
          onClick={() => setConfirmEnd(true)}
        >
          {t('charades.finishGame')}
        </Button>
      </div>

      <ConfirmDialog
        open={confirmEnd}
        title={t('charades.confirmEndTitle')}
        message={t('charades.confirmEndMsg')}
        confirmLabel={t('charades.finishGame')}
        cancelLabel={t('common.cancel')}
        onConfirm={() => {
          setConfirmEnd(false);
          finishGame(scores, turnsCompleted);
        }}
        onCancel={() => setConfirmEnd(false)}
      />
    </div>
  );
}
