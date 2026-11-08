import type { ActionState, InputAction } from './actions';

/** Fraction of the screen height (from the top) reserved for the plunger / start strip. */
const TOP_STRIP = 0.25;
/** Fraction of the screen width (from the left) of the top strip used for start. */
const START_WIDTH = 1 / 3;

/**
 * Map a normalised screen position (0..1 on each axis) to an action.
 * Lower area: left half = left flipper, right half = right flipper (large thumb zones).
 * Top strip: left third = start, remainder = plunger.
 */
export function zoneAction(nx: number, ny: number): InputAction {
    if (ny < TOP_STRIP) return nx < START_WIDTH ? 'start' : 'plunger';
    return nx < 0.5 ? 'flipperLeft' : 'flipperRight';
}

/** Tracks which action each active pointer is holding so releases hit the right action. */
export class TouchTracker {
    private readonly held = new Map<number, InputAction>();

    constructor(private readonly state: ActionState) {}

    down(id: number, nx: number, ny: number): void {
        this.up(id);
        const action = zoneAction(nx, ny);
        this.held.set(id, action);
        this.state.press(action, `touch:${id}`);
    }

    /** Pointer moved: re-evaluate its zone so sliding between flippers works. */
    move(id: number, nx: number, ny: number): void {
        const current = this.held.get(id);
        if (current === undefined) return;
        if (zoneAction(nx, ny) !== current) this.down(id, nx, ny);
    }

    up(id: number): void {
        const action = this.held.get(id);
        if (action === undefined) return;
        this.held.delete(id);
        this.state.release(action, `touch:${id}`);
    }
}

/** Attach pointer listeners to an element; touch/pen pointers drive actions. */
export function attachTouch(el: HTMLElement, state: ActionState): void {
    const tracker = new TouchTracker(state);
    const norm = (e: PointerEvent): [number, number] => {
        const r = el.getBoundingClientRect();
        return [(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height];
    };
    const isTouch = (e: PointerEvent): boolean => e.pointerType !== 'mouse';
    el.addEventListener('pointerdown', e => {
        if (!isTouch(e)) return;
        e.preventDefault();
        tracker.down(e.pointerId, ...norm(e));
    });
    el.addEventListener('pointermove', e => {
        if (isTouch(e)) tracker.move(e.pointerId, ...norm(e));
    });
    for (const type of ['pointerup', 'pointercancel', 'pointerleave'] as const) {
        el.addEventListener(type, e => {
            if (isTouch(e)) tracker.up(e.pointerId);
        });
    }
}
