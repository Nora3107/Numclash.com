// ============================================
// SuckCard.com — Xì Dách (Vietnamese Blackjack)
// Zustand Store — Complete Game Logic
// ============================================

import { create } from 'zustand';

// ═══════════════════════════════════════════
// DECK & CARD UTILITIES
// ═══════════════════════════════════════════

const SUITS = ['♠', '♥', '♦', '♣'];
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

function createDeck() {
  const deck = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ rank, suit, id: `${rank}${suit}` });
    }
  }
  return deck;
}

function shuffleDeck(deck) {
  const d = [...deck];
  for (let i = d.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [d[i], d[j]] = [d[j], d[i]];
  }
  return d;
}

// ═══════════════════════════════════════════
// HAND EVALUATION ALGORITHMS
// ═══════════════════════════════════════════

/**
 * Tính điểm tốt nhất cho tay bài (xử lý Ace linh hoạt).
 *
 * Thuật toán:
 * 1. Cộng tất cả lá non-Ace (2-10 = face value, J/Q/K = 10)
 * 2. Cho mỗi Ace, thử 11 trước. Nếu bust thì dùng 10, rồi 1.
 * 3. Trả về tổng tốt nhất <= 21 (nếu có), hoặc tổng nhỏ nhất.
 */
function calcPoints(cards) {
  let total = 0;
  let aceCount = 0;

  for (const card of cards) {
    if (card.rank === 'A') {
      aceCount++;
    } else if (['J', 'Q', 'K'].includes(card.rank)) {
      total += 10;
    } else {
      total += parseInt(card.rank, 10);
    }
  }

  // No aces — simple case
  if (aceCount === 0) return total;

  // Try all possible ace combos: each Ace can be 1, 10, or 11
  // For efficiency, try greedy approach: use 11 first, downgrade to 10, then 1
  let best = total;
  for (let i = 0; i < aceCount; i++) {
    best += 11; // Try 11 for each ace greedily
  }

  // Downgrade aces from 11 → 10 → 1 to find best score ≤ 21
  // Strategy: try replacing 11s with lower values
  let remaining = aceCount;
  while (best > 21 && remaining > 0) {
    best -= 1; // 11 → 10
    remaining--;
  }
  remaining = aceCount;
  let tempBest = best;
  while (tempBest > 21 && remaining > 0) {
    tempBest -= 9; // 10 → 1
    remaining--;
  }
  if (tempBest <= 21) return tempBest;

  // Fallback: all aces as 1
  return total + aceCount;
}

/**
 * Đánh giá tay bài — trả về { rank, points, label }
 *
 * Rank (cao → thấp):
 * 6 = Xì Bàng (2 Ace)
 * 5 = Xì Dách (Ace + 10/J/Q/K, đúng 2 lá)
 * 4 = Ngũ Linh (5 lá, ≤ 21)
 * 3 = Đủ Tuổi (16-21)
 * 2 = Chưa Đủ Tuổi (< 16)
 * 1 = Quắc/Bust (> 21)
 */
function evaluateHand(cards) {
  const points = calcPoints(cards);

  // Xì Bàng: exactly 2 cards, both Aces
  if (cards.length === 2 && cards[0].rank === 'A' && cards[1].rank === 'A') {
    return { rank: 6, points: 21, label: 'XIBANG', display: 'Xì Bàng' };
  }

  // Xì Dách: exactly 2 cards, Ace + face/10
  if (cards.length === 2) {
    const hasAce = cards.some(c => c.rank === 'A');
    const hasTen = cards.some(c => ['10', 'J', 'Q', 'K'].includes(c.rank));
    if (hasAce && hasTen) {
      return { rank: 5, points: 21, label: 'XIDACH', display: 'Xì Dách' };
    }
  }

  // Ngũ Linh: exactly 5 cards, total ≤ 21
  if (cards.length === 5 && points <= 21) {
    return { rank: 4, points, label: 'NGULINH', display: 'Ngũ Linh' };
  }

  // Quắc (Bust): > 21
  if (points > 21) {
    return { rank: 1, points, label: 'BUST', display: 'Quắc' };
  }

  // Đủ Tuổi: 16-21
  if (points >= 16) {
    return { rank: 3, points, label: 'STAND', display: `${points} điểm` };
  }

  // Chưa Đủ Tuổi: < 16 (must hit)
  return { rank: 2, points, label: 'UNDERAGE', display: `${points} điểm` };
}

/**
 * So sánh 2 tay bài: trả về 1 (a thắng), -1 (b thắng), 0 (hòa)
 */
function compareHands(a, b) {
  if (a.rank !== b.rank) return a.rank > b.rank ? 1 : -1;
  // Same rank → compare points (higher wins, except Ngũ Linh where lower can also win)
  if (a.points !== b.points) return a.points > b.points ? 1 : -1;
  return 0; // Tie
}

// ═══════════════════════════════════════════
// PAYOUT MULTIPLIERS
// ═══════════════════════════════════════════

function getPayoutMultiplier(handLabel) {
  if (handLabel === 'XIBANG') return 3;   // 3x bet
  if (handLabel === 'XIDACH') return 2;   // 2x bet
  if (handLabel === 'NGULINH') return 1.5; // 1.5x bet
  return 1; // Standard win
}

// ═══════════════════════════════════════════
// ZUSTAND STORE
// ═══════════════════════════════════════════

const INITIAL_CHIPS = 1000;
const BET_OPTIONS = [10, 25, 50, 100, 200];

const useXiDachStore = create((set, get) => ({
  // ── Game Phase ──
  phase: 'IDLE', // IDLE | BETTING | INITIAL_DEAL | CHECK_SPECIALS | PLAYER_TURNS | DEALER_TURN | SHOWDOWN

  // ── Deck ──
  deck: [],

  // ── Player ──
  playerCards: [],
  playerChips: INITIAL_CHIPS,
  playerBet: 0,
  playerHand: null, // evaluated hand { rank, points, label, display }
  playerDone: false,

  // ── Dealer ──
  dealerCards: [],
  dealerHand: null,
  dealerRevealed: false, // is the second card revealed?

  // ── Round result ──
  result: null,        // { outcome: 'WIN'|'LOSE'|'PUSH', payout, message }
  roundHistory: [],

  // ── UI state ──
  dealing: false,      // animation flag
  message: null,       // transient message

  // ═══════════════════════════════════════
  // ACTIONS
  // ═══════════════════════════════════════

  /** Start a new session or reset */
  startNewSession: () => set({
    phase: 'BETTING',
    deck: shuffleDeck(createDeck()),
    playerCards: [],
    playerBet: 0,
    playerHand: null,
    playerDone: false,
    dealerCards: [],
    dealerHand: null,
    dealerRevealed: false,
    result: null,
    dealing: false,
    message: null,
  }),

  /** Place bet and start dealing */
  placeBet: (amount) => {
    const { playerChips, phase } = get();
    if (phase !== 'BETTING') return;
    if (amount > playerChips) return;

    set({ playerBet: amount, playerChips: playerChips - amount });

    // Proceed to deal
    setTimeout(() => get().dealInitial(), 300);
  },

  /** Deal 2 cards to player and dealer */
  dealInitial: () => {
    const { deck } = get();
    const d = [...deck];

    const playerCards = [d.pop(), d.pop()];
    const dealerCards = [d.pop(), d.pop()];

    set({
      phase: 'INITIAL_DEAL',
      deck: d,
      playerCards,
      dealerCards,
      dealing: true,
      playerHand: evaluateHand(playerCards),
      dealerHand: evaluateHand(dealerCards),
    });

    // After dealing animation, check specials
    setTimeout(() => {
      set({ dealing: false });
      get().checkSpecials();
    }, 800);
  },

  /** Phase 3: Check for instant wins (Xì Bàng / Xì Dách) */
  checkSpecials: () => {
    const { playerHand, dealerHand, playerBet } = get();

    set({ phase: 'CHECK_SPECIALS' });

    // Dealer has Xì Bàng or Xì Dách
    if (dealerHand.rank >= 5) {
      set({ dealerRevealed: true });

      // Player also has special?
      if (playerHand.rank >= 5) {
        if (playerHand.rank > dealerHand.rank) {
          // Player wins (Xì Bàng vs Xì Dách)
          const payout = playerBet * getPayoutMultiplier(playerHand.label);
          set({
            phase: 'SHOWDOWN',
            result: { outcome: 'WIN', payout, message: `${playerHand.display} thắng ${dealerHand.display}!` },
            playerChips: get().playerChips + playerBet + payout,
          });
        } else if (playerHand.rank < dealerHand.rank) {
          set({
            phase: 'SHOWDOWN',
            result: { outcome: 'LOSE', payout: 0, message: `Dealer ${dealerHand.display} thắng!` },
          });
        } else {
          // Push (tie)
          set({
            phase: 'SHOWDOWN',
            result: { outcome: 'PUSH', payout: 0, message: 'Hòa!' },
            playerChips: get().playerChips + playerBet,
          });
        }
      } else {
        // Dealer wins with special
        set({
          phase: 'SHOWDOWN',
          result: { outcome: 'LOSE', payout: 0, message: `Dealer ${dealerHand.display}! Bạn thua.` },
        });
      }
      return;
    }

    // Player has Xì Bàng or Xì Dách (dealer doesn't)
    if (playerHand.rank >= 5) {
      const payout = playerBet * getPayoutMultiplier(playerHand.label);
      set({
        phase: 'SHOWDOWN',
        dealerRevealed: true,
        result: { outcome: 'WIN', payout, message: `${playerHand.display}! Bạn thắng!` },
        playerChips: get().playerChips + playerBet + payout,
      });
      return;
    }

    // No specials — proceed to player turns
    set({ phase: 'PLAYER_TURNS' });
  },

  /** Player action: Rút (Hit) */
  playerHit: () => {
    const { phase, playerCards, deck, playerDone } = get();
    if (phase !== 'PLAYER_TURNS' || playerDone) return;
    if (playerCards.length >= 5) return; // Max 5 cards

    const d = [...deck];
    const newCard = d.pop();
    const newCards = [...playerCards, newCard];
    const hand = evaluateHand(newCards);

    set({
      deck: d,
      playerCards: newCards,
      playerHand: hand,
    });

    // Auto-bust
    if (hand.label === 'BUST') {
      set({ playerDone: true });
      setTimeout(() => get().startDealerTurn(), 600);
      return;
    }

    // Ngũ Linh (5 cards, ≤ 21)
    if (hand.label === 'NGULINH') {
      set({ playerDone: true });
      setTimeout(() => get().startDealerTurn(), 600);
      return;
    }
  },

  /** Player action: Dằn (Stand) — only allowed when ≥ 16 points */
  playerStand: () => {
    const { phase, playerHand, playerDone } = get();
    if (phase !== 'PLAYER_TURNS' || playerDone) return;
    if (playerHand.points < 16) return; // RULE: Cannot stand under 16

    set({ playerDone: true });
    setTimeout(() => get().startDealerTurn(), 400);
  },

  /** Phase 5: Dealer AI turn */
  startDealerTurn: () => {
    set({ phase: 'DEALER_TURN', dealerRevealed: true });

    // Run dealer AI after reveal animation
    setTimeout(() => get().dealerAI(), 600);
  },

  /** Dealer draws cards based on rules */
  dealerAI: () => {
    const { deck, dealerCards } = get();
    const d = [...deck];
    let cards = [...dealerCards];
    let hand = evaluateHand(cards);

    // Dealer logic: must hit under 16, stand at 16-21
    const step = () => {
      hand = evaluateHand(cards);

      // Bust
      if (hand.label === 'BUST') {
        set({ deck: d, dealerCards: cards, dealerHand: hand });
        setTimeout(() => get().showdown(), 500);
        return;
      }

      // Ngũ Linh
      if (hand.label === 'NGULINH') {
        set({ deck: d, dealerCards: cards, dealerHand: hand });
        setTimeout(() => get().showdown(), 500);
        return;
      }

      // Must hit if under 16
      if (hand.points < 16 && cards.length < 5) {
        cards.push(d.pop());
        set({ deck: d, dealerCards: [...cards], dealerHand: evaluateHand(cards) });
        setTimeout(step, 500); // Animate each draw
        return;
      }

      // Stand at 16-21
      set({ deck: d, dealerCards: cards, dealerHand: hand });
      setTimeout(() => get().showdown(), 500);
    };

    step();
  },

  /** Phase 6: Showdown — compare hands and payout */
  showdown: () => {
    const { playerHand, dealerHand, playerBet } = get();

    // If player busted, they lose regardless
    if (playerHand.label === 'BUST') {
      set({
        phase: 'SHOWDOWN',
        result: { outcome: 'LOSE', payout: 0, message: 'Quắc! Bạn thua.' },
      });
      return;
    }

    // If dealer busted, player wins
    if (dealerHand.label === 'BUST') {
      const payout = playerBet * getPayoutMultiplier(playerHand.label);
      set({
        phase: 'SHOWDOWN',
        result: { outcome: 'WIN', payout, message: 'Dealer Quắc! Bạn thắng!' },
        playerChips: get().playerChips + playerBet + payout,
      });
      return;
    }

    // Compare hands
    const cmp = compareHands(playerHand, dealerHand);
    if (cmp > 0) {
      const payout = playerBet * getPayoutMultiplier(playerHand.label);
      set({
        phase: 'SHOWDOWN',
        result: { outcome: 'WIN', payout, message: `${playerHand.display} thắng ${dealerHand.display}!` },
        playerChips: get().playerChips + playerBet + payout,
      });
    } else if (cmp < 0) {
      set({
        phase: 'SHOWDOWN',
        result: { outcome: 'LOSE', payout: 0, message: `Dealer ${dealerHand.display} thắng!` },
      });
    } else {
      set({
        phase: 'SHOWDOWN',
        result: { outcome: 'PUSH', payout: 0, message: 'Hòa!' },
        playerChips: get().playerChips + playerBet,
      });
    }
  },

  /** Start next round */
  nextRound: () => {
    const { playerChips, result } = get();
    const history = [...get().roundHistory, result];

    if (playerChips <= 0) {
      set({
        phase: 'IDLE',
        roundHistory: history,
        result: null,
        message: 'Hết chip! Bắt đầu lại?',
      });
      return;
    }

    set({
      phase: 'BETTING',
      deck: shuffleDeck(createDeck()),
      playerCards: [],
      playerBet: 0,
      playerHand: null,
      playerDone: false,
      dealerCards: [],
      dealerHand: null,
      dealerRevealed: false,
      result: null,
      dealing: false,
      message: null,
      roundHistory: history,
    });
  },

  /** Reset everything */
  resetGame: () => set({
    phase: 'IDLE',
    deck: [],
    playerCards: [],
    playerChips: INITIAL_CHIPS,
    playerBet: 0,
    playerHand: null,
    playerDone: false,
    dealerCards: [],
    dealerHand: null,
    dealerRevealed: false,
    result: null,
    roundHistory: [],
    dealing: false,
    message: null,
  }),
}));

export default useXiDachStore;
export { BET_OPTIONS, evaluateHand, calcPoints };
