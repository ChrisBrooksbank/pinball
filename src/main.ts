import {
    AmbientLight,
    Mesh,
    MeshStandardMaterial,
    PerspectiveCamera,
    PlaneGeometry,
    PointLight,
    Scene,
    SphereGeometry,
    WebGLRenderer,
} from 'three';
import { FixedStepper } from '@core/loop';

const canvas = document.getElementById('game');
if (!(canvas instanceof HTMLCanvasElement)) {
    throw new Error('Canvas #game not found');
}

const renderer = new WebGLRenderer({ canvas, antialias: true });
const scene = new Scene();
const camera = new PerspectiveCamera(45, 1, 0.1, 100);
camera.position.set(0, 14, 9);
camera.lookAt(0, 0, 0);

const table = new Mesh(
    new PlaneGeometry(6, 12),
    new MeshStandardMaterial({ color: 0x1b0f3a, roughness: 0.6 })
);
table.rotation.x = -Math.PI / 2;
scene.add(table);

const ball = new Mesh(
    new SphereGeometry(0.3, 32, 16),
    new MeshStandardMaterial({ color: 0xdddddd, metalness: 1, roughness: 0.15 })
);
ball.position.set(0, 0.3, 0);
scene.add(ball);

scene.add(new AmbientLight(0xffffff, 0.6));
const light = new PointLight(0xff3da5, 120, 40);
light.position.set(0, 8, 2);
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
        // physics step goes here (Phase 1)
    });
    renderer.render(scene, camera);
});
