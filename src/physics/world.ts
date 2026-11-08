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
import { movementCrossesSegment, PolylinePath } from './path';
import { Plunger, type PlungerConfig } from './plunger';
import type { ScriptedPathDef } from '../table/types';
import { add, scale, vec2, type Vec2 } from './vec2';

/** Standard gravity in m/s^2. */
const GRAVITY = 9.81;

interface Ball {
    pos: Vec2;
    vel: Vec2;
    radius: number;
    /** Set while the ball is carried along a scripted path (orbit/ramp). */
    path?: { scripted: ScriptedPath; distance: number };
}

interface ScriptedPath {
    def: ScriptedPathDef;
    line: PolylinePath;
}

/** A moving collider (flipper, plunger) that contributes surface velocity to contacts. */
interface MovingSurface {
    surfaceVelocity(point: Vec2): Vec2;
}

/** Scoring element a collider belongs to; hits on it emit events (and may kick the ball). */
interface Element {
    kind: 'bumper' | 'slingshot' | 'target';
    id: string;
    /** Minimum outward speed (m/s) given to the ball along the contact normal. */
    kick: number;
}

interface WallSegment extends Segment {
    surface: SurfaceType;
    element?: Element;
}

interface PopBumper {
    center: Vec2;
    radius: number;
    element: Element;
}

/** A spinning gate the ball passes through; crossing it sets the spin rate. */
interface Spinner extends Segment {
    id: string;
    /** Spin rate in rad/s (signed by crossing direction). */
    angularVelocity: number;
    /** Spin added per m/s of ball speed across the gate (rad/s per m/s). */
    gain: number;
    /** Fraction of spin lost per second. */
    damping: number;
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
    /** Velocity change (m/s) a nudge gives every ball. */
    nudgeImpulse: number;
    /** Nudge counter value above which the table tilts. */
    nudgeTiltLimit: number;
    /** Nudge counter decay per second. */
    nudgeDecay: number;
    /** Restitution for ball-ball collisions (equal masses). */
    ballRestitution: number;
}

const DEFAULT_WORLD_CONFIG: WorldConfig = {
    tiltDegrees: 6.5,
    nudgeImpulse: 0.3,
    nudgeTiltLimit: 3,
    nudgeDecay: 1,
    ballRestitution: 0.95,
};

type NudgeDirection = 'left' | 'right' | 'up';

/** Table space: x right, y toward the player (down-screen). Units are metres. */
export class World {
    readonly balls: Ball[] = [];
    readonly segments: WallSegment[] = [];
    readonly arcs: WallArc[] = [];
    readonly flippers: Flipper[] = [];
    readonly plungers: Plunger[] = [];
    readonly bumpers: PopBumper[] = [];
    readonly spinners: Spinner[] = [];
    readonly paths: ScriptedPath[] = [];
    readonly config: WorldConfig;
    readonly events = new EventQueue();
    /** Per-surface material constants; mutable so a tuning panel can adjust them live. */
    readonly materials: Materials = createMaterials();

    constructor(config: Partial<WorldConfig> = {}) {
        this.config = { ...DEFAULT_WORLD_CONFIG, ...config };
    }

    /** Recent-nudge counter (+1 per nudge, decays over time); tilts when above the limit. */
    nudgeCount = 0;
    /** True once the table has tilted; further nudges are ignored until `resetTilt`. */
    tilted = false;

    /** Shove the table: a brief impulse on every ball, counting toward a tilt. */
    nudge(direction: NudgeDirection): void {
        if (this.tilted) return;
        const dv = this.config.nudgeImpulse;
        const kick =
            direction === 'left'
                ? vec2(-dv, 0)
                : direction === 'right'
                  ? vec2(dv, 0)
                  : vec2(0, -dv);
        for (const ball of this.balls) ball.vel = add(ball.vel, kick);
        this.nudgeCount += 1;
        if (this.nudgeCount > this.config.nudgeTiltLimit) {
            this.tilted = true;
            this.events.push({ type: 'tilt' });
        }
    }

    resetTilt(): void {
        this.tilted = false;
        this.nudgeCount = 0;
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

    addPlunger(config: PlungerConfig): Plunger {
        const plunger = new Plunger(config);
        this.plungers.push(plunger);
        return plunger;
    }

    addBumper(id: string, center: Vec2, radius: number, kick = 3): PopBumper {
        const bumper = { center, radius, element: { kind: 'bumper' as const, id, kick } };
        this.bumpers.push(bumper);
        return bumper;
    }

    /** Rubber kicker along a segment that pushes the ball away from its face. */
    addSlingshot(id: string, a: Vec2, b: Vec2, kick = 3): WallSegment {
        const wall: WallSegment = {
            a,
            b,
            surface: 'rubber',
            element: { kind: 'slingshot', id, kick },
        };
        this.segments.push(wall);
        return wall;
    }

    addTarget(id: string, a: Vec2, b: Vec2): WallSegment {
        const wall: WallSegment = {
            a,
            b,
            surface: 'target',
            element: { kind: 'target', id, kick: 0 },
        };
        this.segments.push(wall);
        return wall;
    }

    addSpinner(id: string, a: Vec2, b: Vec2, gain = 40, damping = 1.5): Spinner {
        const spinner = { id, a, b, angularVelocity: 0, gain, damping };
        this.spinners.push(spinner);
        return spinner;
    }

    /** Scripted orbit/ramp: balls crossing the entry are carried along the path, then released. */
    addPath(def: ScriptedPathDef): ScriptedPath {
        const path = { def, line: new PolylinePath(def.points) };
        this.paths.push(path);
        return path;
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
        this.nudgeCount = Math.max(0, this.nudgeCount - this.config.nudgeDecay * dt);
        for (const flipper of this.flippers) flipper.step(dt);
        for (const plunger of this.plungers) plunger.step(dt);
        for (const ball of this.balls) {
            if (ball.path) {
                this.advanceOnPath(ball, dt);
                continue;
            }
            if (this.checkPathEntry(ball, dt)) continue;
            ball.vel = add(ball.vel, scale(g, dt));
            this.resolveFlipperPenetration(ball, dt);
            this.resolvePlungerPenetration(ball, dt);
            this.checkSpinners(ball, dt);
            this.moveBall(ball, dt);
        }
        this.collideBalls();
        for (const sp of this.spinners) {
            sp.angularVelocity *= Math.max(0, 1 - sp.damping * dt);
        }
    }

    /** Simple circle-circle collision for multiball: separate overlaps and exchange normal velocity. */
    private collideBalls(): void {
        for (let i = 0; i < this.balls.length; i++) {
            for (let j = i + 1; j < this.balls.length; j++) {
                const a = this.balls[i]!;
                const b = this.balls[j]!;
                const dx = b.pos.x - a.pos.x;
                const dy = b.pos.y - a.pos.y;
                const minDist = a.radius + b.radius;
                const distSq = dx * dx + dy * dy;
                if (distSq >= minDist * minDist) continue;
                const dist = Math.sqrt(distSq);
                // Coincident balls: separate along an arbitrary but fixed axis (deterministic).
                const normal = dist > 0 ? vec2(dx / dist, dy / dist) : vec2(1, 0);
                const push = (minDist - dist) / 2 + CONTACT_SKIN;
                a.pos = add(a.pos, scale(normal, -push));
                b.pos = add(b.pos, scale(normal, push));
                const vn = (b.vel.x - a.vel.x) * normal.x + (b.vel.y - a.vel.y) * normal.y;
                if (vn >= 0) continue;
                const restitution = -vn < RESTING_SPEED ? 0 : this.config.ballRestitution;
                const j2 = (-(1 + restitution) * vn) / 2;
                a.vel = add(a.vel, scale(normal, -j2));
                b.vel = add(b.vel, scale(normal, j2));
            }
        }
    }

    /** Capture the ball onto a scripted path if it crosses an entry trigger this step. */
    private checkPathEntry(ball: Ball, dt: number): boolean {
        const d = scale(ball.vel, dt);
        const speed = Math.hypot(ball.vel.x, ball.vel.y);
        for (const scripted of this.paths) {
            const { entry, entryDirection, minSpeed, id } = scripted.def;
            if (speed < minSpeed) continue;
            if (ball.vel.x * entryDirection.x + ball.vel.y * entryDirection.y <= 0) continue;
            if (!movementCrossesSegment(ball.pos, d, entry.a, entry.b)) continue;
            ball.path = { scripted, distance: 0 };
            ball.pos = scripted.line.positionAt(0);
            ball.vel = vec2();
            this.events.push({ type: 'pathEnter', id, ballId: this.balls.indexOf(ball) });
            return true;
        }
        return false;
    }

    /** Move a captured ball along its path; release it with the exit velocity at the end. */
    private advanceOnPath(ball: Ball, dt: number): void {
        const state = ball.path;
        if (!state) return;
        const { line, def } = state.scripted;
        state.distance += def.speed * dt;
        ball.pos = line.positionAt(state.distance);
        if (state.distance < line.length) return;
        ball.vel = scale(line.exitDirection, def.exitSpeed);
        ball.path = undefined;
        this.events.push({ type: 'pathExit', id: def.id, ballId: this.balls.indexOf(ball) });
    }

    /** Detect the ball centre crossing a spinner this step and spin it up in proportion to speed. */
    private checkSpinners(ball: Ball, dt: number): void {
        const d = scale(ball.vel, dt);
        for (const sp of this.spinners) {
            const ex = sp.b.x - sp.a.x;
            const ey = sp.b.y - sp.a.y;
            const denom = d.x * ey - d.y * ex;
            if (denom === 0) continue;
            const fx = sp.a.x - ball.pos.x;
            const fy = sp.a.y - ball.pos.y;
            const t = (fx * ey - fy * ex) / denom;
            const u = (fx * d.y - fy * d.x) / denom;
            if (t < 0 || t >= 1 || u < 0 || u > 1) continue;
            const len = Math.hypot(ex, ey);
            // Velocity component across the gate, signed by which way the ball crosses.
            const across = (ball.vel.x * ey - ball.vel.y * ex) / len;
            sp.angularVelocity = across * sp.gain;
            this.events.push({
                type: 'spinnerSpin',
                id: sp.id,
                ballId: this.balls.indexOf(ball),
                angularVelocity: sp.angularVelocity,
            });
        }
    }

    private moveBall(ball: Ball, dt: number): void {
        let remaining = dt;
        for (let i = 0; i < MAX_CONTACTS_PER_STEP && remaining > 0; i++) {
            const d = scale(ball.vel, remaining);
            let best: SweepHit | null = null;
            let bestSurface: SurfaceType = 'wall';
            let bestElement: Element | null = null;
            for (const seg of this.segments) {
                const hit = sweepCircleSegment(ball.pos, d, ball.radius, seg);
                if (hit && (!best || hit.t < best.t)) {
                    best = hit;
                    bestSurface = seg.surface;
                    bestElement = seg.element ?? null;
                }
            }
            for (const arc of this.arcs) {
                const hit = sweepCircleArc(ball.pos, d, ball.radius, arc);
                if (hit && (!best || hit.t < best.t)) {
                    best = hit;
                    bestSurface = arc.surface;
                    bestElement = null;
                }
            }
            let hitMover: MovingSurface | null = null;
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
                        bestElement = null;
                        hitMover = flipper;
                    }
                }
            }
            for (const plunger of this.plungers) {
                const hit = sweepCircleSegment(ball.pos, d, ball.radius, plunger.face);
                if (hit && (!best || hit.t < best.t)) {
                    best = hit;
                    bestSurface = 'plunger';
                    bestElement = null;
                    hitMover = plunger;
                }
            }
            for (const bumper of this.bumpers) {
                const hit = sweepCircleSegment(ball.pos, d, ball.radius + bumper.radius, {
                    a: bumper.center,
                    b: bumper.center,
                });
                if (hit && (!best || hit.t < best.t)) {
                    best = hit;
                    bestSurface = 'bumper';
                    bestElement = bumper.element;
                    hitMover = null;
                }
            }
            if (!best) {
                ball.pos = add(ball.pos, d);
                return;
            }
            // Stop at the contact point, nudged off the surface to avoid re-detecting it.
            ball.pos = add(add(ball.pos, scale(d, best.t)), scale(best.normal, CONTACT_SKIN));
            const impact = -(ball.vel.x * best.normal.x + ball.vel.y * best.normal.y);
            this.resolveContact(ball, best.normal, bestSurface, dt, hitMover);
            if (bestElement && impact > 0) this.hitElement(ball, best.normal, bestElement, impact);
            remaining *= 1 - best.t;
        }
    }

    /** Apply an element's kick and emit its event. `impact` is the approach speed into the surface. */
    private hitElement(ball: Ball, normal: Vec2, element: Element, impact: number): void {
        const out = ball.vel.x * normal.x + ball.vel.y * normal.y;
        if (out < element.kick) ball.vel = add(ball.vel, scale(normal, element.kick - out));
        const ballId = this.balls.indexOf(ball);
        switch (element.kind) {
            case 'bumper':
                this.events.push({ type: 'bumperHit', id: element.id, ballId, speed: impact });
                break;
            case 'slingshot':
                this.events.push({ type: 'slingshot', id: element.id, ballId, speed: impact });
                break;
            case 'target':
                this.events.push({ type: 'targetHit', id: element.id, ballId });
                break;
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

    /** Push a ball above the plunger tip out of it when the tip drives forward into the ball. */
    private resolvePlungerPenetration(ball: Ball, dt: number): void {
        for (const plunger of this.plungers) {
            const { x, halfWidth } = plunger.config;
            if (Math.abs(ball.pos.x - x) > halfWidth) continue;
            const tipY = plunger.tipY;
            if (ball.pos.y > tipY || ball.pos.y + ball.radius <= tipY) continue;
            ball.pos = vec2(ball.pos.x, tipY - ball.radius - CONTACT_SKIN);
            this.resolveContact(ball, vec2(0, -1), 'plunger', dt, plunger);
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
        mover: MovingSurface | null
    ): void {
        const mat = this.materials[surface];
        const contact = add(ball.pos, scale(normal, -ball.radius));
        const surfaceVel = mover ? mover.surfaceVelocity(contact) : vec2();
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
