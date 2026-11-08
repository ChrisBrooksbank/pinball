import {
    AmbientLight,
    BoxGeometry,
    BufferGeometry,
    CircleGeometry,
    CylinderGeometry,
    Group,
    Mesh,
    MeshStandardMaterial,
    Object3D,
    PlaneGeometry,
    PointLight,
    SphereGeometry,
} from 'three';
import { LampBank } from '@core/lamps';
import type { TableSim } from '@physics/table-sim';
import type { Vec2 } from '@physics/vec2';
import { PALETTE } from './palette';

const LAMP_ON = 2.2;
const LAMP_OFF = 0.08;
const ARC_SEGMENT_ANGLE = Math.PI / 24;

interface TableScene {
    /** Root group containing every table mesh and the lights. */
    readonly root: Group;
    /** Insert lights by table lamp id; call `lamps.update(dt)` each frame, then `sync()`. */
    readonly lamps: LampBank;
    /** Copy dynamic physics state (flippers, plunger, balls) onto the meshes. */
    sync(): void;
}

/** Build a three.js scene graph from a simulated table and return a function to sync it to physics state. */
export function buildTableScene(sim: TableSim): TableScene {
    const { table, world } = sim;
    const root = new Group();
    const cx = table.bounds.width / 2;
    const cy = table.bounds.height / 2;

    /** Place an object at table coordinates (x right, y toward the player) on the world XZ plane. */
    const place = (obj: Object3D, x: number, y: number, height: number): void => {
        obj.position.set(x - cx, height, y - cy);
    };

    /** Share geometries and materials between parts with identical parameters. */
    const geometries = new Map<string, BufferGeometry>();
    const cachedGeometry = <G extends BufferGeometry>(key: string, create: () => G): G => {
        let geometry = geometries.get(key);
        if (!geometry) {
            geometry = create();
            geometries.set(key, geometry);
        }
        return geometry as G;
    };
    const chrome = new MeshStandardMaterial({
        color: PALETTE.chrome,
        metalness: 1,
        roughness: 0.2,
    });
    // Mirror-like ball picks up the scene environment map (set by the renderer host).
    const ballMaterial = new MeshStandardMaterial({
        color: 0xffffff,
        metalness: 1,
        roughness: 0.05,
        envMapIntensity: 1.5,
    });
    const neon = new MeshStandardMaterial({
        color: PALETTE.cyan,
        emissive: PALETTE.cyanGlow,
        emissiveIntensity: 1.6,
    });
    const accent = new MeshStandardMaterial({
        color: PALETTE.magenta,
        emissive: PALETTE.magentaGlow,
        emissiveIntensity: 1.6,
    });
    const gold = new MeshStandardMaterial({
        color: PALETTE.gold,
        emissive: PALETTE.goldGlow,
        emissiveIntensity: 1.4,
    });

    const playfield = new Mesh(
        new PlaneGeometry(table.bounds.width, table.bounds.height),
        new MeshStandardMaterial({ color: PALETTE.playfield, roughness: 0.5 })
    );
    playfield.rotation.x = -Math.PI / 2;
    root.add(playfield);

    const bar = (
        a: Vec2,
        b: Vec2,
        material: MeshStandardMaterial,
        height: number,
        thickness: number
    ): void => {
        const len = Math.hypot(b.x - a.x, b.y - a.y);
        const mesh = new Mesh(
            cachedGeometry(
                `box:${len.toFixed(5)}:${height}:${thickness}`,
                () => new BoxGeometry(len, height, thickness)
            ),
            material
        );
        place(mesh, (a.x + b.x) / 2, (a.y + b.y) / 2, height / 2);
        mesh.rotation.y = -Math.atan2(b.y - a.y, b.x - a.x);
        root.add(mesh);
    };

    for (const wall of table.walls) bar(wall.a, wall.b, chrome, 0.03, 0.006);
    for (const arc of table.arcs) {
        const steps = Math.max(1, Math.ceil(Math.abs(arc.sweepAngle) / ARC_SEGMENT_ANGLE));
        const point = (i: number): Vec2 => {
            const angle = arc.startAngle + (arc.sweepAngle * i) / steps;
            return {
                x: arc.center.x + Math.cos(angle) * arc.radius,
                y: arc.center.y + Math.sin(angle) * arc.radius,
            };
        };
        for (let i = 0; i < steps; i++) bar(point(i), point(i + 1), chrome, 0.03, 0.006);
    }
    for (const s of table.slingshots) bar(s.a, s.b, accent, 0.03, 0.01);
    for (const t of table.targets) bar(t.a, t.b, gold, 0.03, 0.012);
    for (const s of table.spinners) bar(s.a, s.b, neon, 0.02, 0.004);

    for (const b of table.bumpers) {
        const mesh = new Mesh(
            cachedGeometry(
                `cyl:${b.radius}`,
                () => new CylinderGeometry(b.radius, b.radius, 0.04, 24)
            ),
            accent
        );
        place(mesh, b.center.x, b.center.y, 0.02);
        root.add(mesh);
    }

    const insertGeometry = new CircleGeometry(0.01, 16);
    const lamps = new LampBank(table.lamps.map(l => l.id));
    // Two shared materials (lit/unlit) per colour; inserts swap between them.
    const lampMaterialCache = new Map<
        string,
        { lit: MeshStandardMaterial; unlit: MeshStandardMaterial }
    >();
    const lampMaterialsFor = (
        color: string
    ): { lit: MeshStandardMaterial; unlit: MeshStandardMaterial } => {
        let pair = lampMaterialCache.get(color);
        if (!pair) {
            const make = (emissiveIntensity: number): MeshStandardMaterial =>
                new MeshStandardMaterial({ color, emissive: color, emissiveIntensity });
            pair = { lit: make(LAMP_ON), unlit: make(LAMP_OFF) };
            lampMaterialCache.set(color, pair);
        }
        return pair;
    };
    const lampMeshes = new Map<string, Mesh>();
    for (const lamp of table.lamps) {
        const material = lampMaterialsFor(lamp.color).unlit;
        const mesh = new Mesh(insertGeometry, material);
        mesh.rotation.x = -Math.PI / 2;
        place(mesh, lamp.pos.x, lamp.pos.y, 0.001);
        lampMeshes.set(lamp.id, mesh);
        root.add(mesh);
    }

    const flipperMeshes = world.flippers.map(flipper => {
        const mesh = new Mesh(
            cachedGeometry(
                `flipper:${flipper.config.length}`,
                () => new BoxGeometry(flipper.config.length, 0.03, 0.024)
            ),
            gold
        );
        root.add(mesh);
        return mesh;
    });
    const plungerMesh = new Mesh(new BoxGeometry(0.06, 0.03, 0.02), chrome);
    root.add(plungerMesh);

    const ballGeometry = new SphereGeometry(table.ballRadius, 32, 16);
    const ballMeshes: Mesh[] = [];

    root.add(new AmbientLight(0xffffff, 0.35));
    const light = new PointLight(0xff3da5, 3, 4);
    light.position.set(0, 1, 0.2);
    root.add(light);

    const sync = (): void => {
        for (const lamp of table.lamps) {
            const pair = lampMaterialsFor(lamp.color);
            const mesh = lampMeshes.get(lamp.id);
            if (mesh) mesh.material = lamps.lit(lamp.id) ? pair.lit : pair.unlit;
        }
        world.flippers.forEach((flipper, i) => {
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
        place(plungerMesh, sim.plunger.config.x, sim.plunger.tipY + 0.01, 0.015);

        while (ballMeshes.length < world.balls.length) {
            const mesh = new Mesh(ballGeometry, ballMaterial);
            ballMeshes.push(mesh);
            root.add(mesh);
        }
        ballMeshes.forEach((mesh, i) => {
            const ball = world.balls[i];
            mesh.visible = ball !== undefined;
            if (ball) place(mesh, ball.pos.x, ball.pos.y, table.ballRadius);
        });
    };
    sync();

    return { root, lamps, sync };
}
