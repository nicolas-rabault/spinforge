# SpinForge — Spécification de game design

> Version texte de référence pour le développement. Le canvas visuel (source des décisions, à jour au 2026-08-24) est publié sur https://claude.ai/code/artifact/c1a8bbd5-4ab4-406d-8a2f-44dab59bd99f et ses fichiers de travail vivent dans `design/`.

## Pitch & piliers

SpinForge croise le **run piloté** d'Archero (on dirige sa toupie salle après salle) et la **boucle des idle games** (farm hors-ligne, coffres, fusion, prestige). Progression infinie, pas de niveau maximum.

Piliers non négociables :
1. **La progression des chapitres est 100 % active** — on n'avance qu'en pilotant.
2. **L'AUTO farme, il ne progresse jamais** — le mode AUTO (débloqué dès le premier chapitre validé, même condition que le hors-ligne) et le farm hors-ligne rejouent le meilleur chapitre jamais validé.
3. ~60 % des **revenus** viennent de l'idle, le jeu actif paie mieux à la minute.
4. Le mur n'est jamais un bug, c'est le produit — sorties : fusionner, améliorer ses pièces, ou déclencher une Refonte.

## Combat & pilotage

- La « vie » d'une toupie est sa **rotation** (spin). Elle décroît lentement avec le temps (endurance) et chute sous les chocs ; à 0 la toupie s'arrête.
- **Pilotage** : glisser le doigt n'importe où = direction visée (joystick virtuel relatif au point de contact, zone morte 8 px) ; la toupie accélère dans cette direction ; relâcher = elle file sur sa lancée avec friction.
- Dégâts d'un choc : proportionnels à la vitesse relative d'impact, modulés par `attaque de l'attaquant / (attaque + défense du défenseur)`. Les deux perdent du spin, le défenseur davantage si son ratio est défavorable.
- **Partage de charge** : la vitesse relative d'impact est la somme exacte des deux vitesses de fermeture, et les dégâts se répartissent selon la part que chacun a lui-même provoquée. Un assaut pur inflige ×1,3 et encaisse ×0,7 (`CHARGE_BONUS`) ; un choc frontal, où les deux avancent autant, reste rigoureusement symétrique. **Sans cette règle le pilotage ne sert à rien** : mesuré à l'autopilote, un joueur qui ne touchait jamais l'écran validait le chapitre 1 aussi vite qu'un joueur qui charge. Voir `docs/ameliorations.md`.
- **Durée cible du combat de boss (salle 10, chapitre 1) : ~45 s**, repère de cahier des
  charges (jalon 1.5). Pas atteinte par une chute continue depuis 183 s au lancement (87 s au
  jalon 2.5, 64,8 s après l'intégration du jalon 2b) : `fc827ee` seul, sans qu'aucune constante
  de combat n'ait bougé, avait déjà fait chuter le boss **sous** la cible, à ~36,8-37,6 s à
  quarante graines — un boss expédié. La remesure des cinq constantes du 2026-09-02 a ensuite
  déplacé `combat.damageK` de 1,30 à 1,10, ce qui **rallonge** le combat à **46,40 s**, à 1,4 s
  de la cible : un dépassement corrigé, tenue pour la première fois. Historique complet :
  « Dette connue (jalon 2.5) », `docs/roadmap.md`.
- **Types** : Attaque > Endurance > Défense > Attaque. Le type dominant inflige **+25 %**.
  La règle est **symétrique** — un bot dont le type domine celui du joueur frappe plus fort
  lui aussi, et c'est ce qui fait de la contre-pioche une décision. **Équilibre est hors du
  triangle** : il inflige +10 % à tout le monde et, surtout, il n'est le type dominé de
  personne — il ne subit jamais le +25 %. Le facteur de type se **compose** avec le partage
  de charge et les talents : il ne les remplace pas. Le type est porté par le **châssis** de
  la toupie, qui n'est pas un cinquième emplacement — toutes les pièces restent
  interchangeables entre châssis. Le type des bots est fixé par chapitre et par salle.
  **Le châssis est figé pour la descente** : on le choisit avant de partir, et il ne
  change qu'à la mort ou au boss vaincu — une descente des dix salles = un run. Les
  pièces, elles, continuent de prendre effet dans la seconde. Sans ce verrou, un
  joueur qui possède plusieurs toupies rebascule à chaque salle pour être toujours du
  bon côté du triangle, et la contre-pioche cesse d'être un pari sur la composition
  d'un chapitre : elle devient une routine sans coût. Mesuré sur le build fusionné
  (dix graines, politique terrain) : contre-piocher à chaque salle valide le chapitre 1
  en **0,19 h**, contre **0,29 h** pour le meilleur châssis tenu du début à la fin —
  **~34 % de temps en moins**. Le cas n'apparaît qu'**après** la validation du
  chapitre 1, faute d'une deuxième toupie avant. Détail : `docs/ameliorations.md`.
  Certaines Lames tournent à gauche (chocs frontaux amplifiés contre rotation droite) —
  Saison 1, jalon 4.
- **Répulsion** (jalon 2.5) : un choc rend plus d'énergie qu'il n'absorbe (`restitution` 1,6) — la rotation est le réservoir d'énergie du monde du jeu, chaque contact en convertit une part en recul. Le plafond de vitesse ne borne plus que le **pilotage** : un joueur ne dépasse jamais sa vitesse de Pointe par son seul doigt, mais le recul d'un choc peut le franchir — il retombe au plafond ordinaire en une poignée de ticks (amortissement de surcharge), assez pour se voir clairement « envoyé valser ». Voir `docs/ameliorations.md` pour la panne que cette règle a corrigée : sans elle, la répulsion existait dans le calcul mais n'était jamais parcourue.
- **Brèches et éjection** (jalon 2.5) : le bord de l'arène porte des secteurs mortels. Y être poussé — vitesse sortante au-dessus d'un seuil, dans le secteur — élimine la toupie au même titre qu'un spin tombé à 0. Deux brèches par salle, réparties régulièrement : il reste toujours un secteur de bord plein assez large pour s'y adosser, une éjection est donc toujours évitable. La règle est uniforme, le boss n'en est pas exempté. Mesuré au jalon 2.5, quand la masse du joueur valait encore 1 : au seuil d'éjection en vigueur (400 px/s), il fallait ~615 px/s de vitesse de charge même dans la géométrie la plus favorable qui soit (boss immobile, exactement au bord, charge parfaitement radiale) — bien au-delà du plafond de pilotage du joueur (240, 384 sous accélérateur), donc hors de portée : 71 combats de boss sur 20 graines, zéro éjection. **Ce chiffre est périmé.** Depuis l'intégration du jalon 2b, `Top.mass` est la masse **résolue** du joueur (châssis × modèle de Disque × talent Masse), et ce seuil s'effondre avec elle : à masse résolue 2,6 (départ + Disque lourd type Gravité/Colosse + talent Masse), 331 px/s suffisent — sous les 384 px/s d'une zone accélérateur. **L'éjection du boss est donc devenue atteignable pour une toupie lourde**, et ne l'était pas avant l'intégration : ce n'est plus une impossibilité de conception, c'est une manœuvre exigeante — châssis et Disque lourds, zone accélérateur, boss adossé à une brèche. Elle n'a jamais été mesurée en conditions de jeu. Détail historique (jalon 2.5) : `docs/ameliorations.md`. Chiffres à jour et dette : jalon 2.5 dans `docs/roadmap.md`.
- **Zones au sol** (jalon 2.5) : trois types de disques posés sur le terrain d'une salle, qui se composent quand ils se recouvrent — accélérateur (vitesse et accélération relevées), pointes (perte de spin continue, y compris pendant une pause d'endurance : ce sont des dégâts, pas de l'endurance), plaque glissante (friction quasi nulle — bon pour foncer, mortel près d'une brèche).
- **Éclat de Gyre** (jalon 2.5) : apparaît périodiquement sur le terrain, entre 15 % et 70 % du rayon de l'arène. Le premier à le toucher — joueur ou bot — récupère 18 % de son spin maximal ; sans preneur, il s'efface après un délai. Dispute directe entre joueur et bots : le prendre, ou empêcher l'adversaire de le prendre — la répulsion devient ainsi un outil offensif autant que défensif.

## Structure : chapitres & salles

- Un chapitre = **10 salles, la 10ᵉ est le boss**. Vider la salle ouvre la porte vers la suivante.
- Chaque salle franchie offre un **choix d'atout temporaire** (jalon 3) et rapporte des crédits.
- Nombre de bots par salle : salles 1-3 → 1, salles 4-6 → 2, salles 7-9 → 3, salle 10 → 1 boss (spin ×4, attaque ×1,5, rayon supérieur).
- **Terrain** (jalon 2.5) : chaque salle porte un gabarit d'arène tiré du RNG du run — zones au sol dès la salle 1 (le premier objet de terrain rencontré est toujours un bonus, jamais une punition), brèches au bord à partir de la salle 3, quand le pilotage est acquis. Le gabarit s'enrichit par paliers jusqu'à la salle 10. Les chapitres 1 à 4 sont atteignables depuis le jalon 3, lot A, mais partagent aujourd'hui le même gabarit — leurs identités propres (voir § 8 arènes-chapitres) restent à poser dessus, c'est le lot C du même jalon.
- Mort du joueur → **fin du run** (`RunState.phase` passe à `'dead'`), crédits conservés ; le même voile plein écran qu'à la victoire (ci-dessous) s'affiche, avec le même choix de chapitre — présélectionné sur le chapitre perdu, mais tout chapitre débloqué reste choisissable.
- Valider la salle 10 = chapitre validé, **le run se ferme** (`RunState.phase` passe à `'won'`) → chapitre suivant débloqué et éligible au farm. La descente suivante se choisit sur l'écran de combat, entre 1 et `min(bestChapter + 1, 4)` — plus d'enchaînement automatique en salle 1 du chapitre suivant (jalon 3, lot A ; avant ce lot, le boss vaincu remettait `run.salle` à 1 et relançait aussitôt, sans frontière de run).

## Pièces & stats

Une toupie = 4 emplacements. **Lame + Noyau sont signature** d'une toupie ; **Disques + Pointes sont génériques**.

| Pièce | Stat portée | Effet par niveau |
|---|---|---|
| Lame | attaque | ×(1 + 0,10 × niveau) |
| Disque | défense | ×(1 + 0,10 × niveau) |
| Pointe | vitesse max / décroissance du spin | vitesse ×(1 + 0,04 × niv), décroissance ÷(1 + 0,05 × niv) |
| Noyau | spin max (+ capacité signature, jalon 2+) | spin max ×(1 + 0,08 × niveau) |

Chaque pièce progresse sur deux axes infinis : **niveau** (crédits/fragments) et **rareté** (fusion).

> **La Pointe est le seul emplacement à double rendement.** Son rang multiplie la vitesse
> **et** divise la décroissance, `1,08^(rang−1)` sur les deux axes — là où la Lame, le Disque
> et le Noyau n'achètent qu'une stat par rang. C'est délibéré : la Pointe est le créneau
> mobilité + survie. À Légende (rang 11), une Pointe de niveau 0 porte à la fois la vitesse
> de 240 à 518 et la décroissance de 20 à 9,26.

## Économie

**Monnaies** : Crédits (soft — salles, farm, quêtes → niveaux de pièces, coffre Bronze) · Gemmes (premium — boss, quêtes → coffres Arène/Mythique) · Fragments (démantèlement → hauts paliers de niveau) · Étoiles de Refonte (prestige → arbre d'atouts, jamais réinitialisées).

**Courbes** :
- `coût(niveau) = 100 × 1,08^niveau`
- `revenu(salle, chapitre) = 104 × 1,13^(salle−1) × 1,15^(chapitre−1)` par salle vidée ; boss ×10. (Calibré par mesure, à chaque fois sur la seule base : **120 → 70** au jalon 1.5, quand le partage de charge a rendu le pilotage bien plus efficace — à 120 le chapitre tombait à 1,43 h ; **70 → 60** au jalon 2b, quand le triangle des forces a donné à Équilibre un +10 % de dégâts qu'elle n'encaisse jamais en retour — à 70 le chapitre tombait à 1,66 h ; **70 → 86** au jalon 2.5, avec le terrain et le butin de salle — chapitre 1 à ~10 runs / 0,35 h ; **86 → 104** à l'intégration des deux jalons, où la masse du châssis et le triangle des forces changent tous deux l'impact des chocs — chapitre 1 à 9 runs / 0,32 h. 86 était un pic isolé : ses deux voisines, 84 et 88, cassaient le pilier « la salle 10 reste la salle la plus meurtrière » ; 104 est choisie depuis un palier démontré (102–110). **104, confirmée sans changement** le 2026-09-02 : `fc827ee` (« le contact se cherche sur le trajet du tick, plus sur son arrivée ») a de nouveau changé la physique de collision, déclenchant une remesure des cinq constantes calibrées du projet — `rewardBase` en ressort inchangée, dans un palier redémontré à quarante graines, `[90 ; 116]`. L'économie commande la durée, le combat commande la forme de la difficulté : c'est pourquoi seule cette constante bouge. Historique complet : `docs/roadmap.md`.)

  **`rewardPerChapter`** rejoint la formule au jalon 3, lot A : **1,25** (valeur provisoire posée au jalon 2, jamais mesurée) → **1,15**, choisie dans le palier démontré `[1,13 ; 1,20]` — huit valeurs consécutives qui valident les quatre chapitres 10/10 sans faire bouger le chapitre 1 (son exposant y vaut 0). Le signe compte plus que la valeur : en dessous de 1,0 le garde-fou « la salle 10 reste la plus meurtrière » tenait sur une bande plus large et plus propre (0,60–1,00, neuf valeurs consécutives sans un seul trou), mais un facteur `< 1` fait payer *moins* une salle d'un chapitre *plus dur* — l'inverse exact de la raison d'être du bouton : le farm hors-ligne (lot B) est verrouillé sur le meilleur chapitre validé, donc progresser ferait baisser le revenu hors-ligne. Domaine retenu : `> 1,0`, en dépit de la mesure. Balayage complet (33 valeurs, dix graines) : `docs/superpowers/plans/2026-09-01-calibration-chapitres.md`. **Confirmée à 1,15** par la remesure des cinq constantes du 2026-09-02, sous la physique de `fc827ee` et à quarante graines — la contrainte de signe n'a pas été rouverte : `0,90` et `1,00` restent hors mandat tant que le farm hors-ligne (lot B) reste verrouillé sur le meilleur chapitre validé. Détail : `docs/superpowers/plans/2026-09-02-calibration-remesure.md`.

  **Difficulté par chapitre** (`bot.scaling.spinPerChapter`, `bot.scaling.attackPerChapter`, jalon 3 lot A) : `spinScale = (1 + spinPerSalle × (salle−1)) × spinPerChapter^(chapitre−1)`, même forme pour l'attaque — linéaire par salle, géométrique par chapitre, le boss gardant ses multiplicateurs par-dessus. Provisoires depuis la tâche 6 (1,2 et 1,1, jamais mesurées), calibrées dans leur propre passe, avant l'économie. **Retenues au jalon 3, lot A** (dix graines) : `spinPerChapter` **1,02** — alors présenté comme le seul point intérieur du palier `[1,00 ; 1,20]` qui produisait la marche « chapitre 3 plus coûteux que le 2 » demandée par la spec — et `attackPerChapter` **1,10** : le seul des trois axes balayés dont la colonne entière tenait le garde-fou sans un trou. **Cette marche n'avait pas survécu au lot** : le balayage du combat tournait avec le facteur de revenu figé à sa valeur provisoire de 1,25, et la passe d'économie qui a suivi l'a porté à 1,15, ce qui l'a aplatie — la mesure du lot donnait alors le chapitre 2 à +0,15 h et le chapitre 3 à +0,10 h, donc *moins* cher que le 2. **Mesure négative marquante** : au plancher `1,00 / 1,00`, où les bots du chapitre 4 sont bit à bit identiques à ceux du chapitre 1, le chapitre 4 restait un mur — salle 1 vidée 2 881 fois contre 51 au chapitre 3. Ces deux facteurs ne peuvent pas réparer le chapitre 4 ; sa difficulté vient de sa composition de types (`botTypes["4"]`), pas du facteur géométrique. Détail : `docs/superpowers/plans/2026-09-01-calibration-chapitres.md`.

  **Remesurées le 2026-09-02, sous `fc827ee` et à quarante graines.** `spinPerChapter`
  **1,02 → 1,05** ; `attackPerChapter` confirmée **1,10**. La justification d'origine de 1,02
  reposait sur un relevé à dix graines dont la remesure a établi qu'il n'était pas assez précis
  pour départager une forme de courbe (§ 3 de la spec de la remesure) — elle est **supersédée**,
  pas invalidée. Vérifiée sur trois jeux de graines disjoints, 1,02 ne tient pas la cible
  « chapitre 4 le plus cher » de façon robuste — il en devient le moins cher sur un jeu de
  graines disjoint sur trois — alors que 1,05 la tient sans exception sur les trois. **Le mur
  est de retour, confirmé à quarante graines** : aux valeurs désormais retenues, le chapitre 4
  est de nouveau le marginal le plus cher — +0,21 h contre +0,12 h (ch. 2) et +0,15 h (ch. 3),
  robuste sur trois jeux de graines disjoints ; les étendues des chapitres 2 et 3, elles, se
  recouvrent — la forme mesurée est « chapitre 2 ≈ chapitre 3 < chapitre 4 », pas une croissance
  stricte, et +0,12 contre +0,15 ne s'ordonnent pas de façon fiable entre eux. La marche
  « ch. 3 moins cher que ch. 2 » décrite ci-dessus appartient à un jeu de graines et une valeur
  de `spinPerChapter` qui n'existent plus dans le dépôt. Nouveau, mesuré par cette même passe :
  **le mur tient à deux constantes, aucune
  des deux ne suffit seule** — à `rewardPerChapter = 1,00` (point de diagnostic isolant la
  difficulté seule), la courbe de coût marginal est plate ; à `spinPerChapter = 1,02` (l'ancienne
  valeur), le mur n'est pas robuste. Deux points mesurés, pas une carte du domaine
  `spinPerChapter × rewardPerChapter`. Détail : « Dette connue (jalon 3, lot A) »,
  `docs/roadmap.md`, et `docs/superpowers/plans/2026-09-02-calibration-remesure.md`.

**Butin de salle — première source de pièces** (jalon 2.5). Chaque salle vidée lâche un coffre, sans rien acheter : c'est le robinet qui garantit qu'il y a toujours quelque chose à ouvrir. L'achat (coffres ci-dessous) reste le second robinet, celui qui pose un vrai arbitrage entre un coffre et une amélioration — l'un sans l'autre donne soit un distributeur passif, soit le mur qui bloquait le jeu avant ce jalon.

| Salle | Coffre lâché |
|---|---|
| 1 à 3 | Bronze |
| 4 à 9 | Bronze, + 20 % de chance d'un Arène |
| 10 (boss) | Arène garanti, + 15 % de chance d'un Mythique |

**Coffres** : Bronze (**250** crédits, ×10 : 2 250 — pièces Commun→Rare ; 2 000 avant le jalon 2.5, effondré pour ne plus concurrencer les améliorations, seul coffre acheté en crédits) · Arène (300 gemmes, ×10 : 2 680, 1 gratuit/4 h — Bon→Excellent, Excellent garanti au 10ᵉ) · Mythique (1 500 gemmes, ×10 : 13 500 — Excellent→Légende, Légende garantie au 30ᵉ). Arène et Mythique mêlent pièces génériques et **doublons signature** des toupies débloquées (seule source de fusion des Lames/Noyaux). Le butin de salle tire dans le **même vivier** que l'achat : les Lames et les Noyaux y restent **signature**, donc un coffre lâché par une salle ne rend jamais la pièce signature d'une toupie qu'on ne possède pas — un coffre de butin est un coffre. Aucun des deux jalons ne l'avait décidé, c'est une conséquence de leur rencontre à l'intégration. (En pratique ça ne mord qu'à partir de la salle 4, un Bronze ne tirant que Disque et Pointe.)

**Raretés (11 rangs puis infini)** : Commun → Bon → Rare → Excellent (+1, +2) → Épique (+1, +2, +3) → Légende → Légende+N (∞). Chaque rang franchi débloque un talent de pièce.

**Fusion** (base : 3 identiques → 1 rang au-dessus) :
| Palier franchi | Règle |
|---|---|
| Commun → Excellent | 3 identiques → rang supérieur |
| Excellent → Épique +3 | chaque palier : 2 identiques + 1 sacrifice du même emplacement |
| Épique +3 → Légende | 3 Épique +3 identiques |
| Légende +N | 2 Légende identiques (même emplacement, même +N) → +1, sans limite |

**Refonte (prestige)** : reset chapitres + niveaux de pièces + crédits ; conserve catalogue, raretés, gemmes, quêtes et la **référence de farm** (meilleur chapitre jamais validé). Gain : Étoiles = f(salle max), +2 % de revenus permanents/étoile + arbre d'atouts (plafond hors-ligne 12 h, auto-fusion, vitesse du farm AUTO ×3, second emplacement de toupie…).

**Hors-ligne** : farm automatique du meilleur chapitre jamais validé, dès le chapitre 1, plafond 4 h (extensible 12 h), survit à la Refonte. Écran « Pendant ton absence » au retour, un seul bouton, rien à acheter ni à regarder pour en récupérer le gain. **Ce jeu n'aura jamais de publicité** — décision tranchée par l'auteur, pas un report de contenu : à ne pas reproposer.

## Catalogue (univers original — voir règle IP)

**Lore** : à Gyrapolis, la météorite « Cœur Gyre » s'est écrasée au centre de la ville ; ses débris forgés en toupies tournent sans s'arrêter. Les quatre premières, les Fondateurs, ont donné naissance aux arènes de quartier.

**Saison 0 — Les Quatre Fondateurs** : Typhon Primal (Attaque), Brasier Solaire (Équilibre), Carapace Abyssale (Défense), Tigre Foudre (Endurance). En anglais : Primal Typhoon, Solar Blaze, Abyssal Carapace, Thunder Tiger — types Attack, Balance, Defense, Stamina.

**Saison 1 — La Génération Rafale (12)** : Sleipnir Azur, Hydre Écarlate, Ajax Vaillant, Drake Nocturne (rotation gauche), Wyrm Doré (rotation gauche), Estoc Royal, Rafale d'Émeraude, Molosse Stygien, Faucheur Pâle, Vouivre d'Ivoire, Phénix Cendré, Simorgh Vermeil. Détails (types, motifs, capacités) : planche Catalogue du canvas.

**Pièces génériques** : Disques — Lourd, Gravité, Éventail, Axial, Colosse, Météorite. Pointes — Plate, Aiguille, Orbitale, Gyroscope, Furie, Ressort. (Descriptifs fonctionnels, pas des marques.) En anglais : Discs — Heavy, Gravity, Fan, Axial, Colossus, Meteorite ; Tips — Flat, Needle, Orbital, Gyroscope, Fury, Spring.

**Lames et Noyaux signature** : Couronne Solaire, Croc de Tempête, Écaille Abyssale, Griffe Orageuse ; Fournaise, Œil du Cyclone, Caparaçon, Arc Électrique. En anglais : Solar Crown, Storm Fang, Abyssal Scale, Storm Claw ; Furnace, Cyclone Eye, Caparison, Electric Arc.

**Rangs** : Commun, Bon, Rare, Excellent (+1, +2), Épique (+1 à +3), Légende (+N à l'infini) — Common, Good, Rare, Excellent, Epic, Legend.

**Talents** : Estoc, Riposte, Percée, Ancrage, Frôlement, Masse, Glisse, Relance, Toupie folle, Réserve, Second souffle, Cœur Gyre — Thrust, Riposte, Breakthrough, Anchor, Graze, Mass, Glide, Relaunch, Wild Spin, Reserve, Second Wind, Gyre Heart.

**8 arènes-chapitres** : 1 Hangar Rouillé (aucun piège) · 2 Dojo Néon (murs élastiques) · 3 Marché Souterrain (piliers mobiles) · 4 Cratère de Magma (geysers) · 5 Temple sous la Glace (friction réduite) · 6 Jardin Suspendu (arène qui bascule) · 7 Station Orbitale (gravité réduite) · 8 Le Vortex (chapitre infini, modificateur toutes les 10 salles).

**Noms anglais des chapitres et de leurs boss** : 1 Rusted Hangar / Hangar Warden · 2 Neon Dojo / Neon Master · 3 Underground Market / Pillar Elder · 4 Magma Crater / Crater Smith · 5 Temple Beneath the Ice / Frost Watcher · 6 Hanging Garden / Hanging Sentinel · 7 Orbital Station / Orbital Pilot · 8 The Vortex / Vortex Core. Boss français : Gardien du Hangar, Maître des Néons, Doyen des Piliers, Forgeron du Cratère, Veilleur de Givre, Sentinelle Suspendue, Pilote Orbital, Cœur du Vortex.

Les mots eux-mêmes vivent dans `src/i18n/fr.ts` et `src/i18n/en.ts` ; la Saison 1 devra arriver bilingue.

Le **système de terrain** (répulsion, brèches, zones au sol, éclat) est livré au jalon 2.5 et actif dès le chapitre 1. Les chapitres 1 à 4 sont atteignables depuis le jalon 3, lot A (`bestChapter`, § Structure) ; leurs identités par chapitre ci-dessus restent du contenu à poser sur ce même système de terrain — c'est le lot C du jalon 3. Les chapitres 5 à 8 restent hors de portée jusqu'au jalon 4.

## Règle IP

Beyblade est une IP Takara Tomy/Hasbro. **Aucun nom officiel** (toupies, personnages, produits) dans le jeu — les équivalences « (≈ …) » du canvas sont des références internes de design. Avant lancement store : recherche d'antériorité INPI/EUIPO sur « SpinForge » (classes 9, 28, 41).

## Stack technique

TypeScript strict + Vite. Cœur : simulation pure à tick fixe 100 ms, déterministe (RNG sérialisé), zéro dépendance rendu — le hors-ligne = fast-forward de ticks. Mesuré sur le lot farm : 1 h de jeu simulée coûte 50 ms, 4 h (le plafond) 136 ms, 12 h 389 ms — et le plafond n'est quasiment jamais simulé en entier, puisqu'au taux retenu de 20 % une absence de 4 h ne rejoue en pratique que ~48 min de contenu, pour ~28 ms. Une formule fermée au-delà d'1 h aurait donc acheté des millisecondes contre une approximation, un deuxième chemin de code et un deuxième jeu de tests à maintenir en synchronisation avec le premier : écartée. Rendu arène : PixiJS. UI : React. Nombres : `number` isolé dans `economy.ts` au jalon 1, migration `break_infinity.js` prévue quand les valeurs dépassent la précision. Sauvegarde : IndexedDB/localStorage + export. PWA puis Capacitor. Équilibrage en JSON statique versionné (à partir du jalon 2).
