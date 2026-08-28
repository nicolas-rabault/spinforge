import { CHESTS } from './config';
import { nextRandom } from './rng';
import { modelsForSlot, type PieceModel, type Slot } from '../content/pieces';
import { TOUPIES } from '../content/toupies';
import type { PieceInstance } from './piece';
import type { ChestKind, MetaState } from './types';

export function chestPrice(kind: ChestKind, count: 1 | 10): { currency: 'credits' | 'gems'; amount: number } {
  const def = CHESTS[kind];
  return { currency: def.currency, amount: count === 10 ? def.price10 : def.price };
}

export function canOpen(meta: MetaState, kind: ChestKind, count: 1 | 10): boolean {
  const { currency, amount } = chestPrice(kind, count);
  return (currency === 'credits' ? meta.credits : meta.gems) >= amount;
}

/** Les modèles qu'un coffre peut rendre pour cet emplacement. Les Lames et les
 *  Noyaux sont **signature** : leurs doublons ne tombent que pour les toupies
 *  débloquées — c'est la seule source de fusion des pièces signature, et elle
 *  ne doit pas récompenser une toupie qu'on ne possède pas. Les Disques et les
 *  Pointes sont génériques : le vivier complet, toujours. */
function poolFor(meta: MetaState, slot: Slot): PieceModel[] {
  const all = modelsForSlot(slot);
  if (slot !== 'lame' && slot !== 'noyau') return all;
  const allowed = new Set(
    TOUPIES.filter((t) => meta.toupies.unlocked.includes(t.id)).map((t) => t.signature[slot]),
  );
  return all.filter((m) => allowed.has(m.id));
}

/** Un tirage consomme **exactement trois** valeurs du flux méta — rang,
 *  emplacement, modèle — que le pity force ou non le rang. Le tirage de rang a
 *  lieu de toute façon et son résultat est écarté quand il est forcé : sans
 *  quoi un compteur au seuil décalerait toute la suite, et les tests de pity
 *  deviendraient illisibles. */
function drawOne(meta: MetaState, kind: ChestKind): PieceInstance {
  const def = CHESTS[kind];
  const hasPity = def.pityThreshold > 0;
  const forced = hasPity && meta.pity[kind] + 1 >= def.pityThreshold;

  const r1 = nextRandom(meta.rngState);
  meta.rngState = r1.state;
  let rank = def.ranks[def.ranks.length - 1].rank;
  let acc = 0;
  for (const odds of def.ranks) {
    acc += odds.p;
    if (r1.value < acc) {
      rank = odds.rank;
      break;
    }
  }
  if (forced) rank = def.pityRank;

  const r2 = nextRandom(meta.rngState);
  meta.rngState = r2.state;
  const slot = def.slots[Math.floor(r2.value * def.slots.length)] as Slot;

  const r3 = nextRandom(meta.rngState);
  meta.rngState = r3.state;
  const models = poolFor(meta, slot);
  const model = models[Math.floor(r3.value * models.length)];

  if (hasPity) {
    meta.pity[kind] = rank >= def.pityRank ? 0 : meta.pity[kind] + 1;
  }
  return { model: model.id, rank, level: 0 };
}

/** Tire `count` pièces d'un coffre. Ne débite rien et ne vérifie rien : c'est le
 *  tirage nu, partagé par l'achat et par le butin de salle — ainsi le pity et la
 *  table de rangs ne peuvent pas diverger entre les deux. */
export function drawPulls(meta: MetaState, kind: ChestKind, count: number): PieceInstance[] {
  const pulls: PieceInstance[] = [];
  for (let i = 0; i < count; i++) pulls.push(drawOne(meta, kind));
  return pulls;
}

/** Retourne les pièces tirées, ou `null` si la monnaie manque — auquel cas
 *  rien n'est débité et le flux de RNG n'avance pas. */
export function openChest(meta: MetaState, kind: ChestKind, count: 1 | 10): PieceInstance[] | null {
  if (!canOpen(meta, kind, count)) return null;
  const { currency, amount } = chestPrice(kind, count);
  if (currency === 'credits') meta.credits -= amount;
  else meta.gems -= amount;
  return drawPulls(meta, kind, count);
}

/** Ouvre un coffre de la file de butin. `null` si la file est vide pour ce type. */
export function grantChest(meta: MetaState, kind: ChestKind): PieceInstance[] | null {
  if (meta.pending[kind] <= 0) return null;
  meta.pending[kind]--;
  return drawPulls(meta, kind, 1);
}
