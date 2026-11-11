// Opponent decisions. Reads only the current public battle state and the
// opponent's previous move. Never sees the player's upcoming input.
import { AiStyle, MOVES, WEAPONS } from './data';
import { Action, Battle, dist, legal, moveStats, other, rnd } from './battle';

const mv = (id: string): Action => ({ t: 'move', id });

/** probability of bracing when a line is taut on us */
const BRACE_VS_LINE: Record<AiStyle, number> = { guard: 0.6, duelist: 0.7, brawler: 0.1, powder: 0.3, moll: 0.5 };

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
  const canMove = (id: string) => can(mv(id));
  const withdraw: Action = { t: 'withdraw' };
  const advance: Action = { t: 'advance' };
  const brace: Action = { t: 'brace' };
  const breath: Action = { t: 'breath' };

  // committed special always follows through if it can
  if (me.pending) {
    const rel = MOVES[me.pending].windup!.release;
    if (canMove(rel)) return mv(rel);
    return breath;
  }
  // a taut line on us: brace, or (brawlers) charge so it goes slack
  if (foe.pending) {
    if (r() < BRACE_VS_LINE[style]) return brace;
    if (style === 'brawler' && d > 1) return advance;
  }
  if (me.riposte && canMove('riposte')) return mv('riposte');

  switch (style) {
    case 'guard': {
      if (st < 2) return d === 1 && canMove('cuff') && r() < 0.5 ? mv('cuff') : breath;
      const misjudge = r() < 0.15;
      if (d === 1) {
        if (misjudge && canMove('thrust')) return mv('thrust');
        const x = r();
        if (canMove('shove') && x < 0.5) return mv('shove');
        if (canMove('cuff') && x < 0.8) return mv('cuff');
        if (can(withdraw)) return withdraw;
        return canMove('thrust') ? mv('thrust') : canMove('cuff') ? mv('cuff') : breath;
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
      if (canMove('cuff')) return mv('cuff');
      return breath;
    }
    case 'powder': {
      if (me.loaded) {
        if (d >= 2) return b.round === 0 || r() < 0.85 ? mv('shot') : brace;
        if (can(withdraw) && r() < 0.7) return withdraw;
        return canMove('sabre') ? mv('sabre') : canMove('cuff') ? mv('cuff') : breath;
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
      return canMove('cuff') ? mv('cuff') : breath;
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
  }
}
