import { ZONES, type ZoneKind } from './config';
import type { Vec } from './types';

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
