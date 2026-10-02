// Tambola game screen: 'setup' → 'play'.
// The host calls numbers (manually or on auto-call), tickets auto-mark from
// the called set, claims are verified in a modal, and End Game reports the
// claimed wins via onFinish.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { GameScreenProps } from '../../types.ts';
import { useI18n } from '../../../i18n/index.ts';
import {
  Button,
  Card,
  ConfirmDialog,
  useToast,
} from '../../../shared/ui/index.ts';
import { playSound } from '../../../shared/sound.ts';
import { track } from '../../../shared/analytics.ts';
import { generateTickets } from '../logic/ticket.ts';
import type { Ticket } from '../logic/ticket.ts';
import { createCaller } from '../logic/caller.ts';
import type { Caller } from '../logic/caller.ts';
import type { PatternId } from '../logic/patterns.ts';
import { SetupScreen } from './SetupScreen.tsx';
import type { TambolaSetup } from './SetupScreen.tsx';
import { CallerPanel } from './CallerPanel.tsx';
import { HostFlow } from '../multiplayer/HostFlow.tsx';
import { TicketCard } from './TicketCard.tsx';
import { ClaimDialog } from './ClaimDialog.tsx';
import type { ClaimInput } from './ClaimDialog.tsx';
import './tambola.css';

type Phase = 'setup' | 'play' | 'multi';

interface Claim extends ClaimInput {
  at: number; // called.length when approved, for stable ordering
}

function nameKeyFor(id: PatternId): string {
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

export default function GameScreen({ onFinish }: GameScreenProps) {
  const { t } = useI18n();
  const { toast } = useToast();
  const [phase, setPhase] = useState<Phase>('setup');
  const [config, setConfig] = useState<TambolaSetup | null>(null);
  const [tickets, setTickets] = useState<Ticket[][]>([]);
  const [called, setCalled] = useState<number[]>([]);
  const [auto, setAuto] = useState(false);
  const [paused, setPaused] = useState(false);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [claimOpen, setClaimOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [endOpen, setEndOpen] = useState(false);
  const callerRef = useRef<Caller | null>(null);

  const calledSet = useMemo(() => new Set(called), [called]);

  const playerName = (i: number): string =>
    t('tambola.playerName').replace('{n}', String(i + 1));
  const ticketLabel = (i: number): string =>
    t('tambola.ticketLabel').replace('{n}', String(i + 1));

  const startGame = (cfg: TambolaSetup): void => {
    if (cfg.mode === 'multi-phone') {
      // Host creates a QR room; players join from their own phones.
      setConfig(cfg);
      setPhase('multi');
      return;
    }
    const all = generateTickets(cfg.playerCount * cfg.ticketsPerPlayer);
    const per: Ticket[][] = [];
    for (let p = 0; p < cfg.playerCount; p++) {
      per.push(all.slice(p * cfg.ticketsPerPlayer, (p + 1) * cfg.ticketsPerPlayer));
    }
    callerRef.current = createCaller();
    setConfig(cfg);
    setTickets(per);
    setCalled([]);
    setClaims([]);
    setAuto(false);
    setPaused(false);
    setPhase('play');
    track('game_started', { game: 'tambola' });
  };

  const doCall = useCallback((): void => {
    const caller = callerRef.current;
    if (!caller) return;
    const n = caller.call();
    if (n === null) {
      setAuto(false); // all 90 called — stop auto-call
      return;
    }
    playSound('pop');
    setCalled([...caller.called]);
  }, []);

  // Auto-call timer.
  useEffect(() => {
    if (phase !== 'play' || !auto || paused || !config) return;
    const id = window.setInterval(doCall, config.intervalSec * 1000);
    return () => window.clearInterval(id);
  }, [phase, auto, paused, config, doCall]);

  const resetCalling = (): void => {
    callerRef.current?.reset();
    setCalled([]);
    setClaims([]);
    setAuto(false);
    setPaused(false);
    setResetOpen(false);
  };

  const claimedIds = useMemo(() => new Set(claims.map((c) => c.pattern)), [claims]);

  const approveClaim = (input: ClaimInput): void => {
    setClaims((prev) => [...prev, { ...input, at: called.length }]);
    if (input.pattern === 'full-house') {
      playSound('win');
    } else {
      playSound('correct');
    }
    toast(t('tambola.claimApprovedToast'));
  };

  const rejectClaim = (): void => {
    toast(t('tambola.claimRejectedToast'));
  };

  const endGame = (): void => {
    const fullHouse = claims.find((c) => c.pattern === 'full-house');
    const winner = fullHouse
      ? t('tambola.winnerLine')
          .replace('{player}', playerName(fullHouse.playerIndex))
          .replace('{pattern}', t('tambola.patterns.fullHouse'))
      : undefined;
    const lines =
      claims.length > 0
        ? claims.map((c) => ({
            label: t(nameKeyFor(c.pattern)),
            value: `${playerName(c.playerIndex)} · ${ticketLabel(c.ticketIndex)}`,
          }))
        : [{ label: t('tambola.claimedWins'), value: t('tambola.noClaimsLine') }];
    setEndOpen(false);
    onFinish({
      title: `🎉 ${t('tambola.gameOverTitle')}`,
      winner,
      lines,
    });
  };

  if (phase === 'setup' || !config) {
    return <SetupScreen onStart={startGame} />;
  }

  if (phase === 'multi') {
    return <HostFlow config={config} onFinish={onFinish} />;
  }

  return (
    <div className="tm">
      <CallerPanel
        called={called}
        auto={auto}
        paused={paused}
        intervalSec={config.intervalSec}
        onCall={doCall}
        onToggleAuto={() => {
          setAuto((v) => !v);
          setPaused(false);
        }}
        onTogglePause={() => setPaused((v) => !v)}
        onIntervalChange={(s) => setConfig({ ...config, intervalSec: s })}
        actionRow={
          <div className="tm-row">
            <Button variant="secondary" size="sm" onClick={() => setResetOpen(true)}>
              {t('tambola.reset')}
            </Button>
            <Button variant="success" size="sm" onClick={() => setClaimOpen(true)}>
              {t('tambola.claimWin')}
            </Button>
            <Button variant="danger" size="sm" onClick={() => setEndOpen(true)}>
              {t('tambola.endGame')}
            </Button>
          </div>
        }
      />

      <Card title={t('tambola.ticketsLabel')}>
        <div className="tm-players">
          {tickets.map((playerTickets, p) => (
            <details
              className="tm-player"
              key={p}
              open={p === 0}
            >
              <summary>{playerName(p)}</summary>
              <div className="tm-player__tickets">
                {playerTickets.map((ticket, i) => (
                  <TicketCard
                    key={i}
                    ticket={ticket}
                    called={calledSet}
                    label={ticketLabel(i)}
                  />
                ))}
              </div>
            </details>
          ))}
        </div>
      </Card>

      <Card title={t('tambola.claimedWins')}>
        {claims.length === 0 ? (
          <p className="tm-muted">{t('tambola.noClaimsYet')}</p>
        ) : (
          <ul className="tm-claims">
            {claims.map((c, i) => (
              <li key={i} className="tm-claims__item">
                <span>{t(nameKeyFor(c.pattern))}</span>
                <strong>
                  {playerName(c.playerIndex)} · {ticketLabel(c.ticketIndex)}
                </strong>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <ClaimDialog
        open={claimOpen}
        onClose={() => setClaimOpen(false)}
        enabled={config.enabled}
        claimed={claimedIds}
        playerCount={config.playerCount}
        tickets={tickets}
        called={calledSet}
        onApprove={approveClaim}
        onReject={rejectClaim}
      />

      <ConfirmDialog
        open={resetOpen}
        title={t('tambola.resetTitle')}
        message={t('tambola.resetMessage')}
        confirmLabel={t('tambola.reset')}
        cancelLabel={t('common.cancel')}
        onConfirm={resetCalling}
        onCancel={() => setResetOpen(false)}
        danger
      />

      <ConfirmDialog
        open={endOpen}
        title={t('tambola.endGameTitle')}
        message={t('tambola.endGameMessage')}
        confirmLabel={t('tambola.endGame')}
        cancelLabel={t('common.cancel')}
        onConfirm={endGame}
        onCancel={() => setEndOpen(false)}
        danger
      />
    </div>
  );
}
