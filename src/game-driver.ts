import type { PhysicsEvent } from '@core/events';
import type { LampBank } from '@core/lamps';
import type { TableSim } from '@physics/table-sim';
import { RulesEngine } from '@rules/engine';
import type { RulesCommand, RulesEvent } from '@rules/types';

/** Distance a ball must travel from its plunger start before it counts as launched (metres). */
const LAUNCH_DISTANCE = 0.05;

/**
 * Glue between the physics sim and the rules engine. Physics events go in, rules commands come out
 * and are applied to lamps, ball serving and the display text. Rules never touch physics directly;
 * this driver is the only place both are seen.
 */
export class GameDriver {
    readonly rules: RulesEngine;
    /** Latest text the rules asked to show. */
    displayText = 'PRESS START';
    /** Sound names requested since the last `takeSounds()` call. */
    private sounds: string[] = [];

    constructor(
        private readonly sim: TableSim,
        private readonly lamps: LampBank | undefined,
        rules = new RulesEngine()
    ) {
        this.rules = rules;
        sim.autoServe = false;
    }

    /** Send the start button press to the rules. */
    pressStart(): void {
        this.dispatch({ type: 'startPressed' });
    }

    /** Advance rules by `dt` seconds after the physics has been stepped; routes queued physics events. */
    update(dt: number): void {
        for (const event of this.sim.world.events.drain() as PhysicsEvent[]) this.dispatch(event);
        this.detectLaunch();
        this.dispatch({ type: 'tick', dt });
    }

    /** Sounds requested since the last call; clears the queue. */
    takeSounds(): string[] {
        const out = this.sounds;
        this.sounds = [];
        return out;
    }

    private detectLaunch(): void {
        if (this.rules.phase !== 'plunger') return;
        const start = this.sim.table.plungerLane.ballStart;
        const launched = this.sim.world.balls.some(
            b => Math.hypot(b.pos.x - start.x, b.pos.y - start.y) > LAUNCH_DISTANCE
        );
        if (launched) this.dispatch({ type: 'ballLaunched', ballId: 0 });
    }

    private dispatch(event: RulesEvent): void {
        for (const command of this.rules.handle(event)) this.apply(command);
    }

    private apply(command: RulesCommand): void {
        switch (command.type) {
            case 'lamp':
                this.applyLamp(command.id, command.mode);
                break;
            case 'display':
                this.displayText = command.text;
                break;
            case 'sound':
                this.sounds.push(command.name);
                break;
            case 'addBall':
                // The rules own the ball count; top the table up to it.
                if (this.sim.world.balls.length < this.rules.ballsOnTable) this.sim.serve();
                break;
            default:
                break;
        }
    }

    private applyLamp(id: string, mode: 'on' | 'off' | 'flash'): void {
        if (!this.lamps || !this.lamps.ids.includes(id)) return;
        if (mode === 'on') this.lamps.on(id);
        else if (mode === 'off') this.lamps.off(id);
        else this.lamps.flash(id);
    }
}
