import { describe, expect, it } from 'vitest';
import { RulesEngine } from '@rules/engine';
import { MISSIONS } from '@rules/missions';
import { SCORING } from '@rules/scoring';
import type { RulesCommand, RulesEvent } from '@rules/types';

/** Drives the engine with a scripted event sequence, as the physics layer would, and records output. */
class Script {
    readonly engine = new RulesEngine();
    readonly commands: RulesCommand[] = [];
    readonly phases: string[] = [];

    send(event: RulesEvent, times = 1): void {
        for (let i = 0; i < times; i++) {
            this.commands.push(...this.engine.handle(event));
            const last = this.phases[this.phases.length - 1];
            if (last !== this.engine.phase) this.phases.push(this.engine.phase);
        }
    }

    tick(seconds: number): void {
        this.send({ type: 'tick', dt: seconds });
    }

    get displays(): string[] {
        return this.commands.flatMap(c => (c.type === 'display' ? [c.text] : []));
    }

    get scored(): number {
        return this.commands.reduce((sum, c) => sum + (c.type === 'score' ? c.points : 0), 0);
    }
}

const bumper = { type: 'bumperHit', id: 'bumper-1', ballId: 0, speed: 1 } as const;
const spinner = { type: 'spinnerSpin', id: 'spinner-1', ballId: 0, angularVelocity: 5 } as const;
const sling = { type: 'slingshot', id: 'sling-left', ballId: 0, speed: 1 } as const;
const inlane = { type: 'laneEnter', id: 'inlane-left', ballId: 0 } as const;
const bank = { type: 'dropBankCleared', id: 'dropbank-left' } as const;
const capture = { type: 'saucerCapture', id: 'saucer-lock', ballId: 0 } as const;
const orbit = { type: 'pathExit', id: 'orbit-1', ballId: 0 } as const;
const ramp = { type: 'pathExit', id: 'ramp-1', ballId: 0 } as const;
const launch = { type: 'ballLaunched', ballId: 0 } as const;
const drain = { type: 'drain', ballId: 0 } as const;

describe('scripted full game (no browser)', () => {
    it('plays three balls, completes every mission, wizard mode, and returns to attract', () => {
        const game = new Script();
        const { engine } = game;
        expect(engine.phase).toBe('attract');

        // Ball 1: clear all three missions, which unlocks wizard mode.
        game.send({ type: 'startPressed' });
        expect(engine.ballNumber).toBe(1);
        game.send(launch);
        game.send(bank);
        game.send(bumper, 10);
        game.send(orbit);
        game.send(ramp);
        game.send(spinner, 20);
        game.send(inlane, 2);
        game.send(sling, 8);
        for (const mission of MISSIONS) {
            expect(engine.missionState.isCompleted(mission.id)).toBe(true);
        }
        expect(engine.wizardActive).toBe(true);
        game.send(bumper, 2);
        game.tick(SCORING.wizardSeconds + 1);
        expect(engine.wizardCompleted).toBe(true);
        const ball1Score = engine.score;
        expect(ball1Score).toBeGreaterThan(SCORING.wizardAward);

        // Drain ball 1 into the bonus count, then ball 2 appears.
        game.send(drain);
        expect(engine.phase).toBe('bonus');
        game.tick(3);
        expect(engine.ballNumber).toBe(2);
        expect(engine.phase).toBe('plunger');
        expect(engine.score).toBeGreaterThan(ball1Score);

        // Ball 2: a ball save returns the ball without advancing the ball number.
        game.send(launch);
        game.send(drain);
        expect(engine.ballNumber).toBe(2);
        expect(engine.phase).toBe('plunger');
        game.send(launch);
        game.send(bumper, 3);
        game.tick(11);
        game.send(drain);
        game.tick(3);

        // Ball 3: tilt forfeits scoring, then the game ends.
        expect(engine.ballNumber).toBe(3);
        game.send(launch);
        game.send({ type: 'tilt' });
        const tiltedScore = engine.score;
        game.send(bumper, 5);
        expect(engine.score).toBe(tiltedScore);
        game.send(drain);
        game.tick(3);
        expect(engine.phase).toBe('gameOver');
        game.tick(4);
        expect(engine.phase).toBe('attract');

        // The score reported through commands matches the engine total.
        expect(game.scored).toBe(engine.score);
        expect(game.displays).toEqual(
            expect.arrayContaining([
                'BALL 1',
                'WIZARD MODE',
                'WIZARD COMPLETE',
                'BALL SAVED',
                'TILT',
                'GAME OVER',
                'PRESS START',
            ])
        );
        expect(game.phases).toEqual([
            'plunger',
            'play',
            'bonus',
            'plunger',
            'play',
            'plunger',
            'play',
            'bonus',
            'plunger',
            'play',
            'bonus',
            'gameOver',
            'attract',
        ]);
    });

    it('is deterministic: the same script yields identical commands', () => {
        const run = (): RulesCommand[] => {
            const game = new Script();
            game.send({ type: 'startPressed' });
            game.send(launch);
            game.send(bank);
            game.send(bumper, 10);
            game.send(ramp);
            game.send(capture);
            game.tick(2);
            game.send(drain);
            game.tick(3);
            return game.commands;
        };
        expect(run()).toEqual(run());
    });
});
