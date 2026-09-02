# SpinForge — Roadmap

Quatre jalons, **jouable à chaque étape**. Spec : `docs/game-design.md`.

## Jalon 1 — La boucle nue ✦ plan : `docs/superpowers/plans/2026-08-24-jalon-1-boucle-nue.md`

Pilotage au doigt (glisser-diriger), simulation de combat déterministe à tick fixe, salles et boss, crédits, améliorations des 4 pièces, 1 arène (Hangar Rouillé).

**Critères d'acceptation** : deux runs même seed + mêmes inputs ⇒ états identiques (testé) ; on pilote la toupie au doigt dans le navigateur ; un chapitre complet (10 salles, boss en 10ᵉ) se joue, se perd (retour salle 1, crédits conservés) et se valide ; les 4 améliorations coûtent `100 × 1,08^niveau` et changent réellement les stats ; `npm run test` et `npm run build` verts.

## Jalon 1.5 — L'habillage ✦ plan : `docs/superpowers/plans/2026-08-25-jalon-1-5-habillage.md`

Le jalon 1 a livré la boucle, pas le jeu : deux cercles plats sur un disque filaire. Or la
« vie » d'une toupie **est** sa rotation, et rien ne tourne à l'écran. Ce jalon donne au jeu
son identité visuelle et son game feel, avant que le gacha n'arrive — un coffre de pièces
n'a aucune valeur si on ne voit pas les pièces.

Attention : `design/` est un **wireframe** (mise en page et vocabulaire d'écran), pas une
direction artistique. La DA — palette, formes, typographie, langage de mouvement — reste
à arrêter et c'est le premier livrable du jalon.

Contenu : direction artistique arrêtée · les toupies tournent visiblement et la vitesse de
rotation donne à lire le spin restant · retour d'impact (flash, secousse, étincelles, son) ·
traînée à grande vitesse · arène avec du relief au lieu d'un cercle filaire · le boss se lit
comme un boss (taille, aura, entrée) · transition de salle au lieu d'un pop instantané ·
HUD conforme à `design/Combat.dc.html` (crédits/gemmes, nom de chapitre, tab bar) · sons.

**Critères d'acceptation** : on distingue au premier coup d'œil une toupie en pleine forme
d'une toupie mourante **sans lire le HUD** ; chaque choc produit un retour visuel et sonore ;
plus rien ne dépasse du décor ; 60 fps sur mobile milieu de gamme ; l'écran de combat
correspond au wireframe `design/Combat.dc.html` ; **`src/sim/` reste inchangé** hors la
correction de débordement listée en dette — le rendu est spectateur.

## Jalon 2a — Les pièces ✦ plan : `docs/superpowers/plans/2026-08-25-jalon-2a-pieces.md`

Équilibrage en JSON statique versionné, sauvegarde du méta, pièces à modèle et rang,
inventaire en piles, douze talents aux paliers nommés, trois coffres avec pity 10/30,
fusion sur les quatre paliers.

**Critères** : ouvrir des coffres, fusionner jusqu'à changer de rang, équiper des pièces qui
changent le gameplay ; pity vérifiés par test ; un rechargement conserve tout.

## Jalon 2.5 — Le terrain et le butin ✦ plan : `docs/superpowers/plans/2026-08-27-jalon-2-5-terrain-et-butin.md`

Inséré après le jalon 2a, à la suite d'une session de test du 2026-08-26 : le système de
rangs, talents et fusion livré au jalon 2a ne se voyait jamais (chapitre 1 à 2,08 h, premier
coffre Arène à 2,92 h), et le pilotage ne se sentait pas (charger un adversaire ne valait pas
mieux que rester immobile). Spec :
`docs/superpowers/specs/2026-08-26-jalon-2-5-terrain-et-butin-design.md`. Les trois remarques
du joueur et leur diagnostic détaillé : `docs/ameliorations.md`.

Contenu : l'arène devient un terrain — répulsion réellement parcourue (le plafond de vitesse
ne borne plus que le pilotage, jamais les coups reçus), bord à brèches (éjection = mort),
zones au sol (accélérateur, pointes, plaque glissante), éclat de Gyre à disputer entre joueur
et bots · le butin coule — chaque salle vidée lâche un coffre, Bronze à 250 crédits (2 000
avant) · un seul gabarit d'arène pour l'instant, celui du chapitre 1 — les identités des sept
autres chapitres restent à poser (§ 8 arènes-chapitres de `docs/game-design.md`).

**Critères d'acceptation**, jugés au harnais `npm run calibrate` (5 graines, politique
« terrain ») :
- un coffre ouvert dans les deux premières minutes — **tenu**, largement : médiane 0,00 h ;
- le chapitre 1 validé en une session de ~15 min — **non tenu** : médiane 0,35 h (~21 min).
  Plus de 150 combinaisons d'`econ.rewardBase`/`rewardGrowth`/`upgradeGrowth`/`upgradeBase`
  ont été mesurées ; chaque point qui s'approche de 15 min déplace la concentration des morts
  de la salle 10 vers la salle 6 ou 7, cassant le pilier « le boss est le mur ». Tranché en
  faveur du pilier plutôt que de la vitesse — détail du balayage et arbitrage complet dans
  « Équilibrage du chapitre 1 » ci-dessous ;
- l'éjection tue le boss — **non tenu** : la règle d'éjection elle-même est uniforme et
  fonctionne — 20 des 190 morts du joueur mesurées sur ce protocole sont des sorties de
  piste, environ une sur dix — mais à masse ×3 et au seuil actuel
  (`arena.breach.ejectSpeed` 400), éjecter le boss demanderait ~615 px/s de vitesse de
  charge même dans la géométrie la plus favorable qui soit (boss immobile, exactement au
  bord, charge parfaitement radiale) — hors de portée du plafond de pilotage du joueur
  (240, 384 sous accélérateur). Mesuré au jalon 2.5, quand la masse du joueur valait
  encore 1 : 71 combats de boss sur 20 graines, 8 h simulées, **zéro éjection**. C'est
  `combat.damageK` qui a fait chuter le boss de 183 s à 87,1 s, pas l'éjection (voir
  « Équilibrage du chapitre 1 » ci-dessous). **Ce constat ne tient plus depuis
  l'intégration du jalon 2b** : `Top.mass` y devient la masse résolue du joueur (châssis ×
  modèle de Disque × talent Masse), et le seuil d'éjection du boss s'effondre avec elle —
  voir la dette du jalon 2.5 ci-dessous, corrigée en conséquence ;
- la politique passive reste très en retrait de la politique « terrain » au harnais —
  **tenu, largement dépassé** : la politique passive ne valide jamais le chapitre 1 dans le
  plafond de 20 h du harnais, contre 0,35 h en jouant le terrain — la forme la plus forte du
  garde-fou que ce jalon existe pour produire.

## Jalon 2b — Les toupies ✦ plan : `docs/superpowers/plans/2026-08-27-jalon-2b-toupies.md`

Les quatre Fondateurs (châssis + Lame/Noyau signature), types et triangle des forces,
comportements distincts des modèles génériques, doublons signature des toupies débloquées.

**Critères** : le triangle des forces change l'issue d'un combat ; changer de toupie change
le pilotage.

## Jalon 3 — L'idle

Farm hors-ligne plafonné (4 h) par fast-forward de ticks + formule fermée, écran « Pendant ton absence », mode AUTO sur chapitres validés (jamais de progression), murs calibrés, chapitres 1-4 avec gimmicks, atout temporaire par salle, quêtes quotidiennes, sauvegarde IndexedDB + export. Quatre lots : **A** (le socle — livré ci-dessous), **B** (le farm), **C** (le contenu), **D** (la sauvegarde).

**Critères** : fermer l'app 1 h ⇒ gains exacts et plafonnés ; l'AUTO ne franchit jamais une salle non validée (testé).

### Lot A — la progression des chapitres ✦ spec : `docs/superpowers/specs/2026-08-31-jalon-3-lot-a-progression-chapitres-design.md` · plan : `docs/superpowers/plans/2026-09-01-jalon-3-lot-a-progression-chapitres.md` · calibration : `docs/superpowers/plans/2026-09-01-calibration-chapitres.md`

Le jeu ne savait jouer qu'un seul chapitre : le boss vaincu remettait `run.salle` à 1 et la
descente repartait aussitôt, sans écran de victoire ni chapitre 2. Ce lot pose la frontière de
run qui manquait et la mémoire numérotée de ce qu'on a validé.

Livré : `RunState.phase` gagne `'won'` — le boss vaincu ferme la descente au lieu de relancer
la salle 1 · `startRun(meta, chapitre, graine)` devient la seule porte du cycle de vie d'un
run, absorbant `createRun`, `resetRun` et `equipPendingToupie`, qui disparaissent — le châssis
de la descente n'est plus lu qu'une fois, le verrou du châssis devient structurel plutôt que
conventionnel · `MetaState.chapterValidated: boolean` devient `bestChapter: number` (schéma de
sauvegarde 4 → 5, migré dans `hydrate`) · un panneau « Choisis ta descente » remplace le
bouton « Retenter » sur l'écran de combat, entre 1 et `min(bestChapter + 1, 4)` · les
chapitres 2 à 4 reçoivent leur propre composition de `botTypes`, le triangle tournant d'un
chapitre à l'autre pour que la contre-pioche qui marchait cesse de marcher · deux facteurs
géométriques par chapitre arrivent, un pour la difficulté (`bot.scaling.spinPerChapter`,
`bot.scaling.attackPerChapter`) et un pour le revenu (`econ.rewardPerChapter`), chacun
calibré dans sa propre passe et son propre commit — jamais le combat et l'économie ensemble,
ce projet l'a payé deux fois (jalons 1.5 et 2b).

**Mesuré au harnais `npm run calibrate`, dix graines** (`bot.scaling.spinPerChapter` **1,02**
· `bot.scaling.attackPerChapter` **1,10** · `econ.rewardPerChapter` **1,15**) :

| | validé | coût cumulé | coût marginal | descentes | plus meurtrière (absolu) | garde-fou 1 | par tentative |
|---|---|---|---|---|---|---|---|
| ch. 1 | 10/10 | 0,32 h | +0,32 h | 9 | salle 10, 23 morts | oui | salle 10, 70 % |
| ch. 2 | 10/10 | 0,47 h | +0,15 h | 3 | salle 10, 8 morts | oui | salle 10, 44 % |
| ch. 3 | 10/10 | 0,58 h | +0,10 h | 2 | salle 10, 5 morts | oui | salle 10, 33 % |
| ch. 4 | 10/10 | 0,94 h | +0,36 h | 6 | salle 10, 18 morts | oui | salle 10, 64 % |

Premier coffre 0,00 h · passivité jamais validée en 20 h simulées · verrou du châssis actif ·
écart entre châssis ×3,80 — inchangé *par ce lot-ci*, ce qui était le constat de l'époque ;
il est depuis passé à ×10,80 sous l'effet de `fc827ee`, voir « Née de l'intégration » dans la
dette du jalon 2.5. **Le chapitre 1 est bit à bit inchangé** par tout le lot — son exposant
vaut 0 dans les deux facteurs — vérifié à chaque mesure des deux passes (heures, descentes,
vecteur de morts par salle
`0,0,1,0,10,9,21,18,15,23`, écart châssis, série contre-pioche) : c'est ce qui a transformé les
quatre garde-fous du projet d'une comparaison approximative en une comparaison exacte. Détail
des deux balayages : `docs/superpowers/plans/2026-09-01-calibration-chapitres.md`.

**Deux résultats mesurés valent plus que les valeurs retenues.**

1. **Les facteurs de combat ne peuvent pas réparer le chapitre 4 — prouvé, pas supposé.** Au
   plancher `1,00 / 1,00`, où les bots du chapitre 4 sont bit à bit identiques à ceux du
   chapitre 1 et où le joueur arrive avec trois chapitres d'équipement en plus, le chapitre 4
   restait un mur : salle 1 vidée 2 881 fois contre 51 au chapitre 3. Sa difficulté vient de
   la composition `botTypes["4"]`, qui refuse au châssis de mesure son avantage de type sur
   quatre salles. Descendre sous le plancher n'aide pas non plus : à `0,90 / 0,90` le
   garde-fou casse dans les chapitres 2, 3 **et** 4 au lieu du seul 4.
2. **Un joueur plus riche n'ouvre pas le chapitre 4 — un joueur moins vite équipé, si.** Le
   balayage économique a testé l'hypothèse inverse et trouvé le signe retourné. Au-dessus de
   `rewardPerChapter = 1,21` le chapitre 4 s'effondre ; à 2,00 c'est le chapitre 3 qui n'est
   plus jamais validé — mécanisme mesuré, pas supposé : zéro mort sur 18 105 passages aux
   salles 1-2, puis 68 % de létalité à la salle 3, exactement `arena.breach.fromSalle`. Les
   crédits achètent des niveaux de Pointe, la Pointe multiplie `maxSpeed`, et l'autopilote
   s'éjecte lui-même. **La richesse achète de la vitesse, et la vitesse tue dans un jeu à
   éjection** — un couplage entre économie et terrain que personne n'avait mesuré.

Ferme sept dettes, listées où elles vivaient : « `RenderEvents.chapterValidated` mort-né »
(jalon 2a), « deux sites dérivent le boss » et « une seule direction du verrou est couverte »
(verrou du châssis), « `chapterGroups(1)` code le chapitre 1 en dur » et « `viewFor` ne
distingue pas les chapitres » (jalon 2b), « les tables de types des chapitres 2 à 8 sont
absentes » (jalon 2b, partiellement — 2 à 4 seulement) et « les identités d'arène des
chapitres 2 à 8 sont inatteignables » (jalon 2.5, partiellement). Dette ouverte par ce lot :
voir « Dette connue (jalon 3, lot A) » en bas de page.

### Lot B — le farm ✦ spec : `docs/superpowers/specs/2026-09-01-jalon-3-lot-b-farm-design.md` · plan : `docs/superpowers/plans/2026-09-01-jalon-3-lot-b-farm.md`

Le lot A a posé deux pièces pour ce lot-ci sans jamais s'en servir lui-même : la mémoire
numérotée de ce qu'on a validé (`bestChapter`) et la porte unique du cycle de vie d'une
descente (`startRun`). Ce qui manquait restait entier : le jeu ne tournait que quand un doigt
le pilotait. Fermer l'onglet ne rapportait rien, et le laisser ouvert sans y toucher ne
rapportait rien non plus — le pilier économique n° 3 de `docs/game-design.md` (« ~60 % des
revenus viennent de l'idle ») n'avait, jusqu'ici, aucune implémentation.

Livré : `src/sim/autopilot.ts` porte désormais `steerWithTerrain`, extraite bit à bit de
`scripts/calibrate.mjs`, qui l'importe au lieu de la définir — mêmes constantes, même ordre de
tests, même repli d'angle, pas un mot changé · `src/sim/farm.ts` porte `FarmSession` (une
descente en cours plus un report de reste, `carry`), `farm(meta, session, secondes, graine)`,
`offlineSeconds(absence)` et `onlineSeconds(écoulé)` — un seul mécanisme sert l'AUTO à l'écran
et le hors-ligne au retour, et les deux conversions du temps réel en temps de jeu vivent côte
à côte, pures et testées · **le farm s'arrête salle 9 et ne combat jamais le boss** :
`applyRunReward` ne fait monter `bestChapter` que sur `reward.boss`, donc un farm sans boss ne
peut structurellement pas déclencher ce `Math.max` — le critère du jalon cesse d'être une
convention tenue pour devenir une propriété du code, et les gemmes, l'Arène garantie et le
Mythique, tous du butin de boss, deviennent exclusivement actifs · `MetaState.lastSeenAt` et
le schéma de sauvegarde 5 → 6 · l'AUTO comme décor : quand personne ne pilote, une descente
tourne en fond **sur le vrai méta** — la toupie du décor est celle du joueur, pièces achetées
à l'instant comprises — et un clone jetable ne sert qu'à **encaisser ses récompenses**, qu'on
jette avec lui : c'est ainsi que « le décor ne crédite rien » est tenu, le crédit venant de
`farm()` appelée par paquets sur la session vivante, si bien que fermer l'app ou la laisser
ouverte rapporte exactement la même chose par minute · une **invite permanente** sur l'onglet
Combat tant que le décor tourne, qui offre le choix du chapitre et le bouton qui part —
`RunPicker`, le même composant que le voile de fin de descente, monté à deux endroits ·
l'écran « Pendant ton absence », bilingue FR/EN, sans ×2 et sans publicité.

**Neutralité de l'extraction, prouvée au chiffre près.** Les huit garde-fous mesurés par
`npm run calibrate` ressortent inchangés d'un bout à l'autre du lot, malgré le déplacement de
`steerWithTerrain` d'un script vers `src/sim/` : chapitre 1 validé en 0,32 h en 9 descentes,
salle 10 la plus meurtrière avec 23 morts ; chapitre 2 +0,15 h en 3 descentes ; chapitre 3
+0,10 h en 2 descentes ; chapitre 4 +0,36 h en 6 descentes ; premier coffre à 0,00 h ;
politique passive jamais validée en 20 h simulées ; écart entre châssis ×3,80 ; verrou du
châssis actif ; salle 10 la plus meurtrière dans chaque chapitre. Un seul de ces huit
garde-fous qui aurait bougé aurait signifié que l'extraction n'était pas neutre — c'est
exactement la garantie que la spec exigeait avant d'accepter le déplacement de code (§ 2.2).

**Mise à jour (intégration de `main`, 2026-09-02) — ces huit chiffres sont ceux de la base du
lot, `764f220`, et ce ne sont plus ceux du dépôt.** `main` a livré entre-temps `fc827ee`,
« le contact se cherche sur le trajet du tick, plus sur son arrivée » : la détection de contact
était discrète — positions intégrées sur 100 ms entières, chevauchement testé aux seules
positions d'arrivée — et une toupie rapide traversait sa cible. Le commit mesure lui-même ce
qu'il récupère : **97 chocs encaissés contre 78**, près d'un quart des collisions qui étaient
perdues. Un autopilote qui encaisse un quart de chocs en plus meurt davantage, et tout
l'équilibrage se déplace avec lui. Nouvelle ligne de base :

| | validé | coût cumulé | coût marginal | descentes | plus meurtrière (absolu) | garde-fou 1 | par tentative |
|---|---|---|---|---|---|---|---|
| ch. 1 | 10/10 | 0,42 h | +0,42 h | 20 | salle 10, 72 morts | oui | salle 10, 88 % |
| ch. 2 | 10/10 | 0,54 h | +0,12 h | 2 | salle 10, 30 morts | oui | salle 10, 75 % |
| ch. 3 | 10/10 | 0,69 h | +0,15 h | 3 | salle 10, 16 morts | oui | salle 10, 62 % |
| ch. 4 | 10/10 | 0,77 h | +0,08 h | 5 | salle 10, 33 morts | oui | salle 10, 77 % |

Inchangés : premier coffre 0,00 h · passivité jamais validée · verrou du châssis actif · salle
10 la plus meurtrière dans les quatre chapitres. Vecteur de morts par salle du chapitre 1 :
`0,0,0,1,15,17,34,25,35,72`, contre `0,0,1,0,10,9,21,18,15,23`. Le huitième garde-fou, lui,
n'est pas un recalage mais une **alerte** : l'écart entre châssis passe de ×3,80 à ×10,80 pour
une cible de ×2 — voir « Née de l'intégration » dans la dette du jalon 2.5, où elle est
consignée.

**Ce lot n'a contribué à aucun de ces déplacements, et c'est mesuré, pas plaidé** : la ligne de
base ci-dessus est identique sur `main` seul et sur l'arbre fusionné. La démonstration de
neutralité du paragraphe précédent reste donc entièrement valide — elle disait « l'extraction
ne déplace aucun chiffre », pas « ces chiffres sont éternels ». Ce qui change est la référence
à laquelle une remesure doit se comparer, et rien d'autre.

**Le coût du fast-forward a fait écarter la formule fermée que prescrivait la spec de
référence.** Mesuré sur la machine de développement, autopilote branché : 1 h de jeu simulée
coûte 50 ms, 4 h (le plafond) 136 ms, 12 h (le plafond prévu au jalon 4) 389 ms. Et le plafond
n'est jamais simulé en entier en pratique : au taux retenu, une absence de 4 h ne rejoue que
48 min de jeu, soit ~28 ms. La formule fermée aurait acheté des millisecondes contre une
approximation, un deuxième chemin de code et un deuxième jeu de tests — écartée, et
`docs/game-design.md` est corrigé en conséquence.

**La calibration du taux idle est la passe d'équilibrage de ce lot, et son résultat est que la
valeur provisoire est validée par la mesure, pas modifiée.** Balayage sur cinq graines,
chapitre 1 :

| taux | temps simulé pour 4 h d'absence | crédits | coffres | niveaux d'amélioration financés |
|---|---|---|---|---|
| 5 % | 12 min | 13 057 | 109 | 31 |
| 10 % | 24 min | 25 888 | 216 | 39 |
| 15 % | 36 min | 38 928 | 326 | 45 |
| **20 % (retenu)** | **48 min** | **51 428** | **430** | **48** |
| 25 % | 60 min | 64 455 | 537 | 51 |
| 30 % | 72 min | 77 253 | 644 | 53 |

> **Chiffres remesurés après l'intégration de `fc827ee` (2026-09-02).** La première mesure de
> ce balayage tournait sur `764f220` et donnait des valeurs environ 60 % plus basses (7 856 à
> 47 030 crédits, 61 à 387 coffres) ; le contact cherché sur le trajet du tick a déplacé toute
> l'économie du farm avec le reste. **La décision, elle, n'a pas bougé d'un pouce**, et c'est
> le point important : le raisonnement ci-dessous est confirmé, seules les valeurs absolues
> sont à relire. Voir plus bas pourquoi il ne pouvait pas en être autrement.

Référence : une heure de jeu actif produit 64 455 crédits, 537 coffres, 512 salles vidées et
finance 51 niveaux d'amélioration — c'est la ligne à 25 % du tableau ci-dessus, et ce n'est
pas une coïncidence. **25 % est une borne naturelle et lisible** : c'est le taux exact où une
absence de 4 h produit *identiquement* ce qu'une heure de jeu actif produit, au chiffre près,
sur les deux lignes. Et cette égalité est de l'**arithmétique de taux** — 4 h × 25 % = 1 h de
jeu simulé — donc indépendante du modèle de combat : elle valait à 39 767 crédits sur
`764f220`, elle vaut à 64 455 après `fc827ee`, elle vaudrait encore si le combat était
entièrement réécrit demain. C'est exactement ce que la décision 3 de la spec achetait en
appliquant le taux **au temps** plutôt qu'aux gains. Le palier utile est donc `[15 % ; 25 %[`,
et 20 % en est un point intérieur qui garde de la marge — y compris avec le bonus de retour
×1,5 au-delà de 12 h d'absence, qui porte le taux effectif à 30 % (72 min de jeu simulé pour
12 h d'absence) : plus qu'une heure d'actif en valeur brute, mais rapporté aux douze heures
qui l'ont produit, toujours très défavorable à la minute — exactement le ressort de rétention
que la décision 4 de la spec (§ 1) demandait : le bonus doit se remarquer sans jamais rendre
l'absence préférable à la présence.

Constat qui a surpris, et qui recadre le précédent : **le jeu actif déverse déjà 537 coffres
par heure.** Le volume de butin d'un retour hors-ligne (430 coffres, au taux retenu) n'est donc
pas une anomalie propre au farm — il reste inférieur à ce que produit une seule heure de jeu
joué. Le robinet large est une propriété du jeu depuis le jalon 2.5, pas une conséquence de ce
lot ; `fc827ee` l'a encore élargi de moitié, ce qui ne fait que renforcer le constat.

`src/content/balance.json` **n'est pas modifié par cette passe** : la mesure valide la valeur
`offline.rate: 0,20` déjà en place plutôt que de la changer — c'est un résultat de cette passe,
pas une omission. **La remesure d'après `fc827ee` le confirme une seconde fois, et `rate` reste
à 0,20** : le palier `[15 % ; 25 %[` est borné par une égalité de taux, pas par un seuil de
crédits, donc rien de ce qui déplace le modèle de combat ne peut le déplacer. Un taux idle est
un rapport entre deux façons de jouer le même jeu ; il survit à un changement qui affecte les
deux également. Le bloc `offline` n'entre d'ailleurs dans aucun calcul du harnais de
calibration, et les huit garde-fous ci-dessus le confirment en restant inchangés après le
balayage. Règle du projet respectée une fois de plus : jamais le combat et l'économie dans la
même passe ni le même commit — cette passe ne touche qu'à l'économie du farm, et n'a en fait
rien eu à changer.

**Ce que la relecture de branche entière a trouvé, et que rien d'autre n'a trouvé.** Le lot
avait livré, à ce stade, une version où **le jeu devenait injouable dès qu'un chapitre était
validé** : le seul code qui repasse en partie pilotée était déclenché par le bouton du voile
de fin de descente, mais en décor le run est remplacé dès qu'il se ferme, dans le même bloc
synchrone que le tick — aucun rendu ne voyait jamais une descente close, donc le voile ne
s'affichait jamais, donc le bouton n'existait jamais, et le doigt était par ailleurs inerte.
Il ne restait aucun moyen de lancer une descente. Et **le plafond de 4 h était contournable en
laissant l'app ouverte** : le hors-ligne plafonnait, le paquet en ligne non, si bien qu'un
portable refermé 72 h créditait ×11,8 ce que le plafond autorise — l'exact contraire de la
promesse « fermer l'app ou la laisser ouverte rapporte pareil », et la ruine de la calibration
du taux idle, qui est bâtie sur ce plafond.

Ni les tests, ni les relectures tâche par tâche, ni les vérifications en navigateur faites
pendant l'exécution du plan ne les avaient vus. C'est cohérent avec ce qu'ils sont : chaque
moitié du premier défaut était correcte et testée, c'est leur **rencontre** qui fermait le
jeu ; et le second est une **règle posée à deux endroits mais tenue à un seul**, invisible
tant qu'on regarde un chemin à la fois. Une relecture tâche par tâche vérifie que chaque pièce
fait ce qu'elle annonce ; elle ne peut pas voir qu'une pièce correcte en rend une autre
inatteignable. Ces deux familles de défauts sont exactement ce que la relecture de branche
entière attrape, et rien d'autre dans ce projet ne les attrape. Les six correctifs, avec le
détail de chacun, sont consignés au § 11 de la spec du lot.

Dette ouverte par ce lot : voir « Dette connue (jalon 3, lot B) » en bas de page. La dette de
performance du jalon 1.5 n'est pas fermée par ce lot, mais elle a été remesurée avec le décor
AUTO en fonctionnement, et deux suspects qu'elle nommait en sont ressortis innocentés — voir
« Dette connue (jalon 1.5) » ci-dessous.

## Jalon 4 — Le long terme

Refonte + arbre d'atouts (référence de farm conservée), Génération Rafale (12 toupies), chapitres 5-8 dont le Vortex (chapitre infini), premier événement, PWA installable.

**Critères** : une Refonte accélère visiblement le cycle suivant ; le Vortex tourne sans fin avec modificateurs toutes les 10 salles.

---

## Dette connue (héritée du jalon 1)

Traité au jalon 1.5, sauf la dette de simulation ci-dessous, dont une partie était
explicitement réservée au jalon 2a — désormais traitée et retirée ci-dessous. Aucun de ces
points n'était bloquant ; tous avaient été constatés et arbitrés pendant la revue du
jalon 1.

**Équilibrage du chapitre 1 — recalibré au jalon 2.5, le 2026-08-27.** Le jalon 2.5 a réparé
la cause racine du plafond de vitesse (il annulait le recul d'un choc avant que la toupie ne
l'ait parcouru d'un seul pixel) et ouvert un second robinet de butin (un coffre par salle
vidée, plus l'achat). Mesuré au harnais `npm run calibrate` avec une politique d'autopilote
qui utilise le terrain (pousser la cible vers la brèche la plus proche d'elle, disputer
l'éclat), 5 graines, en deux passes séparées — combat puis économie, jamais les deux à la
fois : `arena.shard.everyTicks` 90 → 72 (l'éclat n'apparaissait quasiment jamais avant la
salle 4, ratant l'apprentissage précoce du déni par percussion), puis `econ.rewardBase`
70 → 86.

| | Avant (jalon 2a) | Après (jalon 2.5) |
|---|---|---|
| Chapitre 1 validé | 2,08 h, 23 runs | **0,35 h, 10 runs** |
| Premier coffre ouvert | 2,92 h | **0,00 h** |
| Salle 10 (boss) | 183 s, 8 morts | **87,1 s, 20 morts** |
| Politique passive | — (non mesurée à ce protocole) | jamais (plafond du harnais : 20 h) |

La cible du cahier des charges (~0,25 h, ~4 runs) n'est **pas atteinte** — la valeur retenue
est 0,35 h / 10 runs. Ce n'est pas un manque de réglage : plus de 150 combinaisons ont été
mesurées (`econ.rewardBase`, `rewardGrowth`, `upgradeGrowth`, et `upgradeBase` en bouton
secondaire), et chaque point qui s'approche de la cible déplace la concentration des morts de
la salle 10 vers la salle 6 ou 7 — une tension structurelle reproductible, pas du bruit.
Le pilier « le mur n'est jamais un bug, c'est le produit » n'est pour autant pas abandonné :
il ne disparaît pas, il **déménage aux chapitres 3-4**, une fois l'enchaînement des chapitres
livré au jalon 3 — ce jalon ne peut pas le vérifier lui-même, les chapitres 2 et suivants
n'étant pas atteignables aujourd'hui (spec § 3.3, § 3.4). Ce jalon-ci a tranché en faveur
de ce pilier plutôt que de la vitesse : dix runs de
~2 min avec un coffre à chaque salle servent d'ailleurs un idle mobile au moins aussi bien que
quatre runs de 5 minutes. Le boss lui-même reste au-dessus de sa cible de combat (87,1 s
contre 60 s visés) malgré la chute depuis les 183 s de départ — voir « Dette connue
(jalon 2.5) » ci-dessous. Détail du balayage, tableaux complets et diagnostic des trois
remarques de test à l'origine du jalon : `docs/ameliorations.md`.

**Équilibrage du chapitre 1 — tranché au jalon 1.5, recalibré le 2026-08-25.**
`ECON.rewardBase` est passé de 120 à 70 en contrepartie du partage de charge ajouté au
combat : le pilotage étant devenu réellement payant, le chapitre 1 tombait à 1,43 h. Même
protocole de mesure, ~21 runs retrouvés. Détail et tableaux : `docs/ameliorations.md`.
Le paragraphe ci-dessous décrit la calibration d'origine.

**Équilibrage du chapitre 1 — tranché au jalon 1.5.** Mesuré à l'autopilote (« fonce sur le bot le plus
proche » + achats gloutons, 5 seeds, médianes) : le chapitre 1 demandait ~124 runs, soit ~12 h. Réglage
retenu « MUR ~2 h » : seule l'économie bouge (`ECON.rewardBase` 20 → 120, `rewardGrowth` 1,12 → 1,13,
`bossRewardMult` 5 → 10), le combat et le boss restent intacts. Résultat : 21 runs, ~2 h 08, et le boss
demeure de loin la salle la plus meurtrière (8 morts contre 3 pour la suivante) — conformément au pilier
« le mur n'est jamais un bug, c'est le produit ». Le balayage a montré que les deux leviers sont
indépendants : l'économie commande la durée, `BOSS.spinMult` commande la forme de la difficulté.
Détail : `docs/superpowers/specs/2026-08-24-jalon-1-5-habillage-design.md` § 6.

**Simulation**
- Les bots restent inertes 3 à 4 ticks après un spawn (`aim === null` jusqu'au prochain
  retarget). Non corrigé : borné, et cela joue en faveur du joueur.
- ~~`chapterValidated` n'est jamais remis à zéro.~~ Devenu `bestChapter: number` au
  jalon 3, lot A, qui ne descend jamais (`Math.max` dans `applyRunReward`) — le même
  pilier, désormais **couvert par un test vérifié par mutation**
  (`meta.test.ts`, « `bestChapter` ne descend jamais »).
- `formatCredits` affiche `1000,00 M` au-delà d'un milliard. Inatteignable au jalon 1 ; à
  traiter avec la migration `break_infinity.js` prévue dans la spec.

**Interface**
- Les handlers pointer restent sur le conteneur externe de l'écran de combat : glisser
  n'importe où pilote la toupie, y compris au-dessus du bandeau ou de la barre de spin.
  Conforme à la spec (« glisser n'importe où »). La vraie gêne — glisser en partant d'un
  bouton (Retenter, coupure du son) pilotait aussi la toupie — a bien été corrigée par un
  garde (`closest('button')`) dans `CombatScreen.onDown` au jalon 1.5.

## Dette connue (jalon 1.5)

Constatée et arbitrée pendant la revue de branche du jalon 1.5. Aucun de ces points n'est
bloquant ; certains sont des choix délibérés (contrainte technique, hors périmètre de la
spec), d'autres des perfectionnements de game feel reportés faute d'enjeu au jalon 1.

**Direction artistique et rendu**
- Quatre teintes vivent en dur hors de `PALETTE`, dans `src/render/topView.ts` et
  `src/render/arena.ts` (`0xffd9a0` onde de mort, `0xfff6e4` flash d'impact, `0xffe2b2`
  éclair de reforge, `0x04050a` voile d'entrée du boss) : chacune n'a qu'un seul
  consommateur aujourd'hui, les sortir dans le thème n'a d'intérêt qu'au jour où un
  deuxième effet a besoin de la même teinte.
- `arena.ts` fait tourner trois compteurs de décroissance quasi identiques (`bossEntry`,
  `reforge`, `reforgeFlash`), chacun avec sa propre durée de vie et son propre
  consommateur : les factoriser économiserait quelques lignes contre une indirection à
  lire à chaque fois — pas rentable avant un quatrième compteur du même genre.
- `src/render/observer.ts` retrouve le joueur par le littéral `'player'` plutôt que par le
  drapeau `isPlayer` porté par l'instantané : couplage implicite mais sûr, `sim.ts`
  garantit cet id depuis le jalon 1.
- La porte de l'arène est retracée en `Graphics` (`clear()` + `arc()` + `stroke()`) à
  chaque image — seule survivante de l'ancien modèle « retracer à chaque image » que la
  spec § 3.5 proscrit pour tout le reste du rendu. Six appels par image ne pèsent rien à
  la mesure de performance actuelle ; à convertir en sprite teinté si la porte se
  complexifie.
- La texture du sol est régénérée en intégralité à chaque pixel de redimensionnement du
  conteneur (`layout()` dans `arena.ts`) : sensible en glissant la fenêtre au trackpad sur
  ordinateur, invisible au tactile où le conteneur ne change pas de taille en continu. À
  débouncer si un test manuel confirme la gêne.
- Le joueur reste dessiné à son lieu de mort jusqu'à ~100 ms après « Retenter » :
  `startRun` (`resetRun` avant le jalon 3, lot A) mute l'état hors du cycle `beforeTick`/`afterTick`/`draw`, donc la prochaine
  image interpole encore depuis l'instantané pris avant la mort. Effet d'un dixième de
  seconde, non corrigé faute d'un point d'accroche propre pour prévenir l'arène qu'un
  reset hors-tick vient d'avoir lieu.
- À la mort du dernier bot d'une salle, les étincelles du coup fatal peuvent pointer vers
  une toupie de la salle *suivante* : la simulation enchaîne la salle dans le même tick,
  et l'instantané qu'observe le rendu contient déjà les nouveaux bots. Purement
  cosmétique, une fois par salle.
- Le sprite d'une toupie est dessiné à 94 % du rayon de sa texture (`textures.ts`,
  `bodyTexture`/`rimTexture`), soit environ 4 % plus petit que sa hitbox réelle. La
  spec § 2.1 écarte le vacillement au motif qu'il « ment sur la hitbox » au moment où le
  joueur en a le plus besoin ; la même exigence vaudrait pour cet écart de taille, non
  corrigé ici faute d'arbitrage sur la marge d'anti-aliasing qui l'a motivé.

**Son**
- ~~Le bourdon se fige à sa dernière fréquence quand on passe sur l'onglet Forge.~~
  **Corrigé** avec la passe son du 2026-08-25 : le rotor se tait à la bascule d'onglet
  et à la mort du joueur (`docs/ameliorations.md`).
- L'initialisation paresseuse de l'audio dans `App.tsx`
  (`if (audioRef.current === null) audioRef.current = createAudio()`) serait fragile sous
  `React.StrictMode` (double montage en développement créerait deux `AudioContext`).
  `StrictMode` n'est pas activé aujourd'hui ; à revoir s'il l'est.

**HUD**
- Le bandeau du boss (`CombatScreen`) apparaît et disparaît d'un coup, alors que la
  spec § 2.4 décrit 0,3 s d'apparition, 1,2 s de tenue et 0,6 s de sortie. Implémenté en
  `setState` + `setTimeout` sans transition ; à animer si le rendu brut se voit trop à
  l'usage.
- `TabBar` n'expose ni `role="tablist"`/`role="tab"` ni `aria-selected` sur l'onglet actif
  — un lecteur d'écran ne distingue l'onglet courant que par la couleur. À traiter avec
  une vraie passe d'accessibilité plutôt qu'au fil de l'eau.
- `index.html` code `#0b0e13` en dur pour le fond de page, en doublon de `PALETTE.bg`,
  pour éviter un flash blanc avant que le script (et donc `theme.ts`) ne s'exécute.
  Techniquement nécessaire — le CSS s'applique avant tout JavaScript — mais le fichier ne
  porte aucun commentaire qui le rattache au thème pour la prochaine lecture.

**Performance — arbitré : on s'en contente pour ce jalon.**
Mesure de fin de jalon (sonde de temps par image, throttling processeur ×4 pour émuler un
mobile milieu de gamme) : **médiane 58,8 images/s**, mais **p90 à 25,5 ms** — environ une
image sur dix est doublée. Le critère d'acceptation n° 4, « 60 fps sur mobile milieu de
gamme », est donc tenu à la médiane et manqué dans la queue de distribution. Reporté
sciemment : le jalon 2a ajoute surtout des écrans React (coffres, inventaire, fusion) et
non de la charge d'arène, donc la mesure ne devrait pas se dégrader d'ici là. ~~Deux
suspects sont déjà nommés plus haut dans cette section — la texture du sol régénérée à
chaque pixel de redimensionnement, et la porte retracée en `Graphics` à chaque image. À
reprendre au jalon 3, quand le farm AUTO fera tourner l'arène en continu et rendra la
queue visible.~~ Les deux suspects nommés plus haut dans cette section ont été remesurés
au jalon 3 (lot B) et **innocentés tous les deux** — voir la mise à jour ci-dessous ; ce
n'est plus une piste à suivre.

**Mise à jour (jalon 3, lot B)** : remesuré en navigateur, throttling processeur ×4,
avec le décor AUTO de ce lot qui tourne — exactement la situation que cette entrée
annonçait comme celle qui « rendra la queue visible ». Trois constats.

Primo, la refonte graphique n'a rien dégradé. On aurait pu croire que tout ce que les
jalons 2a, 2b, 2.5 et 3 (lot A) ont ajouté au rendu de l'arène depuis la mesure d'origine
avait alourdi le rendu ; la mesure dément cette hypothèse. Décor AUTO, équipement de
départ : médiane 17,2 ms, soit **58,1 images/s**, p90 **25,5 ms**, p99 32,2 ms, 64,3 %
des images au-delà de 16,7 ms. C'est indiscernable de la mesure du jalon 1.5 — 58,1
contre 58,8 images/s, 25,5 ms de p90 dans les deux cas. Décor AUTO armé (salles
profondes, trois bots) : médiane 18,2 ms (54,9 images/s), p90 25,9 ms, p99 33,5 ms,
72,6 % au-delà de 16,7 ms — une charge un peu plus lourde, mais du même ordre.

Secundo, **les deux suspects nommés sont innocentés**. Les neutraliser tous les deux à
la fois pour la mesure ne déplace pas la queue de distribution : p90 25,7 ms, p99
33,6 ms, 66,4 % au-delà de 16,7 ms — l'épaisseur du bruit face aux 25,5 ms et 64,3 % de
la situation de référence, pas un gain. La texture du sol ne pouvait d'ailleurs pas être
en cause dans cette mesure de toute façon : elle n'est régénérée qu'au redimensionnement
du conteneur (`layout()` dans `arena.ts`), et la mesure ne redimensionne jamais rien.
Un troisième candidat, que la roadmap n'avait pas nommé, a été testé de sa propre
initiative : la résolution de rendu de PixiJS
(`resolution: Math.min(window.devicePixelRatio || 1, 2)`). Forcée à 1, la médiane tombe
à 17,0 ms, le p90 à 25,2 ms, 60,7 % au-delà de 16,7 ms — un mieux marginal, dans le même
ordre de grandeur que le bruit de mesure, pas une explication de la queue. Lui aussi est
innocenté.

Tertio, le coût est réel et vient bien du rendu de l'arène, mais il est **réparti, pas
localisé**. Le témoin le montre : sur l'onglet Forge, boucle de jeu arrêtée et arène
masquée, la même page tient **120,5 images/s** (médiane 8,3 ms, p90 9,6 ms, p99
10,2 ms), avec **zéro image doublée**. La queue de distribution n'est donc pas un
artefact du harnais de mesure — le même navigateur, sous le même throttling, l'atteint
sans peine dès que l'arène ne tourne pas. Ce n'est pas non plus la simulation : un tick
coûte environ 0,95 microseconde (mesuré par ailleurs sur ce lot, pour le hors-ligne : 4 h
de jeu simulées en 136 ms). Reste le rendu PixiJS de l'arène lui-même, sans point chaud
isolable parmi les trois candidats testés.

Conclusion : rien n'est corrigé, et c'est délibéré — le principe posé par ce lot est de
ne jamais corriger un suspect nommé sans l'avoir vu coupable, et aucun des trois ne l'a
été. Réduire cette dette demande une passe de profilage du rendu, hors périmètre du lot
B. La dette reste donc ouverte, exactement au niveau où elle était, sans régression.

Réserve : la mesure tourne en navigateur headless, où `devicePixelRatio` vaut déjà 1. Le
test sur la résolution de rendu ne conclut donc pas pour un vrai appareil mobile, où ce
facteur vaut souvent 3 — à refaire sur un appareil réel avant de rayer ce candidat
définitivement.

**Équilibrage**
- La taille des toupies à l'écran (~28 px de diamètre, soit `PLAYER_BASE.radius` /
  `BOT_BASE.radius` = 12 dans `config.ts`) a été jugée en fin de jalon et **délibérément
  laissée telle quelle**. Ce rayon est une constante d'équilibrage, pas un réglage de
  rendu : le modifier changerait la fréquence des chocs et invaliderait ~~la calibration du
  « MUR ~2 h » du chapitre 1 (autopilote, 5 seeds)~~ la calibration du chapitre 1 en vigueur,
  qu'il faudrait alors refaire entièrement. **Mise à jour** : cette calibration a bougé deux
  fois depuis « MUR ~2 h » — 2,08 h / 23 runs au jalon 2a, puis **0,35 h / 10 runs au
  jalon 2.5** (voir « Équilibrage du chapitre 1 » plus haut, qui est la référence actuelle) —
  sans que la raison du report change. À rouvrir seulement si une remesure est de toute
  façon au programme.

**Tests**
- `spinOmega` (`src/render/feel.ts`) n'a pas de test dédié : fonction pure triviale, non
  exigée par le plan du jalon 1.5, qui a concentré l'effort de test sur `observe()` — le
  cœur du game feel. (`lerp`, `takeSnapshot` et `snapshotById`, listées ici à l'origine,
  sont depuis couvertes par `src/render/snapshot.test.ts`, créé au jalon 2a.)

## Dette connue (jalon 2a)

Constatée et arbitrée pendant l'exécution du plan du jalon 2a. Aucun de ces points n'est
bloquant ; chacun porte sa propre raison de report.

**Équilibrage — mesuré au harnais `npm run calibrate` (5 graines), consigné le 2026-08-25.**
Validation du chapitre 1 : **23 runs, 2,08 h** — garde-fou de non-régression face aux 21
runs documentés avant le jalon (le projet a lui-même mesuré ces 21 runs tantôt à 2 h 08,
tantôt à 1,76 h selon les passes ; l'écart vient de la variance de méthode, pas d'une
dérive introduite ici). `econ.bossGems` passe de 40 à **60** : cible « premier coffre
d'Arène dans l'heure suivant la validation du chapitre 1 » atteinte sur les cinq graines
(0,82 à 0,87 h après validation ; `npm run calibrate` l'affiche en cumulé depuis le départ,
2,92 h, soit bien 2,08 + ~0,84 h). `talents.estoc.speedThreshold` passe de 150 à **298**
(p90 des vitesses d'impact réelles) et `talents.frolement.speedThreshold` de 40 à **18**
(p10 des mêmes), mesurés sur n = 54 333 collisions impliquant le joueur via une sonde
temporaire dans `resolveCollision`, retirée après mesure. La première mesure, prise sur la
norme de la vitesse relative à chaque tick plutôt que sur sa composante normale au contact,
donnait un p10 de 112,5 — au-dessus de la médiane réelle de 91,4 : Frôlement aurait annulé
la majorité des vrais coups. Refaite sur la bonne grandeur avant d'être retenue.

**Simulation**
- Pas de test pour un sacrifice de fusion de multiplicité ≥ 2 : la table `FUSION` réelle
  n'en contient pas, et en fabriquer un aurait exigé d'inventer une recette hors table.
- `rankLabel` (`piece.ts`) dérive la frontière « Légende » de la longueur de sa table
  d'étiquettes plutôt que de `RARITY.legendRank`. Les deux valent 11 aujourd'hui ; à relier
  si le rang plafond devient un jour réglable.
- `NEUTRAL_TALENTS` (`talents.ts`) n'est immuable qu'à l'exécution (`Object.freeze`), pas au
  typage. `Top.talents` gagnerait à être `Readonly<TalentMods>`. Non fait : `salle.ts:30`
  assigne littéralement `talents: NEUTRAL_TALENTS` (par référence, pas par copie) à chaque
  bot pour éviter une allocation par bot, donc l'objet est réellement partagé — mais aucun
  code n'écrit aujourd'hui dans un champ individuel de `top.talents` (la seule affectation
  existante, `sim.ts:79`, remplace l'objet entier via `resolveTalents`), donc le typage
  strict serait sûr à poser mais purement mécanique, sans bug actif à corriger.
- La dé-pénétration de collision (`combat.ts`) partage le chevauchement à parts égales sans
  tenir compte des masses, alors que l'impulsion, elle, en tient compte. Non corrigé : cette
  correction ne pèse que sur la position immédiate (ni les dégâts, ni la vitesse, qui restent
  exacts), et `resolveCollision` est rappelée tant que les deux toupies se chevauchent — le
  résidu se résorbe donc de lui-même sur les ticks suivants au lieu de s'accumuler. Seul
  Masse (rang 11, ×2) déséquilibre les masses en jeu aujourd'hui : effet borné.
- `resolveTalents` duplique la liste des emplacements au lieu de la dériver de
  `TALENTS_BY_SLOT`. Non corrigé : `Object.keys(TALENTS_BY_SLOT)` renvoie `string[]` en
  TypeScript, pas `Slot[]` — la dériver exigerait le même `as Slot[]` que la liste littérale
  actuelle, pour un gain de sûreté de typage nul.
- Le test « Estoc ne fait rien sous le seuil » passerait même si le talent était retiré :
  garde de neutralité utile, mais ne compte pas dans la couverture réelle d'Estoc.
- Garde-fou d'équilibrage non documenté ailleurs qu'ici : la séparation après un choc exige
  `(1 + restitution) × impulseTaken` moyen `> 1`, soit un plancher de 0,556 à restitution
  0,8. `ancrage.impulseTaken` vaut 0,7 et passe, même porté des deux côtés. Sous ce seuil,
  les toupies resteraient en rapprochement après l'impulsion et subiraient des dégâts à
  chaque tick.
- `applyReward` (`meta.ts`) est exporté sans appelant de production hors `applyRunReward`.
  Non retiré : `meta.test.ts` s'en sert pour tester l'arithmétique crédits/gemmes isolément
  de l'effet de bord de validation de chapitre que porte `applyRunReward` ; le désexporter
  forcerait ce test à passer par `applyRunReward` et à fabriquer un `salleJustCleared`
  arbitraire pour une assertion qui ne concerne pas la validation.

**Sauvegarde**
- Si l'écriture de la clé de secours (`spinforge.save.backup`) échoue faute de quota, le
  blob fautif ne reste que sous la clé principale jusqu'à la première écriture réussie.
  Enchaînement non garanti ; risque réel faible.

**Interface**
- `ChestScreen` duplique en dur le seuil `rank >= 7` de `rankColor` au lieu d'en dépendre :
  dérive silencieuse si la palette de rareté bouge.
- La liste de révélation des tirages (`ChestScreen`) n'a pas de région `aria-live`. Niveau
  constant avec le reste du dépôt (voir `TabBar` en dette 1.5) — à traiter avec une vraie
  passe d'accessibilité, pas au fil de l'eau.
- `arena.ts` nomme ses paramètres `state` là où le reste du code dit `run`.

**Tests**
- `movingTop()` duplique presque `top()` dans `physics.test.ts`.
- `meta.test.ts` intitule « a son propre flux de RNG » un test qui ne vérifie que la
  normalisation de la graine ; la séparation des flux est garantie structurellement, par la
  signature de `tick`.

## Dette connue (jalon 2b)

Constatée pendant la revue de branche du jalon 2b. Aucun de ces points n'est bloquant.

**Contenu différé — aucun n'est un défaut, tous attendent du contenu qui n'existe pas encore.**
- Les capacités de Noyau déclenchables (*Tornade Galopante*, *Spirale Ascendante*, *Forteresse*,
  *Griffe Éclair*) ne sont pas branchées : reportées au jalon 4 avec la Saison 1, faute d'un
  canal d'entrée pour les déclencher (glisser pilote déjà la direction).
- La rotation gauche n'est pas implémentée : aucun des quatre Fondateurs n'y tourne, elle
  arrive avec la Saison 1.
- ~~Les tables de types des chapitres 2 à 8 sont absentes de `botTypes`~~ **Chapitres 2 à 4
  livrés au jalon 3, lot A** (`src/content/balance.json`), le triangle tournant d'un chapitre
  à l'autre pour que la contre-pioche qui marchait cesse de marcher. Les chapitres 5 à 8
  restent absents, pour le jalon 4 ; le repli de `botTypeFor` vers le chapitre 1
  (`src/sim/salle.ts:14`) reste en place — délibérément cette fois : c'est lui qui leur
  permettra d'arriver un par un sans casser la simulation entre-temps.
- ~~`chapterGroups(1)` code le chapitre 1 en dur~~ **Corrigé au jalon 3, lot A** : lit
  `runRef.current.chapter` (`src/ui/ToupiesScreen.tsx`).
- ~~`viewFor` mémorise ses vues par `bot-{salle}-{index}` sans le chapitre~~ **Corrigé au
  jalon 3, lot A** : `makeBot` pose désormais `bot-${chapter}-${salle}-${index}`
  (`src/sim/salle.ts:31`) ; `viewFor` (`src/render/arena.ts`) n'a rien eu à changer, il
  élaguait déjà les vues dont l'id a disparu.

**Lisibilité du repère de type.**
Le contour du repère (`typeMarkTexture`, `src/render/textures.ts`) a été renforcé (épaisseur et
opacité) pour mieux détacher le rouge d'Attaque du corps orange des bots, et la transition de
salle annonce désormais le type en toutes lettres — ce qui rend la lecture à la seule teinte
beaucoup moins critique. La teinte elle-même (`TYPE_TINT.attaque`, `src/theme.ts`) n'a pas été
retouchée : c'est une décision de direction artistique qui appartient au joueur, pas à ce
correctif.

**Équilibrage**
- `mass: 1` en dur dans `src/sim/salle.ts:42` : c'est la seule stat de bot qui ne vit pas dans
  `balance.json` (`bot.base` porte `accel`/`maxSpeed`/`radius`/`spinMax`/`spinDecay`/`attack`/
  `defense`, pas la masse). Non corrigé ici, faute d'un chiffre à choisir sans rouvrir la
  calibration du chapitre 1.

**Simulation et tests**
- `NEUTRAL_PROFILE` (`src/sim/profile.ts`) n'a plus qu'un seul consommateur interne au
  fichier ; il reste exporté sans appelant externe.
- Aucun test ne compose triangle × Estoc, alors que c'est la pile du pire cas chiffrée au
  § 3.2 de la spec (2,11) — seuls triangle × partage de charge et triangle seul sont couverts.
- Les quatre tests de déterminisme (`src/sim/sim.test.ts:37-60`) passent tous par
  `createInitialMeta`, donc toujours Brasier Solaire avec un profil de châssis `{}` : aucun
  châssis non neutre n'est jamais rejoué sous ce test.
- Aucun test ne couvre `TYPE_TINT` (`src/theme.ts`) : ni les quatre teintes distinctes, ni
  l'injection des variables `--type-*` dont dépend tout `ToupiesScreen`.

**Interface**
- `ForgeScreen` s'intitule « Ta toupie » sans nommer le châssis actif ni son type.
- `claimFounderGift` est un choix permanent parmi trois, déclenché par un seul appui, sans
  écran de confirmation (`src/ui/ToupiesScreen.tsx`).
- L'observation de lisibilité sur le rouge d'Attaque (constatée pendant l'exécution du plan,
  Task 9) n'a été consignée que dans le registre SDD, jamais dans `docs/ameliorations.md`, le
  registre que `CLAUDE.md` désigne pour les retours de jeu.
## Dette connue (jalon 2.5)

Constatée et arbitrée pendant l'exécution du plan du jalon 2.5. Aucun de ces points n'est
bloquant.

**Équilibrage**
- `combat.damageK` et `econ.rewardBase` vivaient tous les deux dans une zone chaotique du
  harnais de calibration — **l'intégration du jalon 2.5 dans le jalon 2b a honoré cette
  obligation de remesure**, précisément parce qu'elle changeait deux des conditions qui
  l'imposaient : la masse résolue vient désormais de quatre facteurs (châssis × modèle de
  Disque × talent Masse × masse propre) et le triangle des forces multiplie aussi les
  dégâts. Nouvelles références, mesurées à dix graines : `econ.rewardBase` **104**, choisie
  dans le premier palier démontré de ce projet (102–110, sept valeurs consécutives qui
  tiennent le garde-fou de la salle 10, contre un point unique auparavant) ; `combat.damageK`
  **1,3**, confirmée dans son propre palier (1,2–1,6). **L'obligation de remesure reste
  ouverte pour l'avenir** : si la physique de collision, le contenu de la salle 10,
  `arena.breach.ejectSpeed`, `boss.mass` ou le jeu de graines du harnais changent encore, les
  deux valeurs devront être vérifiées à nouveau — ne pas supposer qu'elles restent stables.
  Détail du balayage : `docs/superpowers/plans/2026-08-28-calibration-integration.md`.
- Tout l'équilibrage de ce jalon a été mesuré au harnais avec la politique `steerWithTerrain`
  (`scripts/calibrate.mjs`), dont la manœuvre distinctive — dépenser son budget de pilotage à
  se placer derrière la cible, du côté opposé à la brèche la plus proche, pour l'y pousser —
  ne paie presque jamais : **17 éjections de bot sur 1 209 bots détruits (1,4 %)**, et
  seulement **17 des 3 177 contacts de bord sortants (0,5 %)** franchissent le seuil de
  400 px/s, alors que 23 % de ces contacts ont lieu dans une brèche. La largeur de brèche
  n'est pas en cause — c'est le seuil de vitesse qui ferme la mécanique. Chaque nombre de ce
  jalon (`combat.damageK`, `econ.rewardBase`, `arena.shard.everyTicks`, …) a donc été réglé
  contre une politique dont le geste caractéristique réussit rarement. Non retouché ici : le
  harnais n'est pas à re-régler pour cette dette, seulement à garder à l'esprit en le lisant.
- Le boss est descendu de **87 s** (jalon 2.5 seul) à **64,8 s** après l'intégration et sa
  recalibration — effet de bord d'un joueur mieux équipé par l'économie recalibrée, pas d'un
  réglage de combat : `combat.damageK` n'a pas bougé pendant la passe combat. La cible du
  cahier des charges reste **~45 s** (spec § 3.1) et n'est toujours pas tenue, et **aucun
  bouton ouvert par cette intégration ne l'y amène** — le seul qui s'en approche, `damageK` à
  1,6, coûte six minutes de chapitre. Voir « Équilibrage du chapitre 1 » ci-dessus pour
  l'arbitrage d'origine, et `docs/superpowers/plans/2026-08-28-calibration-integration.md`
  pour le balayage complet.
- **L'éjection du boss est devenue atteignable pour une toupie lourde, et ne l'était pas
  avant l'intégration.** Mesuré au jalon 2.5, quand la masse du joueur valait encore 1 : il
  fallait ~615 px/s de vitesse de charge pour éjecter le boss (`arena.breach.ejectSpeed`
  400, `boss.mass` 3), hors de portée du plafond de pilotage (240, 384 sous accélérateur)
  même dans la géométrie la plus favorable — d'où 71 combats de boss sur 20 graines, zéro
  éjection (voir le critère d'acceptation du jalon 2.5 ci-dessus, corrigé en conséquence).
  Depuis l'intégration, `Top.mass` est la masse **résolue** du joueur (châssis × modèle de
  Disque × talent Masse), et ce seuil s'effondre avec elle : à masse résolue 2,6 (départ +
  Disque lourd type Gravité/Colosse + talent Masse), 331 px/s suffisent déjà — sous les
  384 px/s d'une zone accélérateur — et à 4,00 (+ Pointe Ressort), 269 px/s suffisent :
  au-dessus du plafond de base (240 px/s), mais sous les 312 px/s d'une Pointe Furie rang 11
  et sous les 384 d'une zone accélérateur. Ce n'est plus une impossibilité de conception, c'est
  une manœuvre exigeante : châssis et Disque lourds, zone accélérateur, boss adossé à une
  brèche. **Elle n'a jamais été mesurée en conditions de jeu, et le harnais ne l'exerce
  pas** : les 71 combats de boss sans éjection cités ci-dessus, comme ceux des passes de
  calibration de l'intégration, ont tous été joués par un autopilote qui ne construit pas de
  toupie lourde — ils ne prouvent donc rien sur un joueur qui le ferait exprès. La règle d'éjection elle-même n'est pas en cause : elle est uniforme
  et représente environ une mort de joueur sur dix sur le protocole du jalon 2.5. Mesurer
  cette manœuvre en conditions de jeu — ou doter le harnais d'un autopilote capable de la
  tenter — est le ressort d'une future passe, explicitement scopée — pas de ce jalon-ci.

**Tests**
- `ticksToFirstChest` (`scripts/calibrate.mjs`) n'a pas de test automatisé. C'est la mesure
  qui prouve la promesse phare du jalon (« un coffre ouvert en moins de deux minutes »), et
  elle ne vit que dans un script de calibration, jamais exercée par `npm run test`.
- La borne corrigée de la migration de sauvegarde (`env.v < 2` plutôt que
  `env.v < SAVE_SCHEMA`, `src/sim/save.ts`) est **inobservable**, pas non testée :
  `migrateInventoryV1` renvoie une pile v2 telle quelle dès que `typeof s.count !== 'number'`
  (`return raw`), donc l'ancienne borne fautive était déjà un no-op sur tout blob v2 bien
  formé — elle ne s'est jamais manifestée, et aucun test ne peut échouer pour ce défaut
  précis. Une entrée promettant un futur test ici promettrait quelque chose qui ne peut pas
  exister ; ne pas en écrire une.

**Née de l'intégration**
- **L'écart entre châssis atteint ×3,8** (Tigre Foudre : 19 runs médians ; Carapace Abyssale :
  5) pour une cible de ×2. Il se corrige par les profils de châssis — mais la spec
  d'intégration ferme explicitement cette porte (§ 6, « aucune décision de design du 2b
  rouverte »). À rouvrir dans une passe qui en aura le mandat.

  **Aggravation mesurée le 2026-09-02 : l'écart est passé de ×3,80 à ×10,80.** Relevé sur
  l'arbre où `main` vient d'être fusionné dans `jalon-3-lot-b`, dix graines, chapitre 1 :

  | châssis | type | descentes | temps | salle la plus meurtrière |
  |---|---|---|---|---|
  | Carapace Abyssale | défense | **10** | 0,25 h | salle 10, 27 morts |
  | Brasier Solaire | équilibre | 20 | 0,42 h | salle 10, 72 morts |
  | Typhon Primal | attaque | 81 | 1,25 h | salle 10, 180 morts |
  | Tigre Foudre | endurance | **108** | 2,07 h | salle 9, 338 morts |

  Détail à ne pas lire de travers : le garde-fou « la salle 10 reste la salle la plus
  meurtrière » se juge sur le châssis de mesure, et il tient dans les quatre chapitres. Mais
  Tigre Foudre, lui, meurt désormais surtout en salle 9 — il n'atteint plus la salle 10 assez
  souvent pour y mourir davantage. Cette passe n'a pas mesuré si c'était déjà le cas avant
  `fc827ee` ; c'est à vérifier par qui reprendra l'écart.

  Ce que ça veut dire pour un joueur, et c'est la seule formulation qui compte : **choisir
  Tigre Foudre plutôt que Carapace Abyssale fait jouer un jeu 10,8 fois plus long pour
  exactement le même contenu** — 108 descentes contre 10 pour valider le chapitre 1, 2,07 h
  contre 0,25 h. La cible affichée est « < ×2 ». Un choix de départ que le jeu présente comme
  cosmétique décide en réalité d'un ordre de grandeur de temps de jeu. Dans le même
  mouvement, la létalité de la salle 10 au chapitre 1 (châssis de mesure) monte de **70 % à
  88 % par tentative**.

  **La cause est `fc827ee`, pas le lot B.** Le commit « le contact se cherche sur le trajet du
  tick, plus sur son arrivée » récupère près d'un quart des collisions que la détection
  discrète ratait (97 chocs encaissés contre 78). Un quart de chocs en plus frappe d'abord
  ceux qui les encaissent mal, donc l'écart entre profils de châssis s'ouvre plus vite que la
  difficulté moyenne : le châssis de mesure s'allonge de +31 % (0,32 h → 0,42 h) quand Tigre
  Foudre passe des 19 descentes médianes citées plus haut à 108, soit ×5,7. Que ce soit
  `fc827ee` et rien d'autre est **mesuré, pas déduit** : le ×10,80 sort identique de `main`
  seul et de l'arbre fusionné, alors que le lot B ne touche à aucune constante de combat.

  **La dette du jalon 3, lot A, prévoyait exactement ce cas** — « si la physique de collision
  […] change encore, les cinq [constantes calibrées] doivent être revérifiées ». `fc827ee` est
  un changement de physique de collision. La clause est donc déclenchée, et c'est la première
  fois : voir la mise à jour de cette obligation dans « Dette connue (jalon 3, lot A) ».

  **Rien n'est corrigé ici, et c'est délibéré.** Refermer cet écart demande de toucher aux
  profils de châssis ou aux cinq constantes calibrées — une décision d'équilibrage qui revient
  à l'auteur du jeu, pas à la passe d'intégration qui a constaté le déplacement. Ce qui est
  livré ici est la mesure et l'alerte ; le mandat reste à donner.
- **Les identités d'arène des chapitres 2 à 8** : le jalon 2.5 a livré le système de terrain,
  pas les huit arènes qui l'utilisent. Les chapitres 1 à 4 sont devenus atteignables au
  jalon 3, lot A ; leurs identités de terrain (murs élastiques, piliers mobiles, geysers…)
  restent à poser dessus — c'est le lot C du même jalon. Les chapitres 5 à 8 restent hors de
  portée jusqu'au jalon 4.

## Dette connue (verrou du châssis, 2026-08-28)

Suite directe du jalon 2b : changer de toupie était gratuit et immédiat, donc on
contre-piochait salle par salle. Mesures, correctif et garde-fou :
`docs/ameliorations.md`, session du 2026-08-28.

**Résolu au jalon 3, lot A — il n'y a plus d'appel à oublier.** `startRun` absorbe
`createRun`, `resetRun` et `equipPendingToupie` : il lit `meta.toupies.active` **une seule
fois**, à l'ouverture de la descente, et aucun autre chemin de code du run ne le relit. La
direction qui manquait — l'appel *manquant* à la frontière du boss, que rien n'attrapait
automatiquement — n'existe plus, parce qu'il n'y a plus d'appel séparé à faire : la propriété
est portée par la signature de `startRun`, testée par mutation (§ 9.1 de la spec du lot A). Ce
qui reste vrai : `npm run verrou` (`scripts/verrou.mjs`) continue de couvrir le câblage de
l'interface — que le bouton « Nouvelle descente » appelle bien `startRun` avec le bon châssis
— et reste hors de `npm run test`, faute d'un `npm run dev` en marche et d'une minute de
navigateur qu'aucun test unitaire ne peut fournir.

**Résolu au jalon 3, lot A — et c'était trois sites, pas deux.** La dette n'en comptait que
deux ; le troisième, `before.salle === 10 && after.salle === 1` dans `src/render/observer.ts`,
avait échappé au diagnostic. Les trois sont partis, remplacés par `RunReward.boss` — porté par
la récompense elle-même plutôt que dérivé par chaque appelant. Le troisième site alimentait
`RenderEvents.chapterValidated` (dette du jalon 2a, « produit et consommé par personne ») : ce
champ ne devenait pas seulement inutile, il devenait **faux**, puisque la salle ne revient
plus à 1 après le boss — il est supprimé plutôt que corrigé.

## Dette connue (jalon 3, lot A)

Constatée pendant les deux passes de calibration
(`docs/superpowers/plans/2026-09-01-calibration-chapitres.md`) et la revue de branche. Aucun
de ces points n'est bloquant.

**Équilibrage**
- **Le mur a atterri au chapitre 4, pas au chapitre 3.** La décision 5 de la spec demandait
  « ch.3 nettement plus coûteux » ; la mesure donne ch. 2 à +0,15 h et ch. 3 à +0,10 h — le
  chapitre 3 est *moins cher* que le 2 — pendant que le chapitre 4 est à +0,36 h. La spec se
  contredisait déjà elle-même sur ce point : sa section `botTypes` (§ 5) argumente que le
  chapitre 4, où la contre-pioche cesse de suffire, est « le bon endroit pour que le mur
  cesse d'être négociable autrement qu'en pilotant et en s'équipant ». La
  mesure a tranché en faveur du chapitre 4. La cible « chapitre 3 nettement plus coûteux » est
  structurellement hors de portée de `rewardPerChapter` seul : la seule valeur du balayage qui
  la produit (1,19) avait ses deux voisines qui inversaient la marche et une marge d'une seule
  mort au chapitre 4 — exactement la forme du piège qu'avait laissé `rewardBase = 86`.
- **La « salle la plus meurtrière » du harnais reste un décompte absolu.** Pour un chapitre
  que certaines graines ne valident jamais, elle mesure la longueur de l'entonnoir plutôt que
  la difficulté des salles. Les deux lectures sont désormais imprimées côte à côte
  (`scripts/calibrate.mjs`), et le verdict reste délibérément sur le décompte absolu —
  changer de statistique pour obtenir un verdict plus favorable est ce que ce projet
  s'interdit.
- **L'obligation de remesure s'étend désormais à cinq constantes.** `combat.damageK` et
  `econ.rewardBase` la portaient déjà (dette du jalon 2.5) ; `bot.scaling.spinPerChapter`,
  `bot.scaling.attackPerChapter` et `econ.rewardPerChapter` la rejoignent : si la physique de
  collision, le contenu de la salle 10, `arena.breach.ejectSpeed`, `boss.mass` ou le jeu de
  graines du harnais changent encore, les cinq doivent être revérifiées.

  **Mise à jour (2026-09-02) : la clause s'est déclenchée, pour la première fois.** `fc827ee`
  change la physique de collision — le contact se cherche sur le trajet du tick au lieu des
  seules positions d'arrivée — et déplace les quatre chapitres avec elle (chapitre 1 : 0,32 h
  en 9 descentes → 0,42 h en 20). Les cinq constantes sont donc **dues à remesure**, et aucune
  ne l'a été : leurs paliers démontrés (`econ.rewardBase` dans 102–110, `combat.damageK` dans
  1,2–1,6, `econ.rewardPerChapter` dans `[1,13 ; 1,20]`, `bot.scaling.spinPerChapter` comme
  seul point intérieur de `[1,00 ; 1,20]`) ont tous été établis sous l'ancienne détection de
  contact, et un palier ne se transporte pas d'un modèle de combat à l'autre. C'est une passe
  d'équilibrage à part entière, avec son mandat et ses deux temps — combat puis économie,
  jamais dans le même commit — pas un correctif d'intégration.

**Interface**
- Rejouer son propre meilleur chapitre affiche encore « Le chapitre N+1 s'ouvre »
  (`CombatScreen.tsx`) : après le `Math.max` d'`applyRunReward`, une première validation et
  une redite à la frontière sont indistinguables à partir du seul `bestChapter`. Correctif
  d'une ligne : un état plutôt qu'un événement (« Le chapitre {N+1} t'attend. »).

**Tests et harnais**
- `scripts/calibrate.mjs` imprime `+-0.21 h` quand un coût marginal est négatif : le `+` du
  format d'affichage est codé en dur.
- `scripts/shots.mjs` injecte toujours un blob de sauvegarde en schéma 4 — correct
  fonctionnellement, ça exerce la migration à chaque capture d'écran, mais ce n'est plus le
  schéma courant.
- La queue de `runTicksThroughSalles` (`src/sim/sim.test.ts`) est désormais inerte : le boss
  fermant le run, les ticks au-delà de la salle 10 ne calculent plus rien.
- Le second des deux tests de facteur de chapitre dans `src/sim/salle.test.ts` ne tue pas la
  mutation de l'exposant `chapter - 1` → `chapter` ; son voisin la tue.

**Le modèle du harnais de calibration — constat de fond, antérieur à ce lot**
- `scripts/calibrate.mjs` **n'équipe jamais une pièce tirée et n'appelle jamais la fusion.**
  Il n'importe ni fonction d'équipement ni `tryFuse` : les pièces des coffres entrent à
  l'inventaire par `addPiece` et y restent, et la seule montée en puissance passe par
  `tryUpgrade`, c'est-à-dire les niveaux achetés en crédits sur les quatre pièces de départ.
  Le modèle mesure donc un joueur pour qui **acheter un coffre est une perte sèche**. Prouvé
  et non supposé : neutraliser `openLoot` ne déplace que la ligne du premier coffre
  (0,00 → 0,04 h) et laisse les quatre chapitres au chiffre près.
  Conséquence : ces mesures ne peuvent pas détecter un changement d'équilibrage des coffres
  ou de la fusion, et les décisions prises contre elles sur ce terrain — dont
  « `chests.bronze.price` effondré pour ne plus concurrencer les améliorations » — reposent
  sur un joueur qui ne tire aucun bénéfice de ce qu'il achète. **Le lot B a extrait
  `steerWithTerrain` du harnais sans toucher à ce défaut** — le corriger aurait déplacé tous
  les chiffres au moment précis où ils servaient d'étalon pour prouver que l'extraction était
  neutre. Toujours ouverte : voir « Dette connue (jalon 3, lot B) » en bas de page.
- Deux pannes muettes du même harnais, découvertes à l'intégration et réparées : il appelait
  `grantChest` et `Toupie.label`, tous deux supprimés par la refonte des coffres et le
  multilangue. `npm run calibrate` était donc **mort sur `main`** depuis ces jalons sans que
  rien ne le signale — il n'entre pas dans `npm run test`. Un test de fumée qui se contente
  de lancer une graine sur un chapitre le dirait ; il n'existe pas.

## Dette connue (jalon 3, lot B)

Constatée pendant l'exécution du plan du jalon 3, lot B
(`docs/superpowers/plans/2026-09-01-jalon-3-lot-b-farm.md`) et sa revue de branche. Aucun de
ces points n'est bloquant.

**Calibration**
- **Le modèle du harnais de calibration reste faux, et ce lot l'a laissé sciemment.**
  `scripts/calibrate.mjs` n'équipe toujours jamais une pièce tirée et n'appelle toujours
  jamais la fusion (dette héritée du jalon 3, lot A, ci-dessus). Le corriger aurait déplacé
  tous les chiffres au moment précis où ils servaient d'étalon pour prouver que l'extraction
  de `steerWithTerrain` vers `src/sim/autopilot.ts` était neutre — un harnais qui change de
  comportement pendant qu'on vérifie qu'il n'a pas changé ne prouve plus rien sur l'extraction
  elle-même. À rouvrir dans son propre lot, comme le promettait déjà la dette du jalon 3, lot
  A — la promesse n'a pas encore été tenue.

**Jeu**
- **Le décor AUTO ne correspond pas, salle pour salle, à ce que `farm()` crédite.** Le décor
  affiché est une descente libre, pilotée par le même autopilote et sur le même méta que le
  joueur, mais dont les récompenses tombent dans un clone jetable ; la session créditée par
  `farm()` en parallèle ne vide pas forcément les mêmes salles au même rythme. Le crédit,
  lui, est exact — c'est ce qui compte pour le pilier « fermer
  l'app ou la laisser ouverte rapporte pareil ». Choix assumé (spec § 5.1), pas un oubli : la
  cadence des paquets n'a aucune conséquence sur les gains, seulement sur le confort visuel du
  décor. À rouvrir si un test joueur montre que l'écart entre ce qui s'affiche et ce qui se
  gagne se remarque.

**Tests**
- **Un test du pilier ne peut pas rougir sous une mutation.** « le farm ne fait jamais monter
  `bestChapter` » est une tautologie — `Math.max(n, n) = n`, puisque le farm joue justement
  `bestChapter` — et rien ne peut la faire échouer par construction. La mutation qui compte
  vraiment, ouvrir le farm sur `maxPlayableChapter` (le chapitre suivant, non validé), est
  tuée par deux autres tests, dont un ajouté pour cela pendant la vérification par mutation du
  § 8.1 de la spec. Le test tautologique est conservé comme garde-fou de non-régression, pas
  comme preuve du pilier — la distinction méritait d'être écrite plutôt que de rester
  implicite dans le code.
- `src/storage/localSave.ts` n'a toujours aucun test unitaire, `absenceSeconds` compris. Ce
  n'est pas une régression de ce lot : ce répertoire n'avait déjà aucun test avant qu'il n'y
  touche.

**Interface**
- `format.hour` est une clé i18n à usage unique, là où les clés voisines (`absence.duration`,
  …) portent leur unité dans le gabarit de phrase plutôt que dans une clé séparée. À replier
  dans son consommateur si aucun second usage n'apparaît.
