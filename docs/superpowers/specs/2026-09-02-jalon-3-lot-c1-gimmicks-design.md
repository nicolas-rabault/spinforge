# Jalon 3, lot C1 — les gimmicks des chapitres 2 à 4

> Spec de design. Roadmap : `docs/roadmap.md` (jalon 3, lot C). Spec de référence :
> `docs/game-design.md` (§ 8 arènes-chapitres, § Structure).
> Date : 2026-09-02. Branche : `jalon-3-lot-c`, ouverte sur `origin/main` à `d6991fa`.

## État des lieux

Le système de terrain est livré depuis le jalon 2.5 — répulsion réellement parcourue, bord
à brèches, zones au sol, éclat de Gyre — et les chapitres 1 à 4 sont atteignables depuis le
lot A. Mais **les quatre chapitres jouent dans la même arène**, et une seule ligne de code
dit pourquoi :

```ts
const built = buildLayout(run.salle, spawned.rngState);   // src/sim/sim.ts, startSalle()
```

`buildLayout` reçoit la salle et jamais le chapitre. Le gabarit ne peut donc pas différer
d'un chapitre à l'autre, quel que soit le contenu qu'on écrirait dans `balance.json`. Les
identités du § 8 de `docs/game-design.md` — 2 Dojo Néon (murs élastiques), 3 Marché
Souterrain (piliers mobiles), 4 Cratère de Magma (geysers) — sont restées du texte.

Ce que les chapitres 2 à 4 possèdent **déjà** en propre, et qui n'est pas remis en cause
ici : leur composition de types (`botTypes`, lot A), leurs deux facteurs géométriques
(`spinPerChapter`, `attackPerChapter`) et leur facteur de revenu (`rewardPerChapter`).
Ce lot ajoute la seule chose qui manquait à leur identité : le terrain.

**Le chapitre 1, Hangar Rouillé, n'a aucun piège et doit le rester** (`docs/game-design.md`,
§ 8). Ce n'est pas seulement une contrainte de design : c'est l'instrument de mesure de ce
lot — voir § 6.

## Ce que ce lot livre, en une phrase

Le gabarit d'arène apprend le chapitre dont il vient, et trois chapitres s'en servent —
un mur qui renvoie plus qu'il ne prend, des piliers qui dérivent, des geysers qui battent —
sans qu'un seul bit du chapitre 1 ne bouge.

## 1 · Les six décisions

1. **Le gabarit apprend le chapitre.** `buildLayout(chapter, salle, rngState)`. C'est la
   couture unique du lot : tout le reste s'y branche.
2. **Le chapitre 1 est neutre, et neutre veut dire bit à bit.** Pas « à peu près comme
   avant » : le même flux de RNG, les mêmes constantes, le même nombre d'opérations
   flottantes dans le même ordre. C'est vérifiable, et c'est vérifié (§ 6.1).
3. **Vocabulaire de terrain étendu, pas trois mécanismes neufs.** Les murs élastiques
   réutilisent le rebond qui existe, les geysers réutilisent les zones qui existent ; les
   piliers sont le seul objet neuf. Un ajout de simulation, deux réemplois.
4. **Un pilier ne fait aucun dégât — il repousse.** La menace est indirecte : couper la
   ligne d'attaque, pousser vers une brèche. Ajouter une source de dégâts aurait demandé
   son propre équilibrage, en plus de celui du déplacement.
5. **L'autopilote n'est pas touché.** `steerWithTerrain` reste au mot près ce qu'elle est.
   Le joueur modélisé subit piliers et geysers sans les esquiver — la difficulté mesurée
   est donc **majorée**, et on l'écrit plutôt que de la corriger. En échange l'instrument
   ne bouge pas, et le chapitre 1 reste un contrôle exact.
6. **Les constantes de gimmick sont le bouton de réglage de ce lot.** Aucune des cinq
   constantes calibrées le 2026-09-02 ne bouge : la passe est purement combat, l'économie
   n'est pas ouverte. Voir § 6.3 pour la lecture de la clause de remesure.

## 2 · La couture — `buildLayout` apprend le chapitre

### 2.1 La signature

```ts
export function buildLayout(
  chapter: number,
  salle: number,
  rngState: number,
): { layout: ArenaLayout; rngState: number }
```

Un seul appelant de production : `startSalle` (`src/sim/sim.ts`), qui passe `run.chapter`.
Les tests de `src/sim/terrain.test.ts` en sont les autres appelants.

### 2.2 Ce que le gabarit porte en plus

`ArenaLayout` gagne trois champs, tous **de valeur neutre au chapitre 1** :

```ts
export interface ArenaLayout {
  zones: Zone[];
  breaches: Breach[];
  shard: Shard | null;
  shardTimer: number;
  /** Restitution du bord pour CE chapitre. Vaut `arena.wallRestitution` hors
   *  chapitre à murs élastiques. */
  wallRestitution: number;
  /** Piliers mobiles. Vide hors chapitre à piliers. */
  pillars: Pillar[];
}
```

Le geyser n'ajoute pas de champ : c'est un `ZoneKind` de plus, porté par `zones` (§ 5).

### 2.3 L'ordre de consommation du flux RNG

Le déterminisme du projet tient à ce que la consommation de tirages soit **fixe et
connue**. L'ordre reste celui d'aujourd'hui, les nouveaux tirages venant **après** :

1. bots (`spawnSalle`) ;
2. zones (`buildLayout`, boucle sur `zoneKindsFor`) ;
3. brèches (`buildLayout`, un tirage d'orientation) ;
4. **phases des geysers** — un tirage par zone de type `geyser`, dans l'ordre du tableau ;
5. **piliers** — pour chacun, la position par le même tirage borné que les zones (deux
   tirages par essai, au plus `PLACEMENT_TRIES` essais), puis **un** tirage pour le cap.

Au chapitre 1 les étapes 4 et 5 consomment **zéro tirage** : la liste des geysers est
vide et celle des piliers aussi. C'est ce qui rend la décision 2 vraie au bit, et non
seulement en intention.

## 3 · Chapitre 2 — Dojo Néon, murs élastiques

### 3.1 Ce qui change

`WALL_RESTITUTION` est aujourd'hui une constante de module, lue directement par
`moveAndBounce` (`src/sim/physics.ts`) :

```ts
top.vel.x -= (1 + WALL_RESTITUTION) * out * nx;
```

Elle devient un champ du gabarit, que `moveAndBounce` lit sur le `layout` qu'il reçoit
déjà en paramètre. Aucune signature ne change. À `layout.wallRestitution === 0.8` — la
valeur de `balance.json`, donc celle du chapitre 1 — l'expression est **la même
multiplication sur les mêmes octets**.

### 3.2 Ce que ça fait au jeu

Au-dessus de 1, le mur rend plus d'énergie qu'il n'en absorbe : on repart du bord plus
vite qu'on n'y est arrivé. Trois conséquences, toutes voulues :

- le bord cesse d'être un refuge — s'y adosser pour souffler devient coûteux ;
- les chocs qui suivent un rebond sont plus violents, dans les deux sens (la règle est
  uniforme : les bots rebondissent aussi) ;
- le contrôle près du bord demande d'anticiper, ce qui est exactement l'identité « dojo »
  — un lieu où l'on apprend à ne pas se faire renvoyer.

### 3.3 Ce que ça ne change pas

**L'éjection.** `moveAndBounce` teste la brèche et la vitesse sortante *avant* d'appliquer
le rebond, et retourne alors sans le calculer. Un mur élastique ne rend donc pas une
brèche plus ni moins mortelle, et le seuil `arena.breach.ejectSpeed` garde exactement le
sens qu'il a aujourd'hui. Ce point mérite un test dédié : c'est le genre de couplage qu'on
croit absent jusqu'à ce qu'il morde.

## 4 · Chapitre 3 — Marché Souterrain, piliers mobiles

### 4.1 L'objet

```ts
export interface Pillar {
  x: number;
  y: number;
  radius: number;
  vx: number;
  vy: number;
}
```

Placés par le **même tirage borné que les zones**, avec la même garantie de dégagement du
point d'apparition (`clearOfSpawn`) et le même repli déterministe si les essais échouent.
Leur cap est ensuite tiré ; leur vitesse, elle, est une constante d'équilibrage — deux
piliers d'une même salle vont à la même allure, dans des directions différentes.

### 4.2 Leur mouvement

Une fonction `updatePillars(layout)` appelée une fois par tick, **sans RNG** : chaque
pilier avance de `v × TICK_S` et rebondit sur le bord de l'arène (réflexion sur la
normale, restitution 1 — un pilier ne perd pas d'énergie, sinon il finirait immobile au
centre et cesserait d'être mobile).

Un pilier ne sort jamais de l'arène et n'est jamais éjecté : il n'est pas une toupie, les
brèches ne le concernent pas.

### 4.3 Leur effet — repousser, jamais blesser

Quand le disque d'une toupie recouvre celui d'un pilier, la toupie est **replacée au
contact** et sa vitesse est réfléchie sur la normale du contact, avec la restitution de
choc du monde (`arena.restitution`, celle qui rend déjà un choc entre toupies plus
énergétique qu'il n'est absorbé). Le pilier, lui, ne bouge pas : il est de masse infinie.
Aucun spin n'est retiré.

**Pourquoi aucun dégât.** Un pilier qui blesse aurait fallu équilibrer sur deux axes à la
fois — combien il pousse et combien il coûte — et la salle 10 du chapitre 3 aurait pu
devenir la plus meurtrière pour une raison qui n'a rien à voir avec le boss. Un pilier qui
ne fait que pousser reste dangereux, mais **par composition** : près d'une brèche il tue,
au milieu de l'arène il gêne. C'est la même économie de conception que la plaque glissante
du jalon 2.5, « bon pour foncer, mortel près d'une brèche ».

### 4.4 La règle est uniforme

Bots et boss sont soumis aux piliers comme le joueur, au même titre que les brèches dont
« le boss n'est pas exempté » (`docs/game-design.md`). Un pilier peut donc pousser un bot
vers une brèche : c'est un outil offensif, exactement comme la répulsion.

### 4.5 L'ordre dans le tick

L'ordre est une décision de conception, pas un détail d'implémentation — c'est lui qui
décide si un pilier peut éjecter, et à quel tick.

1. `updatePillars` — les piliers avancent ;
2. `applySteering` puis `moveTop` pour chaque toupie — c'est ici, et seulement ici, que
   l'éjection est constatée ;
3. **collisions toupie ↔ pilier** ;
4. collisions toupie ↔ toupie (inchangé) ;
5. `clampToArena` (inchangé).

Conséquence assumée : un pilier qui pousse une toupie dans une brèche ne l'éjecte pas au
tick même, mais au tick suivant, quand `moveAndBounce` verra la vitesse sortante. C'est
cohérent avec la façon dont une toupie poussée par une autre est éjectée aujourd'hui, et
ça évite un second site d'éjection — le projet a déjà payé « deux sites dérivent le boss ».

## 5 · Chapitre 4 — Cratère de Magma, geysers

### 5.1 Une zone qui bat

`ZoneKind` gagne `'geyser'`. Un geyser est une zone au sol comme les autres — même
placement, même composition quand des zones se recouvrent — à une différence près : il
n'agit **que pendant sa fenêtre d'allumage**.

Trois chiffres d'équilibrage : la période (ticks d'un cycle complet), la durée
d'allumage, et le drain de spin appliqué pendant celle-ci. Une **phase** propre à chaque
geyser est tirée au gabarit, pour qu'ils ne crachent pas tous en même temps.

### 5.2 Le cycle est compté, pas tiré

L'allumage se déduit de `run.tick` et de la phase du geyser :

```
allumé  ⟺  (tick + phase) mod période  <  duréeAllumage
```

Aucun tirage par tick, aucun état mutable à sauvegarder, et le déterminisme est acquis
sans qu'on ait à y penser. C'est la même discipline que le compte à rebours de l'éclat,
en plus simple — l'éclat, lui, a besoin du RNG pour choisir *où* il apparaît.

### 5.3 Ce que ça oblige à changer

`zoneModsAt(layout, pos)` doit savoir si un geyser est allumé, donc connaître le tick.
La signature devient `zoneModsAt(layout, pos, tick)`. Deux appelants de production :
`tick()` (deux fois : joueur et bots) et `takeSnapshot` (`src/render/snapshot.ts`), qui
a le `run` sous la main.

Hors chapitre à geysers, aucun geyser n'est placé, donc le paramètre ne change rien au
résultat — la neutralité du chapitre 1 tient.

### 5.4 Le piège de rendu, repéré avant d'écrire une ligne

`src/render/arena.ts` ne reconstruit le calque des zones que si **l'identité du tableau**
`state.arena.zones` change, en s'appuyant explicitement sur « rien ne mute `zones` en
place ensuite » :

```ts
if (state.arena.zones === lastZones) return;
```

Un geyser qui s'allume ne change ni le tableau ni son identité : **il ne produirait aucun
changement à l'écran**, et le joueur subirait un drain invisible. C'est exactement la
famille de défaut « une règle posée à deux endroits mais tenue à un seul » que la
relecture de branche du lot B a attrapée.

Le remède fait partie du lot : le sprite d'un geyser est rafraîchi **à chaque image**,
comme celui de l'éclat, et porte deux états lisibles — la charge (télégraphe, avant
l'allumage) et l'éruption. Un geyser doit s'annoncer : un piège qui ne prévient pas n'est
pas évitable, et le § 8 de la spec de référence dit que le premier objet de terrain
rencontré est toujours un bonus, jamais une punition — l'esprit vaut ici aussi.

## 6 · La mesure — elle fait partie du lot

### 6.1 Le contrôle exact : le chapitre 1

Le chapitre 1 n'a aucun gimmick. Tout ce que `npm run calibrate` en dit doit ressortir
**au chiffre près** de la ligne de base relevée sur `origin/main` à `d6991fa`, ci-dessous,
mesurée à quarante graines avant le premier commit du lot :

| | validé | coût cumulé | coût marginal | descentes | plus meurtrière | par tentative |
|---|---|---|---|---|---|---|
| ch. 1 | 40/40 | 0,37 h | +0,37 h | 17 | salle 10, 229 morts | salle 10, 85 % |
| ch. 2 | 40/40 | 0,49 h | +0,12 h | 3 | salle 10, 93 morts | salle 10, 70 % |
| ch. 3 | 40/40 | 0,64 h | +0,15 h | 3 | salle 10, 90 morts | salle 10, 69 % |
| ch. 4 | 40/40 | 0,85 h | +0,21 h | 5 | salle 10, 141 morts | salle 10, 78 % |

Vecteur de morts par salle du chapitre 1 : `0,0,3,5,47,63,103,111,129,229`. Durées
médianes du chapitre 1 : `4,50 · 4,30 · 5,20 · 9,80 · 10,50 · 11,10 · 12,30 · 13,50 ·
14,60 · 46,40` s. Premier coffre 0,00 h · passivité jamais validée · verrou du châssis
actif · écart entre châssis ×4,88 (39 runs contre 8).

**Un seul de ces chiffres du chapitre 1 qui bouge signifie que la neutralité est cassée**,
et le lot s'arrête pour l'expliquer. Les chapitres 2 à 4, eux, sont *attendus* mobiles.

### 6.2 Les cibles des chapitres 2 à 4

- les quatre chapitres restent validés **40/40** ;
- **« salle 10 la plus meurtrière » tient dans chacun des quatre chapitres** — c'est le
  garde-fou que ce projet a déjà refusé de troquer contre de la vitesse, deux fois ;
- la forme mesurée « ch. 2 ≈ ch. 3 < ch. 4 » survit : l'étendue du chapitre 4 ne recouvre
  celle d'aucun des deux autres, sur trois jeux de graines disjoints. Les chapitres 2 et 3
  se recouvrent et n'ont pas à s'ordonner — c'est le constat de la remesure du 2026-09-02,
  pas un objectif à améliorer ;
- premier coffre, passivité, verrou du châssis : inchangés.

### 6.3 La clause de remesure — comment elle est lue ici, et pourquoi

La clause du lot A se déclenche si « la physique de collision, le contenu de la salle 10,
`arena.breach.ejectSpeed`, `boss.mass` ou le jeu de graines » changent. Ce lot change le
contenu de la salle 10 **des chapitres 2, 3 et 4**, et la restitution du mur du chapitre 2.

Les cinq constantes ne sont pas rouvertes, pour une raison qui se vérifie plutôt qu'elle
ne se plaide : **elles ont toutes été calibrées contre le chapitre 1**, que ce lot laisse
bit à bit intact. `combat.damageK` a été retenue sur la durée de la salle 10 du chapitre 1
et l'écart entre châssis au chapitre 1 ; `econ.rewardBase` sur le coût du chapitre 1 et le
garde-fou de passivité ; les trois facteurs par chapitre sur la forme des coûts marginaux,
que le § 6.2 vérifie explicitement. Si le § 6.1 sort au chiffre près et le § 6.2 tient, il
n'existe aucune mesure qui aurait bougé et qu'on n'aurait pas regardée.

Le jeu de graines ne change pas non plus : quarante graines, les mêmes.

**Ce que cette lecture ne couvre pas**, et qui est consigné en dette plutôt que masqué :
si les gimmicks devaient être poussés assez fort pour que les chapitres 2-4 cessent de
tenir le § 6.2 à toute intensité raisonnable, alors le bouton « gimmick » serait épuisé et
la question passerait aux cinq constantes — c'est-à-dire à une autre passe, avec son
propre mandat.

### 6.4 Le protocole

Balayage des constantes de gimmick sur **bancs parallèles hors du dépôt** — copies de
l'arbre, `node_modules` en lien symbolique, un `balance.json` par banc. **Porte de
fidélité obligatoire** : un banc doit reproduire la ligne de base du § 6.1 au chiffre près
avant qu'on lui fasse confiance. Le contrôleur lance les balayages ; les sous-agents
jugent les relevés.

Aucun chiffre de deux jeux de graines différents n'est comparé — la passe précédente a
publié une affirmation fausse pour cette raison exacte.

## 7 · Tests

Colocalisés, Vitest, imports explicites. Ce qui doit être couvert :

- **la neutralité du chapitre 1** : à chapitre 1, `buildLayout` rend un gabarit dont les
  zones, les brèches et l'état de RNG sortant sont identiques à ceux d'avant le lot — le
  test le plus important du lot, et celui qui se vérifie par mutation le plus franchement
  (poser un pilier au chapitre 1 doit le faire rougir) ;
- **l'éjection est indépendante de la restitution du mur** (§ 3.3) ;
- **un pilier ne retire jamais de spin** — mutation : lui faire retirer 1 point ;
- **un pilier repousse un bot comme le joueur** (règle uniforme) ;
- **un geyser éteint est exactement neutre**, un geyser allumé draine ;
- **le cycle d'un geyser ne consomme aucun tirage** : deux runs de même graine restent
  identiques quel que soit le nombre de geysers ;
- le test de déterminisme existant, étendu aux chapitres 2 à 4.

Sur tout test qui prouve un mécanisme : vérification par mutation.

## 8 · Vérification en navigateur

Par le contrôleur lui-même, jamais par sous-agent : `npm run dev` sur un port inhabituel,
contenu servi vérifié par empreinte avant toute conclusion, puis
`http://localhost:<port>/spinforge/`. À voir de ses yeux, chapitre par chapitre :

- chapitre 1 — rien de neuf, l'arène est celle qu'on connaît ;
- chapitre 2 — le rebond sur le bord renvoie visiblement plus fort ;
- chapitre 3 — les piliers dérivent, rebondissent sur le bord, et repoussent sans faire
  clignoter la barre de spin ;
- chapitre 4 — les geysers s'annoncent puis crachent, et **le sprite change à l'écran**
  (§ 5.4).

`npm run verrou` doit rester vert : il joue le chapitre 1, il ne devrait rien voir.

## 9 · Hors périmètre

- **Les profils de châssis** (`chassis` dans `balance.json`). L'écart entre châssis est à
  ×4,88 pour une cible < ×2 ; le mandat n'est pas donné, ce lot ne le prend pas.
- **Le modèle du harnais de calibration**, qui n'équipe jamais une pièce tirée et n'appelle
  jamais la fusion. Dette ouverte depuis le lot A, promise deux fois : son propre lot.
- **L'atout temporaire par salle** et **le verrouillage des achats en descente** : lot C2.
- **Les quêtes quotidiennes** et **les récompenses de progression par niveau** : lot C3.
- **Les chapitres 5 à 8** et leurs identités : jalon 4.
- **L'autopilote**, décision 5.

## 10 · Ce que ce lot laissera ouvert

- La difficulté mesurée des chapitres 3 et 4 est **majorée** par la décision 5 : le pilote
  du harnais ne contourne ni les piliers ni les geysers. Un vrai joueur les évite ; l'écart
  entre les deux n'est pas mesuré et ne le sera pas par ce lot.
- Le balayage des constantes de gimmick sera fait **une constante à la fois**, à l'autre
  figée. Comme pour `spinPerChapter × rewardPerChapter`, ce ne sera pas une carte du
  domaine.
