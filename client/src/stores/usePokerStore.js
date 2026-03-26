import { create } from 'zustand';

const usePokerStore = create((set) => ({
  // State
  phase: 'WAITING',       // WAITING | PRE_FLOP | FLOP | TURN | RIVER | SHOWDOWN | HAND_OVER | GAME_OVER
  handNumber: 0,
  players: [],            // [{ id, seatIndex, chips, currentBet, totalBet, status, holeCards, hasCards }]
  communityCards: [],      // up to 5 cards
  pots: [],               // [{ amount, eligible }]
  dealerIndex: 0,
  currentTurnSeat: -1,
  currentHighestBet: 0,
  minRaise: 0,
  blinds: { sb: 10, bb: 20 },
  lastAction: null,        // { seatIndex, action, amount, auto? }
  winners: null,
  showdownHands: null,
  timer: 26,
  mySeat: -1,

  // Actions
  syncState: (s) => set({
    phase: s.phase,
    handNumber: s.handNumber,
    players: s.players,
    communityCards: s.communityCards,
    pots: s.pots,
    dealerIndex: s.dealerIndex,
    currentTurnSeat: s.currentTurnSeat,
    currentHighestBet: s.currentHighestBet,
    minRaise: s.minRaise,
    blinds: s.blinds,
    lastAction: s.lastAction,
    winners: s.winners,
    mySeat: s.mySeat,
  }),

  onAction: (a) => set({ lastAction: a }),

  onCommunity: (d) => set({
    communityCards: d.communityCards,
  }),

  onShowdown: (d) => set({
    winners: d.winners,
    showdownHands: d.playerHands || null,
  }),

  onNewHand: () => set({
    winners: null,
    showdownHands: null,
    lastAction: null,
    timer: 26,
  }),

  setTimer: (t) => set({ timer: t }),

  reset: () => set({
    phase: 'WAITING',
    handNumber: 0,
    players: [],
    communityCards: [],
    pots: [],
    dealerIndex: 0,
    currentTurnSeat: -1,
    currentHighestBet: 0,
    minRaise: 0,
    blinds: { sb: 10, bb: 20 },
    lastAction: null,
    winners: null,
    showdownHands: null,
    timer: 26,
    mySeat: -1,
  }),
}));

export default usePokerStore;
