import { Pix } from '../src/art/pix';
import { drawFighter, poseFor, FW, FH, PoseName } from '../src/art/fighter';
import { NPCS } from '../src/core/data';
import { savePng } from './png';
const out = process.argv[2] ?? 'shots/tmp';
import { mkdirSync } from 'node:fs';
mkdirSync(out, { recursive: true });
const me = { skin: 1, hair: 1, hairColor: 1, beard: 1, shirt: 0, trousers: 0 };
const rows: [any, string, PoseName[]][] = [
  [me, 'chipped_hanger', ['idle0', 'walk0', 'windup', 'strike', 'heavyUp', 'heavyDown', 'brace', 'hit']],
  [me, 'gull_sticker', ['idle0', 'thrustBack', 'thrustOut', 'shove', 'brace', 'breath0', 'down', 'cheer']],
  [{ ...me, hat: 'helmet' }, 'powder_promise', ['idle0', 'aim', 'fire', 'reload', 'cuffBack', 'cuffOut', 'dodge', 'show']],
  [NPCS.old_moll.look, 'towline', ['idle0', 'castBack', 'castOut', 'hold', 'haul', 'strike', 'hit', 'down']],
  [NPCS.nib_pike.look, 'gull_sticker', ['idle0', 'idle1']], 
];
const sheet = new Pix(FW * 8, FH * rows.length);
rows.forEach(([look, w, poses], r) => poses.forEach((pn, i) => sheet.blit(drawFighter(look, { weapon: w }, poseFor(pn, w)), i * FW, r * FH)));
[NPCS.pistol_pip, NPCS.barrel_bess].forEach((n, i) => sheet.blit(drawFighter(n.look, { weapon: n.weapon }, poseFor('idle0', n.weapon)).flipped(), (2 + i) * FW, 4 * FH));
sheet.blit(drawFighter({ ...me, hair: 2, beard: 2, hat: 'straw', eyepatch: true }, { weapon: 'long_tom' }, poseFor('idle0', 'long_tom')), 4 * FW, 4 * FH);
sheet.blit(drawFighter({ ...me, hair: 3, skin: 4, hairColor: 3 }, { weapon: 'last_word' }, poseFor('idle0', 'last_word')), 5 * FW, 4 * FH);
sheet.blit(drawFighter({ ...me, hair: 4, skin: 0, hairColor: 2 }, { weapon: 'widows_knife' }, poseFor('idle0', 'widows_knife')), 6 * FW, 4 * FH);
savePng(sheet, `${out}/fighters.png`, 2);
