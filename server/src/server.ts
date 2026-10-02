// Game Night server: serves the static client + a tiny JSON API.
// v1 API surface is intentionally small; rooms/multiplayer endpoints land here
// when the ServerTransport (see client/src/shared/rooms/transports.ts) is built.
import express from 'express';
import { join } from 'node:path';
import { existsSync } from 'node:fs';
import { charadesGenerateHandler } from './charades.ts';

const PORT = Number(process.env.PORT ?? 10000);
const VERSION = '1.0.0';

// dist/server.js -> ../../client/dist (repo layout); overridable for custom deploys.
const STATIC_DIR = process.env.STATIC_DIR ?? join(__dirname, '..', '..', 'client', 'dist');

// Mirrors the client game registry (client/src/games/registry.ts). Kept static
// so the landing page / future clients can list games without JS.
const GAMES = [
  { id: 'dumb-charades', icon: '🎭', name: 'Dumb Charades', minPlayers: 2, maxPlayers: null },
  { id: 'tambola', icon: '🎟️', name: 'Tambola', minPlayers: 2, maxPlayers: null },
  { id: 'snake-ladder', icon: '🐍', name: 'Snake & Ladder', minPlayers: 2, maxPlayers: 4 },
  { id: 'chess', icon: '♟️', name: 'Chess', minPlayers: 2, maxPlayers: 2 },
];

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '16kb' }));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'game-night', version: VERSION, time: new Date().toISOString() });
});

app.get('/api/games', (_req, res) => {
  res.json({ games: GAMES });
});

// AI-generated custom word lists for Dumb Charades (no persistence).
app.post('/api/charades/generate', charadesGenerateHandler());

if (existsSync(STATIC_DIR)) {
  app.use(
    express.static(STATIC_DIR, {
      maxAge: '1d',
      setHeaders: (res, path) => {
        if (path.endsWith('sw.js')) res.setHeader('Cache-Control', 'no-cache');
        if (path.endsWith('.html')) res.setHeader('Cache-Control', 'no-cache');
      },
    }),
  );
  // Hash routing keeps navigation client-side; still, serve index.html for
  // any non-API path so deep links and refreshes work.
  app.get('*', (_req, res) => {
    res.sendFile(join(STATIC_DIR, 'index.html'));
  });
} else {
  // eslint-disable-next-line no-console
  console.warn(`[game-night] static dir not found: ${STATIC_DIR} — API only`);
}

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`[game-night] listening on :${PORT}`);
});
