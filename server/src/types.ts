export type Entrepreneur = "red" | "purple" | "yellow" | "gray";
export type Phase = "canal" | "rail";
export type ActionType = "SPEND" | "LOAN" | "LOAN_REQUEST" | "UNDO" | "END_ROUND";

export interface Player {
  playerId: string;
  socketId: string;
  name: string;
  entrepreneur: Entrepreneur | null;
  portrait: 1 | 2;
  money: number;
  spent: number;
  connected: boolean;
  isAdmin: boolean;
}

export interface Action {
  playerId: string;
  playerName: string;
  type: ActionType;
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
  currentTurnActionHistory: Action[]; // cleared on endTurn; used for undo
  gameHistory: Action[]; // full audit log, never cleared
  roundEnded: boolean; // true when all players have ended their turn, awaiting admin to start next round
  pendingLoanRequest: { playerId: string; playerName: string; amount: number } | null;
}
