<template>
  <div class="lobby">
    <h1>Brass: Birmingham</h1>
    <h2>Money Tracker</h2>

    <div v-if="!playerJoined" class="join-section">
      <div class="form-group">
        <label>Your Name:</label>
        <input
          v-model="playerName"
          type="text"
          placeholder="Enter your name"
          @keyup.enter="join"
        />
      </div>
      <button @click="join" :disabled="!playerName.trim()">Join Game</button>
    </div>

    <div v-else class="entrepreneur-selection">
      <h3>Choose Your Entrepreneur</h3>
      <div class="entrepreneur-grid">
        <button
          v-for="color in colors"
          :key="color"
          class="entrepreneur-btn"
          :class="[`color-${color}`, { selected: myEntrepreneur === color }]"
          :disabled="isTaken(color)"
          @click="claimEntrepreneur(color)"
        >
          <span class="circle"></span>
          {{ capitalizeColor(color) }}
        </button>
      </div>

      <div class="players-list">
        <h4>Players:</h4>
        <ul>
          <li
            v-for="player in gameState.players"
            :key="player.playerId"
            class="player-item"
          >
            <span>{{ player.name }}</span>
            <span v-if="player.entrepreneur" class="entrepreneur">
              {{ capitalizeColor(player.entrepreneur) }}
            </span>
            <span v-else class="waiting">(waiting...)</span>
          </li>
        </ul>
      </div>

      <button
        v-if="allPlayersReady && !gameStarted && amIAdmin"
        class="start-btn"
        @click="startGame"
      >
        Start Game (All Ready)
      </button>
      <button
        v-else-if="gameState.players.length > 0 && myEntrepreneur && !gameStarted && amIAdmin"
        class="start-btn"
        @click="startGame"
      >
        Start Game (Me Only)
      </button>
      <div v-else-if="!gameStarted" class="waiting-text">
        {{ gameState.players.length === 0 ? "Waiting for players..." : myEntrepreneur && !amIAdmin ? "Waiting for host to start..." : "Choose your entrepreneur to start" }}
      </div>
      
      <div class="debug-info">
        <small>Players: {{ gameState.players.length }} | Chosen: {{ myEntrepreneur || 'none' }} | TurnOrder: {{ gameState.turnOrder.length }}</small>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import type { Game, Entrepreneur } from "../types";

interface Props {
  gameState: Game;
  playerId: string;
}

interface Emits {
  (e: "join", name: string): void;
  (e: "claim-entrepreneur", entrepreneur: string): void;
  (e: "start-game"): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const playerName = ref("");
const playerJoined = ref(false);
const myEntrepreneur = ref<Entrepreneur | null>(null);

const colors: Entrepreneur[] = ["red", "blue", "yellow", "purple"];

// On mount, check if we're rejoining an existing player
onMounted(() => {
  const savedName = localStorage.getItem("playerName");
  const savedEntrepreneur = localStorage.getItem("playerEntrepreneur");
  
  if (savedName) {
    playerName.value = savedName;
    playerJoined.value = true;
    if (savedEntrepreneur) {
      myEntrepreneur.value = savedEntrepreneur as Entrepreneur;
    }
  }
});

function join() {
  if (!playerName.value.trim()) return;
  emit("join", playerName.value);
  playerJoined.value = true;
}

function claimEntrepreneur(entrepreneur: Entrepreneur) {
  emit("claim-entrepreneur", entrepreneur);
  myEntrepreneur.value = entrepreneur;
}

function isTaken(entrepreneur: Entrepreneur): boolean {
  // Check if taken by OTHER players (allow player to keep their own selection)
  return props.gameState.players.some(
    (p) => p.entrepreneur === entrepreneur && p.entrepreneur !== myEntrepreneur.value
  );
}

function capitalizeColor(color: string): string {
  return color.charAt(0).toUpperCase() + color.slice(1);
}

const allPlayersReady = computed(() => {
  return (
    props.gameState.players.length > 0 &&
    props.gameState.players.every((p) => p.entrepreneur !== null)
  );
});

const amIAdmin = computed(() => {
  return props.gameState.players.find((p) => p.playerId === props.playerId)?.isAdmin ?? false;
});

const gameStarted = computed(() => {
  return props.gameState.turnOrder.length > 0;
});

function startGame() {
  emit("start-game");
}
</script>

<style scoped>
.lobby {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 2rem;
  text-align: center;
}

h1 {
  font-size: 3rem;
  margin-bottom: 0.5rem;
  color: #c9a84c;
  font-family: 'Cinzel', serif;
}

h2 {
  font-size: 1.5rem;
  margin-bottom: 2rem;
  color: #a09070;
  font-family: 'Cinzel', serif;
}

.join-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  width: 100%;
  max-width: 300px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

label {
  text-align: left;
}

.entrepreneur-selection {
  display: flex;
  flex-direction: column;
  gap: 2rem;
  width: 100%;
  max-width: 400px;
}

h3 {
  font-size: 1.5rem;
  font-family: 'Cinzel', serif;
  color: #c9a84c;
}

.entrepreneur-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.entrepreneur-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 1rem;
  font-size: 1rem;
  border: 2px solid #5c3d1e;
  border-radius: 8px;
  background: #1e1a14;
  color: #f0e8d8;
  cursor: pointer;
  transition: all 0.2s;
  font-family: 'Cinzel', serif;
}

.entrepreneur-btn .circle {
  width: 20px;
  height: 20px;
  border-radius: 50%;
}

.color-red .circle {
  background: #e74c3c;
}

.color-blue .circle {
  background: #3498db;
}

.color-yellow .circle {
  background: #f39c12;
}

.color-purple .circle {
  background: #9b59b6;
}

.entrepreneur-btn:hover:not(:disabled) {
  border-color: #c9a84c;
}

.entrepreneur-btn.selected {
  border-color: #c9a84c;
  background: #2a2218;
}

.entrepreneur-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.players-list {
  text-align: left;
}

h4 {
  margin-bottom: 0.5rem;
  font-family: 'Cinzel', serif;
  color: #a09070;
}

.players-list ul {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.player-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem;
  background: #1e1a14;
  border-radius: 4px;
  border: 1px solid #3d2a0e;
}

.entrepreneur {
  margin-left: 0.5rem;
  font-weight: bold;
}

.waiting {
  color: #999;
  font-style: italic;
}

.start-btn {
  background: #1e5c38;
  margin-top: 1rem;
  font-family: 'Cinzel', serif;
}

.start-btn:hover {
  background: #17472c;
}

.waiting-text {
  color: #8a7060;
  font-style: italic;
}

.debug-info {
  margin-top: 2rem;
  padding: 1rem;
  background: #161210;
  border-radius: 4px;
  color: #5a4a30;
  font-size: 0.85rem;
  text-align: center;
}
</style>
