# SpinForge — Liste d'améliorations

Retours de test et suites données. Cette liste vit au fil des sessions de jeu : on
y **ajoute les remarques** telles qu'elles viennent, et on coche au fur et à mesure.
Ce n'est pas la roadmap (`docs/roadmap.md`, qui découpe les jalons) ni la dette
technique (même fichier, sections « Dette connue ») — ici on parle de ce que le
joueur ressent.

Statuts : ✅ corrigé · 🔧 en cours · 📋 à faire · 💭 à arbitrer

---

## Session du 2026-09-01 — l'ouverture des coffres

### ✅ 1. Vider son butin coffre par coffre est fastidieux

> « Quand il y a plusieurs coffres à ouvrir, je veux qu'un clic ouvre tous les
> coffres d'un coup. »

Un clic sur un coffre du butin n'en ouvrait qu'un. Avec une douzaine de Bronzes en
attente, il fallait douze allers-retours par l'écran de révélation.

**Fait.** Le bouton vide toute la file de **son type** — les autres types gardent
le leur, chacun son compte. `grantChest` est devenu `grantChests` : le lot consomme
exactement le même flux de RNG que N ouvertures unitaires, pity compris, donc le
raccourci ne change pas ce qu'on obtient (`src/sim/chest.test.ts`). Une seule
animation de couvercle pour tout le lot, puis les pièces une à une.

### ✅ 2. L'ouverture ne se sentait pas

> « Il faut que tout l'écran vibre pour montrer la puissance de l'ouverture, et que
> chaque objet apparaisse avec des effets proportionnels à la rareté. »

**Fait.** Deux choses distinctes :

- **La secousse est passée à l'écran entier** (`#root`, donc HUD et barre d'onglets
  compris). Elle était jusque-là confinée à la vignette du coffre, où elle ne se
  voyait pas. Amplitude par type : Bronze 7 px, Arène 11 px, Mythique 17 px.
- **La révélation est devenue un crescendo.** Les tirages étant déjà triés du moins
  bon au meilleur, chaque palier de rareté a son propre barème
  (`REVEAL` dans `src/render/feel.ts`) : un Commun défile en 0,09 s sans rien
  projeter, une Légende arrête la séquence 0,95 s, projette 28 étincelles épaisses
  sur plus de deux fois sa taille, une onde de choc, un flash plein écran et une
  secousse de 14 px. C'est le **contraste** qui dit la rareté, pas la couleur seule.

Mesuré au navigateur (Playwright) : 12 Bronzes ouverts en un clic, secousse relevée
à 7,2 px ; 8 Mythiques dont une Légende forcée par le pity, secousse à 14,2 px, et
la file d'Arène laissée intacte.

📋 **Reste à faire : le son.** L'ouverture est muette. Un choc de couvercle et un
timbre par palier de rareté doubleraient l'effet à peu de frais.

---

## Session du 2026-08-31 — refonte graphique

> « Il faut que chaque toupie et chaque pièce de toupie soit représentée visuellement
> et jolie. Repense complètement les graphismes, il faut que ce soit un jeu vidéo pas
> un formulaire web. Tente de représenter visuellement les choses plus que de les
> expliquer en texte. »

**Diagnostic, capture en main.** Les quatre écrans photographiés avant d'écrire une
ligne. Le catalogue était riche — 20 pièces, 4 châssis, 11 rangs, 4 types — et
**intégralement muet** :

| Objet du jeu | Avant | Après |
|---|---|---|
| 20 modèles de pièces | une chaîne (« Couronne Solaire ») | une silhouette par emplacement, un motif par modèle |
| 4 toupies | quatre cartes de texte identiques | un portrait trois quarts, châssis + 4 pièces |
| 11 rangs | un mot et une couleur de texte | cadre, matière, 0 à 3 gemmes, ergots, balayage |
| toupie en arène | 2 disques génériques (`Shape = 'player' \| 'bot'`) | la toupie réellement montée, adversaires compris |
| 7 axes de profil | 7 lignes « Vitesse max +10 % » sur 3 écrans | un radar à 7 branches |
| triangle des types | un paragraphe de 4 lignes | un triangle dessiné |
| composition du chapitre | 3 lignes « Salles 1-3 — Endurance » | 10 pastilles teintées par type |
| tirage ×10 | 10 lignes de tableau | le coffre s'ouvre, les pièces sortent une à une |
| recette de fusion | « 2 identiques + 1 sacrifice » | des pastilles remplies / vides |
| pitié de coffre | « Excellent garanti dans 7 tirages » | un anneau qui se remplit autour du coffre |
| progression de salle | « SALLE 4 / 10 » + barre + « Boss : salle 10 » | 10 pastilles, la dixième en losange |
| type de l'adversaire | bandeau « Salle 4 · Défense » | badge ▲/▼ porté par le bot |
| écran de combat | l'arène occupait ~40 % de la hauteur | plein écran, HUD en surimpression, décor par chapitre |

**La cause unique.** Rien n'était dessiné à partir de ses données. `src/art/` est né
de là : des recettes (données pures), des primitives canvas, et **un seul code de
dessin pour PixiJS et pour React**. La Lame vue en inventaire est désormais celle qui
tourne dans l'arène — c'est structurellement impossible autrement.

**Ce qui verrouille l'acquis.** `src/art/recipes.test.ts` fait échouer la suite si un
modèle du catalogue n'a pas de recette, si une recette décrit la mauvaise silhouette,
ou si `ui/rank.ts` réintroduit des seuils de rareté qui dérivent des siens. Vérifié
par mutation : quatre mutations sur cinq sont tuées ; la cinquième — une table de
seuils dupliquée **à valeurs rigoureusement identiques** — survit, et seule la
relecture du code la distingue. C'est écrit tel quel dans le test.

**Un doublon supprimé au passage.** `ui/rank.ts` portait ses propres seuils *et* une
échelle inversée (Légende violet, Épique doré) ; l'échelle unique vit maintenant dans
`theme.ts` (`rankTier`, `RANK_TIERS`), acier → bleui → violet → or.

**Méthode.** Quatre vagues, chacune vérifiée en navigateur par capture Playwright
relue — pas seulement par les tests. Sept défauts ont été trouvés et corrigés ainsi,
qu'aucun test n'aurait vus : objets qui se dissolvaient dans leur plaque de rang,
portrait en vue éclatée, couvercle de coffre décroché de sa charnière, bande de
composition effondrée à zéro pixel, couronne de Lame recouvrant les quatre châssis au
point de les rendre identiques, décor de chapitre invisible, couvercle rogné à pleine
ouverture. La planche de style (`/spinforge/styleboard.html`, `npm run dev`) est
conservée : c'est la seule surface qui montre à quoi ressemble une recette.

**Hors périmètre, intact :** `src/sim/` n'a reçu qu'un ajout (`fusionProgress`,
exporté pour que l'UI ne recompte pas les doublons de son côté) ; aucun chiffre
d'équilibrage n'a bougé, `npm run calibrate` n'avait donc pas à être rejoué. 338 tests
au vert, `npm run build` propre.

**📋 À tester en jeu.** Ce lot n'a pas encore eu de retour joueur. Les points les plus
incertains : la jauge de spin en anneau remplace la barre du HUD (est-ce qu'on la lit
en plein combat ?), le badge ▲/▼ remplace l'annonce du type (est-ce qu'on comprend ce
qu'il dit sans explication ?), et le radar à 7 axes (dense sur 390 px — le repli en
quatre barres reste possible).

---

## Session du 2026-08-30 — intégration du jalon 2.5 dans le jalon 2b

Pas un test joueur : le jalon 2b (toupies, triangle des forces) et le jalon 2.5 (terrain,
butin de salle) ont été développés en parallèle sur le même cœur de simulation, puis
fusionnés (`0d28725`) et recalibrés en une passe commune, économie (`5e40a89`) puis combat
(`f4af698`) — jamais les deux dans le même commit.

**Pourquoi une recalibration était nécessaire.** La masse résolue d'une toupie vient
désormais de quatre facteurs (châssis × modèle de Disque × talent Masse × masse propre) et
le triangle des forces multiplie aussi les dégâts — deux systèmes du jalon 2b que le jalon
2.5 n'avait jamais mesurés ensemble avec le sien. `combat.damageK` et `econ.rewardBase`, réglés
une première fois isolément, ont donc été entièrement remesurés à dix graines plutôt
qu'ajustés à l'estime.

| | Jalon 2.5 seul | Build intégré et recalibré |
|---|---|---|
| Chapitre 1 validé | 0,35 h / 10 runs | **0,32 h (19,2 min) / 9 runs** |
| Premier coffre ouvert | 0,00 h | **0,00 h** |
| Salle la plus meurtrière | salle 10, 20 morts contre 9 | **salle 10, 23 morts**, devant la salle 7 à 21 |
| Combat de boss | 87 s | **64,8 s** |
| Politique passive | jamais validée en 20 h | **jamais validée en 20 h** |

`econ.rewardBase` s'est révélé chaotique sur toute sa plage balayée : la valeur héritée du
jalon 2.5 (86) n'était qu'un pic isolé — ses deux voisines immédiates (84 et 88) cassaient le
pilier « la salle 10 reste la salle la plus meurtrière ». La valeur retenue, **104**, est la
première de ce projet choisie depuis un palier démontré (102–110, sept valeurs consécutives
qui tiennent le garde-fou) plutôt que depuis un point isolé. `combat.damageK` (1,3) et
`arena.restitution` (1,6), hérités tels quels du jalon 2.5, ont été confirmés par le même
balayage plutôt que reconduits par défaut : baisser `damageK` fait exploser le combat de
boss (370 s à 0,5), et `restitution` à 1,6 s'est révélée être une règle de design du jalon
2.5 (la répulsion), pas un bouton d'équilibrage — aucune mesure n'imposait de la redescendre.

Le boss reste au-dessus de sa cible de ~45 s malgré la baisse ; sa descente de 87 s à 64,8 s
est un effet de bord de l'économie recalibrée (un joueur mieux équipé plus tôt), pas d'un
réglage de combat. Détail complet du balayage : `docs/superpowers/plans/2026-08-28-calibration-integration.md`.
Dette actualisée : « Dette connue (jalon 2.5) » dans `docs/roadmap.md`.

---

## Session du 2026-08-26 — deuxième test joueur

Trois remarques, sur trois sujets différents cette fois — le pilotage, le rythme des
combats, la progression. Origine du jalon 2.5 (`docs/roadmap.md`), spec :
`docs/superpowers/specs/2026-08-26-jalon-2-5-terrain-et-butin-design.md`.

### ✅ 1. Piloter ne sert à rien

> « Piloter ne sert à rien, on dirait. »

**Ce n'était pas une impression : la répulsion existait dans le calcul, mais n'était jamais
parcourue.** L'ordre d'un tick (`src/sim/sim.ts`) est `applySteering → moveAndBounce →
resolveCollision`. Une collision au tick N fixe une vitesse de recul ; au tick N+1,
`applySteering` (`src/sim/physics.ts`) la tronquait à `maxSpeed` **avant** que
`moveAndBounce` ne s'en serve pour déplacer la toupie :

```ts
// physics.ts, avant correctif
const max = effectiveMaxSpeed(top);
const speed = Math.hypot(top.vel.x, top.vel.y);
if (speed > max) {
  const k = max / speed;
  top.vel.x *= k;
  top.vel.y *= k;
}
```

**Le recul n'était jamais parcouru : il était annulé avant le premier pixel.**

Chiffré sur un choc frontal joueur/bot, aux valeurs d'alors (`maxSpeed` 240 côté joueur et
140 côté bot, `restitution` 0,8) : la vitesse de fermeture vaut 380, l'impulsion `j` vaut 342
à masses égales. Le bot **repart à 202 px/s — tronqué à 140** au tick suivant, soit près d'un
tiers du recul jeté. Le joueur, lui, repart à 102 px/s, sous son propre plafond de 240 : il
garde le sien en entier. D'où la sensation exacte rapportée en test : on pousse l'adversaire,
il ne bouge pas — le pilotage ne se voit pas.

**Correctif.** Au-dessus du plafond, on n'est plus piloté, on est projeté : on amortit au
lieu de tronquer, et le plafond du tick se lit **avant** que le pilotage n'ait rien ajouté :

```ts
// physics.ts, après correctif — extrait verbatim (commentaires abrégés, élision marquée)
const max = effectiveMaxSpeed(top) * zone.speedMult;
// Plafond de CE tick, lu AVANT que le pilotage n'ait rien ajouté : l'ordinaire,
// ou la surcharge déjà présente — donc héritée d'un choc — amortie. Seul un choc
// peut lever le plafond ; le doigt du joueur, jamais.
const ceiling = Math.max(max, Math.hypot(top.vel.x, top.vel.y) * ARENA.overspeedDamping);

// … pilotage ou friction, inchangés par ce correctif …

const speed = Math.hypot(top.vel.x, top.vel.y);
if (speed > ceiling) {
  const k = ceiling / speed;
  top.vel.x *= k;
  top.vel.y *= k;
}
```

Seule la vitesse déjà présente en **début** de tick — donc issue d'un choc — peut lever le
plafond ; le doigt du joueur ne le lève jamais.

**Piège rencontré — la réparation naïve aurait été pire.** Une première idée, amortir après
coup toute vitesse au-dessus du plafond (`if (speed > max) speed × 0,9`, calculée **après**
le pilotage comme avant), laisse le pilotage lui-même dépasser le plafond : chaque tick
ajoute `accel × TICK_S = 90` et n'en retire que 10 %. Le point fixe est
`v = 0,9 × (v + 90) = 810` px/s — le joueur roulerait à **trois fois et demie** sa vitesse de
Pointe rien qu'en tenant son doigt, et la Pointe cesserait d'être une stat. Lire le plafond
avant le pilotage évite ce défaut : le pilotage ne peut jamais que remplir un plafond qu'il
n'a pas fixé lui-même.

Au passage, `restitution` est montée de 0,8 à **1,6** : un choc rend désormais plus d'énergie
qu'il n'en absorbe (voir `docs/game-design.md` § Combat & pilotage). Deux garde-fous bornent
cette injection d'énergie : l'amortissement de surcharge ci-dessus, et la friction ordinaire
une fois la surcharge résorbée.

### ✅ 2. Les combats sont longs et fastidieux

> « Les combats sont longs, c'est fastidieux. »

**Diagnostic.** Mesuré au harnais (`npm run calibrate`, 5 graines) avant le jalon :

| Salles | Durée |
|---|---|
| 1-3 | 20 à 24 s |
| 4-9 | 41 à 67 s |
| 10 (boss) | **183 s**, 8 morts |

Le boss à lui seul prenait plus de temps que les neuf salles précédentes réunies.

**Correctif.** Trois leviers combinés : la répulsion réparée ci-dessus rend chaque choc plus
décisif (recul réellement subi, brèches au bord à partir de la salle 3 — être poussé dedans
élimine la toupie ; la règle est uniforme et n'exempte pas le boss, mais à masse ×3 il est en
pratique **hors de portée d'une charge normalement pilotée** aux valeurs retenues — voir
« Constat honnête sur la cible » ci-dessous et la dette du jalon 2.5 dans `docs/roadmap.md`) ;
les zones au sol (accélérateur, pointes, plaque glissante) et l'éclat de Gyre donnent des
raisons de bouger ; `combat.damageK` est monté de 0,35 à 1,3, réglé au harnais pour que la
salle 10 reste sous 60 s sans cesser d'être la plus meurtrière — **au moment de ce réglage
isolé** (58,6 s, passe combat seule, Task 8b). Le tableau ci-dessous mesure après la passe
économie qui a suivi (`econ.rewardBase`, Task 14) : elle a rephasé les tirages RNG en aval
(la durée d'un combat en consomme un nombre variable) et fait remonter le combat de boss à
87,10 s sans qu'aucun bouton de combat n'ait bougé — l'intention « sous 60 s » tenait au
moment où elle a été prise, la passe économie l'a ensuite défaite. Détail des trois types de
zone et de la règle d'éjection : `docs/game-design.md` § Combat & pilotage.

Mesure finale (`npm run calibrate`, verbatim, après la calibration complète — Task 14) :

| Salle | Avant | Après (durée médiane) | Après (morts) |
|---|---|---|---|
| 1 | 20-24 s | 6,70 s | 0 |
| 2 | 20-24 s | 6,30 s | 0 |
| 3 | 20-24 s | 10,20 s | 0 |
| 4 | 41-67 s | 15,70 s | 1 |
| 5 | 41-67 s | 19,50 s | 4 |
| 6 | 41-67 s | 18,60 s | 8 |
| 7 | 41-67 s | 22,60 s | 9 |
| 8 | 41-67 s | 24,60 s | 6 |
| 9 | 41-67 s | 26,40 s | 3 |
| 10 (boss) | 183 s | **87,10 s** | 20 |

Le boss reste au-dessus de sa cible de combat (60 s) mais chute de plus de moitié, et demeure
de très loin la salle la plus meurtrière (20 morts contre 9 à la salle 7) — le pilier « le
boss est le mur » tient. Voir « Constat honnête sur la cible » ci-dessous : c'est un choix
délibéré, pas un manque de réglage.

### ✅ 3. On est bloqué depuis le début, ça n'avance pas

> « On est vraiment bloqué depuis le début, ça n'avance pas. »

**Diagnostic.** Mesuré au même harnais :

| | Mesure |
|---|---|
| Chapitre 1 validé | 23 runs, **2,08 h** |
| Premier coffre Arène ouvert | **2,92 h** |

Trois heures avant d'ouvrir quoi que ce soit, dans un jeu dont le design annonce que
l'essentiel de l'intérêt est dans les coffres et la fusion. La cause : une seule voie
d'ouverture, l'achat, et elle était fermée en pratique — Bronze à 2 000 crédits quand une
salle en rapportait ~70, et ce sont les mêmes crédits que les améliorations, toujours plus
urgentes. Le joueur n'ouvrait donc rien.

**Correctif — deux robinets, pas un.** Chaque salle vidée lâche désormais un coffre, sans
rien acheter :

| Salle | Coffre lâché |
|---|---|
| 1 à 3 | Bronze |
| 4 à 9 | Bronze, + 20 % de chance d'un Arène |
| 10 (boss) | Arène garanti, + 15 % de chance d'un Mythique |

Et le prix du Bronze — seul coffre acheté en crédits, donc seul en concurrence directe avec
les améliorations — s'effondre de 2 000 à **250** crédits. L'achat reste la deuxième voie :
c'est elle qui pose un vrai arbitrage (« ce coffre ou ce niveau de Lame ? »).

| | Avant | Après |
|---|---|---|
| Chapitre 1 validé | 2,08 h, 23 runs | **0,35 h, 10 runs** |
| Premier coffre ouvert | 2,92 h | **0,00 h** |

Un coffre s'ouvre désormais dans les toutes premières secondes du premier run — la promesse
« un coffre ouvert dans les deux premières minutes » est largement tenue. Un run complet
rapporte 10 coffres au minimum, 17 au maximum, ~11 en moyenne (table ci-dessus) : les
doublons arrivent en quelques minutes, la fusion devient jouable dans la première session,
donc les rangs, donc les talents — les trois axes d'optimisation du jalon 2a deviennent
visibles d'un coup, sans une ligne de contenu supplémentaire.

### Constat honnête sur la cible

La cible du cahier des charges pour le chapitre 1 était **~15 min (0,25 h), ~4 runs** ; le
résultat retenu est **0,35 h (~21 min), 10 runs**. Ce n'est pas un choix de prudence par
défaut : plus de 150 combinaisons ont été mesurées au harnais (`econ.rewardBase`,
`rewardGrowth`, `upgradeGrowth`, et `upgradeBase` en bouton secondaire), et **chaque** point
qui s'approche de 15 min déplace la concentration des morts de la salle 10 vers la salle 6 ou
7 — le pilier « le boss est le mur » cède avant que la cible de vitesse ne soit atteinte.
Une revue indépendante a reproduit cette tension (`econ.rewardBase = 93` fait passer la
salle 7 devant la salle 10 en nombre de morts) : ce n'est pas une affirmation non vérifiée.

Tranché en faveur du pilier : dix runs de ~2 min avec un coffre à chaque salle servent un idle
mobile au moins aussi bien que quatre runs de 5 minutes. Le boss reste lui aussi au-dessus de
sa cible (87,1 s contre 60 s visés), pour la même raison — voir « Dette connue (jalon 2.5) »
dans `docs/roadmap.md`. Y sont aussi consignées les deux valeurs les plus sensibles issues de
ce réglage (`combat.damageK`, `econ.rewardBase`) : toutes deux vivent dans une zone chaotique
du harnais et devront être remesurées si la physique de collision, le contenu de la salle 10
ou le jeu de graines changent.

**Politique passive — le garde-fou définitif.** Le harnais compare toujours la politique
« terrain » (celle des tableaux ci-dessus) à une politique qui ne touche jamais l'écran :

```
Garde-fou passivité : jamais
```

Un joueur qui ne pilote jamais **ne valide pas le chapitre 1** dans le plafond de 20 h du
harnais — contre 0,35 h en jouant. C'est la forme la plus forte de la réponse à la remarque
n° 1 : le pilotage ne se contente plus de « se voir », il **décide** désormais du jeu.

---

## Session du 2026-08-25 — premier test joueur

Trois remarques, toutes sur l'arène.

### ✅ 1. On ne comprend pas laquelle est sa toupie

> « Les débutants ont des difficultés à comprendre que la toupie bleue est la leur. »

**Diagnostic.** Rien à l'écran ne désignait le joueur. Les deux camps avaient le
même rayon (`radius: 12` des deux côtés), des disques encochés très proches (6 vs
5 encoches) et un halo de même facture ; seule la teinte séparait le cyan de
l'orange — et `spinTint()` l'éteint justement à mesure que le spin baisse, donc le
repère s'effaçait exactement au moment où on le cherchait. Le HUD disait « SPIN »,
un mot qui ne rattache la barre à aucune toupie.

**Correctifs.**
- Chevron permanent au-dessus de la toupie du joueur, et anneau au sol sous elle
  (`src/render/topView.ts`). Leur teinte est `PALETTE.player` **en dur, jamais
  atténuée par le spin** — c'est la règle : un repère d'identité ne suit pas l'état
  de santé. Ils respirent légèrement (1,15 Hz) pour se lire comme de l'interface et
  non comme du décor, et s'effacent en début d'agonie.
- La barre du HUD devient « ▾ TON SPIN », dans la teinte du joueur, avec le même
  chevron que celui porté par la toupie : la barre nomme la toupie autant qu'elle
  la mesure.
- Bandeau d'accueil au premier lancement (une seule fois, `localStorage`
  `spinforge.onboarded`), refermé par le premier vrai glissement — pas par un
  minuteur. Placé **sous** l'arène : en surimpression il masquait les deux toupies
  qu'il désigne.

### ✅ 2. Piloter ne semblait rien changer

> « Il est difficile de comprendre ce que piloter la toupie change, plus que de
> juste attendre que l'adversaire attaque. »

**Ce n'était pas une impression : c'était mesurable.** Autopilote, 5 seeds,
chapitre 1 joué jusqu'à validation avec achats gloutons — le protocole exact qui
avait servi à calibrer le « MUR ~2 h » du jalon 1.5 :

| Pilotage | Runs | Durée |
|---|---|---|
| **ne jamais toucher l'écran** | 18 | 2,00 h |
| foncer sur le bot le plus proche | 23 | 2,39 h |
| interception (vise où le bot sera) | 22 | 1,85 h |

Ne rien faire **valait mieux** que charger. La cause était dans `resolveCollision`
(`src/sim/combat.ts`) : les dégâts étaient proportionnels à la vitesse **relative**
d'impact, la même valeur pour les deux toupies. Foncer et encaisser produisaient
rigoureusement le même `impact`, et comme le joueur gagne l'échange sur ses stats
(30/(30+6) contre 18/(18+10)), il lui suffisait d'exister. Le pilotage ne servait
qu'à provoquer les contacts — jamais à les gagner.

À noter : la spec (`docs/game-design.md` § Combat) décrivait déjà ce
comportement (« proportionnels à la vitesse relative d'impact »). Le défaut était
donc dans la règle elle-même, pas dans son implémentation.

**Correctif — partage de charge.** `impact` est exactement la somme des deux
vitesses de fermeture ; on répartit désormais les dégâts selon la part que chacun a
lui-même provoquée (`CHARGE_BONUS = 0,3` dans `src/sim/config.ts`) :

- assaut pur (l'un fonce, l'autre subit) → l'assaillant inflige ×1,3 et encaisse ×0,7 ;
- **choc frontal (les deux avancent autant) → rigoureusement inchangé.** Les deux
  poids somment toujours à 2, donc le total infligé n'a pas bougé : seule la
  répartition change.

Piège rencontré : la part doit se lire **avant** l'impulsion de rebond, qui échange
précisément les vitesses des deux toupies — la lire après inverse la réponse et
récompense la passivité. Deux tests le verrouillent (`src/sim/combat.test.ts`).

**Contre-calibrage.** Le pilotage devenu payant raccourcissait le chapitre 1 à
1,43 h. La roadmap identifie l'économie comme le levier de durée, indépendant de la
forme de la difficulté : `ECON.rewardBase` passe de 120 à **70**. Résultat mesuré,
même protocole :

| Pilotage | Runs | Durée | Écart |
|---|---|---|---|
| foncer sur le bot le plus proche | **21** | 1,76 h | référence |
| interception | 21 | 1,47 h | — |
| **ne jamais toucher l'écran** | **78** | **8,33 h** | **3,7× plus de runs** |
| tourner au bord sans jamais frapper | 75 | 16,04 h | 3,6× |

Le jalon 1.5 documentait « 21 runs, ~2 h 08 » : le nombre de runs est retrouvé à
l'identique, la durée est plus courte parce qu'un run se joue désormais plus vite.
Le pilier « le boss est le mur » tient : salle 10 = 36 morts, la suivante 14.

**Effet de bord gratuit** : le retour visuel suit tout seul. `observer.ts` déduit la
puissance d'un choc du spin réellement perdu, donc une charge produit maintenant
des étincelles et une secousse visiblement plus fortes qu'un choc subi. Le joueur
voit la différence sans qu'on ait ajouté un seul effet.

### ✅ 3. Le son

> « Le son est VRAIMENT mauvais et insupportable. »

Quatre causes distinctes, toutes traitées dans `src/audio/audio.ts` :

1. **Le bourdon.** Une dent de scie tenue à 60–250 Hz dans un passe-bas résonant
   (`Q = 3`) : le timbre d'une scie sauteuse, pas d'une toupie. Remplacé par du
   **bruit filtré en passe-bande** (380 → 2 200 Hz selon le spin) — un vrai souffle
   de rotor — doublé d'un sinus grave très discret pour le corps.
2. **La mitraille d'impacts.** Un contact prolongé émet un choc **par tick**, et
   plusieurs toupies peuvent se toucher dans le même tick. Mesuré sur 60 s de
   combat : **jusqu'à 20 sons par seconde**, 5,6/s en moyenne. Garde de 140 ms entre
   deux sons → pic 5/s, moyenne 2,2/s. La valeur doit rester **supérieure au tick de
   100 ms**, sinon elle ne filtre rien du tout (à 75 ms : pic encore à 10/s).
3. **Les clics.** Chaque son démarrait à pleine amplitude — une discontinuité, donc
   un clic à chaque impact. Toutes les enveloppes ont maintenant 4 à 8 ms d'attaque.
4. **La saturation.** Aucun limiteur, et des gains d'impact jusqu'à 0,62. Gains
   divisés par 4 à 5, `DynamicsCompressor` en sortie, master à 0,5.

Au passage : la porte de salle jouait `door()` **et** `reforge()` en même temps,
deux longs sinus de 0,5 s par-dessus le reste. Fondu en une seule signature brève de
deux notes ; `reforge()` supprimé.

Deux dettes son du jalon 1.5 tombent avec ce lot : le rotor se **tait** maintenant à
la mort et à la bascule vers l'onglet Forge, au lieu de tenir sa dernière fréquence
indéfiniment.

**À valider à l'oreille** — la mesure prouve que la mitraille, les clics et la
saturation sont partis ; elle ne dit rien du goût. Si le rotor reste pénible sur la
durée, les trois boutons sont `MIX.whirrGain`, `MIX.whirrFreqHigh` et `MIX.subGain`.

---

## Session du 2026-08-28 — le verrou du châssis

### ✅ 4. Changer de toupie à chaque salle valait mieux que bien choisir

> « Changer de toupie est gratuit et immédiat, et la table des types est affichée :
> on peut donc changer de châssis à chaque salle pour être toujours du bon côté du
> triangle. »

**Mesuré à l'autopilote, 5 graines, chapitre 1 joué jusqu'à validation.** Toutes
ces séries possèdent les quatre toupies ; le nombre de toupies débloquées ne change
aucun résultat, vérifié séparément sur les quatre châssis.

| Politique de châssis | Runs | Durée |
|---|---|---|
| **contre-pioche à chaque salle** (le contournement) | 17 | **1,42 h** |
| **Carapace Abyssale, tenue du début à la fin** (le témoin) | 17 | **1,66 h** |
| Typhon Primal, tenue du début à la fin | 30 | 2,11 h |
| Brasier Solaire, la toupie de départ | 23 | 1,91 h |

**Le bon témoin est Carapace Abyssale, pas Brasier Solaire.** Un joueur qui possède
quatre toupies et ne triche pas ne reste pas sur celle de départ : il prend la
meilleure et la garde. Le contournement lui fait donc gagner **0,24 h, soit ~14 %
de temps à nombre de runs égal** — et non les 23 → 17 qu'une comparaison à la toupie
de départ laisserait croire. Cette comparaison-là confondrait deux effets : posséder
un meilleur châssis, et tricher avec.

**Ce n'est pas la taille du gain qui a tranché, c'est ce qu'il détruit.** Le triangle
des forces a été ajouté au jalon 2b pour qu'on parie sur la composition d'un chapitre
avant d'y descendre. Une contre-pioche gratuite et instantanée supprime le pari :
il n'y a plus de mauvais choix, seulement un geste à répéter à chaque salle.

**Fenêtre où le problème existe.** Il faut au moins deux toupies pour contre-piocher,
et avant la validation du chapitre 1 on n'en a qu'une : les gemmes ne tombent que du
boss (`econ.bossGems` = 60), une toupie en coûte 900, et le cadeau du Fondateur exige
`chapterValidated`. Le contournement est donc un problème d'**après** le premier mur —
c'est-à-dire du jalon 3, quand le farm tournera en continu. Les mesures ci-dessus se
lisent comme un baromètre d'efficacité de combat, pas comme un parcours jouable.

**Correctif — le châssis est figé pour la descente.** `RunState` porte désormais
`toupie`, posé au départ du run et relu par `syncRunStats` à la place de
`meta.toupies.active`. Les pièces continuent de prendre effet dans la seconde —
acquis du jalon 1, intact ; seul le châssis attend. Le choix en attente monte sur la
toupie à deux frontières, et deux seulement : la mort (`resetRun`) et le tour de
chapitre bouclé (`equipPendingToupie`, appelé quand le boss est vidé). Un joueur qui
enchaîne les descentes sans mourir peut donc toujours re-choisir — sans quoi le farm
continu du jalon 3 l'aurait enfermé sur un châssis indéfiniment.

L'écran Toupies distingue maintenant **« Pilotée »** (le run en cours) de
**« Au prochain run »** (le choix en attente), et dit en une ligne pourquoi appuyer
sur « Équiper » ne change rien à l'arène — sans ce texte, le verrou se lit comme un
bug. Sur la carte pilotée, le bouton devient « Annuler le changement » : c'est ce
qu'il fait réellement.

**Garde-fou.** `npm run calibrate` joue désormais deux séries côte à côte, identiques
en tout sauf le moment du choix : rebasculer à chaque salle, ou tenir le même châssis
jusqu'au boss. Le verrou en place, elles doivent donner le même résultat au centième
près. Vérifié par mutation dans les deux directions : `syncRunStats` relisant
`meta.toupies.active` d'une part, `equipPendingToupie` appelée à chaque salle au lieu
du seul boss d'autre part — les deux ramènent la première série à 17 runs / 1,42 h et
font afficher « VERROU ROMPU ». La seconde mutation compte autant que la première :
appeler l'adoption *trop souvent* rouvre exactement le même trou que ne pas la
verrouiller.

Aucun chiffre de la mesure principale ne bouge : 23 runs / 1,91 h, premier coffre
d'Arène 0,78 h après validation, salle 10 la plus meurtrière.

### Remesure après l'intégration du jalon 2.5 — le contournement a grossi

Les chiffres ci-dessus datent d'**avant** l'intégration du terrain et du butin. Le
verrou a été refusionné dans le build intégré et remesuré au même harnais, désormais
à dix graines et sous la politique `steerWithTerrain` :

| | Runs | Durée |
|---|---|---|
| **contre-pioche à chaque salle** (verrou retiré) | 6 | **0,19 h** |
| **Carapace Abyssale, tenue du début à la fin** (le témoin) | 5 | **0,29 h** |
| même choix, tenu jusqu'au boss (témoin apparié) | 19 | 0,46 h |

Le contournement fait donc gagner **~34 % de temps** là où il en faisait gagner 14 %
avant l'intégration. La raison est mécanique : le terrain a raccourci les combats, si
bien que la part du triangle dans l'issue d'une salle a monté d'autant. **Le verrou
vaut plus cher après l'intégration qu'avant.**

Le verrou reste neutre en équilibrage : les quatre garde-fous du build fusionné sont
identiques avec et sans lui (chapitre 1 à 0,32 h / 9 runs, salle 10 la plus meurtrière
avec 23 morts, premier coffre immédiat, passivité jamais validée).

---

## En attente d'arbitrage

- 💭 **Un simple mute suffit-il ?** Le bouton actuel est tout ou rien. Un réglage de
  volume (ou un niveau « effets seuls, sans rotor ») serait la vraie réponse si le
  souffle continu gêne — mais c'est de l'UI à dessiner, pas un correctif.
- 💭 **Rendre la charge lisible *avant* le choc.** Le retour existe à l'impact, pas
  pendant l'approche. Une amorce sur le bord d'attaque quand le joueur fonce à
  pleine vitesse vers un adversaire apprendrait la règle sans texte. Coût réel,
  valeur à confirmer une fois le bandeau d'accueil testé sur de vrais débutants.
- 💭 **`CHARGE_BONUS = 0,3` est le réglage doux.** Mesuré aussi à 0,45 (passivité 9×
  plus lente) et 0,6 (21× plus lente). 0,3 a été retenu pour que le débutant qui
  n'a pas encore compris puisse quand même avancer un peu. À remonter si le message
  ne passe toujours pas.
- 📋 **Les autres écrans n'ont pas été testés.** Ce lot ne touche que l'arène ;
  Forge, Coffres et Toupies n'ont reçu aucun retour.

---

## Session du 2026-09-01 — guider le joueur

> « Dans le menu de la forge, je voudrais que les éléments de la toupie comme
> blade, disque, type et corps soient placés sous forme de stack de la même
> manière que c'est stocké sur le haut de l'écran. […] J'aimerais que tu mettes
> des points rouges sur les choses qui devraient être faites par le joueur. […]
> L'idée, c'est de guider le joueur dans les menus pour le pousser à améliorer sa
> toupie. L'objectif c'est de faire ressentir au joueur une amélioration continue
> et importante. […] L'idée c'est d'avoir une très grande quantité d'amélioration
> en continu comme dans les idle mobile. »

**Diagnostic.** La Forge dessine la toupie comme une pile — `drawToupiePortrait`
l'écrit noir sur blanc — puis pose dessous une grille 2×2 dont aucune case ne
correspond à aucune hauteur de l'objet. Et rien, nulle part, ne dit au joueur
qu'une pièce de son inventaire bat celle qu'il porte : c'est la seule information
de la Forge qu'il faut calculer soi-même pour la connaître.

La remarque couvre deux chantiers de tailles très différentes, découpés en deux
lots.

### Lot 1 — le guidage · ✅ livré

Spec : `docs/superpowers/specs/2026-09-01-guidage-joueur-design.md` ·
plan : `docs/superpowers/plans/2026-09-01-guidage-joueur.md`.

- ✅ **La Forge en pile.** Cinq lignes pleine largeur dans l'ordre du portrait —
  Châssis (en-tête, mène à l'onglet Toupies), Lame, Noyau, Disque, Pointe. L'ordre
  n'est pas celui du modèle de données (`lame, disque, pointe, noyau`) mais celui
  des hauteurs de `drawToupiePortrait` : c'est tout l'intérêt.
- ✅ **Le point rouge.** Un marqueur unique à tous les étages — onglet, section,
  filtre, vignette, ligne d'emplacement. Il ne marque que le **gratuit** : coffres
  à ouvrir, fusions possibles, pièces dominantes à équiper, Fondateur à réclamer.
  Jamais un achat : les crédits rentrent en continu, un point « tu peux payer »
  serait allumé en permanence, et un point toujours allumé ne dit plus rien.
- ✅ **« Plus forte » se mesure, ne se devine pas.** Une pièce mérite son point
  quand l'échange ne fait reculer **aucune** des sept stats et en relève au moins
  une. Le rang seul mentirait : une pièce de rang supérieur au niveau 0 est
  souvent plus faible qu'une équipée montée au niveau 8.
- ✅ **Rien n'est stocké.** Le point est dérivé de l'état à chaque rendu : il
  s'éteint parce que l'action est faite, jamais parce qu'on a regardé l'écran.
  Donc aucun champ de sauvegarde, aucun changement de schéma — et donc aucune
  collision avec le chantier des chapitres, qui réécrivait la sauvegarde en même temps.

**Deux corrections décidées en cours de route, contre le plan lui-même :**

- Le point d'une ligne d'emplacement est posé **à côté** du bouton d'amélioration,
  pas dedans. Le bouton se grise à 55 % d'opacité quand les crédits manquent ; le
  point, lui, annonce une action *gratuite* (équiper une pièce déjà possédée) et
  doit rester vif exactement à ce moment-là. Vérifié à l'écran, crédits à zéro.
- La pastille chiffrée est en texte sombre sur le rouge, pas en texte clair. La
  spec demandait l'inverse : 2,94:1 de contraste à 11 px, sous le seuil AA. Le
  texte sombre donne 5,36:1 — et c'était déjà la convention des pastilles du jeu.

**Vérifié en navigateur** (24 contrôles, sauvegarde injectée : 3 coffres en attente,
un Disque dominant, un trio fusionnable, zéro crédit, un Fondateur non réclamé) :
ordre de la pile, point sur la seule ligne concernée, point survivant au grisement,
filtres et vignettes, butin marqué et cartes d'achat intactes, extinction après
ouverture, navigation depuis la ligne Châssis, bascule FR/EN. `npm run calibrate`
rend exactement la ligne de base d'avant le lot (0,32 h · 9 runs · salle 10 la plus
meurtrière).

- 📋 **À trier — les étiquettes de points sur les boutons qui ont déjà un
  `aria-label`.** Un `aria-label` explicite sur un bouton l'emporte sur le nom
  dérivé de son contenu : sur les filtres d'emplacement de l'inventaire, sur les
  vignettes de pile de l'inventaire et sur les coffres de butin (les trois dans
  `InventoryPanel.tsx` et `ChestScreen.tsx`), un lecteur d'écran n'annonce donc
  pas l'étiquette du point imbriqué. Sur la barre d'onglets, où les boutons n'ont
  pas d'`aria-label` explicite, l'étiquette **est** annoncée — constaté à
  l'exécution (« Forge quelque chose à faire »). La ligne Châssis de la Forge ne
  porte aucun point (la spec l'exclut), donc n'est pas concernée par ce
  problème-là — mais son propre `aria-label` (`forge.changeToupie`) masque de la
  même façon le nom et le type de la toupie affichés dans la ligne. Quatre
  correctifs d'une ligne, de la même nature : à faire ensemble, ou pas du tout.
- 📋 **Les points du butin flottent un peu.** Les décalages négatifs qui les
  sortent de la vignette de coffre les détachent nettement du dessin. Lisible, mais
  à resserrer si ça gêne à l'usage.
- 📋 **À surveiller — un inventaire tardif saturé pourrait tout allumer.**
  `canFuse` compte les exemplaires identiques ; sur une partie avancée, les
  doublons s'accumulent et une large part des piles devient fusionnable en
  permanence. Le point de l'onglet Forge et la plupart des vignettes resteraient
  alors allumés en continu — exactement l'échec que la règle invoque pour exclure
  les achats (« un point toujours allumé ne dit plus rien »), atteint cette fois
  par les fusions plutôt que par le prix. La vérification en navigateur n'a
  couvert que le début de partie ; rien n'est tranché ici, mais un remède
  probable serait de ne marquer que la meilleure pile fusionnable par
  emplacement, ou de cesser de signaler une fusion devenue routinière. À revoir
  avec une sauvegarde de fin de jalon en main.

### Lot 2 — la boucle de progression continue · 📋 à spécifier

Quêtes et défis qui donnent des points, points qui donnent des crédits, crédits
qui achètent des coffres, ouvertures de coffres qui redonnent des points. C'est le
sous-système « quêtes quotidiennes » déjà inscrit au jalon 3 (`docs/roadmap.md`),
avec sa monnaie, sa persistance et son écran. À spécifier séparément, après la
fusion de `jalon-3-lot-a` — il touche `MetaState` et `SAVE_SCHEMA`, que cette
branche-là réécrit en ce moment.

---

## Comment mesurer (à réutiliser)

Les chiffres ci-dessus viennent de sondes jetables, écrites comme des tests Vitest
dans `src/` puis supprimées — la simulation étant pure et déterministe, un chapitre
entier se rejoue en quelques millisecondes hors navigateur.

- **Écart entre stratégies** : boucler `tick()` avec un `steer` calculé (passif,
  charge, interception, kite), racheter gloutonnement à chaque mort, compter les
  runs jusqu'à `chapterValidated`. 5 seeds, moyenne.
- **Cadence sonore** : rejouer `takeSnapshot` / `observe` autour de chaque `tick()`
  et compter les `hits` retenus par le filtre de `CombatScreen`.
- **Rendu** : `npm run dev` puis Playwright (voir `scripts/shots.mjs`) — c'est le
  seul moyen de juger un repère visuel.
- **Vérifier en navigateur un mécanisme qui n'arrive qu'au bout d'une descente**
  (le boss vaincu, par exemple) : jouer les dix salles en temps réel demande une
  dizaine de minutes. Accélérer l'horloge de la page suffit — un `page.addInitScript`
  qui enveloppe `requestAnimationFrame` pour avancer un temps virtuel de 240 ms par
  image et fait pointer `performance.now` dessus. `useGameLoop` consomme alors
  ~2,4 ticks par image au lieu d'un tous les six, soit ×14 : le boss tombe en une
  trentaine de secondes. La simulation avançant par pas fixes de 100 ms,
  **ce qu'elle calcule est rigoureusement inchangé** — seule la cadence
  d'observation bouge. Sauvegarde de départ injectée dans `localStorage` avant le
  premier chargement, pièces au rang 11, pour que les salles tombent vite ; une
  toupie nue et zéro pilotage donnent l'inverse, la mort en quelques secondes.
  `scripts/verrou.mjs` (`npm run verrou`, avec `npm run dev` en marche) fait les deux
  et sert de modèle.
