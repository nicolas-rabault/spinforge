import { ECON, PIECE_EFFECT, PLAYER_BASE } from './config';
import { rarityMult, type PieceInstance, type Slot } from './piece';
import type { MetaState, RunReward, Stats } from './types';

export function upgradeCost(level: number): number {
  return ECON.upgradeBase * Math.pow(ECON.upgradeGrowth, level);
}

export function salleReward(salle: number, boss: boolean): RunReward {
  const base = ECON.rewardBase * Math.pow(ECON.rewardGrowth, salle - 1);
  return boss
    ? { credits: base * ECON.bossRewardMult, gems: ECON.bossGems }
    : { credits: base, gems: 0 };
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
