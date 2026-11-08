import type { TableDef } from '@/table/types';

type DressingMaterial = 'chrome' | 'accent' | 'neon' | 'gold' | 'cabinet';

/** A 3D part in table coordinates; pure data so it can be tested without three.js. */
type DressingPart =
    | {
          kind: 'post';
          x: number;
          y: number;
          radius: number;
          height: number;
          material: DressingMaterial;
      }
    | {
          kind: 'bar';
          ax: number;
          ay: number;
          bx: number;
          by: number;
          /** Height of the bar's underside above the playfield. */
          elevation: number;
          height: number;
          thickness: number;
          material: DressingMaterial;
      };

const POST_RADIUS = 0.008;
const POST_HEIGHT = 0.035;
const RAMP_LIFT = 0.03;
const RAMP_WIDTH = 0.1;
const RAIL_HEIGHT = 0.02;
const CABINET_THICKNESS = 0.04;
const CABINET_HEIGHT = 0.09;

/** Raised posts, plastic guides, ramp meshes with chrome rails, cabinet side rails and apron. */
export function buildDressing(table: TableDef): DressingPart[] {
    const parts: DressingPart[] = [];
    const { width, height } = table.bounds;

    const post = (x: number, y: number, material: DressingMaterial = 'chrome'): void => {
        parts.push({ kind: 'post', x, y, radius: POST_RADIUS, height: POST_HEIGHT, material });
    };

    // Posts at slingshot corners, flipper pivots, lane guide ends and drop-bank ends.
    for (const s of table.slingshots) {
        post(s.a.x, s.a.y, 'accent');
        post(s.b.x, s.b.y, 'accent');
    }
    for (const f of table.flippers) post(f.config.pivot.x, f.config.pivot.y, 'gold');
    for (const lane of table.lanes) {
        if (lane.kind === 'rollover') continue;
        post(lane.a.x, lane.a.y);
        post(lane.b.x, lane.b.y);
    }
    for (const bank of table.dropBanks ?? []) {
        const first = bank.targets[0];
        const last = bank.targets[bank.targets.length - 1];
        if (first) post(first.a.x, first.a.y, 'neon');
        if (last) post(last.b.x, last.b.y, 'neon');
    }
    for (const saucer of table.saucers ?? []) {
        // Ring of short posts around the saucer mouth.
        for (let i = 0; i < 6; i++) {
            const angle = (i / 6) * Math.PI * 2;
            parts.push({
                kind: 'post',
                x: saucer.center.x + Math.cos(angle) * (saucer.radius + POST_RADIUS),
                y: saucer.center.y + Math.sin(angle) * (saucer.radius + POST_RADIUS),
                radius: POST_RADIUS / 2,
                height: POST_HEIGHT / 2,
                material: 'neon',
            });
        }
    }

    // Ramps: a raised plastic deck with a chrome rail on each side.
    for (const path of table.paths) {
        if (path.kind !== 'ramp') continue;
        for (let i = 0; i + 1 < path.points.length; i++) {
            const a = path.points[i]!;
            const b = path.points[i + 1]!;
            const len = Math.hypot(b.x - a.x, b.y - a.y);
            if (len === 0) continue;
            const nx = -(b.y - a.y) / len;
            const ny = (b.x - a.x) / len;
            const half = RAMP_WIDTH / 2;
            parts.push({
                kind: 'bar',
                ax: a.x,
                ay: a.y,
                bx: b.x,
                by: b.y,
                elevation: RAMP_LIFT,
                height: 0.004,
                thickness: RAMP_WIDTH,
                material: 'neon',
            });
            for (const side of [-1, 1]) {
                parts.push({
                    kind: 'bar',
                    ax: a.x + nx * half * side,
                    ay: a.y + ny * half * side,
                    bx: b.x + nx * half * side,
                    by: b.y + ny * half * side,
                    elevation: RAMP_LIFT,
                    height: RAIL_HEIGHT,
                    thickness: 0.004,
                    material: 'chrome',
                });
            }
        }
    }

    // Cabinet side rails and the apron below the drain.
    const side = (x: number): DressingPart => ({
        kind: 'bar',
        ax: x,
        ay: -CABINET_THICKNESS,
        bx: x,
        by: height + CABINET_THICKNESS,
        elevation: 0,
        height: CABINET_HEIGHT,
        thickness: CABINET_THICKNESS,
        material: 'cabinet',
    });
    parts.push(side(-CABINET_THICKNESS / 2), side(width + CABINET_THICKNESS / 2));
    const apronRight = table.plungerLane.plunger.x - table.plungerLane.plunger.halfWidth - 0.01;
    parts.push({
        kind: 'bar',
        ax: 0,
        ay: table.drain.y + (height - table.drain.y) / 2,
        bx: apronRight,
        by: table.drain.y + (height - table.drain.y) / 2,
        elevation: 0,
        height: 0.05,
        thickness: height - table.drain.y,
        material: 'cabinet',
    });

    return parts;
}
