import './hud.css';
import { ACESFilmicToneMapping, PerspectiveCamera, Scene, WebGLRenderer } from 'three';
import { HighScores } from '@core/highscores';
import { AttractMode } from '@core/attract';
import { InitialsEntry } from '@core/initials';
import { Music } from '@/audio/music';
import { Sfx } from '@/audio/sfx';
import { FixedStepper } from '@core/loop';
import { PauseClock } from '@core/pause';
import { createHud } from '@/hud';
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
import { attachAccelerometer } from '@/input/accelerometer';
import { ActionState } from '@/input/actions';
import { GamepadInput, type PadLike } from '@/input/gamepad';
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
const hud = createHud(() => sfx.toggleMute());

const highScores = new HighScores(typeof localStorage === 'undefined' ? null : localStorage);
const attract = new AttractMode();
let attractFlippers = false;
let wasAttract = true;
let wasGameOver = false;
let entry: InitialsEntry | null = null;
let entryScore = 0;
function renderEntry(): void {
    hud.showEntry(entry ? { score: entryScore, initials: entry.display } : null);
}
/** Route an action to the initials entry while it is open; returns true when consumed. */
function entryAction(action: string, down: boolean): boolean {
    if (!entry) return false;
    if (!down) return true;
    if (action === 'flipperLeft') entry.cycle(-1);
    else if (action === 'flipperRight') entry.cycle(1);
    else if (action === 'start' || action === 'plunger') {
        if (entry.confirm()) {
            highScores.add(entry.value, entryScore);
            entry = null;
        }
    }
    renderEntry();
    return true;
}

const sfx = new Sfx(() => new AudioContext());
const music = new Music(() => sfx.output);
const unlockAudio = (): void => sfx.unlock();
window.addEventListener('pointerdown', unlockAudio);
window.addEventListener('keydown', unlockAudio);

const actions = new ActionState((action, down) => {
    canvas.dataset[action] = down ? 'down' : 'up'; // observable by e2e tests
    if (entryAction(action, down)) return;
    if (down && (action === 'flipperLeft' || action === 'flipperRight')) sfx.play('flipper');
    if (action === 'flipperLeft') for (const f of sandbox.flippersFor('left')) f.setHeld(down);
    else if (action === 'flipperRight')
        for (const f of sandbox.flippersFor('right')) f.setHeld(down);
    else if (action === 'plunger') {
        sandbox.plunger.setHeld(down);
        if (!down) gamepad.rumble(pads(), 0.4, 60);
    } else if (down) game.pressStart();
});
const gamepad = new GamepadInput(actions);
function pads(): readonly (PadLike | null)[] {
    return typeof navigator.getGamepads === 'function' ? Array.from(navigator.getGamepads()) : [];
}
function onKey(down: boolean, e: KeyboardEvent): void {
    if (down && !e.repeat && e.code === 'KeyM') sfx.toggleMute();
    if (handleKey(actions, down, e)) e.preventDefault();
}
window.addEventListener('keydown', e => onKey(true, e));
window.addEventListener('keyup', e => onKey(false, e));
attachTouch(canvas, actions);
attachAccelerometer(canvas, direction => sandbox.world.nudge(direction));

let focusZ = 0;
function frameCamera(smoothing: number): void {
    const { clientWidth: w, clientHeight: h } = canvas as HTMLCanvasElement;
    const ball = sandbox.world.balls[0];
    if (ball) focusZ += (ball.pos.y - PLAYFIELD.bounds.height / 2 - focusZ) * smoothing;
    applyCameraFraming(camera, w / h, PLAYFIELD.bounds, focusZ);
}

function resize(): void {
    const { clientWidth: w, clientHeight: h } = canvas as HTMLCanvasElement;
    const { pixelRatio, bloomScale } = quality;
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(w, h, false);
    post.setSize(w, h, pixelRatio, bloomScale);
    frameCamera(1);
}
window.addEventListener('resize', resize);
resize();

const stepper = new FixedStepper(1 / 1000);
const clock = new PauseClock(performance.now());
document.addEventListener('visibilitychange', () => {
    clock.setHidden(document.hidden, performance.now());
    canvas.dataset.paused = String(clock.paused);
    if (clock.paused) music.stop();
});
renderer.setAnimationLoop(now => {
    if (clock.paused) return;
    const frame = clock.tick(now);
    gamepad.poll(pads());
    stepper.advance(frame, () => {
        sandbox.step(1 / 1000);
    });
    game.update(frame);
    for (const name of game.takeSounds()) sfx.play(name);
    if (game.rules.phase === 'attract') music.stop();
    else music.start();
    music.update();
    const isGameOver = game.rules.phase === 'gameOver';
    if (isGameOver && !wasGameOver && highScores.qualifies(game.rules.score)) {
        entry = new InitialsEntry();
        entryScore = game.rules.score;
        renderEntry();
    }
    wasGameOver = isGameOver;
    const inAttract = game.rules.phase === 'attract' && !entry;
    if (inAttract && !wasAttract) attract.reset();
    wasAttract = inAttract;
    let shownText = game.displayText;
    if (inAttract) {
        attract.update(frame);
        shownText = attract.text(highScores.list());
        const up = attract.flippersUp();
        if (up !== attractFlippers) {
            attractFlippers = up;
            for (const f of [...sandbox.flippersFor('left'), ...sandbox.flippersFor('right')])
                f.setHeld(up);
        }
    } else if (attractFlippers) {
        attractFlippers = false;
        for (const f of [...sandbox.flippersFor('left'), ...sandbox.flippersFor('right')])
            f.setHeld(false);
    }
    hud.update({
        phase: game.rules.phase,
        score: game.rules.score,
        ball: game.rules.ballNumber,
        message: shownText,
        muted: sfx.isMuted,
    });
    dmd.update(
        {
            score: game.rules.score,
            ball: game.rules.phase === 'attract' ? 0 : game.rules.ballNumber,
            text: shownText,
        },
        frame
    );
    tableScene.lamps.update(frame);
    tableScene.sync();
    frameCamera(Math.min(1, frame * 4));
    debugPanel.update();
    post.render();
});
