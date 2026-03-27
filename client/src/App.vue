<template>
  <Connect v-if="isConnectPage" />
  <div v-else class="app">
    <div v-if="error" class="error-screen">
      <h1>❌ Error</h1>
      <p>{{ error }}</p>
      <pre>{{ errorDetails }}</pre>
      <button @click="resetError">Try Again</button>
    </div>
    <div v-else-if="!isConnected" class="loading">
      <div class="spinner"></div>
      <p>Connecting to server...</p>
    </div>
    <Lobby
      v-else-if="gamePhase === 'lobby'"
      @join="handleJoin"
      @claim-entrepreneur="handleClaimEntrepreneur"
      @start-game="handleStartGame"
      :game-state="gameState"
      :player-id="playerId"
    />
    <GameView
      v-else-if="gamePhase === 'game'"
      @spend="handleSpend"
      @loan="handleLoan"
      @undo="handleUndo"
      @end-turn="handleEndTurn"
      @end-round="handleEndRound"
      :game-state="gameState"
      :player-id="playerId"
    />
    <div v-else class="fallback">
      <p>Game phase: {{ gamePhase }}</p>
      <p>Connected: {{ isConnected }}</p>
      <p>Players: {{ gameState.players.length }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from "vue";
import { io } from "socket.io-client";
import type { Socket } from "socket.io-client";
import type { Game } from "./types";
import Lobby from "./components/Lobby.vue";
import GameView from "./components/Game.vue";
import Connect from "./components/Connect.vue";

const isConnectPage = window.location.pathname === "/connect";

const gameState = ref<Game>({
  version: "",
  players: [],
  turnOrder: [],
  currentTurn: "",
  round: 1,
  phase: "canal",
  actionHistory: [],
  roundEnded: false,
});

const playerId = ref<string>("");
const gamePhase = ref<"lobby" | "game">("lobby");
const isConnected = ref(false);
const error = ref<string | null>(null);
const errorDetails = ref<string>("");
const gameVersion = ref<string>("");
let socket: Socket;

onMounted(() => {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const host = window.location.hostname;
  const port = window.location.port || (protocol === "wss:" ? "443" : "80");
  const socketUrl = `${protocol}//${host}:${port}`;

  socket = io(socketUrl, {
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: 5,
  });

  socket.on("connect", () => {
    isConnected.value = true;
    console.log("✓ Connected to server, socket ID:", socket.id);

    // Auto-rejoin if we have a saved player name (on initial join OR reconnect)
    const savedPlayerName = localStorage.getItem("playerName");
    const savedVersion = localStorage.getItem("gameVersion");
    if (savedPlayerName) {
      console.log("↻ Trying to rejoin as:", savedPlayerName);
      socket.emit("JOIN", { playerName: savedPlayerName, playerVersion: savedVersion ?? undefined });
    }
  });

  socket.on("PLAYER_JOINED", (payload: { playerName: string; playerId: string, gameVersion: string }) => {
    playerId.value = payload.playerId;
    localStorage.setItem("playerName", payload.playerName);
    console.log(`✓ Player confirmed joined as: ${payload.playerName}, ID: ${playerId.value}`);
  });

  socket.on("STATE_UPDATE", (state: Game) => {
    try {
      const savedVersion = localStorage.getItem("gameVersion");

      if (savedVersion && savedVersion !== state.version) {
        localStorage.removeItem("playerName");
        localStorage.removeItem("playerEntrepreneur");
        localStorage.setItem("gameVersion", state.version);
        gameVersion.value = state.version;
        gameState.value = state;
        return;
      }

      localStorage.setItem("gameVersion", state.version);

      gameVersion.value = state.version;
      gameState.value = state;
    } catch (err) {
      console.error("❌ Error in STATE_UPDATE handler:", err);
      error.value = `Game state update failed: ${err instanceof Error ? err.message : String(err)}`;
    }
  });

  socket.on("VERSION_MISMATCH", (payload: { version: string }) => {
    console.warn("⚠️ Game version mismatch - server has a new game, clearing old player data");
    localStorage.removeItem("playerName");
    localStorage.removeItem("playerEntrepreneur");
    localStorage.setItem("gameVersion", payload.version);
    playerId.value = "";
  });

  socket.on("REJECT_ACTION", (payload: { reason: string }) => {
    console.error("❌ Action rejected:", payload.reason);
    alert(`Action rejected: ${payload.reason}`);
  });

  socket.on("connect_error", (error: any) => {
    console.error("Connection error:", error);
  });

  socket.on("disconnect", () => {
    isConnected.value = false;
    console.log("Disconnected from server");
  });
});

// Watch for when all players claim entrepreneurs
watch(
  () => gameState.value,
  (state) => {
    try {
      console.log("Game state changed:", state);
      if (
        state.turnOrder.length > 0 &&
        (state.currentTurn || state.roundEnded) &&
        state.players.length > 0
      ) {
        console.log("Switching to game phase");
        gamePhase.value = "game";
      }
    } catch (err) {
      error.value = "Error during transition";
      errorDetails.value = String(err);
    }
  },
  { deep: true }
);

function handleJoin(playerName: string) {
  try {
    socket.emit("JOIN", { playerName: playerName, playerVersion: gameVersion.value || undefined });
  } catch (err) {
    console.error("Error during join:", err);
    error.value = "Failed to join game";
    errorDetails.value = err instanceof Error ? err.message : String(err);
  }
}

function handleClaimEntrepreneur(entrepreneur: string) {
  try {
    console.log("Claiming entrepreneur:", entrepreneur);
    localStorage.setItem("playerEntrepreneur", entrepreneur);
    socket.emit("CLAIM_ENTREPRENEUR", { entrepreneur });
  } catch (err) {
    console.error("Error during claim:", err);
    error.value = "Failed to claim entrepreneur";
    errorDetails.value = err instanceof Error ? err.message : String(err);
  }
}

function handleStartGame() {
  try {
    console.log("Starting game, current state:", gameState.value);
    socket.emit("START_GAME");
  } catch (err) {
    console.error("Error starting game:", err);
    error.value = "Failed to start game";
    errorDetails.value = String(err);
  }
}

function resetError() {
  error.value = null;
  errorDetails.value = "";
}

function handleSpend(amount: number) {
  try {
    socket.emit("SPEND", { amount });
  } catch (err) {
    console.error("Error spending:", err);
    error.value = "Failed to spend money";
    errorDetails.value = err instanceof Error ? err.message : String(err);
  }
}

function handleLoan(amount: number) {
  try {
    socket.emit("LOAN", { amount });
  } catch (err) {
    console.error("Error taking loan:", err);
    error.value = "Failed to take loan";
    errorDetails.value = err instanceof Error ? err.message : String(err);
  }
}

function handleUndo() {
  try {
    socket.emit("UNDO");
  } catch (err) {
    console.error("Error undoing:", err);
    error.value = "Failed to undo";
    errorDetails.value = err instanceof Error ? err.message : String(err);
  }
}

function handleEndTurn() {
  try {
    socket.emit("END_TURN");
  } catch (err) {
    console.error("Error ending turn:", err);
    error.value = "Failed to end turn";
    errorDetails.value = err instanceof Error ? err.message : String(err);
  }
}

function handleEndRound() {
  try {
    socket.emit("END_ROUND");
  } catch (err) {
    console.error("Error starting next round:", err);
    error.value = "Failed to start next round";
    errorDetails.value = err instanceof Error ? err.message : String(err);
  }
}
</script>

<style scoped>
.app {
  width: 100%;
  height: 100%;
}

.loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 2rem;
}

.spinner {
  width: 50px;
  height: 50px;
  border: 4px solid #444;
  border-top-color: #007bff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.loading p {
  font-size: 1.2rem;
  color: #aaa;
}

.debug {
  font-size: 0.9rem;
  color: #666;
  font-family: monospace;
  max-width: 400px;
  word-break: break-word;
}

.error-screen {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 1rem;
  padding: 2rem;
  text-align: center;
}

.error-screen h1 {
  color: #e74c3c;
}

.error-screen pre {
  background: #222;
  padding: 1rem;
  border-radius: 4px;
  max-width: 600px;
  overflow-x: auto;
  text-align: left;
  font-size: 0.8rem;
  color: #aaa;
}

.error-screen button {
  padding: 0.75rem 1.5rem;
  background: #007bff;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  color: white;
}

.fallback {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 1rem;
  color: #aaa;
}
</style>
