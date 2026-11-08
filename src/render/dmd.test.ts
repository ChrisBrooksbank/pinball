import { describe, expect, it } from 'vitest';
import { DMD_COLUMNS, DMD_ROWS, DmdDisplay, DotMatrix, drawDmdState, formatScore } from './dmd';
import { animationDuration, animationForText, drawAnimationFrame } from './dmd-animations';

function litCount(m: DotMatrix): number {
    return m.dots.reduce((a, b) => a + b, 0);
}

describe('DotMatrix', () => {
    it('draws a glyph at the requested position', () => {
        const m = new DotMatrix();
        m.drawText('I', 10, 5);
        // 'I' top row is 0b01110: columns 1..3 lit.
        expect([10, 11, 12, 13, 14].map(x => m.get(x, 5))).toEqual([
            false,
            true,
            true,
            true,
            false,
        ]);
        expect(m.get(12, 11)).toBe(true);
        expect(m.get(10, 12)).toBe(false);
    });

    it('clips text outside the display without throwing', () => {
        const m = new DotMatrix();
        m.drawText('HELLO', DMD_COLUMNS - 3, DMD_ROWS - 3);
        m.drawText('HELLO', -10, -10);
        expect(litCount(m)).toBeGreaterThan(0);
    });

    it('measures and centers text', () => {
        expect(DotMatrix.textWidth('')).toBe(0);
        expect(DotMatrix.textWidth('AB')).toBe(11);
        const m = new DotMatrix();
        m.drawTextCentered('I', 0);
        // width 5, start (128-5)/2 = 61; centre column lit
        expect(m.get(61 + 2, 0)).toBe(true);
    });

    it('renders unknown characters as a question mark', () => {
        const a = new DotMatrix();
        const b = new DotMatrix();
        a.drawText('~', 0, 0);
        b.drawText('?', 0, 0);
        expect(a.dots).toEqual(b.dots);
    });
});

describe('formatScore', () => {
    it('groups thousands and clamps negatives', () => {
        expect(formatScore(0)).toBe('0');
        expect(formatScore(1234567)).toBe('1,234,567');
        expect(formatScore(-5)).toBe('0');
    });
});

describe('drawDmdState', () => {
    it('shows the ball number only during a game', () => {
        const idle = new DotMatrix();
        const playing = new DotMatrix();
        drawDmdState(idle, { score: 0, ball: 0, text: '' });
        drawDmdState(playing, { score: 0, ball: 1, text: '' });
        expect(litCount(playing)).toBeGreaterThan(litCount(idle));
    });

    it('clears previous content on redraw', () => {
        const m = new DotMatrix();
        drawDmdState(m, { score: 999999, ball: 3, text: 'JACKPOT' });
        drawDmdState(m, { score: 0, ball: 0, text: '' });
        const fresh = new DotMatrix();
        drawDmdState(fresh, { score: 0, ball: 0, text: '' });
        expect(m.dots).toEqual(fresh.dots);
    });
});

describe('DmdDisplay', () => {
    it('exposes a texture and only redraws when the state changes', () => {
        const display = new DmdDisplay();
        const state = { score: 100, ball: 1, text: 'GO' };
        expect(display.update(state)).toBe(true);
        expect(display.update({ ...state })).toBe(false);
        expect(display.update({ ...state, score: 200 })).toBe(true);
        expect(display.texture.image.width).toBe(DMD_COLUMNS * 4);
    });

    it('writes lit dots brighter than unlit ones into the texture', () => {
        const display = new DmdDisplay();
        display.update({ score: 0, ball: 1, text: '' });
        const data = display.texture.image.data as Uint8Array;
        const reds = new Set<number>();
        for (let i = 0; i < data.length; i += 4) reds.add(data[i]!);
        expect(reds.has(255)).toBe(true);
        expect(reds.size).toBeGreaterThan(2);
    });
});

describe('DMD animations', () => {
    const base = { score: 0, ball: 1 };

    it('maps trigger messages to animations', () => {
        expect(animationForText('JACKPOT')).toBe('jackpot');
        expect(animationForText('SUPER JACKPOT')).toBe('jackpot');
        expect(animationForText('MULTIBALL')).toBe('multiball');
        expect(animationForText('EXTRA BALL')).toBe('extraBall');
        expect(animationForText('MULTIBALL OVER')).toBeNull();
        expect(animationForText('SUPER JACKPOT LIT')).toBeNull();
    });

    it.each(['jackpot', 'multiball', 'extraBall'] as const)(
        '%s draws lit dots and changes between frames',
        kind => {
            const a = new DotMatrix();
            const b = new DotMatrix();
            drawAnimationFrame(a, kind, 6, 'JACKPOT');
            drawAnimationFrame(b, kind, 9, 'JACKPOT');
            expect(litCount(a)).toBeGreaterThan(0);
            expect(a.dots).not.toEqual(b.dots);
        }
    );

    it('plays on a trigger message, advances with dt, then returns to normal', () => {
        const display = new DmdDisplay();
        display.update({ ...base, text: 'BALL 1' });
        expect(display.activeAnimation).toBeNull();

        display.update({ ...base, text: 'JACKPOT' });
        expect(display.activeAnimation).toBe('jackpot');
        expect(display.update({ ...base, text: 'JACKPOT' }, 0.01)).toBe(false);
        expect(display.update({ ...base, text: 'JACKPOT' }, 0.2)).toBe(true);

        display.update({ ...base, text: 'JACKPOT' }, animationDuration('jackpot'));
        expect(display.activeAnimation).toBeNull();

        const plain = new DotMatrix();
        drawDmdState(plain, { ...base, text: 'JACKPOT' });
        expect(display.matrix.dots).toEqual(plain.dots);
    });

    it('a new message interrupts a running animation', () => {
        const display = new DmdDisplay();
        display.update({ ...base, text: 'MULTIBALL' });
        expect(display.activeAnimation).toBe('multiball');
        display.update({ ...base, text: 'BALL SAVED' }, 0.1);
        expect(display.activeAnimation).toBeNull();
    });
});
