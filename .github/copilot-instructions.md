# Brass: Birmingham Money Tracker — Project Guidelines

LAN companion app for Brass: Birmingham. Players join via browser to track money, loans, and turns in real-time.

## Build and Test

**Server:**

```bash
cd server && npm install
npm run dev        # hot-reload via tsx watch
npm run debug      # with Node inspector
npm run build      # compile to dist/
npm start          # run compiled dist/server.js
npm run reset      # wipe state/game.json (reset game)
```

**Client:**

```bash
cd client && npm install
npm run dev        # Vite dev server (http://localhost:5173)
npm run build      # bundle to client/dist/ (served by Express)
npm run type-check # vue-tsc --noEmit
```

No lint or test tooling is configured. Type-check is the only verification step.

**Production:** `npm run build` in client/, then `npm start` in server/. Express serves `client/dist/` as static files with an SPA fallback.

## Architecture

All game logic is **server-authoritative** — clients only emit events, the server validates and mutates state, then broadcasts the full `Game` object to all clients via `STATE_UPDATE`. No delta patches.

```
server/src/
  server.ts          # Express + Socket.IO setup, static serving, /api routes
  socketHandlers.ts  # All socket event handlers (JOIN, SPEND, LOAN, UNDO, etc.)
  gameState.ts       # GameState class — the only place state is mutated
  types.ts           # Shared type definitions (duplicated in client)
  persistence.ts     # Load/save state/game.json (saves every 5s + SIGINT)
  connectionInfo.ts  # LAN IP + QR code URL for /connect page

client/src/
  App.vue            # Root: owns socket, gameState ref, routes between views
  components/
    Lobby.vue        # Pre-game: name entry, entrepreneur selection, start game
    Game.vue         # In-game: spend/loan/undo/end-turn actions
    Connect.vue      # QR code + join URL display page (/connect route)
```

## Key Design Decisions

**`playerId` vs `socketId`:** `playerId` is a stable UUID that persists across reconnects. `socketId` is the transient Socket.IO handle that changes on every reconnect. Never use `socketId` as a player identifier. The server calls `reassociatePlayer()` to re-link a reconnecting socket to an existing player.

**Version UUID:** `game.version` is set on server start. The client stores it in `localStorage.gameVersion` and compares on reconnect — a mismatch means the server was reset, so stale localStorage is cleared.

**`localStorage` keys:** `playerName`, `playerEntrepreneur`, `gameVersion`

## Conventions

- **Socket event names** are `SCREAMING_SNAKE_CASE` (e.g., `STATE_UPDATE`, `REJECT_ACTION`, `END_TURN`)
- **Types are duplicated** in `server/src/types.ts` and `client/src/types.ts` — keep them in sync manually; there is no shared package
- **Starting money** is 30 (hardcoded in `GameState.addPlayer`)
- **Game phases** are `"canal"` and `"rail"`; `round` increments each `END_ROUND`
- Use `const`/`let` throughout — avoid `var` (one legacy instance exists in socketHandlers.ts)

## Socket Event Reference

**Client → Server:** `JOIN`, `CLAIM_ENTREPRENEUR`, `SPEND`, `LOAN`, `UNDO`, `END_TURN`, `END_ROUND`, `START_GAME`

**Server → Client:** `STATE_UPDATE` (full Game object), `PLAYER_JOINED`, `REJECT_ACTION`, `VERSION_MISMATCH`
