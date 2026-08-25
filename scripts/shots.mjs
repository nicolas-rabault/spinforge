// Captures de vérification du jalon 1.5 : trois niveaux de spin RÉELS (haut, moyen,
// bas), atteints en pilotant effectivement le joueur en cercle continu — pas en le
// laissant dériver puis s'arrêter — et captés au moment où la barre SPIN du HUD
// franchit chaque seuil. Nécessite un `npm run dev` déjà lancé.
// Usage : node scripts/shots.mjs
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

const URL = 'http://localhost:5173/spinforge/';
const OUT = '.shots';
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
await page.goto(URL, { waitUntil: 'networkidle' });

/**
 * Lit le pourcentage réellement affiché par la barre SPIN du HUD — pas un état interne
 * de la simulation : le rendu est un spectateur, cette vérification l'est aussi.
 * Retourne 0 quand le joueur est mort : la barre est alors à `width: 0%`.
 */
async function readSpinPct() {
  return page.evaluate(() => {
    const label = [...document.querySelectorAll('span')].find((el) => el.textContent === 'SPIN');
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
await browser.close();
