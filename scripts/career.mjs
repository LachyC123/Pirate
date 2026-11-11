// Pass 2 progression runs: two different builds each play a fresh pirate through the whole
// Tarwater Docks circuit by tapping the real UI (headless Chromium, iPhone landscape viewport).
// Decisions come from the game's own advisor policy. Animations are sped up by a test-only flag.
// Usage: npm run build && npm run preview, then: npm run career [buildName]
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
const { chromium } = createRequire(import.meta.url)('playwright');
const URL = process.env.DMP_URL ?? 'http://localhost:4173/';
const OUT = 'docs/screens';
mkdirSync(OUT, { recursive: true });

const BUILDS = {
  anchor: {
    name: 'Iron Bess', label: 'Anchor and armour (Might and Grit)',
    attrs: ['grit', 'might', 'grit', 'might', 'grit', 'finesse', 'might', 'grit', 'might', 'grit'],
    // [item, shop]. bought in this order as soon as stocked and affordable
    plan: [['gull_sticker', 'smith'], ['knit_cap', 'armoury'], ['patched_vest', 'armoury'], ['kedge_chain', 'smith'], ['buckler', 'armoury'], ['short_coat', 'armoury'], ['diving_helmet', 'armoury'], ['dockmasters_due', 'smith'], ['tarred_greatcoat', 'armoury']],
    weapons: ['dockmasters_due', 'kedge_chain', 'gull_sticker', 'chipped_hanger'],
  },
  twin: {
    name: 'Quick Wren', label: 'Paired blades (Finesse and Guile)',
    attrs: ['finesse', 'grit', 'finesse', 'guile', 'finesse', 'grit', 'finesse', 'grit', 'finesse', 'grit'],
    plan: [['fishwifes_pair', 'smith'], ['straw_hat', 'armoury'], ['patched_vest', 'armoury'], ['red_bandana', 'armoury'], ['short_coat', 'armoury'], ['tricorn', 'armoury'], ['port_starboard', 'smith']],
    weapons: ['port_starboard', 'tansys_hitches', 'fishwifes_pair', 'chipped_hanger'],
  },
};
/** level at which the bot first tries each cup, then two more friendlies after every failed attempt */
const READY = { tar_bucket: 2, coopers_purse: 4, ropewalk: 5, mooring_night: 7 };
const ORDER = ['tar_bucket', 'coopers_purse', 'ropewalk', 'mooring_night'];

async function run(key) {
  const B = BUILDS[key];
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  const S = () => page.evaluate(() => JSON.parse(JSON.stringify(window.__dmp.S)));
  const tap = async (sel) => {
    try { await page.locator(sel).first().tap({ timeout: 6000 }); }
    catch (e) { await page.screenshot({ path: 'shots/tmp/stuck.png' }); console.log('TAPFAIL', sel, await page.evaluate(() => JSON.stringify({ fan: document.querySelector('.fan')?.outerHTML.slice(0, 600), chain: window.__dmp.S.battle?.chain, me: window.__dmp.S.battle?.f[0], pend: !!window.__dmp.S.pending, screen: window.__dmp.S.screen }))); throw e; }
    await page.waitForTimeout(40);
  };
  const has = (sel) => page.locator(sel).count().then((n) => n > 0);
  const shot = (name) => page.screenshot({ path: `${OUT}/${name}.png` });
  const settle = async () => {
    try { await page.waitForSelector('.fan:not(.empty), .resultpanel [data-leave], .resultpanel [data-next], .resultpanel [data-rematch], .resultpanel [data-retry]', { timeout: 20000 }); }
    catch (e) { await page.screenshot({ path: 'shots/tmp/stuck.png' }); const st = await S(); console.log('STUCK', JSON.stringify({ screen: st.screen, battle: st.battle, result: st.result, errors })); throw e; }
  };
  const rows = [];
  const say = (m) => console.log(`[${key}] ${m}`);

  await page.goto(URL);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForTimeout(600);
  await page.evaluate(() => { window.__dmp.fast = true; });
  await page.fill('input[type=text]', B.name);
  await tap('[data-begin]');
  await tap('[data-close]');

  let attrI = 0;
  const spend = async () => { while (await has('[data-attr]')) await tap(`[data-attr="${B.attrs[attrI++ % B.attrs.length]}"]`); };
  const seen = {};
  async function fight(tag) {
    await settle();
    let turns = 0;
    while (!(await has('.resultpanel'))) {
      const st = await S();
      const b = st.battle, foe = b.f[1];
      const cue = foe.pending ?? (foe.anchor !== null ? 'anchor' : null);
      if (cue && tag && !seen[tag + cue] && (await has('.caption.cue'))) { seen[tag + cue] = true; await page.evaluate(() => { window.__dmp.fast = false; }); await page.waitForTimeout(250); await shot(`p2-${key}-${tag}-${cue}`); await page.evaluate(() => { window.__dmp.fast = true; }); }
      const a = await page.evaluate(() => window.__dmp.advise());
      const k = a.t === 'move' ? 'move:' + a.id : a.t;
      if (k.startsWith('move:') && !(await has(`[data-act="${k}"]`))) await tap('[data-act="attack"]');
      await tap(`[data-act="${k}"]`);
      await settle();
      if (++turns > 200) throw new Error('fight did not end');
    }
    return (await S()).result.win;
  }
  const toHarbour = async () => { await spend(); if (await has('[data-leave]')) await tap('[data-leave]'); await page.waitForTimeout(120); };

  async function shop() {
    // buy the next things on the plan, then make sure the best owned weapon is in hand
    for (;;) {
      const st = await S();
      const next = B.plan.find(([id]) => !st.owned.includes(id));
      if (!next) break;
      const [id, where] = next;
      const info = await page.evaluate((i) => { const d = window.__dmp; return { ok: true, i }; }, id);
      void info;
      await tap(`[data-spot="${where}"]`);
      for (let n = 0; n < 4 && !(await has(`[data-item="${id}"]`)); n++) await tap('[data-more]');
      await tap(`[data-item="${id}"]`);
      const can = await has('[data-buyequip]');
      if (can) {
        const firstArmour = where === 'armoury' && !seen.armoury;
        if (firstArmour) { seen.armoury = true; await shot(`p2-${key}-armoury-fitting`); }
        const isWeapon = B.weapons.includes(id);
        const best = B.weapons.find((w) => st.owned.includes(w) || w === id);
        await tap(isWeapon && best !== id ? '[data-buy]' : '[data-buyequip]');
        say(`bought ${id} (level ${st.level}, ${st.gold} gold before)`);
      }
      await tap('[data-leave]');
      if (!can) break;
    }
    const st = await S();
    const best = B.weapons.find((w) => st.owned.includes(w));
    if (best && st.main !== best) { await tap('[data-tab="sheet"]'); await tap(`[data-equip="${best}"]`); await tap('[data-close]'); }
  }

  const tries = {}; let cooldown = 0, friendlies = 0, guard = 0;
  for (;;) {
    if (++guard > 400) throw new Error('career did not finish');
    let st = await S();
    if (st.titles.length === 4) break;
    await shop();
    st = await S();
    const cup = ORDER.find((t) => !st.titles.includes(t));
    if (st.level >= READY[cup] && cooldown <= 0) {
      tries[cup] = (tries[cup] ?? 0) + 1;
      await tap('[data-spot="arena"]'); await tap('[data-mode="tour"]'); await tap(`[data-tour="${cup}"]`); await tap('[data-enter]');
      let won = true, round = 0;
      for (;;) {
        won = await fight(`${cup}-r${round}`);
        if (!won) break;
        await spend();
        if (await has('[data-next]')) { await tap('[data-next]'); round++; } else break;
      }
      st = await S();
      if (won && st.titles.includes(cup)) {
        await page.waitForSelector('[data-result="prize"] [data-leave]', { timeout: 20000 });
        const row = { cup, attempt: tries[cup], level: st.level, gold: st.gold, friendlies, wins: st.wins, losses: st.losses, weapon: st.main, hat: st.wear.hat, coat: st.wear.coat, off: st.wear.off, attrs: st.attrs };
        rows.push(row);
        say(`WON ${cup} on attempt ${tries[cup]}: level ${st.level}, ${st.gold} gold, ${friendlies} friendlies so far, ${st.main}`);
        if (cup === 'mooring_night') await shot(`p2-${key}-mooring-reward`);
      } else { say(`lost ${cup} attempt ${tries[cup]} in round ${round + 1} (level ${st.level})`); cooldown = 2; }
      await toHarbour();
    } else {
      await tap('[data-spot="arena"]'); await tap('[data-mode="friendly"]'); await tap('[data-fight]');
      const t0 = Date.now(); const w = await fight(null); say(`friendly ${w ? 'won' : 'lost'} in ${Date.now() - t0}ms`);
      friendlies++; cooldown--;
      await toHarbour();
    }
  }
  await page.evaluate(() => { window.__dmp.fast = false; });
  await page.waitForTimeout(300);
  await shot(`p2-${key}-harbour-circuit-complete`);
  const fin = await S();
  await browser.close();
  return { key, label: B.label, rows, final: { level: fin.level, gold: fin.gold, wins: fin.wins, losses: fin.losses, owned: fin.owned, main: fin.main, wear: fin.wear, attrs: fin.attrs }, errors };
}

const which = process.argv[2] ? [process.argv[2]] : Object.keys(BUILDS);
const results = [];
for (const k of which) results.push(await run(k));
let fail = false;
for (const r of results) {
  console.log(`\n== ${r.label} ==`);
  for (const row of r.rows) console.log(`  ${row.cup.padEnd(14)} attempt ${row.attempt}  level ${row.level}  gold ${String(row.gold).padStart(3)}  friendlies ${String(row.friendlies).padStart(2)}  ${row.weapon}  hat:${row.hat ?? '-'} coat:${row.coat ?? '-'} off:${row.off ?? '-'}`);
  console.log(`  final: level ${r.final.level}, ${r.final.wins} wins, ${r.final.losses} losses, attrs ${JSON.stringify(r.final.attrs)}, errors: ${r.errors.length ? r.errors.slice(0, 2).join(' | ') : 'none'}`);
  const ok = r.rows.some((x) => x.cup === 'mooring_night') && r.errors.length === 0;
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  beat Mother Mooring with ${r.final.main}`);
  if (!ok) fail = true;
}
writeFileSync('docs/progression.json', JSON.stringify(results, null, 1));
if (fail) process.exitCode = 1;
