import { Mesh, type MeshStandardMaterial } from 'three';
import { describe, expect, it } from 'vitest';
import { TableSim } from '@physics/table-sim';
import { PLAYFIELD } from '@/table/playfield';
import { PALETTE } from './palette';
import { buildTableScene } from './scene';

describe('buildTableScene', () => {
    it('builds meshes for the table and syncs the ball position', () => {
        const sim = new TableSim(PLAYFIELD);
        const scene = buildTableScene(sim);
        expect(scene.root.children.length).toBeGreaterThan(PLAYFIELD.walls.length);

        const ball = sim.world.balls[0];
        if (!ball) throw new Error('expected a served ball');
        ball.pos.x += 0.1;
        scene.sync();
        const mesh = scene.root.children.find(
            c =>
                c.position.y === PLAYFIELD.ballRadius &&
                c.position.x === ball.pos.x - PLAYFIELD.bounds.width / 2
        );
        expect(mesh).toBeDefined();
    });

    it('rotates flipper meshes with the physics angle', () => {
        const sim = new TableSim(PLAYFIELD);
        const scene = buildTableScene(sim);
        sim.left.setHeld(true);
        for (let i = 0; i < 200; i++) sim.step(1 / 1000);
        scene.sync();
        const rotated = scene.root.children.filter(c => c.rotation.y === -sim.left.angle);
        expect(rotated.length).toBeGreaterThan(0);
    });

    it('reuses geometry and materials across repeated parts', () => {
        const scene = buildTableScene(new TableSim(PLAYFIELD));
        const meshes = scene.root.children.filter((c): c is Mesh => c instanceof Mesh);
        const geometries = new Set(meshes.map(m => m.geometry));
        const materials = new Set(meshes.map(m => m.material));
        expect(geometries.size).toBeLessThan(meshes.length / 2);
        expect(materials.size).toBeLessThan(meshes.length / 4);
    });
});

describe('retro look', () => {
    it('uses a dark playfield and a mirror-like ball material', () => {
        const sim = new TableSim(PLAYFIELD);
        const scene = buildTableScene(sim);
        scene.sync();
        const meshes = scene.root.children.filter((c): c is Mesh => c instanceof Mesh);
        const mats = meshes.map(m => m.material as MeshStandardMaterial);
        const field = mats.find(m => m.color.getHex() === PALETTE.playfield);
        expect(field).toBeDefined();
        expect(PALETTE.playfield).toBeLessThan(0x202020);
        const ball = mats.find(m => m.metalness === 1 && m.roughness < 0.1);
        expect(ball).toBeDefined();
    });
});

describe('backglass', () => {
    it('stands upright behind the playfield with a placeholder texture', () => {
        const scene = buildTableScene(new TableSim(PLAYFIELD));
        const { backglass } = scene;
        expect(scene.root.children).toContain(backglass);
        expect(backglass.material.map).not.toBeNull();
        expect(backglass.position.z).toBe(-PLAYFIELD.bounds.height / 2);
        const height = backglass.geometry.parameters.height;
        expect(backglass.position.y).toBeCloseTo(height / 2);
        expect(backglass.geometry.parameters.width).toBe(PLAYFIELD.bounds.width);
    });
});

describe('lamps', () => {
    it('drives insert emissive intensity from lamp state', () => {
        const sim = new TableSim(PLAYFIELD);
        const scene = buildTableScene(sim);
        const id = PLAYFIELD.lamps[0]!.id;
        const intensityOf = (): number => {
            const lamp = PLAYFIELD.lamps[0]!;
            const mesh = scene.root.children.find(
                (c): c is Mesh =>
                    c instanceof Mesh &&
                    c.position.x === lamp.pos.x - PLAYFIELD.bounds.width / 2 &&
                    c.position.z === lamp.pos.y - PLAYFIELD.bounds.height / 2 &&
                    c.position.y === 0.001
            );
            return (mesh!.material as MeshStandardMaterial).emissiveIntensity;
        };
        const off = intensityOf();
        scene.lamps.on(id);
        scene.sync();
        expect(intensityOf()).toBeGreaterThan(off);
        scene.lamps.off(id);
        scene.sync();
        expect(intensityOf()).toBe(off);
    });
});

describe('3D dressing', () => {
    it('adds posts, ramp rails and cabinet parts for the table', async () => {
        const { buildDressing } = await import('./dressing');
        const parts = buildDressing(PLAYFIELD);
        expect(parts.filter(p => p.kind === 'post').length).toBeGreaterThan(10);
        const ramps = PLAYFIELD.paths.filter(p => p.kind === 'ramp').length;
        const rails = parts.filter(
            p => p.kind === 'bar' && p.material === 'chrome' && p.elevation > 0
        );
        expect(ramps).toBeGreaterThan(0);
        expect(rails.length).toBeGreaterThanOrEqual(ramps * 2);
        const cabinet = parts.filter(p => p.material === 'cabinet');
        expect(cabinet.length).toBe(3);
        for (const p of parts) {
            if (p.kind === 'post') expect(p.height).toBeGreaterThan(0);
        }
    });

    it('adds the dressing and headboard meshes to the scene', () => {
        const scene = buildTableScene(new TableSim(PLAYFIELD));
        const withDressing = scene.root.children.length;
        expect(withDressing).toBeGreaterThan(PLAYFIELD.walls.length + 30);
    });
});
