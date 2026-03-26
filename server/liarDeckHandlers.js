// ============================================
// SuckCard.com — Liar's Deck Socket Handlers
// All Liar's Deck-specific socket events
// ============================================

const { LiarDeckGame } = require('./liarDeckManager');

const TURN_TIME = 27; // seconds per turn
const RESOLUTION_DELAY = 10000; // ms — dramatic sequence: LIAR!(0s) → flip(2.5s) → result(5.5s) → new round(10s)

// Map of roomCode -> LiarDeckGame instance
const activeGames = new Map();

function startLiarDeckGame(io, socket, gameManager, roomCode, callback) {
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
  const game = new LiarDeckGame(playerIds);
  activeGames.set(roomCode, game);
  room.phase = 'liardeck';
  gameManager.resetReady(roomCode);

  callback?.({ success: true });

  // Start first round
  const roundInfo = game.startRound();

  // Send private state to each player
  for (const pid of playerIds) {
    io.to(pid).emit('liardeck-state', game.getClientState(pid));
  }

  // Broadcast round start
  io.to(roomCode).emit('liardeck-round-start', roundInfo);

  // Start turn timer
  startTurnTimer(io, roomCode);
}

function setupLiarDeckHandlers(io, socket, gameManager) {
  // Play cards
  socket.on('liardeck-play', ({ roomCode, cardIds }) => {
    const game = activeGames.get(roomCode);
    if (!game) return;

    const result = game.playCards(socket.id, cardIds);
    if (result.error) {
      socket.emit('liardeck-error', { error: result.error });
      return;
    }

    // Handle empty-hand win (player played all cards, opponent didn't call liar)
    if (result.emptyHand) {
      clearTurnTimer(roomCode);
      const eh = result.emptyHand;

      // Broadcast empty-hand event
      io.to(roomCode).emit('liardeck-empty-hand', {
        winnerId: eh.winnerId,
        loserId: eh.loserId,
        livesLeft: eh.livesLeft,
        eliminated: eh.eliminated,
      });

      // Broadcast updated state
      broadcastState(io, roomCode, game);

      if (eh.gameOver) {
        io.to(roomCode).emit('liardeck-game-over', { winner: eh.winner });
        setTimeout(() => {
          const room = gameManager.getRoom(roomCode);
          if (room) {
            room.phase = 'lobby';
            gameManager.resetReady(roomCode);
            const info = gameManager.getRoomInfo(roomCode);
            io.to(roomCode).emit('back-to-lobby', info);
          }
          activeGames.delete(roomCode);
        }, 15000);
      } else {
        // Start new round after delay
        setTimeout(() => {
          if (activeGames.has(roomCode)) {
            const g = activeGames.get(roomCode);
            const ri = g.startRound();
            const pids = g._getAlive();
            for (const pid of pids) {
              io.to(pid).emit('liardeck-state', g.getClientState(pid));
            }
            io.to(roomCode).emit('liardeck-round-start', ri);
            startTurnTimer(io, roomCode);
          }
        }, RESOLUTION_DELAY);
      }
      return;
    }

    // Clear old timer, start new
    clearTurnTimer(roomCode);

    // Broadcast updated state to all
    broadcastState(io, roomCode, game);

    // Broadcast play announcement
    io.to(roomCode).emit('liardeck-played', {
      playerId: result.playerId,
      count: result.count,
      nextTurn: result.nextTurn,
    });

    // Start timer for next player
    startTurnTimer(io, roomCode);
  });

  // Call liar
  socket.on('liardeck-call-liar', ({ roomCode }) => {
    const game = activeGames.get(roomCode);
    if (!game) return;

    const result = game.callLiar(socket.id);
    if (result.error) {
      socket.emit('liardeck-error', { error: result.error });
      return;
    }

    // Clear timer
    clearTurnTimer(roomCode);

    // Broadcast resolution with flipped cards
    io.to(roomCode).emit('liardeck-resolution', {
      callerId: result.callerId,
      accusedId: result.accusedId,
      flippedCards: result.flippedCards,
      resultType: result.resultType,
      loserId: result.loserId,
      livesLeft: result.livesLeft,
      eliminated: result.eliminated,
    });

    if (result.gameOver) {
      // Game over
      io.to(roomCode).emit('liardeck-game-over', { winner: result.winner });

      // Cleanup after full resolution animation + game-over display
      setTimeout(() => {
        const room = gameManager.getRoom(roomCode);
        if (room) {
          room.phase = 'lobby';
          gameManager.resetReady(roomCode);
          const info = gameManager.getRoomInfo(roomCode);
          io.to(roomCode).emit('back-to-lobby', info);
        }
        activeGames.delete(roomCode);
      }, 15000);
    } else {
      // Delay, then start new round
      setTimeout(() => {
        if (!activeGames.has(roomCode)) return;
        const roundInfo = game.startRound();
        const playerIds = [...game.players.keys()];

        for (const pid of playerIds) {
          io.to(pid).emit('liardeck-state', game.getClientState(pid));
        }
        io.to(roomCode).emit('liardeck-round-start', roundInfo);

        startTurnTimer(io, roomCode);
      }, RESOLUTION_DELAY);
    }
  });

  // Leave game
  socket.on('liardeck-leave', ({ roomCode }) => {
    const game = activeGames.get(roomCode);
    if (!game) return;

    const player = game.players.get(socket.id);
    if (player) {
      player.status = 'ELIMINATED';
      player.lives = 0;
    }

    // Check if game should end
    const alive = game._getAlive();
    if (alive.length <= 1) {
      game.phase = 'finished';
      game.winner = alive[0] || null;
      clearTurnTimer(roomCode);
      io.to(roomCode).emit('liardeck-game-over', { winner: game.winner });
      setTimeout(() => {
        const room = gameManager.getRoom(roomCode);
        if (room) {
          room.phase = 'lobby';
          gameManager.resetReady(roomCode);
          const info = gameManager.getRoomInfo(roomCode);
          io.to(roomCode).emit('back-to-lobby', info);
        }
        activeGames.delete(roomCode);
      }, 3000);
    } else {
      broadcastState(io, roomCode, game);
    }
  });

  // Disconnect cleanup
  socket.on('disconnect', () => {
    for (const [roomCode, game] of activeGames) {
      const player = game.players.get(socket.id);
      if (player && player.status === 'ALIVE') {
        player.status = 'ELIMINATED';
        player.lives = 0;

        const alive = game._getAlive();
        if (alive.length <= 1) {
          game.phase = 'finished';
          game.winner = alive[0] || null;
          clearTurnTimer(roomCode);
          io.to(roomCode).emit('liardeck-game-over', { winner: game.winner });
          setTimeout(() => {
            const room = gameManager.getRoom(roomCode);
            if (room) {
              room.phase = 'lobby';
              gameManager.resetReady(roomCode);
              const info = gameManager.getRoomInfo(roomCode);
              io.to(roomCode).emit('back-to-lobby', info);
            }
            activeGames.delete(roomCode);
          }, 3000);
        } else {
          // If it was this player's turn, advance
          if (game._getCurrentPlayerId() === socket.id) {
            game._advanceTurn();
          }
          broadcastState(io, roomCode, game);
        }
      }
    }
  });
}

// ------------------------------------------
// Timer
// ------------------------------------------

const turnTimers = new Map();

function startTurnTimer(io, roomCode) {
  clearTurnTimer(roomCode);
  const game = activeGames.get(roomCode);
  if (!game || game.phase !== 'playing') return;

  // If no one can play cards, start a new round
  const currentPid = game._getCurrentPlayerId();
  if (!currentPid) {
    // All alive players have 0 cards — start new round after short delay
    setTimeout(() => {
      if (!activeGames.has(roomCode)) return;
      const g = activeGames.get(roomCode);
      const ri = g.startRound();
      const pids = g._getAlive();
      for (const pid of pids) {
        io.to(pid).emit('liardeck-state', g.getClientState(pid));
      }
      io.to(roomCode).emit('liardeck-round-start', ri);
      startTurnTimer(io, roomCode);
    }, 2000);
    return;
  }

  let remaining = TURN_TIME;

  const interval = setInterval(() => {
    remaining--;
    io.to(roomCode).emit('liardeck-timer', { remaining });

    if (remaining <= 0) {
      clearTurnTimer(roomCode);
      // Auto-play
      const currentPid = game._getCurrentPlayerId();
      if (currentPid) {
        const result = game.autoPlay(currentPid);
        
        // autoPlay may return a callLiar result when mustCallLiar
        if (result.success && result.resultType) {
          // This is a callLiar result
          io.to(roomCode).emit('liardeck-resolution', {
            callerId: result.callerId,
            accusedId: result.accusedId,
            flippedCards: result.flippedCards,
            resultType: result.resultType,
            loserId: result.loserId,
            livesLeft: result.livesLeft,
            eliminated: result.eliminated,
          });
          if (result.gameOver) {
            io.to(roomCode).emit('liardeck-game-over', { winner: result.winner });
            setTimeout(() => {
              const room = gameManager.getRoom(roomCode);
              if (room) {
                room.phase = 'lobby';
                gameManager.resetReady(roomCode);
                io.to(roomCode).emit('back-to-lobby', gameManager.getRoomInfo(roomCode));
              }
              activeGames.delete(roomCode);
            }, 15000);
          } else {
            setTimeout(() => {
              if (!activeGames.has(roomCode)) return;
              const roundInfo = game.startRound();
              for (const pid of [...game.players.keys()]) {
                io.to(pid).emit('liardeck-state', game.getClientState(pid));
              }
              io.to(roomCode).emit('liardeck-round-start', roundInfo);
              startTurnTimer(io, roomCode);
            }, RESOLUTION_DELAY);
          }
          return;
        }
        
        if (result.success && !result.skipped) {
          io.to(roomCode).emit('liardeck-played', {
            playerId: currentPid,
            count: 1,
            nextTurn: result.nextTurn,
            auto: true,
          });
        }
        broadcastState(io, roomCode, game);
        startTurnTimer(io, roomCode);
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

function broadcastState(io, roomCode, game) {
  const playerIds = [...game.players.keys()];
  for (const pid of playerIds) {
    io.to(pid).emit('liardeck-state', game.getClientState(pid));
  }
}

module.exports = { setupLiarDeckHandlers, startLiarDeckGame };
