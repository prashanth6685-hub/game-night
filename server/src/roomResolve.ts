// Universal room-code resolution: which game does a room code belong to?
// Pure lookup over the three room stores (poker, generic multi-phone,
// tambola). Used by GET /api/rooms/resolve/:code so that a code entered on
// ANY join screen lands the player in the right game.

import { getMpRoom } from './gameRooms.ts';
import { getPokerRoom } from './pokerRooms.ts';
import { getRoom as getTambolaRoom } from './tambolaRooms.ts';

export type ResolvedRoomKind =
  | { kind: 'poker'; code: string }
  | { kind: 'mp'; code: string; gameId: string }
  | { kind: 'tambola'; code: string };

/** Normalize a raw code the same way the join screens do. */
export function normalizeResolveCode(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
}

/**
 * Find which room store owns a code. Returns null when the code is unknown
 * or expired in every store. Priority on (astronomically unlikely)
 * cross-store collisions: poker, then generic multi-phone, then tambola.
 */
export function resolveRoomKind(raw: string): ResolvedRoomKind | null {
  const code = normalizeResolveCode(raw);
  if (!code) return null;
  const poker = getPokerRoom(code);
  if (poker) return { kind: 'poker', code };
  const mp = getMpRoom(code);
  if (mp) return { kind: 'mp', code, gameId: mp.gameId };
  const tambola = getTambolaRoom(code);
  if (tambola) return { kind: 'tambola', code };
  return null;
}
