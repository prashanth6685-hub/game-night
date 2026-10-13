// sessionStorage for private poker rooms: who am I in this room?
// Per-tab so a refresh mid-game rejoins the same seat; the host token stays
// on the host's device only.

export interface PokerMpSession {
  code: string;
  name: string;
  seat: number;
  token: string;
  isHost: boolean;
  hostToken?: string;
}

function key(code: string): string {
  return `poker-mp-session-${code.toUpperCase()}`;
}

export function savePokerSession(s: PokerMpSession): void {
  try {
    sessionStorage.setItem(key(s.code), JSON.stringify(s));
  } catch {
    // private mode etc. — play continues without refresh-rejoin
  }
}

export function loadPokerSession(code: string): PokerMpSession | null {
  try {
    const raw = sessionStorage.getItem(key(code));
    if (!raw) return null;
    const s = JSON.parse(raw) as Partial<PokerMpSession>;
    if (
      typeof s.code === 'string' &&
      typeof s.name === 'string' &&
      typeof s.seat === 'number' &&
      typeof s.token === 'string' &&
      typeof s.isHost === 'boolean'
    ) {
      return s as PokerMpSession;
    }
    return null;
  } catch {
    return null;
  }
}

export function clearPokerSession(code: string): void {
  try {
    sessionStorage.removeItem(key(code));
  } catch {
    // ignore
  }
}
