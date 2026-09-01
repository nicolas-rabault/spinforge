import { MIX } from './mix';

export interface Bus {
  ctx: AudioContext;
  /** Où branchent les bruitages. */
  sfx: GainNode;
  /** Où branche la musique. Séparée pour pouvoir la couper seule, et la ducker. */
  music: GainNode;
  /** Une seconde de bruit blanc, réutilisée par tous les sons percussifs. */
  noise: AudioBuffer;
}

export function noiseBuffer(ctx: BaseAudioContext, seconds: number): AudioBuffer {
  const buffer = ctx.createBuffer(1, Math.round(ctx.sampleRate * seconds), ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return buffer;
}

export function createBus(): Bus {
  const ctx = new AudioContext();

  // Limiteur en sortie : l'arène peut empiler chocs, mort et transition de salle
  // sur la même image, et c'est cette saturation-là qui écrête.
  const limiter = ctx.createDynamicsCompressor();
  limiter.threshold.value = MIX.limiterThresholdDb;
  limiter.knee.value = MIX.limiterKneeDb;
  limiter.ratio.value = MIX.limiterRatio;
  limiter.attack.value = MIX.limiterAttackS;
  limiter.release.value = MIX.limiterReleaseS;
  limiter.connect(ctx.destination);

  const master = ctx.createGain();
  master.gain.value = MIX.master;
  master.connect(limiter);

  const sfx = ctx.createGain();
  sfx.gain.value = MIX.sfxGain;
  sfx.connect(master);

  const music = ctx.createGain();
  music.gain.value = MIX.musicGain;
  music.connect(master);

  return { ctx, sfx, music, noise: noiseBuffer(ctx, 2) };
}

/**
 * Enveloppe percussive. L'attaque de quelques millisecondes n'est pas cosmétique :
 * démarrer un son à pleine amplitude est une discontinuité, donc un clic — et
 * c'est ce clic, répété, qui rendait les impacts agressifs.
 */
export function envelope(
  ctx: BaseAudioContext, at: number, peak: number, attack: number, duration: number,
): GainNode {
  const env = ctx.createGain();
  env.gain.setValueAtTime(0.0001, at);
  env.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), at + attack);
  env.gain.exponentialRampToValueAtTime(0.0001, at + duration);
  return env;
}

export interface BurstOptions {
  freq: number;
  gain: number;
  duration: number;
  q?: number;
  type?: BiquadFilterType;
  /** Instant absolu sur l'horloge audio. Par défaut : maintenant. */
  at?: number;
  rate?: number;
  toFreq?: number;
  attack?: number;
}

/** Une bouffée de bruit filtré : tout ce qui claque, souffle ou craque. */
export function burst(bus: Bus, dest: AudioNode, o: BurstOptions): void {
  const { ctx } = bus;
  const at = o.at ?? ctx.currentTime;
  const src = ctx.createBufferSource();
  src.buffer = bus.noise;
  src.playbackRate.value = o.rate ?? 1;
  const filter = ctx.createBiquadFilter();
  filter.type = o.type ?? 'bandpass';
  filter.frequency.setValueAtTime(o.freq, at);
  if (o.toFreq !== undefined) {
    filter.frequency.exponentialRampToValueAtTime(Math.max(20, o.toFreq), at + o.duration);
  }
  filter.Q.value = o.q ?? MIX.burstQ;
  src.connect(filter).connect(envelope(ctx, at, o.gain, o.attack ?? MIX.burstAttackS, o.duration)).connect(dest);
  src.start(at);
  src.stop(at + o.duration);
}

export interface ToneOptions {
  from: number;
  gain: number;
  duration: number;
  to?: number;
  type?: OscillatorType;
  at?: number;
  attack?: number;
}

export function tone(bus: Bus, dest: AudioNode, o: ToneOptions): void {
  const { ctx } = bus;
  const at = o.at ?? ctx.currentTime;
  const osc = ctx.createOscillator();
  osc.type = o.type ?? 'sine';
  osc.frequency.setValueAtTime(o.from, at);
  if (o.to !== undefined && o.to !== o.from) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.to), at + o.duration);
  }
  osc.connect(envelope(ctx, at, o.gain, o.attack ?? MIX.toneAttackS, o.duration)).connect(dest);
  osc.start(at);
  osc.stop(at + o.duration);
}

export interface MetalOptions {
  freq: number;
  gain: number;
  decay: number;
  at?: number;
  partials?: readonly number[];
}

/**
 * Le corps d'un choc métallique. Les partiels sont **inharmoniques** : des
 * multiples entiers donneraient une note de flûte, ce sont les ratios de plaque
 * (1 · 2,76 · 5,40) qui font entendre du métal. Les partiels aigus décroissent
 * plus vite que la fondamentale, comme dans une vraie plaque.
 */
export function metalBody(bus: Bus, dest: AudioNode, o: MetalOptions): void {
  for (const ratio of o.partials ?? MIX.hitBodyPartials) {
    tone(bus, dest, {
      from: o.freq * ratio,
      gain: o.gain / (1 + (ratio - 1) * MIX.metalRolloff),
      duration: o.decay / Math.sqrt(ratio),
      at: o.at,
      attack: MIX.metalAttackS,
    });
  }
}

/**
 * Filtre en peigne : un délai très court rebouclé sur lui-même. Il donne au bruit
 * une hauteur sans lui donner une note — c'est le son d'une enclume frappée, et la
 * signature « forge » de la musique.
 */
export function comb(bus: Bus, dest: AudioNode, hz: number, feedback: number): AudioNode {
  const { ctx } = bus;
  const input = ctx.createGain();
  const delay = ctx.createDelay(0.05);
  delay.delayTime.value = 1 / hz;
  const loop = ctx.createGain();
  loop.gain.value = feedback;
  input.connect(delay);
  delay.connect(loop).connect(delay);
  delay.connect(dest);
  input.connect(dest);
  return input;
}
