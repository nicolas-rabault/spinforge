import { SALLES_PER_CHAPTER } from '../sim/config';
import { LAYERS, MIX, MUSIC } from './mix';
import { burst, comb, noiseBuffer, tone, type Bus } from './synth';

export type LayerName = keyof typeof LAYERS;

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

/** Durée d'une mesure à quatre temps, dérivée du tempo. */
const BAR_S = (60 / MIX.bpm) * 4;
/** Durée d'un pas : la mesure divisée par le nombre de pas qu'elle contient —
 *  ainsi tempo et grille ne peuvent plus diverger l'un de l'autre. */
const STEP_S = BAR_S / MIX.stepsPerBar;
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
      tone(b, duckNode!, {
        from: MUSIC.pulse.from, to: MUSIC.pulse.to, duration: MUSIC.pulse.duration,
        gain: MUSIC.pulse.gain, at, attack: MUSIC.pulse.attack,
      });
    }
    // L'enclume, sur les contretemps : c'est elle qui donne le lieu.
    if (layers.includes('anvil') && (inBar === 6 || inBar === 11)) {
      burst(b, anvilIn!, {
        freq: MUSIC.anvil.freq, q: MUSIC.anvil.q, gain: MUSIC.anvil.gain,
        duration: MUSIC.anvil.duration, at,
      });
    }
    // Le motif occupe les deux dernières mesures de chaque groupe de quatre (et
    // se tait sur les deux premières) : entendu huit fois d'affilée, il
    // deviendrait une sonnerie.
    if (layers.includes('motif') && bar % 4 >= 2) {
      const slot = [0, 3, 6, 10].indexOf(inBar);
      if (slot >= 0) {
        tone(b, duckNode!, {
          from: MUSIC.motif.notes[slot], duration: MUSIC.motif.duration, gain: MUSIC.motif.gain,
          at, type: 'triangle',
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

  /** Le corps de `setIntensity`, appelé aussi à la fin de `attach()`. `App` règle
   *  l'intensité dès son montage, donc AVANT le premier geste qui crée le contexte
   *  audio : sans ce rappel, la valeur restait mémorisée sans jamais être appliquée,
   *  et comme `intensityFor` rend la même chose pour les salles 1 à 9, l'effet
   *  suivant était avalé par le garde d'égalité — le séquenceur n'était jamais
   *  démarré de toute la partie. Mesuré : zéro `setInterval` de 25 ms créé. */
  function applyIntensity(): void {
    if (!bus || !droneGain || !tensionGain) return;
    const t = bus.ctx.currentTime;
    const fade = intensity === 0 ? MIX.deathFadeS : MIX.layerFadeS;
    const droneTarget = MUSIC.drone.gainBase * (MUSIC.drone.gainFloor + MUSIC.drone.gainSpan * intensity);
    droneGain.gain.setTargetAtTime(intensity > 0 ? droneTarget : 0, t, fade);
    tensionGain.gain.setTargetAtTime(intensity >= LAYERS.tension ? MUSIC.tension.gain : 0, t, fade);
    runTimer(intensity > 0);
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
      droneOsc.frequency.value = MUSIC.drone.note;
      droneOsc.connect(droneGain);
      droneOsc.start();
      const droneNoise = ctx.createBufferSource();
      droneNoise.buffer = noiseBuffer(ctx, MUSIC.drone.noiseBufferS);
      droneNoise.loop = true;
      const droneFilter = ctx.createBiquadFilter();
      droneFilter.type = 'lowpass';
      droneFilter.frequency.value = MUSIC.drone.noiseFilterHz;
      const droneNoiseGain = ctx.createGain();
      droneNoiseGain.gain.value = MUSIC.drone.noiseGain;
      droneNoise.connect(droneFilter).connect(droneNoiseGain).connect(droneGain);
      droneNoise.start();

      // La nappe de tension, muette jusqu'au boss.
      tensionGain = ctx.createGain();
      tensionGain.gain.value = 0;
      tensionGain.connect(duckNode);
      const tensionOsc = ctx.createOscillator();
      tensionOsc.type = 'sawtooth';
      tensionOsc.frequency.value = MUSIC.tension.note;
      const tensionFilter = ctx.createBiquadFilter();
      tensionFilter.type = 'lowpass';
      tensionFilter.frequency.value = MUSIC.tension.filterHz;
      tensionOsc.connect(tensionFilter).connect(tensionGain);
      tensionOsc.start();

      // Un seul filtre en peigne pour toutes les frappes d'enclume : en recréer un
      // par note laisserait autant de boucles de délai vivantes derrière soi.
      anvilIn = comb(next, duckNode, MUSIC.anvil.combNote, MUSIC.anvil.combFeedback);

      // L'intensité a déjà été demandée avant que ce bus n'existe : on la rattrape.
      applyIntensity();
    },

    setIntensity(value) {
      const target = Math.max(0, Math.min(1, value));
      if (target === intensity) return;
      intensity = target;
      applyIntensity();
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
