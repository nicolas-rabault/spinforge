# Multilangue français / anglais — design

Le jeu est monolingue français : ~160 chaînes en dur dans `src/ui/`, deux tables
de libellés joueur logées dans le cœur pur `src/sim/`, et les noms propres de
l'univers portés par les catalogues de `src/content/`. On ajoute l'anglais, la
langue étant déduite du navigateur et surchargeable par le joueur.

## Décisions

| Question | Décision |
| --- | --- |
| Portée | **Tout** est traduit, noms propres compris — toupies, pièces, chapitres, boss, rangs, talents. Un joueur anglais ne voit aucun mot français. |
| Choix de la langue | `navigator.languages` au premier lancement, surchargeable par un sélecteur `FR`/`EN` dans l'en-tête, persisté. |
| Repli | Un navigateur ni français ni anglais obtient **l'anglais**. |
| Persistance | Clé `spinforge.lang` propre, hors de la sauvegarde — comme `spinforge.muted` et `spinforge.onboarded`. Le schéma 4 ne bouge pas. |
| Outillage | Couche maison, zéro dépendance. Ni i18next (~40 kB, typage perdu) ni JSON chargé à la volée (flash au boot, typage perdu). |
| Accès à `t()` | Singleton de module, comme `audio.ts`. |

Le **typage des clés est le pivot** : `en.ts` est déclaré `Record<MessageKey, string>`
où `MessageKey = keyof typeof fr`. Une clé oubliée ou en trop casse le build. À
~160 clés, c'est la seule garantie qu'aucun écran ne reste à moitié traduit —
et c'est précisément ce que les deux approches écartées sacrifiaient.

## Le module `src/i18n/`

```
fr.ts           catalogue de référence — définit l'ensemble des clés
en.ts           Record<MessageKey, string>, typé sur fr
index.ts        détection · persistance · t() · tn() · formatCredits()
tx.tsx          tx() · txn() — interpolation de nœuds React
```

`index.ts` reste **libre de React** : il est testable en vitest sans JSX, et les
helpers non-composants (`axisLine`, `rankLabel`, `formatCredits`) l'appellent
directement.

### Détection

`localStorage['spinforge.lang']` s'il vaut `fr` ou `en` → sinon le premier de
`navigator.languages` dont l'étiquette commence par `fr` ou `en` → sinon `en`.
L'accès à `localStorage` est en `try/catch` comme dans `storage/localSave.ts` :
sans ça, les tests Node et la navigation privée lèvent.

### Pluriels

`tn(base, count, vars?)` construit `` `${base}.${new Intl.PluralRules(lang).select(count)}` ``
et **retombe sur `.other` quand la catégorie n'existe pas**. Ce repli n'est pas
décoratif : le CLDR récent renvoie `many` pour le français au-delà du million,
et une clé `.many` absente afficherait du vide. Le typage n'exige donc que
`.one` et `.other` :

```ts
type PluralKey = MessageKey extends `${infer B}.one` ? B : never;
```

Cela remplace les six `{n > 1 ? 's' : ''}` disséminés dans `ChestScreen`,
`InventoryPanel` et `TabBar`.

### Interpolation

`t(key, vars)` remplace `{nom}` par une chaîne. `tx(key, vars)` fait la même
chose avec des `ReactNode` et retourne un tableau de nœuds : c'est ce qui permet
de garder les fragments colorés à l'intérieur d'une phrase traduisible, au lieu
de la découper en trois clés dont l'ordre des mots serait figé par le français.
Quatre messages en dépendent — l'explication du premier lancement (`<strong>`),
le meilleur rang d'un tirage, le compteur de pitié, et les deux phrases
d'attente de châssis.

### Nombres

`formatCredits` code en dur `.replace('.', ',')`. Il passe par
`Intl.NumberFormat(getLang())` et le suffixe devient une clé : `' k'` / `' M'`
en français (espace de la typographie française), `'k'` / `'M'` en anglais. La
fonction déménage de `src/ui/format.ts` vers `src/i18n/index.ts` — elle est
devenue une affaire de locale, pas de mise en forme d'écran.

## Sortir les libellés joueur de `src/sim/`

`RANK_LABELS` et `TALENT_LABELS` sont de la présentation logée dans le cœur pur,
que la règle d'architecture n°1 tolère mal. Traduire est l'occasion de les
déplacer plutôt que de les traduire sur place :

- `rankLabel()` quitte `sim/piece.ts` pour `ui/rank.ts`, qui porte déjà
  `rankColor` — le fichier devient « comment on présente un rang », le mot et la
  couleur ensemble. Ses tests migrent vers un `ui/rank.test.ts` neuf.
- `TALENT_LABELS` quitte `sim/talents.ts` ; la Forge appelle `talentLabel(id)`
  depuis `ui/`.

`src/sim/` n'importe `src/i18n/` dans aucun sens.

## `src/content/` cesse de porter du texte

Les champs texte sont **supprimés** plutôt que doublés d'un `labelKey` — deux
champs à tenir synchronisés valent moins qu'une clé dérivée de l'identifiant :

| Avant | Après |
| --- | --- |
| `{ id: 'brasier-solaire', label: 'Brasier Solaire' }` | `toupie.brasier-solaire` |
| `{ id: 'lame.croc-de-tempete', label: 'Croc de Tempête' }` | `piece.lame.croc-de-tempete` |
| `{ name: 'Hangar Rouillé', boss: 'Gardien du Hangar' }` | `chapter.1.name` · `chapter.1.boss` |

`CHAPTERS` n'a plus de données à porter : `chapterOf()` disparaît, remplacé par
`chapterName()` et `chapterBoss()` côté UI. `Toupie.label` et `PieceModel.label`
disparaissent.

Le prix : une clé dérivée manquante échappe à TypeScript, la dérivation étant
une chaîne construite. D'où `catalog.test.ts` (ci-dessous), qui la rattrape.

## Le sélecteur

Bouton `FR`/`EN` de 34×34 dans l'en-tête de `App.tsx`, à côté du bouton son —
deux langues appellent une bascule, pas un menu. Au clic : `setLang()` mute le
module, écrit `localStorage`, met à jour `document.documentElement.lang`, puis le
`redraw()` déjà existant de `App` repropage. Aucun `memo` dans l'arbre : un seul
`setState` sur la racine suffit, et **le run en cours n'est pas interrompu**.

`main.tsx` pose `document.documentElement.lang` avant le premier rendu.
`index.html` garde `lang="fr"` comme valeur de départ : le français est la
langue source du dépôt.

## Tests

| Fichier | Ce qu'il prouve |
| --- | --- |
| `i18n/i18n.test.ts` | Détection (localStorage prioritaire, valeur trafiquée ignorée, `ja` → `en`, `fr-CA` → `fr`), interpolation, pluriels FR aux bornes 0 / 1 / 2 / 1 000 000 et EN, repli `.other`, `formatCredits` dans les deux langues. |
| `i18n/catalog.test.ts` | Parité stricte des jeux de clés ; **chaque clé dérivée du contenu existe** (`TOUPIES`, `MODELS`, les 8 chapitres, les 12 talents, les 7 axes, les 4 types, les 11 rangs) ; tout `{var}` présent côté français l'est côté anglais. |
| `ui/rank.test.ts` | `rankLabel` bilingue, `Légende +19` / `Legend +19` inclus. |
| `ui/format.test.ts` | Les quatre cas français conservés, plus leurs jumelles anglaises. |

La vérification du rendu se fait au navigateur, non déléguée : les deux langues
sur les quatre onglets, en surveillant les débordements sur les boutons les plus
serrés — celui de défaite et les deux `Ouvrir ×10`.

## Documentation

Dans le même lot : la règle n°6 de `CLAUDE.md` passe de « textes joueur en
français » à « français et anglais, catalogues dans `src/i18n/` » ; le Catalogue
de `docs/game-design.md` enregistre les noms anglais à côté des français, pour
que la Saison 1 arrive bilingue au jalon 4.

## Hors périmètre

La Saison 1 (douze toupies pas encore implémentées) et toute troisième langue.
