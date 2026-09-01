# Jalon 3, lot A — la progression des chapitres : plan d'implémentation

> **Pour les exécutants agentiques :** SOUS-SKILL REQUISE — utiliser
> `superpowers:subagent-driven-development` (recommandé) ou `superpowers:executing-plans`
> pour exécuter ce plan tâche par tâche. Les étapes sont des cases à cocher (`- [ ]`).

**Goal :** le boss vaincu ferme la descente, le méta retient le meilleur chapitre validé,
et les chapitres 2 à 4 deviennent jouables — avec leur propre composition de types et leur
propre palier de difficulté et de revenu.

**Architecture :** une porte unique `startRun(meta, chapitre, graine)` remplace `createRun`,
`resetRun` et `equipPendingToupie` ; `RunState.phase` gagne `'won'` et `tick` ne relance plus
la salle 1 après le boss ; `MetaState.chapterValidated` devient `bestChapter: number`
(sauvegarde schéma 5) ; la difficulté et le revenu gagnent chacun un facteur géométrique par
chapitre, calibrés dans deux passes séparées.

**Tech Stack :** TypeScript strict, Vite, React 18, PixiJS, Vitest (imports explicites, pas
de globals), Playwright pour les harnais navigateur.

**Spec :** `docs/superpowers/specs/2026-08-31-jalon-3-lot-a-progression-chapitres-design.md`
— à lire en entier avant la tâche 1. Ce plan argumente depuis elle.

**Worktree :** `../B-Blades_versus-chapitres`, branche `jalon-3-lot-a`, partie de
`origin/main` (`23d3f64`). `npm install` déjà fait.

## Global Constraints

- **`src/sim/` est pur et déterministe** : aucun import de DOM, PixiJS, React, `Date` ou
  `Math.random`. Le RNG est sérialisé dans l'état (`rngState`), le temps avance uniquement
  par `tick()` à pas fixe de 100 ms.
- **Le rendu est un spectateur** : `src/render/` et `src/ui/` lisent l'état, ne le mutent
  jamais directement — toute mutation passe par `src/sim/`.
- **Tout chiffre d'équilibrage vit dans `src/content/balance.json`**, dont `src/sim/config.ts`
  est la porte unique. Jamais de constante d'équilibrage en dur ailleurs.
- **Pas de code mort, pas de code « au cas où ».** Une fonction sans appelant de production
  se supprime, sauf raison écrite.
- **Textes joueur en français, code et identifiants en anglais.**
- **Aucun nom officiel Beyblade** dans le code, les données ou l'interface.
- **Le partage de charge de `resolveCollision` est un acquis** : ne pas y toucher.
- **Le farm ne progresse jamais** — pilier qui prime sur tout chiffre.
- **Jamais le combat et l'économie dans la même passe de calibration ni le même commit.**
- **Chaque commit laisse `npm run test` et `npm run build` verts** (327 tests au départ) et
  le jeu jouable dans le navigateur.

## Structure des fichiers

| Fichier | Responsabilité après ce lot |
|---|---|
| `src/sim/types.ts` | `Phase` gagne `'won'` ; `RunReward` gagne `boss` et `chapter` ; `MetaState.chapterValidated` devient `bestChapter` |
| `src/sim/sim.ts` | `startRun` (porte unique du cycle de vie d'un run) + `maxPlayableChapter` ; `tick` pose `'won'` au boss |
| `src/sim/meta.ts` | `applyRunReward(meta, reward)` lit `reward.boss` et monte `bestChapter` par `Math.max` |
| `src/sim/economy.ts` | `salleReward(chapter, salle, boss, rng)` : porte le drapeau, le chapitre et le facteur de revenu par chapitre |
| `src/sim/salle.ts` | `makeBot` applique le facteur de difficulté par chapitre et pose `bot-{chapitre}-{salle}-{index}` |
| `src/sim/save.ts` | schéma 5 : migration `chapterValidated` → `bestChapter` dans `hydrate`, `isComplete` mise à jour |
| `src/sim/config.ts` | expose `MAX_CHAPTER` |
| `src/content/balance.json` | `chapter.maxChapter`, `botTypes` 2-4, `bot.scaling.{spin,attack}PerChapter`, `econ.rewardPerChapter` |
| `src/render/observer.ts` | perd `RenderEvents.chapterValidated` (faux et sans consommateur) |
| `src/ui/CombatScreen.tsx` | panneau « Choisis ta descente » quand `phase !== 'fighting'` |
| `src/ui/useGameLoop.ts` | perd le câblage du châssis (absorbé par `startRun`) |
| `src/ui/App.tsx` | ouvre la première descente par `startRun` |
| `src/ui/ToupiesScreen.tsx` | lit le chapitre du run au lieu de coder 1 en dur |
| `scripts/calibrate.mjs` | enchaîne les chapitres, rapporte par chapitre |
| `scripts/verrou.mjs` | schéma 5, nouvelle frontière de run |

---

### Task 1 : `RunReward` porte le drapeau du boss et son chapitre

**Files:**
- Modify: `src/sim/types.ts:61-67` (interface `RunReward`)
- Modify: `src/sim/economy.ts:11-30` (`salleReward`)
- Modify: `src/sim/sim.ts:198-210` (appel dans `tick`)
- Modify: `src/sim/meta.ts:34-39` (`applyRunReward`)
- Modify: `src/ui/useGameLoop.ts:52-60`
- Modify: `scripts/calibrate.mjs:161`
- Test: `src/sim/economy.test.ts`, `src/sim/meta.test.ts`, `src/sim/sim.test.ts`

**Interfaces:**
- Produces: `RunReward { credits: number; gems: number; chests: ChestKind[]; boss: boolean; chapter: number }` ·
  `salleReward(chapter: number, salle: number, boss: boolean, rngState: number): { reward: RunReward; rngState: number }` ·
  `applyRunReward(meta: MetaState, reward: RunReward): void`

- [ ] **Step 1 : écrire le test qui échoue** — dans `src/sim/economy.test.ts`, ajouter
      `SALLES_PER_CHAPTER` à l'import depuis `./config`, puis ce test à la fin du
      `describe('salleReward — butin')` :

```ts
  it('porte le drapeau du boss et son chapitre', () => {
    const ordinaire = salleReward(1, 4, false, 1).reward;
    expect(ordinaire.boss).toBe(false);
    expect(ordinaire.chapter).toBe(1);
    const boss = salleReward(3, SALLES_PER_CHAPTER, true, 1).reward;
    expect(boss.boss).toBe(true);
    expect(boss.chapter).toBe(3);
  });
```

- [ ] **Step 2 : lancer le test, vérifier qu'il échoue**

Run : `npx vitest run src/sim/economy.test.ts`
Attendu : ÉCHEC — TypeScript refuse le 4ᵉ argument et `boss`/`chapter` n'existent pas sur
`RunReward`.

- [ ] **Step 3 : `RunReward` gagne ses deux champs** dans `src/sim/types.ts` :

```ts
export interface RunReward {
  credits: number;
  gems: number;
  /** Coffres lâchés par la salle. Le premier est garanti, le second est l'extra
   *  quand il est tombé. */
  chests: ChestKind[];
  /** La salle vidée était le boss. Porté par la récompense pour que personne ne
   *  le redérive d'un numéro de salle — trois sites le faisaient, chacun à sa
   *  façon, et le troisième (`observer.ts`) était déjà mort-né. */
  boss: boolean;
  /** Le chapitre d'où vient cette récompense. Ici plutôt qu'en paramètre à part :
   *  un appelant ne peut pas se tromper de chapitre s'il ne le fournit pas. */
  chapter: number;
}
```

- [ ] **Step 4 : `salleReward` prend le chapitre et remplit les deux champs**
      (`src/sim/economy.ts`) :

```ts
export function salleReward(
  chapter: number,
  salle: number,
  boss: boolean,
  rngState: number,
): { reward: RunReward; rngState: number } {
  const base = ECON.rewardBase * Math.pow(ECON.rewardGrowth, salle - 1);
  const rule = boss ? LOOT.boss : LOOT.bySalle;
  const chests: ChestKind[] = [rule.chest];
  const r = nextRandom(rngState);
  const eligible = boss || salle >= LOOT.bySalle.fromSalle;
  if (eligible && r.value < rule.extraChance) chests.push(rule.extra);
  const reward: RunReward = boss
    ? { credits: base * ECON.bossRewardMult, gems: ECON.bossGems, chests, boss, chapter }
    : { credits: base, gems: 0, chests, boss, chapter };
  return { reward, rngState: r.state };
}
```

- [ ] **Step 5 : les appelants suivent.** `src/sim/sim.ts`, dans le bloc « salle vidée » :

```ts
    const rolled = salleReward(run.chapter, run.salle, boss, run.rngState);
```

`src/sim/meta.ts` :

```ts
/** Applique au méta ce qu'une salle vidée vient de produire. La récompense dit
 *  elle-même si elle vient du boss : plus aucun appelant ne le redérive. */
export function applyRunReward(meta: MetaState, reward: RunReward): void {
  applyReward(meta, reward);
  if (reward.boss) meta.chapterValidated = true;
}
```

`src/ui/useGameLoop.ts` — `applyRunReward` perd son 3ᵉ argument, et le câblage du châssis
lit désormais le drapeau (il disparaîtra en tâche 3) :

```ts
        const reward = tick(runRef.current, { steer: steerRef.current });
        if (reward) {
          applyRunReward(metaRef.current, reward);
          // Le boss vidé referme la descente : c'est la seule frontière, avec la
          // mort, où le châssis choisi entre-temps monte sur la toupie.
          if (reward.boss) equipPendingToupie(runRef.current, metaRef.current);
          h.onReward(reward);
        }
```

(la ligne `const salleBefore = runRef.current.salle;` disparaît.)

`scripts/calibrate.mjs:161` : `applyRunReward(meta, reward);` — la variable locale
`salleBefore` reste, elle sert encore aux durées de salle.

- [ ] **Step 6 : mettre à jour les appels existants dans les tests.**
      `src/sim/economy.test.ts` : chaque `salleReward(s, b, r)` devient `salleReward(1, s, b, r)`.
      `src/sim/sim.test.ts` : idem lignes 116, 156, 157 ; `applyRunReward(meta, reward, …)`
      devient `applyRunReward(meta, reward)` lignes 16, 101, 153.
      `src/sim/meta.test.ts` : les littéraux `RunReward` gagnent leurs deux champs, et les
      deux tests de `applyRunReward` deviennent :

```ts
describe('applyRunReward', () => {
  it('ne valide pas le chapitre sur une salle ordinaire', () => {
    const meta = createInitialMeta(1);
    applyRunReward(meta, { credits: 120, gems: 0, chests: [], boss: false, chapter: 1 });
    expect(meta.chapterValidated).toBe(false);
  });

  it('valide le chapitre quand la récompense vient du boss', () => {
    const meta = createInitialMeta(1);
    applyRunReward(meta, { credits: 1, gems: 40, chests: [], boss: true, chapter: 1 });
    expect(meta.chapterValidated).toBe(true);
    expect(meta.gems).toBe(40);
  });
});
```

Les deux appels à `applyReward` du `describe('applyReward')` gagnent aussi
`boss: false, chapter: 1`. `SALLES_PER_CHAPTER` peut rester importé dans `meta.test.ts`
s'il sert ailleurs ; sinon retirer l'import devenu inutile.

- [ ] **Step 7 : lancer toute la suite**

Run : `npm run test`
Attendu : 328 tests verts (327 + le nouveau).

- [ ] **Step 8 : vérifier la compilation**

Run : `npm run build`
Attendu : succès, aucune erreur TypeScript.

- [ ] **Step 9 : commit**

```bash
git add -A
git commit -m "refactor(sim): la récompense porte le drapeau du boss et son chapitre

Trois sites dérivaient « le boss vient de tomber » d'un numéro de salle.
RunReward porte désormais boss et chapter ; applyRunReward perd son
troisième paramètre."
```

---

### Task 2 : `chapterValidated` devient `bestChapter` (sauvegarde schéma 5)

**Files:**
- Modify: `src/sim/types.ts:104` (`MetaState`)
- Modify: `src/sim/meta.ts:22` (`createInitialMeta`), `:36-39` (`applyRunReward`), `:103-105` (`canClaimFounderGift`)
- Modify: `src/sim/save.ts:6-16` (commentaire + `SAVE_SCHEMA`), `hydrate`, `isComplete`
- Modify: `scripts/verrou.mjs:22-39` (le blob injecté)
- Test: `src/sim/meta.test.ts`, `src/sim/save.test.ts`, `src/sim/sim.test.ts`

**Interfaces:**
- Consumes: `RunReward.boss`, `RunReward.chapter` (tâche 1)
- Produces: `MetaState.bestChapter: number` · `SAVE_SCHEMA === 5` ·
  `canClaimFounderGift(meta): boolean` inchangée de signature

- [ ] **Step 1 : écrire les tests qui échouent.** Dans `src/sim/meta.test.ts`, remplacer le
      second test de `applyRunReward` et en ajouter un :

```ts
  it('valide le chapitre quand la récompense vient du boss', () => {
    const meta = createInitialMeta(1);
    applyRunReward(meta, { credits: 1, gems: 40, chests: [], boss: true, chapter: 1 });
    expect(meta.bestChapter).toBe(1);
    expect(meta.gems).toBe(40);
  });

  // Vérifié par mutation : remplacer le Math.max de `applyRunReward` par une
  // affectation fait rougir ce test.
  it('bestChapter ne descend jamais', () => {
    const meta = createInitialMeta(1);
    applyRunReward(meta, { credits: 0, gems: 0, chests: [], boss: true, chapter: 2 });
    expect(meta.bestChapter).toBe(2);
    // Redescendre un chapitre déjà validé ne rabaisse rien : c'est la référence
    // de farm du lot B, et on la perdrait en jouant.
    applyRunReward(meta, { credits: 0, gems: 0, chests: [], boss: true, chapter: 1 });
    expect(meta.bestChapter).toBe(2);
  });
```

Dans `src/sim/save.test.ts`, ajouter à la fin du `describe` des migrations :

```ts
  it('migre un blob de schéma 4 : chapterValidated devient bestChapter', () => {
    const { bestChapter: _absent, ...sans } = createInitialMeta(1);
    const valide = { v: 4, meta: { ...sans, chapterValidated: true } };
    expect(deserializeMeta(JSON.stringify(valide))!.bestChapter).toBe(1);
    const vierge = { v: 4, meta: { ...sans, chapterValidated: false } };
    expect(deserializeMeta(JSON.stringify(vierge))!.bestChapter).toBe(0);
  });

  it('rejette un blob de schéma courant sans bestChapter', () => {
    const { bestChapter: _absent, ...sans } = createInitialMeta(1);
    expect(deserializeMeta(JSON.stringify({ v: SAVE_SCHEMA, meta: sans }))).toBeNull();
  });
```

- [ ] **Step 2 : lancer les tests, vérifier qu'ils échouent**

Run : `npx vitest run src/sim/meta.test.ts src/sim/save.test.ts`
Attendu : ÉCHEC — `bestChapter` n'existe pas sur `MetaState`.

- [ ] **Step 3 : le champ** (`src/sim/types.ts`, remplace `chapterValidated: boolean;`) :

```ts
  /** Le meilleur chapitre jamais validé ; 0 tant qu'aucun ne l'est. Ne descend
   *  jamais : c'est la référence de farm du jalon 3, et un joueur qui redescend
   *  un chapitre déjà validé ne doit pas la perdre en jouant. */
  bestChapter: number;
```

- [ ] **Step 4 : le méta** (`src/sim/meta.ts`) : `chapterValidated: false,` devient
      `bestChapter: 0,` dans `createInitialMeta`, puis :

```ts
export function applyRunReward(meta: MetaState, reward: RunReward): void {
  applyReward(meta, reward);
  // Math.max et jamais une affectation : rejouer un chapitre déjà validé ne
  // doit pas faire redescendre la référence de farm.
  if (reward.boss) meta.bestChapter = Math.max(meta.bestChapter, reward.chapter);
}
```

```ts
export function canClaimFounderGift(meta: MetaState): boolean {
  return meta.bestChapter >= 1 && !meta.founderGiftClaimed;
}
```

- [ ] **Step 5 : la sauvegarde** (`src/sim/save.ts`). `SAVE_SCHEMA` passe à `5` et son
      commentaire gagne une phrase :

```ts
/** … (garder le commentaire existant, et lui ajouter) :
 *  Le passage au schéma 5 remplace `chapterValidated: boolean` par
 *  `bestChapter: number`. La migration tient dans `hydrate` : un blob antérieur
 *  est, par construction, un méta auquel il manque le champ. */
export const SAVE_SCHEMA = 5;
```

Dans `hydrate`, remplacer la ligne `chapterValidated: partial.chapterValidated === true,` :

```ts
    // Migration 4 → 5 : le booléen devient un numéro. Un blob antérieur au 4
    // traverse la même branche et retombe sur 0, ce qui est exact.
    bestChapter: typeof partial.bestChapter === 'number'
      ? partial.bestChapter
      : (partial.chapterValidated === true ? 1 : 0),
```

Dans `isComplete`, ajouter une ligne à la conjonction (juste après `typeof m.gems === 'number' &&`) :

```ts
    typeof m.bestChapter === 'number' &&
```

- [ ] **Step 6 : le harnais navigateur suit** (`scripts/verrou.mjs`) : dans `save`, `v: 4`
      devient `v: 5`, et `chapterValidated: false` devient `bestChapter: 0`. Mettre à jour
      le commentaire qui cite « Le schéma 4 exige aussi `pending` » en « Le schéma 5 exige
      aussi `pending` et `bestChapter` ».

- [ ] **Step 7 : les tests existants suivent.** Remplacer partout :
      `meta.chapterValidated = true` → `meta.bestChapter = 1` (`save.test.ts:17`,
      `meta.test.ts:156`, `:167`) · `expect(meta.chapterValidated).toBe(false)` →
      `expect(meta.bestChapter).toBe(0)` (`meta.test.ts:26`) ·
      `expect(JSON.parse(a).meta.chapterValidated).toBe(true)` →
      `expect(JSON.parse(a).meta.bestChapter).toBe(1)` (`sim.test.ts:70`) ·
      `expect(meta.chapterValidated).toBe(true)` → `expect(meta.bestChapter).toBe(1)`
      (`sim.test.ts:154`).
      Les trois blobs `v: 1` de `save.test.ts` **gardent** `chapterValidated: false` : ce
      sont des blobs d'époque, c'est précisément ce que la migration doit savoir lire.

- [ ] **Step 8 : lancer toute la suite**

Run : `npm run test`
Attendu : 330 tests verts.

- [ ] **Step 9 : vérifier la mutation du garde-fou.** Remplacer temporairement dans
      `applyRunReward` :

```ts
  if (reward.boss) meta.bestChapter = reward.chapter;
```

Run : `npx vitest run src/sim/meta.test.ts`
Attendu : ÉCHEC de « bestChapter ne descend jamais ». **Rétablir le `Math.max` ensuite** et
relancer pour confirmer le vert.

- [ ] **Step 10 : commit**

```bash
npm run build
git add -A
git commit -m "feat(meta): bestChapter remplace chapterValidated, sauvegarde schéma 5

Le meilleur chapitre validé devient un numéro qui ne descend jamais —
la référence de farm du jalon 3. Migration 4 → 5 dans hydrate."
```

---

### Task 3 : la frontière de run — `phase: 'won'` et `startRun`

C'est la tâche centrale. Elle est indivisible : séparer la phase de `startRun` laisserait un
commit où le boss ne referme rien **et** où le châssis en attente ne monte plus.

**Files:**
- Modify: `src/sim/types.ts:51` (`Phase`)
- Modify: `src/sim/sim.ts:49-121` (`createRun`/`resetRun`/`equipPendingToupie` → `startRun` + `maxPlayableChapter`), `:198-210` (`tick`)
- Modify: `src/content/balance.json` (`chapter.maxChapter`), `src/sim/config.ts` (`MAX_CHAPTER`)
- Modify: `src/render/observer.ts:25-31, :102`
- Modify: `src/ui/App.tsx:1-23`, `src/ui/useGameLoop.ts`, `src/ui/CombatScreen.tsx:212-221`, `src/ui/ToupiesScreen.tsx:78,96`
- Modify: `scripts/calibrate.mjs`, `scripts/verrou.mjs`
- Test: `src/sim/sim.test.ts`, `src/render/observer.test.ts`

**Interfaces:**
- Consumes: `MetaState.bestChapter` (tâche 2), `RunReward.boss` (tâche 1)
- Produces: `startRun(meta: MetaState, chapter: number, seed: number): RunState` ·
  `maxPlayableChapter(meta: MetaState): number` · `MAX_CHAPTER: number` ·
  `Phase = 'fighting' | 'dead' | 'won'`

- [ ] **Step 1 : écrire les tests qui échouent.** Dans `src/sim/sim.test.ts` :
      ajouter `MAX_CHAPTER` à l'import depuis `./config`, remplacer l'import de `./sim` par
      `import { maxPlayableChapter, startRun, syncRunStats, tick } from './sim';`, et
      remplacer le test « vider la salle 10 valide le chapitre et repart en salle 1 » ainsi
      que celui de `resetRun` :

```ts
  it('vider la salle 10 pose la phase « won » et ne repart pas en salle 1', () => {
    const meta = createInitialMeta(1);
    const run = startRun(meta, 1, 1);
    run.salle = SALLES_PER_CHAPTER;
    const spawned = spawnSalle(run.chapter, SALLES_PER_CHAPTER, run.rngState);
    run.bots = spawned.bots;
    run.rngState = spawned.rngState;
    for (const b of run.bots) b.spin = 0.0001;
    const reward = tick(run, { steer: null })!;
    applyRunReward(meta, reward);
    expect(reward.boss).toBe(true);
    expect(meta.bestChapter).toBe(1);
    expect(run.phase).toBe('won');
    // La descente est fermée : la salle ne revient pas à 1 et plus rien n'avance.
    expect(run.salle).toBe(SALLES_PER_CHAPTER);
    expect(tick(run, { steer: null })).toBeNull();
    expect(meta.credits).toBeCloseTo(salleReward(1, SALLES_PER_CHAPTER, true, 1).reward.credits, 5);
    expect(meta.gems).toBe(salleReward(1, SALLES_PER_CHAPTER, true, 1).reward.gems);
  });

  it('spin à zéro ⇒ mort ; la descente suivante repart salle 1 en gardant les crédits', () => {
    const meta = createInitialMeta(1);
    meta.credits = 500;
    const run = startRun(meta, 1, 1);
    run.player.spin = 0.0001;
    tick(run, { steer: null });
    expect(run.phase).toBe('dead');
    const suivant = startRun(meta, 1, run.rngState);
    expect(suivant.phase).toBe('fighting');
    expect(suivant.salle).toBe(1);
    expect(meta.credits).toBe(500);
    expect(suivant.player.spin).toBe(suivant.player.spinMax);
  });
```

puis remplacer les `describe('resetRun')` et `describe('equipPendingToupie')` par un seul :

```ts
describe('startRun', () => {
  // Vérifié par mutation : faire relire `meta.toupies.active` à `syncRunStats`
  // fait rougir ce test.
  it('fixe le châssis de la descente, et le run ne le relit jamais', () => {
    const meta = createInitialMeta(1);
    meta.toupies.unlocked = ['brasier-solaire', 'carapace-abyssale'];
    const run = startRun(meta, 1, 1); // Brasier Solaire, type équilibre
    expect(run.toupie).toBe('brasier-solaire');
    setActiveToupie(meta, 'carapace-abyssale');
    syncRunStats(run, meta);
    for (const b of run.bots) b.spin = 0.0001;
    tick(run, { steer: null });
    expect(run.salle).toBe(2); // une frontière de salle a bien été franchie
    expect(run.toupie).toBe('brasier-solaire');
    expect(run.player.type).toBe('equilibre');
    // Le choix en attente ne monte qu'à la descente suivante.
    expect(startRun(meta, 1, 2).toupie).toBe('carapace-abyssale');
  });

  // Vérifié par mutation : retirer la borne de `startRun` fait rougir ce test.
  it('borne le chapitre jouable par bestChapter + 1', () => {
    const meta = createInitialMeta(1);
    expect(maxPlayableChapter(meta)).toBe(1);
    expect(startRun(meta, 4, 1).chapter).toBe(1);
    meta.bestChapter = 1;
    expect(maxPlayableChapter(meta)).toBe(2);
    expect(startRun(meta, 2, 1).chapter).toBe(2);
    expect(startRun(meta, 3, 1).chapter).toBe(2);
    // Jamais au-delà du contenu qui existe.
    meta.bestChapter = 99;
    expect(maxPlayableChapter(meta)).toBe(MAX_CHAPTER);
    expect(startRun(meta, 99, 1).chapter).toBe(MAX_CHAPTER);
  });

  it('normalise une graine nulle', () => {
    expect(startRun(createInitialMeta(1), 1, 0).rngState).toBe(1);
  });
});
```

Enfin, remplacer partout ailleurs dans ce fichier `createRun(meta, seed)` par
`startRun(meta, 1, seed)` (y compris dans l'aide `play`, et dans les intitulés de tests qui
citent `createRun` : « startRun pose sur le joueur les talents de l'équipement de départ »,
« startRun applique l'accélération du châssis sans passer par syncRunStats »), et remplacer
`resetRun(run, meta)` du test « resetRun réarme le sursis » par
`const run2 = startRun(meta, 1, run.rngState);` avec l'assertion portée sur `run2`.

Dans `src/render/observer.test.ts` : **supprimer** le test « signale la validation du
chapitre au retour de la salle 10 vers la salle 1 », et retirer `chapterValidated: false` de
l'objet attendu du test « ne signale rien quand rien ne bouge ».

- [ ] **Step 2 : lancer les tests, vérifier qu'ils échouent**

Run : `npx vitest run src/sim/sim.test.ts`
Attendu : ÉCHEC — `startRun` et `maxPlayableChapter` n'existent pas.

- [ ] **Step 3 : le plafond de chapitre entre dans l'équilibrage.** Dans
      `src/content/balance.json`, la clé `chapter` devient :

```json
  "chapter": {
    "sallesPerChapter": 10,
    "maxChapter": 4,
    "botsPerSalle": [1, 1, 1, 2, 2, 2, 3, 3, 3, 1]
  },
```

Dans `src/sim/config.ts`, sous `SALLES_PER_CHAPTER` :

```ts
export const MAX_CHAPTER = BALANCE.chapter.maxChapter;
```

- [ ] **Step 4 : la phase** (`src/sim/types.ts:51`) :

```ts
export type Phase = 'fighting' | 'dead' | 'won';
```

et le commentaire de `RunState.toupie` perd sa mention d'`equipPendingToupie` :

```ts
  /** Le châssis de cette descente. Lu une seule fois, par `startRun`, et jamais
   *  relu ensuite : c'est ce qui empêche de contre-piocher salle par salle. Le
   *  choix en attente vit dans `meta.toupies.active` et ne monte qu'à la
   *  descente suivante. */
  toupie: ToupieId;
```

- [ ] **Step 5 : `startRun` remplace les trois fonctions** (`src/sim/sim.ts`). Supprimer
      `createRun`, `resetRun` et `equipPendingToupie` ; ajouter, en important `MAX_CHAPTER`
      depuis `./config` :

```ts
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
 * respecte est une règle qu'un appelant peut oublier.
 */
export function startRun(meta: MetaState, chapter: number, seed: number): RunState {
  const toupie = meta.toupies.active;
  const run: RunState = {
    tick: 0,
    rngState: seed >>> 0 || 1,
    chapter: Math.max(1, Math.min(chapter, maxPlayableChapter(meta))),
    salle: 1,
    toupie,
    player: makePlayer(meta, toupie),
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
```

- [ ] **Step 6 : le boss ferme la descente** (`src/sim/sim.ts`, bloc « salle vidée » de
      `tick`) :

```ts
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
```

- [ ] **Step 7 : l'événement mort-né disparaît** (`src/render/observer.ts`) : retirer
      `chapterValidated: boolean;` de `RenderEvents` et la ligne
      `chapterValidated: before.salle === SALLES_PER_CHAPTER && after.salle === 1,` de
      l'objet retourné. Il n'avait aucun consommateur, et il devient faux dès que la salle
      ne revient plus à 1 : le garder serait garder du code mort *et* faux.

- [ ] **Step 8 : l'interface suit.** `src/ui/App.tsx` :

```ts
import { maxPlayableChapter, startRun } from '../sim/sim';
```

```ts
  // Le joueur reprend là où il poussait : son chapitre le plus haut. Il en change
  // entre deux descentes, dans le panneau de l'écran de combat.
  const [initialRun] = useState(() =>
    startRun(loaded.meta, maxPlayableChapter(loaded.meta), (Date.now() ^ 0x9e3779b9) >>> 0));
```

(garder le commentaire existant sur `useState(() => …)` et sur la séparation des graines.)

`src/ui/useGameLoop.ts` : retirer l'import d'`equipPendingToupie` et les deux lignes du
câblage du châssis — il ne reste que :

```ts
        const reward = tick(runRef.current, { steer: steerRef.current });
        if (reward) {
          applyRunReward(metaRef.current, reward);
          h.onReward(reward);
        }
```

`src/ui/CombatScreen.tsx` : l'import `resetRun` devient `startRun`, et le bouton de fin de
run devient (le panneau complet arrive en tâche 4) :

```tsx
      {s.phase !== 'fighting' ? (
        <button
          onClick={() => {
            // La graine continue le flux de la descente précédente : deux runs
            // consécutifs ne rejouent pas les mêmes gabarits d'arène, et aucune
            // horloge n'entre dans la simulation.
            runRef.current = startRun(metaRef.current, s.chapter, s.rngState);
            onTick();
          }}
          style={{
            minHeight: 48, borderRadius: 11, cursor: 'pointer', border: '1px solid var(--ember)',
            background: 'var(--ember)', color: 'var(--ink)', font: '600 15px Oswald, ui-sans-serif, sans-serif',
          }}
        >
          {s.phase === 'won' ? 'Chapitre validé — Nouvelle descente' : 'Ta toupie s’est arrêtée — Nouvelle descente'}
        </button>
      ) : null}
```

`src/ui/ToupiesScreen.tsx:78` : `const dead = runRef.current.phase === 'dead';` devient
`const between = runRef.current.phase !== 'fighting';` et son usage ligne 96 devient
`{between ? (`.

- [ ] **Step 9 : les harnais suivent.** `scripts/calibrate.mjs` : l'import devient
      `import { maxPlayableChapter, startRun, syncRunStats, tick } from '../src/sim/sim.ts';`,
      `createRun(meta, seed)` devient `startRun(meta, 1, seed)`, et la relance de fin de run
      devient (l'enchaînement des chapitres arrive en tâche 8) :

```js
    if (run.phase !== 'fighting') {
      if (run.phase === 'dead') deathsBySalle.set(run.salle, (deathsBySalle.get(run.salle) ?? 0) + 1);
      runs++;
      if (counterPick) setActiveToupie(meta, counterFor(1, 1));
      run = startRun(meta, 1, seed + runs);
      salleTicks = 0;
    }
```

et la condition d'arrêt `meta.chapterValidated` devient `meta.bestChapter >= 1` :

```js
      if (meta.bestChapter >= 1 && ticksToValidate === null) {
        ticksToValidate = ticks;
        runsToValidate = runs;
      }
```

`scripts/verrou.mjs`, passe 1 : la détection du tour de chapitre change — la boucle ne verra
plus jamais « SALLE 1 » après « SALLE 10 ». Remplacer la boucle et ses deux vérifications :

```js
let boss = false;
let closed = false;
for (let i = 0; i < 2000 && !closed; i++) {
  await page.mouse.move(cx + Math.cos((i / 14) * 6.283) * 70, cy + Math.sin((i / 14) * 6.283) * 70);
  await page.waitForTimeout(120);
  if ((await hud(page)).includes('SALLE 10')) boss = true;
  // Le boss vaincu ferme la descente : c'est le bouton de relance qui l'atteste,
  // plus le retour en salle 1 qui n'existe plus.
  closed = boss && (await page.getByRole('button', { name: /Nouvelle descente/ }).count()) > 0;
}
await page.mouse.up();
check('le boss vaincu a fermé la descente', closed);
await page.getByRole('button', { name: /Nouvelle descente/ }).click();
await page.waitForTimeout(400);
```

passe 2 : la mort ne se détecte plus par le bouton « Retenter » :

```js
let dead = false;
for (let i = 0; i < 400 && !dead; i++) {
  await page.waitForTimeout(150);
  dead = (await page.getByText('arrêtée').count()) > 0;
}
```

et le clic de relance devient
`await page.getByRole('button', { name: /Nouvelle descente/ }).click();` (le
`check('Tigre Foudre est « Pilotée » après « Retenter »', …)` garde son assertion, son
intitulé devient « après la nouvelle descente »).

- [ ] **Step 10 : lancer toute la suite**

Run : `npm run test`
Attendu : vert (le nombre baisse de 1 — le test de `chapterValidated` de l'observateur
disparaît — et monte de 3 : les trois tests de `startRun`).

- [ ] **Step 11 : vérifier les deux mutations.**
      (a) Dans `syncRunStats`, remplacer `const stats = playerStats(meta, run.toupie);` par
      `const stats = playerStats(meta, meta.toupies.active);` et ajouter
      `run.player.type = toupieById(meta.toupies.active).type;`

Run : `npx vitest run src/sim/sim.test.ts`
Attendu : ÉCHEC de « fixe le châssis de la descente ». **Rétablir.**

  (b) Dans `startRun`, remplacer la ligne du chapitre par `chapter,`

Run : `npx vitest run src/sim/sim.test.ts`
Attendu : ÉCHEC de « borne le chapitre jouable ». **Rétablir**, relancer, confirmer le vert.

- [ ] **Step 12 : vérifier dans le navigateur** (voir aussi la tâche 11 pour la passe
      complète). `npm run dev`, lire la ligne « Local: » — les ports 5173 et 5174 sont pris
      par d'autres processus, Vite ira sur 5175 ou au-dessus. Ouvrir
      `http://localhost:<port>/spinforge/` et vérifier que le jeu se lance, que la salle 1
      s'affiche, et qu'une mort propose « Nouvelle descente » qui relance bien.

- [ ] **Step 13 : commit**

```bash
npm run build
git add -A
git commit -m "feat(sim): le boss ferme la descente, startRun est la porte unique du run

phase 'won' ; startRun absorbe createRun, resetRun et equipPendingToupie.
Le châssis est lu une fois par descente : le verrou devient structurel.
RenderEvents.chapterValidated, mort-né et désormais faux, est supprimé."
```

---

### Task 4 : le panneau « Choisis ta descente »

**Files:**
- Modify: `src/ui/CombatScreen.tsx` (le bouton de la tâche 3 devient un panneau)
- Modify: `src/ui/ToupiesScreen.tsx:75,112` (chapitre du run au lieu de 1 en dur)

**Interfaces:**
- Consumes: `startRun`, `maxPlayableChapter` (tâche 3), `chapterOf` (`src/content/chapters.ts`)

- [ ] **Step 1 : le panneau.** Dans `src/ui/CombatScreen.tsx`, importer
      `maxPlayableChapter` en plus de `startRun`, ajouter le style de pastille au-dessus du
      composant :

```tsx
function chapterChipStyle(selected: boolean) {
  return {
    flex: '1 1 auto', minHeight: 38, borderRadius: 9, cursor: 'pointer' as const,
    border: `1px solid ${selected ? 'var(--ember)' : 'var(--line)'}`,
    background: selected ? 'var(--ember)' : 'var(--panel)',
    color: selected ? 'var(--ink)' : 'var(--text)',
    font: '600 12.5px Oswald, ui-sans-serif, sans-serif', letterSpacing: '.02em',
  };
}
```

puis, dans le composant, à côté des autres `useState` :

```tsx
  // Choix explicite du joueur. Remis à null à chaque descente lancée : la
  // suggestion (le chapitre perdu, ou celui qui vient de s'ouvrir) reprend alors
  // la main sans qu'aucun effet n'ait à la recalculer.
  const [picked, setPicked] = useState<number | null>(null);
```

et remplacer le bloc `{s.phase !== 'fighting' ? (…) : null}` par :

```tsx
      {s.phase !== 'fighting' ? (() => {
        const maxChapter = maxPlayableChapter(metaRef.current);
        const suggested = s.phase === 'won' ? Math.min(s.chapter + 1, maxChapter) : s.chapter;
        const chapterToPlay = picked ?? suggested;
        return (
          <section
            style={{
              border: '1px solid var(--ember)', background: 'var(--panel)', borderRadius: 11,
              padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8,
            }}
          >
            <p style={{ margin: 0, font: '600 15px Oswald, ui-sans-serif, sans-serif', letterSpacing: '.03em' }}>
              {s.phase === 'won' ? `Chapitre ${s.chapter} validé` : 'Ta toupie s’est arrêtée'}
            </p>
            <p style={{ margin: 0, fontSize: 12, color: 'var(--muted)' }}>
              {s.phase === 'won'
                ? (maxChapter > s.chapter
                    ? `Le chapitre ${s.chapter + 1} s’ouvre.`
                    : 'Fin du contenu actuel : les chapitres suivants arrivent plus tard.')
                : 'Tes crédits sont gardés.'}
            </p>
            <p style={{ margin: 0, fontSize: 12, color: 'var(--muted)' }}>Choisis ta descente</p>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {Array.from({ length: maxChapter }, (_, i) => i + 1).map((n) => (
                <button key={n} onClick={() => setPicked(n)} style={chapterChipStyle(n === chapterToPlay)}>
                  {n} — {chapterOf(n).name}
                </button>
              ))}
            </div>
            <button
              onClick={() => {
                // La graine continue le flux de la descente précédente : deux runs
                // consécutifs ne rejouent pas les mêmes gabarits d'arène, et aucune
                // horloge n'entre dans la simulation.
                runRef.current = startRun(metaRef.current, chapterToPlay, s.rngState);
                setPicked(null);
                onTick();
              }}
              style={{
                minHeight: 48, borderRadius: 11, cursor: 'pointer', border: '1px solid var(--ember)',
                background: 'var(--ember)', color: 'var(--ink)', font: '600 15px Oswald, ui-sans-serif, sans-serif',
              }}
            >
              Nouvelle descente
            </button>
          </section>
        );
      })() : null}
```

- [ ] **Step 2 : l'écran Toupies lit le chapitre joué.** Dans `src/ui/ToupiesScreen.tsx`,
      `const groups = chapterGroups(1);` devient
      `const groups = chapterGroups(runRef.current.chapter);`, le titre
      `Chapitre 1 — composition` devient
      `Chapitre {runRef.current.chapter} — composition`, et le commentaire de
      `chapterGroups` perd sa mention « du chapitre 1 » au profit de « du chapitre ».

- [ ] **Step 3 : la suite reste verte**

Run : `npm run test && npm run build`
Attendu : vert (aucun test unitaire ne couvre le rendu React ; c'est le navigateur qui juge).

- [ ] **Step 4 : vérifier dans le navigateur.** `npm run dev`, lire la ligne « Local: »,
      ouvrir `http://localhost:<port>/spinforge/`. Avec une sauvegarde neuve : mourir et
      vérifier que le panneau propose **uniquement le chapitre 1** et le présélectionne, et
      que « Nouvelle descente » relance bien la salle 1.

- [ ] **Step 5 : commit**

```bash
git add -A
git commit -m "feat(ui): le panneau « Choisis ta descente » remplace le bouton Retenter

Sur l'écran de combat, entre deux descentes : chapitres 1 à
min(bestChapter+1, maxChapter), présélection du chapitre perdu ou de
celui qui vient de s'ouvrir. L'écran Toupies lit le chapitre joué."
```

---

### Task 5 : les compositions des chapitres 2 à 4

**Files:**
- Modify: `src/content/balance.json` (`botTypes`)
- Modify: `src/sim/salle.ts:26` (identifiant de bot)
- Test: `src/sim/config.test.ts`

**Interfaces:**
- Consumes: `MAX_CHAPTER` (tâche 3)
- Produces: `BOT_TYPES` avec les clés `"1"` à `"4"`

- [ ] **Step 1 : écrire le test qui échoue.** Dans `src/sim/config.test.ts`, ajouter
      `BOT_TYPES` et `MAX_CHAPTER` à l'import depuis `./config`, une constante à côté de
      `SLOTS` :

```ts
const TOP_TYPES = ['attaque', 'defense', 'endurance', 'equilibre'];
```

et ce test dans le `describe('balance.json')` :

```ts
  it('chaque chapitre jouable a une table de types complète', () => {
    for (let chapter = 1; chapter <= MAX_CHAPTER; chapter++) {
      const table = BOT_TYPES[String(chapter)];
      // Sans cette garde, une table trop courte ferait silencieusement retomber
      // le boss sur le type de la dernière salle décrite (`botTypeFor` borne
      // l'index) — un chapitre dont le mur change de type sans que rien ne le dise.
      expect(table, `chapitre ${chapter}`).toBeDefined();
      expect(table, `chapitre ${chapter}`).toHaveLength(SALLES_PER_CHAPTER);
      for (const type of table) expect(TOP_TYPES, `chapitre ${chapter}`).toContain(type);
    }
  });
```

- [ ] **Step 2 : lancer le test, vérifier qu'il échoue**

Run : `npx vitest run src/sim/config.test.ts`
Attendu : ÉCHEC — les chapitres 2, 3 et 4 n'ont pas de table.

- [ ] **Step 3 : les trois tables** (`src/content/balance.json`, clé `botTypes`) :

```json
  "botTypes": {
    "1": ["endurance", "endurance", "endurance", "defense", "defense", "defense", "attaque", "attaque", "attaque", "attaque"],
    "2": ["defense", "defense", "defense", "attaque", "attaque", "attaque", "endurance", "endurance", "endurance", "endurance"],
    "3": ["attaque", "attaque", "attaque", "endurance", "endurance", "endurance", "defense", "defense", "defense", "defense"],
    "4": ["attaque", "endurance", "defense", "equilibre", "equilibre", "equilibre", "attaque", "endurance", "defense", "equilibre"]
  },
```

Le triangle tourne d'un chapitre à l'autre : le boss du chapitre 2 (endurance) domine
Défense, le châssis qui gagnait le chapitre 1 ; celui du chapitre 3 (défense) domine
Attaque, le contre du chapitre 2. Le chapitre 4 sort du triangle — ses trois premières
salles le parcourent en entier, sa bande centrale et son boss sont Équilibre, que rien ne
domine et qui ne subit jamais le +25 %.

- [ ] **Step 4 : l'identifiant de bot distingue les chapitres** (`src/sim/salle.ts:26`) :

```ts
    id: `bot-${chapter}-${salle}-${index}`,
```

(`viewFor` dans `src/render/arena.ts` n'a rien à changer : il élague déjà les vues dont
l'identifiant a disparu.)

- [ ] **Step 5 : la suite passe**

Run : `npm run test && npm run build`
Attendu : vert.

- [ ] **Step 6 : vérifier dans le navigateur** que l'écran Toupies affiche bien la
      composition du chapitre joué (chapitre 1 : Endurance / Défense / Attaque).

- [ ] **Step 7 : commit**

```bash
git add -A
git commit -m "feat(content): les compositions des chapitres 2 à 4

Le triangle tourne d'un chapitre à l'autre : le boss suivant domine le
châssis qui vient de gagner. Le chapitre 4 passe à Équilibre, que rien
ne domine — c'est là que la contre-pioche cesse de suffire."
```

---

### Task 6 : le facteur de difficulté par chapitre (mécanisme, valeur provisoire)

**Files:**
- Modify: `src/content/balance.json` (`bot.scaling`)
- Modify: `src/sim/salle.ts:20-21`
- Test: `src/sim/salle.test.ts` (le `describe('makeBot')` existe déjà)

**Interfaces:**
- Produces: `BOT_SCALING.spinPerChapter`, `BOT_SCALING.attackPerChapter`

- [ ] **Step 1 : écrire le test qui échoue.** Dans le fichier de test de `salle.ts` :

```ts
  // Vérifié par mutation : remplacer l'exposant `chapter - 1` par `chapter` fait
  // rougir ce test. C'est lui qui rend exacte la comparaison des garde-fous du
  // chapitre 1 avant/après ce lot.
  it('le chapitre 1 est inchangé par le facteur de chapitre', () => {
    // Le facteur n'apparaît nulle part dans les attendus : c'est le point. Au
    // chapitre 1 l'exposant vaut 0, donc la formule est exactement celle du
    // palier de salle, quelle que soit la valeur du facteur.
    for (const salle of [1, 5, 9]) {
      expect(makeBot(1, salle, 0, 0).spinMax, `salle ${salle}`).toBeCloseTo(
        BOT_BASE.spinMax * (1 + BOT_SCALING.spinPerSalle * (salle - 1)), 6);
      expect(makeBot(1, salle, 0, 0).attack, `salle ${salle}`).toBeCloseTo(
        BOT_BASE.attack * (1 + BOT_SCALING.attackPerSalle * (salle - 1)), 6);
    }
  });

  it('le facteur de chapitre est géométrique et se compose avec le palier de salle', () => {
    const salle = 5;
    const c1 = makeBot(1, salle, 0, 0);
    const c3 = makeBot(3, salle, 0, 0);
    expect(c3.spinMax / c1.spinMax).toBeCloseTo(Math.pow(BOT_SCALING.spinPerChapter, 2), 6);
    expect(c3.attack / c1.attack).toBeCloseTo(Math.pow(BOT_SCALING.attackPerChapter, 2), 6);
  });
```

(les deux tests vont dans le `describe('makeBot')` existant ; ajouter `BOT_SCALING` à
l'import depuis `./config`, qui porte déjà `BOSS`, `BOT_BASE` et `SALLES_PER_CHAPTER`.)

- [ ] **Step 2 : lancer le test, vérifier qu'il échoue**

Run : `npx vitest run src/sim/salle.test.ts`
Attendu : ÉCHEC — `BOT_SCALING.spinPerChapter` vaut `undefined`, le rapport est `NaN`.

- [ ] **Step 3 : les deux boutons, à une valeur provisoire** (`src/content/balance.json`) :

```json
    "scaling": {
      "spinPerSalle": 0.15,
      "attackPerSalle": 0.08,
      "spinPerChapter": 1.2,
      "attackPerChapter": 1.1
    },
```

**Provisoires, pas neutres, et c'est délibéré.** À 1,0 les deux tests ci-dessus passeraient
même si le mécanisme était faux (`Math.pow(1, n)` vaut 1 pour tout `n`) : la mutation de
l'exposant serait invisible. Une valeur franche rend le mécanisme observable dès son
commit. Le chapitre 1 reste bit à bit inchangé de toute façon — c'est ce que prouve le
premier test. La passe de calibration de la tâche 9 remplacera ces deux nombres.

- [ ] **Step 4 : `makeBot` applique le facteur** (`src/sim/salle.ts`) :

```ts
  // Linéaire par salle, géométrique par chapitre — les deux se multiplient. À
  // l'exposant 0, le chapitre 1 est bit à bit inchangé quelle que soit la valeur
  // du facteur : c'est ce qui rend exacts les garde-fous de non-régression.
  const spinScale = (1 + BOT_SCALING.spinPerSalle * (salle - 1))
    * Math.pow(BOT_SCALING.spinPerChapter, chapter - 1);
  const attackScale = (1 + BOT_SCALING.attackPerSalle * (salle - 1))
    * Math.pow(BOT_SCALING.attackPerChapter, chapter - 1);
```

- [ ] **Step 5 : lancer la suite**

Run : `npm run test && npm run build`
Attendu : vert. Les chiffres du chapitre 1 sont inchangés — aucun test existant ne bouge.

- [ ] **Step 6 : vérifier la mutation.** Remplacer temporairement `chapter - 1` par
      `chapter` dans les deux lignes.

Run : `npx vitest run src/sim/salle.test.ts`
Attendu : ÉCHEC du test « le chapitre 1 est inchangé ». **Rétablir**, relancer, confirmer.

- [ ] **Step 7 : commit**

```bash
git add -A
git commit -m "feat(sim): le facteur de difficulté par chapitre (mécanisme, valeurs provisoires)

Géométrique par chapitre, multiplicatif avec le palier linéaire par salle.
Les valeurs sont provisoires — franches et non neutres pour que le
mécanisme soit observable — et la passe de calibration combat les fixera."
```

---

### Task 7 : le facteur de revenu par chapitre (mécanisme, valeur provisoire)

**Files:**
- Modify: `src/content/balance.json` (`econ`)
- Modify: `src/sim/economy.ts` (`salleReward`)
- Test: `src/sim/economy.test.ts`

**Interfaces:**
- Produces: `ECON.rewardPerChapter`

- [ ] **Step 1 : écrire le test qui échoue** (`src/sim/economy.test.ts`) :

```ts
  it('le revenu monte géométriquement d’un chapitre à l’autre', () => {
    const c1 = salleReward(1, 4, false, 1).reward.credits;
    const c3 = salleReward(3, 4, false, 1).reward.credits;
    expect(c3 / c1).toBeCloseTo(Math.pow(ECON.rewardPerChapter, 2), 6);
    // Le chapitre 1 ne bouge pas : l'exposant y vaut 0.
    expect(c1).toBeCloseTo(ECON.rewardBase * Math.pow(ECON.rewardGrowth, 3), 5);
  });
```

- [ ] **Step 2 : lancer le test, vérifier qu'il échoue**

Run : `npx vitest run src/sim/economy.test.ts`
Attendu : ÉCHEC — `ECON.rewardPerChapter` vaut `undefined`, le rapport attendu est `NaN`.

- [ ] **Step 3 : le bouton, à une valeur provisoire** (`src/content/balance.json`, clé `econ`) :

```json
    "rewardBase": 104,
    "rewardGrowth": 1.13,
    "rewardPerChapter": 1.25,
```

Provisoire pour la même raison qu'à la tâche 6 : à 1,0 le test ci-dessus passerait même si
le facteur n'était pas appliqué. La passe de calibration de la tâche 10 fixera la valeur.

- [ ] **Step 4 : `salleReward` applique le facteur** (`src/sim/economy.ts`) :

```ts
  // Sans ce facteur, un chapitre plus dur paierait pareil : le joueur n'aurait
  // aucune raison d'y descendre, et le farm du lot B rien à farmer.
  const base = ECON.rewardBase
    * Math.pow(ECON.rewardGrowth, salle - 1)
    * Math.pow(ECON.rewardPerChapter, chapter - 1);
```

`ECON.bossGems` ne suit pas le chapitre : les gemmes commandent l'économie des coffres, que
ce lot ne calibre pas.

- [ ] **Step 5 : lancer la suite**

Run : `npm run test && npm run build`
Attendu : vert, chiffres du chapitre 1 inchangés.

- [ ] **Step 6 : commit**

```bash
git add -A
git commit -m "feat(econ): le facteur de revenu par chapitre (mécanisme, valeur provisoire)

Géométrique par chapitre, comme la difficulté mais dans sa propre passe.
Valeur provisoire, fixée par la passe économie. Les gemmes de boss ne
suivent pas : ce lot ne calibre pas les coffres."
```

---

### Task 8 : le harnais de calibration enchaîne les chapitres

**Files:**
- Modify: `scripts/calibrate.mjs` (fonction `simulate` et tout le bloc de rapport)

**Interfaces:**
- Consumes: `startRun`, `maxPlayableChapter` (tâche 3), `MAX_CHAPTER` (tâche 3)

- [ ] **Step 1 : `simulate` joue jusqu'au chapitre demandé.** Remplacer le corps de
      `simulate` (l'en-tête de son commentaire reste) :

```js
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
  let run = startRun(meta, 1, seed);
  let ticks = 0;
  let runs = 1;
  let salleTicks = 0;
  let ticksToFirstChest = null;
  // Un relevé par chapitre : les médianes d'un chapitre ne disent rien de celles
  // d'un autre, et le garde-fou de la salle 10 doit tenir dans chacun.
  const chapters = new Map();
  const statsFor = (n) => {
    if (!chapters.has(n)) {
      chapters.set(n, { ticks: null, runs: null, runsStarted: 1, salleDurations: new Map(), deathsBySalle: new Map() });
    }
    return chapters.get(n);
  };

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
      if (counterPick && (counterPick === 'salle' || run.salle === 1)) {
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
```

La graine de relance reste `seed + runs` : c'est ce qui rend les chiffres du chapitre 1
comparables au bit près à ceux d'avant ce lot.

- [ ] **Step 2 : deux aides de lecture**, juste après `median` :

```js
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
```

- [ ] **Step 3 : le rapport, par chapitre.** Remplacer le bloc qui va de
      `console.log('=== Calibration — %d graines ===', …)` jusqu'à la ligne du garde-fou de
      passivité :

```js
console.log('=== Calibration — %d graines ===', SEEDS.length);
console.log('Premier coffre ouvert    : médiane %s h', fmt(medianOf(results, 'hoursToFirstChest')));

for (let chapter = 1; chapter <= MAX_CHAPTER; chapter++) {
  const heures = hoursOf(results, chapter);
  const deaths = deathsOf(results, chapter);
  const deadliest = [...deaths.entries()].sort((a, b) => b[1] - a[1])[0] ?? null;
  console.log('\n--- Chapitre %d : %s h cumulées · %s descentes · salle la plus meurtrière %j',
    chapter, fmt(heures), fmt(chapterField(results, chapter, 'runs')), deadliest);
  // Garde-fou : « le mur n'est jamais un bug, c'est le produit » doit tenir dans
  // CHAQUE chapitre, pas seulement dans le premier.
  console.log('    salle 10 la plus meurtrière : %s', deadliest && deadliest[0] === SALLES_PER_CHAPTER ? 'oui' : 'NON');
  for (let salle = 1; salle <= SALLES_PER_CHAPTER; salle++) {
    const all = results.flatMap((r) => r.chapters.get(chapter)?.salleDurations.get(salle) ?? []);
    const dead = deaths.get(salle) ?? 0;
    if (all.length === 0 && dead === 0) continue;
    console.log('    salle %d : %s s  (vidée %d fois, morts %d)',
      salle, all.length === 0 ? 'jamais vidée' : fmt(median(all) * TICK_S), all.length, dead);
  }
}

const passivite = chapterField(passive, 1, 'ticks');
console.log('\nGarde-fou passivité      : %s — doit rester très au-dessus de la référence',
  passivite === null ? 'jamais' : fmt((passivite * TICK_S) / 3600) + ' h');
```

- [ ] **Step 4 : les séries de comparaison restent sur le chapitre 1.** La série passive et
      les deux séries de contre-pioche mesurent des propriétés du chapitre 1 ; leur donner
      quatre chapitres les rendrait incomparables à l'historique. Ajouter `upTo: 1` à leurs
      appels :

```js
const passive = SEEDS.map((seed) => simulate(seed, { buyChests: true, steer: () => null, upTo: 1 }));
```

```js
  const runsFor = SEEDS.map((seed) =>
    simulate(seed, { buyChests: true, steer: steerWithTerrain, toupieId: toupie.id, upTo: 1 }));
```

```js
  const rs = SEEDS.map((seed) => simulate(seed, { buyChests: true, steer: steerWithTerrain, counterPick: when, upTo: 1 }));
```

et adapter leurs lectures : dans le comparatif de châssis,
`runs: median(runsFor.map((r) => r.runs))` devient `runs: chapterField(runsFor, 1, 'runs')`,
`hours: median(runsFor.map((r) => r.hoursToValidate))` devient `hours: hoursOf(runsFor, 1)`,
et le calcul de `d`/`deadliestSalle` devient `deathsOf(runsFor, 1)`. Dans `pickSeries`,
`runs: median(rs.map((r) => r.runs))` devient `runs: chapterField(rs, 1, 'runs')` et
`hours: median(rs.map((r) => r.hoursToValidate))` devient `hours: hoursOf(rs, 1)`.

- [ ] **Step 5 : ajouter l'import** en tête de `scripts/calibrate.mjs` :
      `MAX_CHAPTER` rejoint l'import depuis `../src/sim/config.ts`.

- [ ] **Step 6 : relever la référence**

Run : `npm run calibrate 2>&1 | tee /tmp/calibrate-t8.txt`
Attendu — **et c'est la vérification la plus importante de ce lot** : le bloc du chapitre 1
affiche **0,32 h, 9 descentes, salle la plus meurtrière [10, 23]**, le premier coffre à
0,00 h, la passivité « jamais », le comparatif de châssis et les deux séries de
contre-pioche identiques à l'historique. Le chapitre 1 est bit à bit inchangé par ce lot :
tout écart signale que la refonte du cycle de run a déplacé le flux de RNG, **pas** que
l'équilibrage a bougé. Si un chiffre bouge, comprendre pourquoi avant d'aller plus loin.

Les chapitres 2 à 4 s'affichent avec les facteurs provisoires des tâches 6 et 7. Noter
leurs chiffres : ils sont le point de départ des deux passes de calibration suivantes, et
la première mesure qui dise si le mur tombe bien au chapitre 3.

- [ ] **Step 7 : commit**

```bash
git add -A
git commit -m "test(calibrate): le harnais enchaîne les chapitres et rapporte par chapitre

Chaque chapitre a son relevé : heures, descentes, durées et morts par
salle, et le garde-fou « salle 10 la plus meurtrière » vérifié dans
chacun. Les séries de comparaison restent bornées au chapitre 1."
```

---

### Task 9 : passe de calibration — le combat

**Files:**
- Modify: `src/content/balance.json` (`bot.scaling.spinPerChapter`, `bot.scaling.attackPerChapter`)
- Create: `docs/superpowers/plans/2026-09-01-calibration-chapitres.md` (journal des balayages)

**Interfaces:**
- Consumes: le rapport par chapitre de la tâche 8

- [ ] **Step 1 : balayer la difficulté.** `econ.rewardPerChapter` **reste à sa valeur
      provisoire (1,25)** pendant toute cette passe : ce qui compte est qu'il ne bouge pas. Depuis la racine du worktree :

```bash
cp src/content/balance.json /tmp/balance-ref.json
for spin in 1.10 1.20 1.30 1.40; do
  for atk in 1.05 1.10 1.15; do
    python3 - "$spin" "$atk" <<'PY'
import json, sys
p = 'src/content/balance.json'
d = json.load(open(p))
d['bot']['scaling']['spinPerChapter'] = float(sys.argv[1])
d['bot']['scaling']['attackPerChapter'] = float(sys.argv[2])
json.dump(d, open(p, 'w'), ensure_ascii=False, indent=2)
open(p, 'a').write('\n')
PY
    echo "=== spin=$spin attack=$atk ==="
    npm run calibrate 2>&1 | grep -E "Chapitre [0-9]|salle 10 la plus|Premier coffre|passivité"
  done
done
cp /tmp/balance-ref.json src/content/balance.json
```

- [ ] **Step 2 : lire le balayage contre les garde-fous, dans cet ordre.**
      1. Dans **chaque** chapitre, la salle 10 reste la salle la plus meurtrière.
      2. Le chapitre 1 ne bouge pas d'un chiffre (il ne peut pas : exposant 0 — s'il bouge,
         c'est un bug, pas un réglage).
      3. Le premier coffre reste immédiat, la passivité reste « jamais ».
      4. Seulement ensuite, les cibles : chapitre 3 nettement plus coûteux que le 2,
         chapitre 4 au-dessus.
      **Choisir depuis un palier, jamais depuis un point isolé** : au moins trois valeurs
      consécutives qui tiennent les garde-fous. C'est la leçon de `rewardBase` (86 était un
      pic, ses deux voisines cassaient le pilier).

- [ ] **Step 3 : écrire les valeurs retenues** dans `src/content/balance.json` et relancer

Run : `npm run calibrate 2>&1 | tee /tmp/calibrate-combat.txt`
Attendu : les quatre garde-fous tenus, chapitre 1 identique au relevé de la tâche 8.

- [ ] **Step 4 : journaliser.** Créer
      `docs/superpowers/plans/2026-09-01-calibration-chapitres.md` sur le modèle de
      `2026-08-28-calibration-integration.md` : les garde-fous, les valeurs de départ, le
      tableau de balayage brut, le palier retenu et **pourquoi**, puis le rapport complet
      de la valeur retenue.

- [ ] **Step 5 : commit — combat seul**

```bash
npm run test && npm run build
git add -A
git commit -m "balance(combat): le facteur de difficulté par chapitre

Balayage à dix graines, revenu laissé neutre. Valeurs choisies depuis un
palier qui tient les garde-fous, pas depuis un point isolé. Journal :
docs/superpowers/plans/2026-09-01-calibration-chapitres.md"
```

---

### Task 10 : passe de calibration — l'économie

**Files:**
- Modify: `src/content/balance.json` (`econ.rewardPerChapter`)
- Modify: `docs/superpowers/plans/2026-09-01-calibration-chapitres.md`

- [ ] **Step 1 : balayer le revenu**, combat figé sur les valeurs de la tâche 9 :

```bash
cp src/content/balance.json /tmp/balance-ref.json
for r in 1.10 1.20 1.30 1.45 1.60; do
  python3 - "$r" <<'PY'
import json, sys
p = 'src/content/balance.json'
d = json.load(open(p))
d['econ']['rewardPerChapter'] = float(sys.argv[1])
json.dump(d, open(p, 'w'), ensure_ascii=False, indent=2)
open(p, 'a').write('\n')
PY
  echo "=== rewardPerChapter=$r ==="
  npm run calibrate 2>&1 | grep -E "Chapitre [0-9]|salle 10 la plus|Premier coffre|passivité"
done
cp /tmp/balance-ref.json src/content/balance.json
```

- [ ] **Step 2 : lire contre la cible.** Chapitre 2 validé en **1 à 3 descentes** après le
      chapitre 1 ; chapitre 3 nettement plus coûteux ; chapitre 4 au-dessus. Les quatre
      garde-fous priment sur cette cible : ne jamais sacrifier « salle 10 la plus
      meurtrière » dans un chapitre pour approcher un nombre de descentes. Choisir depuis
      un palier.

- [ ] **Step 3 : écrire la valeur retenue et relancer**

Run : `npm run calibrate 2>&1 | tee /tmp/calibrate-econ.txt`
Attendu : garde-fous tenus, chapitre 1 identique au relevé de la tâche 8.

- [ ] **Step 4 : compléter le journal** avec le tableau de balayage, le palier retenu et le
      rapport final complet.

- [ ] **Step 5 : commit — économie seule**

```bash
npm run test && npm run build
git add -A
git commit -m "balance(econ): le facteur de revenu par chapitre

Balayage à dix graines, combat figé. Le chapitre 2 se valide en 1 à 3
descentes après le 1 ; les quatre garde-fous tiennent dans les quatre
chapitres."
```

---

### Task 11 : vérification de bout en bout et documentation

**Files:**
- Modify: `docs/roadmap.md` (jalon 3 : ce que le lot A livre + dettes réglées et nouvelles)
- Modify: `docs/game-design.md` (§ Structure : le boss ferme le run ; § 8 arènes : chapitres 1-4 atteignables, gimmicks au lot C)
- Modify: `docs/ameliorations.md` (session du jour : ce que la vérification navigateur a montré)

- [ ] **Step 1 : le harnais du verrou, en navigateur.** Lancer `npm run dev` dans le
      worktree, lire la ligne « Local: » (5173 et 5174 sont pris par d'autres processus),
      puis :

Run : `PORT=<port> npm run verrou`
Attendu : « Verrou vérifié de bout en bout. », zéro échec, sur les deux passes.

- [ ] **Step 2 : vérifier le harnais par mutation.** Le harnais couvre ce qu'aucun test
      unitaire ne voit : que la nouvelle descente lancée par l'interface prend bien le
      châssis choisi entre-temps. La mutation fidèle fige ce châssis sans rien casser
      d'autre — dans le gestionnaire du bouton « Nouvelle descente » de
      `src/ui/CombatScreen.tsx` :

```tsx
                const gele = runRef.current.toupie;
                runRef.current = startRun(metaRef.current, chapterToPlay, s.rngState);
                runRef.current.toupie = gele; // MUTATION — à retirer
```

Run : `PORT=<port> npm run verrou`
Attendu : ÉCHEC des deux passes (le châssis en attente ne monte jamais). **Rétablir** et
relancer pour confirmer le vert.

- [ ] **Step 3 : la vérification navigateur du lot, horloge accélérée.** Écrire un script
      jetable dans le scratchpad (modèle : `scripts/verrou.mjs`), avec le même
      `page.addInitScript` qui enveloppe `requestAnimationFrame` (240 ms de temps virtuel
      par image) et une sauvegarde injectée en schéma 5, pièces au rang 11. Vérifier de ses
      propres yeux — **sans déléguer** :
      1. le boss vaincu **arrête** le combat (plus de retour en salle 1) ;
      2. le panneau annonce « Chapitre 1 validé » et propose les chapitres 1 **et** 2 ;
      3. « Nouvelle descente » sur le chapitre 2 démarre bien au chapitre 2 (le HUD nomme
         « Dojo Néon ») et les bots de la salle 1 y sont de type Défense ;
      4. le chapitre 3 **n'est pas** proposé tant que le 2 n'est pas validé ;
      5. une mort au chapitre 2 présélectionne le chapitre 2, pas le 1 ;
      6. l'écran Toupies affiche la composition du chapitre joué.
      Supprimer le script jetable après usage.

- [ ] **Step 4 : mettre à jour la roadmap.** Dans `docs/roadmap.md` : décrire ce que le lot A
      du jalon 3 a livré et ce qui reste aux lots B, C et D ; **retirer** des sections de
      dette les trois entrées réglées (`RenderEvents.chapterValidated` mort-né, « deux sites
      dérivent le boss », « une seule des deux directions du verrou est couverte
      automatiquement » — en gardant ce qui reste vrai de cette dernière : le harnais
      navigateur reste hors de `npm run test`), ainsi que « `chapterGroups(1)` code le
      chapitre 1 en dur » ; ajouter une section « Dette connue (jalon 3, lot A) » avec ce
      que la revue de branche aura trouvé, et les nouveaux chiffres de calibration par
      chapitre.

- [ ] **Step 5 : mettre à jour la spec de game design.** Dans `docs/game-design.md`,
      § Structure : « Valider la salle 10 = chapitre validé » gagne que **le run se ferme**
      et que le chapitre se choisit entre deux descentes ; § 8 arènes-chapitres : les
      chapitres 1 à 4 sont atteignables, leurs identités de terrain (murs élastiques,
      piliers, geysers) restent à poser. Reporter les nouvelles constantes d'économie et de
      difficulté par chapitre dans la section Économie, avec leur justification de mesure.

- [ ] **Step 6 : consigner le retour de jeu.** Dans `docs/ameliorations.md`, ouvrir une
      session datée du jour avec ce que la vérification navigateur a montré, et le tableau
      des chiffres par chapitre.

- [ ] **Step 7 : commit**

```bash
npm run test && npm run build
git add -A
git commit -m "docs: le lot A du jalon 3, ses mesures et ses dettes

Trois dettes tombent (l'événement mort-né, les sites qui devinaient le
boss, le point d'application du verrou sans test). La roadmap, la spec de
game design et la liste d'améliorations suivent."
```

- [ ] **Step 8 : relecture de la branche entière.** Avant toute fusion, faire relire
      `git diff origin/main...jalon-3-lot-a` **en entier** — pas tâche par tâche. C'est
      systématiquement à ce niveau que sortent les constats les plus graves sur ce projet.
      Utiliser `superpowers:requesting-code-review`.

---

## Self-review du plan

**Couverture de la spec** — chaque section a sa tâche : § 2.1 → T2 · § 2.2 → T2 · § 3.1 → T3 ·
§ 3.2 → T3 · § 3.3 → T1 et T3 · § 4 → T3 (minimal) et T4 · § 5 → T5 · § 6.1 → T6 · § 6.2 → T7 ·
§ 6.3 → T6, T7, T9, T10 · § 7.1 → T2 (schéma) et T3 (flux) · § 7.2 → T8 · § 8 → T3 (observateur),
T5 (identifiant de bot), T4 (`chapterGroups`) · § 9.1 → T2, T3, T6 (les quatre mutations) ·
§ 9.2 → T8 · § 9.3 → T11 · § 10 → aucune tâche, c'est du hors-périmètre · § 11 → T11 (dette).

**Écart assumé avec la spec** : la spec dit qu'`App.tsx` ouvre la première descente au
chapitre 1 ; le plan ouvre à `maxPlayableChapter(meta)` (T3, étape 8). Raison : le panneau
de choix n'apparaît qu'entre deux descentes, donc démarrer au chapitre 1 enfermerait un
joueur qui a débloqué le chapitre 3 jusqu'à sa prochaine mort. À arbitrer avant T3 ; si
l'arbitrage retient le chapitre 1, remplacer l'appel par `startRun(loaded.meta, 1, …)` et
rien d'autre ne change.
