import { BOT_AI, PLAYER_BASE, PLAYER_SPAWN, SALLES_PER_CHAPTER } from './config';
import { salleReward, playerStats } from './economy';
import { decaySpin, resolveCollision } from './combat';
import { applySteering, clampToArena, moveAndBounce } from './physics';
import { nextRandom } from './rng';
import { spawnSalle } from './salle';
import { buildLayout, zoneModsAt } from './terrain';
import { resolveTalents } from './talents';
import type { Input, MetaState, RunReward, RunState, Top } from './types';

function makePlayer(meta: MetaState): Top {
  const stats = playerStats(meta);
  return {
    id: 'player',
    isPlayer: true,
    aim: null,
    pos: { x: PLAYER_SPAWN.x, y: PLAYER_SPAWN.y },
    vel: { x: 0, y: 0 },
    radius: PLAYER_BASE.radius,
    spin: stats.spinMax,
    spinMax: stats.spinMax,
    spinDecay: stats.spinDecay,
    attack: stats.attack,
    defense: stats.defense,
    maxSpeed: stats.maxSpeed,
    accel: PLAYER_BASE.accel,
    talents: resolveTalents(meta),
    decayPauseTicks: 0,
  };
}

function startSalle(run: RunState): void {
  const spawned = spawnSalle(run.salle, run.rngState);
  run.bots = spawned.bots;
  // Bots d'abord, terrain ensuite : l'ordre de consommation du flux fait partie
  // du contrat de déterminisme.
  const built = buildLayout(run.salle, spawned.rngState);
  run.arena = built.layout;
  run.rngState = built.rngState;
  run.player.pos = { x: PLAYER_SPAWN.x, y: PLAYER_SPAWN.y };
  run.player.vel = { x: 0, y: 0 };
  run.player.decayPauseTicks = 0;
}

export function createRun(meta: MetaState, seed: number): RunState {
  const run: RunState = {
    tick: 0,
    rngState: seed >>> 0 || 1,
    chapter: 1,
    salle: 1,
    player: makePlayer(meta),
    bots: [],
    // Remplacé par startSalle juste après ; l'initialiser vide évite un état
    // partiellement construit que le typage refuserait.
    arena: { zones: [], breaches: [], shard: null, shardTimer: 0 },
    phase: 'fighting',
    secondSouffleUsed: false,
    ejected: [],
  };
  startSalle(run);
  return run;
}

export function resetRun(run: RunState, meta: MetaState): void {
  run.salle = 1;
  run.phase = 'fighting';
  run.secondSouffleUsed = false;
  run.ejected = [];
  run.player = makePlayer(meta);
  startSalle(run);
}

/**
 * Recopie l'équipement du méta vers le joueur du run **en cours**.
 *
 * Sans cela, améliorer une pièce ne changerait plus rien avant le run suivant —
 * une régression sur le jalon 1, où l'amélioration prenait effet dans la seconde.
 * Le spin est **borné vers le bas, jamais soigné** : sinon améliorer son Noyau
 * à 3 % de spin serait un soin gratuit.
 */
export function syncRunStats(run: RunState, meta: MetaState): void {
  const stats = playerStats(meta);
  run.player.attack = stats.attack;
  run.player.defense = stats.defense;
  run.player.maxSpeed = stats.maxSpeed;
  run.player.spinMax = stats.spinMax;
  run.player.spinDecay = stats.spinDecay;
  run.player.spin = Math.min(run.player.spin, stats.spinMax);
  run.player.talents = resolveTalents(meta);
}

function refreshBotAims(run: RunState): void {
  for (const bot of run.bots) {
    const r = nextRandom(run.rngState);
    run.rngState = r.state;
    const jitter = (r.value - 0.5) * BOT_AI.aimJitter;
    const angle = Math.atan2(run.player.pos.y - bot.pos.y, run.player.pos.x - bot.pos.x) + jitter;
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
  for (const bot of run.bots) resolveCollision(run.player, bot);
  for (let i = 0; i < run.bots.length; i++) {
    for (let j = i + 1; j < run.bots.length; j++) {
      resolveCollision(run.bots[i], run.bots[j]);
    }
  }
  clampToArena(run.player);
  for (const bot of run.bots) clampToArena(bot);
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
    const reward = salleReward(run.salle, boss);
    if (boss) run.salle = 1;
    else run.salle++;
    run.player.spin = Math.min(
      run.player.spinMax,
      run.player.spin + run.player.talents.healBetweenSalles * run.player.spinMax,
    );
    startSalle(run);
    return reward;
  }
  return null;
}
