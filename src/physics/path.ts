import { vec2, type Vec2 } from './vec2';

/** A polyline the ball is carried along; precomputes cumulative lengths for position lookup. */
export class PolylinePath {
    readonly length: number;
    private readonly cumulative: number[] = [0];

    constructor(readonly points: readonly Vec2[]) {
        let total = 0;
        for (let i = 1; i < points.length; i++) {
            const a = points[i - 1]!;
            const b = points[i]!;
            total += Math.hypot(b.x - a.x, b.y - a.y);
            this.cumulative.push(total);
        }
        this.length = total;
    }

    /** Position after travelling `distance` along the path (clamped to its ends). */
    positionAt(distance: number): Vec2 {
        const d = Math.max(0, Math.min(this.length, distance));
        for (let i = 1; i < this.points.length; i++) {
            const end = this.cumulative[i]!;
            if (d <= end) {
                const a = this.points[i - 1]!;
                const b = this.points[i]!;
                const start = this.cumulative[i - 1]!;
                const t = end === start ? 0 : (d - start) / (end - start);
                return vec2(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t);
            }
        }
        return this.points[this.points.length - 1] ?? vec2();
    }

    /** Unit direction of the final non-degenerate segment. */
    get exitDirection(): Vec2 {
        for (let i = this.points.length - 1; i > 0; i--) {
            const a = this.points[i - 1]!;
            const b = this.points[i]!;
            const len = Math.hypot(b.x - a.x, b.y - a.y);
            if (len > 0) return vec2((b.x - a.x) / len, (b.y - a.y) / len);
        }
        return vec2(0, -1);
    }
}

/** True when the movement from `from` by `delta` crosses segment a-b. */
export function movementCrossesSegment(from: Vec2, delta: Vec2, a: Vec2, b: Vec2): boolean {
    const ex = b.x - a.x;
    const ey = b.y - a.y;
    const denom = delta.x * ey - delta.y * ex;
    if (denom === 0) return false;
    const fx = a.x - from.x;
    const fy = a.y - from.y;
    const t = (fx * ey - fy * ex) / denom;
    const u = (fx * delta.y - fy * delta.x) / denom;
    return t >= 0 && t < 1 && u >= 0 && u <= 1;
}
