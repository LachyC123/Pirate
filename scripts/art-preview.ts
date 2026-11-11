import { Pix } from '../src/art/pix';
import { drawFighter, poseFor, FW, FH, PoseName } from '../src/art/fighter';
import { NPCS } from '../src/core/data';
import { savePng } from './png';
import { mkdirSync } from 'node:fs';
mkdirSync('shots/tmp', { recursive: true });
const me = { skin: 1, hair: 1, hairColor: 1, beard: 1, shirt: 0, trousers: 0 };
const rows: [any, string, string | null, PoseName[]][] = [
  [me, 'fishwifes_pair', null, ['idle0', 'windup', 'strike', 'cuffBack', 'cuffOut', 'crossed', 'brace', 'hit']],
  [NPCS.cooper_gantry.look, 'coopers_persuader', null, ['idle0', 'windup', 'strike', 'heavyUp', 'heavyDown', 'planted', 'brace', 'down']],
  [NPCS.mother_mooring.look, 'moorings_bower', null, ['idle0', 'castBack', 'castOut', 'haul', 'windup', 'strike', 'hit', 'cheer']],
  [{ ...me, hat: 'tricorn', coat: 'long', coatColor: 5 }, 'chipped_hanger', 'buckler', ['idle0', 'cuffBack', 'cuffOut', 'brace', 'walk0', 'dazzle', 'breath0', 'show']],
  [NPCS.tansy.look, 'tansys_hitches', null, ['idle0', 'crossed', 'strike']],
];
const sheet = new Pix(FW * 8, FH * rows.length);
rows.forEach(([look, w, off, poses], r) => poses.forEach((pn, i) => sheet.blit(drawFighter(look, { weapon: w, off }, poseFor(pn, w)), i * FW, r * FH)));
const extra: [any, string, string | null][] = [[me, 'capstan_bar', 'pin'], [me, 'kedge_chain', 'lantern'], [me, 'port_starboard', null], [me, 'dockmasters_due', null], [me, 'caulking_mallet', 'buckler']];
extra.forEach(([l, w, o], i) => sheet.blit(drawFighter(l, { weapon: w, off: o }, poseFor('idle0', w)), (3 + i) * FW, 4 * FH));
savePng(sheet, 'shots/tmp/fighters.png', 2);
