<template>
  <Teleport to="body">
    <div v-if="visible" class="so-backdrop" @click.self="emit('cancel')">
      <Transition name="slide-up" appear>
        <div class="so-sheet">
          <div class="so-header">
            <span class="so-title">SPEND</span>
            <span class="so-balance">Balance: £{{ balance }}</span>
            <button class="so-close" @click="emit('cancel')">✕</button>
          </div>

          <div class="so-amount" :class="{ overdrawn: isOverdrawn }">
            {{ inputStr === "" ? "0" : inputStr }}
          </div>

          <div class="so-numpad">
            <button v-for="n in [7,8,9,4,5,6,1,2,3]" :key="n" class="so-key" @click="pressDigit(n)">
              {{ n }}
            </button>
            <button class="so-key so-key-back" @click="pressBackspace">⌫</button>
            <button class="so-key" @click="pressDigit(0)">0</button>
            <button
              class="so-key so-key-confirm"
              :disabled="!canConfirm"
              @click="pressConfirm"
            >✓</button>
          </div>
        </div>
      </Transition>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch } from "vue";

interface Props {
  visible: boolean;
  balance: number;
}

interface Emits {
  (e: "confirm", amount: number): void;
  (e: "cancel"): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const inputStr = ref("");

const amount = computed(() => {
  const n = parseInt(inputStr.value, 10);
  return isNaN(n) ? 0 : n;
});

const isOverdrawn = computed(() => amount.value > props.balance);
const canConfirm = computed(() => amount.value > 0 && !isOverdrawn.value);

watch(
  () => props.visible,
  (v) => { if (v) inputStr.value = ""; }
);

function pressDigit(d: number) {
  if (inputStr.value.length >= 3) return;
  if (inputStr.value === "" && d === 0) return;
  inputStr.value += String(d);
}

function pressBackspace() {
  inputStr.value = inputStr.value.slice(0, -1);
}

function pressConfirm() {
  if (!canConfirm.value) return;
  emit("confirm", amount.value);
}
</script>

<style scoped>
/* ── Backdrop ───────────────────────────────────────────── */
.so-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.65);
  z-index: 100;
  display: flex;
  align-items: flex-end;
}

/* ── Sheet ──────────────────────────────────────────────── */
.so-sheet {
  width: 100%;
  background: #1e1a14;
  border-radius: 16px 16px 0 0;
  padding: 0.5rem 1rem 1.5rem;
  border-top: 1px solid #3d2a0e;
}

/* ── Header ─────────────────────────────────────────────── */
.so-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
  padding-top: 0.4rem;
}

.so-balance {
  flex: 1;
  text-align: right;
  font-size: 0.85rem;
  font-weight: 700;
  color: #f0e8d8;
}

.so-title {
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  color: #7a6040;
  font-family: 'Cinzel', serif;
}

.so-close {
  background: none;
  border: none;
  color: #555;
  font-size: 1rem;
  line-height: 1;
  padding: 0.25rem 0.25rem 0.25rem 0.5rem;
  cursor: pointer;
  flex-shrink: 0;
}

.so-close:hover {
  color: #aaa;
}

/* ── Amount display ─────────────────────────────────────── */
.so-amount {
  font-size: 3rem;
  font-weight: 700;
  text-align: center;
  color: #fff;
  margin-bottom: 0.75rem;
  line-height: 1;
  transition: color 0.15s;
}

.so-amount::before {
  content: "£";
  font-size: 1.75rem;
  color: #888;
  vertical-align: top;
  margin-top: 0.35rem;
  display: inline-block;
}

.so-amount.overdrawn {
  color: #e8453c;
}

/* ── Numpad ─────────────────────────────────────────────── */
.so-numpad {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.5rem;
}

.so-key {
  padding: 1rem 0;
  font-size: 1.4rem;
  font-weight: 600;
  background: #1a1612;
  color: #f0e8d8;
  border: 1px solid #3d2a0e;
  border-radius: 10px;
  cursor: pointer;
  transition: background 0.1s;
  user-select: none;
  -webkit-user-select: none;
}

.so-key:active {
  background: #2a2218;
}

.so-key-back {
  color: #aaa;
  font-size: 1.2rem;
}

.so-key-clear {
  color: #e8453c;
  border-color: #6b2020;
}

.so-key-clear:active {
  background: #2a1515;
}

.so-key-confirm {
  background: #c9a84c;
  color: #0f0b08;
  font-size: 1.5rem;
  border-color: #c9a84c;
}

.so-key-confirm:not(:disabled):active {
  background: #a8893a;
}

.so-key-confirm:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

/* ── Slide-up transition ────────────────────────────────── */
.slide-up-enter-active,
.slide-up-leave-active {
  transition: transform 0.25s cubic-bezier(0.32, 0.72, 0, 1);
}

.slide-up-enter-from,
.slide-up-leave-to {
  transform: translateY(100%);
}
</style>
