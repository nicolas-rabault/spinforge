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
  (240, 384 sous accélérateur). Mesuré : 71 combats de boss sur 20 graines, 8 h simulées,
  **zéro éjection**. C'est `combat.damageK` qui a fait chuter le boss de 183 s à 87,1 s, pas
  l'éjection (voir « Équilibrage du chapitre 1 » ci-dessous). Rouvrir ce couple de valeurs
  pour rendre l'éjection du boss atteignable est le ressort d'une future passe combat,
  explicitement scopée — pas de ce jalon-ci ;
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

Farm hors-ligne plafonné (4 h) par fast-forward de ticks + formule fermée, écran « Pendant ton absence », mode AUTO sur chapitres validés (jamais de progression), murs calibrés, chapitres 1-4 avec gimmicks, atout temporaire par salle, quêtes quotidiennes, sauvegarde IndexedDB + export.

**Critères** : fermer l'app 1 h ⇒ gains exacts et plafonnés ; l'AUTO ne franchit jamais une salle non validée (testé).

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
- `chapterValidated` n'est jamais remis à zéro. **Voulu** — le pilier « l'AUTO rejoue le
  meilleur chapitre *jamais* validé » l'exige. À couvrir par un test au jalon 3.
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
  `resetRun` mute l'état hors du cycle `beforeTick`/`afterTick`/`draw`, donc la prochaine
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
non de la charge d'arène, donc la mesure ne devrait pas se dégrader d'ici là. Deux suspects
sont déjà nommés plus haut dans cette section — la texture du sol régénérée à chaque pixel
de redimensionnement, et la porte retracée en `Graphics` à chaque image. À reprendre au
jalon 3, quand le farm AUTO fera tourner l'arène en continu et rendra la queue visible.

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
- `RenderEvents.chapterValidated` est produit et consommé par personne — dette antérieure
  au jalon 2a, toujours vraie.
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
- Les tables de types des chapitres 2 à 8 sont absentes de `botTypes`
  (`src/content/balance.json`) : ces chapitres n'existent pas encore (jalons 3 et 4). Un
  chapitre sans entrée retombe sur celle du chapitre 1 (`botTypeFor`, `src/sim/salle.ts:14`),
  ce qui laisse la simulation valide entre-temps.
- `chapterGroups(1)` code le chapitre 1 en dur au lieu de lire `runRef.current.chapter`
  (`src/ui/ToupiesScreen.tsx:75`). Équivalent aujourd'hui — un seul chapitre existe — faux dès
  que le jalon 3 ouvre le chapitre 2.
- `viewFor` mémorise ses vues par `bot-{salle}-{index}` sans le chapitre
  (`src/render/arena.ts:107`, id posé par `src/sim/salle.ts:26`). Une vue peut survivre ~1 s à
  la mort de son bot ; au chapitre 2, un `bot-1-0` recréé dans cette fenêtre reprendrait la
  teinte de type du chapitre 1. Inatteignable aujourd'hui (`createRun` fixe `chapter: 1`), à
  corriger avec le point précédent.

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
- L'éjection ne tue pas le boss aux valeurs actuelles (`arena.breach.ejectSpeed` 400,
  `boss.mass` 3) : il faudrait ~615 px/s de vitesse de charge pour l'éjecter, hors de portée
  du plafond de pilotage du joueur (240, 384 sous accélérateur) même dans la géométrie la
  plus favorable. Mesuré : 71 combats de boss sur 20 graines, zéro éjection — voir le
  critère d'acceptation du jalon 2.5 ci-dessus, corrigé en conséquence. La règle d'éjection
  elle-même n'est pas en cause : elle est uniforme et représente environ une mort de joueur
  sur dix sur ce protocole. Rendre le boss réellement éjectable est le ressort d'une future
  passe combat, explicitement scopée — pas de ce jalon-ci.

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
- **Les identités d'arène des chapitres 2 à 8** : le jalon 2.5 a livré le système de terrain,
  pas les huit arènes qui l'utilisent. Inatteignables tant que l'enchaînement des chapitres
  n'existe pas (jalon 3).
