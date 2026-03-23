import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Gamepad2, Users, Crown, BookOpen, X } from 'lucide-react';
import { useLang } from '../i18n';

export default function HomePage({ nickname, setNickname, onCreateRoom, onJoinRoom, publicRooms = [] }) {
  const [joinCode, setJoinCode] = useState('');
  const [mode, setMode] = useState(null);
  const [showRules, setShowRules] = useState(false);
  const [nicknameError, setNicknameError] = useState(false);
  const { t, lang } = useLang();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 pt-20 pb-12 md:py-12 relative">

      {/* Logo */}
      <motion.div
        initial={{ y: -40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="text-center"
        style={{ marginBottom: '52px' }}
      >
        <div className="relative inline-block">
          <h1
            className="text-6xl md:text-8xl font-black tracking-tight"
            style={{
              fontFamily: 'var(--font-display)',
              color: '#2bb5a0',
              textShadow: '3px 3px 0 #1a8070, 6px 6px 0 rgba(26,128,112,0.15)',
            }}
          >
            NUM
            <span style={{
              color: '#ff7eb3',
              textShadow: '3px 3px 0 #e54d85, 6px 6px 0 rgba(229,77,133,0.15)',
            }}>CLASH</span>
          </h1>
          <motion.span
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 3, repeat: Infinity }}
            className="absolute -top-2 -right-8 text-2xl md:text-3xl font-black text-accent-blue"
            style={{ textShadow: '2px 2px 0 #3a8fd6' }}
          >
            .io
          </motion.span>
        </div>
      </motion.div>

      {/* Main Card */}
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="cartoon-card w-full max-w-md"
        style={{ padding: '36px 40px 32px' }}
      >
        {/* Nickname input */}
        <div style={{ marginBottom: '28px' }}>
          <label className="block text-sm font-bold text-text-mid uppercase tracking-wider" style={{ marginBottom: '10px' }}>
            {t('nickname')}
          </label>
          <input
            type="text"
            value={nickname}
            onChange={(e) => { setNickname(e.target.value.slice(0, 12)); setNicknameError(false); }}
            placeholder={t('nicknamePlaceholder')}
            className="cartoon-input text-center text-lg font-semibold"
            maxLength={12}
            style={nicknameError ? { borderColor: '#ff6b6b', boxShadow: '0 0 0 3px rgba(255,107,107,0.2)' } : {}}
          />
          {nicknameError && (
            <motion.p
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-xs font-bold text-center"
              style={{ color: '#ff6b6b', marginTop: '8px' }}
            >
              {t('enterNickname')}
            </motion.p>
          )}
          <p className="text-xs text-text-light text-right" style={{ marginTop: '4px' }}>{nickname.length}/12</p>
        </div>

        {/* Mode selection */}
        {!mode ? (
          <div>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                if (nickname.trim()) {
                  setNicknameError(false);
                  onCreateRoom();
                } else {
                  setNicknameError(true);
                  setTimeout(() => setNicknameError(false), 5000);
                }
              }}
              className="pill-btn pill-btn-primary w-full flex items-center justify-center gap-3 text-lg py-4"
            >
              <Crown size={22} />
              {t('createRoom')}
            </motion.button>

            <div className="flex items-center gap-4" style={{ margin: '16px 0' }}>
              <div className="flex-1 h-px bg-[#e0d8cc]" />
              <span className="text-text-light text-xs font-bold">{t('or')}</span>
              <div className="flex-1 h-px bg-[#e0d8cc]" />
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                if (nickname.trim()) {
                  setNicknameError(false);
                  setMode('join');
                } else {
                  setNicknameError(true);
                  setTimeout(() => setNicknameError(false), 5000);
                }
              }}
              className="pill-btn pill-btn-secondary w-full flex items-center justify-center gap-3 text-lg py-4"
            >
              <Users size={22} />
              {t('joinRoom')}
            </motion.button>
          </div>
        ) : mode === 'join' ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-5"
          >
            <div>
              <label className="block text-sm font-bold text-text-mid mb-3 uppercase tracking-wider">
                {t('roomCode')}
              </label>
              <input
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase().slice(0, 4))}
                placeholder="ABCD"
                className="cartoon-input text-center text-3xl font-black tracking-[0.5em]"
                style={{ fontFamily: 'var(--font-display)' }}
                maxLength={4}
              />
            </div>

            <div className="flex gap-3" style={{ marginTop: '20px' }}>
              <button
                onClick={() => setMode(null)}
                className="pill-btn pill-btn-ghost flex-1"
                style={{ padding: '10px 20px', borderWidth: '2px', fontSize: '0.875rem' }}
              >
                {t('back')}
              </button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onJoinRoom(joinCode)}
                disabled={joinCode.length < 4}
                className="pill-btn pill-btn-accent flex-1 flex items-center justify-center gap-2"
                style={{ padding: '10px 20px', borderWidth: '2px', fontSize: '0.875rem' }}
              >
                <Gamepad2 size={16} />
                {t('join')}
              </motion.button>
            </div>
          </motion.div>
        ) : null}
      </motion.div>

      {/* How to Play button */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setShowRules(true)}
        className="pill-btn pill-btn-ghost flex items-center justify-center gap-2.5 text-base"
        style={{ marginTop: '24px', padding: '12px 40px' }}
      >
        <BookOpen size={16} />
        {t('howToPlay')}
      </motion.button>

      {/* Public Rooms Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="w-full max-w-2xl"
        style={{ marginTop: '40px' }}
      >
        <h3 className="text-sm font-bold text-text-mid uppercase tracking-wider text-center" style={{ marginBottom: '16px' }}>
          🏠 {t('publicRooms')}
        </h3>
        <div className="grid grid-cols-3 gap-3">
          {publicRooms.map((room) => (
            <motion.button
              key={room.code}
              whileHover={{ scale: 1.04, y: -2 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => {
                if (!nickname.trim()) {
                  setNicknameError(true);
                  setTimeout(() => setNicknameError(false), 5000);
                  return;
                }
                onJoinRoom(room.code);
              }}
              className="cartoon-card flex flex-col items-center justify-center cursor-pointer hover:border-primary transition-colors"
              style={{ padding: '14px 8px', height: '120px' }}
            >
              <span className="text-xs font-bold text-text-mid w-full text-center overflow-hidden whitespace-nowrap text-ellipsis" style={{ marginBottom: '6px' }}>
                {room.roomName}
              </span>
              <Users size={28} className="text-text-mid" strokeWidth={1.5} />
              <span className="text-sm font-black text-text-dark" style={{ marginTop: '6px' }}>
                {room.playerCount}/{room.maxPlayers}
              </span>
            </motion.button>
          ))}
          {/* 3 placeholder rooms */}
          {[1, 2, 3].filter((_, i) => i >= publicRooms.length).map((i) => (
            <div
              key={`placeholder-${i}`}
              className="cartoon-card flex flex-col items-center justify-center opacity-40"
              style={{ padding: '14px 8px', height: '120px', borderStyle: 'dashed' }}
            >
              <span className="text-xs font-bold text-text-light w-full text-center" style={{ marginBottom: '6px' }}>
                ---
              </span>
              <Users size={28} className="text-text-light" strokeWidth={1.5} />
              <span className="text-sm font-black text-text-light" style={{ marginTop: '6px' }}>
                0/8
              </span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Rules Modal */}
      <AnimatePresence>
        {showRules && (
          <>
            {/* Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 z-40"
              onClick={() => setShowRules(false)}
            />
            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.85, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.85, y: 30 }}
              transition={{ type: 'spring', damping: 20, stiffness: 300 }}
              className="fixed inset-0 z-50 flex items-center justify-center px-4 pointer-events-none"
            >
              <div
                className="cartoon-card w-full max-w-lg pointer-events-auto relative"
                style={{ padding: '40px 20px 32px', maxHeight: '90vh', overflowY: 'auto', scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              >
                {/* Close button */}
                <button
                  onClick={() => setShowRules(false)}
                  className="absolute top-4 right-4 p-2 rounded-full hover:bg-bg-warm transition-colors text-text-light hover:text-text-dark"
                >
                  <X size={20} />
                </button>

                {/* Title */}
                <h2
                  className="text-2xl font-black text-center text-primary"
                  style={{ fontFamily: 'var(--font-display)', textShadow: '2px 2px 0 #1a8070', marginBottom: '28px' }}
                >
                  {t('rulesTitle')}
                </h2>

                {/* Game rules explanation */}
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


                {/* Close button */}
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
