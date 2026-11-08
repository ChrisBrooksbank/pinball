import { describe, expect, it } from 'vitest';
import { InitialsEntry } from './initials';

describe('InitialsEntry', () => {
    it('starts at AAA and cycles letters with wraparound', () => {
        const e = new InitialsEntry();
        expect(e.value).toBe('AAA');
        e.cycle(-1);
        expect(e.value).toBe('9AA');
        e.cycle(1);
        e.cycle(1);
        expect(e.value).toBe('BAA');
    });

    it('confirms slot by slot and finishes after the third', () => {
        const e = new InitialsEntry();
        e.cycle(1);
        expect(e.confirm()).toBe(false);
        e.cycle(1);
        e.cycle(1);
        expect(e.confirm()).toBe(false);
        expect(e.confirm()).toBe(true);
        expect(e.value).toBe('BCA');
        expect(e.done).toBe(true);
    });

    it('ignores cycling once finished', () => {
        const e = new InitialsEntry();
        e.confirm();
        e.confirm();
        e.confirm();
        e.cycle(1);
        expect(e.value).toBe('AAA');
    });

    it('brackets the active slot in the display', () => {
        const e = new InitialsEntry();
        expect(e.display).toBe('[A] _  _ ');
        e.confirm();
        expect(e.display).toBe(' A [A] _ ');
    });
});
