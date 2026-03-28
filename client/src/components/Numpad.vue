<template>
  <div class="numpad">
    <button v-for="n in [1,2,3,4,5,6,7,8,9]" :key="n" class="numpad-key" @click="emit('digit', n)">
      {{ n }}
    </button>
    <button class="numpad-key numpad-key-back" @click="emit('backspace')">⌫</button>
    <button class="numpad-key" @click="emit('digit', 0)">0</button>
    <button
      class="numpad-key"
      :class="actionVariant === 'confirm' ? 'numpad-key-confirm' : 'numpad-key-advance'"
      :disabled="actionDisabled"
      @click="emit('action')"
    >{{ actionLabel }}</button>
  </div>
</template>

<script setup lang="ts">
interface Props {
  actionLabel: string;
  actionVariant: "confirm" | "advance";
  actionDisabled?: boolean;
}

interface Emits {
  (e: "digit", n: number): void;
  (e: "backspace"): void;
  (e: "action"): void;
}

defineProps<Props>();
const emit = defineEmits<Emits>();
</script>

<style scoped>
.numpad {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.5rem;
}

.numpad-key {
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

.numpad-key:active {
  background: #2a2218;
}

.numpad-key-back {
  color: #aaa;
  font-size: 1.2rem;
}

/* ── Confirm variant (✓) ────────────────────────────────── */
.numpad-key-confirm {
  background: #c9a84c;
  color: #0f0b08;
  font-size: 1.5rem;
  border-color: #c9a84c;
}

.numpad-key-confirm:not(:disabled):active {
  background: #a8893a;
}

.numpad-key-confirm:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

/* ── Advance variant (→) ────────────────────────────────── */
.numpad-key-advance {
  color: #c9a84c;
  font-size: 1.2rem;
  border-color: #5c3d1e;
}

.numpad-key-advance:active {
  background: #2a1e10;
}
</style>
