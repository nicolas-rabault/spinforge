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

## L'analyse en bandes de l'écart entre châssis (départage 6)

Le départage 6 « arbitre en bandes, pas en valeurs ponctuelles » (ruling du contrôleur) : son
étendue mesurée entre jeux de graines disjoints vaut 1,45 à dix graines, 2,80 à quarante,
1,80 à quatre-vingts — elle ne décroît **pas** avec plus de graines, parce que c'est un rapport
de médianes de comptes entiers de descentes. Deux points dont l'écart diffère de moins d'un
facteur ~2 sont donc à égalité sur ce critère.

Les quatorze points se regroupent en quatre bandes internes, chacune tenue par un facteur
interne bien sous 2 :

| bande | domaine `damageK` | écart châssis | facteur interne (max/min) |
|---|---|---|---|
| A | 0,80 – 1,10 | ×3,83 – ×5,14 | ×1,34 |
| B | 1,15 – 1,30 | ×8,56 – ×10,44 | ×1,22 |
| C | 1,40 – 1,50 | ×13,30 – ×17,73 | ×1,33 |
| D | 1,60 – 1,70 | ×35,00 – ×48,42 | ×1,38 |

Entre les extrêmes des bandes, l'écart cesse d'être du bruit : bande A contre bande B au plus
loin (×3,83 contre ×10,44) vaut un facteur ×2,73 — deux fois le seuil de bruit. Bande A contre
la valeur commitée 1,30 (×3,83 contre ×9,30) vaut ×2,43, un écart réel, pas du bruit. **Bande A
referme donc mesurablement plus l'écart que les bandes B, C et D**, et c'est elle que le
départage 6 retient comme région candidate.

À l'intérieur de la bande A, en revanche, les six points sont à égalité stricte : le rapport
entre son minimum (0,80, ×3,83) et son maximum (1,10, ×4,88) vaut ×1,27, très sous le seuil de
2. C'est très précisément l'exemple donné en consigne — **interdit de choisir entre ×3,83 et
×4,88 sur leur différence** — et il tombe exactement sur les deux bornes de la bande A mesurée
ici. Note pour la suite : la frontière entre bandes A et B n'est pas nette au niveau du point
(1,10 à ×4,88 et 1,15 à ×9,00 seraient eux-mêmes à égalité au sens strict du facteur 2, un
artefact de transitivité de la règle du facteur), mais les **extrêmes** des deux bandes sont,
eux, séparés par une mesure réelle. Le départage 6 tranche donc entre bandes, pas entre voisins
immédiats — conforme à la règle.

**Départage 6 : la bande A (`damageK` ∈ [0,80 ; 1,10], six points) est retenue comme région
candidate ; les six points de la bande restent à égalité entre eux.** Passage au départage 7.

## Le départage 7 : la durée de la salle 10 du chapitre 1

Cible de cahier des charges ~45 s, borne dure interne au départage à 60 s (un point qui la
dépasse perd sur ce critère sans être rayé du palier), et ne pas rendre le boss « expédié ».
Sur les six points de la bande A :

| `damageK` | salle 10 ch. 1 | sous 60 s ? | écart à la cible ~45 s |
|---|---|---|---|
| 0,80 | 68,20 s | **non — perd** | — |
| 0,90 | 62,50 s | **non — perd** | — |
| 0,95 | 58,50 s | oui | 13,5 s |
| 1,00 | 52,50 s | oui | 7,5 s |
| 1,05 | 49,40 s | oui | 4,4 s |
| **1,10** | **46,40 s** | **oui** | **1,4 s** |

**0,80 et 0,90 perdent sur ce critère** : 68,2 s et 62,5 s dépassent la borne de 60 s — la
salle 10 y redevient un combat long, à l'opposé du terrain conquis par `fc827ee`. Ils restent
dans le palier (garde-fou dur non touché), mais ils perdent le départage.

Sur les quatre survivants, la série est **strictement monotone et continue sur les quatorze
points de la grille** (68,20 · 62,50 · 58,50 · 52,50 · 49,40 · 46,40 · 43,40 · … · 28,30 s, sans
une seule inversion) : ce n'est pas du bruit de graines, c'est l'effet mesuré, direct et régulier
de `damageK` sur la vitesse à laquelle la salle 10 se termine. **1,10 est le point le plus
proche de la cible de 45 s** (46,40 s, à 1,4 s), loin devant 1,05 (4,4 s d'écart) et *a
fortiori* devant 1,00 et 0,95.

**Le conflit de départages anticipé par la spec (§ 6.1) se vérifie ici, à l'échelle de la bande
A** : refermer l'écart entre châssis (départage 6) pousse vers le bas de la grille — mais le
départage 6 est à égalité sur toute la bande A, donc il ne pousse nulle part *à l'intérieur*
de la bande. Garder le boss près de 45 s (départage 7) pousse, lui, vers le **haut** de la
bande A — et c'est un vrai signal, pas du bruit. Le conflit ne se résout donc pas par un
compromis entre les deux poussées : il se résout parce qu'un des deux départages est neutre
sur la région où l'autre discrimine.

**Départage 7 décide : `damageK = 1,10`.**

Le départage 8 (durée du chapitre 1, indicative) n'a pas eu besoin d'être invoqué.

## Valeur retenue

**`combat.damageK` : 1,30 → 1,10.**

Décidée par le départage 7 après que le départage 6 a laissé les six points de la bande A
(`[0,80 ; 1,10]`) à égalité. La bande A referme mesurablement l'écart entre châssis par rapport
à la valeur commitée (×4,88 contre ×9,30, un facteur ×1,91 — sous le seuil de bande, donc à
retenir avec prudence comme argument à lui seul ; mais ×3,83, le minimum de la bande, contre
×9,30 vaut ×2,43, un écart réel). Le déplacement n'est donc pas gratuite : il est porté par une
mesure qui dépasse le plancher de bruit du critère 6, puis tranché à l'intérieur de la bande par
une mesure de durée qui, elle, ne connaît aucun plancher de bruit comparable dans ce relevé
(monotonie parfaite sur les quatorze points).

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

### 2. La règle des bandes du départage 6 n'est pas un détail de méthode — elle a empêché un choix arbitraire sur six points

Sans elle, un relevé qui verrait ×3,83 à 0,80 et ×4,88 à 1,10 choisirait spontanément 0,80
« parce que c'est plus bas ». C'est exactement le raisonnement que la règle interdit : la
différence entre les deux tient dans le bruit résiduel du rapport de médianes (mesuré à 1,45–
2,80 entre jeux disjoints), pas dans un effet de `damageK`. La règle a forcé le passage au
départage suivant, qui lui, avait un signal réel (monotonie parfaite, pas de bruit détecté) —
et qui a tranché en faveur du point le plus **haut** de la bande, pas le plus bas. Sans la
règle des bandes, le raisonnement naïf aurait produit la conclusion opposée.

### 3. Le conflit entre « refermer l'écart » et « garder le boss près de 45 s », annoncé par la spec, se résout par une asymétrie de précision entre les deux critères, pas par un compromis

Le départage 6 a une résolution grossière (facteur ~2) sur ce relevé ; le départage 7 a une
résolution fine (le relevé ne montre aucune inversion sur quatorze points, l'écart à la cible se
lit à la seconde près). Le conflit annoncé par la spec — refermer l'écart tire vers le bas,
garder le boss près de 45 s tire vers le haut — ne s'est donc pas soldé par un compromis entre
deux poussées de force comparable : le critère grossier a désigné une région large où il ne
pousse plus nulle part, et c'est le critère fin qui a fait tout le travail de sélection du point
à l'intérieur. Une passe future qui chercherait à « pondérer » les deux départages l'un contre
l'autre partirait d'une prémisse fausse : ils n'opèrent pas à la même échelle de précision, donc
pas dans le même registre de décision.

### 4. L'écart entre châssis reste très au-dessus de la cible affichée (< ×2) — à la valeur retenue comme à toute autre valeur du domaine testé

À `damageK = 1,10`, l'écart vaut ×4,88 — le meilleur atteignable dans tout le domaine mesuré
(le minimum brut de la grille, ×3,83 à 0,80, est à égalité de bande, pas une amélioration
mesurée), et il reste plus de deux fois la cible. Aucune valeur de `damageK` testée ne
rapproche l'écart de ×2 : au mieux ×3,83, au pire ×48,42. C'est cohérent avec la borne 2 du
mandat (les profils de châssis ne sont pas un bouton de cette passe) et avec la conséquence 3
du § 3 de la spec : `damageK` est le premier levier de l'écart, mais son plancher observé reste
loin de la cible. La fermeture de cet écart, si elle doit se faire, passe par le bloc `chassis`
de `balance.json` — hors mandat ici, arbitrage de l'auteur à venir.

## Lecture des garde-fous à la valeur retenue (relevé de la grille, `damageK = 1,10`)

| Garde-fou | État | Mesure |
|---|---|---|
| 1. Salle 10 la plus meurtrière — 4 chapitres | **TENU** | `oui×4` |
| 2. Passivité « jamais » | **TENU** | jamais en 20 h simulées |
| 3. Premier coffre immédiat | **TENU** | 0,00 h |
| 4. Verrou du châssis actif | **TENU** | actif |
| 5. 40/40 graines, 4 chapitres | **TENU** | `40/40/40/40` |
| 6. Écart entre châssis (départage) | à égalité sur la bande A | ×4,88 — dans `[×3,83 ; ×5,14]` |
| 7. Salle 10 ch. 1 sous 60 s, proche de ~45 s (départage) | **DÉCIDE** | 46,40 s, écart 1,4 s |
| 8. Durée du chapitre 1 (indicatif) | non invoqué | 0,37 h / 17 descentes |

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
- **La règle des bandes révèle une frontière floue entre bandes adjacentes** (1,10 et 1,15
  seraient eux-mêmes à égalité au sens strict du facteur, alors que leurs bandes respectives ne
  le sont pas) — un artefact de transitivité de toute règle « à égalité si le rapport est sous
  X ». Il n'a pas gêné cette décision (les extrêmes de bande suffisaient), mais une passe future
  qui verrait deux bandes voisines aux rapports plus proches devrait le traiter explicitement.
- **`econ.rewardBase` et les deux `bot.scaling.*` restent à balayer** sous la physique actuelle,
  avec `damageK = 1,10` désormais gelé — tâches suivantes de cette passe, commits séparés,
  jamais combat et économie ensemble.
