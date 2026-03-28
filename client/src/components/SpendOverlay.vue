<template>
  <BottomSheet :visible="visible" title="SPEND" @cancel="emit('cancel')">
    <template #header-right>
      <span class="so-balance">Balance: £{{ balance }}</span>
    </template>

    <div class="so-amount" :class="{ overdrawn: isOverdrawn }">
      {{ inputStr === "" ? "0" : inputStr }}
    </div>

    <Numpad
      action-label="✓"
      action-variant="confirm"
      :action-disabled="!canConfirm"
      @digit="pressDigit"
      @backspace="pressBackspace"
      @action="pressConfirm"
    />
  </BottomSheet>
</template>

<script setup lang="ts">
import { ref, computed, watch } from "vue";
import BottomSheet from "./BottomSheet.vue";
import Numpad from "./Numpad.vue";

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
.so-balance {
  flex: 1;
  text-align: right;
  font-size: 0.85rem;
  font-weight: 700;
  color: #f0e8d8;
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

/* numpad styles live in Numpad.vue */
</style>
