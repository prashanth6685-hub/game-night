// Room system types (spec §19-21).
// Game state stays server-authoritative for multiplayer: clients only ever
// send intents through ITransport; the transport owns the room state.
// v1 ships InMemoryTransport (same-device/local rooms). ServerTransport is the
// seam for a future Socket.IO backend implementing the same interface.

export interface RoomPlayer {
  id: string;
  name: string;
  isHost: boolean;
  ready: boolean;
  /** Same-device player added by name on the host's screen (pass-and-play). */
  local: boolean;
}

export type RoomPhase = 'lobby' | 'in-game' | 'ended';

export interface Room {
  code: string;
  gameId: string;
  hostId: string;
  players: RoomPlayer[];
  phase: RoomPhase;
  createdAt: number;
}

export type RoomListener = (room: Room | null) => void;

/** Transport abstraction — swap InMemoryTransport for ServerTransport later. */
export interface ITransport {
  readonly kind: 'memory' | 'server';
  getRoom(): Room | null;
  createRoom(hostName: string, gameId: string): Promise<Room>;
  joinRoom(code: string, name: string): Promise<Room>;
  /** Host adds a same-device player by name (local multiplayer). */
  addLocalPlayer(name: string): Promise<Room>;
  leaveRoom(): Promise<void>;
  setReady(ready: boolean): Promise<Room>;
  /** Host flips any player's ready flag (local rooms). Server impl: self-only. */
  setPlayerReady(playerId: string, ready: boolean): Promise<Room>;
  removePlayer(playerId: string): Promise<Room>;
  startGame(): Promise<Room>;
  endRoom(): Promise<void>;
  onUpdate(listener: RoomListener): () => void;
}

export class RoomError extends Error {
  readonly code:
    | 'invalid-code'
    | 'room-full'
    | 'duplicate-name'
    | 'not-host'
    | 'already-started'
    | 'transport';
  constructor(
    message: string,
    code: RoomError['code'],
  ) {
    super(message);
    this.name = 'RoomError';
    this.code = code;
  }
}

/** 5-char room codes, unambiguous alphabet (no 0/O, 1/I/L). */
export function makeRoomCode(): string {
  const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let code = '';
  const bytes = new Uint32Array(5);
  crypto.getRandomValues(bytes);
  for (const b of bytes) code += alphabet[b % alphabet.length];
  return code;
}
