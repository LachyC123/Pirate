import Phaser from 'phaser';
import { ARMOURY_STOCK, FAMILY_INFO, MOVES, OFF_BUSY, SMITH_STOCK, TOURS, WEAPONS, WEARS, WearDef } from '../core/data';
import { sheetStats } from '../core/battle';
import { buy, canStock, effAttrs, equip, goto, isEquipped, lockedKit, lookOf, offDraw, stockGate, unequip } from '../core/game';
import { L, S, btn, commit, go, h, ico, mount, place, tex, ui } from '../app';
import { PEG_H, PEG_W, peg, shopInterior, thimble, wearIcon } from '../art/scenes';
import { weaponSprite } from '../art/fighter';
import { P, Pix } from '../art/pix';
import { Actor } from './actor';
import { moveRow, topbar } from '../ui/common';
import { sfx } from '../sfx';

let sel: string | null = null;
let page = 0;
let said = '';
let lastKind = '';

const SLOT_NAME = { hat: 'Hat', coat: 'Coat', off: 'Off hand' };
export function wearEffects(w: WearDef): string[] {
  const out: string[] = [];
  if (w.hp) out.push(`${w.hp > 0 ? '+' : ''}${w.hp} health`);
  if (w.st) out.push(`${w.st > 0 ? '+' : ''}${w.st} stamina`);
  for (const [k, v] of Object.entries(w.attr ?? {})) out.push(`+${v} ${k[0].toUpperCase() + k.slice(1)}`);
  if (w.soak) out.push(`every hit on you lands ${w.soak} lighter`);
  if (w.guard) out.push(`blocks ${w.guard} more when braced`);
  if (w.move) out.push(`off-hand move: ${MOVES[w.move].name}`);
  return out;
}

export class Shop extends Phaser.Scene {
  constructor() { super('Shop'); }
  create(): void {
    const kind = S.shop;
    if (lastKind !== kind) { sel = null; page = 0; said = ''; lastKind = kind; }
    const smith = kind === 'smith';
    const si = shopInterior(L.W, kind);
    this.add.image(0, 0, tex(this, 'bg', si.pix)).setOrigin(0);
    const bust = smith ? peg : thimble;
    const frames = [0, 1, 2, 3, 4, 5, 6, 7, 8].map((f) => tex(this, 'm' + f, bust(f)));
    tex(this, 'mtalk', bust(0, true));
    const mImg = this.add.image(si.merchant[0], si.merchant[1] + (smith ? 4 : 10), frames[0]).setOrigin(40 / PEG_W, 1);
    void PEG_H;
    let f = 0, talking = 0;
    this.time.addEvent({ delay: smith ? 260 : 200, loop: true, callback: () => { f++; mImg.setTexture(talking-- > 0 && f % 2 ? 'mtalk' : frames[f % 9]); } });
    const stock = smith ? SMITH_STOCK : ARMOURY_STOCK;
    const pages = Math.ceil(stock.length / 4);
    page = Math.min(page, pages - 1);
    const items = stock.slice(page * 4, page * 4 + 4);
    const nameOf = (id: string) => (WEAPONS[id] ?? WEARS[id]).name;
    const priceOf = (id: string) => (WEAPONS[id] ?? WEARS[id]).price;
    const slotImgs: Phaser.GameObjects.Image[] = [];
    const glow = this.add.rectangle(0, 0, 10, 10, P.brass, 0.35).setOrigin(0).setVisible(false);
    items.forEach((id, i) => {
      const sl = si.rack[i];
      let big: Pix;
      if (WEAPONS[id]) {
        const ws = weaponSprite(WEAPONS[id].sprite), sc = 2;
        big = new Pix(Math.max(ws.pix.w, ws.pix.h) * sc + 4, Math.max(ws.pix.w, ws.pix.h) * sc + 4);
        const tmp = new Pix(ws.pix.w * sc, ws.pix.h * sc); tmp.blit(ws.pix, 0, 0, false, sc);
        big.blitRot(tmp, ws.gx * sc, ws.gy * sc, big.w / 2, big.h - 8 * sc, -90);
      } else { const w = WEARS[id]; big = wearIcon(w.slot, w.draw, w.color, sl.w >= 46 ? 2 : 1); }
      if (!canStock(S, id) && !S.owned.includes(id)) big.each((x, y, c) => (c >= 0 && c !== P.ink ? 0x6b7fa8 : c));
      slotImgs.push(this.add.image(sl.x + sl.w / 2, sl.y + sl.h - 8, tex(this, 'rack' + i, big)).setOrigin(0.5, 1));
    });
    const actor = new Actor(this, lookOf(S), S.main, false, si.preview[0], si.preview[1]);
    actor.off = offDraw(S); actor.rest = 'cheer'; actor.busy = true; actor.set('show');
    const say = (t: string) => { said = t; talking = 8; const b = ui().querySelector('.bubble'); if (b) b.textContent = t; };
    if (!said) said = smith ? (S.owned.length > 1 ? 'Back again. Something caught your eye?' : 'Peg Mallory. I sell steel, and I test every piece. Touch what you like.') : 'Ezra Thimble. Hats, coats, and something for the other hand.';

    const drawer = h('div.drawer', null);
    const preview = (id: string | null) => {
      const look = lookOf(S); let weapon = S.main, off = offDraw(S);
      if (id && WEAPONS[id]) { weapon = id; off = offDraw(S, id); }
      else if (id && WEARS[id]) { const w = WEARS[id]; if (w.slot === 'hat') look.hat = w.draw; else if (w.slot === 'coat') { look.coat = w.draw; look.coatColor = w.color; } else off = OFF_BUSY.includes(WEAPONS[S.main].family) ? off : w.draw; }
      actor.look = look; actor.setWeapon(weapon, off);
    };
    const select = (id: string, quiet = false) => {
      sel = id;
      const i = items.indexOf(id);
      if (i >= 0) { const sl = si.rack[i]; glow.setPosition(sl.x, sl.y).setSize(sl.w, sl.h).setVisible(true); slotImgs.forEach((im, j) => this.tweens.add({ targets: im, y: si.rack[j].y + si.rack[j].h - 8 - (j === i ? 4 : 0), duration: 120 })); }
      else glow.setVisible(false);
      preview(id);
      const price = priceOf(id), gate = stockGate(id);
      if (!quiet) {
        sfx(smith ? 'steel' : 'cloth');
        if (S.owned.includes(id)) say(smith ? (id === 'chipped_hanger' ? 'Your own hanger. I would not sell that to a man I disliked.' : 'Already yours. Looks better in your hand than on my wall.') : 'That one is yours already. I remember every seam.');
        else if (!canStock(S, id)) say(smith ? `Not for sale yet. Win ${TOURS[gate!].name} and I will know you can pay for the funeral.` : `I only cut that for champions. Win ${TOURS[gate!].name} first.`);
        else if (S.gold < price) say(smith ? `That one's ${price} gold. ${price - 1} if you bring back my finger.` : `${price} gold. I do not haggle, I only measure.`);
        else say(smith ? `${nameOf(id)}. ${price} gold and it leaves with you.` : `${nameOf(id)}, ${price} gold. It will fit. They always fit.`);
      }
      renderDrawer();
      ui().querySelectorAll('.slot').forEach((e) => e.classList.toggle('on', (e as HTMLElement).dataset.item === id));
    };
    const renderDrawer = () => {
      if (!sel) { drawer.replaceChildren(h('p.small', null, smith ? 'Tap a weapon on the rack to inspect it.' : 'Tap a piece on the rack to try it on.')); return; }
      const id = sel, w = WEAPONS[id], x = WEARS[id], price = priceOf(id), gate = stockGate(id);
      const owned = S.owned.includes(id), worn = isEquipped(S, id), stocked = canStock(S, id), short = price - S.gold, locked = lockedKit(S);
      const after = (ok: boolean, line: string) => { if (ok) { sfx('buy'); commit(); said = line; go(); } else sfx('deny'); };
      const A = effAttrs(S);
      const body: (HTMLElement | null)[] = [];
      if (w) {
        const cur = WEAPONS[S.main];
        const gained = w.moves.filter((m) => !cur.moves.includes(m)), lost = cur.moves.filter((m) => !w.moves.includes(m)), kept = w.moves.filter((m) => cur.moves.includes(m));
        const changes = kept.map((m) => { const a = sheetStats(A, S.main, m), b = sheetStats(A, id, m); return MOVES[m].dmg && a.lo !== b.lo ? `${MOVES[m].name} ${a.lo}–${a.hi} → ${b.lo}–${b.hi}` : ''; }).filter(Boolean);
        body.push(h('div.small', null, `${FAMILY_INFO[w.family].name}. ${FAMILY_INFO[w.family].trick}`), h('div.small.blurb', null, w.blurb),
          OFF_BUSY.includes(w.family) && S.wear.off ? h('div.small.lose', null, `Fills both hands: your ${WEARS[S.wear.off].name} stays on your belt.`) : null,
          id === S.main ? h('div.small', null, 'This is what you are holding.') : h('div.cmp', null, h('div.small.lab', null, `Compared with your ${cur.name}:`),
            ...gained.map((m) => moveRow(A, id, m, 'gain')),
            lost.length ? h('div.small.lose', null, '− Loses ' + lost.map((m) => MOVES[m].name).join(', ')) : null,
            ...changes.map((c) => h('div.small.gain', null, c)),
            !gained.length && !lost.length && !changes.length ? h('div.small', null, 'Same moves, same numbers.') : null));
      } else {
        const cur = S.wear[x.slot] ? WEARS[S.wear[x.slot]!] : null;
        body.push(h('div.small', null, `${SLOT_NAME[x.slot]}. ${wearEffects(x).join(', ')}.`), h('div.small.blurb', null, x.blurb),
          x.move ? moveRow(A, S.main, x.move, 'gain') : null,
          x.slot === 'off' && OFF_BUSY.includes(WEAPONS[S.main].family) ? h('div.small.lose', null, `Your ${WEAPONS[S.main].name} fills both hands, so this waits on your belt until you change weapon.`) : null,
          worn ? null : h('div.small.lab', null, cur ? `Replaces your ${cur.name} (${wearEffects(cur).join(', ')}).` : `Your ${SLOT_NAME[x.slot].toLowerCase()} slot is empty${x.slot === 'off' ? ': you Cuff with a bare fist' : ''}.`));
      }
      drawer.replaceChildren(...([
        h('div.dhead', null, h('b.wname', null, nameOf(id)), owned ? h('span.tag', null, worn ? (w ? 'In hand' : 'Worn') : 'Owned') : h('span.price', { 'data-price': price }, ico('gold'), String(price))),
        h('div.actions', null,
          locked ? h('div.small.warn', null, 'Loadout is locked during a tournament.')
            : owned ? (worn ? (x ? btn('Take off', () => after(unequip(S, x.slot), 'Off it comes.'), '', { 'data-unequip': id }) : null) : btn(w ? 'Equip' : 'Wear', () => after(equip(S, id), smith ? 'Suits you. Try not to bleed on it.' : 'There. Like it grew on you.'), 'brass', { 'data-equip': id }))
            : !stocked ? h('div.small.warn', null, `Stock opens after ${TOURS[gate!].name}.`)
            : short > 0 ? h('div.small.warn', { 'data-short': short }, `You need ${short} more gold. A friendly win pays about ${11 + S.level * 2 - 1}.`)
            : h('div.row', null, btn(w ? 'Buy & Equip' : 'Buy & Wear', () => after(buy(S, id, true), smith ? 'Sold. First fight will tell you what it wants.' : 'Sold, and fitted.'), 'brass', { 'data-buyequip': id }), btn('Buy', () => after(buy(S, id), 'Sold. It is in your kit.'), '', { 'data-buy': id }))),
        ...body] as (HTMLElement | null)[]).filter((e): e is HTMLElement => !!e));
    };
    mount(topbar(),
      h('div.bubble', null, said),
      ...items.map((id, i) => { const sl = si.rack[i]; const e = place(btn(h('span.slotname', null, nameOf(id).replace(/^(Borrowed|Brass|Patched|Tarred|Hatch-Cover|Storm|Red|Knit|Straw|Belaying) /, '').split(' ').slice(-1)[0]), () => select(id), 'slot', { 'data-item': id, 'aria-label': nameOf(id) }), sl.x, sl.y); e.style.width = sl.w * L.scale + 'px'; e.style.height = sl.h * L.scale + 'px'; return e; }),
      pages > 1 ? place(btn(page + 1 < pages ? `More items ▸ (${page + 1}/${pages})` : '◂ First rack', () => { page = (page + 1) % pages; sel = null; go(); }, 'small more', { 'data-more': '1' }), si.rack[0].x, si.rack[0].y + si.rack[0].h + 3) : null,
      btn('◂ Harbour', () => { sel = null; page = 0; said = ''; goto(S, 'harbour'); go(); }, 'leave', { 'data-leave': '1' }),
      drawer);
    if (sel && items.includes(sel)) select(sel, true); else { sel = null; renderDrawer(); }
  }
}
/** jump the rack to the page holding an item (used by tests and deep links) */
export function shopPageFor(id: string, kind: 'smith' | 'armoury'): void { const st = kind === 'smith' ? SMITH_STOCK : ARMOURY_STOCK; const i = st.indexOf(id); if (i >= 0) page = Math.floor(i / 4); }
