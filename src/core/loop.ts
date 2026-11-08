/**
 * Fixed-timestep accumulator. Decouples simulation rate from render rate so physics
 * stays deterministic regardless of display refresh.
 */
export class FixedStepper {
    private accumulator = 0;

    constructor(
        private readonly stepSeconds: number,
        private readonly maxStepsPerFrame = 50
    ) {}

    /** Advance by `frameSeconds`, calling `step` zero or more times. Returns steps run. */
    advance(frameSeconds: number, step: (dt: number) => void): number {
        this.accumulator += frameSeconds;
        let steps = 0;
        while (this.accumulator >= this.stepSeconds && steps < this.maxStepsPerFrame) {
            step(this.stepSeconds);
            this.accumulator -= this.stepSeconds;
            steps++;
        }
        if (steps === this.maxStepsPerFrame) this.accumulator = 0; // drop backlog after a stall
        return steps;
    }
}
