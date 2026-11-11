// Pure duel resolver. No rendering, no storage. Deterministic from Battle.seed.
import { Attrs, LANE, MOVES, MoveDef, WEAPONS } from './data';

export interface Fighter {
  name: string;
  hp: number;
  maxHp: number;
  st: number;
  maxSt: number;
  pos: number;
  attrs: Attrs;
  weapon: string;
  loaded: boolean;
  braced: boolean;
  riposte: boolean;
  /** id of a wound-up move waiting for release */
  pending: string | null;
  acc: number;
}

export interface Battle {
  seed: number;
  round: number;
  f: [Fighter, Fighter];
  over: null | 0 | 1;
  /** last action label per side, the AI may read the opponent's */
  last: [string | null, string | null];
}

export type Action = { t: 'advance' } | { t: 'withdraw' } | { t: 'brace' } | { t: 'breath' } | { t: 'move'; id: string };

export interface Snap { hp: number; st: number; pos: number; loaded: boolean; braced: boolean; riposte: boolean; pending: string | null }

export type Ev =
  | { e: 'step'; who: 0 | 1; from: number; to: number; why: 'advance' | 'withdraw' | 'push' | 'pull' }
  | { e: 'attack'; who: 0 | 1; move: string; result: 'hit' | 'miss' | 'block'; dmg: number; note?: string; pinned?: boolean; resisted?: boolean }
  | { e: 'brace'; who: 0 | 1 }
  | { e: 'breath'; who: 0 | 1; gain: number }
  | { e: 'reload'; who: 0 | 1 }
  | { e: 'cast'; who: 0 | 1; move: string; cells: number[]; caption: string }
  | { e: 'drop'; who: 0 | 1 }
  | { e: 'ko'; who: 0 | 1 }
  | { e: 'sync'; f: [Snap, Snap] };

export function rnd(b: Battle): number {
  b.seed = (b.seed + 0x6d2b79f5) | 0;
  let t = b.seed;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const rint = (b: Battle, lo: number, hi: number) => lo + Math.floor(rnd(b) * (hi - lo + 1));

export const dist = (b: Battle) => Math.abs(b.f[0].pos - b.f[1].pos);
export const dirOf = (b: Battle, who: 0 | 1) => (b.f[1 - who].pos > b.f[who].pos ? 1 : -1);
export const other = (who: 0 | 1) => (1 - who) as 0 | 1;

export function movesOf(f: Fighter): string[] {
  const w = WEAPONS[f.weapon];
  return [...(w ? w.moves : []), 'cuff'];
}

export interface MoveStats { lo: number; hi: number; acc: number; st: number; ok: boolean; why?: string; note?: string; reach?: [number, number] }

/** Numbers shown to the player and used by the resolver: one source of truth. */
export function moveStats(b: Battle, who: 0 | 1, id: string): MoveStats {
  const m: MoveDef = MOVES[id];
  const me = b.f[who];
  const d = dist(b);
  const w = WEAPONS[me.weapon];
  let lo = 0, hi = 0, acc = 0;
  let note: string | undefined;
  if (m.dmg) {
    const bonus = Math.floor(me.attrs[m.scale ?? 'might'] * (m.k ?? 0.5)) + (m.offhand ? 0 : w?.power ?? 0);
    lo = m.dmg[0] + bonus;
    hi = m.dmg[1] + bonus;
    acc = (m.acc ?? 80) + me.attrs.finesse * 2 - 2 + me.acc;
    if (m.falloff && d > m.falloff.from) acc -= (d - m.falloff.from) * m.falloff.per;
    if (m.poor && d === m.poor.dist) {
      acc += m.poor.acc;
      lo = Math.max(1, Math.floor(lo * m.poor.dmgMul));
      hi = Math.max(1, Math.floor(hi * m.poor.dmgMul));
      note = m.poor.note;
    }
    if (m.pull && d === 1) {
      lo = Math.max(1, Math.floor(lo / 3));
      hi = Math.max(1, Math.floor(hi / 3));
      note = 'Slack line: they already closed in';
    }
    acc = Math.max(30, Math.min(96, acc));
  }
  const res: MoveStats = { lo, hi, acc, st: m.st, ok: true, note, reach: m.reach };
  const fail = (why: string) => ({ ...res, ok: false, why });
  if (m.releaseOf && me.pending !== m.releaseOf) return fail(`Use ${MOVES[m.releaseOf].name} first`);
  if (m.windup && me.pending) return fail('Line already out');
  if (m.needsRiposte && !me.riposte) return fail('Only after blocking a hit while braced');
  if (m.needsLoaded && !me.loaded) return fail('Pistol is empty: reload first');
  if (m.reload && me.loaded) return fail('Already loaded');
  if (m.reach) {
    if (d > m.reach[1]) return fail(`Too far: reaches ${m.reach[1]} space${m.reach[1] > 1 ? 's' : ''}, enemy is at ${d}`);
    if (d < m.reach[0]) return fail(`Too close: needs ${m.reach[0]} spaces, enemy is at ${d}`);
  }
  if (me.st < m.st) return fail(`Out of breath: needs ${m.st} stamina`);
  return res;
}

export function legal(b: Battle, who: 0 | 1, a: Action): { ok: boolean; why?: string } {
  if (b.over !== null) return { ok: false, why: 'The fight is over' };
  const me = b.f[who];
  switch (a.t) {
    case 'advance':
      return dist(b) > 1 ? { ok: true } : { ok: false, why: 'Already toe to toe' };
    case 'withdraw': {
      const to = me.pos - dirOf(b, who);
      return to >= 0 && to < LANE ? { ok: true } : { ok: false, why: 'Your back is against the rail' };
    }
    case 'brace':
    case 'breath':
      return { ok: true };
    case 'move': {
      if (!MOVES[a.id] || !movesOf(me).includes(a.id)) return { ok: false, why: 'Not one of your moves' };
      const s = moveStats(b, who, a.id);
      return { ok: s.ok, why: s.why };
    }
  }
}

export const breathGain = (f: Fighter) => 4 + Math.floor(f.attrs.grit / 2);
export const blockDamage = (dmg: number, f: Fighter) => Math.max(1, Math.floor(dmg / 2) - Math.floor(f.attrs.grit / 2));

const snap = (f: Fighter): Snap => ({ hp: f.hp, st: f.st, pos: f.pos, loaded: f.loaded, braced: f.braced, riposte: f.riposte, pending: f.pending });
const sync = (b: Battle): Ev => ({ e: 'sync', f: [snap(b.f[0]), snap(b.f[1])] });

/** Cells strictly between attacker and target plus the target cell. */
function threatened(b: Battle, who: 0 | 1): number[] {
  const a = b.f[who].pos, t = b.f[other(who)].pos, s = Math.sign(t - a);
  const out: number[] = [];
  for (let p = a + s; p !== t + s; p += s) out.push(p);
  return out;
}

/** One fighter's whole turn. Mutates b, appends events. Caller checked legality. */
export function takeTurn(b: Battle, who: 0 | 1, a: Action, evs: Ev[]): void {
  const me = b.f[who];
  const foe = b.f[other(who)];
  const o = other(who);
  // start of turn upkeep
  me.braced = false;
  const hadRiposte = me.riposte;
  const releasing = a.t === 'move' && MOVES[a.id].releaseOf === me.pending;
  if (me.pending && !releasing) {
    me.pending = null;
    evs.push({ e: 'drop', who });
  }
  b.last[who] = a.t === 'move' ? a.id : a.t;

  if (a.t === 'advance' || a.t === 'withdraw') {
    const from = me.pos;
    me.pos += a.t === 'advance' ? dirOf(b, who) : -dirOf(b, who);
    evs.push({ e: 'step', who, from, to: me.pos, why: a.t });
  } else if (a.t === 'brace') {
    me.braced = true;
    me.st = Math.min(me.maxSt, me.st + 1);
    evs.push({ e: 'brace', who });
  } else if (a.t === 'breath') {
    const before = me.st;
    me.st = Math.min(me.maxSt, me.st + breathGain(me));
    evs.push({ e: 'breath', who, gain: me.st - before });
  } else {
    const m = MOVES[a.id];
    const s = moveStats(b, who, a.id);
    me.st -= m.st;
    if (m.reload) {
      me.loaded = true;
      evs.push({ e: 'reload', who });
    } else if (m.windup) {
      me.pending = m.id;
      evs.push({ e: 'cast', who, move: m.id, cells: threatened(b, who), caption: m.windup.caption });
    } else {
      if (m.unload) me.loaded = false;
      if (m.releaseOf) me.pending = null;
      const d = dist(b);
      const hit = rnd(b) * 100 < s.acc;
      if (!hit) {
        evs.push({ e: 'attack', who, move: m.id, result: 'miss', dmg: 0, note: s.note });
      } else {
        let dmg = rint(b, s.lo, s.hi);
        if (foe.braced) {
          dmg = blockDamage(dmg, foe);
          foe.riposte = true;
          const resisted = !!(m.pull || m.push);
          if (m.heavy) me.st = Math.max(0, me.st - 2);
          foe.hp = Math.max(0, foe.hp - dmg);
          evs.push({ e: 'attack', who, move: m.id, result: 'block', dmg, resisted, note: s.note });
        } else {
          let pinned = false;
          let stepEv: Ev | null = null;
          if (m.push) {
            const to = foe.pos + dirOf(b, who);
            if (to >= 0 && to < LANE) {
              stepEv = { e: 'step', who: o, from: foe.pos, to, why: 'push' };
              foe.pos = to;
            } else {
              pinned = true;
              dmg += 2;
            }
          }
          if (m.pull && d > 1) {
            const to = me.pos + dirOf(b, who);
            stepEv = { e: 'step', who: o, from: foe.pos, to, why: 'pull' };
            foe.pos = to;
          }
          foe.hp = Math.max(0, foe.hp - dmg);
          evs.push({ e: 'attack', who, move: m.id, result: 'hit', dmg, pinned, note: s.note });
          if (stepEv) evs.push(stepEv);
        }
      }
    }
  }
  if (hadRiposte) me.riposte = false;
  // end of turn: one free breath, so shown stamina is always spendable stamina
  me.st = Math.min(me.maxSt, me.st + 1);
  if (foe.hp <= 0) {
    b.over = who;
    evs.push({ e: 'ko', who: o });
  }
  evs.push(sync(b));
}

export function makeFighter(name: string, attrs: Attrs, weapon: string, maxHp: number, pos: number, acc = 0): Fighter {
  const maxSt = 8 + attrs.grit;
  return { name, hp: maxHp, maxHp, st: maxSt, maxSt, pos, attrs: { ...attrs }, weapon, loaded: WEAPONS[weapon]?.family === 'pistol', braced: false, riposte: false, pending: null, acc };
}

export function newBattle(seed: number, p: Fighter, e: Fighter): Battle {
  return { seed: seed | 0, round: 0, f: [p, e], over: null, last: [null, null] };
}

export const cloneBattle = (b: Battle): Battle => JSON.parse(JSON.stringify(b));

/** Out-of-battle numbers for shop cards and level-up previews: ideal range, conditions met. */
export function sheetStats(attrs: Attrs, weapon: string, id: string, maxHp = 30): MoveStats {
  const m = MOVES[id];
  const me = makeFighter('', attrs, weapon, maxHp, 0);
  const d = m.reach ? (m.pull ? 2 : m.reach[1] > 2 ? Math.max(m.reach[0], 2) : m.reach[1]) : 2;
  const foe = makeFighter('', attrs, weapon, maxHp, d);
  me.riposte = true; me.loaded = !m.reload; me.pending = m.releaseOf ?? null;
  return moveStats(newBattle(1, me, foe), 0, id);
}
