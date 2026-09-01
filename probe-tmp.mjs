import { chromium } from 'playwright';
const URL = 'http://localhost:5173/spinforge/';
const ALL = ['brasier-solaire', 'typhon-primal', 'carapace-abyssale', 'tigre-foudre'];
const save = JSON.stringify({ v: 5, meta: {
  rngState: 123456789, credits: 1000000, gems: 0,
  equipped: Object.fromEntries([['lame','lame.couronne-solaire'],['disque','disque.lourd'],['pointe','pointe.plate'],['noyau','noyau.fournaise']].map(([s,m])=>[s,{model:m,rank:11,level:40}])),
  inventory: [], pity:{bronze:0,arene:0,mythique:0}, pending:{bronze:0,arene:0,mythique:0},
  bestChapter: 0, toupies:{unlocked:ALL,active:'brasier-solaire'}, founderGiftClaimed: true }});
const b = await chromium.launch();
const page = await b.newPage({ viewport: { width: 460, height: 900 } });
await page.addInitScript(() => {
  const raf = window.requestAnimationFrame.bind(window);
  let v = 0, frames = 0;
  window.__frames = () => frames;
  window.requestAnimationFrame = (cb) => raf(() => { v += 240; frames++; cb(v); });
  performance.now = () => v;
});
await page.goto(URL);
await page.evaluate((s) => { localStorage.setItem('spinforge.save', s); localStorage.setItem('spinforge.onboarded','1'); }, save);
await page.reload();
await page.waitForTimeout(1500);
const box = await page.locator('canvas').first().boundingBox();
console.log('canvas', JSON.stringify(box));
const cx = box.x + box.width/2, cy = box.y + box.height/2;
await page.mouse.move(cx, cy); await page.mouse.down();
const t0 = Date.now();
for (let i = 0; i < 300; i++) {
  await page.mouse.move(cx + Math.cos(i/14*6.283)*70, cy + Math.sin(i/14*6.283)*70);
  await page.waitForTimeout(90);
  if (i % 50 === 49) {
    const pips = await page.locator('[aria-label*="Salle"]').first().getAttribute('aria-label').catch(() => null);
    const frames = await page.evaluate(() => window.__frames());
    console.log(`i=${i+1} t=${((Date.now()-t0)/1000).toFixed(0)}s images=${frames} salle=${pips}`);
  }
}
await b.close();
