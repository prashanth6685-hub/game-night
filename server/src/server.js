"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// Game Night server: serves the static client + a tiny JSON API.
// v1 API surface is intentionally small; rooms/multiplayer endpoints land here
// when the ServerTransport (see client/src/shared/rooms/transports.ts) is built.
const express_1 = __importDefault(require("express"));
const node_path_1 = require("node:path");
const node_fs_1 = require("node:fs");
const PORT = Number(process.env.PORT ?? 10000);
const VERSION = '1.0.0';
// dist/server.js -> ../../client/dist (repo layout); overridable for custom deploys.
const STATIC_DIR = process.env.STATIC_DIR ?? (0, node_path_1.join)(__dirname, '..', '..', 'client', 'dist');
// Mirrors the client game registry (client/src/games/registry.ts). Kept static
// so the landing page / future clients can list games without JS.
const GAMES = [
    { id: 'dumb-charades', icon: '🎭', name: 'Dumb Charades', minPlayers: 2, maxPlayers: null },
    { id: 'tambola', icon: '🎟️', name: 'Tambola', minPlayers: 2, maxPlayers: null },
    { id: 'snake-ladder', icon: '🐍', name: 'Snake & Ladder', minPlayers: 2, maxPlayers: 4 },
    { id: 'chess', icon: '♟️', name: 'Chess', minPlayers: 2, maxPlayers: 2 },
];
const app = (0, express_1.default)();
app.disable('x-powered-by');
app.get('/api/health', (_req, res) => {
    res.json({ ok: true, service: 'game-night', version: VERSION, time: new Date().toISOString() });
});
app.get('/api/games', (_req, res) => {
    res.json({ games: GAMES });
});
if ((0, node_fs_1.existsSync)(STATIC_DIR)) {
    app.use(express_1.default.static(STATIC_DIR, {
        maxAge: '1d',
        setHeaders: (res, path) => {
            if (path.endsWith('sw.js'))
                res.setHeader('Cache-Control', 'no-cache');
            if (path.endsWith('.html'))
                res.setHeader('Cache-Control', 'no-cache');
        },
    }));
    // Hash routing keeps navigation client-side; still, serve index.html for
    // any non-API path so deep links and refreshes work.
    app.get('*', (_req, res) => {
        res.sendFile((0, node_path_1.join)(STATIC_DIR, 'index.html'));
    });
}
else {
    // eslint-disable-next-line no-console
    console.warn(`[game-night] static dir not found: ${STATIC_DIR} — API only`);
}
app.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`[game-night] listening on :${PORT}`);
});
