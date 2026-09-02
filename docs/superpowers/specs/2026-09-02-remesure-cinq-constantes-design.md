# Remesure des cinq constantes après `fc827ee` — spécification de conception

> Spec de référence : `docs/game-design.md`. Dette qui déclenche cette passe :
> « Dette connue (jalon 3, lot A) » et « Née de l'intégration » (dette du jalon 2.5),
> `docs/roadmap.md`. Lot précédent : `docs/superpowers/specs/2026-09-01-jalon-3-lot-b-farm-design.md`.
> Ce document est une **passe d'équilibrage**, pas un lot de contenu : il ne livre aucune
> mécanique, seulement des nombres mesurés et l'instrument qui les mesure.

## État des lieux

`fc827ee` — « le contact se cherche sur le trajet du tick, plus sur son arrivée » — a changé
la physique de collision : la détection était discrète, une toupie rapide traversait sa cible,
et le commit récupère près d'un quart des collisions perdues (97 chocs encaissés contre 78).
Il a été fusionné dans `main` sans produire un seul conflit, et il a pourtant rendu fausse
toute la documentation d'équilibrage du dépôt.

La dette du jalon 3, lot A, avait prévu exactement ce cas : « si la physique de collision, le
contenu de la salle 10, `arena.breach.ejectSpeed`, `boss.mass` ou le jeu de graines du harnais
changent encore, les cinq [constantes calibrées] doivent être revérifiées ». La clause s'est
déclenchée pour la première fois, et aucune des cinq ne l'a été.

Les cinq, et ce que chacune porte :

| constante | valeur | rôle | portée |
|---|---|---|---|
| `combat.damageK` | 1,3 | facteur global des dégâts de choc | **tous** les chapitres, ch. 1 compris |
| `econ.rewardBase` | 104 | crédits d'une salle vidée | **tous** les chapitres, ch. 1 compris |
| `bot.scaling.spinPerChapter` | 1,02 | spin des bots, géométrique par chapitre | exposant 0 au ch. 1 → chapitres 2-4 seulement |
| `bot.scaling.attackPerChapter` | 1,10 | attaque des bots, géométrique par chapitre | idem |
| `econ.rewardPerChapter` | 1,15 | revenu, géométrique par chapitre | idem |

Deux d'entre elles déplacent le chapitre 1, donc **tous** les garde-fous du projet, l'écart
entre châssis compris. Les trois autres ne façonnent que la marche d'un chapitre au suivant.
Cette asymétrie commande l'ordre des balayages (§ 6).

## Ce que cette passe livre, en une phrase

Cinq constantes reposées sur des paliers démontrés **sous la physique actuelle**, mesurées
avec un instrument dont la précision a d'abord été mesurée elle-même — et le constat, non
négociable, que deux conclusions publiées du dépôt étaient du bruit de graines.

## 1 · Le mandat, et ses trois bornes

**Ce que la passe doit faire** : rétablir, pour chacune des cinq, un palier démontré sous la
détection de contact actuelle, en tenant les garde-fous durs du projet.

**Borne 1 — l'étalon du lot B n'est pas la cible.** 0,32 h / 9 descentes / ×3,80 a été mesuré
sur `764f220`, avant `fc827ee`. Il est périmé, il reste daté dans la spec du lot B et dans la
roadmap comme historique, et **aucune valeur de cette passe ne sera choisie pour s'en
rapprocher**. Un palier ne se transporte pas d'un modèle de combat à l'autre ; une cible non
plus.

**Borne 2 — les profils de châssis ne sont pas touchés.** L'écart entre châssis (×10,80 pour
une cible affichée de « < ×2 ») se refermerait en retouchant le bloc `chassis` de
`balance.json`. C'est un **sixième** bouton, et c'est une décision de design de personnage :
elle change ce que « jouer Tigre Foudre » veut dire. Arbitrage de l'auteur, rendu le
2026-09-02 : l'écart entre dans cette passe **comme critère de départage à l'intérieur d'un
palier démontré**, jamais comme un bouton. Le mandat sur les profils reste à donner.

**Borne 3 — jamais le combat et l'économie dans le même commit.** Ce projet l'a payé trois
fois. La règle est structurelle ici (§ 6), pas une intention.

## 2 · Ce que la ligne de base dit, et que le mandat ne disait pas

Relevé le 2026-09-02 sur `141f179`, dix graines, harnais inchangé — il reproduit au chiffre
près la ligne de base publiée dans la roadmap, ce qui vaut vérification de l'instrument avant
de s'en servir.

Trois constats qui n'étaient dans aucun document, et qui changent la passe :

**2.1 · La salle 10 du chapitre 1 dure 42,6 s — la cible ~45 s est tenue pour la première
fois.** Elle valait 87 s au jalon 2.5, 64,8 s après l'intégration, et la dette du jalon 2.5
écrivait qu'« aucun bouton ouvert par cette intégration ne l'y amène ». `fc827ee` l'y a
amenée sans le chercher. C'est un acquis qu'un balayage de `damageK` peut reperdre sans que
rien ne le signale : il devient un critère de départage (§ 4).

> Chiffre corrigé par le § 3 : **37,6 s**, et non 42,6. 42,6 est la valeur du jeu de dix
> graines du harnais actuel ; à quarante, le boss est encore plus court que ce que ce
> paragraphe annonce. Le constat s'en trouve renforcé, pas affaibli — mais la valeur à citer
> ailleurs est 37,6 s.

**2.2 · Il n'y a plus de mur du tout après le chapitre 1.** +0,42 h pour le chapitre 1, puis
+0,12 / +0,15 / +0,08 : les chapitres 2 à 4 **réunis** coûtent moins cher que le premier.

Attention à ce qui, dans cette phrase, survit au § 3 et à ce qui n'y survit pas. **L'ordre des
trois marges entre elles ne survit pas** — c'est du bruit, et le § 3 le démontre. **Le constat
d'ensemble, si** : à quarante graines les trois marges valent ~+0,10 h chacune pour un
chapitre 1 à ~0,37 h, donc les chapitres 2 à 4 réunis (~0,30 h) restent moins chers que le
premier, sur les quatre jeux disjoints. C'est un rapport de 3 à 1, très au-dessus du plancher
de ±0,02 h. **Le jeu n'a plus de mur après le chapitre 1, et ça, c'est mesuré.**

**2.3 · `npm run verrou` est rouge sur `main`, et ce n'est pas une régression du jeu.** Trois
vérifications en échec sur la passe 1 ; la descente n'atteint pas le boss dans son budget de
90 s de temps réel. **Mesuré, pas supposé** : à `BUDGET_MS=300000`, les dix vérifications
passent. Le budget avait été réglé quand le boss mourait plus vite ; `fc827ee` a rendu la
salle 10 nettement plus meurtrière (70 % → 88 % de létalité par tentative), et le pilote
grossier qui vit dans la page n'y arrive plus dans le temps imparti. C'est le troisième
harnais du projet mort en silence, après les deux pannes de `calibrate` trouvées à
l'intégration.

## 3 · La découverte qui change le protocole : ces colonnes-là sont du bruit

Avant de régler quoi que ce soit contre une mesure, cette passe a mesuré **la mesure**. Aucune
passe précédente ne l'avait fait : l'intégration était passée de cinq à dix graines par la
décision R9, sur le constat qu'un écart d'une mort ne devait pas décider — mais sans jamais
quantifier ce que dix graines achètent.

Protocole : `combat.damageK` figé à sa valeur actuelle, **seules les graines changent**.

**Cinq jeux disjoints de dix graines :**

| | jeu 1 | jeu 2 | jeu 3 | jeu 4 | jeu 5 |
|---|---|---|---|---|---|
| ch. 1 | 0,42 h · 20 | 0,42 · 22 | 0,42 · 22 | 0,36 · 18 | 0,43 · 23 |
| salle 10 ch. 1 | 42,6 s | 36,2 s | 40,4 s | 37,9 s | 38,4 s |
| écart châssis | ×10,80 | ×11,30 | ×11,67 | ×10,33 | ×11,78 |
| marges ch. 2/3/4 | +0,12/+0,15/+0,08 | +0,03/+0,12/+0,05 | +0,04/+0,20/+0,06 | +0,09/+0,16/+0,12 | +0,09/+0,04/+0,14 |
| garde-fou 1 | oui ×4 | oui ×4 | oui ×4 | oui ×4 | oui ×4 |

**Le coût marginal par chapitre est du bruit à dix graines.** Le chapitre 2 va de +0,03 à
+0,12 — un facteur quatre — sans qu'une seule constante ait bougé. La *forme* de la courbe
change à chaque tirage : croissante au jeu 4, en dents de scie au jeu 5, creusée au jeu 3.

**Trois conséquences, dont deux portent au-delà de cette passe.**

1. **La ligne de base post-`fc827ee` publiée dans la roadmap est, sur cette colonne, un
   tirage et non une mesure.** « ch. 3 redevient plus cher que ch. 2 (+0,15 contre +0,12) » et
   « ch. 4 devient le marginal le moins cher (+0,08) » décrivent le jeu 1 du tableau ci-dessus ;
   les jeux 2, 3, 4 et 5 donnent des ordonnancements différents, aux mêmes constantes. Le
   balayage économique du lot A a par ailleurs choisi `econ.rewardPerChapter = 1,15` dans un
   palier jugé sur des colonnes de cette nature.

   **Ce qu'on ne peut PAS en conclure, et qu'il faut se retenir d'écrire** : que « le mur a
   atterri au chapitre 4 » (dette du lot A) était faux. Cet écart-là — +0,36 h contre +0,10 —
   est d'une tout autre amplitude que le bruit mesuré ici (~±0,05 h à dix graines), et il a été
   relevé sous l'ancienne physique. Ce qu'on peut dire, et qui suffit : **il n'a jamais été
   confronté à une estimation de bruit**, parce qu'aucune n'existait, et il décrit un jeu qui
   n'existe plus. Cette passe le remplacera par une mesure qui, elle, connaît sa propre
   précision. Sur-affirmer ici serait commettre l'erreur que ce paragraphe dénonce.
2. **Le garde-fou dur, lui, est solide** : vingt verdicts de chapitre sur vingt identiques.
   Ce qui prime dans ce projet ne dépend pas des graines — c'est ce qui sauve les passes
   précédentes, et c'est la raison pour laquelle cette découverte n'invalide pas les valeurs
   retenues, seulement les justifications de forme qu'on a bâties par-dessus.
3. **L'écart entre châssis départage à l'échelle du facteur, jamais au centième — et ajouter
   des graines n'y change rien.** Son étendue entre jeux disjoints vaut 1,45 à dix graines,
   2,80 à quarante, 1,80 à quatre-vingts : elle ne décroît pas, contrairement à toutes les
   autres colonnes. La raison est dans sa définition — c'est un rapport entre deux **médianes
   de comptes entiers de descentes**, donc une grandeur discrète qui saute d'un cran entier
   quand la médiane bascule. Ce qui le sauve n'est pas sa précision mais son amplitude :
   `damageK` lui fait parcourir ×3,00 à ×45,57 (§ 6.1), soit un ordre de grandeur au-dessus de
   son propre bruit. Il tranche donc entre « ×3 » et « ×10 », jamais entre ×5,75 et ×6,63.

**Quarante graines transforment ces colonnes en signal.** Quatre jeux **disjoints** de
quarante, mêmes conditions :

| | jeu 1 | jeu 2 | jeu 3 | jeu 4 | étendue à 10 graines |
|---|---|---|---|---|---|
| marge ch. 2 | +0,06 | +0,09 | +0,08 | +0,12 | +0,03 → +0,12 |
| marge ch. 3 | +0,09 | +0,11 | +0,09 | +0,10 | +0,04 → **+0,20** |
| marge ch. 4 | +0,12 | +0,12 | +0,12 | +0,10 | +0,05 → +0,14 |
| ch. 1 | 0,40 h · 20 | 0,36 · 19 | 0,39 · 21 | 0,34 · 18 | 0,36 → 0,43 h |
| salle 10 ch. 1 | 37,1 s | 38,5 s | 37,6 s | 37,8 s | 36,2 → 42,6 s |
| écart châssis | ×10,33 | ×10,00 | ×8,00 | ×10,80 | ×10,33 → ×11,78 |

L'étendue du chapitre 3 passe de ±0,08 h à ±0,01, celle du boss de ±6,4 s à ±1,4 s.

**Et quatre-vingts graines ne rachètent plus rien** — trois jeux disjoints, mêmes conditions :

| étendue entre jeux disjoints | 10 graines | 40 graines | 80 graines |
|---|---|---|---|
| marge ch. 2 | 0,09 h | 0,06 h | 0,04 h |
| marge ch. 3 | **0,16 h** | 0,02 h | 0,04 h |
| marge ch. 4 | 0,09 h | 0,02 h | 0,03 h |
| ch. 1 | 0,07 h | 0,06 h | 0,02 h |
| salle 10 ch. 1 | 6,4 s | 1,4 s | 1,6 s |
| écart châssis | 1,45 | 2,80 | 1,80 |

Dix vers quarante divise l'étendue par huit sur la colonne la plus bruyante ; quarante vers
quatre-vingts ne la bouge plus. **Quarante est le palier**, et le coût — quatre fois une
mesure au lieu de huit — est payé une fois par point de balayage.

**Deux résultats en sortent, et le second est une règle de décision que cette passe n'avait
pas.**

- **La vraie courbe, aux valeurs actuelles, est plate** : ~+0,10 h par chapitre du 2 au 4.
  Le chapitre 1 vaut ~0,37 h et non 0,42 ; la salle 10 dure ~37,6 s et non 42,6.
- **Le plancher résiduel est ~±0,02 h sur un coût marginal**, y compris à quatre-vingts
  graines. Donc : **un écart de coût marginal inférieur à ~0,04 h n'est pas une mesure**, et
  aucune valeur de cette passe ne sera retenue pour un écart de cet ordre. C'est le garde-fou
  méthodologique qui manquait quand « ch. 3 moins cher que ch. 2 » (0,05 h d'écart, à dix
  graines) est entré dans la documentation du projet comme un fait.

## 4 · Les garde-fous durs, et les départages

La distinction est neuve dans ce projet, et elle est ce qui empêche « refermer l'écart entre
châssis » de devenir un prétexte à sacrifier un garde-fou.

**Durs — aucun réglage, dans aucun temps de cette passe, n'en sacrifie un :**

1. **Dans CHAQUE chapitre, la salle 10 reste la salle la plus meurtrière** (décompte absolu).
   « Le mur n'est jamais un bug, c'est le produit. »
2. **La passivité reste « jamais »** en 20 h simulées.
3. **Le premier coffre reste immédiat** (0,00 h).
4. **Le verrou du châssis reste actif** : les deux séries de contre-pioche restent identiques.
5. **Les quatre chapitres se valident 10/10** — ici, 40/40 graines.

**Départages, à l'intérieur d'un palier démontré, dans cet ordre :**

6. **L'écart entre châssis** : à palier égal, on prend le point qui le referme le plus.
   C'est le mandat rendu par l'auteur (§ 1, borne 2). Il départage à l'échelle du facteur,
   pas au centième (§ 3, conséquence 3).
7. **La durée de la salle 10 du chapitre 1** : ne pas reperdre le terrain conquis par
   `fc827ee`. Mesurée à **37,6 s à quarante graines** — contre 87 s au jalon 2.5 et 64,8 s
   après l'intégration, pour une cible de cahier des charges de ~45 s (§ 2.1). Le combat de
   boss est donc, pour la première fois, *plus court* que sa cible. Départage : à palier égal,
   préférer le point qui reste sous 60 s **et** ne descend pas au point de rendre le boss
   expédié — à `damageK = 1,80` il tombe à 25 s, et le garde-fou 1 casse dans le même
   mouvement.
8. **La durée du chapitre 1** : indicative. Le projet a déjà refusé de sacrifier un garde-fou
   pour six minutes de chapitre ; cette passe ne le fera pas non plus.

Un départage ne peut **jamais** faire retenir un point hors palier. Un palier est une suite de
valeurs **consécutives** qui tiennent les cinq garde-fous durs ; un point isolé qui les tient
n'est pas un palier — c'est le piège qu'avait laissé `rewardBase = 86`, dont les deux voisines
cassaient le garde-fou 1.

## 5 · Le protocole de mesure

**Quarante graines**, jeu unique et fixe pour toute la passe, posé par le temps 0. Justifié
par le § 3 : c'est le palier où les colonnes que la passe doit arbitrer cessent d'être du
bruit. Le coût est linéaire — quatre fois une mesure à dix graines — et il est payé une fois
par point de balayage.

**Bancs de mesure parallèles.** `src/sim/config.ts` gèle `balance.json` à l'import, donc un
balayage se fait en écrivant un `balance.json` par variante. Plutôt que de sérialiser, la
passe monte six copies de l'arbre de travail dans le répertoire de brouillon de la session,
`node_modules` lié en symlink, chacune avec son `balance.json`. **Ces bancs ne vivent jamais
dans le dépôt** — ce projet a déjà retiré « un script de capture temporaire commité par
erreur ». Vérifié le 2026-09-02 : un banc reproduit la ligne de base au chiffre près
(0,42 h · 20 descentes · ×10,80).

**Chaque point de balayage relève les huit critères**, garde-fous durs et départages, y
compris ceux dont on sait qu'ils ne peuvent pas bouger. C'est la discipline du lot A : les
relever à chaque fois est le seul moyen de le prouver plutôt que de le supposer.

## 6 · Les quatre temps

### Temps 0 — l'instrument, valeurs d'équilibrage inchangées

Trois commits, aucun ne touche à `balance.json` :

- **Le jeu de graines passe à quarante.** Précédent exact : la décision R9 de l'intégration,
  qui avait élargi cinq → dix « dans son propre commit, valeurs d'équilibrage inchangées ».
  Ce commit **déplace tous les chiffres publiés du projet** sans changer une seule constante :
  c'est attendu, c'est la correction du biais, et la nouvelle ligne de base est publiée avec.
- **Le `+` codé en dur de `scripts/calibrate.mjs`**, qui imprime `+-0.21 h` quand un coût
  marginal est négatif (dette du lot A). Il va mordre : des marges négatives sont probables
  pendant les balayages.
- **Le budget de `scripts/verrou.mjs`**, relevé pour que le harnais redevienne vert (§ 2.3),
  et rendu surchargeable par l'environnement plutôt que codé en dur.

### Temps 1 — le combat

`econ.rewardBase` et `econ.rewardPerChapter` **gelés**.

**6.1 — `combat.damageK` d'abord**, parce qu'il porte le chapitre 1, donc l'écart entre
châssis et la durée du boss. Sonde à douze points déjà tournée (dix graines, à refaire à
quarante) :

| `damageK` | 0,70 | 0,80 | 0,90 | 0,95 | 1,00 | 1,05 | 1,10 | 1,15 | **1,30** | 1,45 | 1,60 | 1,80 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| écart châssis | ×3,00 | ×3,50 | ×3,57 | ×5,00 | ×5,75 | ×6,63 | ×6,00 | ×9,75 | ×10,80 | ×12,18 | ×33,73 | ×45,57 |
| salle 10 ch. 1 | 101 s | 68 s | 62 s | 48 s | 54 s | 57 s | 50 s | 47 s | 43 s | 38 s | 33 s | 25 s |
| ch. 1 (descentes) | 13 | 13 | 13 | 14 | 16 | 17 | 21 | 19 | 20 | 26 | 32 | 29 |
| garde-fou 1 | oui | oui | oui | oui | oui | oui | oui | oui | oui | oui | oui | **NON** |

Les non-monotonies de la ligne « écart » (×6,63 puis ×6,00) et de la ligne « salle 10 » (54,
57, 50 s) sont **du bruit de graines et non des accidents de courbe** : c'est le § 3 qui l'a
établi, et c'est pourquoi ce balayage est à refaire à quarante graines avant d'en conclure
quoi que ce soit.

Deux enseignements que le balayage à quarante graines doit confirmer ou casser :
**`damageK` est de très loin le premier levier de l'écart entre châssis**, et le garde-fou dur
tient sur un domaine bien plus large que l'ancien palier « 1,2–1,6 ». Un palier large signifie
que ce sont les départages qui choisissent — exactement la structure du § 4. Et un conflit de
départages est visible dès la sonde : refermer l'écart tire `damageK` vers le bas, garder le
boss près de 45 s le tire vers le haut. La mesure tranche, pas la préférence.

**6.2 — puis `bot.scaling.spinPerChapter` × `bot.scaling.attackPerChapter`**, sur le
`damageK` retenu. Ils ne façonnent que la marche entre chapitres — la colonne que le § 3 vient
de rendre lisible.

### Temps 2 — l'économie

`combat.damageK` et les deux `bot.scaling.*` **gelés**. Commits séparés du temps 1.

**`econ.rewardBase` d'abord** (il porte le chapitre 1), puis `econ.rewardPerChapter`. Sonde à
deux points déjà tournée :

| `econ.rewardBase` | 80 | **104** | 140 |
|---|---|---|---|
| ch. 1 | 0,46 h · 23 | 0,42 · 20 | 0,34 · 19 |
| écart châssis | ×17,30 | ×10,80 | **×3,90** |
| garde-fou 1 | oui ×4 | oui ×4 | **NON au ch. 4** |

**Deux des cinq constantes tirent fort sur l'écart entre châssis, en sens opposés.** Enrichir
le joueur le referme — c'est le mécanisme mesuré au lot A, la richesse équipe tout le monde et
le châssis faible rattrape — mais à 140 le garde-fou du chapitre 4 casse. Le palier se
cherchera entre les deux.

### Temps 3 — la re-vérification du combat, que le lot A n'a pas faite

C'est le trou exact laissé par le lot A, et il est documenté par le lot A lui-même :
`spinPerChapter = 1,02` avait été choisi avec `rewardPerChapter` gelé à sa valeur provisoire
de 1,25, et la passe d'économie l'a ensuite porté à 1,15, ce qui a aplati la marche que 1,02
achetait. « La justification de 1,02 vaut pour le balayage du combat, pas pour le jeu livré. »

Une fois l'économie posée, cette passe **remesure si les valeurs de combat retenues sont
encore dans leur palier**. Deux issues, toutes deux acceptables, aucune silencieuse :

- elles y sont → on l'écrit, avec la mesure qui le montre ;
- elles n'y sont plus → **un quatrième commit de combat, seul**, les recale. La règle « jamais
  dans le même commit » interdit de mélanger, elle n'interdit pas d'itérer.

## 7 · Hors scope, explicitement

- **Les profils de châssis** (§ 1, borne 2) — mandat non donné.
- **Le modèle du harnais de calibration.** `scripts/calibrate.mjs` n'équipe jamais une pièce
  tirée et n'appelle jamais la fusion : il mesure un joueur pour qui acheter un coffre est une
  perte sèche. La dette du lot A puis celle du lot B lui promettent son propre lot. Le corriger
  ici changerait l'instrument pendant qu'on mesure, et rendrait illisible tout ce que la passe
  produit. **Cette passe hérite donc de cette borne et doit la redire** : ses conclusions ne
  disent rien d'un équilibrage des coffres ou de la fusion.
- **Le jalon 3, lot C** (gimmicks des chapitres, atout par salle, quêtes) et le **lot D**.
- Les deux demandes de l'auteur en attente dans `docs/ameliorations.md` — interdire
  l'amélioration pendant une descente pilotée, récompenses de progression par niveau — qui
  appartiennent au lot C.

## 8 · La documentation à reprendre

Une passe qui déplace les chiffres publiés doit déplacer les phrases qui les citent. À
reprendre, chacune vérifiée contre la mesure finale et non contre le souvenir :

- `docs/roadmap.md` : la ligne de base du lot B, la dette du lot A (l'obligation de remesure
  et « le mur a atterri au chapitre 4 »), « Née de l'intégration » dans la dette du jalon 2.5
  (l'écart entre châssis), la dette du jalon 2.5 sur `damageK`/`rewardBase`, la durée du boss.
- `docs/game-design.md` : le paragraphe des courbes économiques (l'historique de `rewardBase`
  et le palier 102-110), les deux paragraphes de `rewardPerChapter` et de la difficulté par
  chapitre, la cible ~45 s du boss.
- `docs/ameliorations.md` : une session datée, avec ce que le joueur y gagne ou y perd.
- Le journal de balayage complet dans `docs/superpowers/plans/`, sur le modèle de
  `2026-09-01-calibration-chapitres.md` : la grille brute, les paliers, et ce que la mesure a
  appris qui vaut plus que les valeurs retenues.

## 9 · Critères d'acceptation

1. Les cinq constantes portent une valeur choisie dans un **palier démontré** — des valeurs
   consécutives, jamais un point isolé — mesuré à quarante graines sous la physique actuelle.
2. Les cinq garde-fous durs du § 4 tiennent à la valeur retenue, relevés et publiés.
3. **Aucun commit ne mélange une constante de combat et une constante d'économie.**
4. Le temps 3 est fait et son résultat est écrit, quelle que soit son issue.
5. `npm run test` vert, `npm run build` propre, `npm run calibrate` vert, **`npm run verrou`
   vert** — les trois harnais, dont deux ne sont dans aucune suite de tests.
6. Vérification en navigateur faite par moi-même, pas déléguée.
7. Toute phrase du dépôt qui cite un chiffre déplacé par cette passe est reprise (§ 8), y
   compris celles que le § 3 rend fausses sans qu'aucune constante n'ait bougé.
8. Relecture de la branche entière avant fusion, et mesure de l'étalon de `main` seul, dans un
   arbre jetable, **avant** de fusionner.
