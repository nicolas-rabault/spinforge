// Vérification du verrou de châssis, en vrai navigateur. C'est la seule couverture
// de son point d'application dans l'app — l'appel à `equipPendingToupie` depuis
// `src/ui/useGameLoop.ts` quand le boss tombe. Ni les tests unitaires ni
// `npm run calibrate` ne franchissent cette frontière (voir la dette du verrou dans
// `docs/roadmap.md`), et la mutation le prouve : l'appel retiré, la passe 1 rougit.
//
// Nécessite un `npm run dev` déjà lancé. Le port de Vite change s'il en trouve un
// occupé — lire la ligne « Local: » qu'il affiche et la passer ici :
//   PORT=5176 node scripts/verrou.mjs
//
// L'horloge de la page est accélérée (240 ms de temps virtuel par image au lieu de
// ~16), sans quoi une descente des dix salles demande une dizaine de minutes. La
// simulation avançant par pas fixes de 100 ms, ce qu'elle calcule est rigoureusement
// inchangé : seule la cadence d'observation bouge.
import { chromium } from 'playwright';

const URL = `http://localhost:${process.env.PORT ?? 5173}/spinforge/`;
const ALL = ['brasier-solaire', 'typhon-primal', 'carapace-abyssale', 'tigre-foudre'];

/** Sauvegarde de départ injectée avant le premier chargement. `maxed` équipe des
 *  pièces de rang 11 pour que les salles tombent vite (passe du boss) ; sans lui, la
 *  toupie est nue et meurt d'elle-même (passe de la mort). */
const save = (maxed) => JSON.stringify({
  v: 3,
  meta: {
    rngState: 123456789, credits: maxed ? 1000000 : 0, gems: 0,
    equipped: Object.fromEntries(
      [['lame', 'lame.couronne-solaire'], ['disque', 'disque.lourd'],
       ['pointe', 'pointe.plate'], ['noyau', 'noyau.fournaise']]
        .map(([slot, model]) => [slot, { model, rank: maxed ? 11 : 1, level: maxed ? 40 : 0 }]),
    ),
    inventory: [], pity: { bronze: 0, arene: 0, mythique: 0 }, chapterValidated: false,
    toupies: { unlocked: ALL, active: 'brasier-solaire' }, founderGiftClaimed: true,
  },
});

const card = (page, label) => page.locator('section').filter({ hasText: label }).last();
const hud = (page) => page.locator('section').first().innerText();

let failures = 0;
function check(label, ok) {
  if (!ok) failures++;
  console.log('%s %s', ok ? '✓' : '✗', label);
}

async function open(browser, maxed) {
  const page = await browser.newPage({ viewport: { width: 460, height: 900 } });
  await page.addInitScript(() => {
    const raf = window.requestAnimationFrame.bind(window);
    let virtual = 0;
    window.requestAnimationFrame = (cb) => raf(() => { virtual += 240; cb(virtual); });
    performance.now = () => virtual;
  });
  await page.goto(URL);
  await page.evaluate((s) => {
    localStorage.setItem('spinforge.save', s);
    localStorage.setItem('spinforge.onboarded', '1');
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
await page.mouse.move(cx, cy);
await page.mouse.down();
let boss = false;
let looped = false;
for (let i = 0; i < 2000 && !looped; i++) {
  await page.mouse.move(cx + Math.cos((i / 14) * 6.283) * 70, cy + Math.sin((i / 14) * 6.283) * 70);
  await page.waitForTimeout(120);
  const text = await hud(page);
  if (text.includes('SALLE 10')) boss = true;
  else if (boss && text.includes('SALLE 1 /')) looped = true;
}
await page.mouse.up();
check('un tour de chapitre complet a été joué', looped);
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
let dead = false;
for (let i = 0; i < 400 && !dead; i++) {
  await page.waitForTimeout(150);
  dead = (await page.getByRole('button', { name: 'Retenter' }).count()) > 0;
}
check('la toupie nue est morte', dead);
await page.getByRole('button', { name: 'Toupies' }).click();
await page.waitForTimeout(300);
check('le texte d’attente parle de relancer, pas de « jusqu’au bout »',
  (await page.getByText('dès que tu relances la descente').count()) > 0
  && (await page.getByText('jusqu\'au bout').count()) === 0);
await page.getByRole('button', { name: 'Combat' }).click();
await page.waitForTimeout(300);
await page.getByRole('button', { name: 'Retenter' }).click();
await page.waitForTimeout(400);
await page.getByRole('button', { name: 'Toupies' }).click();
await page.waitForTimeout(300);
check('Tigre Foudre est « Pilotée » après « Retenter »',
  (await card(page, 'Tigre Foudre').innerText()).includes('Pilotée'));
check('plus aucune ligne d’attente',
  (await page.getByText('prend le relais').count()) === 0
  && (await page.getByText('dès que tu relances').count()) === 0);
await browser.close();

console.log(failures === 0 ? '\nVerrou vérifié de bout en bout.' : `\n${failures} vérification(s) en échec.`);
process.exit(failures === 0 ? 0 : 1);
