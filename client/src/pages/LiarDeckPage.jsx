// ============================================
// SuckCard.com — Liar's Deck Game Page
// 2D top-down card game UI
// ============================================

import { useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import useLiarStore from '../stores/useLiarStore';
import './liarDeck.css';

// Card display component
function CardFace({ card, small }) {
  if (!card) return null;
  const isJoker = card.isJoker || card.rank === 'JOKER';
  const color = isJoker ? '#9b59b6' : ['J', 'K'].includes(card.rank) ? '#1a1a1a' : '#c0392b';

  return (
    <div className={`ld-card-face ${small ? 'small' : ''}`}>
      <span className="card-rank" style={{ color }}>
        {isJoker ? '🃏' : card.rank}
      </span>
      {!isJoker && <span className="card-suit">{card.rank === 'J' ? '♠' : card.rank === 'Q' ? '♥' : card.rank === 'K' ? '♦' : '♣'}</span>}
    </div>
  );
}

// Opponent hand (face-down cards)
function OpponentHand({ name, lives, cardCount, isActive, isDead, position, isCaller, isAccused }) {
  const posClass = `opponent-${position}`; // top, left, right, top-left, top-right

  return (
    <div className={`ld-opponent ${posClass} ${isActive ? 'active' : ''} ${isDead ? 'dead' : ''} ${isCaller ? 'caller' : ''} ${isAccused ? 'accused' : ''}`}>
      <div className="opponent-info">
        <span className="opponent-name">{name}</span>
        <div className="opponent-lives">
          {Array.from({ length: 3 }, (_, i) => (
            <span key={i} className={`life ${i < lives ? 'alive' : 'lost'}`}>♥</span>
          ))}
        </div>
      </div>
      <div className="opponent-cards">
        {Array.from({ length: Math.min(cardCount, 6) }, (_, i) => (
          <motion.div
            key={i}
            className="ld-card-back mini"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: i * 0.05 }}
            style={{ marginLeft: i > 0 ? '-12px' : 0 }}
          />
        ))}
        {cardCount > 0 && <span className="card-count-badge">{cardCount}</span>}
      </div>
    </div>
  );
}

// Main page
export default function LiarDeckPage({ socket, roomInfo, onLeave, initialState }) {
  const store = useLiarStore();
  const socketId = socket.id;

  const getPlayerName = useCallback((pid) => {
    const p = roomInfo?.players?.find(p => p.id === pid);
    return p?.nickname || pid?.slice(0, 6);
  }, [roomInfo]);

  useEffect(() => {
    if (initialState) store.syncState(initialState);
  }, [initialState]);

  useEffect(() => {
    const handlers = {
      'liardeck-state': (s) => store.syncState(s),
      'liardeck-round-start': (d) => store.onRoundStart(d),
      'liardeck-played': (d) => store.onPlayed(d),
      'liardeck-resolution': (d) => store.onResolution(d),
      'liardeck-game-over': (d) => store.onGameOver(d),
      'liardeck-timer': ({ remaining }) => store.setTimer(remaining),
      'liardeck-error': (e) => console.warn('LiarDeck:', e),
    };
    Object.entries(handlers).forEach(([ev, fn]) => socket.on(ev, fn));
    return () => {
      Object.keys(handlers).forEach(ev => socket.off(ev));
      store.reset();
    };
  }, [socket]);

  // Actions
  const handlePlay = () => {
    if (store.selectedCards.length === 0) return;
    socket.emit('liardeck-play', {
      roomCode: roomInfo?.code,
      cardIds: store.selectedCards,
    });
  };

  const handleCallLiar = () => {
    socket.emit('liardeck-call-liar', { roomCode: roomInfo?.code });
  };

  // Derived
  const isMyTurn = store.currentTurn === socketId;
  const canCallLiar = isMyTurn && store.lastPlay && store.lastPlay.playerId !== socketId && store.tablePileCount > 0;
  const myPlayer = store.players[socketId];

  // Arrange opponents
  const opponents = useMemo(() => {
    const allPids = Object.keys(store.players).filter(pid => pid !== socketId);
    const positions = allPids.length <= 1
      ? ['top']
      : allPids.length === 2
        ? ['left', 'right']
        : allPids.length === 3
          ? ['left', 'top', 'right']
          : allPids.length === 4
            ? ['left', 'top-left', 'top-right', 'right']
            : ['left', 'top-left', 'top', 'top-right', 'right'];

    return allPids.map((pid, i) => ({
      pid,
      position: positions[i] || 'top',
      ...store.players[pid],
      name: getPlayerName(pid),
    }));
  }, [store.players, socketId, getPlayerName]);

  // Resolution info
  const res = store.resolution;

  return (
    <div className="ld-page">
      {/* Top bar */}
      <div className="ld-top-bar">
        <motion.button className="ld-leave" onClick={onLeave} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <ArrowLeft size={14} /> Rời phòng
        </motion.button>

        <div className="ld-round-info">
          {store.targetCard && (
            <div className="ld-target">
              Mục tiêu: <strong>{store.targetLabel}</strong>
              <span className="target-card-icon">
                {store.targetCard === 'J' ? '♠' : store.targetCard === 'Q' ? '♥' : store.targetCard === 'K' ? '♦' : '♣'}
              </span>
            </div>
          )}
          <div className="ld-round">Round {store.roundNumber}</div>
        </div>

        <div className="ld-timer-wrap">
          {store.phase === 'playing' && (
            <div className={`ld-timer ${store.timer <= 5 ? 'urgent' : ''}`}>
              {store.timer}
            </div>
          )}
        </div>
      </div>

      {/* Opponents */}
      {opponents.map(opp => (
        <OpponentHand
          key={opp.pid}
          name={opp.name}
          lives={opp.lives}
          cardCount={opp.cardCount}
          isActive={opp.pid === store.currentTurn}
          isDead={opp.status === 'ELIMINATED'}
          position={opp.position}
          isCaller={res?.callerId === opp.pid}
          isAccused={res?.accusedId === opp.pid}
        />
      ))}

      {/* Center table */}
      <div className="ld-center">
        {/* Table pile */}
        <div className="ld-pile">
          <div className="pile-stack">
            {Array.from({ length: Math.min(store.tablePileCount, 8) }, (_, i) => (
              <div
                key={i}
                className="ld-card-back"
                style={{
                  position: 'absolute',
                  transform: `rotate(${(i * 15) - 30}deg) translate(${(Math.random()-0.5)*6}px, ${(Math.random()-0.5)*6}px)`,
                }}
              />
            ))}
          </div>
          {store.tablePileCount > 0 && (
            <span className="pile-count">{store.tablePileCount} lá</span>
          )}
          {store.tablePileCount === 0 && store.phase === 'playing' && (
            <span className="pile-empty">Bàn trống</span>
          )}
        </div>

        {/* Last play info */}
        <AnimatePresence>
          {store.lastPlay && store.phase === 'playing' && (
            <motion.div className="ld-last-play" initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ opacity: 0 }}>
              {getPlayerName(store.lastPlay.playerId)} đánh {store.lastPlay.count} lá
            </motion.div>
          )}
        </AnimatePresence>

        {/* Turn indicator */}
        {store.phase === 'playing' && (
          <div className={`ld-turn-indicator ${isMyTurn ? 'my-turn' : ''}`}>
            {isMyTurn ? '🎯 Lượt của bạn!' : `⏳ ${getPlayerName(store.currentTurn)}`}
          </div>
        )}
      </div>

      {/* Resolution overlay */}
      <AnimatePresence>
        {store.showResolution && res && (
          <motion.div className="ld-resolution" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="resolution-card" initial={{ scale: 0.8, y: 20 }} animate={{ scale: 1, y: 0 }}>
              <div className="resolution-title">
                {res.resultType === 'CAUGHT' ? '🎉 Bắt được!' : '😤 Bắt sai!'}
              </div>
              <div className="resolution-subtitle">
                {res.resultType === 'CAUGHT'
                  ? `${getPlayerName(res.accusedId)} đã nói dối!`
                  : `${getPlayerName(res.accusedId)} nói thật! ${getPlayerName(res.callerId)} mất mạng.`
                }
              </div>
              <div className="resolution-flipped">
                {res.flippedCards.map((card, i) => (
                  <motion.div key={i} className="flipped-card" initial={{ rotateY: 180, scale: 0.5 }} animate={{ rotateY: 0, scale: 1 }} transition={{ delay: i * 0.15, type: 'spring' }}>
                    <CardFace card={card} />
                  </motion.div>
                ))}
              </div>
              <div className="resolution-result">
                {getPlayerName(res.loserId)} mất 1 ❤️
                {res.eliminated && <span className="eliminated-badge"> — BỊ LOẠI!</span>}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* My hand & actions */}
      <div className="ld-bottom">
        {/* My lives */}
        {myPlayer && (
          <div className="ld-my-status">
            <span className="my-name">{getPlayerName(socketId)}</span>
            <div className="my-lives">
              {Array.from({ length: 3 }, (_, i) => (
                <span key={i} className={`life ${i < myPlayer.lives ? 'alive' : 'lost'}`}>♥</span>
              ))}
            </div>
          </div>
        )}

        {/* Hand cards */}
        <div className="ld-my-hand">
          {store.myHand.map((card, i) => {
            const selected = store.selectedCards.includes(card.id);
            return (
              <motion.button
                key={card.id}
                className={`ld-hand-card ${selected ? 'selected' : ''} ${isMyTurn && store.phase === 'playing' ? 'playable' : ''}`}
                onClick={() => isMyTurn && store.phase === 'playing' && store.toggleCardSelection(card.id)}
                whileHover={isMyTurn ? { y: -8, scale: 1.05 } : {}}
                whileTap={isMyTurn ? { scale: 0.95 } : {}}
                initial={{ y: 50, opacity: 0 }}
                animate={{ y: selected ? -12 : 0, opacity: 1, rotate: (i - store.myHand.length / 2) * 2 }}
                transition={{ delay: i * 0.03 }}
              >
                <CardFace card={card} />
              </motion.button>
            );
          })}
        </div>

        {/* Action buttons */}
        {isMyTurn && store.phase === 'playing' && (
          <div className="ld-actions">
            <motion.button
              className="ld-btn play-btn"
              onClick={handlePlay}
              disabled={store.selectedCards.length === 0}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              ĐÁNH BÀI ({store.selectedCards.length})
            </motion.button>

            {canCallLiar && (
              <motion.button
                className="ld-btn liar-btn"
                onClick={handleCallLiar}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                🔍 BẮT BÀI
              </motion.button>
            )}
          </div>
        )}
      </div>

      {/* Message toast */}
      <AnimatePresence>
        {store.message && (
          <motion.div
            className={`ld-toast ${store.message.type}`}
            initial={{ y: -30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -30, opacity: 0 }}
          >
            {store.message.text}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Game Over */}
      <AnimatePresence>
        {store.phase === 'finished' && (
          <motion.div className="ld-gameover" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <motion.div className="gameover-content" initial={{ scale: 0.7 }} animate={{ scale: 1 }} transition={{ type: 'spring' }}>
              <div className="go-emoji">{store.winner === socketId ? '🏆' : '💀'}</div>
              <h2>{store.winner === socketId ? 'CHIẾN THẮNG!' : `${getPlayerName(store.winner)} THẮNG!`}</h2>
              <p>Quay lại sảnh chờ...</p>
              <div className="go-players">
                {Object.entries(store.players).map(([pid, p]) => (
                  <div key={pid} className={`go-player ${pid === store.winner ? 'winner' : ''}`}>
                    <span>{getPlayerName(pid)}</span>
                    <span>{p.lives > 0 ? `❤️ ${p.lives}` : '☠️'}</span>
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
