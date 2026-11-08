import { describe, expect, it } from 'vitest';
import type { PhysicsEvent } from '@core/events';
import { PLAYFIELD } from '@/table/playfield';
import { vec2 } from './vec2';
import { TableSim } from './table-sim';

/** Fire a ball from `from` with velocity `vel` and collect every event for `seconds`. */
function shoot(from: [number, number], vel: [number, number], seconds: number): PhysicsEvent[] {
    const sim = new TableSim(PLAYFIELD);
    sim.autoServe = false;
    sim.world.addBall(vec2(...from), vec2(...vel), PLAYFIELD.ballRadius);
    const events: PhysicsEvent[] = [];
    for (let i = 0; i < seconds * 1000; i++) {
        sim.step(0.001);
        events.push(...sim.world.events.drain());
    }
    return events;
}

const ids = (events: PhysicsEvent[], type: string): string[] =>
    events.flatMap(e => (e.type === type && 'id' in e ? [e.id] : []));

describe('shot flow', () => {
    it('a ball shot up the left channel runs the left orbit and returns down the right inlane', () => {
        const events = shoot([0.075, 1.15], [0, -3.2], 8);
        expect(ids(events, 'pathEnter')).toContain('orbit-left');
        expect(ids(events, 'pathExit')).toContain('orbit-left');
        expect(ids(events, 'laneEnter')).toContain('inlane-right');
    });

    it('a ball shot up the right channel runs the right orbit and returns down the left inlane', () => {
        const events = shoot([0.805, 1.15], [0, -3.2], 8);
        expect(ids(events, 'pathEnter')).toContain('orbit-right');
        expect(ids(events, 'laneEnter')).toContain('inlane-left');
    });

    it('a ball shot up the middle runs the centre ramp', () => {
        const events = shoot([0.44, 1.5], [0, -3.5], 4);
        expect(ids(events, 'pathEnter')).toContain('ramp-centre');
    });

    it('does not let a ball dropped from the arch fall down the orbit channel to the outlane', () => {
        // The cap sheds it back into the bumper chamber instead of the channel below.
        const events = shoot([0.05, 0.45], [0, 0], 6);
        expect(ids(events, 'laneEnter')).not.toContain('outlane-left');
    });
});

describe('plunged ball', () => {
    it('stays in play for a while and hits the bumpers', () => {
        let bumperHits = 0;
        for (const pull of [0.35, 0.6, 0.9]) {
            const sim = new TableSim(PLAYFIELD);
            sim.autoServe = false;
            sim.plunger.setHeld(true);
            for (let i = 0; i < pull * 1000; i++) sim.step(0.001);
            sim.plunger.setHeld(false);
            let drainedAt = 0;
            for (let i = 0; i < 20000 && drainedAt === 0; i++) {
                sim.step(0.001);
                for (const e of sim.world.events.drain()) {
                    if (e.type === 'bumperHit') bumperHits++;
                    if (e.type === 'drain') drainedAt = i;
                }
            }
            // Untouched by flippers, a ball should still survive a few seconds, not drop straight out.
            expect(drainedAt === 0 || drainedAt > 4000).toBe(true);
        }
        expect(bumperHits).toBeGreaterThan(0);
    });
});
