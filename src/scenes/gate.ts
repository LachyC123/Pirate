import Phaser from 'phaser';
import { ARCHETYPES, FAMILY_INFO, NPCS, TOURS, TOUR_ORDER, WEAPONS } from '../core/data';
import { acceptOffer, enterTour, goto, rollOffer, tourOpen } from '../core/game';
import { L, S, btn, commit, go, h, ico, mount, tex } from '../app';
import { gate } from '../art/scenes';
import { Actor } from './actor';
import { topbar } from '../ui/common';

let mode: 'menu' | 'friendly' | 'tour' = 'menu';
let tourSel: string | null = null;
export const resetGate = (m: 'menu' | 'friendly' = 'menu') => { mode = m; tourSel = null; };

export class Gate extends Phaser.Scene {
  constructor() { super('Gate'); }
  create(): void {
    const next = TOUR_ORDER.find((t) => !S.titles.includes(t)) ?? TOUR_ORDER[TOUR_ORDER.length - 1];
    this.add.image(0, 0, tex(this, 'bg', gate(L.W, TOURS[next].name, S.titles.map((t) => TOURS[t].pennant)))).setOrigin(0);
    const cx = L.W / 2;
    new Actor(this, S.look, S.main, false, L.land ? Math.round(L.W * 0.14) : cx - 50, 166);
    if (!S.offer) rollOffer(S);
    const panel = h('div.gatepanel', null);
    const put = (...k: (Node | string | null)[]) => { for (const x of k) if (x) panel.append(x); };
    const back = () => btn('◂ Back', () => { mode = 'menu'; go(); }, 'small', { 'data-back': '1' });
    if (mode === 'menu') {
      put(h('h2', null, 'The Tidal Dock'),
        btn([h('b', null, 'Friendly Match'), h('span.small', null, 'One fight, about 12 gold. Fully patched up afterwards.')], () => { mode = 'friendly'; go(); }, 'wide big', { 'data-mode': 'friendly' }),
        btn([h('b', null, 'Tournament'), h('span.small', null, S.titles.includes(next) ? 'All built cups are won.' : `Next: ${TOURS[next].name}`)], () => { mode = 'tour'; tourSel = null; go(); }, 'wide big', { 'data-mode': 'tour' }),
        btn('◂ Harbour', () => { goto(S, 'harbour'); go(); }, 'small', { 'data-leave': '1' }));
    } else if (mode === 'friendly') {
      const o = S.offer!, w = WEAPONS[o.weapon], arch = ARCHETYPES.find((a) => a.id === o.arch);
      new Actor(this, o.look, o.weapon, true, L.land ? Math.round(L.W * 0.4) : cx + 50, 166);
      put(h('div.sheethead', null, h('h2', null, o.name), back()),
        h('div.small', null, `${o.epithet}. ${arch?.tell ?? ''}`),
        h('div.quote', null, `"${o.line}"`),
        h('div.small', null, h('b', null, w.name), ` · ${FAMILY_INFO[w.family].trick}`),
        h('div.stake', { 'data-purse': o.purse }, ico('gold'), ` Purse ${o.purse} gold if you win · ${o.hp} health`),
        h('div.row', null, btn('Fight', () => { acceptOffer(S); go(); }, 'brass', { 'data-fight': '1' }), btn('Someone else', () => { rollOffer(S, o.arch); commit(); go(); }, '', { 'data-reroll': '1' })));
    } else {
      const sel = tourSel && TOURS[tourSel] ? tourSel : null;
      if (!sel) {
        put(h('div.sheethead', null, h('h2', null, 'Tarwater Docks circuit'), back()),
          ...TOUR_ORDER.map((id) => {
            const t = TOURS[id], won = S.titles.includes(id), open = tourOpen(S, id);
            return btn([h('b', null, t.name + (won ? ' ✓' : '')), h('span.small', null, won ? 'Won. Pennant flying over the gate.' : open ? t.blurb : `Locked until you win ${TOURS[t.requires!].name}.`)], () => { tourSel = id; go(); }, 'wide big', { disabled: !open || won, 'data-tour': id });
          }),
          h('p.small', null, 'Two more Tarwater cups and four further circuits are planned and not yet built.'));
      } else {
        const t = TOURS[sel];
        const entrants = t.rounds.filter((r) => NPCS[r]);
        entrants.forEach((r, i) => new Actor(this, NPCS[r].look, NPCS[r].weapon, true, L.land ? Math.round(L.W * 0.24) + i * 30 : cx + 20 + i * 30, 166));
        put(h('div.sheethead', null, h('h2', null, t.name), btn('◂ Back', () => { tourSel = null; go(); }, 'small', { 'data-back': '1' })),
          btn(`Enter with ${WEAPONS[S.main].name}`, () => { enterTour(S, sel); tourSel = null; mode = 'menu'; go(); }, 'wide brass', { 'data-enter': sel }),
          ...t.rounds.map((r, i) => h('div.small', null, NPCS[r] ? h('b', null, `${i + 1}. ${NPCS[r].name}`) : h('b', null, `${i + 1}. Not built yet`), NPCS[r] ? `: ${NPCS[r].epithet}. ${WEAPONS[NPCS[r].weapon].name}.` : '')),
          t.championCue ? h('div.small.cue', null, t.championCue) : null,
          h('div.stake', null, ico('gold'), ` Prize ${t.prize.gold} gold`, t.prize.weapon ? `, ${WEAPONS[t.prize.weapon].name}` : '', ', a pennant and a cursed coin'),
          t.built < t.rounds.length ? h('div.small.warn', null, `Only the first bout of this cup is built. Winning it pays a small purse and returns you to the harbour. No title yet.`) : null,
          h('div.small', null, 'Full recovery between bouts. Your loadout is locked once you enter. Lose and you keep everything, but the cup restarts at its first qualifier.'));
      }
    }
    mount(topbar(), panel);
  }
}
