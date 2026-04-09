// ============================================
// SuckCard.com — Go (Cờ Vây) Game Manager
// Full rule engine: capture, Ko, suicide,
// Chinese area scoring
// ============================================

class GoGame {
  /**
   * @param {number} size — 9, 13, or 19
   * @param {string} blackId — socket ID of Black player
   * @param {string} whiteId — socket ID of White player
   * @param {Map} nicknames — Map<socketId, nickname>
   */
  constructor(size, blackId, whiteId, nicknames = new Map()) {
    this.size = size;
    this.board = Array.from({ length: size }, () => Array(size).fill(0)); // 0=empty,1=black,2=white
    this.currentColor = 1; // 1=black goes first
    this.players = { 1: blackId, 2: whiteId };
    this.nicknames = nicknames;
    this.captures = { 1: 0, 2: 0 }; // stones captured BY each color
    this.koPoint = null;   // { r, c } — forbidden for next move
    this.moveHistory = [];
    this.passCount = 0;
    this.phase = 'PLAYING'; // PLAYING | SCORING | ENDED
    this.previousBoard = null; // for Ko detection — stringified snapshot
    this.lastMove = null;  // { r, c, color }
    this.result = null;    // { blackScore, whiteScore, winner, margin }
    this.komi = 7.5;       // White compensation
    this.moveNumber = 0;
    this.turnTimer = null;
    this.turnTimeLimit = size <= 9 ? 15 : size <= 13 ? 20 : 30; // seconds
  }

  // ═══════════════════════════════════════════
  // Core Accessors
  // ═══════════════════════════════════════════

  getPlayerColor(pid) {
    if (this.players[1] === pid) return 1;
    if (this.players[2] === pid) return 2;
    return 0;
  }

  getCurrentPlayerId() {
    return this.players[this.currentColor];
  }

  getOpponentColor(color) {
    return color === 1 ? 2 : 1;
  }

  inBounds(r, c) {
    return r >= 0 && r < this.size && c >= 0 && c < this.size;
  }

  // ═══════════════════════════════════════════
  // Group / Liberty Calculation
  // ═══════════════════════════════════════════

  /**
   * Flood-fill to find a connected group of same-color stones
   * Returns { stones: Set<string>, liberties: Set<string> }
   */
  getGroup(r, c, board = this.board) {
    const color = board[r][c];
    if (color === 0) return { stones: new Set(), liberties: new Set() };

    const stones = new Set();
    const liberties = new Set();
    const stack = [[r, c]];
    const key = (r, c) => `${r},${c}`;

    while (stack.length > 0) {
      const [cr, cc] = stack.pop();
      const k = key(cr, cc);
      if (stones.has(k)) continue;
      stones.add(k);

      for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
        const nr = cr + dr;
        const nc = cc + dc;
        if (!this.inBounds(nr, nc)) continue;

        if (board[nr][nc] === 0) {
          liberties.add(key(nr, nc));
        } else if (board[nr][nc] === color && !stones.has(key(nr, nc))) {
          stack.push([nr, nc]);
        }
      }
    }

    return { stones, liberties };
  }

  // ═══════════════════════════════════════════
  // Move Validation & Execution
  // ═══════════════════════════════════════════

  /**
   * Check if a move is legal (does NOT modify board)
   */
  isLegalMove(r, c, color) {
    if (!this.inBounds(r, c)) return false;
    if (this.board[r][c] !== 0) return false;

    // Ko check
    if (this.koPoint && this.koPoint.r === r && this.koPoint.c === c) return false;

    // Simulate placement
    const testBoard = this.board.map(row => [...row]);
    testBoard[r][c] = color;
    const opponentColor = this.getOpponentColor(color);

    // Check captures first
    let wouldCapture = false;
    for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
      const nr = r + dr;
      const nc = c + dc;
      if (!this.inBounds(nr, nc) || testBoard[nr][nc] !== opponentColor) continue;

      const group = this.getGroup(nr, nc, testBoard);
      if (group.liberties.size === 0) {
        wouldCapture = true;
        // Remove captured stones from test board
        for (const stone of group.stones) {
          const [sr, sc] = stone.split(',').map(Number);
          testBoard[sr][sc] = 0;
        }
      }
    }

    // If no capture, check suicide
    if (!wouldCapture) {
      const ownGroup = this.getGroup(r, c, testBoard);
      if (ownGroup.liberties.size === 0) return false; // suicide
    }

    return true;
  }

  /**
   * Place a stone. Returns { success, captured, koTriggered }
   */
  placeStone(r, c, color) {
    if (this.phase !== 'PLAYING') return { success: false, error: 'GAME_NOT_PLAYING' };
    if (color !== this.currentColor) return { success: false, error: 'NOT_YOUR_TURN' };
    if (!this.isLegalMove(r, c, color)) return { success: false, error: 'ILLEGAL_MOVE' };

    // Save previous board for Ko detection
    const prevBoard = this.board.map(row => [...row]);

    // Place stone
    this.board[r][c] = color;
    const opponentColor = this.getOpponentColor(color);

    // Capture opponent groups with 0 liberties
    let totalCaptured = [];
    for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
      const nr = r + dr;
      const nc = c + dc;
      if (!this.inBounds(nr, nc) || this.board[nr][nc] !== opponentColor) continue;

      const group = this.getGroup(nr, nc);
      if (group.liberties.size === 0) {
        for (const stone of group.stones) {
          const [sr, sc] = stone.split(',').map(Number);
          this.board[sr][sc] = 0;
          totalCaptured.push({ r: sr, c: sc });
        }
      }
    }

    // Update captures count
    this.captures[color] += totalCaptured.length;

    // Ko detection: if exactly 1 stone captured, mark Ko point
    this.koPoint = null;
    if (totalCaptured.length === 1) {
      // Check if the captured stone's position would recreate previous board state
      // Simple Ko: the single captured point is forbidden next move
      const cp = totalCaptured[0];
      // Verify it's a real Ko (the capturing stone has exactly 1 liberty = the captured spot is surrounded)
      const capturingGroup = this.getGroup(r, c);
      if (capturingGroup.stones.size === 1) {
        this.koPoint = { r: cp.r, c: cp.c };
      }
    }

    // Update game state
    this.passCount = 0;
    this.lastMove = { r, c, color };
    this.moveNumber++;
    this.moveHistory.push({ r, c, color, captured: totalCaptured, moveNum: this.moveNumber });
    this.previousBoard = prevBoard;

    // Switch turn
    this.currentColor = opponentColor;

    return {
      success: true,
      captured: totalCaptured,
      koTriggered: this.koPoint !== null,
    };
  }

  /**
   * Player passes their turn
   */
  pass(color) {
    if (this.phase !== 'PLAYING') return { success: false, error: 'GAME_NOT_PLAYING' };
    if (color !== this.currentColor) return { success: false, error: 'NOT_YOUR_TURN' };

    this.passCount++;
    this.koPoint = null; // Ko is cleared on pass
    this.lastMove = null;
    this.moveHistory.push({ pass: true, color, moveNum: ++this.moveNumber });

    // Two consecutive passes → game ends
    if (this.passCount >= 2) {
      this.phase = 'SCORING';
      this.result = this.calculateScore();
      this.phase = 'ENDED';
      return { success: true, gameEnded: true, result: this.result };
    }

    // Switch turn
    this.currentColor = this.getOpponentColor(color);
    return { success: true, gameEnded: false };
  }

  /**
   * Player resigns
   */
  resign(color) {
    const winner = this.getOpponentColor(color);
    this.phase = 'ENDED';
    this.result = {
      blackScore: 0,
      whiteScore: 0,
      winner,
      winnerName: this.nicknames.get(this.players[winner]) || (winner === 1 ? 'Black' : 'White'),
      loserName: this.nicknames.get(this.players[color]) || (color === 1 ? 'Black' : 'White'),
      margin: 'Resign',
      resigned: true,
    };
    return { success: true, result: this.result };
  }

  // ═══════════════════════════════════════════
  // Scoring (Chinese Area Scoring)
  // ═══════════════════════════════════════════

  /**
   * Chinese rules: count stones on board + territory
   */
  calculateScore() {
    const territory = this.evaluateTerritory();

    // Count stones on board
    let blackStones = 0, whiteStones = 0;
    for (let r = 0; r < this.size; r++) {
      for (let c = 0; c < this.size; c++) {
        if (this.board[r][c] === 1) blackStones++;
        else if (this.board[r][c] === 2) whiteStones++;
      }
    }

    const blackScore = blackStones + territory.black;
    const whiteScore = whiteStones + territory.white + this.komi;

    const winner = blackScore > whiteScore ? 1 : 2;
    const margin = Math.abs(blackScore - whiteScore);

    return {
      blackScore,
      whiteScore,
      winner,
      winnerName: this.nicknames.get(this.players[winner]) || (winner === 1 ? 'Black' : 'White'),
      margin: margin % 1 === 0 ? margin : margin.toFixed(1),
      territory, // { black, white, map[][] }
      resigned: false,
    };
  }

  /**
   * Determine territory ownership for each empty region
   * Returns { black: num, white: num, map: 2D_array }
   * map values: 0=neutral, 1=black territory, 2=white territory
   */
  evaluateTerritory() {
    const visited = Array.from({ length: this.size }, () => Array(this.size).fill(false));
    const territoryMap = Array.from({ length: this.size }, () => Array(this.size).fill(0));
    let blackTerritory = 0;
    let whiteTerritory = 0;

    for (let r = 0; r < this.size; r++) {
      for (let c = 0; c < this.size; c++) {
        if (visited[r][c] || this.board[r][c] !== 0) continue;

        // BFS to find connected empty region
        const region = [];
        const borders = new Set(); // colors bordering this region
        const stack = [[r, c]];

        while (stack.length > 0) {
          const [cr, cc] = stack.pop();
          if (visited[cr][cc]) continue;
          visited[cr][cc] = true;
          region.push([cr, cc]);

          for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
            const nr = cr + dr;
            const nc = cc + dc;
            if (!this.inBounds(nr, nc)) continue;

            if (this.board[nr][nc] === 0 && !visited[nr][nc]) {
              stack.push([nr, nc]);
            } else if (this.board[nr][nc] !== 0) {
              borders.add(this.board[nr][nc]);
            }
          }
        }

        // If region borders only one color, it's that color's territory
        if (borders.size === 1) {
          const owner = [...borders][0];
          for (const [er, ec] of region) {
            territoryMap[er][ec] = owner;
          }
          if (owner === 1) blackTerritory += region.length;
          else whiteTerritory += region.length;
        }
        // Otherwise it's neutral (borders both colors or no color)
      }
    }

    return { black: blackTerritory, white: whiteTerritory, map: territoryMap };
  }

  // ═══════════════════════════════════════════
  // Client State Serialization
  // ═══════════════════════════════════════════

  getClientState() {
    return {
      size: this.size,
      board: this.board,
      currentColor: this.currentColor,
      currentPlayerId: this.getCurrentPlayerId(),
      players: {
        1: {
          id: this.players[1],
          nickname: this.nicknames.get(this.players[1]) || 'Black',
          color: 1,
          captures: this.captures[1],
        },
        2: {
          id: this.players[2],
          nickname: this.nicknames.get(this.players[2]) || 'White',
          color: 2,
          captures: this.captures[2],
        },
      },
      koPoint: this.koPoint,
      lastMove: this.lastMove,
      moveNumber: this.moveNumber,
      passCount: this.passCount,
      phase: this.phase,
      result: this.result,
      komi: this.komi,
      turnTimeLimit: this.turnTimeLimit,
    };
  }

  /**
   * Get all legal moves for a color
   */
  getLegalMoves(color) {
    const moves = [];
    for (let r = 0; r < this.size; r++) {
      for (let c = 0; c < this.size; c++) {
        if (this.isLegalMove(r, c, color)) {
          moves.push({ r, c });
        }
      }
    }
    return moves;
  }
}

module.exports = { GoGame };
