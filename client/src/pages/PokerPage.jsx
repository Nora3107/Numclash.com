import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
      chips.push({ ...d, count: Math.min(count, 5) }); // cap visual at 5
      remaining -= count * d.value;
    }
  }
  return chips;
}

function ChipStack({ amount, small }) {
  if (!amount || amount <= 0) return null;
  const chips = getChipBreakdown(amount);

  return (
    <div className={`chip-stack ${small ? 'small' : ''}`}>
      {chips.map((c, i) => (
        Array.from({ length: c.count }, (_, j) => (
          <div
            key={`${i}-${j}`}
            className="chip"
            style={{
              background: c.color,
              bottom: `${(i * c.count + j) * (small ? 2 : 3)}px`,
              color: c.color === '#ecf0f1' || c.color === '#ffd700' ? '#333' : '#fff',
            }}
          />
        ))
      )).flat()}
      <span className="chip-amount">{amount.toLocaleString()}</span>
    </div>
  );
}

// 6-seat positions around oval (relative %)
const SEAT_POSITIONS = [
  { left: '50%', bottom: '2%', transform: 'translateX(-50%)' },    // 0: bottom center (me)
  { left: '4%', bottom: '25%' },                                     // 1: left bottom
  { left: '4%', top: '15%' },                                        // 2: left top
  { left: '50%', top: '2%', transform: 'translateX(-50%)' },       // 3: top center
  { right: '4%', top: '15%' },                                       // 4: right top
  { right: '4%', bottom: '25%' },                                    // 5: right bottom
];

// Bet chip positions (closer to center)
const BET_POSITIONS = [
  { left: '50%', bottom: '25%', transform: 'translateX(-50%)' },
  { left: '20%', bottom: '35%' },
  { left: '20%', top: '35%' },
  { left: '50%', top: '25%', transform: 'translateX(-50%)' },
  { right: '20%', top: '35%' },
  { right: '20%', bottom: '35%' },
];

function PokerCard({ card, faceDown, small }) {
  if (!card || faceDown) {
    return <div className={`poker-card-back ${small ? 'small' : ''}`} />;
  }
  return (
    <div className={`poker-card-front ${small ? 'small' : ''}`}>
      <Card value={card.rank} suit={SUIT_MAP[card.suit] || card.suit} />
    </div>
  );
}

function PlayerSeat({ player, isDealer, isSB, isBB, isActive, timer, maxTimer, mySeat, getPlayerName, showdownHands, winners }) {
  if (!player) return null;
  const isMe = player.seatIndex === mySeat;
  const isDead = player.status === 'SPECTATOR';
  const isFolded = player.status === 'FOLDED';
  const showCards = player.holeCards && player.holeCards.length === 2 && player.holeCards[0] !== null;
  const hasCards = player.hasCards;
  const timerPct = isActive ? (timer / maxTimer) * 100 : 0;

  // Check if this player is a winner
  const isWinner = winners?.some(w => w.seatIndex === player.seatIndex);
  const myHand = showdownHands?.[player.id];

  return (
    <div className={`poker-seat ${isActive ? 'active' : ''} ${isDead ? 'dead' : ''} ${isFolded ? 'folded' : ''} ${isMe ? 'me' : ''} ${isWinner ? 'winner' : ''}`}>
      {/* Badge */}
      <div className="seat-badges">
        {isDealer && <span className="badge dealer">D</span>}
        {isSB && <span className="badge sb">SB</span>}
        {isBB && <span className="badge bb">BB</span>}
      </div>

      {/* Cards */}
      <div className="seat-cards">
        {hasCards && (
          <>
            <PokerCard card={showCards ? player.holeCards[0] : null} faceDown={!showCards} small />
            <PokerCard card={showCards ? player.holeCards[1] : null} faceDown={!showCards} small />
          </>
        )}
      </div>

      {/* Info */}
      <div className="seat-info">
        <span className="seat-name">{getPlayerName(player.id)}</span>
        <span className="seat-chips">{player.chips.toLocaleString()}</span>
      </div>

      {/* Timer bar */}
      {isActive && (
        <div className="seat-timer">
          <div className={`seat-timer-fill ${timer <= 5 ? 'urgent' : ''}`} style={{ width: `${timerPct}%` }} />
        </div>
      )}

      {/* Hand name at showdown */}
      {myHand && <span className="seat-hand-name">{myHand.handName}</span>}

      {/* Status */}
      {isFolded && <span className="seat-status">FOLD</span>}
      {player.status === 'ALL_IN' && <span className="seat-status allin">ALL IN</span>}
      {isDead && <span className="seat-status spectator">👁</span>}
    </div>
  );
}

export default function PokerPage({ socket, roomInfo, onLeave, initialState }) {
  const store = usePokerStore();
  const socketId = socket.id;
  const [raiseAmount, setRaiseAmount] = useState(0);

  const getPlayerName = useCallback((pid) => {
    return roomInfo?.players?.find(p => p.id === pid)?.nickname || pid?.slice(0, 6);
  }, [roomInfo]);

  useEffect(() => {
    if (initialState) store.syncState(initialState);
  }, [initialState]);

  useEffect(() => {
    const handlers = {
      'poker-state': (s) => store.syncState(s),
      'poker-action': (a) => store.onAction(a),
      'poker-community': (d) => store.onCommunity(d),
      'poker-showdown': (d) => store.onShowdown(d),
      'poker-new-hand': () => store.onNewHand(),
      'poker-timer': ({ remaining }) => store.setTimer(remaining),
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
  const isMyTurn = store.currentTurnSeat === mySeat && store.phase !== 'WAITING' && store.phase !== 'SHOWDOWN' && store.phase !== 'HAND_OVER' && store.phase !== 'GAME_OVER';
  const canCheck = myPlayer && myPlayer.currentBet >= store.currentHighestBet;
  const callAmount = myPlayer ? store.currentHighestBet - myPlayer.currentBet : 0;
  const minRaiseTotal = store.currentHighestBet + store.minRaise;

  // Arrange seats: rotate so mySeat is at position 0 (bottom)
  const arrangedPlayers = useMemo(() => {
    if (!store.players.length) return [];
    const totalSeats = store.players.length;
    const result = new Array(6).fill(null);

    for (const p of store.players) {
      // Rotate so mySeat appears at index 0
      let relativePos = (p.seatIndex - mySeat + totalSeats) % totalSeats;
      // Map to 6-slot layout
      if (totalSeats <= 2) {
        // Heads-up: me=0, opponent=3
        const posMap = [0, 3];
        result[posMap[relativePos]] = p;
      } else if (totalSeats <= 3) {
        const posMap = [0, 2, 4];
        result[posMap[relativePos]] = p;
      } else if (totalSeats <= 4) {
        const posMap = [0, 1, 3, 5];
        result[posMap[relativePos]] = p;
      } else if (totalSeats <= 5) {
        const posMap = [0, 1, 2, 4, 5];
        result[posMap[relativePos]] = p;
      } else {
        result[relativePos] = p;
      }
    }
    return result;
  }, [store.players, mySeat]);

  // Dealer / SB / BB seat calculated
  const dealerSeat = store.dealerIndex;
  const totalAlive = store.players.filter(p => p.status !== 'SPECTATOR').length;
  let sbSeat, bbSeat;
  if (totalAlive === 2) {
    sbSeat = dealerSeat;
    const alive = store.players.filter(p => p.status !== 'SPECTATOR').map(p => p.seatIndex);
    bbSeat = alive.find(s => s !== dealerSeat) ?? -1;
  } else {
    const alive = store.players.filter(p => p.status !== 'SPECTATOR').map(p => p.seatIndex).sort((a, b) => a - b);
    const dIdx = alive.indexOf(dealerSeat);
    sbSeat = dIdx >= 0 ? alive[(dIdx + 1) % alive.length] : -1;
    bbSeat = dIdx >= 0 ? alive[(dIdx + 2) % alive.length] : -1;
  }

  // Actions
  const handleFold = () => socket.emit('poker-action', { roomCode: roomInfo?.code, action: 'fold' });
  const handleCheck = () => socket.emit('poker-action', { roomCode: roomInfo?.code, action: 'check' });
  const handleCall = () => socket.emit('poker-action', { roomCode: roomInfo?.code, action: 'call' });
  const handleRaise = () => {
    const total = Math.max(raiseAmount, minRaiseTotal);
    socket.emit('poker-action', { roomCode: roomInfo?.code, action: 'raise', amount: total });
  };
  const handleAllIn = () => socket.emit('poker-action', { roomCode: roomInfo?.code, action: 'allin' });

  // Set raise to min on turn start
  useEffect(() => {
    if (isMyTurn) setRaiseAmount(minRaiseTotal);
  }, [isMyTurn, minRaiseTotal]);

  const totalPot = store.pots.reduce((s, p) => s + p.amount, 0)
    + store.players.reduce((s, p) => s + p.currentBet, 0);

  return (
    <div className="poker-page">
      {/* Top bar */}
      <div className="poker-topbar">
        <button className="poker-leave" onClick={onLeave}><ArrowLeft size={14} /> Rời</button>
        <div className="poker-info">
          <span className="poker-blinds">Blinds: {store.blinds.sb}/{store.blinds.bb}</span>
          <span className="poker-hand">Hand #{store.handNumber}</span>
        </div>
        <span className={`poker-timer-num ${store.timer <= 5 ? 'urgent' : ''}`}>
          {store.phase !== 'WAITING' && store.phase !== 'GAME_OVER' ? store.timer : '--'}
        </span>
      </div>

      {/* Table */}
      <div className="poker-table-area">
        <div className="poker-table-oval" />

        {/* Seats */}
        {arrangedPlayers.map((player, posIdx) => {
          if (!player) return null;
          return (
            <div key={player.seatIndex} className="poker-seat-wrapper" style={SEAT_POSITIONS[posIdx]}>
              <PlayerSeat
                player={player}
                isDealer={player.seatIndex === dealerSeat}
                isSB={player.seatIndex === sbSeat}
                isBB={player.seatIndex === bbSeat}
                isActive={player.seatIndex === store.currentTurnSeat}
                timer={store.timer}
                maxTimer={26}
                mySeat={mySeat}
                getPlayerName={getPlayerName}
                showdownHands={store.showdownHands}
                winners={store.winners}
              />
            </div>
          );
        })}

        {/* Bet chips per player */}
        {arrangedPlayers.map((player, posIdx) => {
          if (!player || player.currentBet <= 0) return null;
          return (
            <div key={`bet-${player.seatIndex}`} className="poker-bet-wrapper" style={BET_POSITIONS[posIdx]}>
              <ChipStack amount={player.currentBet} small />
            </div>
          );
        })}

        {/* Community cards + pot (center) */}
        <div className="poker-center">
          {/* Pot */}
          <div className="poker-pot">
            {totalPot > 0 && (
              <motion.div
                className="pot-display"
                initial={{ scale: 0.8 }} animate={{ scale: 1 }}
              >
                <ChipStack amount={totalPot} />
                <span className="pot-label">Pot: {totalPot.toLocaleString()}</span>
              </motion.div>
            )}
            {store.pots.length > 1 && (
              <div className="side-pots">
                {store.pots.map((p, i) => (
                  <span key={i} className="side-pot-tag">
                    {i === 0 ? 'Main' : `Side ${i}`}: {p.amount.toLocaleString()}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Community cards */}
          <div className="poker-community">
            <AnimatePresence>
              {store.communityCards.map((card, i) => (
                <motion.div
                  key={i}
                  className="community-card"
                  initial={{ rotateY: 180, opacity: 0 }}
                  animate={{ rotateY: 0, opacity: 1 }}
                  transition={{ delay: i * 0.15, duration: 0.4 }}
                >
                  <Card value={card.rank} suit={SUIT_MAP[card.suit]} />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

        {/* Last action indicator */}
        <AnimatePresence>
          {store.lastAction && (
            <motion.div
              className="poker-last-action"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              {getPlayerName(store.players.find(p => p.seatIndex === store.lastAction.seatIndex)?.id)}: {store.lastAction.action.toUpperCase()}
              {store.lastAction.amount > 0 && ` ${store.lastAction.amount.toLocaleString()}`}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Action panel (my turn only) */}
      <AnimatePresence>
        {isMyTurn && myPlayer?.status === 'ACTIVE' && (
          <motion.div
            className="poker-actions"
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
          >
            <button className="pk-btn fold" onClick={handleFold}>Fold</button>
            {canCheck ? (
              <button className="pk-btn check" onClick={handleCheck}>Check</button>
            ) : (
              <button className="pk-btn call" onClick={handleCall}>
                Call {callAmount.toLocaleString()}
              </button>
            )}
            <div className="raise-group">
              <input
                type="range"
                min={minRaiseTotal}
                max={myPlayer.chips + myPlayer.currentBet}
                step={store.blinds.bb}
                value={raiseAmount}
                onChange={(e) => setRaiseAmount(parseInt(e.target.value))}
                className="raise-slider"
              />
              <button className="pk-btn raise" onClick={handleRaise}>
                Raise {raiseAmount.toLocaleString()}
              </button>
            </div>
            <button className="pk-btn allin" onClick={handleAllIn}>All In</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Showdown overlay */}
      <AnimatePresence>
        {store.winners && store.winners.length > 0 && (store.phase === 'HAND_OVER' || store.phase === 'SHOWDOWN') && (
          <motion.div
            className="poker-showdown-overlay"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          >
            {store.winners.map((w, i) => (
              <motion.div key={i} className="winner-card"
                initial={{ scale: 0.7, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: i * 0.2 }}
              >
                <span className="winner-name">🏆 {getPlayerName(w.playerId)}</span>
                <span className="winner-amount">+{w.amount.toLocaleString()}</span>
                {w.handName && <span className="winner-hand">{w.handName}</span>}
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Game Over */}
      <AnimatePresence>
        {store.phase === 'GAME_OVER' && (
          <motion.div className="poker-gameover" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <h2>🏆 Game Over!</h2>
            <p>Returning to lobby...</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
