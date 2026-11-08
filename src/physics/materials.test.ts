import { describe, expect, it } from 'vitest';
import { createMaterials } from './materials';
import { World } from './world';

describe('materials', () => {
    it('defines sane coefficients for every surface', () => {
        const materials = createMaterials();
        for (const m of Object.values(materials)) {
            expect(m.restitution).toBeGreaterThanOrEqual(0);
            expect(m.restitution).toBeLessThanOrEqual(1);
            expect(m.friction).toBeGreaterThanOrEqual(0);
            expect(m.rollingDamping).toBeGreaterThanOrEqual(0);
        }
    });

    it('returns independent copies so tuning one does not affect others', () => {
        const a = createMaterials();
        const b = createMaterials();
        a.wall.restitution = 0.99;
        expect(b.wall.restitution).not.toBe(0.99);
    });

    it('exposes mutable materials on each World', () => {
        const w1 = new World();
        const w2 = new World();
        w1.materials.rubber.friction = 1.2;
        expect(w1.materials.rubber.friction).toBe(1.2);
        expect(w2.materials.rubber.friction).not.toBe(1.2);
    });
});
