// Room transports: InMemoryTransport (v1, fully working local rooms) and
// ServerTransport (future online multiplayer seam — same interface).
import type { ITransport, Room, RoomListener, RoomPlayer } from './types.ts';
import { RoomError, makeRoomCode } from './types.ts';

let playerSeq = 0;
function newPlayer(name: string, isHost: boolean, local: boolean): RoomPlayer {
  playerSeq += 1;
  return { id: `p${Date.now().toString(36)}${playerSeq}`, name, isHost, ready: isHost, local };
}

/** Fully working local-room transport. One room at a time per client (v1). */
export class InMemoryTransport implements ITransport {
  readonly kind = 'memory' as const;
  private room: Room | null = null;
  private selfId: string | null = null;
  private listeners = new Set<RoomListener>();

  getRoom(): Room | null {
    return this.room;
  }

  onUpdate(listener: RoomListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emit(): void {
    const snapshot = this.room ? { ...this.room, players: [...this.room.players] } : null;
    for (const l of this.listeners) l(snapshot);
  }

  private requireRoom(): Room {
    if (!this.room) throw new RoomError('No active room', 'invalid-code');
    return this.room;
  }

  private requireSelf(): RoomPlayer {
    const room = this.requireRoom();
    const me = room.players.find((p) => p.id === this.selfId);
    if (!me) throw new RoomError('You are not in this room', 'invalid-code');
    return me;
  }

  private uniqueName(name: string): void {
    const room = this.requireRoom();
    if (room.players.some((p) => p.name.toLowerCase() === name.toLowerCase())) {
      throw new RoomError('That name is already taken in this room', 'duplicate-name');
    }
  }

  async createRoom(hostName: string, gameId: string): Promise<Room> {
    const clean = hostName.trim();
    if (!clean) throw new RoomError('Name is required', 'duplicate-name');
    const host = newPlayer(clean, true, false);
    this.selfId = host.id;
    this.room = {
      code: makeRoomCode(),
      gameId,
      hostId: host.id,
      players: [host],
      phase: 'lobby',
      createdAt: Date.now(),
    };
    this.emit();
    return this.requireRoom();
  }

  async joinRoom(code: string, name: string): Promise<Room> {
    const clean = name.trim();
    if (!clean) throw new RoomError('Name is required', 'duplicate-name');
    // v1: only the room created on this device can be joined (local demo).
    // A real server transport validates the code against the backend.
    const room = this.room;
    if (!room || room.code !== code.trim().toUpperCase()) {
      throw new RoomError('Room not found. Check the code and try again.', 'invalid-code');
    }
    if (room.phase !== 'lobby') throw new RoomError('Game already started', 'already-started');
    if (room.players.length >= 20) throw new RoomError('Room is full', 'room-full');
    this.uniqueName(clean);
    const player = newPlayer(clean, false, false);
    this.selfId = player.id;
    room.players.push(player);
    this.emit();
    return this.requireRoom();
  }

  async addLocalPlayer(name: string): Promise<Room> {
    const room = this.requireRoom();
    const me = this.requireSelf();
    if (!me.isHost) throw new RoomError('Only the host can add players', 'not-host');
    const clean = name.trim();
    if (!clean) throw new RoomError('Name is required', 'duplicate-name');
    if (room.players.length >= 20) throw new RoomError('Room is full', 'room-full');
    this.uniqueName(clean);
    room.players.push(newPlayer(clean, false, true));
    this.emit();
    return this.requireRoom();
  }

  async leaveRoom(): Promise<void> {
    const room = this.room;
    if (!room) return;
    const me = room.players.find((p) => p.id === this.selfId);
    room.players = room.players.filter((p) => p.id !== this.selfId);
    if (me?.isHost || room.players.length === 0) {
      this.room = null; // host leaving ends the room
    } else if (room.players.length > 0 && !room.players.some((p) => p.isHost)) {
      room.players[0]!.isHost = true; // promote oldest player
      room.hostId = room.players[0]!.id;
    }
    this.selfId = null;
    this.emit();
  }

  async setReady(ready: boolean): Promise<Room> {
    const me = this.requireSelf();
    me.ready = ready;
    this.emit();
    return this.requireRoom();
  }

  async setPlayerReady(playerId: string, ready: boolean): Promise<Room> {
    const room = this.requireRoom();
    const me = this.requireSelf();
    if (!me.isHost && playerId !== me.id) {
      throw new RoomError('Only the host can change other players', 'not-host');
    }
    const target = room.players.find((p) => p.id === playerId);
    if (!target) throw new RoomError('Player not found', 'invalid-code');
    target.ready = ready;
    this.emit();
    return this.requireRoom();
  }

  async removePlayer(playerId: string): Promise<Room> {
    const room = this.requireRoom();
    const me = this.requireSelf();
    if (!me.isHost) throw new RoomError('Only the host can remove players', 'not-host');
    if (playerId === me.id) throw new RoomError('Host cannot remove themselves', 'not-host');
    room.players = room.players.filter((p) => p.id !== playerId);
    this.emit();
    return this.requireRoom();
  }

  async startGame(): Promise<Room> {
    const room = this.requireRoom();
    const me = this.requireSelf();
    if (!me.isHost) throw new RoomError('Only the host can start', 'not-host');
    if (room.phase !== 'lobby') throw new RoomError('Game already started', 'already-started');
    room.phase = 'in-game';
    this.emit();
    return this.requireRoom();
  }

  async endRoom(): Promise<void> {
    this.room = null;
    this.selfId = null;
    this.emit();
  }
}

// ---------------------------------------------------------------------------
// ServerTransport — FUTURE online multiplayer (spec §21).
//
// Intended wire protocol (Socket.IO):
//   client -> server:  'room:create' { playerName, gameId }      -> 'room:state'
//   client -> server:  'room:join'   { code, playerName }        -> 'room:state' | 'room:error'
//   client -> server:  'room:ready'  { ready }                   -> 'room:state'
//   client -> server:  'room:kick'   { playerId } (host only)    -> 'room:state'
//   client -> server:  'room:start'  (host only)                 -> 'room:state'
//   client -> server:  'game:intent' { type, payload }           -> validated server-side
//   server -> client:  'room:state'  { room }                    (authoritative snapshot)
//   server -> client:  'game:state'  { state }                   (authoritative game state)
//
// Security rules for the server implementation: validate the room code and
// player membership on every message, rate-limit intents, never trust
// client-computed scores or winners — the server is the source of truth.
// ---------------------------------------------------------------------------
export class ServerTransport implements ITransport {
  readonly kind = 'server' as const;
  private readonly url: string;
  constructor(url: string) {
    this.url = url;
  }

  private todo(method: string): never {
    throw new RoomError(
      `Online multiplayer (${method}) is not enabled in v1. ` +
        `Point this transport at the Socket.IO server (see protocol notes in transports.ts) — ` +
        `configured URL was: ${this.url}`,
      'transport',
    );
  }

  getRoom(): Room | null {
    return null;
  }
  onUpdate(_listener: RoomListener): () => void {
    return () => {};
  }
  async createRoom(): Promise<Room> {
    this.todo('createRoom');
  }
  async joinRoom(): Promise<Room> {
    this.todo('joinRoom');
  }
  async addLocalPlayer(): Promise<Room> {
    this.todo('addLocalPlayer');
  }
  async leaveRoom(): Promise<void> {
    this.todo('leaveRoom');
  }
  async setReady(): Promise<Room> {
    this.todo('setReady');
  }
  async setPlayerReady(): Promise<Room> {
    this.todo('setPlayerReady');
  }
  async removePlayer(): Promise<Room> {
    this.todo('removePlayer');
  }
  async startGame(): Promise<Room> {
    this.todo('startGame');
  }
  async endRoom(): Promise<void> {
    this.todo('endRoom');
  }
}
