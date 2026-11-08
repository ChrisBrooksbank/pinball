import { describe, expect, it } from 'vitest';
import { PerspectiveCamera, Vector3 } from 'three';
import { applyCameraFraming, computeCameraFraming } from './camera';

const TABLE = { width: 0.52, height: 1 };

function corners(): Vector3[] {
    const out: Vector3[] = [];
    for (const x of [-0.26, 0.26]) for (const z of [-0.5, 0.5]) out.push(new Vector3(x, 0, z));
    return out;
}

describe('camera framing', () => {
    it.each([0.5, 0.56, 1, 1.6, 2.2])('keeps the whole table in view at aspect %s', aspect => {
        const camera = new PerspectiveCamera();
        applyCameraFraming(camera, aspect, TABLE);
        camera.updateMatrixWorld();
        for (const c of corners()) {
            const p = c.clone().project(camera);
            expect(Math.abs(p.x)).toBeLessThanOrEqual(1);
            expect(Math.abs(p.y)).toBeLessThanOrEqual(1);
        }
    });

    it('is steeper in portrait than landscape', () => {
        const portrait = computeCameraFraming(0.5, TABLE);
        const landscape = computeCameraFraming(1.8, TABLE);
        const pitch = (f: ReturnType<typeof computeCameraFraming>): number =>
            Math.atan2(f.position[1], f.position[2] - f.target[2]);
        expect(pitch(portrait)).toBeGreaterThan(pitch(landscape));
    });

    it('zooms in and follows the ball in landscape, clamped to the table', () => {
        const full = computeCameraFraming(1.8, TABLE);
        const follow = computeCameraFraming(1.8, TABLE, 0.2);
        expect(follow.position[1]).toBeLessThan(full.position[1]);
        expect(follow.target[2]).toBeCloseTo(0.2);
        expect(computeCameraFraming(1.8, TABLE, 99).target[2]).toBeLessThan(0.5);
        expect(computeCameraFraming(1.8, TABLE, -99).target[2]).toBeGreaterThan(-0.5);

        const camera = new PerspectiveCamera();
        applyCameraFraming(camera, 1.8, TABLE, 0.2);
        camera.updateMatrixWorld();
        const p = new Vector3(0, 0, 0.2).project(camera);
        expect(Math.abs(p.x)).toBeLessThan(0.1);
        expect(Math.abs(p.y)).toBeLessThan(0.1);
    });

    it('ignores the ball focus in portrait', () => {
        expect(computeCameraFraming(0.5, TABLE, 0.3)).toEqual(computeCameraFraming(0.5, TABLE));
    });
});
