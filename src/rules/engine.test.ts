import { describe, expect, it } from 'vitest';
import { RulesEngine } from '@rules/engine';

describe('RulesEngine', () => {
    it('starts with zero score and no commands for ignored events', () => {
        const engine = new RulesEngine();
        expect(engine.score).toBe(0);
        expect(engine.handle({ type: 'tick', dt: 0.016 })).toEqual([]);
    });

    it('turns a bumper hit into score and sound commands', () => {
        const engine = new RulesEngine();
        const commands = engine.handle({ type: 'bumperHit', id: 'b1', ballId: 0, speed: 1 });
        expect(commands).toContainEqual({ type: 'score', points: 100, total: 100 });
        expect(commands).toContainEqual({ type: 'sound', name: 'bumper' });
        expect(engine.score).toBe(100);
    });

    it('accumulates score and is deterministic across runs', () => {
        const run = () => {
            const engine = new RulesEngine();
            for (let i = 0; i < 3; i++)
                engine.handle({ type: 'bumperHit', id: 'b', ballId: 0, speed: 1 });
            return engine.score;
        };
        expect(run()).toBe(300);
        expect(run()).toBe(run());
    });

    it('accepts every command variant in the type union', () => {
        const commands: ReturnType<RulesEngine['handle']> = [
            { type: 'lamp', id: 'l', mode: 'flash' },
            { type: 'display', text: 'HI' },
            { type: 'kickBall', id: 'k', ballId: 1 },
            { type: 'addBall' },
        ];
        expect(commands).toHaveLength(4);
    });
});
