import { describe, expect, it } from 'vitest';
import { RulesEngine } from '@rules/engine';
import { BUMPER_RUSH, MISSIONS } from '@rules/missions';

function playing(): RulesEngine {
    const engine = new RulesEngine();
    engine.handle({ type: 'startPressed' });
    engine.handle({ type: 'ballLaunched', ballId: 0 });
    return engine;
}

const target = (e: RulesEngine) => e.handle({ type: 'targetHit', id: 'target-1', ballId: 0 });
const bumper = (e: RulesEngine) =>
    e.handle({ type: 'bumperHit', id: 'bumper-1', ballId: 0, speed: 1 });

describe('mission 1: bumper rush', () => {
    it('is registered', () => {
        expect(MISSIONS).toContain(BUMPER_RUSH);
    });

    it('starts after three target hits', () => {
        const engine = playing();
        target(engine);
        target(engine);
        expect(engine.missionState.activeId).toBeNull();
        const commands = target(engine);
        expect(engine.missionState.activeId).toBe('bumper-rush');
        expect(commands).toContainEqual({ type: 'display', text: 'BUMPER RUSH START' });
    });

    it('completes after ten bumper hits and awards points', () => {
        const engine = playing();
        for (let i = 0; i < 3; i++) target(engine);
        const before = engine.score;
        for (let i = 0; i < 10; i++) bumper(engine);
        expect(engine.missionState.isCompleted('bumper-rush')).toBe(true);
        expect(engine.missionState.activeId).toBeNull();
        expect(engine.score).toBeGreaterThanOrEqual(before + BUMPER_RUSH.award);
    });

    it('fails when the timer expires', () => {
        const engine = playing();
        for (let i = 0; i < 3; i++) target(engine);
        const commands = engine.handle({ type: 'tick', dt: BUMPER_RUSH.timeLimit + 1 });
        expect(engine.missionState.activeId).toBeNull();
        expect(engine.missionState.isCompleted('bumper-rush')).toBe(false);
        expect(commands).toContainEqual({ type: 'display', text: 'BUMPER RUSH FAILED' });
    });
});
