import { describe, it, expect } from 'vitest';
import { World } from './world';
import { vec2 } from './vec2';

function run(world: World, steps = 300): void {
    for (let i = 0; i < steps; i++) world.step(0.001);
}

describe('table elements', () => {
    it('pop bumper kicks the ball away at least at kick speed and emits bumperHit', () => {
        const world = new World({ tiltDegrees: 0 });
        world.addBumper('b1', vec2(0, 0), 0.04, 3);
        const ball = world.addBall(vec2(-0.2, 0), vec2(1, 0));
        run(world);
        expect(ball.vel.x).toBeLessThanOrEqual(-3 + 1e-9);
        const events = world.events.drain();
        expect(events).toHaveLength(1);
        expect(events[0]).toMatchObject({ type: 'bumperHit', id: 'b1', ballId: 0 });
    });

    it('bumper kicks radially even for a glancing hit', () => {
        const world = new World({ tiltDegrees: 0 });
        world.addBumper('b1', vec2(0, 0), 0.04, 3);
        const ball = world.addBall(vec2(-0.2, -0.03), vec2(1, 0));
        run(world);
        expect(ball.vel.y).toBeLessThan(0); // pushed up, away from the bumper centre
    });

    it('slingshot kicks along its normal and emits slingshot', () => {
        const world = new World({ tiltDegrees: 0 });
        world.addSlingshot('sl', vec2(1, -1), vec2(1, 1), 4);
        const ball = world.addBall(vec2(0.9, 0), vec2(0.5, 0));
        run(world);
        expect(ball.vel.x).toBeLessThanOrEqual(-4 + 1e-9);
        expect(world.events.drain()).toMatchObject([{ type: 'slingshot', id: 'sl' }]);
    });

    it('standup target emits targetHit once and bounces the ball', () => {
        const world = new World({ tiltDegrees: 0 });
        world.addTarget('t1', vec2(1, -1), vec2(1, 1));
        const ball = world.addBall(vec2(0.9, 0), vec2(2, 0));
        run(world);
        expect(ball.vel.x).toBeLessThan(0);
        expect(world.events.drain()).toMatchObject([{ type: 'targetHit', id: 't1', ballId: 0 }]);
    });

    it('spinner lets the ball through, spins up, then decays', () => {
        const world = new World({ tiltDegrees: 0 });
        const spinner = world.addSpinner('sp', vec2(-0.1, 0.5), vec2(0.1, 0.5));
        const ball = world.addBall(vec2(0, 0), vec2(0, 2));
        run(world, 400);
        expect(ball.pos.y).toBeGreaterThan(0.5);
        expect(ball.vel.y).toBeCloseTo(2, 9);
        const events = world.events.drain();
        expect(events).toHaveLength(1);
        expect(events[0]).toMatchObject({ type: 'spinnerSpin', id: 'sp' });
        const spin = spinner.angularVelocity;
        expect(spin).not.toBe(0);
        run(world, 100);
        expect(Math.abs(spinner.angularVelocity)).toBeLessThan(Math.abs(spin));
    });

    it('spinner spin direction follows crossing direction', () => {
        const down = new World({ tiltDegrees: 0 });
        const s1 = down.addSpinner('sp', vec2(-0.1, 0.5), vec2(0.1, 0.5));
        down.addBall(vec2(0, 0.4), vec2(0, 2));
        run(down, 100);
        const up = new World({ tiltDegrees: 0 });
        const s2 = up.addSpinner('sp', vec2(-0.1, 0.5), vec2(0.1, 0.5));
        up.addBall(vec2(0, 0.6), vec2(0, -2));
        run(up, 100);
        expect(Math.sign(s1.angularVelocity)).toBe(-Math.sign(s2.angularVelocity));
    });
});
