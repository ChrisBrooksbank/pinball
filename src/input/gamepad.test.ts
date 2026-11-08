import { describe, expect, it, vi } from 'vitest';
import { ActionState, type InputAction } from './actions';
import { GamepadInput, type PadLike } from './gamepad';

function pad(pressed: number[], values: Record<number, number> = {}, index = 0): PadLike {
    return {
        index,
        connected: true,
        buttons: Array.from({ length: 17 }, (_, i) => ({
            pressed: pressed.includes(i),
            value: values[i] ?? (pressed.includes(i) ? 1 : 0),
        })),
    };
}

function setup() {
    const events: string[] = [];
    const state = new ActionState((a: InputAction, down) => events.push(`${a}:${down}`));
    return { events, input: new GamepadInput(state) };
}

describe('GamepadInput', () => {
    it('maps triggers to flippers and releases them', () => {
        const { events, input } = setup();
        input.poll([pad([6])]);
        input.poll([pad([6])]);
        input.poll([pad([6, 7])]);
        input.poll([pad([])]);
        expect(events).toEqual([
            'flipperLeft:true',
            'flipperRight:true',
            'flipperLeft:false',
            'flipperRight:false',
        ]);
    });

    it('treats analog trigger value past the threshold as held', () => {
        const { events, input } = setup();
        input.poll([pad([], { 7: 0.2 })]);
        input.poll([pad([], { 7: 0.8 })]);
        expect(events).toEqual(['flipperRight:true']);
    });

    it('maps A to plunger and Start to start; ignores null pads', () => {
        const { events, input } = setup();
        input.poll([null, pad([0, 9])]);
        expect(events).toEqual(['plunger:true', 'start:true']);
    });

    it('releases everything when a pad disconnects', () => {
        const { events, input } = setup();
        input.poll([pad([4])]);
        input.poll([{ ...pad([4]), connected: false }]);
        expect(events).toEqual(['flipperLeft:true', 'flipperLeft:false']);
    });

    it('rumbles pads that support it and skips others', () => {
        const { input } = setup();
        const playEffect = vi.fn().mockResolvedValue(undefined);
        input.rumble([{ ...pad([]), vibrationActuator: { playEffect } }, pad([], {}, 1)], 0.5, 40);
        expect(playEffect).toHaveBeenCalledWith('dual-rumble', {
            duration: 40,
            strongMagnitude: 0.5,
            weakMagnitude: 0.5,
        });
    });
});
