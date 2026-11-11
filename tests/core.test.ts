import { describe, expect, it } from 'vitest';
import { Battle, Ev, autoTurn, legal, makeFighter, moveStats, newBattle, takeTurn } from '../src/core/battle';
import { chooseAI } from '../src/core/ai';
import { act, acceptOffer, blankSave, buy, createPirate, effAttrs, enterTour, equip, lookOf, nextBout, offMove, playerMaxHp, playerMaxSt, presented, rollOffer, toHarbour, Save } from '../src/core/game';
import { advise } from '../src/core/ai';
import { TOURS, TOUR_ORDER, WEARS } from '../src/core/data';
import { migrate } from '../src/core/save';
import { ARCHETYPES, MOVES, NPCS, WEAPONS } from '../src/core/data';

const A = { might: 2, finesse: 2, grit: 2, guile: 2 };
const duel = (pw: string, ew: string, seed = 7): Battle => newBattle(seed, makeFighter('P', A, pw, 30, 2), makeFighter('E', A, ew, 30, 4));
const fresh = (): Save => { const s = blankSave(); createPirate(s, 'Test', s.look, 'ship'); s.seed = 1234; return s; };
/** win the current battle by brute force: used only to drive career transitions */
function forceWin(s: Save): void { s.battle!.f[1].hp = 1; s.battle!.f[1].braced = false; let n = 0; while (s.battle!.over === null && n++ < 200) { const d = Math.abs(s.battle!.f[0].pos - s.battle!.f[1].pos); s.battle!.f[0].st = 10; s.battle!.f[0].hp = 99; act(s, d > 1 ? { t: 'advance' } : { t: 'move', id: 'cuff' }); } presented(s); }

describe('duel rules', () => {
  it('pike example: jab from two spaces, cramped at one, shove restores distance', () => {
    const b = duel('gull_sticker', 'chipped_hanger');
    expect(legal(b, 0, { t: 'move', id: 'thrust' }).ok).toBe(true);
    const far = moveStats(b, 0, 'thrust');
    b.f[1].pos = 3;
    const near = moveStats(b, 0, 'thrust');
    expect(near.acc).toBeLessThan(far.acc);
    expect(near.hi).toBeLessThan(far.hi);
    expect(near.note).toMatch(/leverage/i);
    expect(legal(b, 0, { t: 'move', id: 'lunge' }).ok).toBe(false);
    // shove until it lands: the enemy ends up back at two spaces
    for (let seed = 1; seed < 40; seed++) {
      const c = duel('gull_sticker', 'chipped_hanger', seed); c.f[1].pos = 3;
      const evs: Ev[] = []; takeTurn(c, 0, { t: 'move', id: 'shove' }, evs);
      const hit = evs.find((e) => e.e === 'attack' && e.result === 'hit');
      if (hit) { expect(c.f[1].pos).toBe(4); return; }
    }
    throw new Error('shove never landed');
  });
  it('hanger cannot reach at two spaces and explains why', () => {
    const r = legal(duel('chipped_hanger', 'chipped_hanger'), 0, { t: 'move', id: 'slash' });
    expect(r.ok).toBe(false);
    expect(r.why).toMatch(/Too far/);
  });
  it('catch breath is always legal, even at zero stamina', () => {
    const b = duel('chipped_hanger', 'chipped_hanger'); b.f[0].st = 0;
    expect(legal(b, 0, { t: 'breath' }).ok).toBe(true);
    const evs: Ev[] = []; takeTurn(b, 0, { t: 'breath' }, evs);
    expect(b.f[0].st).toBeGreaterThan(3);
  });
  it('a braced block halves damage and readies a riposte for one turn', () => {
    for (let seed = 1; seed < 60; seed++) {
      const b = duel('chipped_hanger', 'chipped_hanger', seed); b.f[1].pos = 3;
      const evs: Ev[] = [];
      takeTurn(b, 0, { t: 'brace' }, evs);
      takeTurn(b, 1, { t: 'move', id: 'hack' }, evs);
      const at = evs.find((e) => e.e === 'attack');
      if (at && at.e === 'attack' && at.result === 'block') {
        expect(at.dmg).toBeLessThanOrEqual(4);
        expect(b.f[0].riposte).toBe(true);
        expect(legal(b, 0, { t: 'move', id: 'riposte' }).ok).toBe(true);
        takeTurn(b, 0, { t: 'advance' }, evs); // illegal in play, but riposte must expire regardless
        expect(b.f[0].riposte).toBe(false);
        return;
      }
    }
    throw new Error('never blocked');
  });
  it('pistol: one loaded shot, not at one space, reload costs the turn', () => {
    const b = duel('powder_promise', 'chipped_hanger');
    expect(b.f[0].loaded).toBe(true);
    const evs: Ev[] = []; takeTurn(b, 0, { t: 'move', id: 'shot' }, evs);
    expect(b.f[0].loaded).toBe(false);
    expect(legal(b, 0, { t: 'move', id: 'shot' }).why).toMatch(/reload/i);
    takeTurn(b, 0, { t: 'move', id: 'reload' }, evs);
    b.f[1].pos = 3;
    expect(legal(b, 0, { t: 'move', id: 'shot' }).why).toMatch(/Too close/);
  });
  it('hook: cast telegraphs, haul pulls to one space, brace resists and costs the hauler', () => {
    let pulled = false, resisted = false;
    for (let seed = 1; seed < 80 && !(pulled && resisted); seed++) {
      for (const brace of [false, true]) {
        const b = duel('chipped_hanger', 'towline', seed);
        const evs: Ev[] = [];
        takeTurn(b, 1, { t: 'move', id: 'cast' }, evs);
        const cast = evs.find((e) => e.e === 'cast');
        expect(cast && cast.e === 'cast' && cast.cells).toEqual([3, 2]);
        expect(b.f[1].pending).toBe('cast');
        takeTurn(b, 0, brace ? { t: 'brace' } : { t: 'breath' }, evs);
        const st = b.f[1].st;
        takeTurn(b, 1, { t: 'move', id: 'haul' }, evs);
        const at = evs.filter((e) => e.e === 'attack').pop();
        if (!at || at.e !== 'attack' || at.result === 'miss') continue;
        if (brace) { expect(at.result).toBe('block'); expect(b.f[0].pos).toBe(2); expect(b.f[1].st).toBeLessThan(st - 2 + 1); resisted = true; }
        else { expect(b.f[0].pos).toBe(3); pulled = true; }
      }
    }
    expect(pulled && resisted).toBe(true);
  });
  it('same seed and inputs give the same fight (no hidden randomness)', () => {
    const run = () => { const b = duel('chipped_hanger', 'gull_sticker', 99); const evs: Ev[] = []; for (let i = 0; i < 12 && b.over === null; i++) { takeTurn(b, 0, chooseAI(b, 0, 'duelist'), evs); if (b.over === null) takeTurn(b, 1, chooseAI(b, 1, 'guard'), evs); } return JSON.stringify(evs); };
    expect(run()).toBe(run());
  });
  it('AI always returns a legal action', () => {
    for (const n of [...Object.values(NPCS), ...ARCHETYPES]) for (let seed = 1; seed < 30; seed++) {
      const b = newBattle(seed, makeFighter('P', A, 'towline', 30, 2), makeFighter('E', n.attrs, n.weapon, n.hp, 4));
      const checked = (style: any) => (bb: Battle, w: 0 | 1) => { const a = chooseAI(bb, w, style); expect(legal(bb, w, a).ok).toBe(true); return a; };
      for (let i = 0; i < 60 && b.over === null; i++) { autoTurn(b, 0, checked('moll'), []); if (b.over === null) autoTurn(b, 1, checked(n.ai), []); }
    }
  });
  it('every weapon move exists', () => { for (const w of Object.values(WEAPONS)) for (const m of w.moves) expect(MOVES[m]).toBeTruthy(); });
  it('paired blades: a landed cut pauses for a paid follow-up before the enemy replies', () => {
    for (let seed = 1; seed < 60; seed++) {
      const b = duel('fishwifes_pair', 'chipped_hanger', seed); b.f[1].pos = 3;
      const evs: Ev[] = []; takeTurn(b, 0, { t: 'move', id: 'cut' }, evs);
      if (b.chain !== 0) continue;
      expect(legal(b, 0, { t: 'advance' }).ok).toBe(false);
      expect(legal(b, 1, { t: 'breath' }).ok).toBe(false);
      const st = b.f[0].st;
      takeTurn(b, 0, { t: 'follow' }, evs);
      expect(b.chain).toBeNull(); expect(b.f[0].st).toBe(st - 3 + 1);
      return;
    }
    throw new Error('cut never landed');
  });
  it('guard breaker ignores a brace and drives the enemy back', () => {
    for (let seed = 1; seed < 60; seed++) {
      const b = duel('caulking_mallet', 'chipped_hanger', seed); b.f[1].pos = 3; b.f[1].braced = true;
      const evs: Ev[] = []; takeTurn(b, 0, { t: 'move', id: 'breaker' }, evs);
      const at = evs.find((e) => e.e === 'attack');
      if (at && at.e === 'attack' && at.result === 'hit') { expect(at.broke).toBe(true); expect(at.dmg).toBeGreaterThanOrEqual(7); expect(b.f[1].pos).toBe(4); expect(b.f[1].riposte).toBe(false); return; }
    }
    throw new Error('breaker never landed');
  });
  it("Cooper's driver: stepping back makes it whiff and costs him stamina", () => {
    const b = duel('chipped_hanger', 'coopers_persuader'); b.f[1].pos = 3;
    const evs: Ev[] = [];
    takeTurn(b, 1, { t: 'move', id: 'plant' }, evs);
    expect(advise(b, 0)).toEqual({ t: 'withdraw' });
    takeTurn(b, 0, { t: 'withdraw' }, evs);
    const a = chooseAI(b, 1, 'mauler'); expect(a).toEqual({ t: 'whiff' });
    const st = b.f[1].st; takeTurn(b, 1, a, evs);
    expect(b.f[1].pending).toBeNull(); expect(b.f[1].st).toBe(st - 2 + 1); expect(b.f[0].hp).toBe(30);
  });
  it('anchor: heave marks the space, reel strikes inside the mark and misses beyond it', () => {
    const b = duel('chipped_hanger', 'kedge_chain');
    const evs: Ev[] = [];
    takeTurn(b, 1, { t: 'move', id: 'heave' }, evs);
    expect(b.f[1].anchor).toBe(2);
    expect(legal(b, 1, { t: 'move', id: 'heave' }).why).toMatch(/Reel/);
    expect(advise(b, 0)).toEqual({ t: 'withdraw' });
    const hp = b.f[0].hp;
    takeTurn(b, 0, { t: 'withdraw' }, evs);
    takeTurn(b, 1, { t: 'move', id: 'reel' }, evs);
    expect(b.f[0].hp).toBe(hp); expect(b.f[1].anchor).toBeNull();
    const last = evs.filter((e) => e.e === 'attack').pop(); expect(last && last.e === 'attack' && last.empty).toBe(true);
    // standing on the mark instead: struck and dragged in
    for (let seed = 1; seed < 40; seed++) {
      const c = duel('chipped_hanger', 'kedge_chain', seed); c.f[1].anchor = 2;
      const e2: Ev[] = []; takeTurn(c, 1, { t: 'move', id: 'reel' }, e2);
      const at = e2.find((e) => e.e === 'attack');
      if (at && at.e === 'attack' && at.result === 'hit') { expect(c.f[0].pos).toBe(3); return; }
    }
    throw new Error('reel never landed');
  });
  it('double hitch dashes in and cuts twice. A brace turns both', () => {
    const b = duel('chipped_hanger', 'tansys_hitches'); b.f[1].pos = 5;
    const evs: Ev[] = [];
    takeTurn(b, 1, { t: 'move', id: 'cross' }, evs);
    expect(advise(b, 0)).toEqual({ t: 'brace' });
    takeTurn(b, 0, { t: 'brace' }, evs);
    takeTurn(b, 1, { t: 'move', id: 'flurry' }, evs);
    expect(b.f[1].pos).toBe(3);
    const hits = evs.filter((e) => e.e === 'attack');
    expect(hits.length).toBe(2); expect(hits.every((e) => e.e === 'attack' && e.result !== 'hit')).toBe(true);
  });
});

describe('career', () => {
  it('wearables and off-hand gear change the fighter, and two-handed families shelve the off hand', () => {
    const s = fresh(); s.gold = 500;
    const hp = playerMaxHp(s), st = playerMaxSt(s);
    expect(buy(s, 'knit_cap', true)).toBe(true); expect(playerMaxHp(s)).toBe(hp + 3); expect(lookOf(s).hat).toBe('knit');
    expect(buy(s, 'straw_hat', true)).toBe(true); expect(playerMaxHp(s)).toBe(hp); expect(playerMaxSt(s)).toBe(st + 1);
    expect(buy(s, 'tricorn', true)).toBe(true); expect(effAttrs(s).guile).toBe(3); expect(s.attrs.guile).toBe(2);
    expect(buy(s, 'buckler', true)).toBe(true); expect(offMove(s)).toBe('bash');
    expect(buy(s, 'fishwifes_pair', true)).toBe(true); expect(offMove(s)).toBe('cuff');
    expect(buy(s, 'diving_helmet')).toBe(false); // champions only
    rollOffer(s); acceptOffer(s); expect(s.battle!.f[0].off).toBe('cuff'); expect(s.battle!.f[0].guard).toBe(0);
    for (const w of Object.values(WEARS)) if (w.move) expect(MOVES[w.move].offhand).toBe(true);
  });
  it('the whole Tarwater circuit can be won in order, each prize once', () => {
    const s = fresh();
    for (const id of TOUR_ORDER) {
      enterTour(s, id); expect(s.tour!.id).toBe(id);
      for (let r = 0; r < TOURS[id].rounds.length; r++) { forceWin(s); if (r < TOURS[id].rounds.length - 1) nextBout(s); }
      expect(s.titles).toContain(id); expect(s.owned).toContain(TOURS[id].prize.weapon!); toHarbour(s);
    }
    expect(s.coins).toBe(4); expect(s.titles.length).toBe(4);
  });
  it('economy: 8 gold, about 12 per friendly, pike at 30 after two wins', () => {
    const s = fresh();
    expect(s.gold).toBe(8);
    expect(buy(s, 'gull_sticker')).toBe(false);
    for (let i = 0; i < 2; i++) { rollOffer(s); expect(s.offer!.purse).toBeGreaterThanOrEqual(11); expect(s.offer!.purse).toBeLessThanOrEqual(13); acceptOffer(s); forceWin(s); toHarbour(s); }
    expect(s.gold).toBeGreaterThanOrEqual(30);
    expect(buy(s, 'gull_sticker', true)).toBe(true);
    expect(buy(s, 'gull_sticker')).toBe(false);
    expect(s.main).toBe('gull_sticker');
  });
  it('a friendly loss costs nothing and still gives a little XP', () => {
    const s = fresh(); rollOffer(s); acceptOffer(s);
    s.battle!.f[0].hp = 1; let n = 0;
    while (s.battle!.over === null && n++ < 300) { s.battle!.f[0].hp = Math.min(s.battle!.f[0].hp, 1); act(s, { t: 'breath' }); }
    expect(s.result!.win).toBe(false); expect(s.gold).toBe(8); expect(s.xp).toBe(2);
  });
  it('tournament: rounds advance, loadout locks, prize is granted exactly once, next cup opens', () => {
    const s = fresh();
    enterTour(s, 'coopers_purse'); expect(s.tour).toBeNull();
    enterTour(s, 'tar_bucket'); expect(s.foe!.name).toBe('Nib Pike');
    s.owned.push('gull_sticker'); expect(equip(s, 'gull_sticker')).toBe(false);
    forceWin(s); expect(s.tour!.round).toBe(1); expect(s.screen).toBe('result');
    nextBout(s); expect(s.foe!.name).toBe('Pistol Pip');
    forceWin(s); nextBout(s); expect(s.foe!.name).toBe('Old Moll Towline');
    const gold = s.gold;
    forceWin(s);
    expect(s.screen).toBe('prize'); expect(s.titles).toEqual(['tar_bucket']); expect(s.coins).toBe(1); expect(s.owned).toContain('towline'); expect(s.gold).toBe(gold + 40);
    const snap = JSON.stringify(s);
    expect(act(s, { t: 'breath' })).toBeNull(); presented(s);
    expect(JSON.stringify(s)).toBe(snap); // double taps and replays cannot pay twice
    expect(equip(s, 'towline')).toBe(true);
    toHarbour(s);
    enterTour(s, 'tar_bucket'); expect(s.tour).toBeNull(); // cannot farm the prize
    enterTour(s, 'coopers_purse'); expect(s.foe!.name).toBe('Barrel Bess');
  });
  it('losing a tournament bout keeps possessions and resets the cup', () => {
    const s = fresh(); enterTour(s, 'tar_bucket'); forceWin(s); nextBout(s);
    const gold = s.gold, lvl = s.level; let n = 0;
    while (s.battle!.over === null && n++ < 300) { s.battle!.f[0].hp = 1; act(s, { t: 'breath' }); }
    expect(s.result!.win).toBe(false); expect(s.tour).toBeNull(); expect(s.gold).toBe(gold); expect(s.level).toBe(lvl); expect(s.owned).toContain('chipped_hanger');
  });
  it('saving mid-turn stores the resolved outcome: reload cannot reroll', () => {
    const s = fresh(); rollOffer(s); acceptOffer(s);
    act(s, { t: 'advance' });
    const stored = JSON.parse(JSON.stringify(s));
    expect(stored.pending.evs.length).toBeGreaterThan(0);
    const loaded = migrate(stored);
    expect(loaded.battle).toEqual(s.battle); expect(loaded.battle!.round).toBe(1);
  });
  it('older or damaged saves load tolerantly', () => {
    const s = fresh(); s.owned.push('weapon_from_the_future'); s.main = 'weapon_from_the_future'; s.titles.push('unknown_cup');
    const raw: any = JSON.parse(JSON.stringify(s)); delete raw.settings; delete raw.seen; raw.battle = { junk: true }; raw.screen = 'battle';
    const m = migrate(raw);
    expect(m.main).toBe('chipped_hanger'); expect(m.owned).toEqual(['chipped_hanger']); expect(m.titles).toEqual([]); expect(m.screen).toBe('harbour'); expect(m.settings.mute).toBe(false);
    expect(migrate(null).screen).toBe('create'); expect(migrate({ v: 999 }).screen).toBe('create');
  });
});
