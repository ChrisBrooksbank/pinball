import { Mesh } from 'three';
import { describe, expect, it } from 'vitest';
import { TableSim } from '@physics/table-sim';
import { PLAYFIELD } from '@/table/playfield';
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
