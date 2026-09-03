import { ARENA, BOT_AI, MAX_CHAPTER, PLAYER_BASE, PLAYER_SPAWN, SALLES_PER_CHAPTER } from './config';
import { salleReward, playerStats } from './economy';
import { decaySpin, resolveCollision } from './combat';
import { applySteering, clampToArena, moveAndBounce } from './physics';
import { nextRandom } from './rng';
import { spawnSalle } from './salle';
import { bouncePillars, buildLayout, takeShard, updatePillars, updateShard, zoneModsAt } from './terrain';
import { resolveTalents } from './talents';
import { toupieById, type ToupieId } from '../content/toupies';
import type { Input, MetaState, RunReward, RunState, Top, Vec } from './types';

function makePlayer(meta: MetaState, toupie: ToupieId): Top {
  const stats = playerStats(meta, toupie);
  const talents = resolveTalents(meta);
  return {
    id: 'player',
    isPlayer: true,
    aim: null,
    pos: { x: PLAYER_SPAWN.x, y: PLAYER_SPAWN.y },
    from: { x: PLAYER_SPAWN.x, y: PLAYER_SPAWN.y },
    vel: { x: 0, y: 0 },
    radius: PLAYER_BASE.radius,
    spin: stats.spinMax,
    spinMax: stats.spinMax,
    spinDecay: stats.spinDecay,
    attack: stats.attack,
    defense: stats.defense,
    maxSpeed: stats.maxSpeed,
    accel: stats.accel,
    talents,
    decayPauseTicks: 0,
    type: toupieById(toupie).type,
    mass: stats.mass * talents.mass,
  };
}

function startSalle(run: RunState): void {
  const spawned = spawnSalle(run.chapter, run.salle, run.rngState);
  run.bots = spawned.bots;
  // Bots d'abord, terrain ensuite : l'ordre de consommation du flux fait partie
  // du contrat de déterminisme.
  const built = buildLayout(run.chapter, run.salle, spawned.rngState);
  run.arena = built.layout;
  run.rngState = built.rngState;
  run.player.pos = { x: PLAYER_SPAWN.x, y: PLAYER_SPAWN.y };
  run.player.vel = { x: 0, y: 0 };
  run.player.decayPauseTicks = 0;
}

/** Le plus haut chapitre que le joueur peut choisir : celui qu'il vient de
 *  débloquer, jamais au-delà du contenu qui existe. */
export function maxPlayableChapter(meta: MetaState): number {
  return Math.min(meta.bestChapter + 1, MAX_CHAPTER);
}

/**
 * Ouvre une descente. Porte unique du cycle de vie d'un run : elle remplace
 * `createRun`, `resetRun` et `equipPendingToupie`.
 *
 * Le châssis est lu **ici, une fois**. Aucun autre chemin de code du run ne
 * relit `meta.toupies.active` — c'est ce qui rend le verrou du châssis
 * structurel plutôt que conventionnel : il n'y a plus d'appel à oublier. Les
 * pièces, elles, continuent de prendre effet dans la seconde par `syncRunStats`.
 *
 * Le chapitre est borné ici pour la même raison : une règle que seul l'appelant
 * respecte est une règle qu'un appelant peut oublier. `Math.trunc` fait partie de
 * la borne : `chapterOf` indexe un tableau, et un chapitre fractionnaire y trouve
 * `undefined` — la simulation se défend seule, sans compter sur la couche de
 * sauvegarde pour lui livrer un entier.
 */
export function startRun(meta: MetaState, chapter: number, seed: number): RunState {
  const toupie = meta.toupies.active;
  const run: RunState = {
    tick: 0,
    rngState: seed >>> 0 || 1,
    chapter: Math.min(Math.max(1, Math.trunc(chapter)), maxPlayableChapter(meta)),
    salle: 1,
    toupie,
    player: makePlayer(meta, toupie),
    bots: [],
    // Remplacé par startSalle juste après ; l'initialiser vide évite un état
    // partiellement construit que le typage refuserait.
    arena: { zones: [], breaches: [], shard: null, shardTimer: 0, wallRestitution: ARENA.wallRestitution, pillars: [] },
    phase: 'fighting',
    secondSouffleUsed: false,
    ejected: [],
  };
  startSalle(run);
  return run;
}

/**
 * Recopie l'équipement du méta vers le joueur du run **en cours**.
 *
 * Sans cela, améliorer une pièce ne changerait plus rien avant le run suivant —
 * une régression sur le jalon 1, où l'amélioration prenait effet dans la seconde.
 * Le spin est **borné vers le bas, jamais soigné** : sinon améliorer son Noyau
 * à 3 % de spin serait un soin gratuit.
 *
 * Le châssis, lui, vient de `run.toupie` et **jamais** de `meta.toupies.active` :
 * les pièces prennent effet dans la seconde, le châssis reste celui de la
 * descente. Sans cette asymétrie on change de type à chaque salle pour être
 * toujours du bon côté du triangle, et la contre-pioche cesse d'être un choix.
 */
export function syncRunStats(run: RunState, meta: MetaState): void {
  const stats = playerStats(meta, run.toupie);
  const talents = resolveTalents(meta);
  run.player.attack = stats.attack;
  run.player.defense = stats.defense;
  run.player.maxSpeed = stats.maxSpeed;
  run.player.spinMax = stats.spinMax;
  run.player.spinDecay = stats.spinDecay;
  run.player.spin = Math.min(run.player.spin, stats.spinMax);
  run.player.talents = talents;
  run.player.type = toupieById(run.toupie).type;
  run.player.accel = stats.accel;
  run.player.mass = stats.mass * talents.mass;
}

function refreshBotAims(run: RunState): void {
  const shard = run.arena.shard;
  for (const bot of run.bots) {
    const r = nextRandom(run.rngState);
    run.rngState = r.state;
    const jitter = (r.value - 0.5) * BOT_AI.aimJitter;
    // Le bot détourne vers l'éclat quand il en est plus près que du joueur. Deux
    // effets, tous deux voulus : la course devient réelle, et un bot parti le
    // chercher laisse au joueur une fenêtre — qu'il peut lui refuser en le
    // percutant. Le tirage reste à un par bot : le flux ne bouge pas.
    let target: Vec = run.player.pos;
    if (shard) {
      const toShard = Math.hypot(shard.x - bot.pos.x, shard.y - bot.pos.y);
      const toPlayer = Math.hypot(run.player.pos.x - bot.pos.x, run.player.pos.y - bot.pos.y);
      if (toShard < toPlayer) target = shard;
    }
    const angle = Math.atan2(target.y - bot.pos.y, target.x - bot.pos.x) + jitter;
    bot.aim = { x: Math.cos(angle), y: Math.sin(angle) };
  }
}

/** Avance une toupie et encaisse l'éjection s'il y a lieu. */
function moveTop(run: RunState, top: Top): void {
  if (!moveAndBounce(top, run.arena)) return;
  top.spin = 0;
  run.ejected.push(top.id);
}

/** Retourne la récompense de la salle qui vient d'être vidée, `null` sinon.
 *  N'applique rien : le méta est hors de portée de la simulation de combat. */
export function tick(run: RunState, input: Input): RunReward | null {
  run.tick++;
  if (run.phase !== 'fighting') return null;
  run.ejected = [];
  // Les piliers avancent AVANT les toupies : une toupie est ainsi repoussée par
  // la position que le pilier occupe à la fin du tick, celle que le joueur voit.
  updatePillars(run.arena);
  if (run.tick % BOT_AI.retargetEveryTicks === 1) refreshBotAims(run);
  // Le terrain est lu UNE fois par toupie et par tick, avant le pilotage, et la
  // même valeur sert au pilotage et à la décroissance : une toupie qui traverse
  // une zone pendant un tick est traitée selon sa position de départ. Cohérent,
  // borné, et sans deux lectures divergentes dans le même tick.
  const playerZone = zoneModsAt(run.arena, run.player.pos);
  const botZones = run.bots.map((bot) => zoneModsAt(run.arena, bot.pos));
  applySteering(run.player, input.steer, playerZone);
  run.bots.forEach((bot, i) => applySteering(bot, bot.aim, botZones[i]));
  moveTop(run, run.player);
  for (const bot of run.bots) moveTop(run, bot);
  // Après le déplacement — donc après l'éjection, qui ne se décide qu'en un
  // seul endroit — et avant les collisions entre toupies. Un pilier qui pousse
  // vers une brèche éjecte au tick SUIVANT, quand `moveAndBounce` verra la
  // vitesse sortante : c'est déjà ainsi qu'une toupie poussée par une autre est
  // éjectée, et ça évite un second site d'éjection.
  bouncePillars(run.arena, run.player);
  for (const bot of run.bots) bouncePillars(run.arena, bot);
  for (const bot of run.bots) resolveCollision(run.player, bot);
  for (let i = 0; i < run.bots.length; i++) {
    for (let j = i + 1; j < run.bots.length; j++) {
      resolveCollision(run.bots[i], run.bots[j]);
    }
  }
  clampToArena(run.player);
  for (const bot of run.bots) clampToArena(bot);
  run.rngState = updateShard(run.arena, run.rngState);
  // Id du preneur ignoré ici : aucun appelant de production n'en a besoin,
  // l'effet de bord (gain de spin) suffit. Non retiré : terrain.test.ts teste
  // l'identité du preneur sur cette valeur de retour, et une version `void`
  // forcerait ces tests à déduire le preneur par effet de bord — plus faible
  // que l'assertion directe actuelle. Même précédent que `applyReward` en
  // dette du jalon 2a.
  takeShard(run.arena, [run.player, ...run.bots]);
  decaySpin(run.player, playerZone);
  // `run.bots` n'est filtré qu'après : les index restent alignés sur `botZones`.
  run.bots.forEach((bot, i) => decaySpin(bot, botZones[i]));
  run.bots = run.bots.filter((b) => b.spin > 0);
  if (run.player.spin <= 0) {
    // Second souffle : un sursis par run, sinon la mort.
    if (!run.secondSouffleUsed && run.player.talents.secondSouffle > 0) {
      run.secondSouffleUsed = true;
      run.player.spin = run.player.spinMax * run.player.talents.secondSouffle;
    } else {
      run.phase = 'dead';
      return null;
    }
  }
  if (run.bots.length === 0) {
    const boss = run.salle === SALLES_PER_CHAPTER;
    const rolled = salleReward(run.chapter, run.salle, boss, run.rngState);
    run.rngState = rolled.rngState;
    // Le boss vaincu ferme la descente : ni salle suivante, ni retour en salle 1.
    // C'est la frontière de run que le verrou du châssis et le farm réclament ;
    // la garde d'entrée de `tick` fait le reste.
    if (boss) {
      run.phase = 'won';
      return rolled.reward;
    }
    run.salle++;
    run.player.spin = Math.min(
      run.player.spinMax,
      run.player.spin + run.player.talents.healBetweenSalles * run.player.spinMax,
    );
    startSalle(run);
    return rolled.reward;
  }
  return null;
}
