import { SALLES_PER_CHAPTER } from './config';
import { STARTER_EQUIPMENT } from './piece';
import type { MetaState, RunReward } from './types';

export function createInitialMeta(seed: number): MetaState {
  return {
    rngState: seed >>> 0 || 1,
    credits: 0,
    gems: 0,
    equipped: {
      lame: { ...STARTER_EQUIPMENT.lame },
      disque: { ...STARTER_EQUIPMENT.disque },
      pointe: { ...STARTER_EQUIPMENT.pointe },
      noyau: { ...STARTER_EQUIPMENT.noyau },
    },
    inventory: [],
    pity: { bronze: 0, arene: 0, mythique: 0 },
    chapterValidated: false,
  };
}

export function applyReward(meta: MetaState, reward: RunReward): void {
  meta.credits += reward.credits;
  meta.gems += reward.gems;
}

/** Applique au méta ce qu'une salle vidée vient de produire. `salleJustCleared`
 *  est la salle **avant** l'avancement — `tick()` a déjà fait avancer `run.salle`. */
export function applyRunReward(meta: MetaState, reward: RunReward, salleJustCleared: number): void {
  applyReward(meta, reward);
  if (salleJustCleared === SALLES_PER_CHAPTER) meta.chapterValidated = true;
}
