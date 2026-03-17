# Brass: Birmingham Money Tracker

A LAN-based companion web app for Brass: Birmingham board game. Players join via browser and track their money, spend/loan actions, and game progression in real-time across multiple devices.

**Status:** Functional but buggy. Use this document to understand the architecture and known issues before making changes.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Setup & Running](#setup--running)
- [Known Issues](#known-issues)
- [Code Structure](#code-structure)
- [Socket.IO Protocol](#socketio-protocol)
- [Development Tips](#development-tips)
- [Maintenance Notes](#maintenance-notes)

---

## Overview

### What It Does
- Players connect via web browser on the same local network
- Join games by entering a player name
- Select entrepreneur color (red, blue, yellow, purple)
- Track money, spending, loans, and undo actions during gameplay
- Real-time synchronization across all connected players
- Persistent game state (survives server crashes)
- Automatic player rejoin on page refresh without creating duplicates

### Tech Stack
- **Backend:** Node.js + TypeScript + Express + Socket.IO
- **Frontend:** Vue 3 + TypeScript + Vite + Socket.IO client
- **Persistence:** JSON file (`server/state/game.json`)
- **Network:** WebSocket via Socket.IO, LAN-only (0.0.0.0:3000)

---

## Architecture

### Server-Authoritative Design

All game logic runs on the backend. **Clients ONLY emit events**; they never validate or compute state. This prevents cheating and keeps state consistent.

```
Client sends action → Server validates → Server updates gameState → 
Server broadcasts STATE_UPDATE to ALL clients → All clients render new state
```

Command architecture:
1. User clicks button in frontend
2. Frontend emits Socket.IO event with action data
3. Server receives event in `socketHandlers.ts`
4. Server calls validation + game logic in `gameState.ts`
5. If valid: update state, broadcast STATE_UPDATE
6. If invalid: emit REJECT_ACTION to that client
7. All clients update their UI based on new state

### Game State Model

**Complete Game State** (`server/src/types.ts`):
```typescript
interface Game {
  version: string                    // UUID - changes on each server restart
  players: Player[]                  // All players in session
  turnOrder: string[]               // Array of player IDs (order matters)
  currentTurn: string               // ID of player whose turn it is
  round: number                     // Game round (1-3)
  phase: "canal" | "rail"          // Current phase
  actionHistory: Action[]           // Complete move log for undo
}
```

**Player:**
```typescript
interface Player {
  id: string                         // Socket ID (⚠️ changes on reconnect!)
  name: string                       // Player name (✅ stable identifier)
  entrepreneur: "red" | "blue" | "yellow" | "purple" | null
  money: number                      // Current money amount
  spent: number                      // Amount spent this round
  connected: boolean                 // Is socket currently connected
}
```

### Version-Based State Management (CRITICAL)

When the **server restarts**, it generates a new UUID in `game.version`.

Frontend stores this version in localStorage and compares it on each `STATE_UPDATE`:

```
Version MATCH → Same session, rejoin existing player
Version MISMATCH → Server reset detected, clear old data
```

**Why this matters:**
- Without versioning: player reopens page after server crash, gets old localStorage data, causes duplicates
- With versioning: GUID changes on restart, old data is automatically invalidated ✅

**Current Flow:**
1. Server starts → generates `randomUUID()` as game.version
2. Frontend connects, gets STATE_UPDATE with version
3. Frontend stores version in `localStorage.setItem("gameVersion", version)`
4. On page refresh: compare saved version with new STATE_UPDATE
5. Mismatch? Clear localStorage: `localStorage.removeItem("playerName")` etc.

---

## Setup & Running

### Installation

```bash
# Backend setup
cd server
npm install

# Frontend setup
cd ../client
npm install
```

### Running Locally

**Terminal 1 - Backend:**
```bash
cd server
npx tsx src/server.ts           # Dev mode (watch mode available)
# Output should show:
# Created new game state
# Server listening on port 3000
# Connect to http://localhost:3000
```

**Terminal 2 - Frontend (optional, for dev):**
```bash
cd client
npm run dev                     # Dev server on localhost:5173 (hot reload)
```

**Access the app:**
- **Same machine:** http://localhost:3000
- **Other devices:** http://<your-ip>:3000 (replace with actual IP like 192.168.1.5)

### Production Build

```bash
# Build frontend to dist/
cd client
npm run build

# Backend automatically serves built files from ../client/dist/
cd ../server
npx tsx src/server.ts
```

### Reset Game State

```bash
cd server
npm run game-reset              # Deletes game.json and version (fresh start)
```

---

## Known Issues

### 🔴 #1: Entrepreneur Selection After Refresh (FIXED)

**What was happening:**
- After selecting an entrepreneur and refreshing, you couldn't select a different one
- "Entrepreneur already taken" error on every attempt

**Root cause:**
- Old `playerEntrepreneur` was stored in localStorage
- On rejoin, frontend auto-emitted `CLAIM_ENTREPRENEUR` with old value
- This locked the player's entrepreneur before they could manually select

**Fix applied:**
- Removed auto-claim logic from rejoin (removed `socket.emit("CLAIM_ENTREPRENEUR", {...})`)
- Now only auto-rejoin the player, not their entrepreneur selection
- User must manually select entrepreneur after rejoining

**How to test:**
```javascript
// Browser DevTools Console, then refresh:
localStorage.clear()
```

---

### 🟡 #2: Socket ID Changes on Every Connection

**What you see in server logs:**
```
Player connected: lnHsLTQYoHRn2hDrAAAB
Player disconnected: lnHsLTQYoHRn2hDrAAAB
Player connected: aBZ6UMDeKoVZVKaBAAAD
↻ Player rejoined: first
```

**Is this a problem?** NO - this is correct and expected.

**Why it happens:**
- Socket IDs are tied to the TCP WebSocket connection, not player identity
- When you refresh the browser, the old connection is terminated and a new one is created
- Each new connection gets a new socket ID

**The fix:** Use **player name** as the real identifier (stable across reconnects)
```typescript
// Bad: relying on socket.id
const player = game.players.find(p => p.id === socket.id)

// Good: use name to rejoin
const player = game.players.find(p => p.name === name)
```

Server correctly handles this by calling `rejoinPlayerByName(newSocketId, name)` which updates the old player's socket ID to the new one.

---

### 🟡 #3: State Updates Constant Broadcasting

**What happens:**
- Every action (spend, loan, undo) triggers STATE_UPDATE to ALL clients
- Can result in console spam of `📡 STATE_UPDATE received`

**Is this a problem?** NO - working as designed but verbose.

**Why it's needed:**
- All clients must stay in sync
- Only way to know about other players' actions is via broadcast
- Internet latency means you need full state, not diffs

**If it's bothering you:**
- Reduce console.log severity in `App.vue` STATE_UPDATE handler
- Or filter logs: `console.log` only shows at specific intervals

---

### 🟡 #4: Rapid Connect/Disconnect Spam

**Symptom:**
```
Player connected: ID1
Player disconnected: ID1
Player connected: ID2
Player disconnected: ID2
```

**Causes:**
1. Old corrupted `server/state/game.json` with invalid player data
2. Frontend error crashing Socket.IO connection
3. Frontend trying to rejoin repeatedly

**Fix:**
```bash
# Clear corrupted state
rm /Users/Edvin/Projects/Brass/server/state/game.json

# Clear browser state
# DevTools → Application → Local Storage → Clear all

# Restart server
npx tsx src/server.ts
```

---

## Code Structure

```
Brass/
├── server/
│   ├── src/
│   │   ├── types.ts              # ⭐ TypeScript interfaces
│   │   ├── gameState.ts          # ⭐ Game logic & state mutations
│   │   ├── socketHandlers.ts     # Network event handlers
│   │   ├── persistence.ts        # Save/load game.json
│   │   └── server.ts             # Express app setup
│   ├── state/
│   │   └── game.json             # Persisted state (auto-created)
│   ├── package.json
│   └── tsconfig.json
│
├── client/
│   ├── src/
│   │   ├── main.ts               # Vue app init
│   │   ├── App.vue               # ⭐ Root (Socket.IO client, routing)
│   │   ├── types.ts              # ⭐ TypeScript (must match server)
│   │   ├── components/
│   │   │   ├── Lobby.vue         # Join screen + entrepreneur select
│   │   │   └── Game.vue          # Gameplay UI
│   │   └── styles.css
│   ├── dist/                     # Built files (backend serves these)
│   ├── vite.config.ts
│   └── package.json
│
└── README.md
```

**Files marked ⭐ are most important for understanding the code.**

---

## Socket.IO Protocol

### Events: Client → Server

**JOIN** - Player enters game
```typescript
socket.emit("JOIN", { name: string })
```
- Server: Tries `rejoinPlayerByName()` → if fails, creates new player
- Broadcast: STATE_UPDATE to all clients

**CLAIM_ENTREPRENEUR** - Player selects color
```typescript
socket.emit("CLAIM_ENTREPRENEUR", { entrepreneur: "red" | "blue" | "yellow" | "purple" })
```
- Server: Check no one else has it, assign to player
- Rejects: "Entrepreneur already taken"
- Broadcast: STATE_UPDATE

**SPEND** - Deduct money
```typescript
socket.emit("SPEND", { amount: number })
```
- Validates: Player's turn, has funds
- Updates: player.spent += amount, player.money -= amount
- Logs: Added to actionHistory

**LOAN** - Take a loan
```typescript
socket.emit("LOAN", { amount: number })
```
- Validates: Player's turn
- Updates: player.money += amount
- Logs: Added to actionHistory

**UNDO** - Revert last action
```typescript
socket.emit("UNDO")
```
- Pops last entry from actionHistory
- Applies reverse mutation (spend becomes add, etc.)

**END_TURN** - Next player
```typescript
socket.emit("END_TURN")
```
- Advances currentTurn to next player in turnOrder
- Resets player.spent to 0

**END_ROUND** - Next round
```typescript
socket.emit("END_ROUND")
```
- Increments round
- Resets all player.spent to 0
- Reorders turnOrder

**START_GAME** - Initialize game
```typescript
socket.emit("START_GAME")
```
- Checks: All players claimed entrepreneurs
- Initializes: turnOrder, currentTurn, actionHistory

### Events: Server → Client

**STATE_UPDATE** - New state snapshot
```typescript
socket.on("STATE_UPDATE", (state: Game) => ...)
```
- Broadcast to ALL clients on any state change
- Frontend: Stores version, updates gameState, rerenders

**REJECT_ACTION** - Action failed
```typescript
socket.on("REJECT_ACTION", { reason: string })
```
- Sent only to requesting client
- Frontend: Shows error alert

---

## Development Tips

### Debugging Checklist

**Server not working?**
```bash
# Is it running?
curl -s http://localhost:3000/api/status | jq .

# Check logs in terminal
# Look for: "Server listening on port 3000"
# or: "Error: listen EADDRINUSE ..." (port already in use)
```

**Frontend not connecting?**
```javascript
// Browser DevTools Console
// Should show:
// ✓ Connected to server: [socket-id]
// 📡 STATE_UPDATE received, players: 1
```

**Entrepreneur not selectable?**
```javascript
localStorage.clear()  // Clear old data
location.reload()     // Refresh
```

**Multiple players needed for testing?**
```bash
# Option 1: Multiple browser tabs (WARNING: they share localStorage!)
# Option 2: Private/incognito window
# Option 3: Different browser entirely
# Option 4: Multiple devices on same network (best)
```

### Adding a New Action

Example: Add HALVE_MONEY action

**1. Backend logic** (`server/src/gameState.ts`):
```typescript
halveMoney(playerId: string): boolean {
  const player = this.game.players.find(p => p.id === playerId);
  if (!player) return false;
  player.money = Math.floor(player.money / 2);
  this.logAction("HALVE_MONEY", playerId, { newMoney: player.money });
  return true;
}
```

**2. Socket handler** (`server/src/socketHandlers.ts`):
```typescript
socket.on("HALVE_MONEY", () => {
  const success = gameState.halveMoney(socket.id);
  if (!success) {
    socket.emit("REJECT_ACTION", { reason: "Invalid player" });
    return;
  }
  io.emit("STATE_UPDATE", gameState.getGame());
});
```

**3. Frontend call** (`client/src/App.vue`):
```typescript
function handleHalfeMoney() {
  try {
    socket.emit("HALVE_MONEY");
  } catch (err) {
    console.error("Error:", err);
    error.value = "Failed to halve money";
  }
}
```

**4. UI component** (e.g., `Game.vue`):
```vue
<button @click="() => $emit('halve-money')">Halve Money</button>
```

---

## Maintenance Notes

### Critical Invariants (Don't Break These!)

1. **Server is source of truth**
   - Never mutate state on client
   - Always validate server-side
   - Don't trust anything from client

2. **Player name is stable**
   - Socket ID changes on reconnect
   - Use `name` to track "who is this player?"
   - Socket ID only for current connection

3. **Version UUID for garbage collection**
   - Prevents stale localStorage data after crash
   - If you change this logic, old sessions will break (intentional)
   - Generate on server startup, send in STATE_UPDATE

4. **actionHistory powers undo**
   - Every mutation must be logged
   - Undo pops and reverses it
   - If you forget to log, undo breaks

5. **Broadcast STATE_UPDATE always**
   - After every mutation, call `io.emit("STATE_UPDATE", gameState.getGame())`
   - Re-renders all clients
   - Don't skip this or clients go out of sync!

### Files to Update in Sync

When adding new game mechanics:
- `server/src/types.ts` - Add interface fields
- `client/src/types.ts` - **Must match!** Easy to forget
- `server/src/gameState.ts` - Logic
- `server/src/socketHandlers.ts` - Event handler
- `client/src/components/Game.vue` - UI to trigger it

### Troubleshooting Workflow

```
Q: Player can't take action
A: 
  1. Check server logs for "Action rejected: {reason}"
  2. Check browser console for "❌ Action rejected"
  3. Verify action validation in gameState.ts matches expectations
  4. Check who's turn it is: turnOrder[currentTurn]
  
Q: State out of sync between clients
A:
  1. Did you forget io.emit("STATE_UPDATE", ...) in handler?
  2. Is there a TypeScript error in socketHandlers.ts?
  3. Try clear + restart: delete game.json, server restart

Q: Can't join game
A:
  1. Server running? curl http://localhost:3000/api/status
  2. Frontend built? cd client && npm run build
  3. Browser console errors? Check DevTools
  4. Clear localStorage: localStorage.clear()
  
Q: Rapid connect/disconnect spam
A:
  1. Delete game.json: rm server/state/game.json
  2. Clear browser: localStorage.clear()
  3. Restart server and refresh page
```

### Testing New Features

```bash
# 1. Rebuild frontend
cd client && npm run build

# 2. Restart server
pkill -f "npx tsx"
cd server && npx tsx src/server.ts

# 3. Test cycle
# Open browser (or multiple browsers)
# Clear localStorage if needed
# Test your feature
# Check server logs
# Check browser console
```

---

## Future Improvements

### Must Have
- [ ] Prevent selecting already-claimed entrepreneur (backend validates but UI should show)
- [ ] Turn order display ("It's Alice's turn")
- [ ] Confirmation dialogs for destructive actions
- [ ] Mobile UI polish (buttons too small, text too cramped)
- [ ] Better error messages (show on screen, not just alert)

### Nice to Have
- [ ] Action history visible timeline
- [ ] Floating "$X" animations when spending
- [ ] Sound effects (money, turn change)
- [ ] Host controls (force end turn, remove player)
- [ ] Spectator mode (join but not play)

### Low Priority
- [ ] Dark mode
- [ ] Player customization (avatars, colors)
- [ ] Game timer (turn limits)
- [ ] Export game log (JSON)
- [ ] Restart game button (without full reset)

---

## Common Gotchas for New Developers

### ⚠️ Gotcha #1: Forgetting Server Restart

"I updated socketHandlers.ts but nothing changed!"

→ Frontend is already built and cached. Must restart server AND rebuild frontend.

```bash
npm run build  # in client/
# Then restart server
```

### ⚠️ Gotcha #2: Type Mismatch

Added field to `server/src/types.ts` but frontend doesn't know about it.

→ **Must also update** `client/src/types.ts` to match exactly. TypeScript won't catch this if you use `any`.

### ⚠️ Gotcha #3: Missing STATE_UPDATE Broadcast

Added a new action handler but forgot to call `io.emit("STATE_UPDATE", ...)`

→ Only the requesting client gets response. Other clients never see the change. Looks like the action failed.

### ⚠️ Gotcha #4: LocalStorage Name Collision

If you use `localStorage.setItem("data", ...)` but browser also uses "data" for something else, you'll collide.

→ Use prefixes: `localStorage.setItem("brass_playerName", ...)` 

### ⚠️ Gotcha #5: Socket.ID vs Player.Name

"Why is player ID changing constantly?"

→ Socket ID changes per connection. Use player **NAME** as stable identifier. Check `rejoinPlayerByName()` to see the pattern.

---

## Questions for Code Review

Before merging new features, ask:

- [ ] Does server validate **all** inputs? (Don't trust client)
- [ ] Is state logged in actionHistory for undo?
- [ ] Does the handler call `io.emit("STATE_UPDATE", ...)`?
- [ ] Did I update types in **both** server and client?
- [ ] Does the frontend error handling catch failures?
- [ ] Did I test with multiple clients?
- [ ] Does reconnect still work (version check)?

---

## License

(Add as needed)

---

**Last Updated:** March 2026  
**Status:** Functional, known bugs documented  
**Maintainer Notes:** This is a work-in-progress companion app. Expect bugs; use this README to understand them and how to fix them.


5. **Find your Mac's IP**:
   ```bash
   ifconfig | grep "inet " | grep -v 127.0.0.1
   ```

6. **Join on phones**:
   - Open browser
   - Navigate to `http://<YOUR_MAC_IP>:3000`
   - Enter name and choose entrepreneur

## Development

- **Frontend dev server**: `cd client && npm run dev` (port 5173)
- **Backend**: `cd server && npm run dev`

Both run with hot-reload.

## Project Structure

```
brass-money/
├── server/              # Node.js + Express + Socket.IO
│   ├── src/
│   │   ├── server.ts
│   │   ├── gameState.ts
│   │   ├── socketHandlers.ts
│   │   ├── persistence.ts
│   │   └── types.ts
│   └── state/           # JSON persistence
│
├── client/              # Vue 3 + Vite
│   ├── src/
│   │   ├── App.vue
│   │   ├── components/
│   │   │   ├── Lobby.vue
│   │   │   └── Game.vue
│   │   └── types.ts
│   └── dist/            # Built frontend
```

## API Events

### Client → Server

- `JOIN` - Player joins lobby
- `CLAIM_ENTREPRENEUR` - Select color
- `SPEND` - Spend money
- `LOAN` - Take loan
- `UNDO` - Undo last action
- `END_TURN` - Next player's turn
- `START_GAME` - Begin round 1

### Server → Client

- `STATE_UPDATE` - Full game state (sent on every action + reconnect)
- `REJECT_ACTION` - Action validation failed

## Roadmap

- [x] Project setup
- [x] Backend server (join, entrepreneur selection, spend/loan)
- [x] Frontend (Lobby, Game views)
- [x] Socket.IO client sync
- [ ] Host dashboard (view all players, history, undo)
- [ ] End round + turn reordering
- [ ] Animations
- [ ] Mobile UI polish

## License

ISC
