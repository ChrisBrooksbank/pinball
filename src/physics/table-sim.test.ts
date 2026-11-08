import { describe, expect, it } from 'vitest';
import { PLAYFIELD } from '../table/playfield';
import { TableSim, buildWorld } from './table-sim';

const DT = 0.001;

function run(box: TableSim, seconds: number, each?: () => void): void {
    for (let i = 0; i < seconds / DT; i++) {
        box.step(DT);
        each?.();
    }
}

describe('Table sim on PLAYFIELD', () => {
    it('starts with one ball resting on the plunger', () => {
        const box = new TableSim(PLAYFIELD);
        run(box, 1);
        expect(box.world.balls).toHaveLength(1);
        expect(box.world.balls[0]?.pos.y).toBeGreaterThan(1.8);
    });

    it('plunges the ball up the lane and into the playfield', () => {
        const box = new TableSim(PLAYFIELD);
        box.plunger.setHeld(true);
        run(box, 0.6);
        box.plunger.setHeld(false);
        let minY = Infinity;
        let enteredField = false;
        run(box, 4, () => {
            const ball = box.world.balls[0];
            if (!ball) return;
            minY = Math.min(minY, ball.pos.y);
            if (ball.pos.x < 0.8 && ball.pos.y < 1.2) enteredField = true;
        });
        expect(minY).toBeLessThan(0.7);
        expect(enteredField).toBe(true);
    });

    it('drains an unplayed ball and serves a new one', () => {
        const box = new TableSim(PLAYFIELD);
        const ball = box.world.balls[0];
        if (!ball) throw new Error('no ball');
        ball.pos = { x: 0.44, y: 1.4 };
        run(box, 3);
        const events = box.world.events.drain();
        expect(events.some(e => e.type === 'drain')).toBe(true);
        expect(box.world.balls).toHaveLength(1);
        expect(box.world.balls[0]?.pos.y).toBeGreaterThan(1.8);
    });

    it('lets a raised flipper catch a ball that would otherwise drain', () => {
        const box = new TableSim(PLAYFIELD);
        const ball = box.world.balls[0];
        if (!ball) throw new Error('no ball');
        ball.pos = { x: 0.3, y: 1.6 };
        box.left.setHeld(true);
        run(box, 1);
        expect(box.world.events.drain().some(e => e.type === 'drain')).toBe(false);
    });
});

describe('buildWorld', () => {
    it('creates a collider or element for every physical part of the table', () => {
        const world = buildWorld(PLAYFIELD);
        const { walls, arcs, bumpers, slingshots, targets, spinners, flippers } = PLAYFIELD;
        expect(world.segments).toHaveLength(walls.length + slingshots.length + targets.length);
        expect(world.arcs).toHaveLength(arcs.length);
        expect(world.bumpers).toHaveLength(bumpers.length);
        expect(world.spinners).toHaveLength(spinners.length);
        expect(world.flippers).toHaveLength(flippers.length);
        expect(world.plungers).toHaveLength(1);
    });
});
