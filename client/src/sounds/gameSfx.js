// ============================================
// SuckCard.com — Shared Game Sound Effects
// Web Audio API synthesized — no dependencies
// ============================================

let audioCtx = null;

function getCtx() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioCtx;
}

function playTone(freq, duration, type = 'sine', volume = 0.15) {
  try {
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  } catch (e) { /* silent fail */ }
}

function playNoise(duration, volume = 0.08) {
  try {
    const ctx = getCtx();
    const bufferSize = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 3);
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(2000, ctx.currentTime);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    source.start();
  } catch (e) { /* silent fail */ }
}

// ===========================
// Lobby
// ===========================

export function sfxJoinRoom() {
  playTone(440, 0.08, 'sine', 0.1);
  setTimeout(() => playTone(554, 0.1, 'sine', 0.1), 80);
}

export function sfxReady() {
  playTone(660, 0.06, 'triangle', 0.1);
  setTimeout(() => playTone(880, 0.08, 'triangle', 0.12), 60);
}

export function sfxUnready() {
  playTone(440, 0.06, 'triangle', 0.08);
}

export function sfxGameStart() {
  playTone(523, 0.1, 'triangle', 0.12);
  setTimeout(() => playTone(659, 0.1, 'triangle', 0.12), 100);
  setTimeout(() => playTone(784, 0.1, 'triangle', 0.12), 200);
  setTimeout(() => playTone(1047, 0.2, 'triangle', 0.15), 300);
}

export function sfxPlayerJoin() {
  playTone(500, 0.08, 'sine', 0.08);
}

export function sfxPlayerLeave() {
  playTone(350, 0.1, 'sine', 0.06);
  setTimeout(() => playTone(280, 0.12, 'sine', 0.05), 80);
}

export function sfxChatMsg() {
  playTone(700, 0.04, 'sine', 0.06);
}

export function sfxCopy() {
  playTone(900, 0.04, 'sine', 0.08);
}

export function sfxModeSwitch() {
  playTone(600, 0.05, 'triangle', 0.08);
}

// ===========================
// Classic / Average (GamePage)
// ===========================

export function sfxNumberInput() {
  playTone(440, 0.03, 'sine', 0.05);
}

export function sfxSubmitNumber() {
  playTone(523, 0.08, 'sine', 0.12);
  setTimeout(() => playTone(659, 0.1, 'sine', 0.1), 80);
}

export function sfxRevealStep() {
  playTone(350 + Math.random() * 200, 0.08, 'triangle', 0.08);
}

export function sfxRevealWinner() {
  playTone(523, 0.1, 'triangle', 0.12);
  setTimeout(() => playTone(659, 0.1, 'triangle', 0.12), 120);
  setTimeout(() => playTone(784, 0.15, 'triangle', 0.15), 240);
}

export function sfxRevealLoser() {
  playTone(300, 0.1, 'sawtooth', 0.05);
  setTimeout(() => playTone(220, 0.15, 'sawtooth', 0.06), 100);
}

export function sfxNewRound() {
  for (let i = 0; i < 3; i++) {
    setTimeout(() => playNoise(0.04, 0.05), i * 50);
  }
  setTimeout(() => playTone(480, 0.08, 'sine', 0.08), 200);
}

export function sfxTimerTick() {
  playTone(1000, 0.03, 'sine', 0.04);
}

export function sfxTimerWarning() {
  playTone(800, 0.05, 'square', 0.04);
}

// ===========================
// Old Maid
// ===========================

export function sfxDrawCard() {
  // Card sliding sound
  playNoise(0.1, 0.1);
  setTimeout(() => playTone(400, 0.06, 'sine', 0.06), 40);
}

export function sfxPairDiscard() {
  // Paired cards flying away
  playTone(523, 0.06, 'sine', 0.1);
  setTimeout(() => playTone(659, 0.08, 'sine', 0.1), 60);
  setTimeout(() => playNoise(0.06, 0.06), 120);
}

export function sfxOldMaidTurn() {
  // Your turn ding
  playTone(523, 0.1, 'sine', 0.1);
  setTimeout(() => playTone(659, 0.12, 'sine', 0.08), 80);
}

export function sfxShuffleHand() {
  for (let i = 0; i < 5; i++) {
    setTimeout(() => playNoise(0.04, 0.05), i * 40);
  }
}

export function sfxThrowItem() {
  playTone(600, 0.06, 'triangle', 0.08);
  setTimeout(() => playNoise(0.08, 0.08), 60);
}

export function sfxGameOverWin() {
  playTone(523, 0.12, 'triangle', 0.12);
  setTimeout(() => playTone(659, 0.12, 'triangle', 0.12), 150);
  setTimeout(() => playTone(784, 0.12, 'triangle', 0.12), 300);
  setTimeout(() => playTone(1047, 0.3, 'triangle', 0.15), 450);
}

export function sfxGameOverLose() {
  playTone(300, 0.15, 'sawtooth', 0.06);
  setTimeout(() => playTone(250, 0.15, 'sawtooth', 0.06), 150);
  setTimeout(() => playTone(200, 0.2, 'sawtooth', 0.08), 300);
}

export function sfxAutoPlay() {
  playTone(350, 0.08, 'sine', 0.06);
  setTimeout(() => playTone(280, 0.1, 'sine', 0.05), 80);
}
