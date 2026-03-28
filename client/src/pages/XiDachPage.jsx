// ============================================
// SuckCard.com — Xì Dách (Vietnamese Blackjack)
// Game Page Component
// ============================================

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Plus, Hand } from 'lucide-react';
import useXiDachStore, { BET_OPTIONS } from '../stores/useXiDachStore';
import { sfxClick, sfxCardFlip } from '../sounds/gameSfx';
import './xiDach.css';

// ═══════════════════════════════════════════
// CARD COMPONENT
// ═══════════════════════════════════════════

function PlayingCard({ card, faceDown = false, index = 0 }) {
  const isRed = card && (card.suit === '♥' || card.suit === '♦');

  return (
    <motion.div
      className={`xd-card ${faceDown ? 'face-down' : 'face-up'} ${isRed ? 'red' : 'black'}`}
      initial={{ opacity: 0, y: -40, rotateY: faceDown ? 180 : 0 }}
      animate={{ opacity: 1, y: 0, rotateY: 0 }}
      transition={{ delay: index * 0.15, type: 'spring', stiffness: 180, damping: 18 }}
    >
      {faceDown ? (
        <span className="card-back-pattern">🂠</span>
      ) : (
        <>
          <span className="card-corner tl">{card.rank}<br/>{card.suit}</span>
          <span className="card-rank">{card.rank}</span>
          <span className="card-suit">{card.suit}</span>
          <span className="card-corner br">{card.rank}<br/>{card.suit}</span>
        </>
      )}
    </motion.div>
  );
}

// ═══════════════════════════════════════════
// SCORE BADGE
// ═══════════════════════════════════════════

function ScoreBadge({ hand, revealed = true }) {
  if (!hand || !revealed) return null;

  const colorMap = {
    XIBANG: { bg: 'rgba(255,215,0,0.15)', border: '#ffd700', color: '#ffd700' },
    XIDACH: { bg: 'rgba(68,221,170,0.15)', border: '#44ddaa', color: '#44ddaa' },
    NGULINH: { bg: 'rgba(68,221,170,0.15)', border: '#44ddaa', color: '#44ddaa' },
    BUST: { bg: 'rgba(255,68,102,0.15)', border: '#ff4466', color: '#ff4466' },
    STAND: { bg: 'rgba(255,255,255,0.08)', border: 'rgba(255,255,255,0.2)', color: '#e0e0e0' },
    UNDERAGE: { bg: 'rgba(255,165,0,0.1)', border: 'rgba(255,165,0,0.3)', color: '#ffa500' },
  };

  const c = colorMap[hand.label] || colorMap.STAND;

  return (
    <motion.span
      className="xd-score-badge"
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 300 }}
      style={{
        background: c.bg,
        border: `1.5px solid ${c.border}`,
        color: c.color,
      }}
    >
      {hand.display}
    </motion.span>
  );
}

// ═══════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════

export default function XiDachPage({ onLeave }) {
  const store = useXiDachStore();

  // Auto-start session on mount
  useEffect(() => {
    if (store.phase === 'IDLE') store.startNewSession();
  }, []);

  const canStand = store.playerHand && store.playerHand.points >= 16;
  const canHit = store.phase === 'PLAYER_TURNS' && !store.playerDone && store.playerCards.length < 5;

  return (
    <div className="xidach-page">

      {/* ── Header ── */}
      <div className="xd-header">
        <button className="xd-back-btn" onClick={() => { sfxClick(); onLeave(); }}>
          <ArrowLeft size={14} /> Trở về
        </button>
        <h1 className="xd-title">XÌ DÁCH</h1>
        <div className="xd-chips">💰 {store.playerChips.toLocaleString()}</div>
      </div>

      {/* ── Table ── */}
      <div className="xd-table">

        {/* ── Dealer Area ── */}
        <div className="xd-panel xd-card-area">
          <span className="xd-area-label">DEALER</span>
          <div className="xd-hand">
            {store.dealerCards.map((card, i) => (
              <PlayingCard
                key={card.id}
                card={card}
                faceDown={!store.dealerRevealed && i === 1}
                index={i}
              />
            ))}
          </div>
          <ScoreBadge
            hand={store.dealerHand}
            revealed={store.dealerRevealed || store.phase === 'SHOWDOWN'}
          />
        </div>

        {/* ── Betting Phase ── */}
        {store.phase === 'BETTING' && (
          <motion.div
            className="xd-panel xd-bet-area"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <span className="xd-bet-label">Đặt cược</span>
            <div className="xd-bet-options">
              {BET_OPTIONS.map((amount) => (
                <motion.button
                  key={amount}
                  className="xd-chip-btn"
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.92 }}
                  disabled={amount > store.playerChips}
                  onClick={() => { sfxClick(); store.placeBet(amount); }}
                >
                  {amount}
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}

        {/* ── Player Area ── */}
        {store.phase !== 'BETTING' && (
          <div className="xd-panel xd-card-area">
            <span className="xd-area-label">BẠN {store.playerBet > 0 && `(Cược: ${store.playerBet})`}</span>
            <div className="xd-hand">
              {store.playerCards.map((card, i) => (
                <PlayingCard key={card.id} card={card} index={i} />
              ))}
            </div>
            <ScoreBadge hand={store.playerHand} />

            {/* Action buttons */}
            {store.phase === 'PLAYER_TURNS' && !store.playerDone && (
              <motion.div
                className="xd-actions"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <motion.button
                  className="xd-action-btn hit"
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.96 }}
                  disabled={!canHit}
                  onClick={() => { sfxCardFlip(); store.playerHit(); }}
                >
                  <Plus size={18} strokeWidth={3} /> RÚT
                </motion.button>
                <motion.button
                  className="xd-action-btn stand"
                  whileHover={canStand ? { scale: 1.03 } : {}}
                  whileTap={canStand ? { scale: 0.96 } : {}}
                  disabled={!canStand}
                  onClick={() => { sfxClick(); store.playerStand(); }}
                  title={!canStand ? 'Chưa đủ 16 điểm — phải Rút thêm!' : ''}
                >
                  <Hand size={18} /> DẰN
                </motion.button>
              </motion.div>
            )}

            {/* Under-16 warning */}
            {store.phase === 'PLAYER_TURNS' && !store.playerDone && store.playerHand && store.playerHand.points < 16 && (
              <motion.p
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                style={{ fontSize: 12, color: '#ffa500', marginTop: 4, textAlign: 'center' }}
              >
                ⚠️ Chưa đủ 16 điểm — phải Rút thêm!
              </motion.p>
            )}

            {/* Waiting states */}
            {store.phase === 'DEALER_TURN' && (
              <motion.p
                initial={{ opacity: 0 }} animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
                style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', marginTop: 8 }}
              >
                Dealer đang rút bài...
              </motion.p>
            )}
          </div>
        )}
      </div>

      {/* ── Result Overlay ── */}
      <AnimatePresence>
        {store.phase === 'SHOWDOWN' && store.result && (
          <motion.div
            className="xd-result-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="xd-panel xd-result-card"
              initial={{ scale: 0.8, y: 30 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 200 }}
            >
              <h2 style={{
                color: store.result.outcome === 'WIN' ? '#44ddaa'
                     : store.result.outcome === 'LOSE' ? '#ff4466'
                     : '#ffd700',
              }}>
                {store.result.outcome === 'WIN' ? '🎉 THẮNG!'
                 : store.result.outcome === 'LOSE' ? '💀 THUA!'
                 : '🤝 HÒA!'}
              </h2>
              <p className="result-msg">{store.result.message}</p>
              {store.result.payout > 0 && (
                <p className="result-payout" style={{ color: '#ffd700' }}>
                  +{store.result.payout} chip
                </p>
              )}
              <button className="xd-next-btn" onClick={() => { sfxClick(); store.nextRound(); }}>
                {store.playerChips <= 0 && store.result.outcome !== 'WIN' ? 'CHƠI LẠI' : 'VÁN TIẾP'}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Game Over (no chips) ── */}
      {store.phase === 'IDLE' && store.roundHistory.length > 0 && (
        <motion.div
          className="xd-result-overlay"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        >
          <div className="xd-panel xd-result-card">
            <h2 style={{ color: '#ff4466' }}>💀 HẾT CHIP!</h2>
            <p className="result-msg">Bạn đã chơi {store.roundHistory.length} ván.</p>
            <button className="xd-next-btn" onClick={() => { sfxClick(); store.resetGame(); store.startNewSession(); }}>
              CHƠI LẠI TỪ ĐẦU
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
