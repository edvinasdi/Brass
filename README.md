# Brass: Birmingham Money Tracker

LAN-based companion app for Brass: Birmingham. Players join via browser to track money, loans, and turns in real-time.

## Overview
- Players connect via web browser on the same local network
- Join games by entering a player name
- Select entrepreneur color (red, blue, yellow, purple)
- Track money, spending, loans, and undo actions during gameplay
- Real-time synchronization across all connected players
- Persistent game state (survives server crashes)
- Automatic player rejoin on page refresh without creating duplicates

**Tech Stack:**
- **Backend:** Node.js + TypeScript + Express + Socket.IO
- **Frontend:** Vue 3 + TypeScript + Vite + Socket.IO client
- **Persistence:** JSON file (`server/state/game.json`)
- **Network:** WebSocket via Socket.IO, LAN-only (0.0.0.0:3000)

---

## Setup

**Backend:**
```bash
cd server
npm install
npx tsx src/server.ts
# → http://localhost:3000  (or http://<your-ip>:3000 for other devices)
```

**Frontend** (dev only, with hot reload):
```bash
cd client
npm install
npm run dev
# → http://localhost:5173
```

**Production build** (backend serves the frontend):
```bash
cd client && npm run build
```

**Reset game state:**
```bash
cd server && npm run game-reset
```

Find your IP: `ifconfig | grep "inet " | grep -v 127.0.0.1`

---

## Architecture

All game logic is server-side. Clients only emit events; the server validates, updates state, and broadcasts `STATE_UPDATE` to everyone.

**Player identity:** Player *name* is the stable identifier — socket ID changes on every reconnect. The server calls `rejoinPlayerByName()` to re-attach a new socket to an existing player.

**Version UUID:** On each server start a new UUID is stored in `game.version`. The frontend compares this against localStorage on reconnect — a mismatch means the server was reset, so old localStorage data is cleared automatically.

---

## Socket Events

**Client → Server:**
| Event | Description |
|---|---|
| `JOIN` | Join or rejoin the game by name |
| `CLAIM_ENTREPRENEUR` | Select an entrepreneur color |
| `SPEND` | Deduct money from your balance |
| `LOAN` | Add money to your balance |
| `UNDO` | Revert the last action |
| `END_TURN` | Pass turn to the next player |
| `END_ROUND` | Advance to the next round |
| `START_GAME` | Initialize turn order and begin |

**Server → Client:**
| Event | Description |
|---|---|
| `STATE_UPDATE` | Full game state broadcast to all clients on every change |
| `REJECT_ACTION` | Sent only to the requester when an action fails |
