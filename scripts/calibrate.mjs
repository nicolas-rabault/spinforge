// Autopilote de calibration. Conservé volontairement : le jalon 3 en redemandera.
// La simulation étant pure et sans DOM, aucun navigateur n'est nécessaire.
import { createRun, syncRunStats, tick } from '../src/sim/sim.ts';
import { addPiece, applyRunReward, createInitialMeta, setActiveToupie } from '../src/sim/meta.ts';
import { tryUpgrade, upgradeCost } from '../src/sim/economy.ts';
import { canOpen, openChest } from '../src/sim/chest.ts';
import { TICK_S, SALLES_PER_CHAPTER, CHESTS } from '../src/sim/config.ts';
import { TOUPIES } from '../src/content/toupies.ts';

const SEEDS = [1, 7, 42, 1337, 90210];
const MAX_TICKS = 60 * 60 * 20 / TICK_S; // garde-fou : 20 h de jeu simulé

/** Politique : foncer sur le bot le plus proche. Même autopilote qu'au jalon 1.5. */
function steerTowardNearest(run) {
  let best = null;
  let bestD = Infinity;
  for (const bot of run.bots) {
    const d = Math.hypot(bot.pos.x - run.player.pos.x, bot.pos.y - run.player.pos.y);
    if (d < bestD) { bestD = d; best = bot; }
  }
  if (!best) return null;
  return { x: best.pos.x - run.player.pos.x, y: best.pos.y - run.player.pos.y };
}

/** Achats gloutons : on améliore l'emplacement le moins cher tant qu'on peut. */
function spend(meta) {
  const slots = ['lame', 'disque', 'pointe', 'noyau'];
  for (;;) {
    let cheapest = null;
    let cost = Infinity;
    for (const slot of slots) {
      const c = upgradeCost(meta.equipped[slot].level);
      if (c < cost) { cost = c; cheapest = slot; }
    }
    if (meta.credits < cost) return;
    tryUpgrade(meta, cheapest);
  }
}

/**
 * `toupieId` est optionnel et absent de l'appel de la mesure principale : quand
 * il est omis, `meta` garde le châssis de départ (Brasier Solaire) posé par
 * `createInitialMeta`, donc ce garde-fou de non-régression reste au mot près
 * ce qu'il mesurait avant le comparatif de châssis ajouté pour la Task 11.
 */
function simulate(seed, { buyChests, toupieId }) {
  const meta = createInitialMeta(seed);
  if (toupieId) {
    meta.toupies.unlocked = [toupieId];
    setActiveToupie(meta, toupieId);
  }
  let run = createRun(meta, seed);
  let ticks = 0;
  let runs = 1;
  let ticksToValidate = null;
  let runsToValidate = null;
  let ticksToFirstArene = null;
  let arenesOpened = 0;
  const deathsBySalle = new Map();

  while (ticks < MAX_TICKS && (ticksToValidate === null || ticksToFirstArene === null)) {
    const salleBefore = run.salle;
    const reward = tick(run, { steer: steerTowardNearest(run) });
    ticks++;
    if (reward) {
      applyRunReward(meta, reward, salleBefore);
      spend(meta);
      // Sans ce recopiage, une amélioration achetée en cours de run ne s'appliquerait
      // qu'au run suivant — exactement ce que fait l'écran Forge après chaque achat
      // (`ForgeScreen.tsx`). Sans lui, l'autopilote sous-mesure la vitesse de
      // progression réelle du joueur.
      syncRunStats(run, meta);
      if (meta.chapterValidated && ticksToValidate === null) {
        ticksToValidate = ticks;
        runsToValidate = runs;
      }
      if (buyChests && canOpen(meta, 'arene', 1)) {
        for (const piece of openChest(meta, 'arene', 1)) addPiece(meta, piece);
        arenesOpened++;
        if (ticksToFirstArene === null) ticksToFirstArene = ticks;
      }
    }
    if (run.phase === 'dead') {
      deathsBySalle.set(run.salle, (deathsBySalle.get(run.salle) ?? 0) + 1);
      runs++;
      run = createRun(meta, seed + runs);
    }
  }

  return {
    hoursToValidate: ticksToValidate === null ? null : (ticksToValidate * TICK_S) / 3600,
    hoursToFirstArene: ticksToFirstArene === null ? null : (ticksToFirstArene * TICK_S) / 3600,
    runs: runsToValidate,
    gems: meta.gems,
    arenesOpened,
    deadliestSalle: [...deathsBySalle.entries()].sort((a, b) => b[1] - a[1])[0] ?? null,
  };
}

const median = (xs) => {
  const ok = xs.filter((x) => x !== null).sort((a, z) => a - z);
  return ok.length === 0 ? null : ok[ok.length >> 1];
};

const results = SEEDS.map((seed) => simulate(seed, { buyChests: true }));
const fmt = (x) => (x === null ? 'jamais' : x.toFixed(2));

console.log('=== Calibration — %d graines ===', SEEDS.length);
console.log('Validation du chapitre 1 : médiane %s h (garde-fou de non-régression, cible ~2 h)',
  fmt(median(results.map((r) => r.hoursToValidate))));
console.log('Premier coffre Arène     : médiane %s h après le départ (cible : dans l’heure suivant la validation)',
  fmt(median(results.map((r) => r.hoursToFirstArene))));
console.log('Runs jusqu’à validation  : médiane %s', fmt(median(results.map((r) => r.runs))));
console.log('Prix d’un Arène          : %d gemmes', CHESTS.arene.price);
console.log('Salle la plus meurtrière : %j', results[0].deadliestSalle);
console.log('Salles par chapitre      : %d', SALLES_PER_CHAPTER);

// Comparatif des quatre châssis, chapitre 1. Même autopilote (foncer sur le bot
// le plus proche), mêmes graines : seul le châssis actif change d'une série à
// l'autre. N'affecte pas la mesure principale ci-dessus (fonction `simulate`
// appelée sans `toupieId` plus haut).
const chassisResults = TOUPIES.map((toupie) => {
  const runsFor = SEEDS.map((seed) => simulate(seed, { buyChests: true, toupieId: toupie.id }));
  return {
    id: toupie.id,
    label: toupie.label,
    type: toupie.type,
    runs: median(runsFor.map((r) => r.runs)),
    hours: median(runsFor.map((r) => r.hoursToValidate)),
    deadliestSalle: runsFor[0].deadliestSalle,
  };
});

console.log('\n=== Comparatif châssis — chapitre 1 (%d graines) ===', SEEDS.length);
for (const c of chassisResults) {
  console.log('%s (%s) : %s runs · %s h · salle la plus meurtrière %j',
    c.label.padEnd(18), c.type.padEnd(10), fmt(c.runs), fmt(c.hours), c.deadliestSalle);
}
const runCounts = chassisResults.map((c) => c.runs).filter((r) => r !== null);
const best = Math.min(...runCounts);
const worst = Math.max(...runCounts);
console.log('Écart meilleur/pire (runs) : %s/%s = ×%s (cible : < ×2)',
  worst, best, (worst / best).toFixed(2));
