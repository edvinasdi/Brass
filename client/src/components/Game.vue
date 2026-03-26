<template>
  <div class="game">
    <SpendOverlay
      :visible="showSpend"
      :balance="myBalance"
      @confirm="handleSpend"
      @cancel="showSpend = false"
    />

    <div class="top-bar">
      <span v-if="isMyTurn" class="turn-label my-turn">YOUR TURN</span>
      <span v-else class="turn-label">{{ getPlayerName(gameState.currentTurn).toUpperCase() }}'S TURN</span>
    </div>

    <div class="player-list">
      <div
        v-for="player in gameState.players"
        :key="player.playerId"
        class="player-card"
        :style="player.playerId === gameState.currentTurn ? { borderColor: entrepreneurColor(player.entrepreneur), borderWidth: '2px', borderStyle: 'solid' } : {}"
      >
        <div class="card-left">
          <span class="entrepreneur-dot" :style="{ background: entrepreneurColor(player.entrepreneur) }"></span>
          <div class="player-name-block">
            <span class="player-name">{{ player.name.toUpperCase() }}</span>
            <span v-if="player.playerId === playerId" class="you-label">(you)</span>
          </div>
        </div>
        <div class="card-right">
          <span class="player-money">£{{ player.money }}</span>
        </div>
      </div>
    </div>

    <div class="bottom-bar">
      <button class="bar-btn spend-btn" :disabled="!isMyTurn" @click="showSpend = true">SPEND</button>
      <button class="bar-btn undo-btn" :disabled="!isMyTurn || gameState.actionHistory.length === 0" @click="undo">↩</button>
      <button class="bar-btn loan-btn" :disabled="!isMyTurn" @click="takeLoan">LOAN +£30</button>
      <button class="bar-btn end-turn-btn" :disabled="!isMyTurn" @click="endTurn">END TURN</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import type { Game, Entrepreneur } from "../types";
import SpendOverlay from "./SpendOverlay.vue";

interface Props {
  gameState: Game;
  playerId: string;
}

interface Emits {
  (e: "spend", amount: number): void;
  (e: "loan", amount: number): void;
  (e: "undo"): void;
  (e: "end-turn"): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const showSpend = ref(false);

const isMyTurn = computed(() => {
  return props.gameState.currentTurn === props.playerId;
});

const myBalance = computed(() => {
  const me = props.gameState.players.find((p) => p.playerId === props.playerId);
  return me ? me.money : 0;
});

const ENTREPRENEUR_COLORS: Record<Entrepreneur, string> = {
  red: "#e8453c",
  blue: "#3a86ff",
  yellow: "#f4a62a",
  purple: "#9b5de5",
};

function entrepreneurColor(e: Entrepreneur | null): string {
  return e ? ENTREPRENEUR_COLORS[e] : "#666";
}

function getPlayerName(playerId: string): string {
  const player = props.gameState.players.find((p) => p.playerId === playerId);
  return player ? player.name : "Unknown";
}

function handleSpend(amount: number) {
  emit("spend", amount);
  showSpend.value = false;
}

function takeLoan() {
  emit("loan", 30);
}

function undo() {
  emit("undo");
}

function endTurn() {
  emit("end-turn");
}
</script>

<style scoped>
.game {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #0f0b08;
}

/* ── Top bar ────────────────────────────────────────────── */
.top-bar {
  flex-shrink: 0;
  padding: 0.6rem 1.25rem;
  background: #0f0b08;
  border-bottom: 1px solid #3d2a0e;
  text-align: right;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.08em;
}

.turn-label {
  color: #7a6040;
  font-family: 'Cinzel', serif;
}

.turn-label.my-turn {
  color: #c9a84c;
}

/* ── Player list ────────────────────────────────────────── */
.player-list {
  flex: 1;
  overflow-y: auto;
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.player-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.25rem;
  background: #1e1a14;
  border-radius: 8px;
  border: 1px solid #3d2a0e;
  transition: border-color 0.15s;
}

.card-left {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.entrepreneur-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.player-name-block {
  display: flex;
  align-items: baseline;
  gap: 0.4rem;
}

.player-name {
  font-size: 0.85rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  color: #d4c5a9;
  font-family: 'Cinzel', serif;
}

.you-label {
  font-size: 0.7rem;
  color: #5a4a30;
  font-style: italic;
}

.card-right {
  font-size: 1.4rem;
  font-weight: 700;
  color: #e8d5a3;
  font-family: 'Cinzel', serif;
}

/* ── Bottom bar ─────────────────────────────────────────── */
.bottom-bar {
  flex-shrink: 0;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  grid-template-areas:
    "spend spend spend spend"
    "undo loan loan end-turn";
  gap: 0.5rem;
  padding: 0.75rem;
  background: #0f0b08;
  border-top: 1px solid #3d2a0e;
}



.bar-btn {
  padding: 1.25rem 0.5rem;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  border-radius: 6px;
  border: none;
  cursor: pointer;
  transition: background 0.15s;
  font-family: 'Cinzel', serif;
}

.bar-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.spend-btn {
  grid-area: spend;
  background: #c9a84c;
  color: #0f0b08;
}

.spend-btn:not(:disabled):hover {
  background: #d4b660;
}

.loan-btn {
  grid-area: loan;
  background: #1e1a14;
  color: #d4c5a9;
  border: 1px solid #5c3d1e;
}

.loan-btn:not(:disabled):hover {
  background: #2a2218;
}

.undo-btn {
  grid-area: undo;
  background: #1e1a14;
  color: #d4c5a9;
  border: 1px solid #5c3d1e;
  font-size: 1rem;
}

.undo-btn:not(:disabled):hover {
  background: #2a2218;
}

.end-turn-btn {
  grid-area: end-turn;
  background: #1e3a5f;
  color: #c5d8f0;
}

.end-turn-btn:not(:disabled):hover {
  background: #162d4a;
}
</style>
