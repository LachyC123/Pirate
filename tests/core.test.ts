import { describe, expect, it } from 'vitest';
import { Battle, Ev, legal, makeFighter, moveStats, newBattle, takeTurn } from '../src/core/battle';
import { chooseAI } from '../src/core/ai';
import { act, acceptOffer, blankSave, buy, createPirate, enterTour, equip, nextBout, presented, rollOffer, toHarbour, Save } from '../src/core/game';
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
      for (let i = 0; i < 60 && b.over === null; i++) {
        const pa = chooseAI(b, 0, 'moll'); expect(legal(b, 0, pa).ok).toBe(true); takeTurn(b, 0, pa, []);
        if (b.over !== null) break;
        const ea = chooseAI(b, 1, n.ai); expect(legal(b, 1, ea).ok).toBe(true); takeTurn(b, 1, ea, []);
      }
    }
  });
  it('every weapon move exists', () => { for (const w of Object.values(WEAPONS)) for (const m of w.moves) expect(MOVES[m]).toBeTruthy(); });
});

describe('career', () => {
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
