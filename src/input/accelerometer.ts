export type NudgeDirection = 'left' | 'right' | 'up';

/** Acceleration (m/s², gravity removed) a jolt must exceed to count as a nudge. */
const NUDGE_THRESHOLD = 6;
/** Minimum time between detected nudges, so one shake is a single nudge. */
const COOLDOWN_MS = 250;

/**
 * Turns raw device acceleration samples into discrete nudges.
 * Sideways jolt (x axis) nudges left/right; a forward jolt (y axis) nudges up.
 */
export class NudgeDetector {
    private lastNudgeAt = -Infinity;

    constructor(private readonly onNudge: (direction: NudgeDirection) => void) {}

    /** Feed one sample of acceleration without gravity (x right, y toward screen top). */
    sample(x: number, y: number, nowMs: number): void {
        if (nowMs - this.lastNudgeAt < COOLDOWN_MS) return;
        const ax = Math.abs(x);
        const ay = Math.abs(y);
        if (Math.max(ax, ay) < NUDGE_THRESHOLD) return;
        this.lastNudgeAt = nowMs;
        if (ax >= ay) this.onNudge(x < 0 ? 'left' : 'right');
        else this.onNudge('up');
    }
}

/** iOS 13+ exposes a static permission prompt that must be called from a user gesture. */
interface MotionEventCtor {
    requestPermission?: () => Promise<'granted' | 'denied'>;
}

/** Ask for motion access (required on iOS, a no-op grant elsewhere). Call from a user gesture. */
export async function requestMotionPermission(
    ctor: MotionEventCtor | undefined = typeof DeviceMotionEvent === 'undefined'
        ? undefined
        : (DeviceMotionEvent as unknown as MotionEventCtor)
): Promise<boolean> {
    if (!ctor) return false;
    if (typeof ctor.requestPermission !== 'function') return true;
    try {
        return (await ctor.requestPermission()) === 'granted';
    } catch {
        return false;
    }
}

/**
 * On the first user gesture, request motion permission and, if granted, start
 * listening for `devicemotion` and forwarding nudges. Only touch pointers trigger it.
 */
export function attachAccelerometer(
    el: HTMLElement,
    onNudge: (direction: NudgeDirection) => void
): void {
    const detector = new NudgeDetector(onNudge);
    let started = false;
    el.addEventListener('pointerdown', e => {
        if (started || e.pointerType === 'mouse') return;
        started = true;
        void requestMotionPermission().then(granted => {
            if (!granted) return;
            window.addEventListener('devicemotion', ev => {
                const a = ev.acceleration;
                if (a?.x != null && a.y != null) detector.sample(a.x, a.y, performance.now());
            });
        });
    });
}
