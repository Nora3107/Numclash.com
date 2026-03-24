// ============================================
// NumClash.com — Game Manager
// Core game state & logic isolated per room
// ============================================

const SCORE_TABLE = [70, 36, 18]; // Top 1-3 scores

class GameManager {
  constructor() {
    this.rooms = new Map(); // roomCode -> RoomState
  }

  // ------------------------------------------
  // Room Management
  // ------------------------------------------

  generateRoomCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code;
    do {
      code = '';
      for (let i = 0; i < 4; i++) {
        code += chars[Math.floor(Math.random() * chars.length)];
      }
    } while (this.rooms.has(code));
    return code;
  }

  createRoom(hostSocketId, nickname) {
    const roomCode = this.generateRoomCode();
    const room = {
      code: roomCode,
      hostId: hostSocketId,
      totalRounds: 1, // default
      currentRound: 0,
      phase: 'lobby', // lobby | picking | reveal | scoreboard | finished
      players: new Map(),
      roundData: null,
      scores: new Map(), // playerId -> total score
      roundHistory: [],
      timer: null,
      readyPlayers: new Set(), // Set of ready player IDs
      isPublic: true, // phòng public mặc định
      roomName: nickname, // tên phòng = tên host mặc định
      gameMode: 'classic', // classic | average
    };

    // Add host as first player
    room.players.set(hostSocketId, {
      id: hostSocketId,
      nickname,
      isHost: true,
      connected: true,
    });
    room.scores.set(hostSocketId, 0);

    this.rooms.set(roomCode, room);
    return room;
  }

  joinRoom(roomCode, socketId, nickname) {
    const room = this.rooms.get(roomCode);
    if (!room) return { error: 'ROOM_NOT_FOUND' };
    if (room.phase !== 'lobby') return { error: 'GAME_ALREADY_STARTED' };
    if (room.players.size >= 8) return { error: 'ROOM_FULL' };

    // Check duplicate nickname
    for (const [, p] of room.players) {
      if (p.nickname.toLowerCase() === nickname.toLowerCase()) {
        return { error: 'NICKNAME_TAKEN' };
      }
    }

    room.players.set(socketId, {
      id: socketId,
      nickname,
      isHost: false,
      connected: true,
    });
    room.scores.set(socketId, 0);

    return { room };
  }

  getRoom(roomCode) {
    return this.rooms.get(roomCode) || null;
  }

  findRoomByPlayer(socketId) {
    for (const [code, room] of this.rooms) {
      if (room.players.has(socketId)) return code;
    }
    return null;
  }

  setTotalRounds(roomCode, hostId, rounds) {
    const room = this.rooms.get(roomCode);
    if (!room || room.hostId !== hostId) return false;
    if (![1, 4, 8, 18, 36].includes(rounds)) return false;
    room.totalRounds = rounds;
    return true;
  }

  setGameMode(roomCode, hostId, mode) {
    const room = this.rooms.get(roomCode);
    if (!room || room.hostId !== hostId) return false;
    if (!['classic', 'average', 'oldmaid'].includes(mode)) return false;
    room.gameMode = mode;
    return true;
  }

  swapSeat(roomCode, socketId, targetIndex) {
    const room = this.rooms.get(roomCode);
    if (!room) return false;
    const playerIds = Array.from(room.players.keys());
    const myIndex = playerIds.indexOf(socketId);
    if (myIndex === -1 || targetIndex < 0 || targetIndex >= playerIds.length || targetIndex === myIndex) return false;
    // Rebuild players Map with swapped order
    const targetId = playerIds[targetIndex];
    playerIds[myIndex] = targetId;
    playerIds[targetIndex] = socketId;
    const newPlayers = new Map();
    for (const id of playerIds) {
      newPlayers.set(id, room.players.get(id));
    }
    room.players = newPlayers;
    return true;
  }
  // Ready System
  // ------------------------------------------

  toggleReady(roomCode, socketId) {
    const room = this.rooms.get(roomCode);
    if (!room) return null;
    if (!room.players.has(socketId)) return null;
    // Host không cần toggle ready
    if (socketId === room.hostId) return null;
    if (room.readyPlayers.has(socketId)) {
      room.readyPlayers.delete(socketId);
    } else {
      room.readyPlayers.add(socketId);
    }
    return { ready: room.readyPlayers.has(socketId) };
  }

  isAllReady(roomCode) {
    const room = this.rooms.get(roomCode);
    if (!room) return false;
    for (const [id] of room.players) {
      // Host luôn sẵn sàng, bỏ qua
      if (id === room.hostId) continue;
      if (!room.readyPlayers.has(id)) return false;
    }
    return true;
  }

  resetReady(roomCode) {
    const room = this.rooms.get(roomCode);
    if (room) room.readyPlayers.clear();
  }

  getReadyPlayers(roomCode) {
    const room = this.rooms.get(roomCode);
    if (!room) return [];
    return Array.from(room.readyPlayers);
  }

  getRoom(roomCode) {
    return this.rooms.get(roomCode);
  }

  removePlayer(roomCode, socketId) {
    const room = this.rooms.get(roomCode);
    if (!room) return null;

    room.players.delete(socketId);
    room.scores.delete(socketId);

    // If the room is empty, delete it
    if (room.players.size === 0) {
      if (room.timer) clearTimeout(room.timer);
      this.rooms.delete(roomCode);
      return null;
    }

    // If the host left, assign a new host
    if (socketId === room.hostId) {
      const newHost = room.players.keys().next().value;
      room.hostId = newHost;
      room.players.get(newHost).isHost = true;
    }

    return room;
  }

  findRoomByPlayer(socketId) {
    for (const [code, room] of this.rooms) {
      if (room.players.has(socketId)) return code;
    }
    return null;
  }

  // ------------------------------------------
  // Game Logic
  // ------------------------------------------

  startGame(roomCode, hostId) {
    const room = this.rooms.get(roomCode);
    if (!room) return { error: 'ROOM_NOT_FOUND' };
    if (room.hostId !== hostId) return { error: 'HOST_ONLY' };
    if (room.players.size < 1) return { error: 'NEED_MORE_PLAYERS' }; // TODO: đổi lại 4 khi deploy
    // Kiểm tra tất cả sẵn sàng
    if (!this.isAllReady(roomCode)) return { error: 'NOT_ALL_READY' };

    room.currentRound = 0;
    // Reset scores
    for (const id of room.players.keys()) {
      room.scores.set(id, 0);
    }
    room.roundHistory = [];

    return this.startNextRound(roomCode);
  }

  startNextRound(roomCode) {
    const room = this.rooms.get(roomCode);
    if (!room) return { error: 'Room not found' };

    room.currentRound++;
    if (room.currentRound > room.totalRounds) {
      room.phase = 'finished';
      return { phase: 'finished', finalScores: this.getFinalScores(roomCode) };
    }

    if (room.gameMode === 'average') {
      return this._startRoundAverage(room);
    }
    return this._startRoundClassic(room);
  }

  _startRoundClassic(room) {
    const playerCount = room.players.size;
    const minTarget = 16;
    const maxTarget = Math.max(minTarget + 10, playerCount * 8);
    const target = Math.floor(Math.random() * (maxTarget - minTarget + 1)) + minTarget;

    room.phase = 'picking';
    room.roundData = {
      target,
      picks: new Map(),
      startTime: Date.now(),
    };

    return {
      phase: 'picking',
      round: room.currentRound,
      totalRounds: room.totalRounds,
      target,
      gameMode: room.gameMode,
    };
  }

  _startRoundAverage(room) {
    room.phase = 'picking';
    room.roundData = {
      picks: new Map(),
      startTime: Date.now(),
    };

    return {
      phase: 'picking',
      round: room.currentRound,
      totalRounds: room.totalRounds,
      gameMode: room.gameMode,
    };
  }

  submitNumber(roomCode, socketId, number) {
    const room = this.rooms.get(roomCode);
    if (!room || room.phase !== 'picking') return { error: 'CANNOT_PICK_NOW' };
    if (!room.players.has(socketId)) return { error: 'NOT_IN_ROOM' };
    if (number < 0 || !Number.isInteger(number)) return { error: 'INVALID_NUMBER' };

    room.roundData.picks.set(socketId, number);

    const allPicked = room.roundData.picks.size === room.players.size;
    return { submitted: true, allPicked };
  }

  // Auto-submit 0 for players who didn't pick
  autoSubmitRemaining(roomCode) {
    const room = this.rooms.get(roomCode);
    if (!room || !room.roundData) return;

    for (const [id] of room.players) {
      if (!room.roundData.picks.has(id)) {
        room.roundData.picks.set(id, 0);
      }
    }
  }

  // ------------------------------------------
  // Scoring & Reveal
  // ------------------------------------------

  calculateRoundResults(roomCode) {
    const room = this.rooms.get(roomCode);
    if (!room || !room.roundData) return null;

    if (room.gameMode === 'average') {
      return this._calculateAverage(room);
    }
    return this._calculateClassic(room);
  }

  _calculateClassic(room) {
    const { target, picks } = room.roundData;

    let totalSum = 0;
    const playerPicks = [];
    for (const [playerId, number] of picks) {
      totalSum += number;
      const player = room.players.get(playerId);
      playerPicks.push({
        id: playerId,
        nickname: player ? player.nickname : 'Unknown',
        number,
      });
    }

    const isSafe = totalSum <= target;

    if (isSafe) {
      playerPicks.sort((a, b) => b.number - a.number);
    } else {
      playerPicks.sort((a, b) => a.number - b.number);
    }

    const results = [];
    let currentRank = 1;
    for (let i = 0; i < playerPicks.length; i++) {
      if (i > 0 && playerPicks[i].number === playerPicks[i - 1].number) {
        results.push({
          ...playerPicks[i],
          rank: results[i - 1].rank,
          points: results[i - 1].points,
        });
      } else {
        const rankIndex = currentRank - 1;
        const points = rankIndex < SCORE_TABLE.length ? SCORE_TABLE[rankIndex] : 0;
        results.push({
          ...playerPicks[i],
          rank: currentRank,
          points,
        });
      }
      currentRank = i + 2;
    }

    for (const r of results) {
      const current = room.scores.get(r.id) || 0;
      room.scores.set(r.id, current + r.points);
    }

    const roundResult = {
      round: room.currentRound,
      target,
      totalSum,
      isSafe,
      results,
      gameMode: 'classic',
    };
    room.roundHistory.push(roundResult);
    room.phase = 'scoreboard';
    return roundResult;
  }

  _calculateAverage(room) {
    const { picks } = room.roundData;

    const playerPicks = [];
    let sum = 0;
    for (const [playerId, number] of picks) {
      sum += number;
      const player = room.players.get(playerId);
      playerPicks.push({
        id: playerId,
        nickname: player ? player.nickname : 'Unknown',
        number,
      });
    }

    const average = sum / playerPicks.length;
    const magicNumber = Math.round(average * 0.8 * 100) / 100; // 2 decimal places

    // Calculate distance to magic number
    for (const p of playerPicks) {
      p.distance = Math.abs(p.number - magicNumber);
    }
    // Sort by distance ascending (closest first)
    playerPicks.sort((a, b) => a.distance - b.distance);

    // Assign ranks with tie handling
    const results = [];
    let currentRank = 1;
    for (let i = 0; i < playerPicks.length; i++) {
      if (i > 0 && playerPicks[i].distance === playerPicks[i - 1].distance) {
        results.push({
          ...playerPicks[i],
          rank: results[i - 1].rank,
          points: results[i - 1].points,
        });
      } else {
        const rankIndex = currentRank - 1;
        const points = rankIndex < SCORE_TABLE.length ? SCORE_TABLE[rankIndex] : 0;
        results.push({
          ...playerPicks[i],
          rank: currentRank,
          points,
        });
      }
      currentRank = i + 2;
    }

    for (const r of results) {
      const current = room.scores.get(r.id) || 0;
      room.scores.set(r.id, current + r.points);
    }

    const roundResult = {
      round: room.currentRound,
      average,
      magicNumber,
      results,
      gameMode: 'average',
    };
    room.roundHistory.push(roundResult);
    room.phase = 'scoreboard';
    return roundResult;
  }

  getLeaderboard(roomCode) {
    const room = this.rooms.get(roomCode);
    if (!room) return [];

    const board = [];
    for (const [id, score] of room.scores) {
      const player = room.players.get(id);
      if (player) {
        board.push({ id, nickname: player.nickname, score });
      }
    }
    board.sort((a, b) => b.score - a.score);
    return board;
  }

  getFinalScores(roomCode) {
    return this.getLeaderboard(roomCode);
  }

  getPlayersStatus(roomCode) {
    const room = this.rooms.get(roomCode);
    if (!room) return [];

    return Array.from(room.players.values()).map(p => ({
      id: p.id,
      nickname: p.nickname,
      isHost: p.isHost,
      hasPicked: room.roundData ? room.roundData.picks.has(p.id) : false,
    }));
  }

  getRoomInfo(roomCode) {
    const room = this.rooms.get(roomCode);
    if (!room) return null;

    return {
      code: room.code,
      hostId: room.hostId,
      totalRounds: room.totalRounds,
      currentRound: room.currentRound,
      phase: room.phase,
      playerCount: room.players.size,
      isPublic: room.isPublic,
      roomName: room.roomName,
      gameMode: room.gameMode,
      deckType: room.deckType || 'quick',
      players: Array.from(room.players.values()).map(p => ({
        id: p.id,
        nickname: p.nickname,
        isHost: p.isHost,
        isReady: p.id === room.hostId ? true : room.readyPlayers.has(p.id),
      })),
      readyCount: room.readyPlayers.size,
    };
  }

  // ------------------------------------------
  // Public Room Browser
  // ------------------------------------------

  getPublicRooms() {
    const list = [];
    for (const [code, room] of this.rooms) {
      if (room.isPublic && room.phase === 'lobby' && room.players.size < 8) {
        list.push({
          code,
          roomName: room.roomName,
          playerCount: room.players.size,
          maxPlayers: 8,
          totalRounds: room.totalRounds,
          gameMode: room.gameMode,
        });
      }
    }
    return list;
  }

  setRoomPublic(roomCode, hostId, isPublic) {
    const room = this.rooms.get(roomCode);
    if (!room || room.hostId !== hostId) return false;
    room.isPublic = !!isPublic;
    return true;
  }

  setRoomName(roomCode, hostId, name) {
    const room = this.rooms.get(roomCode);
    if (!room || room.hostId !== hostId) return false;
    room.roomName = String(name).slice(0, 18).trim() || room.roomName;
    return true;
  }
}

module.exports = new GameManager();
