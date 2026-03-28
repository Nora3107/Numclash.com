// ============================================
// SuckCard.com — Blackjack Zustand Store
// Server-synced — client only renders
// ============================================

import { create } from 'zustand';

const useBlackjackStore = create((set, get) => ({
  // ── Game State (from server) ──
  phase: 'WAITING',   // WAITING | BETTING | DEALING | CHECK_SPECIALS | PLAYER_TURNS | DEALER_TURN | SHOWDOWN
  currentTurn: null,
  dealerId: null,
  players: {},         // { [pid]: { isDealer, chips, bet, status, hand, cardCount, cards } }
  results: null,

  // ── Animation State ──
  dealingCard: null,   // { pid, card, faceDown } — currently animating card
  dealerRevealing: false,
  specials: null,      // { dealerSpecial, specials: [{pid, hand}] }
  showResult: false,
  checkResult: null,   // { pid, outcome, payout } — latest check result

  // ── UI State ──
  selectedBet: 50,
  message: null,
  error: null,

  // ═══════════════════════════════════════
  // Server Sync
  // ═══════════════════════════════════════

  syncState: (state) => set({
    phase: state.phase,
    currentTurn: state.currentTurn,
    dealerId: state.dealerId,
    players: state.players,
    results: state.results,
    uncheckedPlayers: state.uncheckedPlayers || [],
    checkedResults: state.checkedResults || [],
    error: null,
    // Clear result display when new round starts
    ...(state.phase === 'BETTING' ? { showResult: false, results: null } : {}),
  }),

  onCardDealt: (data) => set({
    dealingCard: data, // triggers fly animation
  }),

  clearDealingCard: () => set({ dealingCard: null }),

  onDealerReveal: (data) => set({
    dealerRevealing: true,
  }),

  clearDealerReveal: () => set({ dealerRevealing: false }),

  onSpecials: (data) => set({ specials: data }),
  clearSpecials: () => set({ specials: null }),

  onShowdown: (data) => set({
    results: data.results,
    showResult: true,
  }),

  clearShowResult: () => set({ showResult: false }),

  onCheckResult: (data) => set({ checkResult: data }),
  clearCheckResult: () => set({ checkResult: null }),

  onGameEnded: (data) => set({
    phase: 'WAITING',
    message: data.reason === 'DEALER_LEFT' ? 'Dealer đã rời phòng!' : 'Game kết thúc',
  }),

  onError: (err) => set({ error: err.error }),

  // ═══════════════════════════════════════
  // UI Actions
  // ═══════════════════════════════════════

  setSelectedBet: (amount) => set({ selectedBet: amount }),
  clearError: () => set({ error: null }),
  clearMessage: () => set({ message: null }),

  reset: () => set({
    phase: 'WAITING', currentTurn: null, dealerId: null, players: {},
    results: null, dealingCard: null, dealerRevealing: false, specials: null,
    showResult: false, checkResult: null, selectedBet: 50, message: null, error: null,
    uncheckedPlayers: [], checkedResults: [],
  }),
}));

export default useBlackjackStore;
export const BET_OPTIONS = [10, 25, 50, 100, 200];
