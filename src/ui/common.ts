// Persistent tabs and sheets shared by every view. Closing returns to the same view.
import { ATTRS, ATTR_INFO, Attr, Attrs, FAMILY_INFO, LOST, MOVES, TOURS, WEAPONS, xpForLevel } from '../core/data';
import { sheetStats } from '../core/battle';
import { equip, lockedKit, playerMaxHp, spendPoint } from '../core/game';
import { S, applySettings, btn, closeModal, commit, go, h, ico, modal, resetSave, toast } from '../app';
import { sfx } from '../sfx';

export function reachText(id: string): string {
  const r = MOVES[id].reach;
  if (!r) return '';
  return r[0] === r[1] ? `${r[0]} space${r[0] > 1 ? 's' : ''}` : `${r[0]}–${r[1]} spaces`;
}
export function moveNumbers(attrs: Attrs, weapon: string, id: string): string {
  const m = MOVES[id], s = sheetStats(attrs, weapon, id);
  const parts: string[] = [];
  if (m.dmg) parts.push(`${s.lo}–${s.hi} dmg`, `${s.acc}%`);
  parts.push(`${m.st} stamina`);
  if (m.reach) parts.push(`reach ${reachText(id)}`);
  return parts.join(' · ');
}
export function moveRow(attrs: Attrs, weapon: string, id: string, tag = ''): HTMLElement {
  const m = MOVES[id];
  return h('div.moverow' + (tag ? '.' + tag : ''), null, ico(m.icon, 24), h('div', null, h('b', null, (tag === 'gain' ? '+ ' : tag === 'lose' ? '− ' : '') + m.name), h('span.num', null, moveNumbers(attrs, weapon, id)), h('span.desc', null, m.desc)));
}

/** Concrete before/after lines for spending a point. */
export function attrPreview(a: Attr): string[] {
  const after = { ...S.attrs, [a]: S.attrs[a] + 1 };
  const out: string[] = [];
  if (a === 'grit') {
    out.push(`Health ${playerMaxHp(S)} → ${playerMaxHp(S) + 4}`, `Stamina ${8 + S.attrs.grit} → ${9 + S.attrs.grit}`);
    return out;
  }
  for (const id of [...WEAPONS[S.main].moves, 'cuff']) {
    const m = MOVES[id];
    if (!m.dmg) continue;
    const x = sheetStats(S.attrs, S.main, id), y = sheetStats(after, S.main, id);
    if (x.lo === y.lo && x.acc === y.acc) continue;
    const dmg = x.lo !== y.lo ? `${x.lo}–${x.hi} → ${y.lo}–${y.hi}` : '';
    const acc = x.acc !== y.acc ? `${x.acc}% → ${y.acc}%` : '';
    out.push(`${m.name} ${[dmg, acc].filter(Boolean).join(', ')}`);
  }
  if (!out.length) out.push('No change with this weapon until the next point');
  return out.slice(0, 3);
}

export function attrSpender(after: () => void): HTMLElement {
  return h('div.spender', null,
    h('div.pts', null, `Attribute point${S.points > 1 ? 's' : ''} to spend: ${S.points}`),
    ...ATTRS.map((a) => btn([h('b', null, `${ATTR_INFO[a].name} ${S.attrs[a]} → ${S.attrs[a] + 1}`), h('span.small', null, attrPreview(a).join(' · '))], () => { if (spendPoint(S, a)) { sfx('coin'); commit(); after(); } }, 'attr', { 'data-attr': a })));
}

export function openSheet(): void {
  const render = () => {
    const locked = lockedKit(S);
    modal(
      h('div.sheethead', null, h('h2', null, S.name), btn('Close', closeModal, 'small', { 'data-close': '1' })),
      h('p.small', null, `Level ${S.level} · ${S.xp}/${xpForLevel(S.level + 1)} XP · ${S.wins} won, ${S.losses} lost · seeking ${LOST[S.lost].thing}`),
      S.points > 0 ? attrSpender(render) : h('div.attrs', null, ...ATTRS.map((a) => h('div.attr', null, h('b', null, `${ATTR_INFO[a].name} ${S.attrs[a]}`), h('span.small', null, ATTR_INFO[a].blurb)))),
      h('h3', null, 'Kit'), locked ? h('p.small.warn', null, 'Loadout is locked until this tournament or fight ends.') : null,
      ...S.owned.map((id) => {
        const w = WEAPONS[id];
        return h('div.kit' + (S.main === id ? '.on' : ''), null, h('div', null, h('b', null, w.name), h('span.small', null, `${FAMILY_INFO[w.family].name}. ${FAMILY_INFO[w.family].trick}`), ...w.moves.map((m) => h('span.small', null, `${MOVES[m].name}: ${moveNumbers(S.attrs, id, m)}`))),
          S.main === id ? h('span.tag', null, 'In hand') : btn('Equip', () => { if (equip(S, id)) { sfx('steel'); commit(); go(); openSheet(); } }, 'small', { disabled: locked, 'data-equip': id }));
      }),
      h('h3', null, 'Trophies'),
      S.titles.length ? h('div', null, ...S.titles.map((t) => h('div.small', null, `Pennant: ${TOURS[t].name}`)), h('div.small', null, `Cursed coins in the Purse: ${S.coins} of 20`)) : h('p.small', null, 'No pennants yet. The Tar Bucket Cup is open at the arena.'),
    );
  };
  render();
}

export function openSettings(): void {
  const render = () => modal(
    h('div.sheethead', null, h('h2', null, 'Settings'), btn('Close', closeModal, 'small', { 'data-close': '1' })),
    btn(S.settings.mute ? 'Sound: off' : 'Sound: on', () => { S.settings.mute = !S.settings.mute; applySettings(); commit(); render(); }, 'wide'),
    btn(S.settings.reduced ? 'Reduced motion: on' : 'Reduced motion: off', () => { S.settings.reduced = !S.settings.reduced; applySettings(); commit(); render(); }, 'wide'),
    h('p.small', null, 'Progress saves on this device after every committed turn, purchase and reward.'),
    btn('Start a new pirate (erases this save)', () => { if (confirm('Erase this pirate and start again?')) { resetSave(); applySettings(); go(); toast('A new pirate washes ashore.'); } }, 'wide danger'),
  );
  render();
}

export function topbar(): HTMLElement {
  return h('div.topbar', null,
    h('div.chips', null, h('span.chip', { 'data-gold': S.gold }, ico('gold'), String(S.gold)), h('span.chip', null, `Lv ${S.level}`), S.coins ? h('span.chip', null, ico('coin'), String(S.coins)) : null),
    h('div.tabs', null, btn(S.points > 0 ? 'Pirate ●' : 'Pirate', openSheet, 'tab', { 'data-tab': 'sheet' }), btn('⚙', openSettings, 'tab', { 'aria-label': 'Settings', 'data-tab': 'settings' })));
}
