// Pre-game lobby: room name + code (copy), host crown, player list with
// ready/connected state, rules summary, host controls (start / remove /
// edit rules / close) and guest controls (ready toggle / leave).
// Driven by the room summary (refreshed on 'players' events) + the SSE
// stream; any state with status != 'lobby' hands off to the table screen.
// Host-only endpoints authenticate with the x-host-token header.
import { useCallback, useEffect, useRef, useState } from 'react';
import { useI18n } from '../../../../i18n/index.ts';
import {
  Avatar,
  Button,
  Card,
  ConfirmDialog,
  Spinner,
  useToast,
} from '../../../../shared/ui/index.ts';
import { copyToClipboard, pokerJoinUrl } from '../../logic/share.ts';
import { playSound } from '../../../../shared/sound.ts';
import {
  PokerApiError,
  PokerRoomsApi,
  openPokerEvents,
} from '../../logic/pokerRooms.ts';
import type {
  PokerReport,
  PokerRoomSummary,
  PokerTableState,
} from '../../logic/pokerRooms.ts';
import type { PokerMpSession } from '../../logic/pokerSession.ts';
import { clearPokerSession } from '../../logic/pokerSession.ts';
import { saveReport } from '../../logic/reportUtils.ts';

function fmt(template: string, vars: Record<string, string | number>): string {
  let out = template;
  for (const [k, v] of Object.entries(vars)) {
    out = out.split(`{${k}}`).join(String(v));
  }
  return out;
}

function emptyReport(code: string): PokerReport {
  return {
    roomName: '',
    code,
    startedAt: 0,
    endedAt: 0,
    durationSec: 0,
    handsPlayed: 0,
    totals: { buyIns: 0, rebuys: 0, final: 0 },
    balanced: false,
    discrepancy: 0,
    players: [],
    topWinner: null,
    biggestLoss: null,
  };
}

export interface LobbyProps {
  session: PokerMpSession;
  onGameStart: (initial: PokerTableState) => void;
  onRoomClosed: (report: PokerReport, saved: boolean) => void;
  onLeave: () => void;
  onEditRules: (summary: PokerRoomSummary) => void;
}

export function Lobby({
  session,
  onGameStart,
  onRoomClosed,
  onLeave,
  onEditRules,
}: LobbyProps) {
  const { t } = useI18n();
  const { toast } = useToast();
  const [summary, setSummary] = useState<PokerRoomSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  const [removeSeat, setRemoveSeat] = useState<number | null>(null);
  const closedRef = useRef(false);
  const sessionRef = useRef(session);
  sessionRef.current = session;
  const onGameStartRef = useRef(onGameStart);
  onGameStartRef.current = onGameStart;

  const showReport = useCallback(
    (report: PokerReport) => {
      if (closedRef.current) return;
      closedRef.current = true;
      saveReport(report.code, report);
      onRoomClosed(report, true);
    },
    [onRoomClosed],
  );

  const fetchReportAndShow = useCallback(
    async (code: string) => {
      if (closedRef.current) return;
      closedRef.current = true;
      try {
        const report = await PokerRoomsApi.getReport(code);
        saveReport(code, report);
        onRoomClosed(report, true);
      } catch {
        onRoomClosed(emptyReport(code), false);
      }
    },
    [onRoomClosed],
  );

  const refresh = useCallback(async () => {
    const s = sessionRef.current;
    try {
      const sum = await PokerRoomsApi.getSummary(s.code);
      if (sum.status === 'closed') {
        void fetchReportAndShow(s.code);
        return;
      }
      setSummary(sum);
      setError(null);
    } catch (e) {
      if (e instanceof PokerApiError && (e.status === 410 || e.status === 404)) {
        void fetchReportAndShow(s.code);
      } else {
        setError(t('poker.mpLobbyLoadFailed'));
      }
    }
  }, [fetchReportAndShow, t]);

  /** Pull the full state; hand off to the table when the game is live. */
  const syncState = useCallback(async () => {
    const s = sessionRef.current;
    try {
      const st = await PokerRoomsApi.getState(s.code, s.token);
      if (st.status !== 'lobby') {
        onGameStartRef.current(st);
      } else {
        void refresh();
      }
    } catch {
      // state unavailable (e.g. not seated yet) — roster refresh instead
      void refresh();
    }
  }, [refresh]);

  // Initial load: if the game already started (refresh-rejoin), jump to table.
  useEffect(() => {
    void syncState();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Live roster updates. 'table' frames are public-only, so re-fetch state.
  useEffect(() => {
    const stop = openPokerEvents(
      session.code,
      {
        role: session.isHost ? 'host' : 'player',
        token: session.isHost ? (session.hostToken ?? session.token) : session.token,
      },
      (ev) => {
        switch (ev.type) {
          case 'hello':
          case 'started':
          case 'table':
          case 'hand-end':
          case 'paused':
          case 'resumed':
          case 'presence':
            void syncState();
            break;
          case 'players':
            playSound('click');
            void refresh();
            break;
          case 'rebuy':
            void refresh();
            break;
          case 'room-closed':
            void fetchReportAndShow(session.code);
            break;
        }
      },
      () => {
        // SSE retries with backoff on its own.
      },
    );
    return stop;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function toggleReady(): Promise<void> {
    setBusy(true);
    try {
      await PokerRoomsApi.toggleReady(session.code, session.token);
      playSound('click');
      await refresh();
    } catch {
      toast(t('poker.mpActionFailed'), 'error');
    } finally {
      setBusy(false);
    }
  }

  async function start(): Promise<void> {
    if (!session.hostToken) {
      toast(t('poker.mpActionFailed'), 'error');
      return;
    }
    setBusy(true);
    try {
      await PokerRoomsApi.start(session.code, session.hostToken);
      playSound('click');
      // The 'started' event moves everyone; poll once as backup.
      await syncState();
    } catch (e) {
      toast(
        e instanceof PokerApiError ? e.message : t('poker.mpActionFailed'),
        'error',
      );
    } finally {
      setBusy(false);
    }
  }

  async function removePlayer(): Promise<void> {
    if (removeSeat === null || !session.hostToken) return;
    const seat = removeSeat;
    setRemoveSeat(null);
    setBusy(true);
    try {
      await PokerRoomsApi.removePlayer(session.code, session.hostToken, seat);
      await refresh();
    } catch {
      toast(t('poker.mpActionFailed'), 'error');
    } finally {
      setBusy(false);
    }
  }

  async function closeRoom(): Promise<void> {
    setConfirmClose(false);
    if (!session.hostToken) {
      toast(t('poker.mpActionFailed'), 'error');
      return;
    }
    setBusy(true);
    try {
      // The server returns the final report inline on close.
      const res = await PokerRoomsApi.closeRoom(session.code, session.hostToken);
      clearPokerSession(session.code);
      if (res.report) showReport(res.report);
      else await fetchReportAndShow(session.code);
    } catch {
      toast(t('poker.mpActionFailed'), 'error');
      setBusy(false);
    }
  }

  async function leave(): Promise<void> {
    setBusy(true);
    try {
      await PokerRoomsApi.disconnect(session.code, session.token);
    } catch {
      // leaving anyway
    } finally {
      clearPokerSession(session.code);
      onLeave();
    }
  }

  async function copyCode(): Promise<void> {
    const ok = await copyToClipboard(session.code);
    toast(ok ? t('poker.mpCopied') : t('poker.mpCopyFailed'), ok ? 'success' : 'error');
  }

  async function copyInviteLink(): Promise<void> {
    const ok = await copyToClipboard(pokerJoinUrl(session.code));
    toast(ok ? t('poker.mpCopied') : t('poker.mpCopyFailed'), ok ? 'success' : 'error');
  }

  if (!summary) {
    return (
      <div className="pk-wrap">
        <Card title={t('poker.mpLobbyTitle')}>
          {error ? (
            <>
              <p className="pk-error">{error}</p>
              <Button variant="secondary" onClick={() => void refresh()}>
                {t('poker.mpRetry')}
              </Button>
            </>
          ) : (
            <Spinner />
          )}
        </Card>
      </div>
    );
  }

  const players = [...summary.players].sort((a, b) => a.seat - b.seat);
  const readyCount = players.filter((p) => p.ready).length;
  const canStart = session.isHost && readyCount >= 2 && players.length >= 2;
  const removeName =
    removeSeat !== null
      ? (players.find((p) => p.seat === removeSeat)?.name ?? '')
      : '';

  return (
    <div className="pk-wrap">
      <Card title={summary.roomName}>
        <div className="pk-setup">
          <div className="pk-lobby-code-row">
            <div>
              <div className="pk-hint">{t('poker.mpRoomCode')}</div>
              <div className="pk-code-med">{summary.code}</div>
            </div>
            <Button variant="secondary" size="md" onClick={() => void copyCode()}>
              {t('poker.mpCopyCode')}
            </Button>
            <Button variant="secondary" size="md" onClick={() => void copyInviteLink()}>
              {t('poker.mpCopyLink')}
            </Button>
          </div>

          <div className="pk-hint">
            {fmt(t('poker.mpOccupancy'), {
              a: summary.playerCount,
              b: summary.maxPlayers,
            })}
            {' · '}
            {fmt(t('poker.mpBlindsValue'), {
              sb: summary.blinds.small,
              bb: summary.blinds.big,
            })}
            {' · '}
            {summary.maxBuyIn > 0
              ? fmt(t('poker.mpBuyInRange'), {
                  min: summary.minBuyIn,
                  max: summary.maxBuyIn,
                })
              : fmt(t('poker.mpBuyInFrom'), { min: summary.minBuyIn })}
          </div>

          <div className="pk-lobby-list" role="list">
            {players.map((p) => {
              const isMe = p.seat === session.seat;
              return (
                <div key={p.seat} className="pk-player-row" role="listitem">
                  <Avatar name={p.name} size={36} />
                  <span className="pk-player-name">
                    {p.name}
                    {isMe && ` (${t('poker.mpYou')})`}
                  </span>
                  {p.isHost && (
                    <span aria-label={t('poker.mpHost')} title={t('poker.mpHost')}>
                      👑
                    </span>
                  )}
                  <span
                    className={`pk-conn ${p.connected === false ? 'off' : 'on'}`}
                    title={
                      p.connected === false
                        ? t('poker.mpDisconnected')
                        : t('poker.mpConnected')
                    }
                  />
                  <span
                    className={`pk-ready ${p.ready ? 'yes' : 'no'}`}
                    aria-live="polite"
                  >
                    {p.ready ? `✓ ${t('poker.mpReady')}` : `… ${t('poker.mpNotReady')}`}
                  </span>
                  {typeof p.stack === 'number' && (
                    <span className="pk-hint">⛁ {p.stack}</span>
                  )}
                  {session.isHost && !isMe && (
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={busy}
                      onClick={() => setRemoveSeat(p.seat)}
                    >
                      {t('poker.mpRemove')}
                    </Button>
                  )}
                </div>
              );
            })}
          </div>

          {error && (
            <p className="pk-error" role="alert">
              {error}
            </p>
          )}

          {session.isHost ? (
            <>
              <Button
                variant="primary"
                size="lg"
                fullWidth
                disabled={!canStart || busy}
                onClick={() => void start()}
              >
                {t('poker.mpStartGame')}
              </Button>
              {!canStart && (
                <p className="pk-hint">{t('poker.mpNeedTwoReady')}</p>
              )}
              <div className="pk-result-btns">
                <Button
                  variant="secondary"
                  size="md"
                  disabled={busy}
                  onClick={() => onEditRules(summary)}
                >
                  {t('poker.mpEditRules')}
                </Button>
                <Button
                  variant="danger"
                  size="md"
                  disabled={busy}
                  onClick={() => setConfirmClose(true)}
                >
                  {t('poker.mpCloseRoom')}
                </Button>
              </div>
            </>
          ) : (
            <>
              <Button
                variant="primary"
                size="lg"
                fullWidth
                disabled={busy}
                onClick={() => void toggleReady()}
              >
                {players.find((p) => p.seat === session.seat)?.ready
                  ? `✓ ${t('poker.mpReady')}`
                  : t('poker.mpImReady')}
              </Button>
              <p className="pk-hint">{t('poker.mpWaitingForHost')}</p>
              <Button variant="ghost" size="lg" onClick={() => void leave()} disabled={busy}>
                {t('poker.mpLeaveRoom')}
              </Button>
            </>
          )}
        </div>
      </Card>

      <ConfirmDialog
        open={removeSeat !== null}
        title={t('poker.mpRemoveTitle')}
        message={fmt(t('poker.mpConfirmRemove'), { name: removeName })}
        confirmLabel={t('poker.mpRemove')}
        cancelLabel={t('poker.cancel')}
        onConfirm={() => void removePlayer()}
        onCancel={() => setRemoveSeat(null)}
        danger
      />
      <ConfirmDialog
        open={confirmClose}
        title={t('poker.mpConfirmCloseTitle')}
        message={t('poker.mpConfirmCloseMsg')}
        confirmLabel={t('poker.mpCloseRoom')}
        cancelLabel={t('poker.cancel')}
        onConfirm={() => void closeRoom()}
        onCancel={() => setConfirmClose(false)}
        danger
      />
    </div>
  );
}
