import { FRICTION } from './config';

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
  spinDecayMult: 1,
});
