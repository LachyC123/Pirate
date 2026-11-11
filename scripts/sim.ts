// Balance probe: a bot plays the player's side with a plausible style.
import { AiStyle, NPCS, ARCHETYPES, Attrs } from '../src/core/data';
import { chooseAI } from '../src/core/ai';
import { Battle, Ev, makeFighter, newBattle, takeTurn } from '../src/core/battle';

const styleFor: Record<string, AiStyle> = { chipped_hanger: 'duelist', widows_knife: 'duelist', gull_sticker: 'guard', powder_promise: 'powder', towline: 'moll' };

function fight(seed: number, pw: string, pa: Attrs, php: number, e: { ai: AiStyle; weapon: string; attrs: Attrs; hp: number; acc?: number }): { win: boolean; rounds: number } {
  const b: Battle = newBattle(seed, makeFighter('P', pa, pw, php, 2), makeFighter('E', e.attrs, e.weapon, e.hp, 4, e.acc ?? 0));
  const evs: Ev[] = [];
  while (b.over === null && b.round < 200) {
    takeTurn(b, 0, chooseAI(b, 0, styleFor[pw]), evs);
    if (b.over === null) takeTurn(b, 1, chooseAI(b, 1, e.ai), evs);
    b.round++;
  }
  return { win: b.over === 0, rounds: b.round };
}

const N = 3000;
const base: Attrs = { might: 2, finesse: 2, grit: 2, guile: 2 };
const foes: [string, any][] = [...ARCHETYPES.map((a) => [a.label, a] as [string, any]), ...Object.values(NPCS).map((n) => [n.name, n] as [string, any])];
for (const pw of ['chipped_hanger', 'gull_sticker', 'powder_promise', 'towline']) {
  console.log(`\n${pw} (bot style ${styleFor[pw]}), level 1, 30 hp`);
  for (const [label, e] of foes) {
    let w = 0, r = 0;
    for (let i = 0; i < N; i++) {
      const o = fight(i * 7919 + 13, pw, base, 30, e);
      if (o.win) w++;
      r += o.rounds;
    }
    console.log(`  vs ${label.padEnd(24)} win ${(100 * w / N).toFixed(0).padStart(3)}%  avg rounds ${(r / N).toFixed(1)}`);
  }
}
