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
    pending: { bronze: 0, arene: 0, mythique: 0 },
    chapterValidated: false,
  };
}

export function applyReward(meta: MetaState, reward: RunReward): void {
  meta.credits += reward.credits;
  meta.gems += reward.gems;
  for (const kind of reward.chests) meta.pending[kind]++;
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

/** Range une pièce dans l'inventaire. `levels` reste trié du meilleur au moins
 *  bon : c'est ce qui permet à `takePiece` de toujours rendre le meilleur
 *  exemplaire sans jamais perdre le niveau de ceux qui restent. */
export function addPiece(meta: MetaState, piece: PieceInstance): void {
  const stack = stackOf(meta, piece.model, piece.rank);
  if (stack) {
    const i = stack.levels.findIndex((l) => l < piece.level);
    if (i === -1) stack.levels.push(piece.level);
    else stack.levels.splice(i, 0, piece.level);
    return;
  }
  meta.inventory.push({ model: piece.model, rank: piece.rank, levels: [piece.level] });
}

/** Retire le meilleur exemplaire de la pile. Retourne son niveau, ou `null` si
 *  la pile n'existe pas ou est vide. */
export function takePiece(meta: MetaState, model: string, rank: number): number | null {
  const stack = stackOf(meta, model, rank);
  if (!stack || stack.levels.length === 0) return null;
  const level = stack.levels.shift()!;
  if (stack.levels.length === 0) meta.inventory = meta.inventory.filter((s) => s !== stack);
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

/** Nombre total de coffres en attente — la pastille de l'onglet Coffres. */
export function pendingTotal(meta: MetaState): number {
  return meta.pending.bronze + meta.pending.arene + meta.pending.mythique;
}
