# Remesure des cinq constantes après `fc827ee` — journal de calibration

> Spec : `docs/superpowers/specs/2026-09-02-remesure-cinq-constantes-design.md`. Plan :
> `docs/superpowers/plans/2026-09-02-remesure-cinq-constantes.md`. Ce fichier est complété
> tâche après tâche par les temps 1 et 2 (combat puis économie) ; il ne porte pour l'instant
> que le combat.

## Le mandat, en bref

`fc827ee` a changé la détection de collision (le contact se cherche sur le trajet du tick, pas
sur son arrivée) et rendu fausse toute la documentation d'équilibrage du dépôt, sans provoquer
un seul conflit de fusion. Cinq constantes doivent être reposées **sous la physique actuelle** :
`combat.damageK`, `econ.rewardBase`, `bot.scaling.spinPerChapter`,
`bot.scaling.attackPerChapter`, `econ.rewardPerChapter`. Deux d'entre elles déplacent le
chapitre 1 (donc tous les garde-fous, l'écart entre châssis compris) : `damageK` et
`rewardBase`. Les trois autres ne façonnent que la marche d'un chapitre au suivant.

Trois bornes non négociables, rendues par l'auteur le 2026-09-02 :

1. **L'étalon du lot B (×3,80, mesuré sur `764f220`, avant `fc827ee`) n'est pas la cible.** Un
   palier ne se transporte pas d'un modèle de combat à l'autre.
2. **Les profils de châssis ne sont pas touchés.** L'écart entre châssis entre dans cette passe
   comme critère de départage à l'intérieur d'un palier démontré, jamais comme un bouton.
3. **Jamais le combat et l'économie dans le même commit.** Payé trois fois par ce projet.

**Les cinq garde-fous durs**, qu'aucun réglage de cette passe ne sacrifie :

1. Dans **chaque** chapitre, la salle 10 reste la salle la plus meurtrière (décompte absolu).
2. La passivité reste « jamais » en 20 h simulées.
3. Le premier coffre reste immédiat (0,00 h).
4. Le verrou du châssis reste actif (les deux séries de contre-pioche restent identiques).
5. Les quatre chapitres se valident 40/40 graines.

**Les départages**, à l'intérieur d'un palier démontré, dans cet ordre : 6. l'écart entre
châssis (arbitre en bandes, jamais au centième) ; 7. la durée de la salle 10 du chapitre 1
(cible ~45 s, sous 60 s, sans rendre le boss expédié) ; 8. la durée du chapitre 1 (indicative).
Un critère qui laisse des points à égalité passe la main au suivant plutôt que de trancher au
hasard, et si le palier entier reste indécis, la valeur commitée est conservée.

**Protocole de mesure** : quarante graines fixes, `econ.rewardBase` et `econ.rewardPerChapter`
gelés à 104 et 1,15, les deux `bot.scaling.*` gelés à 1,02 et 1,10 — seul `combat.damageK`
varie. Six bancs de mesure isolés (copies de l'arbre de travail hors dépôt), parallélisés en
trois vagues.

## Le trouble d'instrument résolu avant ce balayage

Le protocole de dix graines de cette passe a d'abord mesuré sa propre précision (temps 0) : à
dix graines, le coût marginal d'un chapitre varie d'un facteur quatre (+0,03 h à +0,12 h) sans
qu'aucune constante n'ait bougé, et l'écart entre jeux disjoints ne décroît **pas** avec plus de
graines pour l'écart châssis (1,45 à dix graines, 2,80 à quarante, 1,80 à quatre-vingts — c'est
un rapport de médianes de comptes entiers de descentes, une grandeur discrète). D'où deux
règles portées dans cette passe : le jeu de graines passe à **quarante** (tâche 3), et **un
écart de coût marginal sous ~0,04 h n'est pas une mesure** (plancher résiduel ±0,02 h, mesuré
jusqu'à quatre-vingts graines).

Le premier balayage de la présente tâche a lui-même été **jeté** avant analyse — pas pour un
motif de jeu, pour un bug d'instrument. C'est le **troisième** défaut d'instrument de cette
passe, aucun des trois n'étant un défaut du jeu :

1. Le `+` codé en dur de `scripts/calibrate.mjs`, qui imprimait `+-0.21 h` pour une marge
   négative (temps 0).
2. Le jeu de dix graines lui-même, qui mesurait du bruit et non le jeu (tâche 3).
3. Le pilote `mesure.mjs` codait en dur la regex `/validé par (\d+)\/10/`, héritée de l'époque
   où le harnais imprimait `10/10`. Depuis le passage à quarante graines il imprime `40/40`, la
   regex ne matchait plus rien et renvoyait un faux `0` — donc `graines 0/0/0/0` sur les
   quatorze points du balayage, qui aurait rayé tous les points sur le garde-fou dur n° 5 et
   déclaré la tâche bloquée sur un défaut de mon propre analyseur, pas sur un défaut du jeu.
   Attrapé parce que le résultat était trop uniforme pour être vrai : zéro validation partout
   alors que la durée et les marges étaient renseignées aux quatre chapitres — deux colonnes qui
   ne peuvent pas être vraies ensemble. Le pilote corrigé (`(\d+)\/(\d+) graines`, plus un champ
   `surTotal`) enregistre désormais la sortie brute de chaque point, pour qu'une relecture
   puisse refaire l'analyse sans croire l'analyseur sur parole.

« Vérifie ton harnais avant d'accuser le code » a payé trois fois dans cette seule passe.

---

# Le combat — `combat.damageK`

## Le balayage brut — quatorze points, quarante graines

Grille : `0,80 · 0,90 · 0,95 · 1,00 · 1,05 · 1,10 · 1,15 · 1,20 · 1,25 · 1,30 · 1,40 · 1,50 ·
1,60 · 1,70`. `econ.rewardBase` (104), `econ.rewardPerChapter` (1,15), `bot.scaling.spinPerChapter`
(1,02) et `bot.scaling.attackPerChapter` (1,10) gelés sur toute la grille.

| `damageK` | ch. 1 (h/desc.) | salle 10 ch. 1 | écart châssis | GF 1 (4 ch.) | graines | passivité | verrou | coffre | marges ch. 2/3/4 |
|---|---|---|---|---|---|---|---|---|---|
| 0,80 | 0,42 h / 13 | 68,20 s | ×3,83 | oui×4 | 40/40/40/40 | jamais | actif | 0,00 | +0,15 / +0,15 / +0,43 |
| 0,90 | 0,39 h / 14 | 62,50 s | ×3,86 | oui×4 | 40/40/40/40 | jamais | actif | 0,00 | +0,13 / +0,11 / +0,26 |
| 0,95 | 0,40 h / 15 | 58,50 s | ×4,25 | oui×4 | 40/40/40/40 | jamais | actif | 0,00 | +0,11 / +0,16 / +0,17 |
| 1,00 | 0,37 h / 15 | 52,50 s | ×5,14 | oui×4 | 40/40/40/40 | jamais | actif | 0,00 | +0,13 / +0,09 / +0,11 |
| 1,05 | 0,37 h / 16 | 49,40 s | ×5,00 | oui×4 | 40/40/40/40 | jamais | actif | 0,00 | +0,12 / +0,11 / +0,16 |
| **1,10** | **0,37 h / 17** | **46,40 s** | **×4,88** | **oui×4** | **40/40/40/40** | **jamais** | **actif** | **0,00** | **+0,12 / +0,06 / +0,16** |
| 1,15 | 0,36 h / 18 | 43,40 s | ×9,00 | oui×4 | 40/40/40/40 | jamais | actif | 0,00 | +0,08 / +0,10 / +0,14 |
| 1,20 | 0,38 h / 19 | 40,80 s | ×8,56 | oui×4 | 40/40/40/40 | jamais | actif | 0,00 | +0,06 / +0,13 / +0,14 |
| 1,25 | 0,33 h / 18 | 40,20 s | ×10,44 | oui×4 | 40/40/40/40 | jamais | actif | 0,00 | +0,09 / +0,06 / +0,12 |
| 1,30 (commitée) | 0,40 h / 20 | 36,80 s | ×9,30 | oui×4 | 40/40/40/40 | jamais | actif | 0,00 | +0,10 / +0,08 / +0,10 |
| 1,40 | 0,39 h / 22 | 35,00 s | ×13,30 | oui×4 | 40/40/40/40 | jamais | actif | 0,00 | +0,10 / +0,04 / +0,14 |
| 1,50 | 0,39 h / 23 | 32,90 s | ×17,73 | oui×4 | 40/40/40/40 | jamais | actif | 0,00 | +0,09 / +0,11 / +0,08 |
| 1,60 | 0,40 h / 26 | 32,20 s | ×35,00 | oui×4 | 40/40/40/40 | jamais | actif | 0,00 | +0,12 / +0,05 / +0,08 |
| 1,70 | 0,48 h / 31 | 28,30 s | ×48,42 | oui×4 | 40/40/40/40 | jamais | actif | 0,00 | +0,11 / +0,06 / +0,06 |

## Le résultat structurant : le palier est la grille entière

**Les quatorze points tiennent les cinq garde-fous durs**, sans une seule exception : 40/40
graines dans les quatre chapitres, salle 10 la plus meurtrière dans les quatre chapitres,
passivité « jamais », verrou actif, premier coffre à 0,00 h — partout. Le palier n'est donc pas
une sous-plage de la grille, c'est la grille **entière**, `[0,80 ; 1,70]`, un domaine qui
dépasse un facteur deux.

C'est un résultat en soi, pas une absence de résultat : **les garde-fous durs ne discriminent
rien sur ce bouton**, dans tout le domaine testé. Un balayage qui aurait cherché un palier
étroit et un balayage qui aurait cherché la robustesse des garde-fous arrivent à la même
conclusion — c'est la robustesse du garde-fou 1 après `fc827ee` qui domine, pas un hasard de
grille. **Le choix repose donc entièrement sur les départages**, exactement la structure prévue
par la spec (§ 4) pour ce cas.

## Correctifs à ce journal (relecture, cycle 1/5)

Une relecture a mesuré directement ce que la version précédente de ce journal supposait, et a
trouvé quatre erreurs factuelles en plus d'une méthode à remplacer. Les quatre, pour traçabilité
(la méthode est traitée dans la section suivante) :

1. **« ×2,73 — deux fois le seuil de bruit »** contredisait le chiffre donné trois lignes plus
   haut dans le même document : l'étendue mesurée à quarante graines vaut 2,80, pas ~2. ×2,73
   est donc *sous* le seuil mesuré, pas le double — l'inverse de ce qui était écrit. Retiré,
   remplacé par la mesure directe ci-dessous.
2. Le maximum de l'ancienne « bande A » était donné comme « 1,10, ×4,88 », alors que le tableau
   du balayage brut, trois sections plus haut dans ce même document, montre `1,00 → ×5,14` comme
   le maximum réel de ce groupe de points. Contradiction interne. Retiré avec la section qui la
   portait.
3. « ×4,88 … le meilleur atteignable dans tout le domaine mesuré » était faux : ×3,83 à 0,80,
   dans le même tableau, est plus bas. Corrigé au § 4 de « ce que le balayage a appris »
   ci-dessous.
4. Le plancher de bruit du départage 7 n'était jamais chiffré, et « aucun bruit détecté »
   s'appuyait sur une monotonie visuelle, pas sur une mesure d'étendue. Le chiffre existait déjà
   dans la spec (§ 3) et n'avait pas été cité : 1,4 s d'étendue entre jeux disjoints à quarante
   graines pour cette colonne. Cité dans le départage 7 corrigé, ci-dessous.

Erreur de langue relevée également (accord de genre, « le déplacement … gratuite ») : disparue
avec la phrase qui la portait, reformulée plus bas. Une cinquième erreur, dans le message du
commit `cee2661` déjà poussé dans l'historique, ne peut pas être corrigée sans réécrire un
commit existant — ce que ce projet interdit. Elle reste dans l'historique telle quelle, notée
ici pour mémoire : « … les garde-fous ne discriminent rien sur ce bouton — c'est le choix repose
entièrement sur les départages » aurait dû lire « … le choix repose entièrement sur les
départages ».

**Cycle 2/5.** La correction ci-dessus a elle-même introduit une surenchère du même type : la
section « Le départage terminal » affirmait que « les jeux disjoints établissent que le groupe
bas ne recouvre pas la distribution de 1,30 », généralisant à `{0,95 ; 1,00 ; 1,05 ; 1,10}` un
non-recouvrement mesuré seulement pour la paire {1,10 ; 1,30}. Corrigé (la phrase ne porte plus
que sur 1,10) ; le commentaire sur pourquoi ce genre de phrase se généralise tout seul est
maintenant à sa suite, dans le corps du journal plutôt qu'ici, pour rester proche de la phrase
qu'il concerne.

## Correction méthodologique : le départage 6 devient une mesure directe

Le départage 6 avait d'abord été appliqué avec la règle « facteur ~2 = à égalité », tirée d'une
seule étendue mesurée (2,80 à quarante graines, § 3 de la spec, à `damageK` alors figé) et
extrapolée à toutes les paires de points de la grille sans jamais être vérifiée directement là
où elle servait à décider. Une relecture a demandé la mesure directe plutôt que l'extrapolation :
quatre jeux **disjoints** de quarante graines à `damageK = 1,10` et `damageK = 1,30` (le jeu
canonique, plus trois jeux `k = 100..139`, `200..239`, `300..339`).

| | jeu canonique | `k=100` | `k=200` | `k=300` | étendue |
|---|---|---|---|---|---|
| écart châssis à 1,10 | ×4,88 | ×6,63 | ×6,38 | ×5,33 | `[×4,88 ; ×6,63]` |
| écart châssis à 1,30 | ×9,30 | ×8,90 | ×10,78 | ×10,78 | `[×8,90 ; ×10,78]` |
| salle 10 ch. 1 à 1,10 | 46,4 s | 46,1 s | 47,6 s | 42,4 s | `[42,4 ; 47,6]` |
| salle 10 ch. 1 à 1,30 | 36,8 s | 37,0 s | 39,2 s | 40,7 s | `[36,8 ; 40,7]` |
| descentes ch. 1 à 1,10 | 17 | 16 | 16 | 16 | `[16 ; 17]` |
| descentes ch. 1 à 1,30 | 20 | 19 | 18 | 20 | `[18 ; 20]` |

**Les deux distributions de l'écart châssis ne se recouvrent à aucun point** :
`[×4,88 ; ×6,63]` contre `[×8,90 ; ×10,78]`. C'est une mesure directe, pas une extension de
l'heuristique — et elle **contredit** l'heuristique : la règle du facteur ~2 aurait déclaré
×6,63 (le pire jeu à 1,10) et ×8,90 (le meilleur jeu à 1,30) à égalité (facteur 1,34, sous 2),
alors que les distributions complètes ne se touchent jamais. **Une heuristique a été remplacée
par une mesure, et la mesure l'a contredite.** C'est le résultat le plus important de ce
correctif, plus important que la valeur retenue elle-même : la discipline « arbitrer en bandes,
pas au centième » était la bonne discipline, mais son seuil numérique (« facteur ~2 ») avait été
extrapolé d'une seule étendue mesurée à une seule valeur de `damageK`, jamais vérifié à
l'endroit précis où il servait à trancher entre deux candidats.

### Départage 6, mesuré : quatre points bas à égalité entre eux, mesurablement sous 1,30

Sur le relevé canonique (une mesure par point), quatre valeurs ont un écart châssis bas et
proche : 0,95 (×4,25), 1,00 (×5,14), 1,05 (×5,00), 1,10 (×4,88) — un facteur interne de ×1,21
(5,14 / 4,25) entre elles, sous toute estimation de bruit disponible pour ce critère (1,45 à
2,80 selon le jeu de graines). **Elles sont à égalité entre elles.**

Seule la paire {1,10 ; 1,30} a été directement remesurée sur quatre jeux disjoints ; c'est elle
qui établit le non-recouvrement ci-dessus. Les trois autres points bas (0,95 · 1,00 · 1,05)
n'ont qu'une mesure canonique chacun — mais leurs valeurs (×4,25 à ×5,14) sont du même ordre que
celle de 1,10 (×4,88) et loin sous le plancher mesuré de 1,30 (×8,90) : l'extension à ces trois
points est prudente, pas un recouvrement fortuit avec la zone haute. 0,80 et 0,90 partagent
cette zone basse sur le relevé canonique (×3,83 et ×3,86) mais n'ont pas été remesurés sur jeux
disjoints — la question ne se pose pas pour eux, puisqu'ils sont éliminés au départage suivant
sur un tout autre critère.

**Départage 6 (mesuré) : `{0,95 ; 1,00 ; 1,05 ; 1,10}` sont à égalité entre eux, et
mesurablement sous 1,30.**

## Le départage 7, relu littéralement : une borne, pas une cible de proximité

Le journal initial appliquait à ce critère une lecture « le plus proche de 45 s », que le texte
de la spec (§ 4) **n'énonce pas**. Sa formulation exacte : « départage : à palier égal, préférer
le point qui reste sous 60 s et ne descend pas au point de rendre le boss expédié ». C'est une
borne des deux côtés, pas une fonction à minimiser autour de 45 s — le chiffre ~45 s (§ 2.1) sert
à motiver *pourquoi* la borne existe, pas à fournir une cible de proximité pour le départage.
**Défaut de la spec, pas seulement de sa lecture ici** : le § 2.1 présente précisément 37,6 s
comme la cible ~45 s « tenue pour la première fois », et la valeur commitée avant cette tâche —
1,30, mesurée à 36,8 s à quarante graines — est quasiment ce chiffre. Les deux candidats
(1,10 à 46,4 s et 1,30 à 36,8 s) satisfont donc également « sous 60 s, sans rendre le boss
expédié » : aucun des deux n'est plus conforme à la spec que l'autre, parce que la spec ne
demande pas une proximité à 45 s, elle demande de rester dans une plage. **La durée du boss ne
peut donc pas être la raison du déplacement : les deux valeurs la tiennent.**

Sur les six points de la zone basse (relevé canonique) :

| `damageK` | salle 10 ch. 1 | sous 60 s, non expédié ? |
|---|---|---|
| 0,80 | 68,20 s | **non — perd** |
| 0,90 | 62,50 s | **non — perd** |
| 0,95 | 58,50 s | oui |
| 1,00 | 52,50 s | oui |
| 1,05 | 49,40 s | oui |
| 1,10 | 46,40 s | oui |

0,80 et 0,90 dépassent la borne de 60 s et perdent le départage — un vrai effet, pas du bruit :
l'étendue mesurée de la salle 10 du chapitre 1 entre jeux disjoints à quarante graines est de
**1,4 s** (§ 3 de la spec), et 68,2 s / 62,5 s dépassent la borne de 8,2 s et 2,5 s
respectivement, plusieurs largeurs de bruit. Au-delà de cette élimination, **le critère ne
sépare rien** : {0,95 ; 1,00 ; 1,05 ; 1,10} passent tous la borne, et 1,30 (36,8 s) aussi. Le
même repère de bruit joue aussi dans l'autre sens : 46,4 s (1,10) contre 36,8 s (1,30) fait 9,6 s
d'écart, soit environ **sept largeurs de bruit** — un effet réel de `damageK` sur la durée du
combat, mais qui ne dit rien sur lequel des deux respecte *mieux* une borne qu'ils respectent
déjà tous les deux.

**Départage 7 : élimine 0,80 et 0,90. Ne sépare pas les quatre survivants entre eux, ni de
1,30.**

## Départage 8 : la durée du chapitre 1

| `damageK` | ch. 1 |
|---|---|
| 0,95 | 0,40 h |
| 1,00 | 0,37 h |
| 1,05 | 0,37 h |
| 1,10 | 0,37 h |

Étendue observée sur ces quatre points : 0,03 h. L'étendue mesurée entre jeux disjoints à
quarante graines pour cette colonne (§ 3 de la spec) est de **0,06 h**. Les quatre valeurs
tiennent largement dans ce plancher de bruit : **à égalité**.

## Le départage terminal, et la valeur retenue

Les trois départages numérotés laissent `{0,95 ; 1,00 ; 1,05 ; 1,10}` à égalité. La règle qui
tranche ici n'est pas une préférence, c'est une règle : **à mesure égale entre plusieurs
candidats, on retient celui le plus proche de la valeur commitée.** Une constante ne se déplace
que de la distance que la mesure exige, jamais plus — la même discipline que la borne 1 du
mandat (l'étalon du lot B n'est pas une cible), appliquée ici à l'intérieur d'un groupe à égalité
plutôt qu'à un jalon externe.

Parmi `{0,95 ; 1,00 ; 1,05 ; 1,10}`, le plus proche de 1,30 est **1,10**.

**`combat.damageK` : 1,30 → 1,10.**

Le mouvement est porté par le départage 6 seul, désormais mesuré plutôt que supposé : les
jeux disjoints établissent que **1,10** ne recouvre pas la distribution de **1,30**. Les trois
autres membres du groupe bas (0,95 · 1,00 · 1,05) restent, eux, sur leur mesure canonique unique
— leur égalité avec 1,10 est l'extension prudente décrite au départage 6, pas un non-recouvrement
démontré point par point. Les départages 7 et 8 ne poussent dans aucune direction à l'intérieur
du groupe — ils confirment seulement qu'aucun des quatre n'est disqualifié. Le choix entre les
quatre revient donc entièrement à la règle terminale.

Une phrase de ce journal a, un instant, généralisé à « le groupe bas » un non-recouvrement établi
seulement pour la paire {1,10 ; 1,30} — corrigé ci-dessus. Ce n'est pas un manque de soin isolé :
c'est ce que produit par défaut une phrase qui doit couvrir dans la même respiration un résultat
mesuré et un résultat qui ne l'est pas — elle prête au second la certitude du premier si rien ne
les sépare explicitement. Troisième surenchère de cette passe, et la première apparue *à
l'intérieur* de la correction d'une précédente.

## Ce que le balayage a appris, et qui vaut plus que la valeur retenue

### 1. Le palier n'est pas une plage étroite trouvée par chance — c'est l'absence totale de discrimination des garde-fous durs sur ce bouton

Après `fc827ee`, la salle 10 reste la plus meurtrière dans les quatre chapitres, la passivité
reste « jamais » et le verrou reste actif sur un domaine de `damageK` qui va de 0,80 à 1,70 —
plus d'un facteur deux, et rien dans les données ne suggère que le domaine s'arrête net à ces
bords (0,70 tenait déjà à dix graines dans la sonde de la spec, 1,80 casse le garde-fou 1). Ce
n'est plus « le bouton a un palier », c'est « le bouton est robuste sur toute la plage
plausible ». La conséquence pratique dépasse cette tâche : les cinq garde-fous durs, pris seuls,
ne peuvent plus servir à choisir *aucune* des cinq constantes de cette passe si leurs paliers
ressemblent à celui-ci — c'est aux départages qu'il faut regarder d'abord, pas en dernier
recours.

### 2. Une heuristique de bruit, faute d'être vérifiée à l'endroit où elle sert, peut trancher dans le mauvais sens

La règle « facteur ~2 = à égalité » venait d'une seule mesure d'étendue (2,80 à quarante
graines), extrapolée à toutes les paires de points de la grille sans jamais être vérifiée
directement là où elle servait à décider. Remesurée sur quatre jeux disjoints exactement au
point où elle tranchait (1,10 contre 1,30), elle s'est révélée trop large : les distributions
réelles ne se recouvrent pas du tout, alors que l'heuristique aurait déclaré à égalité certaines
paires de jeux (×6,63 contre ×8,90 : facteur 1,34, sous le seuil de 2). Ce que ça apprend,
au-delà de ce bouton : **un seuil de bruit mesuré une fois, à une seule valeur du paramètre
balayé, n'est pas transportable sans vérification** à un autre point du domaine — même quand la
grandeur est structurellement la même (un rapport de médianes de comptes entiers). « Vérifie ton
harnais avant d'accuser le code » (section précédente) a un analogue pour les seuils de
décision : vérifie ton seuil à l'endroit où il tranche, pas seulement là où tu l'as mesuré.

### 3. Le conflit de départages anticipé par la spec ne s'est pas produit — parce que le départage 7 était mal lu

La spec (§ 6.1) annonçait un conflit : refermer l'écart tire `damageK` vers le bas, garder le
boss près de 45 s le tire vers le haut. Une version antérieure de ce journal a cru observer ce
conflit et l'a résolu par une lecture du départage 7 — « le plus proche de 45 s » — que la spec
n'écrit nulle part. Relu littéralement (« sous 60 s, sans rendre le boss expédié »), le
départage 7 est une borne, pas une cible : il élimine 0,80 et 0,90 (au-delà de 60 s), mais il ne
sépare **pas** les quatre survivants entre eux, ni même de la valeur commitée 1,30 — les deux
tiennent la borne, et le § 2.1 de la spec le confirme de front en présentant 37,6 s comme la
cible ~45 s « tenue pour la première fois » à la valeur d'alors. **Le conflit annoncé n'a jamais
eu lieu, parce que l'un des deux départages ne pousse nulle part : la durée du boss ne peut pas
être la raison du déplacement, puisque les deux candidats la respectent.** C'est le départage 6
seul, désormais mesuré, qui porte tout le mouvement — et un départage terminal, nouveau et
explicite (le plus proche de la valeur commitée), qui choisit 1,10 dans le groupe à égalité
plutôt que 0,95 ou 1,00.

### 4. L'écart entre châssis à la valeur retenue n'est ni le meilleur du domaine, ni un pic — c'est un membre représentatif d'un groupe à égalité

À `damageK = 1,10`, l'écart mesuré vaut ×4,88 sur le relevé canonique (`[×4,88 ; ×6,63]` sur les
quatre jeux disjoints). **Ce n'est pas le minimum du domaine testé** : 0,80 mesure ×3,83 sur le
même relevé canonique, plus bas. Une version antérieure de ce journal affirmait « ×4,88, le
meilleur atteignable dans tout le domaine mesuré » — c'était faux, et de la même famille que la
surenchère que cette passe a déjà dû rétracter une fois (§ 2.3 de la spec, sur `fc827ee` et le
budget de `verrou.mjs`) : une affirmation mesurable, présentée comme mesurée, sans avoir été
vérifiée contre les chiffres du tableau qui la précédait dans le même document. Ce qui est vrai :
×4,88 appartient à un groupe de quatre valeurs basses et mesurablement égales entre elles
(départage 6), toutes très au-dessus de la cible affichée < ×2 — aucune valeur de `damageK`
testée n'en approche, pas même 0,80. La fermeture de cet écart, si elle doit se faire, reste hors
du mandat de ce bouton (borne 2) : elle passe par le bloc `chassis` de `balance.json`.

## Lecture des garde-fous et départages à la valeur retenue (`damageK = 1,10`)

| Garde-fou / départage | État | Mesure |
|---|---|---|
| 1. Salle 10 la plus meurtrière — 4 chapitres | **TENU** | `oui×4` |
| 2. Passivité « jamais » | **TENU** | jamais en 20 h simulées |
| 3. Premier coffre immédiat | **TENU** | 0,00 h |
| 4. Verrou du châssis actif | **TENU** | actif |
| 5. 40/40 graines, 4 chapitres | **TENU** | `40/40/40/40` |
| 6. Écart châssis, mesuré (départage) | à égalité, groupe `{0,95;1,00;1,05;1,10}` | ×4,88 canonique, `[×4,88;×6,63]` sur 4 jeux disjoints — sous 1,30 `[×8,90;×10,78]`, sans recouvrement |
| 7. Salle 10 ch. 1, sous 60 s sans boss expédié (départage, borne) | ne sépare pas | 46,40 s ; 1,30 (36,8 s) tient la même borne |
| 8. Durée du chapitre 1 (départage) | à égalité | 0,37 h, étendue observée 0,03 h sous le plancher de bruit 0,06 h |
| terminal — le plus proche de la valeur commitée | **DÉCIDE** | 1,10 le plus proche de 1,30 parmi `{0,95;1,00;1,05;1,10}` |

## Rapport complet à la valeur retenue (`combat.damageK = 1,10`, quarante graines)

```
=== Calibration — 40 graines ===
Premier coffre ouvert    : médiane 0.00 h

--- Chapitre 1 : validé par 40/40 graines · 0.37 h cumulées (+0.37 h) · 17.00 descentes · salle la plus meurtrière [10,229]
    salle 10 la plus meurtrière : oui
    (lecture par tentative : salle 10, 85 % de létalité)
    salle 1 : 4.50 s  (vidée 730 fois, morts 0) · 0 % létalité/tentative
    salle 2 : 4.30 s  (vidée 730 fois, morts 0) · 0 % létalité/tentative
    salle 3 : 5.20 s  (vidée 727 fois, morts 3) · 0 % létalité/tentative
    salle 4 : 9.80 s  (vidée 722 fois, morts 5) · 1 % létalité/tentative
    salle 5 : 10.50 s  (vidée 675 fois, morts 47) · 7 % létalité/tentative
    salle 6 : 11.10 s  (vidée 612 fois, morts 63) · 9 % létalité/tentative
    salle 7 : 12.30 s  (vidée 509 fois, morts 103) · 17 % létalité/tentative
    salle 8 : 13.50 s  (vidée 398 fois, morts 111) · 22 % létalité/tentative
    salle 9 : 14.60 s  (vidée 269 fois, morts 129) · 32 % létalité/tentative
    salle 10 : 46.40 s  (vidée 40 fois, morts 229) · 85 % létalité/tentative

--- Chapitre 2 : validé par 40/40 graines · 0.50 h cumulées (+0.12 h) · 2.00 descentes · salle la plus meurtrière [10,76]
    salle 10 la plus meurtrière : oui
    (lecture par tentative : salle 10, 66 % de létalité)
    salle 1 : 4.80 s  (vidée 134 fois, morts 0) · 0 % létalité/tentative
    salle 2 : 4.00 s  (vidée 134 fois, morts 0) · 0 % létalité/tentative
    salle 3 : 4.90 s  (vidée 133 fois, morts 1) · 1 % létalité/tentative
    salle 4 : 8.30 s  (vidée 130 fois, morts 3) · 2 % létalité/tentative
    salle 5 : 9.30 s  (vidée 127 fois, morts 3) · 2 % létalité/tentative
    salle 6 : 9.70 s  (vidée 125 fois, morts 2) · 2 % létalité/tentative
    salle 7 : 12.90 s  (vidée 124 fois, morts 1) · 1 % létalité/tentative
    salle 8 : 13.00 s  (vidée 121 fois, morts 3) · 2 % létalité/tentative
    salle 9 : 14.70 s  (vidée 116 fois, morts 5) · 4 % létalité/tentative
    salle 10 : 51.60 s  (vidée 40 fois, morts 76) · 66 % létalité/tentative

--- Chapitre 3 : validé par 40/40 graines · 0.55 h cumulées (+0.06 h) · 2.00 descentes · salle la plus meurtrière [10,66]
    salle 10 la plus meurtrière : oui
    (lecture par tentative : salle 10, 62 % de létalité)
    salle 1 : 4.30 s  (vidée 129 fois, morts 0) · 0 % létalité/tentative
    salle 2 : 3.80 s  (vidée 129 fois, morts 0) · 0 % létalité/tentative
    salle 3 : 4.70 s  (vidée 128 fois, morts 1) · 1 % létalité/tentative
    salle 4 : 7.70 s  (vidée 121 fois, morts 7) · 5 % létalité/tentative
    salle 5 : 9.50 s  (vidée 119 fois, morts 2) · 2 % létalité/tentative
    salle 6 : 10.00 s  (vidée 114 fois, morts 5) · 4 % létalité/tentative
    salle 7 : 11.60 s  (vidée 112 fois, morts 2) · 2 % létalité/tentative
    salle 8 : 12.50 s  (vidée 108 fois, morts 4) · 4 % létalité/tentative
    salle 9 : 13.90 s  (vidée 106 fois, morts 2) · 2 % létalité/tentative
    salle 10 : 46.90 s  (vidée 40 fois, morts 66) · 62 % létalité/tentative

--- Chapitre 4 : validé par 40/40 graines · 0.72 h cumulées (+0.16 h) · 3.00 descentes · salle la plus meurtrière [10,117]
    salle 10 la plus meurtrière : oui
    (lecture par tentative : salle 10, 75 % de létalité)
    salle 1 : 4.00 s  (vidée 283 fois, morts 0) · 0 % létalité/tentative
    salle 2 : 3.00 s  (vidée 283 fois, morts 0) · 0 % létalité/tentative
    salle 3 : 4.20 s  (vidée 267 fois, morts 16) · 6 % létalité/tentative
    salle 4 : 7.90 s  (vidée 249 fois, morts 18) · 7 % létalité/tentative
    salle 5 : 8.70 s  (vidée 230 fois, morts 19) · 8 % létalité/tentative
    salle 6 : 8.90 s  (vidée 216 fois, morts 14) · 6 % létalité/tentative
    salle 7 : 11.20 s  (vidée 184 fois, morts 32) · 15 % létalité/tentative
    salle 8 : 12.40 s  (vidée 172 fois, morts 12) · 7 % létalité/tentative
    salle 9 : 13.10 s  (vidée 157 fois, morts 15) · 9 % létalité/tentative
    salle 10 : 43.50 s  (vidée 40 fois, morts 117) · 75 % létalité/tentative

Garde-fou passivité      : jamais — doit rester très au-dessus de la référence

=== Comparatif châssis — chapitre 1 (40 graines) ===
Brasier Solaire    (equilibre ) : 17.00 runs · 0.37 h · salle la plus meurtrière [10,229]
Typhon Primal      (attaque   ) : 39.00 runs · 0.63 h · salle la plus meurtrière [10,379]
Carapace Abyssale  (defense   ) : 8.00 runs · 0.26 h · salle la plus meurtrière [10,97]
Tigre Foudre       (endurance ) : 39.00 runs · 0.89 h · salle la plus meurtrière [9,662]
Écart meilleur/pire (runs) : 39/8 = ×4.88 (cible : < ×2)

=== Verrou du châssis — contre-pioche du triangle (40 graines) ===
rebascule à chaque salle        : 39.00 runs · 0.63 h
même choix, tenu jusqu'au boss  : 39.00 runs · 0.63 h
Verrou actif : changer de châssis en cours de descente ne rapporte rien.
```

Relevé identique au point `damageK = 1,10` du balayage (`ecart.x = 4,88`, `s10 = 46,40 s`,
`ch1 = 0,37 h / 17 descentes`, marges `+0,12 / +0,06 / +0,16`) : contrôle croisé passé.

## Ce qui reste en dette après ce temps

- **L'écart entre châssis reste très au-dessus de la cible < ×2 quelle que soit la valeur de
  `damageK`** — attendu, borne 2 du mandat : ce bouton n'est pas ouvert par cette passe.
- **Le groupe à égalité `{0,95 ; 1,00 ; 1,05 ; 1,10}` n'est directement remesuré sur jeux
  disjoints qu'à une seule de ses bornes** (1,10, contre 1,30). 0,95, 1,00 et 1,05 ne portent
  qu'une mesure canonique chacun ; leur appartenance au groupe repose sur la proximité de leur
  valeur canonique à celle de 1,10, pas sur une distribution mesurée pour chacun. Si une passe
  future rouvre ce bouton, remesurer ces trois points sur jeux disjoints avant de leur faire
  porter une conclusion serait la façon de le faire correctement.
- **Le § 4 de la spec reste ambigu sur le départage 7** : sa formulation (« sous 60 s, sans
  rendre le boss expédié ») ne fournit pas de fonction de proximité, mais le § 2.1 y accole une
  cible chiffrée (~45 s) qui invite à lire un critère de minimisation qu'elle n'énonce pas. Le
  défaut est dans le texte de la spec, pas seulement dans sa première lecture ici — à corriger
  si la spec est reprise pour une passe suivante.
- **`econ.rewardBase` et les deux `bot.scaling.*` restent à balayer** sous la physique actuelle,
  avec `damageK = 1,10` désormais gelé — tâches suivantes de cette passe, commits séparés,
  jamais combat et économie ensemble.
