import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Crown, LogIn } from 'lucide-react';
import { useLang } from '../i18n';
import LOBBY_CARDS from '../data/lobbyCards';
import './gameLobbyScreen.css';

/**
 * GameLobbyScreen — Sảnh chờ riêng cho từng chế độ chơi.
 *
 * Props:
 *   gameMode    — key từ LOBBY_CARDS (e.g. 'liardeck')
 *   nickname    — tên người chơi
 *   onBack      — quay về homepage
 *   onCreateRoom(mode) — tạo phòng mới
 *   onJoinRoom(code)   — vào phòng bằng mã
 */
export default function GameLobbyScreen({ gameMode, nickname, onBack, onCreateRoom, onJoinRoom }) {
  const [joinCode, setJoinCode] = useState('');
  const { t, lang } = useLang();

  const card = LOBBY_CARDS.find(c => c.key === gameMode) || LOBBY_CARDS[0];

  // CSS custom properties for theming
  const glowVars = {
    '--lobby-glow': card.glow,
    '--lobby-glow-dim': `${card.glow}33`,   // 20% opacity
    '--lobby-glow-dim2': `${card.glow}15`,  // 8% opacity
  };

  const handleJoin = () => {
    if (joinCode.trim().length >= 4) onJoinRoom(joinCode.trim());
  };

  return (
    <div className="game-lobby" style={glowVars}>

      {/* ── Header ── */}
      <motion.div
        className="lobby-header"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <button className="lobby-back-btn" onClick={onBack}>
          <ArrowLeft size={16} />
          {lang === 'vi' ? 'Trở về' : 'Back'}
        </button>

        <motion.h1
          className="lobby-game-title"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.15, type: 'spring', stiffness: 150 }}
        >
          {t(`mode_${card.key}`) || card.key}
        </motion.h1>

        {/* Spacer for centering */}
        <div style={{ width: 100 }} />
      </motion.div>

      {/* ── Content — split layout ── */}
      <div className="lobby-content">

        {/* Left: Info panel */}
        <motion.div
          className="lobby-info-panel"
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <div className="info-panel-header">
            <span className="info-suit-icon">{card.symbol}</span>
            <div>
              <div className="info-game-name">{t(`mode_${card.key}`)}</div>
              <span className="info-players-badge">
                {card.players} {lang === 'vi' ? 'người chơi' : 'players'}
              </span>
            </div>
          </div>

          <p className="info-rules-text">
            {t(`modeDesc_${card.key}`)}
          </p>

          {/* Quick rules hints */}
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 12 }}>
            <p className="info-rules-text">
              {lang === 'vi'
                ? <><strong>Cách chơi:</strong> Vào phòng → Chờ đủ người → Bắt đầu!</>
                : <><strong>How to play:</strong> Enter room → Wait for players → Start!</>
              }
            </p>
          </div>
        </motion.div>

        {/* Right: Action panel */}
        <motion.div
          className="lobby-action-panel"
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          {/* Nickname display */}
          <div className="flex items-center gap-3" style={{ marginBottom: 4 }}>
            <span className="text-xs font-bold" style={{ color: 'rgba(255,255,255,0.25)', letterSpacing: 2, textTransform: 'uppercase' }}>
              {lang === 'vi' ? 'Xin chào' : 'Welcome'}
            </span>
            <span className="text-sm font-black" style={{ color: 'rgba(255,255,255,0.7)' }}>
              {nickname || '???'}
            </span>
          </div>

          {/* Create Room */}
          <motion.button
            className="lobby-create-btn"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => onCreateRoom(card.key)}
          >
            <Crown size={20} />
            {t('createNewRoom')}
          </motion.button>

          {/* Divider */}
          <div className="flex items-center gap-4">
            <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.08)' }} />
            <span className="text-xs font-bold" style={{ color: 'rgba(255,255,255,0.15)', letterSpacing: 2 }}>
              {lang === 'vi' ? 'HOẶC' : 'OR'}
            </span>
            <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.08)' }} />
          </div>

          {/* Join Room */}
          <div className="lobby-join-section">
            <span className="lobby-join-label">
              {lang === 'vi' ? 'Nhập mã phòng' : 'Enter room code'}
            </span>
            <div className="lobby-join-row">
              <input
                type="text"
                value={joinCode}
                onChange={e => setJoinCode(e.target.value.toUpperCase().slice(0, 4))}
                placeholder={lang === 'vi' ? 'VD: 8372' : 'e.g. 8372'}
                className="lobby-join-input"
                maxLength={4}
                onKeyDown={e => e.key === 'Enter' && handleJoin()}
              />
              <motion.button
                className="lobby-join-btn"
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                onClick={handleJoin}
                disabled={joinCode.length < 4}
              >
                <LogIn size={16} style={{ marginRight: 4 }} />
                {t('joinAction')}
              </motion.button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
