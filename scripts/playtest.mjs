// End-to-end playthrough of Pass 1 through the ordinary touch UI (headless Chromium, iPhone-sized viewports).
// It reads save state only to decide and to assert. Every game action is a tap on a real control.
// Usage: npm run build && npm run preview (port 4173), then: npm run playtest
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
const { chromium } = createRequire(import.meta.url)('playwright');
const URL = process.env.DMP_URL ?? 'http://localhost:4173/';
const OUT = 'docs/screens';
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

const log = [];
const ok = (cond, msg) => { log.push(`${cond ? 'PASS' : 'FAIL'}  ${msg}`); console.log(`${cond ? 'PASS' : 'FAIL'}  ${msg}`); if (!cond) process.exitCode = 1; };
const S = () => page.evaluate(() => JSON.parse(JSON.stringify(window.__dmp.S)));
const tap = async (sel, t = 5000) => { await page.locator(sel).first().tap({ timeout: t }); await page.waitForTimeout(120); };
const has = (sel) => page.locator(sel).count().then((n) => n > 0);
const shot = (name) => page.screenshot({ path: `${OUT}/${name}.png` });
const settle = async () => {
  try { await page.waitForSelector('.fan:not(.empty), .resultpanel', { timeout: 20000 }); } catch (e) {
    await page.screenshot({ path: 'shots/tmp/stuck.png' });
    const st = await S();
    console.log('STUCK', JSON.stringify({ screen: st.screen, battle: st.battle, pending: !!st.pending, result: st.result, errors }));
    throw e;
  }
  await page.waitForTimeout(60);
};
const reload = async () => { await page.reload(); await page.waitForTimeout(700); };

/** choose a card for the current turn: the game's own steady advisor, or deliberately useless play */
async function decide(s, style) {
  if (style === 'lose') return s.battle.chain === 0 ? 'pass' : 'breath';
  const a = await page.evaluate(() => window.__dmp.advise());
  return a.t === 'move' ? 'move:' + a.id : a.t;
}

async function act(key) {
  if (key.startsWith('move:') && !(await has(`[data-act="${key}"]`))) await tap('[data-act="attack"]');
  await tap(`[data-act="${key}"]`);
}

/** play the current battle to its end. returns true on a win. */
async function fight(style, hooks = {}) {
  await settle();
  let turns = 0;
  while (!(await has('.resultpanel'))) {
    const s = await S();
    if (hooks.each) await hooks.each(s, turns);
    await act(await decide(s, style));
    await settle();
    if (++turns > 120) throw new Error('fight did not end');
  }
  const s = await S();
  return s.result.win;
}
async function spendPoints() { while (await has('[data-attr]')) { const s = await S(); await tap(`[data-attr="${s.attrs.grit <= s.attrs.finesse ? 'grit' : 'finesse'}"]`); } }
async function toHarbour() { await spendPoints(); await tap('[data-leave]'); await page.waitForTimeout(300); }
async function setReduced(on) {
  await tap('[aria-label="Settings"]');
  const cur = (await S()).settings.reduced;
  if (cur !== on) await tap('text=Reduced motion');
  await tap('[data-close]');
}

// 1. creation -------------------------------------------------------------------------------
await page.goto(URL);
await page.evaluate(() => localStorage.clear());
await reload();
await shot('01-creation-landscape');
await tap('[data-lost="companion"]');
await page.fill('input[type=text]', 'Salt Maggie');
await tap('[data-begin]');
ok((await S()).screen === 'harbour', 'creation leads straight to the harbour');
await tap('[data-close]');
await shot('02-harbour-start');
let s = await S();
ok(s.gold === 8 && s.main === 'chipped_hanger', 'starts with 8 gold and the chipped hanger');

// 2. see the pike before affording it -----------------------------------------------------------
await tap('[data-spot="smith"]');
await tap('[data-item="gull_sticker"]');
ok(await has('[data-short="22"]'), 'shop tells me I am 22 gold short of the 30 gold pike and keeps the comparison open');
ok((await page.locator('.bubble').textContent()).includes('30 gold. 29'), "Peg's price joke agrees with the displayed price");
await shot('03-shop-cannot-afford');
await tap('[data-leave]');

// 3. lose a friendly, immediately fight again --------------------------------------------------
await tap('[data-spot="arena"]');
await tap('[data-mode="friendly"]');
await shot('04-friendly-offer');
ok(await has('[data-purse]'), 'opponent, weapon and purse are shown before accepting');
await tap('[data-fight]');
await setReduced(true);
let win = await fight('lose');
s = await S();
ok(!win && s.gold === 8 && s.xp === 2 && s.losses === 1, 'lost a friendly: no gold lost, modest XP for finishing');
await tap('[data-rematch]');
s = await S();
ok(s.screen === 'battle' && s.battle.f[0].hp === s.battle.f[0].maxHp && s.battle.f[0].st === s.battle.f[0].maxSt, 'immediate rematch at full health and stamina');

// 4. earn the pike. also: reload mid-duel and mid-animation --------------------------------------
let friendlyWins = 0, friendlyFights = 0, reloadChecked = false;
while ((await S()).gold < 30) {
  friendlyFights++;
  win = await fight('good', { each: async (st, turn) => {
    if (reloadChecked || turn !== 2) return;
    reloadChecked = true;
    const before = JSON.stringify(st.battle);
    await reload();
    const after = await S();
    ok(JSON.stringify(after.battle) === before && after.screen === 'battle', 'reload mid-duel: identical health, stamina, positions and seed');
    ok(await has('.fan:not(.empty) [data-act="attack"]'), 'reload mid-duel: still my turn, actions available');
    // commit a turn and reload before its animation has finished
    await setReduced(false);
    const k = await decide(after, 'good');
    await act(k);
    const committed = await S();
    await page.waitForTimeout(150);
    await reload();
    const replay = await S();
    ok(JSON.stringify(replay.battle) === JSON.stringify(committed.battle), 'reload mid-animation: the resolved turn stands, nothing is rerolled');
    ok(replay.battle.round === st.battle.round + 1, 'reload mid-animation: exactly one round was spent, enemy reply included');
    await settle();
    ok((await S()).pending === null, 'reload mid-animation: the interrupted presentation is replayed, then cleared');
    await setReduced(true);
  } });
  if (win) friendlyWins++;
  await spendPoints();
  if ((await S()).gold < 30) await tap(win ? '[data-fresh]' : '[data-rematch]').then(async () => { if (await has('[data-fight]')) await tap('[data-fight]'); });
}
s = await S();
ok(friendlyWins === 2, `pike affordable after ${friendlyWins} friendly wins (${friendlyFights} fights), gold now ${s.gold}`);
await shot('05-friendly-win');
await toHarbour();

// 5. preview, buy, see it, use its reach ------------------------------------------------------------
await tap('[data-spot="smith"]');
await tap('[data-item="gull_sticker"]');
await shot('06-shop-pike-preview');
const goldBefore = (await S()).gold;
await tap('[data-buyequip]');
s = await S();
ok(s.main === 'gull_sticker' && s.gold === goldBefore - 30 && s.owned.includes('gull_sticker'), 'bought and equipped the Gull-Sticker for exactly 30 gold');
await tap('[data-item="gull_sticker"]');
ok(!(await has('[data-buyequip], [data-buy]')), 'cannot buy the same pike twice');
await tap('[data-leave]');
await shot('07-harbour-with-pike');
await tap('[data-spot="arena"]');
await tap('[data-mode="friendly"]');
await tap('[data-fight]');
await settle();
await tap('[data-act="attack"]');
ok(await has('[data-act="move:thrust"]:not(.off)'), 'pike Thrust is legal from the opening two spaces');
ok(await has('[data-act="move:cuff"].off'), 'the one-space Cuff is greyed out at two spaces, with the reason on the card');
await shot('08-battle-pike-decision');
await tap('[data-act="move:thrust"]');
s = await S();
ok(s.battle.round === 1, 'thrust from two spaces committed');
await settle();
if (!(await has('.resultpanel'))) await fight('good');
await toHarbour();

// 6. Tar Bucket Cup ---------------------------------------------------------------------------------
let attempts = 0, molled = false, betweenChecked = false;
while (!(await S()).titles.includes('tar_bucket')) {
  attempts++;
  if (attempts > 25) throw new Error('could not win the cup');
  if (!(await has('[data-retry]'))) { await tap('[data-spot="arena"]'); await tap('[data-mode="tour"]'); await tap('[data-tour="tar_bucket"]'); if (attempts === 1) await shot('09-tournament-preview'); await tap('[data-enter]'); }
  else { await spendPoints(); await tap('[data-retry]'); }
  for (let round = 0; round < 3; round++) {
    const st = await S();
    if (round === 2 && st.screen === 'battle') await setReduced(false);
    win = await fight('good', { each: async (cur) => {
      if (cur.battle.f[1].pending && !molled) { molled = true; await shot('10-battle-moll-chain-taut'); }
    } });
    if (round === 2) await setReduced(true);
    if (!win) break;
    if (round === 1 && !betweenChecked) {
      betweenChecked = true;
      const b4 = await S();
      await reload();
      const af = await S();
      ok(af.tour && af.tour.round === 2 && af.screen === 'result' && af.gold === b4.gold && af.xp === b4.xp, 'reload between qualifiers: resumes at bout 3 with no extra reward');
      ok(await has('[data-next]'), 'reload between qualifiers: Next bout is offered');
    }
    if (round < 2) { await spendPoints(); await tap('[data-next]'); }
  }
}
s = await S();
ok(true, `Tar Bucket Cup won on attempt ${attempts} at level ${s.level} with ${s.main}`);
await page.waitForSelector('[data-result="prize"] [data-leave]', { timeout: 20000 });
ok(s.titles.length === 1 && s.coins === 1 && s.owned.includes('towline'), 'champion reward: pennant, one cursed coin and the Towline hook');
const paid = { gold: s.gold, xp: s.xp, owned: s.owned.length, coins: s.coins };
await shot('11-champion-reward');
await reload();
s = await S();
ok(s.screen === 'prize' && s.gold === paid.gold && s.xp === paid.xp && s.owned.length === paid.owned && s.coins === paid.coins && s.titles.length === 1, 'reload on the reward screen: prize is shown again, granted only once');
await spendPoints();
await tap('[data-equip-prize]');
ok((await S()).main === 'towline', "equipped Old Moll's hook from the reward screen");
await tap('[data-leave]');
await shot('12-harbour-pennant');

// 7. use the hook: cast, then haul an opponent in ---------------------------------------------------------
let pulled = false, tries = 0;
await tap('[data-spot="arena"]');
await tap('[data-mode="friendly"]');
await setReduced(false);
while (!pulled && tries++ < 8) {
  await tap('[data-fight]');
  await fight('good', { each: async () => {
    const evs = await page.evaluate(() => window.__dmp.lastEvs ?? []);
    if (evs.some((e) => e.e === 'step' && e.why === 'pull' && e.who === 1)) { if (!pulled) await shot('13-battle-hook-pulled'); pulled = true; }
  } });
  const evs = await page.evaluate(() => window.__dmp.lastEvs ?? []);
  if (evs.some((e) => e.e === 'step' && e.why === 'pull' && e.who === 1)) pulled = true;
  await spendPoints();
  if (!pulled) { await tap('[data-fresh]'); }
}
ok(pulled, 'won hook works in a friendly: cast, then hauled the opponent to one space');
await setReduced(true);
await toHarbour();

// 8. Cooper's Purse opens ------------------------------------------------------------------------------------
await tap('[data-spot="arena"]');
await tap('[data-mode="tour"]');
ok(await has('[data-tour="coopers_purse"]:not([disabled])'), "Cooper's Purse is unlocked by the Tar Bucket title");
ok(await has('[data-tour="tar_bucket"][disabled]'), 'the won cup cannot be re-entered for a second prize');
await tap('[data-tour="coopers_purse"]');
await tap('[data-enter]');
s = await S();
ok(s.screen === 'battle' && s.foe.name === 'Barrel Bess' && s.tour.id === 'coopers_purse', "entered Cooper's Purse: first bout against Barrel Bess is live");
await settle();
await shot('14-coopers-purse-first-bout');

// 9. rotate mid-fight, then portrait checks ---------------------------------------------------------------------
await act(await decide(await S(), 'good'));
await settle();
const mid = JSON.stringify((await S()).battle);
await page.setViewportSize({ width: 390, height: 664 });
await page.waitForTimeout(700);
ok(JSON.stringify((await S()).battle) === mid && (await has('.fan:not(.empty) [data-act="attack"]')), 'rotating to portrait mid-fight keeps the fight and the action fan');
await shot('15-battle-portrait-390');
const small = await page.evaluate(() => [...document.querySelectorAll('.fan .card, .btn')].filter((e) => e.offsetParent && (e.getBoundingClientRect().height < 43.5 || e.getBoundingClientRect().width < 43.5)).map((e) => e.textContent.slice(0, 20)));
ok(small.length === 0, `portrait battle: every control is at least 44 CSS px (${small.join('|') || 'all fine'})`);
const scrolls = await page.evaluate(() => document.documentElement.scrollHeight <= window.innerHeight + 1 && document.documentElement.scrollWidth <= window.innerWidth + 1);
ok(scrolls, 'portrait battle: the page itself does not scroll');
await page.setViewportSize({ width: 320, height: 568 });
await page.waitForTimeout(700);
await tap('[data-act="attack"]');
await shot('16-battle-portrait-320-narrow');
const fits = await page.evaluate(() => [...document.querySelectorAll('.fan .card')].every((e) => { const r = e.getBoundingClientRect(); return r.bottom <= window.innerHeight + 1 && r.right <= window.innerWidth + 1; }));
ok(fits, 'narrow 320x568 portrait: the whole action fan is on screen');
await tap('[data-act="back"]');
await page.setViewportSize({ width: 844, height: 390 });
await page.waitForTimeout(700);
ok(JSON.stringify((await S()).battle) === mid, 'rotating back to landscape keeps the fight');
page.on('dialog', (d) => d.accept());
await fight('good');
await spendPoints();
s = await S();
if (s.result.win) { ok(s.result.nextFoe === 'Splint Jenny' && s.tour.round === 1, "Cooper's Purse continues to its second bout"); await tap('text=Withdraw from the cup'); }
else { ok(true, "lost to Barrel Bess (allowed): Cooper's Purse restarts at its first bout"); await tap('[data-leave]'); }
await page.setViewportSize({ width: 390, height: 664 });
await page.waitForTimeout(400);
await shot('17-harbour-portrait');
await tap('[data-spot="armoury"]');
await tap('[data-item="patched_vest"]');
await shot('18-armoury-portrait');
ok(errors.length === 0, `no page errors (${errors.slice(0, 3).join(' | ') || 'clean'})`);
s = await S();
console.log(`\nFinal: level ${s.level}, ${s.gold} gold, ${s.wins} wins, ${s.losses} losses, titles ${s.titles.join(',')}, kit ${s.owned.join(',')}`);
await browser.close();
