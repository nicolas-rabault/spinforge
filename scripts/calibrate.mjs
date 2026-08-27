// Autopilote de calibration. Conservé volontairement : le jalon 3 en redemandera.
// La simulation étant pure et sans DOM, aucun navigateur n'est nécessaire.
import { createRun, syncRunStats, tick } from '../src/sim/sim.ts';
import { applyRunReward, createInitialMeta } from '../src/sim/meta.ts';
import { tryUpgrade, upgradeCost } from '../src/sim/economy.ts';
import { canOpen, grantChest, openChest } from '../src/sim/chest.ts';
import { addPiece } from '../src/sim/meta.ts';
import { ARENA_RADIUS, TICK_S, SALLES_PER_CHAPTER } from '../src/sim/config.ts';

const SEEDS = [1, 7, 42, 1337, 90210];
const MAX_TICKS = 60 * 60 * 20 / TICK_S; // garde-fou : 20 h de jeu simulé
// Ordre fixe, jamais celui d'un `Object.keys` : la file de butin doit se vider
// pareil à chaque exécution du même seed, même si ce script n'est pas couvert
// par le test de déterminisme de la simulation.
const CHEST_KINDS = ['bronze', 'arene', 'mythique'];

/** Brèche dont le centre est angulairement le plus proche de ce point. Retourne
 *  `null` avant la salle où les brèches apparaissent. */
function nearestBreach(arena, pos) {
  const angle = Math.atan2(pos.y, pos.x);
  let best = null;
  let bestGap = Infinity;
  for (const breach of arena.breaches) {
    // Écart signé replié dans [-π, π], comme `inBreach` : sans ce repli, 6,2 rad
    // et 0,05 rad — le même endroit à 2π près — sembleraient opposés.
    const raw = angle - breach.angle;
    const gap = Math.abs(Math.atan2(Math.sin(raw), Math.cos(raw)));
    if (gap < bestGap) { bestGap = gap; best = breach; }
  }
  return best;
}

/** Politique « terrain » : pousser la cible vers la brèche la plus proche d'elle,
 *  et couper vers l'éclat quand on en est le plus près. Sans elle, l'autopilote
 *  mesurerait un jeu que personne ne joue. */
function steerWithTerrain(run) {
  const me = run.player.pos;
  const shard = run.arena.shard;
  if (shard) {
    const mine = Math.hypot(shard.x - me.x, shard.y - me.y);
    const contested = run.bots.some((b) => Math.hypot(shard.x - b.pos.x, shard.y - b.pos.y) < mine);
    if (!contested) return { x: shard.x - me.x, y: shard.y - me.y };
  }
  let target = null;
  let best = Infinity;
  for (const bot of run.bots) {
    const d = Math.hypot(bot.pos.x - me.x, bot.pos.y - me.y);
    if (d < best) { best = d; target = bot; }
  }
  if (!target) return null;
  const breach = nearestBreach(run.arena, target.pos);
  if (!breach) return { x: target.pos.x - me.x, y: target.pos.y - me.y };
  // Se placer sur la ligne brèche → cible, du côté opposé à la brèche, pour que
  // le choc pousse la cible dehors.
  const bx = Math.cos(breach.angle) * ARENA_RADIUS;
  const by = Math.sin(breach.angle) * ARENA_RADIUS;
  const dx = target.pos.x - bx;
  const dy = target.pos.y - by;
  const len = Math.hypot(dx, dy) || 1;
  const spot = { x: target.pos.x + (dx / len) * 26, y: target.pos.y + (dy / len) * 26 };
  const toSpot = Math.hypot(spot.x - me.x, spot.y - me.y);
  return toSpot > 18
    ? { x: spot.x - me.x, y: spot.y - me.y }
    : { x: target.pos.x - me.x, y: target.pos.y - me.y };
}

/** Vide la file de butin (Task 10), comme un joueur qui ouvre ses coffres au fur
 *  et à mesure. Retourne vrai si au moins un coffre en a été tiré. */
function openLoot(meta) {
  let opened = false;
  for (const kind of CHEST_KINDS) {
    while (meta.pending[kind] > 0) {
      for (const piece of grantChest(meta, kind)) addPiece(meta, piece);
      opened = true;
    }
  }
  return opened;
}

/** Achats : un coffre Bronze par salle vidée quand il est abordable, puis
 *  l'emplacement le moins cher tant qu'il reste des crédits. Un joueur réel
 *  arbitre entre les deux ; ce partage est le plus simple qui mesure les deux.
 *  Retourne vrai si un coffre vient d'être acheté et ouvert — une source parmi
 *  deux : `openLoot` draine la file de butin séparément, avant cet appel. */
function spend(meta, { buyChests }) {
  const opened = buyChests && canOpen(meta, 'bronze', 1);
  if (opened) {
    for (const piece of openChest(meta, 'bronze', 1)) addPiece(meta, piece);
  }
  const slots = ['lame', 'disque', 'pointe', 'noyau'];
  for (;;) {
    let cheapest = null;
    let cost = Infinity;
    for (const slot of slots) {
      const c = upgradeCost(meta.equipped[slot].level);
      if (c < cost) { cost = c; cheapest = slot; }
    }
    if (meta.credits < cost) return opened;
    tryUpgrade(meta, cheapest);
  }
}

function simulate(seed, { buyChests, steer }) {
  const meta = createInitialMeta(seed);
  let run = createRun(meta, seed);
  let ticks = 0;
  let runs = 1;
  let salleTicks = 0;
  let ticksToValidate = null;
  let runsToValidate = null;
  let ticksToFirstChest = null;
  const deathsBySalle = new Map();
  const salleDurations = new Map();

  while (ticks < MAX_TICKS && ticksToValidate === null) {
    const salleBefore = run.salle;
    const reward = tick(run, { steer: steer(run) });
    ticks++;
    salleTicks++;
    if (reward) {
      applyRunReward(meta, reward, salleBefore);
      if (!salleDurations.has(salleBefore)) salleDurations.set(salleBefore, []);
      salleDurations.get(salleBefore).push(salleTicks);
      salleTicks = 0;
      // Le butin de salle (file `pending`) et l'achat sont deux sources de coffres
      // distinctes ; le premier coffre mesuré est celui qui arrive en premier,
      // peu importe laquelle des deux le fournit.
      const lootOpened = openLoot(meta);
      const purchaseOpened = spend(meta, { buyChests });
      if ((lootOpened || purchaseOpened) && ticksToFirstChest === null) ticksToFirstChest = ticks;
      // Sans ce recopiage, une amélioration achetée en cours de run ne prendrait
      // effet qu'au run suivant — l'autopilote sous-mesurerait la progression.
      syncRunStats(run, meta);
      if (meta.chapterValidated && ticksToValidate === null) {
        ticksToValidate = ticks;
        runsToValidate = runs;
      }
    }
    if (run.phase === 'dead') {
      deathsBySalle.set(run.salle, (deathsBySalle.get(run.salle) ?? 0) + 1);
      runs++;
      run = createRun(meta, seed + runs);
      salleTicks = 0;
    }
  }

  return {
    hoursToValidate: ticksToValidate === null ? null : (ticksToValidate * TICK_S) / 3600,
    hoursToFirstChest: ticksToFirstChest === null ? null : (ticksToFirstChest * TICK_S) / 3600,
    runs: runsToValidate,
    salleDurations,
    deathsBySalle,
  };
}

const median = (xs) => {
  const ok = xs.filter((x) => x !== null).sort((a, z) => a - z);
  return ok.length === 0 ? null : ok[ok.length >> 1];
};

const results = SEEDS.map((seed) => simulate(seed, { buyChests: true, steer: steerWithTerrain }));
// Garde-fou : ne jamais toucher l'écran doit rester très nettement plus lent.
const passive = SEEDS.map((seed) => simulate(seed, { buyChests: true, steer: () => null }));

const fmt = (x) => (x === null ? 'jamais' : x.toFixed(2));
const medianOf = (rs, key) => median(rs.map((r) => r[key]));

// Morts cumulées sur toutes les graines : sur une seule, le classement des salles
// tient à une poignée de runs et changerait de bouton en bouton sans rien dire.
const deaths = new Map();
for (const r of results) {
  for (const [salle, n] of r.deathsBySalle) deaths.set(salle, (deaths.get(salle) ?? 0) + n);
}
const deadliest = [...deaths.entries()].sort((a, b) => b[1] - a[1])[0] ?? null;

console.log('=== Calibration — %d graines ===', SEEDS.length);
console.log('Validation du chapitre 1 : médiane %s h', fmt(medianOf(results, 'hoursToValidate')));
console.log('Premier coffre ouvert    : médiane %s h', fmt(medianOf(results, 'hoursToFirstChest')));
console.log('Runs jusqu’à validation  : médiane %s', fmt(medianOf(results, 'runs')));
console.log('Salle la plus meurtrière : %j', deadliest);
console.log('Durée médiane par salle (cible : 1-3 ≈ 12 s, 4-9 ≈ 25 s, boss < 60 s) :');
for (let salle = 1; salle <= SALLES_PER_CHAPTER; salle++) {
  const all = results.flatMap((r) => r.salleDurations.get(salle) ?? []);
  const dead = deaths.get(salle) ?? 0;
  if (all.length === 0 && dead === 0) continue;
  console.log('  salle %d : %s s  (vidée %d fois, morts %d)',
    salle, all.length === 0 ? 'jamais vidée' : fmt(median(all) * TICK_S), all.length, dead);
}
console.log('Garde-fou passivité      : %s h — doit rester très au-dessus de la référence',
  fmt(medianOf(passive, 'hoursToValidate')));
