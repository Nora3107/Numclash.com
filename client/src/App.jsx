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
  const [publicRooms, setPublicRooms] = useState([]);
  const [chatMessages, setChatMessages] = useState([]);

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
      setChatMessages([]);
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
      setChatMessages([]);
    });
    socket.on('kicked', () => {
      setRoomInfo(null);
      setRoomCode('');
      setIsHost(false);
      setRoundData(null);
      setRevealData(null);
      setFinalScores(null);
      setGamePhase('picking');
      setScreen('home');
      setChatMessages([]);
      setError('Bạn đã bị kick vì quá xàm lul 🫵😂');
    });
    socket.on('connect_error', () => {
      setError(lang === 'vi' ? 'Mất kết nối đến server!' : 'Connection lost!');
    });
    socket.on('public-rooms-updated', (rooms) => setPublicRooms(rooms));
    socket.on('new-message', (msg) => setChatMessages(prev => [...prev.slice(-49), msg]));
    return () => {
      socket.off('room-updated');
      socket.off('round-start');
      socket.off('player-status-updated');
      socket.off('round-reveal');
      socket.off('game-finished');
      socket.off('back-to-lobby');
      socket.off('left-room');
      socket.off('kicked');
      socket.off('connect_error');
      socket.off('public-rooms-updated');
      socket.off('new-message');
    };
  }, []);

  // Join/leave home-browser room based on screen
  useEffect(() => {
    if (screen === 'home') {
      socket.emit('join-home-browser');
    } else {
      socket.emit('leave-home-browser');
    }
  }, [screen]);

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
  const handleToggleRoomPublic = useCallback(() => { socket.emit('toggle-room-public', { roomCode }); }, [roomCode]);
  const handleSetRoomName = useCallback((name) => { socket.emit('set-room-name', { roomCode, name }); }, [roomCode]);
  const handleSendMessage = useCallback((text) => { socket.emit('send-message', { roomCode, text }); }, [roomCode]);
  const handleKickPlayer = useCallback((targetId) => { socket.emit('kick-player', { roomCode, targetId }); }, [roomCode]);
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
    <div className="min-h-screen bg-bg-cream bg-dots-pattern relative">
      {/* Floating numbers background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 1 }}>
        {[
          { num: 18, top: '8%', left: '5%', size: '4rem', dur: 9, dx: 30, dy: 20, rot: 15, opacity: 0.20 },
          { num: 36, top: '70%', right: '8%', size: '3.5rem', dur: 11, dx: -25, dy: 15, rot: -10, opacity: 0.20 },
          { num: 7, top: '15%', right: '12%', size: '2.5rem', dur: 7.5, dx: -20, dy: 25, rot: 12, opacity: 0.20 },
          { num: 3, top: '55%', left: '3%', size: '2rem', dur: 10, dx: 35, dy: -15, rot: -8, opacity: 0.20 },
          { num: 42, top: '30%', right: '5%', size: '3rem', dur: 12.5, dx: -15, dy: 20, rot: 10, opacity: 0.20 },
          { num: 9, top: '80%', left: '15%', size: '2.2rem', dur: 8.5, dx: 20, dy: -25, rot: -12, opacity: 0.20 },
          { num: 70, top: '5%', left: '45%', size: '2.8rem', dur: 11.5, dx: -10, dy: 30, rot: 8, opacity: 0.20 },
          { num: 1, top: '45%', right: '3%', size: '1.8rem', dur: 9.5, dx: -30, dy: -10, rot: 15, opacity: 0.20 },
          { num: 25, top: '88%', left: '55%', size: '2.5rem', dur: 10.5, dx: 15, dy: -20, rot: -6, opacity: 0.20 },
          { num: 0, top: '35%', left: '8%', size: '2rem', dur: 8, dx: 25, dy: 15, rot: 10, opacity: 0.20 },
          { num: 56, top: '60%', right: '20%', size: '2.3rem', dur: 12, dx: -20, dy: -15, rot: -14, opacity: 0.20 },
          { num: 14, top: '20%', left: '30%', size: '1.6rem', dur: 13, dx: 10, dy: 20, rot: 6, opacity: 0.20 },
          { num: 88, top: '12%', left: '65%', size: '2rem', dur: 10, dx: 18, dy: -22, rot: -9, opacity: 0.20 },
          { num: 5, top: '40%', left: '22%', size: '1.7rem', dur: 9, dx: -22, dy: 18, rot: 7, opacity: 0.20 },
          { num: 33, top: '75%', left: '40%', size: '2.4rem', dur: 12, dx: 12, dy: 25, rot: -11, opacity: 0.20 },
          { num: 99, top: '50%', left: '70%', size: '1.9rem', dur: 11, dx: -28, dy: -12, rot: 13, opacity: 0.20 },
          { num: 21, top: '92%', right: '30%', size: '2.1rem', dur: 9.5, dx: 16, dy: 18, rot: -7, opacity: 0.20 },
          { num: 47, top: '25%', left: '85%', size: '1.8rem', dur: 13.5, dx: -14, dy: -20, rot: 9, opacity: 0.20 },
          { num: 6, top: '65%', left: '60%', size: '1.5rem', dur: 10.5, dx: 20, dy: 14, rot: -5, opacity: 0.20 },
          { num: 82, top: '3%', right: '35%', size: '2.6rem', dur: 11.5, dx: -18, dy: 22, rot: 11, opacity: 0.20 },
        ].map((n, i) => (
          <motion.span
            key={i}
            animate={{
              x: [0, n.dx, -n.dx * 0.5, 0],
              y: [0, n.dy, -n.dy * 0.7, 0],
              rotate: [0, n.rot, -n.rot * 0.5, 0],
            }}
            transition={{ duration: n.dur, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute select-none font-black"
            style={{
              top: n.top, left: n.left, right: n.right,
              fontSize: n.size,
              opacity: n.opacity,
              fontFamily: 'var(--font-display)',
              color: '#c4b8a8',
            }}
          >
            {n.num}
          </motion.span>
        ))}
      </div>

      {/* Language toggle */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={toggleLang}
        className="absolute top-4 right-4 z-50 flex items-center gap-2 rounded-full bg-white/90 backdrop-blur-sm border-2 border-[#e0d8cc] text-sm font-bold text-text-mid hover:border-primary hover:text-primary transition-all cursor-pointer shadow-sm"
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
            <HomePage nickname={nickname} setNickname={setNickname} onCreateRoom={handleCreateRoom} onJoinRoom={handleJoinRoom} publicRooms={publicRooms} />
          </motion.div>
        )}
        {screen === 'lobby' && (
          <motion.div key="lobby" {...pageVariants}>
            <LobbyPage roomInfo={roomInfo} roomCode={roomCode} isHost={isHost} onStartGame={handleStartGame} onSetRounds={handleSetRounds} onToggleReady={handleToggleReady} onLeaveRoom={handleLeaveRoom} socketId={socket.id} onToggleRoomPublic={handleToggleRoomPublic} onSetRoomName={handleSetRoomName} chatMessages={chatMessages} onSendMessage={handleSendMessage} onKickPlayer={handleKickPlayer} />
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
