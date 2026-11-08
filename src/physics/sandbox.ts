import type { Flipper, FlipperConfig } from './flipper';
import type { Plunger } from './plunger';
import { vec2 } from './vec2';
import { World } from './world';

/** Playfield extents in metres (table space: x right, y toward the player). */
export const SANDBOX_WIDTH = 0.52;
export const SANDBOX_HEIGHT = 1;

const BALL_RADIUS = 0.027;
const LANE_X = 0.465;
const PLUNGER_REST_Y = 0.95;
/** Balls below this y have left the playfield through the flipper gap. */
const DRAIN_Y = 1.02;

const flipperBase = {
    length: 0.08,
    baseRadius: 0.015,
    tipRadius: 0.009,
    swingUpSpeed: 40,
    swingDownSpeed: 20,
};

const LEFT_FLIPPER: FlipperConfig = {
    ...flipperBase,
    pivot: vec2(0.11, 0.9),
    restAngle: 0.5,
    upAngle: -0.5,
};

const RIGHT_FLIPPER: FlipperConfig = {
    ...flipperBase,
    pivot: vec2(0.34, 0.9),
    restAngle: Math.PI - 0.5,
    upAngle: Math.PI + 0.5,
};

/**
 * Temporary test playfield for tuning feel: two flippers, a plunger lane, walls and one bumper.
 * Replaced by the table definition in Phase 2. Drained balls are removed and a new one is served.
 */
export class Sandbox {
    readonly world = new World();
    readonly left: Flipper;
    readonly right: Flipper;
    readonly plunger: Plunger;

    constructor() {
        const w = this.world;
        // Outer walls, plunger-lane divider and the top arch that turns the launch toward the field.
        w.addSegment(vec2(0.02, 0.26), vec2(0.02, 0.8));
        w.addSegment(vec2(0.5, 0.26), vec2(0.5, 1));
        w.addSegment(vec2(0.43, 0.32), vec2(0.43, 0.8));
        w.addSegment(vec2(0.43, 0.8), vec2(0.43, 1));
        w.addArc(vec2(0.26, 0.26), 0.24, Math.PI, Math.PI);
        // Inlane slopes feeding the flippers.
        w.addSegment(vec2(0.02, 0.8), vec2(0.1, 0.89));
        w.addSegment(vec2(0.43, 0.8), vec2(0.35, 0.89));
        w.addBumper('bumper-1', vec2(0.26, 0.45), 0.03);

        this.left = w.addFlipper(LEFT_FLIPPER);
        this.right = w.addFlipper(RIGHT_FLIPPER);
        this.plunger = w.addPlunger({
            x: LANE_X,
            restY: PLUNGER_REST_Y,
            halfWidth: 0.03,
            maxPull: 0.08,
            pullSpeed: 0.15,
            maxReleaseSpeed: 5,
        });
        this.serve();
    }

    /** Put a fresh ball on the plunger. */
    serve(): void {
        this.world.addBall(vec2(LANE_X, PLUNGER_REST_Y - BALL_RADIUS - 1e-4), vec2(), BALL_RADIUS);
    }

    step(dt: number): void {
        this.world.step(dt);
        const { balls, events } = this.world;
        for (let i = balls.length - 1; i >= 0; i--) {
            const ball = balls[i];
            if (ball && ball.pos.y > DRAIN_Y) {
                balls.splice(i, 1);
                events.push({ type: 'drain', ballId: i });
                if (balls.length === 0) this.serve();
            }
        }
    }
}
