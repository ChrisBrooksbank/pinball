import { describe, expect, it } from 'vitest';
import { World } from './world';
import { vec2 } from './vec2';

describe('nudge', () => {
    it('gives balls a brief impulse in the nudge direction', () => {
        const world = new World({ tiltDegrees: 0 });
        const ball = world.addBall(vec2(0.3, 0.5));
        world.nudge('left');
        expect(ball.vel.x).toBeCloseTo(-world.config.nudgeImpulse);
        world.nudge('right');
        world.nudge('up');
        expect(ball.vel.x).toBeCloseTo(0);
        expect(ball.vel.y).toBeCloseTo(-world.config.nudgeImpulse);
    });

    it('decays the nudge counter over time', () => {
        const world = new World();
        world.nudge('left');
        world.nudge('left');
        expect(world.nudgeCount).toBe(2);
        for (let i = 0; i < 1000; i++) world.step(0.001);
        expect(world.nudgeCount).toBeCloseTo(1, 2);
    });

    it('tilts after repeated nudges, once, and ignores further nudges', () => {
        const world = new World({ tiltDegrees: 0 });
        const ball = world.addBall(vec2(0.3, 0.5));
        for (let i = 0; i <= world.config.nudgeTiltLimit; i++) world.nudge('left');
        expect(world.tilted).toBe(true);
        expect(world.events.drain()).toEqual([{ type: 'tilt' }]);
        const vx = ball.vel.x;
        world.nudge('left');
        expect(ball.vel.x).toBe(vx);
        expect(world.events.drain()).toEqual([]);
        world.resetTilt();
        expect(world.tilted).toBe(false);
    });

    it('does not tilt when nudges are spaced out', () => {
        const world = new World();
        for (let n = 0; n < 6; n++) {
            world.nudge('right');
            for (let i = 0; i < 1500; i++) world.step(0.001);
        }
        expect(world.tilted).toBe(false);
    });
});
