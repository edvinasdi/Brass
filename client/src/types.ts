export type Entrepreneur = "red" | "blue" | "yellow" | "purple";
export type Phase = "canal" | "rail";
export type ActionType = "SPEND" | "LOAN" | "UNDO" | "END_ROUND";

export interface Player {
  playerId: string; // stable player UUID
  socketId: string; // current socket connection, transient
  name: string;
  entrepreneur: Entrepreneur | null;
  money: number;
  spent: number;
  connected: boolean;
  isAdmin: boolean;
}

export interface Action {
  type: ActionType;
  playerId: string;
  amount?: number;
  timestamp: number;
}

export interface Game {
  version: string; // unique version per game session
  players: Player[];
  turnOrder: string[];
  currentTurn: string;
  round: number;
  phase: Phase;
  actionHistory: Action[];
  roundEnded: boolean; // true when all players have ended their turn, awaiting admin to start next round
}
