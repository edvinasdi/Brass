<template>
  <Teleport to="body">
    <div v-if="visible" class="bs-backdrop" @click.self="emit('cancel')">
      <Transition name="slide-up" appear>
        <div class="bs-sheet">
          <div class="bs-header">
            <span class="bs-title">{{ title }}</span>
            <slot name="header-right" />
            <button class="bs-close" @click="emit('cancel')">✕</button>
          </div>
          <slot />
        </div>
      </Transition>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
interface Props {
  visible: boolean;
  title: string;
}

interface Emits {
  (e: "cancel"): void;
}

defineProps<Props>();
const emit = defineEmits<Emits>();
</script>

<style scoped>
/* ── Backdrop ───────────────────────────────────────────── */
.bs-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.65);
  z-index: 100;
  display: flex;
  align-items: flex-end;
}

/* ── Sheet ──────────────────────────────────────────────── */
.bs-sheet {
  width: 100%;
  background: #1e1a14;
  border-radius: 16px 16px 0 0;
  padding: 0.5rem 1rem 1.5rem;
  border-top: 1px solid #3d2a0e;
}

/* ── Header ─────────────────────────────────────────────── */
.bs-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
  padding-top: 0.4rem;
}

.bs-title {
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  color: #7a6040;
  font-family: 'Cinzel', serif;
}

.bs-close {
  background: none;
  border: none;
  color: #555;
  font-size: 1rem;
  line-height: 1;
  padding: 0.25rem 0.25rem 0.25rem 0.5rem;
  cursor: pointer;
  flex-shrink: 0;
}

.bs-close:hover {
  color: #aaa;
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
