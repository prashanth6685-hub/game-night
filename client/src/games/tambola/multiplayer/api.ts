// Client API for multi-phone Tambola rooms: plain POSTs + SSE via EventSource.
// All errors surface as Error with the server's message (or a fallback).

import type { Ticket } from '../logic/ticket.ts';
import type { PatternId } from '../logic/patterns.ts';

export type MpRoomStatus = 'lobby' | 'playing' | 'ended';
export type MpClaimStatus = 'pending' | 'approved' | 'rejected';

export interface RoomInfo {
  code: string;
  status: MpRoomStatus;
  playerCount: number;
  players: { name: string }[];
  enabledPatterns: PatternId[];
}

export interface CreatedRoom {
  code: string;
  hostToken: string;
}

export interface JoinResult {
  playerId: string;
  playerToken: string;
  name: string;
  ticket: Ticket;
  rejoined: boolean;
}

export interface MpClaim {
  id: string;
  playerName: string;
  pattern: PatternId;
  status: MpClaimStatus;
  ticket: Ticket;
}

export interface RoomResults {
  winners: { playerName: string; pattern: PatternId }[];
  calledCount: number;
}

export interface HostState {
  code: string;
  status: MpRoomStatus;
  players: { id: string; name: string; joinedAt: number }[];
  called: number[];
  enabledPatterns: PatternId[];
  claims: MpClaim[];
  results?: RoomResults;
}

export interface PlayerSnapshot {
  code: string;
  status: MpRoomStatus;
  name: string;
  ticket: Ticket;
  dabbed: number[];
  called: number[];
  enabledPatterns: PatternId[];
  players: { name: string }[];
  claims: { id: string; playerName: string; pattern: PatternId; status: MpClaimStatus }[];
  results?: RoomResults;
}

export type RoomEvent =
  | { type: 'hello'; kind: 'host' | 'player'; state: HostState | PlayerSnapshot }
  | { type: 'players'; players: { name: string }[] }
  | { type: 'started'; playerCount: number }
  | { type: 'called'; number: number; calledCount: number }
  | { type: 'claim'; claim: MpClaim }
  | {
      type: 'claim-resolved';
      claimId: string;
      pattern: PatternId;
      playerName: string;
      approved: boolean;
    }
  | { type: 'ended'; results: RoomResults };

const API = '/api/tambola/rooms';

async function post<T>(path: string, body: unknown, hostToken?: string): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (hostToken) headers['x-host-token'] = hostToken;
  let res: Response;
  try {
    res = await fetch(path, {
      method: 'POST',
      headers,
      body: JSON.stringify(body ?? {}),
    });
  } catch {
    throw new Error('network-error');
  }
  let data: { error?: string } & Record<string, unknown> = {};
  try {
    data = (await res.json()) as typeof data;
  } catch {
    // non-JSON response — fall through to status check
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

export const TambolaMp = {
  createRoom(enabledPatterns: PatternId[]): Promise<CreatedRoom> {
    return post<CreatedRoom>(API, { enabledPatterns });
  },
  getRoomInfo(code: string): Promise<RoomInfo> {
    return get<RoomInfo>(`${API}/${encodeURIComponent(code)}`);
  },
  joinRoom(code: string, name: string): Promise<JoinResult> {
    return post<JoinResult>(`${API}/${encodeURIComponent(code)}/join`, { name });
  },
  startGame(code: string, hostToken: string): Promise<{ ok: boolean }> {
    return post(`${API}/${encodeURIComponent(code)}/start`, {}, hostToken);
  },
  callNumber(code: string, hostToken: string): Promise<{ number: number; calledCount: number }> {
    return post(`${API}/${encodeURIComponent(code)}/call`, {}, hostToken);
  },
  dab(
    code: string,
    playerId: string,
    playerToken: string,
    number: number,
    dabbed: boolean,
  ): Promise<{ ok: boolean }> {
    return post(`${API}/${encodeURIComponent(code)}/dab`, {
      playerId,
      playerToken,
      number,
      dabbed,
    });
  },
  claim(
    code: string,
    playerId: string,
    playerToken: string,
    pattern: PatternId,
  ): Promise<{ claimId: string }> {
    return post(`${API}/${encodeURIComponent(code)}/claims`, {
      playerId,
      playerToken,
      pattern,
    });
  },
  verifyClaim(
    code: string,
    hostToken: string,
    claimId: string,
    approve: boolean,
  ): Promise<{ ok: boolean; approved: boolean; ended: boolean }> {
    return post(
      `${API}/${encodeURIComponent(code)}/claims/${encodeURIComponent(claimId)}/verify`,
      { approve },
      hostToken,
    );
  },
  endGame(code: string, hostToken: string): Promise<{ ok: boolean; results: RoomResults }> {
    return post(`${API}/${encodeURIComponent(code)}/end`, {}, hostToken);
  },
  getHostState(code: string, hostToken: string): Promise<HostState> {
    return get<HostState>(
      `${API}/${encodeURIComponent(code)}/state?hostToken=${encodeURIComponent(hostToken)}`,
    );
  },
};

const EVENT_TYPES = [
  'hello',
  'players',
  'started',
  'called',
  'claim',
  'claim-resolved',
  'ended',
] as const;

/**
 * Open an SSE stream to the room. Auto-reconnects with backoff when the
 * connection drops (Render free tier sleeps; phones sleep). Returns a
 * cleanup function. Auth rides in the query string (EventSource can't set
 * headers) — acceptable for a party game with unguessable tokens.
 */
export function openRoomEvents(
  code: string,
  auth:
    | { role: 'host'; token: string }
    | { role: 'player'; playerId: string; token: string },
  onEvent: (ev: RoomEvent) => void,
  onError?: (err: Error) => void,
): () => void {
  let stopped = false;
  let es: EventSource | null = null;
  let retryMs = 1000;
  let retryTimer: number | null = null;

  const query =
    auth.role === 'host'
      ? `role=host&token=${encodeURIComponent(auth.token)}`
      : `role=player&playerId=${encodeURIComponent(auth.playerId)}&token=${encodeURIComponent(
          auth.token,
        )}`;

  const connect = (): void => {
    if (stopped) return;
    es = new EventSource(`${API}/${encodeURIComponent(code)}/events?${query}`);
    for (const type of EVENT_TYPES) {
      es.addEventListener(type, (e: Event) => {
        const me = e as MessageEvent;
        try {
          const data = JSON.parse(me.data as string) as Record<string, unknown>;
          onEvent({ type, ...data } as RoomEvent);
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
      retryTimer = window.setTimeout(
        () => {
          retryMs = Math.min(retryMs * 2, 15000);
          connect();
        },
        retryMs,
      );
    };
    es.onopen = () => {
      retryMs = 1000; // reset backoff on successful connect
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

/** Join URL players open after scanning the QR code. */
export function joinUrl(code: string): string {
  return `${window.location.origin}/#/tambola/join/${code}`;
}
