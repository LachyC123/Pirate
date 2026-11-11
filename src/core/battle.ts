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
  /** off-hand move id */
  off: string;
  loaded: boolean;
  braced: boolean;
  riposte: boolean;
  /** id of a wound-up move waiting for release */
  pending: string | null;
  /** lane space where this fighter's anchor lies, if thrown */
  anchor: number | null;
  dazed: boolean;
  acc: number;
  /** flat damage taken off every hit */
  soak: number;
  /** extra damage blocked while braced */
  guard: number;
}

export interface Battle {
  seed: number;
  round: number;
  f: [Fighter, Fighter];
  over: null | 0 | 1;
  /** last action label per side, the AI may read the opponent's */
  last: [string | null, string | null];
  /** a lead cut landed: this side must choose follow or pass before play continues */
  chain: null | 0 | 1;
}

export type Action = { t: 'advance' } | { t: 'withdraw' } | { t: 'brace' } | { t: 'breath' } | { t: 'move'; id: string } | { t: 'follow' } | { t: 'pass' } | { t: 'whiff' };

export interface Snap { hp: number; st: number; pos: number; loaded: boolean; braced: boolean; riposte: boolean; pending: string | null; anchor: number | null; dazed: boolean }

export type Ev =
  | { e: 'step'; who: 0 | 1; from: number; to: number; why: 'advance' | 'withdraw' | 'push' | 'pull' | 'dash' }
  | { e: 'attack'; who: 0 | 1; move: string; result: 'hit' | 'miss' | 'block'; dmg: number; note?: string; pinned?: boolean; resisted?: boolean; broke?: boolean; again?: boolean; empty?: boolean }
  | { e: 'brace'; who: 0 | 1 }
  | { e: 'breath'; who: 0 | 1; gain: number }
  | { e: 'reload'; who: 0 | 1 }
  | { e: 'cast'; who: 0 | 1; move: string; cells: number[]; caption: string }
  | { e: 'anchor'; who: 0 | 1; cell: number }
  | { e: 'drop'; who: 0 | 1 }
  | { e: 'whiff'; who: 0 | 1; move: string }
  | { e: 'chain'; who: 0 | 1 }
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
  return [...(w ? w.moves : []), f.off];
}

/** Spaces a fighter threatens right now: a wound-up special's reach, or the path of a thrown anchor. */
export function threatCells(b: Battle, who: 0 | 1): number[] {
  const me = b.f[who], dir = dirOf(b, who), out: number[] = [];
  if (me.pending) {
    const rel = MOVES[MOVES[me.pending].windup!.release];
    const far = rel.pull ? Math.min(5, dist(b)) : rel.reach ? rel.reach[1] : 1;
    for (let i = 1; i <= far; i++) { const c = me.pos + dir * i; if (c >= 0 && c < LANE) out.push(c); }
  }
  if (me.anchor !== null) for (let c = me.pos + dir; c !== me.anchor + dir && c >= 0 && c < LANE; c += dir) out.push(c);
  return out;
}

export interface MoveStats { lo: number; hi: number; acc: number; st: number; ok: boolean; why?: string; note?: string; reach?: [number, number] }

/** Numbers shown to the player and used by the resolver: one source of truth. */
export function moveStats(b: Battle, who: 0 | 1, id: string): MoveStats {
  const m: MoveDef = MOVES[id];
  const me = b.f[who], foe = b.f[other(who)];
  const d = dist(b);
  const w = WEAPONS[me.weapon];
  let lo = 0, hi = 0, acc = 0;
  let note: string | undefined;
  if (m.dmg) {
    const bonus = Math.floor(me.attrs[m.scale ?? 'might'] * (m.k ?? 0.5)) + (m.offhand ? 0 : w?.power ?? 0);
    lo = m.daze ? 0 : m.dmg[0] + bonus;
    hi = m.daze ? 0 : m.dmg[1] + bonus;
    acc = (m.acc ?? 80) + me.attrs.finesse * 2 - 2 + me.acc;
    if (m.falloff && d > m.falloff.from) acc -= (d - m.falloff.from) * m.falloff.per;
    if (m.poor && d === m.poor.dist) {
      acc += m.poor.acc;
      lo = Math.max(1, Math.floor(lo * m.poor.dmgMul));
      hi = Math.max(1, Math.floor(hi * m.poor.dmgMul));
      note = m.poor.note;
    }
    if (m.pull && !m.reel && d === 1) {
      lo = Math.max(1, Math.floor(lo / 3));
      hi = Math.max(1, Math.floor(hi / 3));
      note = 'Slack line: they already closed in';
    }
    if (me.dazed) { acc -= 25; note = note ? note + '. Dazzled' : 'Dazzled: −25%'; }
    acc = Math.max(25, Math.min(96, acc));
  }
  if (m.reel && me.anchor !== null && !threatCells(b, who).includes(foe.pos)) note = 'Nothing in its path: just brings it home';
  const res: MoveStats = { lo, hi, acc, st: m.st, ok: true, note, reach: m.reach };
  const fail = (why: string) => ({ ...res, ok: false, why });
  if (m.chainOnly && b.chain !== who) return fail('Only straight after a cut lands');
  if (m.releaseOf && me.pending !== m.releaseOf) return fail(`Use ${MOVES[m.releaseOf].name} first`);
  if (m.windup && me.pending) return fail('Already wound up');
  if (m.needsRiposte && !me.riposte) return fail('Only after blocking a hit while braced');
  if (m.needsLoaded && !me.loaded) return fail('Pistol is empty: reload first');
  if (m.reload && me.loaded) return fail('Already loaded');
  if (m.reel && me.anchor === null) return fail('The anchor is in your hands: Heave it first');
  if (m.anchorThrow && me.anchor !== null) return fail('The anchor is out: Reel In first');
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
  if (b.chain !== null) {
    if (b.chain !== who) return { ok: false, why: 'Not your turn' };
    if (a.t === 'pass') return { ok: true };
    if (a.t === 'follow') { const s = moveStats(b, who, 'follow'); return { ok: s.ok, why: s.why }; }
    return { ok: false, why: 'Choose: follow up or hold back' };
  }
  switch (a.t) {
    case 'follow':
    case 'pass':
      return { ok: false, why: 'Only straight after a cut lands' };
    case 'whiff': {
      if (!me.pending) return { ok: false, why: 'Nothing wound up' };
      const rel = moveStats(b, who, MOVES[me.pending].windup!.release);
      return rel.ok ? { ok: false, why: 'It can still land' } : { ok: true };
    }
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
      if (!MOVES[a.id] || MOVES[a.id].chainOnly || !movesOf(me).includes(a.id)) return { ok: false, why: 'Not one of your moves' };
      const s = moveStats(b, who, a.id);
      return { ok: s.ok, why: s.why };
    }
  }
}

export const breathGain = (f: Fighter) => 4 + Math.floor(f.attrs.grit / 2);
export const blockDamage = (dmg: number, f: Fighter) => Math.max(1, Math.floor(dmg / 2) - Math.floor(f.attrs.grit / 2) - f.guard);

const snap = (f: Fighter): Snap => ({ hp: f.hp, st: f.st, pos: f.pos, loaded: f.loaded, braced: f.braced, riposte: f.riposte, pending: f.pending, anchor: f.anchor, dazed: f.dazed });
const sync = (b: Battle): Ev => ({ e: 'sync', f: [snap(b.f[0]), snap(b.f[1])] });

/** One blow. Returns true if it landed unblocked. */
function strike(b: Battle, who: 0 | 1, m: MoveDef, s: MoveStats, evs: Ev[], again: boolean): boolean {
  const me = b.f[who], o = other(who), foe = b.f[o];
  const d = dist(b);
  if (rnd(b) * 100 >= s.acc) {
    evs.push({ e: 'attack', who, move: m.id, result: 'miss', dmg: 0, note: s.note, again });
    return false;
  }
  let dmg = m.daze ? 0 : rint(b, s.lo, s.hi);
  if (foe.braced && !m.guardBreak) {
    dmg = m.daze ? 0 : Math.max(1, blockDamage(dmg, foe) - foe.soak);
    foe.riposte = true;
    if (m.heavy && !again) me.st = Math.max(0, me.st - 2);
    foe.hp = Math.max(0, foe.hp - dmg);
    evs.push({ e: 'attack', who, move: m.id, result: 'block', dmg, resisted: !!(m.pull || m.push), note: s.note, again });
    return false;
  }
  const broke = foe.braced && !!m.guardBreak;
  if (broke) foe.braced = false;
  let pinned = false;
  const steps: Ev[] = [];
  if (m.push) {
    const from = foe.pos;
    for (let i = 0; i < (m.pushBy ?? 1); i++) {
      const to = foe.pos + dirOf(b, who);
      if (to >= 0 && to < LANE) foe.pos = to; else pinned = true;
    }
    if (foe.pos !== from) steps.push({ e: 'step', who: o, from, to: foe.pos, why: 'push' });
    if (pinned) dmg += 2;
  }
  if (m.pull && d > 1) {
    const to = me.pos + dirOf(b, who);
    steps.push({ e: 'step', who: o, from: foe.pos, to, why: 'pull' });
    foe.pos = to;
  }
  if (!m.daze) dmg = Math.max(1, dmg - foe.soak);
  if (m.drain) foe.st = Math.max(0, foe.st - m.drain);
  if (m.daze) foe.dazed = true;
  foe.hp = Math.max(0, foe.hp - dmg);
  evs.push({ e: 'attack', who, move: m.id, result: 'hit', dmg, pinned, broke, note: s.note, again });
  evs.push(...steps);
  return true;
}

function endTurn(b: Battle, who: 0 | 1, evs: Ev[]): void {
  const me = b.f[who], o = other(who);
  me.dazed = false;
  // one free breath, so shown stamina is always spendable stamina
  me.st = Math.min(me.maxSt, me.st + 1);
  if (b.f[o].hp <= 0) {
    b.over = who;
    evs.push({ e: 'ko', who: o });
  }
  evs.push(sync(b));
}

/** One fighter's turn. Mutates b, appends events. Caller checked legality. May leave b.chain set. */
export function takeTurn(b: Battle, who: 0 | 1, a: Action, evs: Ev[]): void {
  const me = b.f[who];
  const foe = b.f[other(who)];
  if (a.t === 'follow' || a.t === 'pass') {
    b.chain = null;
    if (a.t === 'follow') {
      const m = MOVES.follow, s = moveStats({ ...b, chain: who }, who, 'follow');
      me.st -= m.st;
      strike(b, who, m, s, evs, true);
    }
    return endTurn(b, who, evs);
  }
  me.braced = false;
  const releasing = (a.t === 'move' && MOVES[a.id].releaseOf === me.pending) || a.t === 'whiff';
  if (me.pending && !releasing) {
    me.pending = null;
    evs.push({ e: 'drop', who });
  }
  b.last[who] = a.t === 'move' ? a.id : a.t;

  if (a.t === 'whiff') {
    const rel = MOVES[me.pending!].windup!.release;
    me.pending = null;
    me.st = Math.max(0, me.st - 2);
    evs.push({ e: 'whiff', who, move: rel });
  } else if (a.t === 'advance' || a.t === 'withdraw') {
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
    me.riposte = false;
    me.st -= m.st;
    if (m.reload) {
      me.loaded = true;
      evs.push({ e: 'reload', who });
    } else if (m.windup) {
      me.pending = m.id;
      evs.push({ e: 'cast', who, move: m.id, cells: threatCells(b, who), caption: m.windup.caption });
    } else {
      if (m.unload) me.loaded = false;
      if (m.releaseOf) me.pending = null;
      if (m.reel) {
        const inPath = threatCells(b, who).includes(foe.pos);
        me.anchor = null;
        if (!inPath) evs.push({ e: 'attack', who, move: m.id, result: 'miss', dmg: 0, empty: true, note: 'Nothing in its path' });
        else strike(b, who, m, s, evs, false);
      } else {
        if (m.dash && dist(b) > 1) {
          const from = me.pos;
          me.pos = foe.pos - dirOf(b, who);
          evs.push({ e: 'step', who, from, to: me.pos, why: 'dash' });
        }
        if (m.anchorThrow) {
          me.anchor = foe.pos;
          evs.push({ e: 'anchor', who, cell: foe.pos });
        }
        let landed = false;
        for (let i = 0; i < (m.hits ?? 1) && foe.hp > 0; i++) landed = strike(b, who, m, s, evs, i > 0);
        if (m.lead && landed && foe.hp > 0 && me.st >= MOVES.follow.st && dist(b) === 1) {
          b.chain = who;
          evs.push({ e: 'chain', who }, sync(b));
          return;
        }
      }
    }
  }
  me.riposte = false;
  endTurn(b, who, evs);
}

export interface FighterOpts { acc?: number; off?: string; soak?: number; guard?: number; st?: number }
export function makeFighter(name: string, attrs: Attrs, weapon: string, maxHp: number, pos: number, o: FighterOpts = {}): Fighter {
  const maxSt = Math.max(4, 8 + attrs.grit + (o.st ?? 0));
  return { name, hp: maxHp, maxHp, st: maxSt, maxSt, pos, attrs: { ...attrs }, weapon, off: o.off ?? 'cuff', loaded: WEAPONS[weapon]?.family === 'pistol', braced: false, riposte: false, pending: null, anchor: null, dazed: false, acc: o.acc ?? 0, soak: o.soak ?? 0, guard: o.guard ?? 0 };
}

export function newBattle(seed: number, p: Fighter, e: Fighter): Battle {
  return { seed: seed | 0, round: 0, f: [p, e], over: null, last: [null, null], chain: null };
}

export const cloneBattle = (b: Battle): Battle => JSON.parse(JSON.stringify(b));

/** A whole turn for one side including any follow-up choice. */
export function autoTurn(b: Battle, who: 0 | 1, decide: (b: Battle, who: 0 | 1) => Action, evs: Ev[]): void {
  takeTurn(b, who, decide(b, who), evs);
  if (b.chain === who) takeTurn(b, who, decide(b, who), evs);
}

/** Out-of-battle numbers for shop cards and level-up previews: ideal range, conditions met. */
export function sheetStats(attrs: Attrs, weapon: string, id: string, maxHp = 30): MoveStats {
  const m = MOVES[id];
  const me = makeFighter('', attrs, weapon, maxHp, 0);
  const d = m.reel ? 2 : m.reach ? (m.pull ? 2 : m.reach[1] > 2 ? Math.max(m.reach[0], 2) : m.reach[1]) : 2;
  const foe = makeFighter('', attrs, weapon, maxHp, d);
  me.riposte = true; me.loaded = !m.reload; me.pending = m.releaseOf ?? null; me.anchor = m.reel ? d : null;
  const b = newBattle(1, me, foe);
  if (m.chainOnly) b.chain = 0;
  return moveStats(b, 0, id);
}
