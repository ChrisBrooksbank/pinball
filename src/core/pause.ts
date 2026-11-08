/**
 * Frame clock that freezes while the page is hidden. On resume the clock is re-based so the
 * time spent hidden never reaches the simulation as one huge frame.
 */
export class PauseClock {
    private last: number;
    private hidden = false;

    constructor(
        start: number,
        private readonly maxFrameSeconds = 0.1
    ) {
        this.last = start;
    }

    get paused(): boolean {
        return this.hidden;
    }

    setHidden(hidden: boolean, now: number): void {
        if (this.hidden && !hidden) this.last = now;
        this.hidden = hidden;
    }

    /** Seconds to simulate for this frame (0 while paused), clamped to `maxFrameSeconds`. */
    tick(now: number): number {
        if (this.hidden) return 0;
        const frame = Math.min(Math.max((now - this.last) / 1000, 0), this.maxFrameSeconds);
        this.last = now;
        return frame;
    }
}
