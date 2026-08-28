# Intégration du jalon 2.5 dans le jalon 2b — plan d'implémentation

> **Pour les exécutants agentiques :** SOUS-COMPÉTENCE REQUISE — utiliser
> `superpowers:subagent-driven-development` (recommandé) ou
> `superpowers:executing-plans` pour dérouler ce plan tâche par tâche. Les étapes
> sont en cases à cocher (`- [ ]`).

**But :** fusionner la branche `jalon-2.5-terrain-et-butin` (terrain, butin) dans
`main` (toupies, triangle des forces), puis recalibrer l'ensemble en une passe —
sans perdre d'historique, sans rouvrir de décision de design, et sans jamais
régler le combat et l'économie dans le même commit.

**Architecture :** une branche `integration-2-5` partant de `main`, une **unique
fusion** `git merge jalon-2.5-terrain-et-butin` résolue en dix passes ordonnées
(socle de la masse → simulation → persistance → rendu → tests → harnais), toutes
mises en index au fur et à mesure et scellées par **un seul commit de fusion**.
Puis trois commits séparés : mesure de référence, calibration économique,
calibration de combat. Puis la documentation, qui dépend des chiffres finaux.

**Pile technique :** TypeScript, Vite, Vitest, PixiJS, React. Tests colocalisés
(`src/**/*.test.ts`), imports explicites depuis `vitest` (pas de globals).

**Spec :** `docs/superpowers/specs/2026-08-28-integration-2-5-dans-2b-design.md`
— à lire en entier avant la tâche 1. Ce plan la corrige sur onze points, tous
signalés par la mention **⚠ Correction de la spec**.

**Spec du jalon 2.5** (contexte du *pourquoi* du terrain) :
`git show jalon-2.5-terrain-et-butin:docs/superpowers/specs/2026-08-26-jalon-2-5-terrain-et-butin-design.md`
et son plan `…/plans/2026-08-27-jalon-2-5-terrain-et-butin.md`. Le journal de
test joueur qui a motivé le jalon :
`git show jalon-2.5-terrain-et-butin:docs/ameliorations.md`.

---

## Contraintes globales

Elles s'appliquent implicitement à **toutes** les tâches.

- **`src/sim/` est pur et déterministe.** Aucun import de DOM, PixiJS, React,
  `Date` ni `Math.random`. Le RNG est sérialisé dans l'état (`rngState`), le
  temps avance uniquement par `tick()` à pas fixe (`TICK_S = 0,1 s`).
- **L'ordre de consommation du flux de RNG fait partie du contrat.** Deux runs
  avec même graine et mêmes entrées produisent des états strictement identiques.
  Le test de déterminisme de `src/sim/sim.test.ts` est le garde-fou : **il ne
  doit jamais être modifié pour passer**.
- **Le rendu est un spectateur.** `src/render/` et `src/ui/` lisent l'état, ne le
  mutent jamais ; toute mutation passe par `src/sim/`.
- **Tout l'équilibrage vit dans `src/content/balance.json`.** Jamais de constante
  d'équilibrage en dur ailleurs.
- **Le combat et l'économie ne se règlent jamais dans la même passe.** Ce projet
  l'a payé deux fois. Deux commits, deux mesures, jamais mélangés.
- **Aucune fonctionnalité nouvelle**, ni côté terrain, ni côté toupies. **Aucune
  décision de design du 2b rouverte** — triangle, châssis, boutique.
- **Le farm ne progresse jamais** : AUTO et hors-ligne rejouent le meilleur
  chapitre validé.
- **IP :** aucun nom officiel Beyblade dans le code, les données ou l'UI.
- **Langue :** textes joueur, commentaires et messages de commit en **français** ;
  code et identifiants en anglais (vocabulaire métier `salle`, `toupie` accepté).
- **Pas de code mort**, pas de code « au cas où ». **Une exception nommée
  (ruling R5, pré-vol) :** la valeur de retour ignorée de `takeShard` dans
  `sim.ts` n'est pas du code mort. Le commentaire en place l'explique —
  `terrain.test.ts` asserte l'identité du preneur sur cette valeur, et une
  version `void` forcerait ces tests à la déduire par effet de bord. Ne pas la
  supprimer, ne pas la signaler.

### Commandes

```bash
npm run dev        # serveur Vite — le port 5173 est pris sur cette machine (voir T16)
npm run test       # vitest run
npm run build      # tsc + vite build  ← seul à typer ; vitest ne type pas
npm run calibrate  # vite-node scripts/calibrate.mjs
npm run shots      # captures Playwright, exige un npm run dev déjà lancé
```

**`npm run test` ne fait aucune vérification de types.** Vitest transforme via
esbuild, qui efface les types sans les vérifier. Une interface avec un champ en
double ou un littéral d'objet avec une clé répétée passe les tests et n'est
rattrapé que par `npm run build`. Ce plan en dépend : plusieurs tâches se
terminent par `npm run build`, pas seulement par `npm run test`.

---

## Ce que la fusion produit réellement

Mesuré par une fusion exploratoire annulée avant d'écrire ce plan.

**⚠ Correction de la spec.** La spec annonce « 31 fichiers en conflit ». 31 est
le nombre de fichiers **touchés des deux côtés** ; `git merge` n'en signale que
**22**. Les 9 autres sont fusionnés automatiquement — et **trois d'entre eux le
sont de travers, sans le moindre marqueur de conflit**. C'est le piège central
de cette intégration.

### Les 22 conflits signalés, par nombre de hunks

| Hunks | Fichier | Tâche |
|---|---|---|
| 4 | `src/render/textures.ts` | T8 |
| 3 | `src/sim/combat.test.ts` | T9 |
| 3 | `scripts/calibrate.mjs` | T10 |
| 2 | `src/sim/physics.test.ts` | T9 |
| 2 | `src/sim/meta.test.ts` | T9 |
| 2 | `src/sim/config.test.ts` | T9 |
| 2 | `src/sim/combat.ts` | T3 |
| 2 | `src/content/balance.json` | T4 |
| 2 | `docs/superpowers/specs/2026-08-27-jalon-2b-toupies-design.md` (add/add) | T15 |
| 2 | `docs/roadmap.md` | T15 |
| 2 | `docs/game-design.md` | T15 |
| 1 | `src/sim/sim.ts` | T5 |
| 1 | `src/sim/sim.test.ts` | T9 |
| 1 | `src/sim/save.ts` | T7 |
| 1 | `src/sim/salle.test.ts` | T9 |
| 1 | `src/sim/meta.ts` | T6 |
| 1 | `src/sim/economy.ts` | T6 |
| 1 | `src/sim/config.ts` | T4 |
| 1 | `src/sim/chest.test.ts` | T9 |
| 1 | `src/render/snapshot.ts` | T8 |
| 1 | `src/render/snapshot.test.ts` | T9 |
| 1 | `src/render/arena.ts` | T8 |

### Les 9 auto-fusionnés — dont 3 corrompus

| Fichier | État après auto-fusion |
|---|---|
| `src/sim/types.ts` | **CORROMPU** — `Top.mass` déclaré **deux fois** (T2) |
| `src/sim/salle.ts` | **CORROMPU** — `makeBot` pose `mass:` deux fois, le second (`1`) écrase le premier : **la masse ×3 du boss disparaît en silence** (T2) |
| `src/sim/sim.ts` | **DOUBLON** — `makePlayer` pose `mass:` deux fois ; le second est le bon, mais le premier est du code mort (T2) |
| `src/sim/save.test.ts` | **PÉRIMÉ** — tests `v: 3` en dur qui casseront au schéma 4 (T7) |
| `src/ui/TabBar.tsx` | correct : 4 onglets **et** la pastille sur Coffres |
| `src/ui/App.tsx` | correct |
| `src/theme.ts` | correct : `TYPE_TINT` **et** les trois couleurs de zone |
| `src/sim/chest.ts` | correct : `poolFor` **et** `drawPulls`/`grantChest` (voir T6) |
| `src/render/observer.test.ts` | correct |
| `docs/superpowers/plans/2026-08-27-jalon-2b-toupies.md` | identique des deux côtés (même SHA) |

### Structure de fichiers

Aucun fichier créé ni supprimé par cette intégration, hors ce plan. Les 9
fichiers **additifs** (`src/sim/physics.ts`, `src/sim/terrain.ts`,
`src/sim/terrain.test.ts`, `src/render/observer.ts`, `src/sim/economy.test.ts`,
`src/ui/ChestScreen.tsx`, `docs/ameliorations.md`, la spec et le plan du 2.5)
arrivent tels quels — **⚠ Correction de la spec** : le § 2.1 les décrit comme
« des fichiers nouveaux », mais 4 d'entre eux existaient au point de fork
(`physics.ts`, `observer.ts`, `economy.test.ts`, `ChestScreen.tsx`) ; ce sont des
modifications à sens unique. Effet identique, formulation trompeuse.

---

## Séquençage

```
T1  préparer le worktree, la fusion, l'inventaire
T2  le socle de la masse          ← corruptions silencieuses, en premier
T3  combat.ts
T4  config.ts + balance.json
T5  sim.ts — l'ordre de tick
T6  economy.ts + meta.ts + chest.ts
T7  save.ts — SAVE_SCHEMA = 4
T8  le rendu
T9  l'union des deux suites de tests
T10 calibrate.mjs
T11 shots.mjs
T12 sceller la fusion             ← LE commit de fusion
─── à partir d'ici, un commit par tâche ───
T13 mesure de référence du build fusionné
T14 calibration ÉCONOMIE          ← commit isolé
T15 calibration COMBAT            ← commit isolé
T16 documentation
T17 vérification manuelle au navigateur
```

**T2 à T11 ne produisent aucun commit.** Elles résolvent des conflits dans une
fusion en cours. Chacune se termine par `git add` des fichiers traités : c'est le
mécanisme git natif qui marque un conflit résolu et met le travail à l'abri. Le
commit de fusion tombe en T12.

---

## Task 1 : préparer le worktree, la fusion et l'inventaire

**Fichiers :**
- Aucun modifié. Prépare `/Users/nicolasrabault/Projects/B-Blades_versus-integration`.

**Interfaces :**
- Produit : un worktree sur `integration-2-5` avec `node_modules` installé, une
  fusion en cours, et `/tmp/…/conflits.txt` listant les 22 fichiers en conflit.

- [ ] **Étape 1 : vérifier que le worktree existe et est propre**

```bash
cd /Users/nicolasrabault/Projects/B-Blades_versus
git worktree list
```

Attendu : trois lignes, dont
`/Users/nicolasrabault/Projects/B-Blades_versus-integration  … [integration-2-5]`.

Si elle manque :

```bash
git worktree add -b integration-2-5 /Users/nicolasrabault/Projects/B-Blades_versus-integration main
```

**Ne jamais toucher** `/Users/nicolasrabault/Projects/B-Blades_versus-verrou`
(branche `verrou-toupie`) : il appartient à un autre travail.

- [ ] **Étape 2 : installer les dépendances dans le worktree**

Un nouveau worktree n'a pas de `node_modules` — sans ça, ni `npm run test` ni
`npm run build` ne tournent.

```bash
cd /Users/nicolasrabault/Projects/B-Blades_versus-integration
npm install
```

- [ ] **Étape 3 : mesurer la référence d'avant-fusion**

```bash
cd /Users/nicolasrabault/Projects/B-Blades_versus-integration && npm run test 2>&1 | tail -5
```

Attendu : `Test Files  20 passed (20)` · `Tests  233 passed (233)`.
Noter ces chiffres : la suite fusionnée doit être strictement au-dessus.

- [ ] **Étape 4 : lancer la fusion**

```bash
cd /Users/nicolasrabault/Projects/B-Blades_versus-integration
git merge --no-commit jalon-2.5-terrain-et-butin
```

Attendu : `Automatic merge failed; fix conflicts and then commit the result.`
**Ne pas commiter, ne pas annuler.** La fusion reste ouverte jusqu'à T12.

- [ ] **Étape 5 : inventorier**

```bash
cd /Users/nicolasrabault/Projects/B-Blades_versus-integration
git diff --name-only --diff-filter=U | sort | tee /tmp/conflits.txt | wc -l
```

Attendu : **22**. Si le nombre diffère, s'arrêter et signaler : la base a bougé
depuis l'écriture de ce plan et le tableau des hunks ci-dessus n'est plus fiable.

- [ ] **Étape 6 : confirmer les trois corruptions silencieuses**

```bash
cd /Users/nicolasrabault/Projects/B-Blades_versus-integration
grep -n "mass:" src/sim/types.ts src/sim/salle.ts src/sim/sim.ts
```

Attendu — six lignes, soit trois paires de doublons :

```
src/sim/types.ts:21:  mass: number;
src/sim/types.ts:39:  mass: number;      ← doublon dans l'interface Top
src/sim/salle.ts:32:    mass: boss ? BOSS.mass : 1,
src/sim/salle.ts:43:    mass: 1,          ← écrase la masse du boss
src/sim/sim.ts:26:    mass: 1,           ← code mort
src/sim/sim.ts:37:    mass: stats.mass * talents.mass,
```

(`types.ts:51` est `Stats.mass`, légitime — ne pas y toucher.)

Aucun commit dans cette tâche.

---

## Task 2 : le socle de la masse

Traitée en premier parce que les trois autres passes de simulation en dépendent,
et parce que c'est la seule corruption que ni `git` ni `npm run test` ne
signalent.

**⚠ Correction de la spec.** Les § 3.3 et § 3.5 sont porteurs l'un de l'autre et
la spec ne le dit pas. Prendre le `const ma = a.mass` de `main` (§ 3.3) **sans**
replier `boss.mass` dans `Top.mass` (§ 3.5) supprime la masse ×3 du boss de toute
la physique. Or l'auto-fusion fait exactement ça, en silence, dans un fichier
sans marqueur de conflit. Aucun test de `main` ne le rattrape — c'est un test de
la branche (T9) qui le fera.

**Fichiers :**
- Modifier : `src/sim/types.ts` (interface `Top`)
- Modifier : `src/sim/salle.ts` (`makeBot`)
- Modifier : `src/sim/sim.ts` (`makePlayer` — uniquement le doublon `mass:`,
  l'ordre de tick est en T5)

**Interfaces :**
- Produit : `Top.mass: number` — **la masse résolue**, un seul champ, produit de
  quatre contributeurs : châssis × modèle de Disque × talent Masse × masse propre
  (boss). Lue telle quelle par `resolveCollision` (T3).
- Produit : `makeBot(chapter: number, salle: number, index: number, angle: number): Top`
- Produit : `Stats.mass: number` — masse issue des seuls profils, sans le talent.

- [ ] **Étape 1 : dédupliquer `Top.mass` dans `types.ts`**

Le champ apparaît deux fois avec deux commentaires différents. Garder **un seul**
champ, à la place du premier (juste après `radius`), avec un commentaire qui dit
les **quatre** contributeurs — celui de `main` n'en cite que trois, il est devenu
faux en fusionnant.

Supprimer le bloc situé après `decayPauseTicks` :

```ts
  /** Masse résolue pour le calcul d'impulsion : châssis × modèle de Disque ×
   *  talent Masse. Vit sur la toupie et non dans `talents`, parce que trois
   *  systèmes y contribuent — `talents.mass` n'est plus que l'un d'eux. */
  mass: number;
```

et remplacer le bloc situé après `radius` par :

```ts
  /** Masse résolue pour le calcul d'impulsion. Quatre systèmes y contribuent :
   *  châssis × modèle de Disque × talent Masse pour le joueur, masse propre pour
   *  le boss. Vit sur la toupie et non dans `talents`, parce que `talents.mass`
   *  n'en est plus que l'un des facteurs. */
  mass: number;
```

Laisser `Stats.mass` intact.

- [ ] **Étape 2 : réparer `makeBot` dans `salle.ts`**

Le littéral porte deux clés `mass`. Supprimer la seconde (`mass: 1,`, celle qui
suit `type: botTypeFor(chapter, salle),`) et **garder** :

```ts
    mass: boss ? BOSS.mass : 1,
```

C'est le § 3.5 : la masse propre du boss est le quatrième contributeur. Pour un
bot, châssis, Disque et talents valent tous 1 — la masse résolue se réduit donc à
sa masse propre.

- [ ] **Étape 3 : nettoyer `makePlayer` dans `sim.ts`**

Supprimer la première clé (`mass: 1,`, celle qui suit `radius: PLAYER_BASE.radius,`).
Garder la seconde :

```ts
    mass: stats.mass * talents.mass,
```

Ne rien changer d'autre dans `sim.ts` : le conflit de l'ordre de tick est traité
en T5 et ses marqueurs `<<<<<<<` restent en place.

- [ ] **Étape 4 : vérifier qu'il ne reste plus un seul doublon**

```bash
cd /Users/nicolasrabault/Projects/B-Blades_versus-integration
grep -n "mass:" src/sim/types.ts src/sim/salle.ts src/sim/sim.ts
```

Attendu — exactement trois lignes :

```
src/sim/types.ts:21:  mass: number;
src/sim/types.ts:51:  mass: number;      ← Stats.mass, légitime
src/sim/salle.ts:32:    mass: boss ? BOSS.mass : 1,
src/sim/sim.ts:37:    mass: stats.mass * talents.mass,
```

- [ ] **Étape 5 : vérifier que la masse du boss survit**

```bash
cd /Users/nicolasrabault/Projects/B-Blades_versus-integration
grep -n "BOSS.mass" src/sim/salle.ts && grep -n '"mass"' src/content/balance.json
```

Attendu : `salle.ts` référence `BOSS.mass`, et `balance.json` contient
`"mass": 3` dans le bloc `boss` (le fichier porte encore ses marqueurs de
conflit, c'est normal — ils sont traités en T4).

- [ ] **Étape 6 : mettre en index**

```bash
cd /Users/nicolasrabault/Projects/B-Blades_versus-integration
git add src/sim/types.ts src/sim/salle.ts
```

`sim.ts` n'est **pas** mis en index : il porte encore des marqueurs de conflit.

---

## Task 3 : `combat.ts`

**Fichiers :**
- Modifier : `src/sim/combat.ts` (2 hunks en conflit)

**Interfaces :**
- Consomme : `Top.mass` (T2), `ZoneMods` de `src/sim/terrain.ts` (additif).
- Produit : `decayPerTick(top: Top): number`
- Produit : `drainPerTick(top: Top, zone: ZoneMods): number`
- Produit : `decaySpin(top: Top, zone: ZoneMods): void`
- Produit : `resolveCollision(a: Top, b: Top): void`

- [ ] **Étape 1 : résoudre le hunk des imports**

Union stricte — les deux imports sont nécessaires :

```ts
import { CHARGE_BONUS, DAMAGE_K, RESTITUTION, TICK_S } from './config';
import type { ZoneMods } from './terrain';
import { typeMult } from './typeChart';
import type { Top } from './types';
```

- [ ] **Étape 2 : résoudre le hunk `decaySpin` — prendre la version de la branche**

`main` n'a pas touché à ces fonctions ; la branche les a réécrites. Écrire, à la
place du bloc en conflit et juste après `decayPerTick` :

```ts
/** Spin perdu par seconde, terrain compris. `snapshot.ts` s'en sert pour prédire
 *  le tick à venir : sans la perte de zone, `observer.ts` prendrait les pointes
 *  pour un choc et couvrirait l'arène d'étincelles sans contact. */
export function drainPerTick(top: Top, zone: ZoneMods): number {
  return decayPerTick(top) + zone.spinDrain;
}

export function decaySpin(top: Top, zone: ZoneMods): void {
  // Lu AVANT le décrément : lu après, le dernier tick d'une pause de Relance
  // reprendrait la décroissance naturelle un tick trop tôt.
  const drain = drainPerTick(top, zone);
  // Relance suspend l'endurance, jamais les pointes — celles-ci sont des dégâts.
  if (top.decayPauseTicks > 0) top.decayPauseTicks--;
  top.spin -= drain * TICK_S;
}
```

**Ces deux subtilités ont chacune coûté un aller-retour de relecture au jalon
2.5. Ne pas les « simplifier ».** La lecture avant décrément et l'exemption des
pointes sont couvertes par des tests dédiés en T9.

- [ ] **Étape 3 : vérifier que `damage()` et `resolveCollision` sont ceux de `main`**

Ces deux blocs ne sont pas en conflit : la branche ne les a modifiés que sur la
ligne de masse, et `main` en est un sur-ensemble. Confirmer :

```bash
cd /Users/nicolasrabault/Projects/B-Blades_versus-integration
grep -n "typeMult(att.type, def.type)\|const ma = a.mass\|const mb = b.mass" src/sim/combat.ts
```

Attendu : trois lignes. `damage()` compose bien **quatre** facteurs (charge,
Percée, Estoc, triangle) et l'impulsion lit `a.mass` — la masse résolue de T2,
qui porte désormais aussi celle du boss.

- [ ] **Étape 4 : plus aucun marqueur**

```bash
cd /Users/nicolasrabault/Projects/B-Blades_versus-integration
grep -c '^<<<<<<<\|^=======$\|^>>>>>>>' src/sim/combat.ts
```

Attendu : `0`.

- [ ] **Étape 5 : mettre en index**

```bash
cd /Users/nicolasrabault/Projects/B-Blades_versus-integration
git add src/sim/combat.ts
```

---

## Task 4 : `config.ts` et `balance.json`

**Aucune valeur d'équilibrage n'est arbitrée ici.** Cette tâche fait l'**union
des clés** et rien d'autre. Les valeurs en collision partent en T14/T15 ; les
laisser telles que la résolution les pose et les mesurer avant d'y toucher.

**Fichiers :**
- Modifier : `src/content/balance.json` (2 hunks)
- Modifier : `src/sim/config.ts` (1 hunk)

**Interfaces :**
- Produit (types) : `ZoneKind`, `ZoneDef`, `LayoutDef`, `LootRule`, `ChestName`
- Produit (exports) : `ARENA`, `BREACH`, `SHARD`, `ZONES`, `LAYOUTS`, `LOOT`,
  en plus de ceux de `main` (`TYPES`, `BOT_TYPES`, `TOUPIE_SHOP`, `CHASSIS`,
  `MODELS_PROFILE`).

- [ ] **Étape 1 : résoudre `balance.json` — union des clés**

Clés à conserver **des deux côtés** :

- de `main` : `types`, `botTypes`, `toupieShop`, `chassis`, `models`
- de la branche : `arena.overspeedDamping`, `arena.spawnClearance`,
  `arena.breach`, `arena.shard`, `arena.zones`, `arena.layouts`, `boss.mass`,
  `loot`

Valeurs en collision — **poser celles indiquées, ne pas arbitrer** :

| Clé | `main` | branche | À poser en T4 | Arbitré en |
|---|---|---|---|---|
| `version` | 2 | 1 | **3** | ici (voir étape 2) |
| `combat.damageK` | 0,35 | 1,3 | **1,3** | T15 |
| `econ.rewardBase` | 60 | 86 | **86** | T14 |
| `arena.restitution` | **0,8** | 1,6 | **1,6** | T15 |
| `chests.bronze.price` | 2 000 | 250 | **250** | T14 |
| `chests.bronze.price10` | 18 000 | 2 250 | **2 250** | T14 |

**⚠ Correction de la spec.** Le § 3.6 note `arena.restitution` côté `main` comme
« — », comme s'il s'agissait d'une clé purement additive. C'est faux : `main`
porte **0,8**, la valeur du point de fork. C'est une vraie collision 0,8 ↔ 1,6, et
1,6 porte la répulsion réelle — un pilier documenté du 2.5, pas un bouton neutre.
La retenir en T15 comme telle.

On pose les valeurs de la branche parce que ce sont celles du jalon le plus
récent et les seules mesurées **avec** le terrain ; elles sont le point de départ
de la mesure de T13, pas une décision.

- [ ] **Étape 2 : trancher `balance.json.version`**

**⚠ Correction de la spec.** Ce champ est absent du tableau du § 3.6 alors qu'il
est en conflit littéral : `main` l'a passé à 2, la branche l'a laissé à 1. Le
schéma fusionné n'est ni l'un ni l'autre → **`"version": 3`**.

```json
  "version": 3,
```

`config.test.ts` ne vérifie qu'« entier ≥ 1 », donc rien ne casse — raison de plus
pour le décider explicitement plutôt que de laisser la fusion choisir.

- [ ] **Étape 3 : résoudre `config.ts` — union des interfaces et des exports**

Le bloc `interface Balance` doit porter **à la fois** l'`arena` étendue de la
branche et les champs de `main` :

```ts
  arena: {
    radius: number; friction: number; wallRestitution: number; restitution: number;
    overspeedDamping: number;
    spawnClearance: number;
    breach: { count: number; halfWidthDeg: number; ejectSpeed: number; fromSalle: number };
    shard: {
      everyTicks: number; lifeTicks: number; radius: number; spinGain: number;
      minRadius: number; maxRadius: number;
    };
    zones: Record<ZoneKind, ZoneDef>;
    layouts: LayoutDef[];
  };
  combat: { damageK: number; chargeBonus: number; healBetweenSalles: number };
  types: { dominantBonus: number; equilibreBonus: number };
  chapter: { sallesPerChapter: number; botsPerSalle: number[] };
  botTypes: Record<string, TopType[]>;
```

et plus bas `boss: { spinMult: number; attackMult: number; radius: number; mass: number };`,
`loot: { bySalle: LootRule & { fromSalle: number }; boss: LootRule };`,
`toupieShop: { priceGems: number };`, `chassis:` et `models:`.

Conserver les types `ZoneKind`, `ZoneDef`, `LayoutDef`, `LootRule`, `ChestName`
de la branche et les six exports de fin de fichier (`ARENA`, `BREACH`, `SHARD`,
`ZONES`, `LAYOUTS`, `LOOT`) **en plus** de ceux de `main`.

- [ ] **Étape 4 : vérifier**

```bash
cd /Users/nicolasrabault/Projects/B-Blades_versus-integration
grep -c '^<<<<<<<\|^=======$\|^>>>>>>>' src/content/balance.json src/sim/config.ts
node -e "JSON.parse(require('fs').readFileSync('src/content/balance.json','utf8')); console.log('JSON valide')"
```

Attendu : `0` pour les deux fichiers, puis `JSON valide`.

- [ ] **Étape 5 : mettre en index**

```bash
cd /Users/nicolasrabault/Projects/B-Blades_versus-integration
git add src/content/balance.json src/sim/config.ts
```

---

## Task 5 : `sim.ts` — l'ordre de tick

La tâche la plus délicate du plan : l'ordre est le contrat de déterminisme.

**⚠ Correction de la spec.** Le § 3.4 se présente comme la liste faisant
autorité, « phase par phase », mais **il omet un tirage de RNG**. Sur la branche,
`salleReward(salle, boss, rngState)` consomme **exactement un tirage**, à la fin
du tick, **avant** `startSalle` — donc avant `spawnSalle` et `buildLayout`.
`updateShard` en consomme aussi et apparaît comme une étape ordinaire. Se tromper
là décale tout le flux aval sans qu'aucun test de `main` ne bronche.

**⚠ Correction du plan (ruling R1, pré-vol).** Le seul conflit de `sim.ts` est le
**bloc d'import**. `tick()` et `startSalle()` se sont auto-fusionnés à l'ordre
canonique **exact** ci-dessous — `spawnSalle(run.chapter, …)` de `main` fusionné
avec `buildLayout` de la branche compris. Cette tâche **audite** ; elle ne
réécrit rien qui soit déjà juste. Réécrire à la main un `tick()` correct, c'est
risquer de déplacer un tirage de RNG sans nécessité.

**Fichiers :**
- Modifier : `src/sim/sim.ts` (1 hunk : les imports ; le doublon `mass` est déjà réglé en T2)

**Interfaces :**
- Consomme : `decaySpin(top, zone)` et `drainPerTick` (T3) ; `zoneModsAt`,
  `buildLayout`, `updateShard`, `takeShard` de `src/sim/terrain.ts` ;
  `moveAndBounce(top, arena): boolean` de `src/sim/physics.ts` ;
  `spawnSalle(chapter, salle, rngState)` (T2) ; `salleReward(salle, boss, rngState)` (T6).
- Produit : `tick(run: RunState, input: Input): RunReward | null`
- Produit : `createRun`, `resetRun`, `syncRunStats` inchangés dans leur signature.

- [ ] **Étape 1 : résoudre l'union des imports**

Le hunk en conflit porte sur deux lignes. Union :

```ts
import { activeToupie } from './meta';
import type { Input, MetaState, RunReward, RunState, Top, Vec } from './types';
```

`activeToupie` vient de `main` (type du joueur), `Vec` de la branche
(`refreshBotAims` cible l'éclat).

- [ ] **Étape 2 : auditer le tick auto-fusionné contre l'ordre exact**

```
run.tick++
si phase ≠ 'fighting' → return null
run.ejected = []
refreshBotAims                       (tous les 10 ticks — 1 tirage par bot)
playerZone ← zoneModsAt(arena, player.pos)
botZones   ← bots.map(bot => zoneModsAt(arena, bot.pos))
applySteering(player, input.steer, playerZone)
applySteering(bot, bot.aim, botZones[i])   pour chaque bot
moveTop(run, player)                 → éjection ⇒ spin = 0, id dans run.ejected
moveTop(run, bot)                    pour chaque bot
resolveCollision(player, bot)        pour chaque bot
resolveCollision(bot[i], bot[j])     pour chaque paire
clampToArena(player) ; clampToArena(bot) pour chaque bot
run.rngState = updateShard(arena, run.rngState)      ← CONSOMME DU RNG
takeShard(arena, [player, ...bots])
decaySpin(player, playerZone)
decaySpin(bot, botZones[i])          pour chaque bot   ← MÊME zone qu'au pilotage
run.bots = filtre des morts                             ← APRÈS les decaySpin
mort du joueur / second souffle
si bots vides :
  rolled = salleReward(salle, boss, run.rngState)     ← CONSOMME DU RNG
  run.rngState = rolled.rngState                      ← AVANT startSalle
  salle suivante ; soin entre salles
  startSalle(run)   → spawnSalle PUIS buildLayout     ← ordre non négociable
  return rolled.reward
```

Le tick auto-fusionné **doit déjà** correspondre à cet ordre. Le comparer ligne
par ligne et ne corriger qu'une déviation réelle. Trois invariants que la
relecture du 2.5 a payés :

1. **Phase par phase.** Toutes les toupies traversent une étape avant la
   suivante. C'est ce qui rend le déterminisme lisible.
2. **`zone` est lue une fois par toupie et par tick**, avant le pilotage, et la
   **même valeur** sert au pilotage et à la décroissance. Deux lectures
   divergentes dans le même tick, c'est le bug.
3. **`run.bots` n'est filtré qu'après les `decaySpin`** : sinon les index se
   désalignent de `botZones`.

- [ ] **Étape 3 : conserver `moveTop` et `refreshBotAims` de la branche**

```ts
/** Avance une toupie et encaisse l'éjection s'il y a lieu. */
function moveTop(run: RunState, top: Top): void {
  if (!moveAndBounce(top, run.arena)) return;
  top.spin = 0;
  run.ejected.push(top.id);
}
```

`refreshBotAims` détourne vers l'éclat quand le bot en est plus près que du
joueur, **à un tirage par bot** — le flux ne bouge pas. Garder le commentaire qui
l'explique.

- [ ] **Étape 4 : conserver le typage des bots de `main` dans `startSalle`**

```ts
function startSalle(run: RunState): void {
  const spawned = spawnSalle(run.chapter, run.salle, run.rngState);
  run.bots = spawned.bots;
  // Bots d'abord, terrain ensuite : l'ordre de consommation du flux fait partie
  // du contrat de déterminisme.
  const built = buildLayout(run.salle, spawned.rngState);
  run.arena = built.layout;
  run.rngState = built.rngState;
  …
}
```

`run.chapter` de `main` **et** `buildLayout` de la branche, dans cet ordre.

- [ ] **Étape 5 : conserver `arena` et `ejected` dans `createRun` / `resetRun`**

`createRun` initialise `arena: { zones: [], breaches: [], shard: null, shardTimer: 0 }`
(remplacé par `startSalle` juste après) et `ejected: []`. `resetRun` remet
`run.ejected = []`.

- [ ] **Étape 6 : vérifier**

```bash
cd /Users/nicolasrabault/Projects/B-Blades_versus-integration
grep -c '^<<<<<<<\|^=======$\|^>>>>>>>' src/sim/sim.ts
grep -n "updateShard\|salleReward\|startSalle(run)\|run.bots.filter" src/sim/sim.ts
```

Attendu : `0` marqueur, et dans `tick()` l'ordre `updateShard` → `run.bots.filter`
→ `salleReward` → `startSalle`.

- [ ] **Étape 7 : mettre en index**

```bash
cd /Users/nicolasrabault/Projects/B-Blades_versus-integration
git add src/sim/sim.ts
```

---

## Task 6 : `economy.ts`, `meta.ts`, `chest.ts`

**⚠ Correction de la spec.** Ces trois fichiers ne figurent dans aucune des trois
catégories du § 2. `economy.ts` et `meta.ts` sont en conflit, `chest.ts` s'est
auto-fusionné correctement — mais il porte une **conséquence sémantique que ni
l'un ni l'autre jalon n'a décidée** (étape 4).

**Fichiers :**
- Modifier : `src/sim/economy.ts` (1 hunk)
- Modifier : `src/sim/meta.ts` (1 hunk)
- Vérifier : `src/sim/chest.ts` (auto-fusionné)

**Interfaces :**
- Produit : `salleReward(salle: number, boss: boolean, rngState: number): { reward: RunReward; rngState: number }`
- Produit : `playerStats(meta: MetaState): Stats` — avec `accel` et `mass`
- Produit : `applyReward(meta: MetaState, reward: RunReward): void` — crédite aussi `meta.pending`
- Produit : `pendingTotal(meta: MetaState): number`
- Produit : `activeToupie`, `setActiveToupie`, `buyToupie`, `canClaimFounderGift`, `claimFounderGift`
- Produit : `drawPulls(meta, kind, count)`, `grantChest(meta, kind)`, `openChest(meta, kind, count)`

- [ ] **Étape 1 : `economy.ts` — union de deux fonctions disjointes**

Les deux côtés ont modifié le même fichier mais pas la même fonction. Imports :

```ts
import { ECON, LOOT, PIECE_EFFECT, PLAYER_BASE } from './config';
import { nextRandom } from './rng';
import { rarityMult, type PieceInstance, type Slot } from './piece';
import { resolveProfile } from './profile';
import type { ChestKind, MetaState, RunReward, Stats } from './types';
```

`salleReward` : la version de la branche, entière, **y compris son commentaire**
— le tirage d'extra a lieu **de toute façon**, même quand la salle n'y a pas
droit, sinon le flux n'avancerait pas pareil selon la salle et toute mesure de
déterminisme deviendrait illisible.

`playerStats` : la version de `main`, entière, avec les facteurs de profil, les
champs `accel` et `mass`, et le commentaire qui explique pourquoi la Pointe
**divise** là où le profil **multiplie**.

- [ ] **Étape 2 : `meta.ts` — union**

De la branche : la ligne de `applyReward`

```ts
  for (const kind of reward.chests) meta.pending[kind]++;
```

et `pendingTotal`. De `main` : `createInitialMeta` avec `toupies` **et**
`founderGiftClaimed`, plus les cinq fonctions de toupie. `createInitialMeta` doit
porter les **trois** champs :

```ts
    pity: { bronze: 0, arene: 0, mythique: 0 },
    pending: { bronze: 0, arene: 0, mythique: 0 },
    chapterValidated: false,
    toupies: { unlocked: [STARTER_TOUPIE], active: STARTER_TOUPIE },
    founderGiftClaimed: false,
```

- [ ] **Étape 3 : vérifier `chest.ts`**

```bash
cd /Users/nicolasrabault/Projects/B-Blades_versus-integration
grep -n "function poolFor\|const models = poolFor\|export function drawPulls\|export function grantChest" src/sim/chest.ts
```

Attendu : quatre lignes. `poolFor` (de `main`) **et** `drawPulls`/`grantChest`
(de la branche) coexistent, et `drawOne` tire dans `poolFor(meta, slot)`.

- [ ] **Étape 4 : consigner la conséquence croisée**

**⚠ Complément à la spec — huitième décision, à documenter, pas à coder.**

`grantChest` → `drawPulls` → `drawOne` → `poolFor`. Les coffres **lâchés par les
salles** (jalon 2.5) tirent donc désormais dans le vivier **restreint aux toupies
débloquées** (jalon 2b) pour les Lames et les Noyaux. Aucun des deux jalons ne
l'a décidé : c'est une conséquence de la fusion.

C'est le comportement à retenir : le commentaire de `poolFor` énonce une règle sur
le **vivier de pièces**, indépendante de la provenance du coffre — un coffre de
butin est un coffre. L'alternative créerait une seconde règle de vivier.

Portée réelle : Bronze ne tire que Disque et Pointe (`CHESTS.bronze.slots`), donc
la restriction ne mord qu'à partir de la salle 4, quand un Arène peut tomber.
Le flux de RNG est **inchangé** — `drawOne` consomme exactement trois valeurs quel
que soit le vivier ; seuls les résultats changent.

Aucune ligne de code à écrire. À écrire dans `docs/game-design.md` en T16.

- [ ] **Étape 5 : vérifier et mettre en index**

```bash
cd /Users/nicolasrabault/Projects/B-Blades_versus-integration
grep -c '^<<<<<<<\|^=======$\|^>>>>>>>' src/sim/economy.ts src/sim/meta.ts
git add src/sim/economy.ts src/sim/meta.ts src/sim/chest.ts
```

Attendu : `0` pour les deux.

---

## Task 7 : `save.ts` — `SAVE_SCHEMA = 4`

Le seul conflit qui touche le joueur.

**Fichiers :**
- Modifier : `src/sim/save.ts` (1 hunk)
- Modifier : `src/sim/save.test.ts` (auto-fusionné mais périmé)

**Interfaces :**
- Produit : `SAVE_SCHEMA = 4`
- Produit : `deserializeMeta(json: string): MetaState | null`
- Produit : `serializeMeta(meta: MetaState): string`

- [ ] **Étape 1 : passer à 4, sans migration**

Les deux jalons ont livré `SAVE_SCHEMA = 3` avec des champs différents ; une
sauvegarde écrite par l'un serait rejetée comme corrompue par le build fusionné.
Décision arbitrée avec le propriétaire du projet : **schéma 4, aucune migration**.
Le jeu n'est pas sorti ; les blobs v3 des deux dialectes repartent à zéro avec le
bandeau d'erreur déjà prévu.

```ts
/** Numéro de schéma du méta sérialisé. Trois migrations ont existé ci-dessous ;
 *  seule celle du schéma 1 vers le 2 subsiste (inventaire `{count, bestLevel}`
 *  devenu `{levels}`). Le passage au schéma 4 fusionne deux dialectes du schéma 3
 *  livrés en parallèle — `toupies`/`founderGiftClaimed` d'un côté, `pending` de
 *  l'autre. Aucun chemin de migration : le jeu n'est pas sorti, les blobs v3 des
 *  deux dialectes repartent à zéro. */
export const SAVE_SCHEMA = 4;
```

- [ ] **Étape 2 : `hydrate` porte les trois champs**

```ts
    pity: (partial.pity as MetaState['pity']) ?? base.pity,
    pending: (partial.pending as MetaState['pending']) ?? base.pending,
    chapterValidated: partial.chapterValidated === true,
    toupies: hydrateToupies(partial.toupies),
    founderGiftClaimed: partial.founderGiftClaimed === true,
```

Garder `hydrateToupies` de `main` entière — elle réunit trois cas (champ absent,
identifiant inconnu, toupie active non possédée) sur la toupie de départ.

- [ ] **Étape 3 : `isComplete` porte les deux champs structurels — pas le booléen**

**⚠ Correction de la spec.** Le § 3.1 demande que « tous trois » entrent dans
`isComplete`. C'est faux pour `founderGiftClaimed` : c'est un booléen hydraté par
`=== true`, exactement comme `chapterValidated`, qui est **délibérément absent**
d'`isComplete` (vérifié : zéro occurrence). Un booléen manquant n'est pas une
corruption, il retombe sur `false`. Les deux autres sont structurels — un
`pending` manquant fait planter `meta.pending[kind]++` au premier butin.

```ts
    typeof pending === 'object' && pending !== null &&
    chestKinds.every((k) => typeof pending[k] === 'number') &&
    typeof equipped === 'object' && equipped !== null &&
    slots.every((s) => isValidPiece(equipped[s])) &&
    typeof m.toupies === 'object' && m.toupies !== null &&
    Array.isArray((m.toupies as Record<string, unknown>).unlocked) &&
    typeof (m.toupies as Record<string, unknown>).active === 'string'
```

avec, plus haut, `const pending = m.pending as Record<string, unknown> | null | undefined;`.

- [ ] **Étape 4 : porter le correctif de borne de migration**

`main` a toujours `if (env.v < SAVE_SCHEMA) raw.inventory = migrateInventoryV1(...)`.
Cette borne signifiait « v1 seulement » quand `SAVE_SCHEMA` valait 2 ; à 4 elle
ferait tourner la migration du schéma 1 sur des v2 **et** des v3. Sans dégât
aujourd'hui, mais faux — et chaque schéma élargit le piège. Prendre la version de
la branche, commentaire compris :

```ts
    // Borne explicite : cette migration est celle du schéma 1 vers le 2, et elle
    // seule. La comparer au schéma courant la ferait tourner sur tout blob plus
    // ancien que le courant — donc sur des blobs v2 et v3 depuis que SAVE_SCHEMA
    // vaut 4.
    if (env.v < 2) raw.inventory = migrateInventoryV1(raw.inventory);
```

- [ ] **Étape 5 : réparer `save.test.ts`**

Le fichier s'est auto-fusionné mais il est périmé : le `describe('migration
schéma 2 → 3')` porte quatre tests qui écrivent `v: 3` **en dur** là où ils
veulent dire « le schéma courant ». Au schéma 4, `v: 3` devient un schéma
*antérieur* : la garde `env.v === SAVE_SCHEMA && !isComplete(raw)` ne se déclenche
plus, et le test « rejette un blob au schéma courant privé de ses toupies »
**échoue** — `deserializeMeta` renvoie un méta hydraté au lieu de `null`.

Renommer le `describe` en `'schéma courant et migrations'` et remplacer les trois
`v: 3` par `v: SAVE_SCHEMA` :

```ts
  it('retombe sur la toupie de départ si l’active n’est pas débloquée', () => {
    const meta = createInitialMeta(9);
    meta.toupies = { unlocked: ['brasier-solaire'], active: 'tigre-foudre' };
    const restored = deserializeMeta(JSON.stringify({ v: SAVE_SCHEMA, meta }));
    expect(restored!.toupies.active).toBe('brasier-solaire');
  });

  it('rejette un blob au schéma courant privé de ses toupies', () => {
    const meta = createInitialMeta(9);
    delete (meta as unknown as Record<string, unknown>).toupies;
    expect(deserializeMeta(JSON.stringify({ v: SAVE_SCHEMA, meta }))).toBeNull();
  });

  it('écarte un identifiant de toupie inconnu au lieu de le propager', () => {
    const meta = createInitialMeta(9);
    meta.toupies = { unlocked: ['brasier-solaire', 'nawak' as never], active: 'brasier-solaire' };
    const restored = deserializeMeta(JSON.stringify({ v: SAVE_SCHEMA, meta }));
    expect(restored!.toupies.unlocked).toEqual(['brasier-solaire']);
  });
```

Le test `v: 2` (« donne la toupie de départ et un cadeau en attente à une
sauvegarde v2 ») reste valide et doit maintenant vérifier **aussi** `pending` :

```ts
    expect(restored!.pending).toEqual({ bronze: 0, arene: 0, mythique: 0 });
```

- [ ] **Étape 6 : ajouter le test qui prouve la décision du schéma 4**

Il n'existe dans aucune des deux suites — c'est la décision la plus visible pour
le joueur, elle doit être couverte :

```ts
  it('rejette les deux dialectes du schéma 3 livrés en parallèle', () => {
    // Le dialecte 2b : toupies mais pas pending. Le dialecte 2.5 : l'inverse.
    // Aucun des deux n'est un méta valide du schéma 4 ; tous deux repartent à zéro.
    const dialecte2b = createInitialMeta(9);
    delete (dialecte2b as unknown as Record<string, unknown>).pending;
    const dialecte25 = createInitialMeta(9);
    delete (dialecte25 as unknown as Record<string, unknown>).toupies;
    delete (dialecte25 as unknown as Record<string, unknown>).founderGiftClaimed;
    expect(deserializeMeta(JSON.stringify({ v: 3, meta: dialecte2b }))).not.toBeNull();
    expect(deserializeMeta(JSON.stringify({ v: 3, meta: dialecte25 }))).not.toBeNull();
    // …mais complétés par hydrate, pas propagés tels quels :
    expect(deserializeMeta(JSON.stringify({ v: 3, meta: dialecte2b }))!.pending)
      .toEqual({ bronze: 0, arene: 0, mythique: 0 });
    expect(deserializeMeta(JSON.stringify({ v: 3, meta: dialecte25 }))!.toupies.active)
      .toBe('brasier-solaire');
  });
```

- [ ] **Étape 7 : lancer les tests de persistance**

```bash
cd /Users/nicolasrabault/Projects/B-Blades_versus-integration
npx vitest run src/sim/save.test.ts
```

Attendu : tous verts. Si un test échoue sur `v: 3`, c'est qu'un `v: 3` en dur
subsiste — le remplacer par `v: SAVE_SCHEMA`.

- [ ] **Étape 8 : mettre en index**

```bash
cd /Users/nicolasrabault/Projects/B-Blades_versus-integration
git add src/sim/save.ts src/sim/save.test.ts
```

---

## Task 8 : le rendu

**⚠ Correction de la spec.** Ces trois fichiers ne figurent dans aucune catégorie
du § 2. Tous trois sont des unions mécaniques : les deux jalons ont ajouté des
choses différentes au même fichier.

**Fichiers :**
- Modifier : `src/render/snapshot.ts` (1 hunk)
- Modifier : `src/render/arena.ts` (1 hunk)
- Modifier : `src/render/textures.ts` (4 hunks)

**Interfaces :**
- Consomme : `drainPerTick(top, zone)` (T3), `zoneModsAt` et `ArenaLayout` de `terrain.ts`
- Produit : `TopSnapshot` avec **`type: TopType`** (2b) et `decayPerTick` calculé terrain compris (2.5)
- Produit : `Snapshot` avec **`ejected: string[]`**
- Produit : `Textures` avec `typeMark` (2b) et les textures de zone/brèche/éclat (2.5)

- [ ] **Étape 1 : `snapshot.ts` — les deux apports**

`TopSnapshot` porte `type: TopType` **et** un `decayPerTick` qui passe par
`drainPerTick`. `snap` prend le layout en second paramètre :

```ts
function snap(top: Top, layout: ArenaLayout): TopSnapshot {
  return {
    id: top.id,
    x: top.pos.x,
    y: top.pos.y,
    spin: top.spin,
    decayPerTick: drainPerTick(top, zoneModsAt(layout, top.pos)),
    isPlayer: top.isPlayer,
    type: top.type,
  };
}
```

et `takeSnapshot` porte `ejected: run.ejected` avec son commentaire (`tick()`
réaffecte `run.ejected` à un tableau neuf : l'instantané garde celui de son propre
tick, sans copie).

Garder le commentaire de la branche sur `decayPerTick` — il explique que sans le
terrain, une toupie posée sur des pointes produirait des étincelles en continu
sans qu'aucun contact ait eu lieu.

- [ ] **Étape 2 : `arena.ts` — `viewFor` prend le type, le terrain se dessine**

De `main` : `viewFor(id, isPlayer, radius, salle, type)` et l'appel
`viewFor(top.id, top.isPlayer, top.radius, state.salle, top.type)`.
De la branche : le dessin des zones, des brèches et de l'éclat. Les deux sont
dans des parties différentes du fichier — union, sans arbitrage.

- [ ] **Étape 3 : `textures.ts` — union des textures**

L'interface `Textures` porte `typeMark` (2b) **et** les textures de la branche.
Les quatre hunks sont des ajouts de fonctions à des endroits voisins ; garder
**toutes** les fonctions des deux côtés et **toutes** les entrées de l'objet
retourné par `createTextures()`.

- [ ] **Étape 4 : vérifier**

```bash
cd /Users/nicolasrabault/Projects/B-Blades_versus-integration
grep -c '^<<<<<<<\|^=======$\|^>>>>>>>' src/render/snapshot.ts src/render/arena.ts src/render/textures.ts
grep -n "typeMark" src/render/textures.ts | head -4
```

Attendu : `0` partout, et `typeMark` présent dans l'interface, la fonction et
l'objet retourné.

- [ ] **Étape 5 : mettre en index**

```bash
cd /Users/nicolasrabault/Projects/B-Blades_versus-integration
git add src/render/snapshot.ts src/render/arena.ts src/render/textures.ts
```

---

## Task 9 : l'union des deux suites de tests

Les tests sont l'union des deux suites : **chacune doit passer**. Aucune
assertion ne doit être affaiblie pour faire passer la fusion.

**Fichiers :**
- Modifier : `src/sim/combat.test.ts` (3 hunks)
- Modifier : `src/sim/physics.test.ts` (2 hunks)
- Modifier : `src/sim/meta.test.ts` (2 hunks)
- Modifier : `src/sim/config.test.ts` (2 hunks)
- Modifier : `src/sim/sim.test.ts` (1 hunk)
- Modifier : `src/sim/salle.test.ts` (1 hunk)
- Modifier : `src/sim/chest.test.ts` (1 hunk)
- Modifier : `src/render/snapshot.test.ts` (1 hunk)

- [ ] **Étape 1 : la fabrique `top()` — union des deux champs, dans tous les fichiers**

`combat.test.ts` et `physics.test.ts` ont chacun une fabrique locale. Les deux
côtés y ont ajouté un champ différent. Union :

```ts
    talents: NEUTRAL_TALENTS, decayPauseTicks: 0,
    type: 'attaque', mass: 1,
```

`physics.test.ts` en a **deux** (`top()` et `movingTop()`) — traiter les deux.

- [ ] **Étape 2 : `combat.test.ts` — trois arbitrages nommés**

**a. Le bloc `describe('talent Masse')` → la version de `main`.** La branche a
gardé `headOn({ talents: { ...NEUTRAL_TALENTS, mass: 2 } }, {})`. Avec le
`const ma = a.mass` de `main` (T3), **ce test échoue** : les talents ne sont plus
lus par l'impulsion. Prendre la version de `main`, renommée `describe('masse')`,
avec `headOn({ mass: 2 }, {})` et le test « lit la masse sur la toupie, pas sur
ses talents ».

**b. La ligne du partage de charge → la version de la branche.**
`main` : `expect(1000 - a.spin).toBeCloseTo((100 * 10) / 20 * 0.35, 9);`
La branche a remplacé le littéral par `DAMAGE_K`. **Prendre la branche** : la
valeur bouge en T15, un littéral en dur casserait la calibration.
L'assertion reste juste avec le triangle parce que la fabrique pose
`type: 'attaque'` des deux côtés, et `typeMult('attaque', 'attaque')` vaut 1.
Vérifier l'import : `import { CHARGE_BONUS, DAMAGE_K, TALENTS, TICK_S } from './config';`

**c. Les appels à `decaySpin` → tous prennent une zone.** Chaque
`decaySpin(t)` devient `decaySpin(t, NEUTRAL_ZONE)`, avec
`import { NEUTRAL_ZONE, type ZoneMods } from './terrain';`. Conserver les trois
tests de zone de la branche (`decaySpin — zones`) et les deux de `drainPerTick` :
ce sont eux qui verrouillent la lecture-avant-décrément et l'exemption des
pointes.

Conserver **intégralement** le `describe('triangle des forces dans le combat')`
de `main` : quatre tests, dont la symétrie de la règle et le fait qu'Équilibre
n'est jamais exposé au +25 %.

- [ ] **Étape 3 : les autres fichiers — union**

- `meta.test.ts` : les tests de toupie/cadeau du Fondateur (`main`) **et** ceux de
  `pending`/`pendingTotal` (branche).
- `config.test.ts` : union des deux jeux de tests de forme du JSON.
- `chest.test.ts` : les tests de `poolFor`/doublons signature (`main`) **et** ceux
  de `drawPulls`/`grantChest` (branche).
- `salle.test.ts` : les tests de `botTypeFor` (`main`) **et** celui de la masse du
  boss (branche).
- `sim.test.ts` : **le test de déterminisme de la branche ne doit pas être
  modifié.** C'est le garde-fou du 2.5. S'il échoue, c'est l'ordre de tick de T5
  qui est faux — corriger `sim.ts`, jamais le test.
- `snapshot.test.ts` : les tests de `type` (`main`) **et** ceux de `ejected` et du
  `decayPerTick` terrain compris (branche).

- [ ] **Étape 4 : combler les deux trous de couverture nommés en dette**

La dette du jalon 2.5 signale que `boss.mass` et `shard.radius` n'ont pas de test
de forme. Les ajouter à `config.test.ts` — deux lignes, et elles verrouillent
précisément la valeur que l'auto-fusion effaçait en T2 :

```ts
  it('donne au boss une masse propre et à l’éclat un rayon', () => {
    expect(BALANCE.boss.mass).toBeGreaterThan(0);
    expect(BALANCE.arena.shard.radius).toBeGreaterThan(0);
  });
```

- [ ] **Étape 5 : lancer la suite complète**

```bash
cd /Users/nicolasrabault/Projects/B-Blades_versus-integration
npm run test 2>&1 | tail -20
```

Attendu : tout vert, **plus de 233 tests** et plus de 20 fichiers (la référence de
`main` mesurée en T1). Si un test échoue, le corriger **à la source** — sauf le
test de déterminisme, qui désigne toujours un défaut de `sim.ts`.

- [ ] **Étape 6 : lancer le typage — c'est ici que les doublons se voient**

```bash
cd /Users/nicolasrabault/Projects/B-Blades_versus-integration
npm run build 2>&1 | tail -20
```

Attendu : build vert. Une erreur `Duplicate identifier 'mass'` ou
`An object literal cannot have multiple properties with the same name` signifie
que T2 a été sautée ou incomplète.

- [ ] **Étape 7 : mettre en index**

```bash
cd /Users/nicolasrabault/Projects/B-Blades_versus-integration
git add src/sim/*.test.ts src/render/*.test.ts
```

---

## Task 10 : `calibrate.mjs`

**⚠ Correction de la spec.** Le § 3.7 dit « greffer ça sur le harnais de `main`
s'il a bougé ». Il a bougé, et il **casse** : `main` a ajouté un comparatif des
quatre châssis qui lit `runsFor[0].deadliestSalle`, or la branche a **supprimé**
`deadliestSalle` du retour de `simulate` (remplacé par `deathsBySalle`, cumulé sur
toutes les graines parce que le classement par graine tenait à une poignée de runs
et changeait de bouton en bouton sans rien dire).

**Fichiers :**
- Modifier : `scripts/calibrate.mjs` (3 hunks)

**Interfaces :**
- Produit : `simulate(seed, { buyChests, steer, toupieId })` →
  `{ hoursToValidate, hoursToFirstChest, runs, salleDurations, deathsBySalle }`

- [ ] **Étape 1 : garder les trois apports de la branche**

`steerWithTerrain` et son `nearestBreach` ; `openLoot` qui draine `meta.pending`
via `grantChest` ; `spend(meta, { buyChests })` qui achète **au plus un coffre
Bronze par salle vidée avant d'améliorer** — sinon les crédits partent tous en
coffres et le chapitre ne se valide jamais. Et le rapport : durée médiane et
morts **par salle**, morts cumulées sur toutes les graines, garde-fou de
passivité.

- [ ] **Étape 2 : ajouter `toupieId` à la signature de la branche**

```js
/**
 * `toupieId` est optionnel et absent de l'appel de la mesure principale : quand
 * il est omis, `meta` garde le châssis de départ (Brasier Solaire) posé par
 * `createInitialMeta`, donc ce garde-fou de non-régression reste au mot près ce
 * qu'il mesurait avant le comparatif de châssis.
 */
function simulate(seed, { buyChests, steer, toupieId }) {
  const meta = createInitialMeta(seed);
  if (toupieId) {
    meta.toupies.unlocked = [toupieId];
    setActiveToupie(meta, toupieId);
  }
  …
```

Imports : `setActiveToupie` depuis `../src/sim/meta.ts`, `TOUPIES` depuis
`../src/content/toupies.ts`, `grantChest` depuis `../src/sim/chest.ts`, et
`ARENA_RADIUS` depuis `../src/sim/config.ts`.

- [ ] **Étape 3 : réécrire le bloc châssis contre le nouveau retour**

`deadliestSalle` n'existe plus. Le comparatif doit passer `steer:
steerWithTerrain` (sinon il mesure une politique que le jalon 2.5 a remplacée) et
agréger les morts à la façon de la branche :

```js
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
```

- [ ] **Étape 4 : supprimer le code mort**

La branche a retiré `hoursToFirstArene`, `arenesOpened`, `gems` et l'import
`CHESTS` (la ligne `Prix d'un Arène` a disparu du rapport). Vérifier qu'aucun
vestige ne subsiste :

```bash
cd /Users/nicolasrabault/Projects/B-Blades_versus-integration
grep -n "hoursToFirstArene\|arenesOpened\|steerTowardNearest\|CHESTS" scripts/calibrate.mjs
```

Attendu : **aucune sortie**.

- [ ] **Étape 5 : faire tourner le harnais**

```bash
cd /Users/nicolasrabault/Projects/B-Blades_versus-integration
npm run calibrate 2>&1 | tail -30
```

Attendu : un rapport complet, sans exception, avec la mesure principale, la durée
par salle, le garde-fou de passivité **et** le comparatif des quatre châssis. Ne
juger aucun chiffre ici — c'est T13 qui les lit.

- [ ] **Étape 6 : mettre en index**

```bash
cd /Users/nicolasrabault/Projects/B-Blades_versus-integration
git add scripts/calibrate.mjs
```

---

## Task 11 : `shots.mjs`

**Fichiers :**
- Modifier : `scripts/shots.mjs`

Non conflictuel (aucun des deux jalons ne l'a touché), mais sa sauvegarde de test
est fabriquée à la main et porte encore `v: 2` — elle n'exerce donc plus le schéma
courant, et ne montre ni l'écran Toupies ni la pastille de butin.

- [ ] **Étape 1 : passer la sauvegarde au schéma 4 avec les trois champs**

Dans `SEED_SAVE`, remplacer `v: 2` par `v: 4` et ajouter à `meta`, après
`pity` :

```js
    pending: { bronze: 2, arene: 1, mythique: 0 },
    chapterValidated: false,
    toupies: { unlocked: ['brasier-solaire', 'typhon-primal'], active: 'brasier-solaire' },
    founderGiftClaimed: true,
```

(`chapterValidated: false` existe déjà — ne pas le dupliquer, insérer les trois
autres autour.) `pending` non nul fait apparaître la pastille sur l'onglet
Coffres ; deux toupies débloquées rendent l'écran Toupies lisible sur la capture.

- [ ] **Étape 2 : rendre le port configurable**

Le port 5173 est occupé sur cette machine par un autre projet — 5174 et 5176 le
sont aussi. Une capture périmée a déjà fait croire à une régression pendant le
jalon 2.5. Remplacer :

```js
const URL = 'http://localhost:5173/spinforge/';
```

par :

```js
// Le port de Vite varie : 5173 est souvent pris par un autre projet sur cette
// machine. Lire le port affiché par `npm run dev` et le passer en variable
// d'environnement — une capture prise sur le mauvais port a déjà fait croire à
// une régression.
const PORT = process.env.SPINFORGE_PORT ?? '5173';
const URL = `http://localhost:${PORT}/spinforge/`;
```

- [ ] **Étape 3 : vérifier la syntaxe**

```bash
cd /Users/nicolasrabault/Projects/B-Blades_versus-integration
node --check scripts/shots.mjs && echo "syntaxe OK"
```

Les captures elles-mêmes sont prises en T17, quand le serveur tourne.

- [ ] **Étape 4 : mettre en index**

```bash
cd /Users/nicolasrabault/Projects/B-Blades_versus-integration
git add scripts/shots.mjs
```

---

## Task 12 : sceller la fusion

**Fichiers :** aucun. Vérifie et commite.

- [ ] **Étape 1 : plus un seul conflit, plus un seul marqueur**

```bash
cd /Users/nicolasrabault/Projects/B-Blades_versus-integration
git diff --name-only --diff-filter=U
grep -rn '^<<<<<<<\|^>>>>>>>' src/ scripts/ docs/ 2>/dev/null
```

**⚠ Correction du plan (ruling R2, pré-vol).** Attendu **pour `src/` et
`scripts/` : aucune sortie**. Trois documents sont encore en conflit à ce
stade — c'est normal, T2 à T11 ne touchent pas aux docs — mais **une fusion ne
se commite pas avec des marqueurs**. Les résoudre ici, sommairement ; T16 les
affine avec les chiffres de calibration.

```bash
cd /Users/nicolasrabault/Projects/B-Blades_versus-integration
git diff --name-only --diff-filter=U
```

Attendu : exactement ces trois lignes.

```
docs/game-design.md
docs/roadmap.md
docs/superpowers/specs/2026-08-27-jalon-2b-toupies-design.md
```

**a. La spec 2b (add/add) : `main` gagne** — 506 lignes contre 434, c'est la plus
récente, et c'est le territoire du 2b (§ 2.2 de la spec d'intégration).

```bash
git checkout --ours docs/superpowers/specs/2026-08-27-jalon-2b-toupies-design.md
git add docs/superpowers/specs/2026-08-27-jalon-2b-toupies-design.md
```

**b. `game-design.md` et `roadmap.md` : union brute.** Retirer les marqueurs en
gardant **les deux** versions de chaque hunk, l'une après l'autre, sans rien
supprimer ni arbitrer de chiffre. Les contradictions (60 contre 86, 2 000 contre
250) restent visibles dans le texte : T16 les tranche avec les valeurs mesurées.
Ne pas chercher à bien rédiger ici — c'est un état de transit d'une tâche.

- [ ] **Étape 1 bis : plus un seul marqueur nulle part**

```bash
cd /Users/nicolasrabault/Projects/B-Blades_versus-integration
git diff --name-only --diff-filter=U
grep -rn '^<<<<<<<\|^>>>>>>>' src/ scripts/ docs/ 2>/dev/null
```

Attendu : **aucune sortie** pour les deux.

- [ ] **Étape 2 : la suite complète**

```bash
cd /Users/nicolasrabault/Projects/B-Blades_versus-integration
npm run test 2>&1 | tail -8
```

Attendu : tout vert, **strictement plus de 233 tests**.

- [ ] **Étape 3 : le build**

```bash
cd /Users/nicolasrabault/Projects/B-Blades_versus-integration
npm run build 2>&1 | tail -10
```

Attendu : vert. C'est le seul filet contre les doublons de T2.

- [ ] **Étape 4 : vérifier que la simulation reste pure**

```bash
cd /Users/nicolasrabault/Projects/B-Blades_versus-integration
grep -rn "Math.random\|new Date\|Date.now\|document\.\|window\.\|from 'pixi\|from 'react" src/sim/ || echo "src/sim reste pur"
```

Attendu : `src/sim reste pur`.

- [ ] **Étape 5 : commiter la fusion**

```bash
cd /Users/nicolasrabault/Projects/B-Blades_versus-integration
git add -A
git commit -F - <<'EOF'
merge: intègre le jalon 2.5 (terrain, butin) dans le jalon 2b (toupies)

Deux jalons développés en parallèle sur le même cœur de simulation, fusionnés
en une passe. 22 fichiers en conflit résolus selon
docs/superpowers/specs/2026-08-28-integration-2-5-dans-2b-design.md.

Décisions sémantiques :
- SAVE_SCHEMA = 4, sans migration : les deux jalons ont livré un schéma 3 aux
  champs disjoints, aucun blob v3 n'est un méta valide du build fusionné.
  MetaState porte les trois champs (toupies, founderGiftClaimed, pending).
  founderGiftClaimed reste hors de isComplete, comme chapterValidated : un
  booléen manquant n'est pas une corruption.
- Borne de migration corrigée en `env.v < 2` : comparée au schéma courant, la
  migration du schéma 1 tournait déjà sur des blobs v2 et v3.
- Top.mass est la masse résolue, quatre contributeurs : châssis × modèle de
  Disque × talent Masse × masse propre (boss). L'auto-fusion la déclarait deux
  fois et annulait silencieusement la masse ×3 du boss.
- combat.ts : damage() compose quatre facteurs, le triangle se pose par-dessus
  le partage de charge. decaySpin prend la zone ; les pointes ne sont jamais
  suspendues par Relance, ce sont des dégâts.
- Ordre de tick : zones lues une fois par toupie avant le pilotage et
  réutilisées à la décroissance ; updateShard et salleReward consomment chacun
  un tirage, salleReward avant startSalle ; spawnSalle avant buildLayout.
- Les coffres de butin tirent dans le vivier restreint aux toupies débloquées :
  conséquence de la rencontre de poolFor (2b) et grantChest (2.5). Un coffre de
  butin est un coffre ; le flux de RNG est inchangé.
- calibrate.mjs : politique « terrain » de la branche, comparatif des châssis de
  main réécrit contre deathsBySalle, qui remplace deadliestSalle.

Les valeurs d'équilibrage en collision (damageK, rewardBase, restitution, prix
Bronze) sont posées à celles de la branche et NE SONT PAS arbitrées ici : elles
partent en calibration commune, économie puis combat, deux commits séparés.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
```

- [ ] **Étape 6 : sauvegarder immédiatement**

```bash
cd /Users/nicolasrabault/Projects/B-Blades_versus-integration
git push -u origin integration-2-5
```

---

## Task 13 : mesure de référence du build fusionné

**⚠ Complément à la spec.** Le § 4 n'appelle aucune mesure de référence. Il en
faut une : `damageK = 1,3` a été mesuré sur une branche où l'impulsion ne lisait
que `talents.mass` et ignorait le triangle. Dans le build fusionné, la masse du
joueur vient de châssis × Disque × talents, ce qui change l'impulsion, donc
l'impact, donc les dégâts. **Aucun chiffre du 2.5 n'est valide avant cette
mesure.**

**Fichiers :**
- Créer : `docs/superpowers/plans/2026-08-28-calibration-integration.md` (journal
  de la passe — c'est le livrable dont dépend la passe suivante, davantage que
  les valeurs finales)

- [ ] **Étape 1 : mesurer, sans rien changer**

```bash
cd /Users/nicolasrabault/Projects/B-Blades_versus-integration
npm run calibrate 2>&1 | tee /tmp/calib-reference.txt
```

- [ ] **Étape 2 : ouvrir le journal de calibration**

Créer `docs/superpowers/plans/2026-08-28-calibration-integration.md` avec :

- le rapport brut de l'étape 1, en bloc de code ;
- les valeurs de départ : `damageK` 1,3 · `rewardBase` 86 · `restitution` 1,6 ·
  `chests.bronze.price` 250 · `boss.mass` 3 ;
- le rappel des chiffres du 2.5 **avec la mention qu'ils ne sont plus
  comparables** : chapitre 1 validé en 0,35 h / 10 runs, premier coffre à 0,00 h,
  salles 1-3 en 6-10 s, boss à 87 s et salle la plus meurtrière (20 morts contre 9),
  passivité jamais validée en 20 h ;
- les quatre garde-fous du § 4.2, en tête de document, car **ils priment sur les
  cibles chiffrées** :
  1. **la salle 10 reste la salle la plus meurtrière du chapitre** (« le mur n'est
     jamais un bug, c'est le produit ») ;
  2. **la passivité reste très loin derrière le pilotage** — c'est la mesure pour
     laquelle le jalon 2.5 existe ;
  3. **le premier coffre reste immédiat**, dès la salle 1 ;
  4. chapitre 1 franchissable, cible **indicative** ~15 min ; le 2.5 a livré 21 min
     et c'était le bon compromis — ne pas sacrifier un garde-fou pour six minutes.

- [ ] **Étape 3 : décider si le jeu de graines s'élargit — et si oui, séparément**

Le § 4.4 note que la médiane du boss ne porte que sur **cinq validations** (une
par graine) et suggère d'élargir `SEEDS`. Si l'écart entre graines dans le rapport
de l'étape 1 dépasse un facteur 2 sur `runs`, élargir à dix graines
(`[1, 7, 42, 1337, 90210, 2, 13, 271, 4242, 65535]`) **dans son propre commit,
mesuré sur les valeurs inchangées**, avant tout balayage. Sinon les mesures
d'avant et d'après ne sont pas comparables.

**⚠ Correction du plan (ruling R3, pré-vol) :** ce commit ne porte **que**
`scripts/calibrate.mjs`. Le journal est commité à l'étape 4 — le mettre dans les
deux ferait échouer la seconde sur « nothing to commit ». Relancer
`npm run calibrate` après l'élargissement et consigner la nouvelle référence à
dix graines dans le journal, sans la commiter ici.

```bash
cd /Users/nicolasrabault/Projects/B-Blades_versus-integration
npm run calibrate 2>&1 | tee /tmp/calib-reference-10graines.txt | tail -25
git add scripts/calibrate.mjs
git commit -m "test(calibrate): élargit le jeu de graines à dix, mesure inchangée

La médiane du boss ne portait que sur cinq validations, une par graine : un
écart de dizaines de secondes n'y voulait rien dire. Commit isolé, valeurs
d'équilibrage inchangées, pour que le balayage qui suit ait une référence
comparable."
```

- [ ] **Étape 4 : commiter le journal**

```bash
cd /Users/nicolasrabault/Projects/B-Blades_versus-integration
git add docs/superpowers/plans/2026-08-28-calibration-integration.md
git commit -m "docs(calibration): mesure de référence du build fusionné

Point de départ de la passe de calibration commune. Les chiffres du jalon 2.5
ne sont plus comparables : la masse du joueur vient désormais du châssis et du
Disque, et le triangle multiplie les dégâts."
```

---

## Task 14 : calibration — ÉCONOMIE

**L'économie commande la durée.** Ce projet a été recalibré deux fois pour avoir
réglé le combat et l'économie ensemble. **Un seul commit, un seul domaine.**

**Fichiers :**
- Modifier : `src/content/balance.json` (bloc `econ` et `chests` uniquement)
- Modifier : `docs/superpowers/plans/2026-08-28-calibration-integration.md`

**⚠ Ruling R4 (pré-vol).** Les `<chevrons>` des messages de commit de T14 et T15
sont des emplacements pour des **valeurs mesurées**, pas du texte à commiter.
**Un message de commit contenant `<` est un défaut** : dans ce dépôt les mesures
d'équilibrage vivent dans les messages de commit et servent de référence à la
passe suivante.

**Boutons ouverts :** `econ.rewardBase`, `econ.rewardGrowth`, `econ.upgradeGrowth`,
et les prix de coffre.
**Boutons fermés :** tout le reste. En particulier `bot.scaling`, `boss.spinMult`,
`boss.attackMult` (forme de la difficulté héritée du jalon 1.5) et la table du
triangle (décision de design du 2b).

- [ ] **Étape 1 : un bouton à la fois, remesure entre chaque**

Partir de `rewardBase`. Pour chaque valeur essayée :

```bash
cd /Users/nicolasrabault/Projects/B-Blades_versus-integration
# éditer la valeur dans src/content/balance.json
npm run calibrate 2>&1 | tail -25
```

Consigner **chaque** mesure dans le journal : valeur, heures de validation, runs,
premier coffre, salle la plus meurtrière, passivité. **Le balayage complet
consigné est le livrable** — c'est ce dont dépend la passe suivante, davantage que
les valeurs finales.

- [ ] **Étape 2 : préférer un palier à un pic**

`rewardBase` s'est révélé **chaotique** au jalon 2.5, pas plateau : à ±0,01 un
critère dur casse, parce que la durée d'un combat change le nombre de tirages
consommés et rebat tout le flux en aval. **Choisir un palier — trois valeurs
voisines qui tiennent toutes les garde-fous — et non un pic isolé.** Le dire
explicitement dans le journal.

- [ ] **Étape 3 : vérifier les quatre garde-fous**

Ils priment sur la cible de ~15 min. Sur la valeur retenue :

```bash
cd /Users/nicolasrabault/Projects/B-Blades_versus-integration
npm run calibrate 2>&1 | tail -25
```

- salle 10 = salle la plus meurtrière ✓
- passivité très au-dessus de la référence (idéalement « jamais ») ✓
- premier coffre à 0,00 h ✓
- chapitre 1 franchissable ✓

Si un garde-fou casse, revenir en arrière — **ne jamais en sacrifier un pour
approcher une cible chiffrée**.

- [ ] **Étape 4 : commiter, économie seule**

```bash
cd /Users/nicolasrabault/Projects/B-Blades_versus-integration
npm run test 2>&1 | tail -4
git add src/content/balance.json docs/superpowers/plans/2026-08-28-calibration-integration.md
git commit -m "balance(econ): recalibre l'économie pour le build fusionné

<valeurs : rewardBase A → B, prix Bronze C → D>
Chapitre 1 : <X> h / <Y> runs (référence fusionnée : <Z> h / <W> runs).
Premier coffre : <…> h. Salle la plus meurtrière : <…>. Passivité : <…>.
Palier retenu et non pic : <valeurs voisines tenant les garde-fous>.
Balayage complet dans docs/superpowers/plans/2026-08-28-calibration-integration.md.

Économie seule — le combat suit dans son propre commit."
```

Attendu avant commit : `npm run test` vert (les tests lisent `DAMAGE_K` et non des
littéraux, mais `config.test.ts` valide la forme du JSON).

---

## Task 15 : calibration — COMBAT

**Le combat commande la forme de la difficulté.** Commit distinct de T14, mesuré
séparément.

**Fichiers :**
- Modifier : `src/content/balance.json` (blocs `combat`, `arena`, `boss`)
- Modifier : `docs/superpowers/plans/2026-08-28-calibration-integration.md`

**Boutons ouverts :** `combat.damageK`, `arena.breach.halfWidthDeg`,
`arena.breach.ejectSpeed`, `boss.mass`, `arena.zones.pointes.spinDrain`,
`arena.restitution`, `arena.overspeedDamping`.
**Boutons fermés :** `bot.scaling`, `boss.spinMult`, `boss.attackMult`, la table
du triangle, et tous les boutons économiques réglés en T14.

- [ ] **Étape 1 : trancher `damageK`**

Le 2.5 l'a monté de 0,35 à 1,3 pour raccourcir des combats trop longs ; `main`
est resté à 0,35 et a laissé le triangle différencier. **Avec les deux vivants, le
triangle multiplie *aussi* les dégâts : 1,3 est probablement trop.** Balayer, un
bouton à la fois, en consignant chaque mesure.

`damageK` est **chaotique** lui aussi — même discipline qu'en T14 : palier, pas
pic, et le dire dans le rapport.

- [ ] **Étape 2 : `arena.restitution` — 0,8 ou 1,6**

**⚠ Correction de la spec** (§ 3.6 la note « — » côté `main`). C'est une vraie
collision. 1,6 porte la répulsion réelle, un pilier documenté du 2.5 : le plafond
de vitesse ne borne plus que le pilotage, un choc peut le franchir. **Ne la
descendre que si une mesure l'exige**, et alors le justifier explicitement dans
le journal — c'est une décision de design, pas un réglage.

- [ ] **Étape 3 : la salle 10 reste le mur**

Le garde-fou qui prime sur tout. Il a déjà fait renoncer à une cible chiffrée au
jalon 2.5, et c'était le bon arbitrage. Vérifier à chaque mesure que la salle 10
sort en tête du classement des morts.

- [ ] **Étape 4 : ne pas rouvrir la non-éjectabilité du boss**

**Hors périmètre.** Aux valeurs shippées, éjecter le boss demande ~615 px/s quand
le plafond de pilotage du joueur est 240 (384 sous accélérateur) ; 71 combats de
boss, zéro éjection. La règle de brèche fonctionne pour le joueur (une mort sur
dix est une éjection) — c'est l'offensive contre le boss qui n'existe pas. La
rendre réelle demanderait de rouvrir `ejectSpeed` et/ou `boss.mass` : **une future
passe combat explicitement délimitée, pas celle-ci.** Reporter en dette (T16).

- [ ] **Étape 5 : mesure finale et commit**

```bash
cd /Users/nicolasrabault/Projects/B-Blades_versus-integration
npm run calibrate 2>&1 | tee /tmp/calib-finale.txt | tail -25
npm run test 2>&1 | tail -4
npm run build 2>&1 | tail -4
git add src/content/balance.json docs/superpowers/plans/2026-08-28-calibration-integration.md
git commit -m "balance(combat): recalibre le combat pour le build fusionné

<valeurs : damageK A → B, restitution C → D, …>
Salle la plus meurtrière : salle 10 (<n> morts contre <m>). Boss : <X> s.
Durées par salle : 1-3 <…> s, 4-9 <…> s, boss <…> s.
Palier retenu et non pic : <valeurs voisines tenant les garde-fous>.
Balayage complet dans docs/superpowers/plans/2026-08-28-calibration-integration.md.

Combat seul — l'économie a été réglée dans le commit précédent."
```

---

## Task 16 : documentation

Vient **après** la calibration : trois documents citent des chiffres que T14 et
T15 viennent de fixer.

**Fichiers :**
- Modifier : `docs/game-design.md` (2 hunks, résolus en union brute en T12)
- Modifier : `docs/roadmap.md` (2 hunks, idem)
- Vérifier : `docs/ameliorations.md` (additif, arrivé de la branche)
- Modifier : `CLAUDE.md` si le vocabulaire a bougé

**⚠ Correction de la spec.** `docs/game-design.md` n'est mentionné nulle part dans
la spec, alors que les deux côtés ont réécrit **les mêmes paragraphes** avec des
chiffres contradictoires. C'est le document de référence du projet (voir
`CLAUDE.md`).

- [ ] **Étape 1 : `game-design.md` — les trois paragraphes en collision**

**a. Le paragraphe « Types ».** Prendre celui de `main` (entier, il détaille la
symétrie de la règle, la neutralité d'Équilibre et le portage par le châssis) et
**y ajouter** les quatre puces du 2.5 que la branche a insérées juste après :
Répulsion, Brèches et éjection, Zones au sol, Éclat de Gyre.

**b. La ligne `revenu(salle)`.** Les deux côtés l'ont réécrite avec un historique
différent. Écrire l'historique **complet des quatre calibrations**, avec la valeur
retenue en T14 :

> `revenu(salle) = <valeur T14> × 1,13^(salle−1)` par salle vidée ; boss ×10.
> (Calibré par mesure, à chaque fois sur la seule base : **120 → 70** au jalon 1.5,
> quand le partage de charge a rendu le pilotage bien plus efficace ; **70 → 60** au
> jalon 2b, quand le triangle a donné à Équilibre un +10 % qu'elle n'encaisse
> jamais en retour ; **70 → 86** au jalon 2.5, avec le terrain et le butin de
> salle ; **→ <valeur T14>** à l'intégration des deux, où la masse du châssis et
> le triangle changent tous deux l'impact. L'économie commande la durée, le
> combat commande la forme de la difficulté : c'est pourquoi seule cette constante
> bouge. Historique complet : `docs/roadmap.md`.)

**c. La ligne « Coffres » et le tableau de butin.** Garder le tableau de butin de
salle de la branche **et** la mention des doublons signature de `main`. Y ajouter
la conséquence croisée décidée en T6 :

> Le butin de salle tire dans le même vivier que l'achat : les Lames et les Noyaux
> restent **signature**, donc un coffre lâché par une salle ne rend jamais la pièce
> signature d'une toupie qu'on ne possède pas. Un coffre de butin est un coffre.

Mettre le prix du Bronze à la valeur retenue en T14.

- [ ] **Étape 2 : `roadmap.md` — union, et la dette du 2.5 survit**

Garder les deux historiques de jalon. La section « Dette connue (jalon 2.5) » de
la branche **doit survivre à la fusion**, mise à jour :

- `damageK` et `rewardBase` sur des points chaotiques ; obligation de remesure si
  la physique, le contenu de la salle 10, `arena.breach.ejectSpeed`, `boss.mass`
  ou le jeu de graines changent — **l'intégration a déclenché cette obligation et
  la passe T14/T15 l'a honorée** ; mettre à jour les valeurs de référence.
- La politique « terrain » du harnais n'utilise presque pas le terrain : 17
  éjections de bots sur 1 209 bots détruits (1,4 %), et 0,5 % seulement des
  contacts sortants atteignent le seuil de 400 px/s. **Remesurer ces deux ratios**
  sur le build calibré et actualiser les chiffres.
- Le boss manque sa cible de ~45 s (spec 2.5 § 3.1) — actualiser avec la mesure de T15.
- **La non-éjectabilité du boss** : reporter telle quelle, avec la mesure ~615 px/s
  contre un plafond de pilotage de 240 (384 sous accélérateur).
- `ticksToFirstChest` du harnais n'a pas de test automatisé.
- ~~`boss.mass` et `shard.radius` sans test de forme~~ → **réglé en T9**, retirer
  cette ligne.

Ajouter une ligne de dette née de l'intégration :

> **Les identités d'arène des chapitres 2 à 8** — le jalon 2.5 a livré le système
> de terrain, pas les huit arènes. Inatteignables tant que l'enchaînement des
> chapitres n'existe pas (jalon 3).

- [ ] **Étape 3 : `ameliorations.md`**

Arrivé tel quel de la branche (additif). Vérifier qu'il est présent et intact —
c'est le journal de test joueur qui explique **pourquoi** le jalon 2.5 existe.

```bash
cd /Users/nicolasrabault/Projects/B-Blades_versus-integration
head -20 docs/ameliorations.md && wc -l docs/ameliorations.md
```

Y ajouter une entrée datée du 2026-08-28 résumant l'intégration et les mesures
avant/après de T13 → T15.

- [ ] **Étape 4 : vérifier la règle IP**

```bash
cd /Users/nicolasrabault/Projects/B-Blades_versus-integration
grep -rin "beyblade\|takara\|hasbro" src/ docs/game-design.md | grep -v "IP Takara Tomy/Hasbro"
```

Attendu : aucune sortie hors la clause IP légitime de `game-design.md`.

- [ ] **Étape 5 : commiter**

```bash
cd /Users/nicolasrabault/Projects/B-Blades_versus-integration
git add docs/
git commit -m "docs: réunit les références des deux jalons et actualise la dette

game-design.md : le triangle des forces et les quatre règles de terrain
cohabitent ; l'historique des quatre calibrations de rewardBase est complet ;
le butin de salle tire dans le vivier signature, conséquence de la rencontre
des deux jalons.
roadmap.md : dette du jalon 2.5 reportée et actualisée sur les mesures de
l'intégration ; boss.mass et shard.radius sortent de la dette (couverts).
ameliorations.md : entrée du 2026-08-28, mesures avant/après."
```

---

## Task 17 : vérification manuelle au navigateur

Le rendu et l'UI ne sont pas couverts par les tests unitaires. **Cette
vérification ne se délègue pas.**

- [ ] **Étape 1 : lancer le serveur et relever le port réel**

```bash
cd /Users/nicolasrabault/Projects/B-Blades_versus-integration
npm run dev
```

**Lire le port dans la sortie de Vite.** Les ports 5173, 5174 et 5176 sont occupés
par d'autres projets sur cette machine — SpinForge démarrera plus haut (5175 ou
5177). **Une capture prise sur le mauvais port a déjà fait croire à une
régression pendant le jalon 2.5.**

- [ ] **Étape 2 : partir d'un `localStorage` vidé**

Console du navigateur : `localStorage.clear()` puis rechargement. Indispensable :
tout blob v3 des deux dialectes doit désormais être rejeté.

- [ ] **Étape 3 : les six points de la liste**

1. **Le terrain et le triangle se lisent ensemble à l'écran** — les zones au sol
   sont visibles **et** chaque toupie porte son repère de type.
2. **Un coffre tombe à la première salle** et **la pastille monte** sur l'onglet
   Coffres.
3. **Changer de toupie change à la fois le pilotage et le triangle** — l'écran
   Toupies bascule le châssis actif, et le comportement en arène suit.
4. **Les quatre onglets sont présents** : Combat, Forge, Coffres, Toupies — plus
   aucun cadenas.
5. **Une éjection par brèche est distincte d'une mort par épuisement** à l'écran.
6. **Le bandeau d'erreur de sauvegarde** apparaît si l'on injecte un blob v3
   incomplet, et le jeu repart à zéro proprement.

- [ ] **Étape 4 : les captures**

```bash
cd /Users/nicolasrabault/Projects/B-Blades_versus-integration
SPINFORGE_PORT=<le port relevé> npm run shots
ls -la .shots/
```

- [ ] **Étape 5 : décider de l'intégration finale**

Utiliser `superpowers:finishing-a-development-branch` pour choisir entre fusion
dans `main` et pull request. Puis nettoyer le worktree :

```bash
cd /Users/nicolasrabault/Projects/B-Blades_versus
git worktree remove /Users/nicolasrabault/Projects/B-Blades_versus-integration
```

**Ne jamais toucher** `/Users/nicolasrabault/Projects/B-Blades_versus-verrou`.

---

## Auto-relecture

**Couverture de la spec.** Les sept décisions du § 3 sont couvertes : § 3.1 → T7,
§ 3.2 → T2 + T8, § 3.3 → T3, § 3.4 → T5, § 3.5 → T2, § 3.6 → T4, § 3.7 → T10.
La calibration du § 4 → T13/T14/T15. La vérification du § 5 → T12 + T17. Le hors
périmètre du § 6 → contraintes globales + T15 étape 4. La dette du § 7 → T16
étape 2.

**Les onze corrections/compléments**, chacun rattaché à une tâche :
1. Le tirage de `salleReward` omis du § 3.4 → T5 étape 1.
2. `arena.restitution` = 0,8 côté `main`, pas « — » → T4 étape 1, T15 étape 2.
3. `founderGiftClaimed` hors d'`isComplete` → T7 étape 3.
4. Le § 2.1 n'est pas fait que de fichiers nouveaux → section « Structure de fichiers ».
5. La catégorisation ne couvre que ~15 des 31 fichiers → T6, T8, T9, T16.
6. `docs/game-design.md`, conflit sémantique non mentionné → T16 étape 1.
7. `chest.ts`, l'interaction butin × vivier signature → T6 étape 4, T16 étape 1.
8. `TabBar.tsx`, conflit à trois voies → auto-fusionné correctement, vérifié en T1.
9. `calibrate.mjs`, le bloc châssis de `main` casse → T10 étape 3.
10. `balance.json.version` absent du § 3.6 → T4 étape 2.
11. Pas de mesure de référence au § 4 → T13.

Plus trois découvertes de la fusion exploratoire, absentes de la spec parce
qu'invisibles avant de fusionner : les **corruptions silencieuses** de
`types.ts`, `salle.ts` et `sim.ts` (T2), les **tests `v: 3` périmés** de
`save.test.ts` (T7), et le fait que **`npm run test` ne type pas** — d'où
`npm run build` en T9 et T12.

**Cohérence des types.** `Top.mass` (T2) est lue par `resolveCollision` (T3),
peuplée par `makeBot` (T2) et `makePlayer` (T2/T5) ; `Stats.mass` (T2) est
produite par `playerStats` (T6). `decaySpin(top, zone)` (T3) est appelée par
`tick` (T5) et testée en T9 ; `drainPerTick(top, zone)` (T3) est appelée par
`snap` (T8). `salleReward(salle, boss, rngState)` (T6) est appelée par `tick`
(T5). `grantChest(meta, kind)` (T6) est appelée par `openLoot` (T10).
`simulate(seed, { buyChests, steer, toupieId })` (T10) est appelée par la mesure
principale, le garde-fou de passivité et le comparatif de châssis.
