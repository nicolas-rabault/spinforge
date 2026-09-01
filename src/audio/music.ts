import { SALLES_PER_CHAPTER } from '../sim/config';
import { LAYERS, MIX } from './mix';
import { burst, comb, noiseBuffer, tone, type Bus } from './synth';

/** Ré phrygien, en demi-tons depuis la fondamentale. Le mode le plus sombre qui
 *  reste chantable — et son demi-ton ré → mi♭ EST la tension du boss. */
export const PHRYGIAN = [0, 1, 3, 5, 7, 8, 10] as const;
/** Le motif : ré, la, si♭, fa. */
export const MOTIF = [0, 7, 8, 3] as const;
/** La nappe de tension : le mi♭ tenu contre le bourdon en ré. */
export const TENSION = 1;

export type LayerName = keyof typeof LAYERS;

/** Hauteur d'un degré du mode, à l'octave demandée au-dessus de la racine. */
export function noteHz(semitone: number, octave: number): number {
  return MIX.rootHz * Math.pow(2, octave + semitone / 12);
}

/** L'intensité est une fonction pure du contexte : c'est ce qui permet de la
 *  tester, et ce qui garantit que deux écrans ne se disputent pas la musique. */
export function intensityFor(combat: boolean, salle: number, dead: boolean): number {
  if (dead) return 0;
  if (!combat) return MIX.intensityMenus;
  return salle >= SALLES_PER_CHAPTER ? MIX.intensityBoss : MIX.intensityCombat;
}

export function activeLayers(intensity: number): LayerName[] {
  if (intensity <= 0) return [];
  return (Object.keys(LAYERS) as LayerName[]).filter((name) => intensity >= LAYERS[name]);
}

export interface Music {
  attach(bus: Bus): void;
  setIntensity(value: number): void;
  /** Baisse la musique le temps d'un choc fort. */
  duck(): void;
  suspend(): void;
  resume(): void;
}

const STEP_S = 60 / MIX.bpm / 4; // une double-croche
const TOTAL_STEPS = MIX.bars * MIX.stepsPerBar;

export function createMusic(): Music {
  let bus: Bus | null = null;
  /** Nœud propre au ducking : le gain de la musique côté `Bus` appartient au
   *  réglage « Musique », les deux ne doivent pas se marcher dessus. */
  let duckNode: GainNode | null = null;
  let droneGain: GainNode | null = null;
  let tensionGain: GainNode | null = null;
  let anvilIn: AudioNode | null = null;
  let timer: number | null = null;
  let intensity = 0;
  let step = 0;
  let nextAt = 0;

  function scheduleStep(b: Bus, index: number, at: number): void {
    const layers = activeLayers(intensity);
    const inBar = index % MIX.stepsPerBar;
    const bar = Math.floor(index / MIX.stepsPerBar);

    // Le pouls en demi-temps : deux frappes par mesure. À 92 BPM, une frappe par
    // temps ferait une marche ; c'est une forge, pas une parade.
    if (layers.includes('pulse') && inBar % 8 === 0) {
      tone(b, duckNode!, { from: 110, to: 44, duration: 0.09, gain: 0.16, at, attack: 0.003 });
    }
    // L'enclume, sur les contretemps : c'est elle qui donne le lieu.
    if (layers.includes('anvil') && (inBar === 6 || inBar === 11)) {
      burst(b, anvilIn!, { freq: 1400, q: 1.2, gain: 0.05, duration: 0.05, at });
    }
    // Le motif n'entre qu'une mesure sur deux : entendu huit fois d'affilée, il
    // devient une sonnerie.
    if (layers.includes('motif') && bar % 4 >= 2) {
      const slot = [0, 3, 6, 10].indexOf(inBar);
      if (slot >= 0) {
        tone(b, duckNode!, {
          from: noteHz(MOTIF[slot], 3), duration: 0.28, gain: 0.05, at, type: 'triangle',
        });
      }
    }
  }

  /**
   * Planification à l'avance : à chaque réveil du minuteur, on programme tout ce
   * qui tombe dans les 100 ms suivantes, sur l'horloge audio. Un `setTimeout` par
   * note serait à la merci du moindre à-coup du fil principal — et l'arène en
   * produit.
   */
  function pump(): void {
    const b = bus;
    if (!b) return;
    while (nextAt < b.ctx.currentTime + MIX.lookaheadS) {
      scheduleStep(b, step, nextAt);
      step = (step + 1) % TOTAL_STEPS;
      nextAt += STEP_S;
    }
  }

  function runTimer(on: boolean): void {
    if (on && timer === null && bus) {
      nextAt = Math.max(nextAt, bus.ctx.currentTime);
      timer = window.setInterval(pump, MIX.timerMs);
    }
    if (!on && timer !== null) {
      window.clearInterval(timer);
      timer = null;
    }
  }

  return {
    attach(next) {
      bus = next;
      const { ctx } = next;
      duckNode = ctx.createGain();
      duckNode.connect(next.music);

      // Le bourdon : un sinus à la fondamentale doublé d'un souffle très grave.
      droneGain = ctx.createGain();
      droneGain.gain.value = 0;
      droneGain.connect(duckNode);
      const droneOsc = ctx.createOscillator();
      droneOsc.frequency.value = MIX.rootHz * 2;
      droneOsc.connect(droneGain);
      droneOsc.start();
      const droneNoise = ctx.createBufferSource();
      droneNoise.buffer = noiseBuffer(ctx, 3);
      droneNoise.loop = true;
      const droneFilter = ctx.createBiquadFilter();
      droneFilter.type = 'lowpass';
      droneFilter.frequency.value = 180;
      const droneNoiseGain = ctx.createGain();
      droneNoiseGain.gain.value = 0.35;
      droneNoise.connect(droneFilter).connect(droneNoiseGain).connect(droneGain);
      droneNoise.start();

      // La nappe de tension, muette jusqu'au boss.
      tensionGain = ctx.createGain();
      tensionGain.gain.value = 0;
      tensionGain.connect(duckNode);
      const tensionOsc = ctx.createOscillator();
      tensionOsc.type = 'sawtooth';
      tensionOsc.frequency.value = noteHz(TENSION, 2);
      const tensionFilter = ctx.createBiquadFilter();
      tensionFilter.type = 'lowpass';
      tensionFilter.frequency.value = 700;
      tensionOsc.connect(tensionFilter).connect(tensionGain);
      tensionOsc.start();

      // Un seul filtre en peigne pour toutes les frappes d'enclume : en recréer un
      // par note laisserait autant de boucles de délai vivantes derrière soi.
      anvilIn = comb(next, duckNode, noteHz(0, 5), 0.72);
    },

    setIntensity(value) {
      const target = Math.max(0, Math.min(1, value));
      if (target === intensity) return;
      intensity = target;
      if (!bus || !droneGain || !tensionGain) return;
      const t = bus.ctx.currentTime;
      const fade = target === 0 ? MIX.deathFadeS : MIX.layerFadeS;
      droneGain.gain.setTargetAtTime(target > 0 ? 0.09 * (0.5 + target / 2) : 0, t, fade);
      tensionGain.gain.setTargetAtTime(target >= LAYERS.tension ? 0.03 : 0, t, fade);
      runTimer(target > 0);
    },

    duck() {
      if (!bus || !duckNode) return;
      const t = bus.ctx.currentTime;
      duckNode.gain.cancelScheduledValues(t);
      duckNode.gain.setValueAtTime(MIX.duckMusic, t);
      duckNode.gain.setTargetAtTime(1, t + MIX.duckHoldS, MIX.duckReleaseS);
    },

    suspend() {
      runTimer(false);
    },

    resume() {
      runTimer(intensity > 0);
    },
  };
}
