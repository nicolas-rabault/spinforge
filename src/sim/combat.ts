import { CHARGE_BONUS, DAMAGE_K, RESTITUTION, TICK_S } from './config';
import type { ZoneMods } from './terrain';
import { typeMult } from './typeChart';
import type { Top } from './types';

/** Décroissance d'un tick pour cette toupie, talents compris. 0 pendant une
 *  suspension (Relance) : `decaySpin` la teste déjà avant d'appeler cette
 *  fonction, mais `snapshot.ts` (rendu) l'appelle désormais directement pour
 *  prédire le tick à venir, et doit voir la même pause. */
export function decayPerTick(top: Top): number {
  if (top.decayPauseTicks > 0) return 0;
  return top.spinDecay * top.talents.spinDecayMult;
}

/** Spin perdu par seconde, terrain compris. `snapshot.ts` s'en sert pour prédire
 *  le tick à venir : sans la perte de zone, `observer.ts` prendrait les pointes
 *  pour un choc et couvrirait l'arène d'étincelles sans contact. */
export function drainPerTick(top: Top, zone: ZoneMods): number {
  return decayPerTick(top) + zone.spinDrain;
}

export function decaySpin(top: Top, zone: ZoneMods): void {
  // Lu AVANT le décrément : lu après, le dernier tick d'une pause de Relance
  // reprendrait la décroissance naturelle un tick trop tôt.
  const drain = drainPerTick(top, zone);
  // Relance suspend l'endurance, jamais les pointes — celles-ci sont des dégâts.
  if (top.decayPauseTicks > 0) top.decayPauseTicks--;
  top.spin -= drain * TICK_S;
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

/** 1 quand les deux avancent autant, 1 + CHARGE_BONUS pour un assaut pur. */
function chargeWeight(share: number): number {
  return 1 - CHARGE_BONUS + 2 * CHARGE_BONUS * share;
}

/** Dégâts qu'`att` inflige à `def` pour un impact donné. `share` est la part du
 *  rapprochement qu'`att` a elle-même provoquée. Les quatre facteurs se composent :
 *  la charge module selon qui a foncé, Percée retire une part de la défense,
 *  Estoc majore au-delà d'un seuil de vitesse, et le triangle des forces module
 *  selon les types. Aucun ne remplace les autres — en particulier, le triangle
 *  se pose *par-dessus* le partage de charge, qui reste seul juge de qui a foncé. */
function damage(att: Top, def: Top, impact: number, share: number): number {
  const defense = def.defense * (1 - att.talents.defenseIgnore);
  const bonus = impact >= att.talents.estocThreshold ? 1 + att.talents.estocBonus : 1;
  return (
    ((impact * att.attack) / (att.attack + defense)) *
    DAMAGE_K * chargeWeight(share) * bonus * typeMult(att.type, def.type)
  );
}

/**
 * Instant du tick — dans [0, 1] — où les deux toupies entrent en contact, `null`
 * si leurs trajets ne se touchent à aucun moment.
 *
 * Comparer les seules positions d'arrivée ne suffit pas, et se trompe de deux
 * façons. Le pas de simulation dure 100 ms, pendant lesquelles deux toupies
 * lancées se rapprochent de bien plus que les ~24 px qui les mettent au contact.
 * Ou bien la fenêtre de chevauchement tombe entre deux échantillons et le choc
 * n'a jamais lieu ; ou bien elles se sont déjà dépassées à l'arrivée et le
 * chevauchement qu'on y lit donne une normale à l'envers — la séparation les
 * pousse alors dans le sens de leur marche et la vitesse relative paraît
 * positive, donc ni impulsion ni dégâts. Dans les deux cas, elles se croisent
 * sans se toucher.
 *
 * On résout donc |p(t)| = minDist sur la position relative, qui varie
 * linéairement de `p0` (début du tick) à l'arrivée — une simple équation du
 * second degré dont on garde la plus petite racine, l'entrée dans le contact.
 */
function contactTime(a: Top, b: Top): number | null {
  const minDist = a.radius + b.radius;
  const p0x = b.from.x - a.from.x;
  const p0y = b.from.y - a.from.y;
  const c = p0x * p0x + p0y * p0y - minDist * minDist;
  if (c <= 0) {
    // Contact déjà en cours au début du tick : il n'y a pas d'entrée à chercher.
    // On résout sur les positions d'arrivée — et seulement s'il y dure encore,
    // sinon le choc a été encaissé au tick précédent et elles ne font que se
    // séparer, ce que rejouer ferait payer deux fois.
    const ex = b.pos.x - a.pos.x;
    const ey = b.pos.y - a.pos.y;
    return ex * ex + ey * ey < minDist * minDist ? 0 : null;
  }
  const dx = b.pos.x - a.pos.x - p0x;
  const dy = b.pos.y - a.pos.y - p0y;
  const qa = dx * dx + dy * dy;
  if (qa === 0) return null;
  const qb = 2 * (p0x * dx + p0y * dy);
  const disc = qb * qb - 4 * qa * c;
  if (disc < 0) return null;
  const t = (-qb - Math.sqrt(disc)) / (2 * qa);
  return t >= 0 && t <= 1 ? t : null;
}

/** Ramène la toupie où elle était à l'instant `t` de son trajet. Le reste du
 *  déplacement est perdu — c'est ce que fait un choc. */
function rewind(top: Top, t: number): void {
  top.pos.x = top.from.x + (top.pos.x - top.from.x) * t;
  top.pos.y = top.from.y + (top.pos.y - top.from.y) * t;
}

export function resolveCollision(a: Top, b: Top): void {
  const t = contactTime(a, b);
  if (t === null) return;
  // Rembobiner à l'instant du choc, mais JAMAIS quand le contact durait déjà au
  // début du tick (t = 0) : deux toupies qui frottent l'une contre l'autre
  // perdraient chaque tick le déplacement qu'elles viennent de faire, et se
  // retrouveraient figées sur place.
  if (t > 0) {
    rewind(a, t);
    rewind(b, t);
  }
  const dx = b.pos.x - a.pos.x;
  const dy = b.pos.y - a.pos.y;
  const dist = Math.hypot(dx, dy);
  const minDist = a.radius + b.radius;
  if (dist === 0) return;
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
  const ma = a.mass;
  const mb = b.mass;
  const j = (-(1 + RESTITUTION) * vrel) / (1 / ma + 1 / mb);
  a.vel.x -= (j / ma) * nx * a.talents.impulseTaken;
  a.vel.y -= (j / ma) * ny * a.talents.impulseTaken;
  b.vel.x += (j / mb) * nx * b.talents.impulseTaken;
  b.vel.y += (j / mb) * ny * b.talents.impulseTaken;

  // Dégâts bruts du coup direct, puis Frôlement appliqué immédiatement : Riposte
  // ne peut renvoyer que ce que son porteur a RÉELLEMENT encaissé — jamais les
  // dégâts que son propre Frôlement vient d'annuler. `takenA`/`takenB` sont donc
  // déjà nets du Frôlement de leur camp avant d'entrer dans le calcul de riposte.
  const rawToB = damage(a, b, impact, share);
  const rawToA = damage(b, a, impact, 1 - share);
  const takenB = impact < b.talents.frolementThreshold ? 0 : rawToB;
  const takenA = impact < a.talents.frolementThreshold ? 0 : rawToA;
  // Riposte renvoie une part de ce que son porteur a réellement subi. Ce renvoi
  // doit lui aussi passer par le seuil de Frôlement de qui le reçoit — sans quoi
  // Frôlement protègerait du coup direct mais pas de sa réplique.
  const dmgB = takenB + takenA * a.talents.riposte;
  const dmgA = takenA + takenB * b.talents.riposte;
  // Frôlement protège son porteur seul : chaque camp teste à nouveau son propre
  // seuil, sur le total qu'il encaisserait (coup direct et réplique confondues).
  b.spin -= impact < b.talents.frolementThreshold ? 0 : dmgB;
  a.spin -= impact < a.talents.frolementThreshold ? 0 : dmgA;

  // Math.max plutôt qu'une affectation conditionnelle : sans talent, relanceTicks
  // vaut 0 et ne raccourcit jamais une pause déjà en cours ; avec, il ne fait
  // jamais reculer une pause plus longue qu'un choc précédent aurait armée.
  a.decayPauseTicks = Math.max(a.decayPauseTicks, a.talents.relanceTicks);
  b.decayPauseTicks = Math.max(b.decayPauseTicks, b.talents.relanceTicks);
}
