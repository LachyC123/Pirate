// Career state and every transition that changes it. Pure: storage lives in save.ts.
import { ARCHETYPES, AiStyle, Attr, Attrs, Look, NPCS, OFF_BUSY, START_GOLD, Slot, TOURS, TOUR_ORDER, WEAPONS, WEARS, xpForLevel } from './data';
import { Action, Battle, Ev, autoTurn, cloneBattle, legal, makeFighter, newBattle, takeTurn } from './battle';
import { chooseAI } from './ai';

export const SAVE_VERSION = 2;
export type Screen = 'create' | 'harbour' | 'shop' | 'gate' | 'battle' | 'result' | 'prize';

export interface Foe {
  npc?: string;
  arch?: string;
  name: string;
  epithet: string;
  ai: AiStyle;
  weapon: string;
  off?: string;
  soak?: number;
  attrs: Attrs;
  hp: number;
  acc: number;
  look: Look;
  line: string;
  purse: number;
}

export interface Result {
  kind: 'friendly' | 'tour';
  win: boolean;
  foe: string;
  foeLine: string;
  gold: number;
  xp: number;
  levels: number;
  tour?: string;
  nextFoe?: string;
  /** tournament continues past what is built */
  unfinished?: boolean;
  champion?: boolean;
}

export interface Prize { tour: string; gold: number; weapon?: string; coin: boolean; seen: boolean }

export interface Save {
  v: number;
  name: string;
  look: Look;
  lost: 'ship' | 'name' | 'companion';
  level: number;
  xp: number;
  points: number;
  attrs: Attrs;
  gold: number;
  owned: string[];
  main: string;
  wear: Record<Slot, string | null>;
  shop: 'smith' | 'armoury';
  titles: string[];
  coins: number;
  wins: number;
  losses: number;
  screen: Screen;
  offer: Foe | null;
  tour: { id: string; round: number } | null;
  battle: Battle | null;
  foe: Foe | null;
  kind: 'friendly' | 'tour';
  /** resolved but not yet shown: lets a reload replay instead of reroll */
  pending: { from: Battle; evs: Ev[] } | null;
  result: Result | null;
  prize: Prize | null;
  seed: number;
  fights: number;
  settings: { mute: boolean; reduced: boolean };
  seen: Record<string, boolean>;
}

export const DEFAULT_LOOK: Look = { skin: 1, hair: 1, hairColor: 1, beard: 0, shirt: 0, trousers: 0 };

export function blankSave(): Save {
  return {
    v: SAVE_VERSION, name: '', look: { ...DEFAULT_LOOK }, lost: 'ship', level: 1, xp: 0, points: 0,
    attrs: { might: 2, finesse: 2, grit: 2, guile: 2 }, gold: START_GOLD, owned: ['chipped_hanger'], main: 'chipped_hanger', wear: { hat: null, coat: null, off: null }, shop: 'smith',
    titles: [], coins: 0, wins: 0, losses: 0, screen: 'create', offer: null, tour: null, battle: null, foe: null, kind: 'friendly',
    pending: null, result: null, prize: null, seed: (Date.now() ^ (Math.random() * 1e9)) | 0, fights: 0,
    settings: { mute: false, reduced: false }, seen: {},
  };
}

function roll(s: Save): number {
  s.seed = (s.seed + 0x6d2b79f5) | 0;
  let t = s.seed;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const pickOf = <T>(s: Save, a: T[]): T => a[Math.floor(roll(s) * a.length)];

const worn = (s: Save) => (['hat', 'coat', 'off'] as Slot[]).map((k) => (s.wear[k] ? WEARS[s.wear[k]!] : null)).filter((w): w is NonNullable<typeof w> => !!w);
const sumWear = (s: Save, f: (w: (typeof WEARS)[string]) => number | undefined) => worn(s).reduce((n, w) => n + (f(w) ?? 0), 0);
/** attributes including what is worn */
export function effAttrs(s: Save): Attrs {
  const a = { ...s.attrs };
  for (const w of worn(s)) for (const k of Object.keys(w.attr ?? {}) as Attr[]) a[k] += w.attr![k] ?? 0;
  return a;
}
export const playerMaxHp = (s: Save) => 20 + effAttrs(s).grit * 4 + s.level * 2 + sumWear(s, (w) => w.hp);
export const playerMaxSt = (s: Save) => Math.max(4, 8 + effAttrs(s).grit + sumWear(s, (w) => w.st));
/** the off-hand move actually available with the weapon in hand */
export function offMove(s: Save, weapon = s.main): string {
  if (OFF_BUSY.includes(WEAPONS[weapon].family)) return 'cuff';
  return (s.wear.off && WEARS[s.wear.off].move) || 'cuff';
}
export function lookOf(s: Save): Look {
  const l: Look = { ...s.look, hat: undefined, coat: undefined };
  if (s.wear.hat) l.hat = WEARS[s.wear.hat].draw;
  if (s.wear.coat) { l.coat = WEARS[s.wear.coat].draw; l.coatColor = WEARS[s.wear.coat].color; }
  return l;
}
export const offDraw = (s: Save, weapon = s.main): string | null => (OFF_BUSY.includes(WEAPONS[weapon].family) || !s.wear.off ? null : WEARS[s.wear.off].draw);

export function createPirate(s: Save, name: string, look: Look, lost: Save['lost']): void {
  s.name = name.trim().slice(0, 14) || 'Nameless Jack';
  s.look = { ...look };
  s.lost = lost;
  s.screen = 'harbour';
}

// Friendly matches -----------------------------------------------------------

export function rollOffer(s: Save, avoid?: string): void {
  const pool = ARCHETYPES.filter((a) => !a.after || s.titles.includes(a.after));
  let arch = pickOf(s, pool);
  if (avoid && arch.id === avoid) arch = pool[(pool.indexOf(arch) + 1) % pool.length];
  const up = Math.floor((s.level - 1) * 0.75);
  const attrs = { ...arch.attrs };
  for (let i = 0; i < up; i++) attrs[(['might', 'finesse', 'grit', 'guile'] as Attr[])[(i + arch.names.length) % 4]]++;
  const look: Look = { skin: Math.floor(roll(s) * 5), hair: 1 + Math.floor(roll(s) * 4), hairColor: Math.floor(roll(s) * 5), beard: Math.floor(roll(s) * 3), shirt: Math.floor(roll(s) * 5), trousers: Math.floor(roll(s) * 4), ...arch.looks };
  s.offer = {
    arch: arch.id, name: pickOf(s, arch.names), epithet: arch.label, ai: arch.ai, weapon: arch.weapon, attrs,
    hp: arch.hp + (s.level - 1) * 3, acc: arch.acc ?? 0, look, line: pickOf(s, arch.lines), purse: 11 + Math.floor(roll(s) * 3) + (s.level - 1) * 2,
  };
}

function foeFromNpc(id: string): Foe {
  const n = NPCS[id];
  return { npc: id, name: n.name, epithet: n.epithet, ai: n.ai, weapon: n.weapon, off: n.off, soak: n.soak, attrs: { ...n.attrs }, hp: n.hp, acc: n.acc ?? 0, look: n.look, line: n.intro, purse: 0 };
}

function startBattle(s: Save, foe: Foe, kind: 'friendly' | 'tour'): void {
  const p = makeFighter(s.name, effAttrs(s), s.main, playerMaxHp(s), 2, { off: offMove(s), soak: sumWear(s, (w) => w.soak), guard: OFF_BUSY.includes(WEAPONS[s.main].family) ? 0 : sumWear(s, (w) => w.guard), st: sumWear(s, (w) => w.st) });
  const e = makeFighter(foe.name, foe.attrs, foe.weapon, foe.hp, 4, { acc: foe.acc, off: foe.off, soak: foe.soak });
  s.battle = newBattle(Math.floor(roll(s) * 2 ** 31), p, e);
  s.foe = foe;
  s.kind = kind;
  s.pending = null;
  s.result = null;
  s.fights++;
  s.screen = 'battle';
}

export function acceptOffer(s: Save): void {
  if (!s.offer || s.tour) return;
  startBattle(s, s.offer, 'friendly');
}

export function rematch(s: Save): void {
  if (s.screen !== 'result' || !s.foe || s.kind !== 'friendly') return;
  startBattle(s, s.foe, 'friendly');
}

// Tournaments ----------------------------------------------------------------

export function tourOpen(s: Save, id: string): boolean {
  const t = TOURS[id];
  return !!t && (!t.requires || s.titles.includes(t.requires));
}

export function enterTour(s: Save, id: string): void {
  if (!tourOpen(s, id) || s.titles.includes(id)) return;
  s.tour = { id, round: 0 };
  startBattle(s, foeFromNpc(TOURS[id].rounds[0]), 'tour');
}

/** After a won qualifier: start the bout the tournament is already pointing at. */
export function nextBout(s: Save): void {
  if (!s.tour || s.screen !== 'result' || !s.result?.win) return;
  const t = TOURS[s.tour.id];
  if (s.tour.round >= t.built) return;
  startBattle(s, foeFromNpc(t.rounds[s.tour.round]), 'tour');
}

export function leaveTour(s: Save): void {
  s.tour = null;
  toHarbour(s);
}

// Combat ---------------------------------------------------------------------

function gainXp(s: Save, xp: number): number {
  s.xp += xp;
  let ups = 0;
  while (s.xp >= xpForLevel(s.level + 1)) {
    s.level++;
    s.points++;
    ups++;
  }
  return ups;
}

/**
 * Commit the player's action. Resolves the player's turn and the opponent's
 * reply in one atomic step, including any rewards, so a save taken right after
 * can never reroll or double-pay. Returns the events to present, or null.
 */
export function act(s: Save, a: Action): Ev[] | null {
  const b = s.battle;
  if (!b || s.screen !== 'battle' || b.over !== null || !s.foe) return null;
  if (!legal(b, 0, a).ok) return null;
  const from = cloneBattle(b);
  const evs: Ev[] = [];
  takeTurn(b, 0, a, evs);
  // a landed lead cut pauses here for the follow-up choice: the enemy has not replied yet
  if (b.over === null && b.chain === null) autoTurn(b, 1, (bb, w) => chooseAI(bb, w, s.foe!.ai), evs);
  if (b.chain === null) b.round++;
  s.pending = { from, evs };
  if (b.over !== null) settle(s);
  return evs;
}

function settle(s: Save): void {
  const b = s.battle!;
  const foe = s.foe!;
  const win = b.over === 0;
  const npc = foe.npc ? NPCS[foe.npc] : null;
  const r: Result = { kind: s.kind, win, foe: foe.name, foeLine: npc ? (win ? npc.onLose : npc.onWin) : win ? 'Fair fight. Take the purse.' : 'Better luck on the next tide.', gold: 0, xp: 0, levels: 0 };
  if (win) s.wins++; else s.losses++;
  if (s.kind === 'friendly') {
    r.gold = win ? foe.purse : 0;
    r.xp = win ? 6 : 2;
  } else if (s.tour) {
    const t = TOURS[s.tour.id];
    r.tour = t.id;
    if (!win) {
      r.xp = 2;
      s.tour = null; // possessions, level and titles stay. The cup restarts at its first qualifier.
    } else {
      s.tour.round++;
      const last = s.tour.round >= t.rounds.length;
      const tier = Math.max(0, TOUR_ORDER.indexOf(t.id));
      r.xp = (last ? 16 : 8) + tier * 3;
      r.gold = last ? 0 : 4 + tier * 3;
      if (last) {
        r.champion = true;
        if (!s.titles.includes(t.id)) {
          s.titles.push(t.id);
          s.coins++;
          s.gold += t.prize.gold;
          if (t.prize.weapon && !s.owned.includes(t.prize.weapon)) s.owned.push(t.prize.weapon);
          s.prize = { tour: t.id, gold: t.prize.gold, weapon: t.prize.weapon, coin: true, seen: false };
        }
        s.tour = null;
      } else if (s.tour.round >= t.built) {
        r.unfinished = true;
        r.gold += 10;
        s.tour = null;
      } else {
        r.nextFoe = NPCS[t.rounds[s.tour.round]].name;
      }
    }
  }
  s.gold += r.gold;
  r.levels = gainXp(s, r.xp);
  s.result = r;
}

/** Presentation finished: drop the replay buffer and move to the right screen. */
export function presented(s: Save): void {
  s.pending = null;
  if (s.battle && s.battle.over !== null && s.screen === 'battle') s.screen = s.prize && !s.prize.seen ? 'prize' : 'result';
}

export function toHarbour(s: Save): void {
  if (s.screen === 'battle' && s.battle && s.battle.over === null) return;
  if (s.prize) s.prize.seen = true;
  s.battle = null;
  s.pending = null;
  s.result = null;
  s.foe = null;
  s.screen = 'harbour';
}

export function goto(s: Save, screen: 'harbour' | 'shop' | 'gate', shop: 'smith' | 'armoury' = 'smith'): void {
  if (screen === 'shop') s.shop = shop;
  if (s.battle && s.battle.over === null) return;
  if (screen === 'harbour') return toHarbour(s);
  s.battle = null;
  s.result = null;
  s.screen = screen;
  if (screen === 'gate' && !s.offer) rollOffer(s);
}

// Shop and character ---------------------------------------------------------

export const priceOf = (id: string) => (WEAPONS[id] ?? WEARS[id])?.price ?? 0;
export function canStock(s: Save, id: string): boolean {
  const w = WEAPONS[id], x = WEARS[id];
  if (w) return !w.prize && (!w.stockAfter || s.titles.includes(w.stockAfter));
  return !!x && (!x.stockAfter || s.titles.includes(x.stockAfter));
}
export const stockGate = (id: string): string | undefined => (WEAPONS[id] ?? WEARS[id])?.stockAfter;

export const lockedKit = (s: Save) => !!s.tour || (!!s.battle && s.battle.over === null);

export function isEquipped(s: Save, id: string): boolean {
  return s.main === id || s.wear.hat === id || s.wear.coat === id || s.wear.off === id;
}

export function equip(s: Save, id: string): boolean {
  if (!s.owned.includes(id) || lockedKit(s)) return false;
  if (WEAPONS[id]) s.main = id;
  else if (WEARS[id]) s.wear[WEARS[id].slot] = id;
  else return false;
  return true;
}

export function unequip(s: Save, slot: Slot): boolean {
  if (lockedKit(s)) return false;
  s.wear[slot] = null;
  return true;
}

export function buy(s: Save, id: string, andEquip = false): boolean {
  if ((!WEAPONS[id] && !WEARS[id]) || s.owned.includes(id) || !canStock(s, id) || s.gold < priceOf(id) || lockedKit(s)) return false;
  s.gold -= priceOf(id);
  s.owned.push(id);
  if (andEquip) equip(s, id);
  return true;
}

export function spendPoint(s: Save, a: Attr): boolean {
  if (s.points < 1 || (s.battle && s.battle.over === null)) return false;
  s.points--;
  s.attrs[a]++;
  return true;
}
