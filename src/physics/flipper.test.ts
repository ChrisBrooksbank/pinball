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

    it('is stepped by the world', () => {
        const world = new World();
        const f = world.addFlipper(config);
        f.setHeld(true);
        world.step(DT);
        expect(f.angularVelocity).toBeLessThan(0);
    });
});
