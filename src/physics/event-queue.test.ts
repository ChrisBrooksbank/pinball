import { describe, it, expect } from 'vitest';
import { EventQueue } from './event-queue';
import { World } from './world';

describe('EventQueue', () => {
    it('drains events in emission order and empties the queue', () => {
        const q = new EventQueue();
        q.push({ type: 'bumperHit', id: 'b1', ballId: 0, speed: 2 });
        q.push({ type: 'drain', ballId: 0 });
        expect(q.length).toBe(2);
        const events = q.drain();
        expect(events.map(e => e.type)).toEqual(['bumperHit', 'drain']);
        expect(q.length).toBe(0);
        expect(q.drain()).toEqual([]);
    });

    it('is exposed on World', () => {
        const world = new World();
        world.events.push({ type: 'tilt' });
        expect(world.events.drain()).toEqual([{ type: 'tilt' }]);
    });
});
