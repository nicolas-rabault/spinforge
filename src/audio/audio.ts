const STORAGE_KEY = 'spinforge.muted';

export interface Audio {
  /** À appeler au premier contact du doigt : les navigateurs l'exigent. */
  start(): void;
  setSpin(ratio: number): void;
  hit(power: number): void;
  death(): void;
  door(): void;
  reforge(): void;
  setMuted(muted: boolean): void;
  isMuted(): boolean;
  destroy(): void;
}

export function createAudio(): Audio {
  let ctx: AudioContext | null = null;
  let master: GainNode | null = null;
  let humOsc: OscillatorNode | null = null;
  let humFilter: BiquadFilterNode | null = null;
  let muted = localStorage.getItem(STORAGE_KEY) === '1';
  let noise: AudioBuffer | null = null;

  function buildNoise(context: AudioContext): AudioBuffer {
    const buffer = context.createBuffer(1, context.sampleRate * 0.5, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    return buffer;
  }

  function ensure(): AudioContext | null {
    if (!ctx) return null;
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  }

  function burst(freq: number, q: number, gain: number, duration: number, type: BiquadFilterType = 'bandpass'): void {
    const context = ensure();
    if (!context || !master || !noise) return;
    const src = context.createBufferSource();
    src.buffer = noise;
    const filter = context.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = freq;
    filter.Q.value = q;
    const env = context.createGain();
    env.gain.setValueAtTime(gain, context.currentTime);
    env.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + duration);
    src.connect(filter).connect(env).connect(master);
    src.start();
    src.stop(context.currentTime + duration);
  }

  function tone(from: number, to: number, duration: number, gain: number, type: OscillatorType = 'sawtooth'): void {
    const context = ensure();
    if (!context || !master) return;
    const osc = context.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(from, context.currentTime);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), context.currentTime + duration);
    const env = context.createGain();
    env.gain.setValueAtTime(gain, context.currentTime);
    env.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + duration);
    osc.connect(env).connect(master);
    osc.start();
    osc.stop(context.currentTime + duration);
  }

  return {
    start() {
      if (ctx) {
        void ctx.resume();
        return;
      }
      ctx = new AudioContext();
      noise = buildNoise(ctx);
      master = ctx.createGain();
      master.gain.value = muted ? 0 : 1;
      master.connect(ctx.destination);

      humFilter = ctx.createBiquadFilter();
      humFilter.type = 'lowpass';
      humFilter.frequency.value = 900;
      humFilter.Q.value = 3;
      const humGain = ctx.createGain();
      humGain.gain.value = 0.035;
      humOsc = ctx.createOscillator();
      humOsc.type = 'sawtooth';
      humOsc.frequency.value = 250;
      humOsc.connect(humFilter).connect(humGain).connect(master);
      humOsc.start();
    },
    setSpin(ratio) {
      const context = ensure();
      if (!context || !humOsc || !humFilter) return;
      const r = Math.max(0, Math.min(1, ratio));
      humOsc.frequency.setTargetAtTime(60 + 190 * r, context.currentTime, 0.08);
      humFilter.frequency.setTargetAtTime(300 + 1400 * r, context.currentTime, 0.12);
    },
    hit(power) {
      burst(400 + 2600 * power, 1.6, 0.12 + 0.5 * power, 0.06);
    },
    death() {
      tone(200, 40, 0.8, 0.14);
      burst(900, 0.7, 0.1, 0.5, 'highpass');
    },
    door() {
      tone(880, 880, 0.5, 0.05, 'sine');
      tone(1320, 1320, 0.45, 0.03, 'sine');
    },
    reforge() {
      tone(120, 45, 0.35, 0.16, 'sine');
      burst(600, 0.6, 0.16, 0.22);
    },
    setMuted(next) {
      muted = next;
      localStorage.setItem(STORAGE_KEY, next ? '1' : '0');
      if (master && ctx) master.gain.setTargetAtTime(next ? 0 : 1, ctx.currentTime, 0.02);
    },
    isMuted() {
      return muted;
    },
    destroy() {
      humOsc?.stop();
      void ctx?.close();
      ctx = null;
      master = null;
      humOsc = null;
      humFilter = null;
    },
  };
}
