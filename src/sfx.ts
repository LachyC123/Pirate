// Synthesised sound. Unlocked by the first user gesture. No audio files.
let ctx: AudioContext | null = null;
let muted = false;
export const setMuted = (m: boolean) => { muted = m; };
export function unlock(): void {
  try {
    if (!ctx) ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    if (ctx.state === 'suspended') void ctx.resume();
  } catch { ctx = null; }
}
function noise(dur: number, freq: number, q: number, vol: number, type: BiquadFilterType = 'bandpass', delay = 0, slide = 0): void {
  if (!ctx || muted) return;
  const t = ctx.currentTime + delay, n = Math.floor(ctx.sampleRate * dur);
  const buf = ctx.createBuffer(1, n, ctx.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource(); src.buffer = buf;
  const f = ctx.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(freq, t); if (slide) f.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t + dur); f.Q.value = q;
  const g = ctx.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  src.connect(f).connect(g).connect(ctx.destination); src.start(t);
}
function tone(freq: number, dur: number, vol: number, type: OscillatorType = 'sine', delay = 0, slide = 0): void {
  if (!ctx || muted) return;
  const t = ctx.currentTime + delay;
  const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, t); if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur);
  const g = ctx.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g).connect(ctx.destination); o.start(t); o.stop(t + dur + 0.02);
}
export type Sfx = 'steel' | 'block' | 'wood' | 'cloth' | 'water' | 'shot' | 'misfire' | 'empty' | 'step' | 'coin' | 'tap' | 'chain' | 'haul' | 'thud' | 'cheer' | 'breath' | 'buy' | 'deny' | 'bell';
export function sfx(s: Sfx): void {
  switch (s) {
    case 'steel': noise(0.09, 3200, 2, 0.25); tone(1900, 0.22, 0.07, 'triangle'); tone(2850, 0.16, 0.04, 'sine'); break;
    case 'block': noise(0.05, 2200, 3, 0.3); tone(1250, 0.3, 0.1, 'square'); tone(1870, 0.34, 0.06, 'triangle'); break;
    case 'wood': noise(0.07, 420, 2, 0.5, 'lowpass'); tone(150, 0.12, 0.25, 'sine', 0, -70); break;
    case 'cloth': noise(0.16, 1400, 0.7, 0.14, 'bandpass', 0, -900); break;
    case 'water': noise(0.35, 900, 0.8, 0.2, 'bandpass', 0, 900); noise(0.2, 2400, 1, 0.08, 'highpass', 0.08); break;
    case 'shot': noise(0.3, 900, 0.5, 0.6, 'lowpass', 0, -700); tone(110, 0.25, 0.4, 'sine', 0, -60); break;
    case 'misfire': noise(0.03, 3000, 5, 0.25); tone(600, 0.04, 0.06, 'square', 0.04); break;
    case 'empty': noise(0.3, 500, 0.6, 0.1, 'bandpass', 0, -300); tone(180, 0.25, 0.05, 'sawtooth', 0, -80); break;
    case 'breath': noise(0.35, 700, 0.5, 0.09, 'bandpass', 0, 500); break;
    case 'step': noise(0.05, 260, 1.5, 0.3, 'lowpass'); break;
    case 'coin': tone(1320, 0.09, 0.12, 'square'); tone(1760, 0.2, 0.12, 'square', 0.07); break;
    case 'buy': tone(880, 0.08, 0.1, 'square'); tone(1320, 0.08, 0.1, 'square', 0.08); tone(1760, 0.22, 0.1, 'square', 0.16); break;
    case 'deny': tone(180, 0.16, 0.12, 'sawtooth'); break;
    case 'tap': tone(520, 0.04, 0.06, 'triangle'); break;
    case 'chain': for (let i = 0; i < 5; i++) noise(0.03, 3600, 6, 0.14, 'bandpass', i * 0.04); break;
    case 'haul': for (let i = 0; i < 7; i++) noise(0.03, 2600 - i * 150, 6, 0.16, 'bandpass', i * 0.03); noise(0.2, 300, 1, 0.3, 'lowpass', 0.1); break;
    case 'thud': tone(90, 0.3, 0.5, 'sine', 0, -50); noise(0.12, 200, 1, 0.4, 'lowpass'); break;
    case 'cheer': noise(0.9, 1200, 0.4, 0.14, 'bandpass', 0, 600); tone(660, 0.12, 0.08, 'square', 0.05); tone(880, 0.12, 0.08, 'square', 0.18); tone(1100, 0.3, 0.08, 'square', 0.31); break;
    case 'bell': tone(440, 1.2, 0.14, 'sine'); tone(1108, 0.9, 0.06, 'sine'); tone(662, 1.0, 0.05, 'triangle'); break;
  }
}
