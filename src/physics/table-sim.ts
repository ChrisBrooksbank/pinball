import type { TableDef } from '../table/types';
import type { Flipper } from './flipper';
import type { Plunger } from './plunger';
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

    constructor(readonly table: TableDef) {
        this.world = buildWorld(table);
        const left = this.world.flippers[table.flippers.findIndex(f => f.side === 'left')];
        const right = this.world.flippers[table.flippers.findIndex(f => f.side === 'right')];
        const plunger = this.world.plungers[0];
        if (!left || !right || !plunger) {
            throw new Error('Table needs a left flipper, a right flipper and a plunger');
        }
        this.left = left;
        this.right = right;
        this.plunger = plunger;
        this.serve();
    }

    /** Put a fresh ball on the plunger. */
    serve(): void {
        this.world.addBall(this.table.plungerLane.ballStart, undefined, this.table.ballRadius);
    }

    step(dt: number): void {
        this.world.step(dt);
        const { balls, events } = this.world;
        for (let i = balls.length - 1; i >= 0; i--) {
            const ball = balls[i];
            if (ball && ball.pos.y > this.table.drain.y) {
                balls.splice(i, 1);
                events.push({ type: 'drain', ballId: i });
                if (balls.length === 0) this.serve();
            }
        }
    }
}
