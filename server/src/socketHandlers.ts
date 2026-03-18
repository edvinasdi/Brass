import { Server } from "socket.io";
import type { GameState } from "./gameState";
import type { Entrepreneur } from "./types";

export function setupSocketHandlers(io: Server, gameState: GameState): void {
  io.on("connection", (socket) => {
    console.log(`Player connected: ${socket.id}`);

    // Send current game state to new client
    socket.emit("STATE_UPDATE", gameState.getGame());

    socket.on("JOIN", (payload: { playerName: string; playerVersion?: string }) => {
      const { playerName, playerVersion } = payload;
      if (!playerName || playerName.trim() === "") {
        socket.emit("REJECT_ACTION", { reason: "Invalid name" });
        return;
      }

      var gameVersion = gameState.getGame().version;
      if (playerVersion && playerVersion !== gameVersion) {
        socket.emit("VERSION_MISMATCH", { gameVersion });
        return;
      }

      // Try to reassociate with existing player by name first
      let player = gameState.reassociatePlayer(socket.id, playerName);
      if (!player) {
        // If not found, create a new player
        player = gameState.addPlayer(socket.id, playerName);
        console.log(`✓ New player joined: ${playerName}`);
      } else {
        console.log(`↻ Player rejoined: ${playerName}`);
      }

      // Send the player info (including name and stable playerId) back to client
      socket.emit("PLAYER_JOINED", { playerName: player.name, playerId: player.playerId, gameVersion });
      io.emit("STATE_UPDATE", gameState.getGame());
    });

    socket.on("CLAIM_ENTREPRENEUR", (payload: { entrepreneur: Entrepreneur }) => {
      const { entrepreneur } = payload;
      const player = gameState.getPlayerBySocketId(socket.id);
      if (!player) {
        socket.emit("REJECT_ACTION", { reason: "Player not found" });
        return;
      }

      const success = gameState.claimEntrepreneur(player.playerId, entrepreneur);

      if (!success) {
        socket.emit("REJECT_ACTION", { reason: "Entrepreneur already taken" });
        return;
      }

      io.emit("STATE_UPDATE", gameState.getGame());
    });

    socket.on("SPEND", (payload: { amount: number }) => {
      const { amount } = payload;
      const player = gameState.getPlayerBySocketId(socket.id);
      if (!player) {
        socket.emit("REJECT_ACTION", { reason: "Player not found" });
        return;
      }

      if (!Number.isInteger(amount) || amount <= 0) {
        socket.emit("REJECT_ACTION", { reason: "Invalid spend amount" });
        return;
      }

      const success = gameState.spend(player.playerId, amount);

      if (!success) {
        socket.emit("REJECT_ACTION", {
          reason: "Not your turn or insufficient funds",
        });
        return;
      }

      io.emit("STATE_UPDATE", gameState.getGame());
    });

    socket.on("LOAN", (payload: { amount: number }) => {
      const { amount } = payload;
      const player = gameState.getPlayerBySocketId(socket.id);
      if (!player) {
        socket.emit("REJECT_ACTION", { reason: "Player not found" });
        return;
      }

      if (!Number.isInteger(amount) || amount <= 0) {
        socket.emit("REJECT_ACTION", { reason: "Invalid loan amount" });
        return;
      }

      const success = gameState.loan(player.playerId, amount);

      if (!success) {
        socket.emit("REJECT_ACTION", { reason: "Not your turn" });
        return;
      }

      io.emit("STATE_UPDATE", gameState.getGame());
    });

    socket.on("UNDO", () => {
      const success = gameState.undo();

      if (!success) {
        socket.emit("REJECT_ACTION", { reason: "Nothing to undo" });
        return;
      }

      io.emit("STATE_UPDATE", gameState.getGame());
    });

    socket.on("END_TURN", () => {
      // Host-only action validation can be added here
      gameState.endTurn();
      io.emit("STATE_UPDATE", gameState.getGame());
    });

    socket.on("END_ROUND", () => {
      // Host-only action validation can be added here
      gameState.endRound();
      io.emit("STATE_UPDATE", gameState.getGame());
    });

    socket.on("START_GAME", () => {
      // Check if all players claimed entrepreneurs
      const allClaimed = gameState.getGame().players.every((p) => p.entrepreneur);
      if (!allClaimed) {
        socket.emit("REJECT_ACTION", { reason: "Not all players ready" });
        return;
      }

      gameState.initializeTurnOrder();
      io.emit("STATE_UPDATE", gameState.getGame());
    });

    socket.on("disconnect", () => {
      console.log(`Player disconnected: ${socket.id}`);
      gameState.removePlayer(socket.id);
      io.emit("STATE_UPDATE", gameState.getGame());
    });
  });
}
