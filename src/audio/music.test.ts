import { describe, expect, it } from 'vitest';
import { Music, MUSIC_PATTERN, noteFrequency, type MusicOutput } from './music';
import type { OscLike, ParamLike } from './sfx';

const param = (): ParamLike => ({
    value: 0,
    setValueAtTime: () => undefined,
    exponentialRampToValueAtTime: () => undefined,
});

function fake(): { out: MusicOutput; oscs: OscLike[]; setTime: (t: number) => void } {
    const oscs: OscLike[] = [];
    let time = 1;
    const ctx = {
        get currentTime() {
            return time;
        },
        destination: {},
        state: 'running',
        resume: () => Promise.resolve(),
        createGain: () => ({ gain: param(), connect: () => undefined }),
        createOscillator: (): OscLike => {
            const o: OscLike = {
                type: '',
                frequency: param(),
                connect: () => undefined,
                start: () => undefined,
                stop: () => undefined,
            };
            oscs.push(o);
            return o;
        },
    };
    const master = { gain: param(), connect: () => undefined };
    return { out: { ctx, master }, oscs, setTime: t => (time = t) };
}

describe('Music', () => {
    it('maps semitones to frequency', () => {
        expect(noteFrequency(0)).toBeCloseTo(440);
        expect(noteFrequency(12)).toBeCloseTo(880);
        expect(noteFrequency(-12)).toBeCloseTo(220);
    });

    it('has equal-length bass and lead patterns', () => {
        expect(MUSIC_PATTERN.bass.length).toBe(MUSIC_PATTERN.lead.length);
    });

    it('schedules nothing while stopped or locked', () => {
        const f = fake();
        const locked = new Music(() => undefined);
        locked.start();
        locked.update();
        const stopped = new Music(() => f.out);
        stopped.update();
        expect(f.oscs).toHaveLength(0);
    });

    it('schedules notes within lookahead and keeps going as time advances', () => {
        const f = fake();
        const music = new Music(() => f.out);
        music.start();
        music.update();
        const first = f.oscs.length;
        expect(first).toBeGreaterThan(0);
        music.update();
        expect(f.oscs).toHaveLength(first);
        f.setTime(3);
        music.update();
        expect(f.oscs.length).toBeGreaterThan(first);
        music.stop();
        const n = f.oscs.length;
        f.setTime(6);
        music.update();
        expect(f.oscs).toHaveLength(n);
        expect(music.isPlaying).toBe(false);
    });
});
