// Universal room-code resolver: a code typed (or pasted) on ANY join screen
// can belong to any game. The server probes the poker, generic multi-phone
// and tambola room stores and tells us where the code lives; we then navigate
// to that game's own join screen. This is what makes "enter any room code"
// work irrespective of the game.

export type ResolvedRoom =
  | { kind: 'poker'; code: string }
  | { kind: 'mp'; code: string; gameId: string }
  | { kind: 'tambola'; code: string };

/** Ask the server which game a room code belongs to. Null = unknown/expired. */
export async function resolveRoomCode(raw: string): Promise<ResolvedRoom | null> {
  const code = raw.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (!code) return null;
  let res: Response;
  try {
    res = await fetch(`/api/rooms/resolve/${encodeURIComponent(code)}`);
  } catch {
    return null;
  }
  if (!res.ok) return null;
  try {
    const data = (await res.json()) as Partial<ResolvedRoom> & { code?: string };
    if (data.kind === 'poker' && data.code) return { kind: 'poker', code: data.code };
    if (data.kind === 'mp' && data.code)
      return { kind: 'mp', code: data.code, gameId: typeof data.gameId === 'string' ? data.gameId : '' };
    if (data.kind === 'tambola' && data.code) return { kind: 'tambola', code: data.code };
  } catch {
    return null;
  }
  return null;
}

/** Hash route of the join screen that owns this room. */
export function resolvedRoomJoinHash(room: ResolvedRoom): string {
  switch (room.kind) {
    case 'poker':
      return `#/poker/join/${room.code}`;
    case 'mp':
      return `#/join/${room.code}`;
    case 'tambola':
      return `#/tambola/join/${room.code}`;
  }
}

/** Navigate to the correct join screen for a resolved room. */
export function goToResolvedRoom(room: ResolvedRoom): void {
  location.hash = resolvedRoomJoinHash(room);
}
