// Shared hook for multi-phone game screens: owns the SSE subscription and
// the latest room snapshot. Every game's Mp screen builds on this — it only
// has to render `state` (its own game shape) and call postState on its turn.

import { useCallback, useEffect, useRef, useState } from 'react';
import { MpApi, openMpEvents } from './api.ts';
import type { MpIntentEvent, MpPlayerInfo, MpStatus } from './api.ts';
import { isHostSession } from './session.ts';
import type { MpSession } from './session.ts';

export interface MpIntent extends MpIntentEvent {
  /** Monotonic per-client sequence so screens can react to each intent once. */
  seq: number;
}

export interface UseMpRoom {
  session: MpSession;
  isHost: boolean;
  status: MpStatus;
  players: MpPlayerInfo[];
  config: unknown;
  state: unknown;
  stateVersion: number;
  results: unknown;
  connected: boolean;
  lastIntent: MpIntent | null;
  /** Post the next game snapshot. Returns false when the write lost a race. */
  postState: (next: unknown) => Promise<boolean>;
  sendIntent: (type: string, payload?: unknown, toSeat?: number) => Promise<void>;
  /** Host only: end the room for everyone. */
  endGame: (results?: unknown) => Promise<void>;
  /** Re-fetch the authoritative snapshot (after a lost race / reconnect). */
  refresh: () => Promise<void>;
}

export function useMpRoom(session: MpSession): UseMpRoom {
  const isHost = isHostSession(session);
  const [status, setStatus] = useState<MpStatus>('lobby');
  const [players, setPlayers] = useState<MpPlayerInfo[]>([]);
  const [config, setConfig] = useState<unknown>(null);
  const [state, setState] = useState<unknown>(null);
  const [results, setResults] = useState<unknown>(null);
  const [connected, setConnected] = useState(false);
  const [lastIntent, setLastIntent] = useState<MpIntent | null>(null);

  const versionRef = useRef(0);
  const [stateVersion, setStateVersion] = useState(0);
  const seqRef = useRef(0);
  const sessionRef = useRef(session);
  sessionRef.current = session;

  const applySnapshot = useCallback(
    (snap: {
      status: MpStatus;
      players: MpPlayerInfo[];
      config: unknown;
      state: unknown;
      stateVersion: number;
      results: unknown;
    }) => {
      setStatus(snap.status);
      setPlayers(snap.players);
      setConfig(snap.config);
      setState(snap.state);
      setResults(snap.results);
      versionRef.current = snap.stateVersion;
      setStateVersion(snap.stateVersion);
    },
    [],
  );

  const refresh = useCallback(async (): Promise<void> => {
    const s = sessionRef.current;
    try {
      const snap =
        isHostSession(s) && s.hostToken
          ? await MpApi.getSnapshot(s.code, { hostToken: s.hostToken })
          : await MpApi.getSnapshot(s.code, {
              playerId: s.playerId,
              playerToken: s.playerToken,
            });
      applySnapshot(snap);
    } catch {
      // stream will re-sync on reconnect
    }
  }, [applySnapshot]);

  useEffect(() => {
    const s = sessionRef.current;
    const auth =
      isHostSession(s) && s.hostToken
        ? ({ role: 'host', token: s.hostToken } as const)
        : ({ role: 'player', playerId: s.playerId, token: s.playerToken } as const);
    const close = openMpEvents(
      s.code,
      auth,
      (ev) => {
        setConnected(true);
        switch (ev.type) {
          case 'hello':
            applySnapshot(ev.snapshot);
            break;
          case 'players':
            setPlayers(ev.players);
            break;
          case 'started':
            setStatus('playing');
            setPlayers(ev.players);
            setState(ev.state);
            versionRef.current = ev.stateVersion;
            setStateVersion(ev.stateVersion);
            break;
          case 'state':
            setState(ev.state);
            versionRef.current = ev.stateVersion;
            setStateVersion(ev.stateVersion);
            break;
          case 'intent':
            seqRef.current += 1;
            setLastIntent({ ...ev.intent, seq: seqRef.current });
            break;
          case 'ended':
            setStatus('ended');
            setResults(ev.results);
            break;
        }
      },
      () => setConnected(false),
    );
    return close;
  }, [applySnapshot]);

  const postState = useCallback(async (next: unknown): Promise<boolean> => {
    const s = sessionRef.current;
    try {
      const r = await MpApi.postState(
        s.code,
        s.playerId,
        s.playerToken,
        next,
        versionRef.current,
      );
      versionRef.current = r.stateVersion;
      setStateVersion(r.stateVersion);
      setState(next);
      return true;
    } catch {
      // Lost the turn race (409) or offline: re-sync to the real state.
      await refresh();
      return false;
    }
  }, [refresh]);

  const sendIntent = useCallback(
    async (type: string, payload?: unknown, toSeat?: number): Promise<void> => {
      const s = sessionRef.current;
      let toPlayerId: string | undefined;
      if (toSeat !== undefined) {
        // True DM: the server delivers only to that player's connections,
        // so secret payloads (the Charades word) never reach other phones.
        const snap =
          isHostSession(s) && s.hostToken
            ? await MpApi.getSnapshot(s.code, { hostToken: s.hostToken })
            : await MpApi.getSnapshot(s.code, {
                playerId: s.playerId,
                playerToken: s.playerToken,
              });
        const target = snap.players.find((p) => p.seat === toSeat);
        if (!target) return;
        toPlayerId = target.id;
      }
      await MpApi.sendIntent(
        s.code,
        s.playerId,
        s.playerToken,
        type,
        payload ?? null,
        toPlayerId,
      );
    },
    [],
  );

  const endGame = useCallback(async (res?: unknown): Promise<void> => {
    const s = sessionRef.current;
    if (!isHostSession(s) || !s.hostToken) return;
    try {
      await MpApi.endGame(s.code, s.hostToken, res ?? null);
      setStatus('ended');
      if (res !== undefined) setResults(res);
    } catch {
      // room may already be ended
    }
  }, []);

  return {
    session,
    isHost,
    status,
    players,
    config,
    state,
    stateVersion,
    results,
    connected,
    lastIntent,
    postState,
    sendIntent,
    endGame,
    refresh,
  };
}
