// Autopilote de calibration. Conservé volontairement : le jalon 3 en redemandera.
// La simulation étant pure et sans DOM, aucun navigateur n'est nécessaire.
import { maxPlayableChapter, startRun, syncRunStats, tick } from '../src/sim/sim.ts';
import { addPiece, applyRunReward, createInitialMeta, setActiveToupie } from '../src/sim/meta.ts';
import { tryUpgrade, upgradeCost } from '../src/sim/economy.ts';
import { canOpen, grantChests, openChest } from '../src/sim/chest.ts';
import { ARENA_RADIUS, MAX_CHAPTER, TICK_S, SALLES_PER_CHAPTER } from '../src/sim/config.ts';
import { botTypeFor } from '../src/sim/salle.ts';
import { typeMult } from '../src/sim/typeChart.ts';
import { TOUPIES } from '../src/content/toupies.ts';
// `src/content/` ne porte plus de texte : les noms de toupies vivent dans les
// catalogues i18n. On lit le catalogue français *directement* — `src/i18n/fr.ts`
// n'importe rien et reste donc pur ; `src/i18n/index.ts`, lui, touche
// `localStorage` et `navigator`, que ce script n'a pas.
import { fr } from '../src/i18n/fr.ts';

const toupieLabel = (id) => fr[`toupie.${id}`];

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

/** Vide la file de butin, comme un joueur qui ouvre ses coffres au fur et à
 *  mesure. Retourne vrai si au moins un coffre en a été tiré.
 *
 *  `grantChests` vide la file d'un type en un appel : la boucle `while` d'avant
 *  est devenue cet appel unique. Le flux de RNG est le même — vider la file d'un
 *  coup consomme exactement ce que consommaient N ouvertures unitaires (c'est ce
 *  que tient `chest.test.ts`) — donc la mesure reste comparable à l'ancienne. */
function openLoot(meta) {
  let opened = false;
  for (const kind of CHEST_KINDS) {
    const pulls = grantChests(meta, kind);
    if (!pulls) continue;
    for (const piece of pulls) addPiece(meta, piece);
    opened = true;
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
 * descente — et comme les deux séries tournent en `upTo: 1` et ne quittent donc
 * jamais le chapitre 1, sa salle 1 est toujours du même type : cette série revient
 * à tenir un châssis fixe. C'est volontaire :
 * c'est le témoin apparié du verrou, identique en tout sauf le MOMENT du choix.
 * La vraie alternative d'un joueur qui ne triche pas est ailleurs — le meilleur
 * châssis fixe du tableau ci-dessus.
 */
function simulate(seed, { buyChests, steer, toupieId, counterPick, upTo = MAX_CHAPTER }) {
  const meta = createInitialMeta(seed);
  if (toupieId) {
    meta.toupies.unlocked = [toupieId];
    setActiveToupie(meta, toupieId);
  }
  if (counterPick) {
    meta.toupies.unlocked = TOUPIES.map((t) => t.id);
    setActiveToupie(meta, counterFor(1, 1));
  }
  // Un relevé par chapitre : les médianes d'un chapitre ne disent rien de celles
  // d'un autre, et le garde-fou de la salle 10 doit tenir dans chacun. Le relevé
  // naît à zéro descente : le créer et en ouvrir une sont deux choses distinctes,
  // sinon un chapitre dont le relevé naît de la ligne de relance compterait sa
  // première descente deux fois.
  const chapters = new Map();
  const statsFor = (n) => {
    if (!chapters.has(n)) {
      chapters.set(n, { ticks: null, runs: null, runsStarted: 0, salleDurations: new Map(), deathsBySalle: new Map() });
    }
    return chapters.get(n);
  };

  let run = startRun(meta, 1, seed);
  statsFor(1).runsStarted++;
  let ticks = 0;
  let runs = 1;
  let salleTicks = 0;
  let ticksToFirstChest = null;

  while (ticks < MAX_TICKS && meta.bestChapter < upTo) {
    const salleBefore = run.salle;
    const st = statsFor(run.chapter);
    const reward = tick(run, { steer: steer(run) });
    ticks++;
    salleTicks++;
    if (reward) {
      applyRunReward(meta, reward);
      if (!st.salleDurations.has(salleBefore)) st.salleDurations.set(salleBefore, []);
      st.salleDurations.get(salleBefore).push(salleTicks);
      salleTicks = 0;
      const lootOpened = openLoot(meta);
      const purchaseOpened = spend(meta, { buyChests });
      if ((lootOpened || purchaseOpened) && ticksToFirstChest === null) ticksToFirstChest = ticks;
      syncRunStats(run, meta);
      if (counterPick === 'salle') {
        setActiveToupie(meta, counterFor(run.chapter, run.salle));
        syncRunStats(run, meta);
      }
      if (reward.boss && st.ticks === null) {
        st.ticks = ticks;          // cumulé depuis le départ de la partie
        st.runs = st.runsStarted;  // descentes ouvertes dans ce chapitre
      }
    }
    // Mort ou boss vaincu : la descente est close, on en ouvre une autre. Le
    // harnais joue toujours le chapitre le plus haut qu'il ait le droit de jouer.
    if (run.phase !== 'fighting') {
      if (run.phase === 'dead') st.deathsBySalle.set(run.salle, (st.deathsBySalle.get(run.salle) ?? 0) + 1);
      runs++;
      const next = Math.min(maxPlayableChapter(meta), upTo);
      if (counterPick) setActiveToupie(meta, counterFor(next, 1));
      run = startRun(meta, next, seed + runs);
      statsFor(next).runsStarted++;
      salleTicks = 0;
    }
  }

  return {
    hoursToFirstChest: ticksToFirstChest === null ? null : (ticksToFirstChest * TICK_S) / 3600,
    chapters,
  };
}

const median = (xs) => {
  const ok = xs.filter((x) => x !== null).sort((a, z) => a - z);
  return ok.length === 0 ? null : ok[ok.length >> 1];
};

/** Agrège un champ d'un chapitre sur toutes les graines. */
const chapterField = (rs, chapter, key) =>
  median(rs.map((r) => r.chapters.get(chapter)?.[key] ?? null));

/** Heures cumulées depuis le départ jusqu'à la validation d'un chapitre. */
const hoursOf = (rs, chapter) => {
  const t = chapterField(rs, chapter, 'ticks');
  return t === null ? null : (t * TICK_S) / 3600;
};

/** Morts cumulées d'un chapitre sur toutes les graines : sur une seule, le
 *  classement des salles tient à une poignée de runs. */
function deathsOf(rs, chapter) {
  const d = new Map();
  for (const r of rs) {
    for (const [salle, n] of r.chapters.get(chapter)?.deathsBySalle ?? []) d.set(salle, (d.get(salle) ?? 0) + n);
  }
  return d;
}

const results = SEEDS.map((seed) => simulate(seed, { buyChests: true, steer: steerWithTerrain }));
// Garde-fou : ne jamais toucher l'écran doit rester très nettement plus lent.
const passive = SEEDS.map((seed) => simulate(seed, { buyChests: true, steer: () => null, upTo: 1 }));

const fmt = (x) => (x === null ? 'jamais' : x.toFixed(2));
const medianOf = (rs, key) => median(rs.map((r) => r[key]));

console.log('=== Calibration — %d graines ===', SEEDS.length);
console.log('Premier coffre ouvert    : médiane %s h', fmt(medianOf(results, 'hoursToFirstChest')));

for (let chapter = 1; chapter <= MAX_CHAPTER; chapter++) {
  const heures = hoursOf(results, chapter);
  const deaths = deathsOf(results, chapter);
  const deadliest = [...deaths.entries()].sort((a, b) => b[1] - a[1])[0] ?? null;
  // `median` écarte les nulls : sans l'effectif, un chapitre validé par une seule
  // graine se lirait comme une médiane sur dix — et le chapitre 4 semblerait plus
  // facile que le 3.
  const validated = results.filter((r) => r.chapters.get(chapter)?.ticks !== null && r.chapters.get(chapter)?.ticks !== undefined).length;
  // `hoursOf` cumule depuis le départ de la partie ; le coût propre du chapitre est
  // la marche, et c'est elle que les passes de calibration règlent.
  const precedent = chapter === 1 ? 0 : hoursOf(results, chapter - 1);
  const marginal = heures === null || precedent === null ? null : heures - precedent;
  // Une salle par ligne, avec sa létalité PAR TENTATIVE (morts / (vidée + morts)) —
  // le pendant du décompte absolu ci-dessus : le décompte dit où les morts
  // s'accumulent vu que l'autopilote ne recule jamais vers un chapitre plus facile ;
  // le taux dit le risque une fois dans la salle. Un entonnoir a beaucoup de
  // tentatives et un taux modéré ; un mur en a peu et un taux proche de 100 %.
  const salleStats = [];
  for (let salle = 1; salle <= SALLES_PER_CHAPTER; salle++) {
    const durations = results.flatMap((r) => r.chapters.get(chapter)?.salleDurations.get(salle) ?? []);
    const dead = deaths.get(salle) ?? 0;
    const attempts = durations.length + dead; // vidée + morts : une salle est l'un ou l'autre.
    if (attempts === 0) continue;
    salleStats.push({ salle, durations, dead, rate: (dead / attempts) * 100 });
  }
  const deadliestRate = salleStats.reduce((best, s) => (best === null || s.rate > best.rate ? s : best), null);

  console.log('\n--- Chapitre %d : validé par %d/%d graines · %s h cumulées (+%s h) · %s descentes · salle la plus meurtrière %j',
    chapter, validated, SEEDS.length, fmt(heures), fmt(marginal), fmt(chapterField(results, chapter, 'runs')), deadliest);
  // Garde-fou : « le mur n'est jamais un bug, c'est le produit » doit tenir dans
  // CHAQUE chapitre, pas seulement dans le premier. Le verdict reste sur le
  // décompte absolu — la lecture par tentative ci-dessous ne le fait jamais basculer.
  console.log('    salle 10 la plus meurtrière : %s', deadliest && deadliest[0] === SALLES_PER_CHAPTER ? 'oui' : 'NON');
  console.log('    (lecture par tentative : %s)',
    deadliestRate ? `salle ${deadliestRate.salle}, ${Math.round(deadliestRate.rate)} % de létalité` : 'jamais mesurée');
  for (const s of salleStats) {
    console.log('    salle %d : %s s  (vidée %d fois, morts %d) · %d %% létalité/tentative',
      s.salle, s.durations.length === 0 ? 'jamais vidée' : fmt(median(s.durations) * TICK_S), s.durations.length, s.dead,
      Math.round(s.rate));
  }
}

const passivite = chapterField(passive, 1, 'ticks');
console.log('\nGarde-fou passivité      : %s — doit rester très au-dessus de la référence',
  passivite === null ? 'jamais' : fmt((passivite * TICK_S) / 3600) + ' h');

// Comparatif des quatre châssis, chapitre 1. Même autopilote « terrain », mêmes
// graines : seul le châssis actif change d'une série à l'autre. N'affecte pas la
// mesure principale ci-dessus (`simulate` appelée sans `toupieId`).
const chassisResults = TOUPIES.map((toupie) => {
  const runsFor = SEEDS.map((seed) =>
    simulate(seed, { buyChests: true, steer: steerWithTerrain, toupieId: toupie.id, upTo: 1 }));
  const d = deathsOf(runsFor, 1);
  return {
    label: toupieLabel(toupie.id),
    type: toupie.type,
    runs: chapterField(runsFor, 1, 'runs'),
    hours: hoursOf(runsFor, 1),
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
  const rs = SEEDS.map((seed) => simulate(seed, { buyChests: true, steer: steerWithTerrain, counterPick: when, upTo: 1 }));
  return { when, runs: chapterField(rs, 1, 'runs'), hours: hoursOf(rs, 1) };
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
