/**
 * Web Audio API synthesizer for mission-critical real-time crisis alerts.
 * Completely self-contained: zero external network asset dependencies.
 */

let audioCtx: AudioContext | null = null;
let isAudioMuted = false;

// Check stored preference
if (typeof window !== 'undefined') {
  try {
    isAudioMuted = localStorage.getItem('carelink_audio_muted') === 'true';
  } catch {
    // Ignore localStorage errors
  }
}

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export function isMuted(): boolean {
  return isAudioMuted;
}

export function toggleAudioMute(): boolean {
  isAudioMuted = !isAudioMuted;
  try {
    localStorage.setItem('carelink_audio_muted', String(isAudioMuted));
  } catch {}
  return isAudioMuted;
}

export function setAudioMuted(muted: boolean) {
  isAudioMuted = muted;
  try {
    localStorage.setItem('carelink_audio_muted', String(muted));
  } catch {}
}

/**
 * Dual-tone emergency priority ping (880Hz -> 1320Hz)
 */
export function playCriticalAlert() {
  if (isAudioMuted) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    
    // Tone 1
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(880, now);
    osc1.frequency.exponentialRampToValueAtTime(1100, now + 0.12);
    
    gain1.gain.setValueAtTime(0.18, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.16);

    // Tone 2 (Higher urgent overtone)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1320, now + 0.14);
    osc2.frequency.exponentialRampToValueAtTime(1760, now + 0.28);

    gain2.gain.setValueAtTime(0.16, now + 0.14);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.32);

    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.14);
    osc2.stop(now + 0.33);
  } catch {
    // Audio policies might block before user gesture
  }
}

/**
 * Affirmative mission arrival chime (587Hz -> 880Hz -> 1174Hz)
 */
export function playArrivalChime() {
  if (isAudioMuted) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    const freqs = [587.33, 880, 1174.66]; // D5, A5, D6 triad
    freqs.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const start = now + idx * 0.08;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, start);

      gain.gain.setValueAtTime(0.12, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.36);
    });
  } catch {}
}

/**
 * Tactile dispatch sonar ping (660Hz)
 */
export function playDispatchPing() {
  if (isAudioMuted) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(659.25, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.1);

    gain.gain.setValueAtTime(0.14, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.15);
  } catch {}
}

/**
 * Cinematic startup swell & sunrise chime (Web Audio API)
 * Plays an ambient low-frequency cosmic rumble with layered resonant harmonic pads
 * and a high shimmer chime when the CareLink logo ignites.
 */
export function playStartupSwell() {
  if (isAudioMuted) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    
    // 1. Cosmic deep sub-bass drone (smooth lowpass filtered saw)
    const subOsc = ctx.createOscillator();
    const subGain = ctx.createGain();
    const subFilter = ctx.createBiquadFilter();

    subOsc.type = 'sawtooth';
    subOsc.frequency.setValueAtTime(55, now); // A1 note
    subFilter.type = 'lowpass';
    subFilter.frequency.setValueAtTime(90, now);
    subFilter.frequency.exponentialRampToValueAtTime(320, now + 3.0);

    subGain.gain.setValueAtTime(0.001, now);
    subGain.gain.linearRampToValueAtTime(0.15, now + 1.8);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 5.5);

    subOsc.connect(subFilter);
    subFilter.connect(subGain);
    subGain.connect(ctx.destination);

    subOsc.start(now);
    subOsc.stop(now + 5.8);

    // 2. Luminous harmonic triad pad (A3, C#4, E4, B4)
    const padFreqs = [220, 277.18, 329.63, 493.88];
    padFreqs.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(freq, now);
      filter.Q.setValueAtTime(3, now);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.06, now + 2.0 + i * 0.2);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 6.0);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 6.2);
    });

    // 3. Shimmer Chime at T+3.2s (when logo electric aura ignites)
    const chimeTimer = setTimeout(() => {
      if (isAudioMuted || !ctx || ctx.state === 'closed') return;
      try {
        const chimeNow = ctx.currentTime;
        const chimeFreqs = [880, 1108.73, 1318.51, 1760]; // A major 9 high shimmer
        chimeFreqs.forEach((f, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(f, chimeNow + idx * 0.05);

          gain.gain.setValueAtTime(0.08, chimeNow + idx * 0.05);
          gain.gain.exponentialRampToValueAtTime(0.001, chimeNow + idx * 0.05 + 1.2);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(chimeNow + idx * 0.05);
          osc.stop(chimeNow + idx * 0.05 + 1.3);
        });
      } catch {}
    }, 3200);

    return () => clearTimeout(chimeTimer);
  } catch {}
}
