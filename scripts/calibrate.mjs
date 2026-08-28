// Autopilote de calibration. Conservé volontairement : le jalon 3 en redemandera.
// La simulation étant pure et sans DOM, aucun navigateur n'est nécessaire.
import { createRun, syncRunStats, tick } from '../src/sim/sim.ts';
import { addPiece, applyRunReward, createInitialMeta, setActiveToupie } from '../src/sim/meta.ts';
import { tryUpgrade, upgradeCost } from '../src/sim/economy.ts';
import { canOpen, openChest } from '../src/sim/chest.ts';
import { TICK_S, SALLES_PER_CHAPTER, CHESTS } from '../src/sim/config.ts';
import { botTypeFor } from '../src/sim/salle.ts';
import { typeMult } from '../src/sim/typeChart.ts';
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

/**
 * Le châssis qui domine le mieux le type d'une salle : on maximise le rapport
 * entre ce qu'on inflige et ce qu'on subit, le triangle jouant des deux côtés.
 * Dérivé de `typeMult`, jamais d'une table réécrite ici.
 */
function counterFor(chapter, salle) {
  const botType = botTypeFor(chapter, salle);
  let best = TOUPIES[0];
  let bestRatio = 0;
  for (const t of TOUPIES) {
    const ratio = typeMult(t.type, botType) / typeMult(botType, t.type);
    if (ratio > bestRatio) { bestRatio = ratio; best = t; }
  }
  return best.id;
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
 *
 * `counterPick` fait jouer un contre-pioqueur qui possède les quatre toupies.
 * `'salle'` rebascule à chaque salle ; `'descente'` ne choisit qu'au départ de la
 * descente — et comme seul le chapitre 1 existe, sa salle 1 est toujours du même
 * type, donc cette série revient à tenir un châssis fixe (Typhon Primal). C'est
 * volontaire : c'est le témoin apparié du verrou, identique en tout sauf le
 * MOMENT du choix. La vraie alternative d'un joueur qui ne triche pas est
 * ailleurs — le meilleur châssis fixe du tableau ci-dessus.
 */
function simulate(seed, { buyChests, toupieId, counterPick }) {
  const meta = createInitialMeta(seed);
  if (toupieId) {
    meta.toupies.unlocked = [toupieId];
    setActiveToupie(meta, toupieId);
  }
  if (counterPick) {
    meta.toupies.unlocked = TOUPIES.map((t) => t.id);
    setActiveToupie(meta, counterFor(1, 1));
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
      // Le contournement d'avant le verrou : se remettre du bon côté du triangle
      // à chaque salle, `syncRunStats` l'appliquant dans la seconde. Depuis le
      // verrou, seul `equipPendingToupie` fait monter ce choix sur la toupie.
      if (counterPick && (counterPick === 'salle' || run.salle === 1)) {
        setActiveToupie(meta, counterFor(run.chapter, run.salle));
        syncRunStats(run, meta);
      }
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
      if (counterPick) setActiveToupie(meta, counterFor(1, 1));
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

// Garde-fou du verrou de châssis. Les deux séries jouent le même autopilote,
// possèdent les quatre toupies et partent du même châssis ; elles ne diffèrent
// que par le MOMENT du choix. Le châssis étant figé pour la descente, changer
// d'avis salle par salle ne peut plus rien rapporter : les deux lignes doivent
// être identiques.
//
// Vérifié par mutation, dans les deux directions. (1) `syncRunStats` relisant
// `meta.toupies.active` : « à chaque salle » retombe à 17 runs / 1,42 h contre
// 30 / 2,11 h. (2) `equipPendingToupie` appelée à chaque salle au lieu du seul
// boss : mêmes 17 / 1,42 h. Les deux font crier la ligne de verdict.
//
// Attention en lisant l'écart : le témoin ci-dessous n'est PAS ce que ferait un
// joueur honnête à quatre toupies — celui-là prendrait le meilleur châssis fixe,
// Carapace Abyssale, dans le tableau ci-dessus. C'est de ce chiffre-là qu'il faut
// mesurer le gain réel du contournement, pas de celui-ci.
const pickSeries = ['salle', 'descente'].map((when) => {
  const rs = SEEDS.map((seed) => simulate(seed, { buyChests: true, counterPick: when }));
  return { when, runs: median(rs.map((r) => r.runs)), hours: median(rs.map((r) => r.hoursToValidate)) };
});

console.log('\n=== Verrou du châssis — contre-pioche du triangle (%d graines) ===', SEEDS.length);
const SERIES_LABEL = { salle: 'rebascule à chaque salle', descente: 'même choix, tenu jusqu’au boss' };
for (const p of pickSeries) {
  console.log('%s : %s runs · %s h', SERIES_LABEL[p.when].padEnd(31), fmt(p.runs), fmt(p.hours));
}
const [parSalle, parDescente] = pickSeries;
const locked = parSalle.runs === parDescente.runs && parSalle.hours === parDescente.hours;
console.log(locked
  ? 'Verrou actif : changer de châssis en cours de descente ne rapporte rien.'
  : 'VERROU ROMPU : contre-piocher salle par salle rapporte encore.');
