import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Globe } from 'lucide-react';
import socket from './socket';
import { useLang } from './i18n';
import HomePage from './pages/HomePage';
import LobbyPage from './pages/LobbyPage';
import GamePage from './pages/GamePage';
import ResultsPage from './pages/ResultsPage';

function App() {
  const [screen, setScreen] = useState('home');
  const [nickname, setNickname] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [roomInfo, setRoomInfo] = useState(null);
  const [isHost, setIsHost] = useState(false);
  const [error, setError] = useState('');

  const [roundData, setRoundData] = useState(null);
  const [revealData, setRevealData] = useState(null);
  const [finalScores, setFinalScores] = useState(null);
  const [gamePhase, setGamePhase] = useState('picking');
  const [leaderboard, setLeaderboard] = useState([]);

  const clearError = useCallback(() => setError(''), []);
  const { t, lang, toggleLang } = useLang();

  useEffect(() => {
    socket.on('room-updated', (info) => setRoomInfo(info));
    socket.on('round-start', (data) => {
      setRoundData(data);
      setRevealData(null);
      setGamePhase('picking');
      setScreen('game');
    });
    socket.on('player-status-updated', (players) => {
      setRoundData(prev => prev ? { ...prev, players } : prev);
    });
    socket.on('round-reveal', (data) => {
      setRevealData(data);
      setGamePhase('reveal');
      if (data.leaderboard) setLeaderboard(data.leaderboard);
    });
    socket.on('game-finished', ({ finalScores }) => {
      setFinalScores(finalScores);
      setScreen('results');
    });
    socket.on('back-to-lobby', (info) => {
      setRoomInfo(info);
      setRoundData(null);
      setRevealData(null);
      setFinalScores(null);
      setGamePhase('picking');
      setScreen('lobby');
    });
    socket.on('left-room', () => {
      setRoomInfo(null);
      setRoomCode('');
      setIsHost(false);
      setRoundData(null);
      setRevealData(null);
      setFinalScores(null);
      setGamePhase('picking');
      setScreen('home');
    });
    socket.on('connect_error', () => {
      setError(lang === 'vi' ? 'Mất kết nối đến server!' : 'Connection lost!');
    });
    return () => {
      socket.off('room-updated');
      socket.off('round-start');
      socket.off('player-status-updated');
      socket.off('round-reveal');
      socket.off('game-finished');
      socket.off('back-to-lobby');
      socket.off('left-room');
      socket.off('connect_error');
    };
  }, []);

  const handleCreateRoom = useCallback(() => {
    if (!nickname.trim()) { setError(t('enterNickname')); return; }
    socket.emit('create-room', { nickname: nickname.trim() }, (res) => {
      if (res.success) {
        setRoomCode(res.roomCode);
        setRoomInfo(res.roomInfo);
        setIsHost(true);
        setScreen('lobby');
        setError('');
      } else setError(t(res.error) || res.error);
    });
  }, [nickname, t]);

  const handleJoinRoom = useCallback((code) => {
    if (!nickname.trim()) { setError(t('enterNickname')); return; }
    if (!code.trim()) { setError(t('enterCode')); return; }
    socket.emit('join-room', { roomCode: code.trim(), nickname: nickname.trim() }, (res) => {
      if (res.success) {
        setRoomCode(res.roomCode);
        setRoomInfo(res.roomInfo);
        setIsHost(false);
        setScreen('lobby');
        setError('');
      } else setError(t(res.error) || res.error);
    });
  }, [nickname, t]);

  const handleStartGame = useCallback(() => {
    socket.emit('start-game', { roomCode }, (res) => { if (!res.success) setError(t(res.error) || res.error); });
  }, [roomCode]);

  const handleSubmitNumber = useCallback((number) => {
    return new Promise((resolve) => {
      socket.emit('submit-number', { roomCode, number }, (res) => {
        if (!res.success) { setError(res.error); resolve(false); }
        else resolve(true);
      });
    });
  }, [roomCode]);

  const handleNextRound = useCallback(() => { socket.emit('next-round', { roomCode }); }, [roomCode]);
  const handlePlayAgain = useCallback(() => { socket.emit('play-again', { roomCode }); }, [roomCode]);
  const handleSetRounds = useCallback((rounds) => { socket.emit('set-rounds', { roomCode, rounds }); }, [roomCode]);
  const handleToggleReady = useCallback(() => { socket.emit('toggle-ready', { roomCode }); }, [roomCode]);
  const handleLeaveRoom = useCallback(() => { socket.emit('leave-room'); }, []);

  useEffect(() => {
    if (roomInfo) setIsHost(roomInfo.hostId === socket.id);
  }, [roomInfo]);

  const pageVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
    exit: { opacity: 0, y: -20, transition: { duration: 0.3 } },
  };

  return (
    <div className="min-h-screen bg-bg-cream bg-dots-pattern relative overflow-hidden">
      {/* Decorative blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-150px] left-[-100px] w-[400px] h-[400px] rounded-full bg-primary/5 blur-[80px]" />
        <div className="absolute bottom-[-150px] right-[-100px] w-[400px] h-[400px] rounded-full bg-secondary/5 blur-[80px]" />
        <div className="absolute top-1/2 left-1/2 w-[300px] h-[300px] rounded-full bg-accent-yellow/5 blur-[100px]" />
      </div>

      {/* Language toggle */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={toggleLang}
        className="fixed top-4 right-4 z-50 flex items-center gap-2 rounded-full bg-white/90 backdrop-blur-sm border-2 border-[#e0d8cc] text-sm font-bold text-text-mid hover:border-primary hover:text-primary transition-all cursor-pointer shadow-sm"
        style={{ padding: '8px 16px' }}
      >
        <Globe size={16} />
        {lang === 'vi' ? 'EN' : 'VI'}
      </motion.button>

      {/* Error toast */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ y: -80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -80, opacity: 0 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-50 rounded-2xl bg-accent-red/10 border-2 border-accent-red/30 text-accent-red font-semibold backdrop-blur-sm max-w-md text-center shadow-lg"
            style={{ padding: '14px 32px' }}
            onClick={clearError}
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Screens */}
      <AnimatePresence mode="wait">
        {screen === 'home' && (
          <motion.div key="home" {...pageVariants}>
            <HomePage nickname={nickname} setNickname={setNickname} onCreateRoom={handleCreateRoom} onJoinRoom={handleJoinRoom} />
          </motion.div>
        )}
        {screen === 'lobby' && (
          <motion.div key="lobby" {...pageVariants}>
            <LobbyPage roomInfo={roomInfo} roomCode={roomCode} isHost={isHost} onStartGame={handleStartGame} onSetRounds={handleSetRounds} onToggleReady={handleToggleReady} onLeaveRoom={handleLeaveRoom} socketId={socket.id} />
          </motion.div>
        )}
        {screen === 'game' && (
          <motion.div key="game" {...pageVariants}>
            <GamePage roundData={roundData} revealData={revealData} gamePhase={gamePhase} setGamePhase={setGamePhase} isHost={isHost} onSubmitNumber={handleSubmitNumber} onNextRound={handleNextRound} socketId={socket.id} leaderboard={leaderboard} onToggleReady={handleToggleReady} roomInfo={roomInfo} />
          </motion.div>
        )}
        {screen === 'results' && (
          <motion.div key="results" {...pageVariants}>
            <ResultsPage finalScores={finalScores} isHost={isHost} onPlayAgain={handlePlayAgain} onLeaveRoom={handleLeaveRoom} socketId={socket.id} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;
