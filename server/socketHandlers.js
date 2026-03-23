// ============================================
// NumClash.com — Socket.io Event Handlers
// All events are room-isolated via Socket.io rooms
// ============================================

const gameManager = require('./gameManager');

const PICK_TIME = 36; // seconds

function setupSocketHandlers(io) {
  io.on('connection', (socket) => {
    console.log(`[+] Connected: ${socket.id}`);

    // ------------------------------------------
    // Room Events
    // ------------------------------------------

    socket.on('create-room', ({ nickname }, callback) => {
      try {
        const room = gameManager.createRoom(socket.id, nickname);
        socket.join(room.code);
        callback({ success: true, roomCode: room.code, roomInfo: gameManager.getRoomInfo(room.code) });
        console.log(`[Room] ${nickname} created room ${room.code}`);
      } catch (err) {
        callback({ success: false, error: 'Lỗi tạo phòng!' });
      }
    });

    socket.on('join-room', ({ roomCode, nickname }, callback) => {
      try {
        const code = roomCode.toUpperCase().trim();
        const result = gameManager.joinRoom(code, socket.id, nickname);
        if (result.error) {
          callback({ success: false, error: result.error });
          return;
        }

        socket.join(code);
        callback({ success: true, roomCode: code, roomInfo: gameManager.getRoomInfo(code) });

        // Notify everyone in the room
        io.to(code).emit('room-updated', gameManager.getRoomInfo(code));
        console.log(`[Room] ${nickname} joined room ${code}`);
      } catch (err) {
        callback({ success: false, error: 'Lỗi tham gia phòng!' });
      }
    });

    socket.on('set-rounds', ({ roomCode, rounds }) => {
      const success = gameManager.setTotalRounds(roomCode, socket.id, rounds);
      if (success) {
        io.to(roomCode).emit('room-updated', gameManager.getRoomInfo(roomCode));
      }
    });

    socket.on('toggle-ready', ({ roomCode }) => {
      const result = gameManager.toggleReady(roomCode, socket.id);
      if (result) {
        io.to(roomCode).emit('room-updated', gameManager.getRoomInfo(roomCode));
      }
    });

    // ------------------------------------------
    // Game Events
    // ------------------------------------------

    socket.on('start-game', ({ roomCode }, callback) => {
      const result = gameManager.startGame(roomCode, socket.id);
      if (result.error) {
        callback({ success: false, error: result.error });
        return;
      }

      callback({ success: true });

      // Reset ready trước khi bắt đầu vòng
      gameManager.resetReady(roomCode);

      // Broadcast round start to all players
      io.to(roomCode).emit('round-start', {
        round: result.round,
        totalRounds: result.totalRounds,
        target: result.target,
        timeLimit: PICK_TIME,
        players: gameManager.getPlayersStatus(roomCode),
      });

      // Start the countdown timer
      startRoundTimer(io, roomCode);
    });

    socket.on('submit-number', ({ roomCode, number }, callback) => {
      const result = gameManager.submitNumber(roomCode, socket.id, parseInt(number));
      if (result.error) {
        callback({ success: false, error: result.error });
        return;
      }

      callback({ success: true });

      // Notify everyone about pick status
      io.to(roomCode).emit('player-status-updated', gameManager.getPlayersStatus(roomCode));

      // If all picked, proceed to reveal immediately
      // Nếu tất cả đã chọn, đợi 2 giây cho người chơi thấy số mình rồi mới reveal
      if (result.allPicked) {
        const room = gameManager.getRoom(roomCode);
        if (room && room.timer) {
          clearTimeout(room.timer);
          room.timer = null;
        }
        proceedToReveal(io, roomCode);
      }
    });

    socket.on('next-round', ({ roomCode }) => {
      const room = gameManager.getRoom(roomCode);
      if (!room || room.hostId !== socket.id) return;

      // Kiểm tra tất cả sẵn sàng trước khi tiếp
      if (!gameManager.isAllReady(roomCode)) return;

      // Reset ready cho vòng tiếp
      gameManager.resetReady(roomCode);

      const result = gameManager.startNextRound(roomCode);
      if (result.phase === 'finished') {
        io.to(roomCode).emit('game-finished', {
          finalScores: result.finalScores,
        });
        return;
      }

      io.to(roomCode).emit('round-start', {
        round: result.round,
        totalRounds: result.totalRounds,
        target: result.target,
        timeLimit: PICK_TIME,
        players: gameManager.getPlayersStatus(roomCode),
      });

      startRoundTimer(io, roomCode);
    });

    socket.on('play-again', ({ roomCode }) => {
      const room = gameManager.getRoom(roomCode);
      if (!room || room.hostId !== socket.id) return;

      // Reset game state to lobby
      room.phase = 'lobby';
      room.currentRound = 0;
      room.roundData = null;
      room.roundHistory = [];
      // Reset ready cho lobby
      room.readyPlayers.clear();
      for (const id of room.players.keys()) {
        room.scores.set(id, 0);
      }

      io.to(roomCode).emit('back-to-lobby', gameManager.getRoomInfo(roomCode));
    });

    // ------------------------------------------
    // Leave Room (voluntary)
    // ------------------------------------------
    socket.on('leave-room', () => {
      const roomCode = gameManager.findRoomByPlayer(socket.id);
      if (!roomCode) return;

      socket.leave(roomCode);
      const room = gameManager.removePlayer(roomCode, socket.id);
      // Tell the leaving player to go back to home
      socket.emit('left-room');
      if (room) {
        io.to(roomCode).emit('room-updated', gameManager.getRoomInfo(roomCode));
      }
    });

    // ------------------------------------------
    // Disconnect
    // ------------------------------------------

    socket.on('disconnect', () => {
      console.log(`[-] Disconnected: ${socket.id}`);
      const roomCode = gameManager.findRoomByPlayer(socket.id);
      if (!roomCode) return;

      const room = gameManager.removePlayer(roomCode, socket.id);
      if (room) {
        io.to(roomCode).emit('room-updated', gameManager.getRoomInfo(roomCode));
        // Also update player status if game is in progress
        if (room.phase === 'picking') {
          io.to(roomCode).emit('player-status-updated', gameManager.getPlayersStatus(roomCode));

          // Check if all remaining players have picked
          if (room.roundData) {
            let allPicked = true;
            for (const [id] of room.players) {
              if (!room.roundData.picks.has(id)) {
                allPicked = false;
                break;
              }
            }
            if (allPicked) {
              if (room.timer) {
                clearTimeout(room.timer);
                room.timer = null;
              }
              proceedToReveal(io, roomCode);
            }
          }
        }
      }
    });
  });
}

// ------------------------------------------
// Timer & Reveal Helpers
// ------------------------------------------

function startRoundTimer(io, roomCode) {
  const room = gameManager.getRoom(roomCode);
  if (!room) return;

  // Clear any existing timer
  if (room.timer) clearTimeout(room.timer);

  room.timer = setTimeout(() => {
    room.timer = null;
    // Auto-submit 0 for anyone who didn't pick
    gameManager.autoSubmitRemaining(roomCode);
    proceedToReveal(io, roomCode);
  }, PICK_TIME * 1000);
}

function proceedToReveal(io, roomCode) {
  const room = gameManager.getRoom(roomCode);
  if (!room) return;

  room.phase = 'reveal';

  // Reset ready cho scoreboard - mọi người phải bấm sẵn sàng lại
  gameManager.resetReady(roomCode);
  io.to(roomCode).emit('room-updated', gameManager.getRoomInfo(roomCode));

  const roundResult = gameManager.calculateRoundResults(roomCode);
  if (!roundResult) return;

  const leaderboard = gameManager.getLeaderboard(roomCode);

  io.to(roomCode).emit('round-reveal', {
    round: roundResult.round,
    target: roundResult.target,
    totalSum: roundResult.totalSum,
    isSafe: roundResult.isSafe,
    results: roundResult.results,
    leaderboard,
    isLastRound: room.currentRound >= room.totalRounds,
  });
}

module.exports = setupSocketHandlers;
