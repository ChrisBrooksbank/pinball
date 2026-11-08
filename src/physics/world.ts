import { EventQueue } from './event-queue';
import {
    sweepCircleArc,
    sweepCircleSegment,
    type Arc,
    type Segment,
    type SweepHit,
} from './collision';
import { Flipper, type FlipperConfig } from './flipper';
import {
    createMaterials,
    type Materials,
    type SurfaceMaterial,
    type SurfaceType,
} from './materials';
import { add, scale, vec2, type Vec2 } from './vec2';

/** Standard gravity in m/s^2. */
const GRAVITY = 9.81;

interface Ball {
    pos: Vec2;
    vel: Vec2;
    radius: number;
}

interface WallSegment extends Segment {
    surface: SurfaceType;
}

interface WallArc extends Arc {
    surface: SurfaceType;
}

/** Cap on collision resolutions per step so a pinned ball cannot loop forever. */
const MAX_CONTACTS_PER_STEP = 4;
/** Gap left between ball and surface after a hit (metres). */
const CONTACT_SKIN = 1e-7;
/**
 * Approach speeds below this (m/s) are treated as resting contact: no bounce, so a ball settles
 * on a surface without jitter and friction is not inflated by the restitution term.
 */
const RESTING_SPEED = 0.1;

/**
 * Tangential losses on contact: Coulomb friction (bounded by mu * normal impulse, so it can
 * stop but never reverse the slide) plus rolling damping over the step.
 */
function applyContactLoss(
    vel: Vec2,
    normal: Vec2,
    vnBefore: number,
    restitution: number,
    mat: SurfaceMaterial,
    dt: number
): Vec2 {
    const tangent = vec2(-normal.y, normal.x);
    const vt = vel.x * tangent.x + vel.y * tangent.y;
    if (vt === 0) return vel;
    const normalImpulse = (1 + restitution) * -vnBefore;
    const afterFriction = Math.sign(vt) * Math.max(0, Math.abs(vt) - mat.friction * normalImpulse);
    const vtNew = afterFriction * Math.max(0, 1 - mat.rollingDamping * dt);
    return add(vel, scale(tangent, vtNew - vt));
}

interface WorldConfig {
    /** Playfield tilt from horizontal, in degrees. */
    tiltDegrees: number;
}

const DEFAULT_WORLD_CONFIG: WorldConfig = { tiltDegrees: 6.5 };

/** Table space: x right, y toward the player (down-screen). Units are metres. */
export class World {
    readonly balls: Ball[] = [];
    readonly segments: WallSegment[] = [];
    readonly arcs: WallArc[] = [];
    readonly flippers: Flipper[] = [];
    readonly config: WorldConfig;
    readonly events = new EventQueue();
    /** Per-surface material constants; mutable so a tuning panel can adjust them live. */
    readonly materials: Materials = createMaterials();

    constructor(config: Partial<WorldConfig> = {}) {
        this.config = { ...DEFAULT_WORLD_CONFIG, ...config };
    }

    /** Acceleration along the table's down-slope (+y) from the tilt angle. */
    get gravityAlongTable(): Vec2 {
        const a = GRAVITY * Math.sin((this.config.tiltDegrees * Math.PI) / 180);
        return vec2(0, a);
    }

    addFlipper(config: FlipperConfig): Flipper {
        const flipper = new Flipper(config);
        this.flippers.push(flipper);
        return flipper;
    }

    addBall(pos: Vec2, vel: Vec2 = vec2(), radius = 0.027): Ball {
        const ball = { pos, vel, radius };
        this.balls.push(ball);
        return ball;
    }

    addSegment(a: Vec2, b: Vec2, surface: SurfaceType = 'wall'): WallSegment {
        const wall = { a, b, surface };
        this.segments.push(wall);
        return wall;
    }

    addArc(
        center: Vec2,
        radius: number,
        startAngle: number,
        sweepAngle: number,
        surface: SurfaceType = 'wall'
    ): WallArc {
        const arc = { center, radius, startAngle, sweepAngle, surface };
        this.arcs.push(arc);
        return arc;
    }

    /** Advance the simulation by `dt` seconds (semi-implicit Euler with swept segment collisions). */
    step(dt: number): void {
        const g = this.gravityAlongTable;
        for (const flipper of this.flippers) flipper.step(dt);
        for (const ball of this.balls) {
            ball.vel = add(ball.vel, scale(g, dt));
            this.resolveFlipperPenetration(ball, dt);
            this.moveBall(ball, dt);
        }
    }

    private moveBall(ball: Ball, dt: number): void {
        let remaining = dt;
        for (let i = 0; i < MAX_CONTACTS_PER_STEP && remaining > 0; i++) {
            const d = scale(ball.vel, remaining);
            let best: SweepHit | null = null;
            let bestSurface: SurfaceType = 'wall';
            for (const seg of this.segments) {
                const hit = sweepCircleSegment(ball.pos, d, ball.radius, seg);
                if (hit && (!best || hit.t < best.t)) {
                    best = hit;
                    bestSurface = seg.surface;
                }
            }
            for (const arc of this.arcs) {
                const hit = sweepCircleArc(ball.pos, d, ball.radius, arc);
                if (hit && (!best || hit.t < best.t)) {
                    best = hit;
                    bestSurface = arc.surface;
                }
            }
            let hitFlipper: Flipper | null = null;
            for (const flipper of this.flippers) {
                const { sides, circles } = flipper.outline;
                const candidates: { hit: SweepHit | null }[] = [
                    ...sides.map(s => ({ hit: sweepCircleSegment(ball.pos, d, ball.radius, s) })),
                    ...circles.map(c => ({
                        hit: sweepCircleSegment(ball.pos, d, ball.radius + c.radius, {
                            a: c.center,
                            b: c.center,
                        }),
                    })),
                ];
                for (const { hit } of candidates) {
                    if (hit && (!best || hit.t < best.t)) {
                        best = hit;
                        bestSurface = 'flipper';
                        hitFlipper = flipper;
                    }
                }
            }
            if (!best) {
                ball.pos = add(ball.pos, d);
                return;
            }
            // Stop at the contact point, nudged off the surface to avoid re-detecting it.
            ball.pos = add(add(ball.pos, scale(d, best.t)), scale(best.normal, CONTACT_SKIN));
            this.resolveContact(ball, best.normal, bestSurface, dt, hitFlipper);
            remaining *= 1 - best.t;
        }
    }

    /** Push balls out of flippers that swung into them, then apply the flipper's surface velocity. */
    private resolveFlipperPenetration(ball: Ball, dt: number): void {
        for (const flipper of this.flippers) {
            const { point, radius } = flipper.closestOnAxis(ball.pos);
            const dx = ball.pos.x - point.x;
            const dy = ball.pos.y - point.y;
            const dist = Math.hypot(dx, dy);
            const minDist = ball.radius + radius;
            if (dist >= minDist) continue;
            const normal = dist > 0 ? vec2(dx / dist, dy / dist) : vec2(0, -1);
            ball.pos = add(point, scale(normal, minDist + CONTACT_SKIN));
            this.resolveContact(ball, normal, 'flipper', dt, flipper);
        }
    }

    /**
     * Bounce off a surface. A moving flipper contributes the surface velocity at the contact
     * point, so the response works on the ball's velocity relative to that surface.
     */
    private resolveContact(
        ball: Ball,
        normal: Vec2,
        surface: SurfaceType,
        dt: number,
        flipper: Flipper | null
    ): void {
        const mat = this.materials[surface];
        const contact = add(ball.pos, scale(normal, -ball.radius));
        const surfaceVel = flipper ? flipper.surfaceVelocity(contact) : vec2();
        const rel = vec2(ball.vel.x - surfaceVel.x, ball.vel.y - surfaceVel.y);
        const vn = rel.x * normal.x + rel.y * normal.y;
        if (vn >= 0) return;
        const resting = -vn < RESTING_SPEED;
        const restitution = resting ? 0 : mat.restitution;
        const bounced = add(rel, scale(normal, -(1 + restitution) * vn));
        const lossy = applyContactLoss(bounced, normal, vn, restitution, mat, dt);
        ball.vel = add(lossy, surfaceVel);
    }
}
