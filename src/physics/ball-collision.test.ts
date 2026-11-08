import { describe, expect, it } from 'vitest';
import { World } from './world';
import { vec2 } from './vec2';

describe('ball-ball collision', () => {
    it('exchanges velocity head-on between equal balls', () => {
        const world = new World({ tiltDegrees: 0, ballRestitution: 1 });
        const a = world.addBall(vec2(0.3, 0.5), vec2(1, 0));
        const b = world.addBall(vec2(0.4, 0.5), vec2(0, 0));
        for (let i = 0; i < 200; i++) world.step(0.001);
        expect(a.vel.x).toBeCloseTo(0, 6);
        expect(b.vel.x).toBeCloseTo(1, 6);
    });

    it('conserves momentum and separates overlapping balls', () => {
        const world = new World({ tiltDegrees: 0 });
        const a = world.addBall(vec2(0.3, 0.5), vec2(0.8, 0.2));
        const b = world.addBall(vec2(0.33, 0.51), vec2(-0.4, 0));
        const px = a.vel.x + b.vel.x;
        const py = a.vel.y + b.vel.y;
        world.step(0.001);
        expect(a.vel.x + b.vel.x).toBeCloseTo(px, 9);
        expect(a.vel.y + b.vel.y).toBeCloseTo(py, 9);
        const dist = Math.hypot(b.pos.x - a.pos.x, b.pos.y - a.pos.y);
        expect(dist).toBeGreaterThanOrEqual(a.radius + b.radius);
    });

    it('leaves non-touching balls alone and handles coincident balls', () => {
        const world = new World({ tiltDegrees: 0 });
        const a = world.addBall(vec2(0.1, 0.5), vec2(0.1, 0));
        world.addBall(vec2(0.5, 0.5));
        world.step(0.001);
        expect(a.vel.x).toBeCloseTo(0.1);
        const w2 = new World({ tiltDegrees: 0 });
        const c = w2.addBall(vec2(0.2, 0.2));
        const d = w2.addBall(vec2(0.2, 0.2));
        w2.step(0.001);
        expect(Number.isFinite(c.pos.x) && Number.isFinite(d.pos.x)).toBe(true);
        expect(d.pos.x).toBeGreaterThan(c.pos.x);
    });
});
