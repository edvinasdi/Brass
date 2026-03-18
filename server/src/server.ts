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
