# SpinForge — Liste d'améliorations

Retours de test et suites données. Cette liste vit au fil des sessions de jeu : on
y **ajoute les remarques** telles qu'elles viennent, et on coche au fur et à mesure.
Ce n'est pas la roadmap (`docs/roadmap.md`, qui découpe les jalons) ni la dette
technique (même fichier, sections « Dette connue ») — ici on parle de ce que le
joueur ressent.

Statuts : ✅ corrigé · 🔧 en cours · 📋 à faire · 💭 à arbitrer

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
élimine la toupie, le boss compris, quoique lourd à y pousser — masse ×3) ; les zones au sol
(accélérateur, pointes, plaque glissante) et l'éclat de Gyre donnent des raisons de bouger ;
`combat.damageK` est monté de 0,35 à 1,3, réglé au harnais pour que la salle 10 reste sous
60 s sans cesser d'être la plus meurtrière. Détail des trois types de zone et de la règle
d'éjection : `docs/game-design.md` § Combat & pilotage.

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
