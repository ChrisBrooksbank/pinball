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
});
