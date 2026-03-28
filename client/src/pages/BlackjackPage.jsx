// ============================================
// SuckCard.com — Blackjack (Xì Dách)
// Liar Deck–style full-viewport layout
// ============================================

import { useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Plus, Hand } from 'lucide-react';
import useBlackjackStore, { BET_OPTIONS } from '../stores/useBlackjackStore';
import { sfxClick, sfxCardFlip, sfxChipBet, sfxCardDeal, sfxBust, sfxWinHand, sfxDealerReveal, sfxSpecialHand } from '../sounds/gameSfx';
import './blackjack.css';

// ═══════════════════════════════════════════
// CARD COMPONENT
// ═══════════════════════════════════════════

function BJCard({ card, faceDown = false, index = 0 }) {
  const isRed = card && !card.hidden && (card.suit === '♥' || card.suit === '♦');
  const hidden = faceDown || card?.hidden;

  return (
    <motion.div
      className={`bj-card ${hidden ? 'face-down' : 'face-up'} ${isRed ? 'red' : 'black'}`}
      initial={{ opacity: 0, y: -20, scale: 0.85 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: index * 0.1, type: 'spring', stiffness: 200, damping: 18 }}
      whileHover={!hidden ? { y: -4, scale: 1.06 } : {}}
    >
      {hidden ? (
        <span className="c-back-dot" />
      ) : (
        <>
          <span className="c-corner tl">{card.rank}<br/>{card.suit}</span>
          <span className="c-rank">{card.rank}</span>
          <span className="c-suit">{card.suit}</span>
          <span className="c-corner br">{card.rank}<br/>{card.suit}</span>
        </>
      )}
    </motion.div>
  );
}

// ═══════════════════════════════════════════
// SCORE BADGE
// ═══════════════════════════════════════════

function ScoreBadge({ hand }) {
  if (!hand) return null;
  const colors = {
    XIBANG: { bg: 'rgba(255,215,0,0.15)', border: '#ffd700', color: '#ffd700' },
    XIDACH: { bg: 'rgba(68,221,170,0.15)', border: '#44ddaa', color: '#44ddaa' },
    NGULINH: { bg: 'rgba(68,221,170,0.15)', border: '#44ddaa', color: '#44ddaa' },
    BUST: { bg: 'rgba(255,68,102,0.15)', border: '#ff4466', color: '#ff4466' },
    STAND: { bg: 'rgba(255,255,255,0.06)', border: 'rgba(255,255,255,0.15)', color: '#ccc' },
    UNDERAGE: { bg: 'rgba(255,165,0,0.08)', border: 'rgba(255,165,0,0.2)', color: '#ffa500' },
  };
  const c = colors[hand.label] || colors.STAND;
  return (
    <motion.span className="bj-score" initial={{ scale: 0 }} animate={{ scale: 1 }}
      style={{ background: c.bg, border: `1px solid ${c.border}`, color: c.color }}>
      {hand.display}
    </motion.span>
  );
}

// ═══════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════

const OPP_POSITIONS = ['top', 'top-left', 'top-right', 'left', 'right'];

export default function BlackjackPage({ socket, roomInfo, roomCode, onLeave, initialState }) {
  const store = useBlackjackStore();
  const myId = socket?.id;

  // ── Apply initial state on mount ──
  useEffect(() => {
    if (initialState) store.syncState(initialState);
  }, []);

  // ── Socket listeners ──
  useEffect(() => {
    if (!socket) return;
    const s = store;

    const onState = (data) => s.syncState(data);
    const onCardDealt = (data) => { s.onCardDealt(data); sfxCardDeal(); };
    const onReveal = (data) => { s.onDealerReveal(data); sfxDealerReveal(); };
    const onSpecials = (data) => { s.onSpecials(data); sfxSpecialHand(); };
    const onShowdown = (data) => {
      s.onShowdown(data);
      const myResult = data.results?.find(r => r.pid === socket.id);
      if (myResult?.outcome === 'WIN') sfxWinHand();
      else if (myResult?.outcome === 'LOSE') sfxBust();
    };
    const onEnded = (data) => s.onGameEnded(data);
    const onErr = (data) => s.onError(data);

    const onCheckResult = (data) => {
      s.onCheckResult(data);
      if (data.pid === socket.id) {
        if (data.outcome === 'WIN') sfxWinHand();
        else if (data.outcome === 'LOSE') sfxBust();
        else sfxClick();
      } else {
        sfxCardDeal();
      }
      setTimeout(() => s.clearCheckResult(), 2000);
    };

    socket.on('blackjack-state', onState);
    socket.on('blackjack-card-dealt', onCardDealt);
    socket.on('blackjack-dealer-reveal', onReveal);
    socket.on('blackjack-specials', onSpecials);
    socket.on('blackjack-showdown', onShowdown);
    socket.on('blackjack-game-ended', onEnded);
    socket.on('blackjack-error', onErr);
    socket.on('blackjack-check-result', onCheckResult);

    return () => {
      socket.off('blackjack-state', onState);
      socket.off('blackjack-card-dealt', onCardDealt);
      socket.off('blackjack-dealer-reveal', onReveal);
      socket.off('blackjack-specials', onSpecials);
      socket.off('blackjack-showdown', onShowdown);
      socket.off('blackjack-game-ended', onEnded);
      socket.off('blackjack-error', onErr);
      socket.off('blackjack-check-result', onCheckResult);
    };
  }, [socket]);

  // ── Derived state ──
  const myPlayer = store.players[myId];
  const isDealer = myPlayer?.isDealer;
  const isMyTurn = store.currentTurn === myId;
  const canStand = true; // always allow standing (even on bust)
  const canHit = isMyTurn && myPlayer?.cards?.length < 5 && myPlayer?.status === 'PLAYING' && myPlayer?.hand?.label !== 'BUST';

  const opponents = useMemo(() => {
    return Object.entries(store.players).filter(([pid]) => pid !== myId);
  }, [store.players, myId]);

  const getName = (pid) => {
    const player = store.players[pid];
    return player?.nickname || pid?.slice(-4) || '???';
  };

  // ── Actions ──
  const handleBet = () => { if (!socket || !roomCode) return; sfxChipBet(); socket.emit('blackjack-bet', { roomCode, amount: store.selectedBet }); };
  const handleHit = () => { if (!socket || !roomCode) return; sfxCardFlip(); socket.emit('blackjack-hit', { roomCode }); };
  const handleStand = () => { if (!socket || !roomCode || !canStand) return; sfxClick(); socket.emit('blackjack-stand', { roomCode }); };
  const handleNextRound = () => { if (!socket || !roomCode) return; sfxClick(); socket.emit('blackjack-next-round', { roomCode }); };
  const handleCheckPlayer = (targetPid) => { if (!socket || !roomCode || !isDealer) return; sfxClick(); socket.emit('blackjack-dealer-check', { roomCode, targetPid }); };
  const handleDealerHitCheck = () => { if (!socket || !roomCode || !isDealer) return; sfxCardFlip(); socket.emit('blackjack-dealer-hit-check', { roomCode }); };

  // ═══════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════

  return (
    <div className="bj-page">

      {/* Background felt */}
      <div className="bj-table-felt" />
      <span className="bj-deck-icon">🂠</span>

      {/* ── Topbar ── */}
      <div className="bj-topbar">
        <button className="bj-leave" onClick={() => { sfxClick(); onLeave(); }}>
          <ArrowLeft size={12} /> Rời
        </button>
        <div className="bj-header-center">
          <h1 className="bj-title">BLACKJACK</h1>
          <span className="bj-subtitle">(Xì Dách)</span>
        </div>
        <span className="bj-room-code">{roomCode && `#${roomCode}`}</span>
      </div>

      {/* ── Phase banners (center of table) ── */}
      {store.phase === 'DEALING' && (
        <motion.div className="bj-phase-banner"
          initial={{ opacity: 0 }} animate={{ opacity: [0.12, 0.35, 0.12] }}
          transition={{ repeat: Infinity, duration: 2 }}>CHIA BÀI...</motion.div>
      )}
      {store.phase === 'DEALER_TURN' && (
        <motion.div className="bj-phase-banner"
          initial={{ opacity: 0 }} animate={{ opacity: [0.12, 0.35, 0.12] }}
          transition={{ repeat: Infinity, duration: 1.5 }}>DEALER RÚT BÀI...</motion.div>
      )}
      {store.phase === 'BETTING' && isDealer && (
        <motion.div className="bj-phase-banner"
          initial={{ opacity: 0 }} animate={{ opacity: 0.25 }}>CHỜ ĐẶT CƯỢC...</motion.div>
      )}
      {store.phase === 'DEALER_CHECK' && (
        <motion.div className="bj-phase-banner"
          initial={{ opacity: 0 }}
          animate={{ opacity: isDealer ? [0.15, 0.4, 0.15] : 0.2 }}
          transition={isDealer ? { repeat: Infinity, duration: 2 } : {}}>
          {isDealer ? 'CHỌN NGƯỜI ĐỂ CHECK' : 'DEALER ĐANG CHECK...'}
        </motion.div>
      )}

      {/* ── Opponents (absolute, Liar Deck style) ── */}
      {opponents.map(([pid, player], i) => {
        const pos = OPP_POSITIONS[i] || 'top';
        const isOppTurn = store.currentTurn === pid;
        const isUnchecked = store.phase === 'DEALER_CHECK' && store.uncheckedPlayers?.includes(pid);
        return (
          <div key={pid} className={`bj-opponent ${pos}`}>
            <span className={`bj-opp-name ${isOppTurn ? 'active' : ''} ${player.isDealer ? 'is-dealer-label' : ''}`}>
              {player.isDealer ? '🎩 ' : ''}{getName(pid)}
            </span>
            {/* Result number — right after name, above everything */}
            {store.showResult && store.results && (() => {
              const r = store.results.find(res => res.pid === pid);
              if (!r || r.outcome === 'ALREADY_RESOLVED') return null;
              return (
                <motion.span initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }}
                  style={{ fontSize: 18, fontWeight: 900, lineHeight: 1,
                    color: r.outcome === 'WIN' ? '#44ddaa' : r.outcome === 'LOSE' ? '#ff4466' : '#ffd700' }}>
                  {r.outcome === 'WIN' ? `+${r.payout}` : r.outcome === 'LOSE' ? `-${r.payout || 0}` : '±0'}
                </motion.span>
              );
            })()}
            {/* Check result — shows after dealer checks this player */}
            {store.checkedResults?.some(cr => cr.pid === pid) && !store.showResult && (() => {
              const cr = store.checkedResults.find(c => c.pid === pid);
              return (
                <motion.span initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }}
                  style={{ fontSize: 18, fontWeight: 900, lineHeight: 1,
                    color: cr.outcome === 'WIN' ? '#44ddaa' : cr.outcome === 'LOSE' ? '#ff4466' : '#ffd700' }}>
                  {cr.outcome === 'WIN' ? `+${cr.payout}` : cr.outcome === 'LOSE' ? `-${cr.payout || 0}` : '±0'}
                </motion.span>
              );
            })()}
            {player.bet > 0 && <span className="bj-opp-bet">💵 {player.bet}</span>}
            <div className="bj-hand">
              {player.cards?.map((card, ci) => (
                <BJCard key={card.id || ci} card={card} faceDown={card.hidden} index={ci} />
              ))}
            </div>
            {player.hand && <ScoreBadge hand={player.hand} />}
            <span className="bj-opp-chips">💰 {player.chips}</span>
            {player.status === 'BUST' && <span className="bj-opp-status bust">QUẮC</span>}
            {player.status === 'DONE' && !player.isDealer && <span className="bj-opp-status done">✓</span>}
            {isDealer && isUnchecked && (
              <motion.button className="bj-btn check-btn"
                initial={{ scale: 0 }} animate={{ scale: 1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => handleCheckPlayer(pid)}>
                ⚔️ CHECK
              </motion.button>
            )}
          </div>
        );
      })}

      {/* Check result toast removed — results shown inline at each player */}

      {/* Under-16 warning toast */}
      {isMyTurn && myPlayer?.hand?.points < 16 && store.phase === 'PLAYER_TURNS' && (
        <motion.div className="bj-toast warn"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          ⚠️ Chưa đủ 16 điểm — phải Rút!
        </motion.div>
      )}

      {/* ═══════ BOTTOM: My hand + actions ═══════ */}
      <div className="bj-bottom">
        <span className="bj-my-label">
          {isDealer ? '🎩 DEALER (Bạn)' : `${getName(myId)} (Bạn)`}
        </span>

        {/* My result — BEFORE cards, toward center */}
        {store.showResult && store.results && (() => {
          const r = store.results.find(res => res.pid === myId);
          if (r && r.outcome !== 'ALREADY_RESOLVED') {
            return (
              <motion.span initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }}
                style={{ fontSize: 20, fontWeight: 900, lineHeight: 1,
                  color: r.outcome === 'WIN' ? '#44ddaa' : r.outcome === 'LOSE' ? '#ff4466' : '#ffd700' }}>
                {r.outcome === 'WIN' ? `+${r.payout}` : r.outcome === 'LOSE' ? `-${r.payout || 0}` : '±0'}
              </motion.span>
            );
          }
          return null;
        })()}
        {/* Dealer net result from all checks */}
        {isDealer && store.checkedResults?.length > 0 && !store.showResult && (() => {
          let net = 0;
          for (const cr of store.checkedResults) {
            if (cr.outcome === 'WIN') net -= (cr.payout || 0);
            else if (cr.outcome === 'LOSE') net += (cr.payout || 0);
          }
          if (net === 0) return null;
          return (
            <motion.span initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }}
              style={{ fontSize: 20, fontWeight: 900, lineHeight: 1,
                color: net > 0 ? '#44ddaa' : '#ff4466' }}>
              {net > 0 ? `+${net}` : `${net}`}
            </motion.span>
          );
        })()}
        {/* Check result for me (non-dealer) during DEALER_CHECK */}
        {!isDealer && store.checkedResults?.some(cr => cr.pid === myId) && !store.showResult && (() => {
          const cr = store.checkedResults.find(c => c.pid === myId);
          return (
            <motion.span initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }}
              style={{ fontSize: 20, fontWeight: 900, lineHeight: 1,
                color: cr.outcome === 'WIN' ? '#44ddaa' : cr.outcome === 'LOSE' ? '#ff4466' : '#ffd700' }}>
              {cr.outcome === 'WIN' ? `+${cr.payout}` : cr.outcome === 'LOSE' ? `-${cr.payout || 0}` : '±0'}
            </motion.span>
          );
        })()}

        {myPlayer?.bet > 0 && <span className="bj-my-bet">💵 {myPlayer.bet}</span>}

        <div className="bj-hand">
          {myPlayer?.cards?.map((card, i) => (
            <BJCard key={card.id || i} card={card} faceDown={card.hidden} index={i} />
          ))}
        </div>

        {myPlayer?.hand && <ScoreBadge hand={myPlayer.hand} />}

        <span className="bj-my-chips">💰 {myPlayer?.chips || 0}</span>

        {/* Next round button */}
        {store.showResult && isDealer && (
          <motion.button className="bj-btn hit" style={{ marginTop: 6 }}
            whileTap={{ scale: 0.95 }} onClick={handleNextRound}>
            VÁN TIẾP →
          </motion.button>
        )}
        {store.showResult && !isDealer && (
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.15)', marginTop: 4 }}>Chờ Dealer...</span>
        )}

        {myPlayer?.status === 'BUST' && (
          <span style={{ color: '#ff4466', fontSize: 11, fontWeight: 800 }}>QUẮC</span>
        )}

        {/* Betting UI */}
        {store.phase === 'BETTING' && myPlayer && !isDealer && myPlayer.bet === 0 && (
          <motion.div className="bj-bet-panel"
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <span className="bj-bet-title">Đặt cược</span>
            <div className="bj-bet-row">
              {BET_OPTIONS.map(amt => (
                <motion.button key={amt}
                  className={`bj-chip ${store.selectedBet === amt ? 'selected' : ''}`}
                  whileTap={{ scale: 0.9 }}
                  disabled={amt > (myPlayer?.chips || 0)}
                  onClick={() => store.setSelectedBet(amt)}>
                  {amt}
                </motion.button>
              ))}
            </div>
            <button className="bj-bet-confirm" onClick={handleBet}>
              ĐẶT {store.selectedBet} CHIP
            </button>
          </motion.div>
        )}

        {store.phase === 'BETTING' && myPlayer && !isDealer && myPlayer.bet > 0 && (
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', fontWeight: 700 }}>
            ĐÃ ĐẶT — CHỜ NGƯỜI KHÁC...
          </span>
        )}

        {/* HIT / STAND */}
        {store.phase === 'PLAYER_TURNS' && isMyTurn && !isDealer && (
          <div className="bj-actions">
            <motion.button className="bj-btn hit" disabled={!canHit}
              whileTap={{ scale: 0.95 }} onClick={handleHit}>
              <Plus size={14} strokeWidth={3} /> RÚT
            </motion.button>
            <motion.button className="bj-btn stand" disabled={!canStand}
              whileTap={canStand ? { scale: 0.95 } : {}}
              onClick={handleStand} title={!canStand ? 'Chưa đủ 16 điểm!' : ''}>
              <Hand size={14} /> DẰN
            </motion.button>
          </div>
        )}

        {/* Dealer check: RÚT THÊM */}
        {store.phase === 'DEALER_CHECK' && isDealer && myPlayer?.cards?.length < 5 && myPlayer?.hand?.label !== 'BUST' && (
          <div className="bj-actions">
            <motion.button className="bj-btn hit"
              whileTap={{ scale: 0.95 }} onClick={handleDealerHitCheck}>
              <Plus size={14} strokeWidth={3} /> RÚT THÊM
            </motion.button>
          </div>
        )}
      </div>

      {/* ── Error toast ── */}
      <AnimatePresence>
        {store.error && (
          <motion.div
            initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            style={{ position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)',
              background: 'rgba(255,68,102,0.12)', border: '1px solid rgba(255,68,102,0.15)',
              borderRadius: 8, padding: '8px 16px', color: '#ff4466', fontSize: 12,
              fontWeight: 700, zIndex: 200 }}
            onClick={() => store.clearError()}>
            {store.error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Result overlay removed — results shown inline in bottom panel */}
    </div>
  );
}
