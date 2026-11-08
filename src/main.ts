import {
    AmbientLight,
    BoxGeometry,
    BufferGeometry,
    CylinderGeometry,
    Line,
    LineBasicMaterial,
    Mesh,
    MeshStandardMaterial,
    Object3D,
    PerspectiveCamera,
    PlaneGeometry,
    PointLight,
    Scene,
    SphereGeometry,
    Vector3,
    WebGLRenderer,
} from 'three';
import { FixedStepper } from '@core/loop';
import { createDebugPanel } from '@/debug-panel';
import { TableSim } from '@physics/table-sim';
import { PLAYFIELD } from '@/table/playfield';

const canvas = document.getElementById('game');
if (!(canvas instanceof HTMLCanvasElement)) {
    throw new Error('Canvas #game not found');
}

const renderer = new WebGLRenderer({ canvas, antialias: true });
const scene = new Scene();
const camera = new PerspectiveCamera(45, 1, 0.05, 20);
camera.position.set(0, 1.1, 0.95);
camera.lookAt(0, 0, 0.05);

const CENTER_X = PLAYFIELD.bounds.width / 2;
const CENTER_Y = PLAYFIELD.bounds.height / 2;
const sandbox = new TableSim(PLAYFIELD);
const debugPanel = createDebugPanel(sandbox);

const table = new Mesh(
    new PlaneGeometry(PLAYFIELD.bounds.width, PLAYFIELD.bounds.height),
    new MeshStandardMaterial({ color: 0x1b0f3a, roughness: 0.6 })
);
table.rotation.x = -Math.PI / 2;
scene.add(table);

/** Place an object at table coordinates (x right, y toward the player) on the world XZ plane. */
function place(obj: Object3D, x: number, y: number, height: number): void {
    obj.position.set(x - CENTER_X, height, y - CENTER_Y);
}

const wallMaterial = new MeshStandardMaterial({ color: 0x35f0ff, emissive: 0x0a5560 });
for (const seg of sandbox.world.segments) {
    const len = Math.hypot(seg.b.x - seg.a.x, seg.b.y - seg.a.y);
    const wall = new Mesh(new BoxGeometry(len, 0.03, 0.006), wallMaterial);
    place(wall, (seg.a.x + seg.b.x) / 2, (seg.a.y + seg.b.y) / 2, 0.015);
    wall.rotation.y = -Math.atan2(seg.b.y - seg.a.y, seg.b.x - seg.a.x);
    scene.add(wall);
}
for (const arc of sandbox.world.arcs) {
    const points: Vector3[] = [];
    for (let i = 0; i <= 48; i++) {
        const a = arc.startAngle + (arc.sweepAngle * i) / 48;
        points.push(
            new Vector3(
                arc.center.x - CENTER_X + Math.cos(a) * arc.radius,
                0.015,
                arc.center.y - CENTER_Y + Math.sin(a) * arc.radius
            )
        );
    }
    scene.add(
        new Line(
            new BufferGeometry().setFromPoints(points),
            new LineBasicMaterial({ color: 0x35f0ff })
        )
    );
}
for (const bumper of sandbox.world.bumpers) {
    const mesh = new Mesh(
        new CylinderGeometry(bumper.radius, bumper.radius, 0.04, 24),
        new MeshStandardMaterial({ color: 0xff3da5, emissive: 0x80154a })
    );
    place(mesh, bumper.center.x, bumper.center.y, 0.02);
    scene.add(mesh);
}

const flipperMaterial = new MeshStandardMaterial({ color: 0xffd23d, emissive: 0x5a4600 });
const flipperMeshes = sandbox.world.flippers.map(flipper => {
    const mesh = new Mesh(new BoxGeometry(flipper.config.length, 0.03, 0.024), flipperMaterial);
    scene.add(mesh);
    return mesh;
});
const plungerMesh = new Mesh(
    new BoxGeometry(0.06, 0.03, 0.02),
    new MeshStandardMaterial({ color: 0xcccccc })
);
scene.add(plungerMesh);

const ball = new Mesh(
    new SphereGeometry(0.027, 32, 16),
    new MeshStandardMaterial({ color: 0xdddddd, metalness: 1, roughness: 0.15 })
);
scene.add(ball);

function syncScene(): void {
    sandbox.world.flippers.forEach((flipper, i) => {
        const mesh = flipperMeshes[i];
        if (!mesh) return;
        const { pivot, length } = flipper.config;
        place(
            mesh,
            pivot.x + (Math.cos(flipper.angle) * length) / 2,
            pivot.y + (Math.sin(flipper.angle) * length) / 2,
            0.015
        );
        mesh.rotation.y = -flipper.angle;
    });
    place(plungerMesh, sandbox.plunger.config.x, sandbox.plunger.tipY + 0.01, 0.015);
    const first = sandbox.world.balls[0];
    ball.visible = first !== undefined;
    if (first) place(ball, first.pos.x, first.pos.y, 0.027);
}

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
    const action = KEY_ACTIONS[e.code];
    if (!action) return;
    e.preventDefault();
    if (action === 'left') sandbox.left.setHeld(down);
    else if (action === 'right') sandbox.right.setHeld(down);
    else sandbox.plunger.setHeld(down);
}
window.addEventListener('keydown', e => onKey(true, e));
window.addEventListener('keyup', e => onKey(false, e));

scene.add(new AmbientLight(0xffffff, 0.6));
const light = new PointLight(0xff3da5, 3, 4);
light.position.set(0, 1, 0.2);
scene.add(light);

function resize(): void {
    const { clientWidth: w, clientHeight: h } = canvas as HTMLCanvasElement;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
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
    sandbox.world.events.drain();
    syncScene();
    debugPanel.update();
    renderer.render(scene, camera);
});
