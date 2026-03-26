// ============================================
// SuckCard.com — Shared Game Sound Effects
// Powered by Tone.js (MIT) — free forever
// ============================================

import * as Tone from 'tone';

// Lazy-init synths (created once, reused)
let _synth, _metalSynth, _membraneSynth, _noiseSynth, _pluckSynth;
let _initialized = false;

async function ensureStarted() {
  if (Tone.getContext().state !== 'running') {
    try { await Tone.start(); } catch (e) { /* user gesture needed */ }
  }
}

function getSynth() {
  if (!_synth) _synth = new Tone.Synth({ oscillator: { type: 'triangle' }, envelope: { attack: 0.005, decay: 0.15, sustain: 0.05, release: 0.3 }, volume: -12 }).toDestination();
  return _synth;
}

function getMetalSynth() {
  if (!_metalSynth) _metalSynth = new Tone.MetalSynth({ frequency: 200, envelope: { attack: 0.001, decay: 0.1, release: 0.1 }, harmonicity: 5.1, modulationIndex: 16, resonance: 4000, octaves: 1.5, volume: -20 }).toDestination();
  return _metalSynth;
}

function getMembraneSynth() {
  if (!_membraneSynth) _membraneSynth = new Tone.MembraneSynth({ pitchDecay: 0.05, octaves: 4, envelope: { attack: 0.001, decay: 0.2, sustain: 0, release: 0.4 }, volume: -18 }).toDestination();
  return _membraneSynth;
}

function getNoiseSynth() {
  if (!_noiseSynth) _noiseSynth = new Tone.NoiseSynth({ noise: { type: 'white' }, envelope: { attack: 0.005, decay: 0.08, sustain: 0 }, volume: -20 }).toDestination();
  return _noiseSynth;
}

function getPluckSynth() {
  if (!_pluckSynth) _pluckSynth = new Tone.PluckSynth({ attackNoise: 1, dampening: 4000, resonance: 0.9, volume: -10 }).toDestination();
  return _pluckSynth;
}

// ===========================
// Lobby
// ===========================

export async function sfxJoinRoom() {
  await ensureStarted();
  const s = getSynth();
  const now = Tone.now();
  s.triggerAttackRelease('E5', '16n', now);
  s.triggerAttackRelease('G5', '16n', now + 0.08);
}

export async function sfxReady() {
  await ensureStarted();
  const s = getSynth();
  const now = Tone.now();
  s.triggerAttackRelease('C5', '32n', now);
  s.triggerAttackRelease('E5', '32n', now + 0.06);
  s.triggerAttackRelease('G5', '16n', now + 0.12);
}

export async function sfxUnready() {
  await ensureStarted();
  getSynth().triggerAttackRelease('G4', '16n');
}

export async function sfxGameStart() {
  try {
    await ensureStarted();
    const s = getPluckSynth();
    const now = Tone.now() + 0.05; // small offset to avoid scheduling conflict
    s.triggerAttackRelease('C5', now);
    s.triggerAttackRelease('E5', now + 0.1);
    s.triggerAttackRelease('G5', now + 0.2);
    s.triggerAttackRelease('C6', now + 0.3);
  } catch (e) {
    // Audio error should never block game start
    console.warn('sfxGameStart error:', e.message);
  }
}

export async function sfxPlayerJoin() {
  await ensureStarted();
  getSynth().triggerAttackRelease('A4', '32n');
}

export async function sfxPlayerLeave() {
  await ensureStarted();
  const s = getSynth();
  const now = Tone.now();
  s.triggerAttackRelease('E4', '16n', now);
  s.triggerAttackRelease('C4', '16n', now + 0.1);
}

export async function sfxChatMsg() {
  await ensureStarted();
  getPluckSynth().triggerAttackRelease('E5');
}

export async function sfxCopy() {
  await ensureStarted();
  const s = getSynth();
  const now = Tone.now();
  s.triggerAttackRelease('A5', '32n', now);
  s.triggerAttackRelease('E6', '32n', now + 0.05);
}

export async function sfxModeSwitch() {
  await ensureStarted();
  getPluckSynth().triggerAttackRelease('D5');
}

// ===========================
// Classic / Average (GamePage)
// ===========================

export async function sfxNumberInput() {
  await ensureStarted();
  getMetalSynth().triggerAttackRelease('32n');
}

export async function sfxSubmitNumber() {
  await ensureStarted();
  const s = getPluckSynth();
  const now = Tone.now();
  s.triggerAttackRelease('C5', now);
  s.triggerAttackRelease('G5', now + 0.08);
}

export async function sfxRevealStep() {
  await ensureStarted();
  const notes = ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5'];
  const note = notes[Math.floor(Math.random() * notes.length)];
  getPluckSynth().triggerAttackRelease(note);
}

export async function sfxRevealWinner() {
  await ensureStarted();
  const s = getSynth();
  const now = Tone.now();
  s.triggerAttackRelease('C5', '8n', now);
  s.triggerAttackRelease('E5', '8n', now + 0.15);
  s.triggerAttackRelease('G5', '4n', now + 0.3);
}

export async function sfxRevealLoser() {
  await ensureStarted();
  const s = getSynth();
  s.oscillator.type = 'sawtooth';
  const now = Tone.now();
  s.triggerAttackRelease('E3', '8n', now);
  s.triggerAttackRelease('C3', '8n', now + 0.12);
  setTimeout(() => { s.oscillator.type = 'triangle'; }, 300);
}

export async function sfxNewRound() {
  await ensureStarted();
  const n = getNoiseSynth();
  const now = Tone.now();
  n.triggerAttackRelease('32n', now);
  n.triggerAttackRelease('32n', now + 0.06);
  n.triggerAttackRelease('32n', now + 0.12);
  setTimeout(() => getSynth().triggerAttackRelease('A4', '16n'), 200);
}

export async function sfxTimerTick() {
  await ensureStarted();
  getMetalSynth().triggerAttackRelease('32n');
}

export async function sfxTimerWarning() {
  await ensureStarted();
  const s = getSynth();
  s.oscillator.type = 'square';
  s.triggerAttackRelease('A5', '32n');
  setTimeout(() => { s.oscillator.type = 'triangle'; }, 100);
}

// ===========================
// Old Maid
// ===========================

export async function sfxDrawCard() {
  await ensureStarted();
  getNoiseSynth().triggerAttackRelease('16n');
  setTimeout(() => getPluckSynth().triggerAttackRelease('G4'), 50);
}

export async function sfxPairDiscard() {
  await ensureStarted();
  const s = getPluckSynth();
  const now = Tone.now();
  s.triggerAttackRelease('C5', now);
  s.triggerAttackRelease('E5', now + 0.06);
  setTimeout(() => getNoiseSynth().triggerAttackRelease('32n'), 120);
}

export async function sfxOldMaidTurn() {
  await ensureStarted();
  const s = getSynth();
  const now = Tone.now();
  s.triggerAttackRelease('C5', '16n', now);
  s.triggerAttackRelease('E5', '16n', now + 0.08);
}

export async function sfxShuffleHand() {
  await ensureStarted();
  const n = getNoiseSynth();
  for (let i = 0; i < 5; i++) {
    setTimeout(() => n.triggerAttackRelease('64n'), i * 40);
  }
}

export async function sfxThrowItem() {
  await ensureStarted();
  getMembraneSynth().triggerAttackRelease('C2', '8n');
}

export async function sfxGameOverWin() {
  await ensureStarted();
  const s = getPluckSynth();
  const now = Tone.now();
  s.triggerAttackRelease('C5', now);
  s.triggerAttackRelease('E5', now + 0.15);
  s.triggerAttackRelease('G5', now + 0.3);
  s.triggerAttackRelease('C6', now + 0.45);
}

export async function sfxGameOverLose() {
  await ensureStarted();
  const s = getSynth();
  s.oscillator.type = 'sawtooth';
  const now = Tone.now();
  s.triggerAttackRelease('E3', '8n', now);
  s.triggerAttackRelease('D3', '8n', now + 0.15);
  s.triggerAttackRelease('C3', '4n', now + 0.3);
  setTimeout(() => { s.oscillator.type = 'triangle'; }, 600);
}

export async function sfxAutoPlay() {
  await ensureStarted();
  const s = getSynth();
  const now = Tone.now();
  s.triggerAttackRelease('E4', '16n', now);
  s.triggerAttackRelease('C4', '16n', now + 0.08);
}
