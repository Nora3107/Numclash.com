import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { Crown, MessageCircle, ArrowLeft, Trophy, Shuffle } from 'lucide-react';
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

const PILE_POSITIONS = Array.from({ length: 8 }, (_, i) => ({
  left: 30 + ((i * 37 + 13) % 40),
  top: 25 + ((i * 29 + 7) % 35),
  rot: ((i * 23 + 5) % 40) - 20,
}));

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

// Fisher-Yates shuffle
function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function slotToCoords(slotName) {
  switch (slotName) {
    case 'bottom': return { x: '50vw', y: '85vh' };
    case 'top': return { x: '50vw', y: '8vh' };
    case 'left': return { x: '8vw', y: '50vh' };
    case 'right': return { x: '92vw', y: '50vh' };
    case 'left-top': return { x: '8vw', y: '28vh' };
    case 'left-bottom': return { x: '8vw', y: '72vh' };
    case 'right-top': return { x: '92vw', y: '28vh' };
    case 'right-bottom': return { x: '92vw', y: '72vh' };
    default: return { x: '50vw', y: '50vh' };
  }
}

export default function OldMaidPage({ socket, roomInfo, onLeave, initialState }) {
  const [gameState, setGameState] = useState(initialState || null);
  const [timer, setTimer] = useState(15);
  const [showChat, setShowChat] = useState(false);
  const [chatBubbles, setChatBubbles] = useState({});
  const [showGameOver, setShowGameOver] = useState(false);
  const [gameResult, setGameResult] = useState(null);
  const [actionLog, setActionLog] = useState([]);
  const [lastDiscardedPair, setLastDiscardedPair] = useState(null);
  const [pileCount, setPileCount] = useState(0);

  // Animation states
  const [flyingCard, setFlyingCard] = useState(null);
  const [flyingPair, setFlyingPair] = useState(null);
  const [pairDrawer, setPairDrawer] = useState(null);

  // Drag state
  const [dragIdx, setDragIdx] = useState(null);
  const [dragOverIdx, setDragOverIdx] = useState(null);

  const socketId = socket.id;

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

  // Shuffle my hand locally + emit to server
  const shuffleMyHand = useCallback(() => {
    setGameState(prev => {
      if (!prev || !prev.myHand) return prev;
      const shuffled = shuffleArray(prev.myHand);
      socket.emit('oldmaid-reorder', {
        roomCode: roomInfo.code,
        newOrder: shuffled.map(c => c.id),
      });
      return { ...prev, myHand: shuffled };
    });
  }, [socket, roomInfo]);

  useEffect(() => {
    socket.on('oldmaid-state', (state) => {
      setGameState(state);
      setPileCount(Math.floor((state.discardPile?.length || 0) / 2));
    });

    socket.on('oldmaid-turn', (data) => {
      setGameState(prev => prev ? {
        ...prev,
        currentTurn: data.currentTurn,
        drawTarget: data.drawTarget,
        hands: data.hands,
        myHand: data.myHand || prev.myHand,
      } : prev);
      setTimer(15);
      addAction(`🎯 Đến lượt ${getPlayerName(data.currentTurn)}`);
    });

    socket.on('oldmaid-timer', ({ remaining }) => {
      setTimer(remaining);
    });

    socket.on('oldmaid-draw', (data) => {
      // Step 1: Card flies from opponent → drawer (0.7s)
      setFlyingCard({ from: data.from, to: data.to });
      addAction(`🃏 ${getPlayerName(data.to)} rút bài từ ${getPlayerName(data.from)}`);

      setTimeout(() => {
        setFlyingCard(null);

        // Update hand with new card (so it shows in hand)
        if (data.myHand) {
          setGameState(prev => prev ? { ...prev, myHand: data.myHand, hands: data.hands } : prev);
        }

        if (data.discarded && data.discarded.length > 0) {
          // Step 2: Pause 1.5s to let player see drawn card IN THEIR HAND
          setPairDrawer(data.to);
          setTimeout(() => {
            // Step 3: Pair flies from drawer's hand → center
            setFlyingPair(data.discarded.slice(0, 2));
            addAction(`✨ ${getPlayerName(data.to)} vứt 1 cặp!`);
            setTimeout(() => {
              setLastDiscardedPair(data.discarded.slice(0, 2));
              setFlyingPair(null);
              setPairDrawer(null);
              setPileCount(prev => prev + 1);

              // Update hand after pair removed
              if (data.finalHand) {
                setGameState(prev => prev ? { ...prev, myHand: data.finalHand } : prev);
              }

              // Auto-shuffle after draw completes (3s delay)
              setTimeout(() => {
                setGameState(prev => {
                  if (!prev || !prev.myHand || prev.myHand.length <= 1) return prev;
                  const shuffled = shuffleArray(prev.myHand);
                  socket.emit('oldmaid-reorder', {
                    roomCode: roomInfo.code,
                    newOrder: shuffled.map(c => c.id),
                  });
                  return { ...prev, myHand: shuffled };
                });
              }, 3000);
            }, 900);
          }, 1500);
        } else {
          // No pair — auto-shuffle after 3s
          setTimeout(() => {
            setGameState(prev => {
              if (!prev || !prev.myHand || prev.myHand.length <= 1) return prev;
              const shuffled = shuffleArray(prev.myHand);
              socket.emit('oldmaid-reorder', {
                roomCode: roomInfo.code,
                newOrder: shuffled.map(c => c.id),
              });
              return { ...prev, myHand: shuffled };
            });
          }, 3000);
        }
      }, 700);
    });

    socket.on('oldmaid-auto-draw', (data) => {
      setFlyingCard({ from: data.from, to: data.to });
      addAction(`⏰ Hết giờ! ${getPlayerName(data.to)} tự động rút bài`);
      setTimeout(() => {
        setFlyingCard(null);
        if (data.myHand) {
          setGameState(prev => prev ? { ...prev, myHand: data.myHand, hands: data.hands } : prev);
        }
        if (data.discarded && data.discarded.length > 0) {
          setPairDrawer(data.to);
          setTimeout(() => {
            setFlyingPair(data.discarded.slice(0, 2));
            setTimeout(() => {
              setLastDiscardedPair(data.discarded.slice(0, 2));
              setFlyingPair(null);
              setPairDrawer(null);
              setPileCount(prev => prev + 1);
              if (data.finalHand) {
                setGameState(prev => prev ? { ...prev, myHand: data.finalHand } : prev);
              }
            }, 900);
          }, 1500);
        }
      }, 700);
    });

    socket.on('oldmaid-initial-discard', (data) => {
      addAction(`♻️ Tự động vứt các cặp bài ban đầu`);
      setPileCount(Math.floor((data.discardPile?.length || 0) / 2));
    });

    socket.on('oldmaid-hand-reordered', ({ playerId, hands }) => {
      setGameState(prev => prev ? { ...prev, hands } : prev);
    });

    socket.on('oldmaid-game-over', (data) => {
      setGameResult(data);
      setShowGameOver(true);
      addAction(`🏁 Trò chơi kết thúc!`);
    });

    socket.on('oldmaid-chat-msg', ({ playerId, text }) => {
      setChatBubbles(prev => ({ ...prev, [playerId]: text }));
      setTimeout(() => {
        setChatBubbles(prev => {
          const next = { ...prev };
          delete next[playerId];
          return next;
        });
      }, 3000);
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
      socket.off('oldmaid-chat-msg');
    };
  }, [socket, addAction, getPlayerName, roomInfo]);

  const handleDrawCard = useCallback((cardIndex) => {
    if (!gameState || gameState.currentTurn !== socketId) return;
    socket.emit('oldmaid-draw-card', {
      roomCode: roomInfo.code,
      cardIndex,
    });
  }, [gameState, socketId, socket, roomInfo]);

  // Drag-and-drop reorder
  const handleDragStart = useCallback((i) => {
    setDragIdx(i);
  }, []);

  const handleDragOver = useCallback((e, i) => {
    e.preventDefault();
    setDragOverIdx(i);
  }, []);

  const handleDragEnd = useCallback(() => {
    if (dragIdx !== null && dragOverIdx !== null && dragIdx !== dragOverIdx) {
      setGameState(prev => {
        if (!prev || !prev.myHand) return prev;
        const hand = [...prev.myHand];
        const [moved] = hand.splice(dragIdx, 1);
        hand.splice(dragOverIdx, 0, moved);
        socket.emit('oldmaid-reorder', {
          roomCode: roomInfo.code,
          newOrder: hand.map(c => c.id),
        });
        return { ...prev, myHand: hand };
      });
    }
    setDragIdx(null);
    setDragOverIdx(null);
  }, [dragIdx, dragOverIdx, socket, roomInfo]);

  const handleQuickChat = useCallback((text) => {
    socket.emit('oldmaid-chat', {
      roomCode: roomInfo.code,
      text,
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

  const { playerIds, myHand, hands, currentTurn, drawTarget, rankings, phase } = gameState;
  const myIndex = playerIds.indexOf(socketId);
  const isMyTurn = currentTurn === socketId;
  const slots = getSlotPositions(playerIds.length);

  const orderedPlayers = [];
  for (let i = 0; i < playerIds.length; i++) {
    const idx = (myIndex + i) % playerIds.length;
    orderedPlayers.push({ pid: playerIds[idx], slotIndex: i });
  }

  const myHandCount = myHand?.length || 0;
  const amOut = myHandCount === 0 && rankings.includes(socketId);

  const getPlayerSlot = (pid) => {
    const entry = orderedPlayers.find(e => e.pid === pid);
    return entry ? slots[entry.slotIndex] : 'top';
  };

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

      {/* Shuffle button */}
      {myHandCount > 1 && (
        <motion.button
          className="absolute bottom-3 left-3 z-20"
          style={{ padding: '8px 14px', borderRadius: 12, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}
          onClick={shuffleMyHand}
          whileHover={{ scale: 1.08, background: 'rgba(108,92,231,0.5)' }}
          whileTap={{ scale: 0.95 }}
        >
          <Shuffle size={16} /> Xáo bài
        </motion.button>
      )}

      {/* Discard pile (center) */}
      <div className="discard-pile">
        {[...Array(Math.min(6, pileCount))].map((_, i) => {
          const p = PILE_POSITIONS[i];
          return (
            <Card
              key={`pile-base-${i}`}
              faceDown
              small
              style={{
                position: 'absolute',
                left: `${p.left}%`,
                top: `${p.top}%`,
                transform: `translate(-50%, -50%) rotate(${p.rot}deg)`,
                opacity: 0.7,
              }}
            />
          );
        })}
        <AnimatePresence>
          {lastDiscardedPair && lastDiscardedPair.map((card, i) => (
            <motion.div
              key={`last-pair-${card.id}`}
              initial={{ scale: 0.3, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={{ type: 'spring', damping: 14, delay: i * 0.1 }}
              style={{
                position: 'absolute',
                left: `${38 + i * 30}%`,
                top: '30%',
                transform: `translate(-50%, -50%) rotate(${i === 0 ? -6 : 6}deg)`,
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
        </AnimatePresence>
      </div>

      {/* Flying card animation */}
      <AnimatePresence>
        {flyingCard && (() => {
          const fromSlot = getPlayerSlot(flyingCard.from);
          const toSlot = getPlayerSlot(flyingCard.to);
          const from = slotToCoords(fromSlot);
          const to = slotToCoords(toSlot);
          return (
            <motion.div
              key="flying-card"
              initial={{ position: 'fixed', left: from.x, top: from.y, x: '-50%', y: '-50%', scale: 0.8, rotate: 0, zIndex: 50 }}
              animate={{ left: to.x, top: to.y, scale: 1.1, rotate: 15 }}
              exit={{ opacity: 0, scale: 0.5 }}
              transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
              style={{ position: 'fixed', zIndex: 50, pointerEvents: 'none' }}
            >
              <Card faceDown />
            </motion.div>
          );
        })()}
      </AnimatePresence>

      {/* Flying pair animation */}
      <AnimatePresence>
        {flyingPair && flyingPair.map((card, i) => {
          const drawerSlot = getPlayerSlot(pairDrawer || socketId);
          const fromCoords = slotToCoords(drawerSlot);
          return (
            <motion.div
              key={`fly-pair-${card.id}`}
              initial={{ position: 'fixed', left: fromCoords.x, top: fromCoords.y, x: '-50%', y: '-50%', scale: 0.6, rotate: i === 0 ? -15 : 15, zIndex: 45 }}
              animate={{ left: '50vw', top: '50vh', scale: 1, rotate: i === 0 ? -6 : 6 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.7, delay: i * 0.12, ease: 'easeOut' }}
              style={{ position: 'fixed', zIndex: 45, pointerEvents: 'none' }}
            >
              <Card value={card.value} suit={card.suit} isJoker={card.value === 'JOKER'} small />
            </motion.div>
          );
        })}
      </AnimatePresence>

      {/* Action Log */}
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
              {isActiveTurn && phase === 'playing' && !playerOut && (
                <div className="player-timer">
                  <div
                    className={`player-timer-fill ${timer <= 5 ? 'urgent' : ''}`}
                    style={{ width: `${(timer / 15) * 100}%` }}
                  />
                </div>
              )}
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

            {!playerOut && (
              <div className={`hand-container ${isMe ? 'hand-local' : isVertical ? 'hand-opponent hand-opponent-vertical' : 'hand-opponent'} ${isDrawTarget ? 'hand-draw-target' : ''}`}>
                {isMe ? (
                  // Local player: face-up, drag-and-drop reordering
                  (myHand || []).map((card, i) => (
                    <div
                      key={card.id}
                      draggable
                      onDragStart={() => handleDragStart(i)}
                      onDragOver={(e) => handleDragOver(e, i)}
                      onDragEnd={handleDragEnd}
                      style={{
                        opacity: dragIdx === i ? 0.4 : 1,
                        transform: dragOverIdx === i && dragIdx !== i ? 'translateY(-8px)' : 'none',
                        transition: 'transform 0.15s ease, opacity 0.15s ease',
                        cursor: 'grab',
                      }}
                    >
                      <Card
                        value={card.value}
                        suit={card.suit}
                        isJoker={card.value === 'JOKER'}
                        hoverable
                      />
                    </div>
                  ))
                ) : (
                  // Opponent: face-down
                  (playerHand?.cards || []).map((card, i) => (
                    <Card
                      key={card.id}
                      faceDown
                      hoverable={isDrawTarget}
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

      {/* Game Over */}
      <AnimatePresence>
        {showGameOver && gameResult && (
          <motion.div className="oldmaid-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
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
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '8px 16px', borderRadius: 12,
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
                        fontWeight: 900, fontSize: 16,
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
                onClick={() => { setShowGameOver(false); onLeave(); }}
                style={{
                  width: '100%', padding: '12px', borderRadius: 16,
                  background: 'linear-gradient(135deg, #6c5ce7, #a29bfe)',
                  color: '#fff', fontWeight: 800, fontSize: 16, border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
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
