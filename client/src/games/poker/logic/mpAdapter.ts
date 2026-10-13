// Thin adapter: server room state -> the props PokerTable.tsx and
// ActionPanel.tsx already take. Seats are rotated so my seat becomes 0
// (PokerTable assumes seat 0 is the human). Legal actions come straight
// from the server (engine-computed `myLegalActions`); the server
// re-validates everything on POST /action.
// Pure functions — no React — so this module is unit-testable.

import type { Card } from '../../../../../shared/poker/cards.ts';
import type {
  LegalAction,
  PokerPlayerState,
  PokerState,
  Street,
} from '../../../../../shared/poker/engine.ts';
import type { PokerTableState, PokerVoicePeerState } from './pokerRooms.ts';

/** Placeholder for opponents' hidden hole cards (PokerTable renders the
 *  card back whenever faceDown is set; values are never shown). */
const HIDDEN: Card = { rank: 2, suit: 'spades' };

const BETTING_STREETS = new Set(['preflop', 'flop', 'turn', 'river']);

function toStreet(s: string | null): Street {
  if (
    s === 'preflop' ||
    s === 'flop' ||
    s === 'turn' ||
    s === 'river' ||
    s === 'showdown' ||
    s === 'complete'
  ) {
    return s;
  }
  return 'preflop';
}

export interface AdaptedTable {
  table: PokerState;
  pot: number;
  myChips: number;
  myBet: number;
  mySittingOut: boolean;
  myConnected: boolean;
  /** Server-computed legal actions (empty unless it is my turn). */
  legal: LegalAction[];
  /** Seconds until the turn expires, or null when the server sent none. */
  turnSecs: number | null;
}

export function adaptServerState(s: PokerTableState): AdaptedTable {
  const n = s.players.length;
  const my = s.mySeat;
  const rot = (seat: number): number =>
    n > 0 && my >= 0 ? (((seat - my) % n) + n) % n : seat;

  const sorted = [...s.players].sort((a, b) => a.seat - b.seat);
  const street = toStreet(s.street);
  const betting = s.street !== null && BETTING_STREETS.has(s.street);

  // At showdown the server reveals hole cards per player.
  const revealedBySeat = new Map<number, Card[]>();
  for (const r of s.showdownRevealed ?? []) {
    revealedBySeat.set(r.seat, [...r.hole]);
  }

  const players: PokerPlayerState[] = sorted.map((p) => {
    const seat = rot(p.seat);
    let hole: Card[] = [];
    if (revealedBySeat.has(p.seat)) {
      // Showdown reveal (covers my seat too — the server nulls myCards then).
      hole = revealedBySeat.get(p.seat) ?? [];
    } else if (seat === 0) {
      hole = s.myCards ?? [];
    } else if (betting && !p.folded) {
      hole = [HIDDEN, HIDDEN];
    }
    return {
      seat,
      name: p.name,
      isBot: false,
      chips: p.stack,
      bet: p.bet,
      handCommitted: 0,
      hole,
      folded: p.folded,
      allIn: p.allIn,
      eliminated: false,
      acted: false,
    };
  });

  const me = players.find((p) => p.seat === 0);
  const myPublic = sorted.find((p) => p.seat === my);

  const table: PokerState = {
    players,
    button: s.button < 0 ? -1 : rot(s.button),
    handNumber: s.handNumber,
    street,
    community: s.community ?? [],
    deck: [],
    toCall: s.toCall,
    minRaiseTo: s.minRaiseTo,
    lastIncrement: 0,
    actorSeat: s.actorSeat < 0 ? -1 : rot(s.actorSeat),
    smallBlind: s.config.smallBlind,
    bigBlind: s.config.bigBlind,
    winners: s.winners.map((w) => ({
      potIndex: w.potIndex,
      amount: w.amount,
      winnerSeats: w.winnerSeats.map(rot),
      each: w.each,
      handName: w.handName ?? '',
    })),
    showdown:
      s.showdownRevealed?.map((r) => ({
        seat: rot(r.seat),
        name: r.name,
        hole: [...r.hole],
        handName: r.handName,
        best: [...r.best],
      })) ?? null,
    random: () => 0.5,
  };

  const exp = s.turnExpiresAt;
  const turnSecs =
    typeof exp === 'number' ? Math.max(0, Math.round((exp - Date.now()) / 1000)) : null;

  return {
    table,
    pot: s.pot,
    myChips: me?.chips ?? 0,
    myBet: me?.bet ?? 0,
    mySittingOut: !!myPublic?.sittingOut,
    myConnected: myPublic?.connected !== false,
    legal: s.myLegalActions ?? [],
    turnSecs,
  };
}

/** Total rebuy chips for one seat, from the public ledger. */
export function rebuyTotal(
  ledger: PokerTableState['ledger'],
  mySeat: number,
): number {
  const entry = ledger.find((e) => e.seat === mySeat);
  return entry?.rebuys ?? 0;
}

/**
 * Per-seat mic badge for the table avatars. 'error' covers both the
 * server-side flag and local peer-connection failures. Seats not in voice
 * get no badge (cleaner table). Keys are ROTATED seats (my seat = 0), like
 * everything else PokerTable renders.
 */
export type MicBadgeKind = 'on' | 'muted' | 'speaking' | 'error';

export function adaptVoiceBadges(
  voice: Map<number, PokerVoicePeerState> | undefined,
  mySeat: number,
  playerCount: number,
  localErrors?: ReadonlySet<number>,
): Map<number, MicBadgeKind> {
  const out = new Map<number, MicBadgeKind>();
  if (!voice || playerCount <= 0) return out;
  const rot = (seat: number): number =>
    mySeat >= 0 ? (((seat - mySeat) % playerCount) + playerCount) % playerCount : seat;
  for (const [seat, v] of voice) {
    if (!v.joined) continue;
    let badge: MicBadgeKind = 'on';
    if (localErrors?.has(seat)) badge = 'error';
    else if (typeof v.error === 'string' && v.error !== '') badge = 'error';
    else if (v.muted) badge = 'muted';
    else if (v.speaking) badge = 'speaking';
    out.set(rot(seat), badge);
  }
  return out;
}
