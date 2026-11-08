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
});
