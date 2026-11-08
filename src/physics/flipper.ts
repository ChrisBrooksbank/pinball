import { add, vec2, type Vec2 } from './vec2';

export interface FlipperConfig {
    /** Pivot position in table space. */
    pivot: Vec2;
    /** Pivot-to-tip distance (metres). */
    length: number;
    /** Capsule radius at the pivot end. */
    baseRadius: number;
    /** Capsule radius at the tip end. */
    tipRadius: number;
    /** Angle (radians) when lowered. 0 points along +x; positive rotates toward +y (down-screen). */
    restAngle: number;
    /** Angle (radians) when fully raised. */
    upAngle: number;
    /** Angular speed swinging up (rad/s). */
    swingUpSpeed: number;
    /** Angular speed falling back to rest (rad/s). */
    swingDownSpeed: number;
}

/**
 * A flipper modelled as a rotating capsule (pivot circle to tip circle). It moves between its rest
 * and up angles at a fixed angular speed and records the angular velocity of each step so collision
 * response can add the surface velocity at the contact point.
 */
export class Flipper {
    readonly config: FlipperConfig;
    /** Current angle in radians. */
    angle: number;
    /** Angular velocity (rad/s) over the most recent step; zero when at rest or held. */
    angularVelocity = 0;
    /** True while the player holds the flipper button. */
    held = false;

    constructor(config: FlipperConfig) {
        this.config = config;
        this.angle = config.restAngle;
    }

    /** Pressing swings the flipper up and keeps it held there; releasing lets it fall back. */
    setHeld(held: boolean): void {
        this.held = held;
    }

    /** Whether the flipper has reached its up angle. */
    get isUp(): boolean {
        return this.angle === this.config.upAngle;
    }

    /** Position of the tip circle centre. */
    get tip(): Vec2 {
        const { pivot, length } = this.config;
        return add(pivot, vec2(Math.cos(this.angle) * length, Math.sin(this.angle) * length));
    }

    step(dt: number): void {
        const { restAngle, upAngle, swingUpSpeed, swingDownSpeed } = this.config;
        const target = this.held ? upAngle : restAngle;
        const speed = this.held ? swingUpSpeed : swingDownSpeed;
        const diff = target - this.angle;
        const maxMove = speed * dt;
        const move = Math.abs(diff) <= maxMove ? diff : Math.sign(diff) * maxMove;
        this.angle = Math.abs(diff) <= maxMove ? target : this.angle + move;
        this.angularVelocity = dt > 0 ? move / dt : 0;
    }
}
