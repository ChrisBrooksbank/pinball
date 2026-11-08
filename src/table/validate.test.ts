import { describe, expect, it } from 'vitest';
import { vec2 } from '../physics/vec2';
import type { TableDef } from './types';
import { validateTable } from './validate';

function makeTable(): TableDef {
    return {
        name: 'test',
        bounds: { width: 0.52, height: 1 },
        ballRadius: 0.027,
        walls: [{ id: 'w1', a: vec2(0.01, 0.1), b: vec2(0.01, 0.8) }],
        arcs: [],
        flippers: [
            {
                id: 'fl',
                side: 'left',
                config: {
                    pivot: vec2(0.15, 0.9),
                    length: 0.08,
                    baseRadius: 0.015,
                    tipRadius: 0.009,
                    restAngle: 0.5,
                    upAngle: -0.5,
                    swingUpSpeed: 40,
                    swingDownSpeed: 20,
                },
            },
        ],
        bumpers: [{ id: 'b1', center: vec2(0.26, 0.45), radius: 0.03, lampId: 'l1' }],
        slingshots: [],
        targets: [],
        spinners: [],
        lanes: [],
        plungerLane: {
            id: 'pl',
            plunger: {
                x: 0.465,
                restY: 0.95,
                halfWidth: 0.03,
                maxPull: 0.08,
                pullSpeed: 0.15,
                maxReleaseSpeed: 5,
            },
            ballStart: vec2(0.465, 0.92),
        },
        drain: { id: 'drain', y: 1.02 },
        lamps: [{ id: 'l1', pos: vec2(0.26, 0.5), color: '#ff00aa' }],
    };
}

describe('validateTable', () => {
    it('accepts a well-formed table', () => {
        expect(validateTable(makeTable())).toEqual([]);
    });

    it('reports duplicate element ids', () => {
        const t = makeTable();
        t.walls.push({ id: 'b1', a: vec2(0.4, 0.1), b: vec2(0.4, 0.2) });
        expect(validateTable(t)).toContain('duplicate element id: b1');
    });

    it('reports duplicate lamp ids and missing lamp references', () => {
        const t = makeTable();
        t.lamps.push({ id: 'l1', pos: vec2(0.1, 0.1), color: '#fff' });
        t.bumpers[0]!.lampId = 'nope';
        const problems = validateTable(t);
        expect(problems).toContain('duplicate lamp id: l1');
        expect(problems).toContain('b1 references missing lamp nope');
    });

    it('reports elements outside bounds', () => {
        const t = makeTable();
        t.walls.push({ id: 'w2', a: vec2(0.1, 0.1), b: vec2(0.7, 0.1) });
        t.bumpers.push({ id: 'b2', center: vec2(0.01, 0.5), radius: 0.03 });
        const problems = validateTable(t);
        expect(problems).toContain('w2 is outside table bounds');
        expect(problems).toContain('b2 is outside table bounds');
    });

    it('reports a flipper overlapping a wall when raised', () => {
        const t = makeTable();
        // Rest sweep is clear; the raised flipper (angle -0.5) would pass through this wall.
        t.walls.push({ id: 'w3', a: vec2(0.2, 0.8), b: vec2(0.2, 0.9) });
        expect(validateTable(t)).toContain('flipper fl overlaps wall w3');
    });
});
