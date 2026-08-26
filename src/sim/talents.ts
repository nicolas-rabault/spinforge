import { FRICTION, HEAL_BETWEEN_SALLES, TALENTS } from './config';
import type { Slot } from './piece';
import type { MetaState } from './types';

export type TalentId =
  | 'estoc' | 'riposte' | 'percee'
  | 'ancrage' | 'frolement' | 'masse'
  | 'glisse' | 'relance' | 'toupieFolle'
  | 'reserve' | 'secondSouffle' | 'coeurGyre';

/** Modificateurs appliqués à une toupie. Chaque champ a une valeur *neutre*,
 *  celle d'une toupie sans talent : le code de combat multiplie et compare
 *  sans jamais tester la présence d'un talent. */
export interface TalentMods {
  /** Vitesse d'impact au-delà de laquelle Estoc majore les dégâts. Infinity = jamais. */
  estocThreshold: number;
  estocBonus: number;
  /** Part des dégâts encaissés renvoyée à l'agresseur (Riposte). */
  riposte: number;
  /** Part de la défense adverse ignorée (Percée). */
  defenseIgnore: number;
  /** Facteur sur l'impulsion *reçue* (Ancrage). 1 = intacte. */
  impulseTaken: number;
  /** Vitesse d'impact en-deçà de laquelle aucun dégât n'est subi (Frôlement). 0 = jamais. */
  frolementThreshold: number;
  /** Masse dans le calcul d'impulsion (Masse). 1 = ordinaire. */
  mass: number;
  /** Friction au sol propre à cette toupie (Glisse). */
  friction: number;
  /** Ticks de suspension de la décroissance après un choc (Relance). 0 = aucune. */
  relanceTicks: number;
  /** Gain de vitesse maximale à spin nul (Toupie folle). 0 = aucun. */
  toupieFolle: number;
  /** Part de spin rendue entre deux salles (Réserve). */
  healBetweenSalles: number;
  /** Part de spin rendue au sursis (Second souffle). 0 = pas de sursis. */
  secondSouffle: number;
  /** Facteur sur la décroissance naturelle (Cœur Gyre). 1 = ordinaire. */
  spinDecayMult: number;
}

/** Partagé par tous les bots — figé pour qu'aucun effet ne puisse fuiter sur eux. */
export const NEUTRAL_TALENTS: TalentMods = Object.freeze({
  estocThreshold: Infinity,
  estocBonus: 0,
  riposte: 0,
  defenseIgnore: 0,
  impulseTaken: 1,
  frolementThreshold: 0,
  mass: 1,
  friction: FRICTION,
  relanceTicks: 0,
  toupieFolle: 0,
  healBetweenSalles: HEAL_BETWEEN_SALLES,
  secondSouffle: 0,
  spinDecayMult: 1,
});

/** Un talent par palier nommé — Excellent, Épique, Légende — et par emplacement.
 *  L'ordre suit les rangs croissants ; `talentsOf` s'appuie dessus. */
export const TALENTS_BY_SLOT: Record<Slot, TalentId[]> = {
  lame: ['estoc', 'riposte', 'percee'],
  disque: ['ancrage', 'frolement', 'masse'],
  pointe: ['glisse', 'relance', 'toupieFolle'],
  noyau: ['reserve', 'secondSouffle', 'coeurGyre'],
};

export function talentsOf(slot: Slot, rank: number): TalentId[] {
  return TALENTS_BY_SLOT[slot].filter((id) => rank >= TALENTS[id].rank);
}

/** Étiquette française de chaque talent — la Forge s'en sert pour afficher les
 *  talents actifs d'une pièce équipée : le rang seul ne dit rien du talent
 *  qu'il débloque, c'est pourtant sa vraie valeur (voir la spec, § 4.3). */
export const TALENT_LABELS: Record<TalentId, string> = {
  estoc: 'Estoc',
  riposte: 'Riposte',
  percee: 'Percée',
  ancrage: 'Ancrage',
  frolement: 'Frôlement',
  masse: 'Masse',
  glisse: 'Glisse',
  relance: 'Relance',
  toupieFolle: 'Toupie folle',
  reserve: 'Réserve',
  secondSouffle: 'Second souffle',
  coeurGyre: 'Cœur Gyre',
};

/** Réduit l'équipement du méta à un jeu de modificateurs. Appelé à la création
 *  d'un run et à chaque changement d'équipement, jamais pendant un tick. */
export function resolveTalents(meta: MetaState): TalentMods {
  const mods: TalentMods = { ...NEUTRAL_TALENTS };
  for (const slot of ['lame', 'disque', 'pointe', 'noyau'] as Slot[]) {
    for (const id of talentsOf(slot, meta.equipped[slot].rank)) {
      switch (id) {
        case 'estoc':
          mods.estocThreshold = TALENTS.estoc.speedThreshold;
          mods.estocBonus = TALENTS.estoc.damageBonus;
          break;
        case 'riposte': mods.riposte = TALENTS.riposte.reflect; break;
        case 'percee': mods.defenseIgnore = TALENTS.percee.defenseIgnore; break;
        case 'ancrage': mods.impulseTaken = TALENTS.ancrage.impulseTaken; break;
        case 'frolement': mods.frolementThreshold = TALENTS.frolement.speedThreshold; break;
        case 'masse': mods.mass = TALENTS.masse.mass; break;
        case 'glisse': mods.friction = TALENTS.glisse.friction; break;
        case 'relance': mods.relanceTicks = TALENTS.relance.ticks; break;
        case 'toupieFolle': mods.toupieFolle = TALENTS.toupieFolle.maxSpeedAtZero; break;
        case 'reserve': mods.healBetweenSalles = TALENTS.reserve.heal; break;
        case 'secondSouffle': mods.secondSouffle = TALENTS.secondSouffle.revive; break;
        case 'coeurGyre': mods.spinDecayMult = TALENTS.coeurGyre.decayMult; break;
      }
    }
  }
  return mods;
}
