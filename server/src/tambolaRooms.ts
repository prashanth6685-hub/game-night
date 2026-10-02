// Multi-phone Tambola rooms: QR-code party play over SSE + plain POSTs.
//
// Flow: host creates a room (gets a 5-char code + hostToken), players scan
// the QR code (or type the code) to join from their own phones, the host
// calls numbers (server draws them, so the order is authoritative), and
// called numbers / claims are pushed to every phone over Server-Sent Events.
//
// NOTE on persistence: rooms live in memory only and expire after ROOM_TTL_MS.
// The Render free tier sleeps when idle, which also wipes rooms. That's fine:
// a Tambola room is an ephemeral party session, not durable data.

import type { Request, Response } from 'express';
import { randomBytes } from 'node:crypto';
import { generateTicket, ticketKey } from '../../client/src/games/tambola/logic/ticket.ts';
import type { Ticket } from '../../client/src/games/tambola/logic/ticket.ts';
import { checkPattern, PATTERNS } from '../../client/src/games/tambola/logic/patterns.ts';
import type { PatternId } from '../../client/src/games/tambola/logic/patterns.ts';
import { createRateLimiter } from './charades.ts';

export const ROOM_CODE_LEN = 5;
// Unambiguous alphabet: no 0/O, 1/I/L (easy to read off a big screen).
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const VALID_PATTERN_IDS = new Set<string>(PATTERNS.map((p) => p.id));

export const ROOM_TTL_MS = 4 * 60 * 60 * 1000; // 4h — a party session
const ENDED_TTL_MS = 30 * 60 * 1000; // ended rooms linger 30 min for results
const SWEEP_INTERVAL_MS = 5 * 60 * 1000;
const MAX_NAME_LEN = 24;
const MAX_PLAYERS_PER_ROOM = 60;

export type RoomStatus = 'lobby' | 'playing' | 'ended';
export type ClaimStatus = 'pending' | 'approved' | 'rejected';

export interface RoomPlayer {
  id: string;
  name: string;
  token: string;
  ticket: Ticket;
  dabbed: number[];
  joinedAt: number;
}

export interface RoomClaim {
  id: string;
  playerId: string;
  playerName: string;
  pattern: PatternId;
  status: ClaimStatus;
  createdAt: number;
}

/** Minimal SSE sink so tests can inject a fake without express. */
export interface SseClient {
  write(chunk: string): void;
  on(event: 'close', cb: () => void): void;
}

export interface TambolaRoom {
  code: string;
  hostToken: string;
  status: RoomStatus;
  enabledPatterns: PatternId[];
  players: RoomPlayer[];
  called: number[]; // call order, server-authoritative
  claims: RoomClaim[];
  createdAt: number;
  endedAt?: number;
  clients: Set<SseClient>;
}

export interface RoomResults {
  winners: { playerName: string; pattern: PatternId }[];
  calledCount: number;
}

// ------------------------------------------------------------------ store
const rooms = new Map<string, TambolaRoom>();

function newId(): string {
  return randomBytes(8).toString('hex');
}

function newToken(): string {
  return randomBytes(16).toString('hex');
}

/** Normalize user-typed codes: uppercase, strip spaces. */
export function normalizeCode(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export function createRoomCode(existing: Set<string>): string {
  for (let attempt = 0; attempt < 1000; attempt++) {
    let code = '';
    const bytes = randomBytes(ROOM_CODE_LEN);
    for (let i = 0; i < ROOM_CODE_LEN; i++) {
      code += CODE_ALPHABET[(bytes[i] ?? 0) % CODE_ALPHABET.length];
    }
    if (!existing.has(code)) return code;
  }
  // Practically unreachable (34^5 ≈ 45M codes).
  throw new Error('could not allocate a room code');
}

export function getRoom(code: string): TambolaRoom | undefined {
  return rooms.get(normalizeCode(code));
}

/** Delete rooms older than ROOM_TTL_MS (ended rooms: ENDED_TTL_MS). */
export function sweepRooms(now: number = Date.now()): number {
  let removed = 0;
  for (const [code, room] of rooms) {
    const ttl = room.status === 'ended' ? ENDED_TTL_MS : ROOM_TTL_MS;
    const end = room.status === 'ended' ? (room.endedAt ?? room.createdAt) : room.createdAt;
    if (now - end > ttl) {
      rooms.delete(code);
      removed += 1;
    }
  }
  return removed;
}

if (typeof setInterval !== 'undefined') {
  const t = setInterval(sweepRooms, SWEEP_INTERVAL_MS);
  // Don't keep the process alive just for the sweeper in tests.
  if (typeof (t as unknown as { unref?: () => void }).unref === 'function') {
    (t as unknown as { unref: () => void }).unref();
  }
}

// ------------------------------------------------------------------ core
export function createRoom(enabledPatterns: PatternId[]): TambolaRoom {
  const room: TambolaRoom = {
    code: createRoomCode(new Set(rooms.keys())),
    hostToken: newToken(),
    status: 'lobby',
    enabledPatterns: enabledPatterns.filter((p) => VALID_PATTERN_IDS.has(p)),
    players: [],
    called: [],
    claims: [],
    createdAt: Date.now(),
    clients: new Set(),
  };
  rooms.set(room.code, room);
  return room;
}

function ticketKeys(room: TambolaRoom): Set<string> {
  return new Set(room.players.map((p) => ticketKey(p.ticket)));
}

/** Find a player by name (case-insensitive) — used for rejoins. */
export function findPlayerByName(room: TambolaRoom, name: string): RoomPlayer | undefined {
  const needle = name.trim().toLowerCase();
  return room.players.find((p) => p.name.toLowerCase() === needle);
}

function findPlayer(room: TambolaRoom, playerId: string): RoomPlayer | undefined {
  return room.players.find((p) => p.id === playerId);
}

function authedPlayer(room: TambolaRoom, playerId: string, token: string): RoomPlayer | undefined {
  const p = findPlayer(room, playerId);
  return p && p.token === token ? p : undefined;
}

/** Make a display name unique within the room: "Ravi" → "Ravi 2". */
export function uniqueName(room: TambolaRoom, name: string): string {
  const base = name.trim().slice(0, MAX_NAME_LEN);
  const taken = new Set(room.players.map((p) => p.name.toLowerCase()));
  if (!taken.has(base.toLowerCase())) return base;
  for (let n = 2; n < 1000; n++) {
    const candidate = `${base} ${n}`;
    if (!taken.has(candidate.toLowerCase())) return candidate;
  }
  return `${base} ${Date.now() % 100000}`;
}

export type JoinResult =
  | { ok: true; player: RoomPlayer; rejoined: boolean }
  | { ok: false; error: 'invalid-name' | 'room-full' | 'already-started' };

/**
 * Add a player to a lobby room (or rejoin an existing one by name).
 * Exactly one ticket per player; tickets are unique within the room.
 */
export function joinPlayer(room: TambolaRoom, rawName: string): JoinResult {
  const name = rawName.trim().replace(/[\u0000-\u001F\u007F]/g, '').slice(0, MAX_NAME_LEN);
  if (name.length < 1) return { ok: false, error: 'invalid-name' };

  const existing = findPlayerByName(room, name);
  if (existing) return { ok: true, player: existing, rejoined: true };

  if (room.status !== 'lobby') return { ok: false, error: 'already-started' };
  if (room.players.length >= MAX_PLAYERS_PER_ROOM) return { ok: false, error: 'room-full' };

  const seen = ticketKeys(room);
  let ticket = generateTicket();
  for (let attempt = 0; attempt < 50 && seen.has(ticketKey(ticket)); attempt++) {
    ticket = generateTicket();
  }
  const player: RoomPlayer = {
    id: newId(),
    name: uniqueName(room, name),
    token: newToken(),
    ticket,
    dabbed: [],
    joinedAt: Date.now(),
  };
  room.players.push(player);
  broadcast(room, 'players', { players: publicPlayers(room) });
  return { ok: true, player, rejoined: false };
}

/**
 * Server-authoritative draw: pick a random uncalled number 1–90.
 * Returns null once all 90 are called.
 */
export function drawNumber(room: TambolaRoom): number | null {
  if (room.status !== 'playing') return null;
  const calledSet = new Set(room.called);
  if (calledSet.size >= 90) return null;
  const remaining: number[] = [];
  for (let n = 1; n <= 90; n++) {
    if (!calledSet.has(n)) remaining.push(n);
  }
  const n = remaining[Math.floor(Math.random() * remaining.length)];
  if (n === undefined) return null;
  room.called.push(n);
  broadcast(room, 'called', { number: n, calledCount: room.called.length });
  return n;
}

/** Record a player's dab (tap) on a number. Their own mark only. */
export function recordDab(
  room: TambolaRoom,
  playerId: string,
  token: string,
  number: number,
  dabbed: boolean,
): boolean {
  const player = authedPlayer(room, playerId, token);
  if (!player) return false;
  if (!Number.isInteger(number) || number < 1 || number > 90) return false;
  const set = new Set(player.dabbed);
  if (dabbed) set.add(number);
  else set.delete(number);
  player.dabbed = [...set];
  return true;
}

export type ClaimResult =
  | { ok: true; claim: RoomClaim }
  | { ok: false; error: 'auth' | 'bad-pattern' | 'already-approved' | 'not-playing' };

/**
 * File a win claim. The server only checks that the pattern is enabled and
 * not already approved — the host verifies the ticket before approval, and
 * verifyClaim re-validates against the called numbers (never trust the client).
 */
export function fileClaim(
  room: TambolaRoom,
  playerId: string,
  token: string,
  pattern: PatternId,
): ClaimResult {
  const player = authedPlayer(room, playerId, token);
  if (!player) return { ok: false, error: 'auth' };
  if (room.status !== 'playing') return { ok: false, error: 'not-playing' };
  if (!room.enabledPatterns.includes(pattern) || !VALID_PATTERN_IDS.has(pattern)) {
    return { ok: false, error: 'bad-pattern' };
  }
  if (room.claims.some((c) => c.pattern === pattern && c.status === 'approved')) {
    return { ok: false, error: 'already-approved' };
  }
  const claim: RoomClaim = {
    id: newId(),
    playerId: player.id,
    playerName: player.name,
    pattern,
    status: 'pending',
    createdAt: Date.now(),
  };
  room.claims.push(claim);
  broadcast(room, 'claim', { claim: claimView(room, claim) });
  return { ok: true, claim };
}

export type VerifyResult =
  | { ok: true; claim: RoomClaim; ended: boolean }
  | { ok: false; error: 'not-found' | 'not-pending' | 'invalid-claim' };

/**
 * Host verifies a claim. On approve, the server re-validates the ticket
 * against the called numbers — an invalid claim can never be approved.
 * Approving a Full House ends the game.
 */
export function verifyClaim(
  room: TambolaRoom,
  claimId: string,
  approve: boolean,
): VerifyResult {
  const claim = room.claims.find((c) => c.id === claimId);
  if (!claim) return { ok: false, error: 'not-found' };
  if (claim.status !== 'pending') return { ok: false, error: 'not-pending' };
  const player = findPlayer(room, claim.playerId);

  if (!approve) {
    claim.status = 'rejected';
    broadcast(room, 'claim-resolved', {
      claimId: claim.id,
      pattern: claim.pattern,
      playerName: claim.playerName,
      approved: false,
    });
    return { ok: true, claim, ended: false };
  }

  // Approve: server-side validation against the called numbers.
  const calledSet = new Set(room.called);
  const valid = player !== undefined && checkPattern(player.ticket, calledSet, claim.pattern);
  if (!valid) return { ok: false, error: 'invalid-claim' };

  claim.status = 'approved';
  broadcast(room, 'claim-resolved', {
    claimId: claim.id,
    pattern: claim.pattern,
    playerName: claim.playerName,
    approved: true,
  });

  let ended = false;
  if (claim.pattern === 'full-house') {
    endRoom(room);
    ended = true;
  }
  return { ok: true, claim, ended };
}

export function buildResults(room: TambolaRoom): RoomResults {
  return {
    winners: room.claims
      .filter((c) => c.status === 'approved')
      .map((c) => ({ playerName: c.playerName, pattern: c.pattern })),
    calledCount: room.called.length,
  };
}

/** End the game and push results to everyone. */
export function endRoom(room: TambolaRoom): RoomResults {
  room.status = 'ended';
  room.endedAt = Date.now();
  const results = buildResults(room);
  broadcast(room, 'ended', { results });
  return results;
}

// ------------------------------------------------------------------ views
export function publicPlayers(room: TambolaRoom): { name: string }[] {
  return room.players.map((p) => ({ name: p.name }));
}

export function publicInfo(room: TambolaRoom): {
  code: string;
  status: RoomStatus;
  playerCount: number;
  players: { name: string }[];
  enabledPatterns: PatternId[];
} {
  return {
    code: room.code,
    status: room.status,
    playerCount: room.players.length,
    players: publicPlayers(room),
    enabledPatterns: room.enabledPatterns,
  };
}

export interface ClaimView extends RoomClaim {
  ticket: Ticket;
}

export function claimView(room: TambolaRoom, claim: RoomClaim): ClaimView {
  const player = findPlayer(room, claim.playerId);
  return { ...claim, ticket: player ? player.ticket : [[], [], []] };
}

export function playerSnapshot(room: TambolaRoom, player: RoomPlayer): {
  code: string;
  status: RoomStatus;
  name: string;
  ticket: Ticket;
  dabbed: number[];
  called: number[];
  enabledPatterns: PatternId[];
  players: { name: string }[];
  claims: { id: string; playerName: string; pattern: PatternId; status: ClaimStatus }[];
  results?: RoomResults;
} {
  const snap: ReturnType<typeof playerSnapshot> = {
    code: room.code,
    status: room.status,
    name: player.name,
    ticket: player.ticket,
    dabbed: player.dabbed,
    called: [...room.called],
    enabledPatterns: room.enabledPatterns,
    players: publicPlayers(room),
    claims: room.claims.map((c) => ({
      id: c.id,
      playerName: c.playerName,
      pattern: c.pattern,
      status: c.status,
    })),
  };
  if (room.status === 'ended') snap.results = buildResults(room);
  return snap;
}

export function hostSnapshot(room: TambolaRoom): {
  code: string;
  status: RoomStatus;
  players: { id: string; name: string; joinedAt: number }[];
  called: number[];
  enabledPatterns: PatternId[];
  claims: ClaimView[];
  results?: RoomResults;
} {
  const snap: ReturnType<typeof hostSnapshot> = {
    code: room.code,
    status: room.status,
    players: room.players.map((p) => ({ id: p.id, name: p.name, joinedAt: p.joinedAt })),
    called: [...room.called],
    enabledPatterns: room.enabledPatterns,
    claims: room.claims.map((c) => claimView(room, c)),
  };
  if (room.status === 'ended') snap.results = buildResults(room);
  return snap;
}

// ------------------------------------------------------------------ SSE
export function formatEvent(type: string, data: unknown): string {
  return `event: ${type}\ndata: ${JSON.stringify(data)}\n\n`;
}

export function broadcast(room: TambolaRoom, type: string, data: unknown): void {
  const chunk = formatEvent(type, data);
  for (const client of room.clients) {
    try {
      client.write(chunk);
    } catch {
      // Drop broken clients; the close handler cleans them up.
    }
  }
}

// ------------------------------------------------------------------ http
const limiter = createRateLimiter(120, 60 * 1000); // 120 POSTs/min per IP

function checkRate(res: Response, ip: string): boolean {
  if (!limiter.check(ip)) {
    res.status(429).json({ error: 'too many requests — slow down a little' });
    return false;
  }
  return true;
}

function needRoom(res: Response, code: string): TambolaRoom | undefined {
  const room = getRoom(code);
  if (!room) {
    res.status(404).json({ error: 'room not found — check the code and try again' });
    return undefined;
  }
  return room;
}

function needHost(res: Response, room: TambolaRoom, token: unknown): boolean {
  if (typeof token !== 'string' || token !== room.hostToken) {
    res.status(403).json({ error: 'not the host' });
    return false;
  }
  return true;
}

function hostTokenOf(req: Request): unknown {
  return req.headers['x-host-token'] ?? (req.body as Record<string, unknown> | undefined)?.hostToken;
}

/** POST /api/tambola/rooms — create a room. Body: { enabledPatterns?: string[] } */
export function createRoomHandler(req: Request, res: Response): void {
  try {
    if (!checkRate(res, req.ip ?? 'unknown')) return;
    const body = (req.body ?? {}) as { enabledPatterns?: unknown };
    const patterns = Array.isArray(body.enabledPatterns)
      ? (body.enabledPatterns.filter(
          (p): p is PatternId => typeof p === 'string' && VALID_PATTERN_IDS.has(p),
        ) as PatternId[])
      : [...VALID_PATTERN_IDS] as PatternId[];
    const room = createRoom(patterns.length > 0 ? patterns : ([...VALID_PATTERN_IDS] as PatternId[]));
    res.json({ code: room.code, hostToken: room.hostToken });
  } catch {
    res.status(500).json({ error: 'could not create room' });
  }
}

/** GET /api/tambola/rooms/:code — public room info for the join screen. */
export function roomInfoHandler(req: Request, res: Response): void {
  const room = needRoom(res, req.params.code ?? '');
  if (!room) return;
  res.json(publicInfo(room));
}

/** GET /api/tambola/rooms/:code/state?hostToken= — full host snapshot. */
export function hostStateHandler(req: Request, res: Response): void {
  const room = needRoom(res, req.params.code ?? '');
  if (!room) return;
  if (!needHost(res, room, req.query.hostToken)) return;
  res.json(hostSnapshot(room));
}

/** POST /api/tambola/rooms/:code/join — body: { name } */
export function joinHandler(req: Request, res: Response): void {
  try {
    if (!checkRate(res, req.ip ?? 'unknown')) return;
    const room = needRoom(res, req.params.code ?? '');
    if (!room) return;
    const name = (req.body as { name?: unknown } | undefined)?.name;
    if (typeof name !== 'string') {
      res.status(400).json({ error: 'name is required' });
      return;
    }
    const result = joinPlayer(room, name);
    if (!result.ok) {
      const status = result.error === 'already-started' ? 409 : result.error === 'room-full' ? 409 : 400;
      res.status(status).json({ error: result.error });
      return;
    }
    res.json({
      playerId: result.player.id,
      playerToken: result.player.token,
      name: result.player.name,
      ticket: result.player.ticket,
      rejoined: result.rejoined,
    });
  } catch {
    res.status(500).json({ error: 'could not join room' });
  }
}

/** POST /api/tambola/rooms/:code/start — host starts the game. */
export function startHandler(req: Request, res: Response): void {
  try {
    if (!checkRate(res, req.ip ?? 'unknown')) return;
    const room = needRoom(res, req.params.code ?? '');
    if (!room) return;
    if (!needHost(res, room, hostTokenOf(req))) return;
    if (room.status !== 'lobby') {
      res.status(409).json({ error: 'game already started' });
      return;
    }
    room.status = 'playing';
    broadcast(room, 'started', { playerCount: room.players.length });
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: 'could not start game' });
  }
}

/** POST /api/tambola/rooms/:code/call — host draws the next number. */
export function callHandler(req: Request, res: Response): void {
  try {
    if (!checkRate(res, req.ip ?? 'unknown')) return;
    const room = needRoom(res, req.params.code ?? '');
    if (!room) return;
    if (!needHost(res, room, hostTokenOf(req))) return;
    const n = drawNumber(room);
    if (n === null) {
      res.status(409).json({ error: room.status === 'playing' ? 'all numbers called' : 'game not playing' });
      return;
    }
    res.json({ number: n, calledCount: room.called.length });
  } catch {
    res.status(500).json({ error: 'could not call number' });
  }
}

interface DabBody {
  playerId?: unknown;
  playerToken?: unknown;
  number?: unknown;
  dabbed?: unknown;
}

/** POST /api/tambola/rooms/:code/dab — player taps a number. */
export function dabHandler(req: Request, res: Response): void {
  try {
    if (!checkRate(res, req.ip ?? 'unknown')) return;
    const room = needRoom(res, req.params.code ?? '');
    if (!room) return;
    const body = (req.body ?? {}) as DabBody;
    const ok =
      typeof body.playerId === 'string' &&
      typeof body.playerToken === 'string' &&
      recordDab(room, body.playerId, body.playerToken, Number(body.number), body.dabbed === true);
    if (!ok) {
      res.status(400).json({ error: 'invalid dab' });
      return;
    }
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: 'could not record dab' });
  }
}

/** POST /api/tambola/rooms/:code/claims — player files a claim. */
export function claimHandler(req: Request, res: Response): void {
  try {
    if (!checkRate(res, req.ip ?? 'unknown')) return;
    const room = needRoom(res, req.params.code ?? '');
    if (!room) return;
    const body = (req.body ?? {}) as {
      playerId?: unknown;
      playerToken?: unknown;
      pattern?: unknown;
    };
    if (typeof body.playerId !== 'string' || typeof body.playerToken !== 'string') {
      res.status(400).json({ error: 'player auth required' });
      return;
    }
    const result = fileClaim(room, body.playerId, body.playerToken, body.pattern as PatternId);
    if (!result.ok) {
      const status = result.error === 'auth' ? 403 : result.error === 'not-playing' ? 409 : 400;
      res.status(status).json({ error: result.error });
      return;
    }
    res.json({ claimId: result.claim.id });
  } catch {
    res.status(500).json({ error: 'could not file claim' });
  }
}

/** POST /api/tambola/rooms/:code/claims/:claimId/verify — host approves/rejects. */
export function verifyHandler(req: Request, res: Response): void {
  try {
    if (!checkRate(res, req.ip ?? 'unknown')) return;
    const room = needRoom(res, req.params.code ?? '');
    if (!room) return;
    if (!needHost(res, room, hostTokenOf(req))) return;
    const body = (req.body ?? {}) as { approve?: unknown };
    const result = verifyClaim(room, req.params.claimId ?? '', body.approve === true);
    if (!result.ok) {
      const status = result.error === 'invalid-claim' ? 422 : 400;
      res.status(status).json({ error: result.error });
      return;
    }
    res.json({ ok: true, approved: result.claim.status === 'approved', ended: result.ended });
  } catch {
    res.status(500).json({ error: 'could not verify claim' });
  }
}

/** POST /api/tambola/rooms/:code/end — host ends the game. */
export function endHandler(req: Request, res: Response): void {
  try {
    if (!checkRate(res, req.ip ?? 'unknown')) return;
    const room = needRoom(res, req.params.code ?? '');
    if (!room) return;
    if (!needHost(res, room, hostTokenOf(req))) return;
    if (room.status === 'ended') {
      res.json({ ok: true, results: buildResults(room) });
      return;
    }
    const results = endRoom(room);
    res.json({ ok: true, results });
  } catch {
    res.status(500).json({ error: 'could not end game' });
  }
}

/**
 * GET /api/tambola/rooms/:code/events — SSE stream.
 * Query: role=host&token=<hostToken> OR role=player&playerId=<id>&token=<playerToken>
 */
export function eventsHandler(req: Request, res: Response): void {
  const room = needRoom(res, req.params.code ?? '');
  if (!room) return;
  const role = req.query.role;
  let snapshot: unknown = null;
  if (role === 'host') {
    if (!needHost(res, room, req.query.token)) return;
    snapshot = { kind: 'host', state: hostSnapshot(room) };
  } else if (role === 'player') {
    const playerId = req.query.playerId;
    const token = req.query.token;
    const player =
      typeof playerId === 'string' && typeof token === 'string'
        ? authedPlayer(room, playerId, token)
        : undefined;
    if (!player) {
      res.status(403).json({ error: 'player auth required' });
      return;
    }
    snapshot = { kind: 'player', state: playerSnapshot(room, player) };
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
  // Flush headers immediately so the client starts the stream.
  const flush = (res as unknown as { flushHeaders?: () => void }).flushHeaders;
  if (typeof flush === 'function') flush.call(res);

  const client: SseClient = {
    write: (chunk: string) => {
      res.write(chunk);
    },
    on: (event: 'close', cb: () => void) => {
      (req as unknown as { on: (e: string, cb: () => void) => void }).on(event, cb);
    },
  };
  room.clients.add(client);
  res.write(formatEvent('hello', snapshot));

  // Heartbeat comment every 20s so proxies don't idle-kill the stream.
  const heartbeat = setInterval(() => {
    try {
      res.write(': heartbeat\n\n');
    } catch {
      // closed underneath us; the close handler cleans up
    }
  }, 20000);

  const cleanup = (): void => {
    clearInterval(heartbeat);
    room.clients.delete(client);
  };
  client.on('close', cleanup);
  req.on('close', cleanup);
}
