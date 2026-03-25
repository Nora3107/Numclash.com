// ============================================
// SuckCard.com — Liar's Deck Game Page
// 2D top-down card game UI — clean minimal
// ============================================

import { useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import useLiarStore from '../stores/useLiarStore';
import Card from '../components/Card';
import './liarDeck.css';

// Map Liar's Deck card to Card.jsx props
const RANK_SUIT_MAP = { J: 'spades', Q: 'hearts', K: 'diamonds', A: 'clubs' };

// Opponent display
function OpponentSlot({ pid, name, lives, cardCount, isActive, isDead, position, lastPlay, socketId }) {
  const hasLastPlay = lastPlay && lastPlay.playerId === pid;

  return (
    <div className={`ld-opponent ${position} ${isActive ? 'active' : ''} ${isDead ? 'dead' : ''}`}>
      <div className="opp-nameplate">
        <span className="opp-name">{name}</span>
        <span className="opp-lives">
          {Array.from({ length: 3 }, (_, i) => (
            <span key={i} className={i < lives ? 'alive' : 'lost'}>♥</span>
          ))}
        </span>
      </div>

      {/* Face-down hand */}
      <div className="opp-cards">
        {Array.from({ length: Math.min(cardCount, 6) }, (_, i) => (
          <div key={i} className="card-back-mini" style={{ marginLeft: i > 0 ? '-10px' : 0 }} />
        ))}
      </div>

      {/* Last play — cards in front of this player */}
      {hasLastPlay && (
        <motion.div className="opp-last-play" initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
          {Array.from({ length: lastPlay.count }, (_, i) => (
            <div key={i} className="card-back-played" style={{ transform: `rotate(${(i - 1) * 8}deg)` }} />
          ))}
        </motion.div>
      )}
    </div>
  );
}

export default function LiarDeckPage({ socket, roomInfo, onLeave, initialState }) {
  const store = useLiarStore();
  const socketId = socket.id;

  const getPlayerName = useCallback((pid) => {
    return roomInfo?.players?.find(p => p.id === pid)?.nickname || pid?.slice(0, 6);
  }, [roomInfo]);

  useEffect(() => { if (initialState) store.syncState(initialState); }, [initialState]);

  useEffect(() => {
    const h = {
      'liardeck-state': (s) => store.syncState(s),
      'liardeck-round-start': (d) => store.onRoundStart(d),
      'liardeck-played': (d) => store.onPlayed(d),
      'liardeck-resolution': (d) => store.onResolution(d),
      'liardeck-game-over': (d) => store.onGameOver(d),
      'liardeck-timer': ({ remaining }) => store.setTimer(remaining),
      'liardeck-error': (e) => console.warn('LiarDeck:', e),
    };
    Object.entries(h).forEach(([ev, fn]) => socket.on(ev, fn));
    return () => { Object.keys(h).forEach(ev => socket.off(ev)); store.reset(); };
  }, [socket]);

  const handlePlay = () => {
    if (store.selectedCards.length === 0) return;
    socket.emit('liardeck-play', { roomCode: roomInfo?.code, cardIds: store.selectedCards });
  };

  const handleCallLiar = () => {
    socket.emit('liardeck-call-liar', { roomCode: roomInfo?.code });
  };

  const isMyTurn = store.currentTurn === socketId;
  const canCallLiar = isMyTurn && store.lastPlay && store.lastPlay.playerId !== socketId && store.tablePileCount > 0;
  const myPlayer = store.players[socketId];
  const myLastPlay = store.lastPlay && store.lastPlay.playerId === socketId;

  // Arrange opponents around edges
  const opponents = useMemo(() => {
    const pids = Object.keys(store.players).filter(pid => pid !== socketId);
    const positions = pids.length <= 1 ? ['top']
      : pids.length === 2 ? ['left', 'right']
      : pids.length === 3 ? ['left', 'top', 'right']
      : pids.length === 4 ? ['left', 'top-left', 'top-right', 'right']
      : ['left', 'top-left', 'top', 'top-right', 'right'];
    return pids.map((pid, i) => ({ pid, position: positions[i] || 'top', ...store.players[pid], name: getPlayerName(pid) }));
  }, [store.players, socketId, getPlayerName]);

  const res = store.resolution;

  return (
    <div className="ld-page">
      {/* Top bar */}
      <div className="ld-topbar">
        <button className="ld-leave" onClick={onLeave}><ArrowLeft size={14} /> Rời</button>
        <div className="ld-header">
          {store.targetCard && <span className="ld-target">Mục tiêu: <strong>{store.targetLabel}</strong></span>}
          <span className="ld-round">Round {store.roundNumber}</span>
        </div>
        <span className={`ld-timer ${store.phase === 'playing' && store.timer <= 5 ? 'urgent' : ''}`}>
          {store.phase === 'playing' ? store.timer : '--'}
        </span>
      </div>

      {/* Opponents */}
      {opponents.map(o => (
        <OpponentSlot key={o.pid} pid={o.pid} name={o.name} lives={o.lives}
          cardCount={o.cardCount} isActive={o.pid === store.currentTurn}
          isDead={o.status === 'ELIMINATED'} position={o.position}
          lastPlay={store.lastPlay} socketId={socketId} />
      ))}

      {/* Center zone */}
      <div className="ld-center">
        {/* Discard pile (previous rounds' cards) */}
        <div className="ld-pile">
          {store.tablePileCount > 0 && (
            <>
              {Array.from({ length: Math.min(store.tablePileCount, 6) }, (_, i) => (
                <div key={i} className="card-back-pile"
                  style={{ position: 'absolute', transform: `rotate(${(i * 20) - 40}deg) translate(${(i % 3 - 1) * 4}px, ${(i % 2) * 3}px)` }} />
              ))}
              <span className="pile-label">{store.tablePileCount}</span>
            </>
          )}
          {store.tablePileCount === 0 && store.phase === 'playing' && (
            <span className="pile-label empty">Bàn trống</span>
          )}
        </div>

        {/* Turn + info text — plain white */}
        {store.phase === 'playing' && store.lastPlay && (
          <span className="ld-info-text">{getPlayerName(store.lastPlay.playerId)} đánh {store.lastPlay.count} lá</span>
        )}
        {store.phase === 'playing' && (
          <span className={`ld-turn-text ${isMyTurn ? 'mine' : ''}`}>
            {isMyTurn ? 'Lượt của bạn!' : getPlayerName(store.currentTurn)}
          </span>
        )}
      </div>

      {/* My last play — shown in front of me */}
      {myLastPlay && (
        <motion.div className="ld-my-lastplay" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
          {Array.from({ length: store.lastPlay.count }, (_, i) => (
            <div key={i} className="card-back-played" style={{ transform: `rotate(${(i - 1) * 8}deg)` }} />
          ))}
        </motion.div>
      )}

      {/* Resolution overlay */}
      <AnimatePresence>
        {store.showResolution && res && (
          <motion.div className="ld-resolution" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="res-content" initial={{ scale: 0.85 }} animate={{ scale: 1 }}>
              <h2 className="res-title">{res.resultType === 'CAUGHT' ? 'Bắt được!' : 'Bắt sai!'}</h2>
              <p className="res-subtitle">
                {res.resultType === 'CAUGHT'
                  ? `${getPlayerName(res.accusedId)} đã nói dối`
                  : `${getPlayerName(res.accusedId)} nói thật — ${getPlayerName(res.callerId)} mất mạng`
                }
              </p>
              <div className="res-cards">
                {res.flippedCards.map((card, i) => (
                  <motion.div key={i} className="res-card" initial={{ rotateY: 180 }} animate={{ rotateY: 0 }} transition={{ delay: i * 0.15 }}>
                    <Card
                      value={card.rank}
                      suit={RANK_SUIT_MAP[card.rank]}
                      isJoker={card.isJoker || card.rank === 'JOKER'}
                    />
                  </motion.div>
                ))}
              </div>
              <p className="res-result">
                {getPlayerName(res.loserId)} mất 1 ♥
                {res.eliminated && <span className="elim"> — Bị loại!</span>}
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom — hand + actions */}
      <div className="ld-bottom">
        {myPlayer && (
          <div className="ld-mystatus">
            <span className="my-name">{getPlayerName(socketId)}</span>
            <span className="my-lives">
              {Array.from({ length: 3 }, (_, i) => (
                <span key={i} className={i < myPlayer.lives ? 'alive' : 'lost'}>♥</span>
              ))}
            </span>
          </div>
        )}

        <div className="ld-hand">
          {store.myHand.map((card, i) => {
            const sel = store.selectedCards.includes(card.id);
            const playable = isMyTurn && store.phase === 'playing';
            return (
              <motion.button
                key={card.id}
                className={`ld-handcard ${sel ? 'sel' : ''} ${playable ? 'playable' : ''}`}
                onClick={() => playable && store.toggleCardSelection(card.id)}
                animate={{ y: sel ? -14 : 0, opacity: 1 }}
                whileHover={playable ? { y: sel ? -18 : -10, transition: { type: 'spring', stiffness: 400, damping: 20 } } : {}}
                initial={{ y: 40, opacity: 0 }}
                transition={{ delay: i * 0.04, type: 'spring', stiffness: 300, damping: 22 }}
                style={{ zIndex: sel ? 10 : i }}
              >
                <Card
                  value={card.rank}
                  suit={RANK_SUIT_MAP[card.rank]}
                  isJoker={card.isJoker || card.rank === 'JOKER'}
                />
              </motion.button>
            );
          })}
        </div>

        {isMyTurn && store.phase === 'playing' && (
          <div className="ld-actions">
            <motion.button className="ld-btn play" onClick={handlePlay} disabled={store.selectedCards.length === 0}
              whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              Đánh bài ({store.selectedCards.length})
            </motion.button>
            {canCallLiar && (
              <motion.button className="ld-btn liar" onClick={handleCallLiar}
                whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                Bắt bài
              </motion.button>
            )}
          </div>
        )}
      </div>

      {/* Toast */}
      <AnimatePresence>
        {store.message && (
          <motion.div className={`ld-toast ${store.message.type}`}
            initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -20, opacity: 0 }}>
            {store.message.text}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Game Over */}
      <AnimatePresence>
        {store.phase === 'finished' && (
          <motion.div className="ld-gameover" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <motion.div className="go-box" initial={{ scale: 0.8 }} animate={{ scale: 1 }}>
              <span className="go-icon">{store.winner === socketId ? '🏆' : '💀'}</span>
              <h2>{store.winner === socketId ? 'Chiến thắng!' : `${getPlayerName(store.winner)} thắng!`}</h2>
              <div className="go-list">
                {Object.entries(store.players).map(([pid, p]) => (
                  <div key={pid} className={`go-row ${pid === store.winner ? 'w' : ''}`}>
                    <span>{getPlayerName(pid)}</span>
                    <span>{p.lives > 0 ? `♥ ${p.lives}` : '☠️'}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
