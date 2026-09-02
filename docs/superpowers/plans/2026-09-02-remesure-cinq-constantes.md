# Remesure des cinq constantes après `fc827ee` — plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reposer `combat.damageK`, `bot.scaling.spinPerChapter`, `bot.scaling.attackPerChapter`,
`econ.rewardBase` et `econ.rewardPerChapter` sur des paliers démontrés sous la physique de
collision livrée par `fc827ee`, avec un instrument dont la précision est mesurée d'abord.

**Architecture:** Quatre temps. Le temps 0 règle l'instrument sans toucher un seul chiffre
d'équilibrage. Le temps 1 balaie le combat, le temps 2 l'économie, jamais dans le même commit.
Le temps 3 revérifie le combat après que l'économie a bougé — le trou que le jalon 3 lot A a
laissé. Chaque balayage tourne sur six bancs parallèles hors du dépôt.

**Tech Stack:** TypeScript strict, Vite, Vitest, PixiJS, React. Harnais : `vite-node` pour
`scripts/calibrate.mjs`, Playwright pour `scripts/verrou.mjs`. Équilibrage en JSON statique
(`src/content/balance.json`), lu par la porte unique `src/sim/config.ts`.

**Spec:** `docs/superpowers/specs/2026-09-02-remesure-cinq-constantes-design.md`

## Global Constraints

- **Arbre de travail** : `/Users/nicolasrabault/Projects/B-Blades_versus-remesure`, branche
  `remesure-cinq-constantes`. Le checkout principal et les autres worktrees appartiennent à
  d'autres sessions — ne jamais y toucher.
- **JAMAIS `git add -A` ni `git add <répertoire>`.** Lister les fichiers un par un, et relire
  `git status --short` avant *et* après chaque commit.
- **Jamais une constante de combat et une constante d'économie dans le même commit.** Ce
  projet l'a payé trois fois.
- **`src/sim/` reste pur et déterministe** : aucun import de DOM, PixiJS, React, `src/i18n/`,
  `Date` ni `Math.random`. Aucune tâche de ce plan ne modifie `src/sim/`.
- **Tout l'équilibrage vit dans `src/content/balance.json`**, dont `src/sim/config.ts` est la
  porte unique. Aucune constante d'équilibrage en dur ailleurs.
- **Textes joueur en français ET en anglais** (`src/i18n/fr.ts` fait foi, `en.ts` est
  `Record<MessageKey, string>`). Aucune tâche de ce plan n'ajoute de texte joueur.
- **Pas de code mort, pas de code « au cas où ».**
- **Aucun nom officiel Beyblade** dans le code, les données ou l'UI.
- **`timeout` n'existe pas sur cette machine (macOS).** Ne pas l'utiliser.
- **Les bancs de mesure vivent dans le répertoire de brouillon de la session, jamais dans le
  dépôt.** Ce projet a déjà retiré « un script de capture temporaire commité par erreur ».
- **Serveur de dev sur un port inhabituel (5947)**, et **vérifier le contenu servi par `curl`
  sur un symbole propre à la branche** avant toute mesure en navigateur. 5173-5178, 5190, 5281
  et 41973 ont été vus occupés ; un port est une adresse, pas une identité, et `--strictPort`
  ne protège pas d'un serveur lié sur une autre adresse du même port.

## Les cinq garde-fous durs

Relevés à **chaque** point de **chaque** balayage. Aucun réglage n'en sacrifie un.

1. Dans **chaque** chapitre, la salle 10 reste la salle la plus meurtrière (décompte absolu).
2. La passivité reste « jamais » en 20 h simulées.
3. Le premier coffre reste immédiat (0,00 h).
4. Le verrou du châssis reste actif (les deux séries de contre-pioche identiques).
5. Les quatre chapitres se valident 40/40 graines.

## Les trois départages, dans cet ordre

Ils choisissent **à l'intérieur** d'un palier démontré, et ne peuvent jamais faire retenir un
point hors palier.

6. **L'écart entre châssis** — à palier égal, prendre le point qui le referme le plus. Il
   tranche à l'échelle du facteur (×3 contre ×10), jamais au centième : son étendue entre jeux
   de graines disjoints ne décroît pas quand on ajoute des graines (c'est un rapport de
   médianes de comptes entiers).
7. **La durée de la salle 10 du chapitre 1** — rester sous 60 s sans rendre le boss expédié.
   Référence actuelle : 37,6 s à quarante graines, pour une cible de cahier des charges ~45 s.
8. **La durée du chapitre 1** — indicative. Ne jamais sacrifier un garde-fou dur pour six
   minutes de chapitre.

## La règle de décision

**Un écart de coût marginal inférieur à ~0,04 h n'est pas une mesure.** Le plancher résiduel
est de ±0,02 h par marge, y compris à quatre-vingts graines. Aucune valeur ne sera retenue, et
aucune phrase ne sera écrite dans la documentation, sur la foi d'un écart de cet ordre.

## Définition d'un palier

Une suite de valeurs **consécutives** de la grille qui tiennent les cinq garde-fous durs. Un
point isolé qui les tient n'est **pas** un palier — c'est le piège qu'avait laissé
`econ.rewardBase = 86`, dont les deux voisines cassaient le garde-fou 1.

## Structure des fichiers

| Fichier | Responsabilité | Tâches qui y touchent |
|---|---|---|
| `scripts/calibrate.mjs` | harnais de mesure headless | 1 (format), 3 (graines) |
| `scripts/verrou.mjs` | harnais navigateur du verrou de châssis | 2 (budget) |
| `src/content/balance.json` | **toutes** les constantes d'équilibrage | 4, 5, 6, 7, 8 (une ou deux clés par commit) |
| `docs/superpowers/plans/2026-09-02-calibration-remesure.md` | journal des balayages bruts | 4, 5, 6, 7, 8 (une section par balayage) |
| `docs/roadmap.md` | jalons + dettes | 3 (ligne de base), 9 |
| `docs/game-design.md` | spec de référence, courbes | 9 |
| `docs/ameliorations.md` | ressenti joueur, par session | 9 |

Les bancs de mesure (six copies de l'arbre + `node_modules` en symlink) et le pilote de
balayage `mesure.mjs` vivent **hors du dépôt**, dans le répertoire de brouillon de la session.

---

## Task 0 : monter les bancs de mesure (hors dépôt)

Aucun fichier du dépôt n'est touché. À refaire si la session change de répertoire de brouillon.

**Files:**
- Create (hors dépôt) : `$SCRATCH/mesure.mjs`, `$SCRATCH/bancs/b1..b6/`

**Interfaces:**
- Produces : `node $SCRATCH/mesure.mjs <banc> <chemin.json=valeur> [...]` → une ligne JSON sur
  stdout : `{etiquette, ch:[{n,graines,h,marg,desc,mort,gf,s10,let10}×4], ecart:{pire,best,x},
  chassis:[…], passif, verrou, coffre}`. Toutes les tâches de balayage (4 à 8) l'utilisent.

- [ ] **Step 1: Poser la variable de répertoire**

```bash
SCRATCH=/private/tmp/claude-501/-Users-nicolasrabault-Projects-B-Blades-versus/9b36aec2-1c35-4b34-ba87-44a4ca16dfb8/scratchpad
SRC=/Users/nicolasrabault/Projects/B-Blades_versus-remesure
mkdir -p "$SCRATCH/bancs"
```

- [ ] **Step 2: Monter six bancs**

Chaque banc est une copie de l'arbre avec son propre `balance.json` ; `node_modules` est un
symlink vers celui de l'arbre de travail, sans quoi ni `vite-node` ni `playwright` ne se
résolvent depuis un chemin hors dépôt.

```bash
for i in 1 2 3 4 5 6; do
  B="$SCRATCH/bancs/b$i"
  rm -rf "$B"; mkdir -p "$B"
  cp -R "$SRC/src" "$SRC/scripts" "$B/"
  cp "$SRC/package.json" "$SRC/tsconfig.json" "$SRC/vite.config.ts" "$SRC/index.html" "$B/"
  ln -s "$SRC/node_modules" "$B/node_modules"
done
ln -sfn "$SRC/node_modules" "$SCRATCH/node_modules"
```

- [ ] **Step 3: Écrire le pilote de balayage**

```bash
cat > "$SCRATCH/mesure.mjs" <<'EOF'
// Pilote de balayage — vit dans le scratchpad, jamais dans le dépôt.
// Usage : node mesure.mjs <banc> <chemin.json=valeur> [...]
import { readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
const [banc, ...paires] = process.argv.slice(2);
const REF = '/Users/nicolasrabault/Projects/B-Blades_versus-remesure/src/content/balance.json';
const bal = JSON.parse(readFileSync(REF, 'utf8'));
const etiquettes = [];
for (const p of paires) {
  const [chemin, valeur] = p.split('=');
  const parts = chemin.split('.');
  let o = bal;
  for (const k of parts.slice(0, -1)) o = o[k];
  o[parts.at(-1)] = Number(valeur);
  etiquettes.push(`${parts.at(-1)}=${valeur}`);
}
writeFileSync(`${banc}/src/content/balance.json`, JSON.stringify(bal, null, 2));
const out = execSync('npx vite-node scripts/calibrate.mjs', { cwd: banc, encoding: 'utf8', maxBuffer: 1 << 26 });

const bloc = (n) => (out.split(`--- Chapitre ${n} :`)[1] ?? '').split('--- Chapitre')[0].split('Garde-fou passivité')[0];
const ch = [];
for (let n = 1; n <= 4; n++) {
  const entete = out.split(`--- Chapitre ${n} :`)[1]?.split('\n')[0] ?? '';
  const b = bloc(n);
  ch.push({
    n,
    graines: Number(entete.match(/validé par (\d+)\//)?.[1] ?? 0),
    h: entete.match(/([\d.]+) h cumulées/)?.[1] ?? null,
    marg: entete.match(/\(([+-]?[\d.]+) h\)/)?.[1] ?? null,
    desc: entete.match(/([\d.]+) descentes/)?.[1] ?? null,
    mort: entete.match(/meurtrière \[(\d+),(\d+)\]/)?.slice(1, 3).join(':') ?? null,
    gf: b.match(/salle 10 la plus meurtrière : (\S+)/)?.[1] ?? '?',
    s10: b.match(/salle 10 : ([\d.]+) s/)?.[1] ?? null,
    let10: b.match(/salle 10 :.*?(\d+) % létalité/)?.[1] ?? null,
  });
}
const e = out.match(/Écart meilleur\/pire \(runs\) : (\d+)\/(\d+) = ×([\d.]+)/);
console.log(JSON.stringify({
  etiquette: etiquettes.join(' '),
  ch,
  ecart: e ? { pire: +e[1], best: +e[2], x: +e[3] } : null,
  chassis: [...out.matchAll(/^(.+?)\s+\((\w+)\s*\) : ([\d.]+) runs · ([\d.]+) h · salle la plus meurtrière \[(\d+),(\d+)\]/gm)]
    .map((m) => `${m[1].trim()}=${m[3]}r/${m[4]}h/s${m[5]}(${m[6]})`),
  passif: /Garde-fou passivité\s+: jamais/.test(out) ? 'jamais' : (out.match(/Garde-fou passivité\s+: (\S+)/)?.[1] ?? '?'),
  verrou: out.includes('Verrou actif') ? 'actif' : 'ROMPU',
  coffre: out.match(/Premier coffre ouvert\s+: médiane ([\d.]+) h/)?.[1] ?? '?',
}));
EOF
node --check "$SCRATCH/mesure.mjs"
```

Attention au `marg` : la regex accepte un signe **optionnel** (`[+-]?`), parce que la tâche 1
retire le `+` codé en dur du harnais. Une regex qui exigerait `[+-]` cesserait de trouver la
marge dès la tâche 1 et rendrait tous les balayages muets sur cette colonne.

- [ ] **Step 4: Vérifier qu'un banc reproduit la ligne de base au chiffre près**

```bash
node "$SCRATCH/mesure.mjs" "$SCRATCH/bancs/b1" "combat.damageK=1.3"
```

Attendu : `"n":1` avec `"h":"0.42"`, `"desc":"20.00"`, et `"ecart":{"pire":108,"best":10,"x":10.8}`.
Si un seul de ces chiffres diffère, **le banc n'est pas fidèle** : arrêter, ne balayer rien, et
trouver pourquoi. Un banc infidèle rend toute la passe fausse en silence.

Pas de commit : rien du dépôt n'a bougé. `git status --short` doit être vide.

---

## Task 1 : le `+` codé en dur du harnais de calibration

Dette du jalon 3, lot A : « `scripts/calibrate.mjs` imprime `+-0.21 h` quand un coût marginal
est négatif ». Ça va mordre : une marge négative apparaît dès qu'un chapitre est validé par
moins de graines que son précédent, et les balayages à venir en produiront.

**Files:**
- Modify: `scripts/calibrate.mjs:202` (ajout d'un helper) et `scripts/calibrate.mjs:235`
  (le format)

**Interfaces:**
- Consumes : rien.
- Produces : `fmtMarg(x)` dans `scripts/calibrate.mjs` — `null` → `'jamais'`, sinon la valeur
  à deux décimales préfixée de `+` si elle est positive ou nulle, de rien si elle est négative
  (le `-` de `toFixed` suffit).

- [ ] **Step 1: Constater le défaut**

Lire la ligne 235 de `scripts/calibrate.mjs`. Le `+` est dans la chaîne de format :

```js
console.log('\n--- Chapitre %d : validé par %d/%d graines · %s h cumulées (+%s h) · %s descentes · salle la plus meurtrière %j',
```

`marginal` peut être négatif (`hoursOf` est une médiane qui écarte les graines n'ayant pas
validé, donc un chapitre validé par peu de graines peut afficher une médiane plus basse que
son prédécesseur). Le format produit alors `(+-0.21 h)`.

- [ ] **Step 2: Vérifier la logique du helper AVANT de l'installer**

Le harnais n'est dans aucune suite de tests et n'est pas importable (exécution au chargement),
donc la vérification se fait sur la logique elle-même, isolée :

```bash
node -e "
const fmtMarg = (x) => (x === null ? 'jamais' : (x < 0 ? '' : '+') + x.toFixed(2));
console.log(fmtMarg(-0.21), '|', fmtMarg(0.15), '|', fmtMarg(0), '|', fmtMarg(null));
"
```

Attendu, exactement : `-0.21 | +0.15 | +0.00 | jamais`

- [ ] **Step 3: Installer le helper**

Après la ligne 202 (`const fmt = …`), ajouter :

```js
/** Comme `fmt`, mais porte son propre signe : le `+` était codé en dur dans la
 *  chaîne de format, ce qui imprimait `+-0.21 h` sur une marge négative. Une
 *  marge l'est dès qu'un chapitre est validé par moins de graines que son
 *  prédécesseur — `hoursOf` écarte les graines qui n'ont pas validé. */
const fmtMarg = (x) => (x === null ? 'jamais' : (x < 0 ? '' : '+') + x.toFixed(2));
```

- [ ] **Step 4: Retirer le `+` du format et appeler le helper**

Ligne 235, remplacer `(+%s h)` par `(%s h)`, et dans la liste d'arguments remplacer
`fmt(marginal)` par `fmtMarg(marginal)`. Ne rien changer d'autre sur cette ligne.

- [ ] **Step 5: Vérifier que la sortie est inchangée sur les marges positives**

```bash
cd /Users/nicolasrabault/Projects/B-Blades_versus-remesure && npm run calibrate 2>&1 | grep 'Chapitre'
```

Attendu : les quatre lignes de chapitre identiques à la ligne de base, marges affichées
`(+0.42 h)`, `(+0.12 h)`, `(+0.15 h)`, `(+0.08 h)`. **Aucun chiffre ne doit avoir bougé** :
cette tâche ne touche qu'un affichage.

- [ ] **Step 6: Commit**

```bash
cd /Users/nicolasrabault/Projects/B-Blades_versus-remesure
git status --short
git add scripts/calibrate.mjs
git status --short
git commit -m "fix(calibration): une marge négative s'imprimait \`+-0.21 h\`

Le \`+\` du coût marginal était codé en dur dans la chaîne de format. Une
marge est négative dès qu'un chapitre est validé par moins de graines que
son prédécesseur : \`hoursOf\` est une médiane qui écarte les graines n'ayant
pas validé, donc un chapitre atteint par les seules graines rapides affiche
une médiane plus basse que son précédent.

Dette du jalon 3, lot A. Elle allait mordre : les balayages de la remesure
des cinq constantes produisent des marges négatives.

Affichage seul — les quatre chapitres ressortent au chiffre près.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
git status --short
```

---

## Task 2 : le budget de `npm run verrou`

`npm run verrou` a **échoué une fois** le 2026-09-02 sur trois vérifications de sa passe 1 :
« bloquée en salle 10 après 91 s réelles, 205 s simulées », soit 2,25× le temps réel là où le
commentaire du script documente ~11×.

**Ce défaut ne se reproduit pas à la demande, et c'est le point.** Sept exécutions consécutives
passent au même budget de 90 s ; trois hypothèses ont été testées et écartées — cache Vite
présent, cache Vite supprimé, douze processus de calibration en parallèle. La cause de l'échec
unique n'est pas isolée, et l'attribuer à `fc827ee` serait une supposition, pas une mesure.

Ce que la mesure établit : **le harnais est flottant à 90 s, pas cassé.** Pour un harnais qui
vit hors de `npm run test` et que rien ne surveille, une marge qui flotte est une panne
silencieuse en attente. 300 s la rétablit sans rien coûter.

**Files:**
- Modify: `scripts/verrou.mjs:60`

**Interfaces:**
- Consumes : rien.
- Produces : `BUDGET_MS` surchargeable par l'environnement, défaut relevé à 300 000.

- [ ] **Step 1: Reproduire le rouge**

Lancer le serveur de dev sur un port inhabituel, **et vérifier ce qu'il sert** :

```bash
cd /Users/nicolasrabault/Projects/B-Blades_versus-remesure
npx vite --port 5947 --strictPort &
# attendre que le serveur réponde
until curl -s -o /dev/null -w '%{http_code}' http://localhost:5947/spinforge/ | grep -q 200; do sleep 1; done
curl -s http://localhost:5947/spinforge/src/content/balance.json | grep -o '"damageK": [0-9.]*'
```

Attendu : `"damageK": 1.3` — c'est la preuve que le port sert **cet** arbre et pas celui d'une
autre session.

```bash
PORT=5947 npm run verrou
```

Attendu : `3 vérification(s) en échec.`, dont
`✗ le boss vaincu a fermé la descente (bloquée en salle 10 …)`.

- [ ] **Step 2: Rendre le budget surchargeable et relever le défaut**

Ligne 60, remplacer :

```js
const BUDGET_MS = 90000;
```

par :

```js
/** Budget de temps réel d'une descente. Ce n'est pas une cadence : c'est le mur
 *  contre lequel une descente bloquée doit venir échouer bruyamment et vite.
 *
 *  Relevé de 90 s à 300 s le 2026-09-02, parce qu'à 90 s ce harnais était
 *  FLOTTANT et non faux. Une exécution a échoué (« bloquée en salle 10 après
 *  91 s réelles, 205 s simulées », soit 2,25× le temps réel), puis sept
 *  exécutions consécutives ont réussi au même budget — cache Vite chaud, cache
 *  supprimé, et jusqu'à douze processus de calibration en parallèle. La cause
 *  de l'échec unique n'a pas été isolée : elle n'est ni le cache ni la charge,
 *  les deux ayant été testés et écartés. Ce que la mesure dit, et rien de plus :
 *  la marge à 90 s est trop mince pour un harnais qui vit hors de `npm run test`
 *  et qu'aucune suite ne surveille. 300 s la rétablit sans rien coûter — une
 *  descente vraiment bloquée échoue de toute façon, seulement plus tard. */
const BUDGET_MS = Number(process.env.BUDGET_MS ?? 300000);
```

- [ ] **Step 3: Vérifier le vert**

```bash
cd /Users/nicolasrabault/Projects/B-Blades_versus-remesure && PORT=5947 npm run verrou
```

Attendu : les dix `✓` et `Verrou vérifié de bout en bout.`

- [ ] **Step 4: Sonder l'ancien budget — et ne PAS exiger qu'il rougisse**

```bash
cd /Users/nicolasrabault/Projects/B-Blades_versus-remesure && PORT=5947 BUDGET_MS=90000 npm run verrou
```

**Il n'y a pas d'attendu ici, et c'est délibéré.** Ce pas demandait d'abord de reproduire le
rouge, comme vérification par mutation. La mutation a échoué : à 90 s le harnais passe, sept
fois d'affilée, cache chaud, cache supprimé et machine chargée. Un défaut qui ne se reproduit
pas ne se prouve pas par mutation — exiger le rouge ici pousserait l'exécutant à truquer la
condition jusqu'à l'obtenir.

Ce qu'il faut faire à la place : **noter ce qu'on observe**, et le consigner. Si le harnais
passe à 90 s, c'est la confirmation qu'il est flottant et non cassé — ce qui justifie le
relèvement tout autant, pour un harnais que rien ne surveille.

- [ ] **Step 5: Commit**

```bash
cd /Users/nicolasrabault/Projects/B-Blades_versus-remesure
git status --short
git add scripts/verrou.mjs
git status --short
git commit -m "fix(verrou): le budget de 90 s était trop mince, et c'est tout ce qu'on peut dire

\`npm run verrou\` a échoué une fois ce matin sur trois vérifications de sa
passe 1 : « bloquée en salle 10 après 91 s réelles, 205 s simulées », soit
2,25× le temps réel là où le commentaire du script documente ~11×.

J'avais attribué cet échec à \`fc827ee\`, qui porte la létalité de la salle 10
du chapitre 1 de 70 % à 88 % par tentative. **C'est faux, ou en tout cas non
démontré, et je le retire.** Sept exécutions consécutives passent depuis au
même budget de 90 s. Trois hypothèses ont été testées et écartées une à une :

  A · cache Vite sur disque présent, serveur frais  → vert
  B · cache Vite supprimé, serveur frais            → vert
  C · douze processus de calibration en parallèle   → vert
  + les quatre exécutions d'un agent indépendant    → vertes

La cause de l'échec unique n'est donc pas isolée. Ce que la mesure établit :
ce harnais est FLOTTANT à 90 s, pas cassé. Pour un harnais qui vit hors de
\`npm run test\` et que rien ne surveille, une marge qui flotte est une panne
silencieuse en attente.

300 s rétablit la marge sans rien coûter : une descente vraiment bloquée
échoue de toute façon, seulement plus tard. Le budget devient au passage
surchargeable par l'environnement, comme le port l'était déjà.

Le mérite de la correction revient à l'agent d'implémentation, qui n'a pas
réussi à reproduire le rouge et l'a signalé au lieu de recopier la
justification qu'on lui avait donnée.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
git status --short
```

---

## Task 3 : le jeu de graines passe à quarante

Le précédent exact est la décision R9 de la passe d'intégration, qui avait élargi cinq → dix
« dans son propre commit, valeurs d'équilibrage inchangées ». Ce commit **déplace tous les
chiffres publiés du projet sans changer une seule constante** : c'est la correction d'un biais
d'échantillonnage, et la nouvelle ligne de base est publiée avec lui.

Justification, mesurée le 2026-09-02 (spec § 3) : à dix graines le coût marginal du chapitre 3
va de +0,04 à +0,20 h entre jeux disjoints, sans qu'aucune constante ait bougé ; à quarante
l'étendue tombe à 0,02 h ; à quatre-vingts elle ne bouge plus. Quarante est le palier.

**Files:**
- Modify: `scripts/calibrate.mjs:21`
- Modify: `docs/roadmap.md` (la ligne de base du lot B, § « Mise à jour (intégration de
  `main`, 2026-09-02) »)

**Interfaces:**
- Consumes : `fmtMarg` (tâche 1).
- Produces : la ligne de base à quarante graines, référence de tous les balayages des
  tâches 4 à 8.

- [ ] **Step 1: Vérifier que le nouveau jeu est un sur-ensemble de l'ancien, sans doublon**

Le nouveau jeu **contient** les dix graines actuelles, pour que toute mesure passée reste un
sous-ensemble de la nouvelle. Les trente ajoutées suivent une règle déterministe énoncée dans
le code.

```bash
node -e "
const anciennes = [1, 7, 42, 1337, 90210, 2, 13, 271, 4242, 65535];
const ajout = Array.from({length: 30}, (_, k) => (k + 1) * 7919 + 13);
const toutes = [...anciennes, ...ajout];
console.log('collisions :', ajout.filter(s => anciennes.includes(s)).length);
console.log('doublons  :', toutes.length - new Set(toutes).size);
console.log('total     :', toutes.length);
"
```

Attendu, exactement : `collisions : 0`, `doublons  : 0`, `total     : 40`.

- [ ] **Step 2: Relever la ligne de base AVANT, pour pouvoir la comparer**

```bash
cd /Users/nicolasrabault/Projects/B-Blades_versus-remesure && npm run calibrate 2>&1 | tee /tmp/avant-40.txt | grep -E 'Chapitre|Écart|passivité|coffre|Verrou'
```

- [ ] **Step 3: Poser le nouveau jeu**

Ligne 21 de `scripts/calibrate.mjs`, remplacer :

```js
const SEEDS = [1, 7, 42, 1337, 90210, 2, 13, 271, 4242, 65535];
```

par :

```js
// Quarante graines, et non dix. Mesuré le 2026-09-02 : à dix, le coût marginal
// d'un chapitre varie de +0,04 à +0,20 h entre jeux de graines DISJOINTS, sans
// qu'aucune constante d'équilibrage ait bougé — la colonne était du bruit, et
// deux conclusions du dépôt reposaient dessus. À quarante l'étendue tombe à
// 0,02 h ; à quatre-vingts elle ne bouge plus. Quarante est le palier, et le
// plancher résiduel de ±0,02 h fixe la règle : un écart de marge sous ~0,04 h
// n'est pas une mesure.
//
// Les dix premières sont l'ancien jeu, conservé tel quel pour que toute mesure
// publiée avant cette date reste un sous-ensemble de celle-ci. Les trente
// suivantes valent `(k + 1) * 7919 + 13` pour k de 0 à 29 — 7919 est premier,
// ce qui écarte les graines les unes des autres sans motif dans les bits bas.
const SEEDS = [
  1, 7, 42, 1337, 90210, 2, 13, 271, 4242, 65535,
  7932, 15851, 23770, 31689, 39608, 47527, 55446, 63365, 71284, 79203,
  87122, 95041, 102960, 110879, 118798, 126717, 134636, 142555, 150474, 158393,
  166312, 174231, 182150, 190069, 197988, 205907, 213826, 221745, 229664, 237583,
];
```

- [ ] **Step 4: Vérifier que la liste écrite est bien celle que la règle produit**

Une liste recopiée à la main est une source d'erreur silencieuse : ce pas la recalcule et la
compare à ce que le fichier contient réellement.

```bash
cd /Users/nicolasrabault/Projects/B-Blades_versus-remesure && node -e "
const src = require('fs').readFileSync('scripts/calibrate.mjs', 'utf8');
const bloc = src.match(/const SEEDS = \[([^\]]*)\]/)[1];
const lues = bloc.split(',').map(s => s.trim()).filter(Boolean).map(Number);
const attendues = [1, 7, 42, 1337, 90210, 2, 13, 271, 4242, 65535,
  ...Array.from({length: 30}, (_, k) => (k + 1) * 7919 + 13)];
console.log('longueur :', lues.length, '/ 40');
console.log('identiques :', JSON.stringify(lues) === JSON.stringify(attendues));
"
```

Attendu : `longueur : 40 / 40` et `identiques : true`.

- [ ] **Step 5: Relever la nouvelle ligne de base**

```bash
cd /Users/nicolasrabault/Projects/B-Blades_versus-remesure && npm run calibrate 2>&1 | tee /tmp/apres-40.txt | grep -E 'Chapitre|Écart|passivité|coffre|Verrou'
```

Attendu, d'après la mesure du 2026-09-02 (spec § 3), aux tolérances près d'un jeu de graines
différent de ceux qui ont servi à établir le palier : chapitre 1 autour de 0,37 h, marges
autour de +0,10 h chacune, salle 10 la plus meurtrière **oui** dans les quatre chapitres,
passivité « jamais », premier coffre 0,00 h, verrou actif.

**Les cinq garde-fous durs doivent tous tenir.** Si l'un casse à ce pas, ce n'est pas un
réglage : c'est que le jeu de dix graines masquait une casse. Le consigner et s'arrêter pour
arbitrage — ne pas enchaîner sur les balayages.

- [ ] **Step 6: Publier la nouvelle ligne de base dans la roadmap**

Dans `docs/roadmap.md`, section « Lot B », sous-section « Mise à jour (intégration de `main`,
2026-09-02) » : remplacer le tableau des quatre chapitres par le relevé à quarante graines, et
ajouter au-dessus une phrase qui dit pourquoi les chiffres bougent sans qu'aucune constante
n'ait changé. Le tableau conserve exactement ses colonnes actuelles (`validé`, `coût cumulé`,
`coût marginal`, `descentes`, `plus meurtrière (absolu)`, `garde-fou 1`, `par tentative`), et
la mention « dix graines » devient « quarante graines » partout où elle apparaît dans cette
sous-section.

Y écrire aussi, en une phrase : les valeurs à dix graines n'étaient pas fausses, elles étaient
**imprécises**, et l'ordre des trois marges entre elles était du bruit.

- [ ] **Step 7: Commit**

```bash
cd /Users/nicolasrabault/Projects/B-Blades_versus-remesure
git status --short
git add scripts/calibrate.mjs docs/roadmap.md
git status --short
git commit -m "measure(calibration): quarante graines, parce que dix mesuraient du bruit

Aucune constante d'équilibrage ne change dans ce commit, et pourtant tous
les chiffres publiés du projet bougent. C'est la correction d'un biais
d'échantillonnage, pas un réglage.

Mesuré : à dix graines, le coût marginal du chapitre 3 va de +0,04 à
+0,20 h entre cinq jeux DISJOINTS, \`damageK\` figé et rien d'autre changé.
L'ordre des trois marges entre elles s'inverse d'un tirage à l'autre. La
ligne de base post-fc827ee de ce fichier — « ch.3 redevient plus cher que
ch.2 » — décrivait donc un tirage.

À quarante graines l'étendue tombe à 0,02 h ; à quatre-vingts elle ne
bouge plus. Quarante est le palier. Le plancher résiduel de ±0,02 h donne
la règle qui manquait : un écart de marge sous ~0,04 h n'est pas une
mesure.

Le nouveau jeu CONTIENT les dix anciennes, pour que toute mesure publiée
avant aujourd'hui reste un sous-ensemble de celle-ci.

Précédent : la décision R9 de la passe d'intégration, qui avait élargi
cinq à dix graines dans son propre commit, valeurs inchangées.

Ce qui NE peut PAS se déduire de ces mesures : que « le mur a atterri au
chapitre 4 » était faux. Cet écart-là est d'une tout autre amplitude, et
il a été relevé sous l'ancienne physique. Il n'a simplement jamais été
confronté à une estimation de bruit.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
git status --short
```

---

## Task 4 : balayage de `combat.damageK` (temps 1 — combat)

`econ.rewardBase` et `econ.rewardPerChapter` **gelés** à 104 et 1,15. `damageK` d'abord parce
qu'il porte le chapitre 1, donc l'écart entre châssis et la durée du boss.

**Files:**
- Modify: `src/content/balance.json` (**la seule clé `combat.damageK`**)
- Create: `docs/superpowers/plans/2026-09-02-calibration-remesure.md` (section « le combat —
  `combat.damageK` »)

**Interfaces:**
- Consumes : `mesure.mjs` et les six bancs (tâche 0), les quarante graines (tâche 3).
- Produces : la valeur retenue de `combat.damageK`, gelée pour les tâches 5 à 7 et remise en
  question par la tâche 8.

- [ ] **Step 1: Rafraîchir les bancs sur le harnais courant**

Les bancs portent une copie de `scripts/` : après les tâches 1 et 3, elle est périmée.

```bash
SCRATCH=/private/tmp/claude-501/-Users-nicolasrabault-Projects-B-Blades-versus/9b36aec2-1c35-4b34-ba87-44a4ca16dfb8/scratchpad
for i in 1 2 3 4 5 6; do
  cp /Users/nicolasrabault/Projects/B-Blades_versus-remesure/scripts/calibrate.mjs "$SCRATCH/bancs/b$i/scripts/calibrate.mjs"
done
grep -c '7932' "$SCRATCH/bancs/b1/scripts/calibrate.mjs"
```

Attendu : `1` — la preuve que le banc porte bien les quarante graines.

- [ ] **Step 2: Balayer la grille, six points à la fois**

Grille : `0,80 · 0,90 · 0,95 · 1,00 · 1,05 · 1,10 · 1,15 · 1,20 · 1,25 · 1,30 · 1,40 · 1,50 ·
1,60 · 1,70`. Quatorze points, trois vagues de six/six/deux.

```bash
SCRATCH=/private/tmp/claude-501/-Users-nicolasrabault-Projects-B-Blades-versus/9b36aec2-1c35-4b34-ba87-44a4ca16dfb8/scratchpad
cd "$SCRATCH"
vague() {
  local i=1
  for v in "$@"; do
    node mesure.mjs "$SCRATCH/bancs/b$i" "combat.damageK=$v" > "$SCRATCH/dk40-$v.json" 2>&1 &
    i=$((i+1))
  done
  wait
}
vague 0.80 0.90 0.95 1.00 1.05 1.10
vague 1.15 1.20 1.25 1.30 1.40 1.50
vague 1.60 1.70
for v in 0.80 0.90 0.95 1.00 1.05 1.10 1.15 1.20 1.25 1.30 1.40 1.50 1.60 1.70; do
  echo -n "damageK=$v : "
  node -e "
const d=JSON.parse(require('fs').readFileSync('$SCRATCH/dk40-$v.json','utf8').split('\n').filter(l=>l.startsWith('{'))[0]);
console.log('ch1', d.ch[0].h+'h/'+d.ch[0].desc+'d · s10', d.ch[0].s10+'s · écart ×'+d.ecart.x,
            '· GF1', d.ch.map(c=>c.gf).join(','), '· graines', d.ch.map(c=>c.graines).join(','),
            '· marges', d.ch.slice(1).map(c=>c.marg).join('/'),
            '· passif', d.passif, '· verrou', d.verrou, '· coffre', d.coffre);"
done
```

- [ ] **Step 3: Identifier les paliers, puis départager**

Dans cet ordre, sans jamais inverser :

1. Rayer tout point où l'un des **cinq garde-fous durs** casse (`GF1` autre que `oui,oui,oui,oui`,
   `graines` autre que `40,40,40,40`, `passif` autre que `jamais`, `verrou` autre que `actif`,
   `coffre` autre que `0.00`).
2. Repérer les suites de valeurs **consécutives** survivantes. Une valeur isolée n'est pas un
   palier.
3. Dans le palier le plus large, appliquer les départages 6, 7, 8 dans l'ordre : l'écart entre
   châssis d'abord (il tranche entre ×3 et ×10, jamais au centième), puis la durée de la
   salle 10 du chapitre 1 (sous 60 s, sans rendre le boss expédié), puis la durée du chapitre 1.
4. Si deux points restent à égalité sur les trois départages, **garder 1,3** : ne pas déplacer
   une constante sans motif mesuré.

- [ ] **Step 4: Écrire le journal du balayage**

Créer `docs/superpowers/plans/2026-09-02-calibration-remesure.md` avec, en tête, le mandat et
les garde-fous (repris de la spec), puis la section de ce balayage : la grille brute des
quatorze points en tableau, les paliers trouvés, le départage appliqué, la valeur retenue — et
**ce que le balayage a appris qui vaut plus que la valeur retenue**, sur le modèle de
`2026-09-01-calibration-chapitres.md`.

Y consigner en particulier le conflit de départages mesuré à la sonde : refermer l'écart entre
châssis tire `damageK` vers le bas, garder le boss près de 45 s le tire vers le haut. Écrire
comment il a été tranché, et par quelle mesure.

- [ ] **Step 5: Poser la valeur retenue**

Dans `src/content/balance.json`, changer **la seule clé** `combat.damageK`. Ne toucher à
aucune autre clé de ce fichier dans ce commit.

- [ ] **Step 6: Relever le rapport complet à la valeur retenue**

```bash
cd /Users/nicolasrabault/Projects/B-Blades_versus-remesure && npm run calibrate 2>&1 | tee /tmp/dk-retenu.txt | grep -E 'Chapitre|salle 10 la|Écart|passivité|coffre|Verrou'
```

Les cinq garde-fous durs doivent tenir. Coller ce rapport dans le journal du Step 4.

- [ ] **Step 7: Commit**

```bash
cd /Users/nicolasrabault/Projects/B-Blades_versus-remesure
git status --short
git add src/content/balance.json docs/superpowers/plans/2026-09-02-calibration-remesure.md
git status --short
git commit -m "balance(combat): damageK reposé sur un palier mesuré après fc827ee

<remplacer par : la valeur retenue, le palier démontré, le départage qui a
choisi dans ce palier, et ce que le balayage a appris. Quatorze points,
quarante graines. econ.rewardBase et econ.rewardPerChapter gelés — jamais
le combat et l'économie dans le même commit.>

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
git status --short
```

---

## Task 5 : balayage de `bot.scaling.spinPerChapter` × `attackPerChapter` (temps 1 — combat)

Sur le `damageK` retenu par la tâche 4. Économie toujours gelée. Ces deux facteurs portent
l'exposant `chapitre − 1` : ils ne touchent **pas** le chapitre 1, donc les séries châssis,
contre-pioche, passivité et premier coffre ne peuvent pas bouger — les relever quand même à
chaque point est le seul moyen de le prouver plutôt que de le supposer.

**Files:**
- Modify: `src/content/balance.json` (les seules clés `bot.scaling.spinPerChapter` et
  `bot.scaling.attackPerChapter`)
- Modify: `docs/superpowers/plans/2026-09-02-calibration-remesure.md` (nouvelle section)

**Interfaces:**
- Consumes : la valeur de `combat.damageK` retenue par la tâche 4.
- Produces : les deux valeurs retenues, gelées pour les tâches 6 et 7, remises en question par
  la tâche 8.

- [ ] **Step 1: Balayer**

Grille : `spinPerChapter ∈ {1,00 · 1,02 · 1,05 · 1,08 · 1,12 · 1,16 · 1,20}` × `attackPerChapter
∈ {1,05 · 1,10 · 1,15}`, soit vingt et un points, en quatre vagues de six.

```bash
SCRATCH=/private/tmp/claude-501/-Users-nicolasrabault-Projects-B-Blades-versus/9b36aec2-1c35-4b34-ba87-44a4ca16dfb8/scratchpad
cd "$SCRATCH"
i=1
for sp in 1.00 1.02 1.05 1.08 1.12 1.16 1.20; do
  for at in 1.05 1.10 1.15; do
    node mesure.mjs "$SCRATCH/bancs/b$i" "bot.scaling.spinPerChapter=$sp" "bot.scaling.attackPerChapter=$at" \
      > "$SCRATCH/sc40-$sp-$at.json" 2>&1 &
    i=$((i+1))
    if [ $i -gt 6 ]; then wait; i=1; fi
  done
done
wait
for sp in 1.00 1.02 1.05 1.08 1.12 1.16 1.20; do for at in 1.05 1.10 1.15; do
  echo -n "spin=$sp attack=$at : "
  node -e "
const d=JSON.parse(require('fs').readFileSync('$SCRATCH/sc40-$sp-$at.json','utf8').split('\n').filter(l=>l.startsWith('{'))[0]);
console.log('ch1', d.ch[0].h+'h/'+d.ch[0].desc+'d · GF1', d.ch.map(c=>c.gf).join(','),
            '· graines', d.ch.map(c=>c.graines).join(','), '· marges', d.ch.slice(1).map(c=>c.marg).join('/'),
            '· écart ×'+d.ecart.x, '· passif', d.passif, '· verrou', d.verrou);"
done; done
```

- [ ] **Step 2: Vérifier que le chapitre 1 n'a pas bougé d'un chiffre**

Ces deux facteurs ont l'exposant 0 au chapitre 1. **Si la colonne `ch1` varie d'un point à
l'autre du balayage, c'est un bug, pas un réglage** — s'arrêter et chercher pourquoi.

```bash
SCRATCH=/private/tmp/claude-501/-Users-nicolasrabault-Projects-B-Blades-versus/9b36aec2-1c35-4b34-ba87-44a4ca16dfb8/scratchpad
node -e "
const fs=require('fs');
const vus=new Set();
for (const f of fs.readdirSync('$SCRATCH').filter(f=>f.startsWith('sc40-'))) {
  const d=JSON.parse(fs.readFileSync('$SCRATCH/'+f,'utf8').split('\n').filter(l=>l.startsWith('{'))[0]);
  vus.add(JSON.stringify([d.ch[0].h, d.ch[0].desc, d.ch[0].s10, d.ecart.x, d.passif, d.coffre]));
}
console.log('valeurs distinctes du chapitre 1 sur tout le balayage :', vus.size, '(doit valoir 1)');
for (const v of vus) console.log('  ', v);
"
```

Attendu : `1`.

- [ ] **Step 3: Identifier les paliers et départager**

Même procédure qu'à la tâche 4, Step 3, **plus la règle de décision** : un écart de coût
marginal inférieur à ~0,04 h n'est pas une mesure. Ne pas choisir un point pour une différence
de marge de 0,02 h — à ce niveau, prendre celui qui referme le plus l'écart entre châssis, ou
à défaut la valeur en place.

Cible de forme, si et seulement si le palier en offre le choix **au-delà du seuil de 0,04 h** :
un coût marginal croissant du chapitre 2 au chapitre 4. Si aucun point du palier ne la produit
avec un écart mesurable, **écrire que la cible est hors de portée de ces deux boutons** et
retenir la valeur sur les seuls garde-fous et départages — c'est ce que le lot A avait démontré
pour le mur du chapitre 4, et un résultat négatif mesuré vaut mieux qu'une valeur choisie sur
du bruit.

- [ ] **Step 4: Poser les valeurs et relever le rapport complet**

Changer **les deux seules clés** `bot.scaling.spinPerChapter` et
`bot.scaling.attackPerChapter` dans `src/content/balance.json`, puis :

```bash
cd /Users/nicolasrabault/Projects/B-Blades_versus-remesure && npm run calibrate 2>&1 | tee /tmp/scaling-retenu.txt | grep -E 'Chapitre|salle 10 la|Écart|passivité|coffre|Verrou'
```

- [ ] **Step 5: Écrire la section du journal, puis commit**

Ajouter la section à `docs/superpowers/plans/2026-09-02-calibration-remesure.md` : grille brute
des vingt et un points, paliers, départage, valeurs retenues, et la preuve que le chapitre 1
est resté bit à bit identique sur tout le balayage.

```bash
cd /Users/nicolasrabault/Projects/B-Blades_versus-remesure
git status --short
git add src/content/balance.json docs/superpowers/plans/2026-09-02-calibration-remesure.md
git status --short
git commit -m "balance(combat): les deux facteurs de difficulté par chapitre, remesurés

<remplacer par : les valeurs retenues, le palier, le départage, et la preuve
que le chapitre 1 est resté identique sur les vingt et un points. Économie
gelée — jamais le combat et l'économie dans le même commit.>

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
git status --short
```

---

## Task 6 : balayage de `econ.rewardBase` (temps 2 — économie)

**`combat.damageK` et les deux `bot.scaling.*` sont gelés** aux valeurs des tâches 4 et 5.
`rewardBase` d'abord : comme `damageK`, il porte le chapitre 1.

Sonde déjà tournée à dix graines : 80 → écart châssis ×17,30, garde-fous tenus ; 104 → ×10,80,
tenus ; 140 → ×3,90, mais **le garde-fou 1 casse au chapitre 4**. Le mécanisme est celui du
lot A : enrichir le joueur équipe tout le monde et le châssis faible rattrape, mais la richesse
achète de la vitesse et la vitesse tue dans un jeu à éjection. Le palier se cherche entre les
deux.

**Files:**
- Modify: `src/content/balance.json` (**la seule clé `econ.rewardBase`**)
- Modify: `docs/superpowers/plans/2026-09-02-calibration-remesure.md` (nouvelle section)

**Interfaces:**
- Consumes : les trois constantes de combat retenues (tâches 4 et 5).
- Produces : `econ.rewardBase` retenue, gelée pour la tâche 7.

- [ ] **Step 1: Balayer**

Grille : `90 · 96 · 100 · 104 · 108 · 112 · 116 · 120 · 126 · 132 · 140 · 150`. Douze points,
deux vagues de six.

```bash
SCRATCH=/private/tmp/claude-501/-Users-nicolasrabault-Projects-B-Blades-versus/9b36aec2-1c35-4b34-ba87-44a4ca16dfb8/scratchpad
cd "$SCRATCH"
vague() {
  local i=1
  for v in "$@"; do
    node mesure.mjs "$SCRATCH/bancs/b$i" "econ.rewardBase=$v" > "$SCRATCH/rb40-$v.json" 2>&1 &
    i=$((i+1))
  done
  wait
}
vague 90 96 100 104 108 112
vague 116 120 126 132 140 150
for v in 90 96 100 104 108 112 116 120 126 132 140 150; do
  echo -n "rewardBase=$v : "
  node -e "
const d=JSON.parse(require('fs').readFileSync('$SCRATCH/rb40-$v.json','utf8').split('\n').filter(l=>l.startsWith('{'))[0]);
console.log('ch1', d.ch[0].h+'h/'+d.ch[0].desc+'d · s10', d.ch[0].s10+'s · écart ×'+d.ecart.x,
            '· GF1', d.ch.map(c=>c.gf).join(','), '· graines', d.ch.map(c=>c.graines).join(','),
            '· marges', d.ch.slice(1).map(c=>c.marg).join('/'), '· coffre', d.coffre, '· passif', d.passif);"
done
```

- [ ] **Step 2: Identifier les paliers et départager**

Même procédure qu'à la tâche 4, Step 3. Surveiller en particulier le **premier coffre** : c'est
`rewardBase` qui décide de la vitesse à laquelle le joueur peut en acheter un, et le garde-fou
« le premier coffre reste immédiat » est le seul que ce bouton-ci peut casser sans toucher au
combat.

- [ ] **Step 3: Poser la valeur et relever le rapport complet**

Changer **la seule clé** `econ.rewardBase`, puis :

```bash
cd /Users/nicolasrabault/Projects/B-Blades_versus-remesure && npm run calibrate 2>&1 | tee /tmp/rb-retenu.txt | grep -E 'Chapitre|salle 10 la|Écart|passivité|coffre|Verrou'
```

- [ ] **Step 4: Écrire la section du journal, puis commit**

```bash
cd /Users/nicolasrabault/Projects/B-Blades_versus-remesure
git status --short
git add src/content/balance.json docs/superpowers/plans/2026-09-02-calibration-remesure.md
git status --short
git commit -m "balance(économie): rewardBase reposé sur un palier mesuré après fc827ee

<remplacer par : la valeur retenue, le palier, le départage, et ce que le
balayage a appris — en particulier sur l'écart entre châssis, que ce bouton
referme en enrichissant le joueur. Douze points, quarante graines. Les trois
constantes de combat sont gelées : ce commit ne touche qu'une clé.>

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
git status --short
```

---

## Task 7 : balayage de `econ.rewardPerChapter` (temps 2 — économie)

Sur la `rewardBase` retenue. Combat toujours gelé. Ce facteur porte l'exposant `chapitre − 1`
comme les deux `bot.scaling.*` : il ne touche pas le chapitre 1.

**Contrainte de signe, non négociable et déjà tranchée par le lot A** : le domaine retenu est
`> 1,0`, en dépit de la mesure. Un facteur `< 1` fait payer *moins* une salle d'un chapitre
*plus dur*, or le farm hors-ligne est verrouillé sur le meilleur chapitre validé — progresser
ferait donc baisser le revenu hors-ligne. **Ne pas rouvrir cette décision** ; les points sous
1,0 se balaient comme diagnostics, jamais comme candidats.

**Files:**
- Modify: `src/content/balance.json` (**la seule clé `econ.rewardPerChapter`**)
- Modify: `docs/superpowers/plans/2026-09-02-calibration-remesure.md` (nouvelle section)

**Interfaces:**
- Consumes : les quatre constantes déjà retenues (tâches 4, 5, 6).
- Produces : `econ.rewardPerChapter` retenue — la cinquième et dernière.

- [ ] **Step 1: Balayer**

Grille de candidats : `1,02 · 1,05 · 1,08 · 1,10 · 1,13 · 1,15 · 1,18 · 1,20 · 1,25 · 1,30`.
Plus deux **diagnostics** hors domaine, qui ne peuvent pas être retenus : `0,90` et `1,00`
(à `1,00`, `Math.pow(1, n) = 1` rend le revenu identique dans les quatre chapitres — c'est le
plancher qui isole l'effet du facteur).

```bash
SCRATCH=/private/tmp/claude-501/-Users-nicolasrabault-Projects-B-Blades-versus/9b36aec2-1c35-4b34-ba87-44a4ca16dfb8/scratchpad
cd "$SCRATCH"
vague() {
  local i=1
  for v in "$@"; do
    node mesure.mjs "$SCRATCH/bancs/b$i" "econ.rewardPerChapter=$v" > "$SCRATCH/rpc40-$v.json" 2>&1 &
    i=$((i+1))
  done
  wait
}
vague 0.90 1.00 1.02 1.05 1.08 1.10
vague 1.13 1.15 1.18 1.20 1.25 1.30
for v in 0.90 1.00 1.02 1.05 1.08 1.10 1.13 1.15 1.18 1.20 1.25 1.30; do
  echo -n "rewardPerChapter=$v : "
  node -e "
const d=JSON.parse(require('fs').readFileSync('$SCRATCH/rpc40-$v.json','utf8').split('\n').filter(l=>l.startsWith('{'))[0]);
console.log('ch1', d.ch[0].h+'h/'+d.ch[0].desc+'d · GF1', d.ch.map(c=>c.gf).join(','),
            '· graines', d.ch.map(c=>c.graines).join(','), '· marges', d.ch.slice(1).map(c=>c.marg).join('/'),
            '· écart ×'+d.ecart.x, '· passif', d.passif, '· verrou', d.verrou);"
done
```

- [ ] **Step 2: Vérifier que le chapitre 1 n'a pas bougé, et que les diagnostics sont écartés**

Comme à la tâche 5, Step 2 : le chapitre 1 porte l'exposant 0, ses colonnes doivent être
identiques sur les douze points. Et les deux points sous ou égaux à 1,0 sont **rayés d'office
de la liste des candidats**, quelle que soit leur performance — c'est la contrainte de signe.

```bash
SCRATCH=/private/tmp/claude-501/-Users-nicolasrabault-Projects-B-Blades-versus/9b36aec2-1c35-4b34-ba87-44a4ca16dfb8/scratchpad
node -e "
const fs=require('fs');
const vus=new Set();
for (const f of fs.readdirSync('$SCRATCH').filter(f=>f.startsWith('rpc40-'))) {
  const d=JSON.parse(fs.readFileSync('$SCRATCH/'+f,'utf8').split('\n').filter(l=>l.startsWith('{'))[0]);
  vus.add(JSON.stringify([d.ch[0].h, d.ch[0].desc, d.ch[0].s10, d.ecart.x]));
}
console.log('valeurs distinctes du chapitre 1 :', vus.size, '(doit valoir 1)');
"
```

- [ ] **Step 3: Identifier le palier parmi les candidats, départager, poser la valeur**

Palier cherché **uniquement au-dessus de 1,0**. Puis changer **la seule clé**
`econ.rewardPerChapter` et relever :

```bash
cd /Users/nicolasrabault/Projects/B-Blades_versus-remesure && npm run calibrate 2>&1 | tee /tmp/rpc-retenu.txt | grep -E 'Chapitre|salle 10 la|Écart|passivité|coffre|Verrou'
```

- [ ] **Step 4: Écrire la section du journal, puis commit**

Le journal doit dire ce que les deux diagnostics ont montré, et pourquoi ils ne sont pas
candidats — un résultat écarté par une décision de design mérite d'être écrit, sans quoi la
prochaine passe le redécouvrira.

```bash
cd /Users/nicolasrabault/Projects/B-Blades_versus-remesure
git status --short
git add src/content/balance.json docs/superpowers/plans/2026-09-02-calibration-remesure.md
git status --short
git commit -m "balance(économie): rewardPerChapter reposé, le signe reste non négociable

<remplacer par : la valeur retenue, le palier au-dessus de 1,0, le départage,
et ce que les deux diagnostics hors domaine ont montré. La contrainte de
signe du lot A n'est pas rouverte : un facteur < 1 ferait baisser le revenu
hors-ligne quand le joueur progresse. Combat gelé.>

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
git status --short
```

---

## Task 8 : la re-vérification du combat après l'économie (temps 3)

C'est le trou exact laissé par le jalon 3, lot A, et documenté par lui-même :
`spinPerChapter = 1,02` avait été choisi avec `rewardPerChapter` gelé à 1,25, et la passe
d'économie l'a ensuite porté à 1,15, ce qui a aplati la marche que 1,02 achetait — « la
justification de 1,02 vaut pour le balayage du combat, pas pour le jeu livré ».

Les tâches 6 et 7 viennent de déplacer l'économie sous les valeurs de combat des tâches 4 et 5.
Cette tâche remesure si elles y sont encore chez elles.

**Files:**
- Modify (**seulement si le palier a bougé**) : `src/content/balance.json` (clés de combat)
- Modify: `docs/superpowers/plans/2026-09-02-calibration-remesure.md` (section finale)

**Interfaces:**
- Consumes : les cinq constantes retenues.
- Produces : soit la confirmation écrite, soit un quatrième commit de combat.

- [ ] **Step 1: Rebalayer `damageK` autour de sa valeur retenue, sous la nouvelle économie**

Cinq points : la valeur retenue et ses deux voisines de part et d'autre sur la grille de la
tâche 4. `mesure.mjs` lit `balance.json` de l'arbre de travail, qui porte maintenant les cinq
valeurs : les points balayés sont donc bien « sous la nouvelle économie ».

```bash
SCRATCH=/private/tmp/claude-501/-Users-nicolasrabault-Projects-B-Blades-versus/9b36aec2-1c35-4b34-ba87-44a4ca16dfb8/scratchpad
cd "$SCRATCH"
# Remplacer la liste par : <retenue-2> <retenue-1> <retenue> <retenue+1> <retenue+2>
i=1
for v in <cinq valeurs autour de la retenue>; do
  node mesure.mjs "$SCRATCH/bancs/b$i" "combat.damageK=$v" > "$SCRATCH/dk-revef-$v.json" 2>&1 &
  i=$((i+1))
done
wait
```

- [ ] **Step 2: Rebalayer les deux `bot.scaling.*` autour de leurs valeurs retenues**

Neuf points : les valeurs retenues et leurs voisines immédiates sur les deux axes, en deux
vagues.

- [ ] **Step 3: Trancher, et écrire le résultat quel qu'il soit**

Deux issues, toutes deux acceptables, **aucune silencieuse** :

- **Les valeurs de combat sont encore dans leur palier** → l'écrire dans le journal, avec la
  mesure qui le montre. Aucun commit de `balance.json`. C'est un résultat, pas une absence de
  résultat : c'est exactement ce que le lot A n'a jamais vérifié.
- **Elles n'y sont plus** → un **quatrième commit de combat, seul**, les recale. La règle
  « jamais le combat et l'économie dans le même commit » interdit de mélanger ; elle n'interdit
  pas d'itérer. Ne pas retoucher à l'économie dans ce commit, quoi qu'on y voie.

- [ ] **Step 4: Commit**

```bash
cd /Users/nicolasrabault/Projects/B-Blades_versus-remesure
git status --short
# Si le combat n'a PAS bougé : seul le journal est ajouté.
git add docs/superpowers/plans/2026-09-02-calibration-remesure.md
# Si le combat a bougé, ajouter aussi : git add src/content/balance.json
git status --short
git commit -m "measure(calibration): le combat revérifié après que l'économie a bougé

<remplacer par : l'issue mesurée. Si rien n'a bougé, le dire et montrer la
mesure — c'est le contrôle que le lot A n'avait pas fait, et son résultat
négatif est le livrable. Si quelque chose a bougé, dire quoi et de combien.>

C'est le trou exact laissé par le jalon 3, lot A : spinPerChapter = 1,02
avait été choisi sous rewardPerChapter = 1,25, et la passe d'économie l'a
porté à 1,15, ce qui a aplati la marche que 1,02 achetait.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
git status --short
```

---

## Task 9 : reprendre toute la documentation que la passe rend fausse

Une passe qui déplace les chiffres publiés doit déplacer les phrases qui les citent. La fusion
de `fc827ee` n'avait produit **aucun conflit** et avait pourtant rendu fausse toute la
documentation d'équilibrage du dépôt : la même chose se produira ici si cette tâche est
bâclée.

**Files:**
- Modify: `docs/roadmap.md`
- Modify: `docs/game-design.md`
- Modify: `docs/ameliorations.md`

**Interfaces:**
- Consumes : les cinq valeurs retenues et le rapport final.
- Produces : un dépôt dont aucune phrase ne cite un chiffre périmé.

- [ ] **Step 1: Recenser mécaniquement les chiffres à reprendre**

Ne pas se fier au souvenir : chercher les anciennes valeurs dans tout le dépôt.

```bash
cd /Users/nicolasrabault/Projects/B-Blades_versus-remesure
grep -rn '0,42 h\|0,32 h\|×3,80\|×10,80\|1,02\|1,15\|104\|damageK\|rewardBase\|rewardPerChapter\|spinPerChapter\|attackPerChapter\|dix graines\|64,8 s\|42,6 s' docs/*.md | grep -v '^docs/superpowers'
```

Chaque occurrence est à trancher : encore vraie, à corriger, ou à dater comme historique.

- [ ] **Step 2: `docs/roadmap.md`**

- La ligne de base du **lot B** : le tableau des quatre chapitres, aux valeurs finales.
- La **dette du jalon 3, lot A** : l'obligation de remesure — la marquer **honorée**, en
  gardant sa clause pour l'avenir (« si la physique de collision, le contenu de la salle 10,
  `arena.breach.ejectSpeed`, `boss.mass` ou le jeu de graines changent encore… »), et en notant
  que **le jeu de graines vient précisément de changer**, ce qui est l'un de ses propres
  déclencheurs. L'entrée « le mur a atterri au chapitre 4 » : la remplacer par ce que la
  mesure à quarante graines dit, sans déclarer faux ce qui n'a pas été mesuré faux.
- La dette du jalon 3, lot A, entrée « le `+` codé en dur » : **fermée** (tâche 1).
- La dette du **jalon 2.5** sur `combat.damageK` et `econ.rewardBase` : nouvelles références.
- « **Née de l'intégration** » (écart entre châssis) : l'écart final mesuré, ce que le
  départage a pu en refermer, et ce qui reste — le mandat sur les profils de châssis reste à
  donner. Y répondre aussi à la question que cette dette posait explicitement : « Tigre Foudre
  meurt désormais surtout en salle 9 ; cette passe n'a pas mesuré si c'était déjà le cas avant
  `fc827ee` ; c'est à vérifier par qui reprendra l'écart ». Cette passe reprend l'écart : le
  relevé par châssis de chaque balayage porte la salle la plus meurtrière, donc la réponse est
  dans les mesures — l'écrire.
- La durée du boss, et le fait que la cible ~45 s est tenue.
- Ouvrir une **« Dette connue (remesure des cinq constantes) »** avec ce que la passe laisse :
  au minimum le modèle du harnais (n'équipe jamais, ne fusionne jamais), et l'écart entre
  châssis résiduel.

- [ ] **Step 3: `docs/game-design.md`**

- Le paragraphe **Courbes** : l'historique de `econ.rewardBase` (`120 → 70 → 60 → 86 → 104 →
  …`) gagne son maillon, avec le motif — « remesure après `fc827ee`, qui change la détection de
  contact ».
- Le paragraphe **`rewardPerChapter`** : la nouvelle valeur, son palier, et la contrainte de
  signe qui n'a pas été rouverte.
- Le paragraphe **Difficulté par chapitre** : les deux `bot.scaling.*`. La phrase « le mur a
  atterri au chapitre 4 » y est reprise depuis la roadmap — la corriger **aux deux endroits**.
- La cible **~45 s** du boss (§ Combat & pilotage) : dire qu'elle est tenue, et depuis quand.

- [ ] **Step 4: `docs/ameliorations.md`**

Ajouter une session datée `## Session du 2026-09-02 — la remesure des cinq constantes`, en
tête de fichier comme les autres, en parlant de **ce que le joueur ressent** et non des
constantes : le chapitre 1 dure-t-il plus ou moins ? le boss est-il plus court ? choisir Tigre
Foudre coûte-t-il toujours dix fois plus de temps que Carapace Abyssale ?

Y consigner aussi, en tant que remarque de méthode, que deux affirmations de la documentation
étaient des tirages de graines — c'est un retour sur le projet lui-même, et le fichier accueille
déjà ce genre de constat.

- [ ] **Step 5: Commit**

```bash
cd /Users/nicolasrabault/Projects/B-Blades_versus-remesure
git status --short
git add docs/roadmap.md docs/game-design.md docs/ameliorations.md
git status --short
git commit -m "docs: la documentation d'équilibrage rejoint les cinq constantes remesurées

<remplacer par : la liste de ce qui a été repris et pourquoi. Inclure les
phrases rendues fausses non par un changement de constante mais par le
passage à quarante graines.>

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
git status --short
```

---

## Task 10 : les trois harnais, le navigateur, et la relecture de branche entière

Deux des trois harnais ne sont dans aucune suite de tests et meurent en silence. La relecture
de branche entière est ce qui, au lot B, a trouvé que le jeu devenait injouable dès qu'un
chapitre était validé — ce que ni les tests, ni les relectures tâche par tâche, ni les
vérifications en navigateur n'avaient vu.

**Files:** aucun (vérification), sauf correctifs éventuels.

- [ ] **Step 1: Les trois harnais**

```bash
cd /Users/nicolasrabault/Projects/B-Blades_versus-remesure
npm run test
npm run build
npm run calibrate
```

Attendu : 490 tests verts (ou plus), build propre, calibration verte avec les cinq garde-fous
durs tenus.

```bash
# Serveur sur port inhabituel, contenu vérifié AVANT de mesurer
npx vite --port 5947 --strictPort &
until curl -s -o /dev/null -w '%{http_code}' http://localhost:5947/spinforge/ | grep -q 200; do sleep 1; done
curl -s http://localhost:5947/spinforge/src/content/balance.json | grep -oE '"(damageK|rewardBase|rewardPerChapter)": [0-9.]+'
PORT=5947 npm run verrou
```

Attendu : les trois valeurs retenues par la passe (preuve que le port sert **cet** arbre), puis
les dix `✓` et `Verrou vérifié de bout en bout.`

- [ ] **Step 2: Vérification en navigateur, par moi-même et pas par sous-agent**

Ouvrir `http://localhost:5947/spinforge/` (la racine renvoie 404) et jouer réellement :
piloter une descente, vider quelques salles, acheter une amélioration, ouvrir un coffre.

Ce qu'il faut regarder, et qu'aucune mesure headless ne dit : le combat est-il devenu mou ou
brutal ? le boss est-il expédié ? les crédits arrivent-ils à un rythme qui donne envie
d'acheter ? Une passe d'équilibrage peut tenir tous ses garde-fous et rendre le jeu ennuyeux.

Si Playwright sert à capturer l'écran : locale **anglaise** par défaut, donc injecter
`localStorage['spinforge.lang'] = 'fr'` — et **garder l'injection idempotente**, `addInitScript`
rejouant à chaque navigation, rechargement compris.

- [ ] **Step 3: Relecture de la branche entière**

Diff complet contre `origin/main`, lu d'un bloc et non tâche par tâche :

```bash
cd /Users/nicolasrabault/Projects/B-Blades_versus-remesure
git fetch origin
git diff origin/main...HEAD --stat
git diff origin/main...HEAD
```

Chercher spécifiquement ce qu'une relecture tâche par tâche ne peut pas voir : une phrase de
documentation qui contredit une autre ; un chiffre corrigé à un endroit et laissé périmé à un
autre ; une valeur de `balance.json` qui a bougé dans un commit et été écrasée dans un
suivant ; un garde-fou qu'on a cessé de relever en cours de route.

- [ ] **Step 4: Vérifier qu'aucun commit ne mélange combat et économie**

C'est le critère d'acceptation n° 3, et il se vérifie mécaniquement.

```bash
cd /Users/nicolasrabault/Projects/B-Blades_versus-remesure
for c in $(git log --format=%H origin/main..HEAD); do
  echo "--- $(git log -1 --format='%h %s' $c)"
  git show "$c" -- src/content/balance.json | grep -E '^[+-] *"(damageK|rewardBase|rewardPerChapter|spinPerChapter|attackPerChapter)' || true
  git show "$c" -- src/content/balance.json | grep -E '^[+-].*"(combat|econ|bot)"' || true
done
```

Attendu : aucun commit ne montre à la fois une clé de `combat`/`bot.scaling` et une clé de
`econ`.

- [ ] **Step 5: Mesurer l'étalon de `main` SEUL avant de fusionner**

Sans ce point de comparaison, tout écart post-fusion sera attribué à cette passe alors qu'il
vient d'ailleurs — c'est exactement ce qui s'est joué au lot B.

```bash
cd /Users/nicolasrabault/Projects/B-Blades_versus
git worktree add ../B-Blades_versus-etalon origin/main
cd ../B-Blades_versus-etalon && npm install && npm run calibrate 2>&1 | tail -40
```

Puis chercher les **non-conflits** : ce que `main` a livré entre-temps et qui déplace
l'équilibrage sans produire le moindre conflit git.

```bash
cd /Users/nicolasrabault/Projects/B-Blades_versus-remesure
git log --oneline HEAD..origin/main
git diff HEAD...origin/main -- src/sim/ src/content/balance.json
```

Nettoyer l'arbre jetable ensuite :

```bash
cd /Users/nicolasrabault/Projects/B-Blades_versus && git worktree remove ../B-Blades_versus-etalon
```

- [ ] **Step 6: Demander une relecture de branche entière**

Utiliser `superpowers:requesting-code-review` sur le diff complet `origin/main...HEAD`, en
donnant au relecteur la spec et ce plan. Traiter les retours avec
`superpowers:receiving-code-review` — vérifier techniquement avant d'implémenter, ne pas
acquiescer par principe.

---

## Self-review du plan

**Couverture de la spec :**

| Section de la spec | Tâche |
|---|---|
| § 1 mandat, bornes 1-3 | contraintes globales + tâches 4-8 (borne 3 vérifiée mécaniquement en 10.4) |
| § 2.1 boss ~45 s | départage 7, relevé à chaque point ; documenté en 9.3 |
| § 2.2 plus de mur après ch. 1 | tâches 5 et 7 ; documenté en 9.2 |
| § 2.3 `verrou` rouge | tâche 2 |
| § 3 bruit de graines | tâche 3 |
| § 4 garde-fous et départages | en tête de plan, appliqués aux Step « identifier les paliers » des tâches 4-7 |
| § 5 protocole (40 graines, bancs) | tâches 0 et 3 |
| § 6 temps 0 | tâches 1, 2, 3 |
| § 6 temps 1 | tâches 4, 5 |
| § 6 temps 2 | tâches 6, 7 |
| § 6 temps 3 | tâche 8 |
| § 7 hors scope | contraintes globales ; dette rouverte en 9.2 |
| § 8 documentation | tâche 9 |
| § 9 critères d'acceptation 1-8 | tâches 4-8 (1-4), tâche 10 (5-8) |

**Cohérence des noms :** `fmtMarg` défini en tâche 1 Step 3, consommé en tâche 1 Step 4 et par
la regex `[+-]?` du pilote (tâche 0 Step 3, où le piège est signalé). `mesure.mjs` produit les
clés `ch/ecart/chassis/passif/verrou/coffre`, toutes lues telles quelles par les tâches 4 à 8.
`BUDGET_MS` défini en tâche 2, utilisé en tâche 2 Step 4 et tâche 10 Step 1. Le jeu de quarante
graines défini en tâche 3, vérifié par recalcul au même endroit, utilisé partout ensuite.

**Trous connus, assumés :** la tâche 8 Step 1 porte un `<cinq valeurs autour de la retenue>` et
les messages de commit des tâches 4 à 9 portent des `<remplacer par : …>`. Ce ne sont pas des
placeholders de conception : ce sont les endroits où **le résultat d'une mesure encore à faire**
doit être écrit. Un plan de calibration qui les pré-remplirait inventerait ses résultats.
