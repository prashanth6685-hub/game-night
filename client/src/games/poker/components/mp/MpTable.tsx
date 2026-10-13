// Multiplayer table screen: PokerTable.tsx + ActionPanel.tsx driven by
// SERVER state through the thin adapter in logic/mpAdapter.ts (seats are
// rotated so my seat is 0, which is what PokerTable assumes). Legal actions
// come from the server's engine-computed `myLegalActions`. Includes the
// turn countdown, rebuy dialog, reconnect banner, sitting-out indicator,
// and host pause/resume.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useI18n } from '../../../../i18n/index.ts';
import {
  Button,
  Card,
  ConfirmDialog,
  Modal,
  Spinner,
  Timer,
  useToast,
} from '../../../../shared/ui/index.ts';
import { playSound } from '../../../../shared/sound.ts';
import { adaptServerState, adaptVoiceBadges, rebuyTotal } from '../../logic/mpAdapter.ts';
import type { MicBadgeKind } from '../../logic/mpAdapter.ts';
import {
  PokerApiError,
  PokerRoomsApi,
  newIdem,
  openPokerEvents,
} from '../../logic/pokerRooms.ts';
import type { PokerReport, PokerTableState } from '../../logic/pokerRooms.ts';
import type { PokerMpSession } from '../../logic/pokerSession.ts';
import { clearPokerSession } from '../../logic/pokerSession.ts';
import { saveReport } from '../../logic/reportUtils.ts';
import { usePokerVoice } from '../../logic/usePokerVoice.ts';
import { PokerTable } from '../PokerTable.tsx';
import { ActionPanel } from '../ActionPanel.tsx';
import { VoiceBar } from './VoiceBar.tsx';
import type { PokerAction as EngineAction } from '../../../../../../shared/poker/engine.ts';

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

/** Action payload sent to the server (validated again server-side). */
interface ServerAction {
  type: string;
  amount?: number;
}

export interface MpTableProps {
  session: PokerMpSession;
  initial: PokerTableState | null;
  onRoomClosed: (report: PokerReport, saved: boolean) => void;
  onLeave: () => void;
}

export function MpTable({ session, initial, onRoomClosed, onLeave }: MpTableProps) {
  const { t } = useI18n();
  const { toast } = useToast();
  const [state, setState] = useState<PokerTableState | null>(initial);
  const [acting, setActing] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);
  const [showRebuy, setShowRebuy] = useState(false);
  const [rebuyAmount, setRebuyAmount] = useState(0);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [loading, setLoading] = useState(initial === null);
  const closedRef = useRef(false);
  const onRoomClosedRef = useRef(onRoomClosed);
  onRoomClosedRef.current = onRoomClosed;
  const sessionRef = useRef(session);
  sessionRef.current = session;
  // Voice chat (WebRTC mesh) — separate SSE stream + separate server state;
  // joining/leaving/muting never affects the poker hand.
  const voice = usePokerVoice({ session, initialVoice: state?.voice ?? undefined });

  const handleRoomClosed = useCallback(async () => {
    if (closedRef.current) return;
    closedRef.current = true;
    try {
      const report = await PokerRoomsApi.getReport(sessionRef.current.code);
      saveReport(sessionRef.current.code, report);
      onRoomClosedRef.current(report, true);
    } catch {
      onRoomClosedRef.current(emptyReport(sessionRef.current.code), false);
    }
  }, []);

  const refresh = useCallback(async () => {
    const s = sessionRef.current;
    try {
      const st = await PokerRoomsApi.getState(s.code, s.token);
      setState(st);
      setLoading(false);
      setReconnecting(false);
    } catch (e) {
      if (e instanceof PokerApiError && (e.status === 410 || e.status === 404)) {
        void handleRoomClosed();
      }
    }
  }, [handleRoomClosed]);

  useEffect(() => {
    const s = sessionRef.current;
    if (initial === null) {
      void refresh();
    } else {
      // Mark ourselves connected on (re)entry.
      PokerRoomsApi.reconnect(s.code, s.token).catch(() => {});
    }
    // 'table' frames are public-only — re-fetch for hole cards + legal actions.
    const stop = openPokerEvents(
      s.code,
      {
        role: s.isHost ? 'host' : 'player',
        token: s.isHost ? (s.hostToken ?? s.token) : s.token,
      },
      (ev) => {
        switch (ev.type) {
          case 'hello':
          case 'started':
          case 'table':
          case 'paused':
          case 'resumed':
          case 'presence':
            void refresh();
            break;
          case 'hand-end':
            playSound('win');
            void refresh();
            break;
          case 'rebuy':
            playSound('click');
            void refresh();
            break;
          case 'players':
            void refresh();
            break;
          case 'room-closed':
            void handleRoomClosed();
            break;
          case 'voice-state':
          case 'voice-signal':
            // Handled by the usePokerVoice hook's own event stream.
            break;
        }
      },
      () => setReconnecting(true),
    );
    return stop;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const adapted = useMemo(() => (state ? adaptServerState(state) : null), [state]);

  // Per-seat mic badges (rotated seats, my seat = 0) from the voice mesh.
  const micBadges = useMemo<Map<number, MicBadgeKind>>(() => {
    if (!adapted) return new Map();
    return adaptVoiceBadges(
      voice.voiceState,
      session.seat,
      adapted.table.players.length,
      new Set(voice.peerErrors.keys()),
    );
  }, [adapted, voice.voiceState, voice.peerErrors, session.seat]);

  const cfg = state?.config;
  const rebuyMin = cfg?.rebuyMin ?? 0;
  const rebuyMax = cfg?.rebuyMax ?? 0;
  const maxRebuys = cfg?.maxRebuys ?? -1;
  const rebuySoFar = state ? rebuyTotal(state.ledger, session.seat) : 0;
  // The public ledger reports rebuy chips, not a count; derive a count only
  // when rebuys are a fixed size.
  const fixedRebuy = rebuyMin > 0 && rebuyMin === rebuyMax;
  const rebuysUsedCount = fixedRebuy ? Math.round(rebuySoFar / rebuyMin) : null;
  const rebuysLeft =
    maxRebuys < 0
      ? null
      : rebuysUsedCount !== null
        ? Math.max(0, maxRebuys - rebuysUsedCount)
        : null;
  const canRebuy =
    !!state &&
    state.status !== 'closed' &&
    rebuyMax > 0 &&
    (rebuysLeft === null || rebuysLeft > 0);

  useEffect(() => {
    if (showRebuy) {
      setRebuyAmount(
        rebuyMax > 0 ? Math.min(rebuyMax, Math.max(rebuyMin, rebuyMax)) : rebuyMin,
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showRebuy]);

  async function doAction(a: EngineAction): Promise<void> {
    if (acting) return;
    setActing(true);
    try {
      // Wire format: the server spells all-in "allin" (no hyphen).
      const payload: ServerAction = {
        type: a.type === 'all-in' ? 'allin' : a.type,
      };
      if (a.type === 'bet' || a.type === 'raise') payload.amount = a.amount;
      await PokerRoomsApi.act(session.code, session.token, payload, newIdem());
      playSound(a.type === 'fold' ? 'skip' : 'move');
      // The 'table' event carries the result; refresh once as a backup.
      await refresh();
    } catch (e) {
      toast(
        e instanceof PokerApiError ? e.message : t('poker.mpActionFailed'),
        'error',
      );
    } finally {
      setActing(false);
    }
  }

  async function doRebuy(): Promise<void> {
    setShowRebuy(false);
    setActing(true);
    try {
      await PokerRoomsApi.rebuy(session.code, session.token, rebuyAmount, newIdem());
      playSound('click');
      await refresh();
    } catch (e) {
      toast(
        e instanceof PokerApiError ? e.message : t('poker.mpActionFailed'),
        'error',
      );
    } finally {
      setActing(false);
    }
  }

  async function togglePause(): Promise<void> {
    if (!session.hostToken) {
      toast(t('poker.mpActionFailed'), 'error');
      return;
    }
    try {
      if (state?.status === 'paused') {
        await PokerRoomsApi.resume(session.code, session.hostToken);
      } else {
        await PokerRoomsApi.pause(session.code, session.hostToken);
      }
      await refresh();
    } catch {
      toast(t('poker.mpActionFailed'), 'error');
    }
  }

  async function leave(): Promise<void> {
    setConfirmLeave(false);
    try {
      await PokerRoomsApi.disconnect(session.code, session.token);
    } catch {
      // leaving anyway
    } finally {
      clearPokerSession(session.code);
      onLeave();
    }
  }

  function rankName(handName: string): string {
    if (handName === '') return '';
    return handName === 'fold'
      ? t('poker.action_fold')
      : t(`poker.rankNames.${handName}`);
  }

  if (loading || !adapted || !state) {
    return (
      <div className="pk-wrap">
        <Card title={t('poker.mpTableTitle')}>
          <Spinner />
          <p className="pk-hint">{t('poker.mpLoadingTable')}</p>
        </Card>
      </div>
    );
  }

  const { table } = adapted;
  const complete = table.street === 'complete';
  const myTurn = table.actorSeat === 0 && !complete && adapted.legal.length > 0;
  const actorName =
    table.actorSeat >= 0
      ? (table.players.find((p) => p.seat === table.actorSeat)?.name ?? '')
      : '';
  const paused = state.status === 'paused';

  let turnMain = '';
  if (paused) turnMain = t('poker.mpPaused');
  else if (complete)
    turnMain = fmt(t('poker.handComplete'), { n: table.handNumber });
  else if (myTurn) turnMain = t('poker.mpYourTurn');
  else if (actorName !== '') turnMain = fmt(t('poker.mpWaitingFor'), { name: actorName });

  const rebuyUsage =
    rebuysLeft === null
      ? rebuysUsedCount !== null
        ? fmt(t('poker.mpUsedUnlimited'), { used: rebuysUsedCount })
        : fmt(t('poker.mpRebuyTotal'), { amount: rebuySoFar })
      : fmt(t('poker.mpUsedOf'), { used: rebuysUsedCount ?? 0, max: maxRebuys });

  return (
    <div className="pk-wrap">
      {reconnecting && (
        <div className="pk-reconnect" role="status">
          <Spinner /> {t('poker.mpReconnecting')}
        </div>
      )}
      {adapted.mySittingOut && (
        <div className="pk-sitout" role="status">
          {t('poker.mpSittingOut')}
        </div>
      )}
      {paused && (
        <div className="pk-paused-banner" role="status">
          ⏸ {t('poker.mpPaused')}
        </div>
      )}

      <div className="pk-turn" aria-live="polite">
        <div className="pk-turn-main">{turnMain}</div>
        <div className="pk-turn-sub">
          {fmt(t('poker.handNumber'), { n: table.handNumber })}
          {table.street !== 'complete' && ` · ${t(`poker.street_${table.street}`)}`}
          {adapted.turnSecs !== null && !complete && !paused && (
            <span className="pk-timer">
              {' · ⏱ '}
              <Timer
                key={`${table.handNumber}-${table.actorSeat}`}
                seconds={adapted.turnSecs}
                running={true}
              />
            </span>
          )}
        </div>
      </div>

      <PokerTable
        state={table}
        sbSeat={null}
        bbSeat={null}
        thinkingSeat={null}
        rankName={rankName}
        micBadges={micBadges}
      />

      <VoiceBar voice={voice} />

      {myTurn ? (
        <ActionPanel
          legal={adapted.legal}
          onAction={(a) => void doAction(a)}
          pot={adapted.pot}
          disabled={acting}
        />
      ) : null}

      <div className="pk-count-row">
        {canRebuy && (
          <Button
            variant="secondary"
            size="md"
            disabled={acting}
            onClick={() => setShowRebuy(true)}
          >
            {t('poker.mpRebuy')}
          </Button>
        )}
        {session.isHost && (
          <Button variant="secondary" size="md" onClick={() => void togglePause()}>
            {paused ? t('poker.mpResume') : t('poker.mpPause')}
          </Button>
        )}
        <Button variant="ghost" size="md" onClick={() => setConfirmLeave(true)}>
          {t('poker.mpLeaveTable')}
        </Button>
      </div>

      <Modal open={showRebuy} onClose={() => setShowRebuy(false)} title={t('poker.mpRebuyTitle')}>
        <div className="pk-setup">
          <div className="pk-roomcard-row">
            <span className="pk-hint">{t('poker.mpYourStack')}</span>
            <strong>⛁ {adapted.myChips}</strong>
          </div>
          <div className="pk-roomcard-row">
            <span className="pk-hint">{t('poker.mpRebuyRange')}</span>
            <strong>
              {rebuyMin} – {rebuyMax}
            </strong>
          </div>
          <div className="pk-roomcard-row">
            <span className="pk-hint">{t('poker.mpRebuysUsed')}</span>
            <strong>{rebuyUsage}</strong>
          </div>
          <div className="pk-field">
            <label className="pk-label" htmlFor="pkmp-rebuy-amt">
              {t('poker.mpRebuyAmount')}
            </label>
            <input
              id="pkmp-rebuy-amt"
              type="number"
              className="pk-number"
              min={rebuyMin}
              max={rebuyMax}
              value={rebuyAmount}
              onChange={(e) => {
                const n = Math.floor(Number(e.target.value));
                setRebuyAmount(
                  Number.isFinite(n)
                    ? Math.min(rebuyMax, Math.max(rebuyMin, n))
                    : rebuyMin,
                );
              }}
            />
          </div>
          <div className="pk-result-btns">
            <Button variant="ghost" size="lg" onClick={() => setShowRebuy(false)}>
              {t('poker.cancel')}
            </Button>
            <Button variant="primary" size="lg" onClick={() => void doRebuy()}>
              {fmt(t('poker.mpConfirmRebuy'), { amount: rebuyAmount })}
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={confirmLeave}
        title={t('poker.mpLeaveTable')}
        message={t('poker.mpConfirmLeaveTable')}
        confirmLabel={t('poker.mpLeaveTable')}
        cancelLabel={t('poker.cancel')}
        onConfirm={() => void leave()}
        onCancel={() => setConfirmLeave(false)}
      />
    </div>
  );
}
