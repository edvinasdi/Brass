<template>
  <div class="game">
    <SpendOverlay
      :visible="showSpend"
      :balance="myBalance"
      @confirm="handleSpend"
      @cancel="showSpend = false"
    />
    <IncomeOverlay
      :visible="showIncome"
      :players="orderedPlayers"
      :round="gameState.round"
      @confirm="handleIncomeConfirm"
      @cancel="showIncome = false"
    />
    <LoanOverlay
      :visible="showLoan"
      :is-pending="pendingIsMe"
      @confirm="handleLoanRequest"
      @cancel="showLoan = false"
    />

    <div class="top-bar">
      <div class="top-bar-row">
        <span class="round-label">{{ gameState.phase.toUpperCase() }} ERA • ROUND {{ gameState.round }}</span>
      </div>
      <div class="top-bar-row top-bar-row--right">
        <span v-if="isRoundEnded && isAdmin" class="turn-label my-turn">ALL TURNS COMPLETE</span>
        <span v-else-if="isRoundEnded" class="turn-label">WAITING FOR {{ adminName.toUpperCase() }} TO START NEXT ROUND...</span>
        <span v-else-if="isMyTurn" class="turn-label my-turn">YOUR TURN</span>
        <span v-else class="turn-label">WAITING FOR {{ getPlayerName(gameState.currentTurn).toUpperCase() }}...</span>
      </div>
    </div>

    <div class="player-list">
      <div
        v-for="player in orderedPlayers"
        :key="player.playerId"
        class="player-card"
        :style="player.playerId === gameState.currentTurn ? { borderColor: entrepreneurColor(player.entrepreneur), borderWidth: '2px', borderStyle: 'solid' } : {}"
      >
        <div class="card-left">
          <img
            v-if="player.entrepreneur"
            :src="`/entrepreneurs/${player.entrepreneur}-${player.portrait}.png`"
            class="entrepreneur-portrait"
            :alt="player.entrepreneur"
          />
          <span v-else class="entrepreneur-portrait entrepreneur-portrait--empty"></span>
          <div class="player-name-block">
            <span class="player-name">{{ player.name.toUpperCase() }}</span>
            <span class="player-money">£ {{ player.money }}</span>
          </div>
        </div>
        <div class="card-right">£ {{ player.spent }}</div>
      </div>
    </div>

    <BottomBar
      :mode="bottomBarMode"
      :is-my-turn="isMyTurn"
      :can-undo="canUndo"
      :loan-pending="!!gameState.pendingLoanRequest"
      :round="gameState.round"
      :loan-request-label="loanRequestLabel"
      @spend="showSpend = true"
      @undo="emit('undo')"
      @loan="showLoan = true"
      @end-turn="emit('end-turn')"
      @start-round="showIncome = true"
      @loan-approve="emit('loan-approve')"
      @loan-reject="emit('loan-reject')"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import type { Game, Entrepreneur } from "../types";
import SpendOverlay from "./SpendOverlay.vue";
import IncomeOverlay from "./IncomeOverlay.vue";
import LoanOverlay from "./LoanOverlay.vue";
import BottomBar from "./BottomBar.vue";

interface Props {
  gameState: Game;
  playerId: string;
}

interface Emits {
  (e: "spend", amount: number): void;
  (e: "loan-request", amount: number): void;
  (e: "loan-approve"): void;
  (e: "loan-reject"): void;
  (e: "undo"): void;
  (e: "end-turn"): void;
  (e: "end-round", payouts: Record<string, number>): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const showSpend = ref(false);
const showIncome = ref(false);
const showLoan = ref(false);

const pendingIsMe = computed(
  () => props.gameState.pendingLoanRequest?.playerId === props.playerId
);

const pendingLoanForAdmin = computed(
  () =>
    isAdmin.value &&
    props.gameState.pendingLoanRequest !== null &&
    props.gameState.pendingLoanRequest.playerId !== props.playerId
);

const bottomBarMode = computed((): "game" | "round-end" | "loan-approval" => {
  if (isRoundEnded.value && isAdmin.value) return "round-end";
  if (pendingLoanForAdmin.value) return "loan-approval";
  return "game";
});

const loanRequestLabel = computed(() => {
  const req = props.gameState.pendingLoanRequest;
  return req ? `${req.playerName.toUpperCase()} REQUESTS A LOAN OF £${req.amount}` : "";
});

// When pending clears (approved or rejected via REJECT_ACTION), close the LoanOverlay
watch(pendingIsMe, (nowPending, wasPending) => {
  if (wasPending && !nowPending) {
    showLoan.value = false;
  }
});

const isMyTurn = computed(() => {
  return props.gameState.currentTurn === props.playerId;
});

const isRoundEnded = computed(() => props.gameState.roundEnded);

const canUndo = computed(() => {
  return isMyTurn.value && props.gameState.currentTurnActionHistory.length > 0;
});

const isAdmin = computed(() => {
  const me = props.gameState.players.find((p) => p.playerId === props.playerId);
  return me ? me.isAdmin : false;
});

const adminName = computed(() => {
  const admin = props.gameState.players.find((p) => p.isAdmin);
  return admin ? admin.name : "Admin";
});

const orderedPlayers = computed(() => {
  const order = props.gameState.turnOrder;
  if (order.length === 0) return props.gameState.players;
  return [...props.gameState.players].sort(
    (a, b) => order.indexOf(a.playerId) - order.indexOf(b.playerId)
  );
});

const myBalance = computed(() => {
  const me = props.gameState.players.find((p) => p.playerId === props.playerId);
  return me ? me.money : 0;
});

const ENTREPRENEUR_COLORS: Record<Entrepreneur, string> = {
  red: "#e8453c",
  purple: "#9b5de5",
  yellow: "#f4a62a",
  gray: "#888888",
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

function handleLoanRequest() {
  emit("loan-request", 30);
  if (isAdmin.value) {
    showLoan.value = false;
  }
}

function handleIncomeConfirm(payouts: Record<string, number>) {
  emit("end-round", payouts);
  showIncome.value = false;
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
  padding: 0.4rem 1.25rem;
  background: #0f0b08;
  border-bottom: 1px solid #3d2a0e;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.08em;
}

.top-bar-row {
  display: flex;
}

.top-bar-row--right {
  justify-content: flex-end;
}

.round-label {
  color: #6b5a3e;
  font-family: 'Cinzel', serif;
  white-space: nowrap;
}

.turn-label {
  color: #a09070;
  font-family: 'Cinzel', serif;
  white-space: nowrap;
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

.entrepreneur-portrait {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
}

.entrepreneur-portrait--empty {
  background: #3d2a0e;
  display: inline-block;
}

.player-name-block {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.player-name {
  font-size: 0.85rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  color: #f0e8d8;
  font-family: 'Cinzel', serif;
}

.player-money {
  font-size: 0.75rem;
  font-weight: 650;
  letter-spacing: 0.06em;
  color: #a09070;
  font-family: 'Cinzel', serif;
}

.you-label {
  font-size: 0.7rem;
  color: #8a7060;
  font-style: italic;
}

.card-right {
  font-size: 1.4rem;
  font-weight: 700;
  color: #f5edd8;
  font-family: 'Cinzel', serif;
}

/* bottom-bar styles live in BottomBar.vue */
</style>
