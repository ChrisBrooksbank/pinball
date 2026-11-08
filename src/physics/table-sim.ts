import type { TableDef } from '../table/types';
import type { Flipper } from './flipper';
import type { Plunger } from './plunger';
import { movementCrossesSegment } from './path';
import { vec2 } from './vec2';
import { World } from './world';

/** Build a physics world containing the colliders and elements described by a table definition. */
export function buildWorld(table: TableDef, world = new World()): World {
    for (const wall of table.walls) world.addSegment(wall.a, wall.b, wall.surface);
    for (const arc of table.arcs) {
        world.addArc(arc.center, arc.radius, arc.startAngle, arc.sweepAngle, arc.surface);
    }
    for (const b of table.bumpers) world.addBumper(b.id, b.center, b.radius, b.kick);
    for (const s of table.slingshots) world.addSlingshot(s.id, s.a, s.b, s.kick);
    for (const t of table.targets) world.addTarget(t.id, t.a, t.b);
    for (const s of table.spinners) world.addSpinner(s.id, s.a, s.b);
    for (const bank of table.dropBanks ?? []) world.addDropBank(bank);
    for (const s of table.saucers ?? []) world.addSaucer(s.id, s.center, s.radius);
    for (const p of table.paths) world.addPath(p);
    for (const f of table.flippers) world.addFlipper(f.config);
    world.addPlunger(table.plungerLane.plunger);
    return world;
}

/**
 * A playable table: a world built from a table definition plus drain handling.
 * Drained balls are removed and a new one is served when none remain.
 */
export class TableSim {
    readonly world: World;
    readonly left: Flipper;
    readonly right: Flipper;
    readonly plunger: Plunger;
    /** Serve a new ball whenever the table empties. Turn off when the rules own ball serving. */
    autoServe = true;

    constructor(readonly table: TableDef) {
        this.world = buildWorld(table);
        const lowerIndex = (side: 'left' | 'right'): number =>
            table.flippers.findIndex(f => f.side === side && f.level !== 'upper');
        const left = this.world.flippers[lowerIndex('left')];
        const right = this.world.flippers[lowerIndex('right')];
        const plunger = this.world.plungers[0];
        if (!left || !right || !plunger) {
            throw new Error('Table needs a left flipper, a right flipper and a plunger');
        }
        this.left = left;
        this.right = right;
        this.plunger = plunger;
        this.serve();
    }

    /** Every flipper (lower and upper) driven by the given side's button. */
    flippersFor(side: 'left' | 'right'): Flipper[] {
        return this.world.flippers.filter((_, i) => this.table.flippers[i]?.side === side);
    }

    /** Put a fresh ball on the plunger. */
    serve(): void {
        this.world.addBall(
            { ...this.table.plungerLane.ballStart },
            undefined,
            this.table.ballRadius
        );
    }

    /** Ball positions before the last step, reused to avoid per-step allocation. */
    private previous: { x: number; y: number }[] = [];

    step(dt: number): void {
        const { balls, events } = this.world;
        for (let i = 0; i < balls.length; i++) {
            const ball = balls[i]!;
            const prev = (this.previous[i] ??= { x: 0, y: 0 });
            prev.x = ball.pos.x;
            prev.y = ball.pos.y;
        }
        const before = balls.length;
        this.world.step(dt);
        // Lane triggers: a ball whose centre crosses a lane line this step enters that lane.
        for (let i = 0; i < Math.min(before, balls.length); i++) {
            const ball = balls[i]!;
            const prev = this.previous[i]!;
            const delta = vec2(ball.pos.x - prev.x, ball.pos.y - prev.y);
            for (const lane of this.table.lanes) {
                if (movementCrossesSegment(prev, delta, lane.a, lane.b)) {
                    events.push({ type: 'laneEnter', id: lane.id, ballId: i });
                }
            }
        }
        for (let i = balls.length - 1; i >= 0; i--) {
            const ball = balls[i];
            if (ball && ball.pos.y > this.table.drain.y) {
                balls.splice(i, 1);
                events.push({ type: 'drain', ballId: i });
                if (balls.length === 0 && this.autoServe) this.serve();
            }
        }
    }
}
