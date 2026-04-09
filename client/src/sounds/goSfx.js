// ============================================
// SuckCard.com — Go (Cờ Vây) Sound Effects
// Gentle, realistic stone sounds using Tone.js
// ============================================

import * as Tone from 'tone';

let _pluck, _membrane, _noise, _metal;
let _initDone = false;

async function ensureStarted() {
  if (Tone.getContext().state !== 'running') {
    try { await Tone.start(); } catch (e) { /* needs user gesture */ }
  }
}

function getPluck() {
  if (!_pluck) _pluck = new Tone.PluckSynth({ attackNoise: 1.2, dampening: 3500, resonance: 0.92, volume: -14 }).toDestination();
  return _pluck;
}

function getMembrane() {
  if (!_membrane) _membrane = new Tone.MembraneSynth({ pitchDecay: 0.04, octaves: 3, envelope: { attack: 0.001, decay: 0.15, sustain: 0, release: 0.2 }, volume: -16 }).toDestination();
  return _membrane;
}

function getNoise() {
  if (!_noise) _noise = new Tone.NoiseSynth({ noise: { type: 'brown' }, envelope: { attack: 0.002, decay: 0.08, sustain: 0, release: 0.05 }, volume: -22 }).toDestination();
  return _noise;
}

function getMetal() {
  if (!_metal) _metal = new Tone.MetalSynth({ frequency: 250, envelope: { attack: 0.001, decay: 0.06, release: 0.05 }, harmonicity: 3, modulationIndex: 8, resonance: 3000, octaves: 1, volume: -26 }).toDestination();
  return _metal;
}

// ── Stone placement — soft "tok" ──
export async function sfxStonePlace() {
  await ensureStarted();
  getNoise().triggerAttackRelease('32n');
  // Slight pluck for texture
  setTimeout(() => getPluck().triggerAttack('G3'), 15);
}

// ── Capture stones — gentle sweep ──
export async function sfxCapture() {
  await ensureStarted();
  getNoise().triggerAttackRelease('16n');
  setTimeout(() => getPluck().triggerAttack('C4'), 40);
  setTimeout(() => getPluck().triggerAttack('E4'), 80);
}

// ── Pass turn — single tick ──
export async function sfxPass() {
  await ensureStarted();
  getPluck().triggerAttack('E4');
}

// ── Game win — ascending warm chime ──
export async function sfxWin() {
  await ensureStarted();
  getPluck().triggerAttack('C5');
  setTimeout(() => getPluck().triggerAttack('E5'), 120);
  setTimeout(() => getPluck().triggerAttack('G5'), 240);
}

// ── Game lose / resign — soft thud ──
export async function sfxResign() {
  await ensureStarted();
  getMembrane().triggerAttackRelease('E2', '8n');
}

// ── Hover (valid position) — very faint ──
export async function sfxHover() {
  await ensureStarted();
  getMetal().triggerAttackRelease('64n');
}

// ── Invalid move — short buzz ──
export async function sfxInvalid() {
  await ensureStarted();
  const n = getNoise();
  n.volume.value = -18;
  n.triggerAttackRelease('64n');
  setTimeout(() => { n.volume.value = -22; }, 60);
}

// ── Your turn notification ──
export async function sfxYourTurn() {
  await ensureStarted();
  getPluck().triggerAttack('A4');
}

// ── Timer warning (< 5s) ──
export async function sfxTimerWarn() {
  await ensureStarted();
  getMetal().triggerAttackRelease('32n');
}
