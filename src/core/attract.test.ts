import { describe, expect, it } from 'vitest';
import { AttractMode, FLAP_HOLD, FLAP_PERIOD, PAGE_SECONDS, scoreLine } from './attract';

const scores = [
    { initials: 'AAA', score: 12345 },
    { initials: 'BBB', score: 99 },
];

describe('AttractMode', () => {
    it('cycles title, prompt and high scores then wraps', () => {
        const a = new AttractMode();
        expect(a.text(scores)).toBe('NEON KNIGHT');
        a.update(PAGE_SECONDS);
        expect(a.text(scores)).toBe('PRESS START');
        a.update(PAGE_SECONDS);
        expect(a.text(scores)).toBe('1. AAA 12,345');
        a.update(PAGE_SECONDS * 2);
        expect(a.text(scores)).toBe('NEON KNIGHT');
    });

    it('shows only title pages with no scores and resets', () => {
        const a = new AttractMode();
        a.update(PAGE_SECONDS * 5);
        expect(a.pages([])).toHaveLength(2);
        a.reset();
        expect(a.text([])).toBe('NEON KNIGHT');
    });

    it('flaps flippers periodically', () => {
        const a = new AttractMode();
        expect(a.flippersUp()).toBe(true);
        a.update(FLAP_HOLD + 0.01);
        expect(a.flippersUp()).toBe(false);
        a.update(FLAP_PERIOD - FLAP_HOLD);
        expect(a.flippersUp()).toBe(true);
    });

    it('truncates long score lines to 20 characters', () => {
        expect(scoreLine(9, { initials: 'ZZZ', score: 123456789012 })).toHaveLength(20);
    });
});
