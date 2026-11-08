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
        expect(l!.pivot.x + r!.pivot.x).toBeCloseTo(0.88);
        expect(l!.pivot.y).toBe(r!.pivot.y);
    });

    it('leaves a drain gap between the flipper tips at rest', () => {
        const [l, r] = PLAYFIELD.flippers.map(f => f.config);
        const tipX = (c: NonNullable<typeof l>): number =>
            c.pivot.x + Math.cos(c.restAngle) * c.length;
        const gap = tipX(r!) - tipX(l!) - l!.tipRadius - r!.tipRadius;
        expect(gap).toBeGreaterThan(PLAYFIELD.ballRadius * 2);
    });

    it('has real-machine proportions in ball diameters', () => {
        const d = PLAYFIELD.ballRadius * 2;
        expect(PLAYFIELD.bounds.width / d).toBeGreaterThan(19 * 0.95);
        expect(PLAYFIELD.bounds.width / d).toBeLessThan(19 * 1.05);
        expect(PLAYFIELD.bounds.height / d).toBeGreaterThan(40 * 0.95);
        expect(PLAYFIELD.bounds.height / d).toBeLessThan(40 * 1.05);
        for (const f of PLAYFIELD.flippers) {
            expect(f.config.length / d).toBeGreaterThan(2.8 * 0.9);
            expect(f.config.length / d).toBeLessThan(2.8 * 1.1);
        }
    });
});

describe('PLAYFIELD lower playfield', () => {
    it('has two drop-target banks of three with lamps', () => {
        const banks = PLAYFIELD.dropBanks ?? [];
        expect(banks).toHaveLength(2);
        for (const bank of banks) {
            expect(bank.targets).toHaveLength(3);
            for (const t of bank.targets) {
                expect(PLAYFIELD.lamps.some(l => l.id === t.lampId)).toBe(true);
            }
        }
    });

    it('leaves a ball-wide gap beside each drop bank', () => {
        const d = PLAYFIELD.ballRadius * 2;
        for (const bank of PLAYFIELD.dropBanks ?? []) {
            const x = bank.targets[0]!.a.x;
            const wallGap = Math.min(x - 0.072, 0.86 - x, x - 0.02);
            expect(wallGap).toBeGreaterThan(d * 1.5);
        }
    });
});
