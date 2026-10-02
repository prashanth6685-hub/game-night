// Unified join screen for multi-phone play: friends land here from the QR
// code (#/join/<CODE>), type their name, and are taken into the game their
// host picked. Works for every game on the generic room system.

import { useEffect, useMemo, useState } from 'react';
import { useI18n } from '../../i18n/index.ts';
import { GAMES } from '../../games/registry.ts';
import { Button, Card, ErrorMessage, Spinner } from '../ui/index.ts';
import { playSound } from '../sound.ts';
import { track } from '../analytics.ts';
import { randomExampleName } from '../names.ts';
import { MpApi } from './api.ts';
import type { MpRoomInfo } from './api.ts';
import { getMpSession, saveMpSession } from './session.ts';
import './mp.css';

export function JoinGameScreen({ code }: { code: string }) {
  const { t } = useI18n();
  const [info, setInfo] = useState<MpRoomInfo | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const namePh = useMemo(() => randomExampleName(), []);
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  const upper = code.toUpperCase();

  // Already in this room (refresh / re-scan): jump straight back in.
  useEffect(() => {
    const existing = getMpSession(upper);
    if (existing) {
      window.location.hash = `#/mp/${existing.gameId}/${upper}`;
    }
  }, [upper]);

  useEffect(() => {
    let cancelled = false;
    MpApi.getRoomInfo(upper)
      .then((r) => {
        if (!cancelled) setInfo(r);
      })
      .catch(() => {
        if (!cancelled) setLoadError(t('mp.roomNotFound'));
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [upper]);

  if (loadError) {
    return (
      <div className="mp-wrap">
        <ErrorMessage
          message={loadError}
          onRetry={() => {
            window.location.hash = '#/';
          }}
        />
      </div>
    );
  }
  if (!info) {
    return (
      <div className="mp-wrap">
        <Spinner />
      </div>
    );
  }

  const game = GAMES.find((g) => g.meta.id === info.gameId);
  const gameName = game ? `${game.meta.icon} ${t(game.meta.nameKey)}` : info.gameId;

  if (info.status !== 'lobby') {
    return (
      <div className="mp-wrap">
        <Card>
          <h2 style={{ textAlign: 'center' }}>{gameName}</h2>
          <p className="mp-muted">{t('mp.alreadyStarted')}</p>
        </Card>
        <Button
          variant="secondary"
          fullWidth
          onClick={() => {
            window.location.hash = '#/';
          }}
        >
          {t('nav.home')}
        </Button>
      </div>
    );
  }

  const handleJoin = async (): Promise<void> => {
    const clean = name.trim();
    if (!clean || joining) return;
    setJoining(true);
    setJoinError(null);
    try {
      const joined = await MpApi.joinRoom(upper, clean);
      saveMpSession({
        code: upper,
        gameId: info.gameId,
        name: joined.name,
        seat: joined.seat,
        playerId: joined.playerId,
        playerToken: joined.playerToken,
      });
      playSound('click');
      track('game_joined', { game: info.gameId, mode: 'multi-phone' });
      window.location.hash = `#/mp/${info.gameId}/${upper}`;
    } catch (e) {
      setJoinError(e instanceof Error ? e.message : t('mp.joinFailed'));
      setJoining(false);
    }
  };

  return (
    <div className="mp-wrap">
      <Card>
        <h2 style={{ textAlign: 'center' }}>{gameName}</h2>
        <p className="mp-muted">
          {t('mp.roomCode')}: <strong>{info.code}</strong> · {info.playerCount}/
          {info.maxPlayers} {t('mp.players').toLowerCase()}
        </p>
        <label className="gn-field">
          <span>{t('mp.yourName')}</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={namePh}
            maxLength={24}
            autoComplete="off"
            onKeyDown={(e) => {
              if (e.key === 'Enter') void handleJoin();
            }}
          />
        </label>
        {joinError && <p className="mp-error">{joinError}</p>}
        <Button
          variant="primary"
          size="lg"
          fullWidth
          disabled={joining || !name.trim()}
          onClick={() => void handleJoin()}
        >
          {joining ? <Spinner /> : `📲 ${t('mp.joinGame')}`}
        </Button>
      </Card>
      {info.players.length > 0 && (
        <Card title={t('mp.players')}>
          <div className="mp-players">
            {info.players.map((p) => (
              <div className="mp-player" key={p.id}>
                <span>👤</span>
                <span>{p.name}</span>
                {p.isHost && <em className="mp-host-badge">{t('mp.host')}</em>}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
