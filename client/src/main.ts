import { createApp } from "vue";
import App from "./App.vue";
import "./styles.css";

console.log("🚀 Starting app...");

const appElement = document.getElementById("app");
console.log("📍 App element found:", appElement);

if (!appElement) {
  document.body.innerHTML = "<h1>Error: #app element not found</h1>";
} else {
  try {
    createApp(App).mount("#app");
    console.log("✓ App mounted successfully");
  } catch (err) {
    console.error("❌ Failed to mount app:", err);
    document.body.innerHTML = `<h1>Error mounting app</h1><pre>${String(err)}</pre>`;
  }
}
