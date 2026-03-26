// ============================================
// Numclash.com — Texas Hold'em Socket Handlers
// Socket events, turn timer, state broadcast
// ============================================

const { PokerGame } = require('./pokerManager');

const TURN_TIME = 26; // seconds per turn
const HAND_DELAY = 4000; // delay between hands (ms)
const SHOWDOWN_DELAY = 6000; // show results before next hand (ms)

// Map of roomCode -> PokerGame instance
const activeGames = new Map();
// Map of roomCode -> timer interval
const turnTimers = new Map();

function broadcastState(io, roomCode, game) {
  const room = io.sockets.adapter.rooms.get(roomCode);
  if (!room) return;
  for (const sid of room) {
    io.to(sid).emit('poker-state', game.getClientState(sid));
  }
}

function clearTurnTimer(roomCode) {
  const t = turnTimers.get(roomCode);
  if (t) {
    clearInterval(t.interval);
    clearTimeout(t.timeout);
    turnTimers.delete(roomCode);
  }
}

function startTurnTimer(io, roomCode) {
  clearTurnTimer(roomCode);
  const game = activeGames.get(roomCode);
  if (!game || game.phase === 'WAITING' || game.phase === 'SHOWDOWN' || game.phase === 'HAND_OVER' || game.phase === 'GAME_OVER') {
    return;
  }

  let remaining = TURN_TIME;
  io.to(roomCode).emit('poker-timer', { remaining });

  const interval = setInterval(() => {
    remaining--;
    io.to(roomCode).emit('poker-timer', { remaining });

    if (remaining <= 0) {
      clearTurnTimer(roomCode);
      // Auto-action
      const g = activeGames.get(roomCode);
      if (!g) return;
      const result = g.autoAction(g.currentTurnSeat);
      if (result.error) return;

      // Broadcast auto action
      io.to(roomCode).emit('poker-action', {
        ...(g.lastAction || {}),
        auto: true,
      });

      broadcastState(io, roomCode, g);
      handleActionResult(io, roomCode, g, result);
    }
  }, 1000);

  turnTimers.set(roomCode, { interval, timeout: null, remaining });
}

function handleActionResult(io, roomCode, game, result) {
  if (result.immediateWin || result.showdown) {
    clearTurnTimer(roomCode);

    if (result.showdown) {
      io.to(roomCode).emit('poker-showdown', {
        winners: result.winners,
        pots: result.pots,
        playerHands: result.playerHands,
        communityCards: result.communityCards,
      });
    } else {
      io.to(roomCode).emit('poker-showdown', {
        winners: result.winners,
        pots: result.pots,
        immediateWin: true,
      });
    }

    broadcastState(io, roomCode, game);

    // Check game over
    const alive = game._getAlivePlayers();
    if (alive.length <= 1) {
      const winnerId = alive.length === 1 ? game.players.get(alive[0]).id : null;
      setTimeout(() => {
        io.to(roomCode).emit('poker-game-over', { winner: winnerId });
        const gameManager = require('./gameManager');
        const room = gameManager.getRoom(roomCode);
        if (room) {
          room.phase = 'lobby';
          gameManager.resetReady(roomCode);
          const info = gameManager.getRoomInfo(roomCode);
          io.to(roomCode).emit('back-to-lobby', info);
        }
        activeGames.delete(roomCode);
      }, SHOWDOWN_DELAY + 5000);
      return;
    }

    // Start next hand after delay
    setTimeout(() => {
      const g = activeGames.get(roomCode);
      if (!g) return;
      const handResult = g.startNewHand();

      if (handResult.gameOver) {
        io.to(roomCode).emit('poker-game-over', { winner: handResult.winner });
        // Send everyone back to lobby
        const gm = require('./gameManager');
        const rm = gm.getRoom(roomCode);
        if (rm) {
          rm.phase = 'lobby';
          gm.resetReady(roomCode);
          io.to(roomCode).emit('back-to-lobby', gm.getRoomInfo(roomCode));
        }
        activeGames.delete(roomCode);
        return;
      }

      broadcastState(io, roomCode, g);
      io.to(roomCode).emit('poker-new-hand', { handNumber: g.handNumber });

      if (handResult.skipToShowdown) {
        // All-in from blinds — run out community
        const showdownResult = g._showdown();
        handleActionResult(io, roomCode, g, showdownResult);
      } else {
        startTurnTimer(io, roomCode);
      }
    }, result.showdown ? SHOWDOWN_DELAY : HAND_DELAY);

    return;
  }

  if (result.phaseChanged) {
    io.to(roomCode).emit('poker-community', {
      phase: result.newPhase,
      communityCards: result.communityCards,
    });
    broadcastState(io, roomCode, game);
    startTurnTimer(io, roomCode);
    return;
  }

  // Normal turn advance
  startTurnTimer(io, roomCode);
}

// ------------------------------------------
// Start Game
// ------------------------------------------

function startPokerGame(io, socket, gameManager, roomCode, callback) {
  const room = gameManager.getRoom(roomCode);
  // Pre-checks already done in start-game handler (socketHandlers.js)

  // Clean up any previous game for this room
  clearTurnTimer(roomCode);
  activeGames.delete(roomCode);

  const playerIds = [...room.players.keys()];

  // Get poker settings from room
  const pokerSettings = room.pokerSettings || {};
  const options = {
    startingChips: pokerSettings.defaultChips || 1000,
    customChips: pokerSettings.customChips || {},
    smallBlind: pokerSettings.smallBlind || 10,
    bigBlind: pokerSettings.bigBlind || 20,
  };

  const game = new PokerGame(playerIds, options);
  activeGames.set(roomCode, game);
  room.phase = 'poker';
  gameManager.resetReady(roomCode);

  callback?.({ success: true });

  // Start first hand
  const handResult = game.startNewHand();

  // Send state to each player
  broadcastState(io, roomCode, game);
  io.to(roomCode).emit('poker-new-hand', { handNumber: game.handNumber });

  if (handResult.skipToShowdown) {
    const showdownResult = game._showdown();
    handleActionResult(io, roomCode, game, showdownResult);
  } else {
    startTurnTimer(io, roomCode);
  }
}

// ------------------------------------------
// Socket Event Handlers
// ------------------------------------------

function setupPokerHandlers(io, socket, gameManager) {
  // Player action (fold, check, call, raise, allin)
  socket.on('poker-action', ({ roomCode, action, amount }) => {
    const game = activeGames.get(roomCode);
    if (!game) return;

    const seatIndex = game.getSeatForPlayer(socket.id);
    if (seatIndex === -1) return;

    const result = game.doAction(seatIndex, action, amount || 0);
    if (result.error) {
      socket.emit('poker-error', { error: result.error });
      return;
    }

    // Broadcast the action
    io.to(roomCode).emit('poker-action', {
      ...(game.lastAction || {}),
      playerName: gameManager.getRoom(roomCode)?.players.get(socket.id)?.nickname,
    });

    broadcastState(io, roomCode, game);
    handleActionResult(io, roomCode, game, result);
  });

  // Set poker settings in lobby
  socket.on('poker-settings', ({ roomCode, settings }) => {
    const room = gameManager.getRoom(roomCode);
    if (!room || room.hostId !== socket.id) return;
    room.pokerSettings = { ...(room.pokerSettings || {}), ...settings };
    io.to(roomCode).emit('room-updated', gameManager.getRoomInfo(roomCode));
  });

  // Handle player manually leaving poker (via "Rời" button)
  socket.on('leave-poker-game', ({ roomCode }) => {
    const game = activeGames.get(roomCode);
    if (game) {
      const seat = game.getSeatForPlayer(socket.id);
      if (seat !== -1) {
        const p = game.players.get(seat);
        if (p && p.status === 'ACTIVE') {
          const result = game.doAction(seat, 'fold');
          if (!result.error) {
            io.to(roomCode).emit('poker-action', {
              seatIndex: seat, action: 'fold', amount: 0, auto: true,
            });
            broadcastState(io, roomCode, game);
            handleActionResult(io, roomCode, game, result);
          }
        }
      }
    }
    // Reset room phase to lobby
    const gm = require('./gameManager');
    const room = gm.getRoom(roomCode);
    if (room && room.phase === 'poker') {
      // Only reset if we're the only one left or game is over
      const otherPlayers = [...room.players.keys()].filter(id => id !== socket.id);
      if (otherPlayers.length === 0) {
        clearTurnTimer(roomCode);
        activeGames.delete(roomCode);
        room.phase = 'lobby';
        gm.resetReady(roomCode);
      }
    }
  });

  // Handle disconnect during poker game
  socket.on('disconnect', () => {
    // Find which game this socket was in
    for (const [roomCode, game] of activeGames) {
      const seat = game.getSeatForPlayer(socket.id);
      if (seat !== -1) {
        const p = game.players.get(seat);
        if (p && p.status === 'ACTIVE') {
          // Auto-fold on disconnect
          const result = game.doAction(seat, 'fold');
          if (!result.error) {
            io.to(roomCode).emit('poker-action', {
              seatIndex: seat,
              action: 'fold',
              amount: 0,
              auto: true,
              disconnect: true,
            });
            broadcastState(io, roomCode, game);
            handleActionResult(io, roomCode, game, result);
          }
        }
        break;
      }
    }
  });
}

module.exports = { setupPokerHandlers, startPokerGame };
