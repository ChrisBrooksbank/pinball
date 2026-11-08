import { EventQueue } from './event-queue';
import { add, scale, vec2, type Vec2 } from './vec2';

/** Standard gravity in m/s^2. */
const GRAVITY = 9.81;

interface Ball {
    pos: Vec2;
    vel: Vec2;
    radius: number;
}

interface WorldConfig {
    /** Playfield tilt from horizontal, in degrees. */
    tiltDegrees: number;
}

const DEFAULT_WORLD_CONFIG: WorldConfig = { tiltDegrees: 6.5 };

/** Table space: x right, y toward the player (down-screen). Units are metres. */
export class World {
    readonly balls: Ball[] = [];
    readonly config: WorldConfig;
    readonly events = new EventQueue();

    constructor(config: Partial<WorldConfig> = {}) {
        this.config = { ...DEFAULT_WORLD_CONFIG, ...config };
    }

    /** Acceleration along the table's down-slope (+y) from the tilt angle. */
    get gravityAlongTable(): Vec2 {
        const a = GRAVITY * Math.sin((this.config.tiltDegrees * Math.PI) / 180);
        return vec2(0, a);
    }

    addBall(pos: Vec2, vel: Vec2 = vec2(), radius = 0.027): Ball {
        const ball = { pos, vel, radius };
        this.balls.push(ball);
        return ball;
    }

    /** Advance the simulation by `dt` seconds (semi-implicit Euler, no collisions yet). */
    step(dt: number): void {
        const g = this.gravityAlongTable;
        for (const ball of this.balls) {
            ball.vel = add(ball.vel, scale(g, dt));
            ball.pos = add(ball.pos, scale(ball.vel, dt));
        }
    }
}
