import Phaser from 'phaser';
import './style.css';
import { L, S, applyLayout, applySettings, game, go, setGame } from './app';
import { Create } from './scenes/create';
import { Harbour } from './scenes/harbour';
import { Shop } from './scenes/shop';
import { Gate } from './scenes/gate';
import { BattleScene } from './scenes/battle';
import { unlock } from './sfx';

applyLayout();
const g = new Phaser.Game({
  type: Phaser.CANVAS, parent: 'stage', width: L.W, height: L.H, pixelArt: true, antialias: false, roundPixels: true,
  backgroundColor: '#141a2e', scale: { mode: Phaser.Scale.NONE, autoRound: true }, audio: { noAudio: true }, banner: false,
  scene: [Create, Harbour, Shop, Gate, BattleScene],
  callbacks: { postBoot: () => { applyLayout(); applySettings(); go(); } },
});
setGame(g);
(window as any).__dmp = { get S() { return S; }, get L() { return L; } };

let rt = 0;
const onResize = () => { clearTimeout(rt); rt = window.setTimeout(() => { if (applyLayout() && game.isBooted) go(); }, 120); };
window.addEventListener('resize', onResize);
window.addEventListener('orientationchange', onResize);
window.visualViewport?.addEventListener('resize', onResize);
window.addEventListener('pointerdown', unlock, { passive: true });
document.addEventListener('gesturestart', (e) => e.preventDefault());
document.addEventListener('touchmove', (e) => { if (!(e.target as HTMLElement).closest('.scroll, .sheet, .drawer, .createform, .gatepanel, .resultpanel')) e.preventDefault(); }, { passive: false });
