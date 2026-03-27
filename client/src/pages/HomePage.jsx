import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Crown, Users, ArrowLeft } from 'lucide-react';
import { useLang } from '../i18n';
import './homePage.css';

/*
  ┌─────────────────────────────────────────────────────────┐
  │  3D FLIP CARD — Cơ chế hoạt động:                      │
  │                                                         │
  │  .flip-card          → perspective: 1000px              │
  │    └─ .flip-card-inner → transform-style: preserve-3d   │
  │         ├─ .flip-card-front → backface-visibility:hidden │
  │         └─ .flip-card-back  → backface-visibility:hidden │
  │                               + rotateY(180deg)          │
  │                                                         │
  │  Khi hover: inner rotateY(180deg)                       │
  │  → front quay mặt vào (ẩn) → back quay mặt ra (hiện)  │
  └─────────────────────────────────────────────────────────┘
*/

// ── 5 Playing Cards — mỗi lá đại diện 1 chế độ chơi ──
const CARDS = [
  { key: 'classic',  rank: 'A', suit: '♠', symbol: '♠', players: '4-8', isJoker: false },
  { key: 'average',  rank: 'K', suit: '♦', symbol: '♦', players: '4-8', isJoker: false },
  { key: 'oldmaid',  rank: '🃏', suit: '',  symbol: '🃏', players: '2-6', isJoker: true },
  { key: 'liardeck', rank: 'J', suit: '♥', symbol: '♥', players: '2-6', isJoker: false },
  { key: 'poker',    rank: 'K', suit: '♣', symbol: '♣', players: '2-6', isJoker: false },
];

// Góc xòe hình quạt + Y offset cho mỗi lá
const FAN_ANGLES  = [-14, -7, 0, 7, 14];
const FAN_Y       = [12, 4, 0, 4, 12];

// ── Tạo hạt bụi neon ──
function makeParticles(n) {
  return Array.from({ length: n }, (_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    size: 1.5 + Math.random() * 2.5,
    dur: 8 + Math.random() * 14,
    delay: Math.random() * 12,
    drift: `${(Math.random() - 0.5) * 80}px`,
    opacity: 0.12 + Math.random() * 0.22,
  }));
}

export default function HomePage({ nickname, setNickname, onCreateRoom, onJoinRoom, publicRooms = [] }) {
  const [joinCode, setJoinCode] = useState('');
  const [activeJoin, setActiveJoin] = useState(null);   // which card's join input is open
  const [flippedCard, setFlippedCard] = useState(null); // which card is flipped
  const [nicknameError, setNicknameError] = useState(false);
  const { t, lang } = useLang();
  const particles = useMemo(() => makeParticles(35), []);

  const ok = () => {
    if (!nickname.trim()) { setNicknameError(true); setTimeout(() => setNicknameError(false), 3000); return false; }
    setNicknameError(false); return true;
  };

  const handleCreate = (mode) => { if (ok()) onCreateRoom(mode); };

  const handleJoinSubmit = (code) => {
    if (ok() && code.trim().length >= 4) {
      onJoinRoom(code.trim());
      setActiveJoin(null); setJoinCode('');
    }
  };

  return (
    <div className="dark-home">
      {/* ── Particles ── */}
      <div className="particle-field">
        {particles.map(p => (
          <span key={p.id} className="particle" style={{
            left: p.left, width: p.size, height: p.size,
            animationDuration: `${p.dur}s`, animationDelay: `${p.delay}s`,
            opacity: p.opacity, '--drift': p.drift,
          }} />
        ))}
      </div>
      <div className="fog-overlay" />

      {/* ── Content ── */}
      <div className="relative z-10 flex flex-col items-center px-4 pb-12" style={{ paddingTop: '44px' }}>

        {/* Logo */}
        <motion.div
          initial={{ y: -30, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.7 }}
          className="text-center" style={{ marginBottom: '20px' }}
        >
          <h1 className="neon-logo text-5xl md:text-7xl">
            SUCK<span className="accent" style={{ color: '#ff7eb3' }}>CARD</span>
            <span className="text-lg md:text-xl" style={{ color: 'rgba(0,220,255,0.5)', marginLeft: 4 }}>.com</span>
          </h1>
        </motion.div>

        {/* Nickname */}
        <motion.div
          initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.12 }}
          className="w-full max-w-sm flex items-center gap-3" style={{ marginBottom: '30px' }}
        >
          <input
            type="text" value={nickname}
            onChange={e => { setNickname(e.target.value.slice(0, 12)); setNicknameError(false); }}
            placeholder={t('nicknamePlaceholder')}
            className={`dark-input flex-1 ${nicknameError ? 'error' : ''}`}
            maxLength={12}
          />
          <span className="text-xs font-bold" style={{ color: 'rgba(255,255,255,0.2)', minWidth: 28 }}>{nickname.length}/12</span>
        </motion.div>

        {/* Nickname error */}
        <AnimatePresence>
          {nicknameError && (
            <motion.p initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="text-xs font-bold text-center"
              style={{ color: '#ff5050', marginBottom: 12, textShadow: '0 0 8px rgba(255,80,80,0.4)' }}
            >{t('enterNickname')}</motion.p>
          )}
        </AnimatePresence>

        {/* Divider */}
        <motion.div
          initial={{ opacity: 0, scaleX: 0 }} animate={{ opacity: 1, scaleX: 1 }}
          transition={{ delay: 0.22, duration: 0.5 }}
          className="dark-divider flex items-center gap-4 w-full max-w-2xl" style={{ marginBottom: '32px' }}
        >
          <div className="flex-1 h-px" style={{ background: 'linear-gradient(to right, transparent, rgba(255,255,255,0.1), transparent)' }} />
          <span>{t('chooseMode')}</span>
          <div className="flex-1 h-px" style={{ background: 'linear-gradient(to right, transparent, rgba(255,255,255,0.1), transparent)' }} />
        </motion.div>

        {/* ═══════════════════════════════════════════
            THE CARD FAN — 5 lá bài 3D Flip
            ═══════════════════════════════════════════ */}
        <div className="flex items-end justify-center gap-2 md:gap-4" style={{ minHeight: '340px', marginBottom: '20px' }}>
          {CARDS.map((card, i) => {
            const isFlipped = flippedCard === card.key;
            const isJoining = activeJoin === card.key;

            return (
              <motion.div
                key={card.key}
                className="flip-card"
                data-mode={card.key}
                // ── Fan-spread + floating idle ──
                initial={{ opacity: 0, y: 60, rotate: FAN_ANGLES[i] }}
                animate={{
                  opacity: 1,
                  rotate: isFlipped ? 0 : FAN_ANGLES[i],
                  y: isFlipped ? -16 : FAN_Y[i],
                  scale: isFlipped ? 1.12 : 1,
                  zIndex: isFlipped ? 50 : 10 - Math.abs(i - 2),
                }}
                transition={
                  isFlipped
                    ? { type: 'spring', stiffness: 180, damping: 18 }
                    : { duration: 0.5, delay: 0.12 + i * 0.07 }
                }
                onHoverStart={() => setFlippedCard(card.key)}
                onHoverEnd={() => {
                  setFlippedCard(null);
                  if (!isJoining) { setActiveJoin(null); setJoinCode(''); }
                }}
              >
                {/* Inner container — this rotates for the 3D flip */}
                <motion.div
                  className="flip-card-inner"
                  animate={{ rotateY: isFlipped ? 180 : 0 }}
                  transition={{ duration: 0.55, ease: [0.4, 0, 0.2, 1] }}
                >

                  {/* ════════════ FRONT FACE ════════════ */}
                  <div className="flip-card-front">
                    {card.isJoker ? (
                      <>
                        {/* 
                          JOKER CARD IMAGE — Thay đổi src thành ảnh Joker thực tế
                          Đặt file Joker_card.png vào thư mục /client/src/assets/
                        */}
                        <img
                          src="/Joker_card.png"
                          alt="Joker"
                          className="joker-card-img"
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                        <div className="joker-overlay" />
                        {/* Fallback symbol nếu chưa có ảnh */}
                        <div className="card-symbol" style={{ zIndex: 3 }}>{card.symbol}</div>
                      </>
                    ) : (
                      <>
                        <div className="card-corner tl">
                          <span className="rank">{card.rank}</span>
                          <span className="suit-icon">{card.suit}</span>
                        </div>
                        <div className="card-corner br">
                          <span className="rank">{card.rank}</span>
                          <span className="suit-icon">{card.suit}</span>
                        </div>
                        <div className="card-symbol">{card.symbol}</div>
                      </>
                    )}
                    <div className="card-mode-name">{t(`mode_${card.key}`)}</div>
                    <div className="card-players">{card.players} {lang === 'vi' ? 'người' : 'players'}</div>
                  </div>

                  {/* ════════════ BACK FACE (hiện khi lật) ════════════ */}
                  <div className="flip-card-back">
                    <div className="back-title">{t(`mode_${card.key}`)}</div>
                    <div className="back-desc">{t(`modeDesc_${card.key}`)}</div>

                    <div className="back-actions">
                      <AnimatePresence mode="wait">
                        {isJoining ? (
                          <motion.div
                            key="join-form"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0 }}
                          >
                            <input
                              type="text" value={joinCode}
                              onChange={e => setJoinCode(e.target.value.toUpperCase().slice(0, 4))}
                              placeholder="ABCD" className="card-join-input"
                              maxLength={4} autoFocus
                              onKeyDown={e => e.key === 'Enter' && handleJoinSubmit(joinCode)}
                              onClick={e => e.stopPropagation()}
                            />
                            <div className="flex gap-2" style={{ marginTop: 6 }}>
                              <button className="card-btn join-btn flex-1"
                                onClick={e => { e.stopPropagation(); setActiveJoin(null); setJoinCode(''); }}>
                                <ArrowLeft size={12} />
                              </button>
                              <button className="card-btn create flex-1"
                                onClick={e => { e.stopPropagation(); handleJoinSubmit(joinCode); }}
                                disabled={joinCode.length < 4}
                                style={{ opacity: joinCode.length < 4 ? 0.4 : 1 }}>
                                {t('join')} →
                              </button>
                            </div>
                          </motion.div>
                        ) : (
                          <motion.div
                            key="actions"
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="flex flex-col gap-2"
                          >
                            <button className="card-btn create"
                              onClick={e => { e.stopPropagation(); handleCreate(card.key); }}>
                              <Crown size={13} /> {t('createRoom')}
                            </button>
                            <button className="card-btn join-btn"
                              onClick={e => { e.stopPropagation(); if (ok()) { setActiveJoin(card.key); setJoinCode(''); } }}>
                              <Users size={13} /> {t('joinRoom')}
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>

                </motion.div>
              </motion.div>
            );
          })}
        </div>

        {/* ── Public Rooms ── */}
        {publicRooms.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }}
            className="w-full max-w-lg" style={{ marginTop: 20 }}>
            <h3 className="dark-divider text-center" style={{ marginBottom: 14 }}>🏠 {t('publicRooms')}</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {publicRooms.map(room => (
                <motion.button key={room.code}
                  whileHover={{ scale: 1.04, y: -2 }} whileTap={{ scale: 0.97 }}
                  onClick={() => { if (!ok()) return; onJoinRoom(room.code); }}
                  className="dark-room-card">
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
