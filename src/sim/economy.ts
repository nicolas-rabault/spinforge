import { ECON, LOOT, PIECE_EFFECT, PLAYER_BASE } from './config';
import { nextRandom } from './rng';
import { rarityMult, type PieceInstance, type Slot } from './piece';
import type { ChestKind, MetaState, RunReward, Stats } from './types';

export function upgradeCost(level: number): number {
  return ECON.upgradeBase * Math.pow(ECON.upgradeGrowth, level);
}

/** Ce qu'une salle vidée rapporte, et le nouvel état du flux. Le tirage d'extra
 *  a lieu **de toute façon**, même quand la salle n'y a pas droit : un flux qui
 *  n'avancerait pas de la même façon selon la salle rendrait toute mesure de
 *  déterminisme illisible. */
export function salleReward(
  salle: number,
  boss: boolean,
  rngState: number,
): { reward: RunReward; rngState: number } {
  const base = ECON.rewardBase * Math.pow(ECON.rewardGrowth, salle - 1);
  const rule = boss ? LOOT.boss : LOOT.bySalle;
  const chests: ChestKind[] = [rule.chest];
  const r = nextRandom(rngState);
  const eligible = boss || salle >= LOOT.bySalle.fromSalle;
  if (eligible && r.value < rule.extraChance) chests.push(rule.extra);
  const reward: RunReward = boss
    ? { credits: base * ECON.bossRewardMult, gems: ECON.bossGems, chests }
    : { credits: base, gems: 0, chests };
  return { reward, rngState: r.state };
}

/** Les deux axes d'une pièce se multiplient : le niveau est linéaire, le rang
 *  est géométrique. Dès le niveau 3 un rang vaut plus qu'un niveau. */
function factor(piece: PieceInstance, perLevel: number): number {
  return (1 + perLevel * piece.level) * rarityMult(piece.rank);
}

export function playerStats(meta: MetaState): Stats {
  const { lame, disque, pointe, noyau } = meta.equipped;
  return {
    attack: PLAYER_BASE.attack * factor(lame, PIECE_EFFECT.lameAttack),
    defense: PLAYER_BASE.defense * factor(disque, PIECE_EFFECT.disqueDefense),
    maxSpeed: PLAYER_BASE.maxSpeed * factor(pointe, PIECE_EFFECT.pointeSpeed),
    spinMax: PLAYER_BASE.spinMax * factor(noyau, PIECE_EFFECT.noyauSpin),
    spinDecay: PLAYER_BASE.spinDecay / factor(pointe, PIECE_EFFECT.pointeDecay),
  };
}

export function tryUpgrade(meta: MetaState, slot: Slot): boolean {
  const piece = meta.equipped[slot];
  const cost = upgradeCost(piece.level);
  if (meta.credits < cost) return false;
  meta.credits -= cost;
  piece.level++;
  return true;
}
