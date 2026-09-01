// Autopilote de calibration. Conservé volontairement : le jalon 3 en redemandera.
// La simulation étant pure et sans DOM, aucun navigateur n'est nécessaire.
import { startRun, syncRunStats, tick } from '../src/sim/sim.ts';
import { addPiece, applyRunReward, createInitialMeta, setActiveToupie } from '../src/sim/meta.ts';
import { tryUpgrade, upgradeCost } from '../src/sim/economy.ts';
import { canOpen, grantChest, openChest } from '../src/sim/chest.ts';
import { ARENA_RADIUS, TICK_S, SALLES_PER_CHAPTER } from '../src/sim/config.ts';
import { botTypeFor } from '../src/sim/salle.ts';
import { typeMult } from '../src/sim/typeChart.ts';
import { TOUPIES } from '../src/content/toupies.ts';

const SEEDS = [1, 7, 42, 1337, 90210, 2, 13, 271, 4242, 65535];
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

/**
 * `toupieId` est optionnel et absent de l'appel de la mesure principale : quand
 * il est omis, `meta` garde le châssis de départ (Brasier Solaire) posé par
 * `createInitialMeta`, donc ce garde-fou de non-régression reste au mot près ce
 * qu'il mesurait avant le comparatif de châssis.
 *
 * `counterPick` fait jouer un contre-pioqueur qui possède les quatre toupies.
 * `'salle'` rebascule à chaque salle ; `'descente'` ne choisit qu'au départ de la
 * descente — et comme seul le chapitre 1 existe, sa salle 1 est toujours du même
 * type, donc cette série revient à tenir un châssis fixe. C'est volontaire :
 * c'est le témoin apparié du verrou, identique en tout sauf le MOMENT du choix.
 * La vraie alternative d'un joueur qui ne triche pas est ailleurs — le meilleur
 * châssis fixe du tableau ci-dessus.
 */
function simulate(seed, { buyChests, steer, toupieId, counterPick }) {
  const meta = createInitialMeta(seed);
  if (toupieId) {
    meta.toupies.unlocked = [toupieId];
    setActiveToupie(meta, toupieId);
  }
  if (counterPick) {
    meta.toupies.unlocked = TOUPIES.map((t) => t.id);
    setActiveToupie(meta, counterFor(1, 1));
  }
  let run = startRun(meta, 1, seed);
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
      applyRunReward(meta, reward);
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
      // Le contournement d'avant le verrou : se remettre du bon côté du triangle
      // à chaque salle, `syncRunStats` l'appliquant dans la seconde. Depuis le
      // verrou, seul `startRun` fait monter ce choix sur la toupie — la série
      // « descente » ne choisit donc plus qu'à la relance, en bas de boucle.
      if (counterPick === 'salle') {
        setActiveToupie(meta, counterFor(run.chapter, run.salle));
        syncRunStats(run, meta);
      }
      if (meta.bestChapter >= 1 && ticksToValidate === null) {
        ticksToValidate = ticks;
        runsToValidate = runs;
      }
    }
    if (run.phase !== 'fighting') {
      if (run.phase === 'dead') deathsBySalle.set(run.salle, (deathsBySalle.get(run.salle) ?? 0) + 1);
      runs++;
      if (counterPick) setActiveToupie(meta, counterFor(1, 1));
      run = startRun(meta, 1, seed + runs);
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
const passivite = medianOf(passive, 'hoursToValidate');
console.log('Garde-fou passivité      : %s — doit rester très au-dessus de la référence',
  passivite === null ? 'jamais' : fmt(passivite) + ' h');

// Comparatif des quatre châssis, chapitre 1. Même autopilote « terrain », mêmes
// graines : seul le châssis actif change d'une série à l'autre. N'affecte pas la
// mesure principale ci-dessus (`simulate` appelée sans `toupieId`).
const chassisResults = TOUPIES.map((toupie) => {
  const runsFor = SEEDS.map((seed) =>
    simulate(seed, { buyChests: true, steer: steerWithTerrain, toupieId: toupie.id }));
  // Morts cumulées sur toutes les graines, comme la mesure principale : sur une
  // seule, le classement des salles ne dit rien.
  const d = new Map();
  for (const r of runsFor) {
    for (const [salle, n] of r.deathsBySalle) d.set(salle, (d.get(salle) ?? 0) + n);
  }
  return {
    label: toupie.label,
    type: toupie.type,
    runs: median(runsFor.map((r) => r.runs)),
    hours: median(runsFor.map((r) => r.hoursToValidate)),
    deadliestSalle: [...d.entries()].sort((a, b) => b[1] - a[1])[0] ?? null,
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
// Vérifié par mutation : `syncRunStats` relisant `meta.toupies.active` fait
// tomber « à chaque salle » à 6 runs / 0,19 h contre 19 / 0,46 h, et crier la
// ligne de verdict. C'est désormais la seule mutation qui rouvre la brèche : le
// châssis n'ayant plus qu'un point de montage — `startRun` —, il n'existe plus
// d'appel à passer trop souvent.
//
// Attention en lisant l'écart : le témoin ci-dessous n'est PAS ce que ferait un
// joueur honnête à quatre toupies — celui-là prendrait le meilleur châssis fixe,
// Carapace Abyssale, dans le tableau ci-dessus. C'est de ce chiffre-là qu'il faut
// mesurer le gain réel du contournement, pas de celui-ci.
const pickSeries = ['salle', 'descente'].map((when) => {
  const rs = SEEDS.map((seed) => simulate(seed, { buyChests: true, steer: steerWithTerrain, counterPick: when }));
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
