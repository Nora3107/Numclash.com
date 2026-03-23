import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Copy, Check, Crown, Users, Play, Settings, Hash, CheckCircle, Circle, LogOut, Globe, Lock, MessageCircle, Send } from 'lucide-react';
import { useLang } from '../i18n';

const ROUND_OPTIONS = [1, 4, 8, 18, 36];

export default function LobbyPage({ roomInfo, roomCode, isHost, onStartGame, onSetRounds, onToggleReady, onLeaveRoom, socketId, onToggleRoomPublic, onSetRoomName, chatMessages = [], onSendMessage }) {
  const [copied, setCopied] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const chatEndRef = useRef(null);
  const { t } = useLang();

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const copyCode = () => {
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
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
          <span className={`badge ${roomInfo.players.length >= 4 ? 'badge-teal' : 'badge-pink'}`}>
            {roomInfo.players.length}/8
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {roomInfo.players.map((player, index) => (
            <motion.div
              key={player.id}
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.1 * index }}
              className="flex items-center gap-3 rounded-2xl bg-bg-soft border-2 border-[#e8e0d4]"
              style={{ padding: '12px 14px' }}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg text-white ${
                player.isHost ? 'bg-gradient-to-br from-accent-yellow to-accent-orange' : 'bg-gradient-to-br from-primary to-primary-dark'
              }`} style={{ fontFamily: 'var(--font-display)' }}>
                {player.nickname[0].toUpperCase()}
              </div>
              <span className="flex-1 font-semibold text-text-dark">{player.nickname}</span>
              {player.isHost && (
                <span className="badge badge-gold">
                  <Crown size={12} /> HOST
                </span>
              )}
              {player.isReady ? (
                <CheckCircle size={20} className="text-primary" />
              ) : (
                <Circle size={20} className="text-text-light" />
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
          style={{ maxHeight: '200px', overflowY: 'auto', scrollbarWidth: 'thin' }}
          className="rounded-xl bg-bg-soft border border-[#e8e0d4]"
        >
          <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {chatMessages.length === 0 && (
              <p className="text-xs text-text-light text-center" style={{ padding: '8px 0' }}>💬</p>
            )}
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
            onClick={onToggleReady}
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
            onClick={onStartGame}
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
