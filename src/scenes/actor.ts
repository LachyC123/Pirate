import Phaser from 'phaser';
import { Look } from '../core/data';
import { FH, FW, OX, OY, PoseName, drawFighter, poseFor } from '../art/fighter';

let uid = 0;
/** A fighter on stage: one canvas texture redrawn per pose. Feet stay on (x, y). */
export class Actor {
  img: Phaser.GameObjects.Image;
  private tex: Phaser.Textures.CanvasTexture;
  pose: PoseName = 'idle0';
  /** resting pose family: idle or a held stance (line taut) */
  rest: 'idle' | 'hold' | 'down' | 'cheer' = 'idle';
  private timer: Phaser.Time.TimerEvent;
  private beat = 0;
  constructor(public scene: Phaser.Scene, public look: Look, public weapon: string, public flip: boolean, x: number, y: number, scale = 1) {
    this.tex = scene.textures.createCanvas('actor' + uid++, FW, FH)!;
    this.img = scene.add.image(x, y, this.tex.key).setOrigin((flip ? FW - OX : OX) / FW, OY / FH).setScale(scale);
    this.set('idle0');
    this.timer = scene.time.addEvent({ delay: 520, loop: true, callback: () => { this.beat++; if (this.busy) return; if (this.rest === 'idle') this.set(this.beat % 2 ? 'idle1' : 'idle0'); } });
  }
  busy = false;
  set(p: PoseName): void {
    this.pose = p;
    let pix = drawFighter(this.look, { weapon: this.weapon }, poseFor(p, this.weapon));
    if (this.flip) pix = pix.flipped();
    this.tex.context.putImageData(new ImageData(pix.rgba() as any, FW, FH), 0, 0);
    this.tex.refresh();
  }
  setWeapon(w: string): void { this.weapon = w; this.set(this.pose); }
  setLook(l: Look): void { this.look = l; this.set(this.pose); }
  toRest(): void { this.busy = false; this.set(this.rest === 'idle' ? 'idle0' : this.rest); }
  get x(): number { return this.img.x; }
  set x(v: number) { this.img.x = v; }
  destroy(): void { this.timer.remove(); this.img.destroy(); this.tex.destroy(); }
}
