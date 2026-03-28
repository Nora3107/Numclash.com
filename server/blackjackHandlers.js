// ============================================
// SuckCard.com — Blackjack Socket Handlers
// Cinematic timing delays between phases
// ============================================

const { BlackjackGame } = require('./blackjackManager');

const delay = (ms) => new Promise(r => setTimeout(r, ms));
const DEAL_STAGGER = 150;  // ms between each card deal
const POST_DEAL = 1000;
const POST_HIT = 500;
const DEALER_REVEAL = 1000;
const DEALER_DRAW = 500;
const POST_SHOWDOWN = 1500;

// roomCode -> BlackjackGame
const activeGames = new Map();

function broadcastState(io, roomCode, game) {
  const room = io.sockets.adapter.rooms.get(roomCode);
  if (!room) return;
  for (const sid of room) {
    io.to(sid).emit('blackjack-state', game.getClientState(sid));
  }
}

// ── Start Game ──

async function startBlackjackGame(io, socket, gameManager, roomCode, callback) {
  const room = gameManager.getRoom(roomCode);
  if (!room || room.hostId !== socket.id)
    return callback?.({ success: false, error: 'HOST_ONLY' });
  if (room.players.size < 2)
    return callback?.({ success: false, error: 'NEED_2_PLAYERS' });
  if (!gameManager.isAllReady(roomCode))
    return callback?.({ success: false, error: 'NOT_ALL_READY' });

  const playerIds = [...room.players.keys()];
  const nicknames = {};
  for (const [pid, data] of room.players) {
    nicknames[pid] = data.nickname || pid?.slice(-4) || '???';
  }
  const game = new BlackjackGame(playerIds, room.hostId, 1000, nicknames);
  activeGames.set(roomCode, game);
  room.phase = 'blackjack';
  gameManager.resetReady(roomCode);

  callback?.({ success: true });

  // Broadcast initial BETTING state
  broadcastState(io, roomCode, game);
}

// ── Socket Handlers ──

function setupBlackjackHandlers(io, socket, gameManager) {

  // ── Player places bet ──
  socket.on('blackjack-bet', async ({ roomCode, amount }) => {
    const game = activeGames.get(roomCode);
    if (!game) return;

    const result = game.placeBet(socket.id, amount);
    if (result.error) return socket.emit('blackjack-error', { error: result.error });

    // Broadcast updated state
    broadcastState(io, roomCode, game);

    // All bets placed → start dealing
    if (result.allBet) {
      await delay(300);

      // Phase 2: Deal cards with stagger
      const dealSequence = game.startDealing();
      for (let i = 0; i < dealSequence.length; i++) {
        const d = dealSequence[i];
        io.to(roomCode).emit('blackjack-card-dealt', {
          pid: d.pid,
          card: d.faceDown ? { id: d.card.id, hidden: true } : d.card,
          faceDown: d.faceDown,
          index: i,
        });
        await delay(DEAL_STAGGER);
      }

      // Broadcast full state after deal
      broadcastState(io, roomCode, game);
      await delay(POST_DEAL);

      // Phase 3: Check specials
      const specials = game.checkSpecials();
      if (specials.specials.length > 0) {
        io.to(roomCode).emit('blackjack-specials', specials);
        await delay(POST_DEAL);
      }

      if (specials.dealerSpecial) {
        // Round over — dealer had special
        broadcastState(io, roomCode, game);
        return;
      }

      // Phase 4: Player turns
      const turnResult = game.startPlayerTurns();
      broadcastState(io, roomCode, game);
      io.to(roomCode).emit('blackjack-turn-start', { currentTurn: turnResult.currentTurn });
    }
  });

  // ── Player hits ──
  socket.on('blackjack-hit', async ({ roomCode }) => {
    const game = activeGames.get(roomCode);
    if (!game) return;

    const result = game.playerHit(socket.id);
    if (result.error) return socket.emit('blackjack-error', { error: result.error });

    // Animate card fly
    io.to(roomCode).emit('blackjack-card-dealt', {
      pid: socket.id,
      card: result.card,
      faceDown: false,
    });

    await delay(POST_HIT);
    broadcastState(io, roomCode, game);

    // Don't auto-advance — let player press "dằn" manually even on bust
  });

  // ── Player stands ──
  socket.on('blackjack-stand', async ({ roomCode }) => {
    const game = activeGames.get(roomCode);
    if (!game) return;

    const result = game.playerStand(socket.id);
    if (result.error) return socket.emit('blackjack-error', { error: result.error });

    broadcastState(io, roomCode, game);
    await delay(300);

    const next = game.advanceToNextPlayer();
    if (next.allDone) {
      await transitionToDealerTurn(io, roomCode, game);
    } else {
      broadcastState(io, roomCode, game);
      io.to(roomCode).emit('blackjack-turn-start', { currentTurn: next.currentTurn });
    }
  });

   // ── Next round ──
  socket.on('blackjack-next-round', ({ roomCode }) => {
    const game = activeGames.get(roomCode);
    if (!game) return;
    const room = gameManager.getRoom(roomCode);
    if (!room || room.hostId !== socket.id) return;

    game.resetRound();
    broadcastState(io, roomCode, game);
  });

  // ── Dealer checks a specific player ──
  socket.on('blackjack-dealer-check', async ({ roomCode, targetPid }) => {
    const game = activeGames.get(roomCode);
    if (!game) return;
    if (socket.id !== game.hostId) return socket.emit('blackjack-error', { error: 'DEALER_ONLY' });

    const result = game.dealerCheckPlayer(targetPid);
    if (result.error) return socket.emit('blackjack-error', { error: result.error });

    // Broadcast check result to all
    io.to(roomCode).emit('blackjack-check-result', result.result);
    await delay(POST_HIT);
    broadcastState(io, roomCode, game);

    // If all checked, finalize
    if (result.allChecked) {
      await delay(POST_SHOWDOWN);
      finishGame(io, roomCode, game);
    }
  });

  // ── Dealer draws during check phase ──
  socket.on('blackjack-dealer-hit-check', async ({ roomCode }) => {
    const game = activeGames.get(roomCode);
    if (!game) return;
    if (socket.id !== game.hostId) return socket.emit('blackjack-error', { error: 'DEALER_ONLY' });

    const result = game.dealerHitDuringCheck();
    if (result.error) return socket.emit('blackjack-error', { error: result.error });

    // Animate card
    io.to(roomCode).emit('blackjack-card-dealt', {
      pid: game.hostId,
      card: result.card,
      faceDown: false,
    });

    await delay(DEALER_DRAW);
    broadcastState(io, roomCode, game);

    // If dealer busted, auto-resolve all remaining as winners
    if (result.bust) {
      await delay(500);
      const autoResults = game.autoResolveRemaining();
      for (const r of autoResults) {
        io.to(roomCode).emit('blackjack-check-result', r);
        await delay(200);
      }
      await delay(POST_SHOWDOWN);
      finishGame(io, roomCode, game);
    }
  });

  // ── Leave / Disconnect ──
  socket.on('blackjack-leave', ({ roomCode }) => {
    cleanupPlayer(io, socket, gameManager, roomCode);
  });
}

// ── Dealer Turn (cinematic) ──

async function transitionToDealerTurn(io, roomCode, game) {
  // Reveal dealer's hidden card
  const dealerInfo = game.startDealerTurn();
  io.to(roomCode).emit('blackjack-dealer-reveal', {
    cards: dealerInfo.dealerCards,
    hand: dealerInfo.dealerHand,
  });

  broadcastState(io, roomCode, game);
  await delay(DEALER_REVEAL);

  // Go straight to interactive DEALER_CHECK (no mandatory auto-draws)
  const checkResult = game.startDealerCheck();

  if (checkResult.autoBust) {
    const autoResults = game.autoResolveRemaining();
    for (const r of autoResults) {
      io.to(roomCode).emit('blackjack-check-result', r);
      await delay(200);
    }
    await delay(POST_SHOWDOWN);
    finishGame(io, roomCode, game);
    return;
  }

  if (checkResult.noPlayers) {
    finishGame(io, roomCode, game);
    return;
  }

  // Dealer is now in interactive check mode — full manual control
  broadcastState(io, roomCode, game);
}

// Finalize game → SHOWDOWN
function finishGame(io, roomCode, game) {
  const results = game.showdown();
  io.to(roomCode).emit('blackjack-showdown', { results: [...game.checkedResults, ...results.filter(r => r.outcome !== 'ALREADY_RESOLVED')] });
  broadcastState(io, roomCode, game);
}

// ── Cleanup ──

function cleanupPlayer(io, socket, gameManager, roomCode) {
  const game = activeGames.get(roomCode);
  if (!game) return;

  // Remove game if host leaves
  const room = gameManager.getRoom(roomCode);
  if (room && room.hostId === socket.id) {
    activeGames.delete(roomCode);
    io.to(roomCode).emit('blackjack-game-ended', { reason: 'DEALER_LEFT' });
  }
}

function handleBlackjackDisconnect(io, socket, gameManager) {
  // Find and cleanup any games this socket is in
  for (const [roomCode, game] of activeGames) {
    if (game.players.has(socket.id)) {
      cleanupPlayer(io, socket, gameManager, roomCode);
    }
  }
}

module.exports = {
  startBlackjackGame,
  setupBlackjackHandlers,
  handleBlackjackDisconnect,
};
