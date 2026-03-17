export type Entrepreneur = "red" | "blue" | "yellow" | "purple";
export type Phase = "canal" | "rail";
export type ActionType = "SPEND" | "LOAN" | "UNDO" | "END_ROUND";

export interface Player {
  playerId: string; // stable UUID, persists across reconnects
  socketId: string; // current socket connection, transient
  name: string;
  entrepreneur: Entrepreneur | null;
  money: number;
  spent: number; // spent this round
  connected: boolean;
}

export interface Action {
  type: ActionType;
  playerId: string; // references Player.playerId
  amount?: number;
  timestamp: number;
}

export interface Game {
  version: string; // unique version per game session
  players: Player[];
  turnOrder: string[]; // array of Player.playerId (stable)
  currentTurn: string; // Player.playerId (stable)
  round: number;
  phase: Phase;
  actionHistory: Action[];
}
