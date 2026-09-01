# Calibration des chapitres — le combat (jalon 3, lot A)

Passe de calibration de **`bot.scaling.spinPerChapter`** et
**`bot.scaling.attackPerChapter`**, les deux facteurs géométriques appliqués en
`Math.pow(facteur, chapitre - 1)` et multipliés au palier linéaire par salle.
Ils portaient depuis la tâche 6 des valeurs provisoires — **1,2** et **1,1** —
que personne n'avait jamais mesurées.

`econ.rewardPerChapter` **n'a pas bougé** de sa valeur provisoire 1,25 pendant
toute la passe. Ce projet a payé deux fois pour avoir mélangé une passe de
combat et une passe d'économie dans un même changement ; l'économie est la
tâche suivante.

## Les garde-fous, dans l'ordre où ils priment

1. **Dans CHAQUE chapitre, la salle 10 reste la salle la plus meurtrière.**
   « Le mur n'est jamais un bug, c'est le produit. »
2. **Le chapitre 1 ne bouge pas d'un chiffre** : 0,32 h · 9 descentes ·
   `[10,23]` · premier coffre 0,00 h. Son exposant vaut 0 — s'il bouge, c'est
   un bug, pas un réglage.
3. **La passivité reste « jamais »**, et les séries châssis / contre-pioche
   restent identiques (bornées au chapitre 1, elles ne peuvent pas bouger).
4. Seulement ensuite les cibles : chapitre 3 nettement plus coûteux que le 2,
   chapitre 4 au-dessus, et 10/10 graines partout — ou aussi près que les
   garde-fous le permettent.

## Les valeurs de départ

| Bouton | Valeur provisoire |
| --- | --- |
| `bot.scaling.spinPerChapter` | 1,2 |
| `bot.scaling.attackPerChapter` | 1,1 |
| `econ.rewardPerChapter` | 1,25 — **gelé, non balayé** |

Relevé de la tâche 8 à ces valeurs (dix graines) :

```
Chapitre 1 : 0.32 h cumulées ·  9 descentes · [10,23]   · garde-fou oui
Chapitre 2 : 10/10 · 0.47 h (+0.15) ·  2 descentes · [10,5]    · oui
Chapitre 3 : 10/10 · 1.23 h (+0.76) · 12 descentes · [10,43]   · oui
Chapitre 4 :  1/10 · 1.02 h          · 10 descentes · [3,3034] · NON
```

## Le balayage brut — 26 mesures, dix graines chacune

Grille étendue vers le bas au fil des données : la consigne partait de
`spin ∈ [1,10 ; 1,40]`, or le chapitre 4 réclamait bien plus bas. Deux points
sont des **diagnostics**, pas des candidats : `1,00 / 1,00` (le plancher, où
`Math.pow(1, n) = 1` rend les chapitres 2 à 4 bit à bit identiques au chapitre 1)
et `0,90 / 0,90` (sous le plancher, chapitre 4 plus faible que le chapitre 1).

| `spin` | `attack` | ch. 1 | ch. 2 : +h · desc. · plus meurtrière | ch. 3 : +h · desc. · plus meurtrière | ch. 4 : validé · plus meurtrière | GF 1 sur ch. 1-3 |
|---|---|---|---|---|---|---|
| **0.90** | **0.90** | ✓ | +0.11 h · 3 · s.7 (5) **✗** | +0.08 h · 3 · s.6 (3) **✗** | 10/10 · s.4 (37) **✗** | **✗** |
| **1.00** | **1.00** | ✓ | +0.23 h · 3 · s.10 (12) ✓ | +0.10 h · 2 · s.10 (12) ✓ | 8/10 · s.3 (1224) **✗** | **✓** |
| **1.02** | **1.02** | ✓ | +0.12 h · 2 · s.10 (5) ✓ | +0.15 h · 3 · s.10 (6) ✓ | 6/10 · s.3 (2553) **✗** | **✓** |
| **1.04** | **1.02** | ✓ | +0.13 h · 2 · s.9 (3) **✗** | +0.16 h · 3 · s.10 (11) ✓ | 9/10 · s.3 (754) **✗** | **✗** |
| **1.05** | **1.02** | ✓ | +0.15 h · 2 · s.10 (6) ✓ | +0.23 h · 2 · s.10 (12) ✓ | 8/10 · s.3 (1180) **✗** | **✓** |
| **1.06** | **1.02** | ✓ | +0.14 h · 2 · s.10 (4) ✓ | +0.27 h · 3 · s.10 (9) ✓ | 6/10 · s.3 (2304) **✗** | **✓** |
| **1.10** | **1.02** | ✓ | +0.12 h · 1 · s.7 (2) **✗** | +0.28 h · 4 · s.10 (11) ✓ | 4/10 · s.3 (3014) **✗** | **✗** |
| **1.15** | **1.02** | ✓ | +0.22 h · 3 · s.10 (15) ✓ | +0.11 h · 2 · s.10 (9) ✓ | 0/10 · s.3 (3935) **✗** | **✓** |
| **1.02** | **1.05** | ✓ | +0.10 h · 2 · s.10 (4) ✓ | +0.27 h · 3 · s.10 (9) ✓ | 7/10 · s.3 (1917) **✗** | **✓** |
| **1.04** | **1.05** | ✓ | +0.11 h · 2 · s.10 (3) ✓ | +0.23 h · 5 · s.10 (20) ✓ | 3/10 · s.3 (4121) **✗** | **✓** |
| **1.05** | **1.05** | ✓ | +0.20 h · 3 · s.10 (8) ✓ | +0.12 h · 2 · s.10 (9) ✓ | 6/10 · s.3 (2264) **✗** | **✓** |
| **1.06** | **1.05** | ✓ | +0.21 h · 2 · s.10 (10) ✓ | +0.16 h · 3 · s.10 (12) ✓ | 4/10 · s.3 (3490) **✗** | **✓** |
| **1.08** | **1.05** | ✓ | +0.11 h · 1 · s.5 (1) **✗** | +0.23 h · 3 · s.10 (6) ✓ | 4/10 · s.3 (3277) **✗** | **✗** |
| **1.10** | **1.05** | ✓ | +0.10 h · 1 · s.10 (3) ✓ | +0.33 h · 4 · s.10 (10) ✓ | 1/10 · s.3 (4631) **✗** | **✓** |
| **1.15** | **1.05** | ✓ | +0.16 h · 2 · s.10 (9) ✓ | +0.37 h · 4 · s.10 (17) ✓ | 2/10 · s.3 (3358) **✗** | **✓** |
| **1.00** | **1.10** | ✓ | +0.16 h · 2 · s.10 (6) ✓ | +0.09 h · 2 · s.10 (6) ✓ | 4/10 · s.3 (3704) **✗** | **✓** |
| **1.02** ← | **1.10** | ✓ | +0.18 h · 3 · s.10 (7) ✓ | +0.27 h · 2 · s.10 (10) ✓ | 7/10 · s.3 (1954) **✗** | **✓** |
| **1.03** | **1.10** | ✓ | +0.14 h · 2 · s.10 (8) ✓ | +0.11 h · 2 · s.10 (5) ✓ | 7/10 · s.3 (1891) **✗** | **✓** |
| **1.04** | **1.10** | ✓ | +0.17 h · 2 · s.10 (3) ✓ | +0.21 h · 2 · s.10 (6) ✓ | 6/10 · s.3 (2320) **✗** | **✓** |
| **1.05** | **1.10** | ✓ | +0.25 h · 3 · s.10 (15) ✓ | +0.20 h · 3 · s.10 (11) ✓ | 7/10 · s.3 (2269) **✗** | **✓** |
| **1.06** | **1.10** | ✓ | +0.16 h · 2 · s.10 (8) ✓ | +0.16 h · 2 · s.10 (20) ✓ | 7/10 · s.3 (1787) **✗** | **✓** |
| **1.08** | **1.10** | ✓ | +0.16 h · 2 · s.10 (7) ✓ | +0.22 h · 4 · s.10 (11) ✓ | 5/10 · s.3 (2945) **✗** | **✓** |
| **1.10** | **1.10** | ✓ | +0.17 h · 3 · s.10 (10) ✓ | +0.24 h · 4 · s.10 (13) ✓ | 3/10 · s.3 (3631) **✗** | **✓** |
| **1.15** | **1.10** | ✓ | +0.25 h · 2 · s.10 (13) ✓ | +0.25 h · 4 · s.10 (6) ✓ | 2/10 · s.3 (3514) **✗** | **✓** |
| **1.20** | **1.10** | ✓ | +0.15 h · 2 · s.10 (5) ✓ | +0.76 h · 12 · s.10 (43) ✓ | 1/10 · s.3 (3034) **✗** | **✓** |
| **1.02** | **1.15** | ✓ | +0.18 h · 1 · s.10 (6) ✓ | +0.16 h · 2 · s.10 (7) ✓ | 7/10 · s.3 (1953) **✗** | **✓** |

Le premier coffre est resté à **0,00 h** et la passivité à **« jamais »** sur
**les vingt-six** mesures : ces deux garde-fous sont bornés au chapitre 1, donc
insensibles à ces boutons par construction. Ils ne discriminent rien ici — mais
les relever à chaque fois était le seul moyen de le prouver plutôt que de le
supposer.

## Ce que le balayage a appris, et qui vaut bien plus que la valeur retenue

### 1. Le mur du chapitre 4 n'est pas dans ces deux boutons. Aucune valeur ne le répare.

C'est le résultat central de cette passe, et il est négatif.

Au **plancher `1,00 / 1,00`**, `Math.pow(1, n)` vaut 1 pour tout `n` : les bots
du chapitre 4 sont alors **strictement identiques** à ceux du chapitre 1, et le
joueur y arrive avec trois chapitres d'équipement en plus. Le chapitre 4 devrait
être une promenade. Il reste un mur :

```
Chapitre 3 (plancher) : salle 1 vidée   51 fois — plus meurtrière [10,12]  oui
Chapitre 4 (plancher) : salle 1 vidée 2881 fois — plus meurtrière [3,1224] NON
```

**56 fois plus de tentatives, à bots rigoureusement égaux.** La difficulté du
chapitre 4 ne vient donc pas du facteur de chapitre : elle vient de la **table
`botTypes["4"]`**, seule autre différence entre les deux chapitres dans la
simulation. C'est le chapitre « sans contre-pioche gratuite » — trois salles
`equilibre` plus le boss, contre lesquelles Brasier Solaire (`equilibre`, le
châssis de la mesure principale) perd son avantage de type : `typeMult` rend
+10 % aux deux camps au lieu de +10 % au seul joueur.

Descendre **sous** le plancher ne sauve rien non plus : à `0,90 / 0,90`, le
chapitre 4 passe enfin 10/10 — mais le jeu devient si mou que les morts
retombent à 3-5 par chapitre, le classement des salles n'est plus que du bruit,
et le garde-fou casse d'un coup dans **les chapitres 2, 3 et 4**. On échangerait
un échec contre trois.

**Entre « assez dur pour que la salle 10 pèse » et « assez doux pour qu'on y
arrive », il n'y a pas d'intersection sur ces deux boutons.**

### 2. Le garde-fou du chapitre 4 échoue sur un entonnoir, pas sur un pic de difficulté

La métrique du harnais est le **nombre absolu** de morts par salle. Au chapitre
4, la salle 3 la remporte simplement parce qu'elle est la première où l'on meurt :
tout le monde y passe, presque personne n'atteint la salle 10. Les taux de
létalité **par tentative**, aux valeurs retenues, disent l'inverse :

| salle | 3 | 4 | 5 | 6 | 7 | 8 | 9 | **10** |
|---|---|---|---|---|---|---|---|---|
| morts / tentatives | 47 % | 47 % | 44 % | 50 % | 49 % | 44 % | 39 % | **88 %** |

**Par tentative, la salle 10 est de très loin la plus meurtrière du chapitre 4
(88 %) — le pilier de design tient.** Ce qui échoue, c'est la façon dont le
harnais le mesure : deux graines bloquées qui brûlent leurs 20 h simulées à
mourir salle 3 écrasent le décompte absolu (98 % des morts du chapitre viennent
d'elles). Le compteur n'est pas faux, il est *dominé par les graines qui ne
valident pas*. Tant que le chapitre 4 n'est pas validé 10/10, sa ligne « salle
la plus meurtrière » ne mesure pas la difficulté des salles mais la longueur de
l'entonnoir. **C'est une limite du harnais à porter à la tâche suivante**, pas
un réglage à forcer ici.

### 3. Les deux boutons ne font pas le même métier — et ce n'est pas celui qu'on croyait

- **`spinPerChapter` pilote le mur du chapitre 4.** La validation s'effondre
  proprement et de façon monotone quand il monte : à `attack = 1,10`, elle passe
  de 7/10 (spin 1,02) à 3/10 (1,10) puis 1/10 (1,20).
- **`attackPerChapter` pilote la lisibilité du garde-fou.** Il ne change presque
  rien à la validation, mais il tient le signal de mortalité au-dessus du bruit
  dans les chapitres 2 et 3. C'est **le seul des trois axes testés dont la
  colonne entière est sans trou** :

| colonne | valeurs de `spin` testées | trous |
|---|---|---|
| `attack = 1,02` | 1,02 · 1,04 · 1,05 · 1,06 · 1,10 · 1,15 | **deux** (1,04 et 1,10 : chapitre 2 tombe sur les salles 9 et 7) |
| `attack = 1,05` | 1,02 · 1,04 · 1,05 · 1,06 · 1,08 · 1,10 · 1,15 | **un** (1,08 : chapitre 2 tombe salle 5, avec **1 seule mort**) |
| `attack = 1,10` | 1,00 · 1,02 · 1,03 · 1,04 · 1,05 · 1,06 · 1,08 · 1,10 · 1,15 · 1,20 | **aucun** |

Les trous ne sont pas des zones de difficulté : ce sont des chapitres 2 devenus
si doux que la salle gagnante ne compte plus qu'**une à trois morts**. À ce
niveau, le classement est tiré au sort. Monter l'attaque ne rend pas le jeu plus
dur au chapitre 2, il rend le pilier *mesurable*.

## Le palier retenu, et pourquoi

**Palier : `attackPerChapter = 1,10`, `spinPerChapter ∈ [1,00 ; 1,20]`.**
Dix valeurs consécutives de `spin` testées, **toutes** tiennent le garde-fou 1
dans les chapitres 1, 2 et 3. Aucune autre colonne du balayage n'y parvient.

Sur l'axe de l'attaque, à `spin = 1,02` : `1,02 · 1,05 · 1,10 · 1,15` tiennent
aussi, quatre valeurs consécutives. **Le point retenu est donc intérieur dans
les deux directions**, avec au moins un voisin qui tient de chaque côté — pas un
pic isolé comme `rewardBase = 86` l'avait été.

### Le choix dans le palier

Les garde-fous 1 à 3 étant tenus partout dans le palier, ils ne départagent
rien : on descend aux cibles, dans l'ordre.

**Cible « 10/10 graines, ou aussi près que possible ».** Sur la colonne
`attack = 1,10`, la validation du chapitre 4 vaut 4, **7, 7**, 6, **7, 7**, 5,
3, 2, 1 pour `spin` = 1,00 · **1,02** · 1,03 · 1,04 · **1,05** · 1,06 · 1,08 ·
1,10 · 1,15 · 1,20. Quatre valeurs sont à égalité au maximum : **1,02 · 1,03 ·
1,05 · 1,06**.

**Cible « chapitre 3 nettement plus coûteux que le chapitre 2 »** (les deux sont
validés 10/10, leurs médianes sont donc comparables — celle du chapitre 4 ne
l'est pas, voir la réserve plus bas). Entre les quatre ex æquo :

| `spin` | ch. 2 | ch. 3 | marche |
|---|---|---|---|
| **1,02** | +0,18 h | +0,27 h | **+50 %** |
| 1,03 | +0,14 h | +0,11 h | −21 % |
| 1,05 | +0,25 h | +0,20 h | −20 % |
| 1,06 | +0,16 h | +0,16 h | 0 % |

**`spin = 1,02` est la seule des quatre qui produise la marche demandée**, et
elle la produit largement. Les trois autres l'aplatissent ou l'inversent.

**Valeurs retenues : `spinPerChapter` 1,2 → 1,02 · `attackPerChapter` 1,1 → 1,1
(inchangée).**

Que l'attaque ne bouge pas n'est pas une passe vide : la mesure transforme une
valeur provisoire jamais vérifiée en la seule valeur de l'axe dont la colonne
entière tient le pilier. Elle est conservée parce que le balayage la désigne.

### La contrainte dure sur 1,0, et sa vérification

Ni l'un ni l'autre des facteurs ne pouvait valoir exactement **1,0** :
`Math.pow(1, n)` vaut 1 pour tout `n`, et les deux tests de `src/sim/salle.test.ts`
qui défendent ce mécanisme deviendraient inertes — ils passeraient même si
l'exposant était faux ou le mécanisme absent. `1,02` laisse `pow(1,02 ; 2) =
1,0404`, soit **80 000 fois la tolérance** de `toBeCloseTo(…, 6)`. Vérifié par
mutation, pas par raisonnement :

| mutation appliquée à `src/sim/salle.ts` | résultat |
|---|---|
| exposant `chapter` au lieu de `chapter - 1` | **2 tests rouges** (`… expected 1224 to be 1200`) |
| facteur de chapitre supprimé (`* 1`) | **1 test rouge** (`… expected 1 to be close to 1.0404`) |

Les deux mutants sont tués. Le mécanisme reste sous test à 1,02.

## Rapport complet aux valeurs retenues

`spinPerChapter = 1,02` · `attackPerChapter = 1,10` · `rewardPerChapter = 1,25`
(inchangé).

```
=== Calibration — 10 graines ===
Premier coffre ouvert    : médiane 0.00 h

--- Chapitre 1 : validé par 10/10 graines · 0.32 h cumulées (+0.32 h) · 9.00 descentes · salle la plus meurtrière [10,23]
    salle 10 la plus meurtrière : oui
    salle 1 : 6.90 s  (vidée 107 fois, morts 0)
    salle 2 : 6.10 s  (vidée 107 fois, morts 0)
    salle 3 : 9.80 s  (vidée 106 fois, morts 1)
    salle 4 : 14.80 s  (vidée 106 fois, morts 0)
    salle 5 : 16.50 s  (vidée 96 fois, morts 10)
    salle 6 : 18.30 s  (vidée 87 fois, morts 9)
    salle 7 : 21.10 s  (vidée 66 fois, morts 21)
    salle 8 : 22.60 s  (vidée 48 fois, morts 18)
    salle 9 : 23.30 s  (vidée 33 fois, morts 15)
    salle 10 : 64.80 s  (vidée 10 fois, morts 23)

--- Chapitre 2 : validé par 10/10 graines · 0.50 h cumulées (+0.18 h) · 3.00 descentes · salle la plus meurtrière [10,7]
    salle 10 la plus meurtrière : oui
    salle 1 : 9.50 s  (vidée 26 fois, morts 0)
    salle 2 : 6.90 s  (vidée 26 fois, morts 0)
    salle 3 : 11.00 s  (vidée 24 fois, morts 2)
    salle 4 : 13.80 s  (vidée 23 fois, morts 1)
    salle 5 : 20.70 s  (vidée 22 fois, morts 1)
    salle 6 : 21.20 s  (vidée 21 fois, morts 1)
    salle 7 : 20.70 s  (vidée 17 fois, morts 4)
    salle 8 : 28.00 s  (vidée 17 fois, morts 0)
    salle 9 : 25.10 s  (vidée 17 fois, morts 0)
    salle 10 : 99.20 s  (vidée 10 fois, morts 7)

--- Chapitre 3 : validé par 10/10 graines · 0.77 h cumulées (+0.27 h) · 2.00 descentes · salle la plus meurtrière [10,10]
    salle 10 la plus meurtrière : oui
    salle 1 : 7.20 s  (vidée 28 fois, morts 0)
    salle 2 : 9.80 s  (vidée 28 fois, morts 0)
    salle 3 : 11.30 s  (vidée 28 fois, morts 0)
    salle 4 : 18.30 s  (vidée 28 fois, morts 0)
    salle 5 : 18.10 s  (vidée 26 fois, morts 2)
    salle 6 : 19.80 s  (vidée 24 fois, morts 2)
    salle 7 : 22.70 s  (vidée 21 fois, morts 3)
    salle 8 : 26.90 s  (vidée 21 fois, morts 0)
    salle 9 : 27.70 s  (vidée 20 fois, morts 1)
    salle 10 : 110.20 s  (vidée 10 fois, morts 10)

--- Chapitre 4 : validé par 7/10 graines · 0.93 h cumulées (+0.16 h) · 6.00 descentes · salle la plus meurtrière [3,1954]
    salle 10 la plus meurtrière : NON
    salle 1 : 11.10 s  (vidée 4174 fois, morts 0)
    salle 2 : 10.40 s  (vidée 4173 fois, morts 0)
    salle 3 : 9.90 s  (vidée 2219 fois, morts 1954)
    salle 4 : 15.80 s  (vidée 1184 fois, morts 1035)
    salle 5 : 18.10 s  (vidée 658 fois, morts 526)
    salle 6 : 19.00 s  (vidée 327 fois, morts 331)
    salle 7 : 21.20 s  (vidée 167 fois, morts 160)
    salle 8 : 24.40 s  (vidée 94 fois, morts 73)
    salle 9 : 28.10 s  (vidée 57 fois, morts 37)
    salle 10 : 97.90 s  (vidée 7 fois, morts 50)

Garde-fou passivité      : jamais — doit rester très au-dessus de la référence

=== Comparatif châssis — chapitre 1 (10 graines) ===
Brasier Solaire    (equilibre ) : 9.00 runs · 0.32 h · salle la plus meurtrière [10,23]
Typhon Primal      (attaque   ) : 19.00 runs · 0.46 h · salle la plus meurtrière [6,27]
Carapace Abyssale  (defense   ) : 5.00 runs · 0.29 h · salle la plus meurtrière [10,16]
Tigre Foudre       (endurance ) : 19.00 runs · 0.82 h · salle la plus meurtrière [10,60]
Écart meilleur/pire (runs) : 19/5 = ×3.80 (cible : < ×2)

=== Verrou du châssis — contre-pioche du triangle (10 graines) ===
rebascule à chaque salle        : 19.00 runs · 0.46 h
même choix, tenu jusqu'au boss  : 19.00 runs · 0.46 h
Verrou actif : changer de châssis en cours de descente ne rapporte rien.
```

## Lecture des garde-fous aux valeurs retenues

| Garde-fou | État | Mesure |
|---|---|---|
| 1. Salle 10 la plus meurtrière — **chapitre 1** | **TENU** | 23 morts contre 21 (salle 7) |
| 1. Salle 10 la plus meurtrière — **chapitre 2** | **TENU** | 7 morts contre 4 (salle 7) |
| 1. Salle 10 la plus meurtrière — **chapitre 3** | **TENU** | 10 morts contre 3 (salle 7) |
| 1. Salle 10 la plus meurtrière — **chapitre 4** | **ÉCHEC** | 50 morts contre 1 954 (salle 3) — **mais 88 % de létalité par tentative contre 47 %** ; voir § 2 |
| 2. Chapitre 1 immobile | **TENU** | identique au chiffre près, ligne à ligne (ci-dessous) |
| 3. Passivité « jamais » | **TENU** | jamais validée en 20 h simulées |
| 3. Premier coffre immédiat | **TENU** | 0,00 h |
| 3. Séries châssis / contre-pioche | **TENU** | identiques à la tâche 8, verrou toujours actif |
| 4. Chapitre 3 plus coûteux que le 2 | **TENU** | +0,27 h contre +0,18 h (+50 %) |
| 4. Chapitre 4 plus coûteux que le 3 | **NON CONCLUANT** | 7/10 graines : sa médiane n'est pas comparable |
| 4. 10/10 graines partout | **TENU ch. 1-3**, 7/10 au ch. 4 | 7/10 est le maximum atteignable sur le palier |

### Non-régression du chapitre 1, ligne à ligne

Le chapitre 1 porte l'exposant 0 : par construction il ne peut pas bouger, et
c'est justement pour ça qu'il sert de détecteur de bug. Comparé au relevé de
référence (tâche 8 / journal du 28 août) :

| | référence | mesuré | |
|---|---|---|---|
| durée cumulée | 0,32 h | 0,32 h | = |
| descentes | 9 | 9 | = |
| salle la plus meurtrière | `[10,23]` | `[10,23]` | = |
| premier coffre | 0,00 h | 0,00 h | = |
| passivité | jamais | jamais | = |
| morts salles 1→10 | 0,0,1,0,10,9,21,18,15,23 | 0,0,1,0,10,9,21,18,15,23 | = |
| durées salles 1→10 (s) | 6,9 · 6,1 · 9,8 · 14,8 · 16,5 · 18,3 · 21,1 · 22,6 · 23,3 · 64,8 | idem | = |
| écart châssis | ×3,80 | ×3,80 | = |
| verrou contre-pioche | 19 runs / 0,46 h des deux côtés | idem | = |

Aucun chiffre du chapitre 1 n'a bougé. Le mécanisme se comporte comme sa
spécification le promet.

## Ce qui reste en dette après cette passe

- **Le garde-fou 1 échoue au chapitre 4, et aucune valeur de ces deux boutons ne
  le répare** (démontré au plancher `1,00 / 1,00` et sous le plancher
  `0,90 / 0,90`). La cause est ailleurs : la table `botTypes["4"]`, qui prive le
  châssis de la mesure de son avantage de type sur quatre salles. Bouton fermé
  dans cette tâche. **C'est la conclusion la plus importante de la passe : la
  prochaine tentative de réparation du chapitre 4 ne doit pas commencer par ces
  deux facteurs.**
- **La métrique « salle la plus meurtrière » du harnais est un décompte absolu**,
  donc écrasée par les graines qui ne valident pas le chapitre. Un ratio
  morts/tentatives — déjà calculable depuis les chiffres imprimés — dirait la
  vérité du pilier là où le décompte absolu ment. À arbitrer par la tâche
  suivante ; ce n'était pas le mandat ici.
- **Le coût du chapitre 4 n'est pas mesurable tant qu'il n'est pas validé
  10/10** : sa médiane porte sur 7 graines, celle du chapitre 3 sur 10. La cible
  « chapitre 4 au-dessus du 3 » reste donc non tranchée, et le +0,16 h du rapport
  ne doit pas être lu comme « moins cher que le chapitre 3 ».
- **La marche du chapitre 2 au chapitre 3 est bruitée dans tout le palier**
  (+50 % à 1,02, mais −21 %, −20 %, 0 % aux trois valeurs voisines à égalité de
  validation). Le palier garantit que le *voisinage* tient le pilier, pas que
  chaque point y donne la même marche — même réserve que celle notée pour
  `rewardBase` le 28 août.
- **L'écart entre châssis reste à ×3,80** pour une cible de ×2. Inchangé par
  cette passe (chapitre 1, exposant 0), toujours porté par les profils de
  châssis, toujours en dette.
