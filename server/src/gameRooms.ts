// Generic multi-phone rooms for ALL games: QR-code party play over SSE.
//
// Every game except Tambola (which has its own specialized rooms) runs on
// this shared system. Design:
// - The host creates a room for a gameId, becomes seat 0, and shows a QR
//   code. Friends scan it, type their name, and get the next seat.
// - Game state is an opaque JSON snapshot owned by the clients' shared game
//   logic: every client runs the same pure logic, but ONLY the player whose
//   turn it is posts the next snapshot. The server enforces membership, game
//   phase, and optimistic concurrency (baseVersion must match), so stale or
//   duplicate writes are rejected instead of corrupting the game.
// - Intents are lightweight broadcasts for things that are not full state
//   (Bingo claims, Charades team picks). An intent may be addressed to one
//   player (toPlayerId) — used to DM the secret Charades word to the actor's
//   phone only.
// - Rooms are ephemeral in-memory party sessions (4h TTL, like Tambola).
//
// Trust model: this is a friends-and-family party game. The server checks
// WHO may write (joined member, correct phase, current version); the shared
// client logic decides WHAT a legal move is, identically on every phone.

import type { Request, Response } from 'express';
import { randomBytes } from 'node:crypto';
import { createRateLimiter } from './charades.ts';

export const MP_ROOM_CODE_LEN = 5;
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const MP_ROOM_TTL_MS = 4 * 60 * 60 * 1000;
const ENDED_TTL_MS = 30 * 60 * 1000;
const SWEEP_INTERVAL_MS = 5 * 60 * 1000;
const MAX_NAME_LEN = 24;
const ABSOLUTE_MAX_PLAYERS = 60;

export type MpStatus = 'lobby' | 'playing' | 'ended';

export interface MpPlayer {
  id: string;
  name: string;
  token: string;
  seat: number;
  joinedAt: number;
}

export interface SseSink {
  write(chunk: string): void;
  on(event: 'close', cb: () => void): void;
}

export interface MpClient extends SseSink {
  /** Player this connection belongs to (undefined for host-only conns). */
  playerId?: string;
  isHost: boolean;
}

export interface GameRoom {
  code: string;
  gameId: string;
  hostToken: string;
  hostPlayerId: string;
  status: MpStatus;
  /** Opaque per-game setup chosen by the host (NEVER put secrets here). */
  config: unknown;
  maxPlayers: number;
  players: MpPlayer[];
  /** Opaque latest game snapshot (per-game shape), null in the lobby. */
  state: unknown;
  stateVersion: number;
  results: unknown;
  createdAt: number;
  endedAt?: number;
  clients: Set<MpClient>;
}

// ------------------------------------------------------------------ store
const rooms = new Map<string, GameRoom>();

function newId(): string {
  return randomBytes(8).toString('hex');
}

function newToken(): string {
  return randomBytes(16).toString('hex');
}

export function normalizeMpCode(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export function createMpRoomCode(existing: Set<string>): string {
  for (let attempt = 0; attempt < 1000; attempt++) {
    let code = '';
    const bytes = randomBytes(MP_ROOM_CODE_LEN);
    for (let i = 0; i < MP_ROOM_CODE_LEN; i++) {
      code += CODE_ALPHABET[(bytes[i] ?? 0) % CODE_ALPHABET.length];
    }
    if (!existing.has(code)) return code;
  }
  throw new Error('could not allocate a room code');
}

export function getMpRoom(code: string): GameRoom | undefined {
  return rooms.get(normalizeMpCode(code));
}

export function sweepMpRooms(now: number = Date.now()): number {
  let removed = 0;
  for (const [code, room] of rooms) {
    const ttl = room.status === 'ended' ? ENDED_TTL_MS : MP_ROOM_TTL_MS;
    const end =
      room.status === 'ended' ? (room.endedAt ?? room.createdAt) : room.createdAt;
    if (now - end > ttl) {
      rooms.delete(code);
      removed += 1;
    }
  }
  return removed;
}

if (typeof setInterval !== 'undefined') {
  const t = setInterval(sweepMpRooms, SWEEP_INTERVAL_MS);
  if (typeof (t as unknown as { unref?: () => void }).unref === 'function') {
    (t as unknown as { unref: () => void }).unref();
  }
}

// ------------------------------------------------------------------ core
export function cleanName(raw: string): string {
  const noControls = [...raw]
    .filter((ch) => {
      const c = ch.codePointAt(0) ?? 0;
      return c >= 32 && c !== 127;
    })
    .join('');
  return noControls.replace(/\s+/g, ' ').trim().slice(0, MAX_NAME_LEN);
}

function uniqueMpName(room: GameRoom, name: string): string {
  const taken = new Set(room.players.map((p) => p.name.toLowerCase()));
  if (!taken.has(name.toLowerCase())) return name;
  for (let n = 2; n < 1000; n++) {
    const candidate = `${name} ${n}`;
    if (!taken.has(candidate.toLowerCase())) return candidate;
  }
  return `${name} ${Date.now() % 100000}`;
}

function addPlayer(room: GameRoom, rawName: string): MpPlayer {
  const player: MpPlayer = {
    id: newId(),
    name: uniqueMpName(room, cleanName(rawName)),
    token: newToken(),
    seat: room.players.length,
    joinedAt: Date.now(),
  };
  room.players.push(player);
  return player;
}

export interface CreateMpResult {
  room: GameRoom;
  host: MpPlayer;
}

export function createMpRoom(
  gameId: string,
  hostName: string,
  config: unknown,
  maxPlayers: number,
): CreateMpResult {
  const room: GameRoom = {
    code: createMpRoomCode(new Set(rooms.keys())),
    gameId,
    hostToken: newToken(),
    hostPlayerId: '',
    status: 'lobby',
    config: config ?? null,
    maxPlayers: Math.min(Math.max(maxPlayers, 2), ABSOLUTE_MAX_PLAYERS),
    players: [],
    state: null,
    stateVersion: 0,
    results: null,
    createdAt: Date.now(),
    clients: new Set(),
  };
  const host = addPlayer(room, hostName);
  room.hostPlayerId = host.id;
  rooms.set(room.code, room);
  return { room, host };
}

export type JoinMpResult =
  | { ok: true; player: MpPlayer; rejoined: boolean }
  | { ok: false; error: 'invalid-name' | 'room-full' | 'already-started' };

export function joinMpPlayer(room: GameRoom, rawName: string): JoinMpResult {
  const name = cleanName(rawName);
  if (name.length < 1) return { ok: false, error: 'invalid-name' };
  const existing = room.players.find(
    (p) => p.name.toLowerCase() === name.toLowerCase(),
  );
  if (existing) return { ok: true, player: existing, rejoined: true };
  if (room.status !== 'lobby') return { ok: false, error: 'already-started' };
  if (room.players.length >= room.maxPlayers)
    return { ok: false, error: 'room-full' };
  const player = addPlayer(room, name);
  broadcastMp(room, 'players', { players: publicMpPlayers(room) });
  return { ok: true, player, rejoined: false };
}

export function startMpGame(room: GameRoom, initialState: unknown): boolean {
  if (room.status !== 'lobby') return false;
  room.status = 'playing';
  room.state = initialState ?? null;
  room.stateVersion = 1;
  broadcastMp(room, 'started', {
    state: room.state,
    stateVersion: room.stateVersion,
    players: publicMpPlayers(room),
  });
  return true;
}

export type PostStateResult =
  | { ok: true; version: number }
  | { ok: false; error: 'auth' | 'not-playing' | 'stale-version' };

/**
 * Accept a new game snapshot from a joined player. Optimistic concurrency:
 * the write must be based on the current version, so two phones racing the
 * same turn can't both land — the loser gets 'stale-version' and re-syncs
 * from the broadcast it already received.
 */
export function postMpState(
  room: GameRoom,
  playerId: string,
  token: string,
  state: unknown,
  baseVersion: number,
): PostStateResult {
  const player = authedMpPlayer(room, playerId, token);
  if (!player) return { ok: false, error: 'auth' };
  if (room.status !== 'playing') return { ok: false, error: 'not-playing' };
  if (baseVersion !== room.stateVersion)
    return { ok: false, error: 'stale-version' };
  room.state = state ?? null;
  room.stateVersion += 1;
  broadcastMp(room, 'state', {
    state: room.state,
    stateVersion: room.stateVersion,
    bySeat: player.seat,
  });
  return { ok: true, version: room.stateVersion };
}

export function postMpIntent(
  room: GameRoom,
  playerId: string,
  token: string,
  type: string,
  payload: unknown,
  toPlayerId?: string,
): boolean {
  const player = authedMpPlayer(room, playerId, token);
  if (!player || typeof type !== 'string' || type.length < 1 || type.length > 40)
    return false;
  const event = {
    fromSeat: player.seat,
    fromPlayerId: player.id,
    fromName: player.name,
    type,
    payload: payload ?? null,
  };
  if (toPlayerId) {
    // Direct message: only the target player's own connections receive it.
    const chunk = formatMpEvent('intent', event);
    for (const client of room.clients) {
      if (client.playerId === toPlayerId) {
        try {
          client.write(chunk);
        } catch {
          // broken client; close handler cleans up
        }
      }
    }
    return true;
  }
  broadcastMp(room, 'intent', event);
  return true;
}

export function endMpGame(room: GameRoom, results: unknown): void {
  if (room.status === 'ended') return;
  room.status = 'ended';
  room.endedAt = Date.now();
  room.results = results ?? null;
  broadcastMp(room, 'ended', { results: room.results });
}

// ------------------------------------------------------------------ views
export function publicMpPlayers(
  room: GameRoom,
): { id: string; name: string; seat: number; isHost: boolean }[] {
  // Player ids are safe to share (the per-player token stays secret): other
  // clients need the id to address a direct-message intent to one phone.
  return room.players.map((p) => ({
    id: p.id,
    name: p.name,
    seat: p.seat,
    isHost: p.id === room.hostPlayerId,
  }));
}

export function mpPublicInfo(room: GameRoom): {
  code: string;
  gameId: string;
  status: MpStatus;
  playerCount: number;
  maxPlayers: number;
  players: { id: string; name: string; seat: number; isHost: boolean }[];
  config: unknown;
} {
  return {
    code: room.code,
    gameId: room.gameId,
    status: room.status,
    playerCount: room.players.length,
    maxPlayers: room.maxPlayers,
    players: publicMpPlayers(room),
    config: room.config,
  };
}

export function mpSnapshot(
  room: GameRoom,
  seat: number | null,
): {
  code: string;
  gameId: string;
  status: MpStatus;
  config: unknown;
  players: { id: string; name: string; seat: number; isHost: boolean }[];
  state: unknown;
  stateVersion: number;
  results: unknown;
  yourSeat: number | null;
} {
  return {
    code: room.code,
    gameId: room.gameId,
    status: room.status,
    config: room.config,
    players: publicMpPlayers(room),
    state: room.state,
    stateVersion: room.stateVersion,
    results: room.results,
    yourSeat: seat,
  };
}

function findMpPlayer(room: GameRoom, playerId: string): MpPlayer | undefined {
  return room.players.find((p) => p.id === playerId);
}

export function authedMpPlayer(
  room: GameRoom,
  playerId: string,
  token: string,
): MpPlayer | undefined {
  const p = findMpPlayer(room, playerId);
  return p && p.token === token ? p : undefined;
}

// ------------------------------------------------------------------ SSE
export function formatMpEvent(type: string, data: unknown): string {
  return `event: ${type}\ndata: ${JSON.stringify(data)}\n\n`;
}

export function broadcastMp(room: GameRoom, type: string, data: unknown): void {
  const chunk = formatMpEvent(type, data);
  for (const client of room.clients) {
    try {
      client.write(chunk);
    } catch {
      // Drop broken clients; the close handler cleans them up.
    }
  }
}

// ------------------------------------------------------------------ http
const limiter = createRateLimiter(240, 60 * 1000);

function checkRate(res: Response, ip: string): boolean {
  if (!limiter.check(ip)) {
    res.status(429).json({ error: 'too many requests — slow down a little' });
    return false;
  }
  return true;
}

function needMpRoom(res: Response, code: string): GameRoom | undefined {
  const room = getMpRoom(code);
  if (!room) {
    res
      .status(404)
      .json({ error: 'room not found — check the code and try again' });
    return undefined;
  }
  return room;
}

function needMpHost(res: Response, room: GameRoom, token: unknown): boolean {
  if (typeof token !== 'string' || token !== room.hostToken) {
    res.status(403).json({ error: 'not the host' });
    return false;
  }
  return true;
}

function hostTokenOf(req: Request): unknown {
  return (
    req.headers['x-host-token'] ??
    (req.body as Record<string, unknown> | undefined)?.hostToken
  );
}

interface Body {
  [key: string]: unknown;
}

function bodyOf(req: Request): Body {
  return (req.body ?? {}) as Body;
}

/** POST /api/mp/rooms — { gameId, hostName, config?, maxPlayers? } */
export function mpCreateRoomHandler(req: Request, res: Response): void {
  try {
    if (!checkRate(res, req.ip ?? 'unknown')) return;
    const body = bodyOf(req);
    const gameId = typeof body.gameId === 'string' ? body.gameId : '';
    if (!/^[a-z0-9-]{2,40}$/.test(gameId)) {
      res.status(400).json({ error: 'invalid gameId' });
      return;
    }
    const hostName = typeof body.hostName === 'string' ? body.hostName : '';
    if (cleanName(hostName).length < 1) {
      res.status(400).json({ error: 'hostName is required' });
      return;
    }
    const maxPlayers =
      typeof body.maxPlayers === 'number' && Number.isInteger(body.maxPlayers)
        ? body.maxPlayers
        : 20;
    const { room, host } = createMpRoom(
      gameId,
      hostName,
      body.config ?? null,
      maxPlayers,
    );
    res.json({
      code: room.code,
      hostToken: room.hostToken,
      playerId: host.id,
      playerToken: host.token,
      seat: host.seat,
    });
  } catch {
    res.status(500).json({ error: 'could not create room' });
  }
}

/** GET /api/mp/rooms/:code — public info (join screen). */
export function mpRoomInfoHandler(req: Request, res: Response): void {
  const room = needMpRoom(res, req.params.code ?? '');
  if (!room) return;
  res.json(mpPublicInfo(room));
}

/** GET /api/mp/rooms/:code/state — hostToken OR playerId+playerToken auth. */
export function mpStateHandler(req: Request, res: Response): void {
  const room = needMpRoom(res, req.params.code ?? '');
  if (!room) return;
  if (typeof req.query.hostToken === 'string') {
    if (!needMpHost(res, room, req.query.hostToken)) return;
    const host = findMpPlayer(room, room.hostPlayerId);
    res.json(mpSnapshot(room, host ? host.seat : null));
    return;
  }
  const playerId = req.query.playerId;
  const token = req.query.playerToken;
  const player =
    typeof playerId === 'string' && typeof token === 'string'
      ? authedMpPlayer(room, playerId, token)
      : undefined;
  if (!player) {
    res.status(403).json({ error: 'player auth required' });
    return;
  }
  res.json(mpSnapshot(room, player.seat));
}

/** POST /api/mp/rooms/:code/join — { name } */
export function mpJoinHandler(req: Request, res: Response): void {
  try {
    if (!checkRate(res, req.ip ?? 'unknown')) return;
    const room = needMpRoom(res, req.params.code ?? '');
    if (!room) return;
    const name = bodyOf(req).name;
    if (typeof name !== 'string') {
      res.status(400).json({ error: 'name is required' });
      return;
    }
    const result = joinMpPlayer(room, name);
    if (!result.ok) {
      const status = result.error === 'invalid-name' ? 400 : 409;
      res.status(status).json({ error: result.error });
      return;
    }
    res.json({
      playerId: result.player.id,
      playerToken: result.player.token,
      seat: result.player.seat,
      name: result.player.name,
      rejoined: result.rejoined,
    });
  } catch {
    res.status(500).json({ error: 'could not join room' });
  }
}

/** POST /api/mp/rooms/:code/start — host only, { state } initial snapshot. */
export function mpStartHandler(req: Request, res: Response): void {
  try {
    if (!checkRate(res, req.ip ?? 'unknown')) return;
    const room = needMpRoom(res, req.params.code ?? '');
    if (!room) return;
    if (!needMpHost(res, room, hostTokenOf(req))) return;
    if (!startMpGame(room, bodyOf(req).state ?? null)) {
      res.status(409).json({ error: 'game already started' });
      return;
    }
    res.json({ ok: true, stateVersion: room.stateVersion });
  } catch {
    res.status(500).json({ error: 'could not start game' });
  }
}

/** POST /api/mp/rooms/:code/state — { playerId, playerToken, state, baseVersion } */
export function mpPostStateHandler(req: Request, res: Response): void {
  try {
    if (!checkRate(res, req.ip ?? 'unknown')) return;
    const room = needMpRoom(res, req.params.code ?? '');
    if (!room) return;
    const body = bodyOf(req);
    if (typeof body.playerId !== 'string' || typeof body.playerToken !== 'string') {
      res.status(400).json({ error: 'player auth required' });
      return;
    }
    const baseVersion =
      typeof body.baseVersion === 'number' ? body.baseVersion : -1;
    const result = postMpState(
      room,
      body.playerId,
      body.playerToken,
      body.state ?? null,
      baseVersion,
    );
    if (!result.ok) {
      const status =
        result.error === 'auth' ? 403 : result.error === 'stale-version' ? 409 : 409;
      res.status(status).json({ error: result.error });
      return;
    }
    res.json({ ok: true, stateVersion: result.version });
  } catch {
    res.status(500).json({ error: 'could not save state' });
  }
}

/** POST /api/mp/rooms/:code/intent — { playerId, playerToken, type, payload?, toPlayerId? } */
export function mpIntentHandler(req: Request, res: Response): void {
  try {
    if (!checkRate(res, req.ip ?? 'unknown')) return;
    const room = needMpRoom(res, req.params.code ?? '');
    if (!room) return;
    const body = bodyOf(req);
    if (
      typeof body.playerId !== 'string' ||
      typeof body.playerToken !== 'string' ||
      typeof body.type !== 'string'
    ) {
      res.status(400).json({ error: 'player auth and intent type required' });
      return;
    }
    const toPlayerId =
      typeof body.toPlayerId === 'string' ? body.toPlayerId : undefined;
    if (toPlayerId && !findMpPlayer(room, toPlayerId)) {
      res.status(400).json({ error: 'target player not found' });
      return;
    }
    const ok = postMpIntent(
      room,
      body.playerId,
      body.playerToken,
      body.type,
      body.payload ?? null,
      toPlayerId,
    );
    if (!ok) {
      res.status(403).json({ error: 'invalid intent' });
      return;
    }
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: 'could not send intent' });
  }
}

/** POST /api/mp/rooms/:code/end — host only, { results? } */
export function mpEndHandler(req: Request, res: Response): void {
  try {
    if (!checkRate(res, req.ip ?? 'unknown')) return;
    const room = needMpRoom(res, req.params.code ?? '');
    if (!room) return;
    if (!needMpHost(res, room, hostTokenOf(req))) return;
    endMpGame(room, bodyOf(req).results ?? null);
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: 'could not end game' });
  }
}

/**
 * GET /api/mp/rooms/:code/events — SSE stream.
 * Query: role=host&token=<hostToken> OR role=player&playerId=<id>&token=<playerToken>
 */
export function mpEventsHandler(req: Request, res: Response): void {
  const room = needMpRoom(res, req.params.code ?? '');
  if (!room) return;
  const role = req.query.role;
  let seat: number | null = null;
  let playerId: string | undefined;
  let isHost = false;
  if (role === 'host') {
    if (!needMpHost(res, room, req.query.token)) return;
    isHost = true;
    const host = findMpPlayer(room, room.hostPlayerId);
    playerId = host?.id;
    seat = host ? host.seat : null;
  } else if (role === 'player') {
    const pid = req.query.playerId;
    const token = req.query.token;
    const player =
      typeof pid === 'string' && typeof token === 'string'
        ? authedMpPlayer(room, pid, token)
        : undefined;
    if (!player) {
      res.status(403).json({ error: 'player auth required' });
      return;
    }
    playerId = player.id;
    seat = player.seat;
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

  const client: MpClient = {
    write: (chunk: string) => {
      res.write(chunk);
    },
    on: (event: 'close', cb: () => void) => {
      (req as unknown as { on: (e: string, cb: () => void) => void }).on(
        event,
        cb,
      );
    },
    playerId,
    isHost,
  };
  room.clients.add(client);
  res.write(formatMpEvent('hello', mpSnapshot(room, seat)));

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
