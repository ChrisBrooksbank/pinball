/** Minimal slice of the WebAudio API we use, so tests can inject a fake. */
export interface ParamLike {
    value: number;
    setValueAtTime(value: number, time: number): unknown;
    exponentialRampToValueAtTime(value: number, time: number): unknown;
}
interface NodeLike {
    connect(dest: unknown): unknown;
}
export interface OscLike extends NodeLike {
    type: string;
    frequency: ParamLike;
    start(time: number): void;
    stop(time: number): void;
}
export interface GainLike extends NodeLike {
    gain: ParamLike;
}
export interface AudioContextLike {
    readonly currentTime: number;
    readonly destination: unknown;
    readonly state: string;
    resume(): Promise<void>;
    createOscillator(): OscLike;
    createGain(): GainLike;
}

type Wave = 'square' | 'triangle' | 'sawtooth' | 'sine';

/** One blip: a pitch sweep with a decaying envelope. */
interface Blip {
    wave: Wave;
    from: number;
    to: number;
    /** Seconds. */
    duration: number;
    gain: number;
    /** Seconds after the sound is triggered. */
    delay?: number;
}

const arp = (wave: Wave, notes: number[], step: number, gain = 0.12): Blip[] =>
    notes.map((n, i) => ({ wave, from: n, to: n, duration: step, gain, delay: i * step }));

/** Recipes by sound name (names come from the rules engine plus `flipper`). */
export const SFX: Readonly<Record<string, readonly Blip[]>> = {
    flipper: [{ wave: 'square', from: 140, to: 70, duration: 0.06, gain: 0.18 }],
    bumper: [
        { wave: 'square', from: 520, to: 880, duration: 0.09, gain: 0.16 },
        { wave: 'triangle', from: 260, to: 130, duration: 0.12, gain: 0.2 },
    ],
    slingshot: [{ wave: 'sawtooth', from: 900, to: 200, duration: 0.08, gain: 0.14 }],
    target: [{ wave: 'triangle', from: 660, to: 990, duration: 0.1, gain: 0.2 }],
    spinner: [{ wave: 'square', from: 1200, to: 1400, duration: 0.03, gain: 0.08 }],
    lane: [{ wave: 'sine', from: 500, to: 700, duration: 0.08, gain: 0.18 }],
    ramp: arp('square', [392, 523, 659], 0.05),
    orbit: arp('square', [330, 440, 554], 0.05),
    drain: [{ wave: 'sawtooth', from: 400, to: 40, duration: 0.7, gain: 0.22 }],
    ballSave: arp('triangle', [523, 392, 523], 0.08, 0.2),
    tilt: [{ wave: 'sawtooth', from: 110, to: 90, duration: 0.5, gain: 0.25 }],
    extraBall: arp('square', [523, 659, 784, 1047], 0.08),
    jackpot: arp('square', [523, 659, 784, 1047, 784, 1047, 1319], 0.07, 0.14),
    superJackpot: arp('square', [659, 784, 988, 1319, 988, 1319, 1568, 1976], 0.06, 0.14),
    multiball: arp('sawtooth', [220, 330, 440, 660], 0.09),
    combo: arp('triangle', [440, 554, 659], 0.05, 0.2),
    missionStart: arp('square', [330, 392, 494], 0.08),
    missionProgress: [{ wave: 'triangle', from: 600, to: 800, duration: 0.08, gain: 0.18 }],
    missionComplete: arp('square', [392, 494, 587, 784], 0.09),
    missionFail: arp('sawtooth', [330, 262, 196], 0.12),
    wizardStart: arp('sawtooth', [196, 247, 294, 392, 494], 0.1),
    wizardComplete: arp('square', [523, 659, 784, 1047, 1319, 1568], 0.09),
};

const FALLBACK: readonly Blip[] = [
    { wave: 'triangle', from: 440, to: 440, duration: 0.06, gain: 0.12 },
];

/** Procedural sound effects. Audio stays locked until `unlock()` is called from a user gesture. */
export class Sfx {
    private ctx: AudioContextLike | undefined;
    private master: GainLike | undefined;
    private muted = false;

    constructor(private readonly createContext: () => AudioContextLike) {}

    get isMuted(): boolean {
        return this.muted;
    }

    /** Create/resume the audio context; call from the first user gesture. */
    unlock(): void {
        if (!this.ctx) {
            this.ctx = this.createContext();
            this.master = this.ctx.createGain();
            this.master.gain.value = this.muted ? 0 : 1;
            this.master.connect(this.ctx.destination);
        }
        if (this.ctx.state === 'suspended') void this.ctx.resume();
    }

    /** Context and master gain once unlocked (music routes through the same mute). */
    get output(): { ctx: AudioContextLike; master: GainLike } | undefined {
        return this.ctx && this.master ? { ctx: this.ctx, master: this.master } : undefined;
    }

    setMuted(muted: boolean): void {
        this.muted = muted;
        if (this.master) this.master.gain.value = muted ? 0 : 1;
    }

    toggleMute(): boolean {
        this.setMuted(!this.muted);
        return this.muted;
    }

    /** Play a named sound; ignored while locked or muted. Unknown names get a default blip. */
    play(name: string): void {
        const { ctx, master } = this;
        if (!ctx || !master || this.muted) return;
        for (const blip of SFX[name] ?? FALLBACK) {
            const start = ctx.currentTime + (blip.delay ?? 0);
            const end = start + blip.duration;
            const osc = ctx.createOscillator();
            const env = ctx.createGain();
            osc.type = blip.wave;
            osc.frequency.setValueAtTime(blip.from, start);
            if (blip.to !== blip.from) osc.frequency.exponentialRampToValueAtTime(blip.to, end);
            env.gain.setValueAtTime(blip.gain, start);
            env.gain.exponentialRampToValueAtTime(0.0001, end);
            osc.connect(env);
            env.connect(master);
            osc.start(start);
            osc.stop(end + 0.01);
        }
    }
}
