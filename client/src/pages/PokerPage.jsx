import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import usePokerStore from '../stores/usePokerStore';
import Card from '../components/Card';
import './poker.css';

// Suit display map
const SUIT_MAP = { s: 'spades', h: 'hearts', d: 'diamonds', c: 'clubs' };

// Chip denomination colors
const CHIP_DENOMS = [
  { value: 1000, color: '#ffd700', label: '1K' },
  { value: 500, color: '#9b59b6', label: '500' },
  { value: 100, color: '#2c3e50', label: '100' },
  { value: 50, color: '#27ae60', label: '50' },
  { value: 10, color: '#3498db', label: '10' },
  { value: 1, color: '#ecf0f1', label: '1' },
];

function getChipBreakdown(amount) {
  const chips = [];
  let remaining = amount;
  for (const d of CHIP_DENOMS) {
    const count = Math.floor(remaining / d.value);
    if (count > 0) {
      chips.push({ ...d, count: Math.min(count, 5) });
      remaining -= count * d.value;
    }
  }
  return chips;
}

function ChipStack({ amount, small }) {
  if (!amount || amount <= 0) return null;
  const chips = getChipBreakdown(amount);
  return (
    <div className={`pk-chip-stack ${small ? 'small' : ''}`}>
      {chips.map((c, i) =>
        Array.from({ length: c.count }, (_, j) => (
          <motion.div
            key={`${i}-${j}`}
            className="pk-chip"
            style={{
              background: c.color,
              bottom: `${(i * c.count + j) * (small ? 2 : 3)}px`,
              color: c.color === '#ecf0f1' || c.color === '#ffd700' ? '#333' : '#fff',
            }}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: (i * c.count + j) * 0.03, duration: 0.2 }}
          />
        ))
      ).flat()}
      <span className="pk-chip-amount">{amount.toLocaleString()}</span>
    </div>
  );
}

// 6-seat positions around oval (relative %)
const SEAT_POS = [
  { left: '50%', bottom: '2%', transform: 'translateX(-50%)' },     // 0: bottom center (me)
  { left: '5%', bottom: '28%' },                                      // 1: left bottom
  { left: '5%', top: '18%' },                                         // 2: left top
  { left: '50%', top: '2%', transform: 'translateX(-50%)' },        // 3: top center
  { right: '5%', top: '18%' },                                        // 4: right top
  { right: '5%', bottom: '28%' },                                     // 5: right bottom
];

// Bet chip positions (closer to center of table)
const BET_POS = [
  { left: '50%', bottom: '28%', transform: 'translateX(-50%)' },
  { left: '22%', bottom: '38%' },
  { left: '22%', top: '38%' },
  { left: '50%', top: '28%', transform: 'translateX(-50%)' },
  { right: '22%', top: '38%' },
  { right: '22%', bottom: '38%' },
];

function PlayerSeat({ player, isDealer, isSB, isBB, isActive, timer, maxTimer, mySeat, getPlayerName, showdownHands, winners }) {
  if (!player) return null;
  const isMe = player.seatIndex === mySeat;
  const isDead = player.status === 'SPECTATOR';
  const isFolded = player.status === 'FOLDED';
  const showCards = player.holeCards?.length === 2 && player.holeCards[0] !== null;
  const hasCards = player.hasCards;
  const timerPct = isActive ? (timer / maxTimer) * 100 : 0;
  const isWinner = winners?.some(w => w.seatIndex === player.seatIndex);
  const myHand = showdownHands?.[player.id];

  return (
    <div className={`pk-seat ${isActive ? 'pk-active' : ''} ${isDead ? 'pk-dead' : ''} ${isFolded ? 'pk-folded' : ''} ${isMe ? 'pk-me' : ''} ${isWinner ? 'pk-winner' : ''}`}>
      {/* Badges */}
      <div className="pk-badges">
        {isDealer && <span className="pk-badge pk-badge-d">D</span>}
        {isSB && <span className="pk-badge pk-badge-sb">SB</span>}
        {isBB && <span className="pk-badge pk-badge-bb">BB</span>}
      </div>

      {/* Opponent cards (small) — only shown for non-me seats */}
      {!isMe && hasCards && (
        <div className="pk-seat-cards">
          {showCards ? (
            <>
              <div className="pk-minicard"><Card value={player.holeCards[0].rank} suit={SUIT_MAP[player.holeCards[0].suit]} small /></div>
              <div className="pk-minicard"><Card value={player.holeCards[1].rank} suit={SUIT_MAP[player.holeCards[1].suit]} small /></div>
            </>
          ) : (
            <>
              <div className="pk-card-back-sm" />
              <div className="pk-card-back-sm" />
            </>
          )}
        </div>
      )}

      {/* Info */}
      <div className="pk-seat-info">
        <span className="pk-seat-name">{getPlayerName(player.id)}</span>
        <span className="pk-seat-chips">{player.chips.toLocaleString()}</span>
      </div>

      {/* Timer bar */}
      {isActive && (
        <div className="pk-seat-timer">
          <div className={`pk-seat-timer-fill ${timer <= 5 ? 'urgent' : ''}`} style={{ width: `${timerPct}%` }} />
        </div>
      )}

      {/* Hand name at showdown */}
      {myHand && <span className="pk-hand-label">{myHand.handName}</span>}

      {/* Status overlays */}
      {isFolded && <span className="pk-status">FOLD</span>}
      {player.status === 'ALL_IN' && <span className="pk-status pk-allin">ALL IN</span>}
      {isDead && <span className="pk-status pk-spectator">👁</span>}
    </div>
  );
}

// Sound effects
function playSound(type) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    gain.gain.value = 0.08;

    if (type === 'chip') {
      osc.type = 'sine';
      osc.frequency.value = 800;
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      osc.start(); osc.stop(ctx.currentTime + 0.15);
    } else if (type === 'card') {
      osc.type = 'triangle';
      osc.frequency.value = 600;
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
      osc.start(); osc.stop(ctx.currentTime + 0.1);
    } else if (type === 'fold') {
      osc.type = 'sine';
      osc.frequency.value = 300;
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
      osc.start(); osc.stop(ctx.currentTime + 0.2);
    } else if (type === 'win') {
      osc.type = 'sine';
      osc.frequency.value = 523;
      gain.gain.value = 0.1;
      osc.start();
      setTimeout(() => { osc.frequency.value = 659; }, 100);
      setTimeout(() => { osc.frequency.value = 784; }, 200);
      osc.stop(ctx.currentTime + 0.4);
    } else if (type === 'allin') {
      osc.type = 'sawtooth';
      osc.frequency.value = 440;
      gain.gain.value = 0.06;
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.start(); osc.stop(ctx.currentTime + 0.3);
    } else if (type === 'tick') {
      osc.type = 'sine';
      osc.frequency.value = 1200;
      gain.gain.value = 0.04;
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
      osc.start(); osc.stop(ctx.currentTime + 0.05);
    }
  } catch {}
}

export default function PokerPage({ socket, roomInfo, onLeave, initialState }) {
  const store = usePokerStore();
  const [raiseAmount, setRaiseAmount] = useState(0);
  const [hoveredCard, setHoveredCard] = useState(-1);

  const getPlayerName = useCallback((pid) => {
    return roomInfo?.players?.find(p => p.id === pid)?.nickname || pid?.slice(0, 6);
  }, [roomInfo]);

  useEffect(() => {
    if (initialState) store.syncState(initialState);
  }, [initialState]);

  useEffect(() => {
    const handlers = {
      'poker-state': (s) => store.syncState(s),
      'poker-action': (a) => {
        store.onAction(a);
        // Play sound based on action
        if (a.action === 'fold') playSound('fold');
        else if (a.action === 'allin') playSound('allin');
        else if (a.action === 'raise' || a.action === 'call') playSound('chip');
        else if (a.action === 'check') playSound('tick');
      },
      'poker-community': (d) => {
        store.onCommunity(d);
        playSound('card');
      },
      'poker-showdown': (d) => {
        store.onShowdown(d);
        playSound('win');
      },
      'poker-new-hand': () => {
        store.onNewHand();
        playSound('card');
      },
      'poker-timer': ({ remaining }) => {
        store.setTimer(remaining);
        if (remaining <= 5 && remaining > 0) playSound('tick');
      },
      'poker-error': (e) => console.warn('Poker:', e),
    };
    Object.entries(handlers).forEach(([ev, fn]) => socket.on(ev, fn));
    return () => {
      Object.keys(handlers).forEach(ev => socket.off(ev));
      store.reset();
    };
  }, [socket]);

  // My seat info
  const mySeat = store.mySeat;
  const myPlayer = store.players.find(p => p.seatIndex === mySeat);
  const isMyTurn = store.currentTurnSeat === mySeat && !['WAITING', 'SHOWDOWN', 'HAND_OVER', 'GAME_OVER'].includes(store.phase);
  const canCheck = myPlayer && myPlayer.currentBet >= store.currentHighestBet;
  const callAmount = myPlayer ? store.currentHighestBet - myPlayer.currentBet : 0;
  const minRaiseTotal = store.currentHighestBet + store.minRaise;

  // Arrange seats: rotate so mySeat is at position 0 (bottom)
  const arrangedPlayers = useMemo(() => {
    if (!store.players.length) return [];
    const totalSeats = store.players.length;
    const result = new Array(6).fill(null);
    for (const p of store.players) {
      let relPos = (p.seatIndex - mySeat + totalSeats) % totalSeats;
      if (totalSeats <= 2) { result[[0, 3][relPos]] = p; }
      else if (totalSeats <= 3) { result[[0, 2, 4][relPos]] = p; }
      else if (totalSeats <= 4) { result[[0, 1, 3, 5][relPos]] = p; }
      else if (totalSeats <= 5) { result[[0, 1, 2, 4, 5][relPos]] = p; }
      else { result[relPos] = p; }
    }
    return result;
  }, [store.players, mySeat]);

  // Dealer / SB / BB
  const dealerSeat = store.dealerIndex;
  const alive = store.players.filter(p => p.status !== 'SPECTATOR').map(p => p.seatIndex).sort((a, b) => a - b);
  const dIdx = alive.indexOf(dealerSeat);
  let sbSeat = -1, bbSeat = -1;
  if (alive.length === 2) { sbSeat = dealerSeat; bbSeat = alive.find(s => s !== dealerSeat) ?? -1; }
  else if (dIdx >= 0) { sbSeat = alive[(dIdx + 1) % alive.length]; bbSeat = alive[(dIdx + 2) % alive.length]; }

  // Actions
  const handleFold = () => socket.emit('poker-action', { roomCode: roomInfo?.code, action: 'fold' });
  const handleCheck = () => socket.emit('poker-action', { roomCode: roomInfo?.code, action: 'check' });
  const handleCall = () => socket.emit('poker-action', { roomCode: roomInfo?.code, action: 'call' });
  const handleRaise = () => {
    socket.emit('poker-action', { roomCode: roomInfo?.code, action: 'raise', amount: Math.max(raiseAmount, minRaiseTotal) });
  };
  const handleAllIn = () => socket.emit('poker-action', { roomCode: roomInfo?.code, action: 'allin' });

  useEffect(() => { if (isMyTurn) setRaiseAmount(minRaiseTotal); }, [isMyTurn, minRaiseTotal]);

  const totalPot = store.pots.reduce((s, p) => s + p.amount, 0) + store.players.reduce((s, p) => s + p.currentBet, 0);

  // My hole cards
  const myCards = myPlayer?.holeCards?.filter(c => c !== null) || [];

  return (
    <div className="pk-page">
      {/* Top bar */}
      <div className="pk-topbar">
        <button className="pk-leave" onClick={onLeave}><ArrowLeft size={14} /> Rời</button>
        <div className="pk-topinfo">
          <span className="pk-blinds-label">Blinds {store.blinds.sb}/{store.blinds.bb}</span>
          <span className="pk-hand-num">Hand #{store.handNumber}</span>
        </div>
        <span className={`pk-timer-num ${store.timer <= 5 ? 'urgent' : ''}`}>
          {!['WAITING', 'GAME_OVER'].includes(store.phase) ? store.timer : '--'}
        </span>
      </div>

      {/* Table area */}
      <div className="pk-table-area">
        <div className="pk-felt" />

        {/* Seats (opponents only) */}
        {arrangedPlayers.map((player, posIdx) => {
          if (!player || posIdx === 0) return null; // posIdx 0 = me, rendered below
          return (
            <div key={player.seatIndex} className="pk-seat-wrap" style={SEAT_POS[posIdx]}>
              <PlayerSeat
                player={player} isDealer={player.seatIndex === dealerSeat} isSB={player.seatIndex === sbSeat} isBB={player.seatIndex === bbSeat}
                isActive={player.seatIndex === store.currentTurnSeat} timer={store.timer} maxTimer={26} mySeat={mySeat}
                getPlayerName={getPlayerName} showdownHands={store.showdownHands} winners={store.winners}
              />
            </div>
          );
        })}

        {/* Bet chips per player */}
        {arrangedPlayers.map((player, posIdx) => {
          if (!player || player.currentBet <= 0) return null;
          return (
            <div key={`bet-${player.seatIndex}`} className="pk-bet-wrap" style={BET_POS[posIdx]}>
              <ChipStack amount={player.currentBet} small />
            </div>
          );
        })}

        {/* Center: community cards + pot */}
        <div className="pk-center">
          <div className="pk-pot-area">
            {totalPot > 0 && (
              <motion.div className="pk-pot-display" initial={{ scale: 0.8 }} animate={{ scale: 1 }}>
                <ChipStack amount={totalPot} />
                <span className="pk-pot-label">Pot: {totalPot.toLocaleString()}</span>
              </motion.div>
            )}
            {store.pots.length > 1 && (
              <div className="pk-side-pots">
                {store.pots.map((p, i) => (
                  <span key={i} className="pk-side-tag">{i === 0 ? 'Main' : `Side ${i}`}: {p.amount.toLocaleString()}</span>
                ))}
              </div>
            )}
          </div>

          <div className="pk-community">
            <AnimatePresence>
              {store.communityCards.map((card, i) => (
                <motion.div key={i} className="pk-community-card"
                  initial={{ rotateY: 90, opacity: 0 }}
                  animate={{ rotateY: 0, opacity: 1 }}
                  transition={{ delay: i * 0.2, duration: 0.35, ease: 'easeOut' }}
                >
                  <Card value={card.rank} suit={SUIT_MAP[card.suit]} />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

        {/* Last action toast */}
        <AnimatePresence>
          {store.lastAction && (
            <motion.div className="pk-last-action"
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              {getPlayerName(store.players.find(p => p.seatIndex === store.lastAction.seatIndex)?.id)}: {store.lastAction.action.toUpperCase()}
              {store.lastAction.amount > 0 && ` ${store.lastAction.amount.toLocaleString()}`}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom: My cards + status + actions */}
      <div className="pk-bottom">
        {/* My info */}
        {myPlayer && (
          <div className="pk-my-info">
            <span className="pk-my-name">{getPlayerName(myPlayer.id)}</span>
            <span className="pk-my-chips">{myPlayer.chips.toLocaleString()}</span>
            {/* Timer for me */}
            {myPlayer.seatIndex === store.currentTurnSeat && (
              <div className="pk-my-timer">
                <div className={`pk-my-timer-fill ${store.timer <= 5 ? 'urgent' : ''}`} style={{ width: `${(store.timer / 26) * 100}%` }} />
              </div>
            )}
          </div>
        )}

        {/* My hole cards — big, like Liar's Deck */}
        <div className="pk-hand">
          {myCards.map((card, i) => (
            <motion.div
              key={i}
              className="pk-handcard"
              onMouseEnter={() => setHoveredCard(i)}
              onMouseLeave={() => setHoveredCard(-1)}
              animate={{ y: hoveredCard === i ? -14 : 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            >
              <Card value={card.rank} suit={SUIT_MAP[card.suit]} />
            </motion.div>
          ))}
        </div>

        {/* Actions — minimal, inline, no box */}
        <AnimatePresence>
          {isMyTurn && myPlayer?.status === 'ACTIVE' && (
            <motion.div className="pk-actions"
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }}
              transition={{ duration: 0.2 }}
            >
              <button className="pk-btn pk-fold" onClick={handleFold}>Fold</button>
              {canCheck ? (
                <button className="pk-btn pk-check" onClick={handleCheck}>Check</button>
              ) : (
                <button className="pk-btn pk-call" onClick={handleCall}>Call {callAmount.toLocaleString()}</button>
              )}
              <div className="pk-raise-group">
                <input type="range" min={minRaiseTotal} max={myPlayer.chips + myPlayer.currentBet} step={store.blinds.bb} value={raiseAmount} onChange={(e) => setRaiseAmount(parseInt(e.target.value))} className="pk-slider" />
                <button className="pk-btn pk-raise" onClick={handleRaise}>Raise {raiseAmount.toLocaleString()}</button>
              </div>
              <button className="pk-btn pk-allin" onClick={handleAllIn}>All In</button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Showdown overlay */}
      <AnimatePresence>
        {store.winners?.length > 0 && ['HAND_OVER', 'SHOWDOWN'].includes(store.phase) && (
          <motion.div className="pk-showdown" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {store.winners.map((w, i) => (
              <motion.div key={i} className="pk-winner-card"
                initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: i * 0.25, type: 'spring', stiffness: 200 }}
              >
                <span className="pk-winner-name">🏆 {getPlayerName(w.playerId)}</span>
                <span className="pk-winner-amount">+{w.amount.toLocaleString()}</span>
                {w.handName && <span className="pk-winner-hand">{w.handName}</span>}
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Game Over */}
      <AnimatePresence>
        {store.phase === 'GAME_OVER' && (
          <motion.div className="pk-gameover" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <h2>🏆 Game Over!</h2>
            <p>Returning to lobby...</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
