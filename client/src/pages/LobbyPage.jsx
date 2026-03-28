import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Copy, Check, Crown, Users, Play, Settings, Hash, CheckCircle, Circle, LogOut, Globe, Lock, MessageCircle, Send, X, Gamepad2, ArrowLeft } from 'lucide-react';
import { useLang } from '../i18n';
import { sfxCopy, sfxReady, sfxUnready, sfxGameStart, sfxClick } from '../sounds/gameSfx';
import LOBBY_CARDS from '../data/lobbyCards';

const ROUND_OPTIONS = [1, 4, 8, 18, 36];

/* Get accent color from LOBBY_CARDS for the current game mode */
function getAccent(mode) {
  const card = LOBBY_CARDS.find(c => c.key === mode);
  return card?.glow || '#00deff';
}

export default function LobbyPage({ roomInfo, roomCode, isHost, onStartGame, onSetRounds, onToggleReady, onLeaveRoom, socketId, onToggleRoomPublic, onSetRoomName, chatMessages = [], onSendMessage, onKickPlayer, onSetGameMode, onSwapSeat, onSetDeckType }) {
  const [copied, setCopied] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const chatEndRef = useRef(null);
  const chatContainerRef = useRef(null);
  const { t } = useLang();

  useEffect(() => {
    const container = chatContainerRef.current;
    if (!container) return;
    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
    if (isNearBottom) container.scrollTop = container.scrollHeight;
  }, [chatMessages]);

  const copyCode = () => {
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    sfxCopy();
    setTimeout(() => setCopied(false), 5000);
  };

  if (!roomInfo) return null;
  const accent = getAccent(roomInfo.gameMode);
  const canStart = roomInfo.players.length >= 1;
  const allReady = roomInfo.players.every(p => p.isReady);
  const meReady = roomInfo.players.find(p => p.id === socketId)?.isReady;
  const maxPlayers = roomInfo.gameMode === 'liardeck' ? 6 : roomInfo.gameMode === 'oldmaid' ? 6 : roomInfo.gameMode === 'poker' ? 6 : 8;

  // CSS custom props for theming
  const themeVars = {
    '--accent': accent,
    '--accent-dim': `${accent}33`,
    '--accent-mid': `${accent}66`,
  };

  // Reusable panel class
  const panel = 'w-full max-w-md rounded-2xl border backdrop-blur-md';
  const panelBg = 'bg-black/40 border-white/10';

  return (
    <div
      className="min-h-screen flex flex-col items-center px-6"
      style={{
        paddingTop: '32px', paddingBottom: '32px',
        background: 'radial-gradient(ellipse at 50% 20%, #1a1a2e 0%, #0d0d1a 50%, #000 100%)',
        color: '#e0e0e0',
        ...themeVars,
      }}
    >
      {/* ── Leave Room ── */}
      <motion.button
        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
        onClick={() => { sfxClick(); onLeaveRoom(); }}
        className="fixed top-4 left-4 z-50 flex items-center gap-2 rounded-xl backdrop-blur-sm cursor-pointer transition-all"
        style={{
          padding: '10px 18px',
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.1)',
          color: 'rgba(255,255,255,0.5)',
          fontSize: 13, fontWeight: 700,
        }}
        title={t('leaveRoom')}
      >
        <ArrowLeft size={16} />
      </motion.button>

      {/* ── Header ── */}
      <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="text-center" style={{ marginBottom: '20px' }}>
        <h2 className="text-3xl font-black" style={{
          fontFamily: 'var(--font-display)',
          color: accent,
          textShadow: `0 0 20px ${accent}44, 0 0 60px ${accent}22`,
        }}>
          {t('lobby')}
        </h2>
        <p className="text-sm" style={{ marginTop: '8px', color: 'rgba(255,255,255,0.35)' }}>{t('waitingPlayers')}</p>
      </motion.div>

      {/* ══════════ ROOM CODE ══════════ */}
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1 }}
        className={`${panel} ${panelBg} text-center`}
        style={{ padding: '28px 30px', marginBottom: '14px' }}
      >
        <p className="text-xs uppercase tracking-widest font-bold" style={{ marginBottom: '14px', color: 'rgba(255,255,255,0.25)' }}>
          {t('roomCodeLabel')}
        </p>
        <div className="flex items-center justify-center gap-4">
          <div style={{ width: '44px' }} />
          <span className="text-5xl font-black tracking-[0.4em]" style={{
            fontFamily: 'var(--font-display)',
            color: accent,
            textShadow: `0 0 16px ${accent}66, 0 0 40px ${accent}33`,
          }}>
            {roomCode}
          </span>
          <motion.button
            whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
            onClick={copyCode}
            className="rounded-xl transition-colors cursor-pointer"
            style={{
              padding: '10px 12px',
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.12)',
            }}
          >
            {copied
              ? <Check size={20} style={{ color: accent }} />
              : <Copy size={20} style={{ color: 'rgba(255,255,255,0.4)' }} />
            }
          </motion.button>
        </div>
        <p className="text-xs" style={{ marginTop: '12px', color: copied ? accent : 'rgba(255,255,255,0.25)' }}>
          {copied ? t('copied') : t('shareCode')}
        </p>
      </motion.div>

      {/* ══════════ SETTINGS ══════════ */}
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.15 }}
        className={`${panel} ${panelBg}`}
        style={{ padding: '16px 24px', marginBottom: '14px' }}
      >
        {/* Public/Private toggle */}
        <div className="flex items-center justify-between" style={{ marginBottom: isHost ? '14px' : '0' }}>
          <div className="flex items-center gap-2">
            {roomInfo.isPublic
              ? <Globe size={16} style={{ color: accent }} />
              : <Lock size={16} style={{ color: '#ff5c5c' }} />}
            <span className="text-sm font-bold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.5)' }}>
              {roomInfo.isPublic ? t('roomPublic') : t('roomPrivate')}
            </span>
          </div>
          {isHost && (
            <button
              onClick={() => { sfxClick(); onToggleRoomPublic(); }}
              className="relative rounded-full transition-colors duration-200 cursor-pointer"
              style={{
                width: 48, height: 28,
                background: roomInfo.isPublic ? `${accent}33` : 'rgba(255,255,255,0.08)',
                border: `2px solid ${roomInfo.isPublic ? `${accent}66` : 'rgba(255,255,255,0.12)'}`,
              }}
            >
              <span
                className="absolute top-0.5 rounded-full transition-all duration-200"
                style={{
                  width: 20, height: 20,
                  left: roomInfo.isPublic ? 22 : 2,
                  background: roomInfo.isPublic ? accent : 'rgba(255,255,255,0.3)',
                  boxShadow: roomInfo.isPublic ? `0 0 8px ${accent}66` : 'none',
                }}
              />
            </button>
          )}
        </div>

        {/* Room Name */}
        {isHost && (
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider" style={{ marginBottom: '6px', color: 'rgba(255,255,255,0.25)' }}>
              {t('roomNameLabel')}
            </label>
            <input
              type="text"
              defaultValue={roomInfo.roomName}
              maxLength={18}
              onBlur={(e) => onSetRoomName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); }}
              placeholder={t('roomNamePlaceholder')}
              className="w-full rounded-xl text-sm outline-none transition-all"
              style={{
                padding: '8px 14px',
                background: 'rgba(0,0,0,0.5)',
                border: '1.5px solid rgba(255,255,255,0.1)',
                color: '#e0e0e0',
              }}
              onFocus={e => { e.target.style.borderColor = accent; e.target.style.boxShadow = `0 0 12px ${accent}33`; }}
              onBlurCapture={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; e.target.style.boxShadow = 'none'; }}
            />
          </div>
        )}
      </motion.div>

      {/* ══════════ ROUND SELECTOR (Host) ══════════ */}
      {isHost && (
        <motion.div
          initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className={`${panel} ${panelBg}`}
          style={{ padding: '18px 24px', marginBottom: '14px' }}
        >
          <div className="flex items-center gap-2" style={{ marginBottom: '16px' }}>
            <Settings size={16} style={{ color: accent }} />
            <span className="text-sm font-bold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.4)' }}>
              {t('roundCount')}
            </span>
          </div>
          <div className="flex gap-3">
            {ROUND_OPTIONS.map((r) => (
              <motion.button
                key={r}
                whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                onClick={() => { sfxClick(); onSetRounds(r); }}
                className="flex-1 rounded-xl font-bold text-lg transition-all duration-200 cursor-pointer"
                style={{
                  fontFamily: 'var(--font-display)',
                  padding: '10px 0',
                  background: roomInfo.totalRounds === r ? `${accent}1a` : 'transparent',
                  border: `2px solid ${roomInfo.totalRounds === r ? `${accent}66` : 'rgba(255,255,255,0.08)'}`,
                  color: roomInfo.totalRounds === r ? accent : 'rgba(255,255,255,0.35)',
                  boxShadow: roomInfo.totalRounds === r ? `0 0 12px ${accent}22` : 'none',
                }}
              >
                {r}
              </motion.button>
            ))}
          </div>
        </motion.div>
      )}

      {/* ══════════ GAME MODE ══════════ */}
      <motion.div
        initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.25 }}
        className={`${panel} ${panelBg}`}
        style={{ padding: '18px 24px', marginBottom: '14px' }}
      >
        <div className="flex items-center gap-2" style={{ marginBottom: '12px' }}>
          <Gamepad2 size={16} style={{ color: accent }} />
          <span className="text-sm font-bold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.4)' }}>
            {t('gameMode')}
          </span>
        </div>
        <div
          className="rounded-xl font-bold text-sm text-center"
          style={{
            padding: '10px 16px',
            background: `${accent}1a`,
            border: `2px solid ${accent}44`,
            color: accent,
            textShadow: `0 0 8px ${accent}33`,
          }}
        >
          {t(`mode_${roomInfo.gameMode}`) || roomInfo.gameMode}
        </div>

        {/* Old Maid deck selector */}
        {roomInfo.gameMode === 'oldmaid' && (
          <div style={{ marginTop: '12px' }}>
            <span className="block text-xs font-bold uppercase tracking-wider" style={{ marginBottom: '8px', color: 'rgba(255,255,255,0.25)' }}>Bộ bài</span>
            <div className="flex gap-2">
              {[{ key: 'quick', label: 'Nhanh (29 lá)', desc: '8→A' }, { key: 'full', label: 'Đầy đủ (53 lá)', desc: '2→A' }].map((deck) => (
                <motion.button
                  key={deck.key}
                  whileHover={isHost ? { scale: 1.03 } : {}}
                  whileTap={isHost ? { scale: 0.97 } : {}}
                  onClick={() => isHost && onSetDeckType(deck.key)}
                  className={`flex-1 rounded-xl font-semibold text-xs transition-all duration-200 ${isHost ? 'cursor-pointer' : 'cursor-default'}`}
                  style={{
                    padding: '8px 4px',
                    background: (roomInfo.deckType || 'quick') === deck.key ? `${accent}1a` : 'transparent',
                    border: `2px solid ${(roomInfo.deckType || 'quick') === deck.key ? `${accent}44` : 'rgba(255,255,255,0.08)'}`,
                    color: (roomInfo.deckType || 'quick') === deck.key ? accent : 'rgba(255,255,255,0.35)',
                  }}
                >
                  <div>{deck.label}</div>
                  <div style={{ opacity: 0.5, fontSize: 10 }}>{deck.desc}</div>
                </motion.button>
              ))}
            </div>
          </div>
        )}

        {/* Poker settings */}
        {roomInfo.gameMode === 'poker' && (
          <div style={{ marginTop: '12px' }}>
            <span className="block text-xs font-bold uppercase tracking-wider" style={{ marginBottom: '8px', color: 'rgba(255,255,255,0.25)' }}>Chips khởi đầu</span>
            <div className="flex gap-2" style={{ marginBottom: '8px' }}>
              {[1000, 5000, 10000].map((chips) => (
                <motion.button
                  key={chips}
                  whileHover={isHost ? { scale: 1.03 } : {}}
                  whileTap={isHost ? { scale: 0.97 } : {}}
                  onClick={() => {
                    if (!isHost) return;
                    const s = require('../socket').default;
                    s.emit('poker-settings', { roomCode, settings: { defaultChips: chips } });
                  }}
                  className={`flex-1 rounded-xl font-semibold text-xs transition-all duration-200 ${isHost ? 'cursor-pointer' : 'cursor-default'}`}
                  style={{
                    padding: '8px 4px',
                    background: (roomInfo.pokerSettings?.defaultChips || 1000) === chips ? `${accent}1a` : 'transparent',
                    border: `2px solid ${(roomInfo.pokerSettings?.defaultChips || 1000) === chips ? `${accent}44` : 'rgba(255,255,255,0.08)'}`,
                    color: (roomInfo.pokerSettings?.defaultChips || 1000) === chips ? accent : 'rgba(255,255,255,0.35)',
                  }}
                >
                  {chips.toLocaleString()}
                </motion.button>
              ))}
            </div>
            <span className="block text-xs font-bold uppercase tracking-wider" style={{ marginBottom: '8px', color: 'rgba(255,255,255,0.25)' }}>Blinds (SB/BB)</span>
            <div className="flex gap-2">
              {[{ sb: 10, bb: 20 }, { sb: 25, bb: 50 }, { sb: 50, bb: 100 }].map((blind) => (
                <motion.button
                  key={`${blind.sb}/${blind.bb}`}
                  whileHover={isHost ? { scale: 1.03 } : {}}
                  whileTap={isHost ? { scale: 0.97 } : {}}
                  onClick={() => {
                    if (!isHost) return;
                    const s = require('../socket').default;
                    s.emit('poker-settings', { roomCode, settings: { smallBlind: blind.sb, bigBlind: blind.bb } });
                  }}
                  className={`flex-1 rounded-xl font-semibold text-xs transition-all duration-200 ${isHost ? 'cursor-pointer' : 'cursor-default'}`}
                  style={{
                    padding: '8px 4px',
                    background: (roomInfo.pokerSettings?.smallBlind || 10) === blind.sb ? `${accent}1a` : 'transparent',
                    border: `2px solid ${(roomInfo.pokerSettings?.smallBlind || 10) === blind.sb ? `${accent}44` : 'rgba(255,255,255,0.08)'}`,
                    color: (roomInfo.pokerSettings?.smallBlind || 10) === blind.sb ? accent : 'rgba(255,255,255,0.35)',
                  }}
                >
                  {blind.sb}/{blind.bb}
                </motion.button>
              ))}
            </div>
          </div>
        )}
      </motion.div>

      {/* ══════════ PLAYER LIST ══════════ */}
      <motion.div
        initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
        className={`${panel} ${panelBg}`}
        style={{ padding: '20px 24px', marginBottom: '20px' }}
      >
        <div className="flex items-center justify-between" style={{ marginBottom: '18px' }}>
          <div className="flex items-center gap-2">
            <Users size={16} style={{ color: accent }} />
            <span className="text-sm font-bold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.4)' }}>
              {t('playerList')}
            </span>
          </div>
          <span className="text-xs font-bold rounded-full" style={{
            padding: '3px 12px',
            background: `${accent}1a`,
            color: accent,
            border: `1px solid ${accent}33`,
          }}>
            {roomInfo.players.length}/{maxPlayers}
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {roomInfo.players.map((player, index) => (
            <motion.div
              key={player.id}
              initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.1 * index }}
              className={`flex items-center gap-3 rounded-xl transition-all ${player.id !== socketId ? 'cursor-pointer' : ''}`}
              style={{
                padding: '12px 14px',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.06)',
              }}
              onClick={() => { if (player.id !== socketId) onSwapSeat(index); }}
              onMouseEnter={e => { if (player.id !== socketId) e.currentTarget.style.borderColor = `${accent}33`; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; }}
            >
              {/* Avatar */}
              <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg text-white" style={{
                fontFamily: 'var(--font-display)',
                background: player.isHost
                  ? 'linear-gradient(135deg, #ffd700, #ff8c00)'
                  : `linear-gradient(135deg, ${accent}, ${accent}88)`,
              }}>
                {player.nickname[0].toUpperCase()}
              </div>

              {/* Name */}
              <span className="flex-1 font-semibold" style={{ color: '#e0e0e0' }}>{player.nickname}</span>

              {/* Host badge */}
              {player.isHost && (
                <span className="text-xs font-bold rounded-full flex items-center gap-1" style={{
                  padding: '3px 10px', flexShrink: 0,
                  background: 'rgba(255,215,0,0.1)',
                  border: '1px solid rgba(255,215,0,0.3)',
                  color: '#ffd700',
                }}>
                  <Crown size={11} /> HOST
                </span>
              )}

              {/* Ready indicator */}
              {player.isReady
                ? <CheckCircle size={20} style={{ color: '#00e676', flexShrink: 0, filter: 'drop-shadow(0 0 4px #00e67666)' }} />
                : <Circle size={20} style={{ color: 'rgba(255,255,255,0.15)', flexShrink: 0 }} />
              }

              {/* Kick button */}
              {isHost && !player.isHost && (
                <button
                  onClick={(e) => { e.stopPropagation(); onKickPlayer(player.id); }}
                  className="w-7 h-7 rounded-full flex items-center justify-center transition-colors cursor-pointer"
                  style={{ color: 'rgba(255,255,255,0.2)' }}
                  onMouseEnter={e => { e.currentTarget.style.color = '#ff5c5c'; e.currentTarget.style.background = 'rgba(255,92,92,0.1)'; }}
                  onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.2)'; e.currentTarget.style.background = 'transparent'; }}
                  title="Kick"
                >
                  <X size={14} />
                </button>
              )}
            </motion.div>
          ))}

          {/* Empty slots */}
          {Array.from({ length: Math.max(0, 4 - roomInfo.players.length) }, (_, i) => (
            <motion.div
              key={`empty-${i}`}
              animate={{ opacity: [0.25, 0.45, 0.25] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
              className="flex items-center gap-3 rounded-xl"
              style={{
                padding: '12px 14px',
                border: '1.5px dashed rgba(255,255,255,0.1)',
              }}
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.04)' }}>
                <Hash size={16} style={{ color: 'rgba(255,255,255,0.15)' }} />
              </div>
              <span className="text-sm" style={{ color: 'rgba(255,255,255,0.2)' }}>{t('waiting')}</span>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* ══════════ CHAT ══════════ */}
      <motion.div
        initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.35 }}
        className={`${panel} ${panelBg}`}
        style={{ padding: '16px 20px', marginBottom: '20px' }}
      >
        <div className="flex items-center gap-2" style={{ marginBottom: '12px' }}>
          <MessageCircle size={16} style={{ color: accent }} />
          <span className="text-sm font-bold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.4)' }}>
            {t('chat')}
          </span>
        </div>

        {/* Messages */}
        <div
          ref={chatContainerRef}
          className="rounded-xl"
          style={{
            maxHeight: '200px', minHeight: '100px', overflowY: 'auto', scrollbarWidth: 'thin',
            background: 'rgba(0,0,0,0.4)',
            border: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {chatMessages.map((msg, i) => (
              <div key={i} className={`text-xs ${msg.system ? 'italic text-center' : ''}`} style={{ color: msg.system ? 'rgba(255,255,255,0.25)' : '#ccc' }}>
                {msg.system ? msg.text : (
                  <>
                    <span className="font-bold" style={{ color: msg.senderId === socketId ? accent : '#c77dff' }}>
                      {msg.nickname}
                    </span>
                    <span style={{ color: 'rgba(255,255,255,0.2)' }}>: </span>
                    <span>{msg.text}</span>
                  </>
                )}
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
        </div>

        {/* Chat input */}
        <div className="flex gap-2" style={{ marginTop: '10px' }}>
          <input
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value.slice(0, 100))}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && chatInput.trim()) {
                onSendMessage(chatInput.trim());
                setChatInput('');
              }
            }}
            placeholder={t('chatPlaceholder')}
            className="flex-1 rounded-xl text-sm outline-none transition-all"
            style={{
              padding: '8px 14px',
              background: 'rgba(0,0,0,0.4)',
              border: '1.5px solid rgba(255,255,255,0.08)',
              color: '#e0e0e0',
            }}
            onFocus={e => { e.target.style.borderColor = accent; e.target.style.boxShadow = `0 0 10px ${accent}22`; }}
            onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.08)'; e.target.style.boxShadow = 'none'; }}
            maxLength={100}
          />
          <motion.button
            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            onClick={() => { if (chatInput.trim()) { onSendMessage(chatInput.trim()); setChatInput(''); } }}
            className="rounded-xl flex items-center justify-center cursor-pointer transition-all"
            style={{
              padding: '8px 14px', minWidth: '44px',
              background: accent,
              color: '#000', fontWeight: 700,
            }}
          >
            <Send size={16} />
          </motion.button>
        </div>
      </motion.div>

      {/* ══════════ READY / START ══════════ */}
      <div className="w-full max-w-md" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {/* Ready (non-host) */}
        {!isHost && (
          <motion.button
            initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.35 }}
            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            onClick={() => { onToggleReady(); meReady ? sfxUnready() : sfxReady(); }}
            className="w-full flex items-center justify-center gap-3 text-lg rounded-2xl font-bold cursor-pointer transition-all"
            style={{
              padding: '14px 36px',
              background: meReady ? `${accent}1a` : 'rgba(255,255,255,0.06)',
              border: `2px solid ${meReady ? `${accent}66` : 'rgba(255,255,255,0.1)'}`,
              color: meReady ? accent : 'rgba(255,255,255,0.5)',
              boxShadow: meReady ? `0 0 20px ${accent}22` : 'none',
            }}
          >
            {meReady ? <CheckCircle size={20} /> : <Circle size={20} />}
            {meReady ? t('ready') : t('notReady')}
          </motion.button>
        )}

        {/* Start (host) */}
        {isHost && (
          <motion.button
            initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4 }}
            whileHover={{ scale: canStart && allReady ? 1.03 : 1 }}
            whileTap={{ scale: canStart && allReady ? 0.95 : 1 }}
            onClick={() => { onStartGame(); try { sfxGameStart(); } catch(e) {} }}
            disabled={!canStart || !allReady}
            className="w-full flex items-center justify-center gap-3 text-xl rounded-2xl font-black cursor-pointer transition-all"
            style={{
              padding: '16px 36px',
              fontFamily: 'var(--font-display)',
              background: allReady ? `${accent}18` : 'rgba(255,255,255,0.04)',
              border: `1.5px solid ${allReady ? `${accent}55` : 'rgba(255,255,255,0.06)'}`,
              color: allReady ? accent : 'rgba(255,255,255,0.2)',
              opacity: allReady ? 1 : 0.4,
            }}
          >
            <Play size={24} />
            {!allReady ? t('waitAllReady') : canStart ? t('startGame') : t('needMore', 4 - roomInfo.players.length)}
          </motion.button>
        )}

        {!isHost && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="text-center" style={{ marginTop: '4px' }}>
            <p className="flex items-center gap-2 justify-center text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>
              <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: meReady ? accent : '#ff5c5c' }} />
              {meReady ? t('waitingHost') : t('readyHint')}
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
