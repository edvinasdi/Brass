<template>
  <div class="connect">
    <h1>Brass: Birmingham</h1>
    <h2>Join the Game</h2>

    <div v-if="qrDataUrl" class="card">
      <div class="qr-shell">
        <img :src="qrDataUrl" alt="Scan to join" />
      </div>
      <a class="join-url" :href="joinUrl">{{ joinUrl }}</a>
      <p class="hint">Make sure you're on the same Wi-Fi network.</p>
    </div>

    <p v-else class="loading">Loading…</p>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import QRCode from "qrcode";

const qrDataUrl = ref("");
const joinUrl = ref("");

onMounted(async () => {
  const res = await fetch("/api/connection-info");
  const data = await res.json();
  joinUrl.value = data.preferredJoinUrl;
  qrDataUrl.value = await QRCode.toDataURL(data.preferredJoinUrl, { margin: 1, width: 320 });
});
</script>

<style scoped>
.connect {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 2rem;
  text-align: center;
}

h1 {
  font-size: 3rem;
  margin-bottom: 0.5rem;
  color: #ffb81c;
}

h2 {
  font-size: 1.5rem;
  margin-bottom: 2rem;
  color: #aaa;
}

.card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.25rem;
  padding: 1.5rem;
  background: #232323;
  border: 1px solid #444;
  border-radius: 20px;
}

.qr-shell {
  padding: 1rem;
  background: #fff;
  border-radius: 14px;
}

.qr-shell img {
  display: block;
  width: 280px;
  height: 280px;
}

.join-url {
  color: #ffb81c;
  font-size: 1.1rem;
  text-decoration: none;
  word-break: break-all;
}

.join-url:hover {
  text-decoration: underline;
}

.hint {
  color: #888;
  margin: 0;
}

.loading {
  color: #aaa;
}
</style>
