// quick visual probe: node scripts/look.mjs <w> <h> <name> [steps...]
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');
const [w, h, name, ...steps] = process.argv.slice(2);
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: 1, hasTouch: true, isMobile: true });
p.on('pageerror', (e) => console.log('PAGEERROR', e.message));
p.on('console', (m) => { if (m.type() === 'error') console.log('CONSOLE', m.text()); });
await p.goto('http://localhost:4173/');
await p.waitForTimeout(600);
let n = 0;
for (const s of steps) {
  if (s === 'shot') { await p.screenshot({ path: `shots/tmp/${name}-${n++}.png` }); continue; }
  if (s.startsWith('wait:')) { await p.waitForTimeout(+s.slice(5)); continue; }
  if (s.startsWith('eval:')) { await p.evaluate(s.slice(5)); continue; }
  try { await p.click(s, { timeout: 3000 }); } catch (e) { console.log('MISS', s); }
  await p.waitForTimeout(350);
}
await p.screenshot({ path: `shots/tmp/${name}-${n}.png` });
await b.close();
