// ============================================
// SuckCard.com — Go (Cờ Vây) Socket Handlers
// ============================================

const { GoGame } = require('./goManager');

// Active Go games: roomCode → GoGame
const goGames = new Map();

function setupGoHandlers(io, socket, gameManager) {

  // ── Place a stone ──
  socket.on('go-place', ({ roomCode, r, c }, callback) => {
    const game = goGames.get(roomCode);
    if (!game) return callback?.({ success: false, error: 'NO_GAME' });
    if (game.phase !== 'PLAYING') return callback?.({ success: false, error: 'GAME_NOT_PLAYING' });

    const color = game.getPlayerColor(socket.id);
    if (!color) return callback?.({ success: false, error: 'NOT_IN_GAME' });

    const result = game.placeStone(r, c, color);
    if (!result.success) return callback?.({ success: false, error: result.error });

    callback?.({ success: true });

    // Clear any existing turn timer
    clearTurnTimer(roomCode);

    // Broadcast updated state with capture info
    io.to(roomCode).emit('go-state', game.getClientState());

    // If stones captured, send capture event for animations
    if (result.captured.length > 0) {
      io.to(roomCode).emit('go-capture', {
        captured: result.captured,
        capturedBy: color,
      });
    }

    // Start turn timer for next player
    startTurnTimer(io, roomCode, game);
  });

  // ── Pass turn ──
  socket.on('go-pass', ({ roomCode }, callback) => {
    const game = goGames.get(roomCode);
    if (!game) return callback?.({ success: false, error: 'NO_GAME' });

    const color = game.getPlayerColor(socket.id);
    if (!color) return callback?.({ success: false, error: 'NOT_IN_GAME' });

    const result = game.pass(color);
    if (!result.success) return callback?.({ success: false, error: result.error });

    callback?.({ success: true });
    clearTurnTimer(roomCode);

    // Broadcast pass event
    io.to(roomCode).emit('go-pass-event', { color });

    if (result.gameEnded) {
      // Game over — broadcast final state
      io.to(roomCode).emit('go-state', game.getClientState());
      io.to(roomCode).emit('go-game-over', game.result);
      cleanupGame(roomCode, gameManager);
    } else {
      io.to(roomCode).emit('go-state', game.getClientState());
      startTurnTimer(io, roomCode, game);
    }
  });

  // ── Resign ──
  socket.on('go-resign', ({ roomCode }, callback) => {
    const game = goGames.get(roomCode);
    if (!game) return callback?.({ success: false, error: 'NO_GAME' });

    const color = game.getPlayerColor(socket.id);
    if (!color) return callback?.({ success: false, error: 'NOT_IN_GAME' });

    const result = game.resign(color);
    callback?.({ success: true });

    clearTurnTimer(roomCode);
    io.to(roomCode).emit('go-state', game.getClientState());
    io.to(roomCode).emit('go-game-over', game.result);
    cleanupGame(roomCode, gameManager);
  });

  // ── Request current state (reconnection) ──
  socket.on('go-request-state', ({ roomCode }) => {
    const game = goGames.get(roomCode);
    if (game) {
      socket.emit('go-state', game.getClientState());
    }
  });

  // ── Back to lobby ──
  socket.on('go-back-to-lobby', ({ roomCode }) => {
    const game = goGames.get(roomCode);
    if (game) {
      clearTurnTimer(roomCode);
      goGames.delete(roomCode);
    }
    const room = gameManager.getRoom(roomCode);
    if (room) {
      room.phase = 'lobby';
      gameManager.resetReady(roomCode);
      io.to(roomCode).emit('go-ended', { reason: 'BACK_TO_LOBBY' });
      io.to(roomCode).emit('room-updated', gameManager.getRoomInfo(roomCode));
    }
  });
}

// ═══════════════════════════════════════════
// Start Go Game (called from socketHandlers)
// ═══════════════════════════════════════════

function startGoGame(io, socket, gameManager, roomCode, callback) {
  const room = gameManager.getRoom(roomCode);
  if (!room) return callback({ success: false, error: 'ROOM_NOT_FOUND' });

  const playerIds = [...room.players.keys()];
  if (playerIds.length !== 2) {
    return callback({ success: false, error: 'NEED_EXACTLY_2' });
  }

  // Determine board size (default 9 for now, can be set via room settings)
  const size = room.goSize || 9;

  // Random assign Black/White
  const shuffled = [...playerIds].sort(() => Math.random() - 0.5);
  const nicknames = new Map();
  for (const [pid, player] of room.players) {
    nicknames.set(pid, player.nickname);
  }

  const game = new GoGame(size, shuffled[0], shuffled[1], nicknames);
  goGames.set(roomCode, game);

  room.phase = 'playing';
  gameManager.resetReady(roomCode);

  callback({ success: true });

  // Broadcast initial state to all players
  io.to(roomCode).emit('go-state', game.getClientState());

  // Start first turn timer
  startTurnTimer(io, roomCode, game);
}

// ═══════════════════════════════════════════
// Turn Timer
// ═══════════════════════════════════════════

const turnTimers = new Map();

function startTurnTimer(io, roomCode, game) {
  clearTurnTimer(roomCode);
  if (game.phase !== 'PLAYING') return;

  const startTime = Date.now();
  const timeLimit = game.turnTimeLimit * 1000;

  // Broadcast timer start
  io.to(roomCode).emit('go-timer', {
    playerId: game.getCurrentPlayerId(),
    timeLeft: game.turnTimeLimit,
  });

  const timer = setTimeout(() => {
    // Auto-pass on timeout
    const currentColor = game.currentColor;
    const result = game.pass(currentColor);

    io.to(roomCode).emit('go-pass-event', { color: currentColor, timeout: true });

    if (result.gameEnded) {
      io.to(roomCode).emit('go-state', game.getClientState());
      io.to(roomCode).emit('go-game-over', game.result);
      cleanupGame(roomCode);
    } else {
      io.to(roomCode).emit('go-state', game.getClientState());
      startTurnTimer(io, roomCode, game);
    }
  }, timeLimit);

  turnTimers.set(roomCode, timer);
}

function clearTurnTimer(roomCode) {
  if (turnTimers.has(roomCode)) {
    clearTimeout(turnTimers.get(roomCode));
    turnTimers.delete(roomCode);
  }
}

function cleanupGame(roomCode, gameManager) {
  clearTurnTimer(roomCode);
  // Don't delete game immediately — let clients see the result
  // Cleanup after 30 seconds
  setTimeout(() => {
    goGames.delete(roomCode);
  }, 30000);
}

module.exports = { setupGoHandlers, startGoGame };
