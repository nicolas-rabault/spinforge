import { ECON, PIECE_EFFECT, PLAYER_BASE } from './config';
import type { PieceLevels, SimState, Stats } from './types';

export function upgradeCost(level: number): number {
  return ECON.upgradeBase * Math.pow(ECON.upgradeGrowth, level);
}

export function salleReward(salle: number, boss: boolean): number {
  const base = ECON.rewardBase * Math.pow(ECON.rewardGrowth, salle - 1);
  return boss ? base * ECON.bossRewardMult : base;
}

export function playerStats(pieces: PieceLevels): Stats {
  return {
    attack: PLAYER_BASE.attack * (1 + PIECE_EFFECT.lameAttack * pieces.lame),
    defense: PLAYER_BASE.defense * (1 + PIECE_EFFECT.disqueDefense * pieces.disque),
    maxSpeed: PLAYER_BASE.maxSpeed * (1 + PIECE_EFFECT.pointeSpeed * pieces.pointe),
    accel: PLAYER_BASE.accel,
    spinMax: PLAYER_BASE.spinMax * (1 + PIECE_EFFECT.noyauSpin * pieces.noyau),
    spinDecay: PLAYER_BASE.spinDecay / (1 + PIECE_EFFECT.pointeDecay * pieces.pointe),
  };
}

export function syncPlayerStats(state: SimState): void {
  const stats = playerStats(state.pieces);
  state.player.attack = stats.attack;
  state.player.defense = stats.defense;
  state.player.maxSpeed = stats.maxSpeed;
  state.player.accel = stats.accel;
  state.player.spinMax = stats.spinMax;
  state.player.spinDecay = stats.spinDecay;
  state.player.spin = Math.min(state.player.spin, stats.spinMax);
}

export function tryUpgrade(state: SimState, piece: keyof PieceLevels): boolean {
  const cost = upgradeCost(state.pieces[piece]);
  if (state.credits < cost) return false;
  state.credits -= cost;
  state.pieces[piece]++;
  syncPlayerStats(state);
  return true;
}
