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

    socket.on("LOAN_REQUEST", (payload: { amount: number }) => {
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

      if (gameState.getGame().currentTurn !== player.playerId) {
        socket.emit("REJECT_ACTION", { reason: "Not your turn" });
        return;
      }

      if (gameState.getGame().pendingLoanRequest !== null) {
        socket.emit("REJECT_ACTION", { reason: "A loan request is already pending" });
        return;
      }

      // If the requesting player is also the admin, auto-approve
      if (player.isAdmin) {
        const success = gameState.loan(player.playerId, amount);
        if (!success) {
          socket.emit("REJECT_ACTION", { reason: "Failed to apply loan" });
          return;
        }
      } else {
        const success = gameState.requestLoan(player.playerId, amount);
        if (!success) {
          socket.emit("REJECT_ACTION", { reason: "Failed to create loan request" });
          return;
        }
      }

      io.emit("STATE_UPDATE", gameState.getGame());
    });

    socket.on("LOAN_APPROVE", () => {
      const player = gameState.getPlayerBySocketId(socket.id);
      if (!player?.isAdmin) {
        socket.emit("REJECT_ACTION", { reason: "Only the admin can approve loans" });
        return;
      }

      if (!gameState.getGame().pendingLoanRequest) {
        socket.emit("REJECT_ACTION", { reason: "No pending loan request" });
        return;
      }

      const success = gameState.approveLoan();
      if (!success) {
        socket.emit("REJECT_ACTION", { reason: "Failed to approve loan" });
        return;
      }

      io.emit("STATE_UPDATE", gameState.getGame());
    });

    socket.on("LOAN_REJECT", () => {
      const player = gameState.getPlayerBySocketId(socket.id);
      if (!player?.isAdmin) {
        socket.emit("REJECT_ACTION", { reason: "Only the admin can reject loans" });
        return;
      }

      if (!gameState.getGame().pendingLoanRequest) {
        socket.emit("REJECT_ACTION", { reason: "No pending loan request" });
        return;
      }

      const requestingPlayerId = gameState.rejectLoan();
      if (requestingPlayerId) {
        const requestingPlayer = gameState.getPlayer(requestingPlayerId);
        if (requestingPlayer) {
          const requestingSocket = [...io.sockets.sockets.values()].find(
            (s) => s.id === requestingPlayer.socketId
          );
          requestingSocket?.emit("REJECT_ACTION", { reason: "Loan request rejected by admin" });
        }
      }

      io.emit("STATE_UPDATE", gameState.getGame());
    });

    socket.on("UNDO", () => {
      const player = gameState.getPlayerBySocketId(socket.id);
      if (!player) {
        socket.emit("REJECT_ACTION", { reason: "Player not found" });
        return;
      }

      const success = gameState.undo(player.playerId);

      if (!success) {
        socket.emit("REJECT_ACTION", { reason: "Nothing to undo" });
        return;
      }

      io.emit("STATE_UPDATE", gameState.getGame());
    });

    socket.on("END_TURN", () => {
      const player = gameState.getPlayerBySocketId(socket.id);
      if (!player) {
        socket.emit("REJECT_ACTION", { reason: "Player not found" });
        return;
      }
      if (gameState.getGame().roundEnded) {
        socket.emit("REJECT_ACTION", { reason: "Round has ended — waiting for admin to start next round" });
        return;
      }
      if (gameState.getGame().currentTurn !== player.playerId) {
        socket.emit("REJECT_ACTION", { reason: "Not your turn" });
        return;
      }
      gameState.endTurn();
      io.emit("STATE_UPDATE", gameState.getGame());
    });

    socket.on("END_ROUND", (payload: { payouts: Record<string, number> }) => {
      const player = gameState.getPlayerBySocketId(socket.id);
      if (!player?.isAdmin) {
        socket.emit("REJECT_ACTION", { reason: "Only the admin can start the next round" });
        return;
      }
      if (!gameState.getGame().roundEnded) {
        socket.emit("REJECT_ACTION", { reason: "Round has not ended yet" });
        return;
      }
      const payouts = payload?.payouts;
      if (!payouts || typeof payouts !== "object") {
        socket.emit("REJECT_ACTION", { reason: "Invalid payouts" });
        return;
      }
      for (const p of gameState.getGame().players) {
        const amount = payouts[p.playerId];
        if (!Number.isInteger(amount) || amount < 0) {
          socket.emit("REJECT_ACTION", { reason: `Invalid payout for ${p.name}` });
          return;
        }
      }
      gameState.endRound(payouts);
      io.emit("STATE_UPDATE", gameState.getGame());
    });

    socket.on("START_GAME", () => {
      const requestingPlayer = gameState.getPlayerBySocketId(socket.id);
      if (!requestingPlayer?.isAdmin) {
        socket.emit("REJECT_ACTION", { reason: "Only the admin can start the game" });
        return;
      }

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
