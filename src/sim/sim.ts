import { BOT_AI, PLAYER_BASE, PLAYER_SPAWN, SALLES_PER_CHAPTER } from './config';
import { salleReward, playerStats } from './economy';
import { decaySpin, resolveCollision } from './combat';
import { applySteering, clampToArena, moveAndBounce } from './physics';
import { nextRandom } from './rng';
import { spawnSalle } from './salle';
import { resolveTalents } from './talents';
import { toupieById, type ToupieId } from '../content/toupies';
import type { Input, MetaState, RunReward, RunState, Top } from './types';

function makePlayer(meta: MetaState, toupie: ToupieId): Top {
  const stats = playerStats(meta, toupie);
  const talents = resolveTalents(meta);
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
  run.rngState = spawned.rngState;
  run.player.pos = { x: PLAYER_SPAWN.x, y: PLAYER_SPAWN.y };
  run.player.vel = { x: 0, y: 0 };
  run.player.decayPauseTicks = 0;
}

export function createRun(meta: MetaState, seed: number): RunState {
  const toupie = meta.toupies.active;
  const run: RunState = {
    tick: 0,
    rngState: seed >>> 0 || 1,
    chapter: 1,
    salle: 1,
    toupie,
    player: makePlayer(meta, toupie),
    bots: [],
    phase: 'fighting',
    secondSouffleUsed: false,
  };
  startSalle(run);
  return run;
}

export function resetRun(run: RunState, meta: MetaState): void {
  run.salle = 1;
  run.phase = 'fighting';
  run.secondSouffleUsed = false;
  run.toupie = meta.toupies.active;
  run.player = makePlayer(meta, run.toupie);
  startSalle(run);
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

/**
 * Le châssis en attente monte sur la toupie. Une descente des dix salles = un
 * run : c'est ici, et nulle part ailleurs, que le choix prend effet — à la mort
 * (`resetRun`) et au tour de chapitre bouclé. `tick` ne peut pas s'en charger,
 * le méta étant hors de sa portée.
 *
 * Ne soigne pas : `syncRunStats` borne le spin vers le bas seulement, donc
 * troquer un châssis contre un plus endurant au passage du boss ne rend rien.
 */
export function equipPendingToupie(run: RunState, meta: MetaState): void {
  if (run.toupie === meta.toupies.active) return;
  run.toupie = meta.toupies.active;
  syncRunStats(run, meta);
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

/** Retourne la récompense de la salle qui vient d'être vidée, `null` sinon.
 *  N'applique rien : le méta est hors de portée de la simulation de combat. */
export function tick(run: RunState, input: Input): RunReward | null {
  run.tick++;
  if (run.phase !== 'fighting') return null;
  if (run.tick % BOT_AI.retargetEveryTicks === 1) refreshBotAims(run);
  applySteering(run.player, input.steer);
  for (const bot of run.bots) applySteering(bot, bot.aim);
  moveAndBounce(run.player);
  for (const bot of run.bots) moveAndBounce(bot);
  for (const bot of run.bots) resolveCollision(run.player, bot);
  for (let i = 0; i < run.bots.length; i++) {
    for (let j = i + 1; j < run.bots.length; j++) {
      resolveCollision(run.bots[i], run.bots[j]);
    }
  }
  clampToArena(run.player);
  for (const bot of run.bots) clampToArena(bot);
  decaySpin(run.player);
  for (const bot of run.bots) decaySpin(bot);
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
