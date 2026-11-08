import { describe, it, expect } from 'vitest';
import { World } from './world';
import { length, vec2 } from './vec2';

describe('World', () => {
    it('defaults to a 6.5 degree tilt', () => {
        expect(new World().config.tiltDegrees).toBe(6.5);
    });

    it('accelerates a ball down the incline at g*sin(tilt)', () => {
        const world = new World({ tiltDegrees: 6.5 });
        const ball = world.addBall(vec2(0, 0));
        const dt = 0.001;
        for (let i = 0; i < 1000; i++) world.step(dt);
        const a = 9.81 * Math.sin((6.5 * Math.PI) / 180);
        expect(ball.vel.y).toBeCloseTo(a, 6);
        expect(ball.vel.x).toBe(0);
        expect(ball.pos.y).toBeCloseTo(0.5 * a, 2);
    });

    it('is free fall at 90 degrees and level at 0 degrees', () => {
        const steep = new World({ tiltDegrees: 90 });
        expect(steep.gravityAlongTable.y).toBeCloseTo(9.81, 10);
        const flat = new World({ tiltDegrees: 0 });
        const ball = flat.addBall(vec2(1, 1), vec2(0.3, 0));
        flat.step(0.01);
        expect(length(flat.gravityAlongTable)).toBe(0);
        expect(ball.vel.x).toBe(0.3);
        expect(ball.pos.x).toBeCloseTo(1.003, 10);
    });

    it('bounces off a wall with the wall restitution', () => {
        const world = new World({ tiltDegrees: 0 });
        world.addSegment(vec2(1, -1), vec2(1, 1)); // vertical wall at x=1
        const e = world.materials.wall.restitution;
        const ball = world.addBall(vec2(0.9, 0), vec2(2, 0));
        for (let i = 0; i < 100; i++) world.step(0.001);
        expect(ball.vel.x).toBeCloseTo(-2 * e, 9);
        expect(ball.pos.x).toBeLessThan(1 - ball.radius);
    });

    it('uses the restitution of the segment surface type', () => {
        const world = new World({ tiltDegrees: 0 });
        world.addSegment(vec2(1, -1), vec2(1, 1), 'rubber');
        const ball = world.addBall(vec2(0.9, 0), vec2(2, 0));
        for (let i = 0; i < 100; i++) world.step(0.001);
        expect(ball.vel.x).toBeCloseTo(-2 * world.materials.rubber.restitution, 9);
    });

    it('does not tunnel through a wall at 10x normal speed', () => {
        const world = new World({ tiltDegrees: 0 });
        world.addSegment(vec2(-1, 0.5), vec2(1, 0.5)); // horizontal wall at y=0.5
        const ball = world.addBall(vec2(0, 0), vec2(0, 100)); // 0.1 m per step, wall has no thickness
        for (let i = 0; i < 50; i++) world.step(0.001);
        expect(ball.pos.y).toBeLessThan(0.5);
        expect(ball.vel.y).toBeLessThan(0);
    });

    it('deflects off a segment endpoint', () => {
        const world = new World({ tiltDegrees: 0 });
        world.addSegment(vec2(1, -1), vec2(1, 0)); // wall ends at y=0
        const ball = world.addBall(vec2(0.9, 0.01), vec2(5, 0));
        for (let i = 0; i < 100; i++) world.step(0.001);
        expect(ball.vel.x).toBeLessThan(5);
        expect(ball.vel.y).toBeGreaterThan(0);
    });

    it('reflects config changes made at runtime', () => {
        const world = new World();
        world.config.tiltDegrees = 10;
        expect(world.gravityAlongTable.y).toBeCloseTo(9.81 * Math.sin((10 * Math.PI) / 180), 10);
    });
});
