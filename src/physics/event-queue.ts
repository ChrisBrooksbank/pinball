import type { PhysicsEvent } from '@core/events';

/** FIFO queue of physics events; the simulation pushes, the consumer drains once per frame. */
export class EventQueue {
    private items: PhysicsEvent[] = [];

    get length(): number {
        return this.items.length;
    }

    push(event: PhysicsEvent): void {
        this.items.push(event);
    }

    /** Remove and return all queued events in emission order. */
    drain(): PhysicsEvent[] {
        const out = this.items;
        this.items = [];
        return out;
    }
}
