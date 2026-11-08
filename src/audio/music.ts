import type { AudioContextLike, GainLike } from './sfx';

/** Semitone offsets from A4 (440 Hz); `null` is a rest. */
type Step = number | null;

/** 16-step bass line (triangle) and lead arpeggio (square), looped. A-minor, driving eighths. */
const BASS: readonly Step[] = [
    -24,
    null,
    -24,
    -12,
    -24,
    null,
    -24,
    -12,
    -28,
    null,
    -28,
    -16,
    -26,
    null,
    -26,
    -14,
];
const LEAD: readonly Step[] = [0, 3, 7, 12, 7, 3, 0, 3, 2, 5, 9, 14, 9, 5, 2, 5];

export const MUSIC_PATTERN = { bass: BASS, lead: LEAD } as const;

const STEP_SECONDS = 0.15;
const LOOKAHEAD = 0.25;

export const noteFrequency = (semitones: number): number => 440 * 2 ** (semitones / 12);

/** The audio graph pieces music needs; supplied by `Sfx` once unlocked. */
export interface MusicOutput {
    ctx: AudioContextLike;
    master: GainLike;
}

/**
 * Looping chiptune backing track. Notes are scheduled a short lookahead ahead of
 * `ctx.currentTime` from `update()` (call every frame), so no timers are needed.
 */
export class Music {
    private playing = false;
    private nextTime = 0;
    private index = 0;
    private bus: GainLike | undefined;
    private busCtx: AudioContextLike | undefined;

    constructor(private readonly getOutput: () => MusicOutput | undefined) {}

    get isPlaying(): boolean {
        return this.playing;
    }

    start(): void {
        if (this.playing) return;
        this.playing = true;
        this.nextTime = 0;
        this.index = 0;
    }

    stop(): void {
        this.playing = false;
    }

    update(): void {
        if (!this.playing) return;
        const out = this.getOutput();
        if (!out) return;
        const { ctx, master } = out;
        if (this.busCtx !== ctx) {
            this.bus = ctx.createGain();
            this.bus.gain.value = 0.35;
            this.bus.connect(master);
            this.busCtx = ctx;
        }
        const bus = this.bus;
        if (!bus) return;
        if (this.nextTime < ctx.currentTime) this.nextTime = ctx.currentTime + 0.05;
        while (this.nextTime < ctx.currentTime + LOOKAHEAD) {
            const i = this.index % BASS.length;
            this.note(ctx, bus, 'triangle', BASS[i], 0.3, this.nextTime);
            this.note(ctx, bus, 'square', LEAD[i], 0.08, this.nextTime);
            this.nextTime += STEP_SECONDS;
            this.index++;
        }
    }

    private note(
        ctx: AudioContextLike,
        bus: GainLike,
        wave: 'triangle' | 'square',
        step: Step | undefined,
        gain: number,
        start: number
    ): void {
        if (step === null || step === undefined) return;
        const end = start + STEP_SECONDS * 0.9;
        const osc = ctx.createOscillator();
        const env = ctx.createGain();
        osc.type = wave;
        osc.frequency.setValueAtTime(noteFrequency(step), start);
        env.gain.setValueAtTime(gain, start);
        env.gain.exponentialRampToValueAtTime(0.0001, end);
        osc.connect(env);
        env.connect(bus);
        osc.start(start);
        osc.stop(end + 0.01);
    }
}
