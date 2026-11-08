import { describe, expect, it } from 'vitest';
import { RulesEngine } from '@rules/engine';

function playing(): RulesEngine {
    const engine = new RulesEngine();
    engine.handle({ type: 'startPressed' });
    engine.handle({ type: 'ballLaunched', ballId: 0 });
    return engine;
}

/** Drain after the ball-save window has expired. */ function drain(engine: RulesEngine): void {
    engine.handle({ type: 'tick', dt: 11 });
    engine.handle({ type: 'drain', ballId: 0 });
}
describe('game flow', () => {
    it('starts in attract and ignores scoring until a game starts', () => {
        const engine = new RulesEngine();
        expect(engine.phase).toBe('attract');
        engine.handle({ type: 'bumperHit', id: 'b1', ballId: 0, speed: 1 });
        expect(engine.score).toBe(0);
    });

    it('start adds a ball into the plunger lane, launch begins play', () => {
        const engine = new RulesEngine();
        const commands = engine.handle({ type: 'startPressed' });
        expect(commands).toContainEqual({ type: 'addBall' });
        expect(engine.phase).toBe('plunger');
        expect(engine.ballNumber).toBe(1);
        engine.handle({ type: 'ballLaunched', ballId: 0 });
        expect(engine.phase).toBe('play');
    });

    it('drain leads to bonus count then the next ball', () => {
        const engine = playing();
        engine.handle({ type: 'bumperHit', id: 'b', ballId: 0, speed: 1 });
        drain(engine);
        expect(engine.phase).toBe('bonus');
        const commands = engine.handle({ type: 'tick', dt: 3 });
        expect(commands).toContainEqual({ type: 'score', points: 50, total: 150 });
        expect(commands).toContainEqual({ type: 'addBall' });
        expect(engine.phase).toBe('plunger');
        expect(engine.ballNumber).toBe(2);
    });

    it('ends the game after three balls and returns to attract', () => {
        const engine = new RulesEngine();
        engine.handle({ type: 'startPressed' });
        for (let ball = 1; ball <= 3; ball++) {
            expect(engine.ballNumber).toBe(ball);
            engine.handle({ type: 'ballLaunched', ballId: 0 });
            drain(engine);
            engine.handle({ type: 'tick', dt: 3 });
        }
        expect(engine.phase).toBe('gameOver');
        engine.handle({ type: 'startPressed' });
        expect(engine.phase).toBe('gameOver');
        const commands = engine.handle({ type: 'tick', dt: 4 });
        expect(commands).toContainEqual({ type: 'display', text: 'PRESS START' });
        expect(engine.phase).toBe('attract');
    });

    it('a new game resets the score', () => {
        const engine = playing();
        engine.handle({ type: 'bumperHit', id: 'b', ballId: 0, speed: 1 });
        for (let i = 0; i < 3; i++) {
            if (i > 0) engine.handle({ type: 'ballLaunched', ballId: 0 });
            drain(engine);
            engine.handle({ type: 'tick', dt: 3 });
        }
        engine.handle({ type: 'tick', dt: 4 });
        engine.handle({ type: 'startPressed' });
        expect(engine.score).toBe(0);
    });
});

describe('RulesEngine', () => {
    it('starts with zero score and no commands for ignored events', () => {
        const engine = new RulesEngine();
        expect(engine.score).toBe(0);
        expect(engine.handle({ type: 'tick', dt: 0.016 })).toEqual([]);
    });

    it('turns a bumper hit into score and sound commands', () => {
        const engine = playing();
        const commands = engine.handle({ type: 'bumperHit', id: 'b1', ballId: 0, speed: 1 });
        expect(commands).toContainEqual({ type: 'score', points: 100, total: 100 });
        expect(commands).toContainEqual({ type: 'sound', name: 'bumper' });
        expect(engine.score).toBe(100);
    });

    it('accumulates score and is deterministic across runs', () => {
        const run = () => {
            const engine = playing();
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

describe('scoring', () => {
    it('scores targets, spinner, slingshot and lanes', () => {
        const engine = playing();
        engine.handle({ type: 'targetHit', id: 't', ballId: 0 });
        engine.handle({ type: 'spinnerSpin', id: 's', ballId: 0, angularVelocity: 5 });
        engine.handle({ type: 'slingshot', id: 'sl', ballId: 0, speed: 1 });
        engine.handle({ type: 'laneEnter', id: 'inlane-left', ballId: 0 });
        engine.handle({ type: 'laneEnter', id: 'outlane-left', ballId: 0 });
        expect(engine.score).toBe(500 + 25 + 10 + 250 + 1000);
    });

    it('scores orbit and ramp path exits, ignoring unknown paths', () => {
        const engine = playing();
        engine.handle({ type: 'pathExit', id: 'orbit-left', ballId: 0 });
        engine.handle({ type: 'pathExit', id: 'ramp-centre', ballId: 0 });
        engine.handle({ type: 'pathExit', id: 'mystery', ballId: 0 });
        expect(engine.score).toBe(1500 + 3000);
    });

    it('raises the bonus multiplier every three targets and applies it at ball end', () => {
        const engine = playing();
        for (let i = 0; i < 3; i++) engine.handle({ type: 'targetHit', id: 't', ballId: 0 });
        expect(engine.bonusMultiplier).toBe(2);
        const before = engine.score;
        drain(engine);
        const commands = engine.handle({ type: 'tick', dt: 3 });
        expect(commands).toContainEqual({ type: 'score', points: 1500, total: before + 1500 });
        expect(engine.bonusMultiplier).toBe(1);
    });

    it('caps the multiplier', () => {
        const engine = playing();
        for (let i = 0; i < 30; i++) engine.handle({ type: 'targetHit', id: 't', ballId: 0 });
        expect(engine.bonusMultiplier).toBe(5);
    });

    it('awards an extra ball after three ramp shots, replaying the same ball number', () => {
        const engine = playing();
        for (let i = 0; i < 3; i++)
            engine.handle({ type: 'pathExit', id: 'ramp-centre', ballId: 0 });
        expect(engine.extraBallsPending).toBe(1);
        drain(engine);
        const commands = engine.handle({ type: 'tick', dt: 3 });
        expect(commands).toContainEqual({ type: 'addBall' });
        expect(engine.ballNumber).toBe(1);
        expect(engine.extraBallsPending).toBe(0);
        expect(engine.phase).toBe('plunger');
    });

    it('does not score outside active play', () => {
        const engine = new RulesEngine();
        engine.handle({ type: 'startPressed' });
        engine.handle({ type: 'targetHit', id: 't', ballId: 0 });
        expect(engine.score).toBe(0);
    });
});

describe('ball save and tilt', () => {
    it('returns a ball drained shortly after launch without bonus or ball advance', () => {
        const engine = playing();
        expect(engine.ballSaveActive).toBe(true);
        const commands = engine.handle({ type: 'drain', ballId: 0 });
        expect(commands).toContainEqual({ type: 'addBall' });
        expect(engine.phase).toBe('plunger');
        expect(engine.ballNumber).toBe(1);
        expect(engine.ballSaveActive).toBe(false);
    });

    it('ball save expires after the timer', () => {
        const engine = playing();
        engine.handle({ type: 'tick', dt: 11 });
        expect(engine.ballSaveActive).toBe(false);
        engine.handle({ type: 'drain', ballId: 0 });
        expect(engine.phase).toBe('bonus');
    });

    it('tilt forfeits bonus, stops scoring and skips ball save', () => {
        const engine = playing();
        engine.handle({ type: 'bumperHit', id: 'b', ballId: 0, speed: 1 });
        const commands = engine.handle({ type: 'tilt' });
        expect(commands).toContainEqual({ type: 'display', text: 'TILT' });
        expect(engine.isTilted).toBe(true);
        engine.handle({ type: 'bumperHit', id: 'b', ballId: 0, speed: 1 });
        expect(engine.score).toBe(100);
        engine.handle({ type: 'drain', ballId: 0 });
        expect(engine.phase).toBe('bonus');
        const next = engine.handle({ type: 'tick', dt: 3 });
        expect(next.some(c => c.type === 'score')).toBe(false);
        expect(engine.score).toBe(100);
        expect(engine.isTilted).toBe(false);
    });
});
