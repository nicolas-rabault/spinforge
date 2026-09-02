# Jalon 3, lot B — le farm : plan d'implémentation

> **Pour les agents :** SOUS-SKILL REQUISE — `superpowers:subagent-driven-development`
> (recommandé) ou `superpowers:executing-plans`. Les étapes sont en cases à cocher.

**Goal:** Un autopilote déterministe dans `src/sim/`, et un mécanisme unique de farm qui s'en
sert des deux côtés — décor AUTO à l'écran, rattrapage hors-ligne au retour — sans jamais
franchir une salle non validée.

**Architecture:** `steerWithTerrain` est extraite bit à bit du harnais de calibration vers
`src/sim/autopilot.ts`. `src/sim/farm.ts` porte une `FarmSession` (une descente en cours, un
report de reste) que `farm(meta, session, secondes, graine)` fait avancer ; elle abandonne
toute descente qui atteint la salle du boss, ce qui rend le pilier « le farm ne progresse
jamais » structurel. Hors-ligne et AUTO appellent la même fonction, avec des durées
différentes.

**Tech Stack:** TypeScript strict, Vitest (imports explicites, pas de globals), Vite, React,
PixiJS. `vite-node` pour les harnais.

**Spec:** `docs/superpowers/specs/2026-09-01-jalon-3-lot-b-farm-design.md`

## Global Constraints

Ces contraintes s'appliquent à **toutes** les tâches, sans être répétées dans chacune.

- **`src/sim/` est pur et déterministe.** Aucun import de DOM, PixiJS, React, `src/i18n/`,
  `Date` ni `Math.random`. Le RNG est sérialisé dans l'état (`rngState`), le temps avance
  uniquement par `tick()` à pas fixe de **100 ms** (`TICK_S`).
- **Le rendu est un spectateur.** `src/render/` et `src/ui/` lisent l'état, ne le mutent
  jamais directement.
- **Tout l'équilibrage vit dans `src/content/balance.json`**, dont `src/sim/config.ts` est la
  porte unique. Aucune constante d'équilibrage en dur ailleurs.
- **Textes joueur en français ET en anglais.** Toute chaîne visible passe par une clé de
  `src/i18n/fr.ts` (qui fait foi) et `src/i18n/en.ts` (déclaré
  `Record<MessageKey, string>` — une clé oubliée ou en trop casse le build).
- **Aucun nom officiel Beyblade** dans le code, les données ou l'interface.
- **`git add` fichier par fichier.** Jamais `git add -A`, jamais `git add <répertoire>`.
  Relire `git status --short` avant chaque commit.
- **Jamais le combat et l'économie dans la même passe ni le même commit.**
- Tests colocalisés (`src/sim/*.test.ts`), imports explicites depuis `vitest`.

**Étalon de calibration** relevé sur `origin/main` au démarrage du lot — c'est-à-dire sur
`764f220`. Toute tâche qui touche la simulation ou l'autopilote doit le laisser **exactement**
intact :

```
ch.1 10/10 · 0,32 h (+0,32) · 9 descentes · salle 10, 23 morts · 70 %/tentative
ch.2 10/10 · 0,47 h (+0,15) · 3 descentes · salle 10,  8 morts · 44 %/tentative
ch.3 10/10 · 0,58 h (+0,10) · 2 descentes · salle 10,  5 morts · 33 %/tentative
ch.4 10/10 · 0,94 h (+0,36) · 6 descentes · salle 10, 18 morts · 64 %/tentative
premier coffre 0,00 h · passivité jamais validée en 20 h · écart châssis ×3,80
verrou du châssis actif · salle 10 la plus meurtrière dans CHAQUE chapitre
```

> **Mise à jour (intégration de `main`, 2026-09-02) — cet étalon est daté, et il vaut pour
> l'exécution du plan, pas pour l'état courant du dépôt.** Il a bien été tenu au chiffre près
> pendant tout le lot ; c'est `main` qui l'a déplacé après coup, avec `fc827ee` (« le contact
> se cherche sur le trajet du tick, plus sur son arrivée »), qui récupère près d'un quart des
> collisions que la détection discrète ratait et rend le jeu nettement plus meurtrier. La
> ligne de base est désormais :
>
> ```
> ch.1 10/10 · 0,42 h (+0,42) · 20 descentes · salle 10, 72 morts · 88 %/tentative
> ch.2 10/10 · 0,54 h (+0,12) ·  2 descentes · salle 10, 30 morts · 75 %/tentative
> ch.3 10/10 · 0,69 h (+0,15) ·  3 descentes · salle 10, 16 morts · 62 %/tentative
> ch.4 10/10 · 0,77 h (+0,08) ·  5 descentes · salle 10, 33 morts · 77 %/tentative
> premier coffre 0,00 h · passivité jamais validée · écart châssis ×10,80
> verrou du châssis actif · salle 10 la plus meurtrière dans CHAQUE chapitre
> ```
>
> Elle est identique sur `main` seul et sur l'arbre fusionné : **le lot B n'y contribue en
> rien**. Cette mise à jour vaut pour **toutes** les occurrences de l'étalon dans ce plan —
> l'étape 5 de la tâche 1, les « étalon intact » des tâches 3, 6 et 10, et le commentaire
> d'en-tête recopié dans la tâche 1, dont la version livrée dans `src/sim/autopilot.ts` porte
> désormais cet avertissement. Le détail et la justification : § 2.2 de la spec du lot.

**Serveur de développement.** Ce dépôt fait tourner plusieurs sessions Claude en parallèle et
les ports 5173-5177 et 5190 ont été observés occupés par d'autres worktrees. Lancer avec
`npm run dev -- --port 41973 --strictPort`, puis **vérifier le contenu servi** avant toute
mesure — `--strictPort` ne protège pas d'un autre serveur lié sur une adresse différente du
même port. Un port est une adresse, pas une identité.

---

## File Structure

| Fichier | Responsabilité |
|---|---|
| `src/sim/autopilot.ts` | **créé** — la politique de pilotage, extraite du harnais |
| `src/sim/autopilot.test.ts` | **créé** — déterminisme et forme de la politique |
| `src/sim/farm.ts` | **créé** — `FarmSession`, `farm()`, `offlineSeconds()` |
| `src/sim/farm.test.ts` | **créé** — le pilier, la continuité, le temps |
| `src/content/balance.json` | **modifié** — bloc `offline` |
| `src/sim/config.ts` | **modifié** — `Balance.offline` et l'export `OFFLINE` |
| `src/sim/types.ts` | **modifié** — `MetaState.lastSeenAt` |
| `src/sim/meta.ts` | **modifié** — `createInitialMeta` pose `lastSeenAt: 0` |
| `src/sim/save.ts` | **modifié** — schéma 6, hydratation et `isComplete` |
| `src/storage/localSave.ts` | **modifié** — écrit `lastSeenAt`, lit l'absence |
| `src/ui/App.tsx` | **modifié** — partie pilotée vs décor AUTO, paquets de farm |
| `src/ui/AbsenceScreen.tsx` | **créé** — l'écran « Pendant ton absence » |
| `src/i18n/fr.ts` / `en.ts` | **modifié** — clés de l'écran d'absence |
| `scripts/calibrate.mjs` | **modifié** — importe l'autopilote au lieu de le définir |
| `docs/game-design.md` | **modifié** — trois corrections (§ 7.1 de la spec) |
| `docs/ameliorations.md` | **modifié** — les deux demandes consignées |
| `docs/roadmap.md` | **modifié** — section « Lot B » |

---

## Task 1 : Extraire l'autopilote, et prouver que c'est neutre

**Files:**
- Create: `src/sim/autopilot.ts`
- Create: `src/sim/autopilot.test.ts`
- Modify: `scripts/calibrate.mjs` (retirer `nearestBreach` et `steerWithTerrain`, les importer)

**Interfaces:**
- Consomme : `ARENA_RADIUS` (`src/sim/config.ts`), types `RunState`, `Vec` (`src/sim/types.ts`)
- Produit : `steerWithTerrain(run: RunState): Vec | null` — consommée par la tâche 3 et par
  `scripts/calibrate.mjs`

- [ ] **Étape 1 : créer `src/sim/autopilot.ts`**

Le corps des deux fonctions est **recopié sans un mot changé** depuis `scripts/calibrate.mjs`.
Seuls changent : les `import`, l'annotation de types TypeScript, et le commentaire d'en-tête.

```ts
import { ARENA_RADIUS } from './config';
import type { ArenaLayout } from './terrain';
import type { RunState, Vec } from './types';

/**
 * La politique de pilotage de l'autopilote. Elle vivait dans
 * `scripts/calibrate.mjs`, d'où chaque chiffre d'équilibrage du projet est
 * sorti ; elle est ici **à l'identique**, et le harnais l'importe désormais au
 * lieu de la définir.
 *
 * Rien n'y a été « amélioré » au passage, et c'est délibéré : changer cette
 * politique changerait d'un coup tous les chiffres de référence du projet. Sa
 * neutralité est prouvée par mesure — les huit garde-fous de `npm run calibrate`
 * doivent ressortir au chiffre près (§ 2.2 de la spec du lot).
 */

/** Brèche dont le centre est angulairement le plus proche de ce point. Retourne
 *  `null` avant la salle où les brèches apparaissent. */
function nearestBreach(arena: ArenaLayout, pos: Vec): ArenaLayout['breaches'][number] | null {
  const angle = Math.atan2(pos.y, pos.x);
  let best: ArenaLayout['breaches'][number] | null = null;
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
export function steerWithTerrain(run: RunState): Vec | null {
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
```

Vérifier que `Breach` est bien exporté depuis `src/sim/terrain.ts` ; s'il ne l'est pas,
utiliser `ArenaLayout['breaches'][number]` comme ci-dessus plutôt que d'ajouter un export.

- [ ] **Étape 2 : écrire le test**

```ts
import { describe, expect, it } from 'vitest';
import { steerWithTerrain } from './autopilot';
import { createInitialMeta } from './meta';
import { startRun } from './sim';

describe('steerWithTerrain', () => {
  it('ne vise rien quand la salle est vide', () => {
    const run = startRun(createInitialMeta(1), 1, 7);
    run.bots = [];
    run.arena.shard = null;
    expect(steerWithTerrain(run)).toBeNull();
  });

  it('vise l’éclat quand le joueur en est le plus près', () => {
    const run = startRun(createInitialMeta(1), 1, 7);
    run.player.pos = { x: 0, y: 0 };
    run.arena.shard = { x: 10, y: 0, ttl: 60 };
    run.bots[0].pos = { x: -140, y: 0 };
    const aim = steerWithTerrain(run)!;
    expect(aim.x).toBeGreaterThan(0);
    expect(Math.abs(aim.y)).toBeLessThan(1e-9);
  });

  it('rend deux fois la même direction pour le même état', () => {
    const run = startRun(createInitialMeta(1), 1, 7);
    expect(steerWithTerrain(run)).toEqual(steerWithTerrain(run));
  });
});
```

Adapter la forme littérale de `shard` à celle de `Shard` dans `src/sim/terrain.ts` (lire le
type avant d'écrire le test ; le champ de durée de vie peut ne pas s'appeler `ttl`).

- [ ] **Étape 3 : lancer le test, il doit échouer**

Run: `npx vitest run src/sim/autopilot.test.ts`
Expected: FAIL — `Cannot find module './autopilot'` si l'étape 1 n'est pas encore faite,
sinon PASS.

- [ ] **Étape 4 : brancher le harnais sur l'autopilote extrait**

Dans `scripts/calibrate.mjs` : supprimer les deux fonctions `nearestBreach` et
`steerWithTerrain` et leurs commentaires, ajouter l'import, retirer `ARENA_RADIUS` de l'import
de `config.ts` **s'il n'a plus d'autre usage dans le fichier** (le vérifier par `grep`).

```js
import { steerWithTerrain } from '../src/sim/autopilot.ts';
```

- [ ] **Étape 5 : la preuve — les huit garde-fous, au chiffre près**

> **Lu après coup (2026-09-02)** : « l'étalon des contraintes globales » désigne ici celui de
> `764f220`, contre lequel cette étape a bien été passée. Rejouer cette étape aujourd'hui
> demande de comparer à la ligne de base d'après `fc827ee` — voir la mise à jour des
> contraintes globales.

Run: `npm run calibrate`
Expected: la sortie reproduit **exactement** l'étalon des contraintes globales. Comparer
ligne à ligne, pas de mémoire :

```bash
npm run calibrate 2>&1 | grep -E "Chapitre|salle 10 la plus|Premier coffre|passivité|Écart|Verrou"
```

Si un seul nombre diffère, l'extraction n'a pas été bit à bit — **relire la diff et rendre
l'extraction neutre**, jamais accepter le nouveau chiffre.

- [ ] **Étape 6 : tests et build**

Run: `npm run test` — Expected: 440 tests + les 3 nouveaux passent.
Run: `npm run build` — Expected: aucune erreur TypeScript.

- [ ] **Étape 7 : commit**

```bash
git add src/sim/autopilot.ts src/sim/autopilot.test.ts scripts/calibrate.mjs
git status --short
git commit -m "refactor(sim): la politique de pilotage quitte le harnais pour src/sim/

steerWithTerrain et nearestBreach déménagent dans src/sim/autopilot.ts sans
un mot changé ; scripts/calibrate.mjs les importe au lieu de les définir. Le
farm du lot B a besoin d'un autopilote dans la simulation, et le projet n'a
pas les moyens d'en entretenir deux qui divergent.

Neutralité prouvée et non supposée : les huit garde-fous de npm run calibrate
ressortent au chiffre près — 0,32 / +0,15 / +0,10 / +0,36 h, 9/3/2/6
descentes, salle 10 la plus meurtrière partout, premier coffre 0,00 h,
passivité jamais validée, écart châssis ×3,80, verrou actif.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Task 2 : Les réglages du farm dans `balance.json`

**Files:**
- Modify: `src/content/balance.json` (bloc `offline`, `version` 4 → 5)
- Modify: `src/sim/config.ts` (interface `Balance`, export `OFFLINE`)
- Modify: `src/sim/config.test.ts` (couverture du nouveau bloc)

**Interfaces:**
- Produit : `OFFLINE: { rate, capHours, winbackAfterHours, winbackMult, minSeconds }` —
  consommé par la tâche 4

- [ ] **Étape 1 : ajouter le bloc à `balance.json`**

À placer après `"econ"`. Les valeurs sont des **points de départ**, mesurés dans leur propre
passe à la tâche 10.

```json
  "offline": {
    "rate": 0.2,
    "capHours": 4,
    "winbackAfterHours": 12,
    "winbackMult": 1.5,
    "minSeconds": 60
  },
```

Passer `"version"` de `4` à `5` en tête de fichier.

- [ ] **Étape 2 : déclarer le bloc dans `config.ts`**

Dans `interface Balance`, après `econ` :

```ts
  /** Le farm. `rate` s'applique au TEMPS SIMULÉ, jamais aux gains : absent 4 h à
   *  20 % ⇒ on simule 48 min de jeu réel. Un seul chiffre gouverne donc crédits,
   *  gemmes et coffres à la fois, sans règle d'arrondi à inventer pour chacun. */
  offline: {
    rate: number; capHours: number;
    winbackAfterHours: number; winbackMult: number;
    minSeconds: number;
  };
```

Et l'export, à côté des autres :

```ts
export const OFFLINE = BALANCE.offline;
```

- [ ] **Étape 3 : écrire le test**

Ajouter à `src/sim/config.test.ts` :

```ts
it('expose des réglages de farm cohérents', () => {
  expect(OFFLINE.rate).toBeGreaterThan(0);
  // Le farm doit rapporter STRICTEMENT moins qu'une minute jouée : c'est le
  // pilier « le jeu actif paie mieux à la minute ».
  expect(OFFLINE.rate).toBeLessThan(1);
  expect(OFFLINE.capHours).toBeGreaterThan(0);
  expect(OFFLINE.winbackMult).toBeGreaterThanOrEqual(1);
  expect(OFFLINE.minSeconds).toBeGreaterThan(0);
});
```

Ajouter `OFFLINE` à l'import de `./config` en tête du fichier de test.

- [ ] **Étape 4 : lancer**

Run: `npx vitest run src/sim/config.test.ts` — Expected: PASS.
Run: `npm run build` — Expected: aucune erreur.

- [ ] **Étape 5 : commit**

```bash
git add src/content/balance.json src/sim/config.ts src/sim/config.test.ts
git status --short
git commit -m "feat(config): les réglages du farm entrent dans balance.json

rate, capHours, winbackAfterHours, winbackMult et minSeconds. Le taux
s'applique au temps SIMULÉ et non aux gains : un seul chiffre gouverne
crédits, gemmes et coffres, sans règle d'arrondi à inventer pour chacun.

Valeurs de départ, à mesurer dans leur propre passe.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Task 3 : `farm()` — le mécanisme unique

**Files:**
- Create: `src/sim/farm.ts`
- Create: `src/sim/farm.test.ts`

**Interfaces:**
- Consomme : `steerWithTerrain` (tâche 1) ; `startRun`, `syncRunStats`, `tick`
  (`src/sim/sim.ts`) ; `applyRunReward` (`src/sim/meta.ts`) ; `SALLES_PER_CHAPTER`, `TICK_S`
  (`src/sim/config.ts`)
- Produit : `newFarmSession()`, `farm(meta, session, seconds, seed): FarmReport`, types
  `FarmSession` et `FarmReport` — consommés par les tâches 4, 6 et 7

- [ ] **Étape 1 : écrire les tests d'abord**

```ts
import { describe, expect, it } from 'vitest';
import { farm, newFarmSession } from './farm';
import { createInitialMeta } from './meta';
import { MAX_CHAPTER, SALLES_PER_CHAPTER } from './config';
import type { MetaState } from './types';

/** Un méta qui a validé `best`, prêt à farmer. */
const farmer = (best: number, seed = 42): MetaState => {
  const meta = createInitialMeta(seed);
  meta.bestChapter = best;
  return meta;
};

describe('farm', () => {
  it('ne fait rien tant qu’aucun chapitre n’est validé', () => {
    const meta = farmer(0);
    const report = farm(meta, newFarmSession(), 600, 7);
    expect(report.seconds).toBe(0);
    expect(report.credits).toBe(0);
    expect(meta.credits).toBe(0);
  });

  // LE PILIER. Le chapitre farmé est strictement inférieur à MAX_CHAPTER, sans
  // quoi le test ne pourrait pas échouer même si le farm battait le boss —
  // c'est le piège rencontré au lot A.
  it('ne fait jamais monter bestChapter', () => {
    expect(MAX_CHAPTER).toBeGreaterThan(1); // sinon le test ci-dessous est vide
    const meta = farmer(1);
    farm(meta, newFarmSession(), 3600, 7);
    expect(meta.bestChapter).toBe(1);
  });

  it('n’atteint jamais la salle du boss', () => {
    const meta = farmer(1);
    const session = newFarmSession();
    farm(meta, session, 3600, 7);
    expect(session.run!.salle).toBeLessThan(SALLES_PER_CHAPTER);
  });

  // Corollaire du précédent : les gemmes ne tombent que du boss.
  it('ne rapporte aucune gemme', () => {
    const meta = farmer(1);
    const report = farm(meta, newFarmSession(), 3600, 7);
    expect(report.gems).toBe(0);
    expect(meta.gems).toBe(0);
  });

  it('rapporte des crédits et des coffres', () => {
    const meta = farmer(1);
    const report = farm(meta, newFarmSession(), 600, 7);
    expect(report.credits).toBeGreaterThan(0);
    expect(report.salles).toBeGreaterThan(0);
    expect(report.chests.bronze).toBeGreaterThan(0);
    expect(meta.credits).toBe(report.credits);
  });

  it('rejoue la même chose à graine égale', () => {
    const a = farm(farmer(1), newFarmSession(), 600, 7);
    const b = farm(farmer(1), newFarmSession(), 600, 7);
    expect(a).toEqual(b);
  });

  // LE TEST DE CONTINUITÉ. Il garde la promesse « un seul mécanisme » : l'AUTO
  // appelle farm en petits paquets, le hors-ligne en un seul. Les deux doivent
  // payer exactement le même tarif.
  it('N petits paquets valent un gros paquet', () => {
    const gros = farm(farmer(1), newFarmSession(), 600, 7);

    const meta = farmer(1);
    const session = newFarmSession();
    const petits = { credits: 0, salles: 0, seconds: 0, bronze: 0 };
    for (let i = 0; i < 60; i++) {
      const r = farm(meta, session, 10, 7);
      petits.credits += r.credits;
      petits.salles += r.salles;
      petits.seconds += r.seconds;
      petits.bronze += r.chests.bronze;
    }
    expect(petits.seconds).toBeCloseTo(gros.seconds, 9);
    expect(petits.salles).toBe(gros.salles);
    expect(petits.credits).toBeCloseTo(gros.credits, 9);
    expect(petits.bronze).toBe(gros.chests.bronze);
  });

  // Le report de reste : un taux qui ne tombe pas juste sur le pas de 100 ms ne
  // doit rien perdre. 0,15 s par paquet = un tick et demi.
  it('ne perd pas les fractions de tick entre deux paquets', () => {
    const meta = farmer(1);
    const session = newFarmSession();
    let seconds = 0;
    for (let i = 0; i < 100; i++) seconds += farm(meta, session, 0.15, 7).seconds;
    expect(seconds).toBeCloseTo(15, 9);
  });

  it('suit bestChapter quand il monte en cours de session', () => {
    const meta = farmer(1);
    const session = newFarmSession();
    farm(meta, session, 60, 7);
    expect(session.run!.chapter).toBe(1);
    meta.bestChapter = 2;
    farm(meta, session, 60, 7);
    expect(session.run!.chapter).toBe(2);
  });
});
```

- [ ] **Étape 2 : lancer, ils doivent échouer**

Run: `npx vitest run src/sim/farm.test.ts`
Expected: FAIL — `Cannot find module './farm'`.

- [ ] **Étape 3 : implémenter `src/sim/farm.ts`**

```ts
import { SALLES_PER_CHAPTER, TICK_S } from './config';
import { steerWithTerrain } from './autopilot';
import { applyRunReward } from './meta';
import { startRun, syncRunStats, tick } from './sim';
import type { ChestKind, MetaState, RunState } from './types';

/**
 * La descente que le farm a en cours, et ce qu'il n'a pas encore consommé.
 * Vit ENTRE deux appels : sans elle, chaque appel repartirait en salle 1, et
 * l'AUTO — qui appelle par petits paquets — ne verrait jamais que des salles 1
 * quand le hors-ligne enchaîne les dix. Comme le revenu croît en
 * `1,13^(salle−1)`, les deux faces du farm paieraient des tarifs très
 * différents. Jamais sauvegardée : fermer l'app en plein farm équivaut à
 * abandonner la descente, comme en jeu piloté.
 */
export interface FarmSession {
  run: RunState | null;
  /** Le chapitre de `run`. Sert à repartir quand `bestChapter` a monté. */
  chapter: number;
  /** Secondes reçues mais pas encore converties en ticks. La simulation avance
   *  par pas de 100 ms ; à un taux de 15 %, un paquet d'une seconde vaut un tick
   *  et demi, et tronquer à chaque paquet perdrait un tiers du farm sans que
   *  rien ne le signale. */
  carry: number;
}

export function newFarmSession(): FarmSession {
  return { run: null, chapter: 0, carry: 0 };
}

export interface FarmReport {
  /** Temps de jeu réellement simulé, en secondes. */
  seconds: number;
  credits: number;
  /** Toujours 0 : les gemmes ne tombent que du boss, que le farm ne combat pas. */
  gems: number;
  chests: Record<ChestKind, number>;
  salles: number;
  runs: number;
  chapter: number;
}

function emptyReport(chapter: number): FarmReport {
  return {
    seconds: 0, credits: 0, gems: 0,
    chests: { bronze: 0, arene: 0, mythique: 0 },
    salles: 0, runs: 0, chapter,
  };
}

/** Ouvre la descente suivante. La graine continue le flux de la précédente —
 *  `seed` n'ouvre que la toute première de la session. Sans cette continuité,
 *  découper le même temps en paquets différents produirait des descentes
 *  différentes, et le test « N paquets valent un gros paquet » serait faux. */
function reopen(meta: MetaState, session: FarmSession, seed: number): void {
  session.run = startRun(meta, meta.bestChapter, session.run ? session.run.rngState : seed);
  session.chapter = meta.bestChapter;
}

/**
 * Fait avancer le farm de `seconds` de jeu et applique au méta ce qu'il produit.
 *
 * **Le farm s'arrête salle 9.** Dès que la descente atteint la salle du boss,
 * elle est abandonnée et une autre s'ouvre. `applyRunReward` ne fait monter
 * `bestChapter` que sur `reward.boss` : un farm qui ne bat jamais de boss ne
 * peut pas déclencher ce `Math.max`, quoi qu'il arrive. Le critère du jalon —
 * « l'AUTO ne franchit jamais une salle non validée » — cesse d'être une
 * convention à tenir pour devenir une propriété du code.
 *
 * La règle vit ICI et non dans `tick()` : le jeu piloté garde son boss.
 */
export function farm(
  meta: MetaState,
  session: FarmSession,
  seconds: number,
  seed: number,
): FarmReport {
  const report = emptyReport(meta.bestChapter);
  if (meta.bestChapter < 1 || !(seconds > 0)) return report;

  const available = session.carry + seconds;
  const ticks = Math.floor(available / TICK_S);
  session.carry = available - ticks * TICK_S;
  if (ticks === 0) return report;
  report.seconds = ticks * TICK_S;

  if (session.run === null || session.chapter !== meta.bestChapter) {
    reopen(meta, session, seed);
    report.runs++;
  }

  for (let i = 0; i < ticks; i++) {
    const run = session.run!;
    const reward = tick(run, { steer: steerWithTerrain(run) });
    if (reward) {
      applyRunReward(meta, reward);
      report.credits += reward.credits;
      report.gems += reward.gems;
      for (const kind of reward.chests) report.chests[kind]++;
      report.salles++;
      // Les pièces prennent effet dans la seconde, comme en jeu piloté.
      syncRunStats(run, meta);
    }
    // Salle du boss atteinte, ou descente close : on en ouvre une autre.
    if (run.salle >= SALLES_PER_CHAPTER || run.phase !== 'fighting') {
      reopen(meta, session, seed);
      report.runs++;
    }
  }
  return report;
}
```

- [ ] **Étape 4 : lancer, ils doivent passer**

Run: `npx vitest run src/sim/farm.test.ts` — Expected: 9 PASS.

- [ ] **Étape 5 : VÉRIFIER LES TESTS PAR MUTATION**

Un test qui prouve un mécanisme doit rougir quand on retire le mécanisme. Ce projet a attrapé
six tests menteurs par ce moyen. Faire les quatre mutations **une à une**, relancer, **remettre
le code d'origine** après chacune :

| Mutation | Doit faire rougir |
|---|---|
| remplacer `run.salle >= SALLES_PER_CHAPTER \|\| run.phase !== 'fighting'` par `run.phase !== 'fighting'` | « ne fait jamais monter bestChapter », « n'atteint jamais la salle du boss », « ne rapporte aucune gemme » |
| dans `reopen`, remplacer `session.run ? session.run.rngState : seed` par `seed` | « N petits paquets valent un gros paquet » |
| remplacer `session.carry = available - ticks * TICK_S` par `session.carry = 0` | « ne perd pas les fractions de tick » |
| retirer `\|\| session.chapter !== meta.bestChapter` | « suit bestChapter quand il monte » |

Si une mutation **ne** fait **pas** rougir son test, le test est menteur : le corriger avant
de continuer. Noter dans le message de commit ce que chaque mutation a confirmé.

- [ ] **Étape 6 : la calibration n'a pas bougé**

Run: `npm run calibrate` — Expected: étalon intact (cette tâche ne touche pas au harnais,
c'est une vérification de non-régression).
Run: `npm run test` && `npm run build` — Expected: tout vert.

- [ ] **Étape 7 : commit**

```bash
git add src/sim/farm.ts src/sim/farm.test.ts
git status --short
git commit -m "feat(sim): le farm, mécanisme unique de l'AUTO et du hors-ligne

farm(meta, session, secondes, graine) fait avancer une descente et applique
au méta ce qu'elle produit. Le hors-ligne l'appelle une fois avec une longue
durée, l'AUTO en continu avec de petits paquets — la FarmSession est ce qui
rend « un seul mécanisme » vrai plutôt qu'annoncé.

LE FARM S'ARRÊTE SALLE 9. applyRunReward ne fait monter bestChapter que sur
reward.boss : un farm qui ne bat jamais de boss ne peut pas déclencher ce
Math.max. Le critère du jalon cesse d'être une convention pour devenir une
propriété du code. Corollaire voulu : le farm ne rapporte aucune gemme, ni
Arène garanti, ni Mythique — tous du butin de boss.

Les quatre tests sont vérifiés par mutation, pas seulement écrits.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Task 4 : `offlineSeconds()` — la politique de temps

**Files:**
- Modify: `src/sim/farm.ts` (ajouter la fonction)
- Modify: `src/sim/farm.test.ts` (ajouter le bloc de tests)

**Interfaces:**
- Consomme : `OFFLINE` (tâche 2)
- Produit : `offlineSeconds(absenceSeconds: number): number` — consommé par la tâche 6

- [ ] **Étape 1 : écrire les tests**

```ts
import { offlineSeconds } from './farm';
import { OFFLINE } from './config';

describe('offlineSeconds', () => {
  const H = 3600;

  it('ignore une absence trop courte', () => {
    expect(offlineSeconds(OFFLINE.minSeconds - 1)).toBe(0);
  });

  it('ignore une absence nulle ou négative (horloge reculée)', () => {
    expect(offlineSeconds(0)).toBe(0);
    expect(offlineSeconds(-5000)).toBe(0);
  });

  it('applique le taux au temps d’absence', () => {
    expect(offlineSeconds(H)).toBeCloseTo(H * OFFLINE.rate, 6);
  });

  it('plafonne l’absence avant d’appliquer le taux', () => {
    const plafond = OFFLINE.capHours * H;
    expect(offlineSeconds(plafond * 3)).toBeCloseTo(plafond * OFFLINE.rate * OFFLINE.winbackMult, 6);
  });

  it('rapporte strictement moins qu’une minute jouée', () => {
    // Le pilier : l'actif paie mieux à la minute, bonus de retour compris.
    expect(offlineSeconds(60)).toBeLessThan(60);
  });

  it('accorde le bonus de retour au-delà du seuil, pas en deçà', () => {
    const seuil = OFFLINE.winbackAfterHours * H;
    const plafond = OFFLINE.capHours * H;
    const juste = offlineSeconds(seuil);
    const avant = offlineSeconds(seuil - 1);
    expect(juste).toBeCloseTo(plafond * OFFLINE.rate * OFFLINE.winbackMult, 6);
    expect(avant).toBeCloseTo(plafond * OFFLINE.rate, 6);
    expect(juste).toBeGreaterThan(avant);
  });
});
```

Le dernier test suppose `winbackAfterHours > capHours` (12 > 4) — vrai avec les valeurs de la
tâche 2. Si la tâche 10 les change, ce test doit être relu.

- [ ] **Étape 2 : lancer, ils doivent échouer**

Run: `npx vitest run src/sim/farm.test.ts -t offlineSeconds`
Expected: FAIL — `offlineSeconds is not a function`.

- [ ] **Étape 3 : implémenter**

À ajouter dans `src/sim/farm.ts`, avec `OFFLINE` dans l'import de `./config` :

```ts
/**
 * Secondes de JEU à simuler pour une absence donnée. Le taux s'applique au
 * temps, jamais aux gains : un seul chiffre gouverne crédits, gemmes et coffres
 * à la fois, sans règle d'arrondi à inventer pour chacun.
 *
 * Le plafond porte sur l'ABSENCE, pas sur le temps simulé — 4 h d'absence à
 * 20 % valent 48 min de jeu, et une absence de trois jours vaut la même chose,
 * bonus de retour en plus.
 *
 * Une absence négative (horloge système reculée) vaut zéro plutôt qu'un gain
 * négatif : le méta est écrit par une couche qu'on ne contrôle pas.
 */
export function offlineSeconds(absenceSeconds: number): number {
  if (!(absenceSeconds >= OFFLINE.minSeconds)) return 0;
  const capped = Math.min(absenceSeconds, OFFLINE.capHours * 3600);
  const bonus = absenceSeconds >= OFFLINE.winbackAfterHours * 3600 ? OFFLINE.winbackMult : 1;
  return capped * OFFLINE.rate * bonus;
}
```

- [ ] **Étape 4 : lancer**

Run: `npx vitest run src/sim/farm.test.ts` — Expected: tout PASS.

- [ ] **Étape 5 : vérifier par mutation**

| Mutation | Doit faire rougir |
|---|---|
| retirer `Math.min(…, OFFLINE.capHours * 3600)` | « plafonne l'absence avant d'appliquer le taux » |
| remplacer `bonus` par `1` | « accorde le bonus de retour au-delà du seuil » |
| remplacer la garde par `if (absenceSeconds <= 0)` | « ignore une absence trop courte » |

- [ ] **Étape 6 : commit**

```bash
git add src/sim/farm.ts src/sim/farm.test.ts
git status --short
git commit -m "feat(sim): la politique de temps du hors-ligne

offlineSeconds convertit une absence en secondes de jeu à simuler : plafond
sur l'absence, puis taux, puis bonus de retour au-delà du seuil. Le taux
s'applique au TEMPS et non aux gains, donc un seul chiffre gouverne crédits,
gemmes et coffres.

Une absence négative — horloge système reculée — vaut zéro : le méta est
écrit par une couche qu'on ne contrôle pas.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Task 5 : `lastSeenAt` et le schéma de sauvegarde 6

**Files:**
- Modify: `src/sim/types.ts` (`MetaState.lastSeenAt`)
- Modify: `src/sim/meta.ts` (`createInitialMeta`)
- Modify: `src/sim/save.ts` (`SAVE_SCHEMA`, `hydrate`, `isComplete`)
- Modify: `src/sim/save.test.ts`

**Interfaces:**
- Produit : `MetaState.lastSeenAt: number` — consommé par la tâche 6

- [ ] **Étape 1 : écrire les tests**

Ajouter à `src/sim/save.test.ts` :

```ts
it('migre un blob du schéma 5 en posant lastSeenAt à 0', () => {
  const v5 = JSON.parse(serializeMeta(createInitialMeta(1)));
  v5.v = 5;
  delete v5.meta.lastSeenAt;
  const meta = deserializeMeta(JSON.stringify(v5));
  expect(meta).not.toBeNull();
  expect(meta!.lastSeenAt).toBe(0);
});

it('normalise un lastSeenAt absurde', () => {
  const blob = JSON.parse(serializeMeta(createInitialMeta(1)));
  blob.v = 5;                      // schéma antérieur : hydrate normalise
  blob.meta.lastSeenAt = -42.7;
  expect(deserializeMeta(JSON.stringify(blob))!.lastSeenAt).toBe(0);
});

it('refuse un blob courant sans lastSeenAt', () => {
  const blob = JSON.parse(serializeMeta(createInitialMeta(1)));
  delete blob.meta.lastSeenAt;     // schéma COURANT amputé : isComplete refuse
  expect(deserializeMeta(JSON.stringify(blob))).toBeNull();
});

it('conserve un lastSeenAt valide', () => {
  const meta = createInitialMeta(1);
  meta.lastSeenAt = 1_700_000_000_000;
  expect(deserializeMeta(serializeMeta(meta))!.lastSeenAt).toBe(1_700_000_000_000);
});
```

- [ ] **Étape 2 : lancer, ils doivent échouer**

Run: `npx vitest run src/sim/save.test.ts` — Expected: FAIL.

- [ ] **Étape 3 : implémenter**

`src/sim/types.ts`, dans `MetaState`, après `bestChapter` :

```ts
  /** Dernier instant où le joueur a été vu, en millisecondes epoch ; 0 tant
   *  qu'il ne l'a jamais été. Écrit par `src/storage/`, JAMAIS par `src/sim/`,
   *  qui n'a pas le droit de lire `Date` — même discipline que `rngState` : la
   *  donnée vit dans le méta, la source vit dehors. */
  lastSeenAt: number;
```

`src/sim/meta.ts`, dans `createInitialMeta`, après `bestChapter: 0,` :

```ts
    lastSeenAt: 0,
```

`src/sim/save.ts` : passer `SAVE_SCHEMA` à `6` et compléter son commentaire ; dans `hydrate`,
après `bestChapter` :

```ts
    // Migration 5 → 6 : un blob antérieur est un méta auquel il manque le champ.
    // Normalisé comme bestChapter : un horodatage négatif ou fractionnaire
    // produirait une absence absurde, donc des gains hors-ligne absurdes.
    lastSeenAt: typeof partial.lastSeenAt === 'number'
      ? Math.max(0, Math.trunc(partial.lastSeenAt))
      : 0,
```

et dans `isComplete`, à côté de `bestChapter` :

```ts
    typeof m.lastSeenAt === 'number' &&
```

- [ ] **Étape 4 : lancer**

Run: `npx vitest run src/sim/save.test.ts` — Expected: PASS.
Run: `npm run test` — Expected: tout vert. Les tests existants qui construisent un méta à la
main peuvent échouer si `isComplete` exige désormais `lastSeenAt` : les corriger, c'est le
signal attendu.

- [ ] **Étape 5 : vérifier par mutation**

| Mutation | Doit faire rougir |
|---|---|
| retirer `Math.max(0, Math.trunc(...))` | « normalise un lastSeenAt absurde » |
| retirer la ligne de `isComplete` | « refuse un blob courant sans lastSeenAt » |

- [ ] **Étape 6 : `scripts/verrou.mjs` injecte un blob en schéma 5**

Le harnais construit un blob `v: 5` sans `lastSeenAt`. Cela reste **fonctionnellement
correct** — il traverse la branche « schéma antérieur » et `hydrate` comble le champ — donc
aucune correction n'est requise. Vérifier que le harnais passe toujours :

Run: `npm run dev -- --port 41973 --strictPort` (dans un terminal), puis
`PORT=41973 npm run verrou`
Expected: 10 ✓, « Verrou vérifié de bout en bout ».

- [ ] **Étape 7 : commit**

```bash
git add src/sim/types.ts src/sim/meta.ts src/sim/save.ts src/sim/save.test.ts
git status --short
git commit -m "feat(save): le méta retient quand le joueur a été vu — schéma 6

lastSeenAt, en millisecondes epoch, écrit par src/storage/ et jamais par
src/sim/, qui n'a pas le droit de lire Date. Même discipline que rngState :
la donnée vit dans le méta, la source vit dehors.

Normalisé à l'hydratation comme bestChapter l'a été au lot A — un
horodatage négatif ou fractionnaire produirait une absence absurde, donc des
gains hors-ligne absurdes, sur une donnée qu'on ne contrôle pas.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Task 6 : L'AUTO — décor de fond et paquets de farm

**Files:**
- Modify: `src/storage/localSave.ts` (horodatage à l'écriture, absence à la lecture)
- Modify: `src/ui/App.tsx` (deux états, décor, paquets)

**Interfaces:**
- Consomme : `farm`, `newFarmSession`, `offlineSeconds` (tâches 3-4) ; `MetaState.lastSeenAt`
  (tâche 5)
- Produit : `loadMeta()` retourne en plus `absenceSeconds: number` — consommé par la tâche 7

- [ ] **Étape 1 : l'horodatage dans `localSave.ts`**

C'est **ici** que `Date` est lu, jamais dans `src/sim/`.

```ts
/** Écrit le méta en y estampillant l'instant présent. C'est le seul endroit du
 *  projet où l'horloge entre dans le méta. */
function write(meta: MetaState): void {
  try {
    localStorage.setItem(KEY, serializeMeta({ ...meta, lastSeenAt: Date.now() }));
  } catch {
    // Stockage indisponible (navigation privée, quota) : la partie continue.
  }
}
```

Et dans `loadMeta`, calculer l'absence à partir de ce qui a été chargé. La signature devient :

```ts
export function loadMeta(): { meta: MetaState; recovered: boolean; absenceSeconds: number }
```

avec, pour chaque retour :

```ts
// Une horloge reculée depuis la dernière écriture donnerait une absence
// négative : elle vaut zéro, comme une absence qui n'a pas eu lieu.
const absenceSeconds = meta.lastSeenAt === 0
  ? 0
  : Math.max(0, (Date.now() - meta.lastSeenAt) / 1000);
```

Les retours « pas de sauvegarde » et « sauvegarde illisible » rendent `absenceSeconds: 0`.

- [ ] **Étape 2 : les deux états dans `App.tsx`**

Aujourd'hui `runRef.current` est toujours une partie. Introduire l'état explicite :

```ts
// Deux états distincts, et une seule bascule entre eux : lancer une descente
// entre en partie pilotée, la fin de descente en sort. Hors partie, une
// descente tourne en DÉCOR — l'autopilote la pilote, elle ne crédite rien, et
// elle ne franchit jamais la salle du boss (c'est `farm` qui décide, pas elle).
const [playing, setPlaying] = useState(false);
```

Le run initial n'est plus une partie : au chargement, `playing` vaut `false` et le run sert de
décor. Le bouton « Nouvelle descente » de `CombatScreen` passe `playing` à `true` ; l'atteinte
de `phase !== 'fighting'` le repasse à `false`.

Le décor n'existe que si `metaRef.current.bestChapter >= 1` — même condition que le
hors-ligne. En dessous, l'écran de combat propose de lancer une descente, sans décor.

- [ ] **Étape 3 : le pilotage du décor**

Dans le `steer` passé à `useGameLoop` : quand `playing` est faux, la source est l'autopilote.

```ts
// Le doigt pilote la partie ; l'autopilote pilote le décor. Le décor ne
// crédite rien : ses récompenses ne sont pas appliquées au méta, c'est `farm`
// qui paie (voir le paquet ci-dessous).
const steerFor = (run: RunState) => (playing ? steerRef.current : steerWithTerrain(run));
```

**Le décor ne doit pas créditer, et `useGameLoop` crédite** : il appelle `applyRunReward` sur
le méta qu'on lui donne. Ne pas modifier `useGameLoop` — lui donner un **autre méta**.

```ts
// Le décor tourne sur un méta jetable, cloné une fois au montage : useGameLoop
// y applique ses récompenses, et elles sont jetées avec lui. La vraie monnaie
// vient de `farm`. Un clone plutôt qu'un drapeau dans useGameLoop : la boucle
// de jeu n'a pas à connaître l'existence d'un décor.
const decorMetaRef = useRef(structuredClone(metaRef.current));
```

et, dans l'appel de la boucle, `playing ? metaRef : decorMetaRef`. Le décor ne verra pas les
améliorations achetées pendant qu'il tourne — écart purement cosmétique sur un décor, et le
prix à payer pour que la boucle de jeu reste ignorante du décor.

- [ ] **Étape 4 : les paquets de farm**

**Mesurer le temps réellement écoulé, jamais le supposer.** Un `setInterval(…, 1000)` ne tient
pas sa cadence quand l'onglet passe en arrière-plan : les navigateurs la ralentissent
fortement. Un paquet qui suppose 1000 ms perdrait donc du temps de farm exactement quand le
joueur regarde ailleurs — le cas le plus fréquent.

```ts
// La cadence n'a aucun effet sur les gains (`farm.test.ts` le tient) : c'est
// l'horloge qui décide combien de jeu chaque paquet vaut, pas l'intervalle.
// Sans cette lecture, un onglet en arrière-plan — dont le navigateur ralentit
// les minuteries — farmerait moins qu'un onglet au premier plan.
useEffect(() => {
  if (playing || metaRef.current.bestChapter < 1) return;
  lastPacketRef.current = Date.now();
  const id = setInterval(() => {
    const now = Date.now();
    const elapsed = Math.max(0, (now - lastPacketRef.current) / 1000);
    lastPacketRef.current = now;
    const r = farm(metaRef.current, farmSessionRef.current, elapsed * OFFLINE.rate, farmSeedRef.current);
    if (r.salles > 0) metaChanged();
  }, 1000);
  return () => clearInterval(id);
}, [playing]);
```

`Date.now()` est lu **ici**, dans `src/ui/`, jamais dans `src/sim/` : `farm` ne reçoit qu'un
nombre de secondes. La graine du premier run de la session est tirée une fois au montage.

**Un cas à trancher à l'implémentation** : quand `playing` passe à `true`, l'effet se démonte
et le farm s'arrête — c'est voulu, on ne farme pas en pilotant. Mais le temps écoulé pendant
la partie ne doit pas être crédité d'un coup au retour au décor : `lastPacketRef` est donc
réinitialisé au montage de l'effet (première ligne ci-dessus), et non au démontage.

- [ ] **Étape 5 : vérifier en navigateur, MOI-MÊME, jamais par sous-agent**

```bash
npm run dev -- --port 41973 --strictPort
```

Vérifier d'abord **le contenu servi** (`curl` sur un symbole propre à la branche, par exemple
`curl -s http://localhost:41973/spinforge/src/sim/farm.ts | head -3`), puis ouvrir
`http://localhost:41973/spinforge/` — la racine renvoie 404.

À voir de mes yeux :
- le décor tourne en fond, y compris sur les onglets Forge et Coffres ;
- lancer une descente interrompt le décor et rend le pilotage au doigt ;
- le décor ne montre **jamais** la salle 10 ;
- les crédits montent pendant que le décor tourne, sans que le décor les crédite lui-même ;
- `bestChapter` ne monte jamais tant qu'on ne pilote pas.

Pour observer une descente entière sans attendre, accélérer l'horloge de la page comme le fait
`scripts/verrou.mjs` — piloter depuis la page sur l'horloge simulée, jamais depuis Node.

- [ ] **Étape 6 : tests, build, harnais**

Run: `npm run test` && `npm run build` — Expected: vert.
Run: `PORT=41973 npm run verrou` — Expected: 10 ✓.
Run: `npm run calibrate` — Expected: étalon intact.

- [ ] **Étape 7 : commit**

```bash
git add src/storage/localSave.ts src/ui/App.tsx
git status --short
git commit -m "feat(ui): l'AUTO tourne en fond, et le farm paie

Deux états distincts remplacent le run permanent : partie pilotée (le doigt
pilote, le boss est atteignable, les gains sont pleins) et décor AUTO
(l'autopilote pilote, la salle 10 n'est jamais jouée, rien n'est crédité).
Une seule bascule entre les deux.

Le décor est libre et ne crédite rien ; le crédit vient de farm(), appelée
par paquets sur une session continue. Fermer l'app ou la laisser ouverte
rapporte donc exactement la même chose par minute — aucune stratégie à
optimiser contre le jeu.

localStorage estampille lastSeenAt à l'écriture : c'est le seul endroit du
projet où l'horloge entre dans le méta.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Task 7 : L'écran « Pendant ton absence »

**Files:**
- Create: `src/ui/AbsenceScreen.tsx`
- Modify: `src/ui/App.tsx` (ouverture au chargement)
- Modify: `src/i18n/fr.ts`, `src/i18n/en.ts`

**Interfaces:**
- Consomme : `FarmReport` (tâche 3), `offlineSeconds` (tâche 4), `absenceSeconds` (tâche 6)

- [ ] **Étape 1 : les clés bilingues**

`src/i18n/fr.ts` — `fr.ts` fait foi :

```ts
  'absence.title': 'Pendant ton absence',
  'absence.duration': '{h} de farm — {chapter}',
  'absence.credits': '+{n} crédits',
  'absence.chests': '+{n} coffres',
  'absence.salles': '{n} salles vidées',
  'absence.winback': 'Bonus de retour ×{mult}',
  'absence.claim': 'Réclamer',
```

`src/i18n/en.ts` — les mêmes clés, sans quoi le build casse :

```ts
  'absence.title': 'While you were away',
  'absence.duration': '{h} of farming — {chapter}',
  'absence.credits': '+{n} credits',
  'absence.chests': '+{n} chests',
  'absence.salles': '{n} rooms cleared',
  'absence.winback': 'Comeback bonus ×{mult}',
  'absence.claim': 'Claim',
```

Vérifier si le catalogue a une forme plurielle (`tn`) pour « coffres » et « salles » ; s'il en
a une, suivre la convention existante plutôt que ces clés simples.

- [ ] **Étape 2 : l'écran**

Voile plein écran par-dessus le reste, dans l'esprit du voile de fin de descente de
`CombatScreen.tsx` — le relire et reprendre ses valeurs de style plutôt que d'en inventer.
Contenu : titre, durée d'absence prise en compte et chapitre farmé, crédits, coffres, salles,
la ligne de bonus **seulement s'il s'est appliqué**, un bouton « Réclamer ».

Pas de ×2, pas de publicité : il n'y en aura pas dans ce jeu.

- [ ] **Étape 3 : l'ouverture au chargement**

Dans `App.tsx`, au montage : si `absenceSeconds` donne `offlineSeconds(absenceSeconds) > 0`
et que `bestChapter >= 1`, appeler `farm` une fois avec cette durée sur une session neuve,
garder le rapport dans un état, afficher l'écran. Le bouton « Réclamer » le referme —
`farm` a déjà appliqué les gains au méta, le bouton n'applique rien.

- [ ] **Étape 4 : vérifier en navigateur, moi-même**

Fabriquer une absence sans attendre : dans la console de la page, reculer `lastSeenAt` de la
sauvegarde puis recharger.

```js
const s = JSON.parse(localStorage.getItem('spinforge.save'));
s.meta.lastSeenAt = Date.now() - 5 * 3600 * 1000;   // 5 h
localStorage.setItem('spinforge.save', JSON.stringify(s));
location.reload();
```

À voir : l'écran s'ouvre, la durée affichée est **plafonnée à 4 h** et non 5 ; les crédits
annoncés correspondent à ceux réellement ajoutés ; « Réclamer » referme ; recharger aussitôt
ne rouvre pas l'écran (l'absence est redevenue nulle). Refaire avec 13 h pour voir la ligne de
bonus. **Vérifier les deux langues** au sélecteur de l'en-tête.

- [ ] **Étape 5 : tests, build**

Run: `npm run test` — Expected: vert, y compris `src/i18n/catalog.test.ts` et le test de
parité FR/EN.
Run: `npm run build` — Expected: aucune erreur.

- [ ] **Étape 6 : commit**

```bash
git add src/ui/AbsenceScreen.tsx src/ui/App.tsx src/i18n/fr.ts src/i18n/en.ts
git status --short
git commit -m "feat(ui): l'écran « Pendant ton absence »

Au retour, ce que le farm a produit pendant que l'app était fermée : durée
prise en compte, chapitre farmé, crédits, coffres, salles, et la ligne de
bonus de retour quand elle s'applique. Un seul bouton.

Pas de ×2 et pas de publicité — il n'y en aura pas dans ce jeu, décision
consignée dans la spec du lot et répercutée dans docs/game-design.md.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Task 8 : Les documents de référence

**Files:**
- Modify: `docs/game-design.md` (trois corrections)
- Modify: `docs/ameliorations.md` (deux demandes consignées)

- [ ] **Étape 1 : `docs/game-design.md`**

1. **Hors-ligne** — retirer « Écran « Pendant ton absence » au retour, ×2 contre pub
   récompensée ou gemmes. Pubs toujours optionnelles (×2 gains 15 min, coffre gratuit, relance
   de boss). » et le remplacer par une phrase sans publicité, en notant la décision.
2. **Stack technique** — remplacer « le hors-ligne = fast-forward de ticks (formule fermée
   au-delà d'1 h) » par « le hors-ligne = fast-forward de ticks », avec la mesure qui l'a
   tranché (4 h = 136 ms).
3. **Piliers** — « l'AUTO (débloqué au chapitre 3) » devient « dès le premier chapitre
   validé », même condition que le hors-ligne.

Chercher toute autre occurrence avant de conclure :

```bash
grep -rn "pub\|formule fermée\|chapitre 3" docs/game-design.md
```

- [ ] **Étape 2 : `docs/ameliorations.md`**

Ajouter une section datée pour la session, avec les deux demandes formulées en brainstorming
et laissées hors du lot B, **et la raison** :

- le verrou d'amélioration pendant une partie pilotée — hors lot parce que le harnais améliore
  entre deux salles, et que l'interdire déplacerait les huit garde-fous au moment précis où ils
  servent d'étalon ;
- des récompenses de progression par niveau — voisin des quêtes du lot C.

Noter aussi la **décision retirée** : « la difficulté doit scaler avec le niveau du joueur »,
demandée puis annulée par son auteur au profit d'une difficulté fixe par salle et par
chapitre — qui est le comportement actuel. Une décision retirée qu'on ne note pas est une
décision qui revient.

- [ ] **Étape 3 : commit**

```bash
git add docs/game-design.md docs/ameliorations.md
git status --short
git commit -m "docs: la publicité sort du jeu, la formule fermée sort de la stack

Trois corrections à la spec de référence, décidées en brainstorming :
il n'y aura pas de publicité dans ce jeu ; le hors-ligne rejoue de vrais
ticks sur toute la durée (4 h mesurées à 136 ms, la formule fermée achetait
des millisecondes contre une approximation) ; l'AUTO est disponible dès le
premier chapitre validé et non au chapitre 3, même condition que le
hors-ligne.

Consigne aussi les deux demandes laissées hors du lot, et une décision
retirée par son auteur — la difficulté reste fixe par salle et par chapitre.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Task 9 : La dette de performance du jalon 1.5 — mesurer d'abord

**Files:**
- Modify: `src/render/arena.ts` (**seulement** ce que la mesure désigne)
- Modify: `docs/roadmap.md` (la mesure, quel qu'en soit le verdict)

L'ordre est **mesurer, nommer le coupable par la mesure, corriger, remesurer**. Jamais
corriger un suspect nommé sans l'avoir vu coupable. Les deux suspects de la roadmap — texture
du sol régénérée à chaque pixel de redimensionnement, porte retracée en `Graphics` à chaque
image — sont des hypothèses de 2026-08-25 qu'aucune mesure récente n'a confirmées, et la
refonte graphique a beaucoup alourdi le rendu depuis.

- [ ] **Étape 1 : remesurer, avec le décor AUTO qui tourne**

Sonde de temps par image sous throttling processeur ×4, comme la mesure d'origine. **La sonde
vit dans le scratchpad de session, jamais dans le dépôt** — c'est exactement ce qu'un
`git add -A` a ramassé sur `main` au lot précédent. Relever médiane et p90, à comparer à
« médiane 58,8 images/s, p90 25,5 ms ».

Mesurer dans les deux situations, qui n'ont pas la même charge : décor AUTO en fond sur
l'onglet Forge, et partie pilotée en salle 9 avec trois bots.

- [ ] **Étape 2 : nommer le coupable**

Profiler plutôt que deviner : désactiver un suspect à la fois et remesurer. Si aucun des deux
suspects n'explique la queue, **le dire** — un suspect innocenté est un résultat, et la
roadmap doit le porter.

- [ ] **Étape 3 : corriger ce qui est coupable, et rien d'autre**

Si la texture du sol est coupable, débouncer sa régénération. Si la porte est coupable, la
convertir en sprite teinté. Si autre chose l'est, corriger cela.

- [ ] **Étape 4 : remesurer et consigner**

Run: `npm run test` && `npm run build` — Expected: vert.
Écrire dans `docs/roadmap.md` la mesure avant, le coupable, la correction, la mesure après.

- [ ] **Étape 5 : commit**

```bash
git status --short   # AUCUNE sonde ne doit apparaître
git add src/render/arena.ts docs/roadmap.md
git commit -m "perf(render): [le coupable, nommé par la mesure]

Mesure avant : [médiane, p90]. Après : [médiane, p90].

[Ce que les deux suspects de la roadmap ont réellement coûté — y compris
« rien », si c'est ce que la mesure dit.]

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Task 10 : Calibrer le taux idle — sa propre passe, son propre commit

**Files:**
- Modify: `src/content/balance.json` (**uniquement** le bloc `offline`)
- Modify: `docs/roadmap.md` (section « Lot B »)

**Jamais le combat et l'économie dans la même passe ni le même commit.** Cette passe ne touche
qu'`offline` — aucune autre constante, sous aucun prétexte.

- [ ] **Étape 1 : la question à mesurer**

Le taux gouverne un rapport : ce qu'une heure d'absence rapporte, comparé à ce qu'une heure
jouée rapporte. La cible tient en deux phrases de l'auteur du jeu : « significativement moins
qu'un joueur ingame » et « le joueur doit sentir qu'il progresse continuellement ».

Mesurer, pour plusieurs valeurs de `rate` : crédits par heure d'absence, coffres par retour de
4 h, et le rapport au revenu d'une heure de jeu piloté. Balayer aussi `winbackAfterHours` et
`winbackMult` — le bonus doit se remarquer sans rendre l'absence préférable à la présence.

- [ ] **Étape 2 : vérifier que les garde-fous n'ont pas bougé**

Run: `npm run calibrate`
Expected: étalon **intact**. Le bloc `offline` n'entre pas dans le harnais ; s'il déplaçait un
chiffre, c'est qu'il fuit là où il ne devrait pas — chercher la fuite avant de continuer.

- [ ] **Étape 3 : consigner et commiter**

Écrire dans `docs/roadmap.md` la section « Lot B » sur le modèle du lot A : ce qui est livré,
ce qui est mesuré, les valeurs retenues **et le palier d'où elles viennent**, les dettes
fermées et celles ouvertes — dont « le modèle du harnais de calibration », laissée sciemment
ouverte par ce lot (§ 2.3 de la spec).

```bash
git add src/content/balance.json docs/roadmap.md
git status --short
git commit -m "balance(offline): le taux du farm, mesuré

[valeurs retenues et le palier démontré d'où elles viennent]

Passe d'économie seule : aucune constante de combat n'est touchée. Les huit
garde-fous de npm run calibrate sont inchangés — le bloc offline n'entre pas
dans le harnais.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Task 11 : Relecture de la branche entière

Pas tâche par tâche : **la branche entière**. C'est là que sortent les constats les plus
graves — au lot A, c'est la revue de branche qui a trouvé que l'écran Toupies conseillait le
châssis exactement inverse entre deux descentes.

- [ ] **Étape 1 : lire la diff complète**

```bash
git diff origin/main...jalon-3-lot-b
```

Chercher en particulier :
- une chaîne joueur qui aurait échappé à `src/i18n/` ;
- un `Date` ou un `Math.random` qui aurait glissé dans `src/sim/` ;
- une constante d'équilibrage en dur hors de `balance.json` ;
- un chemin où le décor AUTO créditerait le méta ;
- un chemin où le farm pourrait atteindre la salle 10.

- [ ] **Étape 2 : les trois harnais, une dernière fois**

Run: `npm run test` · `npm run build` · `npm run calibrate` · `PORT=41973 npm run verrou`
Expected: tout vert, étalon intact.

- [ ] **Étape 3 : intégration contre un `main` qui a bougé**

`main` aura avancé — une autre session y produit beaucoup de commits. Fusionner `main` **dans**
la branche, dans le worktree, vérifier **là**, puis basculer `main` en avance rapide.

Et **chercher les NON-conflits** : à la dernière intégration, git a signalé onze conflits
triviaux et laissé passer quatre défauts où chaque côté était correct seul et faux ensemble.
Relire en particulier ce que `main` a pu changer dans `src/sim/sim.ts`, `src/ui/App.tsx`,
`src/i18n/` et `balance.json`.

---

## Self-review

**Couverture de la spec.** § 1 → tâches 1-8. § 2 (autopilote) → tâche 1. § 3 (farm, session,
graine, salle 9) → tâche 3. § 4 (temps, ticks, `lastSeenAt`, schéma 6) → tâches 4-5. § 5
(AUTO, deux états) → tâche 6. § 6 (écran) → tâche 7. § 7 (documents) → tâche 8. § 8.1
(mutations) → étapes de mutation des tâches 3, 4, 5. § 8.2 (garde-fous) → tâches 1, 3, 6, 10.
§ 8.3 (navigateur) → tâches 6, 7. § 8.4 (perf) → tâche 9. § 10 (calibration) → tâche 10.

**Cohérence des types.** `FarmSession { run, chapter, carry }` et
`FarmReport { seconds, credits, gems, chests, salles, runs, chapter }` sont définis en tâche 3
et utilisés sous ces noms exacts en tâches 4, 6 et 7. `offlineSeconds(absenceSeconds)` : même
nom en tâches 4 et 6. `loadMeta()` gagne `absenceSeconds` en tâche 6, consommé en tâche 7.
`OFFLINE` est défini en tâche 2 et consommé en tâches 4 et 6.

**Points laissés ouverts au jugement de l'exécutant, sciemment.** La forme exacte du littéral
`Shard` dans le test de la tâche 1 (lire le type d'abord) ; la présence ou non d'une forme
plurielle dans le catalogue i18n (tâche 7) ; la mise en page de l'écran d'absence, qui doit
reprendre le voile existant de `CombatScreen.tsx` plutôt qu'inventer ; le coupable de la
tâche 9, qui est le résultat d'une mesure et ne peut pas être écrit d'avance.
