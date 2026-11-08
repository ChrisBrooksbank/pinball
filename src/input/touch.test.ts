import { describe, expect, it } from 'vitest';
import { ActionState, type InputAction } from './actions';
import { TouchTracker, zoneAction } from './touch';

function setup() {
    const log: string[] = [];
    const state = new ActionState((a: InputAction, down: boolean) =>
        log.push(`${a}:${down ? 'down' : 'up'}`)
    );
    return { log, state, tracker: new TouchTracker(state) };
}

describe('touch zones', () => {
    it('maps lower halves to flippers and top strip to start/plunger', () => {
        expect(zoneAction(0.2, 0.8)).toBe('flipperLeft');
        expect(zoneAction(0.8, 0.8)).toBe('flipperRight');
        expect(zoneAction(0.1, 0.1)).toBe('start');
        expect(zoneAction(0.8, 0.1)).toBe('plunger');
    });

    it('presses and releases per pointer, supporting multitouch', () => {
        const { log, tracker } = setup();
        tracker.down(1, 0.2, 0.9);
        tracker.down(2, 0.8, 0.9);
        tracker.up(1);
        tracker.up(2);
        expect(log).toEqual([
            'flipperLeft:down',
            'flipperRight:down',
            'flipperLeft:up',
            'flipperRight:up',
        ]);
    });

    it('switches action when a held pointer slides to another zone', () => {
        const { log, tracker } = setup();
        tracker.down(1, 0.2, 0.9);
        tracker.move(1, 0.3, 0.9);
        tracker.move(1, 0.7, 0.9);
        tracker.up(1);
        expect(log).toEqual([
            'flipperLeft:down',
            'flipperLeft:up',
            'flipperRight:down',
            'flipperRight:up',
        ]);
    });

    it('ignores move and up for unknown pointers', () => {
        const { log, tracker } = setup();
        tracker.move(9, 0.2, 0.9);
        tracker.up(9);
        expect(log).toEqual([]);
    });
});
