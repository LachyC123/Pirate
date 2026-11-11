// Balance probe: the advisor policy plays the player's side against each opponent's own AI.
import { NPCS, ARCHETYPES, Attrs, WEAPONS, TOURS, TOUR_ORDER } from '../src/core/data';
import { advise, chooseAI } from '../src/core/ai';
import { Battle, Ev, FighterOpts, autoTurn, makeFighter, newBattle } from '../src/core/battle';

export function fight(seed: number, pw: string, pa: Attrs, php: number, e: any, po: FighterOpts = {}): { win: boolean; rounds: number } {
  const b: Battle = newBattle(seed, makeFighter('P', pa, pw, php, 2, po), makeFighter('E', e.attrs, e.weapon, e.hp, 4, { acc: e.acc ?? 0, off: e.off, soak: e.soak }));
  const evs: Ev[] = [];
  while (b.over === null && b.round < 200) {
    autoTurn(b, 0, (bb, w) => advise(bb, w), evs);
    if (b.over === null) autoTurn(b, 1, (bb, w) => chooseAI(bb, w, e.ai), evs);
    b.round++;
  }
  return { win: b.over === 0, rounds: b.round };
}
const N = 1500;
const pct = (pw: string, a: Attrs, hp: number, e: any, po: FighterOpts = {}) => { let w = 0, r = 0; for (let i = 0; i < N; i++) { const o = fight(i * 7919 + 13, pw, a, hp, e, po); if (o.win) w++; r += o.rounds; } return `${(100 * w / N).toFixed(0).padStart(3)}% ${(r / N).toFixed(0).padStart(2)}r`; };

// expected player power when each cup is attempted
const stages: { label: string; lvl: number; attrs: Attrs; hpBonus: number; weapons: string[]; foes: any[]; po?: FighterOpts }[] = [
  { label: 'Level 1 friendlies', lvl: 1, attrs: { might: 2, finesse: 2, grit: 2, guile: 2 }, hpBonus: 0, weapons: ['chipped_hanger', 'gull_sticker', 'powder_promise', 'fishwifes_pair', 'caulking_mallet'], foes: ARCHETYPES },
  { label: 'Tar Bucket Cup at level 2-3', lvl: 3, attrs: { might: 2, finesse: 3, grit: 3, guile: 2 }, hpBonus: 0, weapons: ['chipped_hanger', 'gull_sticker', 'powder_promise', 'fishwifes_pair', 'caulking_mallet'], foes: TOURS.tar_bucket.rounds.map((r) => NPCS[r]) },
  { label: "Cooper's Purse at level 4", lvl: 4, attrs: { might: 3, finesse: 3, grit: 3, guile: 2 }, hpBonus: 4, weapons: ['gull_sticker', 'towline', 'widows_knife', 'fishwifes_pair', 'caulking_mallet', 'kedge_chain', 'powder_promise'], foes: TOURS.coopers_purse.rounds.map((r) => NPCS[r]) },
  { label: 'Ropewalk Stakes at level 6', lvl: 6, attrs: { might: 3, finesse: 4, grit: 4, guile: 2 }, hpBonus: 7, weapons: ['long_tom', 'towline', 'widows_knife', 'coopers_persuader', 'kedge_chain', 'fishwifes_pair', 'capstan_bar', 'powder_promise'], foes: TOURS.ropewalk.rounds.map((r) => NPCS[r]) },
  { label: 'Mooring Night at level 8', lvl: 8, attrs: { might: 4, finesse: 4, grit: 5, guile: 2 }, hpBonus: 11, weapons: ['long_tom', 'tansys_hitches', 'port_starboard', 'coopers_persuader', 'capstan_bar', 'dockmasters_due', 'last_word', 'widows_knife', 'towline'], foes: TOURS.mooring_night.rounds.map((r) => NPCS[r]), po: { soak: 1 } },
];
if (process.argv[1]?.endsWith('sim.ts')) for (const s of stages) {
  const hp = 20 + s.attrs.grit * 4 + s.lvl * 2 + s.hpBonus;
  console.log(`\n${s.label} (${hp} hp)`.padEnd(40) + s.foes.map((f) => (f.name ?? f.label).slice(0, 14).padStart(15)).join(''));
  for (const w of s.weapons) console.log(`  ${WEAPONS[w].name.padEnd(24)}` + s.foes.map((f) => pct(w, s.attrs, hp, f, s.po).padStart(15)).join(''));
}
void TOUR_ORDER;
