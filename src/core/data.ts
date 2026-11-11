// Static, ID-keyed game data. IDs are stable: saves reference them.

export type Attr = 'might' | 'finesse' | 'grit' | 'guile';
export type Attrs = Record<Attr, number>;
export const ATTRS: Attr[] = ['might', 'finesse', 'grit', 'guile'];
export const ATTR_INFO: Record<Attr, { name: string; blurb: string }> = {
  might: { name: 'Might', blurb: 'Heavy moves hit harder.' },
  finesse: { name: 'Finesse', blurb: 'Precise moves hit harder and land more often.' },
  grit: { name: 'Grit', blurb: 'More health, more stamina, sturdier brace.' },
  guile: { name: 'Guile', blurb: 'Tricks, shoves and off-hand work.' },
};

export const LANE = 7;

export type AnimKind = 'slash' | 'heavy' | 'thrust' | 'shove' | 'shot' | 'cuff' | 'cast' | 'haul' | 'reload';

export interface MoveDef {
  id: string;
  name: string;
  icon: string;
  /** legal distances in lane spaces, inclusive */
  reach?: [number, number];
  dmg?: [number, number];
  scale?: Attr;
  /** damage added per attribute point (default 0.5) */
  k?: number;
  acc?: number;
  st: number;
  anim: AnimKind;
  desc: string;
  offhand?: boolean;
  needsLoaded?: boolean;
  unload?: boolean;
  reload?: boolean;
  needsRiposte?: boolean;
  push?: boolean;
  pull?: boolean;
  /** starts a committed special that is released next turn with `windup.release` */
  windup?: { release: string; caption: string };
  releaseOf?: string;
  /** awkward range */
  poor?: { dist: number; acc: number; dmgMul: number; note: string };
  /** accuracy lost per space beyond `from` */
  falloff?: { from: number; per: number };
  heavy?: boolean;
}

const M = (m: MoveDef) => m;
export const MOVES: Record<string, MoveDef> = {
  slash: M({ id: 'slash', name: 'Slash', icon: 'slash', reach: [1, 1], dmg: [3, 5], scale: 'finesse', acc: 86, st: 2, anim: 'slash', desc: 'Cheap, dependable cut at one space.' }),
  riposte: M({ id: 'riposte', name: 'Riposte', icon: 'riposte', reach: [1, 1], dmg: [5, 7], scale: 'finesse', acc: 96, st: 1, anim: 'slash', needsRiposte: true, desc: 'Only after you block a hit while braced. Fast, cheap and nearly certain.' }),
  hack: M({ id: 'hack', name: 'Hack', icon: 'heavy', reach: [1, 1], dmg: [5, 8], scale: 'might', k: 1, acc: 68, st: 4, anim: 'heavy', heavy: true, desc: 'A big clumsy swing. Hurts when it lands, leaves you winded. Jars your arm if blocked.' }),
  cleave: M({ id: 'cleave', name: 'Cleave', icon: 'heavy', reach: [1, 1], dmg: [6, 9], scale: 'might', k: 1, acc: 72, st: 4, anim: 'heavy', heavy: true, desc: 'A butcher\'s swing. Heavy damage, heavy cost. Jars your arm if blocked.' }),
  thrust: M({ id: 'thrust', name: 'Thrust', icon: 'thrust', reach: [1, 2], dmg: [3, 5], scale: 'finesse', acc: 84, st: 2, anim: 'thrust', poor: { dist: 1, acc: -25, dmgMul: 0.5, note: 'Poor leverage at one space' }, desc: 'Reaches two spaces. Cramped and weak at one space.' }),
  lunge: M({ id: 'lunge', name: 'Long Lunge', icon: 'lunge', reach: [2, 2], dmg: [5, 8], scale: 'might', k: 1, acc: 70, st: 4, anim: 'thrust', heavy: true, desc: 'Full-weight lunge at exactly two spaces.' }),
  shove: M({ id: 'shove', name: 'Haft Shove', icon: 'shove', reach: [1, 1], dmg: [0, 1], scale: 'guile', k: 1, acc: 90, st: 3, anim: 'shove', push: true, desc: 'Shoves the enemy back one space to restore your reach. Pinned enemies take extra instead.' }),
  shot: M({ id: 'shot', name: 'Pistol Shot', icon: 'shot', reach: [2, 6], dmg: [7, 10], scale: 'finesse', acc: 82, st: 1, anim: 'shot', needsLoaded: true, unload: true, falloff: { from: 3, per: 5 }, desc: 'One loaded ball. Cannot be fired at one space. Reloading takes a whole turn.' }),
  reload: M({ id: 'reload', name: 'Reload', icon: 'reload', st: 0, anim: 'reload', reload: true, desc: 'Spend the turn ramming a fresh ball home.' }),
  sabre: M({ id: 'sabre', name: 'Sabre Cut', icon: 'slash', reach: [1, 1], dmg: [3, 5], scale: 'finesse', acc: 86, st: 2, anim: 'slash', desc: 'The sabre does the close work.' }),
  rake: M({ id: 'rake', name: 'Hook Rake', icon: 'rake', reach: [1, 1], dmg: [4, 6], scale: 'might', acc: 84, st: 2, anim: 'slash', desc: 'Drag the hook across them at one space.' }),
  cast: M({ id: 'cast', name: 'Cast Line', icon: 'cast', reach: [2, 4], st: 2, anim: 'cast', windup: { release: 'haul', caption: 'Chain running taut' }, desc: 'Throw the hook and let the chain run taut. Next turn you may Haul. The enemy sees it coming.' }),
  haul: M({ id: 'haul', name: 'Haul', icon: 'haul', reach: [1, 5], dmg: [5, 8], scale: 'might', acc: 90, st: 2, anim: 'haul', pull: true, releaseOf: 'cast', heavy: true, desc: 'Drag the enemy to one space and hurt them. A braced enemy holds firm and you lose your footing (−2 stamina). Slack and weak if they already closed in.' }),
  cuff: M({ id: 'cuff', name: 'Cuff', icon: 'cuff', reach: [1, 1], dmg: [0, 1], scale: 'guile', k: 1, acc: 92, st: 1, anim: 'cuff', offhand: true, desc: 'Off-hand clout. Barely costs a breath.' }),
};

export type Family = 'hanger' | 'pike' | 'pistol' | 'hook';
export const FAMILY_INFO: Record<Family, { name: string; trick: string }> = {
  hanger: { name: 'Hangers & cutlasses', trick: 'Brace, block a hit, then Riposte.' },
  pike: { name: 'Boarding pikes', trick: 'Strikes from two spaces. Shove to get your distance back.' },
  pistol: { name: 'Pistol & sabre', trick: 'One loaded shot from range. Reloading costs a turn.' },
  hook: { name: 'Hooks & lines', trick: 'Cast, then Haul the enemy to you. A braced enemy resists.' },
};

export interface WeaponDef {
  id: string;
  name: string;
  family: Family;
  price: number;
  /** flat damage added to this weapon's own moves */
  power: number;
  moves: string[];
  sprite: string;
  blurb: string;
  /** not for sale; tournament prize */
  prize?: boolean;
  /** title id needed before the smith stocks it */
  stockAfter?: string;
  /** pixel reach beyond the hand, for staging */
  len: number;
}

export const WEAPONS: Record<string, WeaponDef> = {
  chipped_hanger: { id: 'chipped_hanger', name: 'Chipped Hanger', family: 'hanger', price: 0, power: 0, moves: ['slash', 'riposte', 'hack'], sprite: 'hanger', len: 13, blurb: 'Notched, honest, yours. It has opened more crates than throats.' },
  gull_sticker: { id: 'gull_sticker', name: 'Gull-Sticker', family: 'pike', price: 30, power: 0, moves: ['thrust', 'lunge', 'shove'], sprite: 'pike', len: 30, blurb: 'A boarding pike with a tar-black shaft. Keeps a quarrel at two spaces.' },
  powder_promise: { id: 'powder_promise', name: 'Powder & Promise', family: 'pistol', price: 45, power: 0, moves: ['shot', 'sabre', 'reload'], sprite: 'sabre', len: 13, blurb: 'A sea-service pistol and the sabre that apologises for it.' },
  widows_knife: { id: 'widows_knife', name: "Widow's Kitchen Knife", family: 'hanger', price: 70, power: 2, moves: ['slash', 'riposte', 'cleave'], sprite: 'knife', len: 14, blurb: 'A broad butcher\'s hanger. The widow kept it very sharp for a reason.' },
  long_tom: { id: 'long_tom', name: 'Long Tom', family: 'pike', price: 120, power: 2, moves: ['thrust', 'lunge', 'shove'], sprite: 'longtom', len: 32, stockAfter: 'tar_bucket', blurb: 'A pennant is tied under the head so they can see who is poking them.' },
  last_word: { id: 'last_word', name: 'Last Word', family: 'pistol', price: 180, power: 3, moves: ['shot', 'sabre', 'reload'], sprite: 'lastword', len: 14, stockAfter: 'coopers_purse', blurb: 'A pearl-handled captain\'s pair. It always gets it.' },
  towline: { id: 'towline', name: "Moll's Towline", family: 'hook', price: 0, power: 0, moves: ['rake', 'cast', 'haul'], sprite: 'hook', len: 11, prize: true, blurb: 'Old Moll\'s enormous brass hook and forty feet of ferry chain.' },
};

/** rack order at Peg Mallory's */
export const SMITH_STOCK = ['gull_sticker', 'powder_promise', 'widows_knife', 'chipped_hanger', 'long_tom', 'last_word'];

export interface Look {
  skin: number;
  hair: number; // style index, 0 = bald
  hairColor: number;
  beard: number; // 0 none
  shirt: number;
  trousers: number;
  hat?: string;
  coat?: string;
  coatColor?: number;
  broad?: boolean;
  eyepatch?: boolean;
  pegleg?: boolean;
}

export type AiStyle = 'guard' | 'brawler' | 'powder' | 'duelist' | 'moll';

export interface NpcDef {
  id: string;
  name: string;
  epithet: string;
  ai: AiStyle;
  weapon: string;
  attrs: Attrs;
  hp: number;
  /** personal accuracy modifier */
  acc?: number;
  look: Look;
  intro: string;
  onWin: string;
  onLose: string;
}

const A = (might: number, finesse: number, grit: number, guile: number): Attrs => ({ might, finesse, grit, guile });

export const NPCS: Record<string, NpcDef> = {
  nib_pike: { id: 'nib_pike', name: 'Nib Pike', epithet: 'keeps you at spear range', ai: 'guard', weapon: 'gull_sticker', attrs: A(2, 2, 2, 1), hp: 24, look: { skin: 1, hair: 2, hairColor: 1, beard: 0, shirt: 3, trousers: 1, hat: 'knit' }, intro: 'Two spaces. That is as near as we need be.', onWin: 'Told you. Two spaces.', onLose: 'You got inside. Nobody gets inside.' },
  pistol_pip: { id: 'pistol_pip', name: 'Pistol Pip', epithet: 'spends his opening shot early', ai: 'powder', weapon: 'powder_promise', attrs: A(1, 3, 2, 2), hp: 24, acc: -4, look: { skin: 0, hair: 3, hairColor: 2, beard: 0, shirt: 2, trousers: 2, hat: 'tricorn' }, intro: 'I only need the one ball. Usually.', onWin: 'One ball. Told you.', onLose: 'I should have waited. I never wait.' },
  old_moll: { id: 'old_moll', name: 'Old Moll Towline', epithet: 'champion of the Tar Bucket Cup', ai: 'moll', weapon: 'towline', attrs: A(2, 2, 3, 2), hp: 30, look: { skin: 2, hair: 4, hairColor: 4, beard: 0, shirt: 0, trousers: 3, coat: 'short', coatColor: 1, broad: true, hat: 'bandana' }, intro: 'Forty years I hauled that ferry. You are lighter than a ferry.', onWin: 'Back on the far bank with you.', onLose: 'Well. The chain has a new hand. Mind it. It pulls both ways.' },
  barrel_bess: { id: 'barrel_bess', name: 'Barrel Bess', epithet: 'first stave of Cooper\'s Purse', ai: 'duelist', weapon: 'widows_knife', attrs: A(3, 2, 3, 1), hp: 30, look: { skin: 3, hair: 1, hairColor: 0, beard: 0, shirt: 4, trousers: 0, coat: 'vest', coatColor: 2, broad: true }, intro: 'Cooper says a barrel is only as good as its first stave. That is me.', onWin: 'Roll this one back down the pier.', onLose: 'Sprung. Fair enough.' },
};

export interface TourDef {
  id: string;
  name: string;
  circuit: string;
  rounds: string[];
  /** how many rounds are actually built */
  built: number;
  requires?: string;
  prize: { gold: number; weapon?: string };
  pennant: number; // colour index
  blurb: string;
  championCue?: string;
}

export const TOURS: Record<string, TourDef> = {
  tar_bucket: { id: 'tar_bucket', name: 'Tar Bucket Cup', circuit: 'Tarwater Docks', rounds: ['nib_pike', 'pistol_pip', 'old_moll'], built: 3, prize: { gold: 40, weapon: 'towline' }, pennant: 1, blurb: 'Two qualifiers, then Old Moll Towline. Six spectators and a rail of mugs.', championCue: 'When her chain runs taut she will haul next turn. Brace to hold firm, or close in so the line goes slack.' },
  coopers_purse: { id: 'coopers_purse', name: "Cooper's Purse", circuit: 'Tarwater Docks', rounds: ['barrel_bess', 'tbd', 'tbd'], built: 1, requires: 'tar_bucket', prize: { gold: 70 }, pennant: 2, blurb: 'Barrel Bess opens. The later staves and Cooper himself arrive in the next build.' },
};
export const TOUR_ORDER = ['tar_bucket', 'coopers_purse'];

// Friendly archetypes -------------------------------------------------------

export interface Archetype {
  id: string;
  label: string;
  ai: AiStyle;
  weapon: string;
  attrs: Attrs;
  hp: number;
  acc?: number;
  names: string[];
  lines: string[];
  tell: string;
  looks: Partial<Look>;
}

export const ARCHETYPES: Archetype[] = [
  { id: 'dock_guard', label: 'Patient dock guard', ai: 'guard', weapon: 'gull_sticker', attrs: A(2, 2, 2, 1), hp: 24, names: ['Hobb Staves', 'Wick Tanner', 'Dunny Oakum', 'Marl Fenwick'], lines: ['Stand where I can reach you.', 'I get paid by the hour. Take your time.', 'No running on the dock.'], tell: 'Holds you at two spaces and shoves when crowded.', looks: { hat: 'knit', shirt: 3 } },
  { id: 'fishmonger', label: 'Impatient fishmonger', ai: 'brawler', weapon: 'chipped_hanger', attrs: A(3, 1, 1, 1), hp: 26, names: ['Gill Barrow', 'Cod Annie', 'Tam Brisling', 'Sprat Maguire'], lines: ['I have eels going off. Hurry up.', 'Stand still and be filleted!', 'Twice! I always get them twice!'], tell: 'Charges in and swings until the breath runs out.', looks: { coat: 'vest', coatColor: 3, shirt: 0 } },
  { id: 'powder_boy', label: 'Nervous powder boy', ai: 'powder', weapon: 'powder_promise', attrs: A(1, 2, 1, 2), hp: 22, acc: -6, names: ['Squib', 'Little Fuse', 'Tinder Joss', 'Ned Flash'], lines: ['It is loaded. I checked. Twice.', 'D-do not come any closer.', 'The captain said aim low. Or was it high?'], tell: 'Brave while loaded. Backs away after firing.', looks: { hat: 'bandana', shirt: 2 } },
];

export const LOST: Record<string, { label: string; thing: string; intro: string; coin: string; end: string }> = {
  ship: { label: 'A lost ship', thing: 'your ship', intro: 'The sea took the Marigold with all her brass. They say the Purse can buy her back, plank by plank.', coin: 'The coin is cold as a keel. Somewhere, a bilge pump coughs.', end: 'A mast stands in the fog where no mast was.' },
  name: { label: 'A lost name', thing: 'your name', intro: 'You signed your name away to a drowned man. They say the Purse can buy it back, letter by letter.', coin: 'The coin has a letter scratched on it. It might be one of yours.', end: 'Someone calls a name across the water, and you turn.' },
  companion: { label: 'A lost companion', thing: 'your companion', intro: 'Old Biscuit went over the rail off Cape Mercy. They say the Purse can buy back anyone the sea still remembers.', coin: 'The coin is warm, like a hand just let go of it.', end: 'Wet footprints lead up the pier and stop beside yours.' },
};

export const START_GOLD = 8;
export const XP_STEPS = [0, 12, 30, 54, 84, 120, 162, 210, 264, 324];
export const xpForLevel = (lvl: number) => (lvl - 1 < XP_STEPS.length ? XP_STEPS[lvl - 1] : XP_STEPS[XP_STEPS.length - 1] + (lvl - XP_STEPS.length) * 70);
