// ============================================
// SuckCard.com — Liar's Deck Sound Effects
// Powered by Tone.js (MIT) — free forever
// ============================================

import * as Tone from 'tone';

let _synth, _pluck, _metal, _membrane, _noise;

async function ensureStarted() {
  if (Tone.getContext().state !== 'running') {
    try { await Tone.start(); } catch (e) { /* silent */ }
  }
}

function getSynth() {
  if (!_synth) _synth = new Tone.Synth({ oscillator: { type: 'triangle' }, envelope: { attack: 0.005, decay: 0.15, sustain: 0.05, release: 0.3 }, volume: -12 }).toDestination();
  return _synth;
}

function getPluck() {
  if (!_pluck) _pluck = new Tone.PluckSynth({ attackNoise: 1, dampening: 4000, resonance: 0.9, volume: -10 }).toDestination();
  return _pluck;
}

function getMetal() {
  if (!_metal) _metal = new Tone.MetalSynth({ frequency: 200, envelope: { attack: 0.001, decay: 0.1, release: 0.1 }, harmonicity: 5.1, modulationIndex: 16, resonance: 4000, octaves: 1.5, volume: -22 }).toDestination();
  return _metal;
}

function getMembrane() {
  if (!_membrane) _membrane = new Tone.MembraneSynth({ pitchDecay: 0.05, octaves: 4, envelope: { attack: 0.001, decay: 0.2, sustain: 0, release: 0.4 }, volume: -18 }).toDestination();
  return _membrane;
}

function getNoise() {
  if (!_noise) _noise = new Tone.NoiseSynth({ noise: { type: 'white' }, envelope: { attack: 0.005, decay: 0.06, sustain: 0 }, volume: -22 }).toDestination();
  return _noise;
}

// --- Card interactions ---

export async function sfxSelect() {
  await ensureStarted();
  getPluck().triggerAttackRelease('A5');
}

export async function sfxDeselect() {
  await ensureStarted();
  getPluck().triggerAttackRelease('E4');
}

export async function sfxPlayCards() {
  await ensureStarted();
  const now = Tone.now();
  getNoise().triggerAttackRelease('16n', now);
  getPluck().triggerAttackRelease('D4', now + 0.04);
}

export async function sfxCallLiar() {
  await ensureStarted();
  const s = getSynth();
  const now = Tone.now();
  s.triggerAttackRelease('E4', '32n', now);
  s.triggerAttackRelease('A4', '32n', now + 0.08);
  s.triggerAttackRelease('E5', '16n', now + 0.16);
}

// --- Turn & timer ---

export async function sfxMyTurn() {
  await ensureStarted();
  const s = getSynth();
  const now = Tone.now();
  s.triggerAttackRelease('C5', '16n', now);
  s.triggerAttackRelease('E5', '16n', now + 0.1);
}

export async function sfxTimerTick() {
  await ensureStarted();
  getMetal().triggerAttackRelease('32n');
}

// --- Resolution ---

export async function sfxCaught() {
  await ensureStarted();
  const s = getPluck();
  const now = Tone.now();
  s.triggerAttackRelease('C5', now);
  s.triggerAttackRelease('E5', now + 0.1);
  s.triggerAttackRelease('G5', now + 0.2);
}

export async function sfxWrongCall() {
  await ensureStarted();
  const s = getSynth();
  s.oscillator.type = 'sawtooth';
  const now = Tone.now();
  s.triggerAttackRelease('D3', '8n', now);
  s.triggerAttackRelease('Bb2', '8n', now + 0.12);
  setTimeout(() => { s.oscillator.type = 'triangle'; }, 300);
}

export async function sfxLoseLife() {
  await ensureStarted();
  const s = getSynth();
  const now = Tone.now();
  s.triggerAttackRelease('A4', '16n', now);
  s.triggerAttackRelease('F4', '16n', now + 0.1);
  s.triggerAttackRelease('D4', '8n', now + 0.2);
}

export async function sfxEliminated() {
  await ensureStarted();
  getMembrane().triggerAttackRelease('C1', '4n');
  setTimeout(() => getMembrane().triggerAttackRelease('F0', '4n'), 200);
}

// --- Round & game ---

export async function sfxNewRound() {
  await ensureStarted();
  const n = getNoise();
  const now = Tone.now();
  for (let i = 0; i < 4; i++) {
    n.triggerAttackRelease('64n', now + i * 0.05);
  }
  setTimeout(() => getPluck().triggerAttackRelease('A4'), 250);
}

export async function sfxGameOver() {
  await ensureStarted();
  const s = getPluck();
  const now = Tone.now();
  s.triggerAttackRelease('C5', now);
  s.triggerAttackRelease('E5', now + 0.15);
  s.triggerAttackRelease('G5', now + 0.3);
  s.triggerAttackRelease('C6', now + 0.45);
}

// --- Dramatic resolution sequence ---

export async function sfxLiarShout() {
  await ensureStarted();
  const s = getSynth();
  const now = Tone.now();
  s.triggerAttackRelease('E4', '16n', now);
  s.triggerAttackRelease('G4', '16n', now + 0.07);
  s.triggerAttackRelease('B4', '16n', now + 0.14);
  s.triggerAttackRelease('E5', '8n', now + 0.21);
  getMembrane().triggerAttackRelease('G2', '8n', now + 0.25);
}

export async function sfxCardFlip() {
  await ensureStarted();
  const now = Tone.now();
  getNoise().triggerAttackRelease('16n', now);
  getPluck().triggerAttackRelease('F5', now + 0.05);
}

export async function sfxResultReveal() {
  await ensureStarted();
  getMembrane().triggerAttackRelease('C2', '4n');
  setTimeout(() => getPluck().triggerAttackRelease('G4'), 150);
}
