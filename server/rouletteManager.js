// SuckCard.com — Tactical Deal: Roulette Game Manager
'use strict';

// ==========================================
// Card Definitions
// ==========================================

const ACTION_CARDS = [
  { type: 'action', value: 1 },
  { type: 'action', value: 1 },
  { type: 'action', value: 1 },
  { type: 'action', value: 2 },
  { type: 'action', value: 2 },
  { type: 'action', value: 3 },
];

const SUPPORT_CARDS = [
  { type: 'support', name: 'skip', label: 'Qua Lượt' },
  { type: 'support', name: 'skip', label: 'Qua Lượt' },
  { type: 'support', name: 'redirect', label: 'Bắn Kẻ Khác' },
  { type: 'support', name: 'redirect', label: 'Bắn Kẻ Khác' },
  { type: 'support', name: 'reverse', label: 'Đảo Chiều' },
  { type: 'support', name: 'reverse', label: 'Đảo Chiều' },
  { type: 'support', name: 'heal', label: 'Hồi Máu' },
  { type: 'support', name: 'heal', label: 'Hồi Máu' },
  { type: 'support', name: 'addBullet', label: 'Thêm 1 Viên' },
  { type: 'support', name: 'addBullet', label: 'Thêm 1 Viên' },
  { type: 'support', name: 'plusOne', label: 'Thêm Lần Bắn' },
  { type: 'support', name: 'plusOne', label: 'Thêm Lần Bắn' },
  { type: 'support', name: 'spin', label: 'Xoay Ổ Đạn' },
  { type: 'support', name: 'spin', label: 'Xoay Ổ Đạn' },
];

// ==========================================
// Utility
// ==========================================

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

let cardIdCounter = 0;
function makeCard(template) {
  return { ...template, id: `card_${++cardIdCounter}` };
}

// ==========================================
// RouletteGame Class
// ==========================================

class RouletteGame {
  constructor(playerIds) {
    this.playerIds = [...playerIds];
    this.players = new Map();
    this.phase = 'waiting'; // waiting | playing | finished
    this.turnPhase = 'idle'; // idle | draw | choice | forced_fire | card_play | firing | resolve
    this.currentTurnIndex = 0;
    this.turnDirection = 1; // 1 = clockwise, -1 = counter-clockwise
    this.difficultyLevel = 1;

    // Gun state
    this.chambers = [];
    this.chamberIndex = 0;

    // Deck
    this.deck = [];

    // Turn state
    this.requiredShots = 0;
    this.shotsFired = 0;
    this.currentTarget = null; // null = self, pid = opponent
    this.drawnCard = null;
    this.turnActions = []; // Log of actions this turn

    // Initialize players
    for (const pid of playerIds) {
      this.players.set(pid, {
        id: pid,
        hp: 5,
        maxHp: 5,
        hand: [],
        status: 'alive', // alive | dead
      });
    }
  }

  // ------------------------------------------
  // Game Start
  // ------------------------------------------

  startGame() {
    this.phase = 'playing';
    this._buildDeck();
    this.resetGun(1);

    // Random first player
    this.currentTurnIndex = Math.floor(Math.random() * this.playerIds.length);
    this._startTurn();

    return {
      phase: 'playing',
      players: this._getPublicPlayers(),
      gun: this._getPublicGun(),
      currentTurn: this.getCurrentTurnPlayer(),
      turnPhase: this.turnPhase,
      turnDirection: this.turnDirection,
      difficultyLevel: this.difficultyLevel,
    };
  }

  // ------------------------------------------
  // Gun Mechanics
  // ------------------------------------------

  resetGun(level) {
    this.difficultyLevel = level;
    const liveCount = Math.min(level, 4);
    const blankCount = 6 - liveCount;

    const bullets = [];
    for (let i = 0; i < liveCount; i++) bullets.push('LIVE');
    for (let i = 0; i < blankCount; i++) bullets.push('BLANK');

    this.chambers = shuffle(bullets);
    this.chamberIndex = 0;
  }

  spinChambers() {
    this.chambers = shuffle(this.chambers);
    this.chamberIndex = 0;
  }

  addBullet() {
    // Replace a random BLANK with LIVE
    const blankIndices = [];
    for (let i = 0; i < this.chambers.length; i++) {
      if (this.chambers[i] === 'BLANK') blankIndices.push(i);
    }
    if (blankIndices.length > 0) {
      const idx = blankIndices[Math.floor(Math.random() * blankIndices.length)];
      this.chambers[idx] = 'LIVE';
    }
    // Respin
    this.spinChambers();
  }

  fire() {
    if (this.chamberIndex >= this.chambers.length) {
      // Should not happen — gun should be reset before this
      this.resetGun(this.difficultyLevel);
    }
    const bullet = this.chambers[this.chamberIndex];
    this.chamberIndex++;
    return bullet; // 'LIVE' or 'BLANK'
  }

  // ------------------------------------------
  // Deck
  // ------------------------------------------

  _buildDeck() {
    const cards = [];
    // 2 copies of the full set
    for (let copy = 0; copy < 2; copy++) {
      for (const tmpl of ACTION_CARDS) cards.push(makeCard(tmpl));
      for (const tmpl of SUPPORT_CARDS) cards.push(makeCard(tmpl));
    }
    this.deck = shuffle(cards);
  }

  drawFromDeck() {
    if (this.deck.length === 0) {
      this._buildDeck(); // Reshuffle if empty
    }
    return this.deck.pop();
  }

  // ------------------------------------------
  // Turn Management
  // ------------------------------------------

  getCurrentTurnPlayer() {
    return this.playerIds[this.currentTurnIndex];
  }

  _getNextAliveIndex(fromIndex) {
    const total = this.playerIds.length;
    for (let offset = 1; offset <= total; offset++) {
      const idx = (fromIndex + this.turnDirection * offset + total * total) % total;
      const pid = this.playerIds[idx];
      const player = this.players.get(pid);
      if (player && player.status === 'alive') return idx;
    }
    return -1;
  }

  _startTurn() {
    // Skip dead players
    const pid = this.getCurrentTurnPlayer();
    const player = this.players.get(pid);
    if (player.status === 'dead') {
      this.currentTurnIndex = this._getNextAliveIndex(this.currentTurnIndex);
    }

    this.turnPhase = 'draw';
    this.requiredShots = 0;
    this.shotsFired = 0;
    this.currentTarget = null;
    this.drawnCard = null;
    this.turnActions = [];
  }

  _advanceTurn() {
    this.currentTurnIndex = this._getNextAliveIndex(this.currentTurnIndex);
    this._startTurn();
  }

  _checkGameOver() {
    const alive = this.playerIds.filter(pid => {
      const p = this.players.get(pid);
      return p && p.status === 'alive';
    });
    if (alive.length <= 1) {
      this.phase = 'finished';
      return { finished: true, winner: alive[0] || null };
    }
    return { finished: false };
  }

  // ------------------------------------------
  // Game Actions
  // ------------------------------------------

  // DRAW PHASE
  draw(playerId) {
    if (this.phase !== 'playing') return { error: 'GAME_NOT_ACTIVE' };
    if (playerId !== this.getCurrentTurnPlayer()) return { error: 'NOT_YOUR_TURN' };
    if (this.turnPhase !== 'draw') return { error: 'WRONG_PHASE' };

    const card = this.drawFromDeck();
    this.drawnCard = card;

    if (card.type === 'action') {
      // Forced fire: must shoot self X times
      this.requiredShots = card.value;
      this.shotsFired = 0;
      this.currentTarget = null; // self
      this.turnPhase = 'forced_fire';

      return {
        card,
        turnPhase: 'forced_fire',
        requiredShots: this.requiredShots,
        target: 'self',
      };
    } else {
      // Support card: add to hand
      const player = this.players.get(playerId);
      player.hand.push(card);
      this.turnPhase = 'choice';

      return {
        card,
        turnPhase: 'choice',
        hand: player.hand,
      };
    }
  }

  // CHOICE PHASE: select target
  aim(playerId, targetId) {
    if (playerId !== this.getCurrentTurnPlayer()) return { error: 'NOT_YOUR_TURN' };
    if (this.turnPhase !== 'choice') return { error: 'WRONG_PHASE' };

    if (targetId === playerId || targetId === 'self') {
      this.currentTarget = null; // self
    } else {
      const target = this.players.get(targetId);
      if (!target || target.status !== 'alive') return { error: 'INVALID_TARGET' };
      this.currentTarget = targetId;
    }

    this.requiredShots = 1;
    this.shotsFired = 0;
    this.turnPhase = 'firing';

    return {
      target: this.currentTarget || playerId,
      turnPhase: 'firing',
      requiredShots: this.requiredShots,
    };
  }

  // FIRE
  pullTrigger(playerId) {
    if (playerId !== this.getCurrentTurnPlayer()) return { error: 'NOT_YOUR_TURN' };
    if (this.turnPhase !== 'firing' && this.turnPhase !== 'forced_fire') return { error: 'WRONG_PHASE' };

    const bullet = this.fire();
    this.shotsFired++;

    const actualTarget = this.currentTarget || playerId; // null = self
    const isTargetSelf = actualTarget === playerId;

    let damage = 0;
    let gunReset = false;
    let extraTurn = false;
    let turnEnds = false;

    if (bullet === 'LIVE') {
      damage = 1;
      const target = this.players.get(actualTarget);
      target.hp = Math.max(0, target.hp - 1);
      if (target.hp <= 0) {
        target.status = 'dead';
      }

      // Gun resets on LIVE
      gunReset = true;
      this.difficultyLevel++;
      this.resetGun(this.difficultyLevel);

      // LIVE always ends the firing sequence
      turnEnds = true;
    } else {
      // BLANK
      if (isTargetSelf && this.turnPhase === 'choice') {
        // Self-aim blank = extra turn (only in choice phase, not forced)
        extraTurn = true;
      }

      if (this.shotsFired >= this.requiredShots) {
        turnEnds = true;
      }
    }

    // Correct extra turn logic for choice phase self-aim
    if (isTargetSelf && bullet === 'BLANK' && this.turnPhase === 'firing') {
      extraTurn = true;
      turnEnds = true; // Ends this firing, but gets extra turn
    }

    const result = {
      bullet,
      target: actualTarget,
      isTargetSelf,
      damage,
      gunReset,
      extraTurn,
      shotsFired: this.shotsFired,
      requiredShots: this.requiredShots,
      remainingShots: this.requiredShots - this.shotsFired,
    };

    // Check game over
    const gameOverCheck = this._checkGameOver();
    if (gameOverCheck.finished) {
      this.phase = 'finished';
      result.gameOver = true;
      result.winner = gameOverCheck.winner;
      result.players = this._getPublicPlayers();
      return result;
    }

    if (turnEnds) {
      if (extraTurn) {
        // Extra turn: reset to draw phase, same player
        this._startTurn();
        result.nextTurn = this.getCurrentTurnPlayer();
        result.turnPhase = this.turnPhase;
      } else {
        // Advance to next player
        this._advanceTurn();
        result.nextTurn = this.getCurrentTurnPlayer();
        result.turnPhase = this.turnPhase;
      }
    } else {
      result.nextTurn = playerId;
      result.turnPhase = this.turnPhase;
    }

    result.players = this._getPublicPlayers();
    result.gun = this._getPublicGun();
    return result;
  }

  // PLAY SUPPORT CARD
  playCard(playerId, cardId) {
    if (playerId !== this.getCurrentTurnPlayer()) return { error: 'NOT_YOUR_TURN' };
    if (!['choice', 'forced_fire', 'firing'].includes(this.turnPhase)) return { error: 'WRONG_PHASE' };

    const player = this.players.get(playerId);
    const cardIndex = player.hand.findIndex(c => c.id === cardId);
    if (cardIndex === -1) return { error: 'CARD_NOT_IN_HAND' };

    const card = player.hand.splice(cardIndex, 1)[0];
    const effect = { card, playerId };

    switch (card.name) {
      case 'skip':
        // End turn without firing
        this._advanceTurn();
        effect.action = 'skip';
        effect.nextTurn = this.getCurrentTurnPlayer();
        effect.turnPhase = this.turnPhase;
        break;

      case 'redirect':
        // Switch to aiming at opponent (needs target selection after)
        this.turnPhase = 'choice';
        effect.action = 'redirect';
        effect.turnPhase = 'choice';
        break;

      case 'reverse':
        this.turnDirection *= -1;
        effect.action = 'reverse';
        effect.turnDirection = this.turnDirection;
        break;

      case 'heal':
        player.hp = Math.min(player.maxHp, player.hp + 1);
        effect.action = 'heal';
        effect.newHp = player.hp;
        break;

      case 'addBullet':
        this.addBullet();
        effect.action = 'addBullet';
        effect.gun = this._getPublicGun();
        break;

      case 'plusOne':
        this.requiredShots++;
        effect.action = 'plusOne';
        effect.requiredShots = this.requiredShots;
        break;

      case 'spin':
        this.spinChambers();
        effect.action = 'spin';
        effect.gun = this._getPublicGun();
        break;

      default:
        player.hand.splice(cardIndex, 0, card); // Put back
        return { error: 'UNKNOWN_CARD' };
    }

    effect.players = this._getPublicPlayers();
    effect.hand = player.hand;
    return effect;
  }

  // ------------------------------------------
  // State Getters
  // ------------------------------------------

  _getPublicPlayers() {
    const result = {};
    for (const [pid, player] of this.players) {
      result[pid] = {
        id: pid,
        hp: player.hp,
        maxHp: player.maxHp,
        cardCount: player.hand.length,
        status: player.status,
      };
    }
    return result;
  }

  _getPublicGun() {
    return {
      totalChambers: this.chambers.length,
      fired: this.chamberIndex,
      remaining: this.chambers.length - this.chamberIndex,
      difficultyLevel: this.difficultyLevel,
    };
  }

  getFullState(playerId) {
    const player = this.players.get(playerId);
    return {
      phase: this.phase,
      turnPhase: this.turnPhase,
      players: this._getPublicPlayers(),
      gun: this._getPublicGun(),
      currentTurn: this.getCurrentTurnPlayer(),
      turnDirection: this.turnDirection,
      difficultyLevel: this.difficultyLevel,
      myHand: player ? player.hand : [],
      requiredShots: this.requiredShots,
      shotsFired: this.shotsFired,
      currentTarget: this.currentTarget,
      drawnCard: this.drawnCard,
      deckCount: this.deck.length,
    };
  }
}

module.exports = { RouletteGame };
