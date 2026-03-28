import { randomUUID } from "crypto";
import type { Game, Player, Action, Entrepreneur } from "./types";

export class GameState {
  private game: Game;

  constructor() {
    this.game = {
      version: randomUUID(), // unique GUID for this game session
      players: [],
      turnOrder: [],
      currentTurn: "",
      round: 1,
      phase: "canal",
      currentTurnActionHistory: [],
      gameHistory: [],
      roundEnded: false,
    };
  }

  static fromJSON(data: Game): GameState {
    const state = new GameState();
    // Preserve the version from loaded data, or use the newly generated one
    state.game = {
      ...data,
      version: data.version || state.game.version, // Ensure version always exists
      roundEnded: data.roundEnded ?? false,
      currentTurnActionHistory: data.currentTurnActionHistory ?? [],
      gameHistory: data.gameHistory ?? [],
    };
    return state;
  }

  toJSON(): Game {
    return this.game;
  }

  // Player management
  addPlayer(socketId: string, name: string): Player {
    const existingPlayer = this.game.players.find((p) => p.name === name);
    if (existingPlayer) {
      existingPlayer.socketId = socketId;
      existingPlayer.connected = true;
      return existingPlayer;
    }

    const player: Player = {
      playerId: randomUUID(), // stable ID across reconnects
      socketId, // transient connection ID
      name,
      entrepreneur: null,
      money: 17, // starting money
      spent: 0,
      connected: true,
      isAdmin: false,
    };

    this.game.players.push(player);
    return player;
  }

  removePlayer(socketId: string): void {
    const player = this.game.players.find((p) => p.socketId === socketId);
    if (player) {
      player.connected = false;
    }
  }

  getPlayer(playerId: string): Player | undefined {
    return this.game.players.find((p) => p.playerId === playerId);
  }

  getPlayerBySocketId(socketId: string): Player | undefined {
    return this.game.players.find((p) => p.socketId === socketId);
  }

  getPlayerByName(name: string): Player | undefined {
    return this.game.players.find((p) => p.name === name);
  }

  setAdmin(playerId: string): boolean {
    const player = this.getPlayer(playerId);
    if (!player) return false;

    // Clear any existing admin first
    this.game.players.forEach((p) => {
      p.isAdmin = false;
    });
    player.isAdmin = true;
    return true;
  }

  // Stable playerId stays the same, only socketId changes
  reassociatePlayer(newSocketId: string, name: string): Player | null {
    const existingPlayer = this.getPlayerByName(name);
    if (existingPlayer) {
      existingPlayer.socketId = newSocketId; // Just update the transient socket ID
      existingPlayer.connected = true;
      return existingPlayer;
    }
    return null;
  }

  // Entrepreneur claim
  claimEntrepreneur(playerId: string, entrepreneur: Entrepreneur): boolean {
    const player = this.getPlayer(playerId);
    if (!player) return false;

    // Check if entrepreneur is taken by ANOTHER player (allow reclaiming own entrepreneur)
    const isTaken = this.game.players.some(
      (p) => p.playerId !== playerId && p.entrepreneur === entrepreneur
    );
    if (isTaken) return false;

    player.entrepreneur = entrepreneur;
    return true;
  }

  getAvailableEntrepreneurs(): Entrepreneur[] {
    const taken = new Set(
      this.game.players
        .map((p) => p.entrepreneur)
        .filter((e): e is Entrepreneur => e !== null)
    );
    return (["red", "blue", "yellow", "purple"] as Entrepreneur[]).filter(
      (e) => !taken.has(e)
    );
  }

  // Actions
  spend(playerId: string, amount: number): boolean {
    if (this.game.currentTurn !== playerId) return false;

    const player = this.getPlayer(playerId);
    if (!player || player.money < amount) return false;

    player.money -= amount;
    player.spent += amount;

    const action = {
      type: "SPEND" as const,
      playerId,
      playerName: player.name,
      amount,
      timestamp: Date.now(),
    };
    this.game.currentTurnActionHistory.push(action);
    this.game.gameHistory.push(action);

    return true;
  }

  loan(playerId: string, amount: number): boolean {
    if (this.game.currentTurn !== playerId) return false;

    const player = this.getPlayer(playerId);
    if (!player) return false;

    player.money += amount;

    const action = {
      type: "LOAN" as const,
      playerId,
      playerName: player.name,
      amount,
      timestamp: Date.now(),
    };
    this.game.currentTurnActionHistory.push(action);
    this.game.gameHistory.push(action);

    return true;
  }

  undo(playerId: string): boolean {
    if (this.game.currentTurn !== playerId) return false;
    if (this.game.currentTurnActionHistory.length === 0) return false;

    const lastAction = this.game.currentTurnActionHistory.pop()!;
    const player = this.getPlayer(lastAction.playerId);
    if (!player) return false;

    if (lastAction.type === "SPEND" && lastAction.amount) {
      player.money += lastAction.amount;
      player.spent -= lastAction.amount;
    } else if (lastAction.type === "LOAN" && lastAction.amount) {
      player.money -= lastAction.amount;
    }

    this.game.gameHistory.push({
      type: "UNDO",
      playerId,
      playerName: player.name,
      amount: lastAction.amount,
      timestamp: Date.now(),
    });

    return true;
  }

  // Turn management
  initializeTurnOrder(): void {
    // Shuffle players (Fisher-Yates)
    const players = [...this.game.players];
    for (let i = players.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [players[i], players[j]] = [players[j], players[i]];
    }

    this.game.turnOrder = players.map((p) => p.playerId);
    this.game.currentTurn = this.game.turnOrder[0];
  }

  endTurn(): void {
    this.game.currentTurnActionHistory = [];
    const currentIndex = this.game.turnOrder.indexOf(this.game.currentTurn);
    const nextIndex = (currentIndex + 1) % this.game.turnOrder.length;
    if (nextIndex === 0) {
      // All players have taken their turn — pause for admin to start next round
      this.game.roundEnded = true;
      this.game.currentTurn = "";
    } else {
      this.game.currentTurn = this.game.turnOrder[nextIndex];
    }
  }

  endRound(payouts: Record<string, number>): void {
    this.game.roundEnded = false;
    this.game.currentTurnActionHistory = [];

    // Sort by spent ascending (least spent goes first next round) before resetting.
    // Tiebreak: preserve current round's turn order position.
    const players = [...this.game.players].sort((a, b) => {
      const spentDiff = a.spent - b.spent;
      if (spentDiff !== 0) return spentDiff;
      return this.game.turnOrder.indexOf(a.playerId) - this.game.turnOrder.indexOf(b.playerId);
    });
    this.game.turnOrder = players.map((p) => p.playerId);

    // Apply income payouts and reset spent
    this.game.players.forEach((p) => {
      p.money += payouts[p.playerId] ?? 0;
      p.spent = 0;
    });

    this.game.currentTurn = this.game.turnOrder[0];
    this.game.round += 1;
  }

  getCurrentPlayer(): Player | undefined {
    return this.getPlayer(this.game.currentTurn);
  }

  getGame(): Game {
    return this.game;
  }
}
