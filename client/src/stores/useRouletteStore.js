// Zustand store for Tactical Deal: Roulette client state
import { create } from 'zustand';

const useRouletteStore = create((set, get) => ({
  // Game state
  phase: 'waiting', // waiting | playing | finished
  turnPhase: 'idle', // idle | draw | choice | forced_fire | firing
  players: {},
  gun: null,
  currentTurn: null,
  turnDirection: 1,
  difficultyLevel: 1,
  myHand: [],
  requiredShots: 0,
  shotsFired: 0,
  currentTarget: null,
  drawnCard: null,
  deckCount: 0,
  timer: 30,
  winner: null,

  // Animation state
  animState: 'idle', // idle | drawCard | aimSelf | aimOther | shootBlank | shootLive | hit | dead
  animTarget: null,
  lastFireResult: null,

  // Actions
  syncState: (state) => set({
    phase: state.phase,
    turnPhase: state.turnPhase,
    players: state.players,
    gun: state.gun,
    currentTurn: state.currentTurn,
    turnDirection: state.turnDirection,
    difficultyLevel: state.difficultyLevel,
    myHand: state.myHand || [],
    requiredShots: state.requiredShots,
    shotsFired: state.shotsFired,
    currentTarget: state.currentTarget,
    drawnCard: state.drawnCard,
    deckCount: state.deckCount,
  }),

  setTimer: (t) => set({ timer: t }),

  onDrawResult: (data) => set((s) => ({
    turnPhase: data.turnPhase,
    drawnCard: data.card,
    requiredShots: data.requiredShots || 0,
    myHand: data.hand || s.myHand,
    animState: 'drawCard',
  })),

  onAimResult: (data) => set({
    turnPhase: data.turnPhase,
    currentTarget: data.target,
    requiredShots: data.requiredShots,
    animState: data.target === data.playerId ? 'aimSelf' : 'aimOther',
    animTarget: data.target,
  }),

  onFireResult: (data) => set((s) => ({
    players: data.players || s.players,
    gun: data.gun || s.gun,
    currentTurn: data.nextTurn || s.currentTurn,
    turnPhase: data.turnPhase || s.turnPhase,
    shotsFired: data.shotsFired,
    requiredShots: data.requiredShots,
    lastFireResult: data,
    animState: data.bullet === 'LIVE' ? 'shootLive' : 'shootBlank',
    animTarget: data.target,
  })),

  onCardPlayed: (data) => set((s) => ({
    players: data.players || s.players,
    myHand: data.hand || s.myHand,
    turnPhase: data.turnPhase || s.turnPhase,
    turnDirection: data.turnDirection || s.turnDirection,
    gun: data.gun || s.gun,
    requiredShots: data.requiredShots || s.requiredShots,
    currentTurn: data.nextTurn || s.currentTurn,
  })),

  onGameOver: (data) => set({
    phase: 'finished',
    winner: data.winner,
    players: data.players,
  }),

  setAnimState: (state) => set({ animState: state }),

  reset: () => set({
    phase: 'waiting',
    turnPhase: 'idle',
    players: {},
    gun: null,
    currentTurn: null,
    turnDirection: 1,
    myHand: [],
    requiredShots: 0,
    shotsFired: 0,
    currentTarget: null,
    drawnCard: null,
    timer: 30,
    winner: null,
    animState: 'idle',
    lastFireResult: null,
  }),
}));

export default useRouletteStore;
