# 🎮 Game Night

A mobile-first multi-game web app for family & friends. One lobby, many games — local / same-device multiplayer today, online multiplayer architecture ready.

**Games (v1):** 🎭 Dumb Charades · 🎟️ Tambola/Housie · 🐍 Snake & Ladder · ♟️ Chess

## Quick start

```bash
# install
cd client && npm install && cd ../server && npm install && cd ..

# run all logic tests
npm test

# typecheck the client
npm run typecheck

# dev (client only, http://localhost:5173)
npm run dev:client

# production build (client/dist + server/dist)
npm run build

# serve production locally
node server/dist/server.js   # http://localhost:10000
```

## Project structure

```
client/
  public/            index.html, manifest.json, sw.js (PWA), icon.svg
  scripts/           build.mjs (esbuild, code-splits games), dev.mjs
  src/
    main.tsx         entry: providers + service-worker registration
    App.tsx          hash router, top bar, bottom nav, lobby, settings, about
    i18n/            en.json, te.json, hi.json + fragments/*.en.json (per-area strings)
    styles/          global.css (theme vars, dark mode)
    shared/
      ui/            Button, Card, Modal, Toast, Timer, Avatar, Scoreboard,
                     GameHeader, Spinner, ConfirmDialog, ErrorMessage
      rooms/         Room system: types, InMemoryTransport (v1),
                     ServerTransport stub (online later), create/join/lobby UI
      ads/           AdSlot + provider abstraction (placeholder in v1)
      settings.tsx   theme / sound / animations (localStorage)
      sound.ts       WebAudio effects, no assets
      analytics.ts   anonymous event tracking (no-op in prod)
    games/
      types.ts       GameMeta / GameScreenProps / GameResult contracts
      registry.ts    THE game list — add one line per game
      ResultsScreen.tsx
      tambola|snake-ladder|chess|dumb-charades/
        meta.ts components/ logic/ types.ts data/ index.ts *.test.ts
server/
  src/server.ts      express: static client + /api/health + /api/games
Dockerfile           multi-stage build (client → server → runtime)
render.yaml          Render free web service, docker runtime
scripts/run-tests.sh node --test over all *.test.ts (TS type-stripping)
```

## Adding a game

1. Create `client/src/games/<id>/` with `meta.ts`, `index.ts`, `components/`, `logic/`.
2. Follow the contract in `client/src/games/types.ts`:
   `meta.ts` exports `meta: GameMeta`; `index.ts` re-exports `meta` and defaults-exports
   a component receiving `GameScreenProps { onFinish(result), onExit() }`.
3. Add one line to `client/src/games/registry.ts`. Games are code-split automatically.
4. Put UI strings in `client/src/i18n/fragments/<id>.en.json`; logic tests in `logic/*.test.ts`.

## Architecture notes

- **State**: each game owns its state; nothing game-specific lives in the shell.
- **Rooms**: `ITransport` interface — `InMemoryTransport` works today (local rooms:
  create → code → add same-device players → ready → start). `ServerTransport`
  documents the Socket.IO wire protocol for online multiplayer later.
- **Ads**: `<AdSlot placement="lobby"|"postgame"|"between">` only — never over gameplay.
- **PWA**: manifest + service worker, offline-capable for local games after first visit.
- **i18n**: UI locales en/te/hi; Telugu content stored as Unicode with English `display`.
- **Tests**: node built-in runner, no test framework dependency.

## Deploy (Render)

1. Create public repo `game-night` and push this directory.
2. In Render: New → Blueprint → point at the repo (`render.yaml`, docker runtime).
3. Free plan; health check is `/api/health`. No env vars required for v1.
