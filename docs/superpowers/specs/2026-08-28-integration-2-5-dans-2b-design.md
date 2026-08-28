# Intégration du jalon 2.5 dans le jalon 2b : spécification de conception

> **Pour qui lit ça sans contexte.** Deux jalons ont été développés **en parallèle,
> sans le savoir**, sur le même cœur de simulation. Le jalon 2b (toupies, triangle des
> forces, boutique) est sur `main`. Le jalon 2.5 (terrain, butin) est sur la branche
> locale `jalon-2.5-terrain-et-butin`. `git merge` produit 31 fichiers en conflit.
> Ce document dit exactement comment les résoudre, et pourquoi.

## État des lieux

| | `main` | `jalon-2.5-terrain-et-butin` |
|---|---|---|
| Contenu | jalon 2b — les quatre Fondateurs, châssis, types, triangle des forces, écran Toupies, doublons signature | jalon 2.5 — zones au sol, bord à brèches (éjection), éclat de Gyre, répulsion réelle, un coffre par salle vidée, écran Butin |
| Commits depuis le point de fork | 24 | 33 |
| Point de fork | `8732825` (`git merge-base main jalon-2.5-terrain-et-butin`) | idem |
| Tests | verts | verts (266) |

Les deux branches sont saines et complètes. Aucune n'est poussée. Rien n'est perdu.

**La spec du jalon 2.5** est `docs/superpowers/specs/2026-08-26-jalon-2-5-terrain-et-butin-design.md`
(présente sur la branche, pas sur `main`) et son plan
`docs/superpowers/plans/2026-08-27-jalon-2-5-terrain-et-butin.md`. Les deux valent la
lecture avant de résoudre `sim.ts` ou `combat.ts` : ils expliquent *pourquoi* le terrain
est construit comme il l'est.

## Ce que le jalon 2.5 a apporté, en une mesure

| | Avant le jalon 2.5 | Après |
|---|---|---|
| Chapitre 1 validé | 2,08 h · 23 runs | 0,35 h · 10 runs |
| Premier coffre ouvert | 2,92 h | 0,00 h (dès la salle 1) |
| Salles 1-3 | 20-24 s | 6-10 s |
| Boss | 183 s | 87 s, **et la salle la plus meurtrière** (20 morts contre 9) |
| Ne jamais toucher l'écran | 8,33 h | jamais validé en 20 h |

Ces chiffres sont mesurés par `npm run calibrate` sur la branche. **Ils ne survivront pas
tels quels à l'intégration** : le triangle des forces de 2b multiplie lui aussi les
dégâts. C'est l'objet de la calibration commune, § 4.

## 1 · La stratégie

Une branche d'intégration partant de **`main`** — 2b devient le tronc — dans laquelle on
fusionne `jalon-2.5-terrain-et-butin`, puis on résout avec une règle explicite par
catégorie.

```bash
git checkout main
git checkout -b integration-2-5
git merge jalon-2.5-terrain-et-butin   # 31 conflits attendus
```

**Deux alternatives écartées, pour que personne ne les repropose :**

- *Rebaser les 33 commits sur `main`* : 33 occasions de conflit au lieu d'une, et 33 états
  intermédiaires cassés. Un rebase interactif n'est de toute façon pas disponible dans cet
  environnement.
- *Réappliquer le 2.5 comme un patch neuf* : perd l'historique. Dans ce dépôt les mesures
  d'équilibrage vivent **dans les messages de commit** et servent de référence à la passe
  suivante — une passe de calibration a lu son point de départ dans le message de commit de
  la précédente, pas dans un rapport. Perdre cet historique coûte plus que le conflit.

## 2 · Les trois catégories de fichiers

### 2.1 Additif — la version de la branche, prise telle quelle (9 fichiers)

`main` n'y a jamais touché ; il n'y a pas de conflit réel, seulement des fichiers nouveaux.

- `src/sim/physics.ts` et `src/sim/terrain.ts` (+ `terrain.test.ts`)
- `src/render/observer.ts`
- `src/sim/economy.test.ts`
- `src/ui/ChestScreen.tsx`
- `docs/ameliorations.md`, la spec et le plan du jalon 2.5

### 2.2 Territoire du 2b — `main` gagne

`typeChart.ts`, l'écran Toupies, les châssis, le catalogue des modèles, et **`combat.ts`**.

Le cas de `combat.ts` mérite d'être dit, parce qu'il ressemble à un conflit et n'en est pas :
la fonction `damage()` de `main` est **exactement celle de la branche plus `* typeMult(att.type, def.type)`**.
Et `resolveCollision` y écrit `const ma = a.mass` là où la branche écrit
`const ma = a.mass * a.talents.mass`, parce que `main` replie déjà `talents.mass` dans
`Top.mass` au moment de la résolution. La version de `main` est donc un **sur-ensemble**
de celle de la branche. On la prend entière (voir § 3.3 pour le seul ajout à y faire).

### 2.3 Sémantique — sept décisions explicites (§ 3)

`save.ts`, `types.ts`, `combat.ts`, `sim.ts`, `salle.ts`, `config.ts` + `balance.json`,
`calibrate.mjs`. Plus les tests, qui sont l'union des deux suites — chacune doit passer.

## 3 · Les sept décisions

### 3.1 `save.ts` — le seul conflit qui touche le joueur

**Les deux jalons ont livré `SAVE_SCHEMA = 3` avec des champs différents** : celui de
`main` ajoute `toupies` et `founderGiftClaimed`, celui de la branche ajoute `pending`. Une
sauvegarde écrite par l'un serait refusée comme corrompue par le build fusionné — la garde
`env.v === SAVE_SCHEMA && !isComplete(raw)` la rejette parce qu'il lui manque les champs de
l'autre.

**Décision (arbitrée avec le propriétaire du projet) : `SAVE_SCHEMA = 4`, sans migration.**
Le jeu n'est pas sorti ; les blobs v3 des deux dialectes sont rejetés par la garde existante
et repartent à zéro avec le bandeau d'erreur déjà prévu. Aucun chemin de migration à écrire
ni à tester. La sauvegarde de test du harnais de captures (`scripts/shots.mjs`) est
fabriquée à chaque lancement — elle devra simplement passer à `v: 4` et porter les trois
nouveaux champs.

`MetaState` porte donc les trois : `toupies`, `founderGiftClaimed`, `pending`. Tous trois
entrent dans `hydrate` (comblés depuis `createInitialMeta`) **et** dans `isComplete` (un
blob du schéma courant à qui il en manque un est corrompu, pas incomplet).

**À porter au passage : le correctif de borne de migration.** `main` a toujours
`if (env.v < SAVE_SCHEMA) raw.inventory = migrateInventoryV1(raw.inventory);`. Cette borne
signifiait « v1 seulement » quand `SAVE_SCHEMA` valait 2 ; à 3 elle fait déjà tourner la
migration du schéma 1 sur des blobs **v2**, et à 4 sur des v2 et des v3. C'est sans dégât
aujourd'hui (une pile v2 n'a pas de champ `count`, donc `migrateInventoryV1` la rend
intacte) mais c'est faux, et chaque nouveau schéma élargit le piège. La branche l'a corrigé
en `env.v < 2`, avec le commentaire qui explique pourquoi. Reprendre les deux.

### 3.2 `types.ts` — union

Le `Top` de `main` (avec `type: TopType` et `mass: number`, dont le commentaire dit déjà
« châssis × modèle de Disque × talent Masse ») **plus** les champs de la branche :

- `RunState.arena: ArenaLayout` — le terrain de la salle en cours
- `RunState.ejected: string[]` — les ids éjectés du tick, vidés en début de tick, lus par le
  rendu seul pour distinguer une éjection d'une mort par épuisement
- `RunReward.chests: ChestKind[]`
- `MetaState.pending: Record<ChestKind, number>`

### 3.3 `combat.ts` — celui de `main`, plus la perte de zone

Prendre `combat.ts` de `main` entier, puis y ajouter les deux fonctions de la branche que
`main` n'a pas :

```ts
/** Spin perdu par seconde, terrain compris. `snapshot.ts` s'en sert pour prédire le
 *  tick à venir : sans la perte de zone, `observer.ts` prendrait les pointes pour un
 *  choc et couvrirait l'arène d'étincelles sans contact. */
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

Ces deux subtilités ont chacune coûté un aller-retour de relecture au jalon 2.5 : ne pas les
« simplifier » en refusionnant.

### 3.4 `sim.ts` — l'ordre de tick de la branche, sur le typage de `main`

`main` apporte le typage des bots par salle. La branche apporte l'ordre de tick. Le résultat
doit être, **phase par phase** (toutes les toupies traversent une étape avant la suivante —
c'est ce qui rend le déterminisme lisible) :

```
run.ejected = []
refreshBotAims                       (tous les 10 ticks — vise le joueur ou l'éclat)
zones ← zoneModsAt(arena, pos)       joueur puis chaque bot ; lu UNE fois, réutilisé plus bas
applySteering(top, steer, zone)      pour chacun
moveTop(run, top)                    → éjection ⇒ spin = 0, id dans run.ejected
résolution des collisions            (celle de main, avec le triangle)
clampToArena
updateShard / takeShard
decaySpin(top, zone)                 pour chacun, avec la MÊME valeur de `zone`
filtre des morts, mort du joueur, salle suivante
```

`startSalle` : bots d'abord (`spawnSalle`), **puis** `buildLayout` — l'ordre de consommation
du flux de RNG fait partie du contrat de déterminisme.

### 3.5 `salle.ts` — `boss.mass` devient un contributeur de plus

`main` résout `Top.mass` depuis châssis × modèle de Disque × talent Masse. Le jalon 2.5 a
ajouté un poids propre au boss (`boss.mass = 3` dans `balance.json`) pour qu'un joueur qui
pousse le boss vers une brèche ait à le travailler. Le fusionner comme quatrième facteur de
la masse résolue dans `makeBot`, pas comme un champ concurrent.

### 3.6 `config.ts` et `balance.json` — union des clés, valeurs en calibration

Les clés du 2.5 à conserver : `arena.overspeedDamping`, `arena.spawnClearance`,
`arena.breach`, `arena.shard`, `arena.zones`, `arena.layouts`, `boss.mass`, `loot`, ainsi
que les types `ZoneKind`, `ZoneDef`, `LayoutDef`, `LootRule`, `ChestName` et les exports
`ARENA`, `BREACH`, `SHARD`, `ZONES`, `LAYOUTS`, `LOOT`.

Les **valeurs** en collision partent toutes en § 4 :

| Clé | `main` (2b) | branche (2.5) |
|---|---|---|
| `combat.damageK` | 0,35 | 1,3 |
| `econ.rewardBase` | 60 | 86 |
| `arena.restitution` | — | 1,6 |
| `arena.breach.ejectSpeed` | — | 400 |
| `chests.bronze.price` | 2 000 | 250 |

`config.test.ts` valide la forme du JSON à l'exécution : prendre l'union des deux jeux de
tests de forme.

### 3.7 `calibrate.mjs` — la politique terrain sur le harnais de `main`

La branche a étendu le harnais de trois choses à conserver :

1. `steerWithTerrain` — pousser la cible vers la brèche la plus proche d'**elle**, couper
   vers l'éclat quand on en est le plus près ;
2. le drainage de la file de butin (`grantChest` sur `meta.pending`) et
   `ticksToFirstChest` alimenté par **l'une ou l'autre** source, butin ou achat ;
3. la durée médiane et le nombre de morts **par salle**, et le garde-fou de passivité.

Greffer ça sur le harnais de `main` s'il a bougé. Attention : `spend()` doit acheter au plus
un coffre par salle vidée avant d'améliorer, sinon les crédits partent tous en coffres et le
chapitre ne se valide jamais.

## 4 · La calibration commune

**Une seule passe, en deux temps, jamais mélangés.** Ce projet a été recalibré deux fois
pour avoir réglé le combat et l'économie ensemble ; la règle depuis : **l'économie commande
la durée, le combat commande la forme de la difficulté.** Deux commits, deux mesures.

### 4.1 Ce que la passe doit trancher

`damageK` **1,3 ou 0,35 ?** Le 2.5 l'a monté à 1,3 pour raccourcir des combats trop longs ;
`main` est resté à 0,35 et a laissé le triangle différencier. Avec les deux vivants, le
triangle multiplie *aussi* les dégâts : 1,3 est probablement trop. Idem `rewardBase`, 86
contre 60 — chacun mesuré comme la contrepartie de son propre jalon, aucun des deux
valable pour le jeu fusionné.

### 4.2 Les garde-fous, qui priment sur les cibles chiffrées

- **La salle 10 reste la salle la plus meurtrière du chapitre.** C'est le pilier « le mur
  n'est jamais un bug, c'est le produit ». Il a déjà fait renoncer à une cible chiffrée au
  jalon 2.5, et c'était le bon arbitrage.
- **La passivité reste très loin derrière le pilotage.** C'est la mesure pour laquelle le
  jalon 2.5 existe : ne jamais toucher l'écran doit rester ruineux.
- **Le premier coffre reste immédiat** (dès la salle 1).
- Chapitre 1 franchissable, cible indicative ~15 min. Le 2.5 a livré 21 min et c'était le
  bon compromis ; ne pas sacrifier un garde-fou pour six minutes.

### 4.3 Boutons

Combat : `combat.damageK`, `arena.breach.halfWidthDeg`, `arena.breach.ejectSpeed`,
`boss.mass`, `arena.zones.pointes.spinDrain`, `arena.restitution`, `arena.overspeedDamping`.
Économie : `econ.rewardBase`, `econ.rewardGrowth`, `econ.upgradeGrowth`, et les prix de
coffre.

**Fermés** : `bot.scaling`, `boss.spinMult`, `boss.attackMult` — ils portent la forme de la
difficulté héritée du jalon 1.5. Et la table du triangle, qui est une décision de design du
2b, pas un bouton d'équilibrage.

Un bouton à la fois, remesure entre chaque, et **le balayage complet consigné** — c'est le
livrable dont dépend la passe suivante, davantage que les valeurs finales.

### 4.4 Deux avertissements payés au prix fort

- `damageK` et `rewardBase` se sont tous deux révélés **chaotiques** au jalon 2.5, pas
  plateaux : à ±0,01 un critère dur casse, parce que la durée d'un combat change le nombre
  de tirages consommés et rebat tout le flux en aval. Préférer un palier à un pic isolé, et
  le dire dans le rapport.
- La médiane du boss porte sur **cinq validations seulement** (une par graine). Un écart de
  dizaines de secondes n'y veut pas dire grand-chose. Envisager d'élargir le jeu de graines
  du harnais dans cette passe — ce serait la première fois que ça vaut son coût.

## 5 · Vérification

- `npm run test` : l'union des deux suites, toutes vertes. Le test de déterminisme de
  `sim.test.ts` est le garde-fou du 2.5 — il ne doit pas être modifié pour passer.
- `npm run build` vert.
- `npm run calibrate` : les quatre garde-fous du § 4.2 tenus.
- **À la main** (`npm run dev`), depuis un `localStorage` vidé : le terrain et le triangle
  se lisent ensemble à l'écran, un coffre tombe à la première salle, la pastille monte, et
  changer de toupie change à la fois le pilotage et le triangle.

> **Piège d'environnement.** `npm run shots` vise `localhost:5173`, occupé sur cette machine
> par un autre projet ; SpinForge démarre alors sur un autre port (5175 au dernier essai).
> Vérifier le port avant de conclure qu'un rendu est cassé. Une capture périmée a déjà fait
> croire à une régression pendant le jalon 2.5.

## 6 · Hors périmètre

- **Aucune fonctionnalité nouvelle.** Ni côté terrain, ni côté toupies.
- **Aucune décision de design du 2b rouverte** — triangle, châssis, boutique.
- **La non-éjectabilité du boss reste en dette.** Mesuré au jalon 2.5 : aux valeurs
  shippées, éjecter le boss demande ~615 px/s quand le plafond de pilotage du joueur est 240
  (384 sous accélérateur) ; 71 combats de boss, zéro éjection. La règle de brèche fonctionne
  pour le joueur (une mort sur dix est une éjection) — c'est l'offensive contre le boss qui
  n'existe pas. La rendre réelle demanderait de rouvrir `ejectSpeed` et/ou `boss.mass` : une
  future passe combat explicitement délimitée, pas celle-ci.
- **Les identités d'arène des chapitres 2 à 8** — le 2.5 a livré le système de terrain, pas
  les huit arènes.

## 7 · Dette du jalon 2.5 à reporter

Elle est écrite dans `docs/roadmap.md` § « Dette connue (jalon 2.5) » **sur la branche**, et
doit survivre à la fusion. Les points qui comptent :

- `damageK` et `rewardBase` sur des points chaotiques ; obligation de remesure si la
  physique, le contenu de la salle 10, `arena.breach.ejectSpeed`, `boss.mass` ou le jeu de
  graines changent — l'intégration déclenche cette obligation, d'où le § 4.
- La politique « terrain » du harnais n'utilise presque pas le terrain : 17 éjections de
  bots sur 1 209 bots détruits (1,4 %), et 0,5 % seulement des contacts sortants atteignent
  le seuil de 400 px/s. Tous les chiffres du 2.5 ont donc été réglés contre une politique
  dont la manœuvre distinctive paie rarement.
- Le boss à 87 s manque sa cible de ~45 s (spec § 3.1).
- `ticksToFirstChest` du harnais n'a pas de test automatisé.
- `boss.mass` et `shard.radius` n'ont pas de test de forme dans `config.test.ts`.
