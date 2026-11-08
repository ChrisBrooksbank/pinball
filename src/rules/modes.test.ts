import { describe, expect, it } from 'vitest';
import { RulesEngine } from '@rules/engine';
import type { MissionDef } from '@rules/modes';

const TEST_MISSION: MissionDef = {
    id: 'test',
    name: 'TEST',
    qualify: ['orbit', 'ramp'],
    objective: { shot: 'target', count: 2 },
    timeLimit: 20,
    award: 10000,
};

function playing(missions: readonly MissionDef[] = [TEST_MISSION]): RulesEngine {
    const engine = new RulesEngine(missions);
    engine.handle({ type: 'startPressed' });
    engine.handle({ type: 'ballLaunched', ballId: 0 });
    return engine;
}

function exit(engine: RulesEngine, id: string) {
    return engine.handle({ type: 'pathExit', id, ballId: 0 });
}

function target(engine: RulesEngine) {
    return engine.handle({ type: 'targetHit', id: 'target-1', ballId: 0 });
}

function start(engine: RulesEngine) {
    exit(engine, 'orbit-left');
    return exit(engine, 'ramp-centre');
}

describe('mode system', () => {
    it('tracks qualify sequence progress and starts the mission when complete', () => {
        const engine = playing();
        const modes = engine.missionState;
        exit(engine, 'orbit-left');
        expect(modes.qualifyProgress('test')).toBe(1);
        expect(modes.activeId).toBeNull();
        const commands = exit(engine, 'ramp-centre');
        expect(modes.activeId).toBe('test');
        expect(commands).toContainEqual({ type: 'lamp', id: 'mission-test', mode: 'flash' });
        expect(commands).toContainEqual({ type: 'display', text: 'TEST START' });
    });

    it('resets sequence on a wrong shot but restarts if it matches the first step', () => {
        const engine = playing();
        const modes = engine.missionState;
        exit(engine, 'orbit-left');
        target(engine);
        expect(modes.qualifyProgress('test')).toBe(0);
        exit(engine, 'orbit-left');
        exit(engine, 'orbit-left');
        expect(modes.qualifyProgress('test')).toBe(1);
    });

    it('completes the objective, awards points and lights the lamp', () => {
        const engine = playing();
        start(engine);
        const before = engine.score;
        target(engine);
        expect(engine.missionState.shotsRemaining).toBe(1);
        const commands = target(engine);
        // two target hits (500 each) plus the mission award
        expect(engine.score).toBe(before + 500 + 500 + 10000);
        expect(commands).toContainEqual({ type: 'lamp', id: 'mission-test', mode: 'on' });
        expect(engine.missionState.isCompleted('test')).toBe(true);
        expect(engine.missionState.allCompleted).toBe(true);
        expect(engine.missionState.activeId).toBeNull();
    });

    it('fails when the timer expires, keeping it available to retry', () => {
        const engine = playing();
        start(engine);
        engine.handle({ type: 'tick', dt: 19 });
        expect(engine.missionState.activeId).toBe('test');
        const commands = engine.handle({ type: 'tick', dt: 2 });
        expect(commands).toContainEqual({ type: 'display', text: 'TEST FAILED' });
        expect(engine.missionState.activeId).toBeNull();
        expect(engine.missionState.isCompleted('test')).toBe(false);
    });

    it('abandons the running mission on drain', () => {
        const engine = playing();
        start(engine);
        engine.handle({ type: 'tick', dt: 11 });
        const commands = engine.handle({ type: 'drain', ballId: 0 });
        expect(commands).toContainEqual({ type: 'display', text: 'TEST FAILED' });
        expect(engine.missionState.activeId).toBeNull();
    });

    it('persists completed missions and qualify progress across balls', () => {
        const engine = playing();
        start(engine);
        target(engine);
        target(engine);
        exit(engine, 'orbit-left');
        engine.handle({ type: 'tick', dt: 11 });
        engine.handle({ type: 'drain', ballId: 0 });
        engine.handle({ type: 'tick', dt: 3 });
        expect(engine.ballNumber).toBe(2);
        expect(engine.missionState.isCompleted('test')).toBe(true);
    });

    it('keeps qualify progress across balls and resets on a new game', () => {
        const other: MissionDef = { ...TEST_MISSION, id: 'other', qualify: ['orbit', 'orbit'] };
        const engine = playing([other]);
        exit(engine, 'orbit-left');
        engine.handle({ type: 'tick', dt: 11 });
        engine.handle({ type: 'drain', ballId: 0 });
        engine.handle({ type: 'tick', dt: 3 });
        expect(engine.missionState.qualifyProgress('other')).toBe(1);
        for (let ball = 2; ball <= 3; ball++) {
            engine.handle({ type: 'ballLaunched', ballId: 0 });
            engine.handle({ type: 'tick', dt: 11 });
            engine.handle({ type: 'drain', ballId: 0 });
            engine.handle({ type: 'tick', dt: 3 });
        }
        expect(engine.phase).toBe('gameOver');
        expect(engine.missionState.qualifyProgress('other')).toBe(1);
        engine.handle({ type: 'tick', dt: 4 });
        engine.handle({ type: 'startPressed' });
        expect(engine.missionState.qualifyProgress('other')).toBe(0);
    });

    it('ignores shots while tilted', () => {
        const engine = playing();
        engine.handle({ type: 'tilt' });
        start(engine);
        expect(engine.missionState.activeId).toBeNull();
    });
});
