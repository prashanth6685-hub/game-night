// Host lobby for multi-phone play (all games except Tambola):
// create the room → show a big QR code + room code → friends join on their
// own phones → host starts → every phone opens the game.

import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { useI18n } from '../../i18n/index.ts';
import { Button, Card, ErrorMessage, Spinner } from '../ui/index.ts';
import { playSound } from '../sound.ts';
import { track } from '../analytics.ts';
import { MpApi, mpJoinUrl, openMpEvents } from './api.ts';
import type { MpPlayerInfo } from './api.ts';
import { clearMpSession, saveMpHostData, saveMpSession } from './session.ts';
import type { MpSession } from './session.ts';
import './mp.css';

export interface MpLobbyProps {
  gameId: string;
  hostName: string;
  /** Opaque per-game setup, visible to joiners (never put secrets here). */
  config: unknown;
  minPlayers: number;
  maxPlayers: number;
  /** Host-only local data (e.g. Charades words) — never leaves this phone. */
  hostData?: unknown;
  buildInitialState: (players: MpPlayerInfo[]) => unknown;
  onStart: (session: MpSession) => void;
  onCancel: () => void;
}

export function MpLobby({
  gameId,
  hostName,
  config,
  minPlayers,
  maxPlayers,
  hostData,
  buildInitialState,
  onStart,
  onCancel,
}: MpLobbyProps) {
  const { t } = useI18n();
  const [session, setSession] = useState<MpSession | null>(null);
  const [players, setPlayers] = useState<MpPlayerInfo[]>([]);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const createdRef = useRef(false);

  // Create the room exactly once.
  useEffect(() => {
    if (createdRef.current) return;
    createdRef.current = true;
    let cancelled = false;
    MpApi.createRoom(gameId, hostName, config, maxPlayers)
      .then((r) => {
        if (cancelled) return;
        const s: MpSession = {
          code: r.code,
          gameId,
          name: hostName,
          seat: r.seat,
          playerId: r.playerId,
          playerToken: r.playerToken,
          hostToken: r.hostToken,
        };
        saveMpSession(s);
        if (hostData !== undefined) saveMpHostData(r.code, hostData);
        setSession(s);
        setPlayers([{ id: r.playerId, name: hostName, seat: 0, isHost: true }]);
        track('game_started', { game: gameId, mode: 'multi-phone' });
      })
      .catch((e: Error) => {
        if (!cancelled) setError(e.message);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // QR code image.
  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    QRCode.toDataURL(mpJoinUrl(session.code), {
      width: 512,
      margin: 2,
      color: { dark: '#111827', light: '#ffffff' },
    })
      .then((url) => {
        if (!cancelled) setQrUrl(url);
      })
      .catch(() => {
        if (!cancelled) setQrUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, [session]);

  // Live player list while friends join.
  useEffect(() => {
    if (!session?.hostToken) return;
    return openMpEvents(
      session.code,
      { role: 'host', token: session.hostToken },
      (ev) => {
        if (ev.type === 'hello') setPlayers(ev.snapshot.players);
        if (ev.type === 'players') setPlayers(ev.players);
      },
    );
  }, [session]);

  const canStart = players.length >= minPlayers && !starting;

  const handleStart = async (): Promise<void> => {
    if (!session?.hostToken || !canStart) return;
    setStarting(true);
    try {
      const initial = buildInitialState(players);
      await MpApi.startGame(session.code, session.hostToken, initial);
      playSound('click');
      onStart(session);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'start-failed');
      setStarting(false);
    }
  };

  const handleCancel = async (): Promise<void> => {
    if (session?.hostToken) {
      try {
        await MpApi.endGame(session.code, session.hostToken);
      } catch {
        // room already gone
      }
      clearMpSession(session.code);
    }
    onCancel();
  };

  if (error && !session) {
    return (
      <div className="mp-wrap">
        <ErrorMessage message={t('mp.createFailed')} onRetry={onCancel} />
      </div>
    );
  }
  if (!session) {
    return (
      <div className="mp-wrap">
        <Spinner />
        <p className="mp-muted">{t('mp.creatingRoom')}</p>
      </div>
    );
  }

  return (
    <div className="mp-wrap">
      <Card>
        <div className="mp-qr">
          <strong>{t('mp.scanToJoin')}</strong>
          {qrUrl ? (
            <img src={qrUrl} alt={t('mp.scanToJoin')} />
          ) : (
            <Spinner />
          )}
          <span className="mp-muted">{t('mp.orEnterCode')}</span>
          <span className="mp-code">{session.code}</span>
        </div>
      </Card>

      <Card title={`${t('mp.players')} (${players.length}/${maxPlayers})`}>
        <div className="mp-players">
          {players.map((p) => (
            <div className="mp-player" key={p.id}>
              <span>{p.seat === session.seat ? '⭐' : '👤'}</span>
              <span>
                {p.name}
                {p.seat === session.seat && (
                  <span className="mp-you"> ({t('mp.you')})</span>
                )}
              </span>
              {p.isHost && <em className="mp-host-badge">{t('mp.host')}</em>}
            </div>
          ))}
        </div>
        {players.length < minPlayers && (
          <p className="mp-muted">
            {t('mp.needPlayers').replace('{n}', String(minPlayers))}
          </p>
        )}
      </Card>

      {error && <p className="mp-error">{error}</p>}

      <Button
        variant="primary"
        size="lg"
        fullWidth
        disabled={!canStart}
        onClick={() => void handleStart()}
      >
        {starting ? <Spinner /> : `▶ ${t('mp.startGame')}`}
      </Button>
      <Button variant="ghost" fullWidth onClick={() => void handleCancel()}>
        {t('common.cancel')}
      </Button>
    </div>
  );
}
