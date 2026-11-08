import { describe, expect, it } from 'vitest';
import type { PlungerConfig } from './plunger';
import { World } from './world';
import { vec2 } from './vec2';

const config: PlungerConfig = {
    x: 0.5,
    restY: 1,
    halfWidth: 0.012,
    maxPull: 0.06,
    pullSpeed: 0.2,
    maxReleaseSpeed: 4,
};
const DT = 0.001;

/** Pull the plunger back for `pullSeconds`, release, and return the ball's launch speed. */
function launch(pullSeconds: number): { speed: number; vx: number } {
    const world = new World();
    const plunger = world.addPlunger(config);
    const ball = world.addBall(vec2(config.x, config.restY - 0.027 - 1e-6));
    plunger.setHeld(true);
    for (let i = 0; i < pullSeconds / DT; i++) world.step(DT);
    plunger.setHeld(false);
    for (let i = 0; i < 100; i++) world.step(DT);
    return { speed: -ball.vel.y, vx: ball.vel.x };
}

describe('Plunger', () => {
    it('draws back while held, capped at max pull', () => {
        const world = new World();
        const plunger = world.addPlunger(config);
        plunger.setHeld(true);
        for (let i = 0; i < 100; i++) world.step(DT);
        expect(plunger.pull).toBeCloseTo(0.02, 6);
        for (let i = 0; i < 1000; i++) world.step(DT);
        expect(plunger.pull).toBe(config.maxPull);
    });

    it('returns to rest after release and stops', () => {
        const world = new World();
        const plunger = world.addPlunger(config);
        plunger.setHeld(true);
        for (let i = 0; i < 200; i++) world.step(DT);
        plunger.setHeld(false);
        for (let i = 0; i < 100; i++) world.step(DT);
        expect(plunger.pull).toBe(0);
        expect(plunger.velocityY).toBe(0);
    });

    it('launches the ball up the lane, harder for a longer pull', () => {
        const light = launch(0.1);
        const full = launch(0.5);
        expect(light.speed).toBeGreaterThan(0.5);
        expect(full.speed).toBeGreaterThan(light.speed * 2);
        expect(full.speed).toBeGreaterThan(3);
        expect(Math.abs(full.vx)).toBeLessThan(1e-9);
    });

    it('does not launch a ball when released without pulling', () => {
        const { speed } = launch(0);
        expect(speed).toBeLessThan(0.1);
    });

    it('catches a falling ball on a drawn-back tip', () => {
        const world = new World();
        const plunger = world.addPlunger(config);
        plunger.setHeld(true);
        for (let i = 0; i < 300; i++) world.step(DT);
        const ball = world.addBall(vec2(config.x, config.restY - 0.1), vec2(0, 2));
        for (let i = 0; i < 300; i++) world.step(DT);
        expect(ball.pos.y).toBeLessThan(plunger.tipY);
    });
});
