// ============================================
// SuckCard.com — Liar's Deck Game Manager
// Turn-based bluffing card game logic
// ============================================

const RANKS = ['J', 'Q', 'K', 'A'];
const RANK_LABELS = { J: 'Jack', Q: 'Queen', K: 'King', A: 'Ace' };

class LiarDeckGame {
  constructor(playerIds) {
    this.playerIds = [...playerIds];
    this.players = new Map(); // pid -> { lives, hand, status }
    this.tablePile = [];      // all cards on table this round
    this.lastPlay = null;     // { playerId, cards: [...] }
    this.targetCard = null;   // current round target rank
    this.currentTurnIndex = 0;
    this.phase = 'waiting';   // waiting | playing | resolution | finished
    this.winner = null;
    this.turnTimer = null;
    this.roundNumber = 0;
    this.cardIdCounter = 0;
    this.log = [];            // game log messages

    for (const pid of this.playerIds) {
      this.players.set(pid, { lives: 3, hand: [], status: 'ALIVE' });
    }
  }

  // ------------------------------------------
  // Deck & Deal
  // ------------------------------------------

  _nextCardId() {
    return `ld_${++this.cardIdCounter}`;
  }

  _createDeck() {
    const deck = [];
    // 4 of each rank
    for (const rank of RANKS) {
      for (let i = 0; i < 4; i++) {
        deck.push({ id: this._nextCardId(), rank, isJoker: false });
      }
    }
    // 2 Jokers
    deck.push({ id: this._nextCardId(), rank: 'JOKER', isJoker: true });
    deck.push({ id: this._nextCardId(), rank: 'JOKER', isJoker: true });
    return deck; // 18 cards total
  }

  _shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  // ------------------------------------------
  // Round Management
  // ------------------------------------------

  startRound() {
    this.roundNumber++;
    this.tablePile = [];
    this.lastPlay = null;
    this.phase = 'playing';

    // Pick random target
    this.targetCard = RANKS[Math.floor(Math.random() * RANKS.length)];

    // Build & shuffle deck
    const deck = this._shuffle(this._createDeck());

    // Get alive players
    const alivePids = this._getAlive();

    // Clear hands
    for (const pid of alivePids) {
      this.players.get(pid).hand = [];
    }

    // Deal evenly
    for (let i = 0; i < deck.length; i++) {
      const pid = alivePids[i % alivePids.length];
      this.players.get(pid).hand.push(deck[i]);
    }

    // Sort each hand
    for (const pid of alivePids) {
      this.players.get(pid).hand.sort((a, b) => {
        const order = ['J', 'Q', 'K', 'A', 'JOKER'];
        return order.indexOf(a.rank) - order.indexOf(b.rank);
      });
    }

    // Set first player for this round
    this.currentTurnIndex = this.roundNumber % alivePids.length;

    this.log.push({
      type: 'round-start',
      round: this.roundNumber,
      targetCard: this.targetCard,
      targetLabel: RANK_LABELS[this.targetCard],
    });

    return {
      targetCard: this.targetCard,
      targetLabel: RANK_LABELS[this.targetCard],
      round: this.roundNumber,
    };
  }

  // ------------------------------------------
  // Player Actions
  // ------------------------------------------

  playCards(playerId, cardIds) {
    if (this.phase !== 'playing') return { error: 'NOT_PLAYING' };
    if (playerId !== this._getCurrentPlayerId()) return { error: 'NOT_YOUR_TURN' };
    if (!cardIds || cardIds.length < 1 || cardIds.length > 3) return { error: 'INVALID_CARD_COUNT' };

    const player = this.players.get(playerId);
    if (!player || player.status !== 'ALIVE') return { error: 'PLAYER_DEAD' };

    // Verify all cards exist in hand
    const cards = [];
    for (const cid of cardIds) {
      const card = player.hand.find(c => c.id === cid);
      if (!card) return { error: 'CARD_NOT_IN_HAND' };
      cards.push(card);
    }

    // Remove from hand
    player.hand = player.hand.filter(c => !cardIds.includes(c.id));

    // Add to table face-down
    this.tablePile.push(...cards);

    // Record last play
    this.lastPlay = {
      playerId,
      cards: [...cards], // the actual cards (secret until challenged)
      count: cards.length,
    };

    this.log.push({
      type: 'play',
      playerId,
      count: cards.length,
    });

    // Advance turn
    this._advanceTurn();

    // Check: if the player has 0 cards, they just played their last cards
    // Continue the round — they're safe, it keeps going until challenge or all played

    return {
      success: true,
      count: cards.length,
      playerId,
      nextTurn: this._getCurrentPlayerId(),
    };
  }

  callLiar(callerId) {
    if (this.phase !== 'playing') return { error: 'NOT_PLAYING' };
    if (callerId !== this._getCurrentPlayerId()) return { error: 'NOT_YOUR_TURN' };
    if (!this.lastPlay) return { error: 'NO_CARDS_TO_CHALLENGE' };

    this.phase = 'resolution';

    const accusedId = this.lastPlay.playerId;
    const flippedCards = this.lastPlay.cards;

    // Check if the accused lied
    const lied = flippedCards.some(c => !c.isJoker && c.rank !== this.targetCard);

    let loserId, resultType;

    if (lied) {
      // Accused lied — they lose a life
      loserId = accusedId;
      resultType = 'CAUGHT';
    } else {
      // Accused was honest — caller loses a life
      loserId = callerId;
      resultType = 'WRONG_CALL';
    }

    const loser = this.players.get(loserId);
    loser.lives--;

    this.log.push({
      type: 'resolution',
      callerId,
      accusedId,
      flippedCards,
      lied,
      loserId,
      resultType,
    });

    // Check elimination
    let eliminated = false;
    if (loser.lives <= 0) {
      loser.status = 'ELIMINATED';
      loser.lives = 0;
      eliminated = true;
      this.log.push({ type: 'eliminated', playerId: loserId });
    }

    // Check win condition
    const alive = this._getAlive();
    let gameOver = false;
    if (alive.length <= 1) {
      this.phase = 'finished';
      this.winner = alive[0] || null;
      gameOver = true;
      this.log.push({ type: 'game-over', winner: this.winner });
    }

    return {
      success: true,
      resultType,
      callerId,
      accusedId,
      flippedCards,
      loserId,
      livesLeft: loser.lives,
      eliminated,
      gameOver,
      winner: this.winner,
    };
  }

  // Auto-play when timer runs out
  autoPlay(playerId) {
    const player = this.players.get(playerId);
    if (!player || player.hand.length === 0) {
      // Can't play, skip turn
      this._advanceTurn();
      return { success: true, skipped: true, nextTurn: this._getCurrentPlayerId() };
    }
    // Play 1 random card
    const randomCard = player.hand[Math.floor(Math.random() * player.hand.length)];
    return this.playCards(playerId, [randomCard.id]);
  }

  // ------------------------------------------
  // State Getters
  // ------------------------------------------

  getClientState(pid) {
    const alive = this._getAlive();
    const currentTurn = this._getCurrentPlayerId();

    const playersData = {};
    for (const [id, p] of this.players) {
      playersData[id] = {
        lives: p.lives,
        status: p.status,
        cardCount: p.hand.length,
        hand: id === pid ? p.hand : undefined, // only show own hand
      };
    }

    return {
      phase: this.phase,
      targetCard: this.targetCard,
      targetLabel: this.targetCard ? RANK_LABELS[this.targetCard] : null,
      currentTurn,
      players: playersData,
      myHand: this.players.get(pid)?.hand || [],
      tablePileCount: this.tablePile.length,
      lastPlay: this.lastPlay ? {
        playerId: this.lastPlay.playerId,
        count: this.lastPlay.count,
        // Don't reveal actual cards!
      } : null,
      roundNumber: this.roundNumber,
      winner: this.winner,
    };
  }

  // ------------------------------------------
  // Internal
  // ------------------------------------------

  _getAlive() {
    return this.playerIds.filter(pid => {
      const p = this.players.get(pid);
      return p && p.status === 'ALIVE';
    });
  }

  _getCurrentPlayerId() {
    const alive = this._getAlive();
    if (alive.length === 0) return null;
    return alive[this.currentTurnIndex % alive.length];
  }

  _advanceTurn() {
    const alive = this._getAlive();
    if (alive.length === 0) return;
    this.currentTurnIndex = (this.currentTurnIndex + 1) % alive.length;
  }
}

module.exports = { LiarDeckGame };
