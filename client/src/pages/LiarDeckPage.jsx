// ============================================
// SuckCard.com — Liar's Deck Game Page
// 2D top-down card game UI — clean minimal
// ============================================

import { useEffect, useCallback, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import useLiarStore from '../stores/useLiarStore';
import Card from '../components/Card';
import {
  sfxSelect, sfxDeselect, sfxPlayCards, sfxCallLiar, sfxMyTurn,
  sfxCaught, sfxWrongCall, sfxLoseLife, sfxNewRound, sfxGameOver, sfxTimerTick,
  sfxLiarShout, sfxCardFlip, sfxResultReveal
} from '../sounds/liarSfx';

// Fixed suit mapping for each target rank (matches server RANK_SUITS)
const RANK_SUITS = { J: 'spades', Q: 'clubs', K: 'diamonds', A: 'hearts' };
import './liarDeck.css';

// Map Liar's Deck card to Card.jsx props
const RANK_SUIT_MAP = { J: 'spades', Q: 'clubs', K: 'diamonds', A: 'hearts' };

// Opponent display
function OpponentSlot({ pid, name, lives, cardCount, isActive, isDead, position, lastPlay, socketId, timer, phase }) {
  const hasLastPlay = lastPlay && lastPlay.playerId === pid;
  const showTimer = isActive && phase === 'playing' && timer > 0;

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

      {/* Timer bar */}
      {showTimer && (
        <div className="opp-timer-bar">
          <div className={`opp-timer-fill ${timer <= 5 ? 'urgent' : ''}`} style={{ width: `${(timer / 27) * 100}%` }} />
        </div>
      )}

      {/* Face-down hand */}
      <div className="opp-cards">
        {Array.from({ length: Math.min(cardCount, 6) }, (_, i) => (
          <div key={i} className="card-back-mini" style={{ marginLeft: i > 0 ? '-10px' : 0 }} />
        ))}
      </div>

      {/* Last play */}
      {hasLastPlay && (
        <motion.div className="opp-last-play" initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
          <span className="opp-play-label">Đánh {lastPlay.count} lá</span>
          <div className="opp-play-cards">
            {Array.from({ length: lastPlay.count }, (_, i) => (
              <div key={i} className="card-back-played" />
            ))}
          </div>
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

  const prevTurnRef = useRef(null);
  const [resPhase, setResPhase] = useState(0);

  useEffect(() => { if (initialState) store.syncState(initialState); }, [initialState]);

  useEffect(() => {
    const h = {
      'liardeck-state': (s) => store.syncState(s),
      'liardeck-round-start': (d) => { store.onRoundStart(d); sfxNewRound(); },
      'liardeck-played': (d) => { store.onPlayed(d); sfxPlayCards(); },
      'liardeck-resolution': (d) => {
        store.onResolution(d);
        // Phase 1: LIAR! shout (immediate)
        setResPhase(1);
        sfxLiarShout();
        // Phase 2: Card flip (2.5s)
        setTimeout(() => { setResPhase(2); sfxCardFlip(); }, 2500);
        // Phase 3: Result (5.5s)
        setTimeout(() => {
          setResPhase(3);
          sfxResultReveal();
          if (d.resultType === 'CAUGHT') sfxCaught(); else sfxWrongCall();
          setTimeout(() => sfxLoseLife(), 500);
        }, 5500);
        // Phase 4: Clear (9s, server sends new round at ~10s)
        setTimeout(() => { setResPhase(0); }, 9000);
      },
      'liardeck-game-over': (d) => {
        // Delay game-over until after resolution animation finishes
        setTimeout(() => { store.onGameOver(d); sfxGameOver(); }, 9500);
      },
      'liardeck-timer': ({ remaining }) => {
        store.setTimer(remaining);
        if (remaining <= 5 && remaining > 0) sfxTimerTick();
      },
      'liardeck-empty-hand': (d) => {
        store.setMessage({
          text: `${getPlayerName(d.winnerId)} hết bài — ${getPlayerName(d.loserId)} mất 1 ♥`,
          type: 'danger'
        });
        sfxLoseLife();
      },
      'liardeck-error': (e) => console.warn('LiarDeck:', e),
    };
    Object.entries(h).forEach(([ev, fn]) => socket.on(ev, fn));
    return () => { Object.entries(h).forEach(([ev, fn]) => socket.off(ev, fn)); store.reset(); };
  }, [socket]);

  // Play "my turn" sound
  useEffect(() => {
    if (store.currentTurn === socketId && prevTurnRef.current !== socketId && store.phase === 'playing') {
      sfxMyTurn();
    }
    prevTurnRef.current = store.currentTurn;
  }, [store.currentTurn, socketId, store.phase]);

  const handlePlay = () => {
    if (store.selectedCards.length === 0) return;
    socket.emit('liardeck-play', { roomCode: roomInfo?.code, cardIds: store.selectedCards });
  };

  const handleCallLiar = () => {
    sfxCallLiar();
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
        <div className="ld-header"></div>
        <span className={`ld-timer ${store.phase === 'playing' && store.timer <= 5 ? 'urgent' : ''}`}>
          {store.phase === 'playing' ? store.timer : '--'}
        </span>
      </div>

      {/* Target card — top right */}
      {store.targetCard && (
        <div className="ld-target-float">
          <span className="ld-target-label">YÊU CẦU</span>
          <Card
            value={store.targetCard}
            suit={RANK_SUITS[store.targetCard]}
            small
            style={{ width: 52, height: 74, fontSize: 13, transform: 'none', cursor: 'default' }}
          />
        </div>
      )}

      {/* Opponents */}
      {opponents.map(o => (
        <OpponentSlot key={o.pid} pid={o.pid} name={o.name} lives={o.lives}
          cardCount={o.cardCount} isActive={o.pid === store.currentTurn}
          isDead={o.status === 'ELIMINATED'} position={o.position}
          lastPlay={store.lastPlay} socketId={socketId}
          timer={store.timer} phase={store.phase} />
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

        {/* Turn text only */}
        {store.phase === 'playing' && (
          <span className={`ld-turn-text ${isMyTurn ? 'mine' : ''}`}>
            {isMyTurn ? 'Lượt của bạn!' : getPlayerName(store.currentTurn)}
          </span>
        )}
      </div>

      {/* My last play — centered at my area */}
      {myLastPlay && (
        <motion.div className="ld-my-lastplay" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
          <span className="my-play-label">Đánh {store.lastPlay.count} lá</span>
          <div className="my-play-cards">
            {Array.from({ length: store.lastPlay.count }, (_, i) => (
              <div key={i} className="card-back-played" />
            ))}
          </div>
        </motion.div>
      )}

      {/* Resolution — multi-phase dramatic sequence */}
      <AnimatePresence>
        {resPhase >= 1 && res && (
          <div className="ld-res-sequence">
            {/* Phase 1: LIAR! shout */}
            {resPhase === 1 && (
              <motion.div
                className="ld-res-liar"
                initial={{ scale: 3, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 12 }}
              >
                <span className="liar-text">deotin</span>
                <span className="liar-sub">{getPlayerName(res.callerId)} bắt bài {getPlayerName(res.accusedId)}</span>
              </motion.div>
            )}

            {/* Phase 2: Card flip */}
            {resPhase === 2 && (
              <motion.div className="ld-res-flip" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <p className="flip-label">Lật bài...</p>
                <div className="res-cards">
                  {res.flippedCards.map((card, i) => {
                    const isMatch = card.isJoker || card.rank === 'JOKER' || card.rank === store.targetCard;
                    return (
                      <motion.div
                        key={i}
                        className={`res-card ${isMatch ? 'card-match' : 'card-lie'}`}
                        initial={{ rotateY: 180, opacity: 0 }}
                        animate={{ rotateY: 0, opacity: 1 }}
                        transition={{ delay: i * 0.25, duration: 0.5, type: 'spring', stiffness: 200 }}
                      >
                        <Card
                          value={card.rank}
                          suit={RANK_SUIT_MAP[card.rank]}
                          isJoker={card.isJoker || card.rank === 'JOKER'}
                        />
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* Phase 3: Result */}
            {resPhase === 3 && (
              <motion.div
                className={`ld-res-result ${res.resultType === 'CAUGHT' ? 'caught' : 'wrong'}`}
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 250, damping: 15 }}
              >
                <div className="res-cards">
                  {res.flippedCards.map((card, i) => {
                    const isMatch = card.isJoker || card.rank === 'JOKER' || card.rank === store.targetCard;
                    return (
                      <div key={i} className={`res-card ${isMatch ? 'card-match' : 'card-lie'}`}>
                        <Card
                          value={card.rank}
                          suit={RANK_SUIT_MAP[card.rank]}
                          isJoker={card.isJoker || card.rank === 'JOKER'}
                        />
                      </div>
                    );
                  })}
                </div>
                <motion.h2
                  className="result-text"
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  {res.resultType === 'CAUGHT' ? '🎉 Bắt được! Nói dối!' : '😤 Bắt sai! Nói thật!'}
                </motion.h2>
                <motion.p
                  className="result-detail"
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.6 }}
                >
                  {getPlayerName(res.loserId)} mất 1 ♥
                  {res.eliminated && <span className="elim"> — Bị loại!</span>}
                </motion.p>
              </motion.div>
            )}
          </div>
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
            {isMyTurn && store.phase === 'playing' && store.timer > 0 && (
              <div className="my-timer-bar">
                <div className={`my-timer-fill ${store.timer <= 5 ? 'urgent' : ''}`} style={{ width: `${(store.timer / 27) * 100}%` }} />
              </div>
            )}
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
                onClick={() => {
                  if (!playable) return;
                  const wasSel = store.selectedCards.includes(card.id);
                  store.toggleCardSelection(card.id);
                  wasSel ? sfxDeselect() : sfxSelect();
                }}
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
            {!store.mustCallLiar && (
              <motion.button className="ld-btn play" onClick={handlePlay} disabled={store.selectedCards.length === 0}
                whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                Đánh bài ({store.selectedCards.length})
              </motion.button>
            )}
            {(canCallLiar || store.mustCallLiar) && (
              <motion.button className={`ld-btn liar ${store.mustCallLiar ? 'must-call' : ''}`} onClick={handleCallLiar}
                whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                {store.mustCallLiar ? '⚡ Bắt bài!' : 'Bắt bài'}
              </motion.button>
            )}
          </div>
        )}
      </div>

      {/* Toast — positioned above hand */}
      <AnimatePresence>
        {store.message && (
          <motion.div className={`ld-toast-hand ${store.message.type}`}
            initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 10, opacity: 0 }}>
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
