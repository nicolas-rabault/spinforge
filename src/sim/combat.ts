import { CHARGE_BONUS, DAMAGE_K, RESTITUTION, TICK_S } from './config';
import type { Top } from './types';

/** Décroissance d'un tick pour cette toupie, talents compris. 0 pendant une
 *  suspension (Relance) : `decaySpin` la teste déjà avant d'appeler cette
 *  fonction, mais `snapshot.ts` (rendu) l'appelle désormais directement pour
 *  prédire le tick à venir, et doit voir la même pause. */
export function decayPerTick(top: Top): number {
  if (top.decayPauseTicks > 0) return 0;
  return top.spinDecay * top.talents.spinDecayMult;
}

export function decaySpin(top: Top): void {
  if (top.decayPauseTicks > 0) {
    top.decayPauseTicks--;
    return;
  }
  top.spin -= decayPerTick(top) * TICK_S;
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

/** 1 quand les deux avancent autant, 1 + CHARGE_BONUS pour un assaut pur. */
function chargeWeight(share: number): number {
  return 1 - CHARGE_BONUS + 2 * CHARGE_BONUS * share;
}

/** Dégâts qu'`att` inflige à `def` pour un impact donné. `share` est la part du
 *  rapprochement qu'`att` a elle-même provoquée. Les trois facteurs se composent :
 *  la charge module selon qui a foncé, Percée retire une part de la défense,
 *  Estoc majore au-delà d'un seuil de vitesse. */
function damage(att: Top, def: Top, impact: number, share: number): number {
  const defense = def.defense * (1 - att.talents.defenseIgnore);
  const bonus = impact >= att.talents.estocThreshold ? 1 + att.talents.estocBonus : 1;
  return ((impact * att.attack) / (att.attack + defense)) * DAMAGE_K * chargeWeight(share) * bonus;
}

export function resolveCollision(a: Top, b: Top): void {
  const dx = b.pos.x - a.pos.x;
  const dy = b.pos.y - a.pos.y;
  const dist = Math.hypot(dx, dy);
  const minDist = a.radius + b.radius;
  if (dist === 0 || dist >= minDist) return;
  const nx = dx / dist;
  const ny = dy / dist;
  const overlap = (minDist - dist) / 2;
  a.pos.x -= nx * overlap;
  a.pos.y -= ny * overlap;
  b.pos.x += nx * overlap;
  b.pos.y += ny * overlap;
  const rvx = b.vel.x - a.vel.x;
  const rvy = b.vel.y - a.vel.y;
  const vrel = rvx * nx + rvy * ny;
  if (vrel >= 0) return;
  const impact = -vrel;

  // Qui a provoqué le rapprochement ? Se lit IMPÉRATIVEMENT avant l'impulsion, qui
  // échange précisément les vitesses des deux toupies et inverserait la réponse —
  // récompensant alors la passivité. `impact` étant la somme exacte des deux
  // vitesses de fermeture, les deux poids de charge somment toujours à 2 : un choc
  // frontal reste rigoureusement ce qu'il était.
  const share = clamp01((a.vel.x * nx + a.vel.y * ny) / impact);

  // Impulsion pondérée par les masses. À masses égales (1 et 1), j vaut
  // -(1+e)·vrel/2 et chacun en reçoit la moitié — exactement le calcul du jalon 1.
  const ma = a.talents.mass;
  const mb = b.talents.mass;
  const j = (-(1 + RESTITUTION) * vrel) / (1 / ma + 1 / mb);
  a.vel.x -= (j / ma) * nx * a.talents.impulseTaken;
  a.vel.y -= (j / ma) * ny * a.talents.impulseTaken;
  b.vel.x += (j / mb) * nx * b.talents.impulseTaken;
  b.vel.y += (j / mb) * ny * b.talents.impulseTaken;

  // Dégâts bruts avant Frôlement. Riposte renvoie une part de ce que son
  // porteur vient d'encaisser : ce renvoi doit donc, lui aussi, passer par le
  // seuil de Frôlement de qui le reçoit — sans quoi Frôlement protègerait du
  // coup direct mais pas de sa réplique.
  const toB = damage(a, b, impact, share);
  const toA = damage(b, a, impact, 1 - share);
  const dmgB = toB + toA * a.talents.riposte;
  const dmgA = toA + toB * b.talents.riposte;
  // Frôlement protège son porteur seul : chaque camp teste son propre seuil,
  // sur le total qu'il encaisserait (coup direct et réplique confondus).
  b.spin -= impact < b.talents.frolementThreshold ? 0 : dmgB;
  a.spin -= impact < a.talents.frolementThreshold ? 0 : dmgA;

  // Math.max plutôt qu'une affectation conditionnelle : sans talent, relanceTicks
  // vaut 0 et ne raccourcit jamais une pause déjà en cours ; avec, il ne fait
  // jamais reculer une pause plus longue qu'un choc précédent aurait armée.
  a.decayPauseTicks = Math.max(a.decayPauseTicks, a.talents.relanceTicks);
  b.decayPauseTicks = Math.max(b.decayPauseTicks, b.talents.relanceTicks);
}
