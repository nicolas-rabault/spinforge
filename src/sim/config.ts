import raw from '../content/balance.json';
import type { TopType } from '../content/toupies';
import type { ProfileAxis } from './profile';

/** Emplacement d'une pièce. Répété ici plutôt qu'importé de `piece.ts` : ce
 *  fichier est la racine des dépendances de la simulation, il n'importe rien d'elle. */
export type SlotName = 'lame' | 'disque' | 'pointe' | 'noyau';

export interface RankOdds { rank: number; p: number }

export interface ChestDef {
  currency: 'credits' | 'gems';
  price: number;
  price10: number;
  slots: SlotName[];
  ranks: RankOdds[];
  /** 0 = ce coffre n'a pas de pity. */
  pityThreshold: number;
  pityRank: number;
}

export interface FusionRule {
  /** Dernier rang de départ couvert par la règle. 0 = « tous les rangs au-delà ». */
  throughRank: number;
  identical: number;
  sacrifice: number;
}

export interface Balance {
  version: number;
  tickSeconds: number;
  arena: { radius: number; friction: number; wallRestitution: number; restitution: number };
  combat: { damageK: number; chargeBonus: number; healBetweenSalles: number };
  types: { dominantBonus: number; equilibreBonus: number };
  chapter: { sallesPerChapter: number; botsPerSalle: number[] };
  /** Type des bots, par chapitre puis par salle. Un chapitre absent retombe
   *  sur le chapitre 1 — les chapitres 2 à 8 arrivent aux jalons 3 et 4. */
  botTypes: Record<string, TopType[]>;
  player: {
    spawn: { x: number; y: number };
    base: { accel: number; maxSpeed: number; radius: number; spinMax: number; spinDecay: number; attack: number; defense: number };
  };
  bot: {
    base: { accel: number; maxSpeed: number; radius: number; spinMax: number; spinDecay: number; attack: number; defense: number };
    scaling: { spinPerSalle: number; attackPerSalle: number };
    spawnRing: number;
    ai: { retargetEveryTicks: number; aimJitter: number };
  };
  boss: { spinMult: number; attackMult: number; radius: number };
  econ: {
    upgradeBase: number; upgradeGrowth: number;
    rewardBase: number; rewardGrowth: number; bossRewardMult: number;
    bossGems: number;
  };
  toupieShop: { priceGems: number };
  pieceEffect: { lameAttack: number; disqueDefense: number; pointeSpeed: number; pointeDecay: number; noyauSpin: number };
  chassis: Record<string, Partial<Record<ProfileAxis, number>>>;
  models: Record<string, Partial<Record<ProfileAxis, number>>>;
  rarity: { step: number; legendRank: number };
  talents: {
    estoc: { rank: number; speedThreshold: number; damageBonus: number };
    riposte: { rank: number; reflect: number };
    percee: { rank: number; defenseIgnore: number };
    ancrage: { rank: number; impulseTaken: number };
    frolement: { rank: number; speedThreshold: number };
    masse: { rank: number; mass: number };
    glisse: { rank: number; friction: number };
    relance: { rank: number; ticks: number };
    toupieFolle: { rank: number; maxSpeedAtZero: number };
    reserve: { rank: number; heal: number };
    secondSouffle: { rank: number; revive: number };
    coeurGyre: { rank: number; decayMult: number };
  };
  fusion: FusionRule[];
  chests: Record<string, ChestDef>;
}

/** Double assertion délibérée. TypeScript infère du JSON des types élargis
 *  (`string[]` pour `slots`, `number` pour tout littéral), qui ne sont pas
 *  assignables aux unions de `Balance` sans passer par `unknown`. La sûreté
 *  réelle vient de `config.test.ts`, qui valide la forme à l'exécution. */
export const BALANCE = raw as unknown as Balance;

export const TICK_S = BALANCE.tickSeconds;
export const ARENA_RADIUS = BALANCE.arena.radius;
export const FRICTION = BALANCE.arena.friction;
export const WALL_RESTITUTION = BALANCE.arena.wallRestitution;
export const RESTITUTION = BALANCE.arena.restitution;
export const DAMAGE_K = BALANCE.combat.damageK;
/**
 * Part des dégâts qui dépend de qui a foncé. À 0, la vitesse relative d'impact est
 * partagée à parts égales et charger ne rapporte rien de plus qu'attendre le choc ;
 * à 0,6, celui qui provoque tout le rapprochement inflige ×1,6 et encaisse ×0,4.
 * Un choc frontal (les deux avancent autant) reste exactement ce qu'il était.
 */
export const CHARGE_BONUS = BALANCE.combat.chargeBonus;
export const HEAL_BETWEEN_SALLES = BALANCE.combat.healBetweenSalles;
export const TYPES = BALANCE.types;
export const SALLES_PER_CHAPTER = BALANCE.chapter.sallesPerChapter;
export const BOTS_PER_SALLE = BALANCE.chapter.botsPerSalle;
export const BOT_TYPES = BALANCE.botTypes;
export const PLAYER_SPAWN = BALANCE.player.spawn;
export const PLAYER_BASE = BALANCE.player.base;
export const BOT_BASE = BALANCE.bot.base;
export const BOT_SCALING = BALANCE.bot.scaling;
export const BOT_SPAWN_RING = BALANCE.bot.spawnRing;
export const BOT_AI = BALANCE.bot.ai;
export const BOSS = BALANCE.boss;
export const ECON = BALANCE.econ;
export const TOUPIE_SHOP = BALANCE.toupieShop;
export const PIECE_EFFECT = BALANCE.pieceEffect;
export const CHASSIS = BALANCE.chassis;
export const MODELS_PROFILE = BALANCE.models;
export const RARITY = BALANCE.rarity;
export const TALENTS = BALANCE.talents;
export const FUSION = BALANCE.fusion;
export const CHESTS = BALANCE.chests;
