import { describe, expect, it } from 'vitest';
import { TableSim } from './table-sim';
import { PLAYFIELD } from '../table/playfield';
import { createTuningParams } from './tuning';

function setup() {
    const sandbox = new TableSim(PLAYFIELD);
    const params = createTuningParams(sandbox);
    const get = (id: string) => {
        const p = params.find(q => q.id === id);
        if (!p) throw new Error(id);
        return p;
    };
    return { sandbox, get };
}

describe('tuning params', () => {
    it('sets flipper strength on both flippers', () => {
        const { sandbox, get } = setup();
        get('flipperStrength').set(55);
        expect(sandbox.left.config.swingUpSpeed).toBe(55);
        expect(sandbox.right.config.swingUpSpeed).toBe(55);
        expect(get('flipperStrength').get()).toBe(55);
    });

    it('scales restitution with a cap of 1 and friction without', () => {
        const { sandbox, get } = setup();
        get('restitution').set(2);
        expect(sandbox.world.materials.rubber.restitution).toBe(1);
        expect(sandbox.world.materials.wall.restitution).toBeCloseTo(1);
        get('restitution').set(0.5);
        expect(sandbox.world.materials.wall.restitution).toBeCloseTo(0.25);
        get('friction').set(2);
        expect(sandbox.world.materials.rubber.friction).toBeCloseTo(1.2);
    });

    it('changes tilt angle and gravity along the table', () => {
        const { sandbox, get } = setup();
        const before = sandbox.world.gravityAlongTable.y;
        get('tilt').set(10);
        expect(sandbox.world.config.tiltDegrees).toBe(10);
        expect(sandbox.world.gravityAlongTable.y).toBeGreaterThan(before);
    });
});
