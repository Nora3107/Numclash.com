// ============================================
// SuckCard.com — Old Maid Game Manager
// Turn-based card game logic
// ============================================

const SUITS = ['spades', 'hearts', 'diamonds', 'clubs'];
const SUIT_SYMBOLS = { spades: '♠', hearts: '♥', diamonds: '♦', clubs: '♣' };
const FULL_VALUES = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
const QUICK_VALUES = ['8', '9', '10', 'J', 'Q', 'K', 'A'];

// Points by finish rank (index 0 = 1st out, last = loser with Joker)
const OLDMAID_SCORES = [30, 15, 5, 0, -10, -20];

class OldMaidGame {
  constructor(playerIds, deckType = 'quick') {
    this.playerIds = [...playerIds]; // ordered clockwise
    this.deckType = deckType;
    this.hands = new Map();          // playerId -> [{id, value, suit}]
    this.discardPile = [];           // [{id, value, suit, rotation}]
    this.currentTurnIndex = 0;
    this.turnTimer = null;
    this.rankings = [];              // ordered: first out -> ... -> loser
    this.phase = 'dealing';          // dealing | playing | finished
    this.turnStartTime = null;
    this.cardIdCounter = 0;
  }

  // ------------------------------------------
  // Deck & Deal
  // ------------------------------------------

  _createDeck() {
    const values = this.deckType === 'full' ? FULL_VALUES : QUICK_VALUES;
    const deck = [];
    for (const suit of SUITS) {
      for (const value of values) {
        deck.push({ id: this._nextCardId(), value, suit });
      }
    }
    // Add Joker
    deck.push({ id: this._nextCardId(), value: 'JOKER', suit: 'joker' });
    return deck;
  }

  _nextCardId() {
    return `card_${++this.cardIdCounter}`;
  }

  _shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  deal() {
    const deck = this._shuffle(this._createDeck());
    // Initialize empty hands
    for (const pid of this.playerIds) {
      this.hands.set(pid, []);
    }
    // Deal round-robin
    let idx = 0;
    for (const card of deck) {
      const pid = this.playerIds[idx % this.playerIds.length];
      this.hands.get(pid).push(card);
      idx++;
    }
  }

  // ------------------------------------------
  // Pair Detection & Auto-Discard
  // ------------------------------------------

  _findPairs(hand) {
    const pairs = [];
    const used = new Set();
    for (let i = 0; i < hand.length; i++) {
      if (used.has(i)) continue;
      if (hand[i].value === 'JOKER') continue;
      for (let j = i + 1; j < hand.length; j++) {
        if (used.has(j)) continue;
        if (hand[i].value === hand[j].value) {
          pairs.push([i, j]);
          used.add(i);
          used.add(j);
          break;
        }
      }
    }
    return pairs;
  }

  autoDiscardPairs(playerId) {
    const hand = this.hands.get(playerId);
    if (!hand) return [];

    const pairs = this._findPairs(hand);
    if (pairs.length === 0) return [];

    const discarded = [];
    const removeIndices = new Set();
    for (const [i, j] of pairs) {
      removeIndices.add(i);
      removeIndices.add(j);
      const rotation = Math.random() * 30 - 15; // -15 to 15 degrees
      const offsetX = Math.random() * 40 - 20;
      const offsetY = Math.random() * 40 - 20;
      discarded.push(
        { ...hand[i], rotation, offsetX, offsetY },
        { ...hand[j], rotation: rotation + 5, offsetX: offsetX + 15, offsetY: offsetY + 10 }
      );
    }

    // Remove paired cards (reverse order to maintain indices)
    const sortedIndices = [...removeIndices].sort((a, b) => b - a);
    for (const idx of sortedIndices) {
      hand.splice(idx, 1);
    }

    this.discardPile.push(...discarded);
    return discarded;
  }

  autoDiscardAllPlayers() {
    const allDiscarded = {};
    for (const pid of this.playerIds) {
      const discarded = this.autoDiscardPairs(pid);
      if (discarded.length > 0) {
        allDiscarded[pid] = discarded;
      }
    }
    return allDiscarded;
  }

  // ------------------------------------------
  // Turn Management
  // ------------------------------------------

  _getActivePlayers() {
    return this.playerIds.filter(pid => {
      const hand = this.hands.get(pid);
      return hand && hand.length > 0;
    });
  }

  _getNextActiveIndex(fromIndex) {
    const total = this.playerIds.length;
    for (let offset = 1; offset <= total; offset++) {
      const idx = (fromIndex + offset) % total;
      const pid = this.playerIds[idx];
      const hand = this.hands.get(pid);
      if (hand && hand.length > 0) return idx;
    }
    return -1; // no active players (shouldn't happen)
  }

  getCurrentTurnPlayer() {
    return this.playerIds[this.currentTurnIndex];
  }

  getDrawTarget() {
    // The player NEXT in clockwise order (who still has cards)
    return this.playerIds[this._getNextActiveIndex(this.currentTurnIndex)];
  }

  startGame() {
    this.deal();
    const initialDiscards = this.autoDiscardAllPlayers();

    // Check if anyone is already out after initial discard
    this._checkPlayersOut();

    // Random first player
    const activePlayers = this._getActivePlayers();
    if (activePlayers.length <= 1) {
      this.phase = 'finished';
      return { phase: 'finished', initialDiscards, rankings: this.rankings };
    }

    const randomIdx = Math.floor(Math.random() * activePlayers.length);
    const firstPlayer = activePlayers[randomIdx];
    this.currentTurnIndex = this.playerIds.indexOf(firstPlayer);
    this.phase = 'playing';
    this.turnStartTime = Date.now();

    return {
      phase: 'playing',
      hands: this._getPublicHands(),
      discardPile: this.discardPile,
      currentTurn: this.getCurrentTurnPlayer(),
      drawTarget: this.getDrawTarget(),
      initialDiscards,
    };
  }

  // ------------------------------------------
  // Drawing Cards
  // ------------------------------------------

  drawCard(drawerId, cardIndex) {
    if (this.phase !== 'playing') return { error: 'GAME_NOT_ACTIVE' };

    const currentPlayer = this.getCurrentTurnPlayer();
    if (drawerId !== currentPlayer) return { error: 'NOT_YOUR_TURN' };

    const targetId = this.getDrawTarget();
    const targetHand = this.hands.get(targetId);
    if (!targetHand || targetHand.length === 0) return { error: 'TARGET_HAS_NO_CARDS' };

    // Validate card index
    const safeIndex = Math.max(0, Math.min(cardIndex, targetHand.length - 1));
    const drawnCard = targetHand.splice(safeIndex, 1)[0];

    // Add to drawer's hand
    const drawerHand = this.hands.get(drawerId);
    drawerHand.push(drawnCard);

    // Capture INTERMEDIATE hand (with drawn card, BEFORE pair removal)
    const intermediateHands = {};
    for (const pid of this.playerIds) {
      intermediateHands[pid] = this.getPrivateHand(pid);
    }

    // Check for new pairs
    const discarded = this.autoDiscardPairs(drawerId);

    // Check if anyone is now out
    this._checkPlayersOut();

    // Check game over
    const activePlayers = this._getActivePlayers();
    if (activePlayers.length <= 1) {
      this.phase = 'finished';
      if (activePlayers.length === 1) {
        this.rankings.push(activePlayers[0]);
      }
      return {
        phase: 'finished',
        drawnCard,
        discarded,
        from: targetId,
        to: drawerId,
        rankings: this.rankings,
        scores: this._calculateScores(),
        intermediateHands,
      };
    }

    // Advance turn to the draw target (person who was drawn from)
    this._advanceTurnToTarget(targetId);

    return {
      phase: 'playing',
      drawnCard,
      discarded,
      from: targetId,
      to: drawerId,
      currentTurn: this.getCurrentTurnPlayer(),
      drawTarget: this.getDrawTarget(),
      hands: this._getPublicHands(),
      intermediateHands,
    };
  }

  autoDrawRandom(drawerId) {
    const targetId = this.getDrawTarget();
    const targetHand = this.hands.get(targetId);
    if (!targetHand || targetHand.length === 0) return null;
    const randomIndex = Math.floor(Math.random() * targetHand.length);
    return this.drawCard(drawerId, randomIndex);
  }

  _advanceTurn() {
    // In Old Maid: after drawer draws from target, the TARGET gets the next turn
    // This is set by drawCard() directly, so this just updates the timestamp
    this.turnStartTime = Date.now();
  }

  _advanceTurnToTarget(targetId) {
    // Set turn to the draw target (the person who was drawn from)
    const targetIdx = this.playerIds.indexOf(targetId);
    if (targetIdx !== -1) {
      const hand = this.hands.get(targetId);
      if (hand && hand.length > 0) {
        // Target still has cards, they go next
        this.currentTurnIndex = targetIdx;
      } else {
        // Target ran out of cards, advance to next active player from target
        this.currentTurnIndex = this._getNextActiveIndex(targetIdx);
      }
    } else {
      this.currentTurnIndex = this._getNextActiveIndex(this.currentTurnIndex);
    }
    this.turnStartTime = Date.now();
  }

  _checkPlayersOut() {
    for (const pid of this.playerIds) {
      if (this.rankings.includes(pid)) continue;
      const hand = this.hands.get(pid);
      if (hand && hand.length === 0) {
        this.rankings.push(pid);
      }
    }
  }

  // ------------------------------------------
  // Reorder Hand (for bluffing)
  // ------------------------------------------

  reorderHand(playerId, newOrder) {
    const hand = this.hands.get(playerId);
    if (!hand) return false;
    if (newOrder.length !== hand.length) return false;

    // newOrder is array of card IDs in desired order
    const cardMap = new Map(hand.map(c => [c.id, c]));
    const reordered = [];
    for (const cardId of newOrder) {
      const card = cardMap.get(cardId);
      if (!card) return false;
      reordered.push(card);
    }
    this.hands.set(playerId, reordered);
    return true;
  }

  // ------------------------------------------
  // State Helpers
  // ------------------------------------------

  _getPublicHands() {
    const result = {};
    for (const [pid, hand] of this.hands) {
      result[pid] = {
        count: hand.length,
        cards: hand.map(c => ({ id: c.id })), // Only IDs (face down for opponents)
      };
    }
    return result;
  }

  getPrivateHand(playerId) {
    const hand = this.hands.get(playerId);
    if (!hand) return [];
    return hand.map(c => ({ id: c.id, value: c.value, suit: c.suit }));
  }

  _calculateScores() {
    const scores = {};
    for (let i = 0; i < this.rankings.length; i++) {
      const pid = this.rankings[i];
      const scoreIdx = Math.min(i, OLDMAID_SCORES.length - 1);
      // Last person always gets the last (worst) score
      if (i === this.rankings.length - 1 && this.rankings.length > 1) {
        scores[pid] = OLDMAID_SCORES[OLDMAID_SCORES.length - 1];
      } else {
        scores[pid] = OLDMAID_SCORES[scoreIdx] || 0;
      }
    }
    return scores;
  }

  getFullState(forPlayerId) {
    return {
      phase: this.phase,
      playerIds: this.playerIds,
      myHand: this.getPrivateHand(forPlayerId),
      hands: this._getPublicHands(),
      discardPile: this.discardPile,
      currentTurn: this.getCurrentTurnPlayer(),
      drawTarget: this.getDrawTarget(),
      rankings: this.rankings,
      deckType: this.deckType,
    };
  }
}

module.exports = { OldMaidGame, OLDMAID_SCORES, SUIT_SYMBOLS };
