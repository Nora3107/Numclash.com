// ============================================
// SuckCard.com — GoPage.jsx
// Full Go game UI: Board + PvP + Bot mode
// ============================================

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Flag } from 'lucide-react';
import socket from '../socket';
import useGoStore from '../stores/useGoStore';
import { GoGame } from './goEngine'; // local engine for bot mode
import * as sfx from '../sounds/goSfx';
import './go.css';

// ── Star point (hoshi) positions ──
const STAR_POINTS = {
  9: [[2,2],[2,6],[6,2],[6,6],[4,4]],
  13: [[3,3],[3,9],[9,3],[9,9],[6,6],[3,6],[9,6],[6,3],[6,9]],
  19: [[3,3],[3,9],[3,15],[9,3],[9,9],[9,15],[15,3],[15,9],[15,15]],
};

export default function GoPage({ roomCode, initialState, onLeave, botConfig }) {
  const store = useGoStore();
  const workerRef = useRef(null);
  const [localGame, setLocalGame] = useState(null); // bot mode local game
  const [hoverR, setHoverR] = useState(-1);
  const [hoverC, setHoverC] = useState(-1);
  const [showResult, setShowResult] = useState(false);
  const [capturing, setCapturing] = useState([]); // [{r,c}] currently animating
  const [passNotif, setPassNotif] = useState(null);
  const [timerLeft, setTimerLeft] = useState(0);
  const timerInterval = useRef(null);
  const myId = socket.id;
  const isBotMode = !!botConfig;

  // ═══════════════════════════════════════
  // Determine state source (server vs local)
  // ═══════════════════════════════════════
  const state = useMemo(() => {
    if (isBotMode && localGame) {
      const s = localGame.getClientState();
      return { ...s, currentPlayerId: s.players[s.currentColor]?.id };
    }
    return store;
  }, [isBotMode, localGame, store]);

  const size = state.size || 9;
  const board = state.board || [];
  const myColor = isBotMode ? 1 : (state.players?.[1]?.id === myId ? 1 : state.players?.[2]?.id === myId ? 2 : 0);
  const isMyTurn = isBotMode
    ? (state.currentColor === 1 && state.phase === 'PLAYING')
    : (state.currentPlayerId === myId && state.phase === 'PLAYING');

  // ═══════════════════════════════════════
  // Initialization
  // ═══════════════════════════════════════
  useEffect(() => {
    if (isBotMode) {
      // Create local game
      const game = new GoGame(botConfig.size || 9, 'player', 'bot');
      setLocalGame(game);
      // Create Web Worker
      workerRef.current = new Worker(new URL('../workers/goBot.worker.js', import.meta.url), { type: 'module' });
      workerRef.current.onmessage = (e) => {
        handleBotMove(e.data);
      };
      return () => workerRef.current?.terminate();
    } else {
      // PvP mode — listen to server
      socket.on('go-state', (s) => store.syncState(s));
      socket.on('go-capture', (d) => {
        setCapturing(d.captured);
        sfx.sfxCapture();
        setTimeout(() => setCapturing([]), 350);
      });
      socket.on('go-pass-event', (d) => {
        setPassNotif(d.timeout ? 'Hết giờ — PASS' : 'PASS');
        sfx.sfxPass();
        setTimeout(() => setPassNotif(null), 1200);
      });
      socket.on('go-timer', (d) => {
        setTimerLeft(d.timeLeft);
        startCountdown(d.timeLeft);
      });
      socket.on('go-game-over', (result) => {
        store.onGameOver(result);
        setShowResult(true);
        result.resigned ? sfx.sfxResign() : sfx.sfxWin();
      });
      if (initialState) store.syncState(initialState);
      return () => {
        socket.off('go-state');
        socket.off('go-capture');
        socket.off('go-pass-event');
        socket.off('go-timer');
        socket.off('go-game-over');
        clearInterval(timerInterval.current);
      };
    }
  }, []); // eslint-disable-line

  // ═══════════════════════════════════════
  // Timer countdown
  // ═══════════════════════════════════════
  function startCountdown(sec) {
    clearInterval(timerInterval.current);
    let t = sec;
    setTimerLeft(t);
    timerInterval.current = setInterval(() => {
      t--;
      setTimerLeft(Math.max(0, t));
      if (t <= 0) clearInterval(timerInterval.current);
    }, 1000);
  }

  // ═══════════════════════════════════════
  // Place Stone
  // ═══════════════════════════════════════
  const handlePlace = useCallback((r, c) => {
    if (!isMyTurn) return;
    if (state.phase !== 'PLAYING') return;

    if (isBotMode) {
      if (!localGame) return;
      const result = localGame.placeStone(r, c, 1); // player is always Black
      if (!result.success) { sfx.sfxInvalid(); return; }
      sfx.sfxStonePlace();
      if (result.captured.length > 0) {
        setCapturing(result.captured);
        setTimeout(() => setCapturing([]), 350);
        sfx.sfxCapture();
      }
      setLocalGame({ ...localGame }); // trigger re-render
      // Request bot move after short delay
      if (localGame.phase === 'PLAYING') {
        setTimeout(() => requestBotMove(), 400);
      }
    } else {
      socket.emit('go-place', { roomCode, r, c }, (res) => {
        if (res.success) sfx.sfxStonePlace();
        else sfx.sfxInvalid();
      });
    }
  }, [isMyTurn, state.phase, isBotMode, localGame, roomCode]);

  // ═══════════════════════════════════════
  // Pass
  // ═══════════════════════════════════════
  const handlePass = useCallback(() => {
    if (!isMyTurn) return;

    if (isBotMode) {
      if (!localGame) return;
      const result = localGame.pass(1);
      sfx.sfxPass();
      setPassNotif('PASS');
      setTimeout(() => setPassNotif(null), 1200);
      setLocalGame({ ...localGame });
      if (result.gameEnded) {
        setShowResult(true);
        sfx.sfxWin();
      } else {
        setTimeout(() => requestBotMove(), 400);
      }
    } else {
      socket.emit('go-pass', { roomCode }, (res) => {
        if (res.success) sfx.sfxPass();
      });
    }
  }, [isMyTurn, isBotMode, localGame, roomCode]);

  // ═══════════════════════════════════════
  // Resign
  // ═══════════════════════════════════════
  const handleResign = useCallback(() => {
    if (isBotMode) {
      if (!localGame) return;
      localGame.resign(1);
      setLocalGame({ ...localGame });
      setShowResult(true);
      sfx.sfxResign();
    } else {
      socket.emit('go-resign', { roomCode });
    }
  }, [isBotMode, localGame, roomCode]);

  // ═══════════════════════════════════════
  // Bot Move
  // ═══════════════════════════════════════
  function requestBotMove() {
    if (!localGame || localGame.phase !== 'PLAYING' || localGame.currentColor !== 2) return;
    store.setBotThinking(true);
    workerRef.current?.postMessage({
      board: localGame.board,
      size: localGame.size,
      color: 2,
      koPoint: localGame.koPoint,
      level: botConfig.level || 1,
    });
  }

  function handleBotMove(data) {
    store.setBotThinking(false);
    if (!localGame || localGame.phase !== 'PLAYING') return;

    if (data.pass) {
      const result = localGame.pass(2);
      sfx.sfxPass();
      setPassNotif('Bot PASS');
      setTimeout(() => setPassNotif(null), 1200);
      setLocalGame({ ...localGame });
      if (result.gameEnded) {
        setShowResult(true);
        sfx.sfxWin();
      }
    } else if (data.move) {
      const result = localGame.placeStone(data.move.r, data.move.c, 2);
      if (result.success) {
        sfx.sfxStonePlace();
        if (result.captured.length > 0) {
          setCapturing(result.captured);
          setTimeout(() => setCapturing([]), 350);
          sfx.sfxCapture();
        }
        setLocalGame({ ...localGame });
      }
    }
  }

  // ═══════════════════════════════════════
  // Legal move check (for hover preview)
  // ═══════════════════════════════════════
  function isLegalHere(r, c) {
    if (!board[r] || board[r][c] !== 0) return false;
    if (state.koPoint && state.koPoint.r === r && state.koPoint.c === c) return false;
    // Quick check — no full simulation, just for UI hint
    return true;
  }

  // ═══════════════════════════════════════
  // Get intersection CSS classes
  // ═══════════════════════════════════════
  function intersectionClasses(r, c) {
    const cls = ['go-intersection'];
    if (r === 0) cls.push('edge-top');
    if (r === size - 1) cls.push('edge-bottom');
    if (c === 0) cls.push('edge-left');
    if (c === size - 1) cls.push('edge-right');
    return cls.join(' ');
  }

  // ═══════════════════════════════════════
  // Star points
  // ═══════════════════════════════════════
  const starSet = useMemo(() => {
    const s = new Set();
    (STAR_POINTS[size] || []).forEach(([r, c]) => s.add(`${r},${c}`));
    return s;
  }, [size]);

  // ═══════════════════════════════════════
  // Render
  // ═══════════════════════════════════════
  const currentPlayer = state.players?.[state.currentColor];
  const blackPlayer = state.players?.[1];
  const whitePlayer = state.players?.[2];
  const result = state.result || showResult;
  const finalResult = state.result;

  return (
    <div className="go-page">
      {/* ── Top Bar ── */}
      <div className="go-topbar">
        <button className="go-back-btn" onClick={onLeave}>
          <ArrowLeft size={14} /> Rời
        </button>
        <div style={{ textAlign: 'center' }}>
          <div className="go-title">CỜ VÂY</div>
          <div className="go-subtitle">
            {isBotMode ? `Bot Lv${botConfig.level} · ${size}×${size}` : `${size}×${size}`}
          </div>
        </div>
        <div className={`go-timer-display ${timerLeft <= 5 && timerLeft > 0 ? 'urgent' : ''}`}>
          {!isBotMode && state.phase === 'PLAYING' ? `${timerLeft}s` : ''}
        </div>
      </div>

      {/* ── Board Wrapper ── */}
      <div className="go-board-wrapper">
        {/* Opponent info (top) */}
        <div className={`go-player-panel ${state.currentColor === 2 ? 'active' : ''}`}>
          <div className="go-player-stone white" />
          <span className="go-player-name">
            {isBotMode ? `🤖 Bot Lv${botConfig.level}` : (whitePlayer?.nickname || 'White')}
          </span>
          <span className="go-player-captures">
            Bắt: {state.players?.[2]?.captures || 0}
          </span>
        </div>

        {/* ── The Board ── */}
        <div
          className="go-board"
          style={{ gridTemplateColumns: `repeat(${size}, 1fr)`, gridTemplateRows: `repeat(${size}, 1fr)` }}
          onMouseLeave={() => { setHoverR(-1); setHoverC(-1); }}
        >
          {board.map((row, r) =>
            row.map((cell, c) => (
              <div
                key={`${r}-${c}`}
                className={intersectionClasses(r, c)}
                onMouseEnter={() => { setHoverR(r); setHoverC(c); }}
                onClick={() => handlePlace(r, c)}
              >
                {/* Star point */}
                {starSet.has(`${r},${c}`) && cell === 0 && (
                  <div className="go-star-point" />
                )}

                {/* Stone */}
                {cell !== 0 && !capturing.some(s => s.r === r && s.c === c) && (
                  <div className={`go-stone ${cell === 1 ? 'black' : 'white'} ${
                    state.lastMove?.r === r && state.lastMove?.c === c ? '' : ''
                  }`}>
                    {state.lastMove?.r === r && state.lastMove?.c === c && (
                      <div className="last-move-dot" />
                    )}
                  </div>
                )}

                {/* Capturing animation */}
                {capturing.some(s => s.r === r && s.c === c) && (
                  <div className={`go-stone ${board[r]?.[c] === 1 ? 'black' : 'white'} capturing`} />
                )}

                {/* Hover preview */}
                {cell === 0 && hoverR === r && hoverC === c && isMyTurn && !capturing.length && (
                  isLegalHere(r, c)
                    ? <div className={`go-hover-preview ${myColor === 1 ? 'black' : 'white'}`} />
                    : <div className="go-hover-invalid">✕</div>
                )}

                {/* Territory overlay (when game ended) */}
                {finalResult?.territory?.map?.[r]?.[c] === 1 && (
                  <div className="go-territory black-territory" />
                )}
                {finalResult?.territory?.map?.[r]?.[c] === 2 && (
                  <div className="go-territory white-territory" />
                )}
              </div>
            ))
          )}

          {/* Pass notification */}
          <AnimatePresence>
            {passNotif && (
              <motion.div className="go-pass-toast"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}>
                {passNotif}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Bot thinking */}
          {store.botThinking && (
            <div className="go-bot-thinking">
              Bot đang suy nghĩ
              <span className="dot">.</span><span className="dot">.</span><span className="dot">.</span>
            </div>
          )}
        </div>

        {/* My info (bottom) */}
        <div className={`go-player-panel ${state.currentColor === 1 ? 'active' : ''}`}>
          <div className="go-player-stone black" />
          <span className="go-player-name">
            {isBotMode ? 'Bạn' : (blackPlayer?.nickname || 'Black')}
          </span>
          <span className="go-player-captures">
            Bắt: {state.players?.[1]?.captures || 0}
          </span>
        </div>

        {/* Actions */}
        {state.phase === 'PLAYING' && (
          <div className="go-actions">
            <button className="go-btn pass" disabled={!isMyTurn} onClick={handlePass}>
              ⏭ PASS
            </button>
            <button className="go-btn resign" onClick={handleResign}>
              <Flag size={12} /> ĐẦU HÀNG
            </button>
            <span className="go-move-num">Nước {state.moveNumber || 0}</span>
          </div>
        )}
      </div>

      {/* ── Result Overlay ── */}
      <AnimatePresence>
        {showResult && finalResult && (
          <motion.div className="go-result-overlay"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}>
            <motion.div className="go-result-title"
              initial={{ scale: 0.5 }} animate={{ scale: 1 }}>
              {finalResult.resigned
                ? `${finalResult.winnerName} thắng!`
                : `${finalResult.winnerName} thắng!`
              }
            </motion.div>

            {!finalResult.resigned && (
              <div className="go-result-score">
                <span className={`go-result-black ${finalResult.winner === 1 ? 'go-result-winner' : ''}`}>
                  ● Đen: {finalResult.blackScore}
                </span>
                <span className={`go-result-white ${finalResult.winner === 2 ? 'go-result-winner' : ''}`}>
                  ○ Trắng: {finalResult.whiteScore}
                </span>
              </div>
            )}

            <div className="go-result-margin">
              {finalResult.resigned ? 'Đầu hàng' : `Hơn ${finalResult.margin} điểm`}
            </div>

            <button className="go-result-btn" onClick={onLeave}>
              ← Trở Về
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
