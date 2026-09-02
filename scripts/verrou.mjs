// Vérification du verrou de châssis, en vrai navigateur. C'est la seule couverture
// de sa frontière dans l'app : le boss vaincu ferme la descente, et c'est la
// descente suivante — `startRun`, appelée par le bouton « Nouvelle descente » de
// `src/ui/CombatScreen.tsx` — qui fait monter le châssis en attente. Ni les tests
// unitaires ni `npm run calibrate` ne franchissent cette frontière (voir la dette
// du verrou dans `docs/roadmap.md`).
//
// Nécessite un `npm run dev` déjà lancé. Le port de Vite change s'il en trouve un
// occupé — lire la ligne « Local: » qu'il affiche et la passer ici :
//   PORT=5176 node scripts/verrou.mjs
//
// L'horloge de la page est accélérée (240 ms de temps virtuel par appel de
// `requestAnimationFrame` au lieu de ~16), sans quoi une descente des dix salles
// demande une dizaine de minutes. La simulation avançant par pas fixes de 100 ms,
// ce qu'elle calcule est rigoureusement inchangé : seule la cadence d'observation
// bouge. Et 240 ne s'augmente pas : `MAX_CATCHUP_MS` (`src/ui/useGameLoop.ts`)
// plafonne à 250 ms ce qu'une image peut donner à `tick()`, le reste est jeté.
//
// Le pilotage vit DANS la page, pas ici. Depuis la refonte graphique — arène plein
// écran, dessins, portraits — un aller-retour Playwright (`mouse.move` + le
// `evaluate` de `etat()`) coûte des dixièmes de seconde, soit des dizaines de
// secondes de simulation. La boucle de visée d'avant avançait d'un cap par tour de
// boucle : elle tenait donc un cap fixe pendant vingt secondes de jeu, et la
// descente n'arrivait plus au boss. C'est maintenant la page qui balaie la visée,
// à côté de l'enveloppe de `requestAnimationFrame` : un cap tous les `TENUE_MS` de
// temps SIMULÉ, quoi que coûte le canal CDP. La cadence de visée ne dépend plus de
// la latence, et le relevé côté Node peut être espacé sans rien changer au jeu.
//
// Temps simulé, et pas temps virtuel : les deux ne sont plus le même. `useGameLoop`
// est le seul `requestAnimationFrame` de `src/`, mais Pixi ajoute les siens
// (`app.init` ne passe pas `autoStart: false` — c'est son ticker qui rend l'image).
// Mesuré ici : trois appels enveloppés par vraie image, donc l'horloge virtuelle
// avance 720 ms par image là où la boucle de jeu n'en consomme que 250 — elle court
// 2,9× devant la simulation. Le verrou recompte donc ce que la simulation consomme
// vraiment, une fois par vraie image, sur une chaîne rAF non enveloppée. Ordres de
// grandeur mesurés sur cette machine : ~43 images/s, ~11× le temps réel.

import { chromium } from 'playwright';

const URL = `http://localhost:${process.env.PORT ?? 5173}/spinforge/`;
const ALL = ['brasier-solaire', 'typhon-primal', 'carapace-abyssale', 'tigre-foudre'];

/** Pas de temps virtuel ajouté par appel de `requestAnimationFrame`. */
const IMAGE_MS = 240;
/** Copie de `MAX_CATCHUP_MS` (`src/ui/useGameLoop.ts`) : le temps qu'une image de la
 *  boucle de jeu peut consommer au plus. C'est lui qui plafonne l'accélération, et
 *  pourquoi monter `IMAGE_MS` n'achèterait rien. */
const PLAFOND_MS = 250;
/** Durée de simulation pendant laquelle la visée garde un cap, et angle dont le cap
 *  tourne à chaque fois : un tour complet toutes les 28 s simulées. C'est, exprimée
 *  en temps de simulation, la cadence que la boucle pilotée depuis Node produisait
 *  avant la refonte, quand elle faisait tomber les dix salles. */
const TENUE_MS = 2000;
const PAS_DEG = 360 / 14;
/** Rayon du balayage autour du point d'appui, en pixels d'écran. */
const RAYON_PX = 70;
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
const BUDGET_MS = 300000;
/** Cadence d'observation. Chaque relevé coûte un aller-retour cher et vole du temps
 *  au fil principal : on observe peu, la simulation n'en dépend pas. */
const RELEVE_MS = 700;

/** Niveau des pièces de la sauvegarde `maxed`. Haut, et volontairement : le pilote
 *  du verrou est un balayage aveugle, il ne vise rien. Une toupie qui doit gagner ses
 *  combats au pilotage rendait la passe 1 tirée au sort. Rien ici n'est une
 *  assertion — c'est le décor qui fait qu'une descente ARRIVE au boss. */
const NIVEAU_MAXED = 400;

/** Sauvegarde de départ injectée avant le premier chargement. `maxed` équipe des
 *  pièces de rang 11 pour que les salles tombent vite (passe du boss) ; sans lui, la
 *  toupie est nue et meurt d'elle-même (passe de la mort).
 *
 *  La Pointe reste d'origine, elle, et c'est le point le plus important de cette
 *  sauvegarde. La Pointe fixe la vitesse : au rang 11 niveau 400 elle porte la
 *  toupie à ~1300 px/s, très au-dessus de `arena.breach.ejectSpeed` (400), et les
 *  arènes ouvrent des brèches à partir de la salle 3 (`balance.json`). Un balayage
 *  aveugle finit toujours par pointer vers une brèche : la toupie sortait à pleine
 *  vitesse et la descente se terminait par éjection, en salle 3 comme en salle 9,
 *  une fois sur trois — c'était ça, la « descente bloquée ». Pointe d'origine :
 *  240 px/s, sous le seuil, plus d'éjection subie du seul fait du pilotage. */
const save = (maxed) => JSON.stringify({
  v: 5,
  meta: {
    rngState: 123456789, credits: maxed ? 1000000 : 0, gems: 0,
    equipped: Object.fromEntries(
      [['lame', 'lame.couronne-solaire'], ['disque', 'disque.lourd'],
       ['pointe', 'pointe.plate'], ['noyau', 'noyau.fournaise']]
        .map(([slot, model]) => [slot, slot === 'pointe'
          ? { model, rank: 1, level: 0 }
          : { model, rank: maxed ? 11 : 1, level: maxed ? NIVEAU_MAXED : 0 }]),
    ),
    inventory: [], pity: { bronze: 0, arene: 0, mythique: 0 },
    // Le schéma 5 exige aussi `pending` et `bestChapter` : sans eux `isComplete`
    // rejette le blob et la partie repart à zéro, avec une seule toupie — les
    // vérifications échoueraient sans dire pourquoi.
    pending: { bronze: 0, arene: 0, mythique: 0 }, bestChapter: 0,
    toupies: { unlocked: ALL, active: 'brasier-solaire' }, founderGiftClaimed: true,
  },
});

const card = (page, label) => page.locator('section').filter({ hasText: label }).last();
/** Salle en cours et mort du joueur, en un seul aller-retour. Depuis la refonte
 *  graphique le HUD n'affiche plus « SALLE 4 / 10 » : les dix pastilles de
 *  `PipTrack` n'ont pas de texte, et le numéro ne se lit plus que sur leur
 *  libellé accessible. La mort ne se lit plus non plus sur un bouton
 *  « Retenter » : les deux fins de descente ouvrent le même voile, avec le même
 *  bouton « Nouvelle descente » — seul son titre les distingue. `innerText`
 *  ignore ce qui est masqué, donc l'onglet Combat en arrière-plan ne compte pas.
 *
 *  Comparaison en minuscules, et ce n'est pas une coquetterie : la refonte pose
 *  `textTransform: 'uppercase'` sur ce titre, et `innerText` rend le texte APRÈS
 *  transformation — « TA TOUPIE S'EST ARRÊTÉE ». Un `includes('arrêtée')` brut n'y
 *  trouvait donc plus rien, le garde de mort de la passe 1 était aveugle, et une
 *  descente perdue passait pour une descente bloquée. (Les `getByText` du script
 *  ne souffrent pas de ça : Playwright compare sur le texte du DOM, pas sur son
 *  rendu.) */
const etat = (page) => page.evaluate(() => {
  const label = [...document.querySelectorAll('[role="img"]')]
    .map((el) => el.getAttribute('aria-label') ?? '')
    .find((l) => /^Salle \d+ sur \d+$/.test(l));
  return {
    salle: label ? Number(label.match(/\d+/)[0]) : 0,
    mort: document.body.innerText.toLowerCase().includes('arrêtée'),
    simuleS: window.__verrou.tempsSimuleS(),
  };
});

let failures = 0;
function check(label, ok) {
  if (!ok) failures++;
  console.log('%s %s', ok ? '✓' : '✗', label);
}

async function open(browser, maxed) {
  const page = await browser.newPage({ viewport: { width: 460, height: 900 } });
  await page.addInitScript(([imageMs, plafondMs, pasRad]) => {
    const raf = window.requestAnimationFrame.bind(window);
    let virtual = 0;
    let simule = 0;
    let vuImage = 0;
    let visee = null;
    let prochainCap = 0;
    let cap = 0;

    // Le doigt du verrou. Ce sont les mêmes `PointerEvent` que ceux d'un vrai
    // doigt, remis au même élément, et ils remontent au même `onPointerDown` /
    // `onPointerMove` de `CombatScreen` : rien ici ne touche la simulation, ne
    // rentre dans un ref ni n'appelle une fonction de `src/sim/`. La seule chose
    // que le verrou décide, c'est QUAND le geste arrive — à une date de temps
    // simulé au lieu d'une date de temps réel. Le geste lui-même — un appui tenu
    // au centre, puis un cap qui tourne d'un quatorzième de tour toutes les 0,7 s
    // simulées, soit un tour complet en ~10 s — est exactement ce qu'un joueur
    // produit au doigt, et plutôt moins bien : c'est un pilotage à l'aveugle, pas
    // un pouvoir que le jeu réel ne donnerait pas.
    const doigt = (type, x, y) => {
      // Le même élément que `page.locator('canvas').first()` côté Node, d'où
      // viennent les coordonnées.
      const cible = document.querySelectorAll('canvas')[0];
      if (!cible) return;
      cible.dispatchEvent(new PointerEvent(type, {
        pointerId: 7, pointerType: 'touch', isPrimary: true,
        bubbles: true, cancelable: true, composed: true,
        clientX: x, clientY: y, buttons: type === 'pointerup' ? 0 : 1,
      }));
    };

    window.requestAnimationFrame = (cb) => raf(() => { virtual += imageMs; cb(virtual); });
    performance.now = () => virtual;

    // Chaîne rAF non enveloppée : elle bat une fois par vraie image, là où le
    // compteur d'appels enveloppés en compte trois. `virtual - vuImage` est
    // exactement l'`elapsed` que la boucle de jeu verra pour cette image, et
    // `Math.min(…, plafondMs)` exactement ce qu'elle en donnera à `tick()` : ce
    // cumul est le temps que la simulation a vraiment avancé.
    const image = () => {
      simule += Math.min(virtual - vuImage, plafondMs);
      vuImage = virtual;
      if (visee && simule >= prochainCap) {
        prochainCap = simule + visee.tenueMs;
        const a = cap++ * pasRad;
        doigt('pointermove', visee.x + Math.cos(a) * visee.rayon, visee.y + Math.sin(a) * visee.rayon);
      }
      raf(image);
    };
    raf(image);

    window.__verrou = {
      tempsSimuleS: () => simule / 1000,
      /** Pose le doigt au centre et lance le balayage. */
      pilote(x, y, rayon, tenueMs) {
        visee = { x, y, rayon, tenueMs };
        prochainCap = simule;
        cap = 0;
        doigt('pointerdown', x, y);
      },
      /** Relève le doigt : `steerRef` retombe à `null`, comme quand on lâche. */
      lache() {
        if (!visee) return;
        doigt('pointerup', visee.x, visee.y);
        visee = null;
      },
    };
  }, [IMAGE_MS, PLAFOND_MS, (PAS_DEG * Math.PI) / 180]);
  await page.goto(URL);
  await page.evaluate((s) => {
    localStorage.setItem('spinforge.save', s);
    localStorage.setItem('spinforge.onboarded', '1');
    // Chromium démarre en en-US et l'app suit le navigateur : sans ce forçage,
    // l'interface passerait en anglais et chaque recherche par texte ci-dessous
    // échouerait sans dire pourquoi — le défaut qu'un verrou ne doit pas avoir.
    localStorage.setItem('spinforge.lang', 'fr');
  }, save(maxed));
  await page.reload();
  await page.waitForTimeout(1200);
  return page;
}

const browser = await chromium.launch();

// ===== Passe 1 — la frontière du boss
console.log('\nPasse 1 — le boss vaincu fait monter le châssis en attente');
let page = await open(browser, true);
await page.getByRole('button', { name: 'Toupies' }).click();
await page.waitForTimeout(300);
await card(page, 'Carapace Abyssale').getByRole('button', { name: 'Équiper' }).click();
await page.waitForTimeout(300);
check('Brasier reste « Pilotée » après le changement',
  (await card(page, 'Brasier Solaire').innerText()).includes('Pilotée'));
check('Carapace affiche « Au prochain run »',
  (await card(page, 'Carapace Abyssale').innerText()).includes('Au prochain run'));
check('la carte pilotée propose « Annuler le changement »',
  (await card(page, 'Brasier Solaire').innerText()).includes('Annuler le changement'));

await page.getByRole('button', { name: 'Combat' }).click();
await page.waitForTimeout(300);
const box = await page.locator('canvas').first().boundingBox();
const cx = box.x + box.width / 2;
const cy = box.y + box.height / 2;
await page.evaluate(([x, y, r, t]) => window.__verrou.pilote(x, y, r, t), [cx, cy, RAYON_PX, TENUE_MS]);
let boss = false;
let closed = false;
let mort = 0;
let salle = 0;
let simuleS = 0;
// Le budget est en temps réel et non en tours de boucle : ce que compte le verrou,
// c'est le mur contre lequel une descente bloquée doit venir échouer bruyamment.
// Sans lui, une toupie qui n'avance plus laissait la boucle tourner ses 2000 tours
// — une demi-heure — pour échouer ensuite sans dire ce qui s'était passé.
const debut = Date.now();
while (!closed && !mort && Date.now() - debut < BUDGET_MS) {
  await page.waitForTimeout(RELEVE_MS);
  const vu = await etat(page);
  simuleS = vu.simuleS;
  if (vu.salle) salle = vu.salle;
  if (vu.salle === 10) boss = true;
  // Les deux fins de descente ouvrent le même voile et proposent « Nouvelle
  // descente » : c'est le texte de victoire qui distingue le boss vaincu d'une
  // mort en salle 10. Motif large (`/validé/`) : le titre du voile est
  // « Chapitre 1 validé », numéro compris.
  closed = boss && (await page.getByText(/validé/).count()) > 0;
  if (vu.mort) mort = vu.salle;
}
await page.evaluate(() => window.__verrou.lache());
const reel = ((Date.now() - debut) / 1000).toFixed(0);
check(
  closed ? 'le boss vaincu a fermé la descente'
    : mort ? `le boss vaincu a fermé la descente (la descente est morte en salle ${mort})`
      : `le boss vaincu a fermé la descente (bloquée en salle ${salle} après ${reel} s réelles, ${simuleS.toFixed(0)} s simulées)`,
  closed,
);
// La liste de pastilles « Choisis ta descente » est le seul endroit où l'offre de
// chapitres de l'interface s'observe : sans cette vérification, rien d'automatisé
// ne dit que l'interface propose exactement ce que la simulation accepte après un
// boss vaincu.
check('le chapitre 2 est devenu proposé',
  closed && (await page.getByRole('button', { name: /^2 — / }).count()) > 0);
// Clic gardé : sans cette garde, un échec réel mourrait sur un timeout Playwright
// de 30 s au lieu d'afficher le récapitulatif du script.
if (closed) {
  await page.getByRole('button', { name: /Nouvelle descente/ }).click();
  await page.waitForTimeout(400);
}
await page.getByRole('button', { name: 'Toupies' }).click();
await page.waitForTimeout(300);
check('Carapace est devenue « Pilotée »',
  (await card(page, 'Carapace Abyssale').innerText()).includes('Pilotée'));
await page.close();

// ===== Passe 2 — la frontière de la mort
console.log('\nPasse 2 — la mort fait monter le châssis en attente');
page = await open(browser, false);
await page.getByRole('button', { name: 'Toupies' }).click();
await page.waitForTimeout(300);
await card(page, 'Tigre Foudre').getByRole('button', { name: 'Équiper' }).click();
await page.waitForTimeout(300);
await page.getByRole('button', { name: 'Combat' }).click();
// Personne ne pilote ici : la toupie nue doit mourir toute seule. Même budget en
// temps réel que la passe 1, et le même relevé espacé.
let dead = false;
const debutMort = Date.now();
while (!dead && Date.now() - debutMort < BUDGET_MS) {
  await page.waitForTimeout(RELEVE_MS);
  dead = (await page.getByText('arrêtée').count()) > 0;
}
check('la toupie nue est morte', dead);
await page.getByRole('button', { name: 'Toupies' }).click();
await page.waitForTimeout(300);
check('le texte d’attente parle de relancer, pas de « jusqu’au bout »',
  (await page.getByText('dès que tu relances la descente').count()) > 0
  && (await page.getByText('jusqu\'au bout').count()) === 0);
await page.getByRole('button', { name: 'Combat' }).click();
await page.waitForTimeout(300);
await page.getByRole('button', { name: /Nouvelle descente/ }).click();
await page.waitForTimeout(400);
await page.getByRole('button', { name: 'Toupies' }).click();
await page.waitForTimeout(300);
check('Tigre Foudre est « Pilotée » après la nouvelle descente',
  (await card(page, 'Tigre Foudre').innerText()).includes('Pilotée'));
check('plus aucune ligne d’attente',
  (await page.getByText('prend le relais').count()) === 0
  && (await page.getByText('dès que tu relances').count()) === 0);
await browser.close();

console.log(failures === 0 ? '\nVerrou vérifié de bout en bout.' : `\n${failures} vérification(s) en échec.`);
process.exit(failures === 0 ? 0 : 1);
