import { ActionState, type InputAction } from './actions';

const KEY_BINDINGS: Readonly<Record<string, InputAction>> = {
    ShiftLeft: 'flipperLeft',
    ArrowLeft: 'flipperLeft',
    KeyZ: 'flipperLeft',
    ShiftRight: 'flipperRight',
    ArrowRight: 'flipperRight',
    Slash: 'flipperRight',
    Space: 'plunger',
    ArrowDown: 'plunger',
    Enter: 'start',
};

/** Handle a keyboard event; returns true when the key is bound (caller should preventDefault). */
export function handleKey(
    state: ActionState,
    down: boolean,
    e: { code: string; repeat?: boolean }
): boolean {
    const action = KEY_BINDINGS[e.code];
    if (!action) return false;
    if (down) {
        if (!e.repeat) state.press(action, e.code);
    } else {
        state.release(action, e.code);
    }
    return true;
}
