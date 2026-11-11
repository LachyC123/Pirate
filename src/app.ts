// Shell: layout, scene routing, save handling and DOM helpers shared by scenes.
import Phaser from 'phaser';
import { Save } from './core/game';
import { load, persist, storageOk, wipe } from './core/save';
import { Pix } from './art/pix';
import { icon, SH } from './art/scenes';
import { setMuted, sfx, unlock } from './sfx';

export let S: Save = load();
export function commit(): void { persist(S); if (!storageOk) toast('Storage is unavailable: progress will not survive closing this tab.'); }
export function resetSave(): void { wipe(); S = load(); S.settings = { mute: false, reduced: false }; }
export function replaceSave(s: Save): void { S = s; }

export interface Layout { land: boolean; W: number; H: number; scale: number; x: number; y: number; cssW: number; cssH: number; vw: number; vh: number }
export let L: Layout = { land: true, W: 400, H: SH, scale: 2, x: 0, y: 0, cssW: 800, cssH: 360, vw: 800, vh: 360 };
export let game: Phaser.Game;

export function computeLayout(): Layout {
  const vv = window.visualViewport;
  const vw = Math.round(vv?.width ?? window.innerWidth), vh = Math.round(vv?.height ?? window.innerHeight);
  const land = vw > vh * 1.08;
  let W: number, scale: number;
  if (land) {
    scale = vh / SH;
    W = Math.round(vw / scale);
    if (W > 470) W = 470;
    if (W < 300) { W = 300; scale = vw / W; }
  } else {
    W = 210;
    scale = Math.min(vw / W, (vh * 0.56) / SH);
  }
  const cssW = Math.round(W * scale), cssH = Math.round(SH * scale);
  return { land, W, H: SH, scale, x: Math.round((vw - cssW) / 2), y: land ? Math.round((vh - cssH) / 2) : 0, cssW, cssH, vw, vh };
}

export function applyLayout(): boolean {
  const n = computeLayout();
  const changed = n.W !== L.W || n.land !== L.land || n.cssW !== L.cssW || n.cssH !== L.cssH || n.vh !== L.vh || n.vw !== L.vw;
  L = n;
  const app = document.getElementById('app')!;
  app.style.width = L.vw + 'px'; app.style.height = L.vh + 'px';
  document.body.classList.toggle('land', L.land); document.body.classList.toggle('port', !L.land);
  const st = document.getElementById('stage')!;
  st.style.left = L.x + 'px'; st.style.top = L.y + 'px'; st.style.width = L.cssW + 'px'; st.style.height = L.cssH + 'px';
  const r = document.documentElement.style;
  r.setProperty('--sx', L.x + 'px'); r.setProperty('--sy', L.y + 'px'); r.setProperty('--sw', L.cssW + 'px'); r.setProperty('--sh', L.cssH + 'px'); r.setProperty('--s', String(L.scale));
  if (game) {
    game.scale.resize(L.W, L.H);
    const c = game.canvas; c.style.width = L.cssW + 'px'; c.style.height = L.cssH + 'px';
  }
  return changed;
}

const SCENE_FOR: Record<string, string> = { create: 'Create', harbour: 'Harbour', shop: 'Shop', gate: 'Gate', battle: 'Battle', result: 'Battle', prize: 'Battle' };
export function go(): void {
  commit();
  clearUI();
  closeModal();
  const key = SCENE_FOR[S.screen];
  for (const sc of game.scene.getScenes(true)) game.scene.stop(sc.scene.key);
  game.scene.start(key);
}
export function setGame(g: Phaser.Game): void { game = g; }

// DOM helpers ---------------------------------------------------------------
type Child = Node | string | null | undefined | false;
export function h(tag: string, attrs: Record<string, any> | null, ...kids: Child[]): HTMLElement {
  const [t, ...cls] = tag.split('.');
  const e = document.createElement(t || 'div');
  if (cls.length) e.className = cls.join(' ');
  if (attrs) for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === null || v === false) continue;
    if (k === 'on') { e.addEventListener('click', (ev) => { ev.preventDefault(); unlock(); v(ev); }); }
    else if (k === 'style') e.setAttribute('style', v);
    else if (k === 'html') e.innerHTML = v;
    else if (k.startsWith('data-') || k === 'disabled' || k === 'type' || k === 'value' || k === 'maxlength' || k === 'placeholder' || k === 'aria-label' || k === 'title') e.setAttribute(k, v === true ? '' : String(v));
    else (e as any)[k] = v;
  }
  for (const k of kids) if (k) e.append(k);
  return e;
}
export const ui = () => document.getElementById('ui')!;
export function clearUI(): void { ui().replaceChildren(); }
export function closeModal(): void { const m = document.getElementById('modal')!; m.replaceChildren(); m.classList.remove('open'); }
export function modal(...kids: Child[]): HTMLElement {
  const m = document.getElementById('modal')!;
  const box = h('div.sheet', null, ...kids);
  m.replaceChildren(box); m.classList.add('open');
  m.onclick = (e) => { if (e.target === m) closeModal(); };
  return box;
}
let toastT = 0;
export function toast(msg: string): void {
  const t = document.getElementById('toast')!;
  t.textContent = msg; t.classList.add('show');
  clearTimeout(toastT); toastT = window.setTimeout(() => t.classList.remove('show'), 2600);
}
/** stage logical coordinates to CSS pixels inside #app */
export const sx = (x: number) => L.x + x * L.scale;
export const sy = (y: number) => L.y + y * L.scale;
export function place(e: HTMLElement, x: number, y: number): HTMLElement { e.style.left = sx(x) + 'px'; e.style.top = sy(y) + 'px'; return e; }

const iconCache: Record<string, string> = {};
export function iconUrl(name: string): string { return (iconCache[name] ??= icon(name).dataUrl()); }
export function pixUrl(key: string, make: () => Pix): string { return (iconCache[key] ??= make().dataUrl()); }
export function ico(name: string, size = 16): HTMLElement { return h('img.ico', { src: iconUrl(name), width: size, height: size, alt: '' }); }
export function btn(label: Child | Child[], on: () => void, cls = '', attrs: Record<string, any> = {}): HTMLElement {
  const kids = Array.isArray(label) ? label : [label];
  return h('button.btn' + (cls ? '.' + cls.split(' ').join('.') : ''), { type: 'button', on: () => { sfx('tap'); on(); }, ...attrs }, ...kids);
}

export function tex(scene: Phaser.Scene, key: string, pix: Pix): string {
  if (scene.textures.exists(key)) scene.textures.remove(key);
  scene.textures.addCanvas(key, pix.toCanvas());
  return key;
}
export function applySettings(): void { setMuted(S.settings.mute); document.body.classList.toggle('reduced', S.settings.reduced); }
export function mount(...kids: Child[]): void { for (const k of kids) if (k) ui().append(k); }
