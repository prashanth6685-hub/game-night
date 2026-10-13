// Client for the private poker room API (/api/poker/rooms).
// Shapes below mirror server/src/pokerRooms.ts exactly (the server worker's
// implementation), which extends the original contract:
//  - GET summary nests blinds as { small, big } and includes startingStack.
//  - GET state returns `players` (not playersPublic), plus `myCards`,
//    `myLegalActions` (real engine-computed legal actions), `ledger`,
//    `config`, and `showdownRevealed` (array at showdown).
//  - Player tokens go in the x-poker-token header; HOST-only endpoints
//    (start/pause/resume/remove/close) need the x-host-token header.
//  - The host also holds a playerToken (from create) for state/action calls.
//  - SSE query is role=host|player&token=…; events: hello, players, started,
//    table, hand-end, rebuy, paused, resumed, presence, room-closed,
//    voice-state, voice-signal, error.
//  - POST close returns { ok, report } inline.
//  - The final report keeps server-side for 30 days (room code = view key).
import type { Card } from '../../../../../shared/poker/cards.ts';
import type { LegalAction } from '../../../../../shared/poker/engine.ts';

const API = '/api/poker/rooms';

export class PokerApiError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = 'PokerApiError';
    this.status = status;
  }
}

interface ErrorBody {
  error?: string;
}

interface Auth {
  /** Player token -> x-poker-token header. */
  token?: string;
  /** Host token -> x-host-token header (host-only endpoints). */
  hostToken?: string;
}

async function request<T>(
  path: string,
  method: 'GET' | 'POST',
  auth: Auth,
  body?: unknown,
): Promise<T> {
  const headers: Record<string, string> = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (auth.token) headers['x-poker-token'] = auth.token;
  if (auth.hostToken) headers['x-host-token'] = auth.hostToken;
  let res: Response;
  try {
    res = await fetch(path, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new PokerApiError(0, 'network-error');
  }
  let data: ErrorBody & Record<string, unknown> = {};
  try {
    data = (await res.json()) as typeof data;
  } catch {
    // non-JSON — fall through to the status check
  }
  if (!res.ok) {
    const msg =
      typeof data.error === 'string' && data.error !== ''
        ? data.error
        : `request-failed-${res.status}`;
    throw new PokerApiError(res.status, msg);
  }
  return data as T;
}

const get = <T>(path: string, auth: Auth = {}): Promise<T> =>
  request<T>(path, 'GET', auth);
const post = <T>(path: string, body: unknown, auth: Auth = {}): Promise<T> =>
  request<T>(path, 'POST', auth, body);

function roomPath(code: string, suffix = ''): string {
  return `${API}/${encodeURIComponent(code.toUpperCase())}${suffix}`;
}

/** Fresh idempotency key for join/action/rebuy posts. */
export function newIdem(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
}

// ---------------------------------------------------------------- types ---

export interface PokerRoomConfig {
  roomName: string;
  hostName: string;
  maxPlayers: number;
  startingStack: number;
  minBuyIn: number;
  maxBuyIn: number;
  smallBlind: number;
  bigBlind: number;
  rebuyMin: number;
  rebuyMax: number;
  /** -1 = unlimited */
  maxRebuys: number;
  rebuysMidHand: boolean;
  allowLateJoin: boolean;
  /** 0 = open-ended */
  durationMin: number;
  password?: string;
  houseRules?: string;
}

export interface PokerRoomPlayerInfo {
  seat: number;
  name: string;
  /** Buy-in chips (lobby view). */
  stack?: number;
  ready?: boolean;
  connected?: boolean;
  isHost?: boolean;
}

/** Public room summary (GET /:code) — no auth. */
export interface PokerRoomSummary {
  code: string;
  roomName: string;
  hostName: string;
  maxPlayers: number;
  playerCount: number;
  status: string;
  blinds: { small: number; big: number };
  startingStack: number;
  minBuyIn: number;
  maxBuyIn: number;
  rebuyMin: number;
  rebuyMax: number;
  maxRebuys: number;
  rebuysMidHand: boolean;
  allowLateJoin: boolean;
  hasPassword: boolean;
  houseRules?: string;
  players: PokerRoomPlayerInfo[];
}

/** One player's public info inside a hand state (server's PublicPokerPlayer). */
export interface PokerPublicPlayer {
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

export interface PokerWinnerInfo {
  potIndex: number;
  amount: number;
  /** Room seats (already mapped by the server). */
  winnerSeats: number[];
  handName: string;
  each: number;
}

export interface PokerShowdownPlayer {
  seat: number;
  name: string;
  handName: string;
  hole: Card[];
  best: readonly Card[];
}

export interface PokerLedgerEntry {
  seat: number;
  name: string;
  buyIn: number;
  /** Total rebuy chips (amount, not count). */
  rebuys: number;
}

/** WebRTC signaling message kinds relayed by POST /voice-signal. */
export type VoiceSignalKind = 'offer' | 'answer' | 'ice';

/** One seat's voice-chat presence, from the server's voice summary. */
export interface PokerVoicePeerState {
  seat: number;
  name: string;
  joined: boolean;
  muted: boolean;
  speaking: boolean;
  error?: string;
}

/** A signaling message delivered to exactly one seat over SSE. */
export interface PokerVoiceSignal {
  fromSeat: number;
  kind: VoiceSignalKind;
  payload: Record<string, string>;
}

export interface PokerStateConfig {
  maxPlayers: number;
  startingStack: number;
  minBuyIn: number;
  maxBuyIn: number;
  smallBlind: number;
  bigBlind: number;
  rebuyMin: number;
  rebuyMax: number;
  maxRebuys: number;
  rebuysMidHand: boolean;
  allowLateJoin: boolean;
  durationMin: number;
  hasPassword: boolean;
}

/** Full per-requester state (GET /:code/state). */
export interface PokerTableState {
  code: string;
  roomName: string;
  status: string;
  handNumber: number;
  street: string | null;
  button: number;
  community: Card[];
  pot: number;
  sidePots: number[];
  /** Room seat of the actor, -1 when nobody. */
  actorSeat: number;
  toCall: number;
  minRaiseTo: number;
  /** ms epoch, null when no timer. */
  turnExpiresAt: number | null;
  players: PokerPublicPlayer[];
  winners: PokerWinnerInfo[];
  showdownRevealed: PokerShowdownPlayer[] | null;
  mySeat: number;
  /** Null when the requester has no cards (or hand over). */
  myCards: Card[] | null;
  /** Engine-computed legal actions — non-null exactly on my turn. */
  myLegalActions: LegalAction[] | null;
  ledger: PokerLedgerEntry[];
  config: PokerStateConfig;
  /**
   * Compact voice-chat presence by seat (string keys), mirrored from the
   * server. Optional for backwards compatibility with older payloads.
   */
  voice?: Record<string, PokerVoicePeerState>;
}

export interface PokerReportPlayer {
  seat: number;
  name: string;
  initialBuyIn: number;
  /** Total rebuy chips. */
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
  /** ms epoch. */
  startedAt: number;
  /** ms epoch. */
  endedAt: number;
  durationSec: number;
  handsPlayed: number;
  totals: { buyIns: number; rebuys: number; final: number };
  balanced: boolean;
  discrepancy: number;
  players: PokerReportPlayer[];
  topWinner: { seat: number; name: string; net: number } | null;
  biggestLoss: { seat: number; name: string; net: number } | null;
}

export interface CreatedRoom {
  code: string;
  hostToken: string;
  playerToken: string;
  seat: number;
  summary: PokerRoomSummary;
}

export interface JoinedRoom {
  seat: number;
  playerToken: string;
  sittingOut: boolean;
  summary: PokerRoomSummary;
}

// ------------------------------------------------------------------ api ---

export const PokerRoomsApi = {
  createRoom(cfg: PokerRoomConfig): Promise<CreatedRoom> {
    return post<CreatedRoom>(API, cfg);
  },
  getSummary(code: string): Promise<PokerRoomSummary> {
    return get<PokerRoomSummary>(roomPath(code));
  },
  joinRoom(
    code: string,
    opts: { name: string; password?: string; buyIn: number; idem: string },
  ): Promise<JoinedRoom> {
    return post<JoinedRoom>(roomPath(code, '/join'), opts);
  },
  toggleReady(code: string, token: string): Promise<{ ok: boolean; ready: boolean }> {
    return post(roomPath(code, '/ready'), {}, { token });
  },
  /** Host only — pass the host token. */
  start(code: string, hostToken: string): Promise<{ ok: boolean; handNumber: number }> {
    return post(roomPath(code, '/start'), {}, { hostToken });
  },
  getState(code: string, token: string): Promise<PokerTableState> {
    return get(roomPath(code, '/state'), { token });
  },
  act(
    code: string,
    token: string,
    action: { type: string; amount?: number },
    idem: string,
  ): Promise<{ ok: boolean }> {
    return post(roomPath(code, '/action'), { action, idem }, { token });
  },
  rebuy(
    code: string,
    token: string,
    amount: number,
    idem: string,
  ): Promise<{ ok: boolean }> {
    return post(roomPath(code, '/rebuy'), { amount, idem }, { token });
  },
  /** Host only — pass the host token. */
  pause(code: string, hostToken: string): Promise<{ ok: boolean; status: string }> {
    return post(roomPath(code, '/pause'), {}, { hostToken });
  },
  /** Host only — pass the host token. */
  resume(code: string, hostToken: string): Promise<{ ok: boolean; status: string }> {
    return post(roomPath(code, '/resume'), {}, { hostToken });
  },
  /** Host only, lobby only — pass the host token. */
  removePlayer(
    code: string,
    hostToken: string,
    seat: number,
  ): Promise<{ ok: boolean }> {
    return post(roomPath(code, '/remove'), { seat }, { hostToken });
  },
  /** Host only — returns the final report inline. */
  closeRoom(
    code: string,
    hostToken: string,
  ): Promise<{ ok: boolean; report: PokerReport | null }> {
    return post(roomPath(code, '/close'), {}, { hostToken });
  },
  disconnect(code: string, token: string): Promise<{ ok: boolean }> {
    return post(roomPath(code, '/disconnect'), {}, { token });
  },
  reconnect(code: string, token: string): Promise<{ ok: boolean }> {
    return post(roomPath(code, '/reconnect'), {}, { token });
  },
  /**
   * Join voice chat. The server marks the seat joined AND muted (no
   * surprise hot-mic) — the client acquires the microphone first, then
   * calls this, then unmutes explicitly via voiceStatus.
   */
  voiceJoin(code: string, token: string): Promise<{ ok: boolean; seat: number }> {
    return post(roomPath(code, '/voice-join'), {}, { token });
  },
  /** Leave voice chat (idempotent). */
  voiceLeave(code: string, token: string): Promise<{ ok: boolean }> {
    return post(roomPath(code, '/voice-leave'), {}, { token });
  },
  /** Update muted/speaking flags. Clients throttle speaking to ~2/sec. */
  voiceStatus(
    code: string,
    token: string,
    status: { muted?: boolean; speaking?: boolean },
  ): Promise<{ ok: boolean }> {
    return post(roomPath(code, '/voice-status'), status, { token });
  },
  /**
   * Relay one WebRTC signaling message to exactly one seat. The payload is
   * opaque pass-through (string fields only, ~8KB cap enforced server-side).
   */
  voiceSignal(
    code: string,
    token: string,
    toSeat: number,
    kind: VoiceSignalKind,
    payload: Record<string, string>,
  ): Promise<{ ok: boolean }> {
    return post(roomPath(code, '/voice-signal'), { toSeat, kind, payload }, { token });
  },
  /** Served live after close, or from the 30-day server store. No auth. */
  getReport(code: string): Promise<PokerReport> {
    return get<PokerReport>(roomPath(code, '/report'));
  },
};

// ------------------------------------------------------------------ sse ---

export type PokerSseRole = 'host' | 'player';

export type PokerSseEvent =
  | { type: 'hello'; yourSeat: number }
  | { type: 'players' }
  | { type: 'started' }
  | { type: 'table' }
  | { type: 'hand-end'; handNumber?: number }
  | { type: 'rebuy'; seat: number }
  | { type: 'paused' }
  | { type: 'resumed' }
  | { type: 'presence' }
  | { type: 'room-closed' }
  | { type: 'voice-state'; voice?: Record<string, PokerVoicePeerState> }
  | { type: 'voice-signal'; fromSeat: number; kind: VoiceSignalKind; payload: Record<string, string> };

const SSE_TYPES = [
  'hello',
  'players',
  'started',
  'table',
  'hand-end',
  'rebuy',
  'paused',
  'resumed',
  'presence',
  'room-closed',
  'voice-state',
  'voice-signal',
] as const;

function parseSse(type: string, raw: string): PokerSseEvent | null {
  let data: Record<string, unknown>;
  try {
    data = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
  switch (type) {
    case 'hello':
      return {
        type: 'hello',
        yourSeat: typeof data.yourSeat === 'number' ? data.yourSeat : -1,
      };
    case 'players':
    case 'started':
    case 'table':
    case 'paused':
    case 'resumed':
    case 'presence':
    case 'room-closed':
      return { type };
    case 'voice-state': {
      // The summary rides on the event so clients can render mic badges
      // without re-fetching full state on every mute/speaking update.
      const rawVoice = data.voice;
      const voice =
        rawVoice !== null &&
        typeof rawVoice === 'object' &&
        !Array.isArray(rawVoice)
          ? (rawVoice as Record<string, PokerVoicePeerState>)
          : undefined;
      return { type: 'voice-state', voice };
    }
    case 'voice-signal': {
      const fromSeat =
        typeof data.fromSeat === 'number' ? data.fromSeat : -1;
      const kindRaw = data.kind;
      const kind: VoiceSignalKind | null =
        kindRaw === 'offer' || kindRaw === 'answer' || kindRaw === 'ice'
          ? kindRaw
          : null;
      const payloadRaw = data.payload;
      const payload =
        payloadRaw !== null &&
        typeof payloadRaw === 'object' &&
        !Array.isArray(payloadRaw)
          ? (payloadRaw as Record<string, string>)
          : null;
      if (fromSeat < 0 || kind === null || payload === null) return null;
      return { type: 'voice-signal', fromSeat, kind, payload };
    }
    case 'hand-end':
      return {
        type: 'hand-end',
        handNumber:
          typeof data.handNumber === 'number' ? data.handNumber : undefined,
      };
    case 'rebuy':
      return {
        type: 'rebuy',
        seat: typeof data.seat === 'number' ? data.seat : -1,
      };
    default:
      // 'error' and unknown frames are ignored by the UI
      return null;
  }
}

/**
 * Open the room SSE stream. Query is role=host|player&token=….
 * Auto-reconnects with backoff (phones sleep, Render free tier idles).
 * NOTE: 'table' frames carry the PUBLIC table only (no hole cards, no
 * legal actions) — callers should re-fetch GET /state for their own data.
 * Returns a cleanup function.
 */
export function openPokerEvents(
  code: string,
  auth: { role: PokerSseRole; token: string },
  onEvent: (ev: PokerSseEvent) => void,
  onError?: (err: Error) => void,
): () => void {
  let stopped = false;
  let es: EventSource | null = null;
  let retryMs = 1000;
  let retryTimer: number | null = null;

  const query = `role=${auth.role}&token=${encodeURIComponent(auth.token)}`;

  const connect = (): void => {
    if (stopped) return;
    es = new EventSource(`${roomPath(code, '/events')}?${query}`);
    for (const type of SSE_TYPES) {
      es.addEventListener(type, (e: Event) => {
        const ev = parseSse(type, (e as MessageEvent).data as string);
        if (ev) onEvent(ev);
      });
    }
    es.onopen = () => {
      retryMs = 1000;
    };
    es.onerror = () => {
      es?.close();
      es = null;
      if (stopped) return;
      onError?.(new Error('stream-error'));
      retryTimer = window.setTimeout(() => {
        retryMs = Math.min(retryMs * 2, 15000);
        connect();
      }, retryMs);
    };
  };

  connect();
  return () => {
    stopped = true;
    if (retryTimer !== null) window.clearTimeout(retryTimer);
    es?.close();
    es = null;
  };
}
