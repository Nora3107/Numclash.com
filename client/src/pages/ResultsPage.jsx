import { motion } from 'framer-motion';
import { Trophy, Crown, Medal, Award, RotateCcw, Sparkles, LogOut } from 'lucide-react';
import { useLang } from '../i18n';

export default function ResultsPage({ finalScores, isHost, onPlayAgain, onLeaveRoom, socketId }) {
  const { t } = useLang();
  if (!finalScores || finalScores.length === 0) return null;

  const podium = finalScores.slice(0, 3);
  const rest = finalScores.slice(3);

  const podiumDisplay = podium.length >= 3
    ? [podium[1], podium[0], podium[2]]
    : podium.length === 2 ? [podium[1], podium[0]] : [podium[0]];

  const podiumHeights = ['h-28', 'h-40', 'h-20'];
  const podiumColors = [
    'from-[#c0c0c0]/40 to-[#d0d0d0]/20 border-[#b0b0b0]',
    'from-accent-yellow/40 to-accent-orange/20 border-accent-yellow',
    'from-[#cd7f32]/30 to-[#da9048]/15 border-[#cd7f32]',
  ];
  const podiumIcons = [
    <Medal size={28} className="text-[#b0b0b0]" />,
    <Crown size={36} className="text-accent-yellow" />,
    <Award size={24} className="text-[#cd7f32]" />,
  ];
  const podiumLabels = ['#2', '#1', '#3'];

  return (
    <div className="min-h-screen flex flex-col items-center px-6 relative overflow-hidden" style={{ paddingTop: '60px', paddingBottom: '48px' }}>
      {/* Confetti */}
      {Array.from({ length: 20 }, (_, i) => (
        <motion.div
          key={i}
          initial={{ y: -20, x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 800), opacity: 1 }}
          animate={{
            y: (typeof window !== 'undefined' ? window.innerHeight : 800) + 20,
            x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 800),
            rotate: Math.random() * 720,
            opacity: 0,
          }}
          transition={{ duration: 3 + Math.random() * 3, delay: Math.random() * 2, repeat: Infinity, repeatDelay: Math.random() * 3 }}
          className="fixed w-3 h-3 rounded-sm pointer-events-none z-0"
          style={{ background: ['#2bb5a0', '#ff7eb3', '#60b5ff', '#ffd166', '#a78bfa', '#ff9a56'][i % 6] }}
        />
      ))}

      {/* Header */}
      <motion.div initial={{ y: -30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="text-center relative z-10" style={{ marginBottom: '40px' }}>
        <motion.div animate={{ rotate: [0, 5, -5, 0] }} transition={{ duration: 2, repeat: Infinity }} className="inline-block mb-4">
          <Trophy size={52} className="text-accent-yellow mx-auto" />
        </motion.div>
        <h1
          className="text-4xl md:text-5xl font-black text-accent-orange"
          style={{ fontFamily: 'var(--font-display)', textShadow: '3px 3px 0 #cc7a40' }}
        >
          {t('finalResults')}
        </h1>
      </motion.div>

      {/* Podium */}
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="flex items-end justify-center gap-6 md:gap-10 relative z-10 w-full max-w-md mx-auto"
        style={{ marginBottom: '32px' }}
      >
        {podiumDisplay.map((player, displayIndex) => {
          const actualRank = displayIndex === 1 ? 0 : displayIndex === 0 ? 1 : 2;
          if (!player) return null;
          const heights = [112, 160, 80]; // px: #2, #1, #3
          const widths = podiumDisplay.length === 1 ? ['200px'] : podiumDisplay.length === 2 ? ['140px', '160px'] : ['120px', '150px', '120px'];
          return (
            <motion.div
              key={player.id}
              initial={{ y: 60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5 + displayIndex * 0.2, type: 'spring', damping: 12 }}
              className="flex flex-col items-center"
              style={{ width: widths[displayIndex] }}
            >
              <motion.div animate={actualRank === 0 ? { y: [0, -8, 0] } : {}} transition={{ duration: 2, repeat: Infinity }}>
                {podiumIcons[displayIndex]}
              </motion.div>
              <span className={`mt-2 font-bold text-sm truncate max-w-full text-center ${
                player.id === socketId ? 'text-accent-blue' : 'text-text-dark'
              }`}>
                {player.nickname}
              </span>
              <span className="text-2xl md:text-3xl font-black text-primary mt-1" style={{ fontFamily: 'var(--font-display)' }}>
                {player.score}
              </span>
              <div
                className={`w-full mt-3 rounded-t-2xl bg-gradient-to-t ${podiumColors[displayIndex]} border-2 border-b-0 flex items-center justify-center`}
                style={{ height: `${heights[displayIndex]}px` }}
              >
                <span className="text-2xl font-black text-white" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.2), 0 1px 0 rgba(0,0,0,0.1)' }}>{podiumLabels[displayIndex]}</span>
              </div>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Rest */}
      {rest.length > 0 && (
        <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 1 }}
          className="w-full max-w-md cartoon-card p-6 mb-10 relative z-10"
        >
          <div className="space-y-3">
            {rest.map((player, i) => (
              <motion.div
                key={player.id}
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 1.2 + i * 0.1 }}
                className={`flex items-center gap-3 rounded-2xl ${
                  player.id === socketId
                    ? 'bg-accent-blue/10'
                    : 'bg-bg-soft'
                }`}
                style={{ padding: '14px 16px', border: '1.5px solid #e8e0d4' }}
              >
                <span className="text-lg font-black text-text-light" style={{ minWidth: '36px', textAlign: 'center', textShadow: '0 1px 2px rgba(0,0,0,0.1)' }}>
                  #{i + 4}
                </span>
                <span className={`flex-1 font-semibold ${player.id === socketId ? 'text-accent-blue' : 'text-text-dark'}`}>
                  {player.nickname}
                </span>
                <span className="text-xl font-black text-primary" style={{ fontFamily: 'var(--font-display)' }}>
                  {player.score}
                </span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Winner */}
      {finalScores[0]?.id === socketId && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 1.5, type: 'spring' }}
          className="flex items-center gap-3 rounded-full bg-accent-yellow/20 border border-accent-yellow/40 text-accent-orange font-bold relative z-10"
          style={{ padding: '16px 44px', marginTop: '24px', marginBottom: '24px' }}
        >
          <Sparkles size={20} />
          {t('congrats')}
          <Sparkles size={20} />
        </motion.div>
      )}

      {/* Play Again */}
      {isHost ? (
        <motion.button
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 1.5 }}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={onPlayAgain}
          className="pill-btn pill-btn-primary flex items-center justify-center gap-3 text-lg py-4 px-10 relative z-10"
          style={{ marginTop: '24px' }}
        >
          <RotateCcw size={20} />
          {t('playAgain')}
        </motion.button>
      ) : (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.5 }}
          className="flex flex-col items-center gap-4 relative z-10"
          style={{ marginTop: '24px' }}
        >
          <p className="text-text-light flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            {t('waitingHostShort')}
          </p>
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={onLeaveRoom}
            className="pill-btn pill-btn-ghost flex items-center justify-center gap-2 text-sm"
            style={{ padding: '10px 24px' }}
          >
            <LogOut size={16} />
            {t('leaveRoom')}
          </motion.button>
        </motion.div>
      )}
    </div>
  );
}
