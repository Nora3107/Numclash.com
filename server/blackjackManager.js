// ============================================
// SuckCard.com — Blackjack (Xì Dách) Game Manager
// Server-side game logic — Host is Dealer
// ============================================

const SUITS = ['♠', '♥', '♦', '♣'];
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

const delay = (ms) => new Promise(r => setTimeout(r, ms));

// ═══════════════════════════════════════════
// DECK UTILITIES
// ═══════════════════════════════════════════

function createDeck() {
  const deck = [];
  let id = 0;
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ id: `bj_${++id}`, rank, suit });
    }
  }
  return deck;
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ═══════════════════════════════════════════
// HAND EVALUATION
// ═══════════════════════════════════════════

function calcPoints(cards) {
  let total = 0;
  let aceCount = 0;
  for (const c of cards) {
    if (c.rank === 'A') { aceCount++; continue; }
    total += ['J', 'Q', 'K'].includes(c.rank) ? 10 : parseInt(c.rank, 10);
  }
  // Greedy: start with ace=11, downgrade to 1
  for (let i = 0; i < aceCount; i++) total += 11;
  let remaining = aceCount;
  while (total > 21 && remaining > 0) { total -= 10; remaining--; }
  return total;
}

/**
 * Hand ranking:
 * 6 = Xì Bàng (2 Aces)
 * 5 = Xì Dách (Ace + 10/J/Q/K, exactly 2 cards)
 * 4 = Ngũ Linh (5 cards, ≤ 21)
 * 3 = Đủ Tuổi (16-21)
 * 2 = Chưa Đủ Tuổi (< 16, must hit)
 * 1 = Quắc / Bust (> 21)
 */
function evaluateHand(cards) {
  const pts = calcPoints(cards);

  if (cards.length === 2 && cards[0].rank === 'A' && cards[1].rank === 'A')
    return { rank: 6, points: 21, label: 'XIBANG', display: 'Xì Bàng' };

  if (cards.length === 2) {
    const hasAce = cards.some(c => c.rank === 'A');
    const hasTen = cards.some(c => ['10', 'J', 'Q', 'K'].includes(c.rank));
    if (hasAce && hasTen)
      return { rank: 5, points: 21, label: 'XIDACH', display: 'Xì Dách' };
  }

  if (cards.length === 5 && pts <= 21)
    return { rank: 4, points: pts, label: 'NGULINH', display: 'Ngũ Linh' };

  if (pts > 21)
    return { rank: 1, points: pts, label: 'BUST', display: 'Quắc' };

  if (pts >= 16)
    return { rank: 3, points: pts, label: 'STAND', display: `${pts} điểm` };

  return { rank: 2, points: pts, label: 'UNDERAGE', display: `${pts} điểm` };
}

function compareHands(a, b) {
  if (a.rank !== b.rank) return a.rank > b.rank ? 1 : -1;
  if (a.points !== b.points) return a.points > b.points ? 1 : -1;
  return 0;
}

function getPayoutMultiplier(label) {
  if (label === 'XIBANG') return 3;
  if (label === 'XIDACH') return 2;
  if (label === 'NGULINH') return 1.5;
  return 1;
}

// ═══════════════════════════════════════════
// BLACKJACK GAME CLASS
// ═══════════════════════════════════════════

class BlackjackGame {
  constructor(playerIds, hostId, initialChips = 1000, nicknames = {}) {
    this.hostId = hostId; // host = dealer
    this.playerIds = playerIds.filter(id => id !== hostId); // non-dealer players
    this.allIds = [...playerIds];
    this.deck = [];
    this.nicknames = nicknames; // pid -> nickname map

    // Initialize players
    this.players = new Map();
    for (const pid of this.allIds) {
      this.players.set(pid, {
        cards: [],
        hand: null,
        chips: initialChips,
        bet: 0,
        status: 'WAITING', // WAITING | BETTING | PLAYING | STAND | BUST | XIBANG | XIDACH | NGULINH | DONE
        isDealer: pid === hostId,
      });
    }

    this.phase = 'BETTING'; // BETTING | DEALING | CHECK_SPECIALS | PLAYER_TURNS | DEALER_TURN | DEALER_CHECK | SHOWDOWN
    this.currentTurnIndex = 0; // index into this.playerIds (non-dealer)
    this.results = []; // per-player results after showdown
    this.uncheckedPlayers = []; // pids not yet checked by dealer
    this.checkedResults = []; // results resolved during DEALER_CHECK
  }

  // ── Helpers ──

  _draw() {
    if (this.deck.length === 0) this.deck = shuffle(createDeck());
    return this.deck.pop();
  }

  _currentPlayerId() {
    if (this.currentTurnIndex >= this.playerIds.length) return null;
    return this.playerIds[this.currentTurnIndex];
  }

  _updateHand(pid) {
    const p = this.players.get(pid);
    p.hand = evaluateHand(p.cards);
  }

  // ── PHASE 1: Betting ──

  placeBet(pid, amount) {
    if (this.phase !== 'BETTING') return { error: 'NOT_BETTING_PHASE' };
    if (pid === this.hostId) return { error: 'DEALER_NO_BET' };
    const p = this.players.get(pid);
    if (!p) return { error: 'NOT_IN_GAME' };
    if (amount <= 0 || amount > p.chips) return { error: 'INVALID_BET' };

    p.bet = amount;
    p.chips -= amount;
    p.status = 'BETTING';

    // Check if all players have bet
    const allBet = this.playerIds.every(id => this.players.get(id).bet > 0);
    return { success: true, allBet };
  }

  // ── PHASE 2: Dealing ──

  startDealing() {
    this.phase = 'DEALING';
    this.deck = shuffle(createDeck());

    // Deal sequence: 2 rounds, each player + dealer gets 1 card per round
    const dealSequence = [];
    for (let round = 0; round < 2; round++) {
      for (const pid of this.playerIds) {
        const card = this._draw();
        this.players.get(pid).cards.push(card);
        dealSequence.push({ pid, card, faceDown: false });
      }
      // Dealer: first card face-up, second face-down
      const dealerCard = this._draw();
      this.players.get(this.hostId).cards.push(dealerCard);
      dealSequence.push({ pid: this.hostId, card: dealerCard, faceDown: round === 1 });
    }

    // Update all hands
    for (const pid of this.allIds) this._updateHand(pid);

    return dealSequence;
  }

  // ── PHASE 3: Check Specials ──

  checkSpecials() {
    this.phase = 'CHECK_SPECIALS';
    const dealer = this.players.get(this.hostId);
    const specials = [];

    // If dealer has Xì Bàng or Xì Dách
    if (dealer.hand.rank >= 5) {
      dealer.status = dealer.hand.label;
      specials.push({ pid: this.hostId, hand: dealer.hand });

      // Compare with each player
      for (const pid of this.playerIds) {
        const p = this.players.get(pid);
        if (p.hand.rank >= 5) {
          // Player also has special
          const cmp = compareHands(p.hand, dealer.hand);
          if (cmp > 0) {
            const payout = p.bet * getPayoutMultiplier(p.hand.label);
            p.chips += p.bet + payout;
            dealer.chips -= payout;
            p.status = 'DONE';
          } else if (cmp < 0) {
            dealer.chips += p.bet;
            p.bet = 0;
            p.status = 'DONE';
          } else {
            p.chips += p.bet; // push
            p.bet = 0;
            p.status = 'DONE';
          }
          specials.push({ pid, hand: p.hand });
        } else {
          // Player loses to dealer special
          dealer.chips += p.bet;
          p.bet = 0;
          p.status = 'DONE';
        }
      }

      this.phase = 'SHOWDOWN';
      return { dealerSpecial: true, specials };
    }

    // Check players for specials
    for (const pid of this.playerIds) {
      const p = this.players.get(pid);
      if (p.hand.rank >= 5) {
        const payout = p.bet * getPayoutMultiplier(p.hand.label);
        p.chips += p.bet + payout;
        dealer.chips -= payout;
        p.status = 'DONE';
        specials.push({ pid, hand: p.hand });
      }
    }

    return { dealerSpecial: false, specials };
  }

  // ── PHASE 4: Player Turns ──

  startPlayerTurns() {
    this.phase = 'PLAYER_TURNS';
    this.currentTurnIndex = 0;

    // Skip players already done (specials)
    while (this.currentTurnIndex < this.playerIds.length) {
      const p = this.players.get(this.playerIds[this.currentTurnIndex]);
      if (p.status !== 'DONE') { p.status = 'PLAYING'; break; }
      this.currentTurnIndex++;
    }

    return { currentTurn: this._currentPlayerId() };
  }

  playerHit(pid) {
    if (this.phase !== 'PLAYER_TURNS') return { error: 'NOT_PLAYER_PHASE' };
    if (pid !== this._currentPlayerId()) return { error: 'NOT_YOUR_TURN' };
    const p = this.players.get(pid);
    if (p.cards.length >= 5) return { error: 'MAX_CARDS' };

    const card = this._draw();
    p.cards.push(card);
    this._updateHand(pid);

    // Auto-bust or Ngũ Linh
    if (p.hand.label === 'BUST') {
      p.status = 'BUST';
      const dealer = this.players.get(this.hostId);
      dealer.chips += p.bet;
      p.bet = 0;
      return { card, hand: p.hand, autoEnd: true, nextAction: 'advance' };
    }
    if (p.hand.label === 'NGULINH') {
      p.status = 'NGULINH';
      return { card, hand: p.hand, autoEnd: true, nextAction: 'advance' };
    }

    return { card, hand: p.hand, autoEnd: false };
  }

  playerStand(pid) {
    if (this.phase !== 'PLAYER_TURNS') return { error: 'NOT_PLAYER_PHASE' };
    if (pid !== this._currentPlayerId()) return { error: 'NOT_YOUR_TURN' };
    const p = this.players.get(pid);
    if (p.hand.points < 16) return { error: 'MUST_HIT_UNDER_16' };

    p.status = 'STAND';
    return { success: true, nextAction: 'advance' };
  }

  advanceToNextPlayer() {
    this.currentTurnIndex++;
    while (this.currentTurnIndex < this.playerIds.length) {
      const p = this.players.get(this.playerIds[this.currentTurnIndex]);
      if (p.status !== 'DONE') { p.status = 'PLAYING'; break; }
      this.currentTurnIndex++;
    }

    if (this.currentTurnIndex >= this.playerIds.length) {
      return { allDone: true, currentTurn: null };
    }
    return { allDone: false, currentTurn: this._currentPlayerId() };
  }

  // ── PHASE 5: Dealer Turn ──

  startDealerTurn() {
    this.phase = 'DEALER_TURN';
    const dealer = this.players.get(this.hostId);
    dealer.status = 'PLAYING';
    return { dealerCards: dealer.cards, dealerHand: dealer.hand };
  }

  dealerHit() {
    const dealer = this.players.get(this.hostId);
    if (dealer.cards.length >= 5) return { done: true, hand: dealer.hand };

    const card = this._draw();
    dealer.cards.push(card);
    this._updateHand(this.hostId);

    if (dealer.hand.label === 'BUST' || dealer.hand.label === 'NGULINH' || dealer.hand.points >= 16) {
      dealer.status = dealer.hand.label === 'BUST' ? 'BUST' : dealer.hand.label === 'NGULINH' ? 'NGULINH' : 'STAND';
      return { card, hand: dealer.hand, done: true };
    }

    return { card, hand: dealer.hand, done: false };
  }

  // Automated dealer: follow rules (must hit < 16)
  getDealerActions() {
    const dealer = this.players.get(this.hostId);
    const actions = [];

    while (dealer.hand.points < 16 && dealer.cards.length < 5) {
      const result = this.dealerHit();
      actions.push(result);
      if (result.done) break;
    }

    // If still < 5 cards and hasn't busted/ngulinh, stand
    if (dealer.hand.points >= 16 && dealer.hand.label !== 'BUST' && dealer.hand.label !== 'NGULINH') {
      dealer.status = 'STAND';
    }

    return actions;
  }

  // ── PHASE 5.5: Dealer Check (interactive per-player) ──

  startDealerCheck() {
    this.phase = 'DEALER_CHECK';
    const dealer = this.players.get(this.hostId);

    // If dealer busted during mandatory draws, auto-resolve all
    if (dealer.hand.label === 'BUST') {
      return { autoBust: true };
    }

    // Build unchecked list (players still in game)
    this.uncheckedPlayers = this.playerIds.filter(pid => {
      const p = this.players.get(pid);
      return p.status !== 'DONE' && p.status !== 'BUST';
    });

    // If no one to check, go straight to showdown
    if (this.uncheckedPlayers.length === 0) {
      return { autoBust: false, noPlayers: true };
    }

    return { autoBust: false, noPlayers: false, unchecked: [...this.uncheckedPlayers] };
  }

  dealerCheckPlayer(targetPid) {
    if (this.phase !== 'DEALER_CHECK') return { error: 'NOT_CHECK_PHASE' };
    if (!this.uncheckedPlayers.includes(targetPid)) return { error: 'ALREADY_CHECKED' };

    const dealer = this.players.get(this.hostId);
    const p = this.players.get(targetPid);
    if (!p) return { error: 'PLAYER_NOT_FOUND' };

    // Compare
    const cmp = compareHands(p.hand, dealer.hand);
    let outcome, payout = 0;

    if (cmp > 0) {
      payout = p.bet * getPayoutMultiplier(p.hand.label);
      p.chips += p.bet + payout;
      dealer.chips -= payout;
      outcome = 'WIN';
    } else if (cmp < 0) {
      dealer.chips += p.bet;
      payout = 0;
      outcome = 'LOSE';
    } else {
      p.chips += p.bet; // push refund
      payout = 0;
      outcome = 'PUSH';
    }

    p.bet = 0;
    p.status = 'DONE';

    // Remove from unchecked
    this.uncheckedPlayers = this.uncheckedPlayers.filter(id => id !== targetPid);

    const result = { pid: targetPid, outcome, payout, playerHand: p.hand, dealerHand: dealer.hand };
    this.checkedResults.push(result);

    return {
      success: true,
      result,
      remaining: [...this.uncheckedPlayers],
      allChecked: this.uncheckedPlayers.length === 0,
    };
  }

  dealerHitDuringCheck() {
    if (this.phase !== 'DEALER_CHECK') return { error: 'NOT_CHECK_PHASE' };
    const dealer = this.players.get(this.hostId);
    if (dealer.cards.length >= 5) return { error: 'MAX_CARDS' };

    const card = this._draw();
    dealer.cards.push(card);
    this._updateHand(this.hostId);

    if (dealer.hand.label === 'BUST') {
      dealer.status = 'BUST';
      return { card, hand: dealer.hand, bust: true };
    }
    if (dealer.hand.label === 'NGULINH') {
      dealer.status = 'NGULINH';
      return { card, hand: dealer.hand, bust: false, ngulinh: true };
    }

    return { card, hand: dealer.hand, bust: false };
  }

  // Auto-resolve all remaining unchecked when dealer busts
  autoResolveRemaining() {
    const dealer = this.players.get(this.hostId);
    const results = [];

    for (const pid of this.uncheckedPlayers) {
      const p = this.players.get(pid);
      const payout = p.bet * getPayoutMultiplier(p.hand.label);
      p.chips += p.bet + payout;
      dealer.chips -= payout;
      p.bet = 0;
      p.status = 'DONE';

      const r = { pid, outcome: 'WIN', payout, playerHand: p.hand, dealerHand: dealer.hand };
      this.checkedResults.push(r);
      results.push(r);
    }

    this.uncheckedPlayers = [];
    return results;
  }

  // ── PHASE 6: Showdown ──

  showdown() {
    this.phase = 'SHOWDOWN';
    const dealer = this.players.get(this.hostId);
    const results = [];

    for (const pid of this.playerIds) {
      const p = this.players.get(pid);
      if (p.status === 'DONE') {
        results.push({ pid, outcome: 'ALREADY_RESOLVED', payout: 0 });
        continue;
      }
      if (p.status === 'BUST') {
        results.push({ pid, outcome: 'LOSE', payout: 0, playerHand: p.hand, dealerHand: dealer.hand });
        continue;
      }

      // Dealer busted
      if (dealer.hand.label === 'BUST') {
        const payout = p.bet * getPayoutMultiplier(p.hand.label);
        p.chips += p.bet + payout;
        dealer.chips -= payout;
        results.push({ pid, outcome: 'WIN', payout, playerHand: p.hand, dealerHand: dealer.hand });
        continue;
      }

      // Compare
      const cmp = compareHands(p.hand, dealer.hand);
      if (cmp > 0) {
        const payout = p.bet * getPayoutMultiplier(p.hand.label);
        p.chips += p.bet + payout;
        dealer.chips -= payout;
        results.push({ pid, outcome: 'WIN', payout, playerHand: p.hand, dealerHand: dealer.hand });
      } else if (cmp < 0) {
        dealer.chips += p.bet;
        p.bet = 0;
        results.push({ pid, outcome: 'LOSE', payout: 0, playerHand: p.hand, dealerHand: dealer.hand });
      } else {
        p.chips += p.bet;
        p.bet = 0;
        results.push({ pid, outcome: 'PUSH', payout: 0, playerHand: p.hand, dealerHand: dealer.hand });
      }
    }

    this.results = results;
    return results;
  }

  // ── Client State (Privacy) ──

  getClientState(viewerId) {
    const playersState = {};
    for (const [pid, p] of this.players) {
      const isMe = pid === viewerId;
      const isDealer = pid === this.hostId;
      const isChecked = this.checkedResults.some(r => r.pid === pid);
      const showCards = isMe || this.phase === 'SHOWDOWN'
        || (isDealer && (this.phase === 'DEALER_TURN' || this.phase === 'DEALER_CHECK'))
        || (this.phase === 'DEALER_CHECK' && isChecked);

      playersState[pid] = {
        isDealer,
        nickname: this.nicknames[pid] || pid?.slice(-4) || '???',
        chips: p.chips,
        bet: p.bet,
        status: p.status,
        hand: showCards ? p.hand : null,
        cardCount: p.cards.length,
        cards: showCards
          ? p.cards
          : p.cards.map((c, i) => {
              // Dealer: show first card, hide second; others: hide all
              if (isDealer && i === 0) return c;
              return { id: c.id, hidden: true };
            }),
      };
    }

    return {
      phase: this.phase,
      currentTurn: this.phase === 'DEALER_CHECK' ? this.hostId : this._currentPlayerId(),
      dealerId: this.hostId,
      players: playersState,
      results: this.phase === 'SHOWDOWN' ? this.results : null,
      uncheckedPlayers: this.phase === 'DEALER_CHECK' ? [...this.uncheckedPlayers] : [],
      checkedResults: this.phase === 'DEALER_CHECK' || this.phase === 'SHOWDOWN' ? [...this.checkedResults] : [],
    };
  }

  // ── Reset for next round ──

  resetRound() {
    for (const [pid, p] of this.players) {
      p.cards = [];
      p.hand = null;
      p.bet = 0;
      p.status = 'WAITING';
    }
    this.phase = 'BETTING';
    this.currentTurnIndex = 0;
    this.results = [];
    this.uncheckedPlayers = [];
    this.checkedResults = [];
    this.deck = shuffle(createDeck());
  }
}

module.exports = { BlackjackGame, evaluateHand, calcPoints, compareHands };
