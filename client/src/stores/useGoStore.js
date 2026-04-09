// ============================================
// SuckCard.com — Go (Cờ Vây) Zustand Store
// Server-synced + bot mode state
// ============================================

import { create } from 'zustand';

const useGoStore = create((set, get) => ({
  // ── Game State (from server / local bot) ──
  size: 9,
  board: [],
  currentColor: 1,
  currentPlayerId: null,
  players: {},
  koPoint: null,
  lastMove: null,
  moveNumber: 0,
  passCount: 0,
  phase: 'WAITING', // WAITING | PLAYING | ENDED
  result: null,
  komi: 7.5,
  turnTimeLimit: 15,

  // ── Animation State ──
  capturedStones: null,   // [{ r, c }] — currently animating
  passEvent: null,        // { color, timeout? }
  timeLeft: 0,
  timerPlayerId: null,

  // ── Bot Mode ──
  botMode: false,
  botLevel: 1,
  botThinking: false,

  // ── UI ──
  hoverPos: null,    // { r, c } — mouse hover position
  message: null,
  error: null,

  // ═══════════════════════════════════════
  // Server Sync
  // ═══════════════════════════════════════

  syncState: (state) => set({
    size: state.size,
    board: state.board,
    currentColor: state.currentColor,
    currentPlayerId: state.currentPlayerId,
    players: state.players,
    koPoint: state.koPoint,
    lastMove: state.lastMove,
    moveNumber: state.moveNumber,
    passCount: state.passCount,
    phase: state.phase,
    result: state.result,
    komi: state.komi,
    turnTimeLimit: state.turnTimeLimit,
    error: null,
  }),

  onCapture: (data) => set({ capturedStones: data.captured }),
  clearCapture: () => set({ capturedStones: null }),

  onPassEvent: (data) => set({ passEvent: data }),
  clearPassEvent: () => set({ passEvent: null }),

  onTimer: (data) => set({
    timeLeft: data.timeLeft,
    timerPlayerId: data.playerId,
  }),

  onGameOver: (result) => set({ result, phase: 'ENDED' }),

  // ═══════════════════════════════════════
  // Bot Mode
  // ═══════════════════════════════════════

  setBotMode: (level) => set({ botMode: true, botLevel: level }),
  setBotThinking: (v) => set({ botThinking: v }),

  // ═══════════════════════════════════════
  // UI
  // ═══════════════════════════════════════

  setHoverPos: (pos) => set({ hoverPos: pos }),
  setError: (err) => set({ error: err }),
  clearError: () => set({ error: null }),
  setMessage: (msg) => set({ message: msg }),
  clearMessage: () => set({ message: null }),

  reset: () => set({
    size: 9, board: [], currentColor: 1, currentPlayerId: null,
    players: {}, koPoint: null, lastMove: null, moveNumber: 0,
    passCount: 0, phase: 'WAITING', result: null, komi: 7.5,
    turnTimeLimit: 15, capturedStones: null, passEvent: null,
    timeLeft: 0, timerPlayerId: null, botMode: false, botLevel: 1,
    botThinking: false, hoverPos: null, message: null, error: null,
  }),
}));

export default useGoStore;
