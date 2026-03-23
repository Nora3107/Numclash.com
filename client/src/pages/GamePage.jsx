import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Target, Clock, Send, CheckCircle, HelpCircle,
  Trophy, ChevronRight, Shield, AlertTriangle,
  Crown, Medal, Award, Circle
} from 'lucide-react';
import { useLang } from '../i18n';

export default function GamePage({
  roundData, revealData, gamePhase, setGamePhase,
  isHost, onSubmitNumber, onNextRound, socketId, leaderboard,
  onToggleReady, roomInfo,
}) {
  const [number, setNumber] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submittedNumber, setSubmittedNumber] = useState(null);
  const [timeLeft, setTimeLeft] = useState(36);
  const [revealStep, setRevealStep] = useState(0);
  const [showScoreboard, setShowScoreboard] = useState(false);
  const timerRef = useRef(null);
  const { t } = useLang();

  // Chỉ reset khi vòng mới bắt đầu (round number thay đổi), KHÔNG reset khi player status update
  const currentRound = roundData?.round;
  useEffect(() => {
    if (gamePhase === 'picking') {
      setNumber('');
      setSubmitted(false);
      setSubmittedNumber(null);
      setTimeLeft(roundData?.timeLimit || 36);
      setRevealStep(0);
      setShowScoreboard(false);
    }
  }, [gamePhase, currentRound]);

  useEffect(() => {
    if (gamePhase !== 'picking') return;
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          if (!submitted) handleSubmit(0, true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [gamePhase, submitted]);

  useEffect(() => {
    if (gamePhase !== 'reveal' || !revealData) return;
    setRevealStep(0);
    let step = 0;
    const interval = setInterval(() => {
      step++;
      setRevealStep(step);
      if (step >= revealData.results.length + 2) clearInterval(interval);
    }, 1200);
    return () => clearInterval(interval);
  }, [gamePhase, revealData]);

  const handleSubmit = async (val, auto = false) => {
    if (submitted) return;
    const num = auto ? 0 : parseInt(number) || 0;
    // Hiện số đã chọn ngay lập tức (optimistic update)
    setSubmittedNumber(num);
    setSubmitted(true);
    clearInterval(timerRef.current);
    // Gửi server, nếu lỗi thì revert
    const success = await onSubmitNumber(num);
    if (!success) {
      setSubmitted(false);
      setSubmittedNumber(null);
    }
  };

  const timerColor = timeLeft > 15 ? 'text-primary' : timeLeft > 5 ? 'text-accent-orange' : 'text-accent-red';
  const timerBg = timeLeft > 15 ? 'bg-primary/10 border-primary/20' : timeLeft > 5 ? 'bg-accent-orange/10 border-accent-orange/20' : 'bg-accent-red/10 border-accent-red/20';

  // ==========================================
  // PICKING PHASE
  // ==========================================
  if (gamePhase === 'picking' && roundData) {
    return (
      <div className="min-h-screen flex flex-col items-center px-6" style={{ paddingTop: '32px', paddingBottom: '32px' }}>
        {/* Round badge */}
        <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} style={{ marginBottom: '24px' }}>
          <span className="badge badge-teal text-sm" style={{ padding: '10px 20px' }}>
            {t('round')} {roundData.round}/{roundData.totalRounds}
          </span>
        </motion.div>

        {/* Target */}
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', damping: 12 }}
          className="cartoon-card text-center w-full max-w-sm"
          style={{ padding: '28px 32px', marginBottom: '20px' }}
        >
          <div className="flex items-center justify-center gap-2" style={{ marginBottom: '12px' }}>
            <Target size={20} className="text-accent-orange" />
            <span className="text-sm font-bold text-text-mid uppercase tracking-wider">{t('target')}</span>
          </div>
          <div
            className="text-7xl md:text-8xl font-black text-accent-orange"
            style={{ fontFamily: 'var(--font-display)', textShadow: '3px 3px 0 #cc7a40' }}
          >
            {roundData.target}
          </div>
          <p className="text-xs text-text-light" style={{ marginTop: '12px' }}>{t('safeHint', roundData.target)}</p>
        </motion.div>

        {/* Timer */}
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className={`flex items-center gap-3 rounded-full border-2 ${timerBg} ${timeLeft <= 5 ? 'animate-shake' : ''}`}
          style={{ marginBottom: '20px', padding: '10px 24px' }}
        >
          <Clock size={22} className={timerColor} />
          <span className={`text-4xl font-black ${timerColor} ${timeLeft <= 5 ? 'animate-timer-pulse' : ''}`} style={{ fontFamily: 'var(--font-display)' }}>
            {timeLeft}s
          </span>
        </motion.div>

        {/* Input / Locked */}
        {!submitted ? (
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }} className="w-full max-w-sm">
            <input
              type="number"
              value={number}
              onChange={(e) => {
                const v = e.target.value;
                if (v === '' || (parseInt(v) >= 0 && v.length <= 6)) setNumber(v);
              }}
              placeholder="0"
              className="cartoon-input text-center text-5xl font-black"
              style={{ fontFamily: 'var(--font-display)', height: '80px', borderRadius: '20px', marginBottom: '16px' }}
              min="0"
              autoFocus
            />
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => handleSubmit()}
              className="pill-btn pill-btn-primary w-full flex items-center justify-center gap-3 text-xl"
              style={{ padding: '16px' }}
            >
              <Send size={22} />
              {t('lockNumber')}
            </motion.button>
          </motion.div>
        ) : (
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="cartoon-card text-center w-full max-w-sm" style={{ padding: '28px 32px' }}>
            <CheckCircle size={32} className="text-primary mx-auto" style={{ marginBottom: '8px' }} />
            <p className="text-sm font-bold text-primary" style={{ marginBottom: '8px' }}>{t('locked')}</p>
            <div
              className="text-5xl font-black text-accent-orange"
              style={{ fontFamily: 'var(--font-display)', textShadow: '2px 2px 0 #cc7a40', marginBottom: '8px' }}
            >
              {submittedNumber}
            </div>
            <p className="text-text-light text-sm">{t('waitingOthers')}</p>
          </motion.div>
        )}

        {/* Player status */}
        {/* Trạng thái chọn số + Bảng điểm */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="w-full max-w-sm" style={{ marginTop: '24px' }}>
          {/* Trạng thái đã chọn/chưa */}
          <div className="flex flex-wrap gap-2.5 justify-center" style={{ marginBottom: '16px' }}>
            {roundData.players?.map((p) => (
              <div key={p.id} className={`flex items-center gap-2 rounded-full text-sm font-medium border-2 transition-all duration-300 ${
                p.hasPicked
                  ? 'bg-primary/10 text-primary border-primary/30'
                  : 'bg-bg-warm text-text-light border-[#e0d8cc]'
              }`} style={{ padding: '8px 16px' }}>
                {p.hasPicked ? <CheckCircle size={14} /> : <HelpCircle size={14} />}
                {p.nickname}
              </div>
            ))}
          </div>

          {/* Bảng điểm mini */}
          {leaderboard && leaderboard.length > 0 && (
            <div className="cartoon-card" style={{ padding: '16px 20px' }}>
              <p className="text-xs font-bold text-text-light uppercase tracking-wider" style={{ marginBottom: '10px' }}>
                🏆 {t('leaderboard')}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {leaderboard.map((p, i) => (
                  <div
                    key={p.id}
                    className={`flex items-center gap-2 rounded-xl border ${
                      p.id === socketId
                        ? 'bg-accent-blue/8 border-accent-blue/20'
                        : 'bg-bg-soft border-[#e8e0d4]'
                    }`}
                    style={{ padding: '8px 12px' }}
                  >
                    <span className="text-xs font-bold text-text-light w-5 text-center">{i + 1}</span>
                    <span className={`flex-1 text-sm font-semibold ${p.id === socketId ? 'text-accent-blue' : 'text-text-dark'}`}>
                      {p.nickname}
                    </span>
                    <span className="text-sm font-black text-primary" style={{ fontFamily: 'var(--font-display)' }}>
                      {p.score}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      </div>
    );
  }

  // ==========================================
  // REVEAL PHASE
  // ==========================================
  if (gamePhase === 'reveal' && revealData && !showScoreboard) {
    const { target, totalSum, isSafe, results } = revealData;
    const progressPercent = Math.min((totalSum / target) * 100, 150);
    const showTotal = revealStep > results.length;
    const revealDone = revealStep >= results.length + 2;

    return (
      <div className="min-h-screen flex flex-col items-center px-6" style={{ paddingTop: '32px', paddingBottom: '32px' }}>
        <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} style={{ marginBottom: '16px' }}>
          <span className="badge badge-purple text-sm" style={{ padding: '10px 20px' }}>
            {t('round')} {revealData.round}
          </span>
        </motion.div>

        <div className="flex items-center gap-2" style={{ marginBottom: '20px' }}>
          <Target size={16} className="text-accent-orange" />
          <span className="text-sm text-text-mid">{t('target')}: <span className="text-accent-orange font-bold text-lg">{target}</span></span>
        </div>

        {/* Player reveals */}
        <div className="w-full max-w-md" style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
          {results.map((r, i) => (
            <AnimatePresence key={r.id}>
              {revealStep > i && (
                <motion.div
                  initial={{ x: -40, opacity: 0, scale: 0.9 }}
                  animate={{ x: 0, opacity: 1, scale: 1 }}
                  transition={{ type: 'spring', damping: 15 }}
                  className={`flex items-center gap-3 rounded-2xl border-2 ${
                    r.id === socketId
                      ? 'bg-accent-blue/10 border-accent-blue/30 shadow-md'
                      : 'bg-white border-[#e8e0d4]'
                  }`}
                  style={{ padding: '14px 16px' }}
                >
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm text-white ${
                    r.id === socketId ? 'bg-accent-blue' : 'bg-text-light'
                  }`}>
                    {r.nickname[0].toUpperCase()}
                  </div>
                  <span className={`flex-1 font-semibold ${r.id === socketId ? 'text-accent-blue' : 'text-text-dark'}`}>
                    {r.nickname}
                  </span>
                  <span className="text-2xl font-black text-primary" style={{ fontFamily: 'var(--font-display)' }}>
                    {r.number}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          ))}
        </div>

        {/* Progress bar */}
        <AnimatePresence>
          {showTotal && (
            <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="w-full max-w-md" style={{ marginBottom: '24px' }}>
              <div className="relative h-12 rounded-full bg-bg-warm border-2 border-[#e0d8cc] overflow-hidden" style={{ marginBottom: '14px' }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(progressPercent, 100)}%` }}
                  transition={{ duration: 1.5, ease: 'easeOut' }}
                  className={`absolute inset-y-0 left-0 rounded-full ${
                    isSafe ? 'bg-gradient-to-r from-primary to-primary-light' : 'bg-gradient-to-r from-accent-red to-secondary'
                  }`}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="font-bold text-text-dark text-sm drop-shadow-sm">{totalSum} / {target}</span>
                </div>
              </div>

              <p className={`text-center text-sm font-semibold ${isSafe ? 'text-primary' : 'text-accent-red'}`} style={{ marginTop: '8px' }}>
                {isSafe ? t('safeRule') : t('overloadedRule')}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {revealDone && (
            <motion.button
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setShowScoreboard(true)}
              className="pill-btn pill-btn-accent w-full max-w-md flex items-center justify-center gap-3 text-lg py-4"
            >
              <Trophy size={20} />
              {t('viewLeaderboard')}
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // ==========================================
  // SCOREBOARD PHASE
  // ==========================================
  if (gamePhase === 'reveal' && revealData && showScoreboard) {
    const { results, leaderboard, isLastRound } = revealData;

    return (
      <div className="min-h-screen flex flex-col items-center px-6" style={{ paddingTop: '32px', paddingBottom: '32px' }}>
        {/* Header */}
        <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="text-center" style={{ marginBottom: '24px' }}>
          <div className="flex items-center justify-center gap-3 mb-3">
            <Trophy size={28} className="text-accent-yellow" />
            <h2
              className="text-2xl md:text-3xl font-black text-accent-orange"
              style={{ fontFamily: 'var(--font-display)', textShadow: '2px 2px 0 #cc7a40' }}
            >
              {t('leaderboard')}
            </h2>
            <Trophy size={28} className="text-accent-yellow" />
          </div>
          <span className="text-sm text-text-light">{t('afterRound', revealData.round)}</span>
        </motion.div>

        {/* Leaderboard (trên) */}
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }}
          className="cartoon-card w-full max-w-md"
          style={{ padding: '24px 28px', marginBottom: '20px' }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {leaderboard.map((p, i) => {
              const isMe = p.id === socketId;
              const rankColors = [
                'bg-accent-yellow/10 border-accent-yellow/30',
                'bg-bg-warm border-text-light/20',
                'bg-accent-orange/10 border-accent-orange/20',
              ];
              return (
                <motion.div
                  key={p.id}
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.2 + i * 0.1 }}
                  className={`flex items-center gap-3 rounded-2xl border-2 ${
                    isMe ? 'bg-accent-blue/10 border-accent-blue/30 shadow-md' :
                    i < 3 ? rankColors[i] : 'bg-bg-soft border-[#e8e0d4]'
                  }`}
                  style={{ padding: '14px 16px' }}
                >
                  <span className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold text-white ${
                    i === 0 ? 'bg-accent-yellow' : i === 1 ? 'bg-text-light' : i === 2 ? 'bg-accent-orange' : 'bg-[#ccc5b9]'
                  }`}>
                    {i === 0 ? <Crown size={16} /> : i === 1 ? <Medal size={16} /> : i === 2 ? <Award size={16} /> : i + 1}
                  </span>
                  <span className={`flex-1 font-semibold ${isMe ? 'text-accent-blue' : 'text-text-dark'}`}>
                    {p.nickname}
                  </span>
                  <span className="text-xl font-black text-primary" style={{ fontFamily: 'var(--font-display)' }}>
                    {p.score}
                  </span>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* Ready + Next round */}
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }} className="w-full max-w-md" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {(() => {
            const meReady = roomInfo?.players?.find(p => p.id === socketId)?.isReady;
            const allReady = roomInfo?.players?.every(p => p.isReady);
            return (
              <>
                {!isHost && (
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={onToggleReady}
                    className={`pill-btn w-full flex items-center justify-center gap-3 text-lg ${
                      meReady ? 'pill-btn-accent' : 'pill-btn-secondary'
                    }`}
                    style={{ padding: '14px' }}
                  >
                    {meReady ? <CheckCircle size={20} /> : <Circle size={20} />}
                    {meReady ? t('ready') : t('notReady')}
                  </motion.button>
                )}

                {isHost && (
                  <motion.button
                    whileHover={{ scale: allReady ? 1.03 : 1 }}
                    whileTap={{ scale: allReady ? 0.97 : 1 }}
                    onClick={onNextRound}
                    disabled={!allReady}
                    className={`pill-btn pill-btn-primary w-full flex items-center justify-center gap-3 text-lg ${!allReady ? 'opacity-50 cursor-not-allowed' : ''}`}
                    style={{ padding: '16px' }}
                  >
                    {isLastRound ? (<><Trophy size={20} />{!allReady ? t('waitAllReady') : t('viewFinal')}</>) : (<><ChevronRight size={20} />{!allReady ? t('waitAllReady') : t('nextRound')}</>)}
                  </motion.button>
                )}

                {!isHost && (
                  <p className="text-center text-text-light flex items-center justify-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                    {t('waitingHostShort')}
                  </p>
                )}
              </>
            );
          })()}
        </motion.div>

        {/* Round points recap (dưới cùng) */}
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.5 }}
          className="cartoon-card w-full max-w-md"
          style={{ padding: '24px 28px', marginTop: '20px' }}
        >
          <p className="text-xs font-bold text-text-light uppercase tracking-wider" style={{ marginBottom: '14px' }}>{t('roundPoints')}</p>
          <div className="flex flex-wrap gap-3">
            {results.filter(r => r.points > 0).map((r, i) => (
              <motion.div
                key={r.id}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.6 + i * 0.1, type: 'spring' }}
                className={`badge text-sm ${
                  r.rank === 1 ? 'badge-gold' : r.rank === 2 ? 'badge-teal' : r.rank === 3 ? 'badge-pink' : 'badge-purple'
                }`}
              >
                {r.rank === 1 ? <Crown size={12} /> : r.rank === 2 ? <Medal size={12} /> : r.rank === 3 ? <Award size={12} /> : `#${r.rank}`}
                {r.nickname}
                <span className="text-primary font-bold">+{r.points}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
        className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full" />
    </div>
  );
}
