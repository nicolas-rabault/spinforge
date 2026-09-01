# Guidage du joueur — spécification de conception

**Date** : 2026-09-01 · **Branche** : `guidage-joueur` · **Lot 1 sur 2**

## But

Le joueur ouvre la Forge et ne sait pas quoi y faire. Rien ne lui dit qu'une pièce
de son inventaire bat celle qu'il porte, ni que la grille 2×2 des emplacements
correspond à des hauteurs précises de sa toupie. Deux corrections, une seule
intention : **rendre visible ce qui attend le joueur**.

1. **La pile de la Forge** — les emplacements se lisent dans l'ordre où ils
   s'empilent sur le portrait dessiné juste au-dessus.
2. **Le point rouge** — un marqueur unique, présent à tous les étages, qui dit
   « quelque chose t'attend ici » et s'éteint quand c'est fait.

## Périmètre

Ce lot est **entièrement dérivé de l'état existant**. Il n'ajoute aucun champ à
`MetaState`, ne touche pas `SAVE_SCHEMA`, ne change aucune règle de jeu et
n'introduit aucune constante d'équilibrage.

**Hors périmètre — Lot 2, spec séparée.** La demande d'origine portait aussi sur
une boucle de progression continue façon idle mobile : quêtes et défis qui
donnent des points, points qui donnent des crédits, crédits qui achètent des
coffres, ouvertures de coffres qui redonnent des points de quête. C'est un
sous-système avec sa monnaie, sa persistance et son écran ; `docs/game-design.md`
et `docs/roadmap.md` le placent au jalon 3 (« quêtes quotidiennes »). Il sera
spécifié séparément, après la fusion de `jalon-3-lot-a`. Le présent lot lui
prépare le terrain : le point rouge saura marquer une quête réclamable sans
qu'une ligne d'agrégation ne bouge.

## Contraintes non négociables

Rappel de `CLAUDE.md`, appliqué à ce lot :

1. **`src/sim/` reste pur.** La nouvelle règle de comparaison y entre parce que
   c'est une question de **règles du jeu** (« cette pièce est-elle meilleure ? »).
   Elle ne connaît ni onglet, ni écran, ni point rouge.
2. **Le rendu est un spectateur.** L'agrégation « quel onglet porte un point »
   vit dans `src/ui/`, lit l'état, ne le modifie jamais.
3. **Aucune couleur en dur.** Le rouge d'alerte devient un jeton de `src/theme.ts`,
   comme les autres.
4. **`src/art/` reste la source unique du dessin.** La ligne Châssis de la Forge
   affiche le portrait rendu par `art/toupie.ts`, pas une icône séparée.
5. **Aucune chaîne visible en dur.** Toute étiquette et tout `aria-label` nouveau
   passe par `src/i18n/`, `fr.ts` et `en.ts` ensemble.

## Coordination avec l'autre session

`jalon-3-lot-a` (worktree `../B-Blades_versus-chapitres`) travaille au même moment
sur `sim/meta.ts`, `sim/types.ts`, `sim/save.ts` (schéma 5), `sim/sim.ts`,
`ui/App.tsx`, `ui/CombatScreen.tsx`, `ui/ForgeScreen.tsx`, `ui/ToupiesScreen.tsx`.

Le choix « aucun champ de sauvegarde » (§2.1) supprime la collision sur toute la
simulation. Restent **deux fichiers partagés** : `ui/App.tsx` (leur diff : 11
lignes, autour du panneau « Choisis ta descente ») et `ui/ForgeScreen.tsx` (leur
diff : 7 lignes, autour de la toupie chiffrée). Le conflit sera lisible.

**Ordre de fusion** : `jalon-3-lot-a` d'abord, puis rebase de `guidage-joueur`
sur `main`. À refaire le point juste avant (`git merge-base --is-ancestor`).

---

## 1 · La pile de la Forge

### 1.1 Le défaut

`art/toupie.ts` dessine déjà la toupie comme une pile — le commentaire de
`drawToupiePortrait` le dit mot pour mot : « la pile complète, Lame en haut,
Disque au milieu, Pointe en bas, Noyau en façade ». Les hauteurs sont explicites :

| Pièce | Hauteur dans le portrait |
|---|---|
| Lame | `yLame = -r × 0,30 × stance` (le plus haut) |
| Noyau | `yLame + r × 0,02` (en façade, au creux de la couronne) |
| Châssis | `yLame + r × 0,08` (juste sous la couronne, il porte tout) |
| Disque | `r × 0,18` |
| Pointe | `r × 0,30` (le plus bas) |

Juste dessous, les quatre boutons d'amélioration sont en **grille 2×2**
(`ForgeScreen.tsx:85`), dans l'ordre `lame, disque, pointe, noyau`. Aucune case
ne correspond à aucune hauteur. Le joueur voit un objet en trois dimensions puis
un formulaire en deux colonnes, et rien ne relie les deux.

### 1.2 La disposition

La grille 2×2 devient **une pile pleine largeur**, dans l'ordre du portrait :

```
┌────────────────────────────────────────────┐
│        portrait              radar         │   ← inchangé
└────────────────────────────────────────────┘

┌────────────────────────────────────────────┐
│ ▣  CARAPACE ABYSSALE      (Défense)     ›  │   ← en-tête : le châssis
├────────────────────────────────────────────┤
│ ▣  LAME  niv. 4                            │   ← haut de la pile
│    Couronne Solaire                        │
│    ATQ 120 → 131                      260  │
├────────────────────────────────────────────┤
│ ▣  NOYAU niv. 2                         ●  │
│    Cœur Gyre                               │
│    SPIN 900 → 946                     180  │
├────────────────────────────────────────────┤
│ ▣  DISQUE niv. 3                           │
│    Éventail                                │
│    DEF 60 → 64                        210  │
├────────────────────────────────────────────┤
│ ▣  POINTE niv. 1                           │
│    Aiguille                                │
│    VIT 240 → 252                      140  │   ← bas de la pile
└────────────────────────────────────────────┘
```

**Ligne d'emplacement** (4 lignes, boutons d'achat) — `flex`, `align-items:
center`, `gap: 10` :

| Colonne | Contenu | Note |
|---|---|---|
| gauche, 54 px | `PieceIcon` de la pièce équipée, `tile` | identique à aujourd'hui |
| centre, `flex: 1 1 0` | 3 lignes : nom + niveau · modèle (coloré par rang) · `AXE avant → après` | identique à aujourd'hui |
| droite, auto | le prix, `Oswald 15px`, `--ember`, aligné à droite | passe en colonne propre |
| coin haut-droit | le point rouge, quand une pièce de l'inventaire domine | §2.4 |

Les quatre axes affichés ne changent pas : Lame → attaque, Noyau → spin max,
Disque → défense, Pointe → vitesse max. Seul **l'ordre du tableau `SLOTS`** passe
de `lame, disque, pointe, noyau` à `lame, noyau, disque, pointe`.

**Ligne d'en-tête — le Châssis.** Elle n'est pas un cran de la pile : c'est la
pièce qui *porte* toutes les autres, et la seule qui ne s'achète pas ici. Elle est
donc mise en tête et distinguée — pas de colonne prix, un chevron `›` à sa place,
un filet sous elle avant les quatre lignes d'achat.

| Colonne | Contenu |
|---|---|
| gauche, 54 px | le portrait de la toupie montée, `toupiePortraitUrl(art, 54)` |
| centre | le nom de la toupie (`toupieLabel`) et une pastille de type teintée `--type-<type>` (`typeLabel`) |
| droite | chevron `›` |

Tap → bascule sur l'onglet Toupies. `ForgeScreen` reçoit donc une prop
`onGoToToupies: () => void` fournie par `App`, qui possède déjà `setTab`.
La Forge ne connaît toujours pas la liste des onglets — elle appelle un rappel.

### 1.3 Ce qui ne bouge pas

Le portrait et le radar en tête d'écran, la bande de talents, le panneau
d'inventaire dessous : inchangés.

---

## 2 · Le point rouge

### 2.1 Un signal dérivé, jamais stocké

Le point rouge est **calculé à chaque rendu depuis `MetaState`**. Il s'éteint
parce que l'action est faite, jamais parce que le joueur a visité l'écran.

Trois conséquences voulues :

- **aucun champ de sauvegarde, donc aucun `SAVE_SCHEMA`** — et donc aucune
  collision avec `jalon-3-lot-a` (§Coordination) ;
- **aucun état à réconcilier** entre l'écran, l'onglet et la vignette : les trois
  lisent la même fonction, ils ne peuvent pas se contredire ;
- un point rouge ne peut pas rester allumé sur une action déjà faite.

L'alternative — un drapeau « vu / pas vu » dans `MetaState` — n'est nécessaire
que pour éteindre un point *parce qu'on a regardé*. Aucun des cas de ce lot n'en
a besoin : ouvrir un coffre, fusionner, équiper sont des actions, pas des
lectures. Écartée.

### 2.2 La règle : « équiper ne fait rien perdre, et fait gagner »

Nouveau module **`src/sim/upgrade.ts`**, pur :

```ts
/** Vrai si monter cette pièce à la place de celle qui occupe son emplacement
 *  n'abaisse aucune des sept stats et en relève au moins une. */
export function dominatesEquipped(
  meta: MetaState, toupie: ToupieId, model: string, rank: number, level: number,
): boolean
```

Mécanisme :

1. `slot = modelById(model).slot` ;
2. `after = playerStats({ ...meta, equipped: { ...meta.equipped, [slot]: { model, rank, level } } }, toupie)` ;
3. `before = playerStats(meta, toupie)` ;
4. comparer les **sept** axes de `Stats` (`attack`, `defense`, `maxSpeed`,
   `spinMax`, `spinDecay`, `accel`, `mass`) ; vrai si aucun ne recule et au moins
   un avance.

**Le sens des axes.** Six axes montent, `spinDecay` descend — c'est une perte de
spin par seconde, donc moins vaut mieux (`sim/profile.ts` documente déjà ce
piège). Cette direction existe aujourd'hui **en double** : le commentaire de
`sim/profile.ts` et la fonction `isGain` de `ui/profileAxes.ts`. Ce lot en fait
une source unique — `sim/profile.ts` exporte

```ts
/** Le sens de chaque axe. `spinDecay` est une perte : là, descendre est un gain. */
export const HIGHER_IS_BETTER: Record<ProfileAxis, boolean>
```

et `ui/profileAxes.isGain` le lit au lieu de retester `axis === 'spinDecay'`.
Deux endroits où corriger le piège deviennent un seul.

**Pourquoi comparer les stats et non le rang.** Une pièce de rang supérieur au
niveau 0 est régulièrement **plus faible** qu'une pièce équipée montée au niveau
8 : `factor(piece) = (1 + perLevel × niveau) × rarityMult(rang)`. Un point rouge
posé sur le rang seul mentirait plusieurs fois par partie.

**Pourquoi pas de point sur les échanges.** Un Disque qui gagne en défense et
perd en masse est un **choix**, pas une évidence. Le point rouge veut dire « fais
ceci maintenant » ; sur un arbitrage, il donnerait un mauvais conseil la moitié
du temps.

**Talents : volontairement hors de la règle.** Un rang franchi débloque un talent
(`talentsOf`). Une variante testée puis écartée ajoutait « … ou le rang monte » à
la condition. Elle est inatteignable : `rarityMult` étant strictement croissante,
un rang supérieur déplace toujours au moins un axe, donc la branche ne se
déclencherait jamais — du code mort. Un rang supérieur qui **coûte** une stat
reste un arbitrage, donc sans point (paragraphe précédent).

**Quel niveau pour la pièce candidate ?** Celui que `equipFromStack` monterait
réellement, c'est-à-dire `stack.levels[0]` — `takePiece` sort toujours le
meilleur exemplaire, et `levels` est trié décroissant (`meta.addPiece`). Comparer
autre chose annoncerait un gain que l'échange ne donnerait pas.

**Quelle toupie ?** Celle sur laquelle l'achat porte, exactement comme la Forge la
choisit déjà : `run.phase === 'dead' ? meta.toupies.active : run.toupie`. Le
châssis pèse sur `resolveProfile`, donc sur la comparaison — s'en écarter ferait
diverger le point rouge et la ligne `avant → après` juste à côté.

### 2.3 L'agrégation

Nouveau module **`src/ui/attention.ts`**, pur, sans DOM :

```ts
export interface Attention {
  /** Coffres en attente, tous types confondus. */
  coffres: number;
  /** Piles d'inventaire marquées, par clé `model:rank`. */
  stacks: Set<string>;
  /** Emplacements dont la pièce équipée est battue par une pile de l'inventaire. */
  slots: Set<Slot>;
  /** Un Fondateur attend d'être réclamé. */
  toupies: boolean;
}

export function attention(meta: MetaState, toupie: ToupieId): Attention
```

Sources, **toutes gratuites** :

| Source | Prédicat | Origine |
|---|---|---|
| coffres à ouvrir | `pendingTotal(meta) > 0` | existe (`sim/meta.ts`) |
| pile fusionnable | `canFuse(meta, model, rank)` | existe (`sim/fusion.ts`) |
| pile à équiper | `dominatesEquipped(...)` | §2.2, nouveau |
| Fondateur à réclamer | `canClaimFounderGift(meta)` | existe (`sim/meta.ts`) |

`slots` se déduit de `stacks` : un emplacement est marqué si une pile **dominante**
(pas seulement fusionnable) vise cet emplacement — fusionner ne change pas la
toupie montée, ce n'est pas une action de la ligne d'emplacement.

`Attention` est un instantané, recalculé à chaque rendu de `App`. Le coût est
borné : une passe sur `meta.inventory`, deux `playerStats` par pile — quelques
dizaines de multiplications. `App` se rend à chaque tick pendant le combat, mais
`attention` n'y est appelée que pour les écrans de menu et la barre d'onglets ;
le calcul est refait au même rythme que le reste de l'arbre React, qui n'a aucun
`memo`. Si le profilage montrait un coût réel, le remède serait un `useMemo` sur
`meta.inventory.length` — pas une valeur stockée dans la sauvegarde.

### 2.4 La carte

**Le point ne marque que le gratuit.** Une amélioration payable maintenant n'en
reçoit pas : les crédits rentrent en continu, le point serait allumé en
permanence, et un point toujours allumé ne dit plus rien. Les achats gardent leur
langage — le prix en braise.

| Où | Condition | Forme |
|---|---|---|
| Onglet **Coffres** | `att.coffres > 0` | pastille **chiffrée** — celle qui existe, passée de `--ember` à `--alert` |
| Onglet **Forge** | `att.stacks.size > 0` | point nu |
| Onglet **Toupies** | `att.toupies` | point nu |
| Onglet **Combat** | jamais | — |
| Coffres → vignette de butin | `meta.pending[kind] > 0`, lu directement — l'écran Coffres connaît déjà le détail par type | point nu, coin haut-droit (le compte reste dans sa pastille braise en bas-droite) |
| Coffres → cartes d'achat | jamais | — |
| Forge → ligne d'emplacement | `att.slots.has(slot)` | point nu, coin haut-droit |
| Forge → ligne Châssis | jamais (Lot 1) | — |
| Inventaire → filtre d'emplacement | une pile marquée vise cet emplacement | point nu |
| Inventaire → filtre « Tous » | `att.stacks.size > 0` | point nu |
| Inventaire → vignette de pile | `att.stacks.has('model:rank')` | point nu, coin haut-droit |

**Les halos restent.** Le point rouge dit *qu'il y a* quelque chose ; les halos
disent *quoi* — le cadre vert `--zoneBoost` d'une pile fusionnable, la
respiration `sf-breathe` d'un coffre de butin. Une vignette à la fois fusionnable
et dominante porte **un seul** point (elle attend une action, peu importe
laquelle) et son halo vert.

### 2.5 Le jeton et le composant

**`src/theme.ts`** gagne `alert: 0xff3b30`, injecté en `--alert` comme les autres.
Distinct de `zoneSpike` (0xff5a5a, les pointes de l'arène) et de `bot` (0xff7c30) :
le rouge d'alerte ne se rencontre que dans les menus, les deux autres dans
l'arène. `theme.test.ts` vérifie déjà que chaque entrée de `PALETTE` devient une
variable CSS — le jeton y entre sans nouveau test.

**`src/ui/art/AlertDot.tsx`** :

```tsx
export function AlertDot({ label, count }: { label: string; count?: number })
```

- Sans `count` : disque de 10 px, `--alert`, **cerné de 1,5 px de `--ink`**.
  L'anneau n'est pas un ornement : sur l'onglet actif, le fond est `--ember`, et
  du rouge posé sur de l'orange ne se voit pas. Le cerne sombre le détache des
  deux fonds.
- Avec `count` : pastille `min-width: 17px`, `height: 17px`, fond `--alert`,
  texte `--text`, `tabular-nums` — la géométrie exacte de la pastille actuelle
  de `TabBar`, seule la couleur change.
- Positionné en absolu au coin haut-droit ; l'appelant porte `position: relative`.
- `label` devient l'`aria-label` : le point est une information, pas un décor.

### 2.6 Textes

Nouvelles clés, `fr.ts` et `en.ts` ensemble (`i18n.test.ts` casse sinon) :

| Clé | fr | en |
|---|---|---|
| `slot.chassis` | Châssis | Chassis |
| `forge.changeToupie` | Changer de toupie | Change toupie |
| `alert.todo` | quelque chose à faire | something to do |
| `alert.better` | meilleure que celle équipée | better than equipped |
| `alert.fusable` | fusionnable | ready to fuse |
| `alert.gift` | un Fondateur t'attend | a Founder is waiting |

`tab.chestsBadge.one/other` sert déjà d'`aria-label` à la pastille chiffrée :
inchangé.

---

## 3 · Découpage des fichiers

| Fichier | Nature | Contenu |
|---|---|---|
| `src/sim/upgrade.ts` | **nouveau** | `dominatesEquipped` |
| `src/sim/upgrade.test.ts` | **nouveau** | §4 |
| `src/sim/profile.ts` | modifié | export de `HIGHER_IS_BETTER` |
| `src/ui/profileAxes.ts` | modifié | `isGain` lit `HIGHER_IS_BETTER` |
| `src/ui/attention.ts` | **nouveau** | `attention()` |
| `src/ui/attention.test.ts` | **nouveau** | §4 |
| `src/ui/art/AlertDot.tsx` | **nouveau** | le point |
| `src/theme.ts` | modifié | jeton `alert` |
| `src/ui/ForgeScreen.tsx` | modifié | la pile, la ligne Châssis, les points d'emplacement |
| `src/ui/InventoryPanel.tsx` | modifié | points sur vignettes et filtres |
| `src/ui/ChestScreen.tsx` | modifié | points sur les vignettes de butin |
| `src/ui/TabBar.tsx` | modifié | pastille en `--alert`, points Forge et Toupies |
| `src/ui/App.tsx` | modifié | calcule `attention`, passe `onGoToToupies` |
| `src/i18n/fr.ts`, `src/i18n/en.ts` | modifiés | §2.6 |

`ForgeScreen.tsx` reste sous 200 lignes après l'ajout de la pile : pas de scission
à prévoir.

---

## 4 · Tests

Vitest, colocalisés, imports explicites. **Chaque test est prouvé par mutation** :
on retire le mécanisme qu'il garde, on vérifie qu'il rougit, on remet. Un test qui
passe encore sans son mécanisme ne prouve rien (c'est le constat du jalon 2b et du
verrou du châssis).

### `src/sim/upgrade.test.ts`

| Test | Ce qu'il garde | Mutation qui doit le faire rougir |
|---|---|---|
| même modèle, rang supérieur, même niveau → domine | le cas nominal | renvoyer toujours `false` |
| `disque.lourd` rang 2 niveau 0 contre le même équipé rang 1 **niveau 8** → **ne domine pas** (facteur 1,08 contre 1,80) | la raison d'être de la règle : le rang seul ment | comparer `rank` au lieu des stats |
| `disque.lourd` → `disque.axial`, même rang, même niveau (défense +15 %, masse −5 %) → **ne domine pas** | « aucun axe ne recule » | ne comparer que l'axe de l'emplacement |
| `pointe.plate` → `pointe.furie`, même rang, même niveau (vitesse +30 %, accélération +10 %, mais `spinDecay` ×1,30) → **ne domine pas** | le sens inversé de `spinDecay` : ×1,30 est une **perte** | inverser `spinDecay` dans `HIGHER_IS_BETTER` — la perte passerait pour un gain et le test verrait `true` |
| pièce strictement identique à l'équipée → **ne domine pas** | « au moins un axe avance » | accepter l'égalité |

### `src/ui/attention.test.ts`

| Test | Ce qu'il garde | Mutation qui doit le faire rougir |
|---|---|---|
| `pending` non vide ⇒ `coffres.total` le reflète | le compte de la barre d'onglets | renvoyer `0` |
| une pile fusionnable est dans `stacks`, pas dans `slots` | fusionner n'est pas une action d'emplacement | ajouter les fusionnables à `slots` |
| une pile dominante est dans `stacks` **et** dans `slots` | la remontée vers la ligne d'emplacement | ne remplir que `stacks` |
| une pile dominante d'un autre emplacement ne marque pas cet emplacement-ci | le routage par `slot` | marquer tous les emplacements |
| inventaire vide ⇒ tout est éteint | qu'un point ne s'allume pas tout seul | renvoyer un `Set` non vide |

### Ce qui n'est pas testé unitairement

La disposition de la pile et la position des points : c'est du rendu, il se
vérifie dans un navigateur (§5).

---

## 5 · Vérification

`npm run test`, `npm run build`, puis **navigateur, non délégué** :
`npm run dev` dans le worktree (lire la ligne « Local: » — le port n'est pas 5173,
une autre session l'occupe), page `http://localhost:<port>/spinforge/`.

Parcours à faire soi-même :

1. Départ propre : aucun point rouge nulle part.
2. Finir une salle ⇒ un coffre tombe ⇒ **point rouge chiffré sur l'onglet
   Coffres** et **point sur la vignette de butin** de l'écran Coffres.
3. Ouvrir le coffre ⇒ les deux points s'éteignent **sans changer d'écran**.
4. Si le tirage donne une pièce dominante ⇒ **point sur l'onglet Forge**, sur le
   filtre de son emplacement, sur sa vignette, et sur la ligne d'emplacement de
   la pile.
5. Équiper la pièce ⇒ les quatre points s'éteignent d'un coup ; le portrait et le
   radar changent.
6. La pile : les cinq lignes se lisent Châssis, Lame, Noyau, Disque, Pointe, et
   chaque ligne est à la hauteur de sa pièce sur le portrait.
7. Taper la ligne Châssis ⇒ l'onglet Toupies s'ouvre.
8. Basculer FR/EN : aucune chaîne ne reste en français.
9. Passer en combat : la barre d'onglets flottante montre toujours ses points, et
   le rouge d'alerte ne se confond pas avec les pointes de l'arène.

**Garde-fous d'équilibrage** : ce lot ne touche à aucun chiffre. `npm run
calibrate` doit rendre exactement les mêmes valeurs qu'avant — chapitre 1 à
23 runs / 1,91 h, premier coffre d'Arène 0,78 h après validation, salle 10 la plus
meurtrière. Toute dérive signalerait qu'on a modifié la simulation par accident.

---

## 6 · Critères d'acceptation

1. La Forge montre cinq lignes empilées dans l'ordre du portrait ; la ligne
   Châssis mène à l'onglet Toupies.
2. Un point rouge apparaît **exactement** aux endroits de la table §2.4, et nulle
   part ailleurs — en particulier sur aucun bouton d'achat.
3. Un point rouge s'éteint dès que son action est faite, sans changement d'écran
   ni rechargement.
4. `dominatesEquipped` ne dit jamais vrai quand l'échange ferait reculer une stat
   (prouvé par mutation, §4).
5. `git diff` ne touche ni `sim/save.ts`, ni `SAVE_SCHEMA`, ni `sim/types.ts`, ni
   `src/content/balance.json`.
6. `npm run test` et `npm run build` passent ; `npm run calibrate` rend les
   valeurs d'avant.
7. Aucune chaîne visible en dur : `i18n.test.ts` et `catalog.test.ts` passent.
