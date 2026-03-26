// ============================================
// Numclash.com — Texas Hold'em Poker Manager
// Core game logic: deck, deal, betting, pots, showdown
// ============================================

const { Hand } = require('pokersolver');

const SUITS = ['s', 'h', 'd', 'c']; // spades, hearts, diamonds, clubs
const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'];

// Map for pokersolver format: "As", "Kh", "Td", etc.
function cardToSolverStr(card) {
  return card.rank + card.suit.charAt(0).toLowerCase();
}

class PokerGame {
  constructor(playerIds, options = {}) {
    this.playerIds = [...playerIds]; // original seat order
    this.options = {
      startingChips: options.startingChips || 1000,
      customChips: options.customChips || {}, // { playerId: chipAmount }
      smallBlind: options.smallBlind || 10,
      bigBlind: options.bigBlind || 20,
    };

    this.players = new Map(); // seatIndex -> player
    this.seatOrder = []; // ordered seat indices with players

    for (let i = 0; i < playerIds.length; i++) {
      const pid = playerIds[i];
      const chips = this.options.customChips[pid] || this.options.startingChips;
      this.players.set(i, {
        id: pid,
        seatIndex: i,
        chips,
        holeCards: [],
        currentBet: 0,   // bet in THIS betting round
        totalBet: 0,      // total bet in this HAND
        status: 'WAITING', // WAITING | ACTIVE | FOLDED | ALL_IN | SPECTATOR
        hasActed: false,
      });
      this.seatOrder.push(i);
    }

    this.communityCards = [];
    this.deck = [];
    this.pots = [];        // [{ amount, eligible: [seatIndex] }]
    this.dealerIndex = -1; // will be set to 0 on first hand
    this.phase = 'WAITING'; // WAITING | PRE_FLOP | FLOP | TURN | RIVER | SHOWDOWN | HAND_OVER
    this.currentTurnSeat = -1;
    this.currentHighestBet = 0;
    this.minRaise = 0;
    this.lastRaiserSeat = -1;
    this.handNumber = 0;
    this.lastAction = null;
    this.winners = null; // set at showdown
  }

  // ------------------------------------------
  // Deck
  // ------------------------------------------

  _buildDeck() {
    const deck = [];
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        deck.push({ rank, suit });
      }
    }
    return deck;
  }

  _shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  _drawCard() {
    return this.deck.pop();
  }

  // ------------------------------------------
  // Hand Lifecycle
  // ------------------------------------------

  _getAlivePlayers() {
    // Players who still have chips (not SPECTATOR)
    return this.seatOrder.filter(si => {
      const p = this.players.get(si);
      return p && p.status !== 'SPECTATOR';
    });
  }

  _getActivePlayers() {
    // Players still in THIS hand (not folded, not spectator)
    return this.seatOrder.filter(si => {
      const p = this.players.get(si);
      return p && (p.status === 'ACTIVE' || p.status === 'ALL_IN');
    });
  }

  _getActionablePlayers() {
    // Players who can still act (ACTIVE only, not ALL_IN or FOLDED)
    return this.seatOrder.filter(si => {
      const p = this.players.get(si);
      return p && p.status === 'ACTIVE';
    });
  }

  startNewHand() {
    this.handNumber++;
    const alive = this._getAlivePlayers();

    // Check game over
    if (alive.length <= 1) {
      this.phase = 'GAME_OVER';
      return { gameOver: true, winner: alive[0] != null ? this.players.get(alive[0]).id : null };
    }

    // Reset
    this.communityCards = [];
    this.pots = [];
    this.currentHighestBet = 0;
    this.minRaise = this.options.bigBlind;
    this.lastRaiserSeat = -1;
    this.lastAction = null;
    this.winners = null;

    // Reset player states
    for (const si of alive) {
      const p = this.players.get(si);
      p.holeCards = [];
      p.currentBet = 0;
      p.totalBet = 0;
      p.status = 'ACTIVE';
      p.hasActed = false;
    }

    // Advance dealer
    this.dealerIndex = this._nextAliveSeat(this.dealerIndex);

    // Build & shuffle deck
    this.deck = this._shuffle(this._buildDeck());

    // Deal hole cards
    for (const si of alive) {
      const p = this.players.get(si);
      p.holeCards = [this._drawCard(), this._drawCard()];
    }

    // Post blinds
    this._postBlinds(alive);

    // Set phase
    this.phase = 'PRE_FLOP';

    // First to act: after BB (or dealer in heads-up)
    if (alive.length === 2) {
      // Heads-up: dealer is SB, acts first pre-flop
      this.currentTurnSeat = this.dealerIndex;
    } else {
      // After BB
      const bbSeat = this._nextAliveSeat(this._nextAliveSeat(this.dealerIndex));
      this.currentTurnSeat = this._nextAliveSeat(bbSeat);
    }

    // Check if only one actionable player (e.g., BB is all-in from blind)
    if (this._getActionablePlayers().length <= 1) {
      // Skip to showdown if no one can act
      this._runOutCommunity();
      return { handStarted: true, skipToShowdown: true };
    }

    return { handStarted: true };
  }

  _postBlinds(alive) {
    let sbSeat, bbSeat;

    if (alive.length === 2) {
      // Heads-up: dealer is SB
      sbSeat = this.dealerIndex;
      bbSeat = this._nextAliveSeat(this.dealerIndex);
    } else {
      sbSeat = this._nextAliveSeat(this.dealerIndex);
      bbSeat = this._nextAliveSeat(sbSeat);
    }

    this._forceBet(sbSeat, this.options.smallBlind);
    this._forceBet(bbSeat, this.options.bigBlind);
    this.currentHighestBet = this.options.bigBlind;
    this.minRaise = this.options.bigBlind; // min raise = BB
    this.lastRaiserSeat = bbSeat; // BB is considered the raiser pre-flop
  }

  _forceBet(seatIndex, amount) {
    const p = this.players.get(seatIndex);
    const actual = Math.min(amount, p.chips);
    p.chips -= actual;
    p.currentBet += actual;
    p.totalBet += actual;
    if (p.chips === 0) p.status = 'ALL_IN';
  }

  _nextAliveSeat(currentSeat) {
    const alive = this._getAlivePlayers();
    if (alive.length === 0) return -1;
    let idx = alive.indexOf(currentSeat);
    if (idx === -1) {
      // Find nearest next
      for (let i = 0; i < this.seatOrder.length; i++) {
        const candidate = (currentSeat + 1 + i) % this.seatOrder.length;
        if (alive.includes(candidate)) return candidate;
      }
    }
    return alive[(idx + 1) % alive.length];
  }

  _nextActionableSeat(currentSeat) {
    const actionable = this._getActionablePlayers();
    if (actionable.length === 0) return -1;
    let idx = actionable.indexOf(currentSeat);
    if (idx === -1) {
      for (let i = 0; i < this.seatOrder.length; i++) {
        const candidate = (currentSeat + 1 + i) % this.seatOrder.length;
        if (actionable.includes(candidate)) return candidate;
      }
    }
    return actionable[(idx + 1) % actionable.length];
  }

  // ------------------------------------------
  // Player Actions
  // ------------------------------------------

  doAction(seatIndex, action, amount = 0) {
    if (this.phase === 'WAITING' || this.phase === 'SHOWDOWN' || this.phase === 'HAND_OVER' || this.phase === 'GAME_OVER') {
      return { error: 'WRONG_PHASE' };
    }
    if (seatIndex !== this.currentTurnSeat) return { error: 'NOT_YOUR_TURN' };
    const p = this.players.get(seatIndex);
    if (!p || p.status !== 'ACTIVE') return { error: 'CANNOT_ACT' };

    let result;
    switch (action) {
      case 'fold':
        result = this._fold(seatIndex);
        break;
      case 'check':
        result = this._check(seatIndex);
        break;
      case 'call':
        result = this._call(seatIndex);
        break;
      case 'raise':
        result = this._raise(seatIndex, amount);
        break;
      case 'allin':
        result = this._allIn(seatIndex);
        break;
      default:
        return { error: 'INVALID_ACTION' };
    }

    if (result.error) return result;

    p.hasActed = true;
    this.lastAction = { seatIndex, action, amount: result.amount || 0 };

    // Check if betting round is over
    const roundOver = this._isBettingRoundOver();

    if (roundOver) {
      return this._advancePhase();
    }

    // Advance turn
    this.currentTurnSeat = this._nextActionableSeat(seatIndex);
    return { success: true, action: this.lastAction, nextTurn: this.currentTurnSeat };
  }

  _fold(si) {
    const p = this.players.get(si);
    p.status = 'FOLDED';

    // Check if only 1 player left
    const active = this._getActivePlayers();
    if (active.length === 1) {
      // Immediate win — no showdown
      return { success: true, amount: 0, immediateWin: true };
    }
    return { success: true, amount: 0 };
  }

  _check(si) {
    const p = this.players.get(si);
    if (p.currentBet < this.currentHighestBet) {
      return { error: 'CANNOT_CHECK' }; // must call or fold
    }
    return { success: true, amount: 0 };
  }

  _call(si) {
    const p = this.players.get(si);
    const toCall = this.currentHighestBet - p.currentBet;
    if (toCall <= 0) return { error: 'NOTHING_TO_CALL' };

    const actual = Math.min(toCall, p.chips);
    p.chips -= actual;
    p.currentBet += actual;
    p.totalBet += actual;
    if (p.chips === 0) p.status = 'ALL_IN';

    return { success: true, amount: actual };
  }

  _raise(si, raiseTotal) {
    const p = this.players.get(si);
    // raiseTotal = total bet the player wants to put in this round
    const toCall = this.currentHighestBet - p.currentBet;
    const raiseAmount = raiseTotal - this.currentHighestBet;

    if (raiseAmount < this.minRaise && raiseTotal < p.chips + p.currentBet) {
      return { error: 'RAISE_TOO_SMALL' };
    }

    const actualBet = raiseTotal - p.currentBet;
    if (actualBet > p.chips) {
      // All-in instead
      return this._allIn(si);
    }

    p.chips -= actualBet;
    p.currentBet += actualBet;
    p.totalBet += actualBet;

    this.minRaise = raiseAmount; // min raise for next raiser
    this.currentHighestBet = raiseTotal;
    this.lastRaiserSeat = si;

    // Reset hasActed for other active players (they need to respond)
    for (const s of this._getActionablePlayers()) {
      if (s !== si) this.players.get(s).hasActed = false;
    }

    if (p.chips === 0) p.status = 'ALL_IN';

    return { success: true, amount: actualBet };
  }

  _allIn(si) {
    const p = this.players.get(si);
    const allInAmount = p.chips;
    const newBet = p.currentBet + allInAmount;

    p.chips = 0;
    p.currentBet = newBet;
    p.totalBet += allInAmount;
    p.status = 'ALL_IN';

    if (newBet > this.currentHighestBet) {
      const raiseAmount = newBet - this.currentHighestBet;
      if (raiseAmount >= this.minRaise) {
        this.minRaise = raiseAmount;
      }
      this.currentHighestBet = newBet;
      this.lastRaiserSeat = si;

      // Reset hasActed for active players
      for (const s of this._getActionablePlayers()) {
        if (s !== si) this.players.get(s).hasActed = false;
      }
    }

    return { success: true, amount: allInAmount };
  }

  // ------------------------------------------
  // Betting Round Logic
  // ------------------------------------------

  _isBettingRoundOver() {
    const active = this._getActivePlayers();

    // Only 1 player remaining
    if (active.length <= 1) return true;

    const actionable = this._getActionablePlayers();
    // Everyone is all-in
    if (actionable.length === 0) return true;

    // If only 1 can act and they've acted, round is over
    if (actionable.length === 1) {
      const p = this.players.get(actionable[0]);
      if (p.hasActed && p.currentBet >= this.currentHighestBet) return true;
    }

    // All actionable players have acted and match the highest bet
    const allMatched = actionable.every(si => {
      const p = this.players.get(si);
      return p.hasActed && p.currentBet >= this.currentHighestBet;
    });

    return allMatched;
  }

  _advancePhase() {
    const active = this._getActivePlayers();

    // Check immediate win (all folded except 1)
    if (active.length === 1) {
      return this._handleImmediateWin(active[0]);
    }

    // Calculate pots
    this._calculatePots();

    // Reset current bets for next round
    for (const si of this.seatOrder) {
      const p = this.players.get(si);
      if (p) p.currentBet = 0;
    }
    this.currentHighestBet = 0;
    this.minRaise = this.options.bigBlind;
    this.lastRaiserSeat = -1;

    // Reset hasActed
    for (const si of this._getActionablePlayers()) {
      this.players.get(si).hasActed = false;
    }

    // Advance phase
    switch (this.phase) {
      case 'PRE_FLOP':
        this.phase = 'FLOP';
        this.communityCards.push(this._drawCard(), this._drawCard(), this._drawCard());
        break;
      case 'FLOP':
        this.phase = 'TURN';
        this.communityCards.push(this._drawCard());
        break;
      case 'TURN':
        this.phase = 'RIVER';
        this.communityCards.push(this._drawCard());
        break;
      case 'RIVER':
        this.phase = 'SHOWDOWN';
        return this._showdown();
    }

    // Check if more betting is possible
    const actionable = this._getActionablePlayers();
    if (actionable.length <= 1) {
      // No more betting possible, deal out remaining community cards
      this._runOutCommunity();
      return this._showdown();
    }

    // Set first to act post-flop: first alive after dealer
    this.currentTurnSeat = this._nextActionableSeatFromDealer();

    return {
      success: true,
      phaseChanged: true,
      newPhase: this.phase,
      communityCards: [...this.communityCards],
      nextTurn: this.currentTurnSeat,
    };
  }

  _nextActionableSeatFromDealer() {
    const actionable = this._getActionablePlayers();
    if (actionable.length === 0) return -1;

    // Find first actionable starting from dealer + 1
    for (let i = 1; i <= this.seatOrder.length; i++) {
      const candidate = (this.dealerIndex + i) % this.seatOrder.length;
      if (actionable.includes(candidate)) return candidate;
    }
    return actionable[0];
  }

  _runOutCommunity() {
    while (this.communityCards.length < 5) {
      this.communityCards.push(this._drawCard());
    }
    // Calculate final pots
    this._calculatePots();
    // Reset current bets
    for (const si of this.seatOrder) {
      const p = this.players.get(si);
      if (p) p.currentBet = 0;
    }
  }

  _handleImmediateWin(winningSeat) {
    this._calculatePots();
    const totalWin = this.pots.reduce((sum, pot) => sum + pot.amount, 0);
    const winner = this.players.get(winningSeat);
    winner.chips += totalWin;

    this.winners = [{
      seatIndex: winningSeat,
      playerId: winner.id,
      amount: totalWin,
      handName: null, // no showdown
    }];

    this.phase = 'HAND_OVER';

    return {
      success: true,
      immediateWin: true,
      winners: this.winners,
      pots: [...this.pots],
    };
  }

  // ------------------------------------------
  // Pot Calculation (Side-Pot Algorithm)
  // ------------------------------------------

  _calculatePots() {
    // Gather all total bets from this hand
    const bets = [];
    for (const si of this.seatOrder) {
      const p = this.players.get(si);
      if (!p || p.status === 'SPECTATOR') continue;
      // Include folded players' bets (they lose chips to pot)
      bets.push({
        seatIndex: si,
        totalBet: p.totalBet,
        folded: p.status === 'FOLDED',
      });
    }

    // Get unique bet levels
    const uniqueLevels = [...new Set(bets.map(b => b.totalBet))].filter(l => l > 0).sort((a, b) => a - b);
    const pots = [];
    let prevLevel = 0;

    for (const level of uniqueLevels) {
      let amount = 0;
      const eligible = [];

      for (const b of bets) {
        const contrib = Math.min(b.totalBet, level) - Math.min(b.totalBet, prevLevel);
        amount += contrib;
        if (!b.folded && b.totalBet >= level) {
          eligible.push(b.seatIndex);
        }
      }

      if (amount > 0 && eligible.length > 0) {
        pots.push({ amount, eligible });
      }
      prevLevel = level;
    }

    this.pots = pots;
  }

  // ------------------------------------------
  // Showdown
  // ------------------------------------------

  _showdown() {
    this.phase = 'SHOWDOWN';
    this._calculatePots();

    const active = this._getActivePlayers();
    const winners = [];

    for (const pot of this.pots) {
      // Only eligible players who haven't folded
      const eligible = pot.eligible.filter(si => active.includes(si));
      if (eligible.length === 0) continue;

      if (eligible.length === 1) {
        // Sole winner for this pot
        const w = this.players.get(eligible[0]);
        w.chips += pot.amount;
        winners.push({
          seatIndex: eligible[0],
          playerId: w.id,
          amount: pot.amount,
          handName: this._evaluateHand(eligible[0])?.name || 'Winner',
          potIndex: this.pots.indexOf(pot),
        });
        continue;
      }

      // Evaluate hands
      const hands = eligible.map(si => {
        const p = this.players.get(si);
        const allCards = [...p.holeCards, ...this.communityCards]
          .map(c => cardToSolverStr(c));
        const solved = Hand.solve(allCards);
        return { seatIndex: si, hand: solved };
      });

      // Find winner(s)
      const solvedHands = hands.map(h => h.hand);
      const bestHands = Hand.winners(solvedHands);

      // Distribute pot among winners
      const potWinners = hands.filter(h => bestHands.includes(h.hand));
      const share = Math.floor(pot.amount / potWinners.length);
      let remainder = pot.amount - share * potWinners.length;

      for (const pw of potWinners) {
        const w = this.players.get(pw.seatIndex);
        const winAmount = share + (remainder > 0 ? 1 : 0);
        if (remainder > 0) remainder--;
        w.chips += winAmount;
        winners.push({
          seatIndex: pw.seatIndex,
          playerId: w.id,
          amount: winAmount,
          handName: pw.hand.name,
          handRank: pw.hand.rank,
          potIndex: this.pots.indexOf(pot),
        });
      }
    }

    this.winners = winners;
    this.phase = 'HAND_OVER';

    // Mark busted players as SPECTATOR
    for (const si of this.seatOrder) {
      const p = this.players.get(si);
      if (p && p.chips <= 0 && p.status !== 'SPECTATOR') {
        p.status = 'SPECTATOR';
      }
    }

    return {
      success: true,
      showdown: true,
      winners: this.winners,
      pots: [...this.pots],
      playerHands: this._getShowdownHands(),
      communityCards: [...this.communityCards],
    };
  }

  _evaluateHand(seatIndex) {
    const p = this.players.get(seatIndex);
    const allCards = [...p.holeCards, ...this.communityCards].map(c => cardToSolverStr(c));
    try {
      return Hand.solve(allCards);
    } catch {
      return null;
    }
  }

  _getShowdownHands() {
    const active = this._getActivePlayers();
    const result = {};
    for (const si of active) {
      const p = this.players.get(si);
      const hand = this._evaluateHand(si);
      result[p.id] = {
        holeCards: p.holeCards,
        handName: hand?.name || 'Unknown',
        handRank: hand?.rank || 0,
      };
    }
    return result;
  }

  // ------------------------------------------
  // Client State
  // ------------------------------------------

  getClientState(playerId) {
    const alive = this._getAlivePlayers();
    const playersData = [];

    for (const si of this.seatOrder) {
      const p = this.players.get(si);
      if (!p) continue;

      const isMe = p.id === playerId;
      const showCards = this.phase === 'SHOWDOWN' || this.phase === 'HAND_OVER';

      playersData.push({
        id: p.id,
        seatIndex: si,
        chips: p.chips,
        currentBet: p.currentBet,
        totalBet: p.totalBet,
        status: p.status,
        holeCards: isMe || (showCards && (p.status === 'ACTIVE' || p.status === 'ALL_IN'))
          ? p.holeCards
          : (p.holeCards.length > 0 ? [null, null] : []),
        hasCards: p.holeCards.length > 0,
      });
    }

    // Find my seat index
    let mySeat = -1;
    for (const si of this.seatOrder) {
      if (this.players.get(si)?.id === playerId) { mySeat = si; break; }
    }

    return {
      phase: this.phase,
      handNumber: this.handNumber,
      players: playersData,
      communityCards: [...this.communityCards],
      pots: this.pots.map(p => ({ amount: p.amount, eligible: p.eligible })),
      dealerIndex: this.dealerIndex,
      currentTurnSeat: this.currentTurnSeat,
      currentHighestBet: this.currentHighestBet,
      minRaise: this.minRaise,
      blinds: { sb: this.options.smallBlind, bb: this.options.bigBlind },
      lastAction: this.lastAction,
      winners: this.winners,
      mySeat,
    };
  }

  // ------------------------------------------
  // Auto-action (timer expired)
  // ------------------------------------------

  autoAction(seatIndex) {
    const p = this.players.get(seatIndex);
    if (!p || p.status !== 'ACTIVE') return { error: 'CANNOT_ACT' };

    // Auto-check if possible, otherwise auto-fold
    if (p.currentBet >= this.currentHighestBet) {
      return this.doAction(seatIndex, 'check');
    }
    return this.doAction(seatIndex, 'fold');
  }

  getSeatForPlayer(playerId) {
    for (const [si, p] of this.players) {
      if (p.id === playerId) return si;
    }
    return -1;
  }
}

module.exports = { PokerGame };
