export const TICK_S = 0.1;
export const ARENA_RADIUS = 150;
export const SALLES_PER_CHAPTER = 10;
export const FRICTION = 0.94;
export const WALL_RESTITUTION = 0.8;
export const RESTITUTION = 0.8;
export const DAMAGE_K = 0.35;
/**
 * Part des dégâts qui dépend de qui a foncé. À 0, la vitesse relative d'impact est
 * partagée à parts égales et charger ne rapporte rien de plus qu'attendre le choc ;
 * à 0,6, celui qui provoque tout le rapprochement inflige ×1,6 et encaisse ×0,4.
 * Un choc frontal (les deux avancent autant) reste exactement ce qu'il était.
 */
export const CHARGE_BONUS = 0.3;
export const HEAL_BETWEEN_SALLES = 0.2;

export const PLAYER_SPAWN = { x: 0, y: 80 };
export const BOT_AI = { retargetEveryTicks: 10, aimJitter: 1.2 };

export const PLAYER_BASE = { accel: 900, maxSpeed: 240, radius: 12, spinMax: 3000, spinDecay: 20, attack: 30, defense: 10 };
export const BOT_BASE = { accel: 500, maxSpeed: 140, radius: 12, spinMax: 1200, spinDecay: 12, attack: 18, defense: 6 };
export const BOT_SCALING = { spinPerSalle: 0.15, attackPerSalle: 0.08 };
export const BOSS = { spinMult: 4, attackMult: 1.5, radius: 18 };
export const BOT_SPAWN_RING = 0.6;
export const ECON = { upgradeBase: 100, upgradeGrowth: 1.08, rewardBase: 70, rewardGrowth: 1.13, bossRewardMult: 10 };
export const PIECE_EFFECT = { lameAttack: 0.1, disqueDefense: 0.1, pointeSpeed: 0.04, pointeDecay: 0.05, noyauSpin: 0.08 };
