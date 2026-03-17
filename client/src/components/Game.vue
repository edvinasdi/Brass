<template>
  <div class="game">
    <div class="turn-order-bar">
      <div v-for="(playerId, index) in gameState.turnOrder" :key="playerId" class="turn-item">
        <span v-if="index > 0" class="indicator">|</span>
        <span :class="{ active: gameState.currentTurn === playerId }">
          {{ getPlayerName(playerId) }}
        </span>
      </div>
    </div>

    <div class="main-content">
      <div class="left-panel">
        <div class="round-info">
          <div>Round: {{ gameState.round }}</div>
          <div>Phase: {{ gameState.phase }}</div>
        </div>
      </div>

      <div class="center-panel">
        <div v-if="currentPlayer" class="player-status">
          <h2>{{ getCurrentPlayerTitle() }}</h2>
          <div class="money-display">
            <div class="amount">£{{ currentPlayer.money }}</div>
            <div class="spent">Spent: £{{ currentPlayer.spent }}</div>
          </div>

          <div v-if="isMyTurn" class="action-buttons">
            <div class="spend-buttons">
              <button
                v-for="amount in [1, 5, 10]"
                :key="`spend-${amount}`"
                class="action-btn spend-btn"
                @click="spend(amount)"
                :disabled="currentPlayer.money < amount"
              >
                Spend £{{ amount }}
              </button>
            </div>

            <div class="loan-button">
              <button class="action-btn loan-btn" @click="showLoanInput = true">
                Take Loan £30
              </button>
            </div>

            <div v-if="showLoanInput" class="loan-input">
              <input
                v-model.number="loanAmount"
                type="number"
                placeholder="Amount"
                @keyup.enter="takeLoan"
              />
              <button @click="takeLoan">Confirm</button>
              <button @click="showLoanInput = false">Cancel</button>
            </div>

            <div class="undo-button">
              <button
                class="action-btn undo-btn"
                @click="undo"
                :disabled="gameState.actionHistory.length === 0"
              >
                Undo Last Action
              </button>
            </div>

            <div class="end-turn-button">
              <button class="action-btn end-turn-btn" @click="endTurn">
                End Turn
              </button>
            </div>
          </div>

          <div v-else class="waiting-turn">
            Waiting for {{ getPlayerName(gameState.currentTurn) }}...
          </div>
        </div>
      </div>

      <div class="right-panel">
        <div class="history-log">
          <h3>History</h3>
          <ul>
            <li v-for="(action, index) in gameState.actionHistory.slice(-10)" :key="index">
              {{ formatAction(action) }}
            </li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import type { Game, Action } from "../types";

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

const showLoanInput = ref(false);
const loanAmount = ref(30);

const currentPlayer = computed(() => {
  return props.gameState.players.find((p) => p.playerId === props.gameState.currentTurn);
});

const isMyTurn = computed(() => {
  return props.gameState.currentTurn === props.playerId;
});

function getPlayerName(playerId: string): string {
  const player = props.gameState.players.find((p) => p.playerId === playerId);
  return player ? player.name : "Unknown";
}

function getCurrentPlayerTitle(): string {
  if (isMyTurn.value) {
    return "Your Turn";
  }
  const player = currentPlayer.value;
  return player ? `${player.name}'s Turn` : "...";
}

function spend(amount: number) {
  emit("spend", amount);
}

function takeLoan() {
  if (loanAmount.value && loanAmount.value > 0) {
    emit("loan", loanAmount.value);
    showLoanInput.value = false;
    loanAmount.value = 30;
  }
}

function undo() {
  emit("undo");
}

function endTurn() {
  emit("end-turn");
}

function formatAction(action: Action): string {
  const player = props.gameState.players.find((p) => p.playerId === action.playerId);
  const playerName = player ? player.name : "Unknown";

  if (action.type === "SPEND") {
    return `${playerName} spent £${action.amount}`;
  } else if (action.type === "LOAN") {
    return `${playerName} took loan £${action.amount}`;
  } else if (action.type === "UNDO") {
    return `${playerName} undid an action`;
  }
  return `${playerName} ended round`;
}
</script>

<style scoped>
.game {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.turn-order-bar {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem 1rem;
  background: #222;
  border-bottom: 1px solid #444;
  font-size: 0.9rem;
  overflow-x: auto;
  flex-shrink: 0;
  min-height: 60px;
}

.turn-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  white-space: nowrap;
}

.indicator {
  color: #666;
}

.turn-item span {
  padding: 0.25rem 0.75rem;
  border-radius: 4px;
  background: #333;
}

.turn-item span.active {
  background: #007bff;
  font-weight: bold;
}

.main-content {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.left-panel,
.right-panel {
  width: 150px;
  padding: 1rem;
  border-right: 1px solid #444;
  font-size: 0.9rem;
  overflow-y: auto;
}

.right-panel {
  border-right: none;
  border-left: 1px solid #444;
}

.round-info {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.center-panel {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
}

.player-status {
  text-align: center;
}

h2 {
  margin-bottom: 1rem;
}

.money-display {
  margin-bottom: 2rem;
}

.amount {
  font-size: 3rem;
  font-weight: bold;
  margin-bottom: 0.5rem;
}

.spent {
  color: #999;
}

.action-buttons {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-top: 2rem;
}

.spend-buttons {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 0.5rem;
}

.action-btn {
  padding: 0.75rem;
  font-size: 0.9rem;
  border-radius: 6px;
}

.spend-btn {
  background: #27ae60;
}

.spend-btn:hover:not(:disabled) {
  background: #229954;
}

.loan-btn {
  background: #e67e22;
}

.loan-btn:hover {
  background: #d35400;
}

.loan-input {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.loan-input input {
  flex: 1;
}

.loan-input button {
  padding: 0.5rem 1rem;
}

.undo-btn {
  background: #95a5a6;
}

.undo-btn:hover:not(:disabled) {
  background: #7f8c8d;
}

.end-turn-btn {
  background: #3498db;
}

.end-turn-btn:hover {
  background: #2980b9;
}

.waiting-turn {
  color: #999;
  font-style: italic;
  margin-top: 1rem;
}

.history-log h3 {
  margin-bottom: 1rem;
}

.history-log ul {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.history-log li {
  text-align: left;
  padding: 0.5rem;
  background: #222;
  border-radius: 4px;
  font-size: 0.85rem;
  color: #aaa;
}

@media (max-width: 768px) {
  .main-content {
    flex-direction: column;
  }

  .left-panel,
  .right-panel {
    width: 100%;
    border-right: none;
    border-bottom: 1px solid #444;
  }

  .right-panel {
    border-bottom: none;
  }
}
</style>
