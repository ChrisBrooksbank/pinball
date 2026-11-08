import { describe, expect, it } from 'vitest';
import { LampBank } from './lamps';

describe('LampBank', () => {
    it('starts off and switches on and off by id', () => {
        const bank = new LampBank(['a', 'b']);
        expect(bank.lit('a')).toBe(false);
        bank.on('a');
        expect(bank.lit('a')).toBe(true);
        expect(bank.lit('b')).toBe(false);
        bank.off('a');
        expect(bank.lit('a')).toBe(false);
    });

    it('flashes with the requested period, starting lit', () => {
        const bank = new LampBank(['a']);
        bank.flash('a', 0.4);
        expect(bank.lit('a')).toBe(true);
        bank.update(0.1);
        expect(bank.lit('a')).toBe(true);
        bank.update(0.15); // 0.25 into the cycle: past the half period
        expect(bank.lit('a')).toBe(false);
        bank.update(0.2); // 0.45 wraps to 0.05
        expect(bank.lit('a')).toBe(true);
    });

    it('stops flashing when set on or off', () => {
        const bank = new LampBank(['a']);
        bank.flash('a', 0.2);
        bank.update(0.15);
        expect(bank.lit('a')).toBe(false);
        bank.on('a');
        expect(bank.mode('a')).toBe('on');
        expect(bank.lit('a')).toBe(true);
    });

    it('throws on unknown ids', () => {
        expect(() => new LampBank([]).on('x')).toThrow('Unknown lamp');
    });
});
