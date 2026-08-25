// Captures de vérification du jalon 1.5. Nécessite un `npm run dev` déjà lancé.
// Usage : node scripts/shots.mjs
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

const URL = 'http://localhost:5173/spinforge/';
const OUT = '.shots';

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
page.on('pageerror', (e) => console.error('[pageerror]', e.message));
await page.goto(URL, { waitUntil: 'networkidle' });

// Le pilotage démarre l'audio et met la toupie en mouvement.
await page.mouse.move(195, 500);
await page.mouse.down();
await page.mouse.move(195, 300, { steps: 20 });

for (const [name, wait] of [['debut', 1500], ['milieu', 9000], ['fin', 9000]]) {
  await page.waitForTimeout(wait);
  await page.screenshot({ path: `${OUT}/${name}.png` });
  console.log(`${OUT}/${name}.png`);
}

await page.mouse.up();
await browser.close();
