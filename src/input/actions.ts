/** Abstract player actions; every input device (keyboard, touch, gamepad) maps to these. */
export type InputAction = 'flipperLeft' | 'flipperRight' | 'plunger' | 'start';

type ActionHandler = (action: InputAction, down: boolean) => void;

/**
 * Tracks which sources (keys, touches, buttons) hold each action so that an action
 * is released only when its last source is released. Emits only on state changes.
 */
export class ActionState {
    private readonly sources = new Map<InputAction, Set<string>>();

    constructor(private readonly handler: ActionHandler) {}

    press(action: InputAction, source: string): void {
        let set = this.sources.get(action);
        if (!set) {
            set = new Set();
            this.sources.set(action, set);
        }
        const wasHeld = set.size > 0;
        set.add(source);
        if (!wasHeld) this.handler(action, true);
    }

    release(action: InputAction, source: string): void {
        const set = this.sources.get(action);
        if (!set?.delete(source) || set.size > 0) return;
        this.handler(action, false);
    }

    isHeld(action: InputAction): boolean {
        return (this.sources.get(action)?.size ?? 0) > 0;
    }
}
