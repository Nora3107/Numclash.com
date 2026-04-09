// ============================================
// SuckCard.com — Go Engine (Client-side)
// Used for Bot mode only — minimal version
// ============================================

const DIRS = [[-1, 0], [1, 0], [0, -1], [0, 1]];

export class GoGame {
  constructor(size, player1Id = 'black', player2Id = 'white') {
    this.size = size;
    this.board = Array.from({ length: size }, () => Array(size).fill(0));
    this.currentColor = 1;
    this.players = { 1: player1Id, 2: player2Id };
    this.captures = { 1: 0, 2: 0 };
    this.koPoint = null;
    this.moveHistory = [];
    this.passCount = 0;
    this.phase = 'PLAYING';
    this.lastMove = null;
    this.result = null;
    this.komi = 7.5;
    this.moveNumber = 0;
  }

  inBounds(r, c) { return r >= 0 && r < this.size && c >= 0 && c < this.size; }

  getGroup(r, c, board = this.board) {
    const color = board[r][c];
    if (color === 0) return { stones: [], liberties: new Set() };
    const stones = [];
    const liberties = new Set();
    const visited = new Set();
    const stack = [[r, c]];
    const key = (r, c) => `${r},${c}`;

    while (stack.length > 0) {
      const [cr, cc] = stack.pop();
      const k = key(cr, cc);
      if (visited.has(k)) continue;
      visited.add(k);
      stones.push({ r: cr, c: cc });

      for (const [dr, dc] of DIRS) {
        const nr = cr + dr, nc = cc + dc;
        if (!this.inBounds(nr, nc)) continue;
        if (board[nr][nc] === 0) liberties.add(key(nr, nc));
        else if (board[nr][nc] === color && !visited.has(key(nr, nc))) stack.push([nr, nc]);
      }
    }
    return { stones, liberties };
  }

  isLegalMove(r, c, color) {
    if (!this.inBounds(r, c) || this.board[r][c] !== 0) return false;
    if (this.koPoint && this.koPoint.r === r && this.koPoint.c === c) return false;

    const testBoard = this.board.map(row => [...row]);
    testBoard[r][c] = color;
    const opp = color === 1 ? 2 : 1;
    let wouldCapture = false;

    for (const [dr, dc] of DIRS) {
      const nr = r + dr, nc = c + dc;
      if (!this.inBounds(nr, nc) || testBoard[nr][nc] !== opp) continue;
      const g = this.getGroup(nr, nc, testBoard);
      if (g.liberties.size === 0) {
        wouldCapture = true;
        for (const s of g.stones) testBoard[s.r][s.c] = 0;
      }
    }

    if (!wouldCapture) {
      const own = this.getGroup(r, c, testBoard);
      if (own.liberties.size === 0) return false;
    }
    return true;
  }

  placeStone(r, c, color) {
    if (this.phase !== 'PLAYING') return { success: false, error: 'GAME_NOT_PLAYING' };
    if (color !== this.currentColor) return { success: false, error: 'NOT_YOUR_TURN' };
    if (!this.isLegalMove(r, c, color)) return { success: false, error: 'ILLEGAL_MOVE' };

    this.board[r][c] = color;
    const opp = color === 1 ? 2 : 1;
    let totalCaptured = [];

    for (const [dr, dc] of DIRS) {
      const nr = r + dr, nc = c + dc;
      if (!this.inBounds(nr, nc) || this.board[nr][nc] !== opp) continue;
      const g = this.getGroup(nr, nc);
      if (g.liberties.size === 0) {
        for (const s of g.stones) {
          this.board[s.r][s.c] = 0;
          totalCaptured.push(s);
        }
      }
    }

    this.captures[color] += totalCaptured.length;
    this.koPoint = null;
    if (totalCaptured.length === 1) {
      const cg = this.getGroup(r, c);
      if (cg.stones.length === 1) {
        this.koPoint = { r: totalCaptured[0].r, c: totalCaptured[0].c };
      }
    }

    this.passCount = 0;
    this.lastMove = { r, c, color };
    this.moveNumber++;
    this.moveHistory.push({ r, c, color, captured: totalCaptured });
    this.currentColor = opp;

    return { success: true, captured: totalCaptured };
  }

  pass(color) {
    if (this.phase !== 'PLAYING') return { success: false };
    if (color !== this.currentColor) return { success: false };

    this.passCount++;
    this.koPoint = null;
    this.lastMove = null;
    this.moveNumber++;

    if (this.passCount >= 2) {
      this.phase = 'ENDED';
      this.result = this.calculateScore();
      return { success: true, gameEnded: true, result: this.result };
    }

    this.currentColor = color === 1 ? 2 : 1;
    return { success: true, gameEnded: false };
  }

  resign(color) {
    const winner = color === 1 ? 2 : 1;
    this.phase = 'ENDED';
    this.result = {
      blackScore: 0, whiteScore: 0, winner,
      winnerName: winner === 1 ? 'Đen' : 'Trắng',
      margin: 'Resign', resigned: true,
    };
    return { success: true, result: this.result };
  }

  calculateScore() {
    const territory = this.evaluateTerritory();
    let blackStones = 0, whiteStones = 0;
    for (let r = 0; r < this.size; r++)
      for (let c = 0; c < this.size; c++) {
        if (this.board[r][c] === 1) blackStones++;
        else if (this.board[r][c] === 2) whiteStones++;
      }

    const blackScore = blackStones + territory.black;
    const whiteScore = whiteStones + territory.white + this.komi;
    const winner = blackScore > whiteScore ? 1 : 2;
    const margin = Math.abs(blackScore - whiteScore);

    return {
      blackScore, whiteScore, winner,
      winnerName: winner === 1 ? 'Bạn' : 'Bot',
      margin: margin % 1 === 0 ? margin : margin.toFixed(1),
      territory, resigned: false,
    };
  }

  evaluateTerritory() {
    const visited = Array.from({ length: this.size }, () => Array(this.size).fill(false));
    const map = Array.from({ length: this.size }, () => Array(this.size).fill(0));
    let black = 0, white = 0;

    for (let r = 0; r < this.size; r++) {
      for (let c = 0; c < this.size; c++) {
        if (visited[r][c] || this.board[r][c] !== 0) continue;
        const region = [];
        const borders = new Set();
        const stack = [[r, c]];
        while (stack.length > 0) {
          const [cr, cc] = stack.pop();
          if (visited[cr][cc]) continue;
          visited[cr][cc] = true;
          region.push([cr, cc]);
          for (const [dr, dc] of DIRS) {
            const nr = cr + dr, nc = cc + dc;
            if (!this.inBounds(nr, nc)) continue;
            if (this.board[nr][nc] === 0 && !visited[nr][nc]) stack.push([nr, nc]);
            else if (this.board[nr][nc] !== 0) borders.add(this.board[nr][nc]);
          }
        }
        if (borders.size === 1) {
          const owner = [...borders][0];
          for (const [er, ec] of region) map[er][ec] = owner;
          if (owner === 1) black += region.length;
          else white += region.length;
        }
      }
    }
    return { black, white, map };
  }

  getClientState() {
    return {
      size: this.size,
      board: this.board.map(r => [...r]),
      currentColor: this.currentColor,
      players: {
        1: { id: this.players[1], nickname: 'Bạn', color: 1, captures: this.captures[1] },
        2: { id: this.players[2], nickname: 'Bot', color: 2, captures: this.captures[2] },
      },
      koPoint: this.koPoint,
      lastMove: this.lastMove,
      moveNumber: this.moveNumber,
      passCount: this.passCount,
      phase: this.phase,
      result: this.result,
      komi: this.komi,
    };
  }
}
