import type { ActionState, InputAction } from './actions';

/** Minimal gamepad shape we rely on (subset of the DOM `Gamepad`), so tests can mock it. */
export interface PadLike {
    readonly index: number;
    readonly connected: boolean;
    readonly buttons: readonly { readonly pressed: boolean; readonly value: number }[];
    readonly vibrationActuator?: {
        playEffect?: (type: 'dual-rumble', params: Record<string, number>) => Promise<unknown>;
    } | null;
}

/** Analog trigger value above which the button counts as held. */
const TRIGGER_THRESHOLD = 0.4;

/** Standard-mapping button indices -> actions (triggers/bumpers flip, A plunges, Start starts). */
const BUTTON_BINDINGS: readonly (readonly [number, InputAction])[] = [
    [4, 'flipperLeft'], // LB
    [6, 'flipperLeft'], // LT
    [14, 'flipperLeft'], // D-pad left
    [5, 'flipperRight'], // RB
    [7, 'flipperRight'], // RT
    [15, 'flipperRight'], // D-pad right
    [0, 'plunger'], // A
    [13, 'plunger'], // D-pad down
    [9, 'start'], // Start
];

/** Polls gamepads each frame, translating button state into ActionState presses/releases. */
export class GamepadInput {
    constructor(private readonly state: ActionState) {}

    /** Call once per frame with the current pads (e.g. `navigator.getGamepads()`). */
    poll(pads: readonly (PadLike | null)[]): void {
        for (const pad of pads) {
            if (!pad) continue;
            const source = `pad:${pad.index}`;
            const held = new Set<InputAction>();
            if (pad.connected) {
                for (const [index, action] of BUTTON_BINDINGS) {
                    const b = pad.buttons[index];
                    if (b && (b.pressed || b.value > TRIGGER_THRESHOLD)) held.add(action);
                }
            }
            for (const [, action] of BUTTON_BINDINGS) {
                if (held.has(action)) this.state.press(action, source);
                else this.state.release(action, source);
            }
        }
    }

    /** Short rumble on every pad that supports it; silently ignored elsewhere. */
    rumble(pads: readonly (PadLike | null)[], strength: number, durationMs: number): void {
        for (const pad of pads) {
            const play = pad?.vibrationActuator?.playEffect;
            if (!pad || !play) continue;
            void play
                .call(pad.vibrationActuator, 'dual-rumble', {
                    duration: durationMs,
                    strongMagnitude: strength,
                    weakMagnitude: strength,
                })
                .catch(() => undefined);
        }
    }
}
