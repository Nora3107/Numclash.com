// ============================================
// SuckCard.com — Liar's Deck Sound Effects
// Web Audio API synthesized sounds
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

// --- Sound effects ---

export function sfxSelect() {
  // Soft click
  playTone(800, 0.06, 'sine', 0.1);
}

export function sfxDeselect() {
  playTone(600, 0.05, 'sine', 0.08);
}

export function sfxPlayCards() {
  // Card slide/slap
  playNoise(0.12, 0.12);
  setTimeout(() => playTone(300, 0.08, 'triangle', 0.06), 30);
}

export function sfxCallLiar() {
  // Alert / dramatic
  playTone(440, 0.1, 'square', 0.08);
  setTimeout(() => playTone(660, 0.1, 'square', 0.08), 80);
  setTimeout(() => playTone(880, 0.15, 'square', 0.1), 160);
}

export function sfxMyTurn() {
  // Gentle ding
  playTone(523, 0.12, 'sine', 0.12);
  setTimeout(() => playTone(659, 0.15, 'sine', 0.1), 100);
}

export function sfxCaught() {
  // Success fanfare
  playTone(523, 0.1, 'triangle', 0.12);
  setTimeout(() => playTone(659, 0.1, 'triangle', 0.12), 100);
  setTimeout(() => playTone(784, 0.2, 'triangle', 0.15), 200);
}

export function sfxWrongCall() {
  // Fail buzz
  playTone(200, 0.15, 'sawtooth', 0.06);
  setTimeout(() => playTone(150, 0.2, 'sawtooth', 0.08), 120);
}

export function sfxLoseLife() {
  // Heart break
  playTone(440, 0.1, 'sine', 0.1);
  setTimeout(() => playTone(330, 0.15, 'sine', 0.1), 100);
  setTimeout(() => playTone(220, 0.25, 'sine', 0.08), 200);
}

export function sfxEliminated() {
  // Death
  playTone(300, 0.1, 'square', 0.06);
  setTimeout(() => playTone(200, 0.15, 'square', 0.06), 150);
  setTimeout(() => playTone(100, 0.3, 'square', 0.08), 300);
}

export function sfxNewRound() {
  // Shuffle/deal
  for (let i = 0; i < 4; i++) {
    setTimeout(() => playNoise(0.05, 0.06), i * 60);
  }
  setTimeout(() => playTone(440, 0.1, 'sine', 0.08), 300);
}

export function sfxGameOver() {
  // Victory fanfare
  playTone(523, 0.12, 'triangle', 0.12);
  setTimeout(() => playTone(659, 0.12, 'triangle', 0.12), 150);
  setTimeout(() => playTone(784, 0.12, 'triangle', 0.12), 300);
  setTimeout(() => playTone(1047, 0.3, 'triangle', 0.15), 450);
}

export function sfxTimerTick() {
  playTone(1000, 0.03, 'sine', 0.04);
}
