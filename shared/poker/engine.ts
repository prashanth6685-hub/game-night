/**
 * Texas Hold'em engine for the Game Night web app (Practice Mode vs bots).
 *
 * Pure TypeScript game logic: no React, no I/O. State transitions are
 * immutable — every function clones the incoming state and returns the new
 * one, so React can treat states as snapshots.
 *
 * Betting model:
 * - `chips` is the stack available to wager (excludes committed chips).
 * - `bet` is what the player committed THIS betting round.
 * - `handCommitted` is what the player committed over the WHOLE hand
 *   (drives side-pot accounting).
 * - `toCall` is the current bet level every active player must match.
 * - bet/raise `amount`s are the NEW TOTAL bet level for the round,
 *   not the increment.
 */

import { makeDeck, shuffle } from './cards.ts';
import type { Card } from './cards.ts';
import { compareHands, evaluate } from './handEval.ts';
import type { EvaluatedHand } from './handEval.ts';

export type Street = 'preflop' | 'flop' | 'turn' | 'river' | 'showdown' | 'complete';

export interface PokerPlayerState {
  seat: number;
  name: string;
  isBot: boolean;
  chips: number;
  bet: number;
  handCommitted: number;
  hole: Card[];
  folded: boolean;
  allIn: boolean;
  eliminated: boolean;
  acted: boolean;
}

export type PokerAction =
  | { type: 'fold' }
  | { type: 'check' }
  | { type: 'call' }
  | { type: 'bet'; amount: number }
  | { type: 'raise'; amount: number }
  | { type: 'all-in' };

export type LegalAction =
  | { type: 'fold' }
  | { type: 'check' }
  | { type: 'call'; amount: number }
  | { type: 'bet'; min: number; max: number }
  | { type: 'raise'; minTo: number; maxTo: number; toCall: number }
  | { type: 'all-in'; amount: number };

export interface PotResult {
  potIndex: number;
  amount: number;
  winnerSeats: number[];
  each: number;
  handName: string;
}

export interface ShowdownPlayer {
  seat: number;
  name: string;
  hole: Card[];
  handName: string;
  best: readonly Card[];
}

export type PokerEvent =
  | { kind: 'blind'; seat: number; amount: number; blind: 'small' | 'big' }
  | { kind: 'deal' }
  | { kind: 'action'; seat: number; action: PokerAction; chips: number }
  | { kind: 'street'; street: Street }
  | { kind: 'showdown'; players: ShowdownPlayer[] }
  | { kind: 'pot'; result: PotResult }
  | { kind: 'hand-end' }
  | { kind: 'eliminated'; seat: number };

export interface PokerState {
  players: PokerPlayerState[];
  button: number;
  handNumber: number;
  street: Street;
  community: Card[];
  deck: Card[];
  toCall: number;
  minRaiseTo: number;
  lastIncrement: number;
  actorSeat: number;
  smallBlind: number;
  bigBlind: number;
  winners: PotResult[];
  showdown: ShowdownPlayer[] | null;
  random: () => number;
}

export interface TableConfig {
  names: string[];
  isBot: boolean[];
  startingStack: number;
  smallBlind: number;
  bigBlind: number;
  random?: () => number;
}

type HandResult = { ok: true; state: PokerState; events: PokerEvent[] } | { ok: false; error: string };
type RebuyResult = { ok: true; state: PokerState } | { ok: false; error: string };

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

function playerAt(players: readonly PokerPlayerState[], seat: number): PokerPlayerState | undefined {
  return seat >= 0 && seat < players.length ? players[seat] : undefined;
}

/** In the hand and holding chips. */
function isActive(p: PokerPlayerState): boolean {
  return !p.eliminated && p.chips > 0;
}

/** May still take an action this hand. */
function isActionable(p: PokerPlayerState): boolean {
  return !p.folded && !p.eliminated && !p.allIn && p.chips > 0;
}

/** Next seat clockwise from `from` (exclusive) satisfying `pred`; -1 if none. */
function nextSeatFrom(
  players: readonly PokerPlayerState[],
  from: number,
  pred: (p: PokerPlayerState) => boolean,
): number {
  const n = players.length;
  for (let i = 1; i <= n; i++) {
    const idx = (from + i) % n;
    const p = players[idx];
    if (p !== undefined && pred(p)) return idx;
  }
  return -1;
}

function countActionable(players: readonly PokerPlayerState[]): number {
  let n = 0;
  for (const p of players) if (isActionable(p)) n++;
  return n;
}

/** Clockwise distance from `from` to `seat` (0 when seat === from). */
function clockwiseDistance(from: number, seat: number, n: number): number {
  return (((seat - from) % n) + n) % n;
}

function clonePlayer(p: PokerPlayerState): PokerPlayerState {
  return { ...p, hole: [...p.hole] };
}

function cloneState(s: PokerState): PokerState {
  return {
    ...s,
    players: s.players.map(clonePlayer),
    community: [...s.community],
    deck: [...s.deck],
    winners: s.winners.map((w) => ({ ...w, winnerSeats: [...w.winnerSeats] })),
    showdown: s.showdown
      ? s.showdown.map((sd) => ({ ...sd, hole: [...sd.hole], best: [...sd.best] }))
      : null,
  };
}

/**
 * Move chips from stack to the current bet. Returns the chips committed.
 * Marks the player acted + all-in when the stack empties.
 */
function commitChips(p: PokerPlayerState, x: number): number {
  const amount = Math.min(Math.max(0, x), p.chips);
  p.chips -= amount;
  p.bet += amount;
  p.handCommitted += amount;
  p.acted = true;
  if (p.chips === 0) p.allIn = true;
  return amount;
}

// ---------------------------------------------------------------------------
// Table setup
// ---------------------------------------------------------------------------

export function createTable(cfg: TableConfig): PokerState {
  const count = cfg.names.length;
  if (!Number.isInteger(count) || count < 2 || count > 8) {
    throw new Error(`poker: need 2-8 players, got ${count}`);
  }
  if (cfg.isBot.length !== count) {
    throw new Error('poker: names and isBot must have the same length');
  }
  const { startingStack, smallBlind, bigBlind } = cfg;
  if (!(startingStack > 0) || !(smallBlind > 0) || !(smallBlind < bigBlind) || !(bigBlind <= startingStack)) {
    throw new Error('poker: need 0 < smallBlind < bigBlind <= startingStack');
  }
  const players: PokerPlayerState[] = cfg.names.map((name, i) => ({
    seat: i,
    name,
    isBot: cfg.isBot[i] === true,
    chips: startingStack,
    bet: 0,
    handCommitted: 0,
    hole: [],
    folded: false,
    allIn: false,
    eliminated: false,
    acted: false,
  }));
  return {
    players,
    button: -1,
    handNumber: 0,
    street: 'complete',
    community: [],
    deck: [],
    toCall: 0,
    minRaiseTo: 0,
    lastIncrement: 0,
    actorSeat: -1,
    smallBlind,
    bigBlind,
    winners: [],
    showdown: null,
    random: cfg.random ?? Math.random,
  };
}

function postBlind(
  s: PokerState,
  seat: number,
  amount: number,
  blind: 'small' | 'big',
  events: PokerEvent[],
): void {
  const pl = playerAt(s.players, seat);
  if (!pl || pl.chips <= 0) return;
  const x = Math.min(amount, pl.chips);
  pl.chips -= x;
  pl.bet += x;
  pl.handCommitted += x;
  if (pl.chips === 0) pl.allIn = true;
  // Note: blinds do NOT set acted — the big blind still gets the option.
  events.push({ kind: 'blind', seat: pl.seat, amount: x, blind });
}

export function startHand(state: PokerState): HandResult {
  if (state.street !== 'complete') {
    return { ok: false, error: 'a hand is already in progress' };
  }
  const active = state.players.filter(isActive);
  if (active.length < 2) {
    return { ok: false, error: 'need at least 2 players with chips to start a hand' };
  }
  const s = cloneState(state);
  s.handNumber += 1;
  if (s.button < 0) {
    const first = active[0];
    s.button = first ? first.seat : 0;
  } else {
    s.button = nextSeatFrom(s.players, s.button, isActive);
  }
  for (const pl of s.players) {
    pl.bet = 0;
    pl.handCommitted = 0;
    pl.hole = [];
    pl.folded = false;
    pl.allIn = false;
    pl.acted = false;
  }
  s.community = [];
  s.deck = shuffle(makeDeck(), s.random);
  s.winners = [];
  s.showdown = null;

  // Deal two hole cards to each active player, one at a time around the
  // table, starting with the seat left of the button.
  const order: number[] = [];
  let cursor = s.button;
  for (let i = 0; i < active.length; i++) {
    cursor = nextSeatFrom(s.players, cursor, isActive);
    if (cursor < 0) break;
    order.push(cursor);
  }
  for (let round = 0; round < 2; round++) {
    for (const seatIdx of order) {
      const pl = playerAt(s.players, seatIdx);
      const c = s.deck.pop();
      if (pl && c) pl.hole.push(c);
    }
  }

  const events: PokerEvent[] = [];
  const headsUp = active.length === 2;
  const sbSeat = headsUp ? s.button : nextSeatFrom(s.players, s.button, isActive);
  const bbSeat = nextSeatFrom(s.players, sbSeat, isActive);
  postBlind(s, sbSeat, s.smallBlind, 'small', events);
  postBlind(s, bbSeat, s.bigBlind, 'big', events);

  let maxBet = 0;
  for (const pl of s.players) maxBet = Math.max(maxBet, pl.bet);
  s.toCall = maxBet;
  s.lastIncrement = s.bigBlind;
  s.minRaiseTo = s.toCall + s.lastIncrement;
  s.street = 'preflop';
  events.push({ kind: 'deal' });
  events.push({ kind: 'street', street: 'preflop' });

  // Heads-up: the button posted the small blind and acts first. Otherwise
  // action starts left of the big blind.
  const buttonPlayer = playerAt(s.players, s.button);
  s.actorSeat =
    headsUp && buttonPlayer && isActionable(buttonPlayer)
      ? s.button
      : nextSeatFrom(s.players, headsUp ? s.button : bbSeat, isActionable);

  if (s.actorSeat < 0) {
    // Everyone is all-in from the blinds: deal the board out to showdown.
    runOutBoard(s, events);
    doShowdown(s, events);
  }
  return { ok: true, state: s, events };
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

export function legalActions(state: PokerState, seat: number): LegalAction[] {
  if (state.street === 'complete' || state.street === 'showdown') return [];
  const p = playerAt(state.players, seat);
  if (!p || !isActionable(p)) return [];
  const actions: LegalAction[] = [{ type: 'fold' }];
  const need = state.toCall - p.bet;
  if (need <= 0) {
    actions.push({ type: 'check' });
  } else {
    actions.push({ type: 'call', amount: Math.min(need, p.chips) });
  }
  if (state.toCall === 0) {
    // Opening bet: at least the big blind.
    if (p.chips >= state.bigBlind) {
      actions.push({ type: 'bet', min: state.bigBlind, max: p.chips });
    }
  } else {
    const maxTo = p.bet + p.chips;
    if (maxTo >= state.minRaiseTo && p.chips > need) {
      actions.push({ type: 'raise', minTo: state.minRaiseTo, maxTo, toCall: need });
    }
  }
  actions.push({ type: 'all-in', amount: p.chips });
  return actions;
}

export function applyAction(state: PokerState, seat: number, action: PokerAction): HandResult {
  if (state.street === 'complete' || state.street === 'showdown') {
    return { ok: false, error: 'no hand in progress' };
  }
  if (seat !== state.actorSeat) {
    return { ok: false, error: `seat ${seat} is not the actor (actor is ${state.actorSeat})` };
  }
  const s = cloneState(state);
  const p = playerAt(s.players, seat);
  if (!p || !isActionable(p)) {
    return { ok: false, error: `seat ${seat} cannot act` };
  }
  const events: PokerEvent[] = [];
  const prevToCall = s.toCall;
  const need = prevToCall - p.bet;

  switch (action.type) {
    case 'fold': {
      p.folded = true;
      p.acted = true;
      events.push({ kind: 'action', seat, action, chips: 0 });
      break;
    }
    case 'check': {
      if (p.bet !== prevToCall) return { ok: false, error: 'cannot check facing a bet' };
      p.acted = true;
      events.push({ kind: 'action', seat, action, chips: 0 });
      break;
    }
    case 'call': {
      if (need <= 0) return { ok: false, error: 'nothing to call' };
      const committed = commitChips(p, Math.min(need, p.chips));
      events.push({ kind: 'action', seat, action, chips: committed });
      break;
    }
    case 'bet': {
      if (prevToCall !== 0) return { ok: false, error: 'cannot bet into an existing bet; raise instead' };
      const amount = action.amount;
      if (!Number.isFinite(amount) || amount < s.bigBlind) {
        return { ok: false, error: `opening bet must be at least the big blind (${s.bigBlind})` };
      }
      const x = amount - p.bet;
      if (x <= 0 || x > p.chips) return { ok: false, error: 'invalid bet amount' };
      const committed = commitChips(p, x);
      events.push({ kind: 'action', seat, action, chips: committed });
      break;
    }
    case 'raise': {
      if (prevToCall <= 0) return { ok: false, error: 'nothing to raise; bet instead' };
      const amount = action.amount;
      if (!Number.isFinite(amount) || amount < s.minRaiseTo) {
        return { ok: false, error: `raise must be to at least ${s.minRaiseTo}` };
      }
      const x = amount - p.bet;
      if (x <= 0 || x > p.chips) return { ok: false, error: 'invalid raise amount' };
      const committed = commitChips(p, x);
      events.push({ kind: 'action', seat, action, chips: committed });
      break;
    }
    case 'all-in': {
      if (p.chips <= 0) return { ok: false, error: 'no chips to go all-in with' };
      const committed = commitChips(p, p.chips);
      events.push({ kind: 'action', seat, action, chips: committed });
      break;
    }
  }

  // Aggressive action: the bet level rose. A full raise (increment >= the
  // previous increment) reopens betting for everyone else; a short all-in
  // raise lifts toCall but does NOT reset acted flags.
  if (!p.folded) {
    const newLevel = p.bet;
    if (newLevel > prevToCall) {
      const increment = newLevel - prevToCall;
      s.toCall = newLevel;
      if (increment >= s.lastIncrement) {
        s.lastIncrement = increment;
        for (const q of s.players) {
          if (q.seat !== seat && isActionable(q)) q.acted = false;
        }
      }
      s.minRaiseTo = s.toCall + s.lastIncrement;
    }
  }

  const remaining = s.players.filter((q) => !q.folded && !q.eliminated);
  if (remaining.length === 1) {
    const winner = remaining[0];
    if (winner) {
      awardUncontested(s, winner, events);
      return { ok: true, state: s, events };
    }
  }

  const next = nextSeatFrom(
    s.players,
    seat,
    (q) => isActionable(q) && (!q.acted || q.bet < s.toCall),
  );
  if (next >= 0) {
    s.actorSeat = next;
    return { ok: true, state: s, events };
  }
  advanceStreet(s, events);
  return { ok: true, state: s, events };
}

// ---------------------------------------------------------------------------
// Streets
// ---------------------------------------------------------------------------

/** Burn one card, then deal the next street's board cards. */
function dealBoardStreet(s: PokerState, events: PokerEvent[]): void {  const next: Street = s.street === 'preflop' ? 'flop' : s.street === 'flop' ? 'turn' : 'river';
  s.deck.pop(); // burn
  const n = next === 'flop' ? 3 : 1;
  for (let i = 0; i < n; i++) {
    const c = s.deck.pop();
    if (c) s.community.push(c);
  }
  s.street = next;
  events.push({ kind: 'street', street: next });
}

/** Deal every remaining board street (used when no more betting is possible). */
function runOutBoard(s: PokerState, events: PokerEvent[]): void {
  while (s.street !== 'river') dealBoardStreet(s, events);
}

/** Called when the current betting round is complete. */
function advanceStreet(s: PokerState, events: PokerEvent[]): void {
  if (s.street === 'river') {
    doShowdown(s, events);
    return;
  }
  for (const q of s.players) {
    q.bet = 0;
    q.acted = false;
  }
  s.toCall = 0;
  s.lastIncrement = s.bigBlind;
  s.minRaiseTo = s.bigBlind;
  dealBoardStreet(s, events);

  const contenders = s.players.filter((q) => !q.folded && !q.eliminated);
  if (contenders.length === 1) {
    const winner = contenders[0];
    if (winner) awardUncontested(s, winner, events);
    return;
  }
  if (countActionable(s.players) <= 1) {
    // Nobody left to bet against: deal the rest of the board and show down.
    runOutBoard(s, events);
    doShowdown(s, events);
    return;
  }
  s.actorSeat = nextSeatFrom(s.players, s.button, isActionable);
}

function awardUncontested(s: PokerState, winner: PokerPlayerState, events: PokerEvent[]): void {
  const amount = potTotal(s);
  winner.chips += amount;
  const result: PotResult = {
    potIndex: 0,
    amount,
    winnerSeats: [winner.seat],
    each: amount,
    handName: 'fold',
  };
  s.winners = [result];
  s.street = 'complete';
  s.actorSeat = -1;
  for (const pl of s.players) {
    pl.bet = 0;
    pl.handCommitted = 0;
  }
  events.push({ kind: 'pot', result });
  events.push({ kind: 'hand-end' });
}

function doShowdown(s: PokerState, events: PokerEvent[]): void {
  interface Contender {
    player: PokerPlayerState;
    hand: EvaluatedHand;
  }
  const contenders: Contender[] = [];
  for (const pl of s.players) {
    if (pl.folded || pl.eliminated) continue;
    contenders.push({ player: pl, hand: evaluate([...pl.hole, ...s.community]) });
  }
  const showdown: ShowdownPlayer[] = contenders.map((c) => ({
    seat: c.player.seat,
    name: c.player.name,
    hole: [...c.player.hole],
    handName: c.hand.name,
    best: [...c.hand.best],
  }));
  events.push({ kind: 'showdown', players: showdown });

  // Side pots: walk the sorted unique contribution levels. Each pot's share
  // is the level delta times the number of players who contributed at least
  // that much (folded players' chips stay in). Only non-folded contributors
  // at that level can win it.
  const levels = Array.from(
    new Set(s.players.map((pl) => pl.handCommitted).filter((c) => c > 0)),
  ).sort((a, b) => a - b);
  const results: PotResult[] = [];
  let prev = 0;
  for (const level of levels) {
    const delta = level - prev;
    prev = level;
    let shares = 0;
    for (const pl of s.players) if (pl.handCommitted >= level) shares++;
    const amount = delta * shares;
    if (amount <= 0) continue;
    const eligible = contenders.filter((c) => c.player.handCommitted >= level);
    const first = eligible[0];
    if (!first) continue; // unreachable: the top contributor at a level never folds
    let best = first;
    for (const c of eligible) {
      if (compareHands(c.hand, best.hand) > 0) best = c;
    }
    const winners = eligible.filter((c) => compareHands(c.hand, best.hand) === 0);
    const each = Math.floor(amount / winners.length);
    let odd = amount - each * winners.length;
    const ordered = [...winners].sort(
      (a, b) =>
        clockwiseDistance(s.button, a.player.seat, s.players.length) -
        clockwiseDistance(s.button, b.player.seat, s.players.length),
    );
    const winnerSeats = ordered.map((c) => c.player.seat);
    for (const c of ordered) {
      let award = each;
      if (odd > 0) {
        award += 1;
        odd -= 1;
      }
      c.player.chips += award;
    }
    const result: PotResult = {
      potIndex: results.length,
      amount,
      winnerSeats,
      each,
      handName: best.hand.name,
    };
    results.push(result);
    events.push({ kind: 'pot', result });
  }

  for (const pl of s.players) {
    if (!pl.eliminated && pl.chips === 0) {
      pl.eliminated = true;
      events.push({ kind: 'eliminated', seat: pl.seat });
    }
  }
  s.winners = results;
  s.showdown = showdown;
  s.street = 'complete';
  s.actorSeat = -1;
  for (const pl of s.players) {
    pl.bet = 0;
    pl.handCommitted = 0;
  }
  events.push({ kind: 'hand-end' });
}

// ---------------------------------------------------------------------------
// Rebuy + pot total
// ---------------------------------------------------------------------------

export function rebuy(state: PokerState, seat: number, amount: number): RebuyResult {
  if (state.street !== 'complete') {
    return { ok: false, error: 'rebuys are only allowed between hands' };
  }
  const p = playerAt(state.players, seat);
  if (!p) return { ok: false, error: `no player at seat ${seat}` };
  if (!p.eliminated) return { ok: false, error: 'player is not eliminated' };
  if (!(amount > 0)) return { ok: false, error: 'rebuy amount must be positive' };
  const s = cloneState(state);
  const q = playerAt(s.players, seat);
  if (!q) return { ok: false, error: `no player at seat ${seat}` };
  q.chips = amount;
  q.eliminated = false;
  return { ok: true, state: s };
}

export function potTotal(state: PokerState): number {
  let total = 0;
  for (const p of state.players) total += p.handCommitted;
  return total;
}
