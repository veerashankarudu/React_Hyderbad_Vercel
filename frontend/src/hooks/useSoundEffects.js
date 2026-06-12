import { useCallback, useRef } from 'react';

// ═══════════════════════════════════════════════════════════════
// SOUND EFFECTS HOOK — Web Audio API synthesized sounds
// No audio files needed — generates tones programmatically
// ═══════════════════════════════════════════════════════════════

const STORAGE_KEY = 'quizhub_sound_settings';

const DEFAULT_SETTINGS = {
  enabled: true,
  typingSounds: true,
  notificationSounds: true,
  celebrationSounds: true,
  volume: 0.3, // 0 to 1
};

export function getSoundSettings() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSoundSettings(settings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

// Create AudioContext lazily (browsers require user gesture)
let audioCtx = null;
function getAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

// ─── SOUND GENERATORS ────────────────────────────────────────

function playTone(frequency, duration, type = 'sine', vol = 0.3) {
  try {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(frequency, ctx.currentTime);

    gain.gain.setValueAtTime(vol, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  } catch {
    // Silently fail if audio not available
  }
}

function playNoise(duration, vol = 0.1) {
  try {
    const ctx = getAudioContext();
    const bufferSize = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.1));
    }

    const source = ctx.createBufferSource();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    filter.type = 'highpass';
    filter.frequency.value = 4000;

    source.buffer = buffer;
    gain.gain.setValueAtTime(vol, ctx.currentTime);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    source.start();
  } catch {
    // Silently fail
  }
}

// ─── EXPORTED SOUND EFFECTS ──────────────────────────────────

export const SoundEffects = {
  // Typewriter tick — soft mechanical click
  typeClick(vol = 0.3) {
    playNoise(0.03, vol * 0.4);
    playTone(1800 + Math.random() * 400, 0.025, 'square', vol * 0.08);
  },

  // Key press variation — slightly different pitch each time
  keyPress(vol = 0.3) {
    const freq = 1200 + Math.random() * 800;
    playTone(freq, 0.02, 'square', vol * 0.06);
    playNoise(0.02, vol * 0.3);
  },

  // Backspace — lower tone
  backspace(vol = 0.3) {
    playTone(400, 0.04, 'sine', vol * 0.1);
  },

  // Enter/Submit — satisfying ding
  enter(vol = 0.3) {
    playTone(880, 0.08, 'sine', vol * 0.2);
    setTimeout(() => playTone(1100, 0.12, 'sine', vol * 0.15), 60);
  },

  // Success — ascending cheerful notes
  success(vol = 0.3) {
    playTone(523, 0.12, 'sine', vol * 0.25);
    setTimeout(() => playTone(659, 0.12, 'sine', vol * 0.25), 100);
    setTimeout(() => playTone(784, 0.12, 'sine', vol * 0.25), 200);
    setTimeout(() => playTone(1047, 0.2, 'sine', vol * 0.3), 300);
  },

  // Celebration — fanfare for achievements
  celebration(vol = 0.3) {
    playTone(523, 0.15, 'sine', vol * 0.3);
    setTimeout(() => playTone(659, 0.15, 'sine', vol * 0.3), 120);
    setTimeout(() => playTone(784, 0.15, 'sine', vol * 0.3), 240);
    setTimeout(() => playTone(1047, 0.25, 'sine', vol * 0.35), 360);
    setTimeout(() => playTone(1175, 0.1, 'sine', vol * 0.2), 500);
    setTimeout(() => playTone(1319, 0.3, 'sine', vol * 0.35), 580);
  },

  // Notification — gentle two-note alert
  notification(vol = 0.3) {
    playTone(880, 0.1, 'sine', vol * 0.2);
    setTimeout(() => playTone(1100, 0.15, 'sine', vol * 0.2), 120);
  },

  // Warning — lower attention tone
  warning(vol = 0.3) {
    playTone(440, 0.15, 'triangle', vol * 0.2);
    setTimeout(() => playTone(380, 0.2, 'triangle', vol * 0.2), 150);
  },

  // Error — descending tone
  error(vol = 0.3) {
    playTone(400, 0.12, 'sawtooth', vol * 0.1);
    setTimeout(() => playTone(300, 0.15, 'sawtooth', vol * 0.1), 120);
  },

  // Hover — very subtle tick
  hover(vol = 0.3) {
    playTone(2000, 0.015, 'sine', vol * 0.03);
  },

  // Click — button press
  click(vol = 0.3) {
    playNoise(0.02, vol * 0.15);
  },

  // Toggle — switch flip
  toggle(vol = 0.3) {
    playTone(1200, 0.04, 'sine', vol * 0.15);
  },

  // Approve — positive confirmation
  approve(vol = 0.3) {
    playTone(600, 0.1, 'sine', vol * 0.2);
    setTimeout(() => playTone(800, 0.15, 'sine', vol * 0.25), 100);
  },

  // Reject — negative tone
  reject(vol = 0.3) {
    playTone(350, 0.12, 'triangle', vol * 0.15);
    setTimeout(() => playTone(280, 0.15, 'triangle', vol * 0.15), 100);
  },
};

// ─── MAIN HOOK ───────────────────────────────────────────────

export default function useSoundEffects() {
  const settingsRef = useRef(getSoundSettings());

  const refreshSettings = useCallback(() => {
    settingsRef.current = getSoundSettings();
  }, []);

  const play = useCallback((effectName) => {
    const s = settingsRef.current;
    if (!s.enabled) return;

    // Check category
    const isTyping = ['typeClick', 'keyPress', 'backspace', 'enter'].includes(effectName);
    const isCelebration = ['celebration', 'success', 'approve'].includes(effectName);
    const isNotification = ['notification', 'warning', 'error', 'reject'].includes(effectName);

    if (isTyping && !s.typingSounds) return;
    if (isCelebration && !s.celebrationSounds) return;
    if (isNotification && !s.notificationSounds) return;

    const fn = SoundEffects[effectName];
    if (fn) fn(s.volume);
  }, []);

  return { play, refreshSettings, getSoundSettings, saveSoundSettings };
}
