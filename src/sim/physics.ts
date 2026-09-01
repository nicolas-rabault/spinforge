import { ARENA, ARENA_RADIUS, TICK_S, WALL_RESTITUTION } from './config';
import { inBreach, type ArenaLayout, type ZoneMods } from './terrain';
import type { Top, Vec } from './types';

/** Vitesse maximale effective. Toupie folle la relève à mesure que le spin
 *  baisse : à spin nul, `maxSpeed × (1 + toupieFolle)`. Valeur neutre
 *  (`toupieFolle = 0`) traverse le calcul sans branche : `maxSpeed × (1 + 0 ×
 *  lost)` vaut `maxSpeed` au bit près, quel que soit `lost`. */
function effectiveMaxSpeed(top: Top): number {
  const lost = top.spinMax > 0 ? 1 - Math.max(0, Math.min(1, top.spin / top.spinMax)) : 1;
  return top.maxSpeed * (1 + top.talents.toupieFolle * lost);
}

export function applySteering(top: Top, steer: Vec | null, zone: ZoneMods): void {
  const max = effectiveMaxSpeed(top) * zone.speedMult;
  // Plafond de CE tick, lu AVANT que le pilotage n'ait rien ajouté : l'ordinaire,
  // ou la surcharge déjà présente — donc héritée d'un choc — amortie. Seul un choc
  // peut lever le plafond ; le doigt du joueur, jamais.
  //
  // Amortir après coup toute vitesse supérieure au plafond laisserait au contraire
  // le pilotage lui-même dépasser : chaque tick ajoute accel × TICK_S et n'en
  // retire que 10 %. Point fixe v = 0,9 × (v + 90) = 810 px/s — trois fois et
  // demie la vitesse de Pointe du joueur, rien qu'en tenant son doigt, et la
  // Pointe cesserait d'être une stat.
  const ceiling = Math.max(max, Math.hypot(top.vel.x, top.vel.y) * ARENA.overspeedDamping);

  if (steer) {
    const len = Math.hypot(steer.x, steer.y) || 1;
    const accel = top.accel * zone.accelMult;
    top.vel.x += (steer.x / len) * accel * TICK_S;
    top.vel.y += (steer.y / len) * accel * TICK_S;
  } else {
    // Une zone ne peut que rendre plus glissant : à friction de zone neutre (0),
    // le `max` laisse celle du talent intacte.
    const friction = Math.max(top.talents.friction, zone.friction);
    top.vel.x *= friction;
    top.vel.y *= friction;
  }

  const speed = Math.hypot(top.vel.x, top.vel.y);
  if (speed > ceiling) {
    // Tronquer au plafond ORDINAIRE annulait le recul d'une collision avant que
    // `moveAndBounce` ne l'ait parcouru d'un seul pixel — la répulsion n'existait
    // tout simplement pas.
    const k = ceiling / speed;
    top.vel.x *= k;
    top.vel.y *= k;
  }
}

/**
 * Avance la toupie d'un tick et la garde dans l'anneau. Retourne `true` si elle
 * vient d'être **éjectée** — franchissement du bord, dans un secteur de brèche,
 * à une vitesse sortante suffisante. L'appelant met alors son spin à zéro : pour
 * la simulation, une éjection est une mort comme une autre.
 *
 * Note au passage l'origine du trajet dans `from`, dont les collisions se
 * servent pour chercher le contact sur tout le segment parcouru. Un rebond de
 * bord fait de ce trajet une ligne brisée que le segment `from` → `pos`
 * approxime : la corde d'un rebond est toujours plus courte que le trajet réel,
 * l'approximation resserre donc la détection au lieu de la relâcher.
 */
export function moveAndBounce(top: Top, layout: ArenaLayout): boolean {
  top.from.x = top.pos.x;
  top.from.y = top.pos.y;
  top.pos.x += top.vel.x * TICK_S;
  top.pos.y += top.vel.y * TICK_S;
  const d = Math.hypot(top.pos.x, top.pos.y);
  const limit = ARENA_RADIUS - top.radius;
  if (d <= limit || d === 0) return false;
  const nx = top.pos.x / d;
  const ny = top.pos.y / d;
  const out = top.vel.x * nx + top.vel.y * ny;
  top.pos.x = nx * limit;
  top.pos.y = ny * limit;
  if (out >= ARENA.breach.ejectSpeed && inBreach(layout, Math.atan2(ny, nx))) {
    // Arrêtée net : le sursis de Second souffle ressusciterait sinon le joueur au
    // bord, toujours sortant, pour le faire éjecter au tick suivant.
    top.vel.x = 0;
    top.vel.y = 0;
    return true;
  }
  if (out > 0) {
    top.vel.x -= (1 + WALL_RESTITUTION) * out * nx;
    top.vel.y -= (1 + WALL_RESTITUTION) * out * ny;
  }
  return false;
}

/**
 * Repousse une toupie à l'intérieur de l'anneau sans toucher à sa vitesse.
 * Appelé après les collisions, qui déplacent les positions sans les re-borner.
 */
export function clampToArena(top: Top): void {
  const d = Math.hypot(top.pos.x, top.pos.y);
  const limit = ARENA_RADIUS - top.radius;
  if (d <= limit || d === 0) return;
  const k = limit / d;
  top.pos.x *= k;
  top.pos.y *= k;
}
