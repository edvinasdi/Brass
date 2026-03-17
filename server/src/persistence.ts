import fs from "fs";
import path from "path";
import type { Game } from "./types";

const GAME_STATE_PATH = path.join(process.cwd(), "state", "game.json");

export function ensureStateDir(): void {
  const dir = path.dirname(GAME_STATE_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export function loadGameState(): Game | null {
  try {
    if (fs.existsSync(GAME_STATE_PATH)) {
      const data = fs.readFileSync(GAME_STATE_PATH, "utf-8");
      return JSON.parse(data);
    }
  } catch (err) {
    console.error("Error loading game state:", err);
  }
  return null;
}

export function saveGameState(game: Game): void {
  try {
    ensureStateDir();
    fs.writeFileSync(GAME_STATE_PATH, JSON.stringify(game, null, 2));
  } catch (err) {
    console.error("Error saving game state:", err);
  }
}
