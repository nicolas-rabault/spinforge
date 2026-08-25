import { BOT_AI, HEAL_BETWEEN_SALLES, PLAYER_BASE, PLAYER_SPAWN, SALLES_PER_CHAPTER } from './config';
import { salleReward, syncPlayerStats } from './economy';
import { decaySpin, resolveCollision } from './combat';
import { applySteering, clampToArena, moveAndBounce } from './physics';
import { nextRandom } from './rng';
import { spawnSalle } from './salle';
import type { Input, SimState, Top } from './types';

function makePlayer(): Top {
  return {
    id: 'player',
    isPlayer: true,
    aim: null,
    pos: { x: PLAYER_SPAWN.x, y: PLAYER_SPAWN.y },
    vel: { x: 0, y: 0 },
    radius: PLAYER_BASE.radius,
    spin: PLAYER_BASE.spinMax,
    spinMax: PLAYER_BASE.spinMax,
    spinDecay: PLAYER_BASE.spinDecay,
    attack: PLAYER_BASE.attack,
    defense: PLAYER_BASE.defense,
    maxSpeed: PLAYER_BASE.maxSpeed,
    accel: PLAYER_BASE.accel,
  };
}

function startSalle(state: SimState): void {
  const spawned = spawnSalle(state.salle, state.rngState);
  state.bots = spawned.bots;
  state.rngState = spawned.rngState;
  state.player.pos = { x: PLAYER_SPAWN.x, y: PLAYER_SPAWN.y };
  state.player.vel = { x: 0, y: 0 };
}

export function createInitialState(seed: number): SimState {
  const state: SimState = {
    tick: 0,
    rngState: seed >>> 0 || 1,
    chapter: 1,
    salle: 1,
    credits: 0,
    pieces: { noyau: 0, lame: 0, disque: 0, pointe: 0 },
    player: makePlayer(),
    bots: [],
    phase: 'fighting',
    chapterValidated: false,
  };
  syncPlayerStats(state);
  state.player.spin = state.player.spinMax;
  startSalle(state);
  return state;
}

export function resetRun(state: SimState): void {
  state.salle = 1;
  state.phase = 'fighting';
  syncPlayerStats(state);
  state.player.spin = state.player.spinMax;
  startSalle(state);
}

function refreshBotAims(state: SimState): void {
  for (const bot of state.bots) {
    const r = nextRandom(state.rngState);
    state.rngState = r.state;
    const jitter = (r.value - 0.5) * BOT_AI.aimJitter;
    const angle = Math.atan2(state.player.pos.y - bot.pos.y, state.player.pos.x - bot.pos.x) + jitter;
    bot.aim = { x: Math.cos(angle), y: Math.sin(angle) };
  }
}

export function tick(state: SimState, input: Input): void {
  state.tick++;
  if (state.phase !== 'fighting') return;
  if (state.tick % BOT_AI.retargetEveryTicks === 1) refreshBotAims(state);
  applySteering(state.player, input.steer);
  for (const bot of state.bots) applySteering(bot, bot.aim);
  moveAndBounce(state.player);
  for (const bot of state.bots) moveAndBounce(bot);
  for (const bot of state.bots) resolveCollision(state.player, bot);
  for (let i = 0; i < state.bots.length; i++) {
    for (let j = i + 1; j < state.bots.length; j++) {
      resolveCollision(state.bots[i], state.bots[j]);
    }
  }
  clampToArena(state.player);
  for (const bot of state.bots) clampToArena(bot);
  decaySpin(state.player);
  for (const bot of state.bots) decaySpin(bot);
  state.bots = state.bots.filter((b) => b.spin > 0);
  if (state.player.spin <= 0) {
    state.phase = 'dead';
    return;
  }
  if (state.bots.length === 0) {
    const boss = state.salle === SALLES_PER_CHAPTER;
    state.credits += salleReward(state.salle, boss);
    if (boss) {
      state.chapterValidated = true;
      state.salle = 1;
    } else {
      state.salle++;
    }
    state.player.spin = Math.min(state.player.spinMax, state.player.spin + HEAL_BETWEEN_SALLES * state.player.spinMax);
    startSalle(state);
  }
}
