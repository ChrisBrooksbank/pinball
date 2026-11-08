import { describe, expect, it } from 'vitest';
import { Flipper, type FlipperConfig } from './flipper';
import { World } from './world';
import { vec2 } from './vec2';

const config: FlipperConfig = {
    pivot: vec2(0.1, 0.5),
    length: 0.07,
    baseRadius: 0.015,
    tipRadius: 0.008,
    restAngle: 0.5,
    upAngle: -0.5,
    swingUpSpeed: 40,
    swingDownSpeed: 20,
};

const DT = 0.001;

/** Ball resting on top of the flipper at its mid-point, plus the world holding both. */
function ballOnFlipper(): { world: World; flipper: Flipper; ball: ReturnType<World['addBall']> } {
    const world = new World();
    const flipper = world.addFlipper(config);
    const { point, radius } = flipper.closestOnAxis(
        vec2(config.pivot.x + 0.035, config.pivot.y + 0.02)
    );
    const up = vec2(Math.sin(config.restAngle), -Math.cos(config.restAngle));
    const ball = world.addBall(
        vec2(point.x + up.x * (radius + 0.027 + 1e-6), point.y + up.y * (radius + 0.027 + 1e-6))
    );
    return { world, flipper, ball };
}

describe('Flipper collision', () => {
    it('supports a resting ball without letting it fall through', () => {
        const { world, ball } = ballOnFlipper();
        const startY = ball.pos.y;
        for (let i = 0; i < 300; i++) world.step(DT);
        expect(ball.pos.y).toBeLessThan(startY + 0.03);
        expect(ball.pos.x).toBeLessThan(config.pivot.x + 0.1);
    });

    it('flicks a resting ball faster when the flipper swings', () => {
        const still = ballOnFlipper();
        const swung = ballOnFlipper();
        swung.flipper.setHeld(true);
        for (let i = 0; i < 60; i++) {
            still.world.step(DT);
            swung.world.step(DT);
        }
        const speed = (b: { vel: { x: number; y: number } }): number =>
            Math.hypot(b.vel.x, b.vel.y);
        expect(speed(swung.ball)).toBeGreaterThan(speed(still.ball) + 0.5);
        // The flick sends the ball up-table (toward -y).
        expect(swung.ball.vel.y).toBeLessThan(-0.5);
    });
});

describe('Flipper', () => {
    it('starts at rest with no angular velocity', () => {
        const f = new Flipper(config);
        expect(f.angle).toBe(config.restAngle);
        expect(f.angularVelocity).toBe(0);
        expect(f.isUp).toBe(false);
    });

    it('swings up at swingUpSpeed, reporting angular velocity per step', () => {
        const f = new Flipper(config);
        f.setHeld(true);
        f.step(DT);
        expect(f.angularVelocity).toBeCloseTo(-40, 6);
        expect(f.angle).toBeCloseTo(0.5 - 0.04, 9);
    });

    it('stops exactly at the up angle and holds with zero angular velocity', () => {
        const f = new Flipper(config);
        f.setHeld(true);
        for (let i = 0; i < 100; i++) f.step(DT);
        expect(f.isUp).toBe(true);
        expect(f.angle).toBe(config.upAngle);
        expect(f.angularVelocity).toBe(0);
    });

    it('falls back to rest at swingDownSpeed when released', () => {
        const f = new Flipper(config);
        f.setHeld(true);
        for (let i = 0; i < 100; i++) f.step(DT);
        f.setHeld(false);
        f.step(DT);
        expect(f.angularVelocity).toBeCloseTo(20, 6);
        for (let i = 0; i < 100; i++) f.step(DT);
        expect(f.angle).toBe(config.restAngle);
        expect(f.angularVelocity).toBe(0);
    });

    it('computes the tip position from the angle', () => {
        const f = new Flipper({ ...config, restAngle: 0 });
        expect(f.tip.x).toBeCloseTo(0.17, 9);
        expect(f.tip.y).toBeCloseTo(0.5, 9);
    });

    it('reports surface velocity at a point from angular velocity', () => {
        const f = new Flipper({ ...config, restAngle: 0 });
        f.setHeld(true);
        f.step(DT);
        // Tip is 0.07 m from the pivot along +x; rotating toward -y at 40 rad/s.
        const v = f.surfaceVelocity(vec2(0.17, 0.5));
        expect(v.x).toBeCloseTo(0, 6);
        expect(v.y).toBeCloseTo(-40 * 0.07, 6);
    });

    it('is stepped by the world', () => {
        const world = new World();
        const f = world.addFlipper(config);
        f.setHeld(true);
        world.step(DT);
        expect(f.angularVelocity).toBeLessThan(0);
    });
});

/** Raised flipper with a back wall behind the pivot and a ball dropped onto it. */
function cradleSetup(): { world: World; flipper: Flipper; ball: ReturnType<World['addBall']> } {
    const world = new World();
    const flipper = world.addFlipper(config);
    flipper.setHeld(true);
    for (let i = 0; i < 100; i++) world.step(DT);
    world.addSegment(vec2(0.085, 0.4), vec2(0.085, 0.6));
    const ball = world.addBall(vec2(0.14, 0.44), vec2(0.3, 0.5));
    return { world, flipper, ball };
}

describe('Flipper cradle', () => {
    it('traps a ball on a raised flipper without jitter', () => {
        const { world, ball } = cradleSetup();
        for (let i = 0; i < 1500; i++) world.step(DT);
        const settled = { x: ball.pos.x, y: ball.pos.y };
        let maxSpeed = 0;
        let maxDrift = 0;
        for (let i = 0; i < 500; i++) {
            world.step(DT);
            maxSpeed = Math.max(maxSpeed, Math.hypot(ball.vel.x, ball.vel.y));
            maxDrift = Math.max(
                maxDrift,
                Math.hypot(ball.pos.x - settled.x, ball.pos.y - settled.y)
            );
        }
        expect(maxSpeed).toBeLessThan(0.05);
        expect(maxDrift).toBeLessThan(0.002);
    });
});

describe('Flipper flick-pass', () => {
    it('releases a cradled ball off the flipper end when the flipper drops', () => {
        const { world, flipper, ball } = cradleSetup();
        // Low-grip flipper rubber so the ball rolls off the end instead of sticking on the cap.
        world.materials.flipper.friction = 0.2;
        for (let i = 0; i < 1500; i++) world.step(DT);
        flipper.setHeld(false);
        for (let i = 0; i < 1000; i++) world.step(DT);
        // Ball rolls down the lowered flipper and leaves past the tip, travelling toward the centre.
        expect(ball.pos.x).toBeGreaterThan(flipper.tip.x);
        expect(ball.vel.x).toBeGreaterThan(0);
    });
});
