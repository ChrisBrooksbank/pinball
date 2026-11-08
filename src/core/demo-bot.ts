/** Ball state the demo bot reacts to (table coordinates, metres and m/s; y grows toward the player). */
interface DemoBall {
    x: number;
    y: number;
    vx: number;
    vy: number;
}

interface DemoView {
    /** The ball being played, or null when none is on the table. */
    ball: DemoBall | null;
    /** Plunger pull as a fraction of its maximum (0..1). */
    pull: number;
}

interface DemoControls {
    plunger: boolean;
    left: boolean;
    right: boolean;
    /** True once when the table has been empty long enough that a new ball should be served. */
    serve: boolean;
}

/** Plunger lane sits right of this x. */
const LANE_MIN_X = 0.86;
/** Ball must be at least this far down the lane to count as waiting at the plunger. */
const LANE_MIN_Y = 1.3;
/** Speed below which a ball in the lane is considered resting (m/s). */
const REST_SPEED = 0.3;
/** Seconds the bot waits before plunging, and after the table empties before serving. */
const PLUNGE_DELAY = 0.8;
const SERVE_DELAY = 1.6;
/** Plunger pull fractions cycled through so launches vary. */
const PULLS = [0.95, 0.75, 1, 0.85];
/** Flipper reach: ball must be inside this y band (metres) and descending or slow. */
const FLIP_Y_MIN = 1.66;
const FLIP_Y_MAX = 1.95;
/** Seconds a flip is held, and the pause before the same flipper may fire again. */
const FLIP_HOLD = 0.22;
const FLIP_COOLDOWN = 0.12;
/** Centre line separating the left and right flipper's territory. */
const CENTRE_X = 0.44;
/** Outer x limits of flipper reach. */
const LEFT_MIN_X = 0.1;
const RIGHT_MAX_X = 0.78;

/**
 * Idle demo player for attract mode. Pure and deterministic: feed it the ball each frame and it returns
 * which buttons to hold. It plunges, flips at a ball in reach, and asks for a fresh ball after a drain.
 */
export class DemoBot {
    private plungeWait = 0;
    private charging = false;
    private launches = 0;
    private leftHold = 0;
    private rightHold = 0;
    private leftCool = 0;
    private rightCool = 0;
    private emptyFor = 0;

    reset(): void {
        this.plungeWait = 0;
        this.charging = false;
        this.leftHold = this.rightHold = this.leftCool = this.rightCool = 0;
        this.emptyFor = 0;
    }

    update(dt: number, view: DemoView): DemoControls {
        const { ball } = view;
        let serve = false;
        if (!ball) {
            this.emptyFor += dt;
            this.charging = false;
            if (this.emptyFor >= SERVE_DELAY) {
                serve = true;
                this.emptyFor = 0;
            }
        } else {
            this.emptyFor = 0;
        }
        this.updateFlippers(dt, ball);
        return {
            plunger: this.updatePlunger(dt, ball, view.pull),
            left: this.leftHold > 0,
            right: this.rightHold > 0,
            serve,
        };
    }

    private updatePlunger(dt: number, ball: DemoBall | null, pull: number): boolean {
        const waiting =
            ball !== null &&
            ball.x > LANE_MIN_X &&
            ball.y > LANE_MIN_Y &&
            Math.hypot(ball.vx, ball.vy) < REST_SPEED;
        if (!waiting && !this.charging) {
            this.plungeWait = 0;
            return false;
        }
        if (this.charging) {
            if (pull >= PULLS[this.launches % PULLS.length]!) {
                this.charging = false;
                this.launches += 1;
                this.plungeWait = 0;
                return false;
            }
            return true;
        }
        this.plungeWait += dt;
        if (this.plungeWait >= PLUNGE_DELAY) this.charging = true;
        return this.charging;
    }

    private updateFlippers(dt: number, ball: DemoBall | null): void {
        this.leftHold = Math.max(0, this.leftHold - dt);
        this.rightHold = Math.max(0, this.rightHold - dt);
        this.leftCool = Math.max(0, this.leftCool - dt);
        this.rightCool = Math.max(0, this.rightCool - dt);
        if (!ball || ball.x > LANE_MIN_X || ball.vy < -0.3) return;
        // Look slightly ahead so the swing meets the ball rather than chasing it.
        const y = ball.y + ball.vy * 0.04;
        if (y < FLIP_Y_MIN || y > FLIP_Y_MAX) return;
        if (
            ball.x >= LEFT_MIN_X &&
            ball.x < CENTRE_X &&
            this.leftHold === 0 &&
            this.leftCool === 0
        ) {
            this.leftHold = FLIP_HOLD;
            this.leftCool = FLIP_HOLD + FLIP_COOLDOWN;
        } else if (
            ball.x >= CENTRE_X &&
            ball.x <= RIGHT_MAX_X &&
            this.rightHold === 0 &&
            this.rightCool === 0
        ) {
            this.rightHold = FLIP_HOLD;
            this.rightCool = FLIP_HOLD + FLIP_COOLDOWN;
        }
    }
}
