import { ACESFilmicToneMapping, PerspectiveCamera, Scene, WebGLRenderer } from 'three';
import { FixedStepper } from '@core/loop';
import { createDebugPanel } from '@/debug-panel';
import { TableSim } from '@physics/table-sim';
import { applyCameraFraming } from '@render/camera';
import { createChromeEnvironment } from '@render/environment';
import { createPostProcessing } from '@render/post';
import { chooseRenderQuality } from '@render/quality';
import { buildTableScene } from '@render/scene';
import { PLAYFIELD } from '@/table/playfield';
import { GameDriver } from '@/game-driver';

const canvas = document.getElementById('game');
if (!(canvas instanceof HTMLCanvasElement)) {
    throw new Error('Canvas #game not found');
}

const quality = chooseRenderQuality({
    devicePixelRatio: window.devicePixelRatio,
    coarsePointer: window.matchMedia('(pointer: coarse)').matches,
});
const renderer = new WebGLRenderer({ canvas, antialias: quality.antialias });
renderer.toneMapping = ACESFilmicToneMapping;
const scene = new Scene();
scene.environment = createChromeEnvironment(renderer);
const camera = new PerspectiveCamera(45, 1, 0.05, 20);

const sandbox = new TableSim(PLAYFIELD);
const debugPanel = createDebugPanel(sandbox);

const tableScene = buildTableScene(sandbox);
scene.add(tableScene.root);
const post = createPostProcessing(renderer, scene, camera);
const game = new GameDriver(sandbox, tableScene.lamps);
const status = document.createElement('div');
status.style.cssText =
    'position:fixed;top:8px;left:8px;color:#0f0;font:16px monospace;pointer-events:none';
document.body.appendChild(status);

const KEY_ACTIONS: Record<string, 'left' | 'right' | 'plunger'> = {
    ShiftLeft: 'left',
    ArrowLeft: 'left',
    KeyZ: 'left',
    ShiftRight: 'right',
    ArrowRight: 'right',
    Slash: 'right',
    Space: 'plunger',
    ArrowDown: 'plunger',
};
function onKey(down: boolean, e: KeyboardEvent): void {
    if (down && e.code === 'Enter' && !e.repeat) game.pressStart();
    const action = KEY_ACTIONS[e.code];
    if (!action) return;
    e.preventDefault();
    if (action === 'left') sandbox.left.setHeld(down);
    else if (action === 'right') sandbox.right.setHeld(down);
    else sandbox.plunger.setHeld(down);
}
window.addEventListener('keydown', e => onKey(true, e));
window.addEventListener('keyup', e => onKey(false, e));

function resize(): void {
    const { clientWidth: w, clientHeight: h } = canvas as HTMLCanvasElement;
    const { pixelRatio, bloomScale } = quality;
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(w, h, false);
    post.setSize(w, h, pixelRatio, bloomScale);
    applyCameraFraming(camera, w / h, PLAYFIELD.bounds);
}
window.addEventListener('resize', resize);
resize();

const stepper = new FixedStepper(1 / 1000);
let last = performance.now();
renderer.setAnimationLoop(now => {
    const frame = Math.min((now - last) / 1000, 0.1);
    last = now;
    stepper.advance(frame, () => {
        sandbox.step(1 / 1000);
    });
    game.update(frame);
    status.textContent = `${game.displayText}  ${game.rules.score}`;
    tableScene.lamps.update(frame);
    tableScene.sync();
    debugPanel.update();
    post.render();
});
