// SuckCard.com — Tactical Deal: Roulette — Premium 3D Game Page
import { useState, useEffect, useCallback, useRef, useMemo, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Text, Environment, Float, Sparkles } from '@react-three/drei';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import * as THREE from 'three';
import useRouletteStore from '../stores/useRouletteStore';
import './roulette.css';

// ==========================================
// 3D Materials (reusable)
// ==========================================

function FeltMaterial({ color = '#1a5c3a' }) {
  return (
    <meshStandardMaterial
      color={color}
      roughness={0.92}
      metalness={0.02}
      bumpScale={0.003}
    />
  );
}

// ==========================================
// Premium Table
// ==========================================

function Table() {
  const rimRef = useRef();

  useFrame((state) => {
    // Subtle rim shine animation
    if (rimRef.current) {
      rimRef.current.rotation.y = state.clock.getElapsedTime() * 0.01;
    }
  });

  return (
    <group>
      {/* Felt surface */}
      <mesh position={[0, 0, 0]} receiveShadow>
        <cylinderGeometry args={[4.2, 4.2, 0.12, 64]} />
        <meshStandardMaterial color="#2a8b5a" roughness={0.95} metalness={0.01} />
      </mesh>
      {/* Inner felt ring (darker) */}
      <mesh position={[0, 0.065, 0]} receiveShadow>
        <cylinderGeometry args={[3.8, 3.8, 0.01, 64]} />
        <meshStandardMaterial color="#1e7545" roughness={0.98} />
      </mesh>
      {/* Ornamental gold ring on felt */}
      <mesh position={[0, 0.07, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[3.0, 0.02, 8, 64]} />
        <meshStandardMaterial color="#c4a35a" metalness={0.9} roughness={0.3} emissive="#8a7030" emissiveIntensity={0.15} />
      </mesh>
      {/* Wooden rim — outer */}
      <mesh ref={rimRef} position={[0, 0.02, 0]}>
        <cylinderGeometry args={[4.5, 4.5, 0.22, 64]} />
        <meshStandardMaterial color="#5c3015" roughness={0.4} metalness={0.2} />
      </mesh>
      {/* Wooden rim — inner cutout visual */}
      <mesh position={[0, 0.03, 0]}>
        <cylinderGeometry args={[4.2, 4.2, 0.24, 64]} />
        <meshStandardMaterial color="#3d2010" roughness={0.5} metalness={0.15} />
      </mesh>
      {/* Edge highlight */}
      <mesh position={[0, 0.12, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[4.5, 0.06, 12, 64]} />
        <meshStandardMaterial color="#6d3818" roughness={0.35} metalness={0.3} />
      </mesh>
      {/* Table legs — ornate */}
      {[0, 1, 2, 3].map((i) => {
        const angle = (i * Math.PI) / 2 + Math.PI / 4;
        const x = Math.cos(angle) * 3.5;
        const z = Math.sin(angle) * 3.5;
        return (
          <group key={i}>
            <mesh position={[x, -1.1, z]} castShadow>
              <cylinderGeometry args={[0.1, 0.14, 2.2, 12]} />
              <meshStandardMaterial color="#3d2010" roughness={0.5} metalness={0.2} />
            </mesh>
            {/* Leg cap */}
            <mesh position={[x, -2.2, z]}>
              <sphereGeometry args={[0.16, 12, 12]} />
              <meshStandardMaterial color="#c4a35a" metalness={0.8} roughness={0.3} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

// ==========================================
// Premium Gun Model
// ==========================================

function GunModel({ animState }) {
  const gunRef = useRef();
  const cylinderRef = useRef();
  const flashRef = useRef();
  const recoilRef = useRef(0);

  useFrame((state, delta) => {
    if (!gunRef.current) return;

    // Idle hover
    gunRef.current.position.y = 0.35 + Math.sin(state.clock.getElapsedTime() * 1.2) * 0.02;
    gunRef.current.rotation.y = Math.sin(state.clock.getElapsedTime() * 0.4) * 0.08;

    // Cylinder slow spin
    if (cylinderRef.current) {
      cylinderRef.current.rotation.x += delta * 0.3;
    }

    // Fire recoil
    if (animState === 'shootLive' || animState === 'shootBlank') {
      recoilRef.current = 0.3;
      if (flashRef.current && animState === 'shootLive') {
        flashRef.current.intensity = 40;
      }
    }
    if (recoilRef.current > 0) {
      gunRef.current.rotation.x = -recoilRef.current;
      recoilRef.current *= 0.9;
      if (recoilRef.current < 0.01) recoilRef.current = 0;
    } else {
      gunRef.current.rotation.x *= 0.9;
    }

    // Flash decay
    if (flashRef.current && flashRef.current.intensity > 0) {
      flashRef.current.intensity *= 0.85;
      if (flashRef.current.intensity < 0.1) flashRef.current.intensity = 0;
    }
  });

  return (
    <group ref={gunRef} position={[0, 0.35, 0]} scale={0.55}>
      {/* Main barrel */}
      <mesh position={[0, 0.12, 0.65]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.06, 0.07, 1.3, 16]} />
        <meshStandardMaterial color="#1a1a1a" metalness={0.95} roughness={0.15} />
      </mesh>
      {/* Front sight */}
      <mesh position={[0, 0.2, 1.25]} castShadow>
        <boxGeometry args={[0.02, 0.06, 0.04]} />
        <meshStandardMaterial color="#1a1a1a" metalness={0.9} roughness={0.2} />
      </mesh>
      {/* Cylinder (chamber) */}
      <group ref={cylinderRef}>
        <mesh position={[0, 0.12, 0.05]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.2, 0.2, 0.32, 6]} />
          <meshStandardMaterial color="#2a2a2a" metalness={0.85} roughness={0.25} />
        </mesh>
        {/* Chamber holes */}
        {[0, 1, 2, 3, 4, 5].map((i) => {
          const a = (i * Math.PI * 2) / 6;
          return (
            <mesh key={i} position={[Math.cos(a) * 0.12, 0.12, 0.05 + Math.sin(a) * 0.12]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.04, 0.04, 0.34, 8]} />
              <meshStandardMaterial color="#111" metalness={0.5} roughness={0.8} />
            </mesh>
          );
        })}
      </group>
      {/* Frame/body */}
      <mesh position={[0, 0.05, -0.05]} castShadow>
        <boxGeometry args={[0.12, 0.18, 0.4]} />
        <meshStandardMaterial color="#222" metalness={0.9} roughness={0.2} />
      </mesh>
      {/* Trigger guard */}
      <mesh position={[0, -0.08, -0.05]} rotation={[0.3, 0, 0]}>
        <torusGeometry args={[0.08, 0.015, 8, 16, Math.PI]} />
        <meshStandardMaterial color="#1a1a1a" metalness={0.9} roughness={0.2} />
      </mesh>
      {/* Grip */}
      <mesh position={[0, -0.22, -0.18]} rotation={[0.3, 0, 0]} castShadow>
        <boxGeometry args={[0.13, 0.42, 0.18]} />
        <meshStandardMaterial color="#4a2510" roughness={0.55} metalness={0.05} />
      </mesh>
      {/* Grip texture lines */}
      {[-0.04, 0, 0.04].map((y, i) => (
        <mesh key={i} position={[0, -0.15 + y, -0.1]} rotation={[0.3, 0, 0]}>
          <boxGeometry args={[0.135, 0.008, 0.19]} />
          <meshStandardMaterial color="#3a1a08" roughness={0.7} />
        </mesh>
      ))}
      {/* Hammer */}
      <mesh position={[0, 0.2, -0.2]} castShadow>
        <boxGeometry args={[0.04, 0.1, 0.08]} />
        <meshStandardMaterial color="#1a1a1a" metalness={0.9} roughness={0.2} />
      </mesh>

      {/* Muzzle flash */}
      <pointLight ref={flashRef} position={[0, 0.12, 1.4]} color="#ff8800" intensity={0} distance={8} />
      <mesh position={[0, 0.12, 1.35]} visible={false}>
        <sphereGeometry args={[0.15, 8, 8]} />
        <meshBasicMaterial color="#ffaa00" transparent opacity={0.8} />
      </mesh>
    </group>
  );
}

// ==========================================
// Premium Deck Stack
// ==========================================

function DeckStack({ count }) {
  const ref = useRef();
  const cards = Math.min(count || 10, 15);

  useFrame((state) => {
    if (ref.current) {
      ref.current.position.y = 0.08 + Math.sin(state.clock.getElapsedTime() * 0.8) * 0.005;
    }
  });

  return (
    <Float speed={1} rotationIntensity={0} floatIntensity={0.05}>
      <group ref={ref} position={[1.2, 0.08, 0]}>
        {Array.from({ length: cards }, (_, i) => (
          <mesh key={i} position={[(Math.random() - 0.5) * 0.02, i * 0.012, (Math.random() - 0.5) * 0.02]} rotation={[0, (Math.random() - 0.5) * 0.05, 0]} castShadow>
            <boxGeometry args={[0.45, 0.008, 0.65]} />
            <meshStandardMaterial
              color={i % 3 === 0 ? '#0d47a1' : i % 3 === 1 ? '#1565c0' : '#1976d2'}
              roughness={0.3}
              metalness={0.1}
            />
          </mesh>
        ))}
        {/* Top card with pattern */}
        <mesh position={[0, cards * 0.012, 0]} castShadow>
          <boxGeometry args={[0.45, 0.008, 0.65]} />
          <meshStandardMaterial color="#1565c0" roughness={0.25} metalness={0.15} />
        </mesh>
        {/* Card count text */}
        <Text position={[0, cards * 0.012 + 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.12} color="#fff" anchorX="center">
          {count || 0}
        </Text>
      </group>
    </Float>
  );
}

// ==========================================
// Premium Player Model
// ==========================================

function PlayerSeat({ position, rotation, name, hp, maxHp, status, isActive, isSelf, cardCount, slotIndex }) {
  const groupRef = useRef();
  const bodyRef = useRef();
  const glowRef = useRef();

  const bodyColor = useMemo(() => {
    const colors = ['#e74c3c', '#3498db', '#2ecc71', '#f39c12'];
    return status === 'dead' ? '#444' : colors[slotIndex % 4];
  }, [slotIndex, status]);

  const skinColor = status === 'dead' ? '#666' : '#f5d0a9';

  useFrame((state) => {
    if (!bodyRef.current) return;

    // Breathing animation
    const breathe = Math.sin(state.clock.getElapsedTime() * 1.5 + slotIndex) * 0.015;
    bodyRef.current.scale.y = 1 + breathe;
    bodyRef.current.position.y = 0.8 + breathe * 2;

    // Active glow pulse
    if (glowRef.current && isActive) {
      const pulse = 0.5 + Math.sin(state.clock.getElapsedTime() * 3) * 0.3;
      glowRef.current.material.emissiveIntensity = pulse;
    }
  });

  const hpPercent = hp / maxHp;
  const hpColor = hpPercent > 0.6 ? '#4caf50' : hpPercent > 0.3 ? '#ff9800' : '#f44336';

  return (
    <group position={position} rotation={rotation}>
      {/* Shadow circle */}
      <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.4, 32]} />
        <meshBasicMaterial color="#000" transparent opacity={0.25} />
      </mesh>

      {/* Active ring with glow */}
      {isActive && (
        <mesh ref={glowRef} position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.55, 0.04, 8, 32]} />
          <meshStandardMaterial color="#ffd700" emissive="#ffa000" emissiveIntensity={0.5} metalness={0.8} roughness={0.3} />
        </mesh>
      )}

      {/* Body */}
      <group ref={bodyRef} position={[0, 0.8, 0]}>
        {/* Torso */}
        <mesh castShadow>
          <capsuleGeometry args={[0.2, 0.45, 12, 20]} />
          <meshStandardMaterial
            color={bodyColor}
            roughness={0.6}
            metalness={0.05}
            transparent={status === 'dead'}
            opacity={status === 'dead' ? 0.35 : 1}
          />
        </mesh>
        {/* Collar detail */}
        <mesh position={[0, 0.28, 0]}>
          <torusGeometry args={[0.18, 0.03, 8, 16]} />
          <meshStandardMaterial color={bodyColor} roughness={0.5} metalness={0.1} />
        </mesh>
        {/* Arms */}
        <mesh position={[-0.28, 0, 0.05]} rotation={[0, 0, 0.2]} castShadow>
          <capsuleGeometry args={[0.06, 0.35, 8, 12]} />
          <meshStandardMaterial color={bodyColor} roughness={0.6} transparent={status === 'dead'} opacity={status === 'dead' ? 0.35 : 1} />
        </mesh>
        <mesh position={[0.28, 0, 0.05]} rotation={[0, 0, -0.2]} castShadow>
          <capsuleGeometry args={[0.06, 0.35, 8, 12]} />
          <meshStandardMaterial color={bodyColor} roughness={0.6} transparent={status === 'dead'} opacity={status === 'dead' ? 0.35 : 1} />
        </mesh>
      </group>

      {/* Head */}
      <mesh position={[0, 1.45, 0]} castShadow>
        <sphereGeometry args={[0.2, 20, 20]} />
        <meshStandardMaterial color={skinColor} roughness={0.65} />
      </mesh>
      {/* Hair */}
      <mesh position={[0, 1.58, -0.02]}>
        <sphereGeometry args={[0.18, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color={status === 'dead' ? '#555' : '#2a1a0a'} roughness={0.8} />
      </mesh>

      {/* Eyes */}
      {status !== 'dead' && (
        <>
          <mesh position={[-0.07, 1.48, 0.17]}>
            <sphereGeometry args={[0.03, 8, 8]} />
            <meshBasicMaterial color="#1a1a1a" />
          </mesh>
          <mesh position={[0.07, 1.48, 0.17]}>
            <sphereGeometry args={[0.03, 8, 8]} />
            <meshBasicMaterial color="#1a1a1a" />
          </mesh>
        </>
      )}
      {/* Dead X eyes */}
      {status === 'dead' && (
        <Text position={[0, 1.48, 0.19]} fontSize={0.12} color="#ff0000" anchorX="center">
          ✕ ✕
        </Text>
      )}

      {/* Name plate */}
      <group position={[0, 1.85, 0]}>
        {/* Background */}
        <mesh>
          <boxGeometry args={[name ? name.length * 0.1 + 0.3 : 0.8, 0.2, 0.02]} />
          <meshStandardMaterial color="#000" transparent opacity={0.6} />
        </mesh>
        <Text position={[0, 0.01, 0.02]} fontSize={0.12} color={isSelf ? '#4fc3f7' : '#fff'} anchorX="center" anchorY="middle">
          {name || '???'}
        </Text>
      </group>

      {/* HP bar 3D */}
      <group position={[0, 1.72, 0]}>
        {/* BG */}
        <mesh>
          <boxGeometry args={[0.7, 0.06, 0.015]} />
          <meshBasicMaterial color="#1a1a1a" transparent opacity={0.7} />
        </mesh>
        {/* Fill */}
        <mesh position={[-(0.7 - 0.7 * hpPercent) / 2, 0, 0.008]}>
          <boxGeometry args={[Math.max(0.01, 0.7 * hpPercent), 0.045, 0.008]} />
          <meshBasicMaterial color={hpColor} />
        </mesh>
        {/* HP text */}
        <Text position={[0.42, 0, 0.02]} fontSize={0.06} color="#aaa" anchorX="left">
          {hp}/{maxHp}
        </Text>
      </group>

      {/* Card count badge */}
      {cardCount > 0 && (
        <group position={[0.45, 1.45, 0]}>
          <mesh>
            <boxGeometry args={[0.22, 0.18, 0.02]} />
            <meshStandardMaterial color="#1565c0" roughness={0.3} />
          </mesh>
          <Text position={[0, 0, 0.02]} fontSize={0.1} color="#fff" anchorX="center">
            {cardCount}
          </Text>
        </group>
      )}
    </group>
  );
}

// ==========================================
// Atmospheric Effects
// ==========================================

function Atmosphere() {
  return (
    <>
      {/* Volumetric light cone from above */}
      <spotLight
        position={[0, 12, 0]}
        angle={0.5}
        penumbra={0.8}
        intensity={3}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        color="#ffeedd"
      />
      {/* Soft overhead fill */}
      <pointLight position={[0, 6, 0]} intensity={0.8} color="#ffeebb" distance={20} />
      {/* Rim lights */}
      <pointLight position={[6, 3, 6]} intensity={0.3} color="#4488ff" distance={15} />
      <pointLight position={[-6, 3, -6]} intensity={0.3} color="#ff6644" distance={15} />
      {/* Ambient */}
      <ambientLight intensity={0.45} />

      {/* Floating dust sparkles */}
      <Sparkles count={60} scale={[12, 6, 12]} size={1.5} speed={0.3} opacity={0.15} color="#ffd700" />
    </>
  );
}

// ==========================================
// Main 3D Scene
// ==========================================

function Scene({ players, currentTurn, socketId, gun, deckCount, getPlayerName, animState }) {
  const playerIds = Object.keys(players);
  const POSITIONS = [
    { pos: [0, 0, 5.5], rot: [0, Math.PI, 0] },       // bottom (self)
    { pos: [0, 0, -5.5], rot: [0, 0, 0] },             // top
    { pos: [5.5, 0, 0], rot: [0, -Math.PI / 2, 0] },   // right
    { pos: [-5.5, 0, 0], rot: [0, Math.PI / 2, 0] },    // left
  ];

  const selfIdx = playerIds.indexOf(socketId);
  const orderedIds = [];
  if (selfIdx >= 0) {
    for (let i = 0; i < playerIds.length; i++) {
      orderedIds.push(playerIds[(selfIdx + i) % playerIds.length]);
    }
  } else {
    orderedIds.push(...playerIds);
  }

  return (
    <>
      <Atmosphere />

      {/* Background */}
      <color attach="background" args={['#080a10']} />
      <fog attach="fog" args={['#080a10', 18, 40]} />

      {/* Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2.3, 0]} receiveShadow>
        <planeGeometry args={[60, 60]} />
        <meshStandardMaterial color="#0a0c14" roughness={0.95} metalness={0.05} />
      </mesh>
      {/* Subtle floor pattern */}
      <gridHelper args={[40, 80, '#0f1220', '#0d0f18']} position={[0, -2.29, 0]} />

      {/* Table */}
      <Table />

      {/* Gun */}
      <GunModel animState={animState} />

      {/* Deck */}
      <DeckStack count={deckCount} />

      {/* Players */}
      {orderedIds.map((pid, i) => {
        const slot = POSITIONS[i] || POSITIONS[0];
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
            slotIndex={i}
          />
        );
      })}

      {/* Camera controls */}
      <OrbitControls
        enablePan={false}
        enableZoom={true}
        minDistance={6}
        maxDistance={16}
        maxPolarAngle={Math.PI / 2.3}
        minPolarAngle={Math.PI / 6}
        target={[0, 0.5, 0]}
        enableDamping
        dampingFactor={0.05}
      />
    </>
  );
}

// ==========================================
// Premium HUD
// ==========================================

function RouletteHUD({
  socket, roomCode, phase, turnPhase, currentTurn, socketId,
  myHand, gun, timer, players, requiredShots, shotsFired,
  drawnCard, winner, onLeave, getPlayerName, turnDirection,
}) {
  const isMyTurn = currentTurn === socketId;
  const myPlayer = players[socketId];
  const alivePlayers = Object.entries(players).filter(([pid, p]) => p.status === 'alive' && pid !== socketId);

  const handleDraw = () => socket.emit('roulette-draw', { roomCode });
  const handleAimSelf = () => socket.emit('roulette-aim', { roomCode, targetId: 'self' });
  const handleAimOther = (targetId) => socket.emit('roulette-aim', { roomCode, targetId });
  const handleFire = () => socket.emit('roulette-fire', { roomCode });
  const handlePlayCard = (cardId) => socket.emit('roulette-play-card', { roomCode, cardId });

  const cardIcons = {
    skip: '⏭️', redirect: '🔀', reverse: '🔄', heal: '💚',
    addBullet: '💀', plusOne: '➕', spin: '🎰',
  };

  return (
    <div className="roulette-hud">
      {/* Top bar */}
      <div className="roulette-top-bar">
        <motion.button className="roulette-leave-btn" onClick={onLeave} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <ArrowLeft size={16} /> Rời phòng
        </motion.button>

        <div className="roulette-info-center">
          <div className="roulette-gun-info">
            🔫 Cấp {gun?.difficultyLevel || 1}
            <span className="bullet-count">{gun?.remaining || 0}/{gun?.totalChambers || 6}</span>
          </div>
          <div className={`roulette-turn-indicator ${isMyTurn ? 'my-turn' : ''}`}>
            {isMyTurn ? '🎯 Lượt của bạn!' : `⏳ Lượt: ${getPlayerName(currentTurn)}`}
          </div>
        </div>

        <div className="roulette-direction">
          {turnDirection === 1 ? '↻' : '↺'}
        </div>
      </div>

      {/* Timer */}
      {phase === 'playing' && (
        <div className="roulette-timer-container">
          <svg className="roulette-timer-ring" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="3" />
            <circle
              cx="50" cy="50" r="45"
              fill="none"
              stroke={timer <= 5 ? '#f44336' : timer <= 10 ? '#ff9800' : '#4caf50'}
              strokeWidth="3"
              strokeDasharray={`${(timer / 30) * 283} 283`}
              strokeLinecap="round"
              transform="rotate(-90 50 50)"
              style={{ transition: 'stroke-dasharray 1s linear, stroke 0.3s' }}
            />
          </svg>
          <span className={`roulette-timer-number ${timer <= 5 ? 'urgent' : ''}`}>{timer}</span>
        </div>
      )}

      {/* Action Buttons */}
      <AnimatePresence mode="wait">
        {isMyTurn && phase === 'playing' && (
          <motion.div className="roulette-actions" key={turnPhase} initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -20, opacity: 0 }} transition={{ duration: 0.3 }}>
            {turnPhase === 'draw' && (
              <motion.button className="roulette-action-btn draw" onClick={handleDraw} whileHover={{ scale: 1.08, y: -3 }} whileTap={{ scale: 0.95 }}>
                <span className="btn-icon">🃏</span>
                <span>Rút Bài</span>
              </motion.button>
            )}

            {turnPhase === 'choice' && (
              <div className="roulette-choice-panel">
                <motion.div className="choice-title" initial={{ scale: 0 }} animate={{ scale: 1 }}>🎯 Chọn mục tiêu</motion.div>
                <motion.button className="roulette-action-btn self" onClick={handleAimSelf} whileHover={{ scale: 1.05 }} initial={{ x: -30, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.1 }}>
                  <span className="btn-icon">🔫</span>
                  <div><span>Bắn bản thân</span><small>BLANK → thêm lượt!</small></div>
                </motion.button>
                {alivePlayers.map(([pid], i) => (
                  <motion.button key={pid} className="roulette-action-btn other" onClick={() => handleAimOther(pid)} whileHover={{ scale: 1.05 }} initial={{ x: 30, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.15 + i * 0.05 }}>
                    <span className="btn-icon">🎯</span>
                    <span>Bắn {getPlayerName(pid)}</span>
                  </motion.button>
                ))}
              </div>
            )}

            {(turnPhase === 'firing' || turnPhase === 'forced_fire') && (
              <div className="roulette-fire-panel">
                <div className="fire-count">💥 {shotsFired}/{requiredShots}</div>
                <motion.button
                  className="roulette-action-btn fire"
                  onClick={handleFire}
                  whileHover={{ scale: 1.12 }}
                  whileTap={{ scale: 0.9 }}
                  animate={{ boxShadow: ['0 0 20px rgba(255,0,0,0.3)', '0 0 40px rgba(255,0,0,0.6)', '0 0 20px rgba(255,0,0,0.3)'] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  <span className="btn-icon fire-icon">🔫</span>
                  <span>BẮN!</span>
                </motion.button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Card Hand */}
      <AnimatePresence>
        {myHand.length > 0 && isMyTurn && ['choice', 'forced_fire', 'firing'].includes(turnPhase) && (
          <motion.div className="roulette-hand" initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}>
            <div className="hand-label">Bài hỗ trợ</div>
            <div className="roulette-hand-cards">
              {myHand.map((card, i) => (
                <motion.button
                  key={card.id}
                  className="roulette-card-btn"
                  onClick={() => handlePlayCard(card.id)}
                  whileHover={{ y: -12, scale: 1.1, rotate: 0 }}
                  whileTap={{ scale: 0.9 }}
                  initial={{ y: 40, opacity: 0 }}
                  animate={{ y: 0, opacity: 1, rotate: (i - myHand.length / 2) * 3 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <span className="card-icon">{cardIcons[card.name] || '🃏'}</span>
                  <span className="card-label">{card.label}</span>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Drawn card notification */}
      <AnimatePresence>
        {drawnCard && (
          <motion.div
            className="roulette-drawn-card"
            initial={{ y: 60, opacity: 0, scale: 0.5, rotateX: 90 }}
            animate={{ y: 0, opacity: 1, scale: 1, rotateX: 0 }}
            exit={{ y: -40, opacity: 0, scale: 0.8 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          >
            <div className="drawn-card-inner">
              <span className="drawn-card-icon">{drawnCard.type === 'action' ? '⚡' : '🃏'}</span>
              <span className="drawn-card-text">
                {drawnCard.type === 'action' ? `Bắn ${drawnCard.value} lần!` : drawnCard.label}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Game Over */}
      <AnimatePresence>
        {phase === 'finished' && (
          <motion.div className="roulette-game-over" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <motion.div className="roulette-game-over-card" initial={{ scale: 0.5, y: 40 }} animate={{ scale: 1, y: 0 }} transition={{ type: 'spring', stiffness: 150, damping: 12 }}>
              <div className="game-over-icon">{winner === socketId ? '🏆' : '💀'}</div>
              <h2>{winner === socketId ? 'Chiến thắng!' : `${getPlayerName(winner)} thắng!`}</h2>
              <p>Quay lại sảnh chờ trong giây lát...</p>
              <div className="game-over-divider" />
              <div className="game-over-stats">
                {Object.entries(players).map(([pid, p]) => (
                  <div key={pid} className={`stat-row ${pid === winner ? 'winner' : ''}`}>
                    <span>{getPlayerName(pid)}</span>
                    <span>{p.hp > 0 ? `❤️ ${p.hp}` : '☠️'}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Player list sidebar */}
      <div className="roulette-player-list">
        {Object.entries(players).map(([pid, p]) => (
          <motion.div
            key={pid}
            className={`roulette-player-item ${pid === currentTurn ? 'active' : ''} ${p.status === 'dead' ? 'dead' : ''}`}
            layout
            animate={pid === currentTurn ? { borderColor: '#ffd700' } : {}}
          >
            <div className="player-info-row">
              <span className="player-name">{getPlayerName(pid)}{pid === socketId ? ' (Bạn)' : ''}</span>
              {pid === currentTurn && <span className="turn-badge">▶</span>}
            </div>
            <div className="player-hp-visual">
              {Array.from({ length: p.maxHp }, (_, i) => (
                <span key={i} className={`hp-pip ${i < p.hp ? 'filled' : 'empty'}`} />
              ))}
            </div>
            {p.cardCount > 0 && <span className="player-cards">🃏 {p.cardCount}</span>}
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ==========================================
// Main Page
// ==========================================

export default function RoulettePage({ socket, roomInfo, onLeave, initialState }) {
  const store = useRouletteStore();
  const socketId = socket.id;

  const getPlayerName = useCallback((pid) => {
    if (!roomInfo) return pid?.slice(0, 6);
    const p = roomInfo.players?.find(p => p.id === pid);
    return p?.nickname || pid?.slice(0, 6);
  }, [roomInfo]);

  useEffect(() => {
    if (initialState) store.syncState(initialState);
  }, [initialState]);

  useEffect(() => {
    socket.on('roulette-state', (state) => store.syncState(state));
    socket.on('roulette-draw-result', (data) => store.onDrawResult(data));
    socket.on('roulette-aim-result', (data) => store.onAimResult(data));
    socket.on('roulette-fire-result', (data) => {
      store.onFireResult(data);
      setTimeout(() => store.setAnimState('idle'), 1800);
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
        camera={{ position: [0, 9, 11], fov: 45 }}
        gl={{
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.1,
        }}
        dpr={[1, 2]}
      >
        <Suspense fallback={null}>
          <Scene
            players={store.players}
            currentTurn={store.currentTurn}
            socketId={socketId}
            gun={store.gun}
            deckCount={store.deckCount}
            getPlayerName={getPlayerName}
            animState={store.animState}
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
