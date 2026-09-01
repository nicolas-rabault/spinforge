import { BUZZ, MIX } from './mix';

export type BuzzKind = keyof typeof BUZZ;
export type Emit = (pattern: number[]) => void;

/** Les événements qui priment sur l'intervalle minimum : ils concluent une
 *  action, les décaler ou les perdre casserait le lien avec ce qu'on voit ou ce
 *  qu'on vient de demander. Mesuré au navigateur sur une fusion réussie : le
 *  clic du bouton vibre en premier (`tap`), sa conclusion (`fuse`) arrive
 *  quelques millisecondes plus tard — bien avant les 60 ms de
 *  `hapticMinGapMs` — et se faisait avaler par l'appui. `fuse` et `equip`
 *  concluent une action tout comme `chestDone` et `bossDown` : mêmes deux
 *  motifs par seconde ajoutés au budget (73 ms sur les `hapticBudgetMs`
 *  disponibles), qui reste le seul garde-fou qu'un urgent ne franchit jamais. */
const URGENT: ReadonlySet<BuzzKind> = new Set<BuzzKind>(['chestDone', 'bossDown', 'fuse', 'equip']);

export interface HapticsState {
  lastAt: number;
  /** Ce qui a été vibré dans la seconde écoulée, pour le budget glissant. */
  window: { at: number; ms: number }[];
}

export function createHapticsState(): HapticsState {
  return { lastAt: -Infinity, window: [] };
}

/** Le motif d'un choc, ou `null` s'il est trop faible pour mériter la main.
 *  Sans ce seuil, une mêlée fait buzzer le téléphone en continu.
 *  `power` arrive déjà borné dans [0, 1] par son unique appelant : le reborner ici
 *  ne protégerait rien, ça masquerait un appelant fautif. */
export function hitPattern(power: number): number[] | null {
  if (power < MIX.hapticHitThreshold) return null;
  return [Math.round(MIX.hapticHitBaseMs + MIX.hapticHitSpanMs * power)];
}

/**
 * Décide si un motif part vraiment, et note ce qu'il coûte.
 *
 * Deux garde-fous : un intervalle minimum entre deux appels, et un budget de
 * millisecondes par seconde glissante. Sans eux, le moteur haptique d'Android
 * empile les motifs et les écrase les uns sur les autres — on sent moins en
 * vibrant plus. Le budget s'applique même aux motifs urgents.
 */
export function admitBuzz(
  state: HapticsState,
  now: number,
  pattern: number[],
  urgent: boolean,
): number[] | null {
  if (!urgent && now - state.lastAt < MIX.hapticMinGapMs) return null;
  const fresh = state.window.filter((e) => now - e.at < MIX.hapticWindowMs);
  const spent = fresh.reduce((sum, e) => sum + e.ms, 0);
  // Seules les durées comptent : dans `[30, 60, 18]`, le 60 est une pause.
  const cost = pattern.filter((_, i) => i % 2 === 0).reduce((sum, ms) => sum + ms, 0);
  if (spent + cost > MIX.hapticBudgetMs) {
    state.window = fresh;
    return null;
  }
  state.lastAt = now;
  state.window = [...fresh, { at: now, ms: cost }];
  return pattern;
}

export interface Haptics {
  buzz(kind: BuzzKind, now: number): void;
  hit(power: number, now: number): void;
  setEnabled(on: boolean): void;
}

/** `emit` est injecté — `null` sur un appareil sans moteur haptique (iOS Safari
 *  n'expose aucune API de vibration). L'absence est un cas ordinaire, pas une
 *  exception à rattraper. */
export function createHaptics(emit: Emit | null, enabled: boolean): Haptics {
  const state = createHapticsState();
  let on = enabled;
  const send = (pattern: number[] | null, urgent: boolean, now: number) => {
    if (!on || !emit || !pattern) return;
    const admitted = admitBuzz(state, now, pattern, urgent);
    if (admitted) emit(admitted);
  };
  return {
    buzz(kind, now) {
      send([...BUZZ[kind]], URGENT.has(kind), now);
    },
    hit(power, now) {
      send(hitPattern(power), false, now);
    },
    setEnabled(next) {
      on = next;
    },
  };
}
