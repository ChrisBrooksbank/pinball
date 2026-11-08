import { describe, expect, it } from 'vitest';
import { ActionState, type InputAction } from './actions';
import { handleKey } from './keyboard';

function setup() {
    const log: string[] = [];
    const state = new ActionState((a: InputAction, down: boolean) =>
        log.push(`${a}:${down ? 'down' : 'up'}`)
    );
    return { log, state };
}

describe('keyboard mapping', () => {
    it('maps shift and arrows to flippers, space to plunger', () => {
        const { log, state } = setup();
        handleKey(state, true, { code: 'ShiftLeft' });
        handleKey(state, true, { code: 'ArrowRight' });
        handleKey(state, true, { code: 'Space' });
        handleKey(state, false, { code: 'ShiftLeft' });
        expect(log).toEqual([
            'flipperLeft:down',
            'flipperRight:down',
            'plunger:down',
            'flipperLeft:up',
        ]);
    });

    it('ignores unbound keys', () => {
        const { log, state } = setup();
        expect(handleKey(state, true, { code: 'KeyQ' })).toBe(false);
        expect(log).toEqual([]);
    });

    it('ignores key repeat and emits once', () => {
        const { log, state } = setup();
        handleKey(state, true, { code: 'KeyZ' });
        handleKey(state, true, { code: 'KeyZ', repeat: true });
        expect(log).toEqual(['flipperLeft:down']);
    });

    it('holds an action until every source is released', () => {
        const { log, state } = setup();
        handleKey(state, true, { code: 'ShiftLeft' });
        handleKey(state, true, { code: 'ArrowLeft' });
        handleKey(state, false, { code: 'ShiftLeft' });
        expect(state.isHeld('flipperLeft')).toBe(true);
        handleKey(state, false, { code: 'ArrowLeft' });
        expect(state.isHeld('flipperLeft')).toBe(false);
        expect(log).toEqual(['flipperLeft:down', 'flipperLeft:up']);
    });
});
