import type { Vec2 } from '../physics/vec2';
import type { FlipperDef, TableDef } from './types';

const cross = (o: Vec2, a: Vec2, b: Vec2): number =>
    (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);

function segmentsIntersect(a: Vec2, b: Vec2, c: Vec2, d: Vec2): boolean {
    const d1 = cross(c, d, a);
    const d2 = cross(c, d, b);
    const d3 = cross(a, b, c);
    const d4 = cross(a, b, d);
    return d1 * d2 < 0 && d3 * d4 < 0;
}

function pointSegmentDistance(p: Vec2, a: Vec2, b: Vec2): number {
    const abx = b.x - a.x;
    const aby = b.y - a.y;
    const lenSq = abx * abx + aby * aby;
    const t =
        lenSq === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * abx + (p.y - a.y) * aby) / lenSq));
    return Math.hypot(p.x - (a.x + abx * t), p.y - (a.y + aby * t));
}

function segmentDistance(a: Vec2, b: Vec2, c: Vec2, d: Vec2): number {
    if (segmentsIntersect(a, b, c, d)) return 0;
    return Math.min(
        pointSegmentDistance(a, c, d),
        pointSegmentDistance(b, c, d),
        pointSegmentDistance(c, a, b),
        pointSegmentDistance(d, a, b)
    );
}

function flipperAxis(f: FlipperDef, angle: number): [Vec2, Vec2] {
    const { pivot, length } = f.config;
    return [
        pivot,
        { x: pivot.x + Math.cos(angle) * length, y: pivot.y + Math.sin(angle) * length },
    ];
}

/** Returns a list of human-readable problems; empty when the table is valid. */
export function validateTable(table: TableDef): string[] {
    const problems: string[] = [];
    const { width, height } = table.bounds;

    const ids = [
        ...table.walls,
        ...table.arcs,
        ...table.flippers,
        ...table.bumpers,
        ...table.slingshots,
        ...table.targets,
        ...table.spinners,
        ...table.paths,
        ...table.lanes,
        table.plungerLane,
        table.drain,
    ].map(e => e.id);
    const seen = new Set<string>();
    for (const id of ids) {
        if (seen.has(id)) problems.push(`duplicate element id: ${id}`);
        seen.add(id);
    }

    const lampIds = new Set<string>();
    for (const lamp of table.lamps) {
        if (lampIds.has(lamp.id)) problems.push(`duplicate lamp id: ${lamp.id}`);
        lampIds.add(lamp.id);
    }
    const lampRefs = [...table.bumpers, ...table.targets, ...table.lanes];
    for (const e of lampRefs) {
        if (e.lampId !== undefined && !lampIds.has(e.lampId)) {
            problems.push(`${e.id} references missing lamp ${e.lampId}`);
        }
    }

    const inBounds = (p: Vec2, margin = 0): boolean =>
        p.x >= -margin && p.x <= width + margin && p.y >= -margin && p.y <= height + margin;
    const checkPoint = (id: string, p: Vec2, margin = 0): void => {
        if (!inBounds(p, margin)) problems.push(`${id} is outside table bounds`);
    };

    for (const e of [
        ...table.walls,
        ...table.slingshots,
        ...table.targets,
        ...table.spinners,
        ...table.lanes,
    ]) {
        checkPoint(e.id, e.a);
        checkPoint(e.id, e.b);
    }
    for (const path of table.paths) {
        checkPoint(path.id, path.entry.a);
        checkPoint(path.id, path.entry.b);
        for (const p of path.points) checkPoint(path.id, p);
        if (path.points.length < 2) problems.push(`${path.id} needs at least two points`);
    }
    for (const b of table.bumpers) {
        const c = b.center;
        if (
            c.x - b.radius < 0 ||
            c.x + b.radius > width ||
            c.y - b.radius < 0 ||
            c.y + b.radius > height
        ) {
            problems.push(`${b.id} is outside table bounds`);
        }
    }
    for (const a of table.arcs) {
        const c = a.center;
        // Check the arc's end points (cheap and sufficient for authored arcs).
        for (const ang of [a.startAngle, a.startAngle + a.sweepAngle]) {
            checkPoint(
                a.id,
                { x: c.x + Math.cos(ang) * a.radius, y: c.y + Math.sin(ang) * a.radius },
                1e-9
            );
        }
    }
    for (const f of table.flippers) {
        for (const ang of [f.config.restAngle, f.config.upAngle]) {
            for (const p of flipperAxis(f, ang)) checkPoint(f.id, p);
        }
    }
    for (const l of table.lamps) checkPoint(l.id, l.pos);
    checkPoint(table.plungerLane.id, table.plungerLane.ballStart);

    // Flippers must not overlap walls at rest or fully raised.
    for (const f of table.flippers) {
        for (const ang of [f.config.restAngle, f.config.upAngle]) {
            const [p, q] = flipperAxis(f, ang);
            for (const w of table.walls) {
                if (segmentDistance(p, q, w.a, w.b) < f.config.tipRadius) {
                    problems.push(`flipper ${f.id} overlaps wall ${w.id}`);
                }
            }
        }
    }

    return problems;
}
