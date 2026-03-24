import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Crown, MessageCircle, ArrowLeft, Trophy } from 'lucide-react';
import Card from '../components/Card';
import '../oldmaid.css';

const QUICK_CHATS = [
  'Rút lá ngoài cùng bên trái đi bạn êi 😏',
  'Cẩn thận dính mìn nha 💣',
  'Tôi không có Joker đâu~ 🤥',
  'Ê chọn lá giữa đi, tin tôi 😂',
  'Xui rồi bạn ơi 😱',
  'GG WP! 🏆',
  '😂😂😂',
  '🤔🤔🤔',
];

// Player slot positions based on count
function getSlotPositions(count) {
  const slotNames = {
    2: ['bottom', 'top'],
    3: ['bottom', 'left', 'right'],
    4: ['bottom', 'left', 'top', 'right'],
    5: ['bottom', 'left-bottom', 'left-top', 'top', 'right'],
    6: ['bottom', 'left-bottom', 'left-top', 'top', 'right-top', 'right-bottom'],
  };
  return slotNames[count] || slotNames[4];
}

export default function OldMaidPage({ socket, roomInfo, onLeave }) {
  const [gameState, setGameState] = useState(null);
  const [timer, setTimer] = useState(15);
  const [showChat, setShowChat] = useState(false);
  const [chatBubbles, setChatBubbles] = useState({});
  const [showGameOver, setShowGameOver] = useState(false);
  const [gameResult, setGameResult] = useState(null);
  const [draggedCard, setDraggedCard] = useState(null);
  const [actionLog, setActionLog] = useState([]);
  const [lastDiscardedPair, setLastDiscardedPair] = useState(null);

  const socketId = socket.id;

  // Add action message
  const addAction = useCallback((text) => {
    const id = Date.now() + Math.random();
    setActionLog(prev => [...prev.slice(-2), { id, text }]);
    setTimeout(() => {
      setActionLog(prev => prev.filter(a => a.id !== id));
    }, 3000);
  }, []);

  const getPlayerName = useCallback((pid) => {
    const p = roomInfo?.players?.find(p => p.id === pid);
    return p ? p.nickname : 'Player';
  }, [roomInfo]);

  // Socket listeners
  useEffect(() => {
    socket.on('oldmaid-state', (state) => {
      setGameState(state);
    });

    socket.on('oldmaid-turn', (data) => {
      setGameState(prev => prev ? {
        ...prev,
        currentTurn: data.currentTurn,
        drawTarget: data.drawTarget,
        hands: data.hands,
      } : prev);
      setTimer(15);
      addAction(`🎯 Đến lượt ${getPlayerName(data.currentTurn)}`);
    });

    socket.on('oldmaid-timer', ({ remaining }) => {
      setTimer(remaining);
    });

    socket.on('oldmaid-draw', (data) => {
      addAction(`🃏 ${getPlayerName(data.to)} rút bài từ ${getPlayerName(data.from)}`);
      if (data.discarded && data.discarded.length > 0) {
        setLastDiscardedPair(data.discarded.slice(0, 2));
        setTimeout(() => {
          addAction(`✨ ${getPlayerName(data.to)} vứt 1 cặp!`);
        }, 500);
      }
    });

    socket.on('oldmaid-auto-draw', (data) => {
      addAction(`⏰ Hết giờ! ${getPlayerName(data.to)} tự động rút bài`);
      if (data.discarded && data.discarded.length > 0) {
        setLastDiscardedPair(data.discarded.slice(0, 2));
      }
    });

    socket.on('oldmaid-initial-discard', (data) => {
      addAction(`♻️ Tự động vứt các cặp bài ban đầu`);
    });

    socket.on('oldmaid-hand-reordered', ({ playerId, hands }) => {
      setGameState(prev => prev ? { ...prev, hands } : prev);
    });

    socket.on('oldmaid-game-over', (data) => {
      setGameResult(data);
      setShowGameOver(true);
      addAction(`🏁 Trò chơi kết thúc!`);
    });

    socket.on('new-message', (msg) => {
      if (msg.playerId && msg.quickChat) {
        setChatBubbles(prev => ({ ...prev, [msg.playerId]: msg.text }));
        setTimeout(() => {
          setChatBubbles(prev => {
            const next = { ...prev };
            delete next[msg.playerId];
            return next;
          });
        }, 3000);
      }
    });

    return () => {
      socket.off('oldmaid-state');
      socket.off('oldmaid-turn');
      socket.off('oldmaid-timer');
      socket.off('oldmaid-draw');
      socket.off('oldmaid-auto-draw');
      socket.off('oldmaid-initial-discard');
      socket.off('oldmaid-hand-reordered');
      socket.off('oldmaid-game-over');
    };
  }, [socket, addAction, getPlayerName]);

  const handleDrawCard = useCallback((cardIndex) => {
    if (!gameState || gameState.currentTurn !== socketId) return;
    socket.emit('oldmaid-draw-card', {
      roomCode: roomInfo.code,
      cardIndex,
    });
  }, [gameState, socketId, socket, roomInfo]);

  const handleReorder = useCallback((fromIdx, toIdx) => {
    if (!gameState) return;
    const hand = [...gameState.myHand];
    const [moved] = hand.splice(fromIdx, 1);
    hand.splice(toIdx, 0, moved);
    setGameState(prev => ({ ...prev, myHand: hand }));
    socket.emit('oldmaid-reorder', {
      roomCode: roomInfo.code,
      newOrder: hand.map(c => c.id),
    });
  }, [gameState, socket, roomInfo]);

  const handleQuickChat = useCallback((text) => {
    socket.emit('send-message', {
      roomCode: roomInfo.code,
      text,
      quickChat: true,
    });
    setShowChat(false);
  }, [socket, roomInfo]);

  if (!gameState) {
    return (
      <div className="oldmaid-table flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
          style={{ width: 48, height: 48, borderRadius: '50%', border: '4px solid rgba(255,255,255,0.2)', borderTopColor: '#fdcb6e' }}
        />
      </div>
    );
  }

  const { playerIds, myHand, hands, discardPile, currentTurn, drawTarget, rankings, phase } = gameState;
  const myIndex = playerIds.indexOf(socketId);
  const isMyTurn = currentTurn === socketId;
  const slots = getSlotPositions(playerIds.length);
  const players = roomInfo?.players || [];

  // Reorder players so local is always slot 0 (bottom)
  const orderedPlayers = [];
  for (let i = 0; i < playerIds.length; i++) {
    const idx = (myIndex + i) % playerIds.length;
    orderedPlayers.push({ pid: playerIds[idx], slotIndex: i });
  }

  const myHandCount = myHand?.length || 0;
  const amOut = myHandCount === 0 && rankings.includes(socketId);

  return (
    <div className="oldmaid-table">
      {/* Back button */}
      <motion.button
        className="absolute top-3 left-3 z-20"
        style={{ padding: '8px 14px', borderRadius: 12, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}
        onClick={onLeave}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <ArrowLeft size={16} /> Rời phòng
      </motion.button>

      {/* Discard pile (center) — face-down stacked, only latest pair shown face-up */}
      <div className="discard-pile">
        {/* Face-down pile base */}
        {discardPile.length > 2 && (
          <>
            {[...Array(Math.min(6, Math.floor(discardPile.length / 2) - 1))].map((_, i) => (
              <Card
                key={`pile-${i}`}
                faceDown
                small
                style={{
                  position: 'absolute',
                  left: `${40 + (Math.random() * 40)}%`,
                  top: `${30 + (Math.random() * 30)}%`,
                  transform: `translate(-50%, -50%) rotate(${Math.random() * 40 - 20}deg)`,
                  opacity: 0.7,
                }}
              />
            ))}
          </>
        )}
        {/* Latest discarded pair shown face-up */}
        {lastDiscardedPair && lastDiscardedPair.map((card, i) => (
          <motion.div
            key={`last-${card.id}`}
            initial={{ scale: 0.3, opacity: 0, y: -30 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ type: 'spring', damping: 12, delay: i * 0.15 }}
            style={{
              position: 'absolute',
              left: `${42 + i * 28}%`,
              top: '35%',
              transform: `translate(-50%, -50%) rotate(${i === 0 ? -8 : 8}deg)`,
              zIndex: 5,
            }}
          >
            <Card
              value={card.value}
              suit={card.suit}
              isJoker={card.value === 'JOKER'}
              small
            />
          </motion.div>
        ))}
      </div>

      {/* Action Log (center floating) */}
      <div className="action-log">
        <AnimatePresence>
          {actionLog.map((action) => (
            <motion.div
              key={action.id}
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.9 }}
              className="action-msg"
            >
              {action.text}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Player slots */}
      {orderedPlayers.map(({ pid, slotIndex }) => {
        const pos = slots[slotIndex];
        const isMe = pid === socketId;
        const isActiveTurn = pid === currentTurn;
        const isDrawTarget = pid === drawTarget && isMyTurn;
        const playerHand = hands[pid];
        const playerOut = rankings.includes(pid) && (playerHand?.count === 0);
        const isVertical = pos.includes('left') || pos.includes('right');
        const name = getPlayerName(pid);

        return (
          <div key={pid} className={`player-slot player-slot-${pos}`}>
            {/* Player info badge + timer */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div className={`player-info ${isActiveTurn ? 'player-info-active' : ''}`}>
                <span>{name}</span>
                {playerOut ? (
                  <span style={{ fontSize: 12 }}>✅ #{rankings.indexOf(pid) + 1}</span>
                ) : (
                  <span className="player-card-count">
                    {isMe ? myHandCount : (playerHand?.count || 0)}
                  </span>
                )}
              </div>
              {/* Per-player timer bar — only show for active turn player */}
              {isActiveTurn && phase === 'playing' && !playerOut && (
                <div className="player-timer">
                  <div
                    className={`player-timer-fill ${timer <= 5 ? 'urgent' : ''}`}
                    style={{ width: `${(timer / 15) * 100}%` }}
                  />
                </div>
              )}
              {/* Chat bubble */}
              <AnimatePresence>
                {chatBubbles[pid] && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.8 }}
                    animate={{ opacity: 1, y: -6, scale: 1 }}
                    exit={{ opacity: 0, y: -12 }}
                    className="chat-bubble"
                    style={{ marginTop: 6 }}
                  >
                    {chatBubbles[pid]}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Cards */}
            {!playerOut && (
              <div className={`hand-container ${isMe ? 'hand-local' : isVertical ? 'hand-opponent hand-opponent-vertical' : 'hand-opponent'} ${isDrawTarget ? 'hand-draw-target' : ''}`}>
                {isMe ? (
                  // Local player: face-up cards
                  (myHand || []).map((card, i) => (
                    <Card
                      key={card.id}
                      value={card.value}
                      suit={card.suit}
                      isJoker={card.value === 'JOKER'}
                      hoverable
                      layoutId={`my-card-${card.id}`}
                      onClick={() => {
                        if (draggedCard !== null && draggedCard !== i) {
                          handleReorder(draggedCard, i);
                          setDraggedCard(null);
                        } else if (draggedCard === i) {
                          setDraggedCard(null);
                        } else {
                          setDraggedCard(i);
                        }
                      }}
                      selected={draggedCard === i}
                      dragging={draggedCard === i}
                    />
                  ))
                ) : (
                  // Opponent: face-down cards
                  (playerHand?.cards || []).map((card, i) => (
                    <Card
                      key={card.id}
                      faceDown
                      hoverable={isDrawTarget}
                      layoutId={`opp-card-${card.id}`}
                      onClick={() => isDrawTarget && handleDrawCard(i)}
                    />
                  ))
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* Quick Chat */}
      <button className="quick-chat-btn" onClick={() => setShowChat(!showChat)}>
        <MessageCircle size={20} />
      </button>
      <AnimatePresence>
        {showChat && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="quick-chat-panel"
          >
            {QUICK_CHATS.map((text, i) => (
              <div key={i} className="quick-chat-item" onClick={() => handleQuickChat(text)}>
                {text}
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Out notification */}
      <AnimatePresence>
        {amOut && !showGameOver && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute top-16 left-1/2 -translate-x-1/2 z-20"
            style={{ padding: '10px 24px', borderRadius: 16, background: 'rgba(0,180,80,0.8)', backdropFilter: 'blur(8px)', color: '#fff', fontWeight: 700, fontSize: 14 }}
          >
            🎉 Bạn đã hết bài! Hạng #{rankings.indexOf(socketId) + 1}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Game Over Overlay */}
      <AnimatePresence>
        {showGameOver && gameResult && (
          <motion.div
            className="oldmaid-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="oldmaid-result-card"
              initial={{ scale: 0.5, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ type: 'spring', damping: 12 }}
            >
              <motion.div
                animate={{ rotate: [0, -10, 10, -5, 5, 0] }}
                transition={{ duration: 0.8, delay: 0.3 }}
                style={{ marginBottom: 12 }}
              >
                {gameResult.loserId === socketId ? (
                  <span style={{ fontSize: 48 }}>🃏</span>
                ) : (
                  <Crown size={48} className="text-accent-yellow mx-auto" />
                )}
              </motion.div>

              {gameResult.loserId === socketId ? (
                <h2 style={{ fontSize: 24, fontWeight: 900, color: '#e74c3c', marginBottom: 16, fontFamily: 'var(--font-display)' }}>
                  bạn gà vl :)))
                </h2>
              ) : (
                <h2 style={{ fontSize: 24, fontWeight: 900, color: '#2d3436', marginBottom: 16, fontFamily: 'var(--font-display)' }}>
                  Kết quả
                </h2>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
                {gameResult.rankings.map((pid, i) => {
                  const isLoser = i === gameResult.rankings.length - 1;
                  const isMe = pid === socketId;
                  return (
                    <motion.div
                      key={pid}
                      initial={{ x: -20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: i * 0.15 }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 16px',
                        borderRadius: 12,
                        background: isMe ? 'rgba(108,92,231,0.1)' : '#f8f8f8',
                        border: isMe ? '2px solid #6c5ce7' : '1px solid #eee',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontWeight: 900, color: isLoser ? '#e74c3c' : '#2d3436', fontSize: 14 }}>
                          {isLoser ? '🃏' : `#${i + 1}`}
                        </span>
                        <span style={{ fontWeight: 700, fontSize: 14, color: isMe ? '#6c5ce7' : '#2d3436' }}>
                          {getPlayerName(pid)}
                        </span>
                      </div>
                      <span style={{
                        fontWeight: 900,
                        fontSize: 16,
                        color: (gameResult.scores[pid] || 0) >= 0 ? '#27ae60' : '#e74c3c',
                        fontFamily: 'var(--font-display)',
                      }}>
                        {(gameResult.scores[pid] || 0) >= 0 ? '+' : ''}{gameResult.scores[pid] || 0}
                      </span>
                    </motion.div>
                  );
                })}
              </div>

              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => {
                  setShowGameOver(false);
                  onLeave();
                }}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: 16,
                  background: 'linear-gradient(135deg, #6c5ce7, #a29bfe)',
                  color: '#fff',
                  fontWeight: 800,
                  fontSize: 16,
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                <Trophy size={18} /> Về Sảnh Chờ
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
