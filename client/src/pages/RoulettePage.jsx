// SuckCard.com — Tactical Deal: Roulette — 3D Game Page
import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Text, RoundedBox, Environment, Center } from '@react-three/drei';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, MessageCircle } from 'lucide-react';
import * as THREE from 'three';
import useRouletteStore from '../stores/useRouletteStore';
import './roulette.css';

// ==========================================
// 3D Components
// ==========================================

function Table() {
  return (
    <group>
      {/* Table surface */}
      <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <cylinderGeometry args={[4, 4, 0.15, 64]} />
        <meshStandardMaterial color="#1a5c3a" roughness={0.8} metalness={0.1} />
      </mesh>
      {/* Table rim */}
      <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[4, 0.15, 16, 64]} />
        <meshStandardMaterial color="#4a2810" roughness={0.5} metalness={0.3} />
      </mesh>
      {/* Table legs */}
      {[0, 1, 2, 3].map((i) => {
        const angle = (i * Math.PI) / 2 + Math.PI / 4;
        return (
          <mesh key={i} position={[Math.cos(angle) * 3, -1.2, Math.sin(angle) * 3]} castShadow>
            <cylinderGeometry args={[0.12, 0.15, 2.4, 12]} />
            <meshStandardMaterial color="#3d2212" roughness={0.6} metalness={0.2} />
          </mesh>
        );
      })}
    </group>
  );
}

function GunModel({ fireState }) {
  const gunRef = useRef();
  const cylinderRef = useRef();
  const flashRef = useRef();

  useFrame((state) => {
    if (gunRef.current) {
      gunRef.current.rotation.y = Math.sin(state.clock.getElapsedTime() * 0.3) * 0.05;
    }
    if (cylinderRef.current) {
      cylinderRef.current.rotation.x += 0.002;
    }
    if (flashRef.current) {
      flashRef.current.intensity = flashRef.current.intensity > 0
        ? flashRef.current.intensity * 0.85
        : 0;
    }
  });

  return (
    <group ref={gunRef} position={[0, 0.35, 0]} scale={0.5}>
      {/* Barrel */}
      <mesh position={[0, 0.15, 0.6]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.08, 0.08, 1.2, 16]} />
        <meshStandardMaterial color="#2a2a2a" metalness={0.9} roughness={0.2} />
      </mesh>
      {/* Cylinder (revolver chamber) */}
      <mesh ref={cylinderRef} position={[0, 0.15, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.22, 0.22, 0.35, 6]} />
        <meshStandardMaterial color="#3a3a3a" metalness={0.8} roughness={0.3} />
      </mesh>
      {/* Grip */}
      <mesh position={[0, -0.25, -0.15]} castShadow>
        <boxGeometry args={[0.15, 0.5, 0.2]} />
        <meshStandardMaterial color="#4a2810" roughness={0.6} metalness={0.1} />
      </mesh>
      {/* Muzzle flash light */}
      <pointLight ref={flashRef} position={[0, 0.15, 1.2]} color="#ff6600" intensity={0} distance={5} />
    </group>
  );
}

function DeckStack({ count }) {
  const cards = Math.min(count, 10);
  return (
    <group position={[0, 0.12, 0]}>
      {Array.from({ length: cards }, (_, i) => (
        <mesh key={i} position={[0, i * 0.015, 0]} castShadow>
          <boxGeometry args={[0.5, 0.01, 0.7]} />
          <meshStandardMaterial color={i % 2 === 0 ? '#1a237e' : '#1565c0'} roughness={0.4} />
        </mesh>
      ))}
    </group>
  );
}

function PlayerSeat({ position, rotation, name, hp, maxHp, status, isActive, isSelf, cardCount }) {
  const meshRef = useRef();

  useFrame((state) => {
    if (meshRef.current && isActive) {
      meshRef.current.position.y = Math.sin(state.clock.getElapsedTime() * 2) * 0.03;
    }
  });

  const hpColor = hp > 3 ? '#4caf50' : hp > 1 ? '#ff9800' : '#f44336';

  return (
    <group position={position} rotation={rotation}>
      {/* Character body */}
      <group ref={meshRef}>
        {/* Body */}
        <mesh position={[0, 0.8, 0]} castShadow>
          <capsuleGeometry args={[0.25, 0.6, 8, 16]} />
          <meshStandardMaterial
            color={status === 'dead' ? '#555' : (isSelf ? '#4fc3f7' : '#ef5350')}
            roughness={0.5}
            transparent={status === 'dead'}
            opacity={status === 'dead' ? 0.4 : 1}
          />
        </mesh>
        {/* Head */}
        <mesh position={[0, 1.5, 0]} castShadow>
          <sphereGeometry args={[0.22, 16, 16]} />
          <meshStandardMaterial
            color={status === 'dead' ? '#555' : '#ffcc80'}
            roughness={0.6}
          />
        </mesh>
        {/* Active indicator ring */}
        {isActive && (
          <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.5, 0.05, 8, 32]} />
            <meshStandardMaterial color="#ffeb3b" emissive="#ffeb3b" emissiveIntensity={0.5} />
          </mesh>
        )}
      </group>
      {/* Name */}
      <Text position={[0, 2, 0]} fontSize={0.2} color="white" anchorX="center" anchorY="middle" font="/fonts/Inter-Bold.woff">
        {name || 'Player'}
      </Text>
      {/* HP bar */}
      <group position={[0, 1.85, 0]}>
        <mesh>
          <boxGeometry args={[0.8, 0.08, 0.02]} />
          <meshBasicMaterial color="#333" />
        </mesh>
        <mesh position={[-(0.8 - (0.8 * hp / maxHp)) / 2, 0, 0.01]}>
          <boxGeometry args={[0.8 * hp / maxHp, 0.06, 0.01]} />
          <meshBasicMaterial color={hpColor} />
        </mesh>
      </group>
      {/* Card count badge */}
      {cardCount > 0 && (
        <Text position={[0.5, 1.5, 0]} fontSize={0.15} color="#fff" anchorX="center">
          🃏{cardCount}
        </Text>
      )}
    </group>
  );
}

function Scene({ players, currentTurn, socketId, gun, deckCount, getPlayerName }) {
  const playerIds = Object.keys(players);
  const POSITIONS = [
    { pos: [0, 0, -5], rot: [0, 0, 0] },       // top
    { pos: [5, 0, 0], rot: [0, -Math.PI / 2, 0] }, // right
    { pos: [0, 0, 5], rot: [0, Math.PI, 0] },   // bottom (self usually)
    { pos: [-5, 0, 0], rot: [0, Math.PI / 2, 0] }, // left
  ];

  // Sort so self is always at bottom
  const selfIdx = playerIds.indexOf(socketId);
  const orderedIds = [];
  if (selfIdx >= 0) {
    for (let i = 0; i < playerIds.length; i++) {
      orderedIds.push(playerIds[(selfIdx + i) % playerIds.length]);
    }
  } else {
    orderedIds.push(...playerIds);
  }
  // Map: bottom=self, then clockwise
  const slotOrder = [2, 0, 1, 3]; // bottom, top, right, left

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 10, 5]} intensity={1.2} castShadow shadow-mapSize-width={2048} shadow-mapSize-height={2048} />
      <pointLight position={[0, 5, 0]} intensity={0.5} color="#ffeebb" />

      {/* Environment */}
      <color attach="background" args={['#0a0a0f']} />
      <fog attach="fog" args={['#0a0a0f', 15, 30]} />

      {/* Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2.4, 0]} receiveShadow>
        <planeGeometry args={[40, 40]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.9} />
      </mesh>

      {/* Table */}
      <Table />

      {/* Gun */}
      <GunModel />

      {/* Deck */}
      <DeckStack count={deckCount} />

      {/* Players */}
      {orderedIds.map((pid, i) => {
        const slot = POSITIONS[slotOrder[i]] || POSITIONS[0];
        const player = players[pid];
        if (!player) return null;
        return (
          <PlayerSeat
            key={pid}
            position={slot.pos}
            rotation={slot.rot}
            name={getPlayerName(pid)}
            hp={player.hp}
            maxHp={player.maxHp}
            status={player.status}
            isActive={pid === currentTurn}
            isSelf={pid === socketId}
            cardCount={pid === socketId ? undefined : player.cardCount}
          />
        );
      })}

      {/* Camera controls */}
      <OrbitControls
        enablePan={false}
        enableZoom={true}
        minDistance={5}
        maxDistance={15}
        maxPolarAngle={Math.PI / 2.2}
        minPolarAngle={Math.PI / 6}
        target={[0, 0.5, 0]}
      />
    </>
  );
}

// ==========================================
// HUD (HTML Overlay)
// ==========================================

function RouletteHUD({
  socket, roomCode, phase, turnPhase, currentTurn, socketId,
  myHand, gun, timer, players, requiredShots, shotsFired,
  drawnCard, winner, onLeave, getPlayerName, turnDirection,
}) {
  const isMyTurn = currentTurn === socketId;
  const alivePlayers = Object.entries(players).filter(([_, p]) => p.status === 'alive' && p.id !== socketId);

  const handleDraw = () => socket.emit('roulette-draw', { roomCode });
  const handleAimSelf = () => socket.emit('roulette-aim', { roomCode, targetId: 'self' });
  const handleAimOther = (targetId) => socket.emit('roulette-aim', { roomCode, targetId });
  const handleFire = () => socket.emit('roulette-fire', { roomCode });
  const handlePlayCard = (cardId) => socket.emit('roulette-play-card', { roomCode, cardId });

  return (
    <div className="roulette-hud">
      {/* Top bar */}
      <div className="roulette-top-bar">
        <motion.button className="roulette-leave-btn" onClick={onLeave} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <ArrowLeft size={16} /> Rời phòng
        </motion.button>
        <div className="roulette-gun-info">
          🔫 Level {gun?.difficultyLevel || 1} — {gun?.remaining || 0}/{gun?.totalChambers || 6} viên còn lại
        </div>
        <div className="roulette-turn-info" style={{ direction: turnDirection === 1 ? 'ltr' : 'rtl' }}>
          {turnDirection === 1 ? '🔄' : '🔃'} {isMyTurn ? '🎯 Lượt của bạn!' : `⏳ ${getPlayerName(currentTurn)}`}
        </div>
      </div>

      {/* Timer */}
      {phase === 'playing' && (
        <div className="roulette-timer-bar">
          <div className={`roulette-timer-fill ${timer <= 5 ? 'urgent' : ''}`} style={{ width: `${(timer / 30) * 100}%` }} />
          <span className="roulette-timer-text">{timer}s</span>
        </div>
      )}

      {/* Action Buttons */}
      {isMyTurn && phase === 'playing' && (
        <div className="roulette-actions">
          {turnPhase === 'draw' && (
            <motion.button className="roulette-action-btn draw" onClick={handleDraw} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
              🃏 Rút Bài
            </motion.button>
          )}

          {turnPhase === 'choice' && (
            <div className="roulette-choice-panel">
              <h3>🎯 Chọn mục tiêu</h3>
              <motion.button className="roulette-action-btn self" onClick={handleAimSelf} whileHover={{ scale: 1.05 }}>
                🔫 Bắn bản thân (BLANK → lượt thêm!)
              </motion.button>
              {alivePlayers.map(([pid]) => (
                <motion.button key={pid} className="roulette-action-btn other" onClick={() => handleAimOther(pid)} whileHover={{ scale: 1.05 }}>
                  🎯 Bắn {getPlayerName(pid)}
                </motion.button>
              ))}
            </div>
          )}

          {(turnPhase === 'firing' || turnPhase === 'forced_fire') && (
            <div className="roulette-fire-panel">
              <p>💥 Bắn {shotsFired}/{requiredShots}</p>
              <motion.button className="roulette-action-btn fire" onClick={handleFire} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                🔫 BẮN!
              </motion.button>
            </div>
          )}
        </div>
      )}

      {/* My Hand */}
      {myHand.length > 0 && isMyTurn && (
        <div className="roulette-hand">
          <h4>🃏 Bài trên tay</h4>
          <div className="roulette-hand-cards">
            {myHand.map((card) => (
              <motion.button
                key={card.id}
                className="roulette-card-btn"
                onClick={() => handlePlayCard(card.id)}
                whileHover={{ y: -8, scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <span className="card-icon">
                  {card.name === 'skip' && '⏭️'}
                  {card.name === 'redirect' && '🔀'}
                  {card.name === 'reverse' && '🔄'}
                  {card.name === 'heal' && '💚'}
                  {card.name === 'addBullet' && '💀'}
                  {card.name === 'plusOne' && '➕'}
                  {card.name === 'spin' && '🎰'}
                </span>
                <span className="card-label">{card.label}</span>
              </motion.button>
            ))}
          </div>
        </div>
      )}

      {/* Drawn card notification */}
      <AnimatePresence>
        {drawnCard && (
          <motion.div
            className="roulette-drawn-card"
            initial={{ y: 50, opacity: 0, scale: 0.5 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -30, opacity: 0 }}
          >
            {drawnCard.type === 'action'
              ? `⚡ Action Card: Bắn ${drawnCard.value} lần!`
              : `🃏 ${drawnCard.label}`}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Game Over Overlay */}
      <AnimatePresence>
        {phase === 'finished' && (
          <motion.div className="roulette-game-over" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="roulette-game-over-card">
              <h2>{winner === socketId ? '🎉 Bạn thắng!' : `☠️ ${getPlayerName(winner)} thắng!`}</h2>
              <p>Quay lại sảnh chờ...</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Player HP sidebar */}
      <div className="roulette-player-list">
        {Object.entries(players).map(([pid, p]) => (
          <div key={pid} className={`roulette-player-item ${pid === currentTurn ? 'active' : ''} ${p.status === 'dead' ? 'dead' : ''}`}>
            <span className="player-name">{getPlayerName(pid)} {pid === socketId ? '(Bạn)' : ''}</span>
            <div className="player-hp-bar">
              {Array.from({ length: p.maxHp }, (_, i) => (
                <span key={i} className={`hp-heart ${i < p.hp ? 'filled' : 'empty'}`}>❤️</span>
              ))}
            </div>
            <span className="player-cards">🃏{p.cardCount || 0}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ==========================================
// Main Page Component
// ==========================================

export default function RoulettePage({ socket, roomInfo, onLeave, initialState }) {
  const store = useRouletteStore();
  const socketId = socket.id;

  const getPlayerName = useCallback((pid) => {
    if (!roomInfo) return pid?.slice(0, 6);
    const p = roomInfo.players?.find(p => p.id === pid);
    return p?.nickname || pid?.slice(0, 6);
  }, [roomInfo]);

  // Sync initial state
  useEffect(() => {
    if (initialState) {
      store.syncState(initialState);
    }
  }, [initialState]);

  // Socket listeners
  useEffect(() => {
    socket.on('roulette-state', (state) => store.syncState(state));
    socket.on('roulette-draw-result', (data) => store.onDrawResult(data));
    socket.on('roulette-aim-result', (data) => store.onAimResult(data));
    socket.on('roulette-fire-result', (data) => {
      store.onFireResult(data);
      // Reset anim after delay
      setTimeout(() => store.setAnimState('idle'), 1500);
    });
    socket.on('roulette-card-played', (data) => store.onCardPlayed(data));
    socket.on('roulette-timer', ({ remaining }) => store.setTimer(remaining));
    socket.on('roulette-game-over', (data) => store.onGameOver(data));
    socket.on('roulette-error', (err) => console.warn('Roulette error:', err));

    return () => {
      socket.off('roulette-state');
      socket.off('roulette-draw-result');
      socket.off('roulette-aim-result');
      socket.off('roulette-fire-result');
      socket.off('roulette-card-played');
      socket.off('roulette-timer');
      socket.off('roulette-game-over');
      socket.off('roulette-error');
      store.reset();
    };
  }, [socket]);

  return (
    <div className="roulette-page">
      <Canvas
        shadows
        camera={{ position: [0, 8, 10], fov: 50 }}
        gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping }}
      >
        <Suspense fallback={null}>
          <Scene
            players={store.players}
            currentTurn={store.currentTurn}
            socketId={socketId}
            gun={store.gun}
            deckCount={store.deckCount}
            getPlayerName={getPlayerName}
          />
        </Suspense>
      </Canvas>

      <RouletteHUD
        socket={socket}
        roomCode={roomInfo?.code}
        phase={store.phase}
        turnPhase={store.turnPhase}
        currentTurn={store.currentTurn}
        socketId={socketId}
        myHand={store.myHand}
        gun={store.gun}
        timer={store.timer}
        players={store.players}
        requiredShots={store.requiredShots}
        shotsFired={store.shotsFired}
        drawnCard={store.drawnCard}
        winner={store.winner}
        onLeave={onLeave}
        getPlayerName={getPlayerName}
        turnDirection={store.turnDirection}
      />
    </div>
  );
}
