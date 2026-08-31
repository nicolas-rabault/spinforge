// Captures de vérification. Jalon 1.5 : trois niveaux de spin RÉELS (haut, moyen,
// bas), atteints en pilotant effectivement le joueur en cercle continu — pas en le
// laissant dériver puis s'arrêter — et captés au moment où la barre SPIN du HUD
// franchit chaque seuil. Jalon 2a : écran Coffres, une révélation ×10 surprise en
// cours, l'inventaire chargé, la Forge avec un talent actif — une sauvegarde de
// départ est injectée dans localStorage avant le premier chargement pour disposer
// de crédits, de gemmes et d'un inventaire sans avoir à les gagner en jeu.
// Nécessite un `npm run dev` déjà lancé.
// Usage : node scripts/shots.mjs
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

// Le port de Vite varie : 5173 est souvent pris par un autre projet sur cette
// machine. Lire le port affiché par `npm run dev` et le passer en variable
// d'environnement — une capture prise sur le mauvais port a déjà fait croire à
// une régression.
const PORT = process.env.SPINFORGE_PORT ?? '5173';
const URL = `http://localhost:${PORT}/spinforge/`;
const OUT = '.shots';
const SAVE_KEY = 'spinforge.save';
// Sauvegarde de départ : de quoi ouvrir un coffre de chaque monnaie, un inventaire
// déjà varié (plusieurs rangs, une pile fusionnable), et une Lame Légende équipée —
// ses trois talents (Estoc, Riposte, Percée) sont donc actifs en même temps.
const SEED_SAVE = {
  v: 4,
  meta: {
    rngState: 987654321,
    credits: 50000,
    gems: 20000,
    equipped: {
      lame: { model: 'lame.couronne-solaire', rank: 11, level: 2 },
      disque: { model: 'disque.lourd', rank: 1, level: 0 },
      pointe: { model: 'pointe.plate', rank: 1, level: 0 },
      noyau: { model: 'noyau.fournaise', rank: 1, level: 0 },
    },
    inventory: [
      { model: 'disque.lourd', rank: 1, levels: [0, 0, 0] },
      { model: 'disque.gravite', rank: 2, levels: [0, 0] },
      { model: 'pointe.aiguille', rank: 3, levels: [1] },
      { model: 'pointe.orbitale', rank: 1, levels: [0, 0] },
      { model: 'noyau.fournaise', rank: 4, levels: [0] },
      { model: 'lame.couronne-solaire', rank: 7, levels: [2] },
    ],
    pity: { bronze: 0, arene: 3, mythique: 12 },
    pending: { bronze: 2, arene: 1, mythique: 0 },
    chapterValidated: false,
    toupies: { unlocked: ['brasier-solaire', 'typhon-primal'], active: 'brasier-solaire' },
    founderGiftClaimed: true,
  },
};
// Seuils décroissants : le premier se déclenche presque tout de suite (spin plein au
// démarrage), les deux suivants exigent d'encaisser des chocs pour de vrai.
const THRESHOLDS = [
  { name: 'haut', max: 100 },
  { name: 'moyen', max: 50 },
  { name: 'bas', max: 15 },
];
const POLL_MS = 100; // aligné sur le tick fixe de la simulation (TICK_S = 0.1 s)
const TIMEOUT_MS = 180_000;
const SWEEP_PERIOD_MS = 1800; // durée d'un tour complet du pilotage circulaire
const SWEEP_RADIUS_PX = 130;

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
page.on('pageerror', (e) => console.error('[pageerror]', e.message));
// `addInitScript` s'exécute avant tout script de la page, donc avant que `loadMeta()`
// ne lise `localStorage` au montage de `App` — l'injection précède toujours la lecture.
await page.addInitScript(
  ({ key, value }) => {
    localStorage.setItem(key, value);
    // Chromium démarre en en-US et l'app suit le navigateur : sans ce forçage,
    // les captures sortiraient en anglais.
    localStorage.setItem('spinforge.lang', 'fr');
  },
  { key: SAVE_KEY, value: JSON.stringify(SEED_SAVE) },
);
await page.goto(URL, { waitUntil: 'networkidle' });

/**
 * Lit le pourcentage réellement affiché par la barre SPIN du HUD — pas un état interne
 * de la simulation : le rendu est un spectateur, cette vérification l'est aussi.
 * Retourne 0 quand le joueur est mort : la barre est alors à `width: 0%`.
 */
async function readSpinPct() {
  return page.evaluate(() => {
    const label = [...document.querySelectorAll('span')].find((el) => el.textContent === '▾ TON SPIN');
    const fill = label?.nextElementSibling?.firstElementChild;
    const width = fill instanceof HTMLElement ? fill.style.width : '';
    return width ? parseFloat(width) : null;
  });
}

const canvas = page.locator('canvas');
await canvas.waitFor({ state: 'attached' });
const box = await canvas.boundingBox();
if (!box) throw new Error('canvas introuvable — la page a-t-elle bien chargé ?');
const originX = box.x + box.width / 2;
const originY = box.y + box.height / 2;

// Le premier contact démarre l'audio (garde CombatScreen.onDown) et met le joueur en
// mouvement. On ne relâche jamais le doigt : la direction tourne en continu.
await page.mouse.move(originX, originY);
await page.mouse.down();
await page.waitForTimeout(300); // laisse le premier tick s'exécuter avant de juger le spin

let nextThreshold = 0;
let angle = 0;
const start = Date.now();

while (nextThreshold < THRESHOLDS.length && Date.now() - start < TIMEOUT_MS) {
  // Pilotage en cercle : la direction tourne sans relâcher le doigt, pour que le joueur
  // patrouille l'arène au lieu de dériver puis stagner — les bots, qui visent toujours
  // sa position, finissent par le rattraper.
  angle += (2 * Math.PI) / (SWEEP_PERIOD_MS / POLL_MS);
  await page.mouse.move(originX + Math.cos(angle) * SWEEP_RADIUS_PX, originY + Math.sin(angle) * SWEEP_RADIUS_PX);
  await page.waitForTimeout(POLL_MS);

  const pct = await readSpinPct();
  if (pct === null) continue;
  const threshold = THRESHOLDS[nextThreshold];
  if (pct <= threshold.max) {
    const path = `${OUT}/${threshold.name}-spin-${Math.round(pct)}.png`;
    await page.screenshot({ path });
    console.log(path);
    nextThreshold++;
  }
}

if (nextThreshold < THRESHOLDS.length) {
  console.warn(
    `Seuils atteints : ${nextThreshold}/${THRESHOLDS.length} avant le délai de ${TIMEOUT_MS / 1000} s ` +
      '(le pilotage automatique n’a pas croisé assez de bots — relancer, ou augmenter TIMEOUT_MS).',
  );
}

await page.mouse.up();

// --- Jalon 2a : écran Coffres, révélation ×10 en cours, inventaire chargé, Forge
// avec un talent actif. La sauvegarde injectée en tête de fichier fournit les
// crédits, les gemmes et l'inventaire de départ.

await page.getByRole('button', { name: 'Coffres' }).click();
await page.waitForTimeout(150);
await page.screenshot({ path: `${OUT}/coffres-ecran.png` });
console.log(`${OUT}/coffres-ecran.png`);

// Capturée en plein milieu de la révélation : la pile de tirages n'est qu'à moitié
// peuplée, elle doit se lire comme une succession qui continue, pas comme un bloc figé.
const bronzeSection = page.locator('section', { hasText: 'Coffre Bronze' });
await bronzeSection.getByRole('button', { name: /Ouvrir ×10/ }).click();
await page.waitForTimeout(350);
await page.screenshot({ path: `${OUT}/coffres-reveal-x10.png` });
console.log(`${OUT}/coffres-reveal-x10.png`);

// Laisse la révélation se terminer avant de continuer — cliquer sur « Continuer »
// pendant l'animation n'est pas un parcours qu'un joueur ferait.
await page.getByRole('button', { name: 'Continuer' }).waitFor();
await page.waitForTimeout(1000);
await page.getByRole('button', { name: 'Continuer' }).click();

await page.getByRole('button', { name: 'Forge' }).click();
await page.waitForTimeout(150);
// Haut de l'écran Forge : la Lame Légende équipée porte ses trois talents actifs
// (Estoc, Riposte, Percée), listés en toutes lettres sous sa ligne de stat.
await page.screenshot({ path: `${OUT}/forge-talent-actif.png` });
console.log(`${OUT}/forge-talent-actif.png`);

// Fait défiler jusqu'à l'inventaire, sous les quatre emplacements équipés — la
// sauvegarde injectée y place plusieurs piles, dont une déjà fusionnable.
await page.evaluate(() => {
  const h2 = [...document.querySelectorAll('h2')].find((el) => el.textContent === 'Ta toupie');
  if (h2?.parentElement) h2.parentElement.scrollTop = h2.parentElement.scrollHeight;
});
await page.waitForTimeout(100);
await page.screenshot({ path: `${OUT}/forge-inventaire-charge.png` });
console.log(`${OUT}/forge-inventaire-charge.png`);

await browser.close();
