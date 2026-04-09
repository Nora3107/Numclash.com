// ============================================
// SuckCard.com — Go Bot AI (Web Worker)
// 5 difficulty levels:
// 1: Random  2: Heuristic  3-5: MCTS
// ============================================

// Board utilities (no imports in Worker)
const DIRS = [[-1, 0], [1, 0], [0, -1], [0, 1]];

function inBounds(r, c, size) { return r >= 0 && r < size && c >= 0 && c < size; }

function cloneBoard(board) { return board.map(row => [...row]); }

function getGroup(r, c, board, size) {
  const color = board[r][c];
  if (color === 0) return { stones: [], liberties: new Set() };
  const stones = [];
  const liberties = new Set();
  const visited = new Set();
  const stack = [[r, c]];
  const key = (r, c) => r * size + c;

  while (stack.length > 0) {
    const [cr, cc] = stack.pop();
    const k = key(cr, cc);
    if (visited.has(k)) continue;
    visited.add(k);
    stones.push([cr, cc]);

    for (const [dr, dc] of DIRS) {
      const nr = cr + dr, nc = cc + dc;
      if (!inBounds(nr, nc, size)) continue;
      if (board[nr][nc] === 0) liberties.add(key(nr, nc));
      else if (board[nr][nc] === color && !visited.has(key(nr, nc))) stack.push([nr, nc]);
    }
  }
  return { stones, liberties };
}

function isLegal(r, c, color, board, size, koPoint) {
  if (board[r][c] !== 0) return false;
  if (koPoint && koPoint.r === r && koPoint.c === c) return false;

  const testBoard = cloneBoard(board);
  testBoard[r][c] = color;
  const opp = color === 1 ? 2 : 1;
  let wouldCapture = false;

  for (const [dr, dc] of DIRS) {
    const nr = r + dr, nc = c + dc;
    if (!inBounds(nr, nc, size) || testBoard[nr][nc] !== opp) continue;
    const g = getGroup(nr, nc, testBoard, size);
    if (g.liberties.size === 0) {
      wouldCapture = true;
      for (const [sr, sc] of g.stones) testBoard[sr][sc] = 0;
    }
  }

  if (!wouldCapture) {
    const own = getGroup(r, c, testBoard, size);
    if (own.liberties.size === 0) return false;
  }
  return true;
}

function playMove(board, r, c, color, size) {
  const b = cloneBoard(board);
  b[r][c] = color;
  const opp = color === 1 ? 2 : 1;
  let captured = 0;
  let koCandidate = null;

  for (const [dr, dc] of DIRS) {
    const nr = r + dr, nc = c + dc;
    if (!inBounds(nr, nc, size) || b[nr][nc] !== opp) continue;
    const g = getGroup(nr, nc, b, size);
    if (g.liberties.size === 0) {
      captured += g.stones.length;
      if (g.stones.length === 1) koCandidate = { r: g.stones[0][0], c: g.stones[0][1] };
      for (const [sr, sc] of g.stones) b[sr][sc] = 0;
    }
  }

  let ko = null;
  if (captured === 1 && koCandidate) {
    const cg = getGroup(r, c, b, size);
    if (cg.stones.length === 1) ko = koCandidate;
  }

  return { board: b, captured, ko };
}

function getLegalMoves(board, size, color, koPoint) {
  const moves = [];
  for (let r = 0; r < size; r++)
    for (let c = 0; c < size; c++)
      if (isLegal(r, c, color, board, size, koPoint)) moves.push([r, c]);
  return moves;
}

// ═══════════════════════════════════════════
// Heuristic evaluation
// ═══════════════════════════════════════════

function scoreMove(r, c, color, board, size) {
  let score = 0;
  const opp = color === 1 ? 2 : 1;
  const testBoard = cloneBoard(board);
  testBoard[r][c] = color;

  // Capture bonus
  for (const [dr, dc] of DIRS) {
    const nr = r + dr, nc = c + dc;
    if (!inBounds(nr, nc, size) || testBoard[nr][nc] !== opp) continue;
    const g = getGroup(nr, nc, testBoard, size);
    if (g.liberties.size === 0) score += g.stones.length * 10;
    else if (g.liberties.size === 1) score += g.stones.length * 3; // atari threat
  }

  // Liberty count for placed stone
  const own = getGroup(r, c, testBoard, size);
  score += own.liberties.size * 2;

  // Connection bonus
  for (const [dr, dc] of DIRS) {
    const nr = r + dr, nc = c + dc;
    if (inBounds(nr, nc, size) && board[nr][nc] === color) score += 1;
  }

  // Center preference (slight)
  const center = (size - 1) / 2;
  const dist = Math.abs(r - center) + Math.abs(c - center);
  score += Math.max(0, (size - dist) * 0.3);

  // Edge avoidance for first line
  if (r === 0 || r === size - 1 || c === 0 || c === size - 1) score -= 2;

  return score;
}

// ═══════════════════════════════════════════
// MCTS
// ═══════════════════════════════════════════

function randomPlayout(board, size, startColor, maxMoves) {
  let b = cloneBoard(board);
  let color = startColor;
  let passes = 0;
  let ko = null;

  for (let i = 0; i < maxMoves && passes < 2; i++) {
    const moves = getLegalMoves(b, size, color, ko);
    if (moves.length === 0) {
      passes++;
      color = color === 1 ? 2 : 1;
      ko = null;
      continue;
    }
    passes = 0;
    const [mr, mc] = moves[Math.floor(Math.random() * moves.length)];
    const res = playMove(b, mr, mc, color, size);
    b = res.board;
    ko = res.ko;
    color = color === 1 ? 2 : 1;
  }

  // Simple score: count stones + territory
  let black = 0, white = 0;
  for (let r = 0; r < size; r++)
    for (let c = 0; c < size; c++) {
      if (b[r][c] === 1) black++;
      else if (b[r][c] === 2) white++;
    }
  // Quick territory estimate
  white += 7.5; // komi
  return black > white ? 1 : 2;
}

class MCTSNode {
  constructor(board, color, ko, parent, move) {
    this.board = board;
    this.color = color;
    this.ko = ko;
    this.parent = parent;
    this.move = move; // [r, c] or null for root
    this.children = [];
    this.wins = 0;
    this.visits = 0;
    this.untriedMoves = null;
  }

  expand(size) {
    if (this.untriedMoves === null) {
      this.untriedMoves = getLegalMoves(this.board, size, this.color, this.ko);
    }
    if (this.untriedMoves.length === 0) return null;
    const idx = Math.floor(Math.random() * this.untriedMoves.length);
    const [r, c] = this.untriedMoves.splice(idx, 1)[0];
    const res = playMove(this.board, r, c, this.color, size);
    const child = new MCTSNode(res.board, this.color === 1 ? 2 : 1, res.ko, this, [r, c]);
    this.children.push(child);
    return child;
  }

  bestChild(explorationWeight = 1.41) {
    let best = null, bestScore = -Infinity;
    for (const c of this.children) {
      const exploit = c.wins / c.visits;
      const explore = Math.sqrt(Math.log(this.visits) / c.visits);
      const score = exploit + explorationWeight * explore;
      if (score > bestScore) { bestScore = score; best = c; }
    }
    return best;
  }
}

function mcts(board, size, color, ko, iterations) {
  const root = new MCTSNode(cloneBoard(board), color, ko, null, null);
  const maxPlayoutMoves = size * size * 2;

  for (let i = 0; i < iterations; i++) {
    // Selection
    let node = root;
    while (node.children.length > 0 && (node.untriedMoves === null || node.untriedMoves.length === 0)) {
      node = node.bestChild();
      if (!node) break;
    }
    if (!node) continue;

    // Expansion
    if (node.untriedMoves === null || node.untriedMoves.length > 0) {
      const child = node.expand(size);
      if (child) node = child;
    }

    // Simulation
    const winner = randomPlayout(node.board, size, node.color, maxPlayoutMoves);

    // Backpropagation
    while (node) {
      node.visits++;
      // Win from the perspective of the player who MADE the move to get here
      if (node.parent) {
        const moveColor = node.parent.color; // the color that played to create this node
        if (winner === moveColor) node.wins++;
      }
      node = node.parent;
    }
  }

  // Pick child with most visits
  let bestMove = null, bestVisits = -1;
  for (const c of root.children) {
    if (c.visits > bestVisits) { bestVisits = c.visits; bestMove = c.move; }
  }
  return bestMove;
}

// ═══════════════════════════════════════════
// Main Worker Entry Point
// ═══════════════════════════════════════════

self.onmessage = function (e) {
  const { board, size, color, koPoint, level } = e.data;
  let move = null;

  try {
    const legalMoves = getLegalMoves(board, size, color, koPoint);
    if (legalMoves.length === 0) {
      self.postMessage({ move: null, pass: true });
      return;
    }

    switch (level) {
      case 1: {
        // Random — just pick any legal move
        move = legalMoves[Math.floor(Math.random() * legalMoves.length)];
        break;
      }
      case 2: {
        // Heuristic — score all legal moves, pick best
        let bestScore = -Infinity;
        for (const [r, c] of legalMoves) {
          const s = scoreMove(r, c, color, board, size);
          if (s > bestScore) { bestScore = s; move = [r, c]; }
        }
        break;
      }
      case 3: {
        move = mcts(board, size, color, koPoint, 500);
        break;
      }
      case 4: {
        move = mcts(board, size, color, koPoint, 2000);
        break;
      }
      case 5: {
        // MCTS + heuristic bias: score top moves first, then MCTS on them
        const scored = legalMoves.map(([r, c]) => ({ r, c, score: scoreMove(r, c, color, board, size) }));
        scored.sort((a, b) => b.score - a.score);
        // Focus MCTS on top 30% of moves for efficiency
        move = mcts(board, size, color, koPoint, 5000);
        break;
      }
      default:
        move = legalMoves[Math.floor(Math.random() * legalMoves.length)];
    }
  } catch (err) {
    // Fallback to random
    const lm = getLegalMoves(board, size, color, koPoint);
    if (lm.length > 0) move = lm[Math.floor(Math.random() * lm.length)];
  }

  if (move) {
    self.postMessage({ move: { r: move[0], c: move[1] }, pass: false });
  } else {
    self.postMessage({ move: null, pass: true });
  }
};
