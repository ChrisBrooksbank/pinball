import { describe, expect, it } from 'vitest';
import {
    Sfx,
    SFX,
    type AudioContextLike,
    type GainLike,
    type OscLike,
    type ParamLike,
} from './sfx';

function param(): ParamLike {
    return {
        value: 0,
        setValueAtTime: () => undefined,
        exponentialRampToValueAtTime: () => undefined,
    };
}

function fakeContext(): { ctx: AudioContextLike; oscillators: OscLike[]; resumed: () => number } {
    const oscillators: OscLike[] = [];
    let resumes = 0;
    const gain = (): GainLike => ({ gain: param(), connect: () => undefined });
    const ctx: AudioContextLike = {
        currentTime: 1,
        destination: {},
        state: 'suspended',
        resume: () => {
            resumes++;
            return Promise.resolve();
        },
        createGain: gain,
        createOscillator: () => {
            const o: OscLike = {
                type: '',
                frequency: param(),
                connect: () => undefined,
                start: () => undefined,
                stop: () => undefined,
            };
            oscillators.push(o);
            return o;
        },
    };
    return { ctx, oscillators, resumed: () => resumes };
}

describe('Sfx', () => {
    it('stays silent and creates no context until unlocked', () => {
        let created = 0;
        const f = fakeContext();
        const sfx = new Sfx(() => {
            created++;
            return f.ctx;
        });
        sfx.play('bumper');
        expect(created).toBe(0);
        expect(f.oscillators).toHaveLength(0);
        sfx.unlock();
        sfx.unlock();
        expect(created).toBe(1);
        sfx.play('bumper');
        expect(f.oscillators).toHaveLength(SFX.bumper?.length ?? -1);
    });

    it('does not play while muted and restores on unmute', () => {
        const f = fakeContext();
        const sfx = new Sfx(() => f.ctx);
        sfx.unlock();
        expect(sfx.toggleMute()).toBe(true);
        sfx.play('drain');
        expect(f.oscillators).toHaveLength(0);
        expect(sfx.toggleMute()).toBe(false);
        sfx.play('drain');
        expect(f.oscillators).toHaveLength(1);
    });

    it('keeps a mute choice made before unlock', () => {
        const f = fakeContext();
        const sfx = new Sfx(() => f.ctx);
        sfx.setMuted(true);
        sfx.unlock();
        sfx.play('target');
        expect(f.oscillators).toHaveLength(0);
    });

    it('plays a fallback blip for unknown names and has all core recipes', () => {
        const f = fakeContext();
        const sfx = new Sfx(() => f.ctx);
        sfx.unlock();
        sfx.play('nonsense');
        expect(f.oscillators).toHaveLength(1);
        for (const n of ['flipper', 'bumper', 'slingshot', 'target', 'spinner', 'drain']) {
            expect(SFX[n]?.length).toBeGreaterThan(0);
        }
    });
});
