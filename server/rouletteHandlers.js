// SuckCard.com — Tactical Deal: Roulette Socket Handlers
'use strict';

const { RouletteGame } = require('./rouletteManager');

const TURN_TIME = 30; // seconds
const activeGames = new Map();
const turnTimers = new Map();

// ------------------------------------------
// Start Game
// ------------------------------------------

function startRouletteGame(io, socket, gameManager, roomCode, callback) {
  const room = gameManager.getRoom(roomCode);
  if (!room) return callback({ success: false, error: 'ROOM_NOT_FOUND' });

  const playerIds = Array.from(room.players.keys());
  if (playerIds.length < 2 || playerIds.length > 4) {
    return callback({ success: false, error: 'NEED_2_TO_4_PLAYERS' });
  }

  const game = new RouletteGame(playerIds);
  activeGames.set(roomCode, game);

  const result = game.startGame();
  room.phase = 'roulette';

  // Send personalized state to each player
  for (const pid of playerIds) {
    io.to(pid).emit('roulette-state', game.getFullState(pid));
  }

  callback({ success: true });
  startTurnTimer(io, roomCode, gameManager);
}

// ------------------------------------------
// Socket Event Handlers
// ------------------------------------------

function setupRouletteHandlers(io, socket, gameManager) {

  // Draw a card
  socket.on('roulette-draw', ({ roomCode }) => {
    const game = activeGames.get(roomCode);
    if (!game) return;

    const result = game.draw(socket.id);
    if (result.error) return socket.emit('roulette-error', result.error);

    clearTurnTimer(roomCode);

    // Broadcast draw event
    const room = gameManager.getRoom(roomCode);
    if (room) {
      for (const pid of room.players.keys()) {
        io.to(pid).emit('roulette-draw-result', {
          playerId: socket.id,
          card: result.card,
          turnPhase: result.turnPhase,
          requiredShots: result.requiredShots,
          hand: pid === socket.id ? (result.hand || game.getFullState(pid).myHand) : undefined,
        });
      }
    }

    startTurnTimer(io, roomCode, gameManager);
  });

  // Aim at target
  socket.on('roulette-aim', ({ roomCode, targetId }) => {
    const game = activeGames.get(roomCode);
    if (!game) return;

    const result = game.aim(socket.id, targetId);
    if (result.error) return socket.emit('roulette-error', result.error);

    io.to(roomCode).emit('roulette-aim-result', {
      playerId: socket.id,
      target: result.target,
      turnPhase: result.turnPhase,
      requiredShots: result.requiredShots,
    });
  });

  // Pull trigger
  socket.on('roulette-fire', ({ roomCode }) => {
    const game = activeGames.get(roomCode);
    if (!game) return;

    const result = game.pullTrigger(socket.id);
    if (result.error) return socket.emit('roulette-error', result.error);

    clearTurnTimer(roomCode);

    // Broadcast fire result
    io.to(roomCode).emit('roulette-fire-result', {
      playerId: socket.id,
      bullet: result.bullet,
      target: result.target,
      isTargetSelf: result.isTargetSelf,
      damage: result.damage,
      gunReset: result.gunReset,
      extraTurn: result.extraTurn,
      shotsFired: result.shotsFired,
      requiredShots: result.requiredShots,
      remainingShots: result.remainingShots,
      players: result.players,
      gun: result.gun,
      nextTurn: result.nextTurn,
      turnPhase: result.turnPhase,
    });

    if (result.gameOver) {
      io.to(roomCode).emit('roulette-game-over', {
        winner: result.winner,
        players: result.players,
      });
      activeGames.delete(roomCode);
      clearTurnTimer(roomCode);

      const room = gameManager.getRoom(roomCode);
      if (room) {
        room.phase = 'lobby';
        room.readyPlayers.clear();
        setTimeout(() => {
          io.to(roomCode).emit('back-to-lobby', gameManager.getRoomInfo(roomCode));
        }, 6000);
      }
    } else if (result.turnPhase === 'draw') {
      // New turn started (either next player or extra turn)
      setTimeout(() => {
        if (activeGames.has(roomCode)) {
          startTurnTimer(io, roomCode, gameManager);
        }
      }, 2000);
    } else {
      // Still firing (multi-shot) — restart timer
      startTurnTimer(io, roomCode, gameManager);
    }
  });

  // Play support card
  socket.on('roulette-play-card', ({ roomCode, cardId, targetId }) => {
    const game = activeGames.get(roomCode);
    if (!game) return;

    const result = game.playCard(socket.id, cardId);
    if (result.error) return socket.emit('roulette-error', result.error);

    // If redirect was played, client needs to select target next
    const room = gameManager.getRoom(roomCode);
    if (room) {
      for (const pid of room.players.keys()) {
        io.to(pid).emit('roulette-card-played', {
          ...result,
          hand: pid === socket.id ? result.hand : undefined,
        });
      }
    }

    if (result.action === 'skip') {
      clearTurnTimer(roomCode);
      setTimeout(() => {
        if (activeGames.has(roomCode)) {
          startTurnTimer(io, roomCode, gameManager);
        }
      }, 1500);
    }
  });

  // Chat in game
  socket.on('roulette-chat', ({ roomCode, text }) => {
    const game = activeGames.get(roomCode);
    if (!game) return;
    io.to(roomCode).emit('roulette-chat-msg', {
      playerId: socket.id,
      text,
    });
  });
}

// ------------------------------------------
// Turn Timer
// ------------------------------------------

function startTurnTimer(io, roomCode, gameManager) {
  clearTurnTimer(roomCode);

  let remaining = TURN_TIME;

  const interval = setInterval(() => {
    remaining--;
    io.to(roomCode).emit('roulette-timer', { remaining });

    if (remaining <= 0) {
      clearInterval(interval);
      turnTimers.delete(roomCode);

      // Auto-action: depends on turn phase
      const game = activeGames.get(roomCode);
      if (!game || game.phase !== 'playing') return;

      const currentPlayer = game.getCurrentTurnPlayer();

      if (game.turnPhase === 'draw') {
        // Auto-draw
        const drawResult = game.draw(currentPlayer);
        if (!drawResult.error) {
          const room = gameManager.getRoom(roomCode);
          if (room) {
            for (const pid of room.players.keys()) {
              io.to(pid).emit('roulette-draw-result', {
                playerId: currentPlayer,
                card: drawResult.card,
                turnPhase: drawResult.turnPhase,
                requiredShots: drawResult.requiredShots,
                auto: true,
                hand: pid === currentPlayer ? (drawResult.hand || game.getFullState(pid).myHand) : undefined,
              });
            }
          }
          startTurnTimer(io, roomCode, gameManager);
        }
      } else if (game.turnPhase === 'choice') {
        // Auto-aim self
        game.aim(currentPlayer, 'self');
        io.to(roomCode).emit('roulette-aim-result', {
          playerId: currentPlayer,
          target: currentPlayer,
          turnPhase: 'firing',
          auto: true,
        });
        // Auto-fire
        setTimeout(() => {
          const fireResult = game.pullTrigger(currentPlayer);
          if (!fireResult.error) {
            io.to(roomCode).emit('roulette-fire-result', {
              ...fireResult,
              playerId: currentPlayer,
              auto: true,
            });
            if (fireResult.gameOver) {
              io.to(roomCode).emit('roulette-game-over', {
                winner: fireResult.winner,
                players: fireResult.players,
              });
              activeGames.delete(roomCode);
            } else {
              startTurnTimer(io, roomCode, gameManager);
            }
          }
        }, 1500);
      } else if (game.turnPhase === 'forced_fire' || game.turnPhase === 'firing') {
        // Auto-fire
        const fireResult = game.pullTrigger(currentPlayer);
        if (!fireResult.error) {
          io.to(roomCode).emit('roulette-fire-result', {
            ...fireResult,
            playerId: currentPlayer,
            auto: true,
          });
          if (fireResult.gameOver) {
            io.to(roomCode).emit('roulette-game-over', {
              winner: fireResult.winner,
              players: fireResult.players,
            });
            activeGames.delete(roomCode);
          } else if (fireResult.turnPhase === 'draw') {
            startTurnTimer(io, roomCode, gameManager);
          } else {
            startTurnTimer(io, roomCode, gameManager);
          }
        }
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

module.exports = { setupRouletteHandlers, startRouletteGame, activeGames };
