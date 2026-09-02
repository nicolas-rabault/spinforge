# Remesure des cinq constantes après `fc827ee` — journal de calibration

> Spec : `docs/superpowers/specs/2026-09-02-remesure-cinq-constantes-design.md`. Plan :
> `docs/superpowers/plans/2026-09-02-remesure-cinq-constantes.md`. Ce fichier a été complété
> tâche après tâche par les temps 1 et 2 (combat puis économie) ; il porte désormais les cinq
> constantes de la passe, combat et économie confondus — c'est la dernière, `econ.rewardPerChapter`
> (tâche 7), qui le referme.

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
`[×4,88 ; ×6,63]` contre `[×8,90 ; ×10,78]` sur ce jeu-ci de quatre échantillons disjoints. Un
cinquième échantillon disjoint de quarante graines existe déjà dans ce dépôt, aux mêmes
réglages (`damageK` figé à 1,30) : le jeu 3 du § 3 de la spec mesure ×8,00 — sous le plancher
de ×8,90 relevé ici. Le plancher honnête, toutes mesures à quarante graines confondues à 1,30,
est donc `×8,00`, pas `×8,90`. **Le non-recouvrement survit malgré tout** : ×8,00 reste
au-dessus du plafond ×6,63 mesuré à 1,10, donc `[×4,88 ; ×6,63]` contre `[×8,00 ; ×10,78]` ne se
touchent toujours pas. C'est une mesure directe, pas une extension de
l'heuristique — et elle **contredit** l'heuristique : la règle du facteur ~2 aurait déclaré
×6,63 (le pire jeu à 1,10) et ×8,90 (le meilleur jeu de ce relevé-ci à 1,30) à égalité (facteur
1,34, sous 2), alors que les distributions complètes ne se touchent jamais, même en comptant le
plancher élargi. **Une heuristique a été remplacée
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

---

# Le combat (suite) — `bot.scaling.spinPerChapter` × `bot.scaling.attackPerChapter`

> Tâche 5 de `docs/superpowers/plans/2026-09-02-remesure-cinq-constantes.md`. Sur le
> `combat.damageK = 1,10` retenu par la tâche précédente. Économie toujours gelée
> (`econ.rewardBase` 104, `econ.rewardPerChapter` 1,15).

## Contrôle d'instrument : le chapitre 1 est bit à bit identique aux vingt et un points

`spinPerChapter` et `attackPerChapter` portent l'exposant `chapitre − 1` : au chapitre 1 cet
exposant vaut 0, et aucun des deux facteurs ne doit donc influer sur rien de ce que le
chapitre 1 mesure. Vérifié directement plutôt que supposé, sur les vingt et un points de la
grille `spinPerChapter ∈ {1,00 · 1,02 · 1,05 · 1,08 · 1,12 · 1,16 · 1,20} × attackPerChapter
∈ {1,05 · 1,10 · 1,15}` : une seule valeur distincte pour le septuplet (chapitre 1 en heures,
descentes, durée de la salle 10, écart entre châssis, passivité, premier coffre, verrou) —

```
["0.37", "17.00", "46.40", 4.88, "jamais", "0.00", "actif"]
```

C'est la même discipline qu'à la tâche 4 (garde-fou d'instrument avant résultat) : un
chapitre 1 qui aurait bougé aurait signalé un bug d'exposant, pas un réglage. Il n'a pas
bougé — ce contrôle valide le banc de mesure autant qu'il confirme la propriété attendue.

## Le balayage brut — vingt et un points, quarante graines

Le chapitre 1 étant identique partout (ci-dessus), le tableau ne porte que ce qui varie :
le garde-fou 1 par chapitre, les graines validantes par chapitre (garde-fou 5), et les
marges des chapitres 2 à 4.

| spin | attack | GF 1 (ch. 1→4) | graines (ch. 1→4) | marges ch. 2/3/4 |
|---|---|---|---|---|
| 1,00 | 1,05 | oui · oui · oui · oui | 40/40 · 40/40 · 40/40 · 40/40 | +0,08 / +0,07 / +0,10 |
| 1,00 | 1,10 | oui · oui · oui · oui | 40/40 · 40/40 · 40/40 · 40/40 | +0,07 / +0,10 / +0,14 |
| 1,00 | 1,15 | oui · oui · oui · oui | 40/40 · 40/40 · 40/40 · 40/40 | +0,09 / +0,11 / +0,14 |
| 1,02 | 1,05 | oui · oui · oui · oui | 40/40 · 40/40 · 40/40 · 40/40 | +0,13 / +0,08 / +0,17 |
| 1,02 (commitée avant cette tâche) | 1,10 | oui · oui · oui · oui | 40/40 · 40/40 · 40/40 · 40/40 | +0,12 / +0,06 / +0,16 |
| 1,02 | 1,15 | oui · oui · oui · oui | 40/40 · 40/40 · 40/40 · 40/40 | +0,11 / +0,11 / +0,18 |
| 1,05 | 1,05 | oui · oui · oui · oui | 40/40 · 40/40 · 40/40 · 40/40 | +0,13 / +0,16 / +0,16 |
| **1,05 (retenue)** | **1,10** | **oui · oui · oui · oui** | **40/40 · 40/40 · 40/40 · 40/40** | **+0,12 / +0,15 / +0,21** |
| 1,05 | 1,15 | oui · oui · oui · oui | 40/40 · 40/40 · 40/40 · 40/40 | +0,11 / +0,18 / +0,14 |
| 1,08 | 1,05 | oui · oui · oui · oui | 40/40 · 40/40 · 40/40 · 40/40 | +0,13 / +0,14 / +0,20 |
| 1,08 | 1,10 | oui · oui · oui · oui | 40/40 · 40/40 · 40/40 · 40/40 | +0,15 / +0,09 / +0,24 |
| 1,08 | 1,15 | oui · oui · oui · oui | 40/40 · 40/40 · 40/40 · 40/40 | +0,14 / +0,14 / +0,36 |
| 1,12 | 1,05 | oui · oui · oui · oui | 40/40 · 40/40 · 40/40 · 40/40 | +0,18 / +0,21 / +0,37 |
| 1,12 | 1,10 | oui · oui · oui · oui | 40/40 · 40/40 · 40/40 · 40/40 | +0,25 / +0,18 / +0,37 |
| 1,12 | 1,15 | oui · oui · oui · oui | 40/40 · 40/40 · 40/40 · 40/40 | +0,19 / +0,23 / +0,54 |
| 1,16 | 1,05 | oui · oui · oui · oui | 40/40 · 40/40 · 40/40 · 38/40 | +0,17 / +0,24 / +1,25 |
| 1,16 | 1,10 | oui · oui · oui · oui | 40/40 · 40/40 · 40/40 · 39/40 | +0,20 / +0,23 / +0,93 |
| 1,16 | 1,15 | oui · oui · oui · oui | 40/40 · 40/40 · 40/40 · 39/40 | +0,22 / +0,30 / +1,06 |
| 1,20 | 1,05 | oui · oui · oui · **NON** | 40/40 · 40/40 · 40/40 · 32/40 | +0,26 / +0,22 / +0,94 |
| 1,20 | 1,10 | oui · oui · oui · **NON** | 40/40 · 40/40 · 40/40 · 30/40 | +0,18 / +0,34 / +2,62 |
| 1,20 | 1,15 | oui · oui · oui · **NON** | 40/40 · 40/40 · 40/40 · 36/40 | +0,21 / +0,41 / +1,41 |

## Le palier, et où il casse

Sur l'axe `attackPerChapter`, à `spinPerChapter` fixé, aucune des trois valeurs testées ne
fait basculer un point qui tenait vers un point qui casse, ni l'inverse — le tableau le montre
ligne par ligne. Ce n'est pas la même chose que « l'axe attack n'a pas de palier » : il n'a
simplement pas été testé assez large pour en montrer un.

Sur l'axe `spinPerChapter`, le palier va de 1,00 à 1,12 inclus. À 1,16, le garde-fou 5 casse
déjà pour les trois valeurs d'`attack` : 38 à 39 graines sur 40 valident le chapitre 4 — la
cause est `spinPerChapter`, pas `attackPerChapter`, puisque le même seuil est franchi aux
trois colonnes. À 1,20, le garde-fou 1 casse en plus, au chapitre 4 (`NON` dans la colonne
`GF 1`), pendant que le garde-fou 5 s'effondre franchement (30 à 36 graines sur 40 seulement).

## Départage : ne retenir que les points intérieurs du palier

La spec (§ 4) pose la règle : un palier est une suite de valeurs **consécutives** qui
tiennent les cinq garde-fous durs, et un point isolé qui les tient n'en est pas un — c'est le
piège laissé par `econ.rewardBase = 86`, dont les deux valeurs voisines cassaient le
garde-fou 1. Un point de palier n'est donc retenu comme candidat que s'il a des voisins qui
tiennent **des deux côtés**.

Appliqué ici : `spinPerChapter = 1,12` est exclu, parce que son voisin `1,16` casse le
garde-fou 5 — peu importe la performance de 1,12 lui-même sur les autres critères. Sur l'axe
`attackPerChapter`, seul `1,10` est intérieur au domaine testé : `1,05` et `1,15` sont les
bords de la grille, pas des intérieurs démontrés (leurs voisins hors grille n'ont pas été
mesurés).

**Candidats intérieurs : `spinPerChapter ∈ {1,02 ; 1,05 ; 1,08}`, `attackPerChapter = 1,10`.**

Le prix assumé de cette règle : un point plus favorable existe peut-être au bord non testé du
domaine — c'est le prix pour ne pas répéter le piège de `rewardBase = 86`.

## La forme de la courbe, vérifiée sur jeux disjoints avant d'être écrite

C'est exactement de cette façon — une forme affirmée sans être vérifiée sur un second jeu de
graines — que « le mur a atterri au chapitre 4 » est entré dans la documentation d'équilibrage
de ce dépôt. La cible de design (marge marginale croissante, chapitre 4 le plus cher) n'est
donc pas lue sur une seule série avant d'être écrite : chacun des trois candidats intérieurs
(`attackPerChapter = 1,10`) est remesuré sur deux jeux de quarante graines disjoints du jeu
canonique (`k = 100..139`, `k = 200..239`).

| spin | jeu | marge ch. 2 | marge ch. 3 | marge ch. 4 |
|---|---|---|---|---|
| 1,02 (en place avant cette tâche) | canonique | +0,12 | +0,06 | +0,16 |
| | jeu `k=100` | +0,09 | +0,11 | **+0,08** |
| | jeu `k=200` | +0,07 | +0,12 | +0,16 |
| 1,05 | canonique | +0,12 | +0,15 | +0,21 |
| | jeu `k=100` | +0,09 | +0,13 | +0,19 |
| | jeu `k=200` | +0,12 | +0,11 | +0,24 |
| 1,08 | canonique | +0,15 | +0,09 | +0,24 |
| | jeu `k=100` | +0,15 | +0,15 | +0,21 |
| | jeu `k=200` | +0,14 | +0,13 | +0,30 |

**À `spinPerChapter = 1,02` — la valeur commitée avant cette tâche — la cible n'est pas tenue
de façon robuste.** Sur le jeu `k=100`, le chapitre 4 (+0,08) est le **moins cher** des trois
marges, sous celles du chapitre 2 (+0,09) et du chapitre 3 (+0,11) : le chapitre 4 le plus
cher n'est vrai que sur deux jeux de graines sur trois pour cette valeur.

À `spinPerChapter = 1,05` : l'étendue du chapitre 4 sur les trois jeux, `[+0,19 ; +0,24]`, ne
recouvre ni celle du chapitre 3, `[+0,11 ; +0,15]`, ni celle du chapitre 2, `[+0,09 ; +0,12]`
— **sans recouvrement**.

À `spinPerChapter = 1,08` : même constat, `[+0,21 ; +0,30]` pour le chapitre 4 contre
`[+0,09 ; +0,15]` pour le chapitre 3 et `[+0,14 ; +0,15]` pour le chapitre 2 — **sans
recouvrement**.

Aux trois candidats, en revanche, les étendues des chapitres 2 et 3 se recouvrent toujours
(par exemple `[+0,09 ; +0,12]` contre `[+0,11 ; +0,15]` à 1,05) : ils sont à égalité entre
eux, à chacune des trois valeurs. **La forme honnête à écrire est donc « chapitre 2 ≈
chapitre 3 < chapitre 4 », pas une croissance stricte** — chapitre 2 et chapitre 3 ne sont
séparés à aucun des trois candidats, et l'écrire serait un quatrième excès de portée de cette
passe — la troisième, on l'a vu plus haut, était apparue *à l'intérieur* de la correction de
la deuxième.

## Le départage terminal, et les valeurs retenues

`spinPerChapter = 1,02` est écarté à ce stade : bien qu'intérieur au palier, il ne tient pas
la cible de façon robuste (chapitre 4 le moins cher sur un jeu de graines sur trois). Restent
`1,05` et `1,08`, tous deux intérieurs et tous deux robustes sur jeux disjoints. La même règle
terminale qu'à la tâche 4 s'applique : entre candidats à égalité de robustesse, retenir celui
le plus proche de la valeur en place. `1,05` est à 0,03 de `1,02` ; `1,08` en est à 0,06.

**`bot.scaling.spinPerChapter` : 1,02 → 1,05.**

**`bot.scaling.attackPerChapter` reste à 1,10** : aucun point de `[1,05 ; 1,15]` ne casse quoi
que ce soit, et une constante ne se déplace pas sans raison mesurée — ici, aucune mesure n'en
donne une.

## Ce que ce balayage a appris

### 1. Un palier entier peut tenir les garde-fous durs et pourtant ne pas tenir la cible de forme qu'il est censé produire

Les vingt et un points tiennent tous les garde-fous 1 à 4 ; le garde-fou 5 (40/40 graines) ne
casse qu'à `spinPerChapter ≥ 1,16`. À l'intérieur de ce très large palier, seule la mesure sur
jeux disjoints — pas les garde-fous durs, pas le relevé canonique seul — a permis de voir que
la valeur en place ne tenait pas la cible de façon robuste. Un balayage qui se serait arrêté
aux garde-fous et au relevé canonique aurait laissé passer ce résultat sans le voir.

### 2. La leçon du « mur du chapitre 4 » se réapplique littéralement au sein même de la remesure qui l'a d'abord mise en doute

La tâche 4 avait établi que le mur du chapitre 4 restait valable après `fc827ee`, mais
seulement à `damageK` fixé. Cette tâche montre que sa robustesse dépend aussi des deux
facteurs de progression par chapitre : à `spinPerChapter = 1,02`, le mur existe sur le relevé
canonique et sur un des deux jeux disjoints, mais s'inverse sur le troisième. Ce n'est pas une
contradiction avec la tâche 4 — le mur, au sens de la tâche 4, portait sur `damageK` seul —
c'est la confirmation qu'une forme de courbe doit être vérifiée sur jeux disjoints à
**chaque** endroit du domaine des cinq constantes où elle est invoquée, pas une seule fois
pour toute la passe.

### 3. « Chapitre 2 ≈ chapitre 3 » n'est pas un défaut de mesure — c'est ce que les données disent aux trois candidats

Aux trois valeurs testées de `spinPerChapter`, les étendues des marges de chapitre 2 et de
chapitre 3 se recouvrent systématiquement, alors que celles du chapitre 4 ne recouvrent
jamais celles des deux premiers. Ce n'est pas une coïncidence isolée à un seul candidat : le
mur se forme entre le chapitre 3 et le chapitre 4, pas de façon graduelle depuis le
chapitre 2. Écrire « coût croissant » aurait été inexact aux trois candidats, pas seulement au
candidat retenu.

## Lecture des garde-fous et départages à la valeur retenue (`spinPerChapter = 1,05`, `attackPerChapter = 1,10`)

| Garde-fou / départage | État | Mesure |
|---|---|---|
| 1. Salle 10 la plus meurtrière — 4 chapitres | **TENU** | `oui` aux 4 chapitres |
| 2. Passivité « jamais » | **TENU** | jamais en 20 h simulées |
| 3. Premier coffre immédiat | **TENU** | 0,00 h |
| 4. Verrou du châssis actif | **TENU** | actif |
| 5. 40/40 graines, 4 chapitres | **TENU** | `40/40/40/40` |
| interne — points intérieurs seulement | **DÉCIDE** | `1,12` exclu (voisin `1,16` casse GF 5) ; `1,10` seul intérieur sur `attack` |
| interne — forme vérifiée sur jeux disjoints | **DÉCIDE** | `1,02` écarté (cible non robuste, jeu `k=100`) ; `1,05` et `1,08` robustes |
| terminal — le plus proche de la valeur en place | **DÉCIDE** | `1,05` (écart 0,03) préféré à `1,08` (écart 0,06) |

## Rapport complet à la valeur retenue (`spinPerChapter = 1,05`, `attackPerChapter = 1,10`, quarante graines)

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

--- Chapitre 2 : validé par 40/40 graines · 0.49 h cumulées (+0.12 h) · 3.00 descentes · salle la plus meurtrière [10,93]
    salle 10 la plus meurtrière : oui
    (lecture par tentative : salle 10, 70 % de létalité)
    salle 1 : 4.40 s  (vidée 161 fois, morts 0) · 0 % létalité/tentative
    salle 2 : 4.20 s  (vidée 161 fois, morts 0) · 0 % létalité/tentative
    salle 3 : 4.90 s  (vidée 159 fois, morts 2) · 1 % létalité/tentative
    salle 4 : 9.50 s  (vidée 156 fois, morts 3) · 2 % létalité/tentative
    salle 5 : 10.00 s  (vidée 153 fois, morts 3) · 2 % létalité/tentative
    salle 6 : 10.50 s  (vidée 145 fois, morts 8) · 5 % létalité/tentative
    salle 7 : 12.80 s  (vidée 140 fois, morts 5) · 3 % létalité/tentative
    salle 8 : 13.80 s  (vidée 138 fois, morts 2) · 1 % létalité/tentative
    salle 9 : 14.10 s  (vidée 133 fois, morts 5) · 4 % létalité/tentative
    salle 10 : 50.20 s  (vidée 40 fois, morts 93) · 70 % létalité/tentative

--- Chapitre 3 : validé par 40/40 graines · 0.64 h cumulées (+0.15 h) · 3.00 descentes · salle la plus meurtrière [10,90]
    salle 10 la plus meurtrière : oui
    (lecture par tentative : salle 10, 69 % de létalité)
    salle 1 : 4.50 s  (vidée 175 fois, morts 0) · 0 % létalité/tentative
    salle 2 : 3.90 s  (vidée 175 fois, morts 0) · 0 % létalité/tentative
    salle 3 : 4.80 s  (vidée 169 fois, morts 6) · 3 % létalité/tentative
    salle 4 : 8.50 s  (vidée 162 fois, morts 7) · 4 % létalité/tentative
    salle 5 : 9.90 s  (vidée 161 fois, morts 1) · 1 % létalité/tentative
    salle 6 : 10.10 s  (vidée 152 fois, morts 9) · 6 % létalité/tentative
    salle 7 : 11.90 s  (vidée 145 fois, morts 7) · 5 % létalité/tentative
    salle 8 : 13.30 s  (vidée 137 fois, morts 8) · 6 % létalité/tentative
    salle 9 : 14.00 s  (vidée 130 fois, morts 7) · 5 % létalité/tentative
    salle 10 : 49.40 s  (vidée 40 fois, morts 90) · 69 % létalité/tentative

--- Chapitre 4 : validé par 40/40 graines · 0.85 h cumulées (+0.21 h) · 5.00 descentes · salle la plus meurtrière [10,141]
    salle 10 la plus meurtrière : oui
    (lecture par tentative : salle 10, 78 % de létalité)
    salle 1 : 4.30 s  (vidée 319 fois, morts 0) · 0 % létalité/tentative
    salle 2 : 3.10 s  (vidée 319 fois, morts 0) · 0 % létalité/tentative
    salle 3 : 4.90 s  (vidée 308 fois, morts 11) · 3 % létalité/tentative
    salle 4 : 8.40 s  (vidée 295 fois, morts 13) · 4 % létalité/tentative
    salle 5 : 9.60 s  (vidée 274 fois, morts 21) · 7 % létalité/tentative
    salle 6 : 9.10 s  (vidée 249 fois, morts 25) · 9 % létalité/tentative
    salle 7 : 11.80 s  (vidée 209 fois, morts 40) · 16 % létalité/tentative
    salle 8 : 13.40 s  (vidée 192 fois, morts 17) · 8 % létalité/tentative
    salle 9 : 14.10 s  (vidée 181 fois, morts 11) · 6 % létalité/tentative
    salle 10 : 52.10 s  (vidée 40 fois, morts 141) · 78 % létalité/tentative

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

Relevé identique au point `spinPerChapter = 1,05, attackPerChapter = 1,10` du balayage (`ch1
= 0,37 h / 17 descentes`, `écart = ×4,88`, marges `+0,12 / +0,15 / +0,21`) : contrôle croisé
passé.

## Ce qui reste en dette après cette tâche

- **`spinPerChapter = 1,02` n'est écarté que sur la mesure de forme, pas sur les garde-fous
  durs** : il reste un point de palier intérieur valide au sens strict des cinq garde-fous.
  S'il devait être reconsidéré, ce serait sur un critère autre que la cible « chapitre 4 le
  plus cher », qu'il ne tient pas de façon robuste.
- **`spinPerChapter = 1,08` n'a pas été départagé de `1,05` par la mesure** : les deux sont
  intérieurs et robustes ; le choix de `1,05` repose entièrement sur la règle de proximité à
  la valeur en place, pas sur une différence mesurée entre les deux.
- **Le bord de l'axe `attackPerChapter` (`1,05` et `1,15`) n'a jamais été confirmé
  intérieur** : aucun point en dehors de `[1,05 ; 1,15]` n'a été mesuré sur cet axe. Si une
  passe future rouvre ce bouton, élargir la grille d'abord serait la façon correcte de savoir
  si `1,10` est un intérieur robuste ou seulement le centre d'une grille trop étroite.
- **`econ.rewardBase` et `econ.rewardPerChapter` restent à balayer** sous les trois constantes
  de combat désormais gelées (`damageK = 1,10`, `spinPerChapter = 1,05`,
  `attackPerChapter = 1,10`) — tâches suivantes de cette passe, commits séparés, jamais combat
  et économie ensemble.

---

# L'économie — `econ.rewardBase`

> Tâche 6 de `docs/superpowers/plans/2026-09-02-remesure-cinq-constantes.md` — temps 2
> (économie). Les trois constantes de combat retenues aux tâches 4 et 5 sont gelées sur tout ce
> balayage : `combat.damageK` 1,10, `bot.scaling.spinPerChapter` 1,05,
> `bot.scaling.attackPerChapter` 1,10. `econ.rewardPerChapter` reste à 1,15 (valeur en place,
> hors mandat de cette tâche — c'est le bouton de la tâche 7). Seul `econ.rewardBase` varie.

## Le balayage brut — douze points, quarante graines

Grille : `90 · 96 · 100 · 104 · 108 · 112 · 116 · 120 · 126 · 132 · 140 · 150`.

| `rewardBase` | ch. 1 (h/desc.) | s10 ch. 1 | écart châssis | GF1 (ch1→4) | graines (ch1→4) | marges ch. 2/3/4 | passivité |
|---|---|---|---|---|---|---|---|
| 90 | 0,40 h/17 | 50,80 s | ×5,25 | oui·oui·oui·oui | 40·40·40·40 | +0,11/+0,11/+0,14 | jamais |
| 96 | 0,35 h/16 | 48,20 s | ×5,86 | oui·oui·oui·oui | 40·40·40·40 | +0,14/+0,08/+0,20 | jamais |
| 100 | 0,34 h/15 | 48,30 s | ×5,38 | oui·oui·oui·oui | 40·40·40·40 | +0,09/+0,14/+0,16 | jamais |
| **104 (commitée)** | **0,37 h/17** | **46,40 s** | **×4,88** | **oui·oui·oui·oui** | **40·40·40·40** | **+0,12/+0,15/+0,21** | **jamais** |
| 108 | 0,40 h/18 | 46,10 s | ×5,86 | oui·oui·oui·oui | 40·40·40·40 | +0,08/+0,19/+0,16 | jamais |
| 112 | 0,37 h/17 | 50,00 s | ×5,71 | oui·oui·oui·oui | 40·40·40·40 | +0,14/+0,09/+0,26 | jamais |
| 116 | 0,34 h/16 | 47,40 s | ×4,89 | oui·oui·oui·oui | 40·40·40·40 | +0,10/+0,11/+0,32 | jamais |
| 120 | 0,38 h/17 | 47,90 s | ×4,67 | oui·oui·oui·**NON** | 40·40·40·**38** | +0,10/+0,12/+0,32 | jamais |
| 126 | 0,37 h/16 | 47,90 s | ×4,63 | oui·oui·oui·**NON** | 40·40·40·**37** | +0,08/+0,15/+0,28 | jamais |
| 132 | 0,35 h/17 | 47,90 s | ×3,56 | oui·oui·oui·**NON** | 40·40·40·**32** | +0,11/+0,11/+0,23 | jamais |
| 140 | 0,36 h/17 | 45,80 s | ×4,00 | oui·oui·oui·**NON** | 40·40·40·**27** | +0,10/+0,13/+0,25 | **14,54 h** |
| 150 | 0,38 h/18 | 47,60 s | ×3,67 | oui·oui·**NON**·**NON** | 40·40·**37**·**22** | +0,06/+0,16/+0,92 | **15,66 h** |

Toutes les lignes tiennent le verrou du châssis (« actif ») et le premier coffre (0,00 h) — ni
l'un ni l'autre ne bouge sur toute la grille, ils ne figurent donc pas au tableau.

## Le palier, et où il casse

Les sept premières valeurs (`90` à `116`) tiennent les cinq garde-fous durs sans exception :
`GF1` à `oui` aux quatre chapitres, `40/40` graines aux quatre chapitres, passivité « jamais »,
verrou actif, premier coffre à 0,00 h.

**Le palier casse à `120`, sur deux garde-fous à la fois et au même chapitre.** Au chapitre 4,
la salle la plus meurtrière n'est plus la 10 mais la 4 : 1 117 morts recensées sur la salle 4
du chapitre 4 à `rewardBase = 120`, contre 141 sur la salle 10 du même chapitre 4 à la valeur
retenue `104` (transcrit dans le « Rapport complet » ci-dessous) — garde-fou 1 cassé, chapitre
tenu constant des deux côtés de la comparaison. La validation tombe au même point à
38/40 graines (garde-fou 5). Les deux se dégradent ensemble à
mesure que `rewardBase` monte : 37/40 à `126`, 32/40 à `132`, 27/40 à `140` — la salle la plus
meurtrière reste la 4 ou la 3 selon le point, jamais la 10, sur toute cette zone. À `150`, la
même paire de garde-fous casse aussi au chapitre 3 (37/40, salle 4) en plus du chapitre 4
(22/40, salle 3).

La passivité, elle, tient « jamais » jusqu'à `132` inclus — bien au-delà du point où le palier a
déjà cassé pour une tout autre raison (garde-fous 1 et 5). Elle casse seulement à `140`
(14,54 h) et se dégrade encore à `150` (15,66 h). C'est un garde-fou distinct, qui casse plus
tard et pour une cause différente — développé dans sa propre section ci-dessous, parce qu'il
enseigne plus que la valeur retenue elle-même.

## Départage : ne retenir que les points intérieurs du palier

Même règle qu'aux tâches précédentes (spec § 4) : un point n'est un candidat que si ses deux
voisins **directs de la grille testée** tiennent eux aussi les cinq garde-fous durs — c'est le
piège laissé par `econ.rewardBase = 86` avant cette passe, dont les deux valeurs voisines
cassaient le garde-fou 1 (cité à la section précédente de ce même journal).

Appliqué ici : `90` n'a pas de voisin inférieur testé dans cette grille — son statut d'intérieur
n'est ni démontré ni réfuté, il reste simplement hors de portée de cette règle. `116` a un
voisin supérieur, `120`, qui casse ; il est donc exclu, au même titre que `112` l'était pour
`spinPerChapter` à la tâche 5. Les cinq valeurs restantes ont leurs deux voisins directs à
l'intérieur du palier démontré.

**Candidats intérieurs : `{96 ; 100 ; 104 ; 108 ; 112}`.**

## Les trois départages, mesurés sur les cinq candidats — aucun ne sépare

### Départage 6 — écart entre châssis

| `rewardBase` | 96 | 100 | 104 | 108 | 112 |
|---|---|---|---|---|---|
| écart châssis | ×5,86 | ×5,38 | ×4,88 | ×5,86 | ×5,71 |

Étendue observée : 0,98 (×4,88 à ×5,86). Le plancher de bruit de ce critère, déjà mesuré plus
haut dans ce journal (section damageK, « Correction méthodologique » : quatre jeux disjoints à
`damageK = 1,10`, `rewardBase` alors déjà gelé à 104) : `[×4,88 ; ×6,63]`, une amplitude de
1,75 (±0,875, arrondi ±0,9). L'étendue des cinq candidats (0,98) tient largement dans ce
plancher. **À égalité.**

### Départage 7 — durée de la salle 10 du chapitre 1

| `rewardBase` | 96 | 100 | 104 | 108 | 112 |
|---|---|---|---|---|---|
| s10 ch. 1 | 48,20 s | 48,30 s | 46,40 s | 46,10 s | 50,00 s |

Rappel de la lecture littérale établie à la section damageK (fix round 1/5) : ce départage est
une **borne** — rester sous 60 s sans expédier le boss — pas une fonction de proximité à
minimiser autour de 45 s. Sous cette lecture, les cinq points la tiennent tous très
confortablement (46,10 à 50,00 s, loin des 60 s) : **départage 7 ne sépare aucun des cinq.**

Une différence existe sur cette colonne, mais la qualifier demande le bon plancher de bruit. Le
chiffre cité ici dans une version antérieure de cette section (1,4 s) venait d'une mesure
**unique** (§ 3 de la spec, quatre jeux disjoints, `damageK` figé à 1,30) — exactement l'erreur
que la leçon n° 2 de ce journal nomme : « un seuil de bruit mesuré une fois, à une seule valeur
du paramètre balayé, n'est pas transportable sans vérification ». Le plancher réel de cette
même colonne, mesuré directement aux deux candidats de `damageK` sur quatre jeux disjoints
chacun (section « Correction méthodologique » plus haut dans ce journal) : `[42,4 ; 47,6]` s à
1,10 (étendue 5,2 s) et `[36,8 ; 40,7]` s à 1,30 (étendue 3,9 s). L'étendue mesurée ici entre
les cinq candidats de `rewardBase` (46,10 à 50,00 s → 3,90 s) tient donc **à l'intérieur** de ce
plancher, pas au-dessus : ce n'est pas un signal distinguable du bruit — l'inverse de ce
qu'affirmait la version précédente de cette section. La conclusion ne change pas pour autant :
sous la lecture littérale du départage 7 — une borne, pas un minimum à atteindre — les cinq
points la tiennent tous confortablement, qu'on les juge bruités ou non. Note à titre indicatif,
sans valeur de décision : `104` (46,40 s) et `108` (46,10 s) sont les deux valeurs numériquement
les plus proches de la cible illustrative ~45 s, à 0,30 s l'une de l'autre.

### Départage 8 — durée du chapitre 1

| `rewardBase` | 96 | 100 | 104 | 108 | 112 |
|---|---|---|---|---|---|
| ch. 1 | 0,35 h | 0,34 h | 0,37 h | 0,40 h | 0,37 h |

Étendue observée : 0,06 h (0,34 à 0,40 h) — exactement égale, non inférieure, au plancher de
bruit mesuré pour cette colonne (0,06 h, section damageK, départage 8). À la limite : aucun
signal au-dessus du bruit, mais aucune marge de confort non plus. **À égalité.**

## Le départage terminal : la règle de repli s'applique

Les trois départages numérotés ne séparent aucun des cinq candidats. Le mandat de cette passe
(en tête de ce journal) couvre exactement ce cas : « si le palier entier reste indécis, la
valeur commitée est conservée ». `104` fait partie des cinq candidats à égalité — la même règle
terminale qui a choisi `1,10` puis `1,05` aux deux sections précédentes (« à mesure égale,
retenir le point le plus proche de la valeur commitée ») produit ici, trivialement, `104`
lui-même : c'est déjà la valeur en place, à distance zéro. Le repli et la règle terminale ne
sont donc pas deux règles différentes qui convergent par chance vers la même issue — c'est la
même règle, appliquée à un groupe qui contient déjà la valeur commitée.

**`econ.rewardBase` : confirmée à 104. Aucun changement à `src/content/balance.json`.**

C'est un résultat de cette passe, pas une absence de résultat — précédent déjà posé dans ce
dépôt par la calibration du taux idle du lot B (`docs/roadmap.md`, commit `0fb306b`) : « la
mesure valide la valeur `offline.rate: 0,20` déjà en place plutôt que de la changer — c'est un
résultat de cette passe, pas une omission. » La même phrase s'applique ici, changement de
constante mis à part.

## La passivité a un prix : le garde-fou 2 casse hors du palier retenu, par la seule économie

Ce résultat ne change rien à la valeur retenue ci-dessus — il apparaît à `140` et `150`, tous
deux hors des cinq candidats intérieurs, et même hors des sept valeurs qui tenaient encore les
cinq garde-fous durs (`90` à `116`). Il mérite sa propre section parce qu'il n'avait jamais été
mesuré dans ce projet avant cette tâche.

Jusqu'à `132` inclus, la politique passive reste « jamais » validée en 20 h simulées — le
garde-fou 2 tient sur toute la zone où le garde-fou 1 tenait encore, et longtemps après qu'il a
cassé (`120` à `132` cassent déjà les garde-fous 1 et 5 ; la passivité y reste pourtant
« jamais »). **À `140`, pour la première fois dans ce projet, la politique passive valide le
chapitre 1** — en 14,54 h simulées. À `150`, en 15,66 h.

Mis en regard du temps actif nécessaire pour valider le même chapitre au même point (`140` :
0,36 h ; `150` : 0,38 h), le rapport est d'environ **×40**. Ce n'est pas un renversement : rester
immobile reste, au mieux, quarante fois plus lent que piloter. Le pilier n° 1 de
`docs/game-design.md` (« la progression des chapitres est 100 % active — on n'avance qu'en
pilotant ») n'est donc pas « cassé » à `140`, au sens où l'immobilité deviendrait compétitive
avec le pilotage — elle ne l'est pas.

Ce qui est établi, précisément et sans plus : **le garde-fou 2, tel que ce projet le définit
(« la passivité reste jamais »), cesse de tenir.** Passivité et pilotage cessent d'être deux
catégories disjointes — l'une qui ne valide jamais, l'autre qui valide toujours — pour devenir
deux vitesses différentes d'une même route. Et ce basculement s'obtient **par l'économie seule** :
les trois constantes de combat sont gelées sur tout ce balayage, seul `rewardBase` bouge. Aucune
mesure antérieure de ce dépôt n'avait établi qu'enrichir suffisamment le joueur pouvait, à lui
seul, faire ce que le combat ne fait jamais nulle part dans le domaine mesuré aux deux sections
précédentes (`damageK` de 0,80 à 1,70 sur quatorze points, `spinPerChapter`/`attackPerChapter`
sur vingt et un points) : rendre la passivité viable.

Cette zone reste hors mandat de cette tâche — elle est hors du palier retenu, et le mandat
interdit de toute façon de sortir d'un palier démontré pour départager — mais elle borne, pour
une passe future qui rouvrirait ce bouton, la distance de sécurité avant que le garde-fou 2 ne
devienne le facteur limitant : `132` le tient encore, `140` ne le tient plus. La localisation
exacte du seuil (entre `132` et `140`, un intervalle de 8, jamais affiné) reste en dette,
ci-dessous.

## Ce que ce balayage a appris

### 1. Un palier peut casser sur deux garde-fous à la fois, au même chapitre, sans que l'un explique l'autre par hasard

À `120`, le garde-fou 1 (salle 10 la plus meurtrière) et le garde-fou 5 (40/40 graines) cassent
ensemble, au chapitre 4 d'abord, puis aussi au chapitre 3 à partir de `150` — jamais l'un sans
l'autre, à aucun chapitre, sur toute cette zone. Ce n'est pas une coïncidence isolée à un seul
point : le mécanisme est le même qu'au lot A (enrichir le joueur déplace le point de rupture
d'un chapitre), sauf qu'ici les deux garde-fous qui le détectent bougent du même geste, parce
qu'ils mesurent la même chose sous deux angles — quelle salle tue, et qui survit à quelle salle.

### 2. Première fois dans cette passe que les trois départages numérotés, à l'unanimité, ne séparent rien

Aux deux sections précédentes, au moins un départage tranchait (le départage 6 mesuré pour
`damageK`, le contrôle de forme sur jeux disjoints pour `spinPerChapter`). Ici, les trois
départages 6, 7 et 8 arrivent chacun à la même conclusion sur les cinq candidats intérieurs :
aucun signal au-dessus du bruit mesuré pour ce critère précis. Ce n'est pas un échec de méthode
— c'est la raison d'être de la règle de repli écrite dans le mandat de cette passe avant que ce
balayage ne tourne : « si le palier entier reste indécis, la valeur commitée est conservée ».
Cette tâche est la première de la passe où cette règle, plutôt que la règle terminale de
proximité, est celle qui décide réellement — même si les deux convergent ici vers la même
issue, `104` étant lui-même membre du groupe à égalité.

### 3. Les cinq garde-fous durs ne cassent pas ensemble : le palier de forme (garde-fous 1 et 5) et le palier de passivité (garde-fou 2) ont des frontières différentes, séparées d'un facteur supérieur à 1

Le premier garde-fou à casser en montant `rewardBase` est le garde-fou 1/5, à `120` ; la
passivité, elle, tient encore à `132` et ne casse qu'à `140`, vingt de plus que `120` en valeur
de `rewardBase`. Une intuition
naïve — « plus l'économie est généreuse, plus tout casse au même endroit » — ne tient pas : ce
sont deux mécanismes distincts (la forme de la difficulté par salle pour l'un, le rapport entre
le temps actif et le temps passif pour l'autre), et rien ne garantit qu'ils cassent au même
point. Vérifier les deux séparément, plutôt que de supposer que le premier garde-fou cassé
disqualifie toute la zone pour tous les garde-fous, est ce qui a permis de voir le second.

### 4. Un chiffre juste peut devenir faux par le seul fait d'être posé à côté du mauvais autre chiffre

Une relecture (fix round 1/5) a trouvé, dans « Le palier, et où il casse » ci-dessus, une phrase
qui contrastait les morts de la salle 4 au chapitre 4 à `rewardBase = 120` avec les morts de la
salle 10 au chapitre **1** à `rewardBase = 104` — deux mesures individuellement exactes, mais
prises à deux chapitres différents, présentées comme si elles se répondaient. Ce n'est pas un
excès de portée (le sens de la phrase n'était pas gonflé, la conclusion qu'elle illustrait ne
changeait pas) : c'est un chiffre juste posé à côté du mauvais autre chiffre, la moitié gauche et
la moitié droite d'une même phrase venant silencieusement de deux mesures différentes. La
correction (chapitre 4 des deux côtés : 1 117 contre 141, un écart plus grand que celui écrit
par erreur, pas plus petit) ne change aucune conclusion de cette section — mais c'est la même
famille de défaut que les trois excès de portée déjà retirés de ce journal, sous une forme
différente : pas une affirmation qui dépasse la mesure, une phrase dont les deux moitiés ne
mesurent pas la même chose.

## Lecture des garde-fous et départages à la valeur retenue (`rewardBase = 104`)

| Garde-fou / départage | État | Mesure |
|---|---|---|
| 1. Salle 10 la plus meurtrière — 4 chapitres | **TENU** | `oui×4` |
| 2. Passivité « jamais » | **TENU** | jamais en 20 h simulées |
| 3. Premier coffre immédiat | **TENU** | 0,00 h |
| 4. Verrou du châssis actif | **TENU** | actif |
| 5. 40/40 graines, 4 chapitres | **TENU** | `40/40/40/40` |
| interne — points intérieurs seulement | **DÉCIDE** (n'élimine que 90 et 116) | intérieurs retenus `{96;100;104;108;112}` |
| 6. Écart châssis (départage) | à égalité | ×4,88 ; étendue du groupe 0,98, sous le plancher `[×4,88;×6,63]` |
| 7. Salle 10 ch. 1, borne < 60 s (départage) | ne sépare pas | 46,40 s ; les cinq candidats tiennent la borne (46,10 à 50,00 s) |
| 8. Durée du chapitre 1 (départage) | à égalité, à la limite | 0,37 h ; étendue du groupe 0,06 h = plancher de bruit |
| repli — palier indécis → valeur commitée conservée | **DÉCIDE** | 104 déjà membre du groupe à égalité, distance zéro |

## Rapport complet à la valeur retenue (`econ.rewardBase = 104`, quarante graines)

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

--- Chapitre 2 : validé par 40/40 graines · 0.49 h cumulées (+0.12 h) · 3.00 descentes · salle la plus meurtrière [10,93]
    salle 10 la plus meurtrière : oui
    (lecture par tentative : salle 10, 70 % de létalité)
    salle 1 : 4.40 s  (vidée 161 fois, morts 0) · 0 % létalité/tentative
    salle 2 : 4.20 s  (vidée 161 fois, morts 0) · 0 % létalité/tentative
    salle 3 : 4.90 s  (vidée 159 fois, morts 2) · 1 % létalité/tentative
    salle 4 : 9.50 s  (vidée 156 fois, morts 3) · 2 % létalité/tentative
    salle 5 : 10.00 s  (vidée 153 fois, morts 3) · 2 % létalité/tentative
    salle 6 : 10.50 s  (vidée 145 fois, morts 8) · 5 % létalité/tentative
    salle 7 : 12.80 s  (vidée 140 fois, morts 5) · 3 % létalité/tentative
    salle 8 : 13.80 s  (vidée 138 fois, morts 2) · 1 % létalité/tentative
    salle 9 : 14.10 s  (vidée 133 fois, morts 5) · 4 % létalité/tentative
    salle 10 : 50.20 s  (vidée 40 fois, morts 93) · 70 % létalité/tentative

--- Chapitre 3 : validé par 40/40 graines · 0.64 h cumulées (+0.15 h) · 3.00 descentes · salle la plus meurtrière [10,90]
    salle 10 la plus meurtrière : oui
    (lecture par tentative : salle 10, 69 % de létalité)
    salle 1 : 4.50 s  (vidée 175 fois, morts 0) · 0 % létalité/tentative
    salle 2 : 3.90 s  (vidée 175 fois, morts 0) · 0 % létalité/tentative
    salle 3 : 4.80 s  (vidée 169 fois, morts 6) · 3 % létalité/tentative
    salle 4 : 8.50 s  (vidée 162 fois, morts 7) · 4 % létalité/tentative
    salle 5 : 9.90 s  (vidée 161 fois, morts 1) · 1 % létalité/tentative
    salle 6 : 10.10 s  (vidée 152 fois, morts 9) · 6 % létalité/tentative
    salle 7 : 11.90 s  (vidée 145 fois, morts 7) · 5 % létalité/tentative
    salle 8 : 13.30 s  (vidée 137 fois, morts 8) · 6 % létalité/tentative
    salle 9 : 14.00 s  (vidée 130 fois, morts 7) · 5 % létalité/tentative
    salle 10 : 49.40 s  (vidée 40 fois, morts 90) · 69 % létalité/tentative

--- Chapitre 4 : validé par 40/40 graines · 0.85 h cumulées (+0.21 h) · 5.00 descentes · salle la plus meurtrière [10,141]
    salle 10 la plus meurtrière : oui
    (lecture par tentative : salle 10, 78 % de létalité)
    salle 1 : 4.30 s  (vidée 319 fois, morts 0) · 0 % létalité/tentative
    salle 2 : 3.10 s  (vidée 319 fois, morts 0) · 0 % létalité/tentative
    salle 3 : 4.90 s  (vidée 308 fois, morts 11) · 3 % létalité/tentative
    salle 4 : 8.40 s  (vidée 295 fois, morts 13) · 4 % létalité/tentative
    salle 5 : 9.60 s  (vidée 274 fois, morts 21) · 7 % létalité/tentative
    salle 6 : 9.10 s  (vidée 249 fois, morts 25) · 9 % létalité/tentative
    salle 7 : 11.80 s  (vidée 209 fois, morts 40) · 16 % létalité/tentative
    salle 8 : 13.40 s  (vidée 192 fois, morts 17) · 8 % létalité/tentative
    salle 9 : 14.10 s  (vidée 181 fois, morts 11) · 6 % létalité/tentative
    salle 10 : 52.10 s  (vidée 40 fois, morts 141) · 78 % létalité/tentative

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

Relevé obtenu par exécution directe de `npm run calibrate` sur `src/content/balance.json`
inchangé (aucune ligne éditée par cette tâche), pas seulement rejoué depuis le balayage —
identique au chiffre près au point `rewardBase = 104` du balayage (`ecart.x = 4,88`,
`s10 = 46,40 s`, `ch1 = 0,37 h / 17 descentes`, marges `+0,12 / +0,15 / +0,21`). Le bloc
chapitre 1 (`0,37 h / 17 descentes`, salle 10 à `46,40 s`, 229 morts) est identique aux trois
rapports complets déjà relevés dans ce journal (`damageK`, `spinPerChapter`/`attackPerChapter`,
et celui-ci) : c'est exactement ce que prédit l'instrument, puisque le chapitre 1 ne dépend que
de `damageK` et `rewardBase`, tous deux inchangés (1,10 et 104) sur les trois captures, et
jamais des trois constantes à exposant `chapitre − 1`. Les chapitres 2 à 4, en revanche, ne
coïncident dans leur intégralité qu'avec la section `spinPerChapter`/`attackPerChapter` — les
deux rapports partagent les quatre mêmes constantes gelées. Ils **ne coïncident pas** avec le
rapport `damageK` : celui-ci a été capturé au commit `cee2661`, avant que la tâche 5 ne déplace
`spinPerChapter` de 1,02 à 1,05 — ses chapitres 3 et 4 y lisent +0,06 h et +0,16 h (salle 10 du
chapitre 4 à 43,50 s / 117 morts), contre +0,15 h et +0,21 h ici (52,10 s / 141 morts). Contrôle
croisé réel : le chapitre 1, sur trois captures indépendantes — pas le rapport complet.

`npm run test` : 490 tests, 35 fichiers, tous verts.

## Ce qui reste en dette après cette tâche

- **Le seuil exact où le garde-fou 2 (passivité) casse n'est pas localisé plus finement que
  l'intervalle `]132 ; 140]`** — huit points d'écart sur la grille, jamais affinés. Si une passe
  future avait besoin de cette borne avec précision (pour documenter une marge de sécurité
  plutôt qu'un simple encadrement), l'affiner d'abord serait la façon correcte de procéder.
- **`90` n'a pas de voisin inférieur testé** : son statut d'intérieur du palier n'est ni
  démontré ni réfuté par cette grille. Sans conséquence sur la décision (il n'était de toute
  façon pas nécessaire au départage), mais à garder en tête si une passe future élargit la
  grille vers le bas.
- **`econ.rewardPerChapter` reste à balayer**, sous les quatre constantes désormais gelées
  (`damageK = 1,10`, `spinPerChapter = 1,05`, `attackPerChapter = 1,10`,
  `rewardBase = 104`) — tâche 7 de cette passe, commit séparé, toujours pas de combat dans le
  même commit que l'économie.

---

# L'économie (suite et fin) — `econ.rewardPerChapter`

> Tâche 7 de `docs/superpowers/plans/2026-09-02-remesure-cinq-constantes.md` — la cinquième et
> dernière constante de cette passe. Les quatre déjà retenues sont gelées sur tout ce balayage :
> `combat.damageK` 1,10, `bot.scaling.spinPerChapter` 1,05, `bot.scaling.attackPerChapter` 1,10,
> `econ.rewardBase` 104. `econ.rewardPerChapter` porte l'exposant `chapitre − 1`, comme les deux
> `bot.scaling.*` à la tâche 5 : il ne touche pas le chapitre 1.

## Contrôle d'instrument : le chapitre 1 est identique aux douze points, une deuxième fois

Même discipline qu'à la tâche 5 : un facteur d'exposant `chapitre − 1` ne doit rien changer à ce
que le chapitre 1 mesure, et ça se vérifie directement plutôt que de se supposer. Sur les douze
points de la grille `econ.rewardPerChapter ∈ {0,90 · 1,00 · 1,02 · 1,05 · 1,08 · 1,10 · 1,13 ·
1,15 · 1,18 · 1,20 · 1,25 · 1,30}`, une seule valeur distincte pour le quadruplet (chapitre 1 en
heures, descentes, durée de la salle 10, écart entre châssis) :

```
["0.37", "17.00", "46.40", 4.88]
```

C'est la deuxième fois dans cette passe que ce contrôle passe sans exception (la première à la
tâche 5, pour les deux `bot.scaling.*`). Il porte une conséquence pour la suite de cette section :
les **trois départages numérotés** (écart châssis, durée de la salle 10 du chapitre 1, durée du
chapitre 1) sont chacun une grandeur du chapitre 1 — et le chapitre 1 est ici, par construction,
identique aux douze points. Le résultat de cette section n'est donc pas seulement « aucun
départage n'a séparé les candidats », c'est « aucun des trois départages numérotés **ne pouvait**
séparer les candidats sur ce bouton précis » — développé plus bas, après le balayage brut.

## Le balayage brut — douze points, quarante graines

Le chapitre 1, la salle 10 du chapitre 1 et l'écart entre châssis étant identiques partout
(ci-dessus), ils sont donnés une fois en tête de tableau plutôt que répétés à chaque ligne :
`ch. 1 = 0,37 h / 17 descentes`, `salle 10 ch. 1 = 46,40 s`, `écart châssis = ×4,88`. Le verrou
du châssis reste actif et le premier coffre reste à 0,00 h sur toute la grille (comme aux tâches
précédentes) ; la passivité reste « jamais » en 20 h simulées, y compris sur les deux points hors
domaine et sur les deux points où le garde-fou 1 casse.

| `rewardPerChapter` | GF1 (ch1→4) | graines (ch1→4) | marges ch. 2/3/4 |
|---|---|---|---|
| 0,90 (diagnostic) | oui·oui·oui·oui | 40·40·40·40 | +0,13 / +0,13 / +0,13 |
| 1,00 (diagnostic) | oui·oui·oui·oui | 40·40·40·40 | +0,13 / +0,13 / +0,12 |
| 1,02 | oui·oui·oui·oui | 40·40·40·40 | +0,13 / +0,13 / +0,19 |
| 1,05 | oui·oui·oui·oui | 40·40·40·40 | +0,13 / +0,14 / +0,18 |
| 1,08 | oui·oui·oui·oui | 40·40·40·40 | +0,12 / +0,16 / +0,12 |
| 1,10 | oui·oui·oui·oui | 40·40·40·40 | +0,13 / +0,16 / +0,17 |
| 1,13 | oui·oui·oui·oui | 40·40·40·40 | +0,10 / +0,15 / +0,22 |
| **1,15 (retenue)** | **oui·oui·oui·oui** | **40·40·40·40** | **+0,12 / +0,15 / +0,21** |
| 1,18 | oui·oui·oui·oui | 40·40·40·40 | +0,15 / +0,12 / +0,24 |
| 1,20 | oui·oui·oui·oui | 40·40·40·40 | +0,09 / +0,12 / +0,21 |
| 1,25 | oui·oui·oui·**NON** | 40·40·40·**38** | +0,14 / +0,13 / +0,18 |
| 1,30 | oui·oui·oui·**NON** | 40·40·40·**29** | +0,10 / +0,18 / +0,37 |

## Le palier des garde-fous durs, et où il casse

`[0,90 ; 1,20]` tient les cinq garde-fous durs sans exception, dix points de suite. Le palier
casse à `1,25` : au chapitre 4, la salle la plus meurtrière n'est plus la 10 mais la 3
(1 451 morts recensées sur la salle 3, contre 141 sur la salle 10 du même chapitre à la valeur
retenue `1,15` — garde-fou 1 cassé) et seules 38 graines sur 40 valident encore ce chapitre
(garde-fou 5). Les deux se dégradent ensemble à `1,30` : toujours la salle 3 la plus meurtrière
au chapitre 4 (11 404 morts), et 29 graines sur 40 seulement. Aux deux points, la casse reste
localisée au chapitre 4 — les chapitres 1 à 3 tiennent `oui` et `40/40` aux deux valeurs.

## La contrainte de signe : domaine `> 1,0`, non rouverte

Décidée au lot A, rappelée en tête de ce journal (borne 1 du mandat) et déjà réaffirmée dans le
brief de cette tâche : un facteur `< 1` ferait payer *moins* une salle d'un chapitre *plus dur*,
or le farm hors-ligne est verrouillé sur le meilleur chapitre validé (pilier n° 5 de
`CLAUDE.md`) — progresser ferait donc **baisser** le revenu hors-ligne. `0,90` et `1,00` ne
sont donc jamais des candidats, quelle que soit leur performance sur les garde-fous ou les
départages. Le tableau ci-dessus les inclut malgré tout, marqués « diagnostic » : c'est
précisément à `1,00` qu'ils servent, développé plus bas (« Le mur du chapitre 4 tient à deux
constantes »). Cette décision n'est pas rouverte ici.

## Départage : ne retenir que les points intérieurs du palier

Même règle qu'aux trois sections précédentes (spec § 4) : un point n'est un candidat que si ses
deux voisins **directs de la grille testée** tiennent eux aussi les cinq garde-fous durs.
Appliqué ici, restreint au domaine `> 1,0` par la contrainte de signe : `1,20` a pour voisin
supérieur `1,25`, qui casse — `1,20` est donc exclu, au même titre que `1,16` l'était pour
`spinPerChapter` à la tâche 5. Tous les autres points de `{1,02 ; … ; 1,18}` ont leurs deux
voisins directs à l'intérieur du palier démontré (y compris `1,02`, dont le voisin inférieur
`1,00` tient les cinq garde-fous durs même s'il n'est pas lui-même un candidat éligible).

**Candidats intérieurs : `{1,02 ; 1,05 ; 1,08 ; 1,10 ; 1,13 ; 1,15 ; 1,18}`.**

## Les départages numérotés ne peuvent rien séparer ici — et c'est structurel, pas un manque de mesure

Aux trois sections précédentes, les départages 6 (écart châssis), 7 (durée de la salle 10 du
chapitre 1) et 8 (durée du chapitre 1) tranchaient parfois, ou étaient à égalité *dans la marge
de bruit*. Ici, les sept candidats intérieurs partagent une **valeur unique et identique** sur
les trois : `écart = ×4,88`, `salle 10 ch. 1 = 46,40 s`, `ch. 1 = 0,37 h` — le contrôle
d'instrument, ci-dessus, l'a déjà établi. Ce n'est pas une égalité *dans* la marge de bruit,
c'est une égalité **exacte**, parce que les trois départages numérotés portent tous sur des
grandeurs du chapitre 1, et que `rewardPerChapter` porte l'exposant `chapitre − 1` : à ce
chapitre, son exposant vaut 0, et il ne peut *structurellement* rien changer à ces trois mesures,
quelle que soit sa valeur. Ce n'est donc pas une propriété de ce balayage — c'est une propriété
du bouton lui-même, qui aurait été la même avec n'importe quelle grille testée. Le seul critère
qui reste disponible pour départager les sept candidats est la **forme de la courbe de coût
marginal** (marges des chapitres 2 à 4) — le même critère que la tâche 5 a dû mobiliser pour
`spinPerChapter`, mais qui devient ici, faute d'alternative, le seul critère plutôt qu'un
critère de renfort.

## Le départage par la forme de la courbe, et la valeur retenue

Sur le relevé canonique, l'écart entre la marge du chapitre 4 et le maximum des marges des
chapitres 2 et 3 (« ch. 4 le plus cher, de combien ») aux sept candidats intérieurs :

| `rewardPerChapter` | marges ch. 2/3/4 | max(ch.2, ch.3) | écart ch.4 − max | tient « ch. 4 le plus cher » (plancher 0,04 h) |
|---|---|---|---|---|
| 1,02 | +0,13 / +0,13 / +0,19 | +0,13 | +0,06 | oui |
| 1,05 | +0,13 / +0,14 / +0,18 | +0,14 | +0,04 | à la limite du plancher |
| 1,08 | +0,12 / +0,16 / +0,12 | +0,16 | **−0,04** | non — ch. 3 plus cher que ch. 4 |
| 1,10 | +0,13 / +0,16 / +0,17 | +0,16 | +0,01 | non — dans le plancher |
| 1,13 | +0,10 / +0,15 / +0,22 | +0,15 | +0,07 | oui |
| **1,15 (retenue)** | **+0,12 / +0,15 / +0,21** | **+0,15** | **+0,06** | **oui** |
| 1,18 | +0,15 / +0,12 / +0,24 | +0,15 | +0,09 | oui |

Sur ce seul relevé canonique, `1,18` a le plus grand écart des sept (+0,09) et la marge de
chapitre 4 la plus élevée (+0,24) — le rival le plus sérieux si l'on cherchait à déplacer la
valeur retenue. Mais son avance sur `1,15` au chapitre 4 (+0,24 contre +0,21) ne fait que **0,03
h** — sous le plancher de bruit de coût marginal de cette passe (~0,04 h, résiduel ±0,02 h,
établi à la section `damageK`) : ce n'est pas une mesure, c'est du bruit.

Et surtout : **`1,15` est le seul des sept candidats dont la forme a été vérifiée sur jeux
disjoints** — pas dans ce balayage, mais dans celui de la tâche 5. Le balayage de forme de la
tâche 5 gelait `econ.rewardPerChapter` à 1,15 en testant `spinPerChapter`, et l'un de ses trois
candidats testés valait `spinPerChapter = 1,05` — exactement la valeur retenue par cette même
tâche 5, et donc exactement la combinaison de cette section-ci. La table de forme de la tâche 5
(section « La forme de la courbe, vérifiée sur jeux disjoints avant d'être écrite ») donne, à ce
point précis, sur le jeu canonique et deux jeux disjoints (`k=100..139`, `k=200..239`) :

| jeu | marge ch. 2 | marge ch. 3 | marge ch. 4 |
|---|---|---|---|
| canonique | +0,12 | +0,15 | +0,21 |
| `k=100` | +0,09 | +0,13 | +0,19 |
| `k=200` | +0,12 | +0,11 | +0,24 |

L'étendue du chapitre 4 sur les trois jeux, `[+0,19 ; +0,24]`, ne recouvre à aucun point celle du
chapitre 3, `[+0,11 ; +0,15]` — sans recouvrement, la même lecture qu'à la tâche 5. Aucun des six
autres candidats intérieurs n'a cette confirmation : chacun n'a qu'une seule mesure canonique,
exactement le type de lecture à un seul jeu de graines dont la tâche 5 a montré qu'il pouvait
mentir (`spinPerChapter = 1,02`, retenu par un seul relevé canonique, s'est révélé non robuste
sur jeux disjoints). Aucun candidat ne bat donc `1,15` sur ce critère, et `1,15` porte une
preuve que les six autres n'ont pas. La règle de repli du mandat s'applique telle quelle : « si
le palier entier reste indécis, la valeur commitée est conservée » — ici appliquée à un groupe
où aucun département ne sépare, et où la valeur commitée est en outre le seul membre
confirmé sur jeux disjoints.

**`econ.rewardPerChapter` : confirmée à 1,15. Aucun changement à `src/content/balance.json`.**

C'est la deuxième confirmation sans changement de cette passe (la première : `econ.rewardBase =
104`, tâche 6) — un résultat de la mesure, pas une tâche restée incomplète.

## Le mur du chapitre 4 tient à deux constantes, pas une

C'est le résultat le plus important de cette section, et il dépasse ce seul bouton.

Le point diagnostic `rewardPerChapter = 1,00` isole, par construction, l'effet du facteur
`rewardPerChapter` : à `1,00`, `Math.pow(1, n) = 1` pour tout chapitre `n`, le revenu par salle
est donc identique aux quatre chapitres, et toute forme observée dans les marges provient
uniquement de la difficulté (les deux `bot.scaling.*`, gelés à `spinPerChapter = 1,05` et
`attackPerChapter = 1,10` sur tout ce balayage). Or à ce point, la courbe de coût marginal est
**plate** : `+0,13 / +0,13 / +0,12` — aucun écart au-dessus du plancher de bruit de 0,04 h entre
les trois chapitres. **La difficulté seule, à la valeur de `spinPerChapter` désormais retenue,
ne produit pas le mur du chapitre 4.**

Ce résultat prend tout son sens à côté de celui de la tâche 5 : à `spinPerChapter = 1,02` (la
valeur qui était en place *avant* cette passe), avec `rewardPerChapter` alors gelé à 1,15, le
mur n'était déjà pas tenu de façon robuste — chapitre 4 le moins cher des trois sur un jeu de
graines disjoint sur trois. Les deux mesures, prises ensemble, disent que ni la difficulté seule
(`rewardPerChapter = 1,00`, cette tâche) ni l'économie seule à son ancienne valeur de difficulté
(`spinPerChapter = 1,02`, tâche 5) ne suffit à tenir le mur — il faut les deux constantes
retenues ensemble (`spinPerChapter = 1,05` **et** `rewardPerChapter > 1,00`, concrètement 1,15)
pour que le chapitre 4 se détache mesurablement des chapitres 2 et 3. Ce projet n'avait jamais
mesuré cela avant cette passe.

**À ne pas lire au-delà de ce qui est mesuré** : ceci n'établit ni une carte à deux dimensions du
domaine (`spinPerChapter × rewardPerChapter` n'a été balayé qu'à un seul point croisé,
`spin = 1,05` fixe pendant ce balayage-ci de `rewardPerChapter`, `rewardPerChapter = 1,15` fixe
pendant celui de `spinPerChapter` à la tâche 5), ni un seuil précis pour aucune des deux
constantes en dessous duquel le mur casserait. Ce qui est mesuré, précisément : à `spin = 1,05`,
`rewardPerChapter = 1,00` donne une courbe plate ; à `rewardPerChapter = 1,15`,
`spin = 1,02` ne tient pas le mur de façon robuste. Deux points, pas une surface.

## L'économie n'a pas bougé dans cette passe

Ligne à part, parce qu'elle contraste avec le reste de la passe : les deux constantes
d'économie de ce mandat, `rewardBase` (104, tâche 6) et `rewardPerChapter` (1,15, cette tâche),
sont toutes deux **confirmées**, sans changement. Ce sont les trois constantes de combat
(`damageK`, `spinPerChapter`, `attackPerChapter`) qui avaient dérivé sous `fc827ee` et qu'il a
fallu reposer (tâches 4 et 5). Rappel utile pour la suite : le trouble venait de la détection de
collision, un mécanisme de combat — l'économie n'y était pour rien, et la mesure le confirme
plutôt que de le supposer.

## Ce que ce balayage a appris

### 1. Un contrôle d'instrument qui passe deux fois de suite cesse d'être un simple garde-fou — il devient une propriété exploitable du bouton

Le contrôle « chapitre 1 identique » a été conçu comme une vérification de non-régression (la
tâche 5 l'a introduit pour cette raison). Ici, il a fait plus : parce qu'il passe avec une
**égalité exacte**, pas seulement une égalité sous le plancher de bruit, il permet de savoir
*avant* de départager qu'aucun des trois départages numérotés ne pourra rien séparer — sans
avoir à mesurer chacun des sept candidats sur ce point pour le découvrir. Un bouton dont
l'exposant vaut 0 au chapitre 1 rend structurellement caduques les trois départages qui ne
portent que sur le chapitre 1.

### 2. Une confirmation de forme obtenue "par accident" reste une confirmation

Le balayage de forme sur jeux disjoints qui départage cette section n'a pas été mesuré pour
cette tâche : c'est celui de la tâche 5, qui gelait `rewardPerChapter` à 1,15 en balayant
`spinPerChapter`. Le hasard des deux mandats (l'un balayait `spin` à `rewardPerChapter` fixé,
l'autre balaie `rewardPerChapter` à `spin` fixé) a produit un point de recouvrement exact. Ce
n'est pas moins rigoureux qu'une mesure faite exprès pour cette tâche — c'est la même mesure,
au même point, et il aurait été un gaspillage de la relancer. Mais ça ne se généralise pas :
sans ce recouvrement fortuit, aucun des sept candidats n'aurait eu de confirmation sur jeux
disjoints, et la règle de repli aurait dû s'appliquer à un groupe où le membre retenu n'aurait
eu, lui non plus, qu'une mesure canonique unique — toujours suffisant pour la règle de repli
(elle ne demande pas de confirmation, seulement l'absence de tout candidat mesurément
supérieur), mais moins confortable.

### 3. Le mur du chapitre 4 n'est la propriété d'aucune constante seule — c'est la première fois que cette passe le mesure directement

Les quatre tâches précédentes de cette passe ont chacune testé un bouton à la fois, combat gelé
ou économie gelée selon le temps. Le point diagnostic de cette tâche (`rewardPerChapter = 1,00`)
est le premier de la passe à isoler l'effet de la difficulté seule sur la forme de la courbe, et
il montre qu'elle ne suffit pas. Mis à côté du résultat de la tâche 5 sur `spinPerChapter =
1,02`, la conclusion — deux constantes, une de combat et une d'économie, sont chacune
nécessaires et ni l'une ni l'autre seule suffisante — est un résultat que la structure de cette
passe (un bouton à la fois) ne pouvait produire qu'à la toute fin, en mettant deux sections en
regard l'une de l'autre.

### 4. Une relecture (fix round 1/5) a trouvé la même erreur ici et dans la section `rewardBase` — copiée, pas réécrite

Les phrases de contrôle croisé des sections `rewardBase` et `rewardPerChapter` affirmaient
chacune que le rapport complet coïncidait avec *tous* les rapports précédents du journal, `damageK`
compris. C'est faux pour `damageK` : son rapport a été capturé au commit `cee2661`, avant que la
tâche 5 ne déplace `spinPerChapter` de 1,02 à 1,05 — seul le bloc chapitre 1 (invariant à
l'exposant `chapitre − 1`, et aux deux constantes qui restent gelées de bout en bout) coïncide
réellement sur les quatre captures ; les chapitres 2 à 4 divergent dès qu'un rapport a été pris
avant ce déplacement. Les deux phrases corrigées ci-dessus et à la section `rewardBase`. C'est la
**cinquième** instance de ce même défaut dans cette passe — une phrase dont les deux moitiés
viennent de mesures différentes — et elle s'est propagée par copie d'une section voisine plutôt
que par une phrase réécrite à neuf : la phrase de `rewardPerChapter` avait été calquée sur celle,
déjà fausse, de `rewardBase`. Ce mécanisme précis — la copie d'une phrase fautive d'une section à
l'autre — n'a pas d'antécédent vérifié ailleurs dans ce journal : la surenchère de la section
`damageK` (« Cycle 2/5 », § « Le départage terminal ») est un mécanisme différent, une erreur qui
renaît *à l'intérieur* de la correction d'une précédente, pas une copie venue d'ailleurs. C'est
cette propagation-là, plus que l'erreur elle-même, qui vaut d'être notée : une correction qui
laisse l'instance d'origine debout n'est pas une correction, elle en garde une copie active.

## Lecture des garde-fous et départages à la valeur retenue (`rewardPerChapter = 1,15`)

| Garde-fou / départage | État | Mesure |
|---|---|---|
| 1. Salle 10 la plus meurtrière — 4 chapitres | **TENU** | `oui×4` |
| 2. Passivité « jamais » | **TENU** | jamais en 20 h simulées |
| 3. Premier coffre immédiat | **TENU** | 0,00 h |
| 4. Verrou du châssis actif | **TENU** | actif |
| 5. 40/40 graines, 4 chapitres | **TENU** | `40/40/40/40` |
| contrainte de signe — domaine `> 1,0` | **NON ROUVERTE** | `0,90` et `1,00` diagnostics, jamais candidats |
| interne — points intérieurs seulement | **DÉCIDE** (exclut `1,20`) | voisin `1,25` casse GF1/GF5 |
| 6. Écart châssis (départage) | ne peut pas séparer | ×4,88, identique aux 7 candidats (exposant 0 au ch. 1) |
| 7. Salle 10 ch. 1 (départage) | ne peut pas séparer | 46,40 s, identique aux 7 candidats |
| 8. Durée du chapitre 1 (départage) | ne peut pas séparer | 0,37 h, identique aux 7 candidats |
| forme — confirmée sur jeux disjoints | **DÉCIDE** | seul `1,15` confirmé (recouvrement avec la tâche 5) ; `1,18` (meilleur du relevé canonique) ne bat `1,15` que de 0,03 h, sous le plancher |
| repli — palier indécis → valeur commitée conservée | **DÉCIDE** | 1,15 déjà membre du groupe, et seul membre confirmé |

## Rapport complet à la valeur retenue (`econ.rewardPerChapter = 1,15`, quarante graines)

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

--- Chapitre 2 : validé par 40/40 graines · 0.49 h cumulées (+0.12 h) · 3.00 descentes · salle la plus meurtrière [10,93]
    salle 10 la plus meurtrière : oui
    (lecture par tentative : salle 10, 70 % de létalité)
    salle 1 : 4.40 s  (vidée 161 fois, morts 0) · 0 % létalité/tentative
    salle 2 : 4.20 s  (vidée 161 fois, morts 0) · 0 % létalité/tentative
    salle 3 : 4.90 s  (vidée 159 fois, morts 2) · 1 % létalité/tentative
    salle 4 : 9.50 s  (vidée 156 fois, morts 3) · 2 % létalité/tentative
    salle 5 : 10.00 s  (vidée 153 fois, morts 3) · 2 % létalité/tentative
    salle 6 : 10.50 s  (vidée 145 fois, morts 8) · 5 % létalité/tentative
    salle 7 : 12.80 s  (vidée 140 fois, morts 5) · 3 % létalité/tentative
    salle 8 : 13.80 s  (vidée 138 fois, morts 2) · 1 % létalité/tentative
    salle 9 : 14.10 s  (vidée 133 fois, morts 5) · 4 % létalité/tentative
    salle 10 : 50.20 s  (vidée 40 fois, morts 93) · 70 % létalité/tentative

--- Chapitre 3 : validé par 40/40 graines · 0.64 h cumulées (+0.15 h) · 3.00 descentes · salle la plus meurtrière [10,90]
    salle 10 la plus meurtrière : oui
    (lecture par tentative : salle 10, 69 % de létalité)
    salle 1 : 4.50 s  (vidée 175 fois, morts 0) · 0 % létalité/tentative
    salle 2 : 3.90 s  (vidée 175 fois, morts 0) · 0 % létalité/tentative
    salle 3 : 4.80 s  (vidée 169 fois, morts 6) · 3 % létalité/tentative
    salle 4 : 8.50 s  (vidée 162 fois, morts 7) · 4 % létalité/tentative
    salle 5 : 9.90 s  (vidée 161 fois, morts 1) · 1 % létalité/tentative
    salle 6 : 10.10 s  (vidée 152 fois, morts 9) · 6 % létalité/tentative
    salle 7 : 11.90 s  (vidée 145 fois, morts 7) · 5 % létalité/tentative
    salle 8 : 13.30 s  (vidée 137 fois, morts 8) · 6 % létalité/tentative
    salle 9 : 14.00 s  (vidée 130 fois, morts 7) · 5 % létalité/tentative
    salle 10 : 49.40 s  (vidée 40 fois, morts 90) · 69 % létalité/tentative

--- Chapitre 4 : validé par 40/40 graines · 0.85 h cumulées (+0.21 h) · 5.00 descentes · salle la plus meurtrière [10,141]
    salle 10 la plus meurtrière : oui
    (lecture par tentative : salle 10, 78 % de létalité)
    salle 1 : 4.30 s  (vidée 319 fois, morts 0) · 0 % létalité/tentative
    salle 2 : 3.10 s  (vidée 319 fois, morts 0) · 0 % létalité/tentative
    salle 3 : 4.90 s  (vidée 308 fois, morts 11) · 3 % létalité/tentative
    salle 4 : 8.40 s  (vidée 295 fois, morts 13) · 4 % létalité/tentative
    salle 5 : 9.60 s  (vidée 274 fois, morts 21) · 7 % létalité/tentative
    salle 6 : 9.10 s  (vidée 249 fois, morts 25) · 9 % létalité/tentative
    salle 7 : 11.80 s  (vidée 209 fois, morts 40) · 16 % létalité/tentative
    salle 8 : 13.40 s  (vidée 192 fois, morts 17) · 8 % létalité/tentative
    salle 9 : 14.10 s  (vidée 181 fois, morts 11) · 6 % létalité/tentative
    salle 10 : 52.10 s  (vidée 40 fois, morts 141) · 78 % létalité/tentative

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

Relevé obtenu par exécution directe de `npm run calibrate` sur `src/content/balance.json`
inchangé (aucune ligne éditée par cette tâche) — identique au chiffre près au point
`rewardPerChapter = 1,15` du balayage (`ecart.x = 4,88`, `s10 = 46,40 s`, `ch1 = 0,37 h / 17
descentes`, marges `+0,12 / +0,15 / +0,21`). Le bloc chapitre 1 (`0,37 h / 17 descentes`,
salle 10 à `46,40 s`, 229 morts) est identique aux quatre rapports complets de ce journal
(`damageK`, `spinPerChapter`/`attackPerChapter`, `rewardBase`, et celui-ci) : c'est
l'instrument, pas une coïncidence — le chapitre 1 ne dépend que de `damageK` et `rewardBase`
(inchangés à 1,10 et 104 sur les quatre captures), jamais des trois constantes à exposant
`chapitre − 1`. Les chapitres 2 à 4, eux, ne coïncident dans leur intégralité qu'avec les
sections `spinPerChapter`/`attackPerChapter` et `rewardBase` — les trois rapports partagent les
quatre mêmes constantes gelées depuis la tâche 5. Ils **ne coïncident pas** avec le rapport
`damageK`, capturé au commit `cee2661` avant que la tâche 5 ne déplace `spinPerChapter` de 1,02
à 1,05 (ses chapitres 3 et 4 y lisent +0,06 h et +0,16 h, salle 10 du chapitre 4 à
43,50 s / 117 morts, contre +0,15 h et +0,21 h ici). Contrôle croisé réel : le chapitre 1, sur
quatre captures indépendantes — pas le rapport complet.

`npm run test` : 490 tests, 35 fichiers, tous verts.

## Ce qui reste en dette après cette tâche

- **Trois des sept candidats intérieurs (`1,05`, `1,08`, `1,10`) n'ont qu'une mesure canonique
  unique**, jamais vérifiée sur jeux disjoints — `1,08` inverse même l'ordre ch.3/ch.4 sur ce
  seul relevé (+0,16 contre +0,12), et `1,10` ne sépare pas ch.3 de ch.4 (écart de 0,01 h, dans
  le plancher). Aucun des deux n'est écarté par une mesure directe : ils restent simplement
  moins bien caractérisés que `1,15`, qui a hérité sa confirmation d'un recouvrement fortuit
  avec la tâche 5. Une passe future qui rouvrirait ce bouton gagnerait à les tester sur jeux
  disjoints avant de les départager pour de bon.
- **`spinPerChapter × rewardPerChapter` n'a jamais été balayé en deux dimensions** : chaque
  constante a été mesurée à l'autre fixée à sa valeur retenue, jamais les deux variées
  ensemble. Le résultat « le mur tient à deux constantes » (ci-dessus) s'appuie sur deux points
  du domaine, pas sur une carte — une carte 2D serait le prolongement naturel si une passe
  future veut caractériser précisément où, entre `spin = 1,02` et `spin = 1,05`, le mur devient
  robuste.
- **Domaine `≤ 1,0`** : `0,90` et `1,00` restent, par construction du mandat, hors de portée de
  toute reconsidération de `rewardPerChapter` tant que le farm hors-ligne reste verrouillé sur
  le meilleur chapitre validé (pilier n° 5). Ce n'est pas une dette de mesure — c'est la
  contrainte de signe, qui ne se rouvre pas sur la seule performance d'un point.
- **Les cinq constantes du mandat de cette passe sont maintenant toutes reposées** :
  `combat.damageK` (1,30 → 1,10, tâche 4), `bot.scaling.spinPerChapter` (1,02 → 1,05, tâche 5),
  `bot.scaling.attackPerChapter` (confirmée 1,10, tâche 5), `econ.rewardBase` (confirmée 104,
  tâche 6), `econ.rewardPerChapter` (confirmée 1,15, cette tâche). Deux valeurs ont bougé, trois
  ont été confirmées inchangées — les cinq sous la même physique de collision, celle de
  `fc827ee`, mesurée avec le même protocole (quarante graines, cinq garde-fous durs, départages
  dans le même ordre) plutôt que supposée d'un bloc à l'autre.

---

# Le contrôle de fin de passe (temps 3) — pourquoi sa moitié était sans objet

> Tâche 8 de `docs/superpowers/plans/2026-09-02-remesure-cinq-constantes.md` — le contrôle de
> fin de passe. Les cinq constantes retenues aux tâches 4 à 7 sont gelées sur tout ce qui suit :
> `combat.damageK` 1,10, `bot.scaling.spinPerChapter` 1,05, `bot.scaling.attackPerChapter` 1,10,
> `econ.rewardBase` 104, `econ.rewardPerChapter` 1,15.

## Pourquoi ce temps existait

Le mandat de cette tâche reproduisait, terme à terme, un trou déjà documenté par ce dépôt
lui-même (`docs/game-design.md`, `bot.scaling.spinPerChapter` ; « Dette connue (jalon 3, lot A) »,
`docs/roadmap.md`) : au jalon 3, lot A, `spinPerChapter = 1,02` avait été choisi par un balayage
de combat qui tournait avec `econ.rewardPerChapter` gelé à sa valeur provisoire de 1,25 — puis la
passe d'économie qui a suivi l'a porté à 1,15, ce qui a aplati la marche que 1,02 achetait. « La
justification de 1,02 vaut pour le balayage du combat, pas pour le jeu livré. » Rien dans ce
lot-là n'avait jamais revérifié le combat contre l'économie qui a fini par être livrée.

Les tâches 6 et 7 de cette passe venaient de déplacer l'économie (`rewardBase`, puis
`rewardPerChapter`) sous les trois constantes de combat des tâches 4 et 5. Cette tâche devait
remesurer si ces trois-là y étaient encore chez elles — exactement le contrôle que le lot A
n'avait jamais fait.

## La première moitié du mandat était sans objet : l'économie n'a pas bougé

Elle ne l'a pas fait, et ce n'est pas une coïncidence à établir ici : c'est déjà écrit à la
section précédente de ce même journal (« L'économie n'a pas bougé dans cette passe »). `damageK`
(tâche 4) et `spinPerChapter`/`attackPerChapter` (tâche 5) ont tous deux été balayés avec
`econ.rewardBase` et `econ.rewardPerChapter` gelés à 104 et 1,15 dès le premier balayage de cette
passe (« Protocole de mesure », en tête de ce journal). Les tâches 6 et 7 ont ensuite balayé ces
deux constantes d'économie et les ont **confirmées**, sans changement, à ces mêmes valeurs — 104
et 1,15.

La boucle se referme donc exactement là où elle a commencé : les trois constantes de combat ont
été mesurées, du tout premier point du tout premier balayage, sous l'économie que la passe finit
par livrer. Il n'y a pas de rupture à vérifier à la frontière combat/économie, parce que rien n'a
changé de ce côté-là entre le moment où le combat a été calibré et le moment où l'économie a été
close — pas parce que le contrôle a été sauté, mais parce que la condition qui l'aurait rendu
nécessaire ne s'est jamais produite. C'est un résultat de cette tâche, pas une absence de
résultat : à la connaissance de l'historique documenté de ce dépôt (dette du jalon 2,5, puis
invalidation effective au jalon 3, lot A), c'est la **première fois** que les valeurs de combat
de ce projet ne se trouvent pas invalidées par la passe d'économie qui les suit — le lot A est
précisément le contre-exemple qui a rendu ce contrôle obligatoire.

## Le trou qui, lui, existait réellement : à l'intérieur même du combat

Le mandat visait la frontière combat/économie. Mais la même forme de défaut existait **à
l'intérieur du temps combat**, entre deux de ses propres tâches : `combat.damageK` a été choisi à
la tâche 4 par un balayage qui tournait avec `bot.scaling.spinPerChapter` encore gelé à 1,02 (sa
valeur d'avant cette passe) — puis la tâche 5, immédiatement après, a déplacé `spinPerChapter` à
1,05. La justification de `damageK = 1,10` (départages 6, 7 et 8, puis la règle terminale de
proximité à la valeur commitée, section `damageK` ci-dessus) a donc été formée sous une valeur
de `spinPerChapter` que la tâche suivante a changée
— la forme exacte du trou du lot A, un niveau plus bas : pas entre deux temps de la passe, mais
entre deux tâches du même temps.

## La revérification — cinq points, quarante graines

Cinq valeurs de `damageK` : la valeur retenue et ses deux voisines de part et d'autre sur la
grille de la tâche 4 (`0,80 · 0,90 · 0,95 · 1,00 · 1,05 · 1,10 · 1,15 · 1,20 · …`), balayées sous
les cinq constantes désormais closes de cette passe — `spinPerChapter = 1,05`,
`attackPerChapter = 1,10`, `rewardBase = 104`, `rewardPerChapter = 1,15` — quarante graines par
point.

| `damageK` | ch. 1 (h/desc.) | s10 ch. 1 | écart châssis | GF1 (ch1→4) | graines (ch1→4) | marges ch. 2/3/4 |
|---|---|---|---|---|---|---|
| 1,00 | 0,37 h / 15 | 52,50 s | ×5,14 | oui·oui·oui·oui | 40·40·40·40 | +0,16 / +0,15 / +0,19 |
| 1,05 | 0,37 h / 16 | 49,40 s | ×5,00 | oui·oui·oui·oui | 40·40·40·40 | +0,14 / +0,14 / +0,19 |
| **1,10 (retenue)** | **0,37 h / 17** | **46,40 s** | **×4,88** | **oui·oui·oui·oui** | **40·40·40·40** | **+0,12 / +0,15 / +0,21** |
| 1,15 | 0,36 h / 18 | 43,40 s | ×9,00 | oui·oui·oui·oui | 40·40·40·40 | +0,10 / +0,11 / +0,20 |
| 1,20 | 0,38 h / 19 | 40,80 s | ×8,56 | oui·oui·oui·oui | 40·40·40·40 | +0,12 / +0,12 / +0,19 |

Les cinq points tiennent les cinq garde-fous durs sans exception : `GF1` à `oui` aux quatre
chapitres, `40/40` graines aux quatre chapitres, passivité « jamais », verrou actif, premier
coffre à 0,00 h — partout, sur les cinq points. À `damageK = 1,10`, le relevé (`0,37 h / 17`,
`46,40 s`, `×4,88`, marges `+0,12 / +0,15 / +0,21`) coïncide au chiffre près avec les rapports
complets déjà pris à ce même point aux sections `spinPerChapter`/`attackPerChapter`, `rewardBase`
et `rewardPerChapter` de ce journal — un contrôle croisé de plus, gratuit, sur un point déjà
mesuré quatre fois par cette passe.

## Le résultat bit à bit identique au chapitre 1 — et pourquoi il ne pouvait pas en être autrement

Les cinq valeurs de `damageK` ci-dessus ont déjà été balayées une fois, à la tâche 4, sous
`spinPerChapter = 1,02` (`dk40-*.json`, section `damageK` de ce journal). Comparées champ à champ
avec le relevé JSON brut de cette tâche (`revef-*.json`) — pas seulement les colonnes résumées
du tableau ci-dessus, mais `h`, `marg`, `desc`, `mort`, `s10`, `let10`, l'objet `ecart` complet,
le détail par châssis et les trois garde-fous transversaux (`passif`, `verrou`, `coffre`) — les
cinq points sont **bit à bit identiques au chapitre 1** entre les deux tâches, aux cinq valeurs
de `damageK` :

```
1,00 : ch1 identique · écart identique · détail châssis identique · passif/verrou/coffre identiques
1,05 : ch1 identique · écart identique · détail châssis identique · passif/verrou/coffre identiques
1,10 : ch1 identique · écart identique · détail châssis identique · passif/verrou/coffre identiques
1,15 : ch1 identique · écart identique · détail châssis identique · passif/verrou/coffre identiques
1,20 : ch1 identique · écart identique · détail châssis identique · passif/verrou/coffre identiques
```

Les chapitres 2 à 4, en revanche, divergent bien entre les deux tâches à chacune des cinq
valeurs — c'est attendu, puisque `spinPerChapter` a changé entre elles, et que son exposant
`chapitre − 1` façonne précisément ces trois chapitres-là.

Ce n'est pas une coïncidence de plus à ajouter aux contrôles croisés déjà accumulés dans ce
journal — c'est **structurel**, et ça se déduit sans mesurer, comme le contrôle d'instrument des
tâches 5 et 7 l'a déjà établi pour `spinPerChapter` et `rewardPerChapter` : les deux facteurs
portent l'exposant `chapitre − 1`, qui vaut 0 au chapitre 1, donc `spinPerChapter` ne peut
*structurellement* rien changer à ce que le chapitre 1 mesure — ni à `1,02` (tâche 4) ni à
`1,05` (cette tâche). Or `damageK = 1,10` n'a pas été choisi par trois départages mais par
**quatre étapes** (section `damageK` ci-dessus, « Le départage terminal, et la valeur retenue ») :
les départages 6 (écart entre châssis), 7 (durée de la salle 10 du chapitre 1) et 8 (durée du
chapitre 1) sont chacun une grandeur du chapitre 1 — 6 a resserré le groupe bas et exclu 1,30 sur
jeux disjoints, 7 a éliminé 0,80 et 0,90 sans séparer les survivants, 8 les a laissés à égalité —
puis la **règle terminale** (« à mesure égale, retenir le point le plus proche de la valeur
commitée ») a tranché entre les quatre survivants. Les trois premières étapes ne peuvent pas voir
`spinPerChapter` parce que ce sont des grandeurs du chapitre 1 ; la quatrième ne le peut pas non
plus, pour une raison différente et plus forte — ce n'est **pas une mesure du jeu du tout**, mais
une distance dans l'espace des valeurs de `damageK` lui-même (`|1,10 − 1,30|` contre `|0,95 −
1,30|`, etc.), qui ne peut dépendre ni de `spinPerChapter`, ni du jeu de graines, ni de rien
d'autre que la grille testée. Les quatre étapes sont donc indépendantes du déplacement de
`spinPerChapter` — pas seulement « la revérification n'a rien trouvé », mais **le trou qu'elle
cherchait ne pouvait pas exister**, par construction du bouton et de la règle qui l'a choisi.
C'est plus fort qu'un résultat négatif : c'est une démonstration, pas seulement une mesure qui
échoue à trouver un problème.

## Conclusion : les valeurs retenues tiennent, telles quelles

`combat.damageK = 1,10` reste au centre d'un plateau à cinq points où les cinq garde-fous durs
tiennent sans exception, et sa justification — formée sous `spinPerChapter = 1,02` à la tâche 4
— ne pouvait pas être compromise par le passage à `1,05` (tâche 5) : les trois départages qui y
ont contribué (6, 7, 8) sont des grandeurs du chapitre 1, que `spinPerChapter` ne peut
structurellement pas toucher, et la règle terminale qui a choisi 1,10 parmi les survivants à
égalité n'est même pas une mesure du jeu — c'est une distance entre valeurs de `damageK`. Aucune
des cinq constantes de cette passe ne change à cette tâche. `src/content/balance.json` reste
inchangé — vérifié par `git diff` en fin de tâche.

## Ce que cette tâche apprend

### 1. Un mandat à deux moitiés peut voir l'une des deux se révéler sans objet, et c'est un résultat, pas un renoncement

Le mandat de cette tâche visait une frontière précise (combat/économie) parce que c'est celle-là
que le lot A avait laissée non vérifiée. La mesure a montré que cette frontière n'avait jamais
bougé sous les pieds du combat pendant cette passe — un résultat aussi réel que s'il avait fallu
recaler une constante, et le premier de ce genre dans l'historique documenté de ce projet pour ce
couple précis de temps.

### 2. La forme d'un défaut ne s'arrête pas à l'échelle où elle a été repérée la première fois

Le trou du lot A avait été décrit et corrigé à l'échelle de la passe (combat, puis économie).
Cette tâche montre qu'exactement la même forme — une constante justifiée sous une valeur qu'une
tâche suivante déplace — peut se reproduire une échelle plus bas, entre deux tâches du même
temps. Vérifier la frontière annoncée par le mandat ne suffisait pas à couvrir toutes les
frontières où ce défaut pouvait se reproduire ; il a fallu la chercher aussi là où le mandat ne
pointait pas.

### 3. Une propriété structurelle, une fois établie, transforme une revérification en démonstration

Le contrôle d'instrument des tâches 5 et 7 (l'exposant `chapitre − 1` vaut 0 au chapitre 1) avait
été introduit comme garde-fou de non-régression. Réutilisé ici sur un autre facteur du même
type, il ne se contente pas de confirmer l'absence de problème : il établit que le problème
cherché ne pouvait structurellement pas exister — à condition de couvrir toute la façon dont
`damageK` a été choisi, pas seulement sa part la plus facile à mesurer. Trois des quatre étapes
qui l'ont retenu (départages 6, 7 et 8) ne portent que sur le chapitre 1 ; la quatrième, la règle
terminale de proximité à la valeur commitée, n'est une mesure de rien — c'est une distance entre
valeurs de `damageK` — et elle est donc indépendante de `spinPerChapter` par un tout autre
argument. La même discipline — vérifier une propriété structurelle avant de conclure d'une
mesure — qui avait servi à départager sert ici à clore, mais seulement une fois qu'elle couvre
chaque étape de la décision, pas les trois qui se mesurent le plus facilement.

### 4. Fix round 1/5 : l'argument d'impossibilité oubliait l'étape qui avait vraiment choisi

La première version de cette section attribuait le choix de `damageK = 1,10` aux seuls
départages 6, 7 et 8 — trois étapes sur quatre. La section `damageK` de ce même journal
(« Le départage terminal, et la valeur retenue ») dit pourtant explicitement que les départages
7 et 8 « ne poussent dans aucune direction à l'intérieur du groupe » et que « le choix entre les
quatre revient donc entièrement à la règle terminale ». L'argument d'impossibilité, tel qu'écrit
d'abord, ne portait donc que sur les trois étapes qui ne décidaient pas, et laissait de côté celle
qui décidait réellement. La conclusion ne change pas — la règle terminale est, elle aussi,
indépendante de `spinPerChapter`, pour une raison encore plus directe qu'une grandeur du
chapitre 1 : ce n'est pas une mesure du tout — mais l'argument tel qu'il était écrit ne le
montrait pas. Repéré uniquement en relisant cette section contre la section `damageK`
elle-même, plutôt qu'en la relisant seule : la même classe de défaut que ce journal a déjà
comptée plusieurs fois — une portée énoncée plus large que ce que le texte cité couvre
réellement.
