import { describe, expect, it } from 'vitest';
import { Sandbox } from './sandbox';

const DT = 0.001;

function run(box: Sandbox, seconds: number, each?: () => void): void {
    for (let i = 0; i < seconds / DT; i++) {
        box.step(DT);
        each?.();
    }
}

describe('Sandbox playfield', () => {
    it('starts with one ball resting on the plunger', () => {
        const box = new Sandbox();
        run(box, 1);
        expect(box.world.balls).toHaveLength(1);
        expect(box.world.balls[0]?.pos.y).toBeGreaterThan(0.9);
    });

    it('plunges the ball up the lane and into the playfield', () => {
        const box = new Sandbox();
        box.plunger.setHeld(true);
        run(box, 0.6);
        box.plunger.setHeld(false);
        let minY = Infinity;
        let enteredField = false;
        run(box, 4, () => {
            const ball = box.world.balls[0];
            if (!ball) return;
            minY = Math.min(minY, ball.pos.y);
            if (ball.pos.x < 0.4 && ball.pos.y < 0.6) enteredField = true;
        });
        expect(minY).toBeLessThan(0.35);
        expect(enteredField).toBe(true);
    });

    it('drains an unplayed ball and serves a new one', () => {
        const box = new Sandbox();
        const ball = box.world.balls[0];
        if (!ball) throw new Error('no ball');
        ball.pos = { x: 0.26, y: 0.7 };
        run(box, 3);
        const events = box.world.events.drain();
        expect(events.some(e => e.type === 'drain')).toBe(true);
        expect(box.world.balls).toHaveLength(1);
        expect(box.world.balls[0]?.pos.y).toBeGreaterThan(0.9);
    });

    it('lets a raised flipper catch a ball that would otherwise drain', () => {
        const box = new Sandbox();
        const ball = box.world.balls[0];
        if (!ball) throw new Error('no ball');
        ball.pos = { x: 0.15, y: 0.8 };
        box.left.setHeld(true);
        run(box, 1);
        expect(box.world.events.drain().some(e => e.type === 'drain')).toBe(false);
    });
});
