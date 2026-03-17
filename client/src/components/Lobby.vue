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
        v-if="allPlayersReady && !gameStarted"
        class="start-btn"
        @click="startGame"
      >
        Start Game (All Ready)
      </button>
      <button
        v-else-if="gameState.players.length > 0 && myEntrepreneur && !gameStarted"
        class="start-btn"
        @click="startGame"
      >
        Start Game (Me Only)
      </button>
      <div v-else-if="!gameStarted" class="waiting-text">
        {{ gameState.players.length === 0 ? "Waiting for players..." : "Choose your entrepreneur to start" }}
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
  color: #ffb81c;
}

h2 {
  font-size: 1.5rem;
  margin-bottom: 2rem;
  color: #aaa;
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
  border: 2px solid #444;
  border-radius: 8px;
  background: #2a2a2a;
  color: white;
  cursor: pointer;
  transition: all 0.2s;
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
  border-color: #fff;
}

.entrepreneur-btn.selected {
  border-color: #fff;
  background: #3a3a3a;
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
  background: #2a2a2a;
  border-radius: 4px;
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
  background: #27ae60;
  margin-top: 1rem;
}

.start-btn:hover {
  background: #229954;
}

.waiting-text {
  color: #999;
  font-style: italic;
}

.debug-info {
  margin-top: 2rem;
  padding: 1rem;
  background: #222;
  border-radius: 4px;
  color: #666;
  font-size: 0.85rem;
  text-align: center;
}
</style>
