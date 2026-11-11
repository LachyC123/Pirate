// Backdrops, the merchant and UI icons. All project-owned procedural pixel art.
import { P, Pix, hash, mix, shade, text } from './pix';
import { weaponSprite } from './fighter';

export const SH = 180; // logical stage height everywhere

const PENNANTS = [P.bone, P.blue, P.red, P.green, P.purple, P.brass];

function sky(p: Pix, top: number, mid: number, low: number, horizon: number, stars = true): void {
  for (let y = 0; y < horizon; y++) {
    const t = y / horizon;
    const c = t < 0.55 ? mix(top, mid, t / 0.55) : mix(mid, low, (t - 0.55) / 0.45);
    // quantise into bands with a dithered edge so it reads as clusters, not a gradient
    const band = Math.floor(t * 9) / 9;
    const cb = band < 0.55 ? mix(top, mid, band / 0.55) : mix(mid, low, (band - 0.55) / 0.45);
    for (let x = 0; x < p.w; x++) p.px(x, y, (t * 9) % 1 > 0.75 && (x + y) % 2 === 0 ? c : cb);
  }
  if (stars) for (let i = 0; i < p.w / 6; i++) { const x = Math.floor(hash(i, 1) * p.w), y = Math.floor(hash(i, 2) * horizon * 0.5); p.px(x, y, hash(i, 3) > 0.7 ? P.bone : P.boneShade); }
}

function planks(p: Pix, x: number, y: number, w: number, h: number, base: number, seed = 0, plankH = 6, vertical = false): void {
  for (let j = 0; j < h; j++)
    for (let i = 0; i < w; i++) {
      const u = vertical ? j : i, v = vertical ? i : j;
      const row = Math.floor(v / plankH);
      let c = shade(base, 0.9 + hash(row, seed) * 0.2);
      if (v % plankH === 0) c = shade(base, 0.6);
      else if ((u + Math.floor(hash(row, seed + 1) * 40)) % 37 === 0) c = shade(base, 0.62);
      else if (hash(Math.floor(u / 3), v, seed) > 0.93) c = shade(base, 1.18);
      else if (hash(Math.floor(u / 5), v, seed + 7) > 0.95) c = shade(base, 0.78);
      p.px(x + i, y + j, c);
    }
}

function water(p: Pix, y0: number, y1: number, glow = -1): void {
  for (let y = y0; y < y1; y++)
    for (let x = 0; x < p.w; x++) {
      const t = (y - y0) / Math.max(1, y1 - y0);
      let c = mix(P.seaLight, P.sea, Math.min(1, t * 1.6));
      const wv = hash(Math.floor((x + (y % 2) * 3) / 5), y, 9);
      if (wv > 0.82) c = P.seaHi; else if (wv < 0.12) c = shade(P.sea, 0.8);
      if (glow >= 0 && wv > 0.7 && Math.abs(x - p.w / 2) < 30 - t * 10) c = mix(c, glow, 0.5);
      p.px(x, y, c);
    }
}

function lantern(p: Pix, x: number, y: number): void {
  p.rect(x - 1, y - 3, 3, 1, P.brassDark); p.rect(x - 2, y - 2, 5, 5, P.lamp); p.rect(x - 1, y - 1, 3, 3, P.bone); p.rect(x - 2, y + 3, 5, 1, P.brassDark);
  p.px(x - 3, y, P.brassDark); p.px(x + 3, y, P.brassDark);
}

function mast(p: Pix, x: number, base: number, top: number, leanTop: number, snapped: boolean): void {
  p.line(x, base, x + leanTop, top, P.timberDark, 4);
  p.line(x - 1, base, x + leanTop - 1, top, P.timber, 1);
  const yy = top + 14;
  const xx = x + Math.round(leanTop * (1 - (yy - top) / (base - top)));
  p.line(xx - 14, yy + 1, xx + 14, yy - 1, P.timberDark, 2);
  // torn sail scrap
  p.poly([[xx - 12, yy + 2], [xx + 6, yy + 1], [xx + 3, yy + 12], [xx - 2, yy + 9], [xx - 6, yy + 16], [xx - 11, yy + 10]], P.sailShade);
  p.poly([[xx - 10, yy + 3], [xx + 3, yy + 2], [xx, yy + 8], [xx - 8, yy + 8]], P.sail);
  if (snapped) { p.px(x + leanTop - 1, top - 1, P.timberLight); p.px(x + leanTop + 1, top - 2, P.timber); p.px(x + leanTop + 2, top, P.timberLight); }
  for (let y = base - 6; y > top + 22; y -= 9) { const mx = x + Math.round(leanTop * (1 - (y - top) / (base - top))); p.rect(mx - 2, y, 5, 1, P.rope); }
}

function person(p: Pix, x: number, y: number, seed: number, scale = 1): void {
  const skin = [0xf0c8a0, 0xd9a273, 0xb07a4f, 0x7d5234][Math.floor(hash(seed, 1) * 4)];
  const cloth = [P.red, P.blue, P.sail, P.green, P.purple, P.brassDark][Math.floor(hash(seed, 2) * 6)];
  const s = scale;
  p.rect(x - 3 * s, y - 8 * s, 6 * s, 8 * s, cloth); p.rect(x - 3 * s, y - 8 * s, 2 * s, 8 * s, shade(cloth, 0.7));
  p.rect(x - 2 * s, y - 13 * s, 5 * s, 5 * s, skin); p.px(x + 1 * s, y - 11 * s, P.ink);
  const hat = Math.floor(hash(seed, 3) * 4);
  if (hat === 0) p.rect(x - 3 * s, y - 14 * s, 7 * s, 2 * s, P.red); else if (hat === 1) p.rect(x - 4 * s, y - 14 * s, 9 * s, 1 * s, P.tar); else if (hat === 2) p.rect(x - 2 * s, y - 15 * s, 5 * s, 2 * s, [0x2a1f1a, 0x6b3f22, 0xc9ced2][seed % 3]);
}

// HARBOUR --------------------------------------------------------------------
export interface HarbourSpots { smith: [number, number]; armoury: [number, number]; arena: [number, number]; tattoo: [number, number]; surgeon: [number, number]; purse: [number, number]; player: [number, number] }

export function harbour(W: number, titles: string[], pennants: number[], coins: number): { pix: Pix; spots: HarbourSpots } {
  const p = new Pix(W, SH);
  const cx = Math.round(W / 2);
  sky(p, 0x23264a, 0x74456b, 0xe5915c, 96);
  // moon and far hulls
  p.ellipse(cx + Math.round(W * 0.3), 20, 6, 6, P.bone); p.ellipse(cx + Math.round(W * 0.3) + 3, 18, 5, 5, mix(0x23264a, 0x74456b, 0.25));
  water(p, 96, 132, 0xe5915c);
  for (let i = 0; i < 6; i++) { const x = Math.round(hash(i, 40) * W), w = 18 + Math.round(hash(i, 41) * 16); p.poly([[x, 96], [x + w, 96], [x + w - 4, 90 - hash(i, 42) * 5], [x + 3, 91]], 0x3a2d4d); p.line(x + w / 2, 92, x + w / 2, 74 + hash(i, 43) * 8, 0x3a2d4d); }
  // the arena: a ring of old hull ribs around the tidal dock
  const aw = Math.min(64, Math.round(W * 0.2)), ay = 104;
  p.layer((q) => {
    q.poly([[cx - aw, ay], [cx - aw - 4, 62], [cx - aw + 8, 50], [cx + aw - 8, 50], [cx + aw + 4, 62], [cx + aw, ay]], P.tar);
    for (let x = cx - aw + 2; x < cx + aw; x += 2) q.line(x, 52 + Math.abs(x - cx) * 0.05, x, ay - 1, hash(x, 5) > 0.5 ? P.tarLight : P.tar);
    for (let i = -3; i <= 3; i++) { const x = cx + Math.round((i * aw) / 3.6); q.line(x, ay, x + i, 44 - Math.abs(i) * -2, P.timberDark, 2); q.px(x + i, 43 + Math.abs(i) * 2, P.bone); }
    for (let i = -2; i <= 2; i++) if (i !== 0) { const x = cx + Math.round((i * aw) / 2.9); q.rect(x - 3, 66, 7, 9, P.timberDeep); q.rect(x - 2, 67, 5, 8, P.lamp); q.rect(x - 2, 71, 5, 4, 0xe5915c); }
    q.rect(cx - aw - 2, 60, aw * 2 + 4, 2, P.timber); q.rect(cx - aw, 80, aw * 2, 2, P.timberDark);
    // gate
    q.poly([[cx - 11, ay], [cx - 11, 82], [cx - 7, 76], [cx + 7, 76], [cx + 11, 82], [cx + 11, ay]], P.timberDeep);
    q.poly([[cx - 8, ay], [cx - 8, 84], [cx - 5, 80], [cx + 5, 80], [cx + 8, 84], [cx + 8, ay]], P.lamp);
    q.rect(cx - 8, 92, 17, ay - 92, 0xe5915c); q.line(cx, 80, cx, ay, P.timberDeep);
  });
  // two broken masts frame the gate, a line of champion pennants between them
  const mL = cx - aw - 10, mR = cx + aw + 10;
  p.layer((q) => { mast(q, mL, 112, 14, 5, true); mast(q, mR, 112, 22, -6, true); });
  for (let i = 0; i <= 20; i++) { const t = i / 20; p.px(Math.round(mL + 5 + (mR - 6 - mL - 5) * t), Math.round(18 + (26 - 18) * t + Math.sin(t * Math.PI) * 9), P.rope); }
  pennants.forEach((col, i) => {
    const t = (i + 1) / (Math.max(4, pennants.length) + 1);
    const x = Math.round(mL + 5 + (mR - 11 - mL) * t), y = Math.round(19 + 8 * t + Math.sin(t * Math.PI) * 9);
    p.layer((q) => { q.poly([[x - 4, y], [x + 4, y], [x, y + 11]], PENNANTS[col % PENNANTS.length]); q.rect(x - 4, y, 9, 2, P.brass); q.px(x, y + 5, P.brassLight); });
  });
  // poster by the gate changes as you rise
  p.layer((q) => { q.rect(cx + 15, 86, 13, 15, P.bone); q.rect(cx + 16, 88, 11, 1, P.red); q.rect(cx + 17, 91, 9, 5, titles.length ? P.blue : P.tarLight); q.rect(cx + 17, 98, 9, 1, P.ink); if (titles.length) q.px(cx + 21, 93, P.brass); });
  // middle piers: later shops
  const pier = (x: number, roof: number, sign: string, lit: boolean) => p.layer((q) => {
    q.rect(x - 15, 100, 30, 22, P.timberDark); planks(q, x - 15, 102, 30, 20, P.timberDark, x, 5);
    q.poly([[x - 18, 102], [x, 90], [x + 18, 102]], roof);
    q.rect(x - 4, 110, 8, 12, lit ? P.lamp : P.timberDeep); q.rect(x - 9, 97, 19, 7, P.bone); text(q, sign, x, 98, P.ink, true);
    q.rect(x - 16, 122, 32, 3, P.timber); q.rect(x - 13, 125, 2, 8, P.timberDeep); q.rect(x + 11, 125, 2, 8, P.timberDeep);
  });
  const tx = Math.round(cx - aw - Math.max(34, W * 0.14)), sx = Math.round(cx + aw + Math.max(34, W * 0.14));
  if (W > 300) { pier(tx, P.purple, 'INK', false); pier(sx, P.copperDark, 'SAW', false); }
  // foreground deck
  planks(p, 0, 132, W, SH - 132, P.timber, 3, 8);
  p.rect(0, 132, W, 2, P.timberLight);
  for (let x = 14; x < W; x += 46) p.px(x, 137, P.brassDark);
  // weaponsmith (left): the bow section of a ship stood on end, slung with rope
  const bw = W < 300 ? 62 : Math.min(84, Math.round(W * 0.36));
  p.layer((q) => {
    q.poly([[-2, 150], [-2, 34], [bw - 26, 26], [bw - 6, 50], [bw, 150]], P.timber);
    planks(q, 0, 40, bw - 4, 110, P.timber, 11, 7);
    q.poly([[-2, 34], [bw - 26, 26], [bw - 6, 50], [bw - 2, 62], [bw - 22, 38], [-2, 46]], P.timberDark);
    q.poly([[bw - 6, 50], [bw, 150], [bw - 5, 150], [bw - 10, 56]], P.timberDeep);
    for (let i = 0; i < 3; i++) { q.line(4 + i * 20, 46 - i, 10 + i * 20, 70, P.rope); q.line(10 + i * 20, 70, 24 + i * 20, 44 - i, P.ropeDark); }
    // door and window
    const dx = Math.round(bw * 0.5);
    q.poly([[dx - 12, 150], [dx - 12, 110], [dx - 6, 102], [dx + 6, 102], [dx + 12, 110], [dx + 12, 150]], P.timberDeep);
    q.poly([[dx - 9, 150], [dx - 9, 112], [dx - 5, 106], [dx + 5, 106], [dx + 9, 112], [dx + 9, 150]], 0xe5915c);
    q.rect(dx - 9, 128, 19, 22, P.lamp); q.rect(dx - 5, 118, 3, 20, P.steel); q.rect(dx + 1, 114, 2, 24, P.steelDark); q.rect(dx - 9, 138, 19, 12, P.timberDark);
    q.rect(6, 84, 13, 12, P.timberDeep); q.rect(8, 86, 9, 8, P.lamp); q.line(12, 86, 12, 93, P.timberDeep);
    // hanging sign with crossed blades
    q.rect(dx - 16, 74, 33, 17, P.timberDeep); q.rect(dx - 15, 75, 31, 15, P.bone);
    q.line(dx - 8, 87, dx + 7, 77, P.steelDark, 2); q.line(dx + 8, 87, dx - 7, 77, P.steel, 2); q.rect(dx - 9, 86, 3, 3, P.brass); q.rect(dx + 7, 86, 3, 3, P.brass);
    q.line(dx - 12, 66, dx - 12, 74, P.rope); q.line(dx + 12, 64, dx + 12, 74, P.rope);
  });
  // sailmaker's armoury (right): patched sailcloth over a deckhouse
  p.layer((q) => {
    const x0 = W - bw;
    planks(q, x0 + 4, 60, bw, 90, P.timberDark, 21, 7);
    q.poly([[x0 - 8, 76], [x0 + 8, 44], [W + 2, 36], [W + 2, 70]], P.sail);
    q.poly([[x0 - 8, 76], [W + 2, 70], [W + 2, 76], [x0 - 6, 82]], P.sailShade);
    for (let i = 0; i < 5; i++) { const px = x0 + 10 + Math.round(hash(i, 60) * (bw - 24)), py = 48 + Math.round(hash(i, 61) * 14); q.rect(px, py, 7, 5, i % 2 ? P.sailShade : P.boneShade); q.px(px, py, P.ink); q.px(px + 6, py + 4, P.ink); q.px(px + 6, py, P.ink); q.px(px, py + 4, P.ink); }
    q.line(x0 - 8, 76, x0 - 8, 150, P.timberDeep, 2);
    const dx = x0 + Math.round(bw * 0.5);
    q.rect(dx - 11, 104, 23, 46, P.timberDeep); q.rect(dx - 8, 108, 17, 42, P.tar); q.rect(dx - 8, 108, 17, 3, P.tarLight);
    q.rect(dx - 13, 118, 27, 4, P.timber); q.rect(dx - 13, 132, 27, 4, P.timber); // boarded up for now
    q.rect(dx - 15, 84, 31, 15, P.timberDeep); q.rect(dx - 14, 85, 29, 13, P.bone);
    q.poly([[dx - 5, 87], [dx + 5, 87], [dx + 5, 92], [dx, 96], [dx - 5, 92]], P.brass); q.line(dx, 88, dx, 94, P.brassDark);
  });
  // dockside dressing
  p.layer((q) => { q.ellipse(bw + 12, 144, 6, 7, P.timberLight); q.rect(bw + 6, 141, 13, 1, P.tar); q.rect(bw + 6, 147, 13, 1, P.tar); q.rect(bw + 9, 137, 7, 2, P.timberDark); });
  lantern(p, bw - 2, 100); lantern(p, W - bw - 8, 96);
  // onlookers gather as titles are won
  for (let i = 0; i < Math.min(W < 300 ? 2 : 8, titles.length * 3); i++) p.layer((q) => person(q, cx + (i % 2 ? 1 : -1) * (24 + i * 6), 139 + (i % 3) * 2, i + 5));
  // the Dead Man's Purse hangs on a post
  const ux = Math.min(W - bw - 18, cx + 44), uy = 150;
  p.layer((q) => {
    q.rect(ux - 1, uy - 26, 3, 30, P.timberDark); q.rect(ux - 1, uy - 26, 9, 2, P.timberDark); q.line(ux + 6, uy - 24, ux + 6, uy - 20, P.rope);
    q.ellipse(ux + 6, uy - 14, 5, 6, coins ? P.copperDark : P.tarLight); q.rect(ux + 3, uy - 20, 7, 2, P.rope);
    if (coins) { q.px(ux + 5, uy - 15, P.ghost); q.px(ux + 7, uy - 13, P.ghost); q.px(ux + 6, uy - 11, P.ghostDark); }
  });
  return { pix: p, spots: { smith: [Math.round(bw * 0.5), 122], armoury: [W - bw + Math.round(bw * 0.5), 122], arena: [cx, 84], tattoo: [tx, 108], surgeon: [sx, 108], purse: [ux + 6, uy - 14], player: [cx - 4, 168] } };
}

// SHOP INTERIOR ---------------------------------------------------------------
export interface RackSlot { x: number; y: number; w: number; h: number }
export function shopInterior(W: number): { pix: Pix; rack: RackSlot[]; merchant: [number, number]; preview: [number, number] } {
  const p = new Pix(W, SH);
  const wide = W > 300;
  planks(p, 0, 0, W, 138, 0x5a3a2c, 31, 9, true);
  for (let x = 0; x < W; x++) for (let y = 0; y < 138; y++) if (y < 10 || hash(x, y, 77) > 0.985) p.px(x, y, shade(p.get(x, y), 0.75));
  planks(p, 0, 138, W, SH - 138, P.timber, 33, 7);
  p.rect(0, 136, W, 3, P.timberDeep);
  // window with harbour light behind the merchant
  p.layer((q) => { q.rect(8, 16, 34, 30, P.timberDeep); q.rect(10, 18, 30, 26, 0x74456b); q.rect(10, 32, 30, 12, 0xe5915c); q.rect(10, 40, 30, 4, P.seaLight); q.line(25, 18, 25, 43, P.timberDeep); q.line(10, 31, 39, 31, P.timberDeep); q.line(14, 40, 14, 24, 0x3a2d4d); q.line(11, 28, 18, 27, 0x3a2d4d); });
  // hanging stock in the gloom
  for (let i = 0; i < (wide ? 5 : 2); i++) { const x = 52 + i * 17; p.line(x, 0, x, 10 + (i % 2) * 5, P.rope); p.layer((q) => q.blitRot(weaponSprite(['hanger', 'sabre', 'knife', 'hanger', 'sabre'][i]).pix, 4, 10, x, 12 + (i % 2) * 5, 90)); }
  // the rack: a sheet of sailcloth pinned to the wall
  const rx = wide ? Math.round(W * 0.47) : 100, rw = W - rx - 6, ry = 8, rh = wide ? 100 : 104;
  p.layer((q) => {
    q.poly([[rx, ry + 2], [rx + rw, ry], [rx + rw - 1, ry + rh - 3], [rx + rw - 12, ry + rh], [rx + 2, ry + rh - 2]], P.sail);
    for (let y = ry; y < ry + rh; y++) for (let x = rx; x < rx + rw; x++) if (q.get(x, y) === P.sail && (hash(Math.floor(x / 2), Math.floor(y / 2), 5) > 0.86 || x > rx + rw - 6 || y > ry + rh - 8)) q.px(x, y, P.sailShade);
    q.rect(rx + 3, ry + 4, 3, 3, P.brass); q.rect(rx + rw - 6, ry + 3, 3, 3, P.brass);
  });
  const n = 4, slotW = Math.floor((rw - 8) / n);
  const rack: RackSlot[] = [];
  for (let i = 0; i < n; i++) rack.push({ x: rx + 4 + i * slotW, y: ry + 8, w: slotW, h: rh - 16 });
  lantern(p, rx - 10, 22); p.line(rx - 10, 0, rx - 10, 18, P.rope);
  // counter in front of the merchant
  const cw = wide ? Math.round(W * 0.36) : 92;
  p.layer((q) => { planks(q, 0, 128, cw, 30, P.timberLight, 41, 6); q.rect(0, 126, cw + 3, 4, P.timberDark); q.rect(0, 126, cw + 3, 1, P.rope); q.rect(cw - 2, 130, 3, 28, P.timberDark); });
  return { pix: p, rack, merchant: [wide ? Math.round(cw * 0.48) : 44, 128], preview: [wide ? rx - 26 : rx + Math.round(rw / 2), wide ? 170 : 172] };
}

/** Peg Mallory, bust. Frame f wobbles the blade she balances on one finger. Anchor: bottom centre. */
export const PEG_W = 96, PEG_H = 110;
export function peg(f: number, talk = false): Pix {
  const p = new Pix(PEG_W, PEG_H);
  const skin = 0xd9a273, skinS = 0xb37d52, skinD = 0x8f5f3c, hair = 0x3a2d33, grey = 0xc9ced2;
  const cx = 40;
  const blink = f % 9 === 7;
  // ponytail behind
  p.layer((q) => { q.poly([[cx - 20, 30], [cx - 30, 40], [cx - 32, 64], [cx - 26, 76], [cx - 22, 60], [cx - 18, 44]], hair); q.rect(cx - 30, 52, 8, 3, P.rope); q.line(cx - 28, 60, cx - 26, 72, grey); });
  // shoulders, shirt, leather apron
  p.layer((q) => {
    q.poly([[cx - 34, 110], [cx - 30, 78], [cx - 12, 68], [cx + 14, 68], [cx + 30, 78], [cx + 36, 110]], P.blueDark);
    q.poly([[cx - 30, 110], [cx - 27, 82], [cx - 12, 72], [cx - 10, 110]], shade(P.blueDark, 0.75));
    q.poly([[cx - 14, 110], [cx - 12, 80], [cx + 16, 80], [cx + 20, 110]], P.timber);
    q.poly([[cx - 12, 110], [cx - 10, 82], [cx - 6, 82], [cx - 7, 110]], P.timberDark);
    q.line(cx - 12, 80, cx - 8, 68, P.timberDark, 2); q.line(cx + 16, 80, cx + 11, 68, P.timberDark, 2);
    q.rect(cx + 2, 90, 9, 8, P.timberDark); q.rect(cx + 4, 87, 2, 5, P.steel); q.rect(cx + 7, 88, 2, 4, P.brass);
    q.poly([[cx - 12, 68], [cx + 1, 82], [cx + 14, 68]], P.bone);
  });
  // neck and head
  p.layer((q) => {
    q.rect(cx - 6, 56, 14, 14, skinS);
    q.ellipse(cx + 1, 36, 21, 22, skin);
    q.poly([[cx - 16, 44], [cx + 20, 44], [cx + 14, 60], [cx + 4, 64], [cx - 8, 60]], skin);
    q.poly([[cx - 19, 36], [cx - 14, 36], [cx - 6, 60], [cx + 2, 64], [cx - 8, 61], [cx - 17, 48]], skinS);
    // ear and brass ring
    q.ellipse(cx - 17, 40, 3, 5, skinS); q.px(cx - 17, 40, skinD); q.rect(cx - 19, 46, 3, 3, P.brass); q.px(cx - 18, 47, skinS);
    // nose: big, broken once
    q.poly([[cx + 12, 34], [cx + 22, 44], [cx + 20, 48], [cx + 11, 47]], skin); q.line(cx + 12, 47, cx + 19, 48, skinD); q.px(cx + 21, 44, skinS); q.line(cx + 11, 36, cx + 10, 45, skinS);
    // hair: swept back, a grey streak, red headscarf
    q.poly([[cx - 20, 34], [cx - 18, 18], [cx - 4, 10], [cx + 12, 12], [cx + 21, 24], [cx + 20, 28], [cx - 8, 24], [cx - 16, 40]], hair);
    q.line(cx - 2, 12, cx - 12, 24, grey, 2); q.line(cx + 4, 12, cx + 2, 16, grey);
    q.poly([[cx - 20, 30], [cx - 16, 18], [cx + 22, 22], [cx + 22, 30], [cx - 10, 27], [cx - 18, 36]], P.red);
    q.poly([[cx - 18, 26], [cx + 22, 28], [cx + 22, 30], [cx - 10, 27], [cx - 18, 36]], P.redDark);
    q.px(cx - 4, 21, P.bone); q.px(cx + 6, 23, P.bone); q.px(cx + 14, 24, P.bone); q.px(cx - 12, 23, P.bone);
  });
  // face details, no outline pass so they stay crisp
  const ey = 38;
  p.line(cx + 1, ey - 6, cx + 10, ey - 4, P.ink, 2); p.line(cx - 12, ey - 5, cx - 5, ey - 6, P.ink, 2);
  if (blink) { p.line(cx + 2, ey + 1, cx + 9, ey + 1, P.ink); p.line(cx - 11, ey + 1, cx - 5, ey + 1, P.ink); }
  else {
    p.rect(cx + 2, ey - 2, 8, 5, P.white); p.rect(cx + 5 + (f % 4 === 2 ? 1 : 0), ey - 1, 4, 4, P.copperDark); p.rect(cx + 7 + (f % 4 === 2 ? 1 : 0), ey, 2, 2, P.ink); p.line(cx + 2, ey - 3, cx + 9, ey - 3, P.ink);
    p.rect(cx - 11, ey - 1, 6, 4, P.white); p.rect(cx - 8, ey, 3, 3, P.copperDark); p.px(cx - 7, ey + 1, P.ink); p.line(cx - 11, ey - 2, cx - 6, ey - 2, P.ink);
  }
  p.line(cx - 12, ey + 5, cx - 6, ey + 6, skinS); p.line(cx + 2, ey + 6, cx + 8, ey + 5, skinS);
  // scar and a crooked grin with one brass tooth
  p.line(cx - 13, 30, cx - 9, 46, skinD);
  if (talk) { p.poly([[cx - 4, 53], [cx + 14, 51], [cx + 12, 58], [cx, 59]], P.redDark); p.rect(cx - 1, 53, 12, 2, P.white); p.rect(cx + 7, 53, 2, 2, P.brass); }
  else { p.line(cx - 5, 54, cx + 10, 54, P.ink); p.line(cx + 10, 54, cx + 15, 50, P.ink); p.rect(cx + 1, 55, 8, 2, P.white); p.rect(cx + 6, 55, 2, 2, P.brass); p.line(cx - 4, 57, cx + 9, 57, P.ink); }
  p.px(cx + 16, 49, skinS); p.line(cx + 2, 62, cx + 8, 62, skinS);
  // raised arm, one finger up, a blade balanced across it
  const fx = 78, fy = 34;
  p.layer((q) => {
    q.poly([[cx + 26, 82], [cx + 34, 100], [fx + 10, 64], [fx + 2, 56]], P.blueDark);
    q.poly([[fx - 2, 56], [fx + 12, 60], [fx + 10, 68], [fx - 4, 64]], P.bone);
    q.poly([[fx - 5, 46], [fx + 8, 46], [fx + 10, 58], [fx - 4, 58]], skin); q.rect(fx - 5, 54, 14, 4, skinS);
    q.rect(fx - 1, fy + 2, 4, 14, skin); q.rect(fx - 1, fy + 2, 1, 14, skinS); // the finger
    q.rect(fx + 4, 43, 3, 5, skinS); q.rect(fx - 5, 43, 3, 5, skinS);
  });
  const wob = [-7, -3, 3, 7, 4, -1, -5, -6, 0][f % 9];
  const s = weaponSprite('hanger');
  const big = new Pix(s.pix.w * 2, s.pix.h * 2); big.blit(s.pix, 0, 0, false, 2);
  p.blitRot(big, 24, 21, fx + 1, fy, wob);
  return p;
}

// ARENA: TARWATER DOCKS --------------------------------------------------------
export function arena(W: number, crowdN: number): { bg: Pix; crowd: Pix; railY: number } {
  const p = new Pix(W, SH);
  sky(p, 0x1a1c38, 0x4a3560, 0xc4704f, 70);
  // moored hulls and rigging behind the rail
  for (let i = 0; i < Math.ceil(W / 70) + 1; i++) {
    const x = i * 74 - 20 + Math.round(hash(i, 80) * 20);
    p.poly([[x, 70], [x + 8, 50], [x + 58, 48], [x + 66, 70]], 0x2a2440);
    p.line(x + 30, 50, x + 30, 8 + hash(i, 81) * 14, 0x2a2440, 2); p.line(x + 14, 22, x + 46, 20, 0x2a2440); p.line(x + 30, 12, x + 60, 48, 0x352d50); p.line(x + 30, 12, x + 6, 50, 0x352d50);
    if (i % 2) { p.rect(x + 40, 56, 3, 3, P.lamp); p.rect(x + 20, 58, 2, 2, P.lamp); }
  }
  // tarred deck
  const railY = 74;
  planks(p, 0, railY + 12, W, SH - railY - 12, P.tar, 51, 9);
  for (let x = 0; x < W; x++) for (let y = railY + 12; y < SH; y++) if (hash(Math.floor(x / 4), Math.floor(y / 2), 90) > 0.93) p.px(x, y, P.tarLight);
  // sheen and scuffs so tar reads differently from timber
  for (let i = 0; i < W / 9; i++) { const x = Math.floor(hash(i, 91) * W), y = railY + 16 + Math.floor(hash(i, 92) * 70); p.rect(x, y, 3 + Math.floor(hash(i, 93) * 5), 1, P.tarHi); }
  p.rect(0, railY + 12, W, 2, P.tarHi);
  // crowd layer: spectators leaning on the rail
  const c = new Pix(W, SH);
  const spots = Math.max(crowdN, 1);
  for (let i = 0; i < crowdN; i++) {
    const x = Math.round(((i + 0.5) / spots) * (W - 30) + 15 + (hash(i, 95) - 0.5) * 12);
    c.layer((q) => { person(q, x, railY + 3, i * 3 + 1, 2); q.rect(x - 8, railY - 4, 4, 5, [0xf0c8a0, 0xd9a273, 0xb07a4f][i % 3]); q.rect(x + 6, railY - 4, 4, 5, [0xf0c8a0, 0xd9a273, 0xb07a4f][i % 3]); });
  }
  // rail with mugs, drawn on the backdrop in front of the crowd via a second pass by the scene
  const rail = new Pix(W, SH);
  rail.layer((q) => {
    q.rect(0, railY, W, 5, P.timber); q.rect(0, railY, W, 1, P.timberLight); q.rect(0, railY + 4, W, 1, P.timberDark);
    for (let x = 10; x < W; x += 34) { q.rect(x, railY + 5, 4, 8, P.timberDark); q.rect(x + 1, railY + 5, 1, 8, P.timber); }
    for (let i = 0; i < crowdN; i++) { const x = Math.round(((i + 0.5) / spots) * (W - 30) + 28); q.rect(x, railY - 6, 6, 6, P.steelDark); q.rect(x, railY - 6, 6, 1, P.bone); q.rect(x + 6, railY - 4, 2, 3, P.steelDark); }
    for (let x = 30; x < W; x += 120) { q.line(x, railY + 3, x + 18, railY + 10, P.rope); q.line(x + 18, railY + 10, x + 36, railY + 3, P.rope); }
  });
  lantern(rail, 8, railY - 12); lantern(rail, W - 9, railY - 12); rail.rect(7, railY - 8, 2, 8, P.timberDeep); rail.rect(W - 10, railY - 8, 2, 8, P.timberDeep);
  return { bg: p, crowd: compose(c, rail), railY };
}
function compose(crowd: Pix, rail: Pix): Pix { (crowd as any).rail = rail; return crowd; }
export const railOf = (crowd: Pix): Pix => (crowd as any).rail;

export function laneTile(w: number, state: 'plain' | 'threat' | 'reach'): Pix {
  const p = new Pix(w, 9);
  const c = state === 'threat' ? P.red : state === 'reach' ? P.brass : P.tarHi;
  p.rect(1, 1, w - 2, 7, state === 'plain' ? P.tarLight : shade(c, 0.55));
  p.rect(1, 1, w - 2, 1, c); p.rect(1, 7, w - 2, 1, state === 'plain' ? P.tar : shade(c, 0.4));
  p.px(2, 4, P.brassDark); p.px(w - 3, 4, P.brassDark);
  if (state !== 'plain') for (let x = 4; x < w - 4; x += 4) p.px(x, 4, c);
  return p;
}

// ARENA GATE -------------------------------------------------------------------
export function gate(W: number, posterTitle: string, pennants: number[]): Pix {
  const p = new Pix(W, SH);
  const cx = Math.round(W / 2);
  sky(p, 0x23264a, 0x74456b, 0xe5915c, 80);
  p.layer((q) => {
    planks(q, 0, 30, W, 112, P.tar, 61, 8, true);
    for (let x = 6; x < W; x += 30) { q.line(x, 142, x + 5, 22, P.timberDark, 3); q.px(x + 5, 21, P.bone); }
    q.rect(0, 30, W, 3, P.timber); q.rect(0, 62, W, 2, P.timberDark);
  });
  p.layer((q) => {
    q.poly([[cx - 34, 142], [cx - 34, 70], [cx - 22, 50], [cx + 22, 50], [cx + 34, 70], [cx + 34, 142]], P.timberDeep);
    q.poly([[cx - 29, 142], [cx - 29, 72], [cx - 19, 56], [cx + 19, 56], [cx + 29, 72], [cx + 29, 142]], 0xe5915c);
    q.rect(cx - 29, 96, 59, 46, P.lamp);
    q.poly([[cx - 29, 142], [cx - 29, 72], [cx - 22, 61], [cx - 14, 142]], P.timberDark); q.poly([[cx + 29, 142], [cx + 29, 72], [cx + 22, 61], [cx + 14, 142]], P.timberDark);
    q.rect(cx - 10, 118, 21, 24, 0xe5915c);
    for (let i = -2; i <= 2; i++) person(q, cx + i * 6, 140 - Math.abs(i), i + 30);
  });
  p.layer((q) => { mast(q, cx - 52, 146, 4, 4, true); mast(q, cx + 52, 146, 10, -5, true); });
  for (let i = 0; i <= 24; i++) { const t = i / 24; p.px(Math.round(cx - 47 + 93 * t), Math.round(8 + 4 * t + Math.sin(t * Math.PI) * 12), P.rope); }
  pennants.forEach((col, i) => { const t = (i + 1) / (Math.max(4, pennants.length) + 1); const x = Math.round(cx - 47 + 93 * t), y = Math.round(9 + 4 * t + Math.sin(t * Math.PI) * 12); p.layer((q) => { q.poly([[x - 5, y], [x + 5, y], [x, y + 14]], PENNANTS[col % PENNANTS.length]); q.rect(x - 5, y, 11, 2, P.brass); }); });
  // poster board
  const bx = Math.max(4, cx - 104);
  p.layer((q) => { q.rect(bx, 74, 40, 50, P.timberDark); q.rect(bx + 2, 76, 36, 46, P.bone); q.rect(bx + 4, 79, 32, 9, P.red); const ws = posterTitle.replace("'S", 'S').split(' '); text(q, ws[0] ?? '', bx + 20, 81, P.bone, true); ws.slice(1, 3).forEach((wd, i) => text(q, wd, bx + 20, 91 + i * 7, P.ink, true)); q.ellipse(bx + 20, 113, 5, 5, P.tar); q.rect(bx + 14, 108, 13, 2, P.tarLight); q.rect(bx + 18, 126, 4, 18, P.timberDark); });
  lantern(p, cx - 38, 84); lantern(p, cx + 38, 84);
  planks(p, 0, 142, W, SH - 142, P.timber, 63, 8);
  p.rect(0, 142, W, 2, P.timberLight);
  return p;
}

// ICONS (16x16) ------------------------------------------------------------------
export function icon(name: string): Pix {
  const p = new Pix(16, 16);
  const arrow = (dir: number, c: number) => { p.rect(dir > 0 ? 2 : 6, 7, 8, 3, c); p.poly(dir > 0 ? [[9, 3], [14, 8], [9, 13]] : [[6, 3], [1, 8], [6, 13]], c); };
  switch (name) {
    case 'advance': arrow(1, P.bone); p.rect(2, 12, 5, 2, P.tarHi); break;
    case 'withdraw': arrow(-1, P.bone); p.rect(9, 12, 5, 2, P.tarHi); break;
    case 'attack': p.line(3, 13, 12, 3, P.steel, 2); p.line(12, 13, 3, 3, P.steelLight, 2); p.rect(2, 12, 3, 3, P.brass); p.rect(11, 12, 3, 3, P.brass); break;
    case 'brace': p.poly([[3, 2], [12, 2], [12, 8], [8, 14], [7, 14], [3, 8]], P.timberLight); p.poly([[5, 4], [10, 4], [10, 8], [8, 11], [7, 11], [5, 8]], P.brass); p.rect(7, 4, 2, 7, P.brassDark); break;
    case 'breath': p.ellipse(5, 9, 3, 3, P.copperLight); p.ellipse(9, 6, 3, 3, P.bone); p.ellipse(11, 10, 2, 2, P.copperLight); p.px(13, 4, P.bone); p.px(2, 13, P.copper); break;
    case 'slash': p.line(3, 12, 12, 3, P.steel, 2); p.rect(2, 11, 3, 3, P.brass); for (let i = 0; i < 6; i++) p.px(13 - i, 8 + Math.round(i * i * 0.15), P.bone); p.px(8, 13, P.bone); p.px(10, 12, P.bone); break;
    case 'heavy': p.line(4, 13, 10, 4, P.steel, 3); p.rect(3, 12, 3, 3, P.brass); p.px(12, 2, P.red); p.px(14, 5, P.red); p.px(13, 9, P.red); p.px(11, 1, P.brass); p.px(14, 7, P.brass); break;
    case 'riposte': p.line(2, 4, 8, 10, P.steelDark, 2); p.line(13, 3, 5, 12, P.steelLight, 2); p.rect(12, 2, 3, 3, P.brass); p.px(8, 7, P.lamp); p.px(9, 6, P.lamp); p.px(7, 8, P.white); break;
    case 'thrust': p.rect(1, 7, 10, 2, P.timber); p.poly([[10, 5], [15, 8], [10, 10]], P.steelLight); p.px(9, 7, P.brass); p.px(9, 8, P.brass); break;
    case 'lunge': p.rect(1, 7, 10, 2, P.timber); p.poly([[10, 4], [15, 8], [10, 11]], P.steelLight); p.px(3, 4, P.red); p.px(5, 3, P.red); p.px(3, 12, P.red); p.px(5, 13, P.red); break;
    case 'shove': p.rect(6, 2, 2, 12, P.timber); p.poly([[9, 5], [13, 8], [9, 11]], P.bone); p.rect(1, 5, 4, 2, 0xd9a273); p.rect(1, 10, 4, 2, 0xd9a273); break;
    case 'shot': p.rect(2, 6, 8, 3, P.steelDark); p.rect(2, 6, 8, 1, P.steel); p.poly([[2, 8], [5, 8], [4, 13], [1, 13]], P.timber); p.px(11, 7, P.lamp); p.px(12, 5, P.lamp); p.px(13, 7, P.red); p.px(12, 9, P.lamp); p.px(14, 6, P.bone); break;
    case 'reload': p.rect(3, 9, 9, 3, P.steelDark); p.poly([[3, 11], [6, 11], [5, 15], [2, 15]], P.timber); p.line(10, 1, 10, 8, P.rope); p.ellipse(10, 2, 1, 1, P.tar); p.px(13, 5, P.bone); break;
    case 'cuff': p.rect(4, 5, 8, 7, 0xd9a273); p.rect(4, 5, 8, 2, 0xf0c8a0); p.rect(3, 8, 2, 4, 0xb37d52); p.line(6, 7, 6, 11, 0xb37d52); p.line(8, 7, 8, 11, 0xb37d52); p.line(10, 7, 10, 11, 0xb37d52); p.px(13, 4, P.bone); p.px(14, 8, P.bone); break;
    case 'rake': case 'cast': case 'haul': {
      for (const [x, y] of [[8, 12], [10, 12], [12, 10], [12, 8], [11, 6], [9, 5], [7, 6]]) p.rect(x, y, 2, 2, P.brass);
      p.px(6, 8, P.brassLight);
      if (name === 'cast') { for (let i = 0; i < 4; i++) p.px(1 + i * 2, 13 - (i % 2), P.steel); p.poly([[11, 1], [15, 3], [11, 4]], P.bone); }
      if (name === 'haul') { for (let i = 0; i < 4; i++) p.px(1 + i * 2, 13, P.steel); p.poly([[5, 1], [1, 3], [5, 5]], P.bone); p.rect(5, 2, 4, 2, P.bone); }
      if (name === 'rake') { p.px(3, 3, P.red); p.px(5, 5, P.red); p.px(2, 6, P.red); }
      break;
    }
    case 'back': p.poly([[7, 3], [2, 8], [7, 13]], P.bone); p.rect(7, 7, 7, 3, P.bone); break;
    case 'inspect': p.ellipse(7, 7, 4, 4, P.bone); p.ellipse(7, 7, 2, 2, P.seaLight); p.line(10, 10, 14, 14, P.brass, 2); break;
    case 'hp': p.ellipse(5, 6, 3, 3, P.red); p.ellipse(10, 6, 3, 3, P.red); p.poly([[2, 7], [13, 7], [8, 13], [7, 13]], P.red); p.px(4, 5, P.bone); break;
    case 'st': p.ellipse(8, 8, 5, 5, P.copper); p.ellipse(8, 8, 3, 3, P.copperDark); p.line(8, 8, 12, 3, P.bone, 1); p.px(4, 5, P.copperLight); break;
    case 'gold': p.ellipse(8, 8, 5, 5, P.brass); p.ellipse(8, 8, 3, 3, P.brassDark); p.px(6, 5, P.brassLight); p.px(7, 4, P.brassLight); p.rect(7, 7, 2, 3, P.brassLight); break;
    case 'xp': p.poly([[8, 1], [10, 6], [15, 6], [11, 9], [13, 14], [8, 11], [3, 14], [5, 9], [1, 6], [6, 6]], P.bone); p.px(8, 6, P.brass); break;
    case 'coin': p.ellipse(8, 8, 5, 5, P.copperDark); p.ellipse(8, 8, 3, 3, P.ghost); p.px(7, 7, P.ink); p.px(9, 7, P.ink); p.rect(7, 9, 3, 1, P.ink); p.px(5, 4, P.copperLight); break;
    case 'load': p.ellipse(8, 8, 3, 3, P.steelDark); p.px(7, 7, P.steelLight); break;
  }
  p.outline(P.ink);
  return p;
}
