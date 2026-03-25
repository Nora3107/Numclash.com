// ============================================
// SuckCard.com — Old Maid Socket Handlers
// All Old Maid-specific socket events
// ============================================

const { OldMaidGame } = require('./oldMaidManager');

const TURN_TIME = 36; // seconds per turn

// Map of roomCode -> OldMaidGame instance
const activeGames = new Map();

function startOldMaidGame(io, socket, gameManager, roomCode, callback) {
  const room = gameManager.getRoom(roomCode);
  if (!room || room.hostId !== socket.id) {
    return callback?.({ success: false, error: 'HOST_ONLY' });
  }
  if (room.players.size < 2) {
    return callback?.({ success: false, error: 'NEED_2_PLAYERS' });
  }
  if (!gameManager.isAllReady(roomCode)) {
    return callback?.({ success: false, error: 'NOT_ALL_READY' });
  }

  const playerIds = [...room.players.keys()];
  const deckType = room.deckType || 'quick';
  const game = new OldMaidGame(playerIds, deckType);
  const result = game.startGame();

  activeGames.set(roomCode, game);
  room.phase = 'oldmaid';
  gameManager.resetReady(roomCode);

  callback?.({ success: true });

  // Send private hands to each player
  for (const pid of playerIds) {
    io.to(pid).emit('oldmaid-state', game.getFullState(pid));
  }

  // Broadcast initial discards animation
  io.to(roomCode).emit('oldmaid-initial-discard', {
    discards: result.initialDiscards,
    discardPile: game.discardPile,
  });

  // Start turn timer
  startTurnTimer(io, roomCode);
}

function setupOldMaidHandlers(io, socket, gameManager) {
  // Start Old Maid game (also callable directly via startOldMaidGame)
  socket.on('oldmaid-start', ({ roomCode }, callback) => {
    startOldMaidGame(io, socket, gameManager, roomCode, callback);
  });

  // Draw a card from opponent
  socket.on('oldmaid-draw-card', ({ roomCode, cardIndex }) => {
    const game = activeGames.get(roomCode);
    if (!game) return;
    if (drawLocked.get(roomCode)) return; // Block during 3s grace period

    const result = game.drawCard(socket.id, cardIndex);
    if (result.error) return;

    // Clear existing timer
    clearTurnTimer(roomCode);

    const room = gameManager.getRoom(roomCode);

    // Send per-player draw event with intermediate + final hands
    if (room) {
      for (const pid of room.players.keys()) {
        io.to(pid).emit('oldmaid-draw', {
          from: result.from,
          to: result.to,
          cardIndex,
          discarded: result.discarded,
          discardPile: game.discardPile,
          intermediateHand: result.intermediateHands[pid], // hand WITH drawn card
          finalHand: game.getPrivateHand(pid),             // hand AFTER pair removal
          hands: game._getPublicHands(),
        });
      }
    }

    if (result.phase === 'finished') {
      // Game over
      io.to(roomCode).emit('oldmaid-game-over', {
        rankings: result.rankings,
        scores: result.scores,
        loserId: result.rankings[result.rankings.length - 1],
      });
      activeGames.delete(roomCode);
      clearTurnTimer(roomCode);
      drawLocked.delete(roomCode);
      if (room) {
        room.phase = 'lobby';
        // Send everyone back to lobby after a short delay
        setTimeout(() => {
          room.readyPlayers.clear();
          io.to(roomCode).emit('back-to-lobby', gameManager.getRoomInfo(roomCode));
        }, 5000);
      }
    } else {
      // Broadcast turn change immediately (for highlighting)
      io.to(roomCode).emit('oldmaid-turn', {
        currentTurn: result.currentTurn,
        drawTarget: result.drawTarget,
        hands: result.hands,
        myHand: undefined,
        delayed: true, // 3s grace period before timer starts
      });
      // Lock draws for 3s grace period
      drawLocked.set(roomCode, true);
      setTimeout(() => {
        drawLocked.delete(roomCode);
        if (activeGames.has(roomCode)) {
          io.to(roomCode).emit('oldmaid-timer-start');
          startTurnTimer(io, roomCode);
        }
      }, 3000);
    }
  });

  // Reorder own hand (for bluffing)
  socket.on('oldmaid-reorder', ({ roomCode, newOrder }) => {
    const game = activeGames.get(roomCode);
    if (!game) return;

    const success = game.reorderHand(socket.id, newOrder);
    if (success) {
      // Broadcast updated card count/order to all (opponent sees shuffled backs)
      const room = gameManager.getRoom(roomCode);
      if (room) {
        io.to(roomCode).emit('oldmaid-hand-reordered', {
          playerId: socket.id,
          hands: game._getPublicHands(),
        });
      }
    }
  });

  // In-game chat (separate from lobby)
  socket.on('oldmaid-chat', ({ roomCode, text }) => {
    const game = activeGames.get(roomCode);
    if (!game) return;
    const room = gameManager.getRoom(roomCode);
    if (room) {
      for (const pid of room.players.keys()) {
        io.to(pid).emit('oldmaid-chat-msg', {
          playerId: socket.id,
          text,
        });
      }
    }
  });

  // Throw item at another player
  socket.on('oldmaid-throw', ({ roomCode, targetId, item }) => {
    const game = activeGames.get(roomCode);
    if (!game) return;
    io.to(roomCode).emit('oldmaid-thrown', {
      from: socket.id,
      to: targetId,
      item: item || 'tomato',
    });
  });

  // Set deck type (lobby setting)
  socket.on('set-deck-type', ({ roomCode, deckType }) => {
    const room = gameManager.getRoom(roomCode);
    if (!room || room.hostId !== socket.id) return;
    if (!['quick', 'full'].includes(deckType)) return;
    room.deckType = deckType;
    io.to(roomCode).emit('room-updated', gameManager.getRoomInfo(roomCode));
  });

  // Handle disconnect during Old Maid
  socket.on('disconnect', () => {
    const roomCode = gameManager.findRoomByPlayer(socket.id);
    if (!roomCode) return;

    const game = activeGames.get(roomCode);
    if (!game || game.phase !== 'playing') return;

    // If disconnected player has cards, auto-draw for them if it's their turn
    const hand = game.hands.get(socket.id);
    if (!hand || hand.length === 0) return;

    if (game.getCurrentTurnPlayer() === socket.id) {
      const result = game.autoDrawRandom(socket.id);
      if (result) {
        clearTurnTimer(roomCode);
        const room = gameManager.getRoom(roomCode);
        if (room) {
          for (const pid of room.players.keys()) {
            io.to(pid).emit('oldmaid-state', game.getFullState(pid));
          }
        }
        if (result.phase === 'finished') {
          io.to(roomCode).emit('oldmaid-game-over', {
            rankings: result.rankings,
            scores: result.scores,
            loserId: result.rankings[result.rankings.length - 1],
          });
          activeGames.delete(roomCode);
        }
      }
    }
  });
}

// ------------------------------------------
// Turn Timer
// ------------------------------------------

const turnTimers = new Map();
const drawLocked = new Map(); // roomCode -> true during 3s grace period

function startTurnTimer(io, roomCode) {
  clearTurnTimer(roomCode);

  let remaining = TURN_TIME;

  // Tick every second
  const interval = setInterval(() => {
    remaining--;
    io.to(roomCode).emit('oldmaid-timer', { remaining });

    if (remaining <= 0) {
      clearTurnTimer(roomCode);
      // Auto-draw random card
      const game = activeGames.get(roomCode);
      if (!game || game.phase !== 'playing') return;

      const currentPlayer = game.getCurrentTurnPlayer();
      const result = game.autoDrawRandom(currentPlayer);
      if (!result) return;


      // Send per-player auto-draw with intermediate + final hands
      const gameManager = require('./gameManager');
      const room = gameManager.getRoom(roomCode);
      if (room) {
        for (const pid of room.players.keys()) {
          io.to(pid).emit('oldmaid-auto-draw', {
            playerId: currentPlayer,
            from: result.from,
            to: result.to,
            discarded: result.discarded,
            intermediateHand: result.intermediateHands[pid],
            finalHand: game.getPrivateHand(pid),
            hands: game._getPublicHands(),
          });
        }
      }

      if (result.phase === 'finished') {
        io.to(roomCode).emit('oldmaid-game-over', {
          rankings: result.rankings,
          scores: result.scores,
          loserId: result.rankings[result.rankings.length - 1],
        });
        activeGames.delete(roomCode);
      } else {
        io.to(roomCode).emit('oldmaid-turn', {
          currentTurn: result.currentTurn,
          drawTarget: result.drawTarget,
          hands: result.hands,
          delayed: true,
        });
        drawLocked.set(roomCode, true);
        setTimeout(() => {
          drawLocked.delete(roomCode);
          if (activeGames.has(roomCode)) {
            io.to(roomCode).emit('oldmaid-timer-start');
            startTurnTimer(io, roomCode);
          }
        }, 3000);
      }
    }
  }, 1000);

  turnTimers.set(roomCode, interval);
}

function clearTurnTimer(roomCode) {
  const timer = turnTimers.get(roomCode);
  if (timer) {
    clearInterval(timer);
    turnTimers.delete(roomCode);
  }
}

module.exports = { setupOldMaidHandlers, startOldMaidGame, activeGames };
