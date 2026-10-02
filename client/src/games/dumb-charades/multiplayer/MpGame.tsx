// Dumb Charades — multi-phone (QR) play.
//
// Host-authoritative by design: the AI-generated word list lives ONLY on
// the host's phone (sessionStorage host data — it never reaches the server
// or the room state). Each turn the host DMs the secret word to the actor's
// phone only (`charades-word` intent, addressed to one seat), the actor taps
// Got it / Pass on their own phone, and the host folds the result into the
// next room-state snapshot. Every phone renders teams, scores, and whose
// turn it is from that snapshot — guessers never see the word.

import { useEffect, useRef, useState } from 'react';
import type { MpScreenProps } from '../../types.ts';
import { useI18n } from '../../../i18n/index.ts';
import { Button, Card, ConfirmDialog } from '../../../shared/ui/index.ts';
import { playSound } from '../../../shared/sound.ts';
import { track } from '../../../shared/analytics.ts';
import { getMpHostData, getMpSession } from '../../../shared/mp/session.ts';
import { useMpRoom } from '../../../shared/mp/useMpRoom.ts';
import { MpWaitingRoom } from '../../../shared/mp/MpWaiting.tsx';
import type { MpPlayerInfo } from '../../../shared/mp/api.ts';
import { isTie, winnerIndex } from '../logic/turns.ts';
import type { CharadesLang } from '../data/types.ts';
import '../components/charades.css';

export interface CharadesMpTeamState {
  name: string;
  score: number;
  /** Room seats dealt to this team (round-robin by seat). */
  seats: number[];
}

export interface CharadesMpState {
  teams: CharadesMpTeamState[];
  currentTeam: number;
  actorSeat: number | null;
  actorIdxPerTeam: number[];
  turnsPlayedPerTeam: number[];
  phase: 'between' | 'acting' | 'finished';
  turnEndsAt: number | null;
  lastResult: 'got' | 'pass' | 'timeout' | null;
}

export interface CharadesMpConfig {
  category: string;
  timerSecs: number;
  rounds: number | null;
  teamCount: number;
  language: CharadesLang;
}

const TEAM_COLORS = ['#4f46e5', '#16a34a', '#f59e0b', '#dc2626'];
const TEAM_LETTERS = ['A', 'B', 'C', 'D'];

/**
 * Build the initial room state for the lobby's Start button: players are
 * dealt round-robin into auto-named teams by seat order.
 */
export function initialCharadesMpState(
  players: MpPlayerInfo[],
  config: CharadesMpConfig,
  teamNames: string[],
): CharadesMpState {
  const teamCount = Math.max(1, config.teamCount);
  const teams: CharadesMpTeamState[] = Array.from(
    { length: teamCount },
    (_, i) => ({
      name: teamNames[i] ?? `Team ${TEAM_LETTERS[i] ?? String(i + 1)}`,
      score: 0,
      seats: [],
    }),
  );
  [...players]
    .sort((a, b) => a.seat - b.seat)
    .forEach((p, i) => {
      const team = teams[i % teamCount];
      if (team) team.seats.push(p.seat);
    });
  return {
    teams,
    currentTeam: 0,
    actorSeat: null,
    actorIdxPerTeam: teams.map(() => 0),
    turnsPlayedPerTeam: teams.map(() => 0),
    phase: 'between',
    turnEndsAt: null,
    lastResult: null,
  };
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

  const mpState = room.state as CharadesMpState | null;
  const config = room.config as CharadesMpConfig | null;

  // The word on THIS phone: for the actor it arrives by DM; the host also
  // keeps a local copy (they picked it) so a host who is acting sees it too.
  const [myWord, setMyWord] = useState<string | null>(null);
  const [wordSeq, setWordSeq] = useState(0);
  const [sentSeq, setSentSeq] = useState(0);
  const [hostWord, setHostWord] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [confirmEnd, setConfirmEnd] = useState(false);

  const finishedRef = useRef(false);
  const handledSeqRef = useRef(0);
  /** True while a host state transition is in flight (blocks double-apply). */
  const turnBusyRef = useRef(false);
  const stateRef = useRef<CharadesMpState | null>(null);
  stateRef.current = mpState;
  const configRef = useRef<CharadesMpConfig | null>(null);
  configRef.current = config;

  const wordIdxKey = `mp-charades-wordidx-${code.toUpperCase()}`;

  /** Next word from the host-only list — cycles with no repeats per pass. */
  const nextHostWord = (): string | null => {
    const list = getMpHostData<string[]>(code) ?? [];
    if (list.length === 0) return null;
    let idx = 0;
    try {
      idx = Number(sessionStorage.getItem(wordIdxKey) ?? '0') || 0;
    } catch {
      idx = 0;
    }
    const word = list[idx % list.length] ?? null;
    try {
      sessionStorage.setItem(wordIdxKey, String(idx + 1));
    } catch {
      // storage unavailable — words still cycle within the session
    }
    return word;
  };

  /** Actor seat for a team's upcoming turn (rotates through its roster). */
  const actorSeatFor = (st: CharadesMpState, teamIdx: number): number | null => {
    const team = st.teams[teamIdx];
    if (!team || team.seats.length === 0) return null;
    const idx = st.actorIdxPerTeam[teamIdx] ?? 0;
    return team.seats[idx % team.seats.length] ?? null;
  };

  /** Host: end the current turn ('got' scores, 'timeout' doesn't). */
  const endTurnHost = async (
    result: 'got' | 'timeout',
    scorer: boolean,
  ): Promise<void> => {
    const st = stateRef.current;
    const cfg = configRef.current;
    if (!st || !cfg || st.phase !== 'acting' || turnBusyRef.current) return;
    turnBusyRef.current = true;
    try {
      const teamIdx = st.currentTeam;
      const teams = st.teams.map((tm, i) =>
        i === teamIdx && scorer ? { ...tm, score: tm.score + 1 } : tm,
      );
      const actorIdxPerTeam = st.actorIdxPerTeam.map((v, i) =>
        i === teamIdx ? v + 1 : v,
      );
      const turnsPlayedPerTeam = st.turnsPlayedPerTeam.map((v, i) =>
        i === teamIdx ? v + 1 : v,
      );
      const done =
        cfg.rounds !== null &&
        turnsPlayedPerTeam.every((n) => n >= (cfg.rounds ?? 0));
      await room.postState({
        ...st,
        teams,
        actorIdxPerTeam,
        turnsPlayedPerTeam,
        currentTeam: done
          ? teamIdx
          : (teamIdx + 1) % Math.max(1, st.teams.length),
        actorSeat: null,
        phase: done ? 'finished' : 'between',
        turnEndsAt: null,
        lastResult: result,
      });
    } finally {
      turnBusyRef.current = false;
    }
  };

  /** Host: deal the next word to the same actor/team (timer keeps running). */
  const passHost = async (): Promise<void> => {
    const st = stateRef.current;
    if (!st || st.phase !== 'acting' || st.actorSeat === null) return;
    if (turnBusyRef.current) return;
    turnBusyRef.current = true;
    try {
      const word = nextHostWord();
      if (!word) return;
      setHostWord(word);
      await room.sendIntent('charades-word', { word }, st.actorSeat);
      await room.postState({ ...st, lastResult: 'pass' });
    } finally {
      turnBusyRef.current = false;
    }
  };

  /** Host: start the current team's turn — DM the word, start the clock. */
  const startTurnHost = async (): Promise<void> => {
    const st = stateRef.current;
    const cfg = configRef.current;
    if (!st || !cfg || st.phase !== 'between' || turnBusyRef.current) return;
    const actorSeat = actorSeatFor(st, st.currentTeam);
    if (actorSeat === null) return;
    const word = nextHostWord();
    if (!word) return;
    turnBusyRef.current = true;
    try {
      setHostWord(word);
      await room.sendIntent('charades-word', { word }, actorSeat);
      await room.postState({
        ...st,
        phase: 'acting',
        actorSeat,
        turnEndsAt: Date.now() + cfg.timerSecs * 1000,
        lastResult: null,
      });
    } finally {
      turnBusyRef.current = false;
    }
  };

  /** Host (unlimited rounds): finish the game with the scores so far. */
  const finishHost = async (): Promise<void> => {
    const st = stateRef.current;
    if (!st || st.phase === 'finished' || turnBusyRef.current) return;
    turnBusyRef.current = true;
    try {
      await room.postState({
        ...st,
        phase: 'finished',
        actorSeat: null,
        turnEndsAt: null,
      });
    } finally {
      turnBusyRef.current = false;
    }
  };

  // When the game finishes, every phone shows the results screen (once).
  // The host also closes the room server-side.
  useEffect(() => {
    if (!mpState || mpState.phase !== 'finished' || finishedRef.current) return;
    finishedRef.current = true;
    playSound('win');
    track('game_completed', { game: 'dumb-charades' });
    if (room.isHost) {
      void room.endGame({ teams: mpState.teams.map((tm) => tm.name) });
    }
    const scores = mpState.teams.map((tm) => tm.score);
    const tie = isTie(scores);
    const w = winnerIndex(scores);
    const winnerTeam = mpState.teams[w];
    const pts = t('charades.pts');
    const title = tie
      ? `🤝 ${t('charades.tie')}`
      : `🎉 ${winnerTeam?.name ?? ''} ${t('charades.wins')}`;
    const winner = tie
      ? undefined
      : `${winnerTeam?.name ?? ''} · ${scores[w] ?? 0} ${pts}`;
    const lines = mpState.teams.map((tm) => ({
      label: tm.name,
      value: `${tm.score} ${pts}`,
    }));
    if (config && config.rounds !== null) {
      lines.push({
        label: t('charades.rounds'),
        value: String(Math.min(...mpState.turnsPlayedPerTeam)),
      });
    }
    onFinish({ title, winner, lines });
  }, [mpState, config, onFinish, room, t]);

  // Incoming intents: the DM'd word (actor only) + actor results (host folds
  // them into state). Each seq is handled exactly once.
  useEffect(() => {
    const intent = room.lastIntent;
    if (!intent || intent.seq <= handledSeqRef.current) return;
    handledSeqRef.current = intent.seq;
    if (intent.type === 'charades-word') {
      const payload = intent.payload as { word?: unknown } | null;
      if (payload && typeof payload.word === 'string') {
        setMyWord(payload.word);
        setWordSeq(intent.seq);
      }
      return;
    }
    if (!room.isHost) return;
    const st = stateRef.current;
    if (!st || st.phase !== 'acting' || intent.fromSeat !== st.actorSeat) {
      return;
    }
    if (intent.type === 'charades-got') void endTurnHost('got', true);
    else if (intent.type === 'charades-pass') void passHost();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room.lastIntent, room.isHost]);

  // Host-side turn timer: time out the turn when the clock runs out.
  const actingEndsAt = mpState?.phase === 'acting' ? mpState.turnEndsAt : null;
  useEffect(() => {
    if (!room.isHost || actingEndsAt === null) return;
    const id = window.setInterval(() => {
      if (Date.now() >= actingEndsAt) {
        window.clearInterval(id);
        void endTurnHost('timeout', false);
      }
    }, 250);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room.isHost, actingEndsAt, room.stateVersion]);

  // Tick the on-screen countdown while a turn is being acted.
  useEffect(() => {
    if (!mpState || mpState.phase !== 'acting') return;
    const id = window.setInterval(() => setNowMs(Date.now()), 500);
    return () => window.clearInterval(id);
  }, [mpState?.phase]);

  // Clear this phone's word when the turn ends.
  useEffect(() => {
    if (mpState?.phase === 'between') {
      setMyWord(null);
      setHostWord(null);
    }
  }, [mpState?.phase]);

  if (room.status === 'lobby' || !mpState || !config) {
    return <MpWaitingRoom room={room} onExit={onExit} />;
  }

  const mySeat = session.seat;
  const team = mpState.teams[mpState.currentTeam];
  const nameOfSeat = (seat: number): string =>
    room.players.find((p) => p.seat === seat)?.name ?? '';
  const actorName =
    mpState.actorSeat !== null ? nameOfSeat(mpState.actorSeat) : '';
  const isActor = mpState.actorSeat !== null && mpState.actorSeat === mySeat;
  const displayWord = room.isHost ? hostWord : myWord;
  const remaining =
    mpState.phase === 'acting' && mpState.turnEndsAt !== null
      ? Math.max(0, Math.ceil((mpState.turnEndsAt - nowMs) / 1000))
      : config.timerSecs;
  const totalTurns = mpState.turnsPlayedPerTeam.reduce((a, b) => a + b, 0);
  const roundChip =
    config.rounds === null
      ? `${t('charades.turn')} ${totalTurns + 1}`
      : `${t('charades.round')} ${Math.min(
          Math.min(...mpState.turnsPlayedPerTeam) + 1,
          config.rounds,
        )}/${config.rounds}`;

  const nextActorSeat =
    mpState.phase === 'between'
      ? actorSeatFor(mpState, mpState.currentTeam)
      : null;

  const handleGot = (): void => {
    playSound('correct');
    setSentSeq(wordSeq);
    // The host applies the result directly (no reliance on an intent echo).
    if (room.isHost) void endTurnHost('got', true);
    else void room.sendIntent('charades-got');
  };

  const handlePass = (): void => {
    playSound('skip');
    setSentSeq(wordSeq);
    if (room.isHost) void passHost();
    else void room.sendIntent('charades-pass');
  };

  const lastResultText =
    mpState.lastResult === 'got'
      ? t('charades.mpLastGot')
      : mpState.lastResult === 'timeout'
        ? `⏰ ${t('charades.timeUp')}`
        : mpState.lastResult === 'pass'
          ? t('charades.mpLastPass')
          : null;

  return (
    <div className="ch-screen">
      <div className="ch-banner">
        <span className="ch-banner-team">
          <span
            className="ch-team-dot"
            style={{
              background:
                TEAM_COLORS[mpState.currentTeam % TEAM_COLORS.length],
            }}
          />
          {team?.name ?? ''}
        </span>
        <span className="ch-chip">{roundChip}</span>
      </div>

      <div className="ch-turnrow">
        <span className="ch-chip">✨ {config.category}</span>
        {!room.connected && (
          <span className="ch-chip">· {t('mp.reconnecting')}</span>
        )}
      </div>

      {mpState.phase === 'between' && (
        <>
          <Card>
            <div className="ch-wordcard">
              {lastResultText && mpState.lastResult !== 'pass' && (
                <span className="ch-word-label">{lastResultText}</span>
              )}
              <span className="ch-word-label">{t('charades.mpNextUp')}</span>
              <span className="ch-word-main">
                🎭 {nextActorSeat !== null ? nameOfSeat(nextActorSeat) : ''}
              </span>
              <span className="ch-word-hint">{team?.name ?? ''}</span>
            </div>
          </Card>
          {room.isHost ? (
            <Button
              variant="primary"
              size="lg"
              fullWidth
              onClick={() => void startTurnHost()}
            >
              {t('charades.mpStartTurn')}
            </Button>
          ) : (
            <p className="ch-word-hint" style={{ textAlign: 'center' }}>
              {t('charades.mpWaitingStart')}
            </p>
          )}
        </>
      )}

      {mpState.phase === 'acting' && (
        <>
          {isActor ? (
            <>
              <Card>
                <div className="ch-wordcard">
                  <span className="ch-word-label">
                    {t('charades.yourWord')}
                  </span>
                  {displayWord ? (
                    <>
                      <span className="ch-word-main">{displayWord}</span>
                      <span className="ch-word-hint">
                        {t('charades.mpActNow')}
                      </span>
                    </>
                  ) : (
                    <span className="ch-word-hint">
                      {t('charades.mpWordIncoming')}
                    </span>
                  )}
                </div>
              </Card>
              <div className="ch-actions">
                <Button
                  variant="success"
                  size="lg"
                  disabled={!displayWord || (wordSeq > 0 && sentSeq >= wordSeq)}
                  onClick={handleGot}
                >
                  {t('charades.mpGotIt')}
                </Button>
                <Button
                  variant="secondary"
                  size="lg"
                  disabled={!displayWord || (wordSeq > 0 && sentSeq >= wordSeq)}
                  onClick={handlePass}
                >
                  {t('charades.mpPassWord')}
                </Button>
              </div>
            </>
          ) : (
            <Card>
              <div className="ch-wordcard">
                <span className="ch-word-main" style={{ fontSize: '1.4rem' }}>
                  {fmt(t('charades.mpActing'), {
                    actor: actorName,
                    team: team?.name ?? '',
                  })}
                </span>
                {lastResultText && mpState.lastResult === 'pass' && (
                  <span className="ch-word-label">{lastResultText}</span>
                )}
              </div>
            </Card>
          )}
          <div className="ch-timerwrap">
            <span className="ch-timer">
              {remaining}
              {t('charades.seconds')}
            </span>
          </div>
        </>
      )}

      <Card title={t('charades.teams')}>
        <div className="ch-teams-list">
          {mpState.teams.map((tm, i) => (
            <div key={tm.name}>
              <div className="ch-team-row">
                <span
                  className="ch-team-dot"
                  style={{
                    background: TEAM_COLORS[i % TEAM_COLORS.length],
                  }}
                />
                <strong>
                  {tm.name}
                  {i === mpState.currentTeam &&
                  mpState.phase !== 'finished'
                    ? ' 🎭'
                    : ''}
                </strong>
                <span style={{ marginLeft: 'auto', fontWeight: 700 }}>
                  {tm.score} {t('charades.pts')}
                </span>
              </div>
              <div
                className="ch-word-hint"
                style={{ paddingLeft: 24, textAlign: 'left' }}
              >
                {tm.seats
                  .map(
                    (seat) =>
                      `${nameOfSeat(seat)}${seat === mpState.actorSeat ? ' 🎭' : ''}${
                        seat === mySeat ? ` (${t('mp.you')})` : ''
                      }`,
                  )
                  .join(', ')}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {room.isHost && config.rounds === null && (
        <div className="ch-endgame">
          <Button
            variant="danger"
            fullWidth
            onClick={() => setConfirmEnd(true)}
          >
            {t('charades.finishGame')}
          </Button>
        </div>
      )}

      <Button variant="ghost" fullWidth onClick={onExit}>
        {t('mp.leave')}
      </Button>

      <ConfirmDialog
        open={confirmEnd}
        title={t('charades.confirmEndTitle')}
        message={t('charades.confirmEndMsg')}
        confirmLabel={t('charades.finishGame')}
        cancelLabel={t('common.cancel')}
        onConfirm={() => {
          setConfirmEnd(false);
          void finishHost();
        }}
        onCancel={() => setConfirmEnd(false)}
      />
    </div>
  );
}
