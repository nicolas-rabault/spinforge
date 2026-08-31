import { chromium } from 'playwright';
const OUT='/private/tmp/claude-501/-Users-nicolasrabault-Projects-B-Blades-versus/88fa80ac-9a1c-4ce4-995e-d78cfcf2abb0/scratchpad/shots';
const SAVE={v:4,meta:{rngState:987654321,credits:50000,gems:20000,
 equipped:{lame:{model:'lame.croc-de-tempete',rank:11,level:6},disque:{model:'disque.colosse',rank:11,level:6},pointe:{model:'pointe.gyroscope',rank:11,level:6},noyau:{model:'noyau.oeil-du-cyclone',rank:11,level:6}},
 inventory:[],pity:{bronze:0,arene:3,mythique:12},pending:{bronze:0,arene:0,mythique:0},chapterValidated:true,
 toupies:{unlocked:['brasier-solaire','carapace-abyssale'],active:'carapace-abyssale'},founderGiftClaimed:true}};
const b=await chromium.launch();
const p=await b.newPage({viewport:{width:390,height:844},deviceScaleFactor:2});
p.on('pageerror',e=>console.error('[pageerror]',e.message));
await p.addInitScript(({k,v})=>localStorage.setItem(k,v),{k:'spinforge.save',v:JSON.stringify(SAVE)});
await p.addInitScript(()=>localStorage.setItem('spinforge.onboarded','1'));
// Horloge accélérée : 240 ms virtuelles par image, performance.now branché dessus.
// La simulation avance par pas fixes de 100 ms : ce qu'elle CALCULE est inchangé.
await p.addInitScript(() => {
  let t = 0; const raf = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = (cb) => raf(() => { t += 240; cb(t); });
  const perf = performance.now.bind(performance);
  performance.now = () => t || perf();
});
await p.goto(`http://localhost:${process.env.SPINFORGE_PORT??'5175'}/spinforge/`,{waitUntil:'networkidle'});
await p.waitForTimeout(1200);
const c=p.locator('canvas'); const box=await c.boundingBox();
const cx=box.x+box.width/2, cy=box.y+box.height/2;
await p.mouse.move(cx,cy); await p.mouse.down();
const salle = () => p.evaluate(() => {
  const el = [...document.querySelectorAll('svg[aria-label]')].find(e => /Salle \d+ sur/.test(e.getAttribute('aria-label')));
  return el ? Number(el.getAttribute('aria-label').match(/Salle (\d+)/)[1]) : 0;
});
const want = new Set([5, 10]); const seen = new Set();
for (let i=0;i<900 && seen.size<want.size;i++){
  const a=i*0.5;
  await p.mouse.move(cx+Math.cos(a)*120, cy+Math.sin(a)*120);
  await p.waitForTimeout(30);
  const s = await salle();
  if (want.has(s) && !seen.has(s)) { seen.add(s); await p.waitForTimeout(220); await p.screenshot({path:`${OUT}/w2-salle${s}.png`}); console.log('salle', s); }
}
await p.mouse.up(); await b.close(); console.log('done', [...seen]);
