import { describe, it, expect } from 'vitest';
import { PauseClock } from './pause';

describe('PauseClock', () => {
    it('returns elapsed seconds clamped to the max frame', () => {
        const clock = new PauseClock(0);
        expect(clock.tick(16)).toBeCloseTo(0.016);
        expect(clock.tick(5000)).toBeCloseTo(0.1);
    });

    it('returns zero while hidden', () => {
        const clock = new PauseClock(0);
        clock.setHidden(true, 100);
        expect(clock.paused).toBe(true);
        expect(clock.tick(200)).toBe(0);
    });

    it('rebases on resume so hidden time is not simulated', () => {
        const clock = new PauseClock(0);
        clock.tick(16);
        clock.setHidden(true, 20);
        clock.setHidden(false, 60000);
        expect(clock.paused).toBe(false);
        expect(clock.tick(60016)).toBeCloseTo(0.016);
    });
});
