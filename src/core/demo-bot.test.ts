import { describe, expect, it } from 'vitest';
import { DemoBot } from './demo-bot';

const resting = { x: 0.93, y: 1.87, vx: 0, vy: 0 };

describe('DemoBot', () => {
    it('waits, charges the plunger, then releases at the target pull', () => {
        const bot = new DemoBot();
        expect(bot.update(0.1, { ball: resting, pull: 0 }).plunger).toBe(false);
        let held = false;
        for (let i = 0; i < 200 && !held; i++) {
            held = bot.update(0.01, { ball: resting, pull: 0 }).plunger;
        }
        expect(held).toBe(true);
        expect(bot.update(0.01, { ball: resting, pull: 1 }).plunger).toBe(false);
    });

    it('does not plunge while the ball is moving elsewhere', () => {
        const bot = new DemoBot();
        const moving = { x: 0.5, y: 0.8, vx: 1, vy: 1 };
        for (let i = 0; i < 300; i++) {
            expect(bot.update(0.01, { ball: moving, pull: 0 }).plunger).toBe(false);
        }
    });

    it('flips the side the ball is on when it reaches the flippers', () => {
        const left = new DemoBot().update(0.001, {
            ball: { x: 0.3, y: 1.75, vx: 0, vy: 1 },
            pull: 0,
        });
        expect(left.left).toBe(true);
        expect(left.right).toBe(false);
        const right = new DemoBot().update(0.001, {
            ball: { x: 0.6, y: 1.75, vx: 0, vy: 1 },
            pull: 0,
        });
        expect(right.right).toBe(true);
        expect(right.left).toBe(false);
    });

    it('releases a flipper after its hold time', () => {
        const bot = new DemoBot();
        const ball = { x: 0.3, y: 1.75, vx: 0, vy: 1 };
        bot.update(0.001, { ball, pull: 0 });
        expect(bot.update(0.5, { ball: { ...ball, vy: -2 }, pull: 0 }).left).toBe(false);
    });

    it('asks for a new ball once the table has been empty a while', () => {
        const bot = new DemoBot();
        expect(bot.update(1, { ball: null, pull: 0 }).serve).toBe(false);
        expect(bot.update(1, { ball: null, pull: 0 }).serve).toBe(true);
        expect(bot.update(0.1, { ball: null, pull: 0 }).serve).toBe(false);
    });
});
