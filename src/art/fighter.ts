// Paper-doll pirate: one renderer for creation, harbour, shop, battle and victory.
// Drawn facing right. A left-facing fighter is the mirrored frame, so the main
// hand (and an asymmetric hook) stays on the same arm of the same character.
import { Look, WEAPONS } from '../core/data';
import { CLOTH, CLOTH_SHADE, HAIRS, P, Pix, SKINS, SKIN_SHADE, TROUSERS, TROUSERS_SHADE, shade } from './pix';

export const FW = 136, FH = 92, OX = 60, OY = 82;

// Weapon sprites: drawn pointing right, pivot at the grip ---------------------
interface WSprite { pix: Pix; gx: number; gy: number }
const wcache: Record<string, WSprite> = {};

export function weaponSprite(id: string): WSprite {
  if (wcache[id]) return wcache[id];
  const p = new Pix(52, 21);
  const gy = 10;
  let gx = 4;
  const blade = (x0: number, len: number, th: number, curve: number, body = P.steel, hi = P.steelLight, lo = P.steelDark) => {
    for (let i = 0; i < len; i++) {
      const t = i / (len - 1);
      const y = gy - Math.round(curve * t * t);
      const w = i > len - 3 ? Math.max(1, th - (i - (len - 3))) : th;
      for (let j = 0; j < w; j++) p.px(x0 + i, y - j + Math.floor(th / 2), j === w - 1 ? hi : j === 0 && th > 2 ? lo : body);
    }
  };
  switch (id) {
    case 'hanger':
      p.rect(gx - 2, gy - 1, 5, 2, P.timberDark); p.px(gx - 3, gy, P.brassDark);
      p.rect(gx + 3, gy - 3, 2, 6, P.brass); p.px(gx + 2, gy + 3, P.brass); p.px(gx + 1, gy + 3, P.brassDark);
      blade(gx + 5, 13, 3, 2);
      p.px(gx + 11, gy - 2, -1); p.px(gx + 12, gy - 2, P.steelDark); // the chip
      break;
    case 'knife':
      p.rect(gx - 2, gy - 1, 5, 3, P.tar); p.px(gx - 1, gy, P.brass); p.px(gx + 1, gy, P.brass);
      p.rect(gx + 3, gy - 2, 1, 5, P.steelDark);
      p.poly([[gx + 4, gy - 4], [gx + 15, gy - 4], [gx + 18, gy - 1], [gx + 17, gy + 2], [gx + 4, gy + 2]], P.steel);
      p.line(gx + 4, gy + 2, gx + 17, gy + 2, P.steelLight); p.line(gx + 5, gy - 4, gx + 15, gy - 4, P.steelDark);
      p.px(gx + 14, gy - 2, P.steelDark);
      break;
    case 'pike':
    case 'longtom': {
      gx = 12;
      const L = id === 'longtom' ? 34 : 31;
      p.rect(gx - 11, gy, L + 5, 2, id === 'longtom' ? P.timber : P.tar);
      p.line(gx - 11, gy, gx + L - 7, gy, id === 'longtom' ? P.timberLight : P.tarHi);
      p.rect(gx - 12, gy, 2, 2, P.brassDark);
      p.rect(gx + L - 7, gy - 1, 2, 4, P.brass);
      p.poly([[gx + L - 5, gy - 2], [gx + L + 2, gy], [gx + L + 2, gy + 1], [gx + L - 5, gy + 3]], P.steel);
      p.line(gx + L - 5, gy - 1, gx + L + 1, gy, P.steelLight);
      if (id === 'longtom') { p.poly([[gx + L - 9, gy + 2], [gx + L - 9, gy + 8], [gx + L - 15, gy + 5], [gx + L - 13, gy + 2]], P.red); p.px(gx + L - 10, gy + 4, P.redDark); p.px(gx + L - 11, gy + 6, P.redDark); }
      break;
    }
    case 'sabre':
    case 'lastword': {
      const pearl = id === 'lastword';
      p.rect(gx - 2, gy - 1, 5, 2, pearl ? P.bone : P.tarLight); if (pearl) p.px(gx, gy, P.boneShade);
      p.rect(gx + 3, gy - 2, 1, 5, P.brass);
      p.line(gx + 2, gy + 3, gx - 2, gy + 3, P.brass); p.px(gx - 3, gy + 2, P.brass); p.px(gx - 3, gy + 1, P.brassDark);
      blade(gx + 4, pearl ? 15 : 14, 2, 3, P.steel, P.steelLight, P.steel);
      break;
    }
    case 'pistol':
    case 'pistol_pearl': {
      const pearl = id === 'pistol_pearl';
      p.rect(gx + 1, gy - 2, 8, 2, P.steelDark); p.line(gx + 1, gy - 2, gx + 8, gy - 2, P.steel); p.px(gx + 9, gy - 2, P.steelLight);
      p.rect(gx - 1, gy - 1, 5, 2, pearl ? P.bone : P.timber);
      p.poly([[gx - 2, gy], [gx + 1, gy], [gx, gy + 4], [gx - 3, gy + 4]], pearl ? P.bone : P.timberDark);
      p.px(gx - 3, gy + 5, P.brass); p.px(gx - 2, gy + 5, P.brass); p.px(gx + 2, gy + 1, P.brass); p.px(gx + 1, gy - 3, P.brassDark);
      break;
    }
    case 'hook': {
      p.rect(gx - 2, gy - 1, 6, 3, P.timberDark); p.px(gx - 3, gy, P.steelDark);
      p.rect(gx + 4, gy - 2, 2, 5, P.brassDark);
      // enormous brass hook: out, over, and back to a barbed point
      const pts = [[6, 0], [8, 0], [10, -1], [12, -3], [13, -5], [13, -7], [12, -9], [10, -10], [8, -10], [6, -9], [5, -7]];
      for (const [x, y] of pts) p.rect(gx + x, gy + y + 0, 2, 2, P.brass);
      for (const [x, y] of [[9, -1], [12, -4], [13, -6], [11, -10], [7, -10]]) p.px(gx + x, gy + y, P.brassLight);
      p.px(gx + 5, gy - 5, P.brassLight); p.px(gx + 4, gy - 6, P.brass);
      // a few links of ferry chain hanging from the pommel
      p.px(gx - 4, gy + 1, P.steel); p.px(gx - 5, gy + 2, P.steelDark); p.px(gx - 5, gy + 3, P.steel); p.px(gx - 6, gy + 4, P.steelDark); p.px(gx - 6, gy + 5, P.steel);
      break;
    }
  }
  p.outline(P.ink);
  return (wcache[id] = { pix: p, gx, gy });
}

export function offhandSprite(weapon: string): string | null {
  const w = WEAPONS[weapon];
  if (!w || w.family !== 'pistol') return null;
  return w.sprite === 'lastword' ? 'pistol_pearl' : 'pistol';
}

// Poses ----------------------------------------------------------------------
export type Face = 'calm' | 'grit' | 'hurt' | 'shout' | 'ko' | 'smug';
export interface Pose {
  lean: number; bob: number; crouch: number;
  /** main arm and weapon angles in degrees: 0 points forward, -90 up, 90 down */
  arm: number; wpn: number;
  off: number; offWpn: number;
  stride: number; back: number;
  face: Face; down?: boolean;
}
const base: Pose = { lean: 0, bob: 0, crouch: 0, arm: 70, wpn: -55, off: 100, offWpn: 80, stride: 0, back: 0, face: 'calm' };
const mk = (o: Partial<Pose>): Pose => ({ ...base, ...o });

type Carry = 'blade' | 'pole' | 'hook';
const carryOf = (weapon: string): Carry => { const f = WEAPONS[weapon]?.family; return f === 'pike' ? 'pole' : f === 'hook' ? 'hook' : 'blade'; };

export type PoseName = 'idle0' | 'idle1' | 'walk0' | 'walk1' | 'windup' | 'strike' | 'heavyUp' | 'heavyDown' | 'thrustBack' | 'thrustOut' | 'shove' | 'aim' | 'fire' | 'reload' | 'cuffBack' | 'cuffOut'
  | 'castBack' | 'castOut' | 'hold' | 'haul' | 'brace' | 'hit' | 'dodge' | 'breath0' | 'breath1' | 'down' | 'cheer' | 'show';

export function poseFor(name: PoseName, weapon: string): Pose {
  const c = carryOf(weapon);
  const idle: Partial<Pose> = c === 'pole' ? { arm: 50, wpn: -32, off: 35 } : c === 'hook' ? { arm: 75, wpn: 20, off: 105 } : { arm: 62, wpn: -58, off: 105 };
  switch (name) {
    case 'idle0': return mk(idle);
    case 'idle1': return mk({ ...idle, bob: 1, arm: (idle.arm ?? 70) + 3 });
    case 'walk0': return mk({ ...idle, stride: 4, back: 3, bob: 0, lean: 2 });
    case 'walk1': return mk({ ...idle, stride: -2, back: -3, bob: 1, lean: 2 });
    case 'windup': return mk({ arm: -125, wpn: -140, lean: -3, back: 2, off: 60, face: 'grit' });
    case 'strike': return mk({ arm: 18, wpn: 28, lean: 6, stride: 6, off: 150, face: 'shout' });
    case 'heavyUp': return mk({ arm: -100, wpn: -112, lean: -5, back: 3, crouch: 1, off: -70, face: 'grit' });
    case 'heavyDown': return mk({ arm: 40, wpn: 62, lean: 9, stride: 8, crouch: 3, off: 150, face: 'shout' });
    case 'thrustBack': return mk({ arm: 150, wpn: -4, lean: -5, back: 4, off: 20, crouch: 1, face: 'grit' });
    case 'thrustOut': return mk({ arm: 2, wpn: 0, lean: 8, stride: 9, off: 25, crouch: 2, face: 'shout' });
    case 'shove': return mk({ arm: -10, wpn: -78, lean: 8, stride: 7, off: -20, crouch: 1, face: 'shout' });
    case 'aim': return mk({ ...idle, off: 0, offWpn: 0, lean: -2, back: 2, face: 'grit' });
    case 'fire': return mk({ ...idle, off: -14, offWpn: -22, lean: -4, back: 3, face: 'shout' });
    case 'reload': return mk({ ...idle, off: 40, offWpn: -70, arm: 30, wpn: -80, crouch: 2, face: 'grit' });
    case 'cuffBack': return mk({ ...idle, off: 160, lean: -3, face: 'grit' });
    case 'cuffOut': return mk({ ...idle, off: -5, lean: 7, stride: 6, face: 'shout' });
    case 'castBack': return mk({ arm: -150, wpn: -170, lean: -6, back: 4, off: 40, face: 'grit' });
    case 'castOut': return mk({ arm: -15, wpn: -10, lean: 7, stride: 7, off: 140, face: 'shout' });
    case 'hold': return mk({ arm: 10, wpn: 0, lean: -3, back: 4, stride: 2, crouch: 2, off: 20, face: 'grit' });
    case 'haul': return mk({ arm: 140, wpn: 150, lean: -9, back: 6, crouch: 3, off: 150, face: 'shout' });
    case 'brace': return c === 'pole' ? mk({ arm: 20, wpn: -80, off: -30, crouch: 3, back: 4, lean: -2, face: 'grit' }) : mk({ arm: -20, wpn: -100, off: 10, crouch: 3, back: 4, lean: -2, face: 'grit' });
    case 'hit': return mk({ ...idle, lean: -8, bob: 1, back: 3, stride: -2, off: 150, arm: 100, face: 'hurt' });
    case 'dodge': return mk({ ...idle, lean: -7, crouch: 3, back: 4, face: 'smug' });
    case 'breath0': return mk({ arm: 85, wpn: 60, off: 80, lean: 6, crouch: 3, bob: 2, face: 'hurt' });
    case 'breath1': return mk({ arm: 85, wpn: 62, off: 80, lean: 5, crouch: 2, bob: 1, face: 'shout' });
    case 'down': return mk({ ...idle, face: 'ko', down: true });
    case 'cheer': return mk({ arm: -75, wpn: -80, off: -110, bob: -1, face: 'shout' });
    case 'show': return mk({ arm: 10, wpn: -60, off: 100, face: 'smug' });
  }
}

export interface Gear { weapon: string }

/** Render one frame. Returns a buffer of FW x FH with feet at (OX, OY). */
export function drawFighter(look: Look, gear: Gear, pose: Pose): Pix {
  const out = new Pix(FW, FH);
  const skin = SKINS[look.skin % SKINS.length], skinS = SKIN_SHADE[look.skin % SKINS.length];
  const shirt = CLOTH[look.shirt % CLOTH.length], shirtS = CLOTH_SHADE[look.shirt % CLOTH.length];
  const coatC = look.coat ? CLOTH[(look.coatColor ?? 1) % CLOTH.length] : shirt, coatS = look.coat ? CLOTH_SHADE[(look.coatColor ?? 1) % CLOTH.length] : shirtS;
  const tr = TROUSERS[look.trousers % TROUSERS.length], trS = TROUSERS_SHADE[look.trousers % TROUSERS.length];
  const hair = HAIRS[look.hairColor % HAIRS.length];
  const broad = !!look.broad;
  const hipY = OY - 14 + pose.crouch, shY = hipY - 14 + Math.round(pose.crouch / 2), shX = OX + pose.lean, hipX = OX + Math.round(pose.lean * 0.3);
  const hw = broad ? 9 : 7, ww = broad ? 8 : 5;
  const rad = (d: number) => (d * Math.PI) / 180;
  const sleeve = look.coat === 'short' ? coatC : shirt, sleeveS = look.coat === 'short' ? coatS : shirtS;
  const w = WEAPONS[gear.weapon];

  const arm = (p: Pix, sx: number, sy: number, ang: number, len: number) => {
    const hx = sx + Math.cos(rad(ang)) * len, hy = sy + Math.sin(rad(ang)) * len;
    p.line(sx, sy, sx + Math.cos(rad(ang)) * (len - 3), sy + Math.sin(rad(ang)) * (len - 3), sleeve, 4);
    p.line(sx, sy + 1, sx + Math.cos(rad(ang)) * (len - 4), sy + 1 + Math.sin(rad(ang)) * (len - 4), sleeveS, 2);
    return [Math.round(hx), Math.round(hy)];
  };
  const hand = (p: Pix, hx: number, hy: number) => { p.rect(hx - 2, hy - 2, 5, 5, skin); p.rect(hx - 2, hy + 1, 4, 2, skinS); };

  // off arm (behind the body) and anything it carries
  const offSh = [shX - hw + 3, shY + 3];
  out.layer((p) => {
    const [hx, hy] = arm(p, offSh[0], offSh[1], pose.off, 11);
    const os = offhandSprite(gear.weapon);
    if (os) { const s = weaponSprite(os); p.blitRot(s.pix, s.gx, s.gy, hx, hy, pose.offWpn); }
    hand(p, hx, hy);
  });
  // legs
  const leg = (p: Pix, hx: number, fx: number, peg: boolean) => {
    const fy = OY - 4;
    if (peg) { p.line(hx, hipY, fx, fy - 5, tr, 5); p.line(fx, fy - 4, fx, OY - 1, P.timber, 2); return; }
    p.line(hx, hipY, fx, fy, tr, 5);
    p.line(hx - 1, hipY + 2, fx - 1, fy, trS, 2);
    p.rect(fx - 3, fy - 1, 9, 5, P.tar); p.rect(fx - 3, fy - 1, 9, 1, P.tarHi); p.rect(fx - 3, fy - 4, 6, 3, P.tarLight); p.px(fx + 5, fy + 3, P.tarHi);
  };
  out.layer((p) => leg(p, hipX - 3, OX - 6 - pose.back, false));
  out.layer((p) => leg(p, hipX + 3, OX + 5 + pose.stride, !!look.pegleg));
  // torso
  out.layer((p) => {
    p.poly([[shX - hw, shY], [shX + hw, shY], [hipX + ww + 1, hipY - 5], [hipX + ww, hipY + 1], [hipX - ww, hipY + 1], [shX - hw, shY + 6]], shirt);
    p.poly([[shX - hw, shY + 2], [shX - hw + 3, shY + 2], [hipX - ww + 3, hipY + 1], [hipX - ww, hipY + 1]], shirtS);
    // frayed hem and a rope belt
    p.rect(hipX - ww, hipY - 2, ww * 2 + 1, 2, P.ropeDark); p.px(hipX + 2, hipY - 2, P.brass); p.px(hipX + 2, hipY - 1, P.brass);
    if (!look.coat) { p.px(hipX - ww + 1, hipY + 2, shirt); p.px(hipX + 1, hipY + 2, shirt); p.px(hipX + ww - 2, hipY + 2, shirtS); p.line(shX + 1, shY + 1, shX + 3, shY + 5, shirtS); }
    if (look.coat === 'vest') {
      p.poly([[shX - hw, shY], [shX - 1, shY], [hipX - 2, hipY - 2], [hipX - ww, hipY - 2]], coatC);
      p.poly([[shX + hw - 3, shY], [shX + hw, shY], [hipX + ww + 1, hipY - 5], [hipX + ww, hipY - 2], [hipX + ww - 3, hipY - 2]], coatC);
      p.line(shX - hw, shY + 2, hipX - ww, hipY - 3, coatS);
    }
    if (look.coat === 'short') {
      p.poly([[shX - hw, shY], [shX + hw, shY], [hipX + ww + 2, hipY - 5], [hipX + ww + 1, hipY - 3], [hipX - ww - 1, hipY - 3], [shX - hw, shY + 6]], coatC);
      p.poly([[shX - hw, shY + 2], [shX - hw + 3, shY + 2], [hipX - ww + 2, hipY - 3], [hipX - ww - 1, hipY - 3]], coatS);
      p.line(shX + 2, shY + 1, hipX + 3, hipY - 4, coatS);
      p.px(shX + 4, shY + 4, P.brass); p.px(hipX + 5, hipY - 7, P.brass);
      p.rect(shX - hw, shY, hw * 2 + 1, 1, shade(coatC, 1.25));
    }
  });
  // head
  const hx = shX + 2 + Math.round(pose.lean * 0.25), hy = shY - 8 + pose.bob;
  out.layer((p) => {
    const helmet = look.hat === 'helmet';
    p.rect(hx - 2, hy + 5, 5, 4, skinS); // neck
    p.ellipse(hx, hy, 8, 7, skin);
    p.rect(hx - 6, hy + 3, 13, 4, skin); p.rect(hx - 5, hy + 7, 10, 1, skin);
    p.rect(hx - 7, hy + 2, 2, 5, skinS); p.rect(hx - 5, hy + 6, 4, 2, skinS);
    p.rect(hx + 8, hy + 1, 2, 3, skin); p.px(hx + 9, hy + 3, skinS); // nose
    p.rect(hx - 4, hy, 2, 3, skinS); p.px(hx - 4, hy + 1, skin); // ear
    // hair
    if (!helmet) {
      const h = look.hair % 5;
      if (h >= 1) { p.ellipse(hx - 1, hy - 4, 8, 4, hair); p.rect(hx - 8, hy - 3, 4, 5, hair); p.rect(hx + 4, hy - 4, 3, 2, hair); }
      if (h === 2) { p.rect(hx - 9, hy, 4, 9, hair); p.px(hx - 9, hy + 9, hair); p.px(hx - 7, hy + 9, hair); }
      if (h === 3) { p.rect(hx - 11, hy - 4, 4, 3, hair); p.rect(hx - 13, hy - 2, 3, 6, hair); p.px(hx - 9, hy - 3, P.red); }
      if (h === 4) { p.ellipse(hx - 2, hy - 5, 10, 5, hair); p.ellipse(hx - 8, hy - 1, 3, 5, hair); p.px(hx + 7, hy - 6, hair); p.px(hx - 11, hy + 4, hair); p.px(hx + 2, hy - 10, hair); }
      if (h >= 1) { p.px(hx - 3, hy - 7, shade(hair, 1.35)); p.px(hx - 1, hy - 7, shade(hair, 1.35)); }
      if (look.beard === 1) { p.rect(hx + 3, hy + 4, 5, 1, hair); p.px(hx + 8, hy + 5, hair); }
      if (look.beard === 2) { p.rect(hx - 4, hy + 4, 12, 4, hair); p.rect(hx - 2, hy + 8, 9, 2, hair); p.rect(hx + 1, hy + 10, 4, 1, hair); p.rect(hx + 3, hy + 5, 4, 1, shade(hair, 0.7)); }
    }
    // face
    const ex = hx + 3, ey = hy;
    if (look.eyepatch && !helmet) { p.rect(ex, ey - 1, 4, 4, P.ink); p.line(hx - 7, hy - 3, hx + 7, hy - 1, P.ink); }
    else if (pose.face === 'hurt' || pose.face === 'ko') { p.line(ex, ey, ex + 3, ey + 2, P.ink); if (pose.face === 'ko') p.line(ex, ey + 2, ex + 3, ey, P.ink); }
    else { p.rect(ex, ey, 4, 3, P.white); p.rect(ex + 2, ey + (pose.face === 'smug' ? 1 : 0), 2, 2, P.ink); if (pose.face === 'smug') p.rect(ex, ey, 4, 1, skinS); }
    if (pose.face === 'grit' || pose.face === 'shout') p.line(ex - 1, ey - 3, ex + 4, ey - 1, P.ink); else if (!look.eyepatch) p.line(ex, ey - 2, ex + 3, ey - 2, shade(skinS, 0.7));
    const my = hy + 5;
    if (look.beard !== 2 || pose.face === 'shout' || pose.face === 'hurt') {
      if (pose.face === 'shout') { p.rect(hx + 3, my, 5, 3, P.redDark); p.rect(hx + 4, my, 3, 1, P.white); }
      else if (pose.face === 'hurt' || pose.face === 'ko') { p.rect(hx + 4, my, 3, 2, P.redDark); }
      else if (pose.face === 'grit') { p.rect(hx + 3, my, 5, 2, P.white); p.px(hx + 5, my, P.ink); p.px(hx + 5, my + 1, P.ink); p.px(hx + 7, my + 1, P.ink); }
      else if (pose.face === 'smug') { p.line(hx + 3, my + 1, hx + 6, my + 1, P.ink); p.px(hx + 7, my, P.ink); }
      else p.line(hx + 4, my + 1, hx + 7, my + 1, shade(skinS, 0.55));
    }
    // hats sit over hair. The helmet replaces the head silhouette entirely.
    switch (look.hat) {
      case 'bandana': p.ellipse(hx - 1, hy - 4, 8, 4, P.red); p.rect(hx - 8, hy - 3, 16, 3, P.red); p.rect(hx - 8, hy - 1, 16, 1, P.redDark); p.rect(hx - 11, hy - 2, 3, 2, P.red); p.rect(hx - 12, hy, 2, 4, P.redDark); p.px(hx - 2, hy - 6, P.bone); p.px(hx + 2, hy - 4, P.bone); p.px(hx - 5, hy - 4, P.bone); break;
      case 'knit': p.ellipse(hx - 1, hy - 5, 8, 5, P.green); p.rect(hx - 8, hy - 3, 16, 3, P.greenDark); p.rect(hx - 2, hy - 12, 3, 2, P.bone); p.px(hx - 5, hy - 7, P.greenDark); p.px(hx + 2, hy - 8, P.greenDark); break;
      case 'tricorn': p.ellipse(hx - 1, hy - 6, 6, 4, P.tarLight); p.poly([[hx - 12, hy - 5], [hx + 12, hy - 3], [hx + 9, hy - 1], [hx - 10, hy - 2]], P.tar); p.line(hx - 11, hy - 5, hx + 11, hy - 3, P.brass); p.px(hx + 2, hy - 8, P.brass); break;
      case 'straw': p.ellipse(hx - 1, hy - 6, 6, 4, P.rope); p.rect(hx - 12, hy - 3, 24, 2, P.rope); p.rect(hx - 12, hy - 2, 24, 1, P.ropeDark); p.rect(hx - 7, hy - 5, 13, 1, P.red); break;
      case 'helmet':
        p.ellipse(hx, hy, 10, 10, P.brass); p.rect(hx - 9, hy + 8, 19, 3, P.brassDark); p.ellipse(hx + 3, hy, 5, 5, P.brassDark); p.ellipse(hx + 3, hy, 4, 4, P.sea); p.px(hx + 2, hy - 2, P.seaHi); p.px(hx + 3, hy - 3, P.seaHi);
        p.ellipse(hx - 7, hy - 1, 2, 2, P.brassDark); p.px(hx - 3, hy - 8, P.brassLight); p.px(hx - 5, hy - 6, P.brassLight); p.rect(hx - 1, hy - 12, 3, 2, P.brassDark); break;
    }
  });
  // main hand weapon, then the arm that holds it
  const mSh = [shX + hw - 3, shY + 3];
  out.layer((p) => {
    const hxm = mSh[0] + Math.cos(rad(pose.arm)) * 11, hym = mSh[1] + Math.sin(rad(pose.arm)) * 11;
    if (w) { const s = weaponSprite(w.sprite); p.blitRot(s.pix, s.gx, s.gy, Math.round(hxm), Math.round(hym), pose.wpn); }
  }, null);
  out.layer((p) => { const [a, b] = arm(p, mSh[0], mSh[1], pose.arm, 11); hand(p, a, b); });

  if (pose.down) {
    const o2 = new Pix(FW, FH);
    o2.blitRot(out, OX, OY, OX - 16, OY - 5, -90);
    return o2;
  }
  return out;
}

/** hand position (frame coordinates) for effects such as chains and muzzle flash */
export function handPoint(look: Look, pose: Pose, which: 'main' | 'off' = 'main'): [number, number] {
  const hw = look.broad ? 9 : 7;
  const hipY = OY - 14 + pose.crouch, shY = hipY - 14 + Math.round(pose.crouch / 2), shX = OX + pose.lean;
  const a = ((which === 'main' ? pose.arm : pose.off) * Math.PI) / 180;
  const sx = which === 'main' ? shX + hw - 3 : shX - hw + 3;
  return [Math.round(sx + Math.cos(a) * 11), Math.round(shY + 3 + Math.sin(a) * 11)];
}
