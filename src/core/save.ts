// Versioned local snapshot. Tolerant of older or partly unknown data.
import { NPCS, TOURS, WEAPONS, WEARS } from './data';
import { SAVE_VERSION, Save, blankSave } from './game';

const KEY = 'dead-mans-purse/save';
export let storageOk = true;

export function migrate(raw: unknown): Save {
  const base = blankSave();
  if (!raw || typeof raw !== 'object') return base;
  const r = raw as Partial<Save>;
  if (typeof r.v !== 'number' || r.v > SAVE_VERSION) return base;
  const s: Save = { ...base, ...r, v: SAVE_VERSION };
  s.look = { ...base.look, ...(r.look ?? {}) };
  s.attrs = { ...base.attrs, ...(r.attrs ?? {}) };
  s.settings = { ...base.settings, ...(r.settings ?? {}) };
  s.seen = { ...(r.seen ?? {}) };
  s.owned = (Array.isArray(r.owned) ? r.owned : []).filter((id) => WEAPONS[id] || WEARS[id]);
  s.wear = { hat: null, coat: null, off: null, ...(r.wear ?? {}) };
  for (const k of ['hat', 'coat', 'off'] as const) { const id = s.wear[k]; if (id && (!WEARS[id] || WEARS[id].slot !== k || !s.owned.includes(id))) s.wear[k] = null; }
  if (s.shop !== 'armoury') s.shop = 'smith';
  if (!s.owned.includes('chipped_hanger')) s.owned.unshift('chipped_hanger');
  if (!s.owned.includes(s.main) || !WEAPONS[s.main]) s.main = 'chipped_hanger';
  s.titles = (Array.isArray(r.titles) ? r.titles : []).filter((id) => TOURS[id]);
  if (s.tour && (!TOURS[s.tour.id] || s.tour.round >= TOURS[s.tour.id].built)) s.tour = null;
  const foeOk = (f: Save['foe']) => !f || (WEAPONS[f.weapon] && (!f.npc || NPCS[f.npc]));
  if (!foeOk(s.offer)) s.offer = null;
  const b = s.battle;
  const battleOk = b && s.foe && foeOk(s.foe) && Array.isArray(b.f) && b.f.length === 2 && WEAPONS[b.f[0].weapon] && WEAPONS[b.f[1].weapon] && typeof b.f[0].off === 'string' && b.chain !== undefined;
  if (!battleOk) {
    s.battle = null;
    s.pending = null;
    if (s.screen === 'battle' || s.screen === 'result' || s.screen === 'prize') s.screen = s.name ? 'harbour' : 'create';
    if (s.screen === 'harbour') s.tour = null;
  }
  if (!s.name) s.screen = 'create';
  return s;
}

export function load(): Save {
  try {
    const t = localStorage.getItem(KEY);
    return migrate(t ? JSON.parse(t) : null);
  } catch {
    storageOk = false;
    return blankSave();
  }
}

export function persist(s: Save): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
    storageOk = true;
  } catch {
    storageOk = false;
  }
}

export function wipe(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    storageOk = false;
  }
}
