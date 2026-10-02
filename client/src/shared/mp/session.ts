// Session storage for multi-phone play: who am I in this room?
// sessionStorage (per tab) so two phones never collide and a refresh
// mid-game rejoins the same seat.

export interface MpSession {
  code: string;
  gameId: string;
  name: string;
  seat: number;
  playerId: string;
  playerToken: string;
  /** Present only on the host's device. Never sent to other players. */
  hostToken?: string;
}

function key(code: string): string {
  return `mp-session-${code.toUpperCase()}`;
}

function hostDataKey(code: string): string {
  return `mp-hostdata-${code.toUpperCase()}`;
}

export function saveMpSession(session: MpSession): void {
  try {
    sessionStorage.setItem(key(session.code), JSON.stringify(session));
  } catch {
    // private mode etc. — play continues without refresh-rejoin
  }
}

export function getMpSession(code: string): MpSession | null {
  try {
    const raw = sessionStorage.getItem(key(code));
    if (!raw) return null;
    const s = JSON.parse(raw) as Partial<MpSession>;
    if (
      typeof s.code === 'string' &&
      typeof s.gameId === 'string' &&
      typeof s.name === 'string' &&
      typeof s.seat === 'number' &&
      typeof s.playerId === 'string' &&
      typeof s.playerToken === 'string'
    ) {
      return s as MpSession;
    }
  } catch {
    // corrupted — ignore
  }
  return null;
}

export function clearMpSession(code: string): void {
  try {
    sessionStorage.removeItem(key(code));
    sessionStorage.removeItem(hostDataKey(code));
  } catch {
    // ignore
  }
}

/**
 * Host-only local data (e.g. the Dumb Charades word list). Stored ONLY on
 * the host's device — it never travels to the server or other phones,
 * so secret words can't leak to guessers.
 */
export function saveMpHostData(code: string, data: unknown): void {
  try {
    sessionStorage.setItem(hostDataKey(code), JSON.stringify(data));
  } catch {
    // ignore
  }
}

export function getMpHostData<T>(code: string): T | null {
  try {
    const raw = sessionStorage.getItem(hostDataKey(code));
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function isHostSession(session: MpSession): boolean {
  return typeof session.hostToken === 'string' && session.hostToken.length > 0;
}
