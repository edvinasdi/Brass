<template>
  <div class="bottom-bar" :class="{ 'bottom-bar--single': mode !== 'game' }">

    <!-- Normal game mode -->
    <template v-if="mode === 'game'">
      <button class="bar-btn spend-btn" :disabled="!isMyTurn" @click="emit('spend')">SPEND</button>
      <button class="bar-btn undo-btn" :disabled="!canUndo" @click="emit('undo')">↩</button>
      <button class="bar-btn loan-btn" :disabled="!isMyTurn || loanPending" @click="emit('loan')">LOAN +£30</button>
      <button class="bar-btn end-turn-btn" :disabled="!isMyTurn" @click="emit('end-turn')">END TURN</button>
    </template>

    <!-- Admin: round ended, start next round -->
    <template v-else-if="mode === 'round-end'">
      <button class="bar-btn action-btn action-btn--green" @click="emit('start-round')">
        START ROUND {{ round + 1 }}
      </button>
    </template>

    <!-- Admin: loan approval -->
    <template v-else-if="mode === 'loan-approval'">
      <span class="action-label">{{ loanRequestLabel }}</span>
      <div class="action-row">
        <button class="bar-btn action-btn action-btn--red" @click="emit('loan-reject')">REJECT</button>
        <button class="bar-btn action-btn action-btn--green" @click="emit('loan-approve')">APPROVE</button>
      </div>
    </template>

  </div>
</template>

<script setup lang="ts">
interface Props {
  mode: "game" | "round-end" | "loan-approval";
  isMyTurn?: boolean;
  canUndo?: boolean;
  loanPending?: boolean;
  round?: number;
  loanRequestLabel?: string;
}

interface Emits {
  (e: "spend"): void;
  (e: "undo"): void;
  (e: "loan"): void;
  (e: "end-turn"): void;
  (e: "start-round"): void;
  (e: "loan-approve"): void;
  (e: "loan-reject"): void;
}

withDefaults(defineProps<Props>(), {
  isMyTurn: false,
  canUndo: false,
  loanPending: false,
  round: 1,
  loanRequestLabel: "",
});

const emit = defineEmits<Emits>();
</script>

<style scoped>
/* ── Container ──────────────────────────────────────────── */
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

.bottom-bar--single {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

/* ── Shared button base ─────────────────────────────────── */
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

/* ── Game mode buttons ──────────────────────────────────── */
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
  color: #f0e8d8;
  border: 1px solid #5c3d1e;
}

.loan-btn:not(:disabled):hover {
  background: #2a2218;
}

.undo-btn {
  grid-area: undo;
  background: #1e1a14;
  color: #f0e8d8;
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

/* ── Single-action modes (round-end / loan-approval) ────── */
.action-label {
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.07em;
  color: #c9a84c;
  font-family: 'Cinzel', serif;
  text-align: center;
  padding-top: 0.25rem;
}

.action-row {
  display: flex;
  gap: 0.5rem;
}

.action-btn {
  flex: 1;
}

.action-btn--green {
  background: #1a3a1a;
  color: #90e090;
  border: 1px solid #2e6e2e;
}

.action-btn--green:hover {
  background: #1e4a1e;
}

.action-btn--red {
  background: #3a1414;
  color: #e09090;
  border: 1px solid #6e2e2e;
}

.action-btn--red:hover {
  background: #4a1e1e;
}
</style>
