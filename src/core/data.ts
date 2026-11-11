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

export type AnimKind = 'slash' | 'heavy' | 'thrust' | 'shove' | 'shot' | 'cuff' | 'cast' | 'haul' | 'reload' | 'plant' | 'cross' | 'dazzle';

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
  windup?: { release: string; caption: string; verb: string; counter: 'brace' | 'retreat'; advice: string };
  /** ignores brace entirely */
  guardBreak?: boolean;
  /** spaces pushed (default 1 when push is set) */
  pushBy?: number;
  /** paired blades: an unblocked hit offers the off-hand follow-up */
  lead?: boolean;
  /** only usable as the follow-up, never from the fan */
  chainOnly?: boolean;
  /** leaves the anchor on the target's space */
  anchorThrow?: boolean;
  /** drags the anchor home: strikes anything on or inside the marked space */
  reel?: boolean;
  /** attacker rushes adjacent before striking */
  dash?: boolean;
  hits?: number;
  /** target's next attack is less accurate */
  daze?: boolean;
  /** stamina knocked out of the target on a hit */
  drain?: number;
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
  cast: M({ id: 'cast', name: 'Cast Line', icon: 'cast', reach: [2, 4], st: 2, anim: 'cast', windup: { release: 'haul', caption: 'Chain running taut', verb: 'hauls', counter: 'brace', advice: 'Brace, or close in.' }, desc: 'Throw the hook and let the chain run taut. Next turn you may Haul. The enemy sees it coming.' }),
  haul: M({ id: 'haul', name: 'Haul', icon: 'haul', reach: [1, 5], dmg: [5, 8], scale: 'might', acc: 90, st: 2, anim: 'haul', pull: true, releaseOf: 'cast', heavy: true, desc: 'Drag the enemy to one space and hurt them. A braced enemy holds firm and you lose your footing (−2 stamina). Slack and weak if they already closed in.' }),
  cut: M({ id: 'cut', name: 'Lead Cut', icon: 'slash', reach: [1, 1], dmg: [3, 5], scale: 'finesse', acc: 86, st: 2, anim: 'slash', lead: true, desc: 'If it lands unblocked you may pay 3 more stamina for an off-hand Follow-Up before the enemy replies.' }),
  scissor: M({ id: 'scissor', name: 'Scissor', icon: 'heavy', reach: [1, 1], dmg: [4, 7], scale: 'finesse', k: 1, acc: 74, st: 4, anim: 'heavy', heavy: true, lead: true, desc: 'Both blades at once. Costly. If it lands unblocked you may still Follow-Up.' }),
  follow: M({ id: 'follow', name: 'Follow-Up', icon: 'riposte', reach: [1, 1], dmg: [2, 4], scale: 'finesse', acc: 90, st: 3, anim: 'cuff', chainOnly: true, offhand: true, desc: 'The other blade, straight after a cut connects.' }),
  cross: M({ id: 'cross', name: 'Cross Blades', icon: 'cross', reach: [1, 3], st: 2, anim: 'cross', windup: { release: 'flurry', caption: 'Blades crossed', verb: 'rushes in', counter: 'brace', advice: 'Brace to turn both cuts, or get more than three spaces away.' }, desc: 'Cross the blades and coil. Next turn you may rush in with a Double Hitch. The enemy sees it coming.' }),
  flurry: M({ id: 'flurry', name: 'Double Hitch', icon: 'flurry', reach: [1, 3], dmg: [3, 5], scale: 'finesse', acc: 90, st: 3, anim: 'slash', releaseOf: 'cross', dash: true, hits: 2, heavy: true, desc: 'Rush up to three spaces and cut twice. A braced enemy turns both and you lose your footing (−2 stamina).' }),
  thump: M({ id: 'thump', name: 'Thump', icon: 'thump', reach: [1, 1], dmg: [4, 6], scale: 'might', acc: 82, st: 3, anim: 'slash', desc: 'Dependable for a maul, which is to say tiring.' }),
  breaker: M({ id: 'breaker', name: 'Guard Breaker', icon: 'breaker', reach: [1, 1], dmg: [5, 8], scale: 'might', k: 1, acc: 74, st: 5, anim: 'heavy', heavy: true, guardBreak: true, push: true, desc: 'Ignores a brace completely and drives the enemy back one space. Very expensive.' }),
  plant: M({ id: 'plant', name: 'Plant Feet', icon: 'plant', reach: [1, 1], st: 2, anim: 'plant', windup: { release: 'driver', caption: 'Feet planted', verb: 'swings the driver', counter: 'retreat', advice: 'Bracing will not help. Step back out of reach.' }, desc: 'Set your feet for the Hoop Driver. Next turn it lands on the space in front of you. The enemy sees it coming.' }),
  driver: M({ id: 'driver', name: 'Hoop Driver', icon: 'breaker', reach: [1, 1], dmg: [8, 11], scale: 'might', k: 1, acc: 94, st: 3, anim: 'heavy', heavy: true, guardBreak: true, push: true, pushBy: 2, releaseOf: 'plant', desc: 'Breaks any guard and drives the enemy back two spaces. Hits only the space in front of you: if they step away it buries itself in the deck.' }),
  lash: M({ id: 'lash', name: 'Chain Lash', icon: 'lash', reach: [1, 2], dmg: [2, 4], scale: 'might', acc: 84, st: 2, anim: 'slash', desc: 'A loop of chain, good to two spaces. Works whether or not the anchor is in your hands.' }),
  heave: M({ id: 'heave', name: 'Anchor Heave', icon: 'heave', reach: [1, 4], dmg: [5, 8], scale: 'might', acc: 76, st: 4, anim: 'cast', heavy: true, anchorThrow: true, poor: { dist: 1, acc: -18, dmgMul: 0.6, note: 'No room to swing it' }, desc: 'Throw the anchor. Hit or miss it stays on that space, marked on the deck, until you Reel In.' }),
  reel: M({ id: 'reel', name: 'Reel In', icon: 'haul', dmg: [4, 7], scale: 'might', acc: 95, st: 2, anim: 'haul', reel: true, pull: true, desc: 'Drag the anchor home. An enemy on the marked space, or between it and you, is struck and dragged to one space. A braced enemy holds firm. Beyond the mark they are safe.' }),
  bash: M({ id: 'bash', name: 'Buckler Bash', icon: 'bash', reach: [1, 1], dmg: [0, 1], scale: 'guile', k: 1, acc: 90, st: 2, anim: 'cuff', offhand: true, drain: 2, desc: 'Off-hand. Knocks 2 stamina out of them.' }),
  pin: M({ id: 'pin', name: 'Pin Crack', icon: 'pin', reach: [1, 1], dmg: [1, 2], scale: 'guile', k: 1, acc: 88, st: 2, anim: 'cuff', offhand: true, guardBreak: true, desc: 'Off-hand. A belaying pin over the knuckles: ignores a brace.' }),
  dazzle: M({ id: 'dazzle', name: 'Lantern Dazzle', icon: 'dazzle', reach: [1, 2], dmg: [0, 0], acc: 88, st: 2, anim: 'dazzle', offhand: true, daze: true, desc: 'Off-hand. No damage. Their next attack is 25% less likely to land.' }),
  cuff: M({ id: 'cuff', name: 'Cuff', icon: 'cuff', reach: [1, 1], dmg: [0, 1], scale: 'guile', k: 1, acc: 92, st: 1, anim: 'cuff', offhand: true, desc: 'Off-hand clout. Barely costs a breath.' }),
};

export type Family = 'hanger' | 'pike' | 'pistol' | 'hook' | 'paired' | 'maul' | 'anchor';
export const FAMILY_INFO: Record<Family, { name: string; trick: string }> = {
  hanger: { name: 'Hangers & cutlasses', trick: 'Brace, block a hit, then Riposte.' },
  pike: { name: 'Boarding pikes', trick: 'Strikes from two spaces. Shove to get your distance back.' },
  pistol: { name: 'Pistol & sabre', trick: 'One loaded shot from range. Reloading costs a turn.' },
  hook: { name: 'Hooks & lines', trick: 'Cast, then Haul the enemy to you. A braced enemy resists.' },
  paired: { name: 'Paired blades', trick: 'When a cut lands, pay 3 stamina for an off-hand Follow-Up.' },
  maul: { name: 'Mauls & capstans', trick: 'Guard Breaker ignores a brace and drives them back.' },
  anchor: { name: 'Anchors & chains', trick: 'Heave marks a space. Reel In strikes it again on the way home.' },
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
  fishwifes_pair: { id: 'fishwifes_pair', name: "Fishwife's Pair", family: 'paired', price: 40, power: 0, moves: ['cut', 'scissor'], sprite: 'gutter', len: 10, blurb: 'Two gutting knives that have never been apart.' },
  caulking_mallet: { id: 'caulking_mallet', name: 'Caulking Mallet', family: 'maul', price: 50, power: 0, moves: ['thump', 'breaker'], sprite: 'mallet', len: 14, blurb: 'For driving oakum into seams, and opinions into dock guards.' },
  kedge_chain: { id: 'kedge_chain', name: 'Kedge & Chain', family: 'anchor', price: 65, power: 0, moves: ['lash', 'heave', 'reel'], sprite: 'kedge', len: 12, stockAfter: 'tar_bucket', blurb: 'A small anchor on a long argument.' },
  capstan_bar: { id: 'capstan_bar', name: 'Capstan Bar', family: 'maul', price: 140, power: 2, moves: ['thump', 'breaker'], sprite: 'capstan', len: 18, stockAfter: 'coopers_purse', blurb: 'Six feet of ash that has turned a thousand anchors home.' },
  port_starboard: { id: 'port_starboard', name: 'Port and Starboard', family: 'paired', price: 135, power: 2, moves: ['cut', 'scissor'], sprite: 'coral', len: 12, stockAfter: 'ropewalk', blurb: 'Mismatched coral-handled blades. One red ribbon, one green.' },
  dockmasters_due: { id: 'dockmasters_due', name: "Dockmaster's Due", family: 'anchor', price: 170, power: 2, moves: ['lash', 'heave', 'reel'], sprite: 'due', len: 13, stockAfter: 'ropewalk', blurb: 'What you owe, on a chain, at speed.' },
  coopers_persuader: { id: 'coopers_persuader', name: "Cooper's Persuader", family: 'maul', price: 0, power: 1, moves: ['thump', 'plant', 'driver'], sprite: 'persuader', len: 16, prize: true, blurb: 'Made from a barrel driver. It has persuaded a great many hoops.' },
  tansys_hitches: { id: 'tansys_hitches', name: "Tansy's Hitches", family: 'paired', price: 0, power: 1, moves: ['cut', 'cross', 'flurry'], sprite: 'hitches', len: 12, prize: true, blurb: 'Rope-walker\'s knives, spliced to her wrists for forty yards of walk.' },
  moorings_bower: { id: 'moorings_bower', name: "Mooring's Bower", family: 'anchor', price: 0, power: 3, moves: ['lash', 'heave', 'reel'], sprite: 'bower', len: 14, prize: true, blurb: 'Mother Mooring\'s best bower anchor. Everything comes back to it.' },
  towline: { id: 'towline', name: "Moll's Towline", family: 'hook', price: 0, power: 0, moves: ['rake', 'cast', 'haul'], sprite: 'hook', len: 11, prize: true, blurb: 'Old Moll\'s enormous brass hook and forty feet of ferry chain.' },
};

/** rack order at Peg Mallory's */
export const SMITH_STOCK = ['gull_sticker', 'powder_promise', 'fishwifes_pair', 'caulking_mallet', 'widows_knife', 'kedge_chain', 'long_tom', 'capstan_bar', 'port_starboard', 'dockmasters_due', 'last_word', 'chipped_hanger'];

// Wearables and off-hand gear ---------------------------------------------------
export type Slot = 'hat' | 'coat' | 'off';
export interface WearDef {
  id: string; name: string; slot: Slot; price: number; blurb: string;
  hp?: number; st?: number; attr?: Partial<Attrs>; soak?: number; guard?: number;
  /** look key drawn on the pirate */
  draw: string; color?: number;
  /** off-hand move replacing Cuff */
  move?: string;
  stockAfter?: string;
}
export const WEARS: Record<string, WearDef> = {
  knit_cap: { id: 'knit_cap', name: 'Knit Cap', slot: 'hat', price: 12, hp: 3, draw: 'knit', blurb: 'Warm ears take a punch better.' },
  straw_hat: { id: 'straw_hat', name: 'Straw Hat', slot: 'hat', price: 18, st: 1, draw: 'straw', blurb: 'Shade. You would be amazed what shade does for the lungs.' },
  red_bandana: { id: 'red_bandana', name: 'Red Bandana', slot: 'hat', price: 26, hp: 2, st: 1, draw: 'bandana', blurb: 'Keeps the sweat and the blood out of your eyes.' },
  tricorn: { id: 'tricorn', name: 'Borrowed Tricorn', slot: 'hat', price: 65, attr: { guile: 1 }, draw: 'tricorn', blurb: 'People believe a hat like this. That is most of the trick.' },
  diving_helmet: { id: 'diving_helmet', name: 'Brass Diving Helmet', slot: 'hat', price: 110, soak: 1, st: -1, draw: 'helmet', stockAfter: 'coopers_purse', blurb: 'Every hit lands 1 lighter. Stuffy.' },
  patched_vest: { id: 'patched_vest', name: 'Patched Vest', slot: 'coat', price: 25, hp: 4, draw: 'vest', color: 3, blurb: 'Six layers of sailcloth where it counts.' },
  short_coat: { id: 'short_coat', name: 'Ferryman\'s Short Coat', slot: 'coat', price: 55, hp: 7, draw: 'short', color: 2, blurb: 'Brass buttons, wool thick as a fender.' },
  tarred_greatcoat: { id: 'tarred_greatcoat', name: 'Tarred Greatcoat', slot: 'coat', price: 120, hp: 4, soak: 1, draw: 'long', color: 5, stockAfter: 'ropewalk', blurb: 'Stiff with tar. Every hit lands 1 lighter.' },
  belaying_pin: { id: 'belaying_pin', name: 'Belaying Pin', slot: 'off', price: 20, draw: 'pin', move: 'pin', blurb: 'Hardwood. Goes straight through a guard.' },
  buckler: { id: 'buckler', name: 'Hatch-Cover Buckler', slot: 'off', price: 40, guard: 2, draw: 'buckler', move: 'bash', blurb: 'Blocks 2 more when braced. The rim is for their ribs.' },
  storm_lantern: { id: 'storm_lantern', name: 'Storm Lantern', slot: 'off', price: 45, draw: 'lantern', move: 'dazzle', stockAfter: 'tar_bucket', blurb: 'Unshutter it in their face.' },
};
export const ARMOURY_STOCK = ['knit_cap', 'patched_vest', 'belaying_pin', 'straw_hat', 'red_bandana', 'buckler', 'short_coat', 'storm_lantern', 'tricorn', 'diving_helmet', 'tarred_greatcoat'];
/** these families fill the off hand themselves */
export const OFF_BUSY: Family[] = ['pistol', 'paired'];

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

export type AiStyle = 'guard' | 'brawler' | 'powder' | 'duelist' | 'moll' | 'twin' | 'mauler' | 'mooring';

export interface NpcDef {
  id: string;
  name: string;
  epithet: string;
  ai: AiStyle;
  weapon: string;
  off?: string;
  soak?: number;
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
  old_moll: { id: 'old_moll', name: 'Old Moll Towline', epithet: 'champion of the Tar Bucket Cup', ai: 'moll', weapon: 'towline', attrs: A(2, 2, 3, 2), hp: 34, look: { skin: 2, hair: 4, hairColor: 4, beard: 0, shirt: 0, trousers: 3, coat: 'short', coatColor: 1, broad: true, hat: 'bandana' }, intro: 'Forty years I hauled that ferry. You are lighter than a ferry.', onWin: 'Back on the far bank with you.', onLose: 'Well. The chain has a new hand. Mind it. It pulls both ways.' },
  splint_jenny: { id: 'splint_jenny', name: 'Splint Jenny', epithet: 'two knives, no patience', ai: 'twin', weapon: 'fishwifes_pair', attrs: A(2, 3, 2, 2), hp: 28, look: { skin: 0, hair: 3, hairColor: 2, beard: 0, shirt: 1, trousers: 1, hat: 'bandana' }, intro: 'One for the stave, one for the hoop.', onWin: 'Kindling.', onLose: 'Both of them missed? Both?' },
  cooper_gantry: { id: 'cooper_gantry', name: 'Cooper Gantry', epithet: 'champion of Cooper\'s Purse', ai: 'mauler', weapon: 'coopers_persuader', attrs: A(5, 2, 4, 1), hp: 42, look: { skin: 1, hair: 0, hairColor: 0, beard: 2, shirt: 0, trousers: 0, coat: 'vest', coatColor: 5, broad: true }, intro: 'Every barrel thinks it will hold. Then I fit the hoop.', onWin: 'Tight as a drum. Next.', onLose: 'Sprung my own hoop. Take the driver. It is honest work.' },
  hemp_odran: { id: 'hemp_odran', name: 'Hemp Odran', epithet: 'throws first, thinks on the reel', ai: 'mooring', weapon: 'kedge_chain', attrs: A(3, 2, 4, 1), hp: 40, look: { skin: 2, hair: 2, hairColor: 1, beard: 1, shirt: 3, trousers: 3, hat: 'straw' }, intro: 'Stand there. No, there. Where the kedge lands.', onWin: 'Fouled and hauled.', onLose: 'Dragged my own anchor.' },
  tallow_wick: { id: 'tallow_wick', name: 'Tallow Wick', epithet: 'never fires first', ai: 'powder', weapon: 'powder_promise', off: 'cuff', attrs: A(2, 5, 3, 2), hp: 40, look: { skin: 4, hair: 1, hairColor: 4, beard: 1, shirt: 5, trousers: 2, hat: 'tricorn', coat: 'short', coatColor: 4 }, intro: 'A candle burns longest if nobody blows.', onWin: 'Snuffed.', onLose: 'Burned at both ends, then.' },
  tansy: { id: 'tansy', name: 'Twin-Knot Tansy', epithet: 'champion of the Ropewalk Stakes', ai: 'twin', weapon: 'tansys_hitches', attrs: A(3, 5, 4, 3), hp: 52, look: { skin: 3, hair: 3, hairColor: 3, beard: 0, shirt: 2, trousers: 1, coat: 'vest', coatColor: 1 }, intro: 'Forty yards of rope walk, backwards, every day. You will not out-step me.', onWin: 'Whipped and seized.', onLose: 'Cut my own lashing. Keep the knives. Keep them crossed.' },
  bosun_crake: { id: 'bosun_crake', name: 'Bosun Crake', epithet: 'breaks guards for the watch', ai: 'mauler', weapon: 'capstan_bar', attrs: A(5, 2, 5, 1), hp: 54, look: { skin: 1, hair: 1, hairColor: 4, beard: 2, shirt: 5, trousers: 1, hat: 'knit', broad: true }, intro: 'All hands to the bar. That includes yours.', onWin: 'Turn him out of his hammock.', onLose: 'Belay that. Belay all of it.' },
  ferry_kate: { id: 'ferry_kate', name: 'Ferry Kate', epithet: 'Old Moll\'s niece, same chain', ai: 'moll', weapon: 'towline', attrs: A(4, 4, 5, 3), hp: 56, look: { skin: 2, hair: 2, hairColor: 0, beard: 0, shirt: 0, trousers: 3, coat: 'short', coatColor: 2, hat: 'straw' }, intro: 'Aunt Moll says you braced. Brace this.', onWin: 'Fare paid.', onLose: 'She said you would do that.' },
  deacon_shoal: { id: 'deacon_shoal', name: 'Deacon Shoal', epithet: 'keeps Long Tom between you', ai: 'guard', weapon: 'long_tom', attrs: A(4, 5, 4, 2), hp: 54, look: { skin: 4, hair: 0, hairColor: 0, beard: 0, shirt: 5, trousers: 1, coat: 'long', coatColor: 5, hat: 'tricorn' }, intro: 'Keep your distance, child. I shall keep mine.', onWin: 'Go in peace. Go quickly.', onLose: 'You came inside the rail. Bold.' },
  mother_mooring: { id: 'mother_mooring', name: 'Mother Mooring', epithet: 'headliner of the Tarwater Docks', ai: 'mooring', weapon: 'moorings_bower', soak: 1, attrs: A(4, 3, 5, 2), hp: 54, look: { skin: 1, hair: 4, hairColor: 4, beard: 0, shirt: 4, trousers: 3, coat: 'long', coatColor: 1, broad: true }, intro: 'Everything in this harbour is tied to something, dear. You are tied to me.', onWin: 'Made fast. Coil her down.', onLose: 'Slipped my cable. Well. Take the bower. Mind where you leave it.' },
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
  trophy: string;
  blurb: string;
  championCue?: string;
}

export const TOURS: Record<string, TourDef> = {
  tar_bucket: { id: 'tar_bucket', name: 'Tar Bucket Cup', circuit: 'Tarwater Docks', rounds: ['nib_pike', 'pistol_pip', 'old_moll'], built: 3, prize: { gold: 40, weapon: 'towline' }, pennant: 1, trophy: 'bucket', blurb: 'Two qualifiers, then Old Moll Towline. Six spectators and a rail of mugs.', championCue: 'When her chain runs taut she will haul next turn. Brace to hold firm, or close in so the line goes slack.' },
  coopers_purse: { id: 'coopers_purse', name: "Cooper's Purse", circuit: 'Tarwater Docks', rounds: ['barrel_bess', 'splint_jenny', 'cooper_gantry'], built: 3, requires: 'tar_bucket', prize: { gold: 70, weapon: 'coopers_persuader' }, pennant: 2, trophy: 'hoop', blurb: 'Barrel Bess, Splint Jenny, then Cooper Gantry and his barrel driver.', championCue: 'When Cooper plants his feet the driver lands next turn on the space in front of him. It breaks a brace. Step back.' },
  ropewalk: { id: 'ropewalk', name: 'Ropewalk Stakes', circuit: 'Tarwater Docks', rounds: ['hemp_odran', 'tallow_wick', 'tansy'], built: 3, requires: 'coopers_purse', prize: { gold: 100, weapon: 'tansys_hitches' }, pennant: 3, trophy: 'coil', blurb: 'An anchor-thrower, a patient pistol, then Twin-Knot Tansy.', championCue: 'When Tansy crosses her blades she rushes up to three spaces next turn and cuts twice. Brace to turn both.' },
  mooring_night: { id: 'mooring_night', name: 'Mooring Night', circuit: 'Tarwater Docks', rounds: ['bosun_crake', 'ferry_kate', 'deacon_shoal', 'mother_mooring'], built: 4, requires: 'ropewalk', prize: { gold: 150, weapon: 'moorings_bower' }, pennant: 4, trophy: 'anchor', blurb: 'Three qualifiers, one of each trick you have met, then Mother Mooring herself.', championCue: 'Her anchor stays where it lands. When she reels it in, anything on that space or nearer is struck and dragged. Step back beyond the mark, or brace.' },
};
export const TOUR_ORDER = ['tar_bucket', 'coopers_purse', 'ropewalk', 'mooring_night'];

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
  /** appears on the docks once this cup is won */
  after?: string;
}

export const ARCHETYPES: Archetype[] = [
  { id: 'dock_guard', label: 'Patient dock guard', ai: 'guard', weapon: 'gull_sticker', attrs: A(2, 2, 2, 1), hp: 24, names: ['Hobb Staves', 'Wick Tanner', 'Dunny Oakum', 'Marl Fenwick'], lines: ['Stand where I can reach you.', 'I get paid by the hour. Take your time.', 'No running on the dock.'], tell: 'Holds you at two spaces and shoves when crowded.', looks: { hat: 'knit', shirt: 3 } },
  { id: 'fishmonger', label: 'Impatient fishmonger', ai: 'brawler', weapon: 'chipped_hanger', attrs: A(3, 1, 1, 1), hp: 26, names: ['Gill Barrow', 'Cod Annie', 'Tam Brisling', 'Sprat Maguire'], lines: ['I have eels going off. Hurry up.', 'Stand still and be filleted!', 'Twice! I always get them twice!'], tell: 'Charges in and swings until the breath runs out.', looks: { coat: 'vest', coatColor: 3, shirt: 0 } },
  { id: 'coopers_lad', label: "Cooper's apprentice", ai: 'mauler', weapon: 'caulking_mallet', attrs: A(3, 1, 2, 1), hp: 26, after: 'tar_bucket', names: ['Bung Harris', 'Stave Molly', 'Chime Parry'], lines: ['Master says hit it till it fits.', 'I only know the one swing.', 'Mind the mallet. I do not.'], tell: 'Slow, heavy, and goes straight through a brace.', looks: { coat: 'vest', coatColor: 5, shirt: 0, broad: true } },
  { id: 'gutting_twin', label: 'Twin-blade fishwife', ai: 'twin', weapon: 'fishwifes_pair', attrs: A(1, 3, 2, 2), hp: 24, after: 'tar_bucket', names: ['Herring Peg', 'Kipper Sal', 'Roe Dunmore'], lines: ['Left one is for scales.', 'Stand still, I am counting cuts.', 'Two for a penny!'], tell: 'Every cut that lands brings a second.', looks: { hat: 'bandana', shirt: 1 } },
  { id: 'anchor_watch', label: 'Sleepy anchor watch', ai: 'mooring', weapon: 'kedge_chain', attrs: A(3, 1, 3, 1), hp: 28, after: 'coopers_purse', names: ['Drowsy Malone', 'Yawning Pell', 'Slack Tom Varley'], lines: ['Wake me when it lands.', 'I throw it. It comes back. That is the job.', 'Mind the kedge.'], tell: 'Throws the anchor, then drags it home through you.', looks: { hat: 'straw', shirt: 3, broad: true } },
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
