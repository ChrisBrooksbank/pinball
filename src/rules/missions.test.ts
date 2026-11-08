import { describe, expect, it } from 'vitest';
import { RulesEngine } from '@rules/engine';
import { BUMPER_RUSH, MISSIONS, SLING_SHOT, SPIN_CYCLE } from '@rules/missions';

function playing(): RulesEngine {
    const engine = new RulesEngine();
    engine.handle({ type: 'startPressed' });
    engine.handle({ type: 'ballLaunched', ballId: 0 });
    return engine;
}

const bank = (e: RulesEngine) => e.handle({ type: 'dropBankCleared', id: 'dropbank-left' });
const bumper = (e: RulesEngine) =>
    e.handle({ type: 'bumperHit', id: 'bumper-1', ballId: 0, speed: 1 });

describe('mission 1: bumper rush', () => {
    it('is registered', () => {
        expect(MISSIONS).toContain(BUMPER_RUSH);
    });

    it('starts when a drop-target bank is cleared', () => {
        const engine = playing();
        expect(engine.missionState.activeId).toBeNull();
        const commands = bank(engine);
        expect(engine.missionState.activeId).toBe('bumper-rush');
        expect(commands).toContainEqual({ type: 'display', text: 'BUMPER RUSH START' });
    });

    it('completes after ten bumper hits and awards points', () => {
        const engine = playing();
        bank(engine);
        const before = engine.score;
        for (let i = 0; i < 10; i++) bumper(engine);
        expect(engine.missionState.isCompleted('bumper-rush')).toBe(true);
        expect(engine.missionState.activeId).toBeNull();
        expect(engine.score).toBeGreaterThanOrEqual(before + BUMPER_RUSH.award);
    });

    it('fails when the timer expires', () => {
        const engine = playing();
        bank(engine);
        const commands = engine.handle({ type: 'tick', dt: BUMPER_RUSH.timeLimit + 1 });
        expect(engine.missionState.activeId).toBeNull();
        expect(engine.missionState.isCompleted('bumper-rush')).toBe(false);
        expect(commands).toContainEqual({ type: 'display', text: 'BUMPER RUSH FAILED' });
    });
});

const exit = (e: RulesEngine, id: string) => e.handle({ type: 'pathExit', id, ballId: 0 });
const spin = (e: RulesEngine) =>
    e.handle({ type: 'spinnerSpin', id: 'spinner-1', ballId: 0, angularVelocity: 5 });

describe('mission 2: spin cycle', () => {
    it('is registered', () => {
        expect(MISSIONS).toContain(SPIN_CYCLE);
    });

    it('starts after orbit then ramp, not ramp then orbit', () => {
        const wrong = playing();
        exit(wrong, 'ramp-centre');
        exit(wrong, 'orbit-left');
        expect(wrong.missionState.activeId).toBeNull();

        const engine = playing();
        exit(engine, 'orbit-left');
        const commands = exit(engine, 'ramp-centre');
        expect(engine.missionState.activeId).toBe('spin-cycle');
        expect(commands).toContainEqual({ type: 'display', text: 'SPIN CYCLE START' });
    });

    it('completes after twenty spins and awards points', () => {
        const engine = playing();
        exit(engine, 'orbit-left');
        exit(engine, 'ramp-centre');
        const before = engine.score;
        for (let i = 0; i < 20; i++) spin(engine);
        expect(engine.missionState.isCompleted('spin-cycle')).toBe(true);
        expect(engine.score).toBeGreaterThanOrEqual(before + SPIN_CYCLE.award);
    });

    it('fails when the timer expires', () => {
        const engine = playing();
        exit(engine, 'orbit-left');
        exit(engine, 'ramp-centre');
        const commands = engine.handle({ type: 'tick', dt: SPIN_CYCLE.timeLimit + 1 });
        expect(engine.missionState.isCompleted('spin-cycle')).toBe(false);
        expect(commands).toContainEqual({ type: 'display', text: 'SPIN CYCLE FAILED' });
    });
});

const lane = (e: RulesEngine, id: string) => e.handle({ type: 'laneEnter', id, ballId: 0 });
const sling = (e: RulesEngine) =>
    e.handle({ type: 'slingshot', id: 'sling-left', ballId: 0, speed: 1 });

describe('mission 3: sling shot', () => {
    it('is registered', () => {
        expect(MISSIONS).toContain(SLING_SHOT);
    });

    it('starts after two inlane hits, not outlanes', () => {
        const wrong = playing();
        lane(wrong, 'outlane-left');
        lane(wrong, 'outlane-right');
        expect(wrong.missionState.activeId).toBeNull();

        const engine = playing();
        lane(engine, 'inlane-left');
        const commands = lane(engine, 'inlane-right');
        expect(engine.missionState.activeId).toBe('sling-shot');
        expect(commands).toContainEqual({ type: 'display', text: 'SLING SHOT START' });
    });

    it('completes after eight slingshot hits and awards points', () => {
        const engine = playing();
        lane(engine, 'inlane-left');
        lane(engine, 'inlane-right');
        const before = engine.score;
        for (let i = 0; i < 8; i++) sling(engine);
        expect(engine.missionState.isCompleted('sling-shot')).toBe(true);
        expect(engine.score).toBeGreaterThanOrEqual(before + SLING_SHOT.award);
    });

    it('fails when the timer expires', () => {
        const engine = playing();
        lane(engine, 'inlane-left');
        lane(engine, 'inlane-right');
        const commands = engine.handle({ type: 'tick', dt: SLING_SHOT.timeLimit + 1 });
        expect(engine.missionState.isCompleted('sling-shot')).toBe(false);
        expect(commands).toContainEqual({ type: 'display', text: 'SLING SHOT FAILED' });
    });
});
