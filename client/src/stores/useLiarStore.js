// ============================================
// SuckCard.com — Liar's Deck Zustand Store
// Client-side state synced with server
// ============================================

import { create } from 'zustand';

const useLiarStore = create((set, get) => ({
  // Game state
  phase: 'waiting',       // waiting | playing | resolution | finished
  targetCard: null,       // 'J', 'Q', 'K', 'A'
  targetLabel: null,      // 'Jack', 'Queen', etc
  currentTurn: null,
  players: {},            // { [pid]: { lives, status, cardCount, hand? } }
  myHand: [],
  tablePileCount: 0,
  lastPlay: null,         // { playerId, count }
  roundNumber: 0,
  winner: null,
  timer: 30,

  // UI state
  selectedCards: [],      // card ids selected to play
  resolution: null,       // { callerId, accusedId, flippedCards, resultType, loserId }
  showResolution: false,
  message: null,          // { text, type }

  // ------------------------------------------
  // Server Sync
  // ------------------------------------------

  syncState: (state) => set({
    phase: state.phase,
    targetCard: state.targetCard,
    targetLabel: state.targetLabel,
    currentTurn: state.currentTurn,
    players: state.players,
    myHand: state.myHand || [],
    tablePileCount: state.tablePileCount,
    lastPlay: state.lastPlay,
    roundNumber: state.roundNumber,
    winner: state.winner,
    selectedCards: [],
  }),

  onRoundStart: (data) => set({
    targetCard: data.targetCard,
    targetLabel: data.targetLabel,
    roundNumber: data.round,
    resolution: null,
    showResolution: false,
    selectedCards: [],
    message: null,
  }),

  onPlayed: (data) => set((state) => ({
    lastPlay: { playerId: data.playerId, count: data.count },
    message: null,
  })),

  onResolution: (data) => set({
    phase: 'resolution',
    resolution: data,
    showResolution: true,
    selectedCards: [],
    message: null,
  }),

  onGameOver: (data) => set({
    phase: 'finished',
    winner: data.winner,
  }),

  setTimer: (t) => set({ timer: t }),

  // ------------------------------------------
  // UI Actions
  // ------------------------------------------

  toggleCardSelection: (cardId) => set((state) => {
    const sel = state.selectedCards;
    if (sel.includes(cardId)) {
      return { selectedCards: sel.filter(id => id !== cardId) };
    }
    if (sel.length >= 3) return {}; // max 3
    return { selectedCards: [...sel, cardId] };
  }),

  clearSelection: () => set({ selectedCards: [] }),

  setMessage: (msg) => set({ message: msg }),

  clearMessage: () => set({ message: null }),

  reset: () => set({
    phase: 'waiting', targetCard: null, targetLabel: null, currentTurn: null,
    players: {}, myHand: [], tablePileCount: 0, lastPlay: null, roundNumber: 0,
    winner: null, timer: 30, selectedCards: [], resolution: null, showResolution: false, message: null,
  }),
}));

export default useLiarStore;
