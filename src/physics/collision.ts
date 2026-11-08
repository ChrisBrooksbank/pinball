import { length, vec2, type Vec2 } from './vec2';

export interface Segment {
    a: Vec2;
    b: Vec2;
}

export interface SweepHit {
    /** Fraction of the displacement (0..1) at which the ball first touches. */
    t: number;
    /** Unit normal at the contact, pointing from the surface toward the ball centre. */
    normal: Vec2;
}

const EPS = 1e-9;

const dot = (a: Vec2, b: Vec2): number => a.x * b.x + a.y * b.y;
const sub = (a: Vec2, b: Vec2): Vec2 => vec2(a.x - b.x, a.y - b.y);

/** Earliest touch of a moving circle with a fixed point, or null. */
function sweepCirclePoint(p0: Vec2, d: Vec2, radius: number, point: Vec2): SweepHit | null {
    const f = sub(p0, point);
    const a = dot(d, d);
    const b = 2 * dot(f, d);
    if (a === 0 || b >= 0) return null; // not moving, or moving away
    const c = dot(f, f) - radius * radius;
    const disc = b * b - 4 * a * c;
    if (disc < 0) return null;
    let t = (-b - Math.sqrt(disc)) / (2 * a);
    if (t > 1) return null;
    if (t < 0) {
        if (c > EPS) return null;
        t = 0;
    }
    const cx = f.x + d.x * t;
    const cy = f.y + d.y * t;
    const len = Math.hypot(cx, cy);
    const normal = len > 0 ? vec2(cx / len, cy / len) : vec2(0, -1);
    return { t, normal };
}

/**
 * Continuous collision of a circle moving by `d` from `p0` against a line segment
 * (including its endpoints), so fast balls cannot tunnel through thin walls.
 */
export function sweepCircleSegment(
    p0: Vec2,
    d: Vec2,
    radius: number,
    seg: Segment
): SweepHit | null {
    const ab = sub(seg.b, seg.a);
    const segLen = length(ab);
    let best: SweepHit | null = null;

    if (segLen > 0) {
        const n = vec2(-ab.y / segLen, ab.x / segLen);
        const s0 = dot(sub(p0, seg.a), n);
        const ds = dot(d, n);
        const side = s0 >= 0 ? 1 : -1;
        // Approaching the face from outside the slab of half-width `radius`.
        if (Math.abs(s0) >= radius - EPS && ds * side < 0) {
            let t = (side * radius - s0) / ds;
            if (t < 0 && t > -EPS) t = 0;
            if (t >= 0 && t <= 1) {
                const along = dot(sub(p0, seg.a), ab) / segLen + (dot(d, ab) / segLen) * t;
                if (along >= 0 && along <= segLen) {
                    best = { t, normal: vec2(n.x * side, n.y * side) };
                }
            }
        }
    }

    for (const end of [seg.a, seg.b]) {
        const hit = sweepCirclePoint(p0, d, radius, end);
        if (hit && (!best || hit.t < best.t)) best = hit;
    }
    return best;
}
