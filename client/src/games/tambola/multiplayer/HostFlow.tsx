// Multi-phone host flow: create room → lobby (QR + code + players) →
// calling screen (shared CallerPanel, server-authoritative calls) → results.
// The host's phone is the caller; players join from their own phones.

import { useCallback, useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import type { GameResult } from '../../types.ts';
import { useI18n } from '../../../i18n/index.ts';
import {
  Button,
  Card,
  ConfirmDialog,
  Modal,
  Spinner,
  useToast,
} from '../../../shared/ui/index.ts';
import { playSound } from '../../../shared/sound.ts';
import { track } from '../../../shared/analytics.ts';
import { checkPattern, patternCells } from '../logic/patterns.ts';
import type { PatternId } from '../logic/patterns.ts';
import { CallerPanel } from '../components/CallerPanel.tsx';
import { TicketCard } from '../components/TicketCard.tsx';
import type { TambolaSetup } from '../components/SetupScreen.tsx';
import {
  TambolaMp,
  joinUrl,
  openRoomEvents,
} from './api.ts';
import type { CreatedRoom, HostState, MpClaim, RoomResults } from './api.ts';

function patternNameKey(id: PatternId): string {
  switch (id) {
    case 'early-five':
      return 'tambola.patterns.earlyFive';
    case 'top-line':
      return 'tambola.patterns.topLine';
    case 'middle-line':
      return 'tambola.patterns.middleLine';
    case 'bottom-line':
      return 'tambola.patterns.bottomLine';
    case 'four-corners':
      return 'tambola.patterns.fourCorners';
    case 'full-house':
      return 'tambola.patterns.fullHouse';
  }
}

interface HostFlowProps {
  config: TambolaSetup;
  onFinish: (r: GameResult) => void;
}

export function HostFlow({ config, onFinish }: HostFlowProps) {
  const { t } = useI18n();
  const { toast } = useToast();
  const [room, setRoom] = useState<CreatedRoom | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<'lobby' | 'playing' | 'ended'>('lobby');
  const [playerNames, setPlayerNames] = useState<string[]>([]);
  const [called, setCalled] = useState<number[]>([]);
  const [claims, setClaims] = useState<MpClaim[]>([]);
  const [results, setResults] = useState<RoomResults | null>(null);
  const [auto, setAuto] = useState(false);
  const [paused, setPaused] = useState(false);
  const [intervalSec, setIntervalSec] = useState(config.intervalSec);
  const [verifying, setVerifying] = useState<MpClaim | null>(null);
  const [endOpen, setEndOpen] = useState(false);
  const callingRef = useRef(false);

  // Create the room once.
  useEffect(() => {
    let cancelled = false;
    TambolaMp.createRoom(config.enabled)
      .then((r) => {
        if (!cancelled) {
          setRoom(r);
          track('game_started', { game: 'tambola', mode: 'multi-phone' });
        }
      })
      .catch((e: Error) => {
        if (!cancelled) setCreateError(e.message);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Render the QR code client-side (the client knows its public origin).
  useEffect(() => {
    if (!room) return;
    let cancelled = false;
    QRCode.toDataURL(joinUrl(room.code), { width: 512, margin: 2, color: { dark: '#111827', light: '#ffffff' } })
      .then((url) => {
        if (!cancelled) setQrUrl(url);
      })
      .catch(() => {
        if (!cancelled) setQrUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, [room]);

  // Live room events.
  useEffect(() => {
    if (!room) return;
    return openRoomEvents(
      room.code,
      { role: 'host', token: room.hostToken },
      (ev) => {
        switch (ev.type) {
          case 'hello':
            if (ev.kind === 'host') {
              const s = ev.state as HostState;
              setStatus(s.status);
              setPlayerNames(s.players.map((p) => p.name));
              setCalled(s.called);
              setClaims(s.claims);
              if (s.results) setResults(s.results);
            }
            break;
          case 'players':
            setPlayerNames(ev.players.map((p) => p.name));
            break;
          case 'started':
            setStatus('playing');
            break;
          case 'called':
            setCalled((c) => (c.includes(ev.number) ? c : [...c, ev.number]));
            break;
          case 'claim':
            setClaims((cs) =>
              cs.some((c) => c.id === ev.claim.id) ? cs : [...cs, ev.claim],
            );
            playSound('pop');
            break;
          case 'claim-resolved':
            setClaims((cs) =>
              cs.map((c) =>
                c.id === ev.claimId
                  ? { ...c, status: ev.approved ? 'approved' : 'rejected' }
                  : c,
              ),
            );
            setVerifying((v) => (v && v.id === ev.claimId ? null : v));
            break;
          case 'ended':
            setStatus('ended');
            setResults(ev.results);
            break;
        }
      },
      () => {
        // Stream hiccup — the hook auto-reconnects; nothing to show.
      },
    );
  }, [room]);

  const doCall = useCallback(async (): Promise<void> => {
    if (!room || callingRef.current) return;
    callingRef.current = true;
    try {
      const res = await TambolaMp.callNumber(room.code, room.hostToken);
      setCalled((c) => (c.includes(res.number) ? c : [...c, res.number]));
      playSound('pop');
    } catch {
      setAuto(false); // all numbers called (or game over) — stop auto-call
    } finally {
      callingRef.current = false;
    }
  }, [room]);

  // Auto-call timer (server draws each number).
  useEffect(() => {
    if (status !== 'playing' || !auto || paused || !room) return;
    const id = window.setInterval(() => {
      void doCall();
    }, intervalSec * 1000);
    return () => window.clearInterval(id);
  }, [status, auto, paused, room, intervalSec, doCall]);

  const startGame = async (): Promise<void> => {
    if (!room) return;
    try {
      await TambolaMp.startGame(room.code, room.hostToken);
    } catch (e) {
      toast(e instanceof Error ? e.message : 'error');
    }
  };

  const verify = async (claim: MpClaim, approve: boolean): Promise<void> => {
    if (!room) return;
    try {
      await TambolaMp.verifyClaim(room.code, room.hostToken, claim.id, approve);
      toast(approve ? t('tambola.claimApprovedToast') : t('tambola.claimRejectedToast'));
      if (approve) playSound(claim.pattern === 'full-house' ? 'win' : 'correct');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'error');
    }
  };

  const endGame = async (): Promise<void> => {
    if (!room) return;
    setEndOpen(false);
    try {
      const res = await TambolaMp.endGame(room.code, room.hostToken);
      setStatus('ended');
      setResults(res.results);
    } catch (e) {
      toast(e instanceof Error ? e.message : 'error');
    }
  };

  // Push results to the shared Results screen once ended.
  useEffect(() => {
    if (status !== 'ended' || !results) return;
    const lines =
      results.winners.length > 0
        ? results.winners.map((w) => ({
            label: t(patternNameKey(w.pattern)),
            value: w.playerName,
          }))
        : [{ label: t('tambola.claimedWins'), value: t('tambola.noClaimsLine') }];
    const fullHouse = results.winners.find((w) => w.pattern === 'full-house');
    onFinish({
      title: `🎉 ${t('tambola.gameOverTitle')}`,
      winner: fullHouse
        ? t('tambola.winnerLine')
            .replace('{player}', fullHouse.playerName)
            .replace('{pattern}', t('tambola.patterns.fullHouse'))
        : undefined,
      lines,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, results]);

  const pendingClaims = claims.filter((c) => c.status === 'pending');
  const calledSet = new Set(called);

  if (createError) {
    return (
      <Card title={t('tambola.multiPhoneTitle')}>
        <p className="tm-invalid">{createError}</p>
        <Button variant="secondary" fullWidth onClick={() => window.location.reload()}>
          {t('common.retry')}
        </Button>
      </Card>
    );
  }

  if (!room) {
    return (
      <div className="tmq-center">
        <Spinner />
        <p className="tm-muted">{t('tambola.creatingRoom')}</p>
      </div>
    );
  }

  if (status === 'lobby') {
    return (
      <div className="tm">
        <Card title={t('tambola.qrTitle')}>
          <div className="tmq-lobby">
            {qrUrl ? (
              <img className="tmq-qr" src={qrUrl} alt={t('tambola.qrAlt')} width={256} height={256} />
            ) : (
              <Spinner />
            )}
            <div className="tmq-code" aria-label={t('tambola.roomCodeLabel')}>
              {room.code}
            </div>
            <p className="tm-muted">{t('tambola.qrHint')}</p>
          </div>
        </Card>
        <Card title={t('tambola.playersJoinedTitle')}>
          {playerNames.length === 0 ? (
            <p className="tm-muted">{t('tambola.waitingPlayers')}</p>
          ) : (
            <ul className="tmq-players">
              {playerNames.map((n) => (
                <li key={n} className="tmq-players__item">
                  <span aria-hidden>👤</span> {n}
                </li>
              ))}
            </ul>
          )}
          <div className="tm-count">
            {t('tambola.playersJoinedCount').replace('{n}', String(playerNames.length))}
          </div>
        </Card>
        <Button
          variant="primary"
          size="lg"
          fullWidth
          disabled={playerNames.length === 0}
          onClick={() => void startGame()}
        >
          {t('tambola.startMultiGame')}
        </Button>
      </div>
    );
  }

  // Playing (or ended — results are pushed via onFinish).
  return (
    <div className="tm">
      <CallerPanel
        called={called}
        auto={auto}
        paused={paused}
        intervalSec={intervalSec}
        onCall={() => void doCall()}
        onToggleAuto={() => {
          setAuto((v) => !v);
          setPaused(false);
        }}
        onTogglePause={() => setPaused((v) => !v)}
        onIntervalChange={setIntervalSec}
        actionRow={
          <div className="tm-row">
            <span className="tm-count">
              👥 {t('tambola.playersJoinedCount').replace('{n}', String(playerNames.length))}
            </span>
            <span className="gh-spacer" />
            <Button variant="danger" size="sm" onClick={() => setEndOpen(true)}>
              {t('tambola.endGame')}
            </Button>
          </div>
        }
      />

      <Card title={t('tambola.pendingClaimsTitle')}>
        {pendingClaims.length === 0 ? (
          <p className="tm-muted">{t('tambola.noPendingClaims')}</p>
        ) : (
          <ul className="tmq-claims">
            {pendingClaims.map((c) => (
              <li key={c.id} className="tmq-claims__item">
                <span>
                  <strong>{c.playerName}</strong> · {t(patternNameKey(c.pattern))}
                </span>
                <Button variant="primary" size="sm" onClick={() => setVerifying(c)}>
                  {t('tambola.verify')}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {claims.filter((c) => c.status === 'approved').length > 0 ? (
        <Card title={t('tambola.claimedWins')}>
          <ul className="tm-claims">
            {claims
              .filter((c) => c.status === 'approved')
              .map((c) => (
                <li key={c.id} className="tm-claims__item">
                  <span>{t(patternNameKey(c.pattern))}</span>
                  <strong>{c.playerName}</strong>
                </li>
              ))}
          </ul>
        </Card>
      ) : null}

      <Modal
        open={verifying !== null}
        onClose={() => setVerifying(null)}
        title={t('tambola.hostVerifyTitle')}
      >
        {verifying ? (
          <div className="tm-claim">
            <p className="tm-claim__sub">
              {t('tambola.verifyPrompt')
                .replace('{name}', verifying.playerName)
                .replace('{pattern}', t(patternNameKey(verifying.pattern)))}
            </p>
            <TicketCard
              ticket={verifying.ticket}
              called={calledSet}
              outline={patternCells(verifying.ticket, verifying.pattern)}
            />
            <p
              className={
                checkPattern(verifying.ticket, calledSet, verifying.pattern)
                  ? 'tm-valid'
                  : 'tm-invalid'
              }
            >
              {checkPattern(verifying.ticket, calledSet, verifying.pattern)
                ? t('tambola.validClaim')
                : t('tambola.invalidClaim')}
            </p>
            <div className="tm-row">
              <Button variant="success" fullWidth onClick={() => void verify(verifying, true)}>
                {t('tambola.approve')}
              </Button>
              <Button variant="danger" fullWidth onClick={() => void verify(verifying, false)}>
                {t('tambola.reject')}
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>

      <ConfirmDialog
        open={endOpen}
        title={t('tambola.endGameTitle')}
        message={t('tambola.endGameMessage')}
        confirmLabel={t('tambola.endGame')}
        cancelLabel={t('common.cancel')}
        onConfirm={() => void endGame()}
        onCancel={() => setEndOpen(false)}
        danger
      />
    </div>
  );
}
