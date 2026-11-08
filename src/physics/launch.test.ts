import { describe, expect, it } from 'vitest';
import { PLAYFIELD } from '@/table/playfield';
import { TableSim } from './table-sim';

const LANE_X = 0.87;
/** The lane is sealed above this y, so a ball below it and right of the divider is inside the lane. */
const LANE_ROOF_Y = 0.4;
/** Below this y the ball is at the bottom of the lane (where a fresh ball rests). */
const LANE_REST_Y = 1.8;

/** Hold the plunger for `pullSeconds`, release, and report what the ball does over 6 s. */
function plunge(pullSeconds: number): { reachedPlayfield: boolean; fellBackIntoLane: boolean } {
    const sim = new TableSim(PLAYFIELD);
    sim.plunger.setHeld(true);
    for (let i = 0; i < pullSeconds * 1000; i++) sim.step(0.001);
    sim.plunger.setHeld(false);
    let reachedPlayfield = false;
    let fellBackIntoLane = false;
    for (let i = 0; i < 6000; i++) {
        sim.step(0.001);
        const ball = sim.world.balls[0];
        if (!ball) continue;
        if (ball.pos.x < LANE_X) reachedPlayfield = true;
        else if (reachedPlayfield && ball.pos.y > LANE_ROOF_Y && ball.pos.y < LANE_REST_Y)
            fellBackIntoLane = true;
    }
    return { reachedPlayfield, fellBackIntoLane };
}

describe('plunger launch', () => {
    it('a full pull delivers the ball to the playfield without dropping back into the lane', () => {
        expect(plunge(1.2)).toEqual({ reachedPlayfield: true, fellBackIntoLane: false });
    });

    it('a medium pull also reaches the playfield', () => {
        expect(plunge(0.35).reachedPlayfield).toBe(true);
    });
});
