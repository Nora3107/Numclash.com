import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Crown, Users, BookOpen, X, ArrowLeft } from 'lucide-react';
import { useLang } from '../i18n';

const GAME_MODES = [
  {
    key: 'classic',
    icon: '🎯',
    gradient: 'linear-gradient(135deg, #2bb5a0 0%, #1a8070 100%)',
    glow: 'rgba(43,181,160,0.25)',
    border: '#2bb5a0',
    players: '4-8',
  },
  {
    key: 'average',
    icon: '📊',
    gradient: 'linear-gradient(135deg, #60b5ff 0%, #3a8fd6 100%)',
    glow: 'rgba(96,181,255,0.25)',
    border: '#60b5ff',
    players: '4-8',
  },
  {
    key: 'oldmaid',
    icon: '🃏',
    gradient: 'linear-gradient(135deg, #a78bfa 0%, #7c5cbf 100%)',
    glow: 'rgba(167,139,250,0.25)',
    border: '#a78bfa',
    players: '2-6',
  },
  {
    key: 'liardeck',
    icon: '🤥',
    gradient: 'linear-gradient(135deg, #ff9a56 0%, #e07830 100%)',
    glow: 'rgba(255,154,86,0.25)',
    border: '#ff9a56',
    players: '2-6',
  },
  {
    key: 'poker',
    icon: '♠️',
    gradient: 'linear-gradient(135deg, #ff6b6b 0%, #e54d4d 100%)',
    glow: 'rgba(255,107,107,0.25)',
    border: '#ff6b6b',
    players: '2-6',
  },
];

export default function HomePage({ nickname, setNickname, onCreateRoom, onJoinRoom, publicRooms = [] }) {
  const [joinCode, setJoinCode] = useState('');
  const [activeJoin, setActiveJoin] = useState(null); // which mode's join input is open
  const [showRules, setShowRules] = useState(false);
  const [nicknameError, setNicknameError] = useState(false);
  const { t, lang } = useLang();

  const validateNickname = () => {
    if (!nickname.trim()) {
      setNicknameError(true);
      setTimeout(() => setNicknameError(false), 5000);
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
    <div className="min-h-screen flex flex-col items-center px-4 md:px-6 pb-12 relative" style={{ paddingTop: '60px' }}>

      {/* Logo */}
      <motion.div
        initial={{ y: -40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="text-center"
        style={{ marginBottom: '12px' }}
      >
        <div className="relative inline-block">
          <h1
            className="text-5xl md:text-7xl font-black tracking-tight"
            style={{
              fontFamily: 'var(--font-display)',
              color: '#2bb5a0',
              textShadow: '3px 3px 0 #1a8070, 6px 6px 0 rgba(26,128,112,0.15)',
            }}
          >
            SUCK
            <span style={{
              color: '#ff7eb3',
              textShadow: '3px 3px 0 #e54d85, 6px 6px 0 rgba(229,77,133,0.15)',
            }}>CARD</span>
          </h1>
          <motion.span
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 3, repeat: Infinity }}
            className="absolute -top-1 -right-8 text-lg md:text-xl font-black text-accent-blue"
            style={{ textShadow: '2px 2px 0 #3a8fd6' }}
          >
            .com
          </motion.span>
        </div>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-text-light text-sm font-semibold"
          style={{ marginTop: '6px', letterSpacing: '0.5px' }}
        >
          {t('tagline')}
        </motion.p>
      </motion.div>

      {/* Nickname input — compact */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.15 }}
        className="w-full max-w-md"
        style={{ marginBottom: '28px' }}
      >
        <div className="flex items-center gap-3" style={{ padding: '0 4px' }}>
          <input
            type="text"
            value={nickname}
            onChange={(e) => { setNickname(e.target.value.slice(0, 12)); setNicknameError(false); }}
            placeholder={t('nicknamePlaceholder')}
            className="cartoon-input text-center text-base font-semibold flex-1"
            maxLength={12}
            style={nicknameError ? { borderColor: '#ff6b6b', boxShadow: '0 0 0 3px rgba(255,107,107,0.2)' } : {}}
          />
          <span className="text-xs text-text-light font-bold" style={{ minWidth: '32px' }}>{nickname.length}/12</span>
        </div>
        <AnimatePresence>
          {nicknameError && (
            <motion.p
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-xs font-bold text-center"
              style={{ color: '#ff6b6b', marginTop: '6px' }}
            >
              {t('enterNickname')}
            </motion.p>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Section header */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.25 }}
        className="flex items-center gap-4 w-full max-w-2xl"
        style={{ marginBottom: '20px' }}
      >
        <div className="flex-1 h-px bg-[#e0d8cc]" />
        <span className="text-sm font-black text-text-mid uppercase tracking-wider">{t('chooseMode')}</span>
        <div className="flex-1 h-px bg-[#e0d8cc]" />
      </motion.div>

      {/* Game Mode Cards */}
      <div
        className="w-full max-w-2xl grid gap-4"
        style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))' }}
      >
        {GAME_MODES.map((mode, i) => (
          <motion.div
            key={mode.key}
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 + i * 0.07, type: 'spring', stiffness: 200, damping: 20 }}
            whileHover={{ y: -6, scale: 1.03 }}
            className="game-mode-card"
            style={{
              background: '#fff',
              borderRadius: '20px',
              border: '2px solid #e8e0d4',
              overflow: 'hidden',
              cursor: 'default',
              boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
              transition: 'box-shadow 0.3s, border-color 0.3s',
            }}
            onHoverStart={(e) => {
              const el = e.target.closest('.game-mode-card');
              if (el) {
                el.style.boxShadow = `0 8px 32px ${mode.glow}`;
                el.style.borderColor = mode.border;
              }
            }}
            onHoverEnd={(e) => {
              const el = e.target.closest('.game-mode-card');
              if (el) {
                el.style.boxShadow = '0 4px 20px rgba(0,0,0,0.06)';
                el.style.borderColor = '#e8e0d4';
              }
            }}
          >
            {/* Card header with gradient */}
            <div
              style={{
                background: mode.gradient,
                padding: '20px 16px 16px',
                textAlign: 'center',
              }}
            >
              <span style={{ fontSize: '36px', display: 'block', marginBottom: '6px' }}>{mode.icon}</span>
              <h3
                className="font-black text-white text-base"
                style={{ fontFamily: 'var(--font-display)', textShadow: '1px 1px 4px rgba(0,0,0,0.2)' }}
              >
                {t(`mode_${mode.key}`)}
              </h3>
              <p className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.75)', marginTop: '4px' }}>
                {mode.players} {lang === 'vi' ? 'người' : 'players'}
              </p>
            </div>

            {/* Card body — description + actions */}
            <div style={{ padding: '14px 16px 16px' }}>
              <p className="text-xs text-text-mid text-center" style={{ lineHeight: '1.5', marginBottom: '14px', minHeight: '36px' }}>
                {t(`modeDesc_${mode.key}`)}
              </p>

              <AnimatePresence mode="wait">
                {activeJoin === mode.key ? (
                  <motion.div
                    key="join-input"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                  >
                    <input
                      type="text"
                      value={joinCode}
                      onChange={(e) => setJoinCode(e.target.value.toUpperCase().slice(0, 4))}
                      placeholder="ABCD"
                      className="cartoon-input text-center text-xl font-black tracking-[0.4em] w-full"
                      style={{ fontFamily: 'var(--font-display)', padding: '8px', marginBottom: '8px' }}
                      maxLength={4}
                      autoFocus
                      onKeyDown={(e) => e.key === 'Enter' && handleJoinSubmit(joinCode)}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => { setActiveJoin(null); setJoinCode(''); }}
                        className="flex-1 rounded-xl font-bold text-xs border-2 border-[#e0d8cc] text-text-mid hover:border-text-light transition-colors"
                        style={{ padding: '8px' }}
                      >
                        <ArrowLeft size={12} style={{ display: 'inline', marginRight: '4px' }} />
                        {t('back')}
                      </button>
                      <button
                        onClick={() => handleJoinSubmit(joinCode)}
                        disabled={joinCode.length < 4}
                        className="flex-1 rounded-xl font-bold text-xs text-white transition-all disabled:opacity-40"
                        style={{ padding: '8px', background: mode.gradient }}
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
                    <motion.button
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => handleCreate(mode.key)}
                      className="w-full rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 transition-all"
                      style={{ padding: '10px', background: mode.gradient }}
                    >
                      <Crown size={14} />
                      {t('createRoom')}
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => { if (validateNickname()) { setActiveJoin(mode.key); setJoinCode(''); } }}
                      className="w-full rounded-xl font-bold text-sm border-2 text-text-mid flex items-center justify-center gap-2 transition-all hover:border-text-light"
                      style={{ padding: '9px', borderColor: '#e0d8cc' }}
                    >
                      <Users size={14} />
                      {t('joinRoom')}
                    </motion.button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        ))}
      </div>

      {/* How to Play */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setShowRules(true)}
        className="pill-btn pill-btn-ghost flex items-center justify-center gap-2.5 text-sm"
        style={{ marginTop: '28px', padding: '10px 32px' }}
      >
        <BookOpen size={14} />
        {t('howToPlay')}
      </motion.button>

      {/* Public Rooms Grid */}
      {publicRooms.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="w-full max-w-2xl"
          style={{ marginTop: '32px' }}
        >
          <h3 className="text-sm font-bold text-text-mid uppercase tracking-wider text-center" style={{ marginBottom: '14px' }}>
            🏠 {t('publicRooms')}
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {publicRooms.map((room) => (
              <motion.button
                key={room.code}
                whileHover={{ scale: 1.04, y: -2 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => {
                  if (!validateNickname()) return;
                  onJoinRoom(room.code);
                }}
                className="cartoon-card flex flex-col items-center justify-center cursor-pointer hover:border-primary transition-colors"
                style={{ padding: '14px 8px', height: '110px', maxWidth: '100%', margin: 0 }}
              >
                <span className="text-xs font-bold text-text-mid w-full text-center overflow-hidden whitespace-nowrap text-ellipsis" style={{ marginBottom: '4px' }}>
                  {room.roomName}
                </span>
                <Users size={24} className="text-text-mid" strokeWidth={1.5} />
                <span className="text-sm font-black text-text-dark" style={{ marginTop: '4px' }}>
                  {room.playerCount}/{room.maxPlayers}
                </span>
              </motion.button>
            ))}
          </div>
        </motion.div>
      )}

      {/* Rules Modal */}
      <AnimatePresence>
        {showRules && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 z-40"
              onClick={() => setShowRules(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.85, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.85, y: 30 }}
              transition={{ type: 'spring', damping: 20, stiffness: 300 }}
              className="fixed inset-0 z-50 flex items-center justify-center px-4 pointer-events-none"
            >
              <div
                className="cartoon-card w-full max-w-lg pointer-events-auto relative"
                style={{ padding: '40px 20px 32px', maxHeight: '90vh', overflowY: 'auto', scrollbarWidth: 'none' }}
              >
                <button
                  onClick={() => setShowRules(false)}
                  className="absolute top-4 right-4 p-2 rounded-full hover:bg-bg-warm transition-colors text-text-light hover:text-text-dark"
                >
                  <X size={20} />
                </button>
                <h2
                  className="text-2xl font-black text-center text-primary"
                  style={{ fontFamily: 'var(--font-display)', textShadow: '2px 2px 0 #1a8070', marginBottom: '28px' }}
                >
                  {t('rulesTitle')}
                </h2>
                <motion.div
                  initial={{ x: -15, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.05 }}
                  className="rounded-2xl bg-bg-soft border-2 border-[#e8e0d4]"
                  style={{ padding: '18px 20px', marginBottom: '24px' }}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl" style={{ marginTop: '2px' }}>🎯</span>
                    <div className="text-sm text-text-mid" style={{ lineHeight: '1.7' }}>
                      {lang === 'vi' ? (
                        <>
                          <p>Mỗi vòng, hệ thống đưa ra một số <strong className="text-text-dark">Mục Tiêu</strong> ngẫu nhiên (ví dụ: 10). Mỗi người chơi <em>bí mật chọn một con số</em>.</p>
                          <p style={{ marginTop: '10px' }}>Nếu <strong className="text-text-dark">TỔNG</strong> các số của mọi người <span style={{ color: '#2bb5a0', fontWeight: 700 }}>nhỏ hơn hoặc bằng Mục Tiêu</span> → ai chọn <span style={{ color: '#2bb5a0', fontWeight: 700 }}>số lớn nhất</span> sẽ thắng.</p>
                          <p style={{ marginTop: '10px' }}>Ngược lại, nếu <strong className="text-text-dark">TỔNG</strong> <span style={{ color: '#e54d4d', fontWeight: 700 }}>vượt quá Mục Tiêu</span> → ai chọn <span style={{ color: '#e54d4d', fontWeight: 700 }}>số nhỏ nhất</span> sẽ thắng!</p>
                        </>
                      ) : (
                        <>
                          <p>Each round, the system picks a random <strong className="text-text-dark">Target</strong> number (e.g. 10). Every player <em>secretly chooses a number</em>.</p>
                          <p style={{ marginTop: '10px' }}>If the <strong className="text-text-dark">TOTAL</strong> of all numbers is <span style={{ color: '#2bb5a0', fontWeight: 700 }}>less than or equal to the Target</span> → the <span style={{ color: '#2bb5a0', fontWeight: 700 }}>highest number</span> wins.</p>
                          <p style={{ marginTop: '10px' }}>But if the <strong className="text-text-dark">TOTAL</strong> <span style={{ color: '#e54d4d', fontWeight: 700 }}>exceeds the Target</span> → the <span style={{ color: '#e54d4d', fontWeight: 700 }}>lowest number</span> wins!</p>
                        </>
                      )}
                    </div>
                  </div>
                </motion.div>
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setShowRules(false)}
                  className="pill-btn pill-btn-primary w-full flex items-center justify-center gap-2 text-base"
                  style={{ padding: '14px' }}
                >
                  {t('rulesClose')}
                </motion.button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
