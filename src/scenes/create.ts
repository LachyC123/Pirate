import Phaser from 'phaser';
import { LOST, Look } from '../core/data';
import { DEFAULT_LOOK, createPirate } from '../core/game';
import { L, S, btn, go, h, tex, ui } from '../app';
import { harbour } from '../art/scenes';
import { Actor } from './actor';
import { CLOTH, HAIRS, SKINS, TROUSERS } from '../art/pix';

const NAMES = ['Salt Maggie', 'Ned Marrow', 'Jack Tallow', 'Brine Abby', 'Tom Scupper', 'Wren Hawse'];
let draft: { name: string; look: Look; lost: 'ship' | 'name' | 'companion' } | null = null;

export class Create extends Phaser.Scene {
  constructor() { super('Create'); }
  create(): void {
    draft ??= { name: '', look: { ...DEFAULT_LOOK }, lost: 'ship' };
    const d = draft;
    const hb = harbour(L.W, [], [], 0);
    this.add.image(0, 0, tex(this, 'bg', hb.pix)).setOrigin(0).setTint(0x8888aa);
    const px = L.land ? Math.round(L.W * 0.24) : Math.round(L.W / 2);
    const actor = new Actor(this, d.look, 'chipped_hanger', false, px, 168, 2);
    const hex = (c: number) => '#' + c.toString(16).padStart(6, '0');
    const opts: [string, keyof Look, number, ((i: number) => string) | null, string[] | null][] = [
      ['Skin', 'skin', SKINS.length, (i) => hex(SKINS[i]), null],
      ['Hair', 'hair', 5, null, ['Bald', 'Cropped', 'Long', 'Tail', 'Wild']],
      ['Hair colour', 'hairColor', HAIRS.length, (i) => hex(HAIRS[i]), null],
      ['Whiskers', 'beard', 3, null, ['None', 'Moustache', 'Full beard']],
      ['Shirt', 'shirt', CLOTH.length, (i) => hex(CLOTH[i]), null],
      ['Trousers', 'trousers', TROUSERS.length, (i) => hex(TROUSERS[i]), null],
    ];
    const start = () => { createPirate(S, d.name || NAMES[Math.floor(Math.random() * NAMES.length)], d.look, d.lost); draft = null; go(); };
    const render = () => {
      const form = h('div.createform', null,
        h('h1', null, "Dead Man's Purse"),
        h('p.small', null, 'A pirate in rags washes up at Gallowswake.'),
        btn('Quick start', start, 'wide brass', { 'data-quick': '1' }),
        h('label.field', null, 'Name', h('input', { type: 'text', maxlength: 14, placeholder: 'Nameless Jack', value: d.name, oninput: (e: any) => { d.name = e.target.value; } })),
        ...opts.map(([label, key, n, col, names]) => {
          const v = (d.look[key] as number) ?? 0;
          const step = (by: number) => () => { (d.look as any)[key] = (v + by + n) % n; actor.setLook(d.look); render(); };
          return h('div.cycler', null, h('span.lab', null, label), btn('◀', step(-1), 'sq', { 'aria-label': label + ' previous' }), col ? h('span.swatch', { style: `background:${col(v)}` }) : h('span.val', null, names![v]), btn('▶', step(1), 'sq', { 'aria-label': label + ' next' }));
        }),
        h('div.lab', null, 'What did the sea take?'),
        h('div.lost', null, ...(['ship', 'name', 'companion'] as const).map((k) => btn(LOST[k].label, () => { d.lost = k; render(); }, d.lost === k ? 'on' : '', { 'data-lost': k }))),
        h('p.small', null, LOST[d.lost].intro),
        btn('Step ashore', start, 'wide brass', { 'data-begin': '1' }));
      const old = ui().querySelector('.createform');
      const sc = old ? old.scrollTop : 0;
      ui().replaceChildren(form);
      form.scrollTop = sc;
    };
    render();
  }
}
