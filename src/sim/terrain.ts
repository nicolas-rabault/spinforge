import { ARENA, ARENA_RADIUS, BREACH, LAYOUTS, PLAYER_SPAWN, SHARD, ZONES, type ZoneKind } from './config';
import { nextRandom } from './rng';
import type { Top, Vec } from './types';

/** Disque posé au sol. Une toupie y est soumise dès que son **centre** y entre :
 *  c'est ce que le joueur voit sous sa toupie, donc la seule règle qu'il puisse
 *  anticiper. */
export interface Zone {
  kind: ZoneKind;
  x: number;
  y: number;
  radius: number;
}

/** Secteur mortel du bord. Angles en **radians**, centre de l'arène pour origine.
 *  `balance.json` porte la demi-ouverture en degrés (plus lisible à régler) ; la
 *  conversion a lieu une fois, à la construction du gabarit. */
export interface Breach {
  angle: number;
  halfWidth: number;
}

export interface Shard {
  x: number;
  y: number;
  /** Ticks restants avant disparition. */
  ttl: number;
}

export interface ArenaLayout {
  zones: Zone[];
  breaches: Breach[];
  shard: Shard | null;
  /** Ticks avant la prochaine apparition d'éclat. */
  shardTimer: number;
}

/** Modificateurs de terrain appliqués à une toupie. Même principe que
 *  `TalentMods` : chaque champ a une valeur *neutre*, de sorte que le code de
 *  simulation multiplie, compare et additionne sans jamais tester la présence
 *  d'une zone. */
export interface ZoneMods {
  /** Facteur sur la vitesse maximale. 1 = neutre. */
  speedMult: number;
  /** Facteur sur l'accélération. 1 = neutre. */
  accelMult: number;
  /** Friction *plancher* de la zone. 0 = neutre : `max(talents.friction, zone.friction)`
   *  laisse alors la friction du talent intacte, et la plaque glissante l'emporte
   *  toujours sur elle — sans branche. */
  friction: number;
  /** Spin perdu par seconde. 0 = neutre. */
  spinDrain: number;
}

export const NEUTRAL_ZONE: ZoneMods = Object.freeze({
  speedMult: 1,
  accelMult: 1,
  friction: 0,
  spinDrain: 0,
});

/** Modificateurs subis à cette position. Rend `NEUTRAL_ZONE` **par référence**
 *  hors zone — le cas courant, dix fois par seconde et par toupie : aucune
 *  allocation. L'objet étant gelé, l'appelant ne peut pas le contaminer. */
export function zoneModsAt(layout: ArenaLayout, pos: Vec): ZoneMods {
  let mods: ZoneMods | null = null;
  for (const zone of layout.zones) {
    if (Math.hypot(pos.x - zone.x, pos.y - zone.y) > zone.radius) continue;
    const def = ZONES[zone.kind];
    mods ??= { ...NEUTRAL_ZONE };
    mods.speedMult *= def.speedMult;
    mods.accelMult *= def.accelMult;
    mods.friction = Math.max(mods.friction, def.friction);
    mods.spinDrain += def.spinDrain;
  }
  return mods ?? NEUTRAL_ZONE;
}

const TWO_PI = Math.PI * 2;
const DEG = Math.PI / 180;
/** Essais de placement avant d'accepter un chevauchement. Borné pour que le
 *  nombre de tirages consommés reste fini quelle que soit la graine — un
 *  rejet non borné rendrait la durée d'une entrée de salle imprévisible. */
const PLACEMENT_TRIES = 12;

/** Gabarit du dernier palier franchi. La table est triée par `fromSalle`
 *  croissant, ce que `config.test.ts` vérifie. */
function zoneKindsFor(salle: number): ZoneKind[] {
  let kinds: ZoneKind[] = [];
  for (const entry of LAYOUTS) {
    if (salle >= entry.fromSalle) kinds = entry.zones;
  }
  return kinds;
}

/** Vrai si la zone laisse le point d'apparition du joueur dégagé. */
function clearOfSpawn(candidate: Zone): boolean {
  const toSpawn = Math.hypot(candidate.x - PLAYER_SPAWN.x, candidate.y - PLAYER_SPAWN.y);
  return toSpawn >= candidate.radius + ARENA.spawnClearance;
}

/** Vrai si la zone ne recouvre aucune zone déjà posée. */
function clearOfZones(candidate: Zone, placed: Zone[]): boolean {
  return placed.every(
    (other) => Math.hypot(candidate.x - other.x, candidate.y - other.y) >= candidate.radius + other.radius,
  );
}

/**
 * Repli déterministe : diamétralement opposé au point d'apparition, à la limite
 * intérieure de l'anneau. Il rend la garantie « jamais sur le point d'apparition »
 * **absolue** au lieu de probable — le tirage rejeté est borné à douze essais, il
 * pourrait donc rendre un candidat fautif. Le chevauchement entre zones, lui,
 * reste toléré : il ne coûte qu'un peu de lisibilité, jamais du spin imparable.
 */
function awayFromSpawn(kind: ZoneKind, radius: number): Zone {
  const span = ARENA_RADIUS - radius;
  const d = Math.hypot(PLAYER_SPAWN.x, PLAYER_SPAWN.y) || 1;
  const k = Math.min(span, d + radius + ARENA.spawnClearance) / d;
  return { kind, x: -PLAYER_SPAWN.x * k, y: -PLAYER_SPAWN.y * k, radius };
}

export function buildLayout(salle: number, rngState: number): { layout: ArenaLayout; rngState: number } {
  let rng = rngState;
  const zones: Zone[] = [];

  for (const kind of zoneKindsFor(salle)) {
    const radius = ZONES[kind].radius;
    // La zone entière doit tenir dans l'anneau : son centre reste à `radius` du bord.
    const span = ARENA_RADIUS - radius;
    const draw = (): Zone => {
      const ra = nextRandom(rng);
      rng = ra.state;
      const rr = nextRandom(rng);
      rng = rr.state;
      const angle = ra.value * TWO_PI;
      // La racine carrée donne une densité uniforme sur le disque ; sans elle,
      // toutes les zones s'agglutineraient au centre.
      const dist = Math.sqrt(rr.value) * span;
      return { kind, x: Math.cos(angle) * dist, y: Math.sin(angle) * dist, radius };
    };
    let candidate = draw();
    for (
      let t = 1;
      t < PLACEMENT_TRIES && !(clearOfSpawn(candidate) && clearOfZones(candidate, zones));
      t++
    ) {
      candidate = draw();
    }
    zones.push(clearOfSpawn(candidate) ? candidate : awayFromSpawn(kind, radius));
  }

  const breaches: Breach[] = [];
  if (salle >= BREACH.fromSalle) {
    const rb = nextRandom(rng);
    rng = rb.state;
    // Un seul tirage : l'orientation de la paire. L'écart entre deux brèches est
    // fixe et régulier, ce qui garantit qu'il reste toujours un secteur de bord
    // plein assez large pour s'y adosser — une éjection est toujours évitable.
    const base = rb.value * TWO_PI;
    for (let i = 0; i < BREACH.count; i++) {
      breaches.push({ angle: base + (i * TWO_PI) / BREACH.count, halfWidth: BREACH.halfWidthDeg * DEG });
    }
  }

  return {
    layout: { zones, breaches, shard: null, shardTimer: SHARD.everyTicks },
    rngState: rng,
  };
}

/** Vrai si cet angle de bord tombe dans un secteur mortel. */
export function inBreach(layout: ArenaLayout, angle: number): boolean {
  for (const breach of layout.breaches) {
    // Écart signé replié dans [-π, π] : sans ce repli, une brèche à 6,2 rad et
    // un point à 0,05 rad — le même endroit à 2π près — sembleraient opposés.
    const raw = angle - breach.angle;
    const wrapped = Math.atan2(Math.sin(raw), Math.cos(raw));
    if (Math.abs(wrapped) <= breach.halfWidth) return true;
  }
  return false;
}

/**
 * Fait vivre l'éclat : compte à rebours, apparition, expiration. Retourne le
 * nouvel état du flux — **inchangé** tant qu'aucun éclat n'apparaît, pour que
 * la consommation de tirages reste facile à suivre.
 */
export function updateShard(layout: ArenaLayout, rngState: number): number {
  if (layout.shard) {
    layout.shard.ttl--;
    if (layout.shard.ttl <= 0) {
      layout.shard = null;
      layout.shardTimer = SHARD.everyTicks;
    }
    return rngState;
  }
  layout.shardTimer--;
  if (layout.shardTimer > 0) return rngState;
  const ra = nextRandom(rngState);
  const rr = nextRandom(ra.state);
  const angle = ra.value * TWO_PI;
  const dist = ARENA_RADIUS * (SHARD.minRadius + rr.value * (SHARD.maxRadius - SHARD.minRadius));
  layout.shard = { x: Math.cos(angle) * dist, y: Math.sin(angle) * dist, ttl: SHARD.lifeTicks };
  return rr.state;
}

/**
 * Distance la plus courte entre un point et le trajet parcouru par la toupie
 * pendant le tick (`from` → `pos`).
 *
 * Mesurer depuis la seule position d'arrivée laissait passer au travers : à
 * 100 ms de pas, une toupie lancée parcourt plus que les ~26 px de portée d'un
 * éclat, et le survolait sans le voir. Même défaut que celui des collisions
 * entre toupies, sur un disque immobile.
 */
function distToTravel(top: Top, px: number, py: number): number {
  const dx = top.pos.x - top.from.x;
  const dy = top.pos.y - top.from.y;
  const len2 = dx * dx + dy * dy;
  // Projection du point sur le trajet, bornée à ses deux extrémités.
  const t = len2 === 0
    ? 0
    : Math.max(0, Math.min(1, ((px - top.from.x) * dx + (py - top.from.y) * dy) / len2));
  return Math.hypot(top.from.x + t * dx - px, top.from.y + t * dy - py);
}

/**
 * Le premier arrivé prend l'éclat. Retourne l'id du preneur, ou `null`.
 * L'ordre du tableau tranche les litiges — le joueur en tête : le cas exact
 * (deux toupies au contact le même tick) est trop rare pour mériter mieux.
 */
export function takeShard(layout: ArenaLayout, tops: Top[]): string | null {
  const shard = layout.shard;
  if (!shard) return null;
  for (const top of tops) {
    // Une toupie déjà à zéro ne ramasse rien : `takeShard` tourne AVANT le filtre
    // des morts et la branche de mort du joueur, donc sans cette garde un joueur
    // éjecté au même tick esquiverait sa propre mort en effleurant l'éclat.
    if (top.spin <= 0) continue;
    if (distToTravel(top, shard.x, shard.y) > SHARD.radius + top.radius) continue;
    top.spin = Math.min(top.spinMax, top.spin + SHARD.spinGain * top.spinMax);
    layout.shard = null;
    layout.shardTimer = SHARD.everyTicks;
    return top.id;
  }
  return null;
}
