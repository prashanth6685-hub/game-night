// Bingo — multi-phone (QR) play. The host's phone is the caller; every
// player (host included) plays their own card on their own phone. Called
// balls live in the shared room snapshot, while each card and its manual
// daubs stay local to the phone that generated them.

import { useEffect, useMemo, useRef, useState } from 'react';
import type { MpScreenProps } from '../../types.ts';
import { useI18n } from '../../../i18n/index.ts';
import { Button, Card, useToast } from '../../../shared/ui/index.ts';
import { playSound } from '../../../shared/sound.ts';
import { getMpSession } from '../../../shared/mp/session.ts';
import type { MpSession } from '../../../shared/mp/session.ts';
import { useMpRoom } from '../../../shared/mp/useMpRoom.ts';
import { MpWaitingRoom } from '../../../shared/mp/MpWaiting.tsx';
import {
  COLUMNS,
  FREE_COL,
  FREE_ROW,
  TOTAL_BALLS,
  checkPatterns,
  generateCard,
  patternProgress,
  shuffledBalls,
  type Ball,
  type BingoCard,
  type PatternId,
} from '../logic/bingo.ts';
import '../components/bingo.css';

export interface BingoMpConfig {
  pattern: PatternId;
  intervalSec: number;
}

export interface BingoMpState {
  drawn: number[];
  current: number | null;
  nextDrawAt: number;
  winnerSeat: number | null;
  winnerName: string | null;
}

export function initialBingoMpState(intervalSec: number): BingoMpState {
  return {
    drawn: [],
    current: null,
    nextDrawAt: Date.now() + intervalSec * 1000,
    winnerSeat: null,
    winnerName: null,
  };
}

interface BingoClaimPayload {
  card: BingoCard;
  pattern: PatternId;
}

interface BingoClaimRejectionPayload {
  seat: number;
}

interface MpPlayProps extends MpScreenProps {
  session: MpSession;
}

const SEAT_PATTERN_TOTALS: Record<PatternId, number> = {
  line: 5,
  'four-corners': 4,
  blackout: 25,
};

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

function isPatternId(value: unknown): value is PatternId {
  return value === 'line' || value === 'four-corners' || value === 'blackout';
}

function letterForNumber(n: number): string {
  return COLUMNS.find((c) => n >= c.min && n <= c.max)?.letter ?? '';
}

function parseBingoMpState(value: unknown): BingoMpState | null {
  if (typeof value !== 'object' || value === null) return null;
  const state = value as Record<string, unknown>;
  if (!Array.isArray(state.drawn)) return null;
  const drawn: number[] = [];
  const seen = new Set<number>();
  for (const n of state.drawn) {
    if (
      typeof n !== 'number' ||
      !Number.isInteger(n) ||
      n < 1 ||
      n > TOTAL_BALLS ||
      seen.has(n)
    ) {
      return null;
    }
    seen.add(n);
    drawn.push(n);
  }
  if (
    state.current !== null &&
    (typeof state.current !== 'number' || !seen.has(state.current))
  ) {
    return null;
  }
  if (typeof state.nextDrawAt !== 'number' || !Number.isFinite(state.nextDrawAt)) {
    return null;
  }
  if (
    state.winnerSeat !== null &&
    (typeof state.winnerSeat !== 'number' ||
      !Number.isInteger(state.winnerSeat) ||
      state.winnerSeat < 0)
  ) {
    return null;
  }
  if (state.winnerName !== null && typeof state.winnerName !== 'string') {
    return null;
  }
  return {
    drawn,
    current: state.current,
    nextDrawAt: state.nextDrawAt,
    winnerSeat: state.winnerSeat,
    winnerName: state.winnerName,
  };
}

function isBingoCard(value: unknown): value is BingoCard {
  if (!Array.isArray(value) || value.length !== 5) return false;
  const seen = new Set<number>();
  for (let r = 0; r < 5; r += 1) {
    const row: unknown = value[r];
    if (!Array.isArray(row) || row.length !== 5) return false;
    for (let c = 0; c < 5; c += 1) {
      const cell: unknown = row[c];
      if (r === FREE_ROW && c === FREE_COL) {
        if (cell !== null) return false;
        continue;
      }
      const column = COLUMNS[c];
      if (
        !column ||
        typeof cell !== 'number' ||
        !Number.isInteger(cell) ||
        cell < column.min ||
        cell > column.max ||
        seen.has(cell)
      ) {
        return false;
      }
      seen.add(cell);
    }
  }
  return seen.size === 24;
}

function parseClaimPayload(payload: unknown): BingoClaimPayload | null {
  if (typeof payload !== 'object' || payload === null) return null;
  const claim = payload as Record<string, unknown>;
  if (!isPatternId(claim.pattern) || !isBingoCard(claim.card)) return null;
  return { card: claim.card, pattern: claim.pattern };
}

function parseClaimRejection(payload: unknown): BingoClaimRejectionPayload | null {
  if (typeof payload !== 'object' || payload === null) return null;
  const rejection = payload as Record<string, unknown>;
  if (
    typeof rejection.seat !== 'number' ||
    !Number.isInteger(rejection.seat) ||
    rejection.seat < 0
  ) {
    return null;
  }
  return { seat: rejection.seat };
}

function cardStorageKey(code: string): string {
  return `mp-bingo-card-${code.toUpperCase()}`;
}

function daubStorageKey(code: string): string {
  return `mp-bingo-daubs-${code.toUpperCase()}`;
}

function orderStorageKey(code: string): string {
  return `mp-bingo-order-${code.toUpperCase()}`;
}

function loadOrCreateCard(code: string): BingoCard {
  const key = cardStorageKey(code);
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (isBingoCard(parsed)) return parsed;
    }
  } catch {
    // Storage unavailable or corrupt — create a fresh card below.
  }
  const card = generateCard();
  try {
    localStorage.setItem(key, JSON.stringify(card));
  } catch {
    // Play continues with the in-memory card.
  }
  return card;
}

function loadManualDaubed(code: string): Set<number> {
  try {
    const raw = localStorage.getItem(daubStorageKey(code));
    if (!raw) return new Set();
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(
      parsed.filter(
        (n): n is number =>
          typeof n === 'number' &&
          Number.isInteger(n) &&
          n >= 1 &&
          n <= TOTAL_BALLS,
      ),
    );
  } catch {
    return new Set();
  }
}

function saveManualDaubed(code: string, daubed: Set<number>): void {
  try {
    localStorage.setItem(daubStorageKey(code), JSON.stringify([...daubed]));
  } catch {
    // The current tap still applies for this session.
  }
}

function isBallOrder(value: unknown): value is Ball[] {
  if (!Array.isArray(value) || value.length !== TOTAL_BALLS) return false;
  const seen = new Set<number>();
  for (const ball of value) {
    if (typeof ball !== 'object' || ball === null) return false;
    const candidate = ball as Record<string, unknown>;
    if (
      typeof candidate.n !== 'number' ||
      !Number.isInteger(candidate.n) ||
      candidate.n < 1 ||
      candidate.n > TOTAL_BALLS ||
      seen.has(candidate.n) ||
      candidate.letter !== letterForNumber(candidate.n)
    ) {
      return false;
    }
    seen.add(candidate.n);
  }
  return seen.size === TOTAL_BALLS;
}

function loadOrCreateOrder(code: string): Ball[] {
  const key = orderStorageKey(code);
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (isBallOrder(parsed)) return parsed;
    }
  } catch {
    // Storage unavailable or corrupt — create a fresh order below.
  }
  const order = shuffledBalls();
  try {
    localStorage.setItem(key, JSON.stringify(order));
  } catch {
    // The host keeps the order in a ref for this session.
  }
  return order;
}

export default function MpGame({ code, onFinish, onExit }: MpScreenProps) {
  const session = getMpSession(code);
  if (!session) return null;
  return (
    <MpPlay code={code} onFinish={onFinish} onExit={onExit} session={session} />
  );
}

function MpPlay({ code, onFinish, onExit, session }: MpPlayProps) {
  const { t } = useI18n();
  const { toast } = useToast();
  const room = useMpRoom(session);
  const [card] = useState<BingoCard>(() => loadOrCreateCard(code));
  const [manualDaubed, setManualDaubed] = useState<Set<number>>(() =>
    loadManualDaubed(code),
  );
  const [claimSent, setClaimSent] = useState(false);
  const [claimMessage, setClaimMessage] = useState<string | null>(null);

  const finishedRef = useRef(false);
  const postingRef = useRef(false);
  const orderRef = useRef<Ball[] | null>(null);
  const processedIntentSeqRef = useRef(0);

  const config = useMemo<BingoMpConfig>(() => {
    const raw =
      typeof room.config === 'object' && room.config !== null
        ? (room.config as Record<string, unknown>)
        : {};
    return {
      pattern: isPatternId(raw.pattern) ? raw.pattern : 'line',
      intervalSec:
        raw.intervalSec === 3 || raw.intervalSec === 4 || raw.intervalSec === 5
          ? raw.intervalSec
          : 3,
    };
  }, [room.config]);

  const mpState = useMemo(() => parseBingoMpState(room.state), [room.state]);
  const mpStateRef = useRef<BingoMpState | null>(null);
  useEffect(() => {
    mpStateRef.current = mpState;
  }, [mpState]);

  const drawnSet = useMemo(
    () => new Set<number>(mpState?.drawn ?? []),
    [mpState?.drawn],
  );
  const completedPatterns = useMemo(
    () => checkPatterns(card, drawnSet),
    [card, drawnSet],
  );
  const canClaim =
    mpState !== null &&
    mpState.winnerSeat === null &&
    completedPatterns.includes(config.pattern);
  const progress = useMemo(
    () => patternProgress(card, drawnSet),
    [card, drawnSet],
  );
  const progressCovered =
    config.pattern === 'line'
      ? progress.line
      : config.pattern === 'four-corners'
        ? progress.corners
        : progress.blackout;

  // The host's phone is the caller. The shuffled order is created lazily on
  // this device only and persisted by room code; only drawn ball numbers are
  // posted to the shared snapshot, so no other phone can peek at what's next.
  useEffect(() => {
    if (!room.isHost || room.status !== 'playing') return;
    const id = window.setInterval(() => {
      void (async () => {
        if (postingRef.current) return;
        const currentState = mpStateRef.current;
        if (
          !currentState ||
          currentState.winnerSeat !== null ||
          currentState.drawn.length >= TOTAL_BALLS ||
          Date.now() < currentState.nextDrawAt
        ) {
          return;
        }
        if (!orderRef.current) {
          orderRef.current = loadOrCreateOrder(code);
        }
        const ball = orderRef.current[currentState.drawn.length];
        if (!ball) return;
        postingRef.current = true;
        try {
          await room.postState({
            drawn: [...currentState.drawn, ball.n],
            current: ball.n,
            nextDrawAt: Date.now() + config.intervalSec * 1000,
            winnerSeat: null,
            winnerName: null,
          });
          playSound('pop');
        } finally {
          postingRef.current = false;
        }
      })();
    }, 500);
    return () => window.clearInterval(id);
  }, [code, config.intervalSec, room.isHost, room.postState, room.status]);

  // Host-side claim verification and claim-rejection feedback. A claim is
  // accepted only when the exact card sent by the claimant completes the
  // room's selected pattern using balls already in the shared snapshot.
  useEffect(() => {
    const intent = room.lastIntent;
    if (!intent || intent.seq === processedIntentSeqRef.current) return;
    processedIntentSeqRef.current = intent.seq;

    if (intent.type === 'bingo-claim-rejected') {
      const rejection = parseClaimRejection(intent.payload);
      if (rejection?.seat === session.seat) {
        const message = t('bingo.mpClaimRejected');
        setClaimSent(false);
        setClaimMessage(message);
        toast(message, 'error');
      }
      return;
    }

    if (!room.isHost || intent.type !== 'bingo-claim') return;
    void (async () => {
      const currentState = mpStateRef.current;
      if (!currentState || currentState.winnerSeat !== null) return;
      const claim = parseClaimPayload(intent.payload);
      const drawn = new Set(currentState.drawn);
      const valid =
        claim !== null &&
        claim.pattern === config.pattern &&
        checkPatterns(claim.card, drawn).includes(claim.pattern);
      if (!valid) {
        await room.sendIntent('bingo-claim-rejected', {
          seat: intent.fromSeat,
        });
        return;
      }
      const posted = await room.postState({
        ...currentState,
        winnerSeat: intent.fromSeat,
        winnerName: intent.fromName,
      });
      if (posted) {
        await room.endGame({ winnerSeat: intent.fromSeat });
      }
    })();
  }, [
    config.pattern,
    room.endGame,
    room.isHost,
    room.lastIntent,
    room.postState,
    room.sendIntent,
    session.seat,
    t,
    toast,
  ]);

  // Every phone lands on the same results screen as soon as the winning
  // snapshot arrives. The ref guard keeps this to exactly one call.
  useEffect(() => {
    if (!mpState || mpState.winnerSeat === null || finishedRef.current) return;
    finishedRef.current = true;
    playSound('win');
    const winnerSeat = mpState.winnerSeat;
    const winnerName =
      mpState.winnerName ??
      room.players.find((p) => p.seat === winnerSeat)?.name ??
      session.name;
    if (room.isHost) {
      void room.endGame({ winnerSeat });
    }
    onFinish({
      title: fmt(t('bingo.winner'), { name: winnerName }),
      winner: winnerName,
      lines: [
        {
          label: t('bingo.winPattern'),
          value: t(patternNameKey(config.pattern)),
        },
        {
          label: t('bingo.ballsToWin'),
          value: String(mpState.drawn.length),
        },
      ],
    });
  }, [
    config.pattern,
    mpState,
    onFinish,
    room.endGame,
    room.isHost,
    room.players,
    session.name,
    t,
  ]);

  if (room.status === 'lobby' || !mpState) {
    return <MpWaitingRoom room={room} onExit={onExit} />;
  }

  const current = mpState.current;
  const recentBalls = mpState.drawn
    .slice(Math.max(0, mpState.drawn.length - 6), Math.max(0, mpState.drawn.length - 1))
    .reverse();
  const hostName =
    room.players.find((p) => p.isHost)?.name ?? t('mp.host');
  const winnerName =
    mpState.winnerSeat !== null
      ? (mpState.winnerName ??
        room.players.find((p) => p.seat === mpState.winnerSeat)?.name ??
        '')
      : null;

  function toggleDaub(n: number): void {
    if (mpState?.winnerSeat !== null || !drawnSet.has(n)) return;
    const next = new Set(manualDaubed);
    if (next.has(n)) next.delete(n);
    else next.add(n);
    setManualDaubed(next);
    saveManualDaubed(code, next);
    playSound('click');
  }

  function cellAriaLabel(v: number | null): string {
    if (v === null) return t('bingo.free');
    if (manualDaubed.has(v)) return fmt(t('bingo.cellDaubed'), { n: v });
    if (drawnSet.has(v)) return fmt(t('bingo.cellCalled'), { n: v });
    return fmt(t('bingo.cellNotCalled'), { n: v });
  }

  async function handleClaim(): Promise<void> {
    if (!canClaim || claimSent) return;
    setClaimSent(true);
    setClaimMessage(null);
    playSound('correct');
    try {
      await room.sendIntent('bingo-claim', {
        card,
        pattern: config.pattern,
      });
    } catch {
      const message = t('bingo.mpClaimRejected');
      setClaimSent(false);
      setClaimMessage(message);
      toast(message, 'error');
    }
  }

  return (
    <div className="bg-wrap">
      <div className="mp-turn-banner">
        {room.isHost
          ? t('bingo.mpHostCaller')
          : fmt(t('bingo.mpCaller'), { name: hostName })}
        {!room.connected && <span> · {t('mp.reconnecting')}</span>}
      </div>

      {winnerName ? (
        <div className="bg-winbanner" aria-live="polite">
          {fmt(t('bingo.winner'), { name: winnerName })}
        </div>
      ) : null}

      <Card>
        <div className="bg-caller">
          <div
            className="bg-ball"
            key={current ?? 'none'}
            aria-live="polite"
            aria-label={
              current !== null
                ? `${letterForNumber(current)} ${current}`
                : t('bingo.waitingFirstBall')
            }
          >
            {current !== null ? (
              <>
                <span className="bg-ball__letter">
                  {letterForNumber(current)}
                </span>
                <span className="bg-ball__num">{current}</span>
              </>
            ) : (
              <span className="bg-ball__waiting">
                {t('bingo.waitingFirstBall')}
              </span>
            )}
          </div>
          <div className="bg-caller__meta">
            <div className="bg-recent" aria-label={t('bingo.recentBalls')}>
              {recentBalls.map((n) => (
                <span key={n} className="bg-chip">
                  {letterForNumber(n)}
                  {n}
                </span>
              ))}
            </div>
            <div className="bg-count" aria-live="polite">
              <strong>{mpState.drawn.length}</strong> / {TOTAL_BALLS}
            </div>
            <div className="bg-count">
              {fmt(t('bingo.mpPatternGoal'), {
                pattern: t(patternNameKey(config.pattern)),
              })}
            </div>
          </div>
        </div>
      </Card>

      <Card title={t('bingo.yourCard')}>
        <p className="bg-hint">{t('bingo.mpDaubHint')}</p>
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
          {card.map((row, r) =>
            row.map((v, c) => {
              const isFree = r === FREE_ROW && c === FREE_COL;
              const called = v !== null && drawnSet.has(v);
              const manuallyDaubed = v !== null && manualDaubed.has(v);
              const cls =
                'bg-cell' +
                (isFree || manuallyDaubed ? ' bg-cell--daubed' : '') +
                (isFree ? ' bg-cell--free' : '') +
                (called && !manuallyDaubed ? ' bg-cell--called' : '');
              return (
                <button
                  type="button"
                  key={`${r}-${c}`}
                  className={cls}
                  disabled={isFree || !called || mpState.winnerSeat !== null}
                  aria-pressed={isFree || manuallyDaubed}
                  aria-label={cellAriaLabel(v)}
                  onClick={() => {
                    if (v !== null) toggleDaub(v);
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

      {mpState.winnerSeat === null ? (
        <div className="bg-claims">
          {canClaim ? (
            <p className="bg-claimhint">
              {fmt(t('bingo.claimHint'), {
                pattern: t(patternNameKey(config.pattern)),
              })}
            </p>
          ) : (
            <p className="bg-hint">
              {fmt(t('bingo.mpProgress'), {
                covered: progressCovered,
                total: SEAT_PATTERN_TOTALS[config.pattern],
                pattern: t(patternNameKey(config.pattern)),
              })}
            </p>
          )}
          <div className={canClaim ? 'bg-claim' : undefined}>
            <Button
              variant="success"
              size="lg"
              fullWidth
              disabled={!canClaim || claimSent}
              onClick={() => void handleClaim()}
            >
              {claimSent
                ? t('bingo.mpClaimSent')
                : fmt(t('bingo.claim'), {
                    pattern: t(patternNameKey(config.pattern)),
                  })}
            </Button>
          </div>
          {claimMessage ? (
            <p className="mp-error" role="alert">
              {claimMessage}
            </p>
          ) : null}
        </div>
      ) : null}

      <Card title={t('bingo.mpDrawnNumbers')}>
        {mpState.drawn.length > 0 ? (
          <div className="bg-recent" aria-label={t('bingo.mpDrawnNumbers')}>
            {mpState.drawn.map((n) => (
              <span key={n} className="bg-chip">
                {letterForNumber(n)}
                {n}
              </span>
            ))}
          </div>
        ) : (
          <p className="bg-hint">{t('bingo.waitingFirstBall')}</p>
        )}
        {mpState.drawn.length >= TOTAL_BALLS ? (
          <p className="bg-hint">{t('bingo.mpAllBallsDrawn')}</p>
        ) : null}
      </Card>

      <Card title={`${t('mp.players')} (${room.players.length})`}>
        <div className="mp-players">
          {room.players.map((p) => (
            <div className="mp-player" key={p.id}>
              <span>{p.seat === session.seat ? '⭐' : '👤'}</span>
              <span>
                {p.name}
                {p.seat === session.seat && (
                  <span className="mp-you"> ({t('mp.you')})</span>
                )}
              </span>
              {p.isHost && <em className="mp-host-badge">{t('mp.host')}</em>}
            </div>
          ))}
        </div>
      </Card>

      <Button variant="ghost" fullWidth onClick={onExit}>
        {t('mp.leave')}
      </Button>
    </div>
  );
}
