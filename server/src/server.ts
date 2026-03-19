import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import path from "path";
import { getConnectionInfo } from "./connectionInfo.js";
import { GameState } from "./gameState.js";
import { setupSocketHandlers } from "./socketHandlers.js";
import { loadGameState, saveGameState } from "./persistence.js";

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// Initialize game state
let gameState: GameState;
const savedState = loadGameState();

if (savedState) {
  gameState = GameState.fromJSON(savedState);
  console.log("Loaded game state from disk");
} else {
  gameState = new GameState();
  console.log("Created new game state");
}

// Middleware
const clientDistPath = path.join(process.cwd(), "..", "client", "dist");
app.use(express.static(clientDistPath));
app.use(express.json());

// Setup Socket.IO handlers
setupSocketHandlers(io, gameState);

// Subscribe to state changes and persist (set up once, not per connection)
io.on("state_change", () => {
  saveGameState(gameState.getGame());
});

// Simple route to check server status
app.get("/api/status", (req, res) => {
  res.json({
    status: "ok",
    game: gameState.getGame(),
  });
});

app.post("/api/set-admin", (req, res) => {
  const remoteAddress = req.socket.remoteAddress;
  const localhostAddresses = ["127.0.0.1", "::1", "::ffff:127.0.0.1"];
  if (!remoteAddress || !localhostAddresses.includes(remoteAddress)) {
    res.status(403).json({ error: "Forbidden: localhost only" });
    return;
  }

  const { name } = req.body;
  if (!name || typeof name !== "string") {
    res.status(400).json({ error: "Player name is required" });
    return;
  }

  const player = gameState.getPlayerByName(name.trim());
  if (!player) {
    res.status(404).json({ error: `Player "${name}" not found` });
    return;
  }

  gameState.setAdmin(player.playerId);
  io.emit("STATE_UPDATE", gameState.getGame());
  res.json({ success: true, adminPlayer: player.name });
});

const PORT = parseInt(process.env.PORT || "3000", 10);

app.get("/api/connection-info", (req, res) => {
  res.json(getConnectionInfo(PORT));
});

// SPA fallback — must be after all API routes
app.get("*", (req, res) => {
  res.sendFile(path.join(clientDistPath, "index.html"));
});

httpServer.listen(PORT, "0.0.0.0", () => {
  console.log(`Share page:  http://localhost:${PORT}/connect`);
  console.log(`Players join: ${getConnectionInfo(PORT).preferredJoinUrl}`);
  console.log(`Set admin:   npm run set-admin -- --name "YourName"`);
});

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("Saving game state and shutting down...");
  saveGameState(gameState.getGame());
  process.exit(0);
});

// Save state periodically
setInterval(() => {
  saveGameState(gameState.getGame());
}, 5000);
