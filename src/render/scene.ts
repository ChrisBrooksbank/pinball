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
    DataTexture,
    MeshBasicMaterial,
    NearestFilter,
    PlaneGeometry,
    PointLight,
    RGBAFormat,
    SRGBColorSpace,
    SphereGeometry,
    type Texture,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { LampBank } from '@core/lamps';
import type { TableSim } from '@physics/table-sim';
import type { Vec2 } from '@physics/vec2';
import { createPlayfieldTexture } from './artwork';
import { buildDressing } from './dressing';
import { PALETTE } from './palette';

const LAMP_ON = 2.2;
const LAMP_OFF = 0.08;
const ARC_SEGMENT_ANGLE = Math.PI / 24;

const BACKGLASS_HEIGHT_RATIO = 0.6;
const BACKGLASS_TEXTURE_SIZE = { width: 64, height: 32 } as const;

/** Headless-safe placeholder art: neon stripes over a dark panel, swapped for the DMD texture later. */
function createBackglassTexture(): Texture {
    const { width, height } = BACKGLASS_TEXTURE_SIZE;
    const data = new Uint8Array(width * height * 4);
    const hex = (c: number): [number, number, number] => [(c >> 16) & 255, (c >> 8) & 255, c & 255];
    const dark = hex(PALETTE.playfield);
    const stripes = [hex(PALETTE.magenta), hex(PALETTE.cyan), hex(PALETTE.gold)];
    for (let y = 0; y < height; y++) {
        const stripe = y % 8 === 0 ? stripes[Math.floor(y / 8) % stripes.length] : undefined;
        const [r, g, b] = stripe ?? dark;
        for (let x = 0; x < width; x++) {
            data.set([r, g, b, 255], (y * width + x) * 4);
        }
    }
    const texture = new DataTexture(data, width, height, RGBAFormat);
    texture.colorSpace = SRGBColorSpace;
    texture.magFilter = NearestFilter;
    texture.needsUpdate = true;
    return texture;
}

interface TableScene {
    /** Root group containing every table mesh and the lights. */
    readonly root: Group;
    /** Upright panel behind the playfield; assign `material.map` to show the DMD. */
    readonly backglass: Mesh<PlaneGeometry, MeshBasicMaterial>;
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
        metalness: 0.85,
        roughness: 0.25,
        envMapIntensity: 3,
    });
    // Mirror-like ball picks up the scene environment map (set by the renderer host).
    const ballMaterial = new MeshStandardMaterial({
        color: 0xffffff,
        metalness: 1,
        roughness: 0.05,
        envMapIntensity: 4,
        emissive: 0x303a50,
        emissiveIntensity: 0.6,
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
    const cabinet = new MeshStandardMaterial({ color: 0x1a0f33, roughness: 0.7 });
    // Translucent smoked plastic so the ramp deck never hides the artwork or the ball beneath it.
    const deck = new MeshStandardMaterial({
        color: 0x2a1450,
        roughness: 0.3,
        transparent: true,
        opacity: 0.45,
    });
    const dropTarget = new MeshStandardMaterial({
        color: 0x39ff14,
        emissive: 0x1a8a08,
        emissiveIntensity: 1.2,
    });
    const dressingMaterials = { chrome, accent, neon, gold, cabinet, deck };

    // Artwork carries its own colours; fall back to the flat dark colour where no canvas exists.
    const artwork = createPlayfieldTexture(table);
    const playfield = new Mesh(
        new PlaneGeometry(table.bounds.width, table.bounds.height),
        new MeshStandardMaterial({
            color: artwork ? 0xffffff : PALETTE.playfield,
            roughness: 0.9,
            envMapIntensity: 0.15,
            map: artwork ?? null,
        })
    );
    playfield.rotation.x = -Math.PI / 2;
    root.add(playfield);

    const backglassHeight = table.bounds.width * BACKGLASS_HEIGHT_RATIO;
    const backglass = new Mesh(
        new PlaneGeometry(table.bounds.width, backglassHeight),
        new MeshBasicMaterial({ map: createBackglassTexture() })
    );
    // Standing upright at the far (y = 0) edge of the table, facing the player.
    backglass.position.set(0, backglassHeight / 2, -cy);
    root.add(backglass);

    // Headboard dressing: neon marquee above the display and cabinet pillars either side.
    const marquee = new Mesh(
        cachedGeometry('marquee', () => new BoxGeometry(table.bounds.width, 0.03, 0.03)),
        accent
    );
    marquee.position.set(0, backglassHeight + 0.015, -cy);
    root.add(marquee);
    for (const sign of [-1, 1]) {
        const pillar = new Mesh(
            cachedGeometry('pillar', () => new BoxGeometry(0.04, backglassHeight, 0.04)),
            cabinet
        );
        pillar.position.set((sign * (table.bounds.width + 0.04)) / 2, backglassHeight / 2, -cy);
        root.add(pillar);
    }

    /** Static parts are baked into one merged mesh per material to keep draw calls low. */
    const batches = new Map<MeshStandardMaterial, BufferGeometry[]>();
    const scratch = new Object3D();
    const addStatic = (
        material: MeshStandardMaterial,
        geometry: BufferGeometry,
        x: number,
        y: number,
        height: number,
        rotationY = 0
    ): void => {
        place(scratch, x, y, height);
        scratch.rotation.set(0, rotationY, 0);
        scratch.updateMatrix();
        const baked = geometry.clone().applyMatrix4(scratch.matrix);
        const list = batches.get(material);
        if (list) list.push(baked);
        else batches.set(material, [baked]);
    };

    const bar = (
        a: Vec2,
        b: Vec2,
        material: MeshStandardMaterial,
        height: number,
        thickness: number,
        elevation = 0
    ): void => {
        const len = Math.hypot(b.x - a.x, b.y - a.y);
        const geometry = cachedGeometry(
            `box:${len.toFixed(5)}:${height}:${thickness}`,
            () => new BoxGeometry(len, height, thickness)
        );
        addStatic(
            material,
            geometry,
            (a.x + b.x) / 2,
            (a.y + b.y) / 2,
            elevation + height / 2,
            -Math.atan2(b.y - a.y, b.x - a.x)
        );
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
    for (const bank of table.dropBanks ?? [])
        for (const t of bank.targets) bar(t.a, t.b, dropTarget, 0.035, 0.014);
    // Orbit routes: a faint smoked-glass track shows where a scripted orbit runs, without clutter.
    for (const path of table.paths) {
        if (path.kind !== 'orbit' || path.id === 'launch') continue;
        for (let i = 0; i + 1 < path.points.length; i++) {
            bar(path.points[i]!, path.points[i + 1]!, deck, 0.003, 0.05, 0.02);
        }
    }
    for (const saucer of table.saucers ?? []) {
        const ring = cachedGeometry(
            `saucer:${saucer.radius}`,
            () =>
                new CylinderGeometry(saucer.radius * 1.25, saucer.radius * 1.25, 0.012, 24, 1, true)
        );
        addStatic(gold, ring, saucer.center.x, saucer.center.y, 0.006);
    }

    for (const b of table.bumpers) {
        const geometry = cachedGeometry(
            `cyl:${b.radius}`,
            () => new CylinderGeometry(b.radius, b.radius, 0.04, 24)
        );
        addStatic(accent, geometry, b.center.x, b.center.y, 0.02);
        const cap = cachedGeometry(
            `cap:${b.radius}`,
            () => new CylinderGeometry(b.radius * 0.7, b.radius * 0.8, 0.012, 24)
        );
        addStatic(chrome, cap, b.center.x, b.center.y, 0.046);
    }

    for (const part of buildDressing(table)) {
        const material = dressingMaterials[part.material];
        if (part.kind === 'bar') {
            bar(
                { x: part.ax, y: part.ay },
                { x: part.bx, y: part.by },
                material,
                part.height,
                part.thickness,
                part.elevation
            );
        } else {
            const geometry = cachedGeometry(
                `post:${part.radius}:${part.height}`,
                () => new CylinderGeometry(part.radius, part.radius, part.height, 12)
            );
            addStatic(material, geometry, part.x, part.y, part.height / 2);
        }
    }

    for (const [material, list] of batches) {
        const merged = mergeGeometries(list);
        for (const g of list) g.dispose();
        if (merged) root.add(new Mesh(merged, material));
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

    root.add(new AmbientLight(0xffffff, 0.5));
    const light = new PointLight(0xffb0e0, 1.2, 4);
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

    return { root, backglass, lamps, sync };
}
