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

    it('applies Coulomb friction to the tangential speed on impact', () => {
        const world = new World({ tiltDegrees: 0 });
        world.addSegment(vec2(1, -1), vec2(1, 1), 'rubber');
        const m = world.materials.rubber;
        m.rollingDamping = 0;
        const ball = world.addBall(vec2(0.9, 0), vec2(2, 5));
        for (let i = 0; i < 100; i++) world.step(0.001);
        const impulse = (1 + m.restitution) * 2;
        expect(ball.vel.x).toBeCloseTo(-2 * m.restitution, 9);
        expect(ball.vel.y).toBeCloseTo(5 - m.friction * impulse, 9);
    });

    it('friction never reverses the tangential slide', () => {
        const world = new World({ tiltDegrees: 0 });
        world.addSegment(vec2(1, -1), vec2(1, 1), 'rubber');
        world.materials.rubber.friction = 10;
        const ball = world.addBall(vec2(0.9, 0), vec2(2, 0.1));
        for (let i = 0; i < 100; i++) world.step(0.001);
        expect(ball.vel.y).toBeCloseTo(0, 9);
    });

    it('applies rolling damping to tangential speed on contact', () => {
        const world = new World({ tiltDegrees: 0 });
        world.addSegment(vec2(1, -1), vec2(1, 1));
        const m = world.materials.wall;
        m.friction = 0;
        m.rollingDamping = 50;
        const ball = world.addBall(vec2(0.9, 0), vec2(2, 1));
        for (let i = 0; i < 100; i++) world.step(0.001);
        expect(ball.vel.y).toBeCloseTo(1 - 50 * 0.001, 9);
    });

    it('resolves a ball wedged in a corner without escaping or exploding', () => {
        const world = new World({ tiltDegrees: 0 });
        world.addSegment(vec2(1, -1), vec2(1, 1));
        world.addSegment(vec2(-1, 1), vec2(1, 1));
        const ball = world.addBall(vec2(0.9, 0.9), vec2(30, 30));
        for (let i = 0; i < 200; i++) world.step(0.001);
        expect(ball.pos.x).toBeLessThan(1);
        expect(ball.pos.y).toBeLessThan(1);
        expect(Math.hypot(ball.vel.x, ball.vel.y)).toBeLessThan(43);
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

    it('keeps a ball inside a curved guide, even at 10x speed', () => {
        const world = new World({ tiltDegrees: 0 });
        // Full circle guide of radius 0.5; ball launched from the centre.
        world.addArc(vec2(0, 0), 0.5, 0, Math.PI * 2);
        const ball = world.addBall(vec2(0, 0), vec2(60, 25));
        for (let i = 0; i < 500; i++) {
            world.step(0.001);
            expect(Math.hypot(ball.pos.x, ball.pos.y)).toBeLessThan(0.5);
        }
    });

    it('bounces off the outside of an arc with the surface restitution', () => {
        const world = new World({ tiltDegrees: 0 });
        world.addArc(vec2(0, 0), 0.5, -Math.PI / 4, Math.PI / 2); // right-hand bulge around +x
        const e = world.materials.wall.restitution;
        const ball = world.addBall(vec2(1, 0), vec2(-100, 0));
        for (let i = 0; i < 20; i++) world.step(0.001);
        expect(ball.vel.x).toBeCloseTo(100 * e, 6);
        expect(ball.pos.x).toBeGreaterThan(0.5);
    });

    it('passes by an arc outside its angular range', () => {
        const world = new World({ tiltDegrees: 0 });
        world.addArc(vec2(0, 0), 0.5, -Math.PI / 4, Math.PI / 2);
        const ball = world.addBall(vec2(-1, 0), vec2(10, 0));
        for (let i = 0; i < 20; i++) world.step(0.001);
        expect(ball.vel.x).toBe(10);
    });

    it('deflects off an arc end cap', () => {
        const world = new World({ tiltDegrees: 0 });
        world.addArc(vec2(0, 0), 0.5, 0, Math.PI / 2); // ends at (0.5, 0) and (0, 0.5)
        const ball = world.addBall(vec2(0.5, -0.5), vec2(0.1, 5));
        for (let i = 0; i < 200; i++) world.step(0.001);
        expect(ball.vel.y).toBeLessThan(5);
    });

    it('reflects config changes made at runtime', () => {
        const world = new World();
        world.config.tiltDegrees = 10;
        expect(world.gravityAlongTable.y).toBeCloseTo(9.81 * Math.sin((10 * Math.PI) / 180), 10);
    });

    it('is deterministic: identical setups give bit-identical trajectories', () => {
        const run = (): number[] => {
            const world = new World();
            world.addSegment(vec2(-0.3, 0.5), vec2(0.3, 0.45), 'rubber');
            world.addSegment(vec2(-0.3, -1), vec2(-0.3, 1));
            world.addSegment(vec2(0.3, -1), vec2(0.3, 1));
            world.addArc(vec2(0, -0.6), 0.3, Math.PI, Math.PI);
            const a = world.addBall(vec2(-0.1, -0.3), vec2(1.3, -2.1));
            const b = world.addBall(vec2(0.1, -0.2), vec2(-0.7, 1.9));
            const trace: number[] = [];
            for (let i = 0; i < 5000; i++) {
                world.step(0.001);
                if (i % 50 === 0) trace.push(a.pos.x, a.pos.y, a.vel.x, a.vel.y, b.pos.x, b.pos.y);
            }
            return trace;
        };
        const first = run();
        expect(first.length).toBeGreaterThan(0);
        expect(run()).toEqual(first);
    });
});
