import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Crown, Users, ArrowLeft } from 'lucide-react';
import { useLang } from '../i18n';
import './homePage.css';

// ── Card data: suits, symbols, glows ──
const CARDS = [
  {
    key: 'classic',
    rank: 'A',
    suit: '♠',
    suitName: 'spades',
    symbol: '♠',
    players: '4-8',
  },
  {
    key: 'average',
    rank: 'K',
    suit: '♦',
    suitName: 'diamonds',
    symbol: '♦',
    players: '4-8',
  },
  {
    key: 'oldmaid',
    rank: '🃏',
    suit: '',
    suitName: 'joker',
    symbol: '🃏',
    players: '2-6',
  },
  {
    key: 'liardeck',
    rank: 'J',
    suit: '♥',
    suitName: 'hearts',
    symbol: '♥',
    players: '2-6',
  },
  {
    key: 'poker',
    rank: 'K',
    suit: '♣',
    suitName: 'clubs',
    symbol: '♣',
    players: '2-6',
  },
];

// ── Fan-out angles for card spread ──
const FAN_ANGLES = [-16, -8, 0, 8, 16];
const FAN_Y_OFFSETS = [10, 2, 0, 2, 10];

// ── Floating animation variants (each card has offset timing) ──
const floatVariant = (i) => ({
  animate: {
    y: [0, -8, 0, 6, 0],
    rotate: [FAN_ANGLES[i], FAN_ANGLES[i] + 1, FAN_ANGLES[i], FAN_ANGLES[i] - 1, FAN_ANGLES[i]],
  },
  transition: {
    duration: 4 + i * 0.6,
    repeat: Infinity,
    ease: 'easeInOut',
  },
});

// ── Generate random particles ──
function generateParticles(count) {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    size: 1.5 + Math.random() * 2.5,
    duration: 8 + Math.random() * 12,
    delay: Math.random() * 10,
    drift: `${(Math.random() - 0.5) * 80}px`,
    opacity: 0.15 + Math.random() * 0.25,
  }));
}

export default function HomePage({ nickname, setNickname, onCreateRoom, onJoinRoom, publicRooms = [] }) {
  const [joinCode, setJoinCode] = useState('');
  const [activeJoin, setActiveJoin] = useState(null);
  const [hoveredCard, setHoveredCard] = useState(null);
  const [nicknameError, setNicknameError] = useState(false);
  const { t, lang } = useLang();
  const particles = useMemo(() => generateParticles(40), []);

  const validateNickname = () => {
    if (!nickname.trim()) {
      setNicknameError(true);
      setTimeout(() => setNicknameError(false), 3000);
      return false;
    }
    setNicknameError(false);
    return true;
  };

  const handleCreate = (mode) => {
    if (validateNickname()) onCreateRoom(mode);
  };

  const handleJoinSubmit = (code) => {
    if (validateNickname() && code.trim().length >= 4) {
      onJoinRoom(code.trim());
      setActiveJoin(null);
      setJoinCode('');
    }
  };

  return (
    <div className="dark-home">
      {/* Particle field */}
      <div className="particle-field">
        {particles.map((p) => (
          <span
            key={p.id}
            className="particle"
            style={{
              left: p.left,
              width: p.size,
              height: p.size,
              animationDuration: `${p.duration}s`,
              animationDelay: `${p.delay}s`,
              opacity: p.opacity,
              '--drift': p.drift,
            }}
          />
        ))}
      </div>

      {/* Fog overlay */}
      <div className="fog-overlay" />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center px-4 pb-12" style={{ paddingTop: '48px' }}>

        {/* Logo */}
        <motion.div
          initial={{ y: -30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.7 }}
          className="text-center"
          style={{ marginBottom: '24px' }}
        >
          <h1 className="neon-logo text-5xl md:text-7xl">
            SUCK<span className="accent" style={{ color: '#ff7eb3' }}>CARD</span>
            <span className="text-lg md:text-xl" style={{ color: 'rgba(0,220,255,0.5)', marginLeft: '4px' }}>.com</span>
          </h1>
        </motion.div>

        {/* Nickname input */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.15 }}
          className="w-full max-w-sm flex items-center gap-3"
          style={{ marginBottom: '36px' }}
        >
          <input
            type="text"
            value={nickname}
            onChange={(e) => { setNickname(e.target.value.slice(0, 12)); setNicknameError(false); }}
            placeholder={t('nicknamePlaceholder')}
            className={`dark-input flex-1 ${nicknameError ? 'error' : ''}`}
            maxLength={12}
          />
          <span className="text-xs font-bold" style={{ color: 'rgba(255,255,255,0.2)', minWidth: 28 }}>
            {nickname.length}/12
          </span>
        </motion.div>

        {/* Divider */}
        <motion.div
          initial={{ opacity: 0, scaleX: 0 }}
          animate={{ opacity: 1, scaleX: 1 }}
          transition={{ delay: 0.25, duration: 0.5 }}
          className="dark-divider flex items-center gap-4 w-full max-w-2xl"
          style={{ marginBottom: '36px' }}
        >
          <div className="flex-1 h-px" style={{ background: 'linear-gradient(to right, transparent, rgba(255,255,255,0.1), transparent)' }} />
          <span>{t('chooseMode')}</span>
          <div className="flex-1 h-px" style={{ background: 'linear-gradient(to right, transparent, rgba(255,255,255,0.1), transparent)' }} />
        </motion.div>

        {/* ── CARD FAN ── */}
        <div
          className="flex items-end justify-center gap-3 md:gap-5"
          style={{ minHeight: '340px', marginBottom: '24px' }}
        >
          {CARDS.map((card, i) => {
            const isHovered = hoveredCard === card.key;
            const isJoining = activeJoin === card.key;
            const float = floatVariant(i);

            return (
              <motion.div
                key={card.key}
                className="game-card"
                data-mode={card.key}
                initial={{ opacity: 0, y: 60, rotate: FAN_ANGLES[i] }}
                animate={{
                  opacity: 1,
                  y: isHovered ? -20 + FAN_Y_OFFSETS[i] : FAN_Y_OFFSETS[i],
                  rotate: isHovered ? 0 : FAN_ANGLES[i],
                  scale: isHovered ? 1.12 : 1,
                  zIndex: isHovered ? 50 : 10 - Math.abs(i - 2),
                  ...(!isHovered ? float.animate : {}),
                }}
                transition={isHovered
                  ? { type: 'spring', stiffness: 200, damping: 18 }
                  : { ...float.transition, opacity: { duration: 0.5, delay: 0.15 + i * 0.08 }, y: { duration: 0.5, delay: 0.15 + i * 0.08 } }
                }
                onHoverStart={() => setHoveredCard(card.key)}
                onHoverEnd={() => { setHoveredCard(null); if (!isJoining) { setActiveJoin(null); setJoinCode(''); } }}
              >
                <div className="game-card-inner">
                  {/* Corner labels */}
                  <div className="card-corner tl">
                    <span className="rank">{card.rank}</span>
                    {card.suit && <span className="suit">{card.suit}</span>}
                  </div>
                  <div className="card-corner br">
                    <span className="rank">{card.rank}</span>
                    {card.suit && <span className="suit">{card.suit}</span>}
                  </div>

                  {/* Center symbol */}
                  <div className="card-symbol">{card.symbol}</div>
                  <div className="card-mode-name">{t(`mode_${card.key}`)}</div>
                  <div className="card-players">{card.players} {lang === 'vi' ? 'người' : 'players'}</div>

                  {/* Hover overlay — desc + buttons */}
                  <AnimatePresence>
                    {isHovered && (
                      <motion.div
                        className={`card-overlay ${isHovered ? 'active' : ''}`}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        transition={{ duration: 0.25 }}
                      >
                        <p className="desc">{t(`modeDesc_${card.key}`)}</p>

                        <AnimatePresence mode="wait">
                          {isJoining ? (
                            <motion.div
                              key="join-form"
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0 }}
                            >
                              <input
                                type="text"
                                value={joinCode}
                                onChange={(e) => setJoinCode(e.target.value.toUpperCase().slice(0, 4))}
                                placeholder="ABCD"
                                className="card-join-input"
                                maxLength={4}
                                autoFocus
                                onKeyDown={(e) => e.key === 'Enter' && handleJoinSubmit(joinCode)}
                                onClick={(e) => e.stopPropagation()}
                              />
                              <div className="flex gap-2" style={{ marginTop: '6px' }}>
                                <button
                                  className="card-btn join flex-1"
                                  onClick={(e) => { e.stopPropagation(); setActiveJoin(null); setJoinCode(''); }}
                                >
                                  <ArrowLeft size={12} />
                                </button>
                                <button
                                  className="card-btn create flex-1"
                                  onClick={(e) => { e.stopPropagation(); handleJoinSubmit(joinCode); }}
                                  disabled={joinCode.length < 4}
                                  style={{ opacity: joinCode.length < 4 ? 0.4 : 1 }}
                                >
                                  {t('join')} →
                                </button>
                              </div>
                            </motion.div>
                          ) : (
                            <motion.div
                              key="buttons"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              className="flex flex-col gap-2"
                            >
                              <button
                                className="card-btn create"
                                onClick={(e) => { e.stopPropagation(); handleCreate(card.key); }}
                              >
                                <Crown size={13} />
                                {t('createRoom')}
                              </button>
                              <button
                                className="card-btn join"
                                onClick={(e) => { e.stopPropagation(); if (validateNickname()) { setActiveJoin(card.key); setJoinCode(''); } }}
                              >
                                <Users size={13} />
                                {t('joinRoom')}
                              </button>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Nickname error toast */}
        <AnimatePresence>
          {nicknameError && (
            <motion.p
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-xs font-bold text-center"
              style={{ color: '#ff5050', marginBottom: '16px', textShadow: '0 0 8px rgba(255,80,80,0.4)' }}
            >
              {t('enterNickname')}
            </motion.p>
          )}
        </AnimatePresence>

        {/* Public Rooms */}
        {publicRooms.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="w-full max-w-lg"
            style={{ marginTop: '20px' }}
          >
            <h3 className="dark-divider text-center" style={{ marginBottom: '14px' }}>
              🏠 {t('publicRooms')}
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {publicRooms.map((room) => (
                <motion.button
                  key={room.code}
                  whileHover={{ scale: 1.04, y: -2 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => { if (!validateNickname()) return; onJoinRoom(room.code); }}
                  className="dark-room-card"
                >
                  <span className="text-xs font-bold w-full text-center overflow-hidden whitespace-nowrap text-ellipsis" style={{ color: 'rgba(255,255,255,0.5)' }}>
                    {room.roomName}
                  </span>
                  <Users size={22} style={{ color: 'rgba(255,255,255,0.3)' }} strokeWidth={1.5} />
                  <span className="text-sm font-black" style={{ color: 'rgba(255,255,255,0.6)' }}>
                    {room.playerCount}/{room.maxPlayers}
                  </span>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
