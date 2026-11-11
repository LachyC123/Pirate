import Phaser from 'phaser';
import { FAMILY_INFO, MOVES, SMITH_STOCK, TOURS, WEAPONS } from '../core/data';
import { sheetStats } from '../core/battle';
import { buy, canStock, equip, goto } from '../core/game';
import { L, S, btn, commit, go, h, ico, mount, place, tex, ui } from '../app';
import { PEG_H, PEG_W, peg, shopInterior } from '../art/scenes';
import { weaponSprite } from '../art/fighter';
import { P, Pix } from '../art/pix';
import { Actor } from './actor';
import { moveRow, topbar } from '../ui/common';
import { sfx } from '../sfx';

let sel: string | null = null;
let page = 0;
let said = '';

export class Shop extends Phaser.Scene {
  constructor() { super('Shop'); }
  create(): void {
    const si = shopInterior(L.W);
    this.add.image(0, 0, tex(this, 'bg', si.pix)).setOrigin(0);
    // merchant with a small idle: the balanced blade wobbles, she blinks
    const frames = [0, 1, 2, 3, 4, 5, 6, 7, 8].map((f) => tex(this, 'peg' + f, peg(f)));
    tex(this, 'pegtalk', peg(0, true));
    const pegImg = this.add.image(si.merchant[0], si.merchant[1], frames[0]).setOrigin(40 / PEG_W, 1);
    let f = 0, talking = 0;
    this.time.addEvent({ delay: 260, loop: true, callback: () => { f++; pegImg.setTexture(talking-- > 0 && f % 2 ? 'pegtalk' : frames[f % 9]); } });
    const stock = SMITH_STOCK;
    const pages = Math.ceil(stock.length / 4);
    page = Math.min(page, pages - 1);
    const items = stock.slice(page * 4, page * 4 + 4);
    const slotImgs: Phaser.GameObjects.Image[] = [];
    const glow = this.add.rectangle(0, 0, 10, 10, P.brass, 0.35).setOrigin(0).setVisible(false);
    items.forEach((id, i) => {
      const w = WEAPONS[id], ws = weaponSprite(w.sprite), sl = si.rack[i];
      const sc = sl.h > 100 && w.len < 20 ? 3 : 2;
      const big = new Pix(Math.max(ws.pix.w, ws.pix.h) * sc + 4, Math.max(ws.pix.w, ws.pix.h) * sc + 4);
      const tmp = new Pix(ws.pix.w * sc, ws.pix.h * sc); tmp.blit(ws.pix, 0, 0, false, sc);
      big.blitRot(tmp, ws.gx * sc, ws.gy * sc, big.w / 2, big.h - 8 * sc, -90);
      if (!canStock(S, id) && !S.owned.includes(id)) big.each((x, y, c) => (c >= 0 && c !== P.ink ? 0x6b7fa8 : c));
      const img = this.add.image(sl.x + sl.w / 2, sl.y + sl.h - 6, tex(this, 'rack' + i, big)).setOrigin(0.5, 1);
      slotImgs.push(img);
    });
    const actor = new Actor(this, S.look, S.main, false, si.preview[0], si.preview[1]);
    actor.rest = 'cheer'; actor.busy = true; actor.set('show');
    const say = (t: string) => { said = t; talking = 8; const b = ui().querySelector('.bubble'); if (b) b.textContent = t; };
    if (!said) said = S.owned.length > 1 ? 'Back again. Something caught your eye?' : "Peg Mallory. I sell steel, and I test every piece. Touch what you like.";

    const drawer = h('div.drawer', null);
    const select = (id: string, quiet = false) => {
      sel = id;
      const i = items.indexOf(id);
      if (i >= 0) { const sl = si.rack[i]; glow.setPosition(sl.x, sl.y).setSize(sl.w, sl.h).setVisible(true); slotImgs.forEach((im, j) => this.tweens.add({ targets: im, y: si.rack[j].y + si.rack[j].h - 6 - (j === i ? 4 : 0), duration: 120 })); }
      else glow.setVisible(false);
      actor.setWeapon(id);
      const w = WEAPONS[id];
      if (!quiet) {
        sfx('steel');
        if (S.owned.includes(id)) say(id === 'chipped_hanger' ? 'Your own hanger. I would not sell that to a man I disliked.' : 'Already yours. Looks better in your hand than on my wall.');
        else if (!canStock(S, id)) say(`Not for sale yet. Win ${TOURS[w.stockAfter!].name} and I will know you can pay for the funeral.`);
        else if (S.gold < w.price) say(`That one's ${w.price} gold. ${w.price - 1} if you bring back my finger.`);
        else say(`${w.name}. ${w.price} gold and it leaves with you.`);
      }
      renderDrawer();
      ui().querySelectorAll('.slot').forEach((e) => e.classList.toggle('on', (e as HTMLElement).dataset.item === id));
    };
    const renderDrawer = () => {
      if (!sel) { drawer.replaceChildren(h('p.small', null, 'Tap a weapon on the rack to inspect it.')); return; }
      const w = WEAPONS[sel], cur = WEAPONS[S.main];
      const owned = S.owned.includes(sel), stocked = canStock(S, sel), short = w.price - S.gold;
      const gained = w.moves.filter((m) => !cur.moves.includes(m)), lost = cur.moves.filter((m) => !w.moves.includes(m)), kept = w.moves.filter((m) => cur.moves.includes(m));
      const changes = kept.map((m) => { const a = sheetStats(S.attrs, S.main, m), b = sheetStats(S.attrs, sel!, m); return MOVES[m].dmg && a.lo !== b.lo ? `${MOVES[m].name} ${a.lo}–${a.hi} → ${b.lo}–${b.hi}` : ''; }).filter(Boolean);
      const after = (ok: boolean, line: string) => { if (ok) { sfx('buy'); commit(); said = line; go(); } else sfx('deny'); };
      drawer.replaceChildren(
        h('div.dhead', null, h('b.wname', null, w.name), owned ? h('span.tag', null, S.main === sel ? 'In hand' : 'Owned') : h('span.price', { 'data-price': w.price }, ico('gold'), String(w.price))),
        h('div.actions', null,
          owned ? (S.main === sel ? null : btn('Equip', () => after(equip(S, sel!), 'Suits you. Try not to bleed on it.'), 'brass', { 'data-equip': sel }))
            : !stocked ? h('div.small.warn', null, `Stock opens after ${TOURS[w.stockAfter!].name}.`)
            : short > 0 ? h('div.small.warn', { 'data-short': short }, `You need ${short} more gold. A friendly win pays about 12.`)
            : h('div.row', null, btn('Buy & Equip', () => after(buy(S, sel!, true), 'Sold. First fight will tell you what it wants.'), 'brass', { 'data-buyequip': sel }), btn('Buy', () => after(buy(S, sel!), 'Sold. It is in your kit.'), '', { 'data-buy': sel }))),
        h('div.small', null, `${FAMILY_INFO[w.family].name}. ${FAMILY_INFO[w.family].trick}`),
        h('div.small.blurb', null, w.blurb),
        sel === S.main ? h('div.small', null, 'This is what you are holding.') : h('div.cmp', null, h('div.small.lab', null, `Compared with your ${cur.name}:`),
          ...gained.map((m) => moveRow(S.attrs, sel!, m, 'gain')),
          lost.length ? h('div.small.lose', null, '− Loses ' + lost.map((m) => MOVES[m].name).join(', ')) : null,
          ...changes.map((c) => h('div.small.gain', null, c)),
          !gained.length && !lost.length && !changes.length ? h('div.small', null, 'Same moves, same numbers.') : null),
      );
    };
    mount(topbar(),
      h('div.bubble', null, said),
      ...items.map((id, i) => { const sl = si.rack[i]; const e = place(btn(h('span.slotname', null, WEAPONS[id].name.split(' ').slice(-1)[0]), () => select(id), 'slot', { 'data-item': id, 'aria-label': WEAPONS[id].name }), sl.x, sl.y); e.style.width = sl.w * L.scale + 'px'; e.style.height = sl.h * L.scale + 'px'; return e; }),
      pages > 1 ? place(btn(page + 1 < pages ? 'More items ▸' : '◂ First rack', () => { page = (page + 1) % pages; sel = null; go(); }, 'small more', { 'data-more': '1' }), si.rack[0].x, si.rack[0].y + si.rack[0].h + 3) : null,
      btn('◂ Harbour', () => { sel = null; page = 0; said = ''; goto(S, 'harbour'); go(); }, 'leave', { 'data-leave': '1' }),
      drawer);
    if (sel && items.includes(sel)) select(sel, true); else { sel = null; renderDrawer(); }
  }
}
