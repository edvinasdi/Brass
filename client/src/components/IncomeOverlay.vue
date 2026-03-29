<template>
  <BottomSheet :visible="visible" :title="`INCOME \u2014 ROUND ${round}`" @cancel="emit('cancel')">
    <div class="io-player-list">
      <div
        v-for="player in players"
        :key="player.playerId"
        class="io-player-row"
        :class="{ selected: player.playerId === selectedId }"
        @click="selectedId = player.playerId"
      >
        <span class="io-dot" :style="{ background: entrepreneurColor(player.entrepreneur) }"></span>
        <span class="io-name">{{ player.name.toUpperCase() }}</span>
        <span class="io-balance">£{{ player.money }}</span>
        <span class="io-amount" :class="{ empty: !inputs[player.playerId] }">
          {{ inputs[player.playerId] ? `£${inputs[player.playerId]}` : '—' }}
        </span>
      </div>
    </div>

    <div class="io-numpad-wrap">
      <button class="io-toggle-btn" @click="pressToggle">+/−</button>
      <Numpad
        action-label="→"
        action-variant="advance"
        @digit="pressDigit"
        @backspace="pressBackspace"
        @action="pressAdvance"
      />
    </div>

    <button class="io-confirm-btn" :disabled="!canConfirm" @click="confirm">CONFIRM ✓</button>
  </BottomSheet>
</template>

<script setup lang="ts">
import { ref, computed, watch } from "vue";
import type { Player, Entrepreneur } from "../types";
import BottomSheet from "./BottomSheet.vue";
import Numpad from "./Numpad.vue";

interface Props {
  visible: boolean;
  players: Player[];
  round: number;
}

interface Emits {
  (e: "confirm", payouts: Record<string, number>): void;
  (e: "cancel"): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const inputs = ref<Record<string, string>>({});
const selectedId = ref<string>("");

watch(
  () => props.visible,
  (v) => {
    if (v) {
      inputs.value = {};
      selectedId.value = props.players[0]?.playerId ?? "";
    }
  }
);

const ENTREPRENEUR_COLORS: Record<Entrepreneur, string> = {
  red: "#e8453c",
  blue: "#3a86ff",
  yellow: "#f4a62a",
  purple: "#9b5de5",
};

function entrepreneurColor(e: Entrepreneur | null): string {
  return e ? ENTREPRENEUR_COLORS[e] : "#666";
}

function pressToggle() {
  if (!selectedId.value) return;
  const current = inputs.value[selectedId.value] ?? "";
  if (current === "" || current === "0") return;
  const toggled = current.startsWith("-") ? current.slice(1) : "-" + current;
  inputs.value = { ...inputs.value, [selectedId.value]: toggled };
}

function pressDigit(d: number) {
  if (!selectedId.value) return;
  const current = inputs.value[selectedId.value] ?? "";
  const digits = current.replace(/^-/, "");
  if (digits.length >= 3) return;
  if (current === "" && d === 0) {
    inputs.value = { ...inputs.value, [selectedId.value]: "0" };
    return;
  }
  if (current === "-" && d === 0) return; // prevent "-0"
  inputs.value = { ...inputs.value, [selectedId.value]: current + String(d) };
}

function pressBackspace() {
  if (!selectedId.value) return;
  const current = inputs.value[selectedId.value] ?? "";
  const next = current.slice(0, -1);
  inputs.value = { ...inputs.value, [selectedId.value]: next === "-" ? "" : next };
}

function pressAdvance() {
  // Move to the next player that has no value yet, wrapping around
  const ids = props.players.map((p) => p.playerId);
  const currentIndex = ids.indexOf(selectedId.value);
  // First try players after current without a value, then before
  const ordered = [...ids.slice(currentIndex + 1), ...ids.slice(0, currentIndex)];
  const next = ordered.find((id) => !inputs.value[id] && inputs.value[id] !== "0");
  if (next) {
    selectedId.value = next;
  }
}

const canConfirm = computed(() =>
  props.players.length > 0 &&
  props.players.every((p) => {
    const raw = inputs.value[p.playerId] ?? "";
    if (raw === "") return false;
    const n = Number(raw);
    return Number.isInteger(n) && p.money + n >= 0;
  })
);

function confirm() {
  if (!canConfirm.value) return;
  const payouts: Record<string, number> = {};
  for (const p of props.players) {
    payouts[p.playerId] = parseInt(inputs.value[p.playerId], 10);
  }
  emit("confirm", payouts);
}
</script>

<style scoped>
.io-player-list {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  margin-bottom: 0.75rem;
}

.io-player-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.55rem 0.5rem;
  border-radius: 6px;
  border: 1px solid transparent;
  cursor: pointer;
  transition: border-color 0.1s, background 0.1s;
}

.io-player-row.selected {
  background: #2a2218;
  border-color: #c9a84c;
}

.io-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.io-name {
  flex: 1;
  font-size: 0.85rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  color: #f0e8d8;
  font-family: 'Cinzel', serif;
}

.io-balance {
  font-size: 0.8rem;
  color: #a09070;
  font-family: 'Cinzel', serif;
}

.io-amount {
  font-size: 1rem;
  font-weight: 700;
  color: #f0e8d8;
  font-family: 'Cinzel', serif;
  width: 3.5rem;
  text-align: right;
}

.io-amount.empty {
  color: #4a3a28;
}

/* numpad styles live in Numpad.vue */
.io-numpad-wrap {
  margin-bottom: 0.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.io-toggle-btn {
  padding: 0.75rem;
  font-size: 1rem;
  font-weight: 700;
  font-family: 'Cinzel', serif;
  letter-spacing: 0.06em;
  background: #1a1612;
  color: #c9a84c;
  border: 1px solid #3d2a0e;
  border-radius: 10px;
  cursor: pointer;
  user-select: none;
  -webkit-user-select: none;
  transition: background 0.1s;
}

.io-toggle-btn:active {
  background: #2a2218;
}

/* ── Confirm ────────────────────────────────────────────── */
.io-confirm-btn {
  width: 100%;
  padding: 1rem;
  font-size: 0.85rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  background: #c9a84c;
  color: #0f0b08;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-family: 'Cinzel', serif;
  transition: background 0.15s;
}

.io-confirm-btn:not(:disabled):active {
  background: #a8893a;
}

.io-confirm-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}
</style>
