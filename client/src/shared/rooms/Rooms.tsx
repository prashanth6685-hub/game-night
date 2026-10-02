// Room React layer: provider + create/join/lobby screens.
// v1 flow: host creates a room (picks a game), gets a code, adds same-device
// players by name, everyone toggles ready, host starts -> launches the game.
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { ITransport, Room } from './types.ts';
import { RoomError } from './types.ts';
import { InMemoryTransport } from './transports.ts';
import { GAMES } from '../../games/registry.ts';
import { useI18n } from '../../i18n/index.ts';
import {
  Button,
  Card,
  Avatar,
  ErrorMessage,
  ConfirmDialog,
  Spinner,
} from '../ui/index.ts';
import { playSound } from '../sound.ts';

interface RoomCtx {
  transport: ITransport;
  room: Room | null;
  refresh: () => void;
}

const Ctx = createContext<RoomCtx | null>(null);

export function RoomProvider({ children }: { children: ReactNode }) {
  const transport = useMemo(() => new InMemoryTransport(), []);
  const [room, setRoom] = useState<Room | null>(() => transport.getRoom());
  useEffect(() => transport.onUpdate(setRoom), [transport]);
  return (
    <Ctx.Provider value={{ transport, room, refresh: () => setRoom(transport.getRoom()) }}>
      {children}
    </Ctx.Provider>
  );
}

export function useRoom(): RoomCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useRoom must be used inside RoomProvider');
  return ctx;
}

function useRoomAction() {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      playSound('click');
    } catch (e) {
      setError(e instanceof RoomError ? e.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  };
  return { error, busy, run, clearError: () => setError(null) };
}

export function CreateRoomScreen({ onCreated }: { onCreated: (code: string) => void }) {
  const { t } = useI18n();
  const { transport } = useRoom();
  const [name, setName] = useState('');
  const [gameId, setGameId] = useState(GAMES[0]!.meta.id);
  const { error, busy, run } = useRoomAction();

  return (
    <div className="gh-grid">
      <h1 className="gh-page-title">{t('rooms.create')}</h1>
      <Card>
        <label className="gn-field">
          <span>{t('rooms.yourName')}</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('rooms.yourName')}
            maxLength={24}
            autoComplete="off"
          />
        </label>
        <label className="gn-field">
          <span>{t('rooms.selectGame')}</span>
          <select value={gameId} onChange={(e) => setGameId(e.target.value)}>
            {GAMES.map((g) => (
              <option key={g.meta.id} value={g.meta.id}>
                {g.meta.icon} {t(g.meta.nameKey)}
              </option>
            ))}
          </select>
        </label>
        {error && <ErrorMessage message={error} />}
        <Button
          variant="primary"
          fullWidth
          disabled={busy || !name.trim()}
          onClick={() =>
            run(async () => {
              const room = await transport.createRoom(name, gameId);
              onCreated(room.code);
            })
          }
        >
          {busy ? <Spinner /> : t('rooms.create')}
        </Button>
      </Card>
      <p className="gh-page-sub">{t('rooms.onlineSoon')}</p>
    </div>
  );
}

export function JoinRoomScreen({ onJoined }: { onJoined: (code: string) => void }) {
  const { t } = useI18n();
  const { transport } = useRoom();
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const { error, busy, run } = useRoomAction();

  return (
    <div className="gh-grid">
      <h1 className="gh-page-title">{t('rooms.join')}</h1>
      <Card>
        <label className="gn-field">
          <span>{t('rooms.roomCode')}</span>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="AB123"
            maxLength={5}
            autoComplete="off"
            style={{ textTransform: 'uppercase', letterSpacing: '0.2em' }}
          />
        </label>
        <label className="gn-field">
          <span>{t('rooms.yourName')}</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('rooms.yourName')}
            maxLength={24}
            autoComplete="off"
          />
        </label>
        {error && <ErrorMessage message={error} />}
        <Button
          variant="primary"
          fullWidth
          disabled={busy || !name.trim() || !code.trim()}
          onClick={() =>
            run(async () => {
              const room = await transport.joinRoom(code, name);
              onJoined(room.code);
            })
          }
        >
          {busy ? <Spinner /> : t('rooms.join')}
        </Button>
      </Card>
    </div>
  );
}

const AVATAR_COLORS = ['#4f46e5', '#0ea5e9', '#16a34a', '#f59e0b', '#ec4899', '#8b5cf6'];

export function RoomLobbyScreen({ onStart }: { onStart: (room: Room) => void }) {
  const { t } = useI18n();
  const { transport, room } = useRoom();
  const { error, busy, run } = useRoomAction();
  const [newName, setNewName] = useState('');
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [kickId, setKickId] = useState<string | null>(null);

  if (!room) return <ErrorMessage message={t('errors.generic')} />;
  const game = GAMES.find((g) => g.meta.id === room.gameId);
  // v1: single local client hosts the room, so host controls are always shown.
  // A server transport will gate these by real identity.
  const isHost = true;
  const allReady = room.players.every((p) => p.ready);

  return (
    <div className="gh-grid">
      <h1 className="gh-page-title">
        {game?.meta.icon} {game ? t(game.meta.nameKey) : room.gameId}
      </h1>
      <Card title={t('rooms.roomCode')}>
        <div className="gn-roomcode">{room.code}</div>
        <p className="gh-page-sub" style={{ margin: '8px 0 0' }}>
          {t('rooms.onlineSoon')}
        </p>
      </Card>

      <Card title={`${t('rooms.players')} (${room.players.length})`}>
        <div className="gh-grid">
          {room.players.map((p, i) => (
            <div className="gn-playerrow" key={p.id}>
              <Avatar name={p.name} color={AVATAR_COLORS[i % AVATAR_COLORS.length]} />
              <span className="gn-playername">
                {p.name}
                {p.isHost && <em className="gn-hostbadge">{t('rooms.host')}</em>}
              </span>
              <span className={`gn-ready ${p.ready ? 'on' : ''}`}>
                {p.ready ? `✓ ${t('rooms.ready')}` : t('rooms.notReady')}
              </span>
              {isHost && !p.isHost && (
                <button
                  className="gn-linkbtn"
                  onClick={() => setKickId(p.id)}
                  aria-label={`${t('rooms.remove')} ${p.name}`}
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
        {isHost && (
          <div className="gh-row gh-mt">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder={t('rooms.yourName')}
              maxLength={24}
              aria-label={t('rooms.yourName')}
            />
            <Button
              variant="secondary"
              disabled={busy || !newName.trim()}
              onClick={() =>
                run(async () => {
                  await transport.addLocalPlayer(newName);
                  setNewName('');
                })
              }
            >
              ＋
            </Button>
          </div>
        )}
      </Card>

      {error && <ErrorMessage message={error} />}

      <div className="gh-grid">
        {isHost && (
          <>
            <p className="gh-page-sub" style={{ margin: 0 }}>
              {t('rooms.ready')}
            </p>
            <div className="gh-row" style={{ flexWrap: 'wrap' }}>
              {room.players
                .filter((p) => !p.isHost)
                .map((p) => (
                  <Button
                    key={p.id}
                    variant={p.ready ? 'success' : 'secondary'}
                    size="sm"
                    disabled={busy}
                    onClick={() =>
                      run(() => transport.setPlayerReady(p.id, !p.ready))
                    }
                  >
                    {p.ready ? `✓ ${p.name}` : p.name}
                  </Button>
                ))}
            </div>
            <Button
              variant="primary"
              fullWidth
              disabled={busy || !allReady || room.players.length < 2}
              onClick={() =>
                run(async () => {
                  const r = await transport.startGame();
                  onStart(r);
                })
              }
            >
              {t('rooms.startGame')}
            </Button>
          </>
        )}
        <Button variant="ghost" fullWidth onClick={() => setConfirmLeave(true)}>
          {t('rooms.leave')}
        </Button>
      </div>

      <ConfirmDialog
        open={confirmLeave}
        title={t('rooms.leave')}
        message={t('rooms.leave')}
        confirmLabel={t('common.yes')}
        cancelLabel={t('common.no')}
        onCancel={() => setConfirmLeave(false)}
        onConfirm={() => run(() => transport.leaveRoom())}
      />
      <ConfirmDialog
        open={kickId !== null}
        title={t('rooms.remove')}
        message={room.players.find((p) => p.id === kickId)?.name ?? ''}
        confirmLabel={t('common.yes')}
        cancelLabel={t('common.no')}
        danger
        onCancel={() => setKickId(null)}
        onConfirm={() =>
          run(async () => {
            if (kickId) await transport.removePlayer(kickId);
            setKickId(null);
          })
        }
      />
    </div>
  );
}
