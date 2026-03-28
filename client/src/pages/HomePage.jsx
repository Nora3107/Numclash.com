import { useState, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Users } from 'lucide-react';
import { useLang } from '../i18n';
import LOBBY_CARDS from '../data/lobbyCards';
import { sfxHover, sfxClick, sfxCardFlip, sfxSlide } from '../sounds/gameSfx';
import './homePage.css';

/*
  ┌──────────────────────────────────────────────────────────────┐
  │  CAROUSEL LOGIC:                                             │
  │                                                              │
  │  activeIndex = card hiện tại ở trung tâm                    │
  │  Mỗi card được tính offset = i - activeIndex                │
  │                                                              │
  │  offset  0: scale 1.0, opacity 1, zIndex 30  (trung tâm)    │
  │  offset ±1: scale 0.82, opacity 0.7, zIndex 20              │
  │  offset ±2: scale 0.65, opacity 0.35, zIndex 10             │
  │  offset ≥3: ẩn                                               │
  │                                                              │
  │  Khi hover card trung tâm: 3D flip rotateY(180°)            │
  │  Cards bên cạnh: chỉ scale + translate, ko flip             │
  │                                                              │
  │  Nav: mũi tên trái/phải hoặc click card bên cạnh            │
  └──────────────────────────────────────────────────────────────┘
*/

// Particle generator
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

// Card spacing in px
const CARD_GAP = 160;

export default function HomePage({ nickname, setNickname, onEnterLobby }) {
  const [activeIndex, setActiveIndex] = useState(2); // Start on Old Maid (center)
  const [flippedCard, setFlippedCard] = useState(null);
  const [nicknameError, setNicknameError] = useState(false);
  const { t, lang } = useLang();
  const particles = useMemo(() => makeParticles(35), []);

  const ok = useCallback(() => {
    if (!nickname.trim()) { setNicknameError(true); setTimeout(() => setNicknameError(false), 3000); return false; }
    setNicknameError(false); return true;
  }, [nickname]);

  const slideLeft = () => { setActiveIndex(i => Math.max(0, i - 1)); sfxSlide(); };
  const slideRight = () => { setActiveIndex(i => Math.min(LOBBY_CARDS.length - 1, i + 1)); sfxSlide(); };

  // Mouse wheel scrolling with cooldown
  const wheelCooldown = useRef(false);
  const handleWheel = useCallback((e) => {
    if (wheelCooldown.current) return;
    if (Math.abs(e.deltaY) < 15 && Math.abs(e.deltaX) < 15) return;
    wheelCooldown.current = true;
    if (e.deltaY > 0 || e.deltaX > 0) slideLeft();
    else slideRight();
    setTimeout(() => { wheelCooldown.current = false; }, 150);
  }, []);

  return (
    <div className="dark-home">
      {/* Particles */}
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

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center px-4 pb-12" style={{ paddingTop: '40px' }}>

        {/* Logo */}
        <motion.div
          initial={{ y: -30, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.7 }}
          className="text-center" style={{ marginBottom: '18px' }}
        >
          <h1 className="neon-logo text-5xl md:text-7xl">
            SUCK<span className="accent" style={{ color: '#ff7eb3' }}>CARD</span>
            <span className="text-lg md:text-xl" style={{ color: 'rgba(0,220,255,0.5)', marginLeft: 4 }}>.com</span>
          </h1>
        </motion.div>

        {/* Nickname */}
        <motion.div
          initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }}
          className="w-full max-w-sm flex items-center gap-3" style={{ marginBottom: '24px' }}
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

        <AnimatePresence>
          {nicknameError && (
            <motion.p initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="text-xs font-bold text-center"
              style={{ color: '#ff5050', marginBottom: 10, textShadow: '0 0 8px rgba(255,80,80,0.4)' }}
            >{t('enterNickname')}</motion.p>
          )}
        </AnimatePresence>

        {/* Divider */}
        <motion.div
          initial={{ opacity: 0, scaleX: 0 }} animate={{ opacity: 1, scaleX: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="dark-divider flex items-center gap-4 w-full max-w-2xl" style={{ marginBottom: '16px' }}
        >
          <div className="flex-1 h-px" style={{ background: 'linear-gradient(to right, transparent, rgba(255,255,255,0.1), transparent)' }} />
          <span>{t('chooseMode')}</span>
          <div className="flex-1 h-px" style={{ background: 'linear-gradient(to right, transparent, rgba(255,255,255,0.1), transparent)' }} />
        </motion.div>

        {/* ═══════ CAROUSEL ═══════ */}
        <div className="carousel-viewport" onWheel={handleWheel}>
          {/* Left arrow */}
          {activeIndex > 0 && (
            <button
              type="button"
              className="carousel-arrow left"
              onClick={(e) => { e.preventDefault(); slideLeft(); }}
            >
              <ChevronLeft size={22} />
            </button>
          )}
          {/* Right arrow */}
          {activeIndex < LOBBY_CARDS.length - 1 && (
            <button
              type="button"
              className="carousel-arrow right"
              onClick={(e) => { e.preventDefault(); slideRight(); }}
            >
              <ChevronRight size={22} />
            </button>
          )}

          {/* Cards */}
          {LOBBY_CARDS.map((card, i) => {
            const offset = i - activeIndex;
            const absOff = Math.abs(offset);
            if (absOff > 2) return null; // Only render visible cards

            const isCenter = offset === 0;
            const isFlipped = flippedCard === card.key && isCenter && card.enabled;


            // Carousel transforms
            const scale = isCenter ? 1 : absOff === 1 ? 0.82 : 0.65;
            const opacity = card.enabled
              ? (isCenter ? 1 : absOff === 1 ? 0.6 : 0.3)
              : (isCenter ? 0.5 : 0.2);
            const x = offset * CARD_GAP;
            const z = isCenter ? 30 : absOff === 1 ? 20 : 10;
            const rotate = isCenter ? 0 : offset * 4;
            const yOff = isCenter ? 0 : absOff * 10;

            return (
              <motion.div
                key={card.key}
                className={`flip-card ${!card.enabled ? 'disabled' : ''}`}
                style={{ '--card-glow': card.glow, zIndex: z }}
                animate={{
                  x,
                  y: isFlipped ? -12 : yOff,
                  scale: isFlipped ? 1.1 : scale,
                  rotate: isFlipped ? 0 : rotate,
                  opacity,
                }}
                transition={{ type: 'spring', stiffness: 200, damping: 22 }}
                onHoverStart={() => { if (isCenter && card.enabled) { setFlippedCard(card.key); sfxCardFlip(); } }}
                onHoverEnd={() => { setFlippedCard(null); }}
                onClick={() => {
                  if (!isCenter && absOff === 1) { setActiveIndex(i); sfxSlide(); return; }
                  // Mobile: tap center card to toggle flip
                  if (isCenter && card.enabled) {
                    setFlippedCard(prev => { const next = prev === card.key ? null : card.key; if (next) sfxCardFlip(); return next; });
                  }
                }}
              >
                {/* Inner — rotates for 3D flip */}
                <motion.div
                  className="flip-card-inner"
                  animate={{ rotateY: isFlipped ? 180 : 0 }}
                  transition={{ duration: 0.55, ease: [0.4, 0, 0.2, 1] }}
                >

                  {/* ════════ FRONT ════════ */}
                  <div className="flip-card-front">
                    {/* Top-left corner */}
                    <div className="card-corner tl">
                      <span className="rank">{card.rank}</span>
                      {card.suit && <span className="suit-icon">{card.suit}</span>}
                    </div>
                    {/* Bottom-right corner */}
                    <div className="card-corner br">
                      <span className="rank">{card.rank}</span>
                      {card.suit && <span className="suit-icon">{card.suit}</span>}
                    </div>
                    {/* Center symbol */}
                    <div className="card-symbol">{card.symbol}</div>
                    <div className="card-mode-name">{t(`mode_${card.key}`) || card.key}</div>
                    <div className="card-players">{card.players} {lang === 'vi' ? 'người' : 'players'}</div>

                    {/* Coming soon badge for disabled cards */}
                    {!card.enabled && <div className="coming-soon-badge">Coming Soon</div>}
                  </div>

                  {/* ════════ BACK ════════ */}
                  <div className="flip-card-back">
                    <div className="back-title">{t(`mode_${card.key}`) || card.key}</div>
                    <div className="back-desc">{t(`modeDesc_${card.key}`) || 'Coming soon...'}</div>

                    <div className="back-actions">
                      <button
                        className="card-btn create"
                        style={{ padding: '12px 0', fontSize: '14px', letterSpacing: '1px' }}
                        onClick={e => {
                          e.stopPropagation();
                          sfxClick();
                          if (!nickname.trim()) { setNicknameError(true); return; }
                          onEnterLobby(card.key);
                        }}
                      >
                        {t('enterLobby')} →
                      </button>
                    </div>
                  </div>

                </motion.div>
              </motion.div>
            );
          })}
        </div>

        {/* Dot indicators */}
        <div className="flex gap-2" style={{ marginTop: '10px', marginBottom: '16px' }}>
          {LOBBY_CARDS.map((card, i) => (
            <button
              key={card.key}
              onClick={() => setActiveIndex(i)}
              className="rounded-full transition-all duration-300"
              style={{
                width: i === activeIndex ? 24 : 8,
                height: 8,
                background: i === activeIndex ? card.glow : 'rgba(255,255,255,0.15)',
                border: 'none',
                cursor: 'pointer',
                boxShadow: i === activeIndex ? `0 0 8px ${card.glow}` : 'none',
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
