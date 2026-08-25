const STORAGE_KEY = 'spinforge.muted';

/**
 * Barème du son. Volumes délibérément bas : tout passe ensuite par un limiteur,
 * et l'arène peut produire dix chocs par seconde.
 */
const MIX = {
  master: 0.5,
  /** Le rotor : bruit filtré (un souffle), jamais un oscillateur tonal — une dent
   * de scie tenue à 60-250 Hz est un bourdon de scie sauteuse, pas une toupie. */
  whirrGain: 0.055,
  whirrFreqLow: 380,
  whirrFreqHigh: 2200,
  subGain: 0.05,
  subFreqLow: 48,
  subFreqHigh: 96,
  /** Deux chocs plus rapprochés que ça se fondent en un seul son. Doit rester
   * PLUS LONG que le tick de simulation (100 ms), sinon un contact prolongé
   * refranchit la garde à chaque tick et ne se fait pas éclaircir du tout.
   * Mesuré sur un run de 60 s : sans garde, jusqu'à 20 sons par seconde ; à
   * 140 ms, pic à 5/s et moyenne à 2,2/s — c'est le genou de la courbe, allonger
   * davantage ne baisse plus que la moyenne. */
  hitGapS: 0.14,
} as const;

export interface Audio {
  /** À appeler au premier contact du doigt : les navigateurs l'exigent. */
  start(): void;
  /** Le rotor ne souffle que pendant un combat : muet en Forge et à la mort. */
  setSpin(ratio: number | null): void;
  hit(power: number): void;
  death(): void;
  door(): void;
  setMuted(muted: boolean): void;
  isMuted(): boolean;
  destroy(): void;
}

export function createAudio(): Audio {
  let ctx: AudioContext | null = null;
  let master: GainNode | null = null;
  let whirrFilter: BiquadFilterNode | null = null;
  let whirrGain: GainNode | null = null;
  let sub: OscillatorNode | null = null;
  let subGain: GainNode | null = null;
  let whirrSource: AudioBufferSourceNode | null = null;
  let muted = localStorage.getItem(STORAGE_KEY) === '1';
  let noise: AudioBuffer | null = null;
  let lastHitAt = -Infinity;

  function buildNoise(context: AudioContext, seconds: number): AudioBuffer {
    const buffer = context.createBuffer(1, Math.round(context.sampleRate * seconds), context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    return buffer;
  }

  function ensure(): AudioContext | null {
    if (!ctx) return null;
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  }

  /**
   * Enveloppe percussive avec une attaque de quelques millisecondes : couper un
   * son net à pleine amplitude produit un clic, et c'est ce clic — répété — qui
   * rendait les impacts agressifs.
   */
  function envelope(context: AudioContext, peak: number, attack: number, duration: number): GainNode {
    const env = context.createGain();
    const t = context.currentTime;
    env.gain.setValueAtTime(0.0001, t);
    env.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + attack);
    env.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    return env;
  }

  function burst(freq: number, q: number, gain: number, duration: number): void {
    const context = ensure();
    if (!context || !master || !noise) return;
    const src = context.createBufferSource();
    src.buffer = noise;
    src.playbackRate.value = 0.7 + Math.random() * 0.6; // pas deux chocs identiques
    const filter = context.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = freq;
    filter.Q.value = q;
    src.connect(filter).connect(envelope(context, gain, 0.004, duration)).connect(master);
    src.start();
    src.stop(context.currentTime + duration);
  }

  function tone(from: number, to: number, duration: number, gain: number, type: OscillatorType = 'sine'): void {
    const context = ensure();
    if (!context || !master) return;
    const osc = context.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(from, context.currentTime);
    if (to !== from) osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), context.currentTime + duration);
    osc.connect(envelope(context, gain, 0.008, duration)).connect(master);
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
      noise = buildNoise(ctx, 0.5);

      // Limiteur en sortie : l'arène peut empiler chocs, mort et transition de
      // salle sur la même image, et c'est cette saturation qui écrête.
      const limiter = ctx.createDynamicsCompressor();
      limiter.threshold.value = -14;
      limiter.knee.value = 14;
      limiter.ratio.value = 8;
      limiter.attack.value = 0.003;
      limiter.release.value = 0.18;
      limiter.connect(ctx.destination);

      master = ctx.createGain();
      master.gain.value = muted ? 0 : MIX.master;
      master.connect(limiter);

      whirrFilter = ctx.createBiquadFilter();
      whirrFilter.type = 'bandpass';
      whirrFilter.frequency.value = MIX.whirrFreqLow;
      whirrFilter.Q.value = 1.1;
      whirrGain = ctx.createGain();
      whirrGain.gain.value = 0;
      whirrSource = ctx.createBufferSource();
      whirrSource.buffer = buildNoise(ctx, 2);
      whirrSource.loop = true;
      whirrSource.connect(whirrFilter).connect(whirrGain).connect(master);
      whirrSource.start();

      sub = ctx.createOscillator();
      sub.type = 'sine';
      sub.frequency.value = MIX.subFreqLow;
      subGain = ctx.createGain();
      subGain.gain.value = 0;
      sub.connect(subGain).connect(master);
      sub.start();
    },
    setSpin(ratio) {
      const context = ensure();
      if (!context || !whirrFilter || !whirrGain || !sub || !subGain) return;
      const t = context.currentTime;
      if (ratio === null) {
        whirrGain.gain.setTargetAtTime(0, t, 0.1);
        subGain.gain.setTargetAtTime(0, t, 0.1);
        return;
      }
      const r = Math.max(0, Math.min(1, ratio));
      whirrFilter.frequency.setTargetAtTime(MIX.whirrFreqLow + (MIX.whirrFreqHigh - MIX.whirrFreqLow) * r, t, 0.12);
      sub.frequency.setTargetAtTime(MIX.subFreqLow + (MIX.subFreqHigh - MIX.subFreqLow) * r, t, 0.12);
      // Le souffle s'efface avec le spin : une toupie qui meurt se tait.
      whirrGain.gain.setTargetAtTime(MIX.whirrGain * (0.25 + 0.75 * r), t, 0.1);
      subGain.gain.setTargetAtTime(MIX.subGain * r, t, 0.1);
    },
    hit(power) {
      const context = ensure();
      if (!context) return;
      if (context.currentTime - lastHitAt < MIX.hitGapS) return;
      lastHitAt = context.currentTime;
      const p = Math.max(0, Math.min(1, power));
      burst(900 + 1500 * p, 3.2, 0.04 + 0.08 * p, 0.05 + 0.03 * p);
      // Le corps du choc : seuls les vrais coups font trembler l'arène.
      if (p > 0.3) tone(140, 60, 0.1 + 0.06 * p, 0.05 * p);
    },
    death() {
      tone(190, 55, 0.55, 0.08);
      burst(520, 0.9, 0.05, 0.4);
    },
    door() {
      // Deux notes brèves qui montent (ré, la) — une porte qui s'ouvre, pas une alarme.
      tone(587, 587, 0.11, 0.045);
      window.setTimeout(() => tone(880, 880, 0.16, 0.04), 90);
      tone(110, 70, 0.22, 0.05);
    },
    setMuted(next) {
      muted = next;
      localStorage.setItem(STORAGE_KEY, next ? '1' : '0');
      if (master && ctx) master.gain.setTargetAtTime(next ? 0 : MIX.master, ctx.currentTime, 0.03);
    },
    isMuted() {
      return muted;
    },
    destroy() {
      whirrSource?.stop();
      sub?.stop();
      void ctx?.close();
      ctx = null;
      master = null;
      whirrFilter = null;
      whirrGain = null;
      whirrSource = null;
      sub = null;
      subGain = null;
    },
  };
}
