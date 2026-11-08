import { ACESFilmicToneMapping, PerspectiveCamera, Scene, WebGLRenderer } from 'three';
import { FixedStepper } from '@core/loop';
import { createDebugPanel } from '@/debug-panel';
import { TableSim } from '@physics/table-sim';
import { applyCameraFraming } from '@render/camera';
import { DmdDisplay } from '@render/dmd';
import { createChromeEnvironment } from '@render/environment';
import { createPostProcessing } from '@render/post';
import { chooseRenderQuality } from '@render/quality';
import { buildTableScene } from '@render/scene';
import { PLAYFIELD } from '@/table/playfield';
import { GameDriver } from '@/game-driver';
import { ActionState } from '@/input/actions';
import { handleKey } from '@/input/keyboard';
import { attachTouch } from '@/input/touch';

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
const dmd = new DmdDisplay();
tableScene.backglass.material.map = dmd.texture;
tableScene.backglass.material.needsUpdate = true;
const post = createPostProcessing(renderer, scene, camera);
const game = new GameDriver(sandbox, tableScene.lamps);
const status = document.createElement('div');
status.style.cssText =
    'position:fixed;top:8px;left:8px;color:#0f0;font:16px monospace;pointer-events:none';
document.body.appendChild(status);

const actions = new ActionState((action, down) => {
    if (action === 'flipperLeft') sandbox.left.setHeld(down);
    else if (action === 'flipperRight') sandbox.right.setHeld(down);
    else if (action === 'plunger') sandbox.plunger.setHeld(down);
    else if (down) game.pressStart();
});
function onKey(down: boolean, e: KeyboardEvent): void {
    if (handleKey(actions, down, e)) e.preventDefault();
}
window.addEventListener('keydown', e => onKey(true, e));
window.addEventListener('keyup', e => onKey(false, e));
attachTouch(canvas, actions);

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
    dmd.update(
        {
            score: game.rules.score,
            ball: game.rules.phase === 'attract' ? 0 : game.rules.ballNumber,
            text: game.displayText,
        },
        frame
    );
    tableScene.lamps.update(frame);
    tableScene.sync();
    debugPanel.update();
    post.render();
});
