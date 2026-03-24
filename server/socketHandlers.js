// ============================================
// NumClash.com — Socket.io Event Handlers
// All events are room-isolated via Socket.io rooms
// ============================================

const gameManager = require('./gameManager');

const PICK_TIME = 36; // seconds

function setupSocketHandlers(io) {
  // Helper: broadcast updated public room list to all browsers
  function broadcastPublicRooms() {
    io.to('home-browser').emit('public-rooms-updated', gameManager.getPublicRooms());
  }

  io.on('connection', (socket) => {
    console.log(`[+] Connected: ${socket.id}`);

    // ------------------------------------------
    // Room Browser Events
    // ------------------------------------------

    socket.on('join-home-browser', () => {
      socket.join('home-browser');
      socket.emit('public-rooms-updated', gameManager.getPublicRooms());
    });

    socket.on('leave-home-browser', () => {
      socket.leave('home-browser');
    });

    socket.on('get-public-rooms', (callback) => {
      callback(gameManager.getPublicRooms());
    });

    // ------------------------------------------
    // Room Events
    // ------------------------------------------

    socket.on('create-room', ({ nickname }, callback) => {
      try {
        const room = gameManager.createRoom(socket.id, nickname);
        socket.join(room.code);
        socket.leave('home-browser');
        callback({ success: true, roomCode: room.code, roomInfo: gameManager.getRoomInfo(room.code) });
        broadcastPublicRooms();
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
        socket.leave('home-browser');
        callback({ success: true, roomCode: code, roomInfo: gameManager.getRoomInfo(code) });

        // Notify everyone in the room
        io.to(code).emit('room-updated', gameManager.getRoomInfo(code));
        // System message: player joined
        io.to(code).emit('new-message', { system: true, text: `${nickname} đã tham gia phòng`, time: Date.now() });
        broadcastPublicRooms();
        console.log(`[Room] ${nickname} joined room ${code}`);
      } catch (err) {
        callback({ success: false, error: 'Lỗi tham gia phòng!' });
      }
    });

    socket.on('toggle-room-public', ({ roomCode }) => {
      const room = gameManager.getRoom(roomCode);
      if (!room) return;
      const success = gameManager.setRoomPublic(roomCode, socket.id, !room.isPublic);
      if (success) {
        io.to(roomCode).emit('room-updated', gameManager.getRoomInfo(roomCode));
        broadcastPublicRooms();
      }
    });

    socket.on('set-room-name', ({ roomCode, name }) => {
      const success = gameManager.setRoomName(roomCode, socket.id, name);
      if (success) {
        io.to(roomCode).emit('room-updated', gameManager.getRoomInfo(roomCode));
        broadcastPublicRooms();
      }
    });

    socket.on('set-rounds', ({ roomCode, rounds }) => {
      const success = gameManager.setTotalRounds(roomCode, socket.id, rounds);
      if (success) {
        io.to(roomCode).emit('room-updated', gameManager.getRoomInfo(roomCode));
      }
    });

    socket.on('set-game-mode', ({ roomCode, mode }) => {
      const success = gameManager.setGameMode(roomCode, socket.id, mode);
      if (success) {
        io.to(roomCode).emit('room-updated', gameManager.getRoomInfo(roomCode));
        const modeName = mode === 'average' ? 'Average ×0.8' : 'Classic';
        io.to(roomCode).emit('new-message', { system: true, text: `Chế độ chơi: ${modeName}`, time: Date.now() });
      }
    });

    socket.on('swap-seat', ({ roomCode, targetIndex }) => {
      const success = gameManager.swapSeat(roomCode, socket.id, targetIndex);
      if (success) {
        io.to(roomCode).emit('room-updated', gameManager.getRoomInfo(roomCode));
      }
    });

    socket.on('kick-player', ({ roomCode, targetId }) => {
      const room = gameManager.getRoom(roomCode);
      if (!room || room.hostId !== socket.id) return;
      if (targetId === socket.id) return; // can't kick yourself
      const player = room.players.get(targetId);
      if (!player) return;
      const kickedName = player.nickname;
      gameManager.removePlayer(roomCode, targetId);
      // Tell kicked player to leave
      io.to(targetId).emit('kicked');
      // Make kicked socket leave the room channel
      const kickedSocket = io.sockets.sockets.get(targetId);
      if (kickedSocket) kickedSocket.leave(roomCode);
      // Notify room
      io.to(roomCode).emit('room-updated', gameManager.getRoomInfo(roomCode));
      io.to(roomCode).emit('new-message', { system: true, text: `${kickedName} đã bị kick`, time: Date.now() });
      broadcastPublicRooms();
    });

    socket.on('toggle-ready', ({ roomCode }) => {
      const result = gameManager.toggleReady(roomCode, socket.id);
      if (result) {
        io.to(roomCode).emit('room-updated', gameManager.getRoomInfo(roomCode));
        // System message: ready/unready
        const room = gameManager.getRoom(roomCode);
        const player = room?.players.get(socket.id);
        if (player) {
          const text = result.ready ? `${player.nickname} đã sẵn sàng ✓` : `${player.nickname} chưa sẵn sàng`;
          io.to(roomCode).emit('new-message', { system: true, text, time: Date.now() });
        }
      }
    });

    // ------------------------------------------
    // Chat
    // ------------------------------------------

    socket.on('send-message', ({ roomCode, text }) => {
      if (!text || typeof text !== 'string') return;
      const msg = text.trim().slice(0, 100);
      if (!msg) return;
      const room = gameManager.getRoom(roomCode);
      if (!room || !room.players.has(socket.id)) return;
      const player = room.players.get(socket.id);
      io.to(roomCode).emit('new-message', {
        nickname: player.nickname,
        text: msg,
        time: Date.now(),
        senderId: socket.id,
      });
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
        gameMode: result.gameMode,
      });

      // Start the countdown timer
      startRoundTimer(io, roomCode);
      broadcastPublicRooms();
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
        gameMode: result.gameMode,
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
      // Get nickname before removal
      const leavingRoom = gameManager.getRoom(roomCode);
      const leavingNickname = leavingRoom?.players.get(socket.id)?.nickname || 'Ai đó';
      const room = gameManager.removePlayer(roomCode, socket.id);
      // Tell the leaving player to go back to home
      socket.emit('left-room');
      if (room) {
        io.to(roomCode).emit('room-updated', gameManager.getRoomInfo(roomCode));
        // System message: player left
        io.to(roomCode).emit('new-message', { system: true, text: `${leavingNickname} đã rời phòng`, time: Date.now() });
      }
      broadcastPublicRooms();
    });

    // ------------------------------------------
    // Disconnect
    // ------------------------------------------

    socket.on('disconnect', () => {
      console.log(`[-] Disconnected: ${socket.id}`);
      const roomCode = gameManager.findRoomByPlayer(socket.id);
      if (!roomCode) return;

      const dcRoom = gameManager.getRoom(roomCode);
      const dcNickname = dcRoom?.players.get(socket.id)?.nickname || 'Ai đó';
      const room = gameManager.removePlayer(roomCode, socket.id);
      if (room) {
        io.to(roomCode).emit('room-updated', gameManager.getRoomInfo(roomCode));
        io.to(roomCode).emit('new-message', { system: true, text: `${dcNickname} đã ngắt kết nối`, time: Date.now() });
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
      broadcastPublicRooms();
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
    gameMode: roundResult.gameMode,
    average: roundResult.average,
    magicNumber: roundResult.magicNumber,
  });
}

module.exports = setupSocketHandlers;
