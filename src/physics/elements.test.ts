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

describe('drop target banks and saucers', () => {
    const bank = {
        id: 'bank',
        resetDelay: 0.5,
        targets: [
            { id: 'd1', a: vec2(-0.1, 0), b: vec2(0.1, 0) },
            { id: 'd2', a: vec2(-0.1, -0.2), b: vec2(0.1, -0.2) },
        ],
    };

    it('drops hit targets so the ball passes through, then clears and resets the bank', () => {
        const world = new World({ tiltDegrees: 0 });
        world.addDropBank(bank);
        world.addBall(vec2(0, 0.3), vec2(0, -2));
        run(world, 200);
        expect(world.events.drain().map(e => e.type)).toEqual(['dropTargetHit']);
        // The dropped target no longer blocks: the next ball passes it and hits the second.
        const ball = world.addBall(vec2(0, 0.3), vec2(0, -2));
        run(world, 300);
        expect(ball.vel.y).toBeGreaterThan(0); // bounced off the second target, past the first
        expect(world.events.drain().map(e => e.type)).toEqual(['dropTargetHit', 'dropBankCleared']);
        run(world, 600);
        expect(world.events.drain().map(e => e.type)).toEqual(['dropBankReset']);
        const again = world.addBall(vec2(0, 0.3), vec2(0, -2));
        run(world, 200);
        expect(again.vel.y).toBeGreaterThan(0);
    });

    it('captures a slow ball in a saucer and ejects it', () => {
        const world = new World({ tiltDegrees: 0 });
        world.addSaucer('s1', vec2(0, 0), 0.03);
        const ball = world.addBall(vec2(-0.1, 0), vec2(1, 0));
        run(world);
        expect(ball.pos).toEqual(vec2(0, 0));
        expect(ball.vel).toEqual(vec2());
        expect(world.events.drain().map(e => e.type)).toEqual(['saucerCapture']);
        expect(world.ejectSaucer('s1', -Math.PI / 2, 2)).toBe(true);
        expect(world.ejectSaucer('s1', 0, 2)).toBe(false);
        run(world, 100);
        expect(ball.pos.y).toBeLessThan(-0.1);
        expect(world.events.drain().map(e => e.type)).toEqual(['saucerEject']);
    });

    it('lets a fast ball skip over a saucer', () => {
        const world = new World({ tiltDegrees: 0 });
        world.addSaucer('s1', vec2(0, 0), 0.03);
        const ball = world.addBall(vec2(-0.1, 0), vec2(6, 0));
        run(world);
        expect(ball.pos.x).toBeGreaterThan(0.2);
    });
});
