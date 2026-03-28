<template>
  <BottomSheet :visible="visible" title="LOAN REQUEST" @cancel="handleCancel">
    <div v-if="isPending" class="lo-pending">
      <div class="lo-pending-icon">⏳</div>
      <p class="lo-pending-text">WAITING FOR ADMIN TO APPROVE...</p>
    </div>
    <div v-else class="lo-confirm">
      <p class="lo-amount">+ £30</p>
      <p class="lo-subtitle">Take a loan of £30?</p>
    </div>

    <button
      v-if="!isPending"
      class="lo-btn lo-btn--confirm"
      @click="emit('confirm')"
    >
      TAKE LOAN
    </button>
  </BottomSheet>
</template>

<script setup lang="ts">
import { watch } from "vue";
import BottomSheet from "./BottomSheet.vue";

interface Props {
  visible: boolean;
  isPending: boolean;
}

interface Emits {
  (e: "confirm"): void;
  (e: "cancel"): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

// When pending transitions false (approved or rejected), close the overlay
watch(
  () => props.isPending,
  (nowPending, wasPending) => {
    if (wasPending && !nowPending) {
      emit("cancel");
    }
  }
);

function handleCancel() {
  if (!props.isPending) {
    emit("cancel");
  }
}
</script>

<style scoped>
.lo-confirm {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.4rem;
  padding: 1.5rem 0 1rem;
}

.lo-amount {
  font-size: 3rem;
  font-weight: 700;
  color: #90e090;
  font-family: 'Cinzel', serif;
  margin: 0;
  line-height: 1;
}

.lo-subtitle {
  font-size: 0.85rem;
  color: #a09070;
  font-family: 'Cinzel', serif;
  margin: 0;
  letter-spacing: 0.05em;
}

.lo-pending {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  padding: 2rem 0 1.5rem;
}

.lo-pending-icon {
  font-size: 2.5rem;
}

.lo-pending-text {
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  color: #c9a84c;
  font-family: 'Cinzel', serif;
  margin: 0;
  text-align: center;
}

.lo-btn {
  width: 100%;
  padding: 1rem;
  font-size: 0.85rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-family: 'Cinzel', serif;
  transition: background 0.15s;
}

.lo-btn--confirm {
  background: #1a3a1a;
  color: #90e090;
  border: 1px solid #2e6e2e;
}

.lo-btn--confirm:active {
  background: #1e4a1e;
}
</style>
