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
  const [showTutorial, setShowTutorial] = useState(true);
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
      if (step >= revealData.results.length + 3) clearInterval(interval);
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

        {/* Tutorial overlay - round 1 only */}
        <AnimatePresence>
          {showTutorial && roundData.round === 1 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowTutorial(false)}
              className="fixed inset-0 z-50 flex items-center justify-center cursor-pointer"
              style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
            >
              <motion.div
                initial={{ scale: 0.8, y: 30 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.8, y: 30 }}
                transition={{ type: 'spring', damping: 15 }}
                className="cartoon-card text-center mx-6"
                style={{ padding: '32px 28px', maxWidth: '380px' }}
              >
                <h2 className="text-xl font-black text-primary" style={{ fontFamily: 'var(--font-display)', marginBottom: '20px' }}>
                  {t('tutorialTitle')}
                </h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', textAlign: 'left' }}>
                  <p className="text-sm font-semibold text-text-dark">{t('tutorialLine1')}</p>
                  <p className="text-sm font-semibold text-text-dark">{t('tutorialLine2')}</p>
                  <p className="text-sm font-semibold text-text-dark">{t('tutorialLine3')}</p>
                </div>
                <p className="text-xs text-text-light" style={{ marginTop: '24px' }}>
                  {t('tutorialDismiss')}
                </p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
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
    const showTotal = revealStep > results.length;
    const showWinner = revealStep >= results.length + 2;
    const revealDone = revealStep >= results.length + 3;

    // Calculate running sum based on revealed numbers
    const runningSum = results.slice(0, Math.min(revealStep, results.length)).reduce((s, r) => s + r.number, 0);

    // Find winner (highest if safe, lowest if overloaded)
    const winner = results.length > 0 ? results.reduce((best, r) =>
      isSafe ? (r.number > best.number ? r : best) : (r.number < best.number ? r : best)
    , results[0]) : null;

    return (
      <div className="min-h-screen flex flex-col items-center px-6" style={{ paddingTop: '32px', paddingBottom: '32px' }}>
        {/* Round badge */}
        <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} style={{ marginBottom: '16px' }}>
          <span className="badge badge-purple text-sm" style={{ padding: '10px 20px' }}>
            {t('round')} {revealData.round}
          </span>
        </motion.div>

        {/* Target display */}
        <div className="flex items-center gap-2" style={{ marginBottom: '24px' }}>
          <Target size={16} className="text-accent-orange" />
          <span className="text-sm text-text-mid">{t('target')}: <span className="text-accent-orange font-bold text-lg">{target}</span></span>
        </div>

        {/* === Numbers reveal horizontally === */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="cartoon-card w-full max-w-md text-center"
          style={{ padding: '24px 16px', marginBottom: '24px' }}
        >
          {/* Player numbers in a horizontal row */}
          <div className="flex flex-wrap items-center justify-center gap-1" style={{ marginBottom: '16px', minHeight: '50px' }}>
            {results.map((r, i) => (
              <AnimatePresence key={r.id}>
                {revealStep > i && (
                  <>
                    {i > 0 && (
                      <motion.span
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="text-lg font-bold text-text-light"
                      >
                        +
                      </motion.span>
                    )}
                    <motion.div
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: 'spring', damping: 10, stiffness: 200 }}
                      className="flex flex-col items-center"
                    >
                      <span
                        className={`text-3xl font-black ${r.id === socketId ? 'text-accent-blue' : 'text-primary'}`}
                        style={{ fontFamily: 'var(--font-display)' }}
                      >
                        {r.number}
                      </span>
                      <span className={`text-[10px] font-semibold ${r.id === socketId ? 'text-accent-blue/70' : 'text-text-light'}`}>
                        {r.nickname}
                      </span>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            ))}
          </div>

          {/* Divider */}
          <div className="h-px bg-[#e8e0d4]" style={{ marginBottom: '12px' }} />

          {/* Running sum */}
          <div className="flex items-center justify-center gap-2">
            <span className="text-sm font-bold text-text-mid uppercase tracking-wider">{t('total')}:</span>
            <motion.span
              key={runningSum}
              initial={{ scale: 1.4, color: '#2bb5a0' }}
              animate={{ scale: 1, color: runningSum > target ? '#e85d75' : '#2bb5a0' }}
              className="text-3xl font-black"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              {revealStep > 0 ? runningSum : '?'}
            </motion.span>
          </div>
        </motion.div>

        {/* === Sum vs Target comparison === */}
        <AnimatePresence>
          {showTotal && (
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', damping: 12 }}
              className="cartoon-card w-full max-w-md text-center"
              style={{ padding: '24px 20px', marginBottom: '20px' }}
            >
              <div className="flex items-center justify-center gap-4" style={{ marginBottom: '16px' }}>
                <div className="flex flex-col items-center">
                  <span className="text-xs font-bold text-text-light uppercase">{t('total')}</span>
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', delay: 0.3 }}
                    className={`text-4xl font-black ${isSafe ? 'text-primary' : 'text-accent-red'}`}
                    style={{ fontFamily: 'var(--font-display)' }}
                  >
                    {totalSum}
                  </motion.span>
                </div>
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.5 }}
                  className={`text-2xl font-black ${isSafe ? 'text-primary' : 'text-accent-red'}`}
                >
                  {isSafe ? '≤' : '>'}
                </motion.span>
                <div className="flex flex-col items-center">
                  <span className="text-xs font-bold text-text-light uppercase">{t('target')}</span>
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', delay: 0.3 }}
                    className="text-4xl font-black text-accent-orange"
                    style={{ fontFamily: 'var(--font-display)' }}
                  >
                    {target}
                  </motion.span>
                </div>
              </div>

              <motion.div
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.7 }}
                className={`rounded-full inline-flex items-center gap-2 ${isSafe ? 'bg-primary/10 text-primary' : 'bg-accent-red/10 text-accent-red'}`}
                style={{ padding: '8px 20px' }}
              >
                {isSafe ? <Shield size={16} /> : <AlertTriangle size={16} />}
                <span className="text-sm font-bold">{isSafe ? t('safeRule') : t('overloadedRule')}</span>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* === Winner announcement === */}
        <AnimatePresence>
          {showWinner && winner && (
            <motion.div
              initial={{ scale: 0, opacity: 0, rotate: -5 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              transition={{ type: 'spring', damping: 10 }}
              className={`cartoon-card w-full max-w-md text-center border-2 ${isSafe ? 'border-primary/30' : 'border-accent-red/30'}`}
              style={{ padding: '24px 20px', marginBottom: '24px' }}
            >
              <motion.div
                animate={{ rotate: [0, -10, 10, -5, 5, 0] }}
                transition={{ duration: 0.8, delay: 0.3 }}
                style={{ marginBottom: '8px' }}
              >
                <Crown size={32} className="text-accent-yellow mx-auto" />
              </motion.div>
              <p className="text-xs font-bold text-text-light uppercase tracking-wider" style={{ marginBottom: '4px' }}>
                {isSafe ? t('highestWins') : t('lowestWins')}
              </p>
              <p className="text-2xl font-black text-text-dark" style={{ fontFamily: 'var(--font-display)', marginBottom: '4px' }}>
                {winner.nickname}
              </p>
              <span
                className={`text-4xl font-black ${isSafe ? 'text-primary' : 'text-accent-red'}`}
                style={{ fontFamily: 'var(--font-display)' }}
              >
                {winner.number}
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* View leaderboard button */}
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
