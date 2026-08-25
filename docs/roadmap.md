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

## Jalon 2 — Le gacha

Coffres (Bronze/Arène/Mythique, pity 10/30), inventaire, fusion (règles complètes des 4 paliers), échelle de rareté à 11 rangs + Légende+N, talents de rang, les 4 toupies Fondateurs (châssis + Lame/Noyau signature), types et triangle des forces, équilibrage déplacé en JSON statique.

**Critères** : ouvrir des coffres, fusionner jusqu'à changer de rang, équiper des pièces qui changent le gameplay ; pity vérifiés par test.

## Jalon 3 — L'idle

Farm hors-ligne plafonné (4 h) par fast-forward de ticks + formule fermée, écran « Pendant ton absence », mode AUTO sur chapitres validés (jamais de progression), murs calibrés, chapitres 1-4 avec gimmicks, atout temporaire par salle, quêtes quotidiennes, sauvegarde IndexedDB + export.

**Critères** : fermer l'app 1 h ⇒ gains exacts et plafonnés ; l'AUTO ne franchit jamais une salle non validée (testé).

## Jalon 4 — Le long terme

Refonte + arbre d'atouts (référence de farm conservée), Génération Rafale (12 toupies), chapitres 5-8 dont le Vortex (chapitre infini), premier événement, PWA installable.

**Critères** : une Refonte accélère visiblement le cycle suivant ; le Vortex tourne sans fin avec modificateurs toutes les 10 salles.

---

## Dette connue (héritée du jalon 1)

Traité au jalon 1.5, sauf la dette de simulation ci-dessous, explicitement réservée au
jalon 2. Aucun de ces points n'était bloquant ; tous avaient été constatés et arbitrés
pendant la revue du jalon 1.

**Équilibrage du chapitre 1 — tranché au jalon 1.5.** Mesuré à l'autopilote (« fonce sur le bot le plus
proche » + achats gloutons, 5 seeds, médianes) : le chapitre 1 demandait ~124 runs, soit ~12 h. Réglage
retenu « MUR ~2 h » : seule l'économie bouge (`ECON.rewardBase` 20 → 120, `rewardGrowth` 1,12 → 1,13,
`bossRewardMult` 5 → 10), le combat et le boss restent intacts. Résultat : 21 runs, ~2 h 08, et le boss
demeure de loin la salle la plus meurtrière (8 morts contre 3 pour la suivante) — conformément au pilier
« le mur n'est jamais un bug, c'est le produit ». Le balayage a montré que les deux leviers sont
indépendants : l'économie commande la durée, `BOSS.spinMult` commande la forme de la difficulté.
Détail : `docs/superpowers/specs/2026-08-24-jalon-1-5-habillage-design.md` § 6.

**Simulation** (ne pas toucher avant le jalon 2)
- `salle.ts` code en dur le nombre de bots par palier (`1 + floor((salle-1)/3)`, plafond `3`) :
  seul manquement restant à la règle « tout l'équilibrage dans `config.ts` ». À reprendre avec
  le passage de l'équilibrage en JSON statique, déjà prévu au jalon 2.
- `Stats.accel` est un passe-plat : aucune pièce ne le modifie.
- `createInitialState` écrit trois fois la même valeur de spin initial.
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
- Le bourdon (oscillateur indexé sur le spin) se fige à sa dernière fréquence quand on
  passe sur l'onglet Forge : la boucle de jeu est en pause, `audio.setSpin()` n'est plus
  appelé, mais l'oscillateur continue de sonner à cette fréquence. À couper ou geler
  explicitement au changement d'onglet.
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
- `ForgeScreen` n'a pas de `minHeight: 0` sur son conteneur flex, contrairement à
  `CombatScreen`. Sans effet tant que son contenu tient à l'écran ; à surveiller si la
  liste d'améliorations s'allonge au jalon 2.
- `index.html` code `#0b0e13` en dur pour le fond de page, en doublon de `PALETTE.bg`,
  pour éviter un flash blanc avant que le script (et donc `theme.ts`) ne s'exécute.
  Techniquement nécessaire — le CSS s'applique avant tout JavaScript — mais le fichier ne
  porte aucun commentaire qui le rattache au thème pour la prochaine lecture.

**Tests**
- `lerp`, `takeSnapshot`, `snapshotById` (`src/render/snapshot.ts`) et `spinOmega`
  (`src/render/feel.ts`) n'ont pas de test dédié : fonctions pures triviales, non exigées
  par le plan du jalon 1.5, qui a concentré l'effort de test sur `observe()` — le cœur du
  game feel.
