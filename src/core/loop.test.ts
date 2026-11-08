import { describe, it, expect } from 'vitest';
import { FixedStepper } from './loop';

describe('FixedStepper', () => {
    it('runs the right number of fixed steps for a frame', () => {
        const stepper = new FixedStepper(0.001);
        let calls = 0;
        const steps = stepper.advance(0.0165, () => calls++);
        expect(steps).toBe(16);
        expect(calls).toBe(16);
    });

    it('carries remainder time into the next frame', () => {
        const stepper = new FixedStepper(0.01);
        expect(stepper.advance(0.015, () => {})).toBe(1);
        expect(stepper.advance(0.0051, () => {})).toBe(1);
    });

    it('caps steps after a stall', () => {
        const stepper = new FixedStepper(0.001, 10);
        expect(stepper.advance(5, () => {})).toBe(10);
        expect(stepper.advance(0, () => {})).toBe(0);
    });
});
