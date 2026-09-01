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
  v: 5,
  meta: {
    rngState: 123456789, credits: maxed ? 1000000 : 0, gems: 0,
    equipped: Object.fromEntries(
      [['lame', 'lame.couronne-solaire'], ['disque', 'disque.lourd'],
       ['pointe', 'pointe.plate'], ['noyau', 'noyau.fournaise']]
        .map(([slot, model]) => [slot, { model, rank: maxed ? 11 : 1, level: maxed ? 40 : 0 }]),
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
let closed = false;
for (let i = 0; i < 2000 && !closed; i++) {
  await page.mouse.move(cx + Math.cos((i / 14) * 6.283) * 70, cy + Math.sin((i / 14) * 6.283) * 70);
  await page.waitForTimeout(120);
  if ((await hud(page)).includes('SALLE 10')) boss = true;
  // Les deux fins de descente affichent « Nouvelle descente » : c'est le texte de
  // victoire qui distingue le boss vaincu d'une mort en salle 10. Motif large
  // (`/validé/`) : la tâche 4 remplace le bouton par un panneau titré
  // « Chapitre 1 validé », numéro compris.
  closed = boss && (await page.getByText(/validé/).count()) > 0;
}
await page.mouse.up();
check('le boss vaincu a fermé la descente', closed);
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
let dead = false;
for (let i = 0; i < 400 && !dead; i++) {
  await page.waitForTimeout(150);
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
