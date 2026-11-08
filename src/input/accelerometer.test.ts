import { describe, expect, it } from 'vitest';
import { NudgeDetector, requestMotionPermission, type NudgeDirection } from './accelerometer';

function setup() {
    const log: NudgeDirection[] = [];
    return { log, detector: new NudgeDetector(d => log.push(d)) };
}

describe('NudgeDetector', () => {
    it('ignores small movement', () => {
        const { log, detector } = setup();
        detector.sample(1, 1, 0);
        expect(log).toEqual([]);
    });

    it('maps sideways jolts to left/right and forward jolts to up', () => {
        const { log, detector } = setup();
        detector.sample(-10, 1, 0);
        detector.sample(10, 1, 1000);
        detector.sample(1, 10, 2000);
        expect(log).toEqual(['left', 'right', 'up']);
    });

    it('treats one shake as a single nudge via cooldown', () => {
        const { log, detector } = setup();
        detector.sample(10, 0, 0);
        detector.sample(-10, 0, 100);
        detector.sample(10, 0, 300);
        expect(log).toEqual(['right', 'right']);
    });
});

describe('requestMotionPermission', () => {
    it('is false without DeviceMotionEvent and true when no prompt is needed', async () => {
        expect(await requestMotionPermission(undefined)).toBe(false);
        expect(await requestMotionPermission({})).toBe(true);
    });

    it('follows the iOS prompt result and treats rejection as denied', async () => {
        expect(
            await requestMotionPermission({ requestPermission: () => Promise.resolve('granted') })
        ).toBe(true);
        expect(
            await requestMotionPermission({ requestPermission: () => Promise.resolve('denied') })
        ).toBe(false);
        expect(
            await requestMotionPermission({
                requestPermission: () => Promise.reject(new Error('x')),
            })
        ).toBe(false);
    });
});
