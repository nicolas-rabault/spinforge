# Jalon 3, lot A — la progression des chapitres : spécification de conception

> **Pour qui lit ça sans contexte.** Le jeu ne sait jouer qu'un seul chapitre. Le boss
> vaincu remet la salle à 1 et la descente repart aussitôt, sans frontière : il n'existe
> ni écran de victoire, ni chapitre 2, ni référence de farm. Ce lot pose ce socle — et
> lui seul. Le farm, les gimmicks d'arène et la sauvegarde IndexedDB sont les lots B, C
> et D du même jalon (§ 10).

## État des lieux

| | Aujourd'hui (`main`, `23d3f64`) |
|---|---|
| Chapitres jouables | 1, codé en dur dans `createRun` (`sim.ts:49`) |
| Fin de chapitre | `tick` remet `run.salle` à 1 et relance `startSalle` — la descente ne s'arrête jamais |
| Mémoire de progression | `meta.chapterValidated: boolean`, vrai ou faux, sans numéro |
| Table de types des bots | `botTypes` ne contient que la clé `"1"` ; `botTypeFor` retombe dessus pour tout autre chapitre |
| Difficulté | un seul palier, linéaire par salle (`salle.ts:19-22`) |
| Sites qui devinent « le boss vient de tomber » | **trois** : `meta.ts:38`, `useGameLoop.ts:60`, `observer.ts:102` |
| Tests | 327 verts |
| Chapitre 1 mesuré (`npm run calibrate`, 10 graines) | 0,32 h · 9 runs · salle 10 la plus meurtrière (23 morts contre 21 en salle 7) · premier coffre immédiat · passivité jamais validée |

Références : `docs/game-design.md` (§ Structure, § Économie), `docs/roadmap.md` (jalon 3 et
les quatre sections « Dette connue »), et le journal de calibration
`docs/superpowers/plans/2026-08-28-calibration-integration.md`, d'où viennent
`econ.rewardBase = 104` et `combat.damageK = 1,3`.

## Ce que ce lot livre, en une phrase

Une **frontière de run explicite** — le boss vaincu ferme la descente — et la **mémoire
numérotée** de ce qu'on a validé, qui ensemble ouvrent les chapitres 2 à 4 et donnent au
lot B la référence de farm dont il a besoin.

## 1 · Les cinq décisions

Tranchées au brainstorming, elles ne sont pas rouvertes par l'implémentation.

1. **Le boss vaincu ferme le run.** Écran de victoire, chapitre suivant débloqué, nouvelle
   descente explicite. C'est la frontière de run que la dette du verrou réclame.
2. **Le choix du chapitre se fait sur l'écran de combat**, entre deux descentes. Pas de
   cinquième onglet. Jouables : 1 à `min(bestChapter + 1, maxChapter)`.
3. **La difficulté monte par un facteur géométrique par chapitre**, multiplicatif avec le
   palier de salle existant. À l'exposant 0, le chapitre 1 est bit à bit inchangé.
4. **`startRun` absorbe `createRun`, `resetRun` et `equipPendingToupie`**, qui
   disparaissent. Le verrou du châssis n'est pas affaibli, il devient structurel.
5. **Le mur déménage au chapitre 3.** Chapitre 2 validé en 1 à 3 runs après le 1 ;
   chapitre 3 nettement plus coûteux ; chapitre 4 au-dessus encore.

## 2 · Le socle de données — `bestChapter`

### 2.1 Le champ

`MetaState.chapterValidated: boolean` devient **`bestChapter: number`** ; `0` signifie « rien
validé ». `createInitialMeta` le pose à `0`.

**Il ne descend jamais.** `applyRunReward` fait un `Math.max`, jamais une affectation :

```ts
if (reward.boss) meta.bestChapter = Math.max(meta.bestChapter, reward.chapter);
```

La règle n'est pas décorative. Le pilier « le farm ne progresse jamais » (lot B) se lit
sur ce champ : si une descente ratée au chapitre 2 pouvait le ramener à 1, le joueur
perdrait sa référence de farm en jouant — l'inverse exact du contrat. Une affectation
simple suffirait aujourd'hui puisqu'on ne joue jamais au-dessous de son maximum ; elle
cesserait de suffire à la première descente choisie plus bas, c'est-à-dire dès le
panneau du § 4.

`canClaimFounderGift` devient `meta.bestChapter >= 1 && !meta.founderGiftClaimed`.

### 2.2 La sauvegarde — schéma 4 → 5

`SAVE_SCHEMA` passe à **5**. La migration ne demande aucune fonction dédiée : elle tient
dans `hydrate`, qui est déjà le mécanisme des migrations du dépôt (« une version antérieure
est, par construction, un méta auquel il manque des champs ») :

```ts
bestChapter: typeof partial.bestChapter === 'number'
  ? partial.bestChapter
  : (partial.chapterValidated === true ? 1 : 0),
```

Un blob de schéma 4 conserve donc sa progression : un joueur qui avait validé le chapitre 1
repart avec `bestChapter = 1`, chapitre 2 débloqué. Un blob antérieur au 4 traverse la même
branche et retombe sur `0`, ce qui est exact.

`isComplete` exige `typeof m.bestChapter === 'number'` **et cesse d'exiger
`chapterValidated`**. Elle est appelée **deux fois** dans `deserializeMeta` : sur le blob
brut quand il porte le schéma courant (un champ manquant y est une corruption, pas une
version antérieure), et toujours sur le résultat d'`hydrate`. C'est cette asymétrie qui fait
marcher la migration : un blob `v: 4` échappe à la première garde, traverse `hydrate` qui lui
pose son `bestChapter`, et passe la seconde. Un blob `v: 5` sans `bestChapter`, lui, est
refusé — ce qui est exact, c'est un blob amputé. Un test de migration 4 → 5 fixe les deux
sens.

## 3 · La frontière de run

### 3.1 La phase

`Phase` devient `'fighting' | 'dead' | 'won'`. Dans `tick`, le bloc « salle vidée »
(`sim.ts:198-210`) :

```ts
if (run.bots.length === 0) {
  const boss = run.salle === SALLES_PER_CHAPTER;
  const rolled = salleReward(run.chapter, run.salle, boss, run.rngState);
  run.rngState = rolled.rngState;
  if (boss) { run.phase = 'won'; return rolled.reward; }
  run.salle++;
  run.player.spin = Math.min(/* soin d'entre-salles, inchangé */);
  startSalle(run);
  return rolled.reward;
}
```

Deux conséquences voulues : `run.salle` **ne revient plus à 1** au boss, et `startSalle`
n'est plus appelé après lui. La garde d'entrée `if (run.phase !== 'fighting') return null`
(`sim.ts:155`) fait le reste — la boucle de rendu peut continuer à appeler `tick`, elle ne
calcule plus rien. Le soin d'entre-salles disparaît du passage du boss : il n'y a plus de
salle suivante à préparer, et le run recommence de toute façon avec un spin plein.

### 3.2 `startRun` absorbe trois fonctions

```ts
export function startRun(meta: MetaState, chapter: number, seed: number): RunState
```

Elle remplace `createRun` (`sim.ts:49`), `resetRun` (`sim.ts:70`) et `equipPendingToupie`
(`sim.ts:117`), toutes trois **supprimées**. Elle borne son chapitre elle-même :

```ts
const chosen = Math.min(Math.max(1, Math.trunc(chapter)), maxPlayableChapter(meta));
```

avec `maxPlayableChapter(meta) = Math.min(meta.bestChapter + 1, MAX_CHAPTER)`, exportée pour
que l'interface propose exactement les mêmes chapitres que la simulation accepte.

**Pourquoi la borne vit dans `startRun` et pas seulement dans l'interface.** C'est la même
leçon que le verrou du châssis : une règle que seul l'appelant respecte est une règle qu'un
appelant peut oublier. Ici, la borne dans `startRun` rend impossible de sauter au chapitre 4
depuis n'importe quel chemin — interface, harnais, futur autopilote du lot B.

**Ce que l'absorption gagne.** Le châssis de la descente est lu **une seule fois**, dans
`startRun`. Plus aucun chemin de code du run ne relit `meta.toupies.active` : ni à la mort
(`resetRun` le faisait), ni au boss (`equipPendingToupie` le faisait), ni en cours de salle
(`syncRunStats` ne l'a jamais fait, et c'est ce que le verrou protégeait). Le câblage quitte
React — `useGameLoop.ts:60` n'a plus rien à appeler — donc la dette « l'appel manquant n'est
couvert par aucun test automatisé » **tombe** : il n'y a plus d'appel à oublier, la propriété
est portée par la signature.

**La graine.** `startRun` normalise (`seed >>> 0 || 1`). Deux appelants, deux sources :
- au démarrage, `App.tsx:22` garde sa graine dérivée de l'horloge, hors de la simulation ;
- à chaque nouvelle descente, l'interface passe **`runRef.current.rngState`**, c'est-à-dire
  la suite du flux de la descente précédente. C'est exactement ce que faisait `resetRun`, qui
  ne re-graînait pas : deux runs consécutifs ne rejouent pas les mêmes gabarits d'arène.
  Aucune horloge n'entre dans `src/sim/`.

`startRun` renvoie un **nouvel** objet ; l'interface remplace `runRef.current`. Tous les
consommateurs lisent déjà à travers la ref (`useGameLoop`, `CombatScreen`, le rendu via
`h.draw(runRef.current, …)`), aucun ne capture l'objet.

### 3.3 Le drapeau boss — trois devineurs, pas deux

`RunReward` gagne deux champs de contexte :

```ts
export interface RunReward {
  credits: number;
  gems: number;
  chests: ChestKind[];
  /** La salle vidée était le boss : le chapitre est validé, la descente est finie. */
  boss: boolean;
  /** Le chapitre d'où vient cette récompense. Porté par la récompense et non passé
   *  à part : un appelant ne peut pas se tromper de chapitre. */
  chapter: number;
}
```

`salleReward` prend le chapitre en premier paramètre (elle en a besoin de toute façon pour
le facteur de revenu du § 6.2) et remplit les deux champs. **`applyRunReward` perd son
troisième paramètre** et devient `applyRunReward(meta, reward)`.

La dette écrite au verrou du châssis annonce deux sites qui dérivent « le boss vient de
tomber ». Il y en a **trois** :

| Site | Dérivation actuelle | Après |
|---|---|---|
| `meta.ts:38` | `salleJustCleared === SALLES_PER_CHAPTER` | `reward.boss` |
| `useGameLoop.ts:60` | `salleBefore === SALLES_PER_CHAPTER` | disparaît avec `equipPendingToupie` |
| `observer.ts:102` | `before.salle === 10 && after.salle === 1` | **supprimé** |

Le troisième est celui que la dette du jalon 2a signale comme mort-né : `RenderEvents.chapterValidated`
est « produit et consommé par personne ». Il ne devient pas seulement inutile — il devient
**faux**, puisque la salle ne revient plus à 1. Décision : **supprimer le champ** de
`RenderEvents`, de `observe()` et de ses deux assertions dans `observer.test.ts`. Le panneau
de victoire se rend depuis `run.phase`, pas depuis un événement ; garder l'événement serait
garder du code mort, ce que le dépôt s'interdit. `bossEntered` et `salleChanged` restent
justes : la salle n'avance plus que vers l'avant.

## 4 · Le choix de la descente

`CombatScreen.tsx:213` remplace le bouton « Retenter » par un panneau affiché dès que
`run.phase !== 'fighting'` :

```
┌───────────────────────────────────┐
│  CHAPITRE 1 VALIDÉ                │   ← ou « Ta toupie s'est arrêtée »
│  Le chapitre 2 s'ouvre.           │
│                                   │
│  Choisis ta descente              │
│   [ 1 ]  [ 2 ]                    │   ← 1 à min(bestChapter+1, 4)
│                                   │
│  [    Nouvelle descente    ]      │
└───────────────────────────────────┘
```

- **Titre** : `'won'` → « Chapitre N validé » ; `'dead'` → « Ta toupie s'est arrêtée ».
- **Présélection** : après une mort, le chapitre perdu (on retente ce qu'on vient de rater) ;
  après une victoire, le chapitre nouvellement débloqué (`min(chapter + 1, maxPlayable)`).
- **Chapitres proposés** : `1` à `maxPlayableChapter(meta)`, la même fonction que `startRun`.
- **Plafond atteint** : quand `bestChapter >= MAX_CHAPTER`, une ligne dit que les chapitres
  suivants ne sont pas encore ouverts — sans quoi le joueur qui valide le chapitre 4 voit un
  écran de victoire qui ne débloque rien et croit à un bug.
- **Action** : `runRef.current = startRun(meta, choisi, runRef.current.rngState)`.

`chapter.maxChapter = 4` entre dans `balance.json`, exporté par `config.ts` sous
`MAX_CHAPTER` — aucune constante d'équilibrage en dur ailleurs (règle d'architecture n° 3).

**Les noms n'ont rien à inventer.** `src/content/chapters.ts` porte déjà les huit arènes et
leurs boss (Hangar Rouillé, Dojo Néon, Marché Souterrain, Cratère de Magma…), et
`CombatScreen` lit déjà `chapterOf(run.chapter)`. Le panneau et le HUD nomment donc les
chapitres 2 à 4 sans une ligne de contenu supplémentaire — ce sont leurs **gimmicks** qui
manquent, pas leurs identités (§ 5, dernier paragraphe).

## 5 · Le contenu — les tables de types des chapitres 2 à 4

`botTypes` gagne les clés `"2"`, `"3"`, `"4"`. Le repli de `botTypeFor` vers le chapitre 1
reste en place : il cesse simplement d'être emprunté sous le plafond de 4.

**Le principe : le triangle tourne d'un chapitre à l'autre**, pour que la contre-pioche qui
marchait cesse de marcher. Rappel de la règle (`docs/game-design.md`) : Attaque > Endurance >
Défense > Attaque, le dominant inflige +25 %, et la règle est **symétrique** — un bot dont le
type domine celui du joueur frappe plus fort lui aussi.

| Chapitre | Salles 1-3 | 4-6 | 7-9 | Boss (10) | Ce que le boss punit |
|---|---|---|---|---|---|
| 1 (inchangé) | endurance | défense | attaque | attaque | dominé par Défense — d'où Carapace Abyssale, meilleur châssis du chapitre 1 |
| 2 | défense | attaque | endurance | **endurance** | domine Défense : le vainqueur du chapitre 1 est du mauvais côté |
| 3 | attaque | endurance | défense | **défense** | domine Attaque : le vainqueur du chapitre 2 est du mauvais côté |
| 4 | attaque, endurance, défense | équilibre | attaque, endurance, défense | **équilibre** | ne domine rien et n'est dominé par rien |

Les tables, en clair (dix entrées chacune, salle 1 à salle 10) :

```
"2": défense, défense, défense, attaque, attaque, attaque, endurance, endurance, endurance, endurance
"3": attaque, attaque, attaque, endurance, endurance, endurance, défense, défense, défense, défense
"4": attaque, endurance, défense, équilibre, équilibre, équilibre, attaque, endurance, défense, équilibre
```

Lecture : à chaque chapitre, le châssis qui vient de gagner est celui que le boss suivant
domine. Le contre du boss du chapitre 2 est Attaque (Typhon Primal), mesuré à **17 runs
médians contre 6 pour Carapace** au relevé d'ouverture de la calibration d'intégration
(10 graines) ; celui du chapitre 3 est Endurance (Tigre Foudre, **19 runs contre 5** au
relevé final — l'écart de ×3,80 qui figure en dette). **Le mur du chapitre 3 n'est donc pas
seulement un mur de chiffres** : c'est le chapitre où il faut jouer la toupie qu'on avait le
moins de raisons de monter. Ces deux mesures datent d'avant ce lot et ne prouvent rien sur
les chapitres 2 à 4 : elles disent seulement quel châssis le harnais tient pour faible
aujourd'hui, et donc où la contre-pioche fera mal.

Le chapitre 4 sort du triangle : ses trois premières salles le parcourent en entier — aucun
châssis n'est du bon côté des trois — et sa bande centrale comme son boss sont **Équilibre**,
qui inflige +10 % à tout le monde et n'encaisse jamais le +25 %. C'est là que la
contre-pioche cesse de suffire, donc le bon endroit pour que le mur cesse d'être négociable
autrement qu'en pilotant et en s'équipant.

`config.test.ts` gagne une garde de forme : chaque chapitre de `1` à `chapter.maxChapter` a
une entrée, chaque entrée a exactement `sallesPerChapter` valeurs, chacune est un type connu
de `types`. Sans elle, une table à neuf entrées ferait silencieusement retomber le boss sur
le type de la salle 9 (`botTypeFor` borne l'index).

**Ce que les chapitres 2 à 4 n'ont pas** : leur identité d'arène. `buildLayout` ne connaît
que la salle, et les gimmicks (murs élastiques, piliers mobiles, geysers) sont du lot C. Les
quatre chapitres partagent donc le même vocabulaire de terrain. C'est un choix, pas un oubli.

## 6 · Les deux facteurs géométriques

### 6.1 Difficulté — `bot.scaling`

`bot.scaling` gagne `spinPerChapter` et `attackPerChapter`, appliqués dans `makeBot` :

```ts
const spinScale  = (1 + BOT_SCALING.spinPerSalle   * (salle - 1)) * Math.pow(BOT_SCALING.spinPerChapter,   chapter - 1);
const attackScale = (1 + BOT_SCALING.attackPerSalle * (salle - 1)) * Math.pow(BOT_SCALING.attackPerChapter, chapter - 1);
```

Linéaire par salle × géométrique par chapitre. Deux propriétés en découlent :

- **Le chapitre 1 est bit à bit inchangé**, quelles que soient les valeurs : l'exposant y
  vaut 0. C'est ce qui rend le garde-fou de non-régression du § 9 exact et non approximatif.
- **Les deux mêmes axes que le palier de salle**, spin et attaque. La `defense` des bots
  n'est montée par aucun palier aujourd'hui ; ce lot n'en ouvre pas un troisième.

Le boss garde ses multiplicateurs (`BOSS.spinMult`, `BOSS.attackMult`) par-dessus : un boss
de chapitre 3 est un boss de chapitre 1 mis à l'échelle, pas une créature à part.

### 6.2 Revenu — `econ.rewardPerChapter`

```ts
const base = ECON.rewardBase
  * Math.pow(ECON.rewardGrowth, salle - 1)
  * Math.pow(ECON.rewardPerChapter, chapter - 1);
```

Sans lui, le chapitre 2 paierait comme le 1 en étant plus dur : le joueur n'aurait aucune
raison d'y descendre, et le lot B n'aurait rien à farmer — le farm rejoue le **meilleur**
chapitre validé précisément parce qu'il paie mieux.

`econ.bossGems` **ne suit pas** le chapitre. Les gemmes commandent l'économie des coffres
d'Arène et Mythique, que ce lot ne calibre pas ; les faire croître géométriquement ici
déplacerait le rythme du gacha sans qu'aucune mesure ne le demande.

### 6.3 L'ordre des passes — non négociable

**Jamais le combat et l'économie dans la même passe ni le même commit.** Ce projet l'a payé
deux fois (jalons 1.5 et 2b, voir `docs/roadmap.md`).

1. Le mécanisme atterrit avec `spinPerChapter = attackPerChapter = rewardPerChapter = 1,0`.
   À ces valeurs, les chapitres 2 à 4 ne diffèrent du 1 que par leurs types — et le harnais
   doit rendre pour le chapitre 1 **exactement** les chiffres d'aujourd'hui.
2. **Passe combat** : balayage de `spinPerChapter` et `attackPerChapter`, revenu laissé à
   1,0. Cible : chapitre 3 nettement plus coûteux que le 2, chapitre 4 au-dessus.
3. **Passe économie** : balayage de `rewardPerChapter`, combat figé. Cible : chapitre 2
   validé en 1 à 3 runs après le 1.

Chaque passe dans son commit, avec son rapport de harnais collé dans le journal de
calibration.

## 7 · Les deux harnais

### 7.1 `scripts/verrou.mjs` — il doit changer, sous peine de rougir en silence

Il écrit un blob `v: 4` et vérifie le point d'application d'`equipPendingToupie`. Les deux
disparaissent. Il devient donc :

- blob **`v: 5`**, `bestChapter: 0` à la place de `chapterValidated: false` ;
- **passe boss** : jouer la descente, vérifier que le run s'arrête (panneau de victoire), que
  le chapitre 2 devient proposé, puis lancer la nouvelle descente et vérifier que le châssis
  choisi entre-temps est bien celui qui pilote ;
- **passe mort** : inchangée dans son intention — le châssis choisi pendant l'agonie ne monte
  qu'à la descente suivante.

Il reste hors de `npm run test` (il lui faut `npm run dev` et une minute de navigateur), et
il reste **vérifié par mutation** : le câblage de la nouvelle descente retiré, la passe boss
doit rougir. La dette du verrou prévoyait « à rendre automatique quand le jalon 3 donnera à
la boucle une frontière de run explicite » — la frontière arrive ici, et c'est `startRun`
qui rend la propriété testable unitairement (§ 9, mutation n° 2) ; le harnais navigateur
garde ce qu'aucun test unitaire ne voit, le câblage de l'interface.

### 7.2 `scripts/calibrate.mjs` — apprendre à enchaîner

Il ne sait jouer que le chapitre 1 : `createRun` le code en dur, et la boucle s'arrête au
premier `meta.chapterValidated`. Il doit :

- démarrer par `startRun(meta, 1, seed)` et, **à la mort, garder `seed + runs`** — c'est ce
  qui rend les chiffres du chapitre 1 comparables à ceux d'aujourd'hui, au bit près ;
- sur `phase === 'won'`, enchaîner sur `startRun(meta, maxPlayableChapter(meta), …)` : le
  harnais joue toujours le chapitre le plus haut qu'il peut, jusqu'au plafond ;
- s'arrêter quand `bestChapter === MAX_CHAPTER` ou au plafond de ticks ;
- rapporter **par chapitre** : heures et runs jusqu'à validation, durée médiane par salle,
  morts par salle, et la salle la plus meurtrière du chapitre.

La série de contre-pioche (`counterFor`) suit sans rien changer : elle lit déjà
`botTypeFor(run.chapter, run.salle)`, donc elle se contre-pioche correctement dans les
chapitres 2 à 4 dès que leurs tables existent. C'est même la mesure qui dira si le
chapitre 4 tient sa promesse — l'écart entre la série contre-pioche et le meilleur châssis
fixe doit s'y **effondrer**.

## 8 · Dettes réglées au passage

| Dette | Origine | Correctif |
|---|---|---|
| `RenderEvents.chapterValidated` mort-né | jalon 2a | supprimé (§ 3.3) |
| Deux (trois) sites devinent le boss | verrou du châssis | `reward.boss` (§ 3.3) |
| Le point d'application du verrou n'a pas de test automatisé | verrou du châssis | `startRun` le rend structurel (§ 3.2) |
| `bot-{salle}-{index}` ne distingue pas les chapitres | rendu | `makeBot` pose `bot-${chapter}-${salle}-${index}` (`salle.ts:26`, une ligne ; `viewFor`, `arena.ts:107`, n'a rien à changer — il élague déjà les vues dont l'id a disparu) |
| `chapterGroups(1)` code le chapitre 1 en dur | jalon 2b | lit `runRef.current.chapter` (`ToupiesScreen.tsx:75`) |

## 9 · Vérification

### 9.1 Les quatre tests à vérifier par mutation

Un test qui prouve un mécanisme doit rougir quand on retire le mécanisme. Quatre tests le
prouvent ici, chacun vérifié en retirant sa cible :

1. **`bestChapter` ne descend jamais** — valider le chapitre 2, puis rejouer et valider le
   chapitre 1 : `bestChapter` reste à 2. *Mutation* : remplacer le `Math.max` par une
   affectation.
2. **`startRun` fixe le châssis, et le run ne le relit jamais** — démarrer avec un châssis,
   changer `meta.toupies.active` en cours de descente, franchir des salles avec
   `syncRunStats` : `run.toupie` et le type du joueur ne bougent pas ; ils ne changent qu'au
   `startRun` suivant. *Mutation* : faire lire `meta.toupies.active` à `syncRunStats`.
3. **Le chapitre 1 est inchangé par le facteur de chapitre** — porter `spinPerChapter` et
   `attackPerChapter` à une valeur franche et comparer les bots du chapitre 1 avant/après.
   *Mutation* : remplacer l'exposant `chapter - 1` par `chapter`.
4. **Les chapitres jouables sont bornés par `bestChapter + 1`** — `startRun(meta, 4, …)`
   avec `bestChapter = 0` démarre au chapitre 1. *Mutation* : retirer la borne de `startRun`.

### 9.2 Les garde-fous de calibration

Ceux qui existent, et qui **ne doivent pas bouger** : chapitre 1 à 0,32 h / 9 runs · salle 10
la plus meurtrière (23 morts contre 21 en salle 7) · premier coffre immédiat · passivité
jamais validée. L'écart entre châssis à ×3,80 pour une cible de ×2 est une **dette connue**,
pas une régression.

Le chapitre 1 étant bit à bit inchangé (§ 6.1), ces quatre chiffres sont une vérification
**exacte** : le moindre écart signale que la refonte du cycle de run a déplacé le flux de
RNG, et non que l'équilibrage a bougé. Si l'un d'eux se déplace, en comprendre la cause
**avant** de régler quoi que ce soit.

**Garde-fou ajouté par ce lot** : dans **chaque** chapitre, la salle 10 reste la salle la
plus meurtrière. C'est le pilier « le mur n'est jamais un bug, c'est le produit », étendu au
seul endroit où il pouvait se perdre — un chapitre dont la difficulté monte géométriquement
peut très bien tuer en salle 7.

### 9.3 En navigateur, par moi et pas par délégation

`npm run dev`, puis `http://localhost:<port>/spinforge/` — lire la ligne « Local: », le port
5173 et le 5174 étant occupés par d'autres processus. Tout ce lot arrive **au bout d'une
descente** : l'horloge de la page est accélérée comme dans `scripts/verrou.mjs`
(`page.addInitScript` enveloppant `requestAnimationFrame`), la simulation avançant par pas
fixes de 100 ms, ce qu'elle calcule est rigoureusement inchangé.

À voir de ses yeux : le boss vaincu arrête le combat au lieu de relancer la salle 1 · le
panneau de victoire propose le chapitre 2 · la descente choisie démarre au bon chapitre ·
la mort propose de retenter le chapitre perdu · le chapitre 3 n'est pas proposé avant que
le 2 ne soit validé.

## 10 · Hors périmètre

Ce lot est le **socle** du jalon 3. Ne débordent pas dessus :

- **Lot B — le farm** : autopilote déterministe dans `src/sim/`, mode AUTO, hors-ligne
  plafonné à 4 h, écran « Pendant ton absence », et la dette de performance du jalon 1.5
  (p90 à 25,5 ms). `bestChapter` est la référence que ce lot-là consommera ; **ici, rien ne
  la lit pour farmer**.
- **Lot C — le contenu** : gimmicks d'arène des chapitres 2 à 4, atout temporaire par salle,
  quêtes quotidiennes.
- **Lot D** : sauvegarde IndexedDB et export.

Restent également hors périmètre, et restent des dettes écrites : l'écart entre châssis à
×3,80, le combat de boss à 64,8 s pour une cible de ~45 s, et l'éjection du boss par une
toupie lourde jamais mesurée en conditions de jeu.

## 11 · Ce que ce lot laisse ouvert

- **Les valeurs des trois facteurs** ne sont pas dans cette spec : elles se mesurent, elles
  ne se décident pas. Le § 6.3 fixe l'ordre et les cibles ; le journal de calibration
  recevra les balayages.
- **`applyReward`** reste exporté sans appelant de production hors `applyRunReward` (dette
  du jalon 2a). Sa raison d'être ne change pas : `meta.test.ts` teste l'arithmétique
  crédits/gemmes isolément de la validation de chapitre.
- **Le repli de `botTypeFor`** vers le chapitre 1 survit alors que plus aucun chapitre
  jouable ne l'emprunte. Il est gardé : les chapitres 5 à 8 arriveront un par un au jalon 4,
  et c'est ce repli qui leur permet d'arriver sans casser la simulation entre-temps.
