import Phaser from 'phaser';
import { LOST, TOURS } from '../core/data';
import { goto, lookOf, offDraw } from '../core/game';
import { L, S, btn, closeModal, commit, go, h, ico, modal, mount, place, tex, toast } from '../app';
import { harbour } from '../art/scenes';
import { Actor } from './actor';
import { topbar } from '../ui/common';

export class Harbour extends Phaser.Scene {
  constructor() { super('Harbour'); }
  create(): void {
    const hb = harbour(L.W, S.titles, S.titles.map((t) => TOURS[t].pennant), S.coins, S.titles.map((t) => TOURS[t].trophy));
    this.add.image(0, 0, tex(this, 'bg', hb.pix)).setOrigin(0);
    new Actor(this, lookOf(S), S.main, false, hb.spots.player[0], hb.spots.player[1]).setWeapon(S.main, offDraw(S));
    const spot = (label: string, at: [number, number], on: () => void, key: string, dim = false) => place(btn(label, on, 'spot' + (dim ? ' dim' : ''), { 'data-spot': key }), at[0], at[1]);
    const later = (what: string) => () => toast(`${what} opens in a later build.`);
    mount(
      topbar(),
      h('div.place', null, 'Gallowswake'),
      spot('Enter the Arena', hb.spots.arena, () => { goto(S, 'gate'); go(); }, 'arena'),
      spot('Weaponsmith', hb.spots.smith, () => { goto(S, 'shop'); go(); }, 'smith'),
      spot('Armoury', hb.spots.armoury, () => { goto(S, 'shop', 'armoury'); go(); }, 'armoury'),
      L.W > 300 ? spot('Tattooist', hb.spots.tattoo, later('The tattooist'), 'tattoo', true) : null,
      L.W > 300 ? spot('Surgeon', hb.spots.surgeon, later("The ship's surgeon"), 'surgeon', true) : null,
      spot('Purse', [hb.spots.purse[0], hb.spots.purse[1] - 14], () => this.purse(), 'purse'),
    );
    mount(h('div.below.harbourlist', null, h('p.small', null, 'Tap a doorway above, or use these.'),
      btn([h('b', null, 'Enter the Arena'), h('span.small', null, 'Friendly matches and tournaments')], () => { goto(S, 'gate'); go(); }, 'wide big'),
      btn([h('b', null, 'Weaponsmith'), h('span.small', null, "Peg Mallory's steel")], () => { goto(S, 'shop'); go(); }, 'wide big'),
      btn([h('b', null, 'Armoury'), h('span.small', null, "Ezra Thimble's hats, coats and off-hand gear")], () => { goto(S, 'shop', 'armoury'); go(); }, 'wide big'),
      h('div.record', null, h('b', null, 'Campaign record'),
        h('span.small', null, S.titles.length === 4 ? 'Tarwater Docks circuit complete. Lantern Quay is not built yet.' : S.titles.length ? `Pennants over the gate: ${S.titles.map((t) => TOURS[t].name).join(', ')}` : 'No pennants over the gate yet.'),
        h('span.small', null, `Cursed coins in the Purse: ${S.coins} of 20 · ${S.wins} fights won, ${S.losses} lost`))));
    if (!S.seen.intro) this.intro();
  }
  intro(): void {
    modal(h('h2', null, 'Gallowswake'),
      h('p', null, 'A market lashed together from dead ships, around an old tidal fighting dock.'),
      h('p', null, `The harbourmaster squints at you. "Every champion here holds one cursed coin of the Dead Man's Purse. Win the last coin and the Purse buys back what the sea took." ${LOST[S.lost].intro}`),
      h('p.small', null, `You have ${S.gold} gold, a frayed shirt and a chipped hanger. Friendly matches at the arena pay about 12 gold. Peg Mallory sells better steel.`),
      btn('To the harbour', () => { S.seen.intro = true; commit(); closeModal(); }, 'wide brass', { 'data-close': '1' }));
  }
  purse(): void {
    modal(h('h2', null, "The Dead Man's Purse"),
      h('p', null, S.coins ? `${S.coins} cursed coin${S.coins > 1 ? 's' : ''} of 20. ${LOST[S.lost].coin}` : 'Empty. It hangs very still for something so light.'),
      h('div', null, ...S.titles.map((t) => h('div.small', null, ico('coin'), ` ${TOURS[t].name}`))),
      btn('Close', closeModal, 'wide', { 'data-close': '1' }));
  }
}
