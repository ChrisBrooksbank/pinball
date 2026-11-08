import { describe, expect, it } from 'vitest';
import { vec2 } from '../physics/vec2';
import type { TableDef } from './types';

describe('TableDef', () => {
    it('accepts a minimal table covering every element kind', () => {
        const table: TableDef = {
            name: 'test',
            bounds: { width: 0.52, height: 1 },
            ballRadius: 0.027,
            walls: [{ id: 'w1', a: vec2(0, 0), b: vec2(0, 1) }],
            arcs: [
                {
                    id: 'a1',
                    center: vec2(0.26, 0.26),
                    radius: 0.24,
                    startAngle: Math.PI,
                    sweepAngle: Math.PI,
                },
            ],
            flippers: [
                {
                    id: 'fl',
                    side: 'left',
                    config: {
                        pivot: vec2(0.11, 0.9),
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
            slingshots: [{ id: 's1', a: vec2(0.1, 0.7), b: vec2(0.15, 0.8) }],
            targets: [{ id: 't1', a: vec2(0.2, 0.3), b: vec2(0.25, 0.3) }],
            spinners: [{ id: 'sp1', a: vec2(0.3, 0.4), b: vec2(0.35, 0.4) }],
            paths: [],
            lanes: [{ id: 'in1', kind: 'inlane', a: vec2(0.05, 0.8), b: vec2(0.08, 0.8) }],
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
        expect(table.flippers).toHaveLength(1);
        expect(table.lamps[0]?.id).toBe(table.bumpers[0]?.lampId);
    });
});
