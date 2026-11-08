import { describe, expect, it } from 'vitest';
import { LampBank } from '@core/lamps';
import { TableSim } from '@physics/table-sim';
import { GameDriver } from '@/game-driver';
import { PLAYFIELD } from '@/table/playfield';

function setup(): { sim: TableSim; game: GameDriver } {
    const sim = new TableSim(PLAYFIELD);
    const game = new GameDriver(sim, new LampBank(PLAYFIELD.lamps.map(l => l.id)));
    return { sim, game };
}

describe('GameDriver', () => {
    it('starts in attract and does not double-serve on start', () => {
        const { sim, game } = setup();
        expect(game.rules.phase).toBe('attract');
        game.pressStart();
        expect(game.rules.phase).toBe('plunger');
        expect(game.displayText).toBe('BALL 1');
        expect(sim.world.balls.length).toBe(1);
    });

    it('detects launch and moves rules into play', () => {
        const { sim, game } = setup();
        game.pressStart();
        const ball = sim.world.balls[0];
        if (!ball) throw new Error('no ball');
        ball.pos.y -= 0.2;
        game.update(0.016);
        expect(game.rules.phase).toBe('play');
    });

    it('routes drain to the rules and does not auto-serve', () => {
        const { sim, game } = setup();
        game.pressStart();
        const ball = sim.world.balls[0];
        if (!ball) throw new Error('no ball');
        ball.pos.y -= 0.2;
        game.update(0.016);
        // Ball save is active, so the drain returns the ball to the plunger.
        ball.pos.y = PLAYFIELD.drain.y + 1;
        sim.step(0.001);
        expect(sim.world.balls.length).toBe(0);
        game.update(0.001);
        expect(sim.world.balls.length).toBe(1);
        expect(game.rules.phase).toBe('plunger');
        expect(game.displayText).toBe('BALL SAVED');
        expect(game.takeSounds()).toContain('ballSave');
    });
});
