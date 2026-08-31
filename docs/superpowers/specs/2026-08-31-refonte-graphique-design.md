# Refonte graphique — « tout est dessiné à partir de ses données »

Spec de conception. Date : 2026-08-31. Branche : `refonte-graphique`.

## Le problème, mesuré sur l'écran

Captures des quatre écrans prises au navigateur avant d'écrire un mot de cette spec
(Playwright, 390 × 844, sauvegarde injectée pour disposer d'un inventaire varié) :

| Objet du jeu | Représentation actuelle | Ce qui manque |
|---|---|---|
| 20 modèles de pièces | une chaîne (« Couronne Solaire ») | aucun dessin — une Lame et un Noyau se ressemblent : rien |
| 4 toupies | une carte de texte, quatre fois la même | on achète un nom à 900 gemmes |
| 11 rangs de rareté | un mot + une couleur de texte | le nerf du gacha est une étiquette |
| Toupie en arène | 2 formes génériques (`Shape = 'player' | 'bot'`) | la toupie qu'on a montée n'apparaît nulle part |
| 7 axes de profil | 7 lignes « Vitesse max +10 % » sur 3 écrans | rien à comparer d'un coup d'œil |
| Triangle des types | un paragraphe de 4 lignes | ce n'est pas un triangle |
| Tirage ×10 | 10 lignes de tableau | le pic émotionnel du jeu est un ticket de caisse |
| Écran de combat | l'arène occupe ~40 % de la hauteur | le jeu est un encart dans une page |

Le fil est unique : **rien n'est dessiné à partir de ses données.** Le catalogue
(`src/content/`) est riche — 20 pièces, 4 châssis, 11 rangs, 4 types — et
intégralement muet à l'écran. C'est ce que cette refonte renverse.

## Principe directeur

**Une information = un canal visuel.** Jamais deux informations sur le même canal,
jamais une information qui n'existe qu'en toutes lettres.

Corollaire opérationnel : le texte n'est supprimé que là où un canal visuel le
remplace vraiment. Cette spec ne cache pas de l'information — elle la déplace du
registre lu au registre vu. Les chiffres exacts restent accessibles partout où ils
servaient à décider.

## § 1. Le socle : `src/art/`, source unique de tout ce qui se dessine

Aujourd'hui `src/render/textures.ts` invente ses disques dans son coin et l'UI n'a
aucun visuel. Deux mondes qui ne peuvent que diverger le jour où l'un des deux
bouge. On les fait naître du même code.

```
src/art/
  recipes.ts   — une recette par modèle de pièce, par châssis, par coffre (données pures)
  draw.ts      — primitives canvas : couronne, anneau, cône, gemme, cadre, métal brossé, balayage
  piece.ts     — drawPiece(ctx, model, rank, px)
  toupie.ts    — drawToupiePortrait (3/4) et drawToupieTop (vue de dessus)
  chest.ts     — drawChest(ctx, kind, px)
  rank.ts      — paliers de rang : palier, couleur, nombre de gemmes, ergots
  cache.ts     — mémoïsation data-URL, clé (id, palier de rang, px)
src/ui/art/
  PieceIcon.tsx · ToupiePortrait.tsx · ChestIcon.tsx
  StatRadar.tsx · TypeTriangle.tsx · PipTrack.tsx · Gauge.tsx
```

**Choix de technique : canvas 2D, pas SVG.** Deux backends (SVG pour le DOM, canvas
pour Pixi) rouvriraient exactement la divergence qu'on cherche à fermer. Un seul
code de dessin, deux consommateurs :

- **Pixi** : `Texture.from(canvas)` — c'est déjà le mécanisme de `textures.ts`.
- **React** : `<PieceIcon>` lit un cache de data-URL et rend un `<img>`.

**Le cache n'est pas un détail de performance, c'est une condition de correction.**
`App` se re-rend à chaque tick (10 Hz) ; redessiner les icônes à chaque rendu
brûlerait le processeur pendant le combat. Clé : `` `${id}|${tier}|${px}` `` — le
rang n'entre dans la clé que par son **palier** (4 valeurs), pas par ses 11 niveaux,
donc le cache est borné à ~24 × 4 × 3 ≈ 290 entrées, atteintes une fois pour toutes.

**`src/sim/` n'est pas touché.** Aucun chiffre d'équilibrage ne bouge, aucun test de
simulation ne change. `src/art/` dessine ; il ne décide de rien.

## § 2. La grammaire visuelle — quatre canaux

| Canal | Porte | Vocabulaire |
|---|---|---|
| **Silhouette** | l'emplacement (4) | Lame = couronne de crocs · Disque = anneau lourd à lobes · Pointe = cône vertical (la seule silhouette non radiale) · Noyau = gemme facettée dans son logement |
| **Motif** | le modèle (20) | nombre de crocs, courbure, ajours, rivets, ornement — dérivés de la recette |
| **Cadre & matière** | le rang (11 → 4 paliers) | acier brut → acier bleui + 1 gemme → violet + 2 gemmes + ergots → or + 3 gemmes + balayage lumineux |
| **Teinte d'accent** | le type / la famille | les quatre teintes de `TYPE_TINT`, déjà en place |

Test de lisibilité que le résultat doit passer : **à 24 px on lit l'emplacement et
le rang ; à 64 px on lit le modèle.** C'est ce qui rend une grille d'inventaire
utilisable sans lire une ligne.

### Les 20 recettes de pièces

Chaque recette est une ligne de données interprétée par le dessinateur de sa
silhouette. Ajouter un modèle = ajouter une ligne, jamais du code.

| Modèle | Réglages |
|---|---|
| `lame.couronne-solaire` | 8 crocs, courbure .18, profondeur .30, ornement `flamme` |
| `lame.croc-de-tempete` | 3 crocs longs, courbure .42, profondeur .46 |
| `lame.ecaille-abyssale` | 6 crocs, courbure .10, profondeur .22, ornement `écailles` |
| `lame.griffe-orageuse` | 4 crocs, courbure .34, profondeur .38, ornement `éclair` |
| `disque.lourd` | anneau plein, épaisseur .34 |
| `disque.gravite` | 3 masses en orbite, épaisseur .22 |
| `disque.eventail` | 9 pales, épaisseur .20 |
| `disque.axial` | 4 rayons en croix, épaisseur .18 |
| `disque.colosse` | 6 lobes, épaisseur .42, ornement `rivets` |
| `disque.meteorite` | 5 lobes irréguliers, épaisseur .30, ornement `cratères` |
| `pointe.plate` | pied large .62, hauteur .50 |
| `pointe.aiguille` | pied .16, hauteur 1.00 |
| `pointe.orbitale` | pied .40, hauteur .62, ornement `bille` |
| `pointe.gyroscope` | pied .34, hauteur .70, ornement `cardans` |
| `pointe.furie` | pied .44, hauteur .82, ornement `dents` |
| `pointe.ressort` | pied .34, hauteur .86, ornement `spire` |
| `noyau.fournaise` | 6 facettes, ornement `braise` |
| `noyau.oeil-du-cyclone` | 8 facettes, ornement `spirale` |
| `noyau.caparacon` | 6 facettes, ornement `bouclier` |
| `noyau.arc-electrique` | 5 facettes, ornement `arc` |

### Les paliers de rang — une seule échelle

`src/ui/rank.ts` porte aujourd'hui ses propres seuils **et** une échelle de couleur
où Légende est violet et Épique doré. La refonte adopte la convention universelle du
genre — acier → bleu → violet → **or au sommet** — et, surtout, **supprime le
doublon** : les seuils et les couleurs vivent désormais dans `src/art/rank.ts`, que
`ui/rank.ts` et les cadres de pièce consomment tous deux.

| Palier | Rangs | Cadre | Gemmes | Ergots | Balayage |
|---|---|---|---|---|---|
| 0 | Commun → Rare (1-3) | acier brut | 0 | non | non |
| 1 | Excellent (4-6) | acier bleui | 1 | non | non |
| 2 | Épique (7-10) | violet | 2 | oui | non |
| 3 | Légende (11+) | or | 3 | oui | **oui** |

## § 3. La toupie devient un objet assemblé

Une toupie est un châssis plus quatre pièces. On la dessine pour ce qu'elle est :
**une pile, vue de trois quarts** — couronne de Lame en haut, Disque dessous, Pointe
en bas, Noyau incandescent au centre.

Deux vues de la **même** recette, jamais deux dessins :

- **Portrait 3/4** — Forge, Toupies, écran de résultats. Changer sa Lame change le
  portrait : la Forge devient lisible sans lire.
- **Vue de dessus** — l'arène. `render/textures.ts` cesse d'inventer ses deux disques
  génériques et appelle `art/toupie.ts`. Ta toupie montée tourne enfin à l'écran, et
  les quatre châssis ennemis cessent d'être un seul disque orange.

### Les 4 recettes de châssis

| Châssis | Type | Corps |
|---|---|---|
| `brasier-solaire` | Équilibre | 6 lobes en soleil, accent braise |
| `typhon-primal` | Attaque | 3 pales fuyantes, très asymétrique |
| `carapace-abyssale` | Défense | 8 plaques blindées, large et basse |
| `tigre-foudre` | Endurance | 5 encoches en griffe |

## § 4. Écran par écran

### Combat — arène plein écran, HUD posé dessus

L'arène occupe l'intégralité de la colonne ; l'en-tête (crédits, gemmes, son) et la
barre d'onglets passent en surimpression sur un voile dégradé.

Effet de bord recherché : le canvas cesse d'être carré et laisse enfin de la place
**autour** du disque de jeu. On y dessine le décor du chapitre — voile de vignette et
ambiance colorée. `CHAPTERS` gagne une couleur d'ambiance par chapitre, du Hangar
Rouillé au Vortex : huit arènes qui ne se ressemblent plus.

Remplacements de texte, un pour un :

| Aujourd'hui | Demain |
|---|---|
| « SALLE 4 / 10 » + barre + « Boss : salle 10 » | **10 pastilles**, remplies au fur et à mesure, la 10ᵉ marquée boss |
| barre « ▾ TON SPIN » sous l'arène | **anneau-jauge autour de ta propre toupie** — l'information est là où les yeux sont déjà — doublée d'un arc discret en bas d'écran |
| *(rien)* | **arc de spin sous chaque adversaire** : aujourd'hui rien ne dit qu'un bot est à deux coups de la mort |
| bandeau « Salle 4 · Défense » à chaque transition | **chevron ▲ / ▬ / ▼** porté par le bot : avantage, neutre, désavantage |

Le bandeau de boss est conservé — nommer le Gardien du Hangar à son entrée est de la
mise en scène, pas de l'explication.

### Coffres — le coffre est un objet qui s'ouvre

Trois coffres dessinés : caisse de bronze cerclée, cantine d'arène, reliquaire
mythique. Tailles et matières distinctes.

- La **pitié devient un anneau qui se remplit** autour du coffre. La phrase
  « Excellent garanti dans 7 tirages » disparaît ; le compte exact reste lisible au
  centre de l'anneau.
- L'**ouverture** secoue le coffre, éclate, et projette les pièces **une à une,
  dessinées**, triées pour que la meilleure arrive en dernier, avec un éclat
  proportionné au palier de rang. Le tirage ×10 cesse d'être une liste.
- Le butin en attente devient une **pile de coffres empilés**, pas deux lignes de
  bouton.

### Forge — le portrait au centre, les quatre emplacements autour

Le portrait de la toupie montée occupe le haut de l'écran ; les quatre emplacements
sont des pastilles disposées autour, chacune montrant la pièce **dessinée**, son
cadre de rang et son coût d'amélioration.

Les sept axes deviennent un **radar à 7 branches** : le heptagone neutre en fond, le
profil actuel plein, et le profil **après achat** en surcouche. Un achat se juge
d'un regard au lieu de sept lignes « +10 % ».

> Décision assumée : le radar à 7 axes est dense sur 390 px. Il est retenu parce
> qu'il est le seul à montrer *la forme* d'une toupie — ce qu'aucune liste ne fait —
> et parce que la comparaison avant/après y est immédiate. **Il sera jugé en
> navigateur à la vague 1** (planche de style) ; si la lecture ne passe pas à cette
> taille, le repli est quatre barres (Attaque, Défense, Vitesse, Spin) plus trois
> pastilles secondaires. Le repli est décidé sur capture, pas sur intuition.

Les talents deviennent des pastilles sur le portrait, avec leur libellé au contact.

### Inventaire — une grille de tuiles

Aujourd'hui : des lignes empilées, deux boutons chacune, un écran par poignée de
pièces. Demain : une grille de tuiles carrées — dessin, cadre de rang, badge de
quantité, et **pulsation quand la pile est fusionnable**. Il faut aujourd'hui lire
« 2 identiques + 1 sacrifice » et compter soi-même pour le savoir.

Toucher une tuile ouvre sa fiche : équiper, fusionner, profil.

### Toupies — quatre portraits et un vrai triangle

- Le paragraphe de quatre lignes sur le triangle des forces devient **un triangle
  dessiné** : Attaque, Endurance, Défense aux sommets, flèches orientées, Équilibre
  au centre hors du cycle. Les pourcentages restent inscrits sur les flèches.
- La composition du chapitre devient **une bande de 10 pastilles teintées par type**,
  au lieu de trois lignes « Salles 1-3 — Endurance ».
- Chaque Fondateur est un **portrait**, avec son radar et son type en accent.

### Navigation

Icônes dessinées plus libellé, onglet actif surélevé. Le badge de coffres en attente
devient une pastille sur l'icône.

## § 5. Ce qui prouve que ça marche

**Tests unitaires** (`src/art/recipes.test.ts`) :

1. **Tout modèle de `MODELS` a une recette, toute toupie de `TOUPIES` a une recette,
   tout `ChestKind` a une recette.** C'est la garantie centrale : ajouter du contenu
   sans son visuel fait échouer la suite. C'est précisément ce qui a laissé le
   catalogue muet jusqu'ici.
2. La recette d'un modèle est cohérente avec son emplacement (`slot`) — une Lame ne
   peut pas porter des réglages de Pointe.
3. `rankTier` couvre les 11 rangs nommés et se prolonge au-delà (Légende +N), sans
   trou ni recouvrement.
4. `ui/rank.ts` et les cadres lisent la **même** échelle : un test vérifie qu'il
   n'existe qu'une source de seuils.

**Vérification en navigateur, non déléguée.** Le rendu ne se teste pas
unitairement : chaque vague se termine par des captures Playwright que je lis
moi-même avant de déclarer la vague finie. C'est la méthode déjà écrite dans
`docs/ameliorations.md` (« Rendu : `npm run dev` puis Playwright »).

**Non-régression :** `npm run test` et `npm run build` passent à chaque vague ;
`npm run calibrate` n'a pas à être rejoué — aucune valeur d'équilibrage ne bouge.

## § 6. Découpage en vagues

| Vague | Contenu | Point d'arrêt |
|---|---|---|
| **1** | `src/art/` complet + `src/ui/art/` + planche de style hors jeu | **Les 24 objets dessinés sont montrés avant qu'un seul écran ne bouge.** Le radar y est tranché. |
| **2** | Arène plein écran, décor de chapitre, toupie assemblée en jeu, jauges, pastilles de salle | Captures de combat |
| **3** | Coffres (objets, anneau de pitié, ouverture) et inventaire en grille | Captures d'ouverture ×10 |
| **4** | Forge, Toupies, navigation | Captures des trois écrans |

La vague 1 est le point où une réorientation coûte le moins cher : rien du jeu n'a
encore changé.

### Décisions prises sur pièce

Deux points laissés ouverts par cette spec ont été tranchés sur capture, pas sur
intuition :

- **Le radar à 7 axes est retenu.** Jugé sur la planche de style à 132 px et à
  64 px : les quatre châssis y donnent quatre formes distinctes et la comparaison
  avant/après se lit d'un coup. Le repli en quatre barres n'a pas été nécessaire.
- **La planche de style est conservée** (`styleboard.html` + `src/dev/`), contre
  ce que prévoyait le § 6 initial. Elle a servi quatre fois pendant la refonte, et
  c'est la seule surface qui vérifie qu'une pièce ajoutée au catalogue est
  effectivement dessinable. `vite build` ne construit que `index.html` : elle
  n'est jamais livrée au joueur. La supprimer aurait laissé le test de couverture
  garantir qu'une recette *existe*, sans que personne ne puisse voir à quoi elle
  ressemble.

## § 7. Ce qui est hors périmètre

- **La simulation.** Aucun fichier de `src/sim/` n'est modifié.
- **L'équilibrage.** Aucun chiffre de `config.ts` ni de `balance.json`.
- **Le son.** Le sujet a sa propre dette ouverte dans `docs/ameliorations.md`.
- **Le contenu.** Aucune toupie ni pièce ajoutée : on habille le catalogue existant.
- **`design/*.dc.html`.** Ce sont des croquis de disposition en noir et blanc, pas
  une direction artistique ; ils ne sont ni modifiés ni contredits.
