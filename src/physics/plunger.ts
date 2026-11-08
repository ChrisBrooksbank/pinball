import type { Segment } from './collision';
import { vec2, type Vec2 } from './vec2';

export interface PlungerConfig {
    /** Lane centre line x in table space. */
    x: number;
    /** Tip face y when fully released (the ball sits above it, at smaller y). */
    restY: number;
    /** Half the width of the tip face (metres). */
    halfWidth: number;
    /** Maximum pull-back distance toward the player (metres). */
    maxPull: number;
    /** Speed the tip retracts at while the player holds it back (m/s). */
    pullSpeed: number;
    /** Tip speed on release from a full pull (m/s); scales linearly with the pull distance. */
    maxReleaseSpeed: number;
}

/**
 * A spring plunger. Holding it pulls the tip back; releasing drives the tip forward at a speed
 * proportional to the pull distance until it reaches its rest position, so a longer pull launches
 * the ball harder. The tip velocity feeds the collision response like a flipper's surface velocity.
 */
export class Plunger {
    readonly config: PlungerConfig;
    /** Current pull-back distance in metres (0 = rest, `maxPull` = fully drawn). */
    pull = 0;
    /** Tip velocity along y (m/s); negative while driving forward into the ball. */
    velocityY = 0;
    private held = false;
    private releaseSpeed = 0;

    constructor(config: PlungerConfig) {
        this.config = config;
    }

    /** Holding draws the tip back; releasing fires it with strength set by the current pull. */
    setHeld(held: boolean): void {
        if (held === this.held) return;
        this.held = held;
        if (!held)
            this.releaseSpeed = this.config.maxReleaseSpeed * (this.pull / this.config.maxPull);
    }

    /** Current y of the tip face. */
    get tipY(): number {
        return this.config.restY + this.pull;
    }

    /** The tip face as a collision segment. */
    get face(): Segment {
        const { x, halfWidth } = this.config;
        return { a: vec2(x - halfWidth, this.tipY), b: vec2(x + halfWidth, this.tipY) };
    }

    /** Surface velocity of the tip; uniform across the face. */
    surfaceVelocity(_point?: Vec2): Vec2 {
        return vec2(0, this.velocityY);
    }

    step(dt: number): void {
        const { maxPull, pullSpeed } = this.config;
        const before = this.pull;
        if (this.held) {
            this.pull = Math.min(maxPull, this.pull + pullSpeed * dt);
        } else {
            this.pull = Math.max(0, this.pull - this.releaseSpeed * dt);
            if (this.pull === 0) this.releaseSpeed = 0;
        }
        this.velocityY = dt > 0 ? (this.pull - before) / dt : 0;
    }
}
