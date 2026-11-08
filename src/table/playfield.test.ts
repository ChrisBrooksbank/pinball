import { describe, expect, it } from 'vitest';
import { PLAYFIELD } from './playfield';
import { validateTable } from './validate';

describe('PLAYFIELD', () => {
    it('passes table validation', () => {
        expect(validateTable(PLAYFIELD)).toEqual([]);
    });

    it('has the required element set', () => {
        expect(PLAYFIELD.flippers.map(f => f.side).sort()).toEqual(['left', 'right']);
        expect(PLAYFIELD.bumpers).toHaveLength(3);
        expect(PLAYFIELD.slingshots).toHaveLength(2);
        expect(PLAYFIELD.targets.length).toBeGreaterThanOrEqual(3);
        expect(PLAYFIELD.spinners).toHaveLength(1);
        const kinds = PLAYFIELD.lanes.map(l => l.kind);
        expect(kinds.filter(k => k === 'inlane')).toHaveLength(2);
        expect(kinds.filter(k => k === 'outlane')).toHaveLength(2);
    });

    it('has lanes wide enough for the ball', () => {
        const diameter = PLAYFIELD.ballRadius * 2;
        for (const lane of PLAYFIELD.lanes) {
            expect(Math.abs(lane.b.x - lane.a.x)).toBeGreaterThan(diameter);
        }
    });

    it('mirrors the flippers about the playfield centre', () => {
        const [l, r] = PLAYFIELD.flippers.map(f => f.config);
        expect(l!.pivot.x + r!.pivot.x).toBeCloseTo(0.44);
        expect(l!.pivot.y).toBe(r!.pivot.y);
    });

    it('leaves a drain gap between the flipper tips at rest', () => {
        const [l, r] = PLAYFIELD.flippers.map(f => f.config);
        const tipX = (c: NonNullable<typeof l>): number =>
            c.pivot.x + Math.cos(c.restAngle) * c.length;
        const gap = tipX(r!) - tipX(l!) - l!.tipRadius - r!.tipRadius;
        expect(gap).toBeGreaterThan(PLAYFIELD.ballRadius * 2);
    });
});
