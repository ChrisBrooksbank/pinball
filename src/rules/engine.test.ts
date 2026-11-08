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
        expect(engine.score).toBe(1500 + 3000 + 1000); // includes combo bonus
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

describe('combo shots', () => {
    const orbit = (e: RulesEngine) => e.handle({ type: 'pathExit', id: 'orbit-left', ballId: 0 });
    const ramp = (e: RulesEngine) => e.handle({ type: 'pathExit', id: 'ramp-centre', ballId: 0 });

    it('chains orbit and ramp inside the window with growing payout', () => {
        const engine = playing();
        orbit(engine);
        expect(engine.combo).toBe(1);
        const second = ramp(engine);
        expect(engine.combo).toBe(2);
        expect(second).toContainEqual({ type: 'display', text: 'COMBO X2' });
        expect(second).toContainEqual(expect.objectContaining({ type: 'score', points: 1000 }));
        const third = orbit(engine);
        expect(third).toContainEqual(expect.objectContaining({ type: 'score', points: 2000 }));
        expect(engine.combo).toBe(3);
    });

    it('resets when the window expires', () => {
        const engine = playing();
        orbit(engine);
        engine.handle({ type: 'tick', dt: 5 });
        expect(engine.combo).toBe(0);
        const commands = orbit(engine);
        expect(engine.combo).toBe(1);
        expect(commands.some(c => c.type === 'display')).toBe(false);
    });

    it('does not chain while tilted', () => {
        const engine = playing();
        engine.handle({ type: 'tilt' });
        orbit(engine);
        orbit(engine);
        expect(engine.combo).toBe(0);
    });
});

describe('drop banks and saucer', () => {
    const bank = (e: RulesEngine) => e.handle({ type: 'dropBankCleared', id: 'dropbank-right' });
    const capture = (e: RulesEngine) =>
        e.handle({ type: 'saucerCapture', id: 'saucer-lock', ballId: 0 });

    it('scores drop targets and a cleared bank advances the bonus multiplier', () => {
        const engine = playing();
        const hit = engine.handle({
            type: 'dropTargetHit',
            id: 'droptarget-left-1',
            bankId: 'dropbank-left',
            ballId: 0,
        });
        expect(hit).toContainEqual({ type: 'score', points: 300, total: 300 });
        const commands = bank(engine);
        expect(engine.bonusMultiplier).toBe(2);
        expect(commands).toContainEqual(expect.objectContaining({ type: 'score', points: 2000 }));
    });

    it('ejects the saucer ball after the hold time', () => {
        const engine = playing();
        const commands = capture(engine);
        expect(commands).toContainEqual(expect.objectContaining({ type: 'score', points: 5000 }));
        expect(engine.handle({ type: 'tick', dt: 1 }).some(c => c.type === 'kickBall')).toBe(false);
        expect(engine.handle({ type: 'tick', dt: 1 })).toContainEqual({
            type: 'kickBall',
            id: 'saucer-lock',
            ballId: 0,
        });
        expect(engine.handle({ type: 'tick', dt: 5 }).some(c => c.type === 'kickBall')).toBe(false);
    });

    it('does not count a lock until the ramp lights it', () => {
        const engine = playing();
        capture(engine);
        expect(engine.lockedBalls).toBe(0);
        engine.handle({ type: 'pathExit', id: 'ramp-centre', ballId: 0 });
        expect(engine.lockIsLit).toBe(true);
        const commands = capture(engine);
        expect(engine.lockedBalls).toBe(1);
        expect(engine.lockIsLit).toBe(false);
        expect(commands).toContainEqual({ type: 'display', text: 'BALL 1 LOCKED' });
    });
});

describe('multiball', () => {
    const orbit = (e: RulesEngine) => e.handle({ type: 'pathExit', id: 'orbit-left', ballId: 0 });
    const ramp = (e: RulesEngine) => e.handle({ type: 'pathExit', id: 'ramp-centre', ballId: 0 });
    const gap = (e: RulesEngine) => e.handle({ type: 'tick', dt: 5 });
    const capture = (e: RulesEngine) =>
        e.handle({ type: 'saucerCapture', id: 'saucer-lock', ballId: 0 });

    function lockOnce(engine: RulesEngine): ReturnType<typeof capture> {
        ramp(engine);
        gap(engine);
        return capture(engine);
    }

    function multiball(): RulesEngine {
        const engine = playing();
        lockOnce(engine);
        lockOnce(engine);
        return engine;
    }

    it('starts after enough saucer locks and adds balls', () => {
        const engine = playing();
        lockOnce(engine);
        expect(engine.multiballActive).toBe(false);
        const commands = lockOnce(engine);
        expect(engine.multiballActive).toBe(true);
        expect(engine.ballsOnTable).toBe(3);
        expect(commands.filter(c => c.type === 'addBall')).toHaveLength(2);
        expect(commands).toContainEqual({ type: 'display', text: 'MULTIBALL' });
    });

    it('orbits alone do not start multiball', () => {
        const engine = playing();
        for (let i = 0; i < 6; i++) {
            orbit(engine);
            gap(engine);
        }
        expect(engine.multiballActive).toBe(false);
    });

    it('ramps pay jackpots and the third lights the super jackpot on the orbit', () => {
        const engine = multiball();
        for (let i = 0; i < 3; i++) {
            const commands = ramp(engine);
            expect(commands).toContainEqual({ type: 'display', text: 'JACKPOT' });
            expect(commands).toContainEqual(
                expect.objectContaining({ type: 'score', points: 20000 })
            );
            gap(engine);
        }
        expect(engine.superJackpotLit).toBe(true);
        const commands = orbit(engine);
        expect(commands).toContainEqual(expect.objectContaining({ type: 'score', points: 100000 }));
        expect(engine.superJackpotLit).toBe(false);
    });

    it('ends when one ball remains, without ending the ball', () => {
        const engine = multiball();
        engine.handle({ type: 'drain', ballId: 1 });
        expect(engine.multiballActive).toBe(true);
        const commands = engine.handle({ type: 'drain', ballId: 2 });
        expect(engine.multiballActive).toBe(false);
        expect(commands).toContainEqual({ type: 'display', text: 'MULTIBALL OVER' });
        expect(engine.phase).toBe('play');
        expect(ramp(engine).some(c => c.type === 'display' && c.text === 'JACKPOT')).toBe(false);
        engine.handle({ type: 'drain', ballId: 0 });
        expect(engine.phase).toBe('bonus');
    });
});

describe('wizard mode', () => {
    const mission = {
        id: 'only',
        name: 'ONLY',
        qualify: ['target'],
        objective: { shot: 'bumper', count: 1 },
        timeLimit: 30,
        award: 1000,
    };
    const target = (e: RulesEngine) => e.handle({ type: 'targetHit', id: 'target-1', ballId: 0 });
    const bumper = (e: RulesEngine) =>
        e.handle({ type: 'bumperHit', id: 'bumper-1', ballId: 0, speed: 1 });

    function unlocked(): { engine: RulesEngine; commands: ReturnType<typeof bumper> } {
        const engine = new RulesEngine([mission]);
        engine.handle({ type: 'startPressed' });
        engine.handle({ type: 'ballLaunched', ballId: 0 });
        target(engine);
        return { engine, commands: bumper(engine) };
    }

    it('does not start until every mission is complete', () => {
        const engine = new RulesEngine();
        engine.handle({ type: 'startPressed' });
        engine.handle({ type: 'ballLaunched', ballId: 0 });
        expect(engine.wizardActive).toBe(false);
    });

    it('starts when the last mission completes and pays every shot', () => {
        const { engine, commands } = unlocked();
        expect(engine.wizardActive).toBe(true);
        expect(commands).toContainEqual({ type: 'display', text: 'WIZARD MODE' });
        const shot = bumper(engine);
        expect(shot).toContainEqual(expect.objectContaining({ type: 'score', points: 5000 }));
    });

    it('completes on timeout with an award, once per game', () => {
        const { engine } = unlocked();
        const commands = engine.handle({ type: 'tick', dt: 61 });
        expect(engine.wizardActive).toBe(false);
        expect(engine.wizardCompleted).toBe(true);
        expect(commands).toContainEqual({ type: 'display', text: 'WIZARD COMPLETE' });
        expect(commands).toContainEqual(expect.objectContaining({ type: 'score', points: 250000 }));
        bumper(engine);
        expect(engine.wizardActive).toBe(false);
    });

    it('ends without award when the ball drains', () => {
        const { engine } = unlocked();
        engine.handle({ type: 'tick', dt: 11 });
        const commands = engine.handle({ type: 'drain', ballId: 0 });
        expect(engine.wizardActive).toBe(false);
        expect(engine.wizardCompleted).toBe(false);
        expect(commands).toContainEqual({ type: 'display', text: 'WIZARD OVER' });
    });
});
