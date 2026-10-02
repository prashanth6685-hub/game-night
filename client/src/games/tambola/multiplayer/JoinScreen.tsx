// Player join flow for multi-phone Tambola: opened from the QR code at
// #/tambola/join/<CODE>. Enter name → get a ticket → dab + claim live.

import { useEffect, useRef, useState } from 'react';
import { useI18n } from '../../../i18n/index.ts';
import {
  Button,
  Card,
  ErrorMessage,
  Spinner,
  useToast,
} from '../../../shared/ui/index.ts';
import type { Ticket } from '../logic/ticket.ts';
import type { PatternId } from '../logic/patterns.ts';
import { TambolaMp, openRoomEvents } from './api.ts';
import type { MpClaimStatus, RoomResults } from './api.ts';
import { PlayerTicket } from './PlayerTicket.tsx';

function goHome(): void {
  window.location.hash = '#/';
}

interface Session {
  playerId: string;
  playerToken: string;
  name: string;
}

function sessionKey(code: string): string {
  return `tmq-join-${code}`;
}

function loadSession(code: string): Session | null {
  try {
    const raw = localStorage.getItem(sessionKey(code));
    if (!raw) return null;
    const s = JSON.parse(raw) as Partial<Session>;
    if (typeof s.playerId === 'string' && typeof s.playerToken === 'string' && typeof s.name === 'string') {
      return { playerId: s.playerId, playerToken: s.playerToken, name: s.name };
    }
  } catch {
    // corrupted — ignore
  }
  return null;
}

type Phase = 'loading' | 'name' | 'ticket' | 'ended' | 'error';

interface ClaimState {
  id: string;
  playerName: string;
  pattern: PatternId;
  status: MpClaimStatus;
  mine: boolean;
}

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

export default function JoinScreen({ code }: { code: string }): JSX.Element {
  const { t } = useI18n();
  const { toast } = useToast();
  const [phase, setPhase] = useState<Phase>('loading');
  const [error, setError] = useState('');
  const [roomStatus, setRoomStatus] = useState('');
  const [name, setName] = useState('');
  const [joining, setJoining] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [called, setCalled] = useState<number[]>([]);
  const [dabbed, setDabbed] = useState<Set<number>>(new Set());
  const [enabledPatterns, setEnabledPatterns] = useState<PatternId[]>([]);
  const [claims, setClaims] = useState<ClaimState[]>([]);
  const [results, setResults] = useState<RoomResults | null>(null);
  const sessionRef = useRef<Session | null>(null);
  sessionRef.current = session;
  // Claim ids filed by this device (for outcome toasts).
  const myClaimIds = useRef<Set<string>>(new Set());

  // Load room info; resume a saved session when present.
  useEffect(() => {
    let cancelled = false;
    TambolaMp.getRoomInfo(code)
      .then((info) => {
        if (cancelled) return;
        setRoomStatus(info.status);
        const saved = loadSession(code);
        if (saved) {
          setSession(saved);
          setPhase(info.status === 'ended' ? 'ended' : 'ticket');
        } else {
          setPhase(info.status === 'ended' ? 'ended' : 'name');
        }
      })
      .catch((e: Error) => {
        if (cancelled) return;
        setError(
          e.message.includes('room not found')
            ? t('tambola.roomNotFound')
            : t('errors.generic'),
        );
        setPhase('error');
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  // Live events once we have a session.
  useEffect(() => {
    if (!session || (phase !== 'ticket' && phase !== 'ended')) return;
    return openRoomEvents(
      code,
      { role: 'player', playerId: session.playerId, token: session.playerToken },
      (ev) => {
        switch (ev.type) {
          case 'hello':
            if (ev.kind === 'player') {
              const s = ev.state as unknown as {
                ticket: Ticket;
                dabbed: number[];
                called: number[];
                enabledPatterns: PatternId[];
                claims: ClaimState[];
                status: string;
                results?: RoomResults;
              };
              setTicket(s.ticket);
              setDabbed(new Set(s.dabbed));
              setCalled(s.called);
              setEnabledPatterns(s.enabledPatterns);
              setClaims(
                s.claims.map((c) => ({
                  ...c,
                  mine: false,
                })),
              );
              setRoomStatus(s.status);
              if (s.status === 'ended') {
                if (s.results) setResults(s.results);
                setPhase('ended');
              }
            }
            break;
          case 'called':
            setCalled((c) => (c.includes(ev.number) ? c : [...c, ev.number]));
            break;
          case 'claim-resolved': {
            const wasMine = myClaimIds.current.delete(ev.claimId);
            setClaims((cs) =>
              cs.map((c) =>
                c.id === ev.claimId
                  ? { ...c, status: ev.approved ? 'approved' : 'rejected' }
                  : c,
              ),
            );
            if (wasMine) {
              toast(
                ev.approved
                  ? t('tambola.claimApprovedToast')
                  : t('tambola.claimRejectedToast'),
              );
            }
            break;
          }
          case 'claim':
            setClaims((cs) =>
              cs.some((c) => c.id === ev.claim.id)
                ? cs
                : [...cs, { ...ev.claim, mine: false }],
            );
            break;
          case 'ended':
            setResults(ev.results);
            setPhase('ended');
            break;
          case 'started':
            setRoomStatus('playing');
            break;
          case 'players':
            break;
        }
      },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, session, phase === 'ticket' || phase === 'ended']);

  const doJoin = async (): Promise<void> => {
    const trimmed = name.trim();
    if (trimmed.length === 0 || joining) return;
    setJoining(true);
    try {
      const res = await TambolaMp.joinRoom(code, trimmed);
      const s: Session = {
        playerId: res.playerId,
        playerToken: res.playerToken,
        name: res.name,
      };
      try {
        localStorage.setItem(sessionKey(code), JSON.stringify(s));
      } catch {
        // private mode — session just won't survive reloads
      }
      setSession(s);
      setTicket(res.ticket);
      setPhase('ticket');
    } catch (e) {
      const msg = e instanceof Error ? e.message : '';
      toast(
        msg.includes('already-started')
          ? t('tambola.alreadyStarted')
          : msg.includes('room-full')
            ? t('tambola.roomFull')
            : t('errors.generic'),
      );
    } finally {
      setJoining(false);
    }
  };

  const toggleDab = (n: number): void => {
    const s = sessionRef.current;
    if (!s) return;
    const next = new Set(dabbed);
    const dabbing = !next.has(n);
    if (dabbing) next.add(n);
    else next.delete(n);
    setDabbed(next);
    TambolaMp.dab(code, s.playerId, s.playerToken, n, dabbing).catch(() => {
      // Revert on failure.
      setDabbed((prev) => {
        const reverted = new Set(prev);
        if (dabbing) reverted.delete(n);
        else reverted.add(n);
        return reverted;
      });
      toast(t('errors.generic'));
    });
  };

  const doClaim = (pattern: PatternId): void => {
    const s = sessionRef.current;
    if (!s) return;
    TambolaMp.claim(code, s.playerId, s.playerToken, pattern)
      .then((res) => {
        myClaimIds.current.add(res.claimId);
        setClaims((cs) => [
          ...cs,
          { id: res.claimId, playerName: s.name, pattern, status: 'pending', mine: true },
        ]);
      })
      .catch((e: Error) => {
        toast(e.message.includes('already-approved') ? t('tambola.claimLocked') : t('errors.generic'));
      });
  };

  if (phase === 'loading') {
    return (
      <div className="tmq-center">
        <Spinner />
      </div>
    );
  }

  if (phase === 'error') {
    return (
      <div className="gh-grid">
        <ErrorMessage message={error} onRetry={goHome} />
      </div>
    );
  }

  if (phase === 'name') {
    return (
      <div className="tm">
        <Card title={t('tambola.joinTitle')}>
          <p className="tm-muted">
            {t('tambola.joinSubtitle').replace('{code}', code)}
          </p>
          {roomStatus === 'playing' ? (
            <p className="tmq-pending">⏳ {t('tambola.gameInProgress')}</p>
          ) : null}
          <label className="tm-claim__label" htmlFor="tmq-name">
            {t('tambola.nameLabel')}
          </label>
          <input
            id="tmq-name"
            className="tmq-input"
            type="text"
            maxLength={24}
            autoComplete="nickname"
            placeholder={t('tambola.namePlaceholder')}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void doJoin();
            }}
          />
          <div className="gh-mt">
            <Button variant="primary" size="lg" fullWidth disabled={joining || name.trim().length === 0} onClick={() => void doJoin()}>
              {joining ? t('tambola.joining') : t('tambola.joinButton')}
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (phase === 'ended') {
    return (
      <div className="tm">
        <Card title={`🎉 ${t('tambola.gameOverTitle')}`}>
          {results && results.winners.length > 0 ? (
            <ul className="tm-claims">
              {results.winners.map((w, i) => (
                <li key={i} className="tm-claims__item">
                  <span>{t(patternNameKey(w.pattern))}</span>
                  <strong>{w.playerName}</strong>
                </li>
              ))}
            </ul>
          ) : (
            <p className="tm-muted">{t('tambola.noClaimsLine')}</p>
          )}
          <div className="gh-mt">
            <Button variant="secondary" fullWidth onClick={goHome}>
              {t('tambola.backHome')}
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // Ticket phase.
  if (!ticket || !session) {
    return (
      <div className="tmq-center">
        <Spinner />
        <p className="tm-muted">{t('tambola.waitingHost')}</p>
      </div>
    );
  }

  const calledSet = new Set(called);
  const approvedPatterns = new Set(
    claims.filter((c) => c.status === 'approved').map((c) => c.pattern),
  );
  const pendingPattern = claims.find((c) => c.mine && c.status === 'pending')?.pattern ?? null;
  const winners = claims
    .filter((c) => c.status === 'approved')
    .map((c) => ({ playerName: c.playerName, pattern: c.pattern }));

  return (
    <PlayerTicket
      playerName={session.name}
      code={code}
      ticket={ticket}
      called={calledSet}
      dabbed={dabbed}
      calledCount={called.length}
      enabledPatterns={enabledPatterns}
      approvedPatterns={approvedPatterns}
      pendingPattern={pendingPattern}
      winners={winners}
      onToggle={toggleDab}
      onClaim={doClaim}
    />
  );
}
