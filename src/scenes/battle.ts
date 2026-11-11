import Phaser from 'phaser';
import { FAMILY_INFO, LOST, MOVES, NPCS, TOURS, TOUR_ORDER, WEAPONS } from '../core/data';
import { PoseName } from '../art/fighter';
import { Action, Battle, Ev, breathGain, cloneBattle, dist, legal, moveStats, movesOf, other, threatCells } from '../core/battle';
import { act, effAttrs, enterTour, equip, goto, leaveTour, lookOf, nextBout, offDraw, presented, rematch, rollOffer, toHarbour } from '../core/game';
import { L, S, btn, commit, go, h, ico, mount, sx, sy, tex, ui } from '../app';
import { arena, laneTile, railOf } from '../art/scenes';
import { weaponSprite } from '../art/fighter';
import { P, Pix } from '../art/pix';
import { Actor } from './actor';
import { attrSpender, moveRow, openSettings, reachText } from '../ui/common';
import { Sfx, sfx } from '../sfx';
import { resetGate } from './gate';

const GY = 150;
const HOLD: Record<string, PoseName> = { cast: 'hold', plant: 'planted', cross: 'crossed' };
let inspect = false;

export class BattleScene extends Phaser.Scene {
  A!: [Actor, Actor];
  view!: Battle;
  tiles: Phaser.GameObjects.Image[] = [];
  fx!: Phaser.GameObjects.Graphics;
  crowd!: Phaser.GameObjects.Image;
  anchors: Phaser.GameObjects.Image[] = [];
  busy = false;
  fan: 'base' | 'attack' = 'base';
  sp = 40; x0 = 0;
  logLine = '';
  els!: { hud: [HTMLElement, HTMLElement]; cap: HTMLElement; fan: HTMLElement; info: HTMLElement };
  constructor() { super('Battle'); }
  laneX = (i: number) => Math.round(this.x0 + i * this.sp);
  T = (ms: number) => ((window as any).__dmp?.fast ? ms * 0.04 : S.settings.reduced ? ms * 0.35 : ms);
  wait = (ms: number) => new Promise<void>((r) => this.time.delayedCall(this.T(ms), () => r()));
  tween = (targets: any, props: any, ms: number) => new Promise<void>((r) => this.tweens.add({ targets, ...props, duration: Math.max(1, this.T(ms)), onComplete: () => r() }));

  create(): void {
    const b = S.battle, foe = S.foe;
    if (!b || !foe) { toHarbour(S); S.screen = 'harbour'; go(); return; }
    this.busy = false; this.fan = 'base'; this.tiles = []; this.logLine = `"${foe.line}"`;
    const champion = !!foe.npc && S.kind === 'tour';
    const tier = S.tour ? TOUR_ORDER.indexOf(S.tour.id) : S.result?.tour ? TOUR_ORDER.indexOf(S.result.tour) : -1;
    const ar = arena(L.W, Math.min(14, 6 + Math.max(0, tier) * 2 + (champion && foe.npc && tier >= 0 && TOURS[TOUR_ORDER[tier]].rounds.slice(-1)[0] === foe.npc ? 4 : 0)));
    this.add.image(0, 0, tex(this, 'bg', ar.bg)).setOrigin(0);
    this.crowd = this.add.image(0, 0, tex(this, 'crowd', ar.crowd)).setOrigin(0);
    this.add.image(0, 0, tex(this, 'rail', railOf(ar.crowd))).setOrigin(0);
    this.tweens.add({ targets: this.crowd, y: 1, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    this.sp = Math.max(25, Math.min(46, (L.W - 56) / 6)); this.x0 = L.W / 2 - this.sp * 3;
    const tw = Math.round(this.sp) - 2;
    for (const st of ['plain', 'threat', 'reach'] as const) tex(this, 'tile_' + st, laneTile(tw, st));
    for (let i = 0; i < 7; i++) this.tiles.push(this.add.image(this.laneX(i), GY + 1, 'tile_plain').setOrigin(0.5, 0));
    this.view = cloneBattle(S.pending ? S.pending.from : b);
    this.fx = this.add.graphics();
    this.A = [new Actor(this, lookOf(S), this.view.f[0].weapon, false, this.laneX(this.view.f[0].pos), GY), new Actor(this, foe.look, this.view.f[1].weapon, true, this.laneX(this.view.f[1].pos), GY)];
    this.A[0].setWeapon(this.view.f[0].weapon, offDraw(S, this.view.f[0].weapon));
    this.anchors = [0, 1].map((i) => { const ws = weaponSprite(WEAPONS[this.view.f[i].weapon].sprite); return this.add.image(0, GY + 3, tex(this, 'anchor' + i, ws.pix)).setOrigin(0.5, 0.5).setFlipX(i === 1).setVisible(false).setDepth(3); });
    this.A[0].img.setDepth(2); this.A[1].img.setDepth(1); this.fx.setDepth(3);

    const hud = (side: string) => h('div.hud.' + side, null);
    this.els = { hud: [hud('p'), hud('e')], cap: h('div.caption', null), fan: h('div.fan', null), info: h('div.inspectbox', null) };
    mount(this.els.hud[0], this.els.hud[1], this.els.cap, this.els.fan, this.els.info,
      h('div.tabs.battletabs', null,
        h('button.btn.tab.insp' + (inspect ? '.on' : ''), { type: 'button', 'data-act': 'inspect', 'aria-label': 'Inspect actions without spending a turn', on: (e: Event) => {
          inspect = !inspect; sfx('tap'); (e.currentTarget as HTMLElement).classList.toggle('on', inspect);
          this.els.info.textContent = inspect ? 'Inspect is on: tap any action to read it without spending your turn.' : ''; this.els.info.classList.toggle('open', inspect);
        } }, ico('inspect', 22)),
        btn('⚙', openSettings, 'tab', { 'aria-label': 'Settings' })),
      h('div.bill', null, S.kind === 'tour' && S.result === null && S.tour ? `${TOURS[S.tour.id].name} · bout ${S.tour.round + 1} of ${TOURS[S.tour.id].rounds.length}` : S.kind === 'tour' ? 'Tournament' : 'Friendly match'));
    void champion;
    this.syncRest(); this.refresh();
    if (S.screen === 'battle') {
      if (S.pending) void this.play(S.pending.evs); else this.renderFan();
    } else {
      this.view = cloneBattle(b); this.syncRest(); this.endPoses(); this.refresh();
      if (S.screen === 'prize') this.showPrize(true); else this.showResult();
    }
  }

  // ---- display state -------------------------------------------------------
  syncRest(): void {
    for (const i of [0, 1] as const) {
      const f = this.view.f[i], a = this.A[i];
      a.x = this.laneX(f.pos);
      a.rest = f.pending ? HOLD[f.pending] ?? 'hold' : 'idle';
      if (f.hp > 0 && !a.busy) a.set(f.pending ? HOLD[f.pending] ?? 'hold' : f.braced ? 'brace' : 'idle0');
      a.busy = f.braced && f.hp > 0 ? true : a.busy && f.hp <= 0;
    }
  }
  endPoses(): void {
    const w = this.view.over;
    if (w === null) return;
    const l = other(w);
    this.A[l].busy = true; this.A[l].rest = 'down'; this.A[l].set('down');
    this.A[w].busy = true; this.A[w].rest = 'cheer'; this.A[w].set('cheer');
  }
  refresh(): void {
    const v = this.view;
    for (const i of [0, 1] as const) {
      const f = v.f[i], w = WEAPONS[f.weapon];
      const chips: string[] = [];
      if (f.braced) chips.push('Braced');
      if (f.riposte) chips.push('Riposte ready');
      if (w.family === 'pistol') chips.push(f.loaded ? 'Loaded' : 'Empty');
      if (f.pending) chips.push(MOVES[f.pending].windup!.caption);
      if (f.anchor !== null) chips.push('Anchor out');
      if (f.dazed) chips.push('Dazzled');
      const bar = (cls: string, icon: string, cur: number, max: number, label: string) => h('div.res.' + cls, { 'aria-label': `${label} ${cur} of ${max}` }, ico(icon, 18), h('span.n', null, `${cur}/${max}`), h('span.meter', null, h('i', { style: `width:${Math.round((100 * cur) / max)}%` })));
      this.els.hud[i].replaceChildren(h('div.nm', null, f.name, h('span.wp', null, ' · ' + w.name)), bar('hp', 'hp', f.hp, f.maxHp, 'Health'), bar('st', 'st', f.st, f.maxSt, 'Stamina'), h('div.status', null, ...chips.map((c) => h('span', null, c))));
      this.els.hud[i].dataset.hp = String(f.hp); this.els.hud[i].dataset.st = String(f.st); this.els.hud[i].dataset.pos = String(f.pos);
    }
    // threatened spaces on the deck, and the opponent's cue
    const foe = v.f[1];
    const live = v.over === null;
    const threat = new Set<number>(live ? threatCells(v, 1) : []);
    const mine = new Set<number>(live ? threatCells(v, 0) : []);
    this.tiles.forEach((t, i) => t.setTexture(threat.has(i) ? 'tile_threat' : mine.has(i) ? 'tile_reach' : 'tile_plain'));
    const short = foe.name.split(' ').slice(0, 2).join(' ');
    if (foe.pending && live) {
      const wu = MOVES[foe.pending].windup!;
      this.els.cap.className = 'caption cue';
      this.els.cap.textContent = `${wu.caption}! ${short} ${wu.verb} next turn. ${wu.advice}`;
    } else if (foe.anchor !== null && live && threat.has(v.f[0].pos)) {
      this.els.cap.className = 'caption cue';
      this.els.cap.textContent = `Inside ${short}'s anchor line! Step back past the mark, or brace.`;
    } else { this.els.cap.className = 'caption'; this.els.cap.textContent = this.logLine; }
    this.drawFx();
  }
  drawFx(): void {
    const g = this.fx; g.clear();
    const chain = (x0: number, y0: number, x1: number, y1: number) => {
      const n = Math.abs(x1 - x0), dir = Math.sign(x1 - x0) || 1;
      for (let k = 0; k <= n; k += 2) { const x = x0 + dir * k, y = Math.round(y0 + ((y1 - y0) * k) / Math.max(1, n)); g.fillStyle(k % 4 ? P.steelDark : P.steelLight, 1); g.fillRect(x, y, 2, 1); g.fillStyle(P.ink, 1); g.fillRect(x, y + 1, 2, 1); }
    };
    for (const i of [0, 1] as const) {
      const f = this.view.f[i], a = this.A[i], t = this.A[other(i)], dir = i === 0 ? 1 : -1;
      const live = this.view.over === null;
      this.anchors[i]?.setVisible(live && f.anchor !== null);
      if (live && f.anchor !== null) {
        const ax = this.laneX(f.anchor);
        this.anchors[i].setPosition(ax - dir * 6, GY - 5);
        chain(Math.round(a.x + dir * 12), GY - 20, ax - dir * 4, GY - 3);
      }
      if (!live || f.pending !== 'cast') continue;
      const x1 = Math.round(t.x - dir * 4), y1 = GY - 22;
      chain(Math.round(a.x + dir * 18), GY - 26, x1, y1);
      g.fillStyle(P.brass, 1); g.fillRect(x1 - 2, y1 - 2, 4, 4); g.fillStyle(P.brassLight, 1); g.fillRect(x1 - 1, y1 - 2, 2, 1);
    }
  }
  float(who: 0 | 1, text: string, cls: string): void {
    const e = h('div.float.' + cls, null, text);
    e.style.left = sx(this.A[who].x) + 'px'; e.style.top = sy(GY - 52) + 'px';
    ui().append(e);
    window.setTimeout(() => e.remove(), 1100);
  }
  chips(x: number, col: number): void {
    if (S.settings.reduced) return;
    for (let i = 0; i < 5; i++) {
      const r = this.add.rectangle(x, GY, 2, 2, col).setDepth(4);
      this.tweens.add({ targets: r, x: x + (Math.random() - 0.5) * 30, y: GY - 8 - Math.random() * 16, duration: 180, yoyo: true, ease: 'Quad.out', onComplete: () => r.destroy() });
    }
  }

  // ---- input -----------------------------------------------------------------
  renderFan(): void {
    const el = this.els.fan, v = this.view;
    this.els.info.replaceChildren(); this.els.info.classList.remove('open');
    if (this.busy || v.over !== null || S.screen !== 'battle') { el.replaceChildren(); el.classList.add('empty'); return; }
    el.classList.remove('empty');
    const me = v.f[0], d = dist(v);
    const card = (key: string, icon: string, name: string, sub: string, a: Action | null, why: string | undefined, detail: string, onTap?: () => void) => {
      const off = !!why;
      return h('button.card' + (off ? '.off' : '') + (key === 'attack' ? '.go' : ''), { type: 'button', 'data-act': key, 'aria-disabled': off ? 'true' : undefined, on: () => {
        if ((inspect && !onTap) || off) { sfx(off ? 'deny' : 'tap'); this.els.info.replaceChildren(h('b', null, name), h('span', null, off ? ` Cannot use now: ${why}. ` : ' '), h('span', null, detail)); this.els.info.classList.add('open'); return; }
        sfx('tap');
        if (onTap) onTap(); else if (a) this.commitAction(a);
      } }, ico(icon, 28), h('span.t', null, h('b', null, name), h('span.s', null, off ? why! : sub)));
    };
    const moveCard = (id: string) => moveCardRaw(id, { t: 'move', id });
    const moveCardRaw = (id: string, action: Action) => {
      const m = MOVES[id], s = moveStats(v, 0, id);
      const sub = m.dmg ? `${s.lo}–${s.hi} dmg · ${s.acc}% · ${m.st} st${s.note ? ' · ' + s.note : ''}` : `${m.st} stamina`;
      return card(action.t === 'move' ? 'move:' + id : action.t, m.icon, m.name, sub, action, s.ok ? undefined : s.why, `${m.desc}${m.reach ? ` Reach ${reachText(id)}.` : ''}${m.dmg ? ` ${s.lo}–${s.hi} damage, ${s.acc}% to land, ${m.st} stamina.` : ''}`);
    };
    const cards: HTMLElement[] = [];
    if (v.chain === 0) {
      cards.push(moveCardRaw('follow', { t: 'follow' }), card('pass', 'back', 'Hold Back', 'Keep the stamina', { t: 'pass' }, undefined, 'End your turn without the second cut.'));
      el.replaceChildren(...cards); this.placeFan(); this.say('The cut landed. Follow up with the other blade?');
      return;
    }
    if (this.fan === 'base') {
      const anyAttack = movesOf(me).some((id) => moveStats(v, 0, id).ok);
      if (me.pending) cards.push(moveCard(MOVES[me.pending].windup!.release));
      if (me.anchor !== null && movesOf(me).includes('reel')) cards.push(moveCard('reel'));
      cards.push(card('attack', 'attack', 'Attack ▸', anyAttack ? WEAPONS[me.weapon].name : 'Nothing usable right now: tap to see why', null, undefined, 'Opens the moves of the weapon in your hand. You can back out.', () => { this.fan = 'attack'; this.renderFan(); }));
      const adv = legal(v, 0, { t: 'advance' }), wd = legal(v, 0, { t: 'withdraw' });
      cards.push(card('advance', 'advance', 'Advance', `Close to ${d - 1} space${d - 1 === 1 ? '' : 's'}`, { t: 'advance' }, adv.why, 'Step one space toward the enemy. You cannot pass through them.'));
      cards.push(card('withdraw', 'withdraw', 'Withdraw', `Back off to ${d + 1} spaces`, { t: 'withdraw' }, wd.why, 'Step one space away from the enemy.'));
      cards.push(card('brace', 'brace', 'Brace', 'Halve the next hit · +2 stamina', { t: 'brace' }, undefined, 'Until your next turn, a hit that lands is blocked for about half, you cannot be shoved or hauled, and a blocked heavy move costs the attacker 2 stamina. With a hanger or cutlass, a block readies Riposte.'));
      cards.push(card('breath', 'breath', 'Catch Breath', `+${Math.min(me.maxSt - me.st, breathGain(me) + 1)} stamina`, { t: 'breath' }, undefined, 'Always available. Recover stamina instead of acting.'));
    } else {
      for (const id of movesOf(me)) if ((!MOVES[id].releaseOf || me.pending) && !(MOVES[id].reel && me.anchor === null) && !(MOVES[id].anchorThrow && me.anchor !== null) && !(MOVES[id].windup && me.pending)) cards.push(moveCard(id));
      cards.push(card('back', 'back', 'Back', 'Other actions', null, undefined, 'Return without spending your turn.', () => { this.fan = 'base'; this.renderFan(); }));
    }
    el.replaceChildren(...cards);
    this.placeFan();
  }
  /** landscape: tuck the fan beside the pirate, on whichever side has room */
  placeFan(): void {
    const el = this.els.fan;
    if (L.land) {
      const fw = 172, px = sx(this.A[0].x), ex = sx(this.A[1].x);
      let left = px - 34 - fw;
      if (left < 6) left = ex + 40 + fw < L.vw ? ex + 40 : 6;
      el.style.left = Math.round(left) + 'px';
    } else el.style.left = '';
  }

  commitAction(a: Action): void {
    if (this.busy) return;
    const evs = act(S, a); // resolved and rewarded atomically
    if (!evs) return;
    commit(); // saved before any animation: a reload replays, never rerolls
    (window as any).__dmp.lastEvs = evs;
    this.fan = 'base';
    void this.play(evs);
  }

  // ---- presentation ------------------------------------------------------------
  async play(evs: Ev[]): Promise<void> {
    this.busy = true; this.renderFan();
    for (const ev of evs) await this.show(ev);
    presented(S); commit();
    this.view = cloneBattle(S.battle!); this.refresh();
    this.busy = false;
    if (this.view.over !== null) { await this.wait(500); if (S.screen === 'prize') this.showPrize(false); else this.showResult(); }
    else this.renderFan();
  }
  say(t: string): void { this.logLine = t; this.els.cap.className = 'caption'; this.els.cap.textContent = t; }

  async show(ev: Ev): Promise<void> {
    const v = this.view;
    if (ev.e === 'sync') {
      for (const i of [0, 1] as const) Object.assign(v.f[i], ev.f[i]);
      this.A.forEach((a, i) => { if (v.f[i].hp > 0 && v.over === null) a.busy = false; });
      this.syncRest(); this.refresh();
      await this.wait(180);
      return;
    }
    if (ev.e === 'chain') return;
    const who = ev.who, a = this.A[who], o = other(who), d = this.A[o], dir = who === 0 ? 1 : -1;
    const nm = v.f[who].name.split(' ')[0] === 'Old' ? 'Old Moll' : v.f[who].name, on = v.f[o].name.split(' ')[0] === 'Old' ? 'Old Moll' : v.f[o].name;
    switch (ev.e) {
      case 'step': {
        v.f[who].pos = ev.to;
        if (ev.why === 'dash') { a.busy = true; a.set('walk0'); sfx('cloth'); await this.tween(a.img, { x: this.laneX(ev.to), ease: 'Quad.in' }, 130); this.drawFx(); break; }
        const forced = ev.why === 'push' || ev.why === 'pull';
        a.busy = true;
        if (forced) { a.set('hit'); sfx('wood'); await this.tween(a.img, { x: this.laneX(ev.to), ease: 'Quad.out' }, 200); }
        else {
          this.say(`${nm} ${ev.why === 'advance' ? 'advances' : 'backs off'}.`);
          a.set('walk0'); sfx('step'); const mid = (a.x + this.laneX(ev.to)) / 2;
          await this.tween(a.img, { x: mid }, 110); a.set('walk1'); sfx('step'); await this.tween(a.img, { x: this.laneX(ev.to) }, 110);
        }
        a.busy = false; a.toRest(); this.drawFx();
        break;
      }
      case 'brace': a.busy = true; a.set('brace'); sfx('cloth'); this.say(`${nm} braces.`); this.float(who, 'Braced', 'info'); await this.wait(320); break;
      case 'breath': {
        a.busy = true; this.say(`${nm} catches breath.`); sfx(v.f[who].st === 0 ? 'empty' : 'breath');
        a.set('breath0'); await this.wait(200); a.set('breath1'); this.float(who, `+${ev.gain} stamina`, 'st'); await this.wait(200); a.set('breath0'); await this.wait(160);
        a.busy = false; a.toRest();
        break;
      }
      case 'reload': a.busy = true; a.set('reload'); sfx('misfire'); this.say(`${nm} reloads.`); await this.wait(380); this.float(who, 'Loaded', 'info'); a.busy = false; a.toRest(); break;
      case 'drop': v.f[who].pending = null; a.rest = 'idle'; this.float(who, 'Line dropped', 'info'); this.refresh(); await this.wait(200); break;
      case 'anchor': v.f[who].anchor = ev.cell; this.refresh(); sfx('thud'); this.chips(this.laneX(ev.cell), P.timberLight); break;
      case 'whiff': {
        a.busy = true; v.f[who].pending = null; a.rest = 'idle';
        a.set('heavyDown'); sfx('wood'); this.chips(a.x + dir * 16, P.timberLight);
        this.say(`${nm} swings at empty deck: ${MOVES[ev.move].name} wasted.`); this.float(who, 'Whiff! −2 stamina', 'miss');
        if (!S.settings.reduced) this.cameras.main.shake(90, 0.006);
        this.refresh(); await this.wait(420); a.busy = false; a.toRest();
        break;
      }
      case 'cast': {
        const hold = HOLD[ev.move] ?? 'hold';
        a.busy = true; this.say(`${nm}: ${MOVES[ev.move].name}!`);
        if (ev.move === 'cast') { a.set('castBack'); await this.wait(260); a.set('castOut'); sfx('chain'); } else { a.set('brace'); await this.wait(200); sfx(ev.move === 'plant' ? 'wood' : 'steel'); }
        v.f[who].pending = ev.move; await this.wait(120);
        a.rest = hold; a.set(hold); this.refresh();
        if (!S.settings.reduced) this.tweens.add({ targets: this.crowd, y: 4, duration: 200, yoyo: true, hold: 500 });
        await this.wait(420);
        break;
      }
      case 'ko': {
        this.view.over = other(who);
        a.busy = true; a.rest = 'down'; a.set('hit'); await this.wait(160); a.set('down'); sfx('thud');
        if (!S.settings.reduced) this.cameras.main.shake(160, 0.012);
        this.say(`${nm} is down!`);
        await this.wait(350);
        d.busy = true; d.rest = 'cheer'; d.set('cheer'); sfx('cheer');
        if (!S.settings.reduced) this.tweens.add({ targets: this.crowd, y: -3, duration: 140, yoyo: true, repeat: 3 });
        this.refresh();
        break;
      }
      case 'attack': {
        const m = MOVES[ev.move], w = WEAPONS[v.f[who].weapon];
        a.busy = true; d.busy = true;
        const pre: Record<string, [any, any, number]> = { plant: ['planted', 'heavyDown', 100], cross: ['crossed', 'strike', 100], dazzle: ['cuffBack', 'dazzle', 150], slash: ['windup', 'strike', 170], heavy: ['heavyUp', 'heavyDown', 300], thrust: ['thrustBack', 'thrustOut', 190], shove: ['thrustBack', 'shove', 170], cuff: ['cuffBack', 'cuffOut', 130], shot: ['aim', 'fire', 260], haul: ['hold', 'haul', 220], cast: ['castBack', 'castOut', 200], reload: ['reload', 'reload', 100] };
        const [p0, p1, t0] = ev.again ? ['cuffBack', 'cuffOut', 90] : m.reel ? ['hold', 'haul', 200] : m.releaseOf === 'cross' ? ['crossed', 'strike', 60] : pre[m.anim];
        this.say(`${nm}: ${m.name}${ev.note ? ` (${ev.note.toLowerCase()})` : ''}.`);
        a.set(p0); await this.wait(t0);
        const gap = Math.abs(d.x - a.x), home = a.x;
        const reach = m.offhand ? 12 : m.anim === 'shove' ? 14 : w.len + 14;
        if (m.reel) v.f[who].anchor = null;
        if (m.anim === 'dazzle' && !S.settings.reduced) this.cameras.main.flash(120, 255, 230, 150);
        const lunge = m.anim === 'shot' || m.anim === 'haul' || m.anim === 'dazzle' || m.anchorThrow ? 0 : Math.max(0, Math.min(30, gap - reach - 12));
        a.set(p1);
        if (m.anim === 'shot') {
          sfx('shot');
          const fl = this.add.rectangle(a.x + dir * 22, GY - 31, 6, 4, P.lamp).setDepth(5), tr = this.add.rectangle(a.x + dir * 24, GY - 30, gap - 30, 1, P.bone).setOrigin(dir > 0 ? 0 : 1, 0.5).setDepth(5);
          this.time.delayedCall(90, () => { fl.destroy(); tr.destroy(); });
        } else { sfx(m.anim === 'haul' ? 'haul' : 'cloth'); if (lunge) await this.tween(a.img, { x: home + dir * lunge }, 60); }
        const material: Sfx = m.offhand || m.anim === 'shove' ? 'wood' : m.anim === 'shot' ? 'thud' : 'steel';
        if (ev.result === 'hit') {
          v.f[o].hp = Math.max(0, v.f[o].hp - ev.dmg);
          d.set('hit'); sfx(material); this.float(o, m.daze ? 'Dazzled!' : `−${ev.dmg}${ev.pinned ? ' pinned!' : ''}${ev.broke ? ' guard broken!' : ''}`, m.daze ? 'info' : 'dmg');
          if (m.drain) v.f[o].st = Math.max(0, v.f[o].st - m.drain);
          if (!S.settings.reduced) { this.cameras.main.shake(m.heavy ? 130 : 70, m.heavy ? 0.01 : 0.005); this.tweens.add({ targets: this.crowd, y: -2, duration: 90, yoyo: true }); }
          this.tweens.add({ targets: d.img, x: d.x + dir * 3, duration: 50, yoyo: true });
        } else if (ev.result === 'block') {
          v.f[o].hp = Math.max(0, v.f[o].hp - ev.dmg);
          d.set('brace'); sfx('block'); this.float(o, `Blocked −${ev.dmg}${ev.resisted ? ' · held firm' : ''}`, 'block');
          const spark = this.add.rectangle(d.x - dir * 12, GY - 28, 4, 4, P.lamp).setDepth(5); this.time.delayedCall(110, () => spark.destroy());
          if (m.heavy) this.float(who, '−2 stamina', 'st');
        } else {
          if (ev.empty) { this.say(`${nm} reels the anchor home through empty deck.`); this.float(who, 'Nothing in its path', 'miss'); } else { d.set('dodge'); this.float(o, 'Miss', 'miss'); }
          if (m.heavy || m.anim === 'haul') { sfx('wood'); this.chips(d.x - dir * 10, P.timberLight); } else if (m.anim === 'shot') { sfx('water'); }
        }
        this.refresh();
        await this.wait(m.heavy ? 260 : 190);
        if (lunge) await this.tween(a.img, { x: home }, 90);
        if (v.f[who].pending && m.releaseOf) { v.f[who].pending = null; a.rest = 'idle'; }
        a.busy = false; a.toRest();
        if (v.f[o].hp > 0) { const br = v.f[o].braced && !ev.broke; d.busy = br; d.set(br ? 'brace' : v.f[o].pending ? HOLD[v.f[o].pending!] ?? 'hold' : 'idle0'); }
        this.drawFx();
        await this.wait(120);
        void on;
        break;
      }
    }
  }

  // ---- after the fight -------------------------------------------------------------
  showResult(): void {
    const r = S.result;
    if (!r) { toHarbour(S); go(); return; }
    ui().querySelector('.resultpanel')?.remove();
    const leave = () => { toHarbour(S); resetGate(); go(); };
    const acts: HTMLElement[] = [];
    if (r.kind === 'friendly') {
      acts.push(btn(r.win ? 'Rematch' : 'Fight again', () => { rematch(S); go(); }, 'brass', { 'data-rematch': '1' }),
        btn('Fresh opponent', () => { const avoid = S.foe?.arch; goto(S, 'gate'); rollOffer(S, avoid); resetGate('friendly'); go(); }, '', { 'data-fresh': '1' }));
    } else if (r.win && r.nextFoe) {
      acts.push(btn(`Next bout: ${r.nextFoe}`, () => { nextBout(S); go(); }, 'brass', { 'data-next': '1' }), btn('Withdraw from the cup', () => { if (confirm('Leave the cup? You will restart it from the first qualifier.')) { leaveTour(S); resetGate(); go(); } }, 'small'));
    } else if (!r.win && r.tour) {
      acts.push(btn(`Enter ${TOURS[r.tour].name} again`, () => { const id = r.tour!; toHarbour(S); enterTour(S, id); go(); }, 'brass', { 'data-retry': '1' }));
    }
    if (!(r.kind === 'tour' && r.win && r.nextFoe)) acts.push(btn('◂ Harbour', leave, '', { 'data-leave': '1' }));
    const render = () => {
      const panel = h('div.resultpanel' + (r.win ? '.win' : '.loss'), { 'data-result': r.win ? 'win' : 'loss' },
        h('h2', null, r.win ? (r.kind === 'tour' ? 'Bout won' : 'Victory') : 'Beaten'),
        h('div.quote', null, `${r.foe}: "${r.foeLine}"`),
        h('div.rewards', null, r.gold ? h('span.chip', { 'data-won-gold': r.gold }, ico('gold'), `+${r.gold} gold`) : h('span.chip', null, 'No purse'), h('span.chip', { 'data-won-xp': r.xp }, ico('xp'), `+${r.xp} XP`), r.levels ? h('span.chip.lvl', null, `Level ${S.level}!`) : null),
        r.kind === 'tour' && !r.win ? h('p.small', null, 'You keep your gold, gear, level and titles. The cup restarts at its first qualifier.') : null,
        r.kind === 'tour' && r.win && r.nextFoe ? h('p.small', null, 'Patched up and rested. Loadout stays locked for the cup.') : null,
        r.unfinished ? h('p.small.warn', null, `That is as far as ${TOURS[r.tour!].name} is built. The later bouts and its champion arrive in the next pass. No title is awarded yet.`) : null,
        r.kind === 'friendly' ? h('p.small', null, 'You are patched up to full between friendlies.') : null,
        S.points > 0 ? attrSpender(render) : null,
        h('div.row', null, ...acts));
      ui().querySelector('.resultpanel')?.remove();
      ui().append(panel);
    };
    render();
  }

  showPrize(instant: boolean): void {
    const pz = S.prize, r = S.result;
    if (!pz) { this.showResult(); return; }
    const t = TOURS[pz.tour], w = pz.weapon ? WEAPONS[pz.weapon] : null;
    const cx = Math.round(L.W / 2);
    // prize cloth on the deck, and the champion's weapon leaving her hand to land on it
    const cloth = new Pix(44, 12); cloth.layer((q) => { q.poly([[2, 4], [42, 3], [40, 10], [4, 11]], P.red); q.rect(6, 6, 32, 1, P.brass); });
    this.add.image(cx, GY + 4, tex(this, 'cloth', cloth)).setOrigin(0.5, 0.5).setDepth(1);
    let done = false;
    const panelHost = h('div.resultpanel.win.prize', { 'data-result': 'prize' });
    const finish = () => {
      if (done) return; done = true;
      const render = () => panelHost.replaceChildren(...([
        h('h2', null, `${t.name}: Champion!`),
        h('div.quote', null, `${r?.foe ?? 'The champion'}: "${r?.foeLine ?? ''}"`),
        h('div.rewards', null, h('span.chip', null, ico('gold'), `+${pz.gold} gold`), r ? h('span.chip', null, ico('xp'), `+${r.xp} XP`) : null, h('span.chip', null, 'Pennant hoisted'), h('span.chip', null, ico('coin'), 'Cursed coin')),
        h('p.small', null, LOST[S.lost].coin),
        h('div.row', null, w && S.main !== w.id ? btn(`Equip ${w.name}`, () => { if (equip(S, w.id)) { sfx('steel'); commit(); this.A[0].setWeapon(w.id, offDraw(S, w.id)); this.A[0].set('cheer'); render(); } }, 'brass', { 'data-equip-prize': w.id }) : w ? h('span.tag', null, 'In hand') : null,
          btn('◂ Harbour', () => { toHarbour(S); resetGate(); go(); }, '', { 'data-leave': '1' })),
        w ? h('div.cmp', null, h('b', null, `Signature prize: ${w.name}`), h('div.small', null, FAMILY_INFO[w.family].trick + ' The same rule the champion used on you.'), ...w.moves.map((m) => moveRow(effAttrs(S), w.id, m))) : null,
        S.points > 0 ? attrSpender(render) : null] as (HTMLElement | null)[]).filter((x): x is HTMLElement => !!x));
      render();
    };
    ui().append(panelHost);
    if (w && !instant && !S.settings.reduced) {
      const ws = weaponSprite(w.sprite);
      const img = this.add.image(this.A[1].x, GY - 20, tex(this, 'prizew', ws.pix)).setDepth(6).setScale(2);
      panelHost.append(btn('Skip', () => { img.setPosition(cx, GY - 4).setAngle(0); finish(); }, 'small', { 'data-skip': '1' }));
      sfx('chain');
      this.tweens.add({ targets: img, x: cx, duration: 900, ease: 'Linear' });
      this.tweens.add({ targets: img, y: GY - 90, duration: 450, ease: 'Quad.out', yoyo: true, onComplete: () => { img.y = GY - 4; sfx('bell'); this.chips(cx, P.brass); finish(); } });
      this.tweens.add({ targets: img, angle: 360, duration: 900 });
    } else {
      if (w) this.add.image(cx, GY - 4, tex(this, 'prizew', weaponSprite(w.sprite).pix)).setDepth(6).setScale(2);
      finish();
    }
  }
}
void NPCS;
