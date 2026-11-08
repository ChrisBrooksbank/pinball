import { describe, expect, it } from 'vitest';
import { PLAYFIELD } from '../table/playfield';
import { PolylinePath } from './path';
import { buildWorld } from './table-sim';
import { vec2 } from './vec2';
import type { World } from './world';

const DT = 0.001;

function runUntilExit(world: World, id: string, maxSteps = 5000): number {
    for (let i = 0; i < maxSteps; i++) {
        world.step(DT);
        if (world.events.drain().some(e => e.type === 'pathExit' && e.id === id)) return i;
    }
    return -1;
}

describe('PolylinePath', () => {
    it('interpolates along segments and reports exit direction', () => {
        const line = new PolylinePath([vec2(0, 0), vec2(1, 0), vec2(1, 1)]);
        expect(line.length).toBeCloseTo(2);
        expect(line.positionAt(0.5)).toEqual(vec2(0.5, 0));
        expect(line.positionAt(1.5).y).toBeCloseTo(0.5);
        expect(line.exitDirection).toEqual(vec2(0, 1));
    });
});

describe('scripted paths on PLAYFIELD', () => {
    const ramp = PLAYFIELD.paths.find(p => p.id === 'ramp-centre')!;
    const orbit = PLAYFIELD.paths.find(p => p.id === 'orbit-left')!;

    it('carries a ball up the ramp and releases it at the exit point', () => {
        const world = buildWorld(PLAYFIELD);
        world.addBall(vec2(0.22, 0.65), vec2(0, -3), PLAYFIELD.ballRadius);
        const entered: string[] = [];
        let exited = false;
        for (let i = 0; i < 3000 && !exited; i++) {
            world.step(DT);
            for (const e of world.events.drain()) {
                if (e.type === 'pathEnter') entered.push(e.id);
                if (e.type === 'pathExit') exited = true;
            }
        }
        expect(entered).toEqual(['ramp-centre']);
        expect(exited).toBe(true);
        const end = ramp.points[ramp.points.length - 1]!;
        const ball = world.balls[0]!;
        expect(ball.pos.x).toBeCloseTo(end.x, 2);
        expect(ball.pos.y).toBeCloseTo(end.y, 1);
        expect(ball.vel.y).toBeLessThan(0);
        expect(ball.path).toBeUndefined();
    });

    it('carries a ball around the orbit to its exit', () => {
        const world = buildWorld(PLAYFIELD);
        world.addBall(vec2(0.035, 0.46), vec2(0, -3), PLAYFIELD.ballRadius);
        expect(runUntilExit(world, 'orbit-left')).toBeGreaterThan(0);
        const end = orbit.points[orbit.points.length - 1]!;
        expect(world.balls[0]!.pos.x).toBeCloseTo(end.x, 2);
        expect(world.balls[0]!.pos.y).toBeCloseTo(end.y, 1);
    });

    it('ignores slow balls and balls crossing the wrong way', () => {
        const slow = buildWorld(PLAYFIELD);
        slow.addBall(vec2(0.22, 0.65), vec2(0, -0.5), PLAYFIELD.ballRadius);
        const wrong = buildWorld(PLAYFIELD);
        wrong.addBall(vec2(0.22, 0.55), vec2(0, 3), PLAYFIELD.ballRadius);
        for (let i = 0; i < 300; i++) {
            slow.step(DT);
            wrong.step(DT);
        }
        for (const w of [slow, wrong]) {
            expect(w.events.drain().some(e => e.type === 'pathEnter')).toBe(false);
        }
    });
});
