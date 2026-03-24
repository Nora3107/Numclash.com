// SuckCard.com — Tactical Deal: Roulette — Clean & Fast 3D
import { useState, useEffect, useCallback, useRef, useMemo, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text } from '@react-three/drei';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import * as THREE from 'three';
import useRouletteStore from '../stores/useRouletteStore';
import './roulette.css';

// ==========================================
// Table — just 2 meshes
// ==========================================
function Table() {
  return (
    <group>
      <mesh position={[0, 0, 0]} receiveShadow>
        <cylinderGeometry args={[4, 4, 0.15, 32]} />
        <meshStandardMaterial color="#2d8a54" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[4.1, 0.12, 8, 32]} />
        <meshStandardMaterial color="#6b3a1f" roughness={0.4} metalness={0.15} />
      </mesh>
    </group>
  );
}

// ==========================================
// Gun — 3 meshes only
// ==========================================
function Gun({ animState }) {
  const ref = useRef();
  const kickRef = useRef(0);

  useFrame((state, delta) => {
    if (!ref.current) return;
    ref.current.position.y = 0.3 + Math.sin(state.clock.elapsedTime * 1.5) * 0.015;
    ref.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.06;

    if (animState === 'shootLive' || animState === 'shootBlank') kickRef.current = 0.25;
    if (kickRef.current > 0) {
      ref.current.rotation.x = -kickRef.current;
      kickRef.current *= 0.88;
      if (kickRef.current < 0.01) kickRef.current = 0;
    } else {
      ref.current.rotation.x *= 0.92;
    }
  });

  return (
    <group ref={ref} position={[0, 0.3, 0]} scale={0.5}>
      {/* Barrel */}
      <mesh position={[0, 0.1, 0.5]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.05, 0.06, 1, 8]} />
        <meshStandardMaterial color="#333" metalness={0.9} roughness={0.15} />
      </mesh>
      {/* Chamber */}
      <mesh position={[0, 0.1, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.16, 0.16, 0.25, 6]} />
        <meshStandardMaterial color="#444" metalness={0.85} roughness={0.2} />
      </mesh>
      {/* Grip */}
      <mesh position={[0, -0.2, -0.15]} rotation={[0.3, 0, 0]}>
        <boxGeometry args={[0.1, 0.35, 0.14]} />
        <meshStandardMaterial color="#3d1a08" roughness={0.6} />
      </mesh>
    </group>
  );
}

// ==========================================
// Deck — 1 mesh + text
// ==========================================
function Deck({ count }) {
  return (
    <group position={[1.2, 0.15, 0]}>
      <mesh>
        <boxGeometry args={[0.4, 0.12, 0.6]} />
        <meshStandardMaterial color="#1a5ca0" roughness={0.3} />
      </mesh>
      <Text position={[0, 0.07, 0]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.15} color="#fff" anchorX="center">
        {count || 0}
      </Text>
    </group>
  );
}

// ==========================================
// Player — Among Us style (4 meshes)
// ==========================================
function Player({ pos, rot, name, hp, maxHp, status, isActive, isSelf, slotIndex }) {
  const ref = useRef();
  const COLORS = ['#c0392b', '#2980b9', '#27ae60', '#e67e22'];
  const color = status === 'dead' ? '#555' : COLORS[slotIndex % 4];
  const dead = status === 'dead';

  useFrame((state) => {
    if (!ref.current || dead) return;
    ref.current.position.y = Math.sin(state.clock.elapsedTime * 1.2 + slotIndex) * 0.02;
  });

  const hpPct = hp / maxHp;

  return (
    <group position={pos} rotation={rot}>
      {/* Active ring */}
      {isActive && (
        <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.5, 0.04, 6, 24]} />
          <meshStandardMaterial color="#d4af37" emissive="#d4af37" emissiveIntensity={0.6} />
        </mesh>
      )}

      <group ref={ref}>
        {/* Body */}
        <mesh position={[0, 0.55, 0]} castShadow>
          <capsuleGeometry args={[0.22, 0.4, 8, 12]} />
          <meshStandardMaterial color={color} roughness={0.5} transparent={dead} opacity={dead ? 0.3 : 1} />
        </mesh>
        {/* Visor / face plate */}
        <mesh position={[0, 0.7, 0.18]}>
          <boxGeometry args={[0.28, 0.1, 0.06]} />
          <meshStandardMaterial color={dead ? '#333' : '#8ecae6'} roughness={0.1} metalness={0.3} transparent={dead} opacity={dead ? 0.3 : 0.9} />
        </mesh>
        {/* Head */}
        <mesh position={[0, 0.9, 0]} castShadow>
          <sphereGeometry args={[0.22, 12, 12]} />
          <meshStandardMaterial color={color} roughness={0.5} transparent={dead} opacity={dead ? 0.3 : 1} />
        </mesh>
        {/* Backpack */}
        <mesh position={[0, 0.5, -0.25]} castShadow>
          <boxGeometry args={[0.18, 0.25, 0.1]} />
          <meshStandardMaterial color={color} roughness={0.5} transparent={dead} opacity={dead ? 0.3 : 1} />
        </mesh>
      </group>

      {/* Name */}
      <Text position={[0, 1.3, 0]} fontSize={0.12} color={isSelf ? '#4fc3f7' : '#d4af37'} anchorX="center" outlineWidth={0.008} outlineColor="#000">
        {name || '???'}
      </Text>

      {/* HP bar */}
      <group position={[0, 1.18, 0]}>
        <mesh>
          <boxGeometry args={[0.6, 0.04, 0.01]} />
          <meshBasicMaterial color="#222" />
        </mesh>
        <mesh position={[-(0.6 - 0.6 * hpPct) / 2, 0, 0.006]}>
          <boxGeometry args={[Math.max(0.01, 0.6 * hpPct), 0.03, 0.005]} />
          <meshBasicMaterial color={hpPct > 0.5 ? '#4caf50' : hpPct > 0.25 ? '#ff9800' : '#f44336'} />
        </mesh>
      </group>
    </group>
  );
}

// ==========================================
// Scene — minimal lights
// ==========================================
function Scene({ players, currentTurn, socketId, gun, deckCount, getPlayerName, animState }) {
  const pids = Object.keys(players);
  const SLOTS = [
    { pos: [0, 0, 5], rot: [0, Math.PI, 0] },
    { pos: [0, 0, -5], rot: [0, 0, 0] },
    { pos: [5, 0, 0], rot: [0, -Math.PI / 2, 0] },
    { pos: [-5, 0, 0], rot: [0, Math.PI / 2, 0] },
  ];

  const selfIdx = pids.indexOf(socketId);
  const ordered = selfIdx >= 0
    ? pids.map((_, i) => pids[(selfIdx + i) % pids.length])
    : pids;

  return (
    <>
      <color attach="background" args={['#0c0e14']} />
      <fog attach="fog" args={['#0c0e14', 20, 45]} />

      {/* Just 2 lights */}
      <ambientLight intensity={0.6} />
      <spotLight position={[0, 10, 3]} angle={0.6} penumbra={0.7} intensity={3} castShadow shadow-mapSize={1024} color="#fff5e8" />

      {/* Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2, 0]} receiveShadow>
        <planeGeometry args={[50, 50]} />
        <meshStandardMaterial color="#111318" roughness={0.95} />
      </mesh>
      <gridHelper args={[30, 30, '#1a1d25', '#15171e']} position={[0, -1.99, 0]} />

      <Table />
      <Gun animState={animState} />
      <Deck count={deckCount} />

      {ordered.map((pid, i) => {
        const p = players[pid];
        if (!p) return null;
        const s = SLOTS[i] || SLOTS[0];
        return (
          <Player
            key={pid}
            pos={s.pos}
            rot={s.rot}
            name={getPlayerName(pid)}
            hp={p.hp}
            maxHp={p.maxHp}
            status={p.status}
            isActive={pid === currentTurn}
            isSelf={pid === socketId}
            slotIndex={i}
          />
        );
      })}

      <OrbitControls enablePan={false} minDistance={7} maxDistance={15} maxPolarAngle={Math.PI / 2.2} minPolarAngle={Math.PI / 6} target={[0, 0.5, 0]} enableDamping dampingFactor={0.05} />
    </>
  );
}

// ==========================================
// HUD
// ==========================================
function HUD({
  socket, roomCode, phase, turnPhase, currentTurn, socketId,
  myHand, gun, timer, players, requiredShots, shotsFired,
  drawnCard, winner, onLeave, getPlayerName, turnDirection,
}) {
  const isMyTurn = currentTurn === socketId;
  const alive = Object.entries(players).filter(([pid, p]) => p.status === 'alive' && pid !== socketId);

  const emit = (ev, data = {}) => socket.emit(ev, { roomCode, ...data });

  const cardIcons = { skip: '⏭️', redirect: '🔀', reverse: '🔄', heal: '💚', addBullet: '💀', plusOne: '➕', spin: '🎰' };

  return (
    <div className="roulette-hud">
      {/* Top bar */}
      <div className="roulette-top-bar">
        <motion.button className="roulette-leave-btn" onClick={onLeave} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <ArrowLeft size={14} /> RỜI PHÒNG
        </motion.button>

        <div className="roulette-info-center">
          <div className="roulette-gun-info">
            🔫 Cấp {gun?.difficultyLevel || 1}
            <span className="bullet-count">{gun?.remaining || 0}/{gun?.totalChambers || 6}</span>
          </div>
          <div className={`roulette-turn-indicator ${isMyTurn ? 'my-turn' : ''}`}>
            {isMyTurn ? '🎯 LƯỢT CỦA BẠN!' : `⏳ Lượt: ${getPlayerName(currentTurn)}`}
          </div>
        </div>

        <div className="roulette-direction">{turnDirection === 1 ? '↻' : '↺'}</div>
      </div>

      {/* Timer */}
      {phase === 'playing' && (
        <div className="roulette-timer">
          <span className={timer <= 5 ? 'urgent' : ''}>{timer}</span>
        </div>
      )}

      {/* Actions */}
      <AnimatePresence mode="wait">
        {isMyTurn && phase === 'playing' && (
          <motion.div className="roulette-actions" key={turnPhase} initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -15, opacity: 0 }}>
            {turnPhase === 'draw' && (
              <motion.button className="r-btn draw" onClick={() => emit('roulette-draw')} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                🃏 RÚT BÀI
              </motion.button>
            )}

            {turnPhase === 'choice' && (
              <div className="r-choice">
                <motion.button className="r-btn self" onClick={() => emit('roulette-aim', { targetId: 'self' })} whileHover={{ scale: 1.04 }}>
                  🔫 Bắn bản thân
                </motion.button>
                {alive.map(([pid]) => (
                  <motion.button key={pid} className="r-btn other" onClick={() => emit('roulette-aim', { targetId: pid })} whileHover={{ scale: 1.04 }}>
                    🎯 Bắn {getPlayerName(pid)}
                  </motion.button>
                ))}
              </div>
            )}

            {(turnPhase === 'firing' || turnPhase === 'forced_fire') && (
              <div className="r-fire">
                <span className="fire-count">💥 {shotsFired}/{requiredShots}</span>
                <motion.button className="r-btn fire" onClick={() => emit('roulette-fire')} whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }}
                  animate={{ boxShadow: ['0 0 15px rgba(255,0,0,0.3)', '0 0 30px rgba(255,0,0,0.5)', '0 0 15px rgba(255,0,0,0.3)'] }}
                  transition={{ duration: 1.2, repeat: Infinity }}>
                  🔫 BẮN!
                </motion.button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hand cards */}
      <AnimatePresence>
        {myHand.length > 0 && isMyTurn && ['choice', 'forced_fire', 'firing'].includes(turnPhase) && (
          <motion.div className="roulette-hand" initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}>
            {myHand.map((card, i) => (
              <motion.button key={card.id} className="r-card" onClick={() => emit('roulette-play-card', { cardId: card.id })}
                whileHover={{ y: -8, scale: 1.08 }} initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: i * 0.05 }}>
                <span>{cardIcons[card.name] || '🃏'}</span>
                <small>{card.label}</small>
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Drawn card */}
      <AnimatePresence>
        {drawnCard && (
          <motion.div className="roulette-drawn" initial={{ y: 30, opacity: 0, scale: 0.8 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: -20, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 250, damping: 18 }}>
            <span>{drawnCard.type === 'action' ? '⚡' : '🃏'}</span>
            {drawnCard.type === 'action' ? `Bắn ${drawnCard.value} lần!` : drawnCard.label}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Game Over */}
      <AnimatePresence>
        {phase === 'finished' && (
          <motion.div className="roulette-gameover" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <motion.div className="gameover-card" initial={{ scale: 0.7, y: 30 }} animate={{ scale: 1, y: 0 }} transition={{ type: 'spring' }}>
              <div className="go-icon">{winner === socketId ? '🏆' : '💀'}</div>
              <h2>{winner === socketId ? 'CHIẾN THẮNG!' : `${getPlayerName(winner)} THẮNG!`}</h2>
              <div className="go-stats">
                {Object.entries(players).map(([pid, p]) => (
                  <div key={pid} className={`go-row ${pid === winner ? 'w' : ''}`}>
                    <span>{getPlayerName(pid)}</span>
                    <span>{p.hp > 0 ? `❤️ ${p.hp}` : '☠️'}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Player sidebar */}
      <div className="roulette-sidebar">
        {Object.entries(players).map(([pid, p]) => (
          <div key={pid} className={`r-player ${pid === currentTurn ? 'active' : ''} ${p.status === 'dead' ? 'dead' : ''}`}>
            <div className="r-player-top">
              <span>{getPlayerName(pid)}{pid === socketId ? ' (Bạn)' : ''}</span>
              {pid === currentTurn && <span className="turn-dot">▶</span>}
            </div>
            <div className="r-hp">
              {Array.from({ length: p.maxHp }, (_, i) => (
                <span key={i} className={`pip ${i < p.hp ? 'on' : ''}`} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ==========================================
// Page
// ==========================================
export default function RoulettePage({ socket, roomInfo, onLeave, initialState }) {
  const store = useRouletteStore();
  const socketId = socket.id;

  const getPlayerName = useCallback((pid) => {
    const p = roomInfo?.players?.find(p => p.id === pid);
    return p?.nickname || pid?.slice(0, 6);
  }, [roomInfo]);

  useEffect(() => {
    if (initialState) store.syncState(initialState);
  }, [initialState]);

  useEffect(() => {
    const h = {
      'roulette-state': (s) => store.syncState(s),
      'roulette-draw-result': (d) => store.onDrawResult(d),
      'roulette-aim-result': (d) => store.onAimResult(d),
      'roulette-fire-result': (d) => { store.onFireResult(d); setTimeout(() => store.setAnimState('idle'), 1500); },
      'roulette-card-played': (d) => store.onCardPlayed(d),
      'roulette-timer': ({ remaining }) => store.setTimer(remaining),
      'roulette-game-over': (d) => store.onGameOver(d),
      'roulette-error': (e) => console.warn('Roulette:', e),
    };
    Object.entries(h).forEach(([ev, fn]) => socket.on(ev, fn));
    return () => { Object.keys(h).forEach(ev => socket.off(ev)); store.reset(); };
  }, [socket]);

  return (
    <div className="roulette-page">
      <Canvas shadows camera={{ position: [0, 8, 10], fov: 45 }}
        gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.3 }}
        dpr={[1, 1.5]} performance={{ min: 0.5 }}>
        <Suspense fallback={null}>
          <Scene players={store.players} currentTurn={store.currentTurn} socketId={socketId}
            gun={store.gun} deckCount={store.deckCount} getPlayerName={getPlayerName} animState={store.animState} />
        </Suspense>
      </Canvas>
      <HUD socket={socket} roomCode={roomInfo?.code} phase={store.phase} turnPhase={store.turnPhase}
        currentTurn={store.currentTurn} socketId={socketId} myHand={store.myHand} gun={store.gun}
        timer={store.timer} players={store.players} requiredShots={store.requiredShots}
        shotsFired={store.shotsFired} drawnCard={store.drawnCard} winner={store.winner}
        onLeave={onLeave} getPlayerName={getPlayerName} turnDirection={store.turnDirection} />
    </div>
  );
}
