// Tiny software pixel renderer. Everything on screen is drawn through this so
// sprites stay on one pixel grid: rotation is nearest-neighbour, outlines are computed.

export const P = {
  ink: 0x141a2e, bone: 0xf2e8cf, boneShade: 0xcbbf9f, brass: 0xd9a441, brassDark: 0x9a6b1f, brassLight: 0xf4d27a,
  ghost: 0x7ee0b5, ghostDark: 0x3f9c7c, tar: 0x2a2630, tarLight: 0x3f3947, tarHi: 0x585062,
  timber: 0x7a5236, timberLight: 0xa0714a, timberDark: 0x4f3423, timberDeep: 0x35231a,
  sail: 0xd8c9a3, sailShade: 0xb3a17c, sailDark: 0x8d7c5c, copper: 0x4fa38a, copperDark: 0x2f6f63, copperLight: 0x86cdb2,
  sea: 0x1b3350, seaLight: 0x2c5578, seaHi: 0x4f86a8, red: 0xb5382e, redDark: 0x7d2320, blue: 0x2f4f8f, blueDark: 0x1f3565, blueLight: 0x4d74bd,
  steel: 0xb9c3cc, steelDark: 0x7b8794, steelLight: 0xe6edf2, rope: 0xc2a36b, ropeDark: 0x8a6f42, green: 0x4d7a45, greenDark: 0x33552f,
  purple: 0x5b3a6e, lamp: 0xffd36b, white: 0xffffff, black: 0x0b0d16,
};
export const SKINS = [0xf0c8a0, 0xd9a273, 0xb07a4f, 0x7d5234, 0x55361f];
export const SKIN_SHADE = [0xcf9f78, 0xb37d52, 0x8a5a38, 0x5c3a24, 0x3c2515];
export const HAIRS = [0x2a1f1a, 0x6b3f22, 0xb5482e, 0xd9a441, 0xc9ced2];
export const CLOTH = [0xd8c9a3, 0xb5382e, 0x2f4f8f, 0x4d7a45, 0x5b3a6e, 0x3f3947];
export const CLOTH_SHADE = [0xb3a17c, 0x7d2320, 0x1f3565, 0x33552f, 0x3d2649, 0x2a2630];
export const TROUSERS = [0x6b5a43, 0x3f3947, 0x7d2320, 0x2f4f6b];
export const TROUSERS_SHADE = [0x4d3f2f, 0x2a2630, 0x551816, 0x1f3550];

export function shade(c: number, f: number): number {
  const r = Math.max(0, Math.min(255, Math.round(((c >> 16) & 255) * f)));
  const g = Math.max(0, Math.min(255, Math.round(((c >> 8) & 255) * f)));
  const b = Math.max(0, Math.min(255, Math.round((c & 255) * f)));
  return (r << 16) | (g << 8) | b;
}
export function mix(a: number, b: number, t: number): number {
  const ch = (s: number) => Math.round(((a >> s) & 255) * (1 - t) + ((b >> s) & 255) * t);
  return (ch(16) << 16) | (ch(8) << 8) | ch(0);
}

/** Pixel buffer. Each cell is -1 (empty) or 0xRRGGBB. */
export class Pix {
  d: Int32Array;
  constructor(public w: number, public h: number) {
    this.d = new Int32Array(w * h).fill(-1);
  }
  clear(c = -1): this { this.d.fill(c); return this; }
  get(x: number, y: number): number { return x < 0 || y < 0 || x >= this.w || y >= this.h ? -1 : this.d[y * this.w + x]; }
  px(x: number, y: number, c: number): this {
    x = Math.round(x); y = Math.round(y);
    if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.d[y * this.w + x] = c;
    return this;
  }
  rect(x: number, y: number, w: number, h: number, c: number): this {
    x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
    for (let j = Math.max(0, y); j < Math.min(this.h, y + h); j++) for (let i = Math.max(0, x); i < Math.min(this.w, x + w); i++) this.d[j * this.w + i] = c;
    return this;
  }
  line(x0: number, y0: number, x1: number, y1: number, c: number, t = 1): this {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;
    const o = Math.floor((t - 1) / 2);
    for (let n = 0; n < 2000; n++) {
      if (t <= 1) this.px(x0, y0, c); else this.rect(x0 - o, y0 - o, t, t, c);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 > -dy) { err -= dy; x0 += sx; }
      if (e2 < dx) { err += dx; y0 += sy; }
    }
    return this;
  }
  ellipse(cx: number, cy: number, rx: number, ry: number, c: number): this {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const nx = (x - cx) / (rx + 0.35), ny = (y - cy) / (ry + 0.35);
        if (nx * nx + ny * ny <= 1) this.px(x, y, c);
      }
    return this;
  }
  poly(pts: number[][], c: number): this {
    let minY = Infinity, maxY = -Infinity;
    for (const p of pts) { minY = Math.min(minY, p[1]); maxY = Math.max(maxY, p[1]); }
    for (let y = Math.round(minY); y <= Math.round(maxY); y++) {
      const xs: number[] = [];
      for (let i = 0; i < pts.length; i++) {
        const a = pts[i], b = pts[(i + 1) % pts.length];
        if ((a[1] <= y && b[1] > y) || (b[1] <= y && a[1] > y)) xs.push(a[0] + ((y - a[1]) / (b[1] - a[1])) * (b[0] - a[0]));
      }
      xs.sort((p, q) => p - q);
      for (let i = 0; i + 1 < xs.length; i += 2) for (let x = Math.round(xs[i]); x <= Math.round(xs[i + 1]); x++) this.px(x, y, c);
    }
    return this;
  }
  /** Copy src onto this. Optional horizontal flip and integer scale. */
  blit(src: Pix, dx: number, dy: number, flip = false, scale = 1): this {
    dx = Math.round(dx); dy = Math.round(dy);
    for (let y = 0; y < src.h; y++)
      for (let x = 0; x < src.w; x++) {
        const c = src.d[y * src.w + (flip ? src.w - 1 - x : x)];
        if (c < 0) continue;
        if (scale === 1) this.px(dx + x, dy + y, c); else this.rect(dx + x * scale, dy + y * scale, scale, scale, c);
      }
    return this;
  }
  /** Nearest-neighbour rotated blit. (px,py) in src lands on (dx,dy). Angle in degrees, clockwise. */
  blitRot(src: Pix, px: number, py: number, dx: number, dy: number, deg: number): this {
    const a = (deg * Math.PI) / 180, cs = Math.cos(a), sn = Math.sin(a);
    const R = Math.ceil(Math.hypot(src.w, src.h));
    for (let y = -R; y <= R; y++)
      for (let x = -R; x <= R; x++) {
        const sx = Math.round(cs * x + sn * y + px), sy = Math.round(-sn * x + cs * y + py);
        const c = src.get(sx, sy);
        if (c >= 0) this.px(Math.round(dx) + x, Math.round(dy) + y, c);
      }
    return this;
  }
  /** Ink every empty pixel that touches a filled one. */
  outline(c = P.ink, diag = false): this {
    const o = new Int32Array(this.d);
    for (let y = 0; y < this.h; y++)
      for (let x = 0; x < this.w; x++) {
        if (this.d[y * this.w + x] >= 0) continue;
        const n = (i: number, j: number) => { const v = this.get(x + i, y + j); return v >= 0; };
        if (n(1, 0) || n(-1, 0) || n(0, 1) || n(0, -1) || (diag && (n(1, 1) || n(-1, -1) || n(1, -1) || n(-1, 1)))) o[y * this.w + x] = c;
      }
    this.d = o;
    return this;
  }
  /** Draw into a scratch layer, outline it, then composite. */
  layer(fn: (p: Pix) => void, ink: number | null = P.ink): this {
    const s = new Pix(this.w, this.h);
    fn(s);
    if (ink !== null) s.outline(ink);
    return this.blit(s, 0, 0);
  }
  flipped(): Pix {
    const o = new Pix(this.w, this.h);
    o.blit(this, 0, 0, true);
    return o;
  }
  /** Replace colour on rows/columns matching a test (cheap dithering and banding). */
  each(fn: (x: number, y: number, c: number) => number): this {
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) { const i = y * this.w + x; this.d[i] = fn(x, y, this.d[i]); }
    return this;
  }
  rgba(): Uint8ClampedArray {
    const out = new Uint8ClampedArray(this.w * this.h * 4);
    for (let i = 0; i < this.d.length; i++) {
      const c = this.d[i];
      if (c < 0) continue;
      out[i * 4] = (c >> 16) & 255; out[i * 4 + 1] = (c >> 8) & 255; out[i * 4 + 2] = c & 255; out[i * 4 + 3] = 255;
    }
    return out;
  }
  toCanvas(canvas?: HTMLCanvasElement): HTMLCanvasElement {
    const cv = canvas ?? document.createElement('canvas');
    if (cv.width !== this.w || cv.height !== this.h) { cv.width = this.w; cv.height = this.h; }
    const ctx = cv.getContext('2d')!;
    ctx.putImageData(new ImageData(this.rgba() as any, this.w, this.h), 0, 0);
    return cv;
  }
  dataUrl(): string { return this.toCanvas().toDataURL(); }
}

// 3x5 pixel font for painted signs ------------------------------------------
const G: Record<string, string> = {
  A: '010101111101101', B: '110101110101110', C: '011100100100011', D: '110101101101110', E: '111100110100111', F: '111100110100100', G: '011100101101011', H: '101101111101101', I: '111010010010111', J: '001001001101010', K: '101101110101101', L: '100100100100111', M: '101111111101101', N: '110101101101101', O: '010101101101010', P: '110101110100100', Q: '010101101110011', R: '110101110101101', S: '011100010001110', T: '111010010010010', U: '101101101101111', V: '101101101101010', W: '101101111111101', X: '101101010101101', Y: '101101010010010', Z: '111001010100111',
  '0': '111101101101111', '1': '010110010010111', '2': '110001010100111', '3': '110001010001110', '4': '101101111001001', '5': '111100110001110', '6': '011100111101111', '7': '111001010010010', '8': '111101111101111', '9': '111101111001110',
  "'": '010010000000000', '.': '000000000000010', '!': '010010010000010', '-': '000000111000000', '&': '010101010101011', ' ': '000000000000000',
};
export function text(p: Pix, s: string, x: number, y: number, c: number, center = false): void {
  s = s.toUpperCase();
  const w = s.length * 4 - 1;
  let cx = center ? Math.round(x - w / 2) : x;
  for (const ch of s) {
    const g = G[ch] ?? G[' '];
    for (let i = 0; i < 15; i++) if (g[i] === '1') p.px(cx + (i % 3), y + Math.floor(i / 3), c);
    cx += 4;
  }
}
export const textW = (s: string) => s.length * 4 - 1;

/** deterministic noise for textures */
export function hash(x: number, y: number, s = 0): number {
  let h = (x * 374761393 + y * 668265263 + s * 2147483647) | 0;
  h = (h ^ (h >>> 13)) * 1274126177;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
