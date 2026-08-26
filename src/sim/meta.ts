import { modelById } from '../content/pieces';
import { SALLES_PER_CHAPTER } from './config';
import { STARTER_EQUIPMENT } from './piece';
import type { PieceInstance, PieceStack, Slot } from './piece';
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

export function stackOf(meta: MetaState, model: string, rank: number): PieceStack | undefined {
  return meta.inventory.find((s) => s.model === model && s.rank === rank);
}

/** Range une pièce dans l'inventaire. Les doublons dorment au niveau 0 ;
 *  `bestLevel` ne retient que le meilleur, pour ne rien perdre si l'on
 *  déséquipe une pièce améliorée. */
export function addPiece(meta: MetaState, piece: PieceInstance): void {
  const stack = stackOf(meta, piece.model, piece.rank);
  if (stack) {
    stack.count++;
    stack.bestLevel = Math.max(stack.bestLevel, piece.level);
    return;
  }
  meta.inventory.push({ model: piece.model, rank: piece.rank, count: 1, bestLevel: piece.level });
}

/** Retire un exemplaire. Retourne le niveau du meilleur exemplaire retiré,
 *  ou `null` si la pile n'existe pas ou est vide. */
export function takePiece(meta: MetaState, model: string, rank: number): number | null {
  const stack = stackOf(meta, model, rank);
  if (!stack || stack.count === 0) return null;
  const level = stack.bestLevel;
  stack.count--;
  if (stack.count === 0) meta.inventory = meta.inventory.filter((s) => s !== stack);
  else stack.bestLevel = 0; // le meilleur vient d'être sorti ; les autres dorment au niveau 0
  return level;
}

/** Équipe une pièce de l'inventaire ; celle qu'elle remplace y retourne. */
export function equipFromStack(meta: MetaState, model: string, rank: number): boolean {
  const slot: Slot = modelById(model).slot;
  const level = takePiece(meta, model, rank);
  if (level === null) return false;
  const previous = meta.equipped[slot];
  meta.equipped[slot] = { model, rank, level };
  addPiece(meta, previous);
  return true;
}
