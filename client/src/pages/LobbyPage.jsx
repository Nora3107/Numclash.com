import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Copy, Check, Crown, Users, Play, Settings, Hash, CheckCircle, Circle, LogOut, Globe, Lock, MessageCircle, Send, X, Gamepad2 } from 'lucide-react';
import { useLang } from '../i18n';
import { sfxCopy, sfxReady, sfxUnready, sfxGameStart, sfxModeSwitch, sfxChatMsg } from '../sounds/gameSfx';

const ROUND_OPTIONS = [1, 4, 8, 18, 36];

export default function LobbyPage({ roomInfo, roomCode, isHost, onStartGame, onSetRounds, onToggleReady, onLeaveRoom, socketId, onToggleRoomPublic, onSetRoomName, chatMessages = [], onSendMessage, onKickPlayer, onSetGameMode, onSwapSeat, onSetDeckType }) {
  const [copied, setCopied] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const chatEndRef = useRef(null);
  const chatContainerRef = useRef(null);
  const { t } = useLang();

  useEffect(() => {
    const container = chatContainerRef.current;
    if (!container) return;
    // Only auto-scroll if user is already near the bottom (within 100px)
    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
    if (isNearBottom) {
      container.scrollTop = container.scrollHeight;
    }
  }, [chatMessages]);

  const copyCode = () => {
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    sfxCopy();
    setTimeout(() => setCopied(false), 5000);
  };

  if (!roomInfo) return null;
  const canStart = roomInfo.players.length >= 1; // TODO: đổi lại 4 khi deploy
  const allReady = roomInfo.players.every(p => p.isReady);
  const meReady = roomInfo.players.find(p => p.id === socketId)?.isReady;

  return (
    <div className="min-h-screen flex flex-col items-center px-6" style={{ paddingTop: '32px', paddingBottom: '32px' }}>
      {/* Leave room button */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={onLeaveRoom}
        className="fixed top-4 left-4 z-50 flex items-center justify-center rounded-full bg-white/90 backdrop-blur-sm border-2 border-[#e0d8cc] text-text-light hover:text-accent-red hover:border-accent-red/40 transition-all cursor-pointer shadow-sm"
        style={{ width: '40px', height: '40px' }}
        title={t('leaveRoom')}
      >
        <LogOut size={18} />
      </motion.button>

      {/* Header */}
      <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="text-center" style={{ marginBottom: '20px' }}>
        <h2 className="text-3xl font-black text-primary" style={{ fontFamily: 'var(--font-display)', textShadow: '2px 2px 0 #1a8070' }}>
          {t('lobby')}
        </h2>
        <p className="text-text-light text-sm" style={{ marginTop: '8px' }}>{t('waitingPlayers')}</p>
      </motion.div>

      {/* Room Code */}
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="cartoon-card w-full max-w-md text-center"
        style={{ padding: '24px 30px', marginBottom: '14px' }}
      >
        <p className="text-xs text-text-light uppercase tracking-widest font-bold" style={{ marginBottom: '14px' }}>{t('roomCodeLabel')}</p>
        <div className="flex items-center justify-center gap-4">
          <div style={{ width: '44px' }} /> {/* Spacer cân bằng nút copy */}
          <span className="text-5xl font-black tracking-[0.4em] text-primary" style={{ fontFamily: 'var(--font-display)' }}>
            {roomCode}
          </span>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={copyCode}
            className="rounded-xl bg-bg-warm border-2 border-[#e0d8cc] hover:border-primary transition-colors"
            style={{ padding: '10px 12px' }}
          >
            {copied ? <Check size={20} className="text-primary" /> : <Copy size={20} className="text-text-mid" />}
          </motion.button>
        </div>
        <p className="text-xs text-text-light" style={{ marginTop: '12px' }}>{copied ? t('copied') : t('shareCode')}</p>
      </motion.div>

      {/* Room Settings: Public/Private + Room Name */}
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.15 }}
        className="cartoon-card w-full max-w-md"
        style={{ padding: '16px 24px', marginBottom: '14px' }}
      >
        {/* Public/Private toggle */}
        <div className="flex items-center justify-between" style={{ marginBottom: isHost ? '14px' : '0' }}>
          <div className="flex items-center gap-2">
            {roomInfo.isPublic ? <Globe size={16} className="text-primary" /> : <Lock size={16} className="text-accent-red" />}
            <span className="text-sm font-bold text-text-mid uppercase tracking-wider">
              {roomInfo.isPublic ? t('roomPublic') : t('roomPrivate')}
            </span>
          </div>
          {isHost && (
            <button
              onClick={onToggleRoomPublic}
              className={`relative w-12 h-7 rounded-full transition-colors duration-200 cursor-pointer border-2 ${
                roomInfo.isPublic
                  ? 'bg-primary/20 border-primary/40'
                  : 'bg-bg-warm border-[#e0d8cc]'
              }`}
            >
              <span
                className={`absolute top-0.5 w-5 h-5 rounded-full transition-all duration-200 shadow-sm ${
                  roomInfo.isPublic
                    ? 'left-[22px] bg-primary'
                    : 'left-[2px] bg-text-light'
                }`}
              />
            </button>
          )}
        </div>

        {/* Room Name (host only edit) */}
        {isHost && (
          <div>
            <label className="block text-xs font-bold text-text-light uppercase tracking-wider" style={{ marginBottom: '6px' }}>
              {t('roomNameLabel')}
            </label>
            <input
              type="text"
              defaultValue={roomInfo.roomName}
              maxLength={18}
              onBlur={(e) => onSetRoomName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); }}
              placeholder={t('roomNamePlaceholder')}
              className="cartoon-input text-sm"
              style={{ padding: '8px 14px' }}
            />
          </div>
        )}
      </motion.div>

      {/* Round selector (Host only) */}
      {isHost && (
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="cartoon-card w-full max-w-md"
          style={{ padding: '18px 24px', marginBottom: '14px' }}
        >
          <div className="flex items-center gap-2" style={{ marginBottom: '16px' }}>
            <Settings size={16} className="text-accent-purple" />
            <span className="text-sm font-bold text-text-mid uppercase tracking-wider">{t('roundCount')}</span>
          </div>
          <div className="flex gap-3">
            {ROUND_OPTIONS.map((r) => (
              <motion.button
                key={r}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => onSetRounds(r)}
                className={`flex-1 rounded-2xl font-bold text-lg transition-all duration-200 border-2 ${
                  roomInfo.totalRounds === r
                    ? 'bg-primary/10 text-primary border-primary/40 shadow-md'
                    : 'bg-bg-warm text-text-mid border-[#e0d8cc] hover:border-text-light'
                }`}
                style={{ fontFamily: 'var(--font-display)', padding: '10px 0' }}
              >
                {r}
              </motion.button>
            ))}
          </div>
        </motion.div>
      )}

      {/* Game Mode selector */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.25 }}
        className="cartoon-card w-full max-w-md"
        style={{ padding: '18px 24px', marginBottom: '14px' }}
      >
        <div className="flex items-center gap-2" style={{ marginBottom: '12px' }}>
          <Gamepad2 size={16} className="text-accent-orange" />
          <span className="text-sm font-bold text-text-mid uppercase tracking-wider">{t('gameMode')}</span>
        </div>
        <div
          className="rounded-2xl font-bold text-sm text-accent-orange bg-accent-orange/10 border-2 border-accent-orange/40 text-center"
          style={{ padding: '10px 16px' }}
        >
          {t(`mode_${roomInfo.gameMode}`) || roomInfo.gameMode}
        </div>

        {/* Deck type selector (Old Maid only) */}
        {roomInfo.gameMode === 'oldmaid' && (
          <div style={{ marginTop: '12px' }}>
            <span className="text-xs font-bold text-text-light uppercase tracking-wider" style={{ marginBottom: '8px', display: 'block' }}>Bộ bài</span>
            <div className="flex gap-2">
              {[{ key: 'quick', label: 'Nhanh (29 lá)', desc: '8→A' }, { key: 'full', label: 'Đầy đủ (53 lá)', desc: '2→A' }].map((deck) => (
                <motion.button
                  key={deck.key}
                  whileHover={isHost ? { scale: 1.03 } : {}}
                  whileTap={isHost ? { scale: 0.97 } : {}}
                  onClick={() => isHost && onSetDeckType(deck.key)}
                  className={`flex-1 rounded-xl font-semibold text-xs transition-all duration-200 border-2 ${
                    (roomInfo.deckType || 'quick') === deck.key
                      ? 'bg-accent-purple/10 text-accent-purple border-accent-purple/40'
                      : 'bg-bg-warm text-text-mid border-[#e0d8cc]'
                  } ${isHost ? 'cursor-pointer' : 'cursor-default'}`}
                  style={{ padding: '8px 4px' }}
                >
                  <div>{deck.label}</div>
                  <div style={{ opacity: 0.6, fontSize: 10 }}>{deck.desc}</div>
                </motion.button>
              ))}
            </div>
          </div>
        )}

        {/* Poker settings */}
        {roomInfo.gameMode === 'poker' && (
          <div style={{ marginTop: '12px' }}>
            <span className="text-xs font-bold text-text-light uppercase tracking-wider" style={{ marginBottom: '8px', display: 'block' }}>Chips khởi đầu</span>
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
                  className={`flex-1 rounded-xl font-semibold text-xs transition-all duration-200 border-2 ${
                    (roomInfo.pokerSettings?.defaultChips || 1000) === chips
                      ? 'bg-accent-orange/10 text-accent-orange border-accent-orange/40'
                      : 'bg-bg-warm text-text-mid border-[#e0d8cc]'
                  } ${isHost ? 'cursor-pointer' : 'cursor-default'}`}
                  style={{ padding: '8px 4px' }}
                >
                  {chips.toLocaleString()}
                </motion.button>
              ))}
            </div>
            <span className="text-xs font-bold text-text-light uppercase tracking-wider" style={{ marginBottom: '8px', display: 'block' }}>Blinds (SB/BB)</span>
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
                  className={`flex-1 rounded-xl font-semibold text-xs transition-all duration-200 border-2 ${
                    (roomInfo.pokerSettings?.smallBlind || 10) === blind.sb
                      ? 'bg-accent-purple/10 text-accent-purple border-accent-purple/40'
                      : 'bg-bg-warm text-text-mid border-[#e0d8cc]'
                  } ${isHost ? 'cursor-pointer' : 'cursor-default'}`}
                  style={{ padding: '8px 4px' }}
                >
                  {blind.sb}/{blind.bb}
                </motion.button>
              ))}
            </div>
          </div>
        )}
      </motion.div>

      {/* Player List */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="cartoon-card w-full max-w-md"
        style={{ padding: '20px 24px', marginBottom: '20px' }}
      >
        <div className="flex items-center justify-between" style={{ marginBottom: '18px' }}>
          <div className="flex items-center gap-2">
            <Users size={16} className="text-secondary" />
            <span className="text-sm font-bold text-text-mid uppercase tracking-wider">{t('playerList')}</span>
          </div>
          <span className={`tag-badge ${roomInfo.players.length >= 4 ? 'tag-badge-teal' : 'tag-badge-pink'}`} style={{ flexShrink: 0 }}>
            {roomInfo.players.length}/{roomInfo.gameMode === 'liardeck' ? 6 : roomInfo.gameMode === 'oldmaid' ? 6 : roomInfo.gameMode === 'poker' ? 6 : 8}
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {roomInfo.players.map((player, index) => (
            <motion.div
              key={player.id}
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.1 * index }}
              className={`flex items-center gap-3 rounded-2xl bg-bg-soft border-2 border-[#e8e0d4] ${player.id !== socketId ? 'cursor-pointer hover:border-primary/30' : ''}`}
              style={{ padding: '12px 14px' }}
              onClick={() => {
                if (player.id !== socketId) onSwapSeat(index);
              }}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg text-white ${
                player.isHost ? 'bg-gradient-to-br from-accent-yellow to-accent-orange' : 'bg-gradient-to-br from-primary to-primary-dark'
              }`} style={{ fontFamily: 'var(--font-display)' }}>
                {player.nickname[0].toUpperCase()}
              </div>
              <span className="flex-1 font-semibold text-text-dark">{player.nickname}</span>
              {player.isHost && (
                <span className="tag-badge tag-badge-gold" style={{ flexShrink: 0 }}>
                  <Crown size={12} /> HOST
                </span>
              )}
              {player.isReady ? (
                <CheckCircle size={20} className="text-primary" style={{ flexShrink: 0 }} />
              ) : (
                <Circle size={20} className="text-text-light" style={{ flexShrink: 0 }} />
              )}
              {isHost && !player.isHost && (
                <button
                  onClick={() => onKickPlayer(player.id)}
                  className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-accent-red/10 text-text-light hover:text-accent-red transition-colors cursor-pointer"
                  title="Kick"
                >
                  <X size={14} />
                </button>
              )}
            </motion.div>
          ))}

          {Array.from({ length: Math.max(0, 4 - roomInfo.players.length) }, (_, i) => (
            <div key={`empty-${i}`} className="flex items-center gap-3 rounded-2xl border-2 border-dashed border-[#e0d8cc] opacity-40" style={{ padding: '12px 14px' }}>
              <div className="w-10 h-10 rounded-xl bg-bg-warm flex items-center justify-center">
                <Hash size={16} className="text-text-light" />
              </div>
              <span className="text-text-light text-sm">{t('waiting')}</span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Chat */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.35 }}
        className="cartoon-card w-full max-w-md"
        style={{ padding: '16px 20px', marginBottom: '20px' }}
      >
        <div className="flex items-center gap-2" style={{ marginBottom: '12px' }}>
          <MessageCircle size={16} className="text-primary" />
          <span className="text-sm font-bold text-text-mid uppercase tracking-wider">{t('chat')}</span>
        </div>

        {/* Messages */}
        <div
          ref={chatContainerRef}
          style={{ maxHeight: '200px', minHeight: '100px', overflowY: 'auto', scrollbarWidth: 'thin' }}
          className="rounded-xl bg-bg-soft border border-[#e8e0d4]"
        >
          <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {chatMessages.map((msg, i) => (
              <div key={i} className={`text-xs ${msg.system ? 'text-text-light italic text-center' : 'text-text-dark'}`}>
                {msg.system ? (
                  msg.text
                ) : (
                  <>
                    <span className={`font-bold ${msg.senderId === socketId ? 'text-primary' : 'text-accent-purple'}`}>
                      {msg.nickname}
                    </span>
                    <span className="text-text-light">: </span>
                    <span>{msg.text}</span>
                  </>
                )}
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
        </div>

        {/* Input */}
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
            className="cartoon-input text-sm flex-1"
            style={{ padding: '8px 14px' }}
            maxLength={100}
          />
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              if (chatInput.trim()) {
                onSendMessage(chatInput.trim());
                setChatInput('');
              }
            }}
            className="pill-btn pill-btn-primary flex items-center justify-center"
            style={{ padding: '8px 14px', minWidth: '44px' }}
          >
            <Send size={16} />
          </motion.button>
        </div>
      </motion.div>

      {/* Ready + Start */}
      <div className="w-full max-w-md" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {/* Nút Sẵn sàng (chỉ cho người chơi, không phải host) */}
        {!isHost && (
          <motion.button
            initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.35 }}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => { onToggleReady(); meReady ? sfxUnready() : sfxReady(); }}
            className={`pill-btn w-full flex items-center justify-center gap-3 text-lg ${
              meReady ? 'pill-btn-accent' : 'pill-btn-secondary'
            }`}
            style={{ padding: '14px 36px' }}
          >
            {meReady ? <CheckCircle size={20} /> : <Circle size={20} />}
            {meReady ? t('ready') : t('notReady')}
          </motion.button>
        )}

        {/* Nút Bắt đầu (chỉ Host) */}
        {isHost && (
          <motion.button
            initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4 }}
            whileHover={{ scale: canStart && allReady ? 1.03 : 1 }}
            whileTap={{ scale: canStart && allReady ? 0.97 : 1 }}
            onClick={() => { onStartGame(); try { sfxGameStart(); } catch(e) {} }}
            disabled={!canStart || !allReady}
            className={`pill-btn pill-btn-primary w-full flex items-center justify-center gap-3 text-xl ${!allReady ? 'opacity-50 cursor-not-allowed' : ''}`}
            style={{ padding: '16px 36px' }}
          >
            <Play size={24} />
            {!allReady ? t('waitAllReady') : canStart ? t('startGame') : t('needMore', 4 - roomInfo.players.length)}
          </motion.button>
        )}

        {!isHost && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="text-center text-text-light" style={{ marginTop: '4px' }}>
            <p className="flex items-center gap-2 justify-center">
              <span className={`w-2 h-2 rounded-full animate-pulse ${meReady ? 'bg-primary' : 'bg-accent-red'}`} />
              {meReady ? t('waitingHost') : t('readyHint')}
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
