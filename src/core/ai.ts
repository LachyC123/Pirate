// Opponent decisions. Reads only the current public battle state and the
// opponent's previous move. Never sees the player's upcoming input.
import { AiStyle, MOVES, WEAPONS } from './data';
import { Action, Battle, dirOf, dist, legal, other, rnd, threatCells } from './battle';

const mv = (id: string): Action => ({ t: 'move', id });

/** how reliably each style answers a telegraphed threat correctly */
const WARY: Record<AiStyle, number> = { guard: 0.6, duelist: 0.7, brawler: 0.1, powder: 0.35, moll: 0.5, twin: 0.4, mauler: 0.25, mooring: 0.55 };

export function chooseAI(b: Battle, who: 0 | 1, style: AiStyle): Action {
  const pick = decide(b, who, style);
  return legal(b, who, pick).ok ? pick : { t: 'breath' };
}

function decide(b: Battle, who: 0 | 1, style: AiStyle): Action {
  const me = b.f[who];
  const foe = b.f[other(who)];
  const d = dist(b);
  const r = () => rnd(b);
  const can = (a: Action) => legal(b, who, a).ok;
  const st = me.st;
  const has = (id: string) => WEAPONS[me.weapon].moves.includes(id) || me.off === id;
  const canMove = (id: string) => has(id) && can(mv(id));
  const withdraw: Action = { t: 'withdraw' };
  const advance: Action = { t: 'advance' };
  const brace: Action = { t: 'brace' };
  const breath: Action = { t: 'breath' };
  const offhand = () => (canMove(me.off) ? mv(me.off) : breath);

  if (b.chain === who) return st >= 3 && (style === 'twin' || r() < 0.7) ? { t: 'follow' } : { t: 'pass' };
  // committed special always follows through: if the target slipped away it whiffs
  if (me.pending) {
    const rel = MOVES[me.pending].windup!.release;
    if (canMove(rel)) return mv(rel);
    return can({ t: 'whiff' }) ? { t: 'whiff' } : breath;
  }
  // answer a visible threat, more or less wisely
  const threatened = threatCells(b, other(who)).includes(me.pos);
  if (threatened && r() < WARY[style]) {
    const counter = foe.pending ? MOVES[foe.pending].windup!.counter : 'retreat';
    if (counter === 'brace') return brace;
    const back = me.pos - dirOf(b, who);
    const safe = can(withdraw) && !threatCells(b, other(who)).includes(back) && (!foe.pending || Math.abs(back - foe.pos) > (MOVES[MOVES[foe.pending].windup!.release].reach?.[1] ?? 1));
    if (safe) return withdraw;
    if (foe.anchor !== null) return brace;
  } else if (threatened && foe.pending && style === 'brawler' && d > 1) return advance;
  if (me.riposte && canMove('riposte')) return mv('riposte');

  switch (style) {
    case 'guard': {
      if (st < 2) return d === 1 && canMove(me.off) && r() < 0.5 ? mv(me.off) : breath;
      const misjudge = r() < 0.15;
      if (d === 1) {
        if (misjudge && canMove('thrust')) return mv('thrust');
        const x = r();
        if (canMove('shove') && x < 0.5) return mv('shove');
        if (canMove(me.off) && x < 0.8) return mv(me.off);
        if (can(withdraw)) return withdraw;
        return canMove('thrust') ? mv('thrust') : offhand();
      }
      if (d === 2) {
        if (st <= 3 && r() < 0.3) return brace;
        if (canMove('lunge') && r() < 0.3) return mv('lunge');
        return canMove('thrust') ? mv('thrust') : breath;
      }
      if (me.st < me.maxSt - 3 && r() < 0.5) return breath;
      return WEAPONS[foe.weapon].family === 'pistol' || r() < 0.6 ? advance : brace;
    }
    case 'brawler': {
      if (d > 1) return advance;
      const heavy = WEAPONS[me.weapon].moves.find((m) => MOVES[m].heavy && !MOVES[m].releaseOf);
      const basic = WEAPONS[me.weapon].moves.find((m) => !MOVES[m].heavy && MOVES[m].dmg && !MOVES[m].needsRiposte && !MOVES[m].needsLoaded);
      if (heavy && canMove(heavy) && r() < 0.6) return mv(heavy);
      if (basic && canMove(basic)) return mv(basic);
      return offhand();
    }
    case 'powder': {
      if (me.loaded) {
        if (d >= 2) return b.round === 0 || r() < 0.85 ? mv('shot') : brace;
        if (can(withdraw) && r() < 0.7) return withdraw;
        return canMove('sabre') ? mv('sabre') : offhand();
      }
      if (d === 1) {
        if (can(withdraw) && r() < 0.6) return withdraw;
        if (canMove('sabre')) return mv('sabre');
        return st < 2 ? breath : brace;
      }
      if (d === 2 && can(withdraw) && r() < 0.25) return withdraw;
      return mv('reload');
    }
    case 'duelist': {
      if (d > 1) return foe.loaded && WEAPONS[foe.weapon].family === 'pistol' && r() < 0.35 ? brace : advance;
      if (st < 2) return r() < 0.5 ? brace : breath;
      const foeRested = b.last[other(who)] === 'breath' || foe.st >= 4;
      if (foeRested && r() < 0.3) return brace;
      const heavy = WEAPONS[me.weapon].moves.find((m) => MOVES[m].heavy && !MOVES[m].releaseOf);
      if (heavy && canMove(heavy) && r() < 0.3) return mv(heavy);
      const basic = WEAPONS[me.weapon].moves.find((m) => !MOVES[m].heavy && MOVES[m].dmg && !MOVES[m].needsRiposte && !MOVES[m].needsLoaded && MOVES[m].reach && d >= MOVES[m].reach![0] && d <= MOVES[m].reach![1]);
      if (basic && canMove(basic)) return mv(basic);
      return offhand();
    }
    case 'moll': {
      if (st < 2) return breath;
      if (d >= 2 && d <= 4) {
        if (st >= 4 && r() < 0.8) return mv('cast');
        return st < 4 && r() < 0.5 ? breath : advance;
      }
      if (d > 4) return advance;
      if (canMove('rake') && r() < 0.72) return mv('rake');
      if (can(withdraw)) return withdraw;
      return canMove('rake') ? mv('rake') : breath;
    }
    case 'twin': {
      if (st < 2) return r() < 0.4 ? brace : breath;
      if (d > 1) {
        if (d <= 3 && st >= 5 && canMove('cross') && r() < 0.75) return mv('cross');
        return st < 4 && r() < 0.3 ? breath : advance;
      }
      if (st >= 6 && canMove('cross') && r() < 0.3) return mv('cross');
      if (st >= 6 && canMove('scissor') && r() < 0.3) return mv('scissor');
      return canMove('cut') ? mv('cut') : offhand();
    }
    case 'mauler': {
      if (d > 1) return st < 4 && r() < 0.45 ? breath : advance;
      if (st < 3) return breath;
      if (canMove('plant') && st >= 5 && r() < 0.35) return mv('plant');
      if (foe.braced && canMove('breaker')) return mv('breaker');
      if (canMove('breaker') && r() < 0.28) return mv('breaker');
      return canMove('thump') ? mv('thump') : offhand();
    }
    case 'mooring': {
      if (me.anchor !== null) {
        const inPath = threatCells(b, who).includes(foe.pos);
        if (st < 2) return breath;
        if (inPath) return r() < 0.9 ? mv('reel') : canMove('lash') ? mv('lash') : mv('reel');
        if (canMove('lash') && r() < 0.5) return mv('lash');
        return mv('reel');
      }
      if (d >= 2 && d <= 4) {
        if (st >= 4 && r() < 0.85) return mv('heave');
        if (canMove('lash') && r() < 0.6) return mv('lash');
        return st < 4 ? breath : advance;
      }
      if (d > 4) return advance;
      if (st < 2) return breath;
      if (canMove('heave') && r() < 0.65) return mv('heave');
      return canMove('lash') ? mv('lash') : breath;
    }
  }
}

/**
 * A steady, non-random policy for whoever holds the weapon. Used by the balance
 * sim and by the scripted playtest to pick which card to tap. It answers
 * telegraphs correctly every time, the way an attentive player would.
 */
export function advise(b: Battle, who: 0 | 1 = 0): Action {
  const me = b.f[who], foe = b.f[other(who)], d = dist(b), st = me.st;
  const can = (a: Action) => legal(b, who, a).ok;
  const m = (id: string): Action | null => (movesOf2(me.weapon, me.off).includes(id) && can(mv(id)) ? mv(id) : null);
  const rest: Action = { t: 'breath' };
  if (b.chain === who) return st >= 3 ? { t: 'follow' } : { t: 'pass' };
  if (me.pending) { const rel = m(MOVES[me.pending].windup!.release); if (rel) return rel; }
  const foeThreat = threatCells(b, other(who));
  if (foeThreat.includes(me.pos)) {
    const counter = foe.pending ? MOVES[foe.pending].windup!.counter : 'retreat';
    const back = me.pos - dirOf(b, who);
    const relReach = foe.pending ? MOVES[MOVES[foe.pending].windup!.release].reach?.[1] ?? 1 : 0;
    const safeBack = can({ t: 'withdraw' }) && (foe.pending ? Math.abs(back - foe.pos) > relReach : !foeThreat.includes(back));
    if (counter === 'retreat' && safeBack) return { t: 'withdraw' };
    if (counter === 'brace' || foe.anchor !== null) return { t: 'brace' };
  }
  if (me.riposte) { const rp = m('riposte'); if (rp) return rp; }
  const fam = WEAPONS[me.weapon].family;
  const off = () => m(me.off) ?? rest;
  switch (fam) {
    case 'hanger':
      if (d > 1) return { t: 'advance' };
      if (st >= 8 && !foe.braced) return m('cleave') ?? m('hack') ?? m('slash') ?? rest;
      if (st >= 2) return m('slash') ?? rest;
      return b.round % 2 ? { t: 'brace' } : rest;
    case 'pike':
      if (d === 2) return (st >= 6 ? m('lunge') : null) ?? m('thrust') ?? rest;
      if (d === 1) return m('shove') ?? (st >= MOVES[me.off].st ? off() : rest);
      return { t: 'advance' };
    case 'pistol':
      if (me.loaded) return d >= 2 ? m('shot') ?? rest : can({ t: 'withdraw' }) ? { t: 'withdraw' } : m('sabre') ?? rest;
      if (d >= 2) return m('reload') ?? rest;
      return m('sabre') ?? rest;
    case 'hook':
      if (d >= 2 && d <= 4) return m('cast') ?? rest;
      if (d === 1) return m('rake') ?? rest;
      return { t: 'advance' };
    case 'paired':
      if (d > 1) return (d <= 3 && st >= 5 ? m('cross') : null) ?? { t: 'advance' };
      if (st >= 8 && !foe.braced) return m('scissor') ?? m('cut') ?? rest;
      return (st >= 5 ? m('cut') : null) ?? (st >= 2 && foe.hp <= 6 ? m('cut') : null) ?? rest;
    case 'maul':
      if (d > 1) return { t: 'advance' };
      if (foe.braced) return m('breaker') ?? m('thump') ?? rest;
      return m('thump') ?? rest;
    case 'anchor':
      if (me.anchor !== null) return (threatCells(b, who).includes(foe.pos) ? m('reel') : null) ?? (st >= 4 ? m('lash') : null) ?? m('reel') ?? rest;
      if (d <= 4) return m('heave') ?? (d <= 2 ? m('lash') : null) ?? rest;
      return { t: 'advance' };
  }
}
const movesOf2 = (weapon: string, off: string) => [...WEAPONS[weapon].moves, off];
