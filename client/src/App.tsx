// Game Night app shell: hash router, top bar, bottom nav, lobby, settings, about.
import { Suspense, lazy, useEffect, useState } from 'react';
import { GAMES, getGame } from './games/registry.ts';
import type { GameResult } from './games/types.ts';
import { ResultsScreen } from './games/ResultsScreen.tsx';
import { useI18n } from './i18n/index.ts';
import type { Lang } from './i18n/index.ts';
import { useSettings } from './shared/settings.tsx';
import type { Theme } from './shared/settings.tsx';
import { AdSlot } from './shared/ads/Ads.tsx';
import { track } from './shared/analytics.ts';
import { Button, Card, ErrorMessage, Spinner, GameHeader } from './shared/ui/index.ts';
import {
  CreateRoomScreen,
  JoinRoomScreen,
  RoomLobbyScreen,
  useRoom,
} from './shared/rooms/Rooms.tsx';

export function nav(path: string): void {
  if (location.hash === `#${path}`) {
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  } else {
    location.hash = `#${path}`;
  }
}

type Route =
  | { name: 'home' }
  | { name: 'game'; id: string }
  | { name: 'rooms' }
  | { name: 'rooms-new' }
  | { name: 'rooms-join' }
  | { name: 'room'; code: string }
  | { name: 'settings' }
  | { name: 'about' };

function parseRoute(): Route {
  const parts = location.hash.replace(/^#\/?/, '').split('/');
  if (parts[0] === 'game' && parts[1]) return { name: 'game', id: parts[1] };
  if (parts[0] === 'rooms' && parts[1] === 'new') return { name: 'rooms-new' };
  if (parts[0] === 'rooms' && parts[1] === 'join') return { name: 'rooms-join' };
  if (parts[0] === 'rooms' && parts[1]) return { name: 'room', code: parts[1].toUpperCase() };
  if (parts[0] === 'rooms') return { name: 'rooms' };
  if (parts[0] === 'settings') return { name: 'settings' };
  if (parts[0] === 'about') return { name: 'about' };
  return { name: 'home' };
}

function useRoute(): Route {
  const [route, setRoute] = useState<Route>(parseRoute);
  useEffect(() => {
    const onChange = () => {
      setRoute(parseRoute());
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return route;
}

// ---------------------------------------------------------------- lobby ---
const CARD_GRADIENTS = [
  'linear-gradient(135deg,#4f46e5,#7c3aed)',
  'linear-gradient(135deg,#0ea5e9,#22d3ee)',
  'linear-gradient(135deg,#16a34a,#84cc16)',
  'linear-gradient(135deg,#f59e0b,#ef4444)',
  'linear-gradient(135deg,#ec4899,#8b5cf6)',
];

function LobbyPage() {
  const { t } = useI18n();
  useEffect(() => {
    track('session_start');
  }, []);
  return (
    <div className="gh-grid">
      <div className="gh-center">
        <div style={{ fontSize: '3rem' }} aria-hidden>
          🎮
        </div>
        <h1 className="gh-page-title">{t('lobby.title')}</h1>
        <p className="gh-page-sub">{t('lobby.subtitle')}</p>
      </div>
      <AdSlot placement="lobby" />
      {GAMES.map((g, i) => (
        <Card key={g.meta.id} className="gn-gamecard">
          <div className="gn-gamecard-top" style={{ background: CARD_GRADIENTS[i % CARD_GRADIENTS.length] }}>
            <span className="gn-gamecard-icon" aria-hidden>
              {g.meta.icon}
            </span>
          </div>
          <div className="gn-gamecard-body">
            <h2>{t(g.meta.nameKey)}</h2>
            <p>{t(g.meta.descKey)}</p>
            <div className="gh-row">
              <span className="gn-players">
                👥 {t('lobby.players')}: {g.meta.minPlayers}
                {g.meta.maxPlayers === null
                  ? t('lobby.unlimited').replace('{n}', String(g.meta.minPlayers))
                  : g.meta.maxPlayers === g.meta.minPlayers
                    ? ''
                    : `–${g.meta.maxPlayers}`}
              </span>
              <span className="gh-spacer" />
              <Button
                variant="primary"
                onClick={() => {
                  track('game_opened', { game: g.meta.id });
                  nav(`/game/${g.meta.id}`);
                }}
              >
                {t('lobby.playNow')}
              </Button>
            </div>
          </div>
        </Card>
      ))}
      <Card className="gn-comingsoon">
        <span aria-hidden>✨</span> {t('lobby.comingSoon')}
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------- game ----
function GameRoute({ id }: { id: string }) {
  const { t } = useI18n();
  const game = getGame(id);
  const [restartKey, setRestartKey] = useState(0);
  const [result, setResult] = useState<GameResult | null>(null);

  useEffect(() => {
    setResult(null);
    setRestartKey((k) => k + 1);
  }, [id]);

  if (!game) {
    return (
      <div className="gh-grid">
        <ErrorMessage message={t('errors.generic')} onRetry={() => nav('/')} />
      </div>
    );
  }
  const Comp = lazy(game.load);
  const goHome = () => nav('/');

  if (result) {
    return (
      <ResultsScreen
        result={result}
        onPlayAgain={() => {
          setResult(null);
          setRestartKey((k) => k + 1);
        }}
        onChooseAnother={goHome}
        onHome={goHome}
      />
    );
  }
  return (
    <div className="gh-grid">
      <GameHeader
        title={`${game.meta.icon} ${t(game.meta.nameKey)}`}
        onBack={goHome}
        onRestart={() => setRestartKey((k) => k + 1)}
      />
      <Suspense fallback={<Spinner />}>
        <Comp
          key={restartKey}
          onFinish={(r) => {
            track('game_completed', { game: id });
            setResult(r);
          }}
          onExit={() => {
            track('game_abandoned', { game: id });
            goHome();
          }}
        />
      </Suspense>
    </div>
  );
}

// ---------------------------------------------------------------- rooms ---
function RoomsPage() {
  const { t } = useI18n();
  const { room } = useRoom();
  return (
    <div className="gh-grid">
      <h1 className="gh-page-title">{t('rooms.title')}</h1>
      {room && (
        <Card>
          <div className="gh-row">
            <span>
              {t('rooms.roomCode')}: <strong>{room.code}</strong>
            </span>
            <span className="gh-spacer" />
            <Button variant="secondary" size="sm" onClick={() => nav(`/rooms/${room.code}`)}>
              {t('rooms.title')}
            </Button>
          </div>
        </Card>
      )}
      <Button variant="primary" fullWidth onClick={() => nav('/rooms/new')}>
        {t('rooms.create')}
      </Button>
      <Button variant="secondary" fullWidth onClick={() => nav('/rooms/join')}>
        {t('rooms.join')}
      </Button>
      <p className="gh-page-sub">{t('rooms.onlineSoon')}</p>
    </div>
  );
}

// ------------------------------------------------------------- settings ---
function Segmented<T extends string>({
  options,
  value,
  onChange,
  labels,
}: {
  options: T[];
  value: T;
  onChange: (v: T) => void;
  labels: Record<T, string>;
}) {
  return (
    <div className="gn-segmented" role="radiogroup">
      {options.map((o) => (
        <button
          key={o}
          role="radio"
          aria-checked={value === o}
          className={value === o ? 'on' : ''}
          onClick={() => onChange(o)}
        >
          {labels[o]}
        </button>
      ))}
    </div>
  );
}

function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      aria-label={label}
      className={`gn-toggle ${on ? 'on' : ''}`}
      onClick={() => onChange(!on)}
    >
      <span className="gn-toggle-knob" />
    </button>
  );
}

const LANGS: Lang[] = ['en', 'te', 'hi'];
const LANG_NAMES: Record<Lang, string> = { en: 'English', te: 'తెలుగు', hi: 'हिन्दी' };

function SettingsPage() {
  const { t, lang, setLang } = useI18n();
  const { settings, update } = useSettings();
  return (
    <div className="gh-grid">
      <h1 className="gh-page-title">{t('settings.title')}</h1>
      <Card title={t('settings.appearance')}>
        <div className="gh-row">
          <span>{t('settings.theme')}</span>
          <span className="gh-spacer" />
        </div>
        <Segmented<Theme>
          options={['system', 'light', 'dark']}
          value={settings.theme}
          onChange={(theme) => update({ theme })}
          labels={{
            system: t('settings.themeSystem'),
            light: t('settings.themeLight'),
            dark: t('settings.themeDark'),
          }}
        />
      </Card>
      <Card title={t('settings.language')}>
        <Segmented<Lang>
          options={LANGS}
          value={lang}
          onChange={setLang}
          labels={LANG_NAMES}
        />
      </Card>
      <Card>
        <div className="gh-row">
          <span>🔊 {t('settings.sound')}</span>
          <span className="gh-spacer" />
          <Toggle on={settings.sound} onChange={(sound) => update({ sound })} label={t('settings.sound')} />
        </div>
        <div className="gh-row gh-mt">
          <span>✨ {t('settings.animations')}</span>
          <span className="gh-spacer" />
          <Toggle
            on={settings.animations}
            onChange={(animations) => update({ animations })}
            label={t('settings.animations')}
          />
        </div>
      </Card>
    </div>
  );
}

// ----------------------------------------------------------------- about --
function AboutPage() {
  const { t } = useI18n();
  return (
    <div className="gh-grid">
      <h1 className="gh-page-title">
        🎮 {t('app.name')}
      </h1>
      <Card>
        <p>{t('about.body')}</p>
        <p className="gh-page-sub">{t('app.tagline')}</p>
      </Card>
      <Button variant="secondary" fullWidth onClick={() => nav('/settings')}>
        {t('nav.settings')}
      </Button>
    </div>
  );
}

// ------------------------------------------------------------------ app ---
export default function App() {
  const { t } = useI18n();
  const route = useRoute();

  return (
    <div className="gh-app">
      <a className="gh-skip" href="#main">
        {t('common.loading')}
      </a>
      <header className="gh-topbar">
        <span className="gh-logo" aria-hidden>
          🎮
        </span>
        <span className="gh-name">{t('app.name')}</span>
        <button
          className="gh-iconbtn"
          aria-label={t('nav.about')}
          onClick={() => nav('/about')}
        >
          ℹ️
        </button>
      </header>

      <main className="gh-main" id="main">
        {route.name === 'home' && <LobbyPage />}
        {route.name === 'game' && <GameRoute id={route.id} />}
        {route.name === 'rooms' && <RoomsPage />}
        {route.name === 'rooms-new' && <CreateRoomScreen onCreated={(c) => nav(`/rooms/${c}`)} />}
        {route.name === 'rooms-join' && <JoinRoomScreen onJoined={(c) => nav(`/rooms/${c}`)} />}
        {route.name === 'room' && (
          <RoomLobbyScreen onStart={(r) => nav(`/game/${r.gameId}`)} />
        )}
        {route.name === 'settings' && <SettingsPage />}
        {route.name === 'about' && <AboutPage />}
      </main>

      <nav className="gh-bottomnav" aria-label={t('nav.games')}>
        <a href="#/" className={route.name === 'home' || route.name === 'game' ? 'active' : ''}>
          <span className="ico" aria-hidden>
            🏠
          </span>
          {t('nav.home')}
        </a>
        <a href="#/rooms" className={route.name.startsWith('room') ? 'active' : ''}>
          <span className="ico" aria-hidden>
            👥
          </span>
          {t('nav.rooms')}
        </a>
        <a href="#/settings" className={route.name === 'settings' ? 'active' : ''}>
          <span className="ico" aria-hidden>
            ⚙️
          </span>
          {t('nav.settings')}
        </a>
      </nav>
    </div>
  );
}
