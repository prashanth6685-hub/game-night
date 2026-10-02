// Client API for the generic multi-phone room system (/api/mp/rooms).
// One room system powers QR multiplayer for every game except Tambola
// (which keeps its own specialized rooms). Plain POSTs + SSE via EventSource.

export type MpStatus = 'lobby' | 'playing' | 'ended';

export interface MpPlayerInfo {
  id: string;
  name: string;
  seat: number;
  isHost: boolean;
}

export interface MpRoomInfo {
  code: string;
  gameId: string;
  status: MpStatus;
  playerCount: number;
  maxPlayers: number;
  players: MpPlayerInfo[];
  config: unknown;
}

export interface MpCreated {
  code: string;
  hostToken: string;
  playerId: string;
  playerToken: string;
  seat: number;
}

export interface MpJoined {
  playerId: string;
  playerToken: string;
  seat: number;
  name: string;
  rejoined: boolean;
}

export interface MpSnapshot {
  code: string;
  gameId: string;
  status: MpStatus;
  config: unknown;
  players: MpPlayerInfo[];
  state: unknown;
  stateVersion: number;
  results: unknown;
  yourSeat: number | null;
}

export interface MpIntentEvent {
  fromSeat: number;
  fromPlayerId: string;
  fromName: string;
  type: string;
  payload: unknown;
}

export type MpEvent =
  | { type: 'hello'; snapshot: MpSnapshot }
  | { type: 'players'; players: MpPlayerInfo[] }
  | { type: 'started'; state: unknown; stateVersion: number; players: MpPlayerInfo[] }
  | { type: 'state'; state: unknown; stateVersion: number; bySeat: number }
  | { type: 'intent'; intent: MpIntentEvent }
  | { type: 'ended'; results: unknown };

const API = '/api/mp/rooms';

async function post<T>(path: string, body: unknown, hostToken?: string): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (hostToken) headers['x-host-token'] = hostToken;
  let res: Response;
  try {
    res = await fetch(path, { method: 'POST', headers, body: JSON.stringify(body ?? {}) });
  } catch {
    throw new Error('network-error');
  }
  let data: { error?: string } & Record<string, unknown> = {};
  try {
    data = (await res.json()) as typeof data;
  } catch {
    // non-JSON — fall through to status check
  }
  if (!res.ok) {
    throw new Error(typeof data.error === 'string' ? data.error : `request-failed-${res.status}`);
  }
  return data as T;
}

async function get<T>(path: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path);
  } catch {
    throw new Error('network-error');
  }
  let data: { error?: string } & Record<string, unknown> = {};
  try {
    data = (await res.json()) as typeof data;
  } catch {
    // fall through
  }
  if (!res.ok) {
    throw new Error(typeof data.error === 'string' ? data.error : `request-failed-${res.status}`);
  }
  return data as T;
}

export const MpApi = {
  createRoom(
    gameId: string,
    hostName: string,
    config: unknown,
    maxPlayers: number,
  ): Promise<MpCreated> {
    return post<MpCreated>(API, { gameId, hostName, config, maxPlayers });
  },
  getRoomInfo(code: string): Promise<MpRoomInfo> {
    return get<MpRoomInfo>(`${API}/${encodeURIComponent(code)}`);
  },
  joinRoom(code: string, name: string): Promise<MpJoined> {
    return post<MpJoined>(`${API}/${encodeURIComponent(code)}/join`, { name });
  },
  startGame(
    code: string,
    hostToken: string,
    state: unknown,
  ): Promise<{ ok: boolean; stateVersion: number }> {
    return post(`${API}/${encodeURIComponent(code)}/start`, { state }, hostToken);
  },
  postState(
    code: string,
    playerId: string,
    playerToken: string,
    state: unknown,
    baseVersion: number,
  ): Promise<{ ok: boolean; stateVersion: number }> {
    return post(`${API}/${encodeURIComponent(code)}/state`, {
      playerId,
      playerToken,
      state,
      baseVersion,
    });
  },
  sendIntent(
    code: string,
    playerId: string,
    playerToken: string,
    type: string,
    payload?: unknown,
    toPlayerId?: string,
  ): Promise<{ ok: boolean }> {
    return post(`${API}/${encodeURIComponent(code)}/intent`, {
      playerId,
      playerToken,
      type,
      payload: payload ?? null,
      toPlayerId,
    });
  },
  endGame(
    code: string,
    hostToken: string,
    results?: unknown,
  ): Promise<{ ok: boolean }> {
    return post(`${API}/${encodeURIComponent(code)}/end`, { results: results ?? null }, hostToken);
  },
  getSnapshot(
    code: string,
    auth: { hostToken: string } | { playerId: string; playerToken: string },
  ): Promise<MpSnapshot> {
    const q =
      'hostToken' in auth
        ? `hostToken=${encodeURIComponent(auth.hostToken)}`
        : `playerId=${encodeURIComponent(auth.playerId)}&playerToken=${encodeURIComponent(auth.playerToken)}`;
    return get<MpSnapshot>(`${API}/${encodeURIComponent(code)}/state?${q}`);
  },
};

const EVENT_TYPES = ['hello', 'players', 'started', 'state', 'intent', 'ended'] as const;

/**
 * Open the room SSE stream. Auto-reconnects with backoff (phones sleep,
 * Render free tier idles). Returns a cleanup function.
 */
export function openMpEvents(
  code: string,
  auth:
    | { role: 'host'; token: string }
    | { role: 'player'; playerId: string; token: string },
  onEvent: (ev: MpEvent) => void,
  onError?: (err: Error) => void,
): () => void {
  let stopped = false;
  let es: EventSource | null = null;
  let retryMs = 1000;
  let retryTimer: number | null = null;

  const query =
    auth.role === 'host'
      ? `role=host&token=${encodeURIComponent(auth.token)}`
      : `role=player&playerId=${encodeURIComponent(auth.playerId)}&token=${encodeURIComponent(auth.token)}`;

  const connect = (): void => {
    if (stopped) return;
    es = new EventSource(`${API}/${encodeURIComponent(code)}/events?${query}`);
    for (const type of EVENT_TYPES) {
      es.addEventListener(type, (e: Event) => {
        const me = e as MessageEvent;
        try {
          const data = JSON.parse(me.data as string) as Record<string, unknown>;
          if (type === 'hello') {
            onEvent({ type: 'hello', snapshot: data as unknown as MpSnapshot });
          } else if (type === 'intent') {
            onEvent({ type: 'intent', intent: data as unknown as MpIntentEvent });
          } else {
            onEvent({ type, ...data } as MpEvent);
          }
        } catch {
          // ignore malformed frames
        }
      });
    }
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
    es.onopen = () => {
      retryMs = 1000;
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

/** URL friends open after scanning the QR code (works for every game). */
export function mpJoinUrl(code: string): string {
  return `${window.location.origin}/#/join/${code}`;
}
