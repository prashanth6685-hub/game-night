// Server-authoritative private poker rooms for Game Night.
//
// Texas Hold'em over SSE with the server as the single source of truth:
// the deck and every player's hole cards live ONLY on the server. Clients
// receive a public table view plus their own hole cards via GET /state.
//
// Design notes for the client worker:
// - All amounts are VIRTUAL chips, never real money.
// - SSE (GET /:code/events) broadcasts public events only: 'table' carries
//   the public table (no hole cards); 'showdown' carries the revealed cards
//   for a finished hand; clients re-fetch GET /:code/state for `myCards`.
// - Turn timer: 30s per action. On expiry the server auto-plays check (if
//   free) else fold for the actor. Disconnected players are auto-played the
//   same way immediately, without waiting for the timer.
// - Pause only works between hands (street === 'complete'); mid-hand -> 409.
// - Close auto-plays any in-progress hand to completion (check-if-free-else
//   fold, capped), then settles, saves the report, and locks the room.
// - Rebuys: only players seated at the table (inEngine) may rebuy.
//   Between hands, eliminated players rebuy via the engine; everyone else
//   just gets chips added. Mid-hand rebuys need rebuysMidHand=true and are
//   refused for eliminated players (they wait for the hand to end).
// - Late joiners (allowLateJoin) sit out until the next hand is dealt.

import type { Request, Response } from 'express';
import { createHash, randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { createRateLimiter } from './charades.ts';
import { cleanName } from './gameRooms.ts';
import {
  applyAction,
  createTable,
  legalActions,
  potTotal,
  rebuy as engineRebuy,
  startHand,
} from '../../shared/poker/engine.ts';
import type {
  LegalAction,
  PokerAction,
  PokerPlayerState,
  PokerState,
  PotResult,
  ShowdownPlayer,
} from '../../shared/poker/engine.ts';
import type { Card } from '../../shared/poker/cards.ts';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CODE_LEN = 5;
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
/** Live rooms: 4h TTL, same as the other room systems. */
export const POKER_ROOM_TTL_MS = 4 * 60 * 60 * 1000;
/** Closed-room reports: kept 30 days. */
export const POKER_REPORT_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const SWEEP_INTERVAL_MS = 5 * 60 * 1000;
/** Seconds a player gets per action before the server auto-plays. */
export const POKER_TURN_TIMEOUT_MS = 30 * 1000;
/** Delay before the next hand auto-deals after one completes. */
export const POKER_AUTO_DEAL_DELAY_MS = 4000;
/** Safety cap for auto-play loops (disconnects, close-out). */
const MAX_AUTO_ITERS = 500;
/** Signaling payloads are opaque pass-through; cap keeps one client from
 *  flooding the room through the DM relay (~8KB is plenty for SDP/ICE). */
const VOICE_SIGNAL_MAX_BYTES = 8192;

const MAX_ROOM_NAME_LEN = 40;
const MAX_HOUSE_RULES_LEN = 500;
const MAX_PASSWORD_LEN = 64;
const MAX_STACK = 1_000_000;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PokerRoomStatus = 'lobby' | 'playing' | 'paused' | 'closed';

export interface PokerRoomConfig {
  maxPlayers: number;
  startingStack: number;
  minBuyIn: number;
  /** 0 = no cap. */
  maxBuyIn: number;
  smallBlind: number;
  bigBlind: number;
  rebuyMin: number;
  rebuyMax: number;
  /** -1 = unlimited, 0 = disabled. */
  maxRebuys: number;
  rebuysMidHand: boolean;
  allowLateJoin: boolean;
  /** 0 = play until the host closes the room. */
  durationMin: number;
  hasPassword: boolean;
  houseRules: string;
}

export interface RebuyTx {
  txId: string;
  ts: number;
  amount: number;
}

export interface PokerRoomPlayer {
  seat: number;
  name: string;
  playerToken: string;
  connected: boolean;
  ready: boolean;
  removed: boolean;
  /** Chips paid to sit down (virtual). */
  buyIn: number;
  rebuys: RebuyTx[];
  handsPlayed: number;
  handsWon: number;
  /** False until the player is dealt into the engine (late joiners). */
  inEngine: boolean;
  lastAction: string | null;
}

export interface LedgerEntry {
  txId: string;
  ts: number;
  seat: number;
  kind: 'buyin' | 'rebuy';
  amount: number;
  voided: boolean;
}

export interface PokerClient {
  write(chunk: string): void;
  on(event: 'close', cb: () => void): void;
  /** Room seat this connection belongs to (undefined for host-only). */
  seat?: number;
  isHost: boolean;
}

/**
 * One seat's voice-chat presence. The server never sees audio — it only
 * tracks who is in the voice mesh and relays opaque WebRTC signaling
 * payloads between seats (see signalPokerVoice). Audio itself flows
 * peer-to-peer over WebRTC and is never recorded or stored.
 */
export interface PokerVoiceStatus {
  seat: number;
  name: string;
  joined: boolean;
  /** Starts true: a fresh join lands muted so nobody hot-mics by accident. */
  muted: boolean;
  speaking: boolean;
  error?: string;
}

export interface PokerRoom {
  code: string;
  roomName: string;
  hostName: string;
  hostToken: string;
  /** sha256 of the password; undefined when the room has none. */
  passwordHash?: string;
  config: PokerRoomConfig;
  status: PokerRoomStatus;
  players: PokerRoomPlayer[];
  /** Full engine state incl. deck + hole cards. NEVER serialized wholesale. */
  engineState: PokerState | null;
  /** engine seat -> room seat. */
  seatMap: number[];
  ledger: LedgerEntry[];
  idempotency: Map<string, unknown>;
  createdAt: number;
  startedAt?: number;
  endedAt?: number;
  /** Final report, set at close. */
  report?: PokerReport;
  /** Hand number whose end-of-hand stats were already counted. */
  lastHandCounted: number;
  turnTimer?: ReturnType<typeof setTimeout>;
  turnExpiresAt: number | null;
  dealTimer?: ReturnType<typeof setTimeout>;
  durationTimer?: ReturnType<typeof setTimeout>;
  clients: Set<PokerClient>;
  /** Voice-chat presence by seat (no audio passes through the server). */
  voice: Map<number, PokerVoiceStatus>;
}

export interface PokerPlayerReport {
  seat: number;
  name: string;
  initialBuyIn: number;
  rebuys: number;
  contributed: number;
  finalChips: number;
  net: number;
  handsPlayed: number;
  handsWon: number;
}

export interface PokerReport {
  roomName: string;
  code: string;
  startedAt: number;
  endedAt: number;
  durationSec: number;
  handsPlayed: number;
  totals: { buyIns: number; rebuys: number; final: number };
  balanced: boolean;
  discrepancy: number;
  players: PokerPlayerReport[];
  topWinner: { seat: number; name: string; net: number };
  biggestLoss: { seat: number; name: string; net: number };
}

// ---------------------------------------------------------------------------
// Stores
// ---------------------------------------------------------------------------

const rooms = new Map<string, PokerRoom>();

interface StoredReport {
  report: PokerReport;
  savedAt: number;
}
const reports = new Map<string, StoredReport>();

function newToken(): string {
  return randomBytes(16).toString('hex');
}

function newTxId(): string {
  return randomBytes(8).toString('hex');
}

export function normalizePokerCode(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export function createPokerRoomCode(existing: Set<string>): string {
  for (let attempt = 0; attempt < 1000; attempt++) {
    let code = '';
    const bytes = randomBytes(CODE_LEN);
    for (let i = 0; i < CODE_LEN; i++) {
      code += CODE_ALPHABET[(bytes[i] ?? 0) % CODE_ALPHABET.length];
    }
    if (!existing.has(code)) return code;
  }
  throw new Error('could not allocate a poker room code');
}

export function getPokerRoom(code: string): PokerRoom | undefined {
  return rooms.get(normalizePokerCode(code));
}

export function sweepPokerRooms(now: number = Date.now()): number {
  let removed = 0;
  for (const [code, room] of rooms) {
    if (now - room.createdAt > POKER_ROOM_TTL_MS) {
      clearPokerTimers(room);
      rooms.delete(code);
      removed += 1;
    }
  }
  return removed;
}

export function sweepPokerReports(now: number = Date.now()): number {
  let removed = 0;
  for (const [code, stored] of reports) {
    if (now - stored.savedAt > POKER_REPORT_TTL_MS) {
      reports.delete(code);
      removed += 1;
    }
  }
  return removed;
}

if (typeof setInterval !== 'undefined') {
  const t = setInterval(() => {
    sweepPokerRooms();
    sweepPokerReports();
  }, SWEEP_INTERVAL_MS);
  const u = t as unknown as { unref?: () => void };
  if (typeof u.unref === 'function') u.unref();
}

// ---------------------------------------------------------------------------
// Report disk backup (best-effort; memory is primary — Render free tier may
// wipe local disk). Loaded once at boot.
// ---------------------------------------------------------------------------

function pokerReportsFile(): string | null {
  const candidates = [
    join(process.cwd(), 'server', 'data', 'poker-reports.json'),
    join(process.cwd(), 'data', 'poker-reports.json'),
  ];
  for (const p of candidates) {
    if (existsSync(dirname(p))) return p;
  }
  return null;
}

/** Persist one report to the JSON backup file. Best-effort: never throws. */
export function savePokerReportToDisk(report: PokerReport): boolean {
  try {
    let file = pokerReportsFile();
    if (!file) {
      const dir = join(process.cwd(), 'server', 'data');
      mkdirSync(dir, { recursive: true });
      file = join(dir, 'poker-reports.json');
    }
    let all: Record<string, StoredReport> = {};
    try {
      const raw = readFileSync(file, 'utf8');
      const parsed: unknown = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        all = parsed as Record<string, StoredReport>;
      }
    } catch {
      // missing or corrupt backup: start fresh
    }
    all[report.code] = { report, savedAt: Date.now() };
    writeFileSync(file, JSON.stringify(all), 'utf8');
    return true;
  } catch {
    return false;
  }
}

/** Load the JSON backup into the in-memory store. Returns reports loaded. */
export function loadPokerReportsFromDisk(): number {
  try {
    const file = pokerReportsFile();
    if (!file || !existsSync(file)) return 0;
    const parsed: unknown = JSON.parse(readFileSync(file, 'utf8'));
    if (!parsed || typeof parsed !== 'object') return 0;
    let n = 0;
    for (const [code, stored] of Object.entries(
      parsed as Record<string, StoredReport>,
    )) {
      if (stored && stored.report && typeof stored.savedAt === 'number') {
        reports.set(code, stored);
        n += 1;
      }
    }
    return n;
  } catch {
    return 0;
  }
}

/** Test helper: drop every stored report from memory (disk untouched). */
export function clearPokerReports(): void {
  reports.clear();
}

/** Test helper: drop every live room (timers cleared). */
export function clearPokerRooms(): void {
  for (const room of rooms.values()) clearPokerTimers(room);
  rooms.clear();
}

export function getPokerReport(code: string): PokerReport | undefined {
  const stored = reports.get(normalizePokerCode(code));
  return stored?.report;
}

function storePokerReport(report: PokerReport): void {
  reports.set(report.code, { report, savedAt: Date.now() });
  savePokerReportToDisk(report);
}

// Load any backup from a previous boot. Best-effort.
loadPokerReportsFromDisk();

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

function asInt(v: unknown, min: number, max: number): number | null {
  return typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max
    ? v
    : null;
}

function asBool(v: unknown, dflt: boolean): boolean {
  return typeof v === 'boolean' ? v : dflt;
}

function asCleanString(v: unknown, maxLen: number): string | null {
  if (typeof v !== 'string') return null;
  const s = cleanName(v);
  return s.length >= 1 && s.length <= maxLen ? s : null;
}

export interface ValidatedPokerConfig extends PokerRoomConfig {
  password?: string;
}

export type ValidateConfigResult =
  | { ok: true; value: ValidatedPokerConfig }
  | { ok: false; error: string };

export function validatePokerConfig(
  body: Record<string, unknown>,
): ValidateConfigResult {
  const roomName = asCleanString(body.roomName, MAX_ROOM_NAME_LEN);
  if (!roomName) return { ok: false, error: 'roomName must be 1-40 characters' };
  const hostName = asCleanString(body.hostName, MAX_ROOM_NAME_LEN - 16);
  if (!hostName) return { ok: false, error: 'hostName must be 1-24 characters' };
  const maxPlayers = asInt(body.maxPlayers, 2, 8);
  if (maxPlayers === null)
    return { ok: false, error: 'maxPlayers must be an integer 2-8' };
  const startingStack = asInt(body.startingStack, 100, MAX_STACK);
  if (startingStack === null)
    return { ok: false, error: 'startingStack must be an integer 100-1000000' };
  const smallBlind = asInt(body.smallBlind, 1, MAX_STACK);
  if (smallBlind === null)
    return { ok: false, error: 'smallBlind must be a positive integer' };
  const bigBlind = asInt(body.bigBlind, 1, MAX_STACK);
  if (bigBlind === null)
    return { ok: false, error: 'bigBlind must be a positive integer' };
  if (!(smallBlind < bigBlind))
    return { ok: false, error: 'smallBlind must be less than bigBlind' };
  const minBuyIn = asInt(body.minBuyIn, 1, MAX_STACK);
  if (minBuyIn === null)
    return { ok: false, error: 'minBuyIn must be a positive integer' };
  if (minBuyIn < smallBlind)
    return { ok: false, error: 'minBuyIn must be at least the small blind' };
  const maxBuyInRaw = body.maxBuyIn;
  let maxBuyIn: number;
  if (maxBuyInRaw === undefined || maxBuyInRaw === null || maxBuyInRaw === 0) {
    maxBuyIn = 0;
  } else {
    const v = asInt(maxBuyInRaw, 1, MAX_STACK);
    if (v === null)
      return { ok: false, error: 'maxBuyIn must be 0 (no cap) or a positive integer' };
    maxBuyIn = v;
  }
  if (maxBuyIn !== 0 && maxBuyIn < minBuyIn)
    return { ok: false, error: 'maxBuyIn must be 0 or at least minBuyIn' };
  const rebuyMin = asInt(body.rebuyMin ?? 0, 0, MAX_STACK);
  const rebuyMax = asInt(body.rebuyMax ?? 0, 0, MAX_STACK);
  if (rebuyMin === null || rebuyMax === null)
    return { ok: false, error: 'rebuyMin/rebuyMax must be integers >= 0' };
  if (rebuyMin > rebuyMax)
    return { ok: false, error: 'rebuyMin must not exceed rebuyMax' };
  const maxRebuysRaw = body.maxRebuys;
  let maxRebuys: number;
  if (maxRebuysRaw === undefined || maxRebuysRaw === null) {
    maxRebuys = -1;
  } else {
    const v = asInt(maxRebuysRaw, -1, 100000);
    if (v === null)
      return { ok: false, error: 'maxRebuys must be -1 (unlimited) or >= 0' };
    maxRebuys = v;
  }
  const durationMin = asInt(body.durationMin ?? 0, 0, 24 * 60);
  if (durationMin === null)
    return { ok: false, error: 'durationMin must be an integer >= 0' };
  let password: string | undefined;
  if (body.password !== undefined && body.password !== null && body.password !== '') {
    if (typeof body.password !== 'string' || body.password.length > MAX_PASSWORD_LEN)
      return { ok: false, error: 'password must be a string up to 64 characters' };
    password = body.password;
  }
  let houseRules = '';
  if (body.houseRules !== undefined && body.houseRules !== null) {
    if (typeof body.houseRules !== 'string')
      return { ok: false, error: 'houseRules must be a string' };
    houseRules = body.houseRules.slice(0, MAX_HOUSE_RULES_LEN);
  }
  return {
    ok: true,
    value: {
      maxPlayers,
      startingStack,
      minBuyIn,
      maxBuyIn,
      smallBlind,
      bigBlind,
      rebuyMin,
      rebuyMax,
      maxRebuys,
      rebuysMidHand: asBool(body.rebuysMidHand, false),
      allowLateJoin: asBool(body.allowLateJoin, true),
      durationMin,
      hasPassword: password !== undefined,
      houseRules,
      password,
    },
  };
}

function hashPassword(pw: string): string {
  return createHash('sha256').update(pw, 'utf8').digest('hex');
}

// ---------------------------------------------------------------------------
// Core room operations (pure-ish; HTTP handlers are thin adapters below)
// ---------------------------------------------------------------------------

export type CreatePokerResult =
  | { ok: true; room: PokerRoom; host: PokerRoomPlayer }
  | { ok: false; error: string };

export function createPokerRoom(
  body: Record<string, unknown>,
): CreatePokerResult {
  const v = validatePokerConfig(body);
  if (!v.ok) return { ok: false, error: v.error };
  const cfg = v.value;
  const room: PokerRoom = {
    code: createPokerRoomCode(new Set(rooms.keys())),
    roomName: body.roomName as string, // validated above; re-clean below
    hostName: '',
    hostToken: newToken(),
    config: {
      maxPlayers: cfg.maxPlayers,
      startingStack: cfg.startingStack,
      minBuyIn: cfg.minBuyIn,
      maxBuyIn: cfg.maxBuyIn,
      smallBlind: cfg.smallBlind,
      bigBlind: cfg.bigBlind,
      rebuyMin: cfg.rebuyMin,
      rebuyMax: cfg.rebuyMax,
      maxRebuys: cfg.maxRebuys,
      rebuysMidHand: cfg.rebuysMidHand,
      allowLateJoin: cfg.allowLateJoin,
      durationMin: cfg.durationMin,
      hasPassword: cfg.hasPassword,
      houseRules: cfg.houseRules,
    },
    status: 'lobby',
    players: [],
    engineState: null,
    seatMap: [],
    ledger: [],
    idempotency: new Map(),
    createdAt: Date.now(),
    lastHandCounted: 0,
    turnExpiresAt: null,
    clients: new Set(),
    voice: new Map(),
  };
  room.roomName = cleanName(String(body.roomName)).slice(0, MAX_ROOM_NAME_LEN);
  const hostName = cleanName(String(body.hostName)).slice(0, 24);
  room.hostName = hostName;
  if (cfg.password !== undefined) room.passwordHash = hashPassword(cfg.password);
  const buyIn = cfg.minBuyIn;
  const host: PokerRoomPlayer = {
    seat: 0,
    name: hostName,
    playerToken: newToken(),
    connected: true,
    ready: false,
    removed: false,
    buyIn,
    rebuys: [],
    handsPlayed: 0,
    handsWon: 0,
    inEngine: false,
    lastAction: null,
  };
  room.players.push(host);
  recordLedger(room, 0, 'buyin', buyIn);
  rooms.set(room.code, room);
  return { ok: true, room, host };
}

function recordLedger(
  room: PokerRoom,
  seat: number,
  kind: 'buyin' | 'rebuy',
  amount: number,
): LedgerEntry {
  const entry: LedgerEntry = {
    txId: newTxId(),
    ts: Date.now(),
    seat,
    kind,
    amount,
    voided: false,
  };
  room.ledger.push(entry);
  return entry;
}

export function playerBySeat(
  room: PokerRoom,
  seat: number,
): PokerRoomPlayer | undefined {
  return room.players.find((p) => p.seat === seat && !p.removed);
}

/** Room seat -> engine seat, or -1 when the player is not at the table. */
export function engineSeatOf(room: PokerRoom, roomSeat: number): number {
  const idx = room.seatMap.indexOf(roomSeat);
  return idx >= 0 ? idx : -1;
}

/** Engine seat -> room seat. */
export function roomSeatOf(room: PokerRoom, engineSeat: number): number {
  const s = room.seatMap[engineSeat];
  return typeof s === 'number' ? s : -1;
}

function activePlayers(room: PokerRoom): PokerRoomPlayer[] {
  return room.players.filter((p) => !p.removed);
}

function lowestFreeSeat(room: PokerRoom): number {
  const taken = new Set(room.players.filter((p) => !p.removed).map((p) => p.seat));
  for (let s = 0; s < room.config.maxPlayers; s++) {
    if (!taken.has(s)) return s;
  }
  return -1;
}

function passwordOk(room: PokerRoom, password: unknown): boolean {
  if (!room.config.hasPassword) return true;
  if (typeof password !== 'string') return false;
  return hashPassword(password) === room.passwordHash;
}

export interface JoinPokerInput {
  name: unknown;
  password?: unknown;
  buyIn: unknown;
  idem?: unknown;
}

export type JoinPokerResult =
  | { ok: true; seat: number; playerToken: string; sittingOut: boolean }
  | { ok: false; status: number; error: string };

export function joinPokerRoom(
  room: PokerRoom,
  input: JoinPokerInput,
): JoinPokerResult {
  if (room.status === 'closed')
    return { ok: false, status: 410, error: 'room is closed' };
  const idem = typeof input.idem === 'string' && input.idem.length > 0 ? input.idem : null;
  if (idem) {
    const prev = room.idempotency.get(`join:${idem}`);
    if (prev && typeof prev === 'object') {
      return { ok: true, ...(prev as { seat: number; playerToken: string; sittingOut: boolean }) };
    }
  }
  if (
    (room.status === 'playing' || room.status === 'paused') &&
    !room.config.allowLateJoin
  ) {
    return {
      ok: false,
      status: 403,
      error: 'late join is not allowed in this room — wait for the next game',
    };
  }
  const name = asCleanString(input.name, 24);
  if (!name) return { ok: false, status: 400, error: 'name must be 1-24 characters' };
  const taken = new Set(activePlayers(room).map((p) => p.name.toLowerCase()));
  if (taken.has(name.toLowerCase()))
    return { ok: false, status: 400, error: 'that name is already taken in this room' };
  if (!passwordOk(room, input.password))
    return { ok: false, status: 403, error: 'wrong room password' };
  const buyIn = asInt(input.buyIn, room.config.minBuyIn, MAX_STACK);
  if (buyIn === null)
    return { ok: false, status: 400, error: `buyIn must be an integer >= ${room.config.minBuyIn}` };
  if (room.config.maxBuyIn !== 0 && buyIn > room.config.maxBuyIn)
    return {
      ok: false,
      status: 400,
      error: `buyIn must not exceed ${room.config.maxBuyIn}`,
    };
  const seat = lowestFreeSeat(room);
  if (seat < 0) return { ok: false, status: 403, error: 'room is full' };
  const sittingOut = room.status === 'playing' || room.status === 'paused';
  const player: PokerRoomPlayer = {
    seat,
    name,
    playerToken: newToken(),
    connected: true,
    ready: false,
    removed: false,
    buyIn,
    rebuys: [],
    handsPlayed: 0,
    handsWon: 0,
    inEngine: false,
    lastAction: null,
  };
  room.players.push(player);
  recordLedger(room, seat, 'buyin', buyIn);
  const result = { seat, playerToken: player.playerToken, sittingOut };
  if (idem) room.idempotency.set(`join:${idem}`, result);
  broadcastPoker(room, 'players', {
    players: publicLobbyPlayers(room),
    joined: { seat, name, sittingOut },
  });
  return { ok: true, ...result };
}

export type ToggleReadyResult =
  | { ok: true; ready: boolean }
  | { ok: false; status: number; error: string };

export function togglePokerReady(
  room: PokerRoom,
  playerToken: string,
): ToggleReadyResult {
  if (room.status === 'closed')
    return { ok: false, status: 410, error: 'room is closed' };
  if (room.status !== 'lobby')
    return { ok: false, status: 409, error: 'ready can only be toggled in the lobby' };
  const player = room.players.find(
    (p) => p.playerToken === playerToken && !p.removed,
  );
  if (!player) return { ok: false, status: 403, error: 'unknown player token' };
  player.ready = !player.ready;
  broadcastPoker(room, 'players', { players: publicLobbyPlayers(room) });
  return { ok: true, ready: player.ready };
}

export type StartPokerResult =
  | { ok: true }
  | { ok: false; status: number; error: string };

export function startPokerGame(room: PokerRoom): StartPokerResult {
  if (room.status === 'closed')
    return { ok: false, status: 410, error: 'room is closed' };
  if (room.status !== 'lobby')
    return { ok: false, status: 409, error: 'game already started' };
  const entrants = activePlayers(room)
    .filter((p) => p.ready)
    .sort((a, b) => a.seat - b.seat);
  if (entrants.length < 2)
    return { ok: false, status: 400, error: 'need at least 2 ready players to start' };
  let state: PokerState;
  try {
    state = createTable({
      names: entrants.map((p) => p.name),
      isBot: entrants.map(() => false),
      // Engine needs one stack for everyone; use the max buy-in so the
      // blinds always fit, then set each player's real buy-in below.
      startingStack: Math.max(...entrants.map((p) => p.buyIn)),
      smallBlind: room.config.smallBlind,
      bigBlind: room.config.bigBlind,
    });
  } catch (e) {
    return {
      ok: false,
      status: 400,
      error: e instanceof Error ? e.message : 'could not create table',
    };
  }
  entrants.forEach((p, i) => {
    const ep = state.players[i];
    if (ep) ep.chips = p.buyIn;
    p.inEngine = true;
    p.lastAction = null;
  });
  room.seatMap = entrants.map((p) => p.seat);
  room.engineState = state;
  const dealt = startHand(state);
  if (!dealt.ok) {
    room.engineState = null;
    room.seatMap = [];
    for (const p of entrants) p.inEngine = false;
    return { ok: false, status: 400, error: dealt.error };
  }
  room.engineState = dealt.state;
  room.status = 'playing';
  room.startedAt = Date.now();
  room.lastHandCounted = 0;
  if (room.config.durationMin > 0) {
    clearTimeoutSafe(room.durationTimer);
    room.durationTimer = setTimeout(
      () => closePokerRoom(room, 'duration'),
      room.config.durationMin * 60 * 1000,
    );
    unrefTimer(room.durationTimer);
  }
  armTurnTimer(room);
  broadcastPoker(room, 'started', {
    handNumber: dealt.state.handNumber,
    players: publicLobbyPlayers(room),
  });
  broadcastPokerTable(room);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Public views (secrets stripped)
// ---------------------------------------------------------------------------

export interface PublicPokerPlayer {
  seat: number;
  name: string;
  stack: number;
  bet: number;
  folded: boolean;
  allIn: boolean;
  sittingOut: boolean;
  connected: boolean;
  ready: boolean;
  lastAction: string | null;
  isHost: boolean;
  inEngine: boolean;
}

function stackOf(room: PokerRoom, p: PokerRoomPlayer): number {
  if (p.inEngine && room.engineState) {
    const es = engineSeatOf(room, p.seat);
    const ep = es >= 0 ? room.engineState.players[es] : undefined;
    if (ep) return ep.chips;
  }
  return p.buyIn + p.rebuys.reduce((n, r) => n + r.amount, 0);
}

export function publicTablePlayers(room: PokerRoom): PublicPokerPlayer[] {
  return activePlayers(room)
    .sort((a, b) => a.seat - b.seat)
    .map((p) => {
      let bet = 0;
      let folded = false;
      let allIn = false;
      if (p.inEngine && room.engineState) {
        const es = engineSeatOf(room, p.seat);
        const ep = es >= 0 ? room.engineState.players[es] : undefined;
        if (ep) {
          bet = ep.bet;
          folded = ep.folded;
          allIn = ep.allIn;
        }
      }
      return {
        seat: p.seat,
        name: p.name,
        stack: stackOf(room, p),
        bet,
        folded,
        allIn,
        sittingOut: !p.inEngine,
        connected: p.connected,
        ready: p.ready,
        lastAction: p.lastAction,
        isHost: p.seat === 0,
        inEngine: p.inEngine,
      };
    });
}

export function publicLobbyPlayers(
  room: PokerRoom,
): { seat: number; name: string; stack: number; isHost: boolean; connected: boolean; ready: boolean }[] {
  return activePlayers(room)
    .sort((a, b) => a.seat - b.seat)
    .map((p) => ({
      seat: p.seat,
      name: p.name,
      stack: p.buyIn,
      isHost: p.seat === 0,
      connected: p.connected,
      ready: p.ready,
    }));
}

export function publicRoomInfo(room: PokerRoom): Record<string, unknown> {
  return {
    code: room.code,
    roomName: room.roomName,
    hostName: room.hostName,
    maxPlayers: room.config.maxPlayers,
    playerCount: activePlayers(room).length,
    status: room.status,
    blinds: { small: room.config.smallBlind, big: room.config.bigBlind },
    startingStack: room.config.startingStack,
    minBuyIn: room.config.minBuyIn,
    maxBuyIn: room.config.maxBuyIn,
    rebuyMin: room.config.rebuyMin,
    rebuyMax: room.config.rebuyMax,
    maxRebuys: room.config.maxRebuys,
    rebuysMidHand: room.config.rebuysMidHand,
    allowLateJoin: room.config.allowLateJoin,
    hasPassword: room.config.hasPassword,
    houseRules: room.config.houseRules,
    players: publicLobbyPlayers(room),
  };
}

/** Current pot stacks: one entry per side pot (main pot first). */
export function currentSidePots(state: PokerState): number[] {
  if (state.street === 'complete') return state.winners.map((w) => w.amount);
  const levels = Array.from(
    new Set(state.players.map((p) => p.handCommitted).filter((c) => c > 0)),
  ).sort((a, b) => a - b);
  const pots: number[] = [];
  let prev = 0;
  for (const level of levels) {
    const delta = level - prev;
    prev = level;
    let shares = 0;
    for (const p of state.players) if (p.handCommitted >= level) shares++;
    const amount = delta * shares;
    if (amount > 0) pots.push(amount);
  }
  return pots;
}

function publicShowdown(
  room: PokerRoom,
  state: PokerState,
): { seat: number; name: string; handName: string; hole: Card[]; best: readonly Card[] }[] | null {
  if (state.street !== 'complete' || !state.showdown) return null;
  return state.showdown.map((s) => ({
    seat: roomSeatOf(room, s.seat),
    name: s.name,
    handName: s.handName,
    hole: s.hole.map((c) => ({ ...c })),
    best: s.best.map((c) => ({ ...c })),
  }));
}

/** Public table snapshot: safe to broadcast to every seat (no hole cards). */
export function publicTableState(room: PokerRoom): Record<string, unknown> {
  const st = room.engineState;
  return {
    code: room.code,
    roomName: room.roomName,
    status: room.status,
    handNumber: st?.handNumber ?? 0,
    street: st?.street ?? null,
    button: st?.button ?? -1,
    community: (st?.community ?? []).map((c) => ({ ...c })),
    pot: st ? (st.street === 'complete' ? st.winners.reduce((n, w) => n + w.amount, 0) : potTotal(st)) : 0,
    sidePots: st ? currentSidePots(st) : [],
    actorSeat: st ? roomSeatOf(room, st.actorSeat) : -1,
    toCall: st?.toCall ?? 0,
    minRaiseTo: st?.minRaiseTo ?? 0,
    turnExpiresAt: room.turnExpiresAt,
    players: publicTablePlayers(room),
    winners: (st?.winners ?? []).map((w) => ({
      potIndex: w.potIndex,
      amount: w.amount,
      winnerSeats: w.winnerSeats.map((es) => roomSeatOf(room, es)),
      each: w.each,
      handName: w.handName,
    })),
    showdownRevealed: st ? publicShowdown(room, st) : null,
    voice: publicVoiceState(room),
  };
}

export interface PokerLedgerPublic {
  seat: number;
  name: string;
  buyIn: number;
  rebuys: number;
}

export function publicLedger(room: PokerRoom): PokerLedgerPublic[] {
  return activePlayers(room)
    .sort((a, b) => a.seat - b.seat)
    .map((p) => ({
      seat: p.seat,
      name: p.name,
      buyIn: p.buyIn,
      rebuys: p.rebuys.reduce((n, r) => n + r.amount, 0),
    }));
}

function configPublic(room: PokerRoom): Record<string, unknown> {
  const c = room.config;
  return {
    maxPlayers: c.maxPlayers,
    startingStack: c.startingStack,
    minBuyIn: c.minBuyIn,
    maxBuyIn: c.maxBuyIn,
    smallBlind: c.smallBlind,
    bigBlind: c.bigBlind,
    rebuyMin: c.rebuyMin,
    rebuyMax: c.rebuyMax,
    maxRebuys: c.maxRebuys,
    rebuysMidHand: c.rebuysMidHand,
    allowLateJoin: c.allowLateJoin,
    durationMin: c.durationMin,
    hasPassword: c.hasPassword,
  };
}

/**
 * Full state for one requester: public table + `myCards` (hole cards) ONLY
 * for the requesting seat, plus their legal actions when it is their turn.
 */
export function pokerStateFor(
  room: PokerRoom,
  requesterSeat: number,
): Record<string, unknown> {
  const st = room.engineState;
  const table = publicTableState(room);
  let myCards: Card[] | null = null;
  let myLegal: LegalAction[] | null = null;
  if (st && requesterSeat >= 0) {
    const es = engineSeatOf(room, requesterSeat);
    const ep = es >= 0 ? st.players[es] : undefined;
    if (ep && st.street !== 'complete' && st.street !== 'showdown') {
      myCards = ep.hole.map((c) => ({ ...c }));
    }
    if (es === st.actorSeat && es >= 0) {
      myLegal = legalActions(st, es);
    }
  }
  return {
    ...table,
    mySeat: requesterSeat,
    myCards,
    myLegalActions: myLegal,
    ledger: publicLedger(room),
    config: configPublic(room),
  };
}

// ---------------------------------------------------------------------------
// SSE
// ---------------------------------------------------------------------------

export function formatPokerEvent(type: string, data: unknown): string {
  return `event: ${type}\ndata: ${JSON.stringify(data)}\n\n`;
}

export function broadcastPoker(room: PokerRoom, type: string, data: unknown): void {
  const chunk = formatPokerEvent(type, data);
  for (const client of room.clients) {
    try {
      client.write(chunk);
    } catch {
      // broken client; the close handler cleans up
    }
  }
}

/** Broadcast the public table to every connected client (no secrets). */
export function broadcastPokerTable(room: PokerRoom): void {
  broadcastPoker(room, 'table', publicTableState(room));
}

/**
 * Direct message: deliver one event ONLY to the SSE clients of a single
 * seat. Used for WebRTC signaling so offers/answers/ICE candidates never
 * leak to the rest of the room. Returns true when at least one client
 * received the chunk.
 */
export function sendPokerToSeat(
  room: PokerRoom,
  seat: number,
  type: string,
  data: unknown,
): boolean {
  const chunk = formatPokerEvent(type, data);
  let delivered = false;
  for (const client of room.clients) {
    if (client.seat !== seat) continue;
    try {
      client.write(chunk);
      delivered = true;
    } catch {
      // broken client; the close handler cleans up
    }
  }
  return delivered;
}

// ---------------------------------------------------------------------------
// Voice chat (WebRTC audio-only mesh; server relays signaling only)
// ---------------------------------------------------------------------------
//
// Signaling flow (audio never touches the server):
//   1. A taps "Join voice" -> getUserMedia -> POST /voice-join {token}
//      -> server marks the seat joined (muted=true, no hot-mic) and
//      broadcasts `voice-state`.
//   2. A sees B already in voice. The HIGHER seat always initiates, so
//      offers never cross (no glare): A creates an RTCPeerConnection,
//      adds the local mic track, and POSTs /voice-signal {toSeat: B,
//      kind:'offer', payload:{sdp}} -> the server DMs it to B's seat only.
//   3. B sets the remote description, creates an answer, and signals it
//      back the same way. Both sides trickle ICE candidates via
//      kind:'ice' payloads ({candidate: "<json>"}).
//   4. Remote audio plays through hidden <audio> elements on each phone;
//      the local mic is never played back.
//   5. Speaking detection (client-side AnalyserNode) throttles POST
//      /voice-status {speaking} (~2/sec); the server rebroadcasts
//      `voice-state` so every client can render mic badges.
//   6. POST /voice-leave (or the last SSE for the seat dropping) clears
//      the entry and broadcasts `voice-state`; peers close that PC.
//
// Limits: STUN only (stun:stun.l.google.com:19302), no TURN — pairs behind
// symmetric NATs may fail to connect. Mesh is 1 PC per peer pair, so it
// scales to the 8-player room cap and no further.

/** Compact voice summary for state payloads and `voice-state` events. */
export function publicVoiceState(
  room: PokerRoom,
): Record<string, PokerVoiceStatus> {
  const out: Record<string, PokerVoiceStatus> = {};
  for (const [seat, v] of room.voice) {
    out[String(seat)] = { ...v };
  }
  return out;
}

/** Broadcast the voice summary to every connected client. */
export function broadcastPokerVoiceState(room: PokerRoom): void {
  broadcastPoker(room, 'voice-state', { voice: publicVoiceState(room) });
}

export type VoiceOpResult =
  | { ok: true }
  | { ok: false; status: number; error: string };

/**
 * Mark a seat as joined to voice. Starts MUTED (safer default — the user
 * unmutes explicitly via the mic button). Idempotent.
 */
export function joinPokerVoice(room: PokerRoom, seat: number): VoiceOpResult {
  if (room.status === 'closed')
    return { ok: false, status: 410, error: 'room is closed' };
  const player = playerBySeat(room, seat);
  if (!player) return { ok: false, status: 404, error: 'player not found' };
  room.voice.set(seat, {
    seat,
    name: player.name,
    joined: true,
    muted: true,
    speaking: false,
  });
  broadcastPokerVoiceState(room);
  return { ok: true };
}

/** Remove a seat from voice. Idempotent — leaving twice is fine. */
export function leavePokerVoice(room: PokerRoom, seat: number): VoiceOpResult {
  if (room.status === 'closed')
    return { ok: false, status: 410, error: 'room is closed' };
  const player = playerBySeat(room, seat);
  if (!player) return { ok: false, status: 404, error: 'player not found' };
  room.voice.delete(seat);
  broadcastPokerVoiceState(room);
  return { ok: true };
}

export interface VoiceStatusInput {
  muted?: unknown;
  speaking?: unknown;
}

/** Update muted/speaking flags for a seat already in voice. */
export function setPokerVoiceStatus(
  room: PokerRoom,
  seat: number,
  input: VoiceStatusInput,
): VoiceOpResult {
  if (room.status === 'closed')
    return { ok: false, status: 410, error: 'room is closed' };
  const entry = room.voice.get(seat);
  if (!entry || !entry.joined)
    return { ok: false, status: 404, error: 'not in voice chat' };
  if (input.muted !== undefined) {
    if (typeof input.muted !== 'boolean')
      return { ok: false, status: 400, error: 'muted must be a boolean' };
    entry.muted = input.muted;
    if (input.muted) entry.speaking = false;
  }
  if (input.speaking !== undefined) {
    if (typeof input.speaking !== 'boolean')
      return { ok: false, status: 400, error: 'speaking must be a boolean' };
    entry.speaking = input.speaking && !entry.muted;
  }
  broadcastPokerVoiceState(room);
  return { ok: true };
}

export type VoiceSignalKind = 'offer' | 'answer' | 'ice';

function isVoiceSignalKind(v: unknown): v is VoiceSignalKind {
  return v === 'offer' || v === 'answer' || v === 'ice';
}

/**
 * Validate a signaling payload: a plain object whose values are all
 * strings (sdp / candidate JSON), total size capped. The payload is
 * otherwise opaque pass-through — the server never inspects SDP.
 */
function signalPayloadOk(
  payload: unknown,
): payload is Record<string, string> {
  if (typeof payload !== 'object' || payload === null || Array.isArray(payload))
    return false;
  let size = 0;
  for (const [k, v] of Object.entries(payload)) {
    if (typeof v !== 'string') return false;
    size += k.length + v.length;
    if (size > VOICE_SIGNAL_MAX_BYTES) return false;
  }
  return true;
}

export interface VoiceSignalInput {
  toSeat: unknown;
  kind: unknown;
  payload: unknown;
}

/**
 * Relay one WebRTC signaling message from a seat to another seat's SSE
 * clients ONLY. The sender is identified by their token; the target must
 * be a joined room member who is in voice chat.
 */
export function signalPokerVoice(
  room: PokerRoom,
  fromSeat: number,
  input: VoiceSignalInput,
): VoiceOpResult {
  if (room.status === 'closed')
    return { ok: false, status: 410, error: 'room is closed' };
  if (
    typeof input.toSeat !== 'number' ||
    !Number.isInteger(input.toSeat) ||
    input.toSeat < 0
  )
    return { ok: false, status: 400, error: 'toSeat must be a non-negative integer' };
  if (input.toSeat === fromSeat)
    return { ok: false, status: 400, error: 'cannot signal yourself' };
  if (!isVoiceSignalKind(input.kind))
    return { ok: false, status: 400, error: "kind must be 'offer', 'answer', or 'ice'" };
  if (!signalPayloadOk(input.payload))
    return {
      ok: false,
      status: 400,
      error: 'payload must be an object of string fields (max ~8KB)',
    };
  const target = playerBySeat(room, input.toSeat);
  if (!target) return { ok: false, status: 404, error: 'target seat not in room' };
  const entry = room.voice.get(input.toSeat);
  if (!entry || !entry.joined)
    return { ok: false, status: 409, error: 'target is not in voice chat' };
  sendPokerToSeat(room, input.toSeat, 'voice-signal', {
    fromSeat,
    kind: input.kind,
    payload: input.payload,
  });
  return { ok: true };
}

/**
 * SSE bookkeeping: when the LAST connection for a seat drops, clear their
 * voice entry (they rejoin voice explicitly on return — a stale mic badge
 * is worse than asking for one tap). Returns true when an entry was
 * cleared. Safe to call when other connections for the seat are still
 * alive: then it is a no-op.
 */
export function releasePokerVoiceOnDisconnect(
  room: PokerRoom,
  seat: number,
): boolean {
  const stillLive = [...room.clients].some((c) => c.seat === seat);
  if (stillLive) return false;
  if (!room.voice.delete(seat)) return false;
  broadcastPokerVoiceState(room);
  return true;
}

// ---------------------------------------------------------------------------
// Timers
// ---------------------------------------------------------------------------

function clearTimeoutSafe(t: ReturnType<typeof setTimeout> | undefined): void {
  if (t !== undefined) clearTimeout(t);
}

function unrefTimer(t: ReturnType<typeof setTimeout>): void {
  const u = t as unknown as { unref?: () => void };
  if (typeof u.unref === 'function') u.unref();
}

export function clearPokerTimers(room: PokerRoom): void {
  clearTimeoutSafe(room.turnTimer);
  clearTimeoutSafe(room.dealTimer);
  clearTimeoutSafe(room.durationTimer);
  room.turnTimer = undefined;
  room.dealTimer = undefined;
  room.durationTimer = undefined;
  room.turnExpiresAt = null;
}

function armTurnTimer(room: PokerRoom): void {
  clearTimeoutSafe(room.turnTimer);
  room.turnTimer = undefined;
  room.turnExpiresAt = null;
  const st = room.engineState;
  if (room.status !== 'playing' || !st) return;
  if (st.street === 'complete' || st.street === 'showdown') return;
  if (st.actorSeat < 0) return;
  room.turnExpiresAt = Date.now() + POKER_TURN_TIMEOUT_MS;
  room.turnTimer = setTimeout(() => handleTurnTimeout(room), POKER_TURN_TIMEOUT_MS);
  unrefTimer(room.turnTimer);
}

function clearTurnTimer(room: PokerRoom): void {
  clearTimeoutSafe(room.turnTimer);
  room.turnTimer = undefined;
  room.turnExpiresAt = null;
}

/** Test hook: fire the turn timeout immediately. */
export function handleTurnTimeout(room: PokerRoom): void {
  clearTurnTimer(room);
  if (room.status !== 'playing') return;
  const st = room.engineState;
  if (!st || st.street === 'complete' || st.street === 'showdown') return;
  const actorEs = st.actorSeat;
  if (actorEs < 0) return;
  // Only auto-play on timeout when the actor is still the actor.
  applyAutoAction(room, actorEs, 'timeout');
  autoPlayAbsent(room);
  afterEngineChange(room);
}

/** Check-if-free-else-fold for one engine seat. Returns false on failure. */
function applyAutoAction(
  room: PokerRoom,
  engineSeat: number,
  reason: 'timeout' | 'absent',
): boolean {
  const st = room.engineState;
  if (!st) return false;
  if (engineSeat !== st.actorSeat) return false;
  const legal = legalActions(st, engineSeat);
  if (legal.length === 0) return false;
  const canCheck = legal.some((a) => a.type === 'check');
  const action: PokerAction = canCheck ? { type: 'check' } : { type: 'fold' };
  const r = applyAction(st, engineSeat, action);
  if (!r.ok) return false;
  room.engineState = r.state;
  const roomSeat = roomSeatOf(room, engineSeat);
  const p = playerBySeat(room, roomSeat);
  if (p) p.lastAction = `${action.type} (auto-${reason})`;
  return true;
}

/**
 * Auto-play loop for seats that cannot act themselves (disconnected or
 * otherwise absent). Runs after every applied action, on turn timeout, and
 * on disconnect. Capped so it can never spin forever.
 */
export function autoPlayAbsent(room: PokerRoom): void {
  for (let i = 0; i < MAX_AUTO_ITERS; i++) {
    const st = room.engineState;
    if (!st || room.status !== 'playing') return;
    if (st.street === 'complete' || st.street === 'showdown') return;
    const actorEs = st.actorSeat;
    if (actorEs < 0) return;
    const roomSeat = roomSeatOf(room, actorEs);
    const p = roomSeat >= 0 ? playerBySeat(room, roomSeat) : undefined;
    if (!p) return;
    if (p.connected && p.inEngine) return; // a present player acts themselves
    if (!applyAutoAction(room, actorEs, 'absent')) return;
  }
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

export type PokerActionInput =
  | { type: 'fold' }
  | { type: 'check' }
  | { type: 'call' }
  | { type: 'bet'; amount: number }
  | { type: 'raise'; amount: number }
  | { type: 'allin' };

function toEngineAction(input: PokerActionInput): PokerAction {
  switch (input.type) {
    case 'fold':
      return { type: 'fold' };
    case 'check':
      return { type: 'check' };
    case 'call':
      return { type: 'call' };
    case 'bet':
      return { type: 'bet', amount: input.amount };
    case 'raise':
      return { type: 'raise', amount: input.amount };
    case 'allin':
      return { type: 'all-in' };
  }
}

function parseActionInput(raw: unknown): PokerActionInput | null {
  if (!raw || typeof raw !== 'object') return null;
  const t = (raw as { type?: unknown }).type;
  if (t !== 'fold' && t !== 'check' && t !== 'call' && t !== 'bet' && t !== 'raise' && t !== 'allin') {
    return null;
  }
  if (t === 'bet' || t === 'raise') {
    const amount = (raw as { amount?: unknown }).amount;
    if (typeof amount !== 'number' || !Number.isInteger(amount) || amount <= 0) {
      return null;
    }
    return { type: t, amount };
  }
  return { type: t };
}

/** Validate the action against the engine's legal actions for the seat. */
function actionLegalError(
  state: PokerState,
  engineSeat: number,
  input: PokerActionInput,
): string | null {
  const legal = legalActions(state, engineSeat);
  const want = input.type;
  for (const a of legal) {
    if (want === 'allin' && a.type === 'all-in') return null;
    if (want !== 'allin' && a.type === want) {
      if (want === 'bet' && a.type === 'bet') {
        return input.amount >= a.min && input.amount <= a.max
          ? null
          : `bet must be between ${a.min} and ${a.max}`;
      }
      if (want === 'raise' && a.type === 'raise') {
        return input.amount >= a.minTo && input.amount <= a.maxTo
          ? null
          : `raise must be to between ${a.minTo} and ${a.maxTo}`;
      }
      return null;
    }
  }
  return `illegal action "${want}" here`;
}

export interface ActionPokerInput {
  token: unknown;
  action: unknown;
  idem?: unknown;
}

export type ApplyPokerActionResult =
  | {
      ok: true;
      seat: number;
      street: string;
      handComplete: boolean;
      actorSeat: number;
      pot: number;
    }
  | { ok: false; status: number; error: string };

export function applyPokerAction(
  room: PokerRoom,
  input: ActionPokerInput,
): ApplyPokerActionResult {
  if (room.status === 'closed')
    return { ok: false, status: 410, error: 'room is closed' };
  if (room.status !== 'playing')
    return { ok: false, status: 409, error: `cannot act while the room is ${room.status}` };
  const idem = typeof input.idem === 'string' && input.idem.length > 0 ? input.idem : null;
  if (idem) {
    const prev = room.idempotency.get(`action:${idem}`);
    if (prev && typeof prev === 'object') {
      return { ok: true, ...(prev as Omit<Extract<ApplyPokerActionResult, { ok: true }>, 'ok'>) };
    }
  }
  const seat = seatForToken(room, input.token);
  if (seat < 0) return { ok: false, status: 403, error: 'unknown player token' };
  const st = room.engineState;
  if (!st) return { ok: false, status: 409, error: 'no hand in progress' };
  if (st.street === 'complete' || st.street === 'showdown')
    return { ok: false, status: 409, error: 'no hand in progress' };
  const engineSeat = engineSeatOf(room, seat);
  if (engineSeat < 0)
    return { ok: false, status: 403, error: 'you are sitting out this hand' };
  if (engineSeat !== st.actorSeat)
    return { ok: false, status: 403, error: 'not your turn' };
  const parsed = parseActionInput(input.action);
  if (!parsed) return { ok: false, status: 400, error: 'invalid action' };
  const legalErr = actionLegalError(st, engineSeat, parsed);
  if (legalErr) return { ok: false, status: 400, error: legalErr };
  let r: ReturnType<typeof applyAction>;
  try {
    r = applyAction(st, engineSeat, toEngineAction(parsed));
  } catch (e) {
    return {
      ok: false,
      status: 400,
      error: e instanceof Error ? e.message : 'action rejected',
    };
  }
  if (!r.ok) return { ok: false, status: 400, error: r.error };
  room.engineState = r.state;
  const p = playerBySeat(room, seat);
  if (p) p.lastAction = parsed.type;
  // Anyone who was auto-played while absent keeps the loop moving.
  autoPlayAbsent(room);
  afterEngineChange(room);
  const cur = room.engineState ?? r.state;
  const result = {
    seat,
    street: cur.street,
    handComplete: cur.street === 'complete',
    actorSeat: roomSeatOf(room, cur.actorSeat),
    pot: cur.street === 'complete' ? 0 : potTotal(cur),
  };
  if (idem) room.idempotency.set(`action:${idem}`, result);
  return { ok: true, ...result };
}

/** Common bookkeeping after the engine state changed. */
function afterEngineChange(room: PokerRoom): void {
  const st = room.engineState;
  if (!st) return;
  if (st.street === 'complete') {
    clearTurnTimer(room);
    countHandStats(room);
    broadcastPoker(room, 'hand-end', {
      handNumber: st.handNumber,
      winners: st.winners.map((w) => ({
        potIndex: w.potIndex,
        amount: w.amount,
        winnerSeats: w.winnerSeats.map((es) => roomSeatOf(room, es)),
        handName: w.handName,
      })),
      showdownRevealed: publicShowdown(room, st),
      players: publicTablePlayers(room),
    });
    scheduleNextDeal(room);
    return;
  }
  armTurnTimer(room);
  broadcastPokerTable(room);
}

function countHandStats(room: PokerRoom): void {
  const st = room.engineState;
  if (!st || st.street !== 'complete') return;
  if (room.lastHandCounted === st.handNumber) return;
  room.lastHandCounted = st.handNumber;
  for (const [engineSeat] of st.players.entries()) {
    const roomSeat = roomSeatOf(room, engineSeat);
    const p = roomSeat >= 0 ? playerBySeat(room, roomSeat) : undefined;
    if (p) p.handsPlayed += 1;
  }
  const won = new Set<number>();
  for (const w of st.winners) {
    for (const es of w.winnerSeats) {
      const rs = roomSeatOf(room, es);
      if (rs >= 0) won.add(rs);
    }
  }
  for (const rs of won) {
    const p = playerBySeat(room, rs);
    if (p) p.handsWon += 1;
  }
}

/** Seat any waiting players, then deal the next hand (test-callable). */
export function dealNextHand(room: PokerRoom): boolean {
  if (room.status !== 'playing') return false;
  const st = room.engineState;
  if (!st || st.street !== 'complete') return false;
  // Seat late joiners / lobby sit-outs who are still in the room.
  for (const p of activePlayers(room).sort((a, b) => a.seat - b.seat)) {
    if (p.inEngine || engineSeatOf(room, p.seat) >= 0) continue;
    const ep: PokerPlayerState = {
      seat: st.players.length,
      name: p.name,
      isBot: false,
      chips: p.buyIn + p.rebuys.reduce((n, r) => n + r.amount, 0),
      bet: 0,
      handCommitted: 0,
      hole: [],
      folded: false,
      allIn: false,
      eliminated: false,
      acted: false,
    };
    st.players.push(ep);
    room.seatMap.push(p.seat);
    p.inEngine = true;
    p.lastAction = null;
  }
  room.engineState = st;
  let r: ReturnType<typeof startHand>;
  try {
    r = startHand(st);
  } catch (e) {
    broadcastPoker(room, 'error', {
      error: e instanceof Error ? e.message : 'could not deal next hand',
    });
    return false;
  }
  if (!r.ok) {
    broadcastPoker(room, 'error', { error: r.error });
    return false;
  }
  room.engineState = r.state;
  for (const p of activePlayers(room)) {
    if (p.inEngine) p.lastAction = null;
  }
  autoPlayAbsent(room);
  afterEngineChange(room);
  return true;
}

function scheduleNextDeal(room: PokerRoom): void {
  clearTimeoutSafe(room.dealTimer);
  room.dealTimer = undefined;
  if (room.status !== 'playing') return;
  room.dealTimer = setTimeout(() => dealNextHand(room), POKER_AUTO_DEAL_DELAY_MS);
  unrefTimer(room.dealTimer);
}

// ---------------------------------------------------------------------------
// Rebuy
// ---------------------------------------------------------------------------

export interface RebuyPokerInput {
  token: unknown;
  amount: unknown;
  idem?: unknown;
}

export type RebuyPokerResult =
  | { ok: true; seat: number; stack: number; rebuysUsed: number; txId: string }
  | { ok: false; status: number; error: string };

export function rebuyPokerChips(
  room: PokerRoom,
  input: RebuyPokerInput,
): RebuyPokerResult {
  if (room.status === 'closed')
    return { ok: false, status: 410, error: 'room is closed' };
  if (room.status !== 'playing' && room.status !== 'paused')
    return { ok: false, status: 409, error: 'rebuys are only available during a game' };
  if (room.config.maxRebuys === 0)
    return { ok: false, status: 400, error: 'rebuys are disabled in this room' };
  const idem = typeof input.idem === 'string' && input.idem.length > 0 ? input.idem : null;
  if (idem) {
    const prev = room.idempotency.get(`rebuy:${idem}`);
    if (prev && typeof prev === 'object') {
      return { ok: true, ...(prev as Omit<Extract<RebuyPokerResult, { ok: true }>, 'ok'>) };
    }
  }
  const seat = seatForToken(room, input.token);
  if (seat < 0) return { ok: false, status: 403, error: 'unknown player token' };
  const player = playerBySeat(room, seat);
  if (!player) return { ok: false, status: 403, error: 'unknown player token' };
  if (!player.inEngine)
    return { ok: false, status: 409, error: 'you are not seated at the table yet' };
  const amount = asInt(input.amount, room.config.rebuyMin, room.config.rebuyMax);
  if (amount === null)
    return {
      ok: false,
      status: 400,
      error: `rebuy amount must be an integer ${room.config.rebuyMin}-${room.config.rebuyMax}`,
    };
  const used = player.rebuys.length;
  if (room.config.maxRebuys !== -1 && used >= room.config.maxRebuys)
    return { ok: false, status: 400, error: 'rebuy limit reached' };
  const st = room.engineState;
  if (!st) return { ok: false, status: 409, error: 'no game in progress' };
  const midHand = st.street !== 'complete';
  if (midHand && !room.config.rebuysMidHand)
    return { ok: false, status: 409, error: 'rebuys only between hands in this room' };
  const es = engineSeatOf(room, seat);
  if (es < 0) return { ok: false, status: 409, error: 'you are not seated at the table yet' };
  const ep = st.players[es];
  if (!ep) return { ok: false, status: 400, error: 'seat not found at table' };
  if (ep.eliminated) {
    if (midHand)
      return { ok: false, status: 409, error: 'eliminated players can only rebuy between hands' };
    let r: ReturnType<typeof engineRebuy>;
    try {
      r = engineRebuy(st, es, amount);
    } catch (e) {
      return { ok: false, status: 400, error: e instanceof Error ? e.message : 'rebuy rejected' };
    }
    if (!r.ok) return { ok: false, status: 400, error: r.error };
    room.engineState = r.state;
  } else {
    // Top-up: add chips directly (the engine's rebuy() only revives the
    // eliminated). Between hands the flags reset on the next deal anyway.
    ep.chips += amount;
    if (ep.allIn && ep.chips > 0 && !midHand) ep.allIn = false;
  }
  const tx: RebuyTx = { txId: newTxId(), ts: Date.now(), amount };
  player.rebuys.push(tx);
  recordLedger(room, seat, 'rebuy', amount);
  const result = {
    seat,
    stack: ep.chips,
    rebuysUsed: player.rebuys.length,
    txId: tx.txId,
  };
  if (idem) room.idempotency.set(`rebuy:${idem}`, result);
  broadcastPoker(room, 'rebuy', {
    seat,
    name: player.name,
    amount,
    stack: ep.chips,
    players: publicTablePlayers(room),
  });
  return { ok: true, ...result };
}

// ---------------------------------------------------------------------------
// Pause / resume / remove / presence
// ---------------------------------------------------------------------------

export type SimpleResult = { ok: true } | { ok: false; status: number; error: string };

export function pausePokerRoom(room: PokerRoom): SimpleResult {
  if (room.status === 'closed') return { ok: false, status: 410, error: 'room is closed' };
  if (room.status !== 'playing')
    return { ok: false, status: 409, error: `cannot pause while ${room.status}` };
  const st = room.engineState;
  if (st && st.street !== 'complete')
    return { ok: false, status: 409, error: 'pause is only allowed between hands' };
  room.status = 'paused';
  clearTimeoutSafe(room.dealTimer);
  room.dealTimer = undefined;
  clearTurnTimer(room);
  broadcastPoker(room, 'paused', { players: publicTablePlayers(room) });
  return { ok: true };
}

export function resumePokerRoom(room: PokerRoom): SimpleResult {
  if (room.status === 'closed') return { ok: false, status: 410, error: 'room is closed' };
  if (room.status !== 'paused')
    return { ok: false, status: 409, error: `cannot resume while ${room.status}` };
  room.status = 'playing';
  broadcastPoker(room, 'resumed', {});
  const st = room.engineState;
  if (st && st.street === 'complete') scheduleNextDeal(room);
  else armTurnTimer(room);
  return { ok: true };
}

export function removePokerPlayer(
  room: PokerRoom,
  seat: number,
): SimpleResult {
  if (room.status === 'closed') return { ok: false, status: 410, error: 'room is closed' };
  if (room.status !== 'lobby')
    return { ok: false, status: 409, error: 'players can only be removed in the lobby' };
  if (seat === 0) return { ok: false, status: 400, error: 'the host cannot be removed' };
  const player = playerBySeat(room, seat);
  if (!player) return { ok: false, status: 404, error: 'player not found' };
  player.removed = true;
  player.connected = false;
  for (const e of room.ledger) {
    if (e.seat === seat && !e.voided) e.voided = true;
  }
  broadcastPoker(room, 'players', {
    players: publicLobbyPlayers(room),
    removed: { seat, name: player.name },
  });
  return { ok: true };
}

export function setPokerConnected(
  room: PokerRoom,
  seat: number,
  connected: boolean,
): boolean {
  const player = playerBySeat(room, seat);
  if (!player) return false;
  if (player.connected === connected) return true;
  player.connected = connected;
  broadcastPoker(room, 'presence', {
    seat,
    name: player.name,
    connected,
    players: publicTablePlayers(room),
  });
  if (!connected && room.status === 'playing') {
    // Their turn no longer waits on them — but only touch the hand when the
    // disconnected seat is actually the actor, so unrelated disconnects
    // don't reset everyone else's turn timer.
    const st = room.engineState;
    if (
      st &&
      st.street !== 'complete' &&
      st.street !== 'showdown' &&
      roomSeatOf(room, st.actorSeat) === seat
    ) {
      autoPlayAbsent(room);
      afterEngineChange(room);
    }
  }
  return true;
}

// ---------------------------------------------------------------------------
// Close + settlement report
// ---------------------------------------------------------------------------

/** Resolve a token to a room seat: host token -> 0, else player token. */
export function seatForToken(room: PokerRoom, token: unknown): number {
  if (typeof token !== 'string' || token.length === 0) return -1;
  if (token === room.hostToken) return 0;
  const p = room.players.find((pl) => pl.playerToken === token && !pl.removed);
  return p ? p.seat : -1;
}

function isPokerHost(room: PokerRoom, token: unknown): boolean {
  return typeof token === 'string' && token.length > 0 && token === room.hostToken;
}

/**
 * Close the room. A hand in progress is auto-played out first
 * (check-if-free-else-fold for the actor, capped), so every chip is
 * accounted for. The room becomes read-only afterwards.
 */
export function closePokerRoom(room: PokerRoom, reason: string): PokerReport | null {
  if (room.status === 'closed') return room.report ?? null;
  clearTimeoutSafe(room.dealTimer);
  room.dealTimer = undefined;
  clearTurnTimer(room);
  clearTimeoutSafe(room.durationTimer);
  room.durationTimer = undefined;

  if (room.status === 'playing') {
    for (let i = 0; i < MAX_AUTO_ITERS; i++) {
      const cur2 = room.engineState;
      if (!cur2 || cur2.street === 'complete' || cur2.street === 'showdown') break;
      const actorEs = cur2.actorSeat;
      if (actorEs < 0) break;
      if (!applyAutoAction(room, actorEs, 'absent')) break;
    }
  }
  const cur = room.engineState;
  if (cur && cur.street === 'complete') countHandStats(room);

  room.status = 'closed';
  room.endedAt = Date.now();
  // Voice chat ends with the room: clear presence and tell every client to
  // tear down its peer connections.
  room.voice.clear();
  broadcastPokerVoiceState(room);
  const report = computePokerReport(room);
  room.report = report;
  storePokerReport(report);
  broadcastPoker(room, 'room-closed', {
    reason,
    report: {
      code: report.code,
      roomName: report.roomName,
      handsPlayed: report.handsPlayed,
      balanced: report.balanced,
      topWinner: report.topWinner,
      players: report.players.map((p) => ({
        seat: p.seat,
        name: p.name,
        net: p.net,
        finalChips: p.finalChips,
      })),
    },
  });
  return report;
}

export function computePokerReport(room: PokerRoom): PokerReport {
  const st = room.engineState;
  const finalChipsOf = (p: PokerRoomPlayer): number => {
    if (p.inEngine && st) {
      const es = engineSeatOf(room, p.seat);
      const ep = es >= 0 ? st.players[es] : undefined;
      if (ep) return ep.chips;
    }
    return p.buyIn + p.rebuys.reduce((n, r) => n + r.amount, 0);
  };
  let buyIns = 0;
  let rebuys = 0;
  for (const e of room.ledger) {
    if (e.voided) continue;
    if (e.kind === 'buyin') buyIns += e.amount;
    else rebuys += e.amount;
  }
  const players: PokerPlayerReport[] = activePlayers(room)
    .map((p) => {
      const rebuyTotal = p.rebuys.reduce((n, r) => n + r.amount, 0);
      const contributed = p.buyIn + rebuyTotal;
      const finalChips = finalChipsOf(p);
      return {
        seat: p.seat,
        name: p.name,
        initialBuyIn: p.buyIn,
        rebuys: rebuyTotal,
        contributed,
        finalChips,
        net: finalChips - contributed,
        handsPlayed: p.handsPlayed,
        handsWon: p.handsWon,
      };
    })
    .sort((a, b) => b.net - a.net || a.seat - b.seat);
  const final = players.reduce((n, p) => n + p.finalChips, 0);
  const netSum = players.reduce((n, p) => n + p.net, 0);
  const balanced = netSum === 0 && final === buyIns + rebuys;
  const first = players[0];
  const last = players[players.length - 1];
  const startedAt = room.startedAt ?? room.createdAt;
  const endedAt = room.endedAt ?? Date.now();
  return {
    roomName: room.roomName,
    code: room.code,
    startedAt,
    endedAt,
    durationSec: Math.max(0, Math.round((endedAt - startedAt) / 1000)),
    handsPlayed: st?.handNumber ?? 0,
    totals: { buyIns, rebuys, final },
    balanced,
    discrepancy: buyIns + rebuys - final,
    players,
    topWinner: first
      ? { seat: first.seat, name: first.name, net: first.net }
      : { seat: -1, name: '', net: 0 },
    biggestLoss: last
      ? { seat: last.seat, name: last.name, net: last.net }
      : { seat: -1, name: '', net: 0 },
  };
}

/**
 * Re-validate a report's zero-sum math (used by tests and safe to expose:
 * it only reads the report object it is given).
 */
export function validatePokerReport(report: PokerReport): {
  balanced: boolean;
  discrepancy: number;
} {
  const buyIns = report.totals.buyIns;
  const rebuys = report.totals.rebuys;
  const final = report.players.reduce((n, p) => n + p.finalChips, 0);
  const netSum = report.players.reduce((n, p) => n + p.net, 0);
  const netsMatch = report.players.every((p) => p.net === p.finalChips - p.contributed);
  const balanced = netsMatch && netSum === 0 && final === buyIns + rebuys;
  return { balanced, discrepancy: buyIns + rebuys - final };
}

// ---------------------------------------------------------------------------
// HTTP handlers (mounted under /api/poker/rooms in server.ts)
// ---------------------------------------------------------------------------

const limiter = createRateLimiter(240, 60 * 1000);

function checkRate(res: Response, ip: string): boolean {
  if (!limiter.check(ip)) {
    res.status(429).json({ error: 'too many requests — slow down a little' });
    return false;
  }
  return true;
}

interface Body {
  [key: string]: unknown;
}

function bodyOf(req: Request): Body {
  return (req.body ?? {}) as Body;
}

function needRoom(res: Response, code: string): PokerRoom | undefined {
  const room = getPokerRoom(code);
  if (!room) {
    res.status(404).json({ error: 'poker room not found — check the code and try again' });
    return undefined;
  }
  return room;
}

/** Mutating routes refuse work on closed rooms. */
function needOpen(res: Response, room: PokerRoom): boolean {
  if (room.status === 'closed') {
    res.status(410).json({ error: 'room is closed' });
    return false;
  }
  return true;
}

function needPokerHost(res: Response, room: PokerRoom, token: unknown): boolean {
  if (!isPokerHost(room, token)) {
    res.status(403).json({ error: 'not the host' });
    return false;
  }
  return true;
}

function tokenOf(req: Request): unknown {
  const header = req.headers['x-poker-token'];
  if (typeof header === 'string' && header.length > 0) return header;
  const body = bodyOf(req);
  if (typeof body.token === 'string' && body.token.length > 0) return body.token;
  if (typeof req.query.token === 'string' && req.query.token.length > 0)
    return req.query.token;
  return undefined;
}

function hostTokenOf(req: Request): unknown {
  return (
    req.headers['x-host-token'] ??
    bodyOf(req).hostToken ??
    (typeof req.query.token === 'string' ? req.query.token : undefined)
  );
}

/** POST /api/poker/rooms — create a room. */
export function pokerCreateRoomHandler(req: Request, res: Response): void {
  try {
    if (!checkRate(res, req.ip ?? 'unknown')) return;
    const result = createPokerRoom(bodyOf(req));
    if (!result.ok) {
      res.status(400).json({ error: result.error });
      return;
    }
    res.json({
      code: result.room.code,
      hostToken: result.room.hostToken,
      playerToken: result.host.playerToken,
      seat: result.host.seat,
      summary: publicRoomInfo(result.room),
    });
  } catch {
    res.status(500).json({ error: 'could not create poker room' });
  }
}

/** GET /api/poker/rooms/:code — public summary (no auth). */
export function pokerRoomInfoHandler(req: Request, res: Response): void {
  const room = needRoom(res, req.params.code ?? '');
  if (!room) return;
  res.json(publicRoomInfo(room));
}

/** GET /api/poker/rooms/:code/state — x-poker-token (or ?token=). */
export function pokerStateHandler(req: Request, res: Response): void {
  const room = needRoom(res, req.params.code ?? '');
  if (!room) return;
  const seat = seatForToken(room, tokenOf(req));
  if (seat < 0) {
    res.status(403).json({ error: 'player auth required' });
    return;
  }
  res.json(pokerStateFor(room, seat));
}

/**
 * GET /api/poker/rooms/:code/report — final report after close.
 * Served from the live room or the 30-day report store. The room code
 * itself grants view access; there is no list-all endpoint.
 */
export function pokerReportHandler(req: Request, res: Response): void {
  const code = normalizePokerCode(req.params.code ?? '');
  const room = getPokerRoom(code);
  if (room && room.status === 'closed' && room.report) {
    res.json(room.report);
    return;
  }
  const stored = getPokerReport(code);
  if (stored) {
    res.json(stored);
    return;
  }
  res.status(404).json({ error: 'report not found or expired' });
}

/** POST /api/poker/rooms/:code/join — { name, password?, buyIn, idem? } */
export function pokerJoinHandler(req: Request, res: Response): void {
  try {
    if (!checkRate(res, req.ip ?? 'unknown')) return;
    const room = needRoom(res, req.params.code ?? '');
    if (!room) return;
    const body = bodyOf(req);
    const result = joinPokerRoom(room, {
      name: body.name,
      password: body.password,
      buyIn: body.buyIn,
      idem: body.idem,
    });
    if (!result.ok) {
      res.status(result.status).json({ error: result.error });
      return;
    }
    res.json({
      seat: result.seat,
      playerToken: result.playerToken,
      sittingOut: result.sittingOut,
      summary: publicRoomInfo(room),
    });
  } catch {
    res.status(500).json({ error: 'could not join poker room' });
  }
}

/** POST /api/poker/rooms/:code/ready — { token } toggles ready (lobby only). */
export function pokerReadyHandler(req: Request, res: Response): void {
  try {
    if (!checkRate(res, req.ip ?? 'unknown')) return;
    const room = needRoom(res, req.params.code ?? '');
    if (!room) return;
    const result = togglePokerReady(room, tokenOf(req) as string);
    if (!result.ok) {
      res.status(result.status).json({ error: result.error });
      return;
    }
    res.json({ ok: true, ready: result.ready });
  } catch {
    res.status(500).json({ error: 'could not toggle ready' });
  }
}

/** POST /api/poker/rooms/:code/start — host only. */
export function pokerStartHandler(req: Request, res: Response): void {
  try {
    if (!checkRate(res, req.ip ?? 'unknown')) return;
    const room = needRoom(res, req.params.code ?? '');
    if (!room) return;
    if (!needPokerHost(res, room, hostTokenOf(req))) return;
    const result = startPokerGame(room);
    if (!result.ok) {
      res.status(result.status).json({ error: result.error });
      return;
    }
    res.json({ ok: true, handNumber: room.engineState?.handNumber ?? 0 });
  } catch {
    res.status(500).json({ error: 'could not start poker game' });
  }
}

/** POST /api/poker/rooms/:code/action — { token, action, idem? } */
export function pokerActionHandler(req: Request, res: Response): void {
  try {
    if (!checkRate(res, req.ip ?? 'unknown')) return;
    const room = needRoom(res, req.params.code ?? '');
    if (!room) return;
    const body = bodyOf(req);
    const result = applyPokerAction(room, {
      token: tokenOf(req),
      action: body.action,
      idem: body.idem,
    });
    if (!result.ok) {
      res.status(result.status).json({ error: result.error });
      return;
    }
    res.json(result);
  } catch {
    res.status(500).json({ error: 'could not apply action' });
  }
}

/** POST /api/poker/rooms/:code/rebuy — { token, amount, idem? } */
export function pokerRebuyHandler(req: Request, res: Response): void {
  try {
    if (!checkRate(res, req.ip ?? 'unknown')) return;
    const room = needRoom(res, req.params.code ?? '');
    if (!room) return;
    const body = bodyOf(req);
    const result = rebuyPokerChips(room, {
      token: tokenOf(req),
      amount: body.amount,
      idem: body.idem,
    });
    if (!result.ok) {
      res.status(result.status).json({ error: result.error });
      return;
    }
    res.json(result);
  } catch {
    res.status(500).json({ error: 'could not rebuy' });
  }
}

/** POST /api/poker/rooms/:code/pause — host only, between hands. */
export function pokerPauseHandler(req: Request, res: Response): void {
  try {
    if (!checkRate(res, req.ip ?? 'unknown')) return;
    const room = needRoom(res, req.params.code ?? '');
    if (!room) return;
    if (!needPokerHost(res, room, hostTokenOf(req))) return;
    const result = pausePokerRoom(room);
    if (!result.ok) {
      res.status(result.status).json({ error: result.error });
      return;
    }
    res.json({ ok: true, status: room.status });
  } catch {
    res.status(500).json({ error: 'could not pause' });
  }
}

/** POST /api/poker/rooms/:code/resume — host only. */
export function pokerResumeHandler(req: Request, res: Response): void {
  try {
    if (!checkRate(res, req.ip ?? 'unknown')) return;
    const room = needRoom(res, req.params.code ?? '');
    if (!room) return;
    if (!needPokerHost(res, room, hostTokenOf(req))) return;
    const result = resumePokerRoom(room);
    if (!result.ok) {
      res.status(result.status).json({ error: result.error });
      return;
    }
    res.json({ ok: true, status: room.status });
  } catch {
    res.status(500).json({ error: 'could not resume' });
  }
}

/** POST /api/poker/rooms/:code/remove — host only, lobby only. { token, seat } */
export function pokerRemoveHandler(req: Request, res: Response): void {
  try {
    if (!checkRate(res, req.ip ?? 'unknown')) return;
    const room = needRoom(res, req.params.code ?? '');
    if (!room) return;
    if (!needPokerHost(res, room, hostTokenOf(req))) return;
    const seat = bodyOf(req).seat;
    if (typeof seat !== 'number' || !Number.isInteger(seat)) {
      res.status(400).json({ error: 'seat must be an integer' });
      return;
    }
    const result = removePokerPlayer(room, seat);
    if (!result.ok) {
      res.status(result.status).json({ error: result.error });
      return;
    }
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: 'could not remove player' });
  }
}

/** POST /api/poker/rooms/:code/disconnect — { token } */
export function pokerDisconnectHandler(req: Request, res: Response): void {
  try {
    const room = needRoom(res, req.params.code ?? '');
    if (!room) return;
    const seat = seatForToken(room, tokenOf(req));
    if (seat < 0) {
      res.status(403).json({ error: 'unknown player token' });
      return;
    }
    setPokerConnected(room, seat, false);
    res.json({ ok: true, seat, connected: false });
  } catch {
    res.status(500).json({ error: 'could not disconnect' });
  }
}

/** POST /api/poker/rooms/:code/reconnect — { token } */
export function pokerReconnectHandler(req: Request, res: Response): void {
  try {
    const room = needRoom(res, req.params.code ?? '');
    if (!room) return;
    const seat = seatForToken(room, tokenOf(req));
    if (seat < 0) {
      res.status(403).json({ error: 'unknown player token' });
      return;
    }
    setPokerConnected(room, seat, true);
    res.json({ ok: true, seat, connected: true });
  } catch {
    res.status(500).json({ error: 'could not reconnect' });
  }
}

/** POST /api/poker/rooms/:code/close — host only. Settles and locks the room. */
export function pokerCloseHandler(req: Request, res: Response): void {
  try {
    if (!checkRate(res, req.ip ?? 'unknown')) return;
    const room = needRoom(res, req.params.code ?? '');
    if (!room) return;
    if (!needPokerHost(res, room, hostTokenOf(req))) return;
    const report = closePokerRoom(room, 'host');
    res.json({ ok: true, report });
  } catch {
    res.status(500).json({ error: 'could not close room' });
  }
}

// ---------------------------------------------------------------------------
// Voice chat handlers (WebRTC audio-only mesh; the server relays signaling)
// ---------------------------------------------------------------------------

/** Resolve the caller's seat or send 403. Returns -1 after responding. */
function needVoiceSeat(res: Response, room: PokerRoom, req: Request): number {
  const seat = seatForToken(room, tokenOf(req));
  if (seat < 0) {
    res.status(403).json({ error: 'unknown player token' });
    return -1;
  }
  return seat;
}

/** POST /api/poker/rooms/:code/voice-join — { token } */
export function pokerVoiceJoinHandler(req: Request, res: Response): void {
  try {
    if (!checkRate(res, req.ip ?? 'unknown')) return;
    const room = needRoom(res, req.params.code ?? '');
    if (!room) return;
    const seat = needVoiceSeat(res, room, req);
    if (seat < 0) return;
    const result = joinPokerVoice(room, seat);
    if (!result.ok) {
      res.status(result.status).json({ error: result.error });
      return;
    }
    res.json({ ok: true, seat });
  } catch {
    res.status(500).json({ error: 'could not join voice chat' });
  }
}

/** POST /api/poker/rooms/:code/voice-leave — { token } */
export function pokerVoiceLeaveHandler(req: Request, res: Response): void {
  try {
    if (!checkRate(res, req.ip ?? 'unknown')) return;
    const room = needRoom(res, req.params.code ?? '');
    if (!room) return;
    const seat = needVoiceSeat(res, room, req);
    if (seat < 0) return;
    const result = leavePokerVoice(room, seat);
    if (!result.ok) {
      res.status(result.status).json({ error: result.error });
      return;
    }
    res.json({ ok: true, seat });
  } catch {
    res.status(500).json({ error: 'could not leave voice chat' });
  }
}

/** POST /api/poker/rooms/:code/voice-status — { token, muted?, speaking? } */
export function pokerVoiceStatusHandler(req: Request, res: Response): void {
  try {
    if (!checkRate(res, req.ip ?? 'unknown')) return;
    const room = needRoom(res, req.params.code ?? '');
    if (!room) return;
    const seat = needVoiceSeat(res, room, req);
    if (seat < 0) return;
    const body = bodyOf(req);
    const result = setPokerVoiceStatus(room, seat, {
      muted: body.muted,
      speaking: body.speaking,
    });
    if (!result.ok) {
      res.status(result.status).json({ error: result.error });
      return;
    }
    res.json({ ok: true, seat });
  } catch {
    res.status(500).json({ error: 'could not update voice status' });
  }
}

/**
 * POST /api/poker/rooms/:code/voice-signal —
 * { token, toSeat, kind: 'offer'|'answer'|'ice', payload }.
 * The payload is opaque pass-through (string fields only, ~8KB cap) and is
 * delivered ONLY to the target seat's SSE clients.
 */
export function pokerVoiceSignalHandler(req: Request, res: Response): void {
  try {
    if (!checkRate(res, req.ip ?? 'unknown')) return;
    const room = needRoom(res, req.params.code ?? '');
    if (!room) return;
    const seat = needVoiceSeat(res, room, req);
    if (seat < 0) return;
    const body = bodyOf(req);
    const result = signalPokerVoice(room, seat, {
      toSeat: body.toSeat,
      kind: body.kind,
      payload: body.payload,
    });
    if (!result.ok) {
      res.status(result.status).json({ error: result.error });
      return;
    }
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: 'could not relay voice signal' });
  }
}

/**
 * GET /api/poker/rooms/:code/events — SSE stream.
 * Query: role=host&token=<hostToken> OR role=player&token=<playerToken>
 * SSE close marks the player disconnected (reconnect via POST /reconnect).
 */
export function pokerEventsHandler(req: Request, res: Response): void {
  const room = needRoom(res, req.params.code ?? '');
  if (!room) return;
  const role = req.query.role;
  let seat: number | undefined;
  let isHost = false;
  if (role === 'host') {
    if (!needPokerHost(res, room, req.query.token)) return;
    isHost = true;
    seat = 0;
  } else if (role === 'player') {
    const s = seatForToken(room, req.query.token);
    if (s < 0) {
      res.status(403).json({ error: 'player auth required' });
      return;
    }
    seat = s;
  } else {
    res.status(400).json({ error: 'role must be host or player' });
    return;
  }

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  const flush = (res as unknown as { flushHeaders?: () => void }).flushHeaders;
  if (typeof flush === 'function') flush.call(res);

  const client: PokerClient = {
    write: (chunk: string) => {
      res.write(chunk);
    },
    on: (event: 'close', cb: () => void) => {
      (req as unknown as { on: (e: string, cb: () => void) => void }).on(event, cb);
    },
    seat,
    isHost,
  };
  room.clients.add(client);
  // Hello carries the public table (no secrets) plus the requester's seat so
  // the client can immediately GET /state for its own hole cards.
  res.write(formatPokerEvent('hello', { ...publicTableState(room), yourSeat: seat ?? null }));

  const heartbeat = setInterval(() => {
    try {
      res.write(': heartbeat\n\n');
    } catch {
      // closed underneath us; the close handler cleans up
    }
  }, 20000);
  unrefTimer(heartbeat);

  const cleanup = (): void => {
    clearInterval(heartbeat);
    room.clients.delete(client);
    if (seat === undefined || room.status === 'closed') return;
    // A seat can hold several SSE connections at once (e.g. the table
    // stream plus the voice-chat stream): only the LAST one dropping
    // marks the player disconnected and clears their voice entry.
    const others = [...room.clients].some((c) => c.seat === seat);
    if (others) return;
    setPokerConnected(room, seat, false);
    releasePokerVoiceOnDisconnect(room, seat);
  };
  client.on('close', cleanup);
  req.on('close', cleanup);
}
