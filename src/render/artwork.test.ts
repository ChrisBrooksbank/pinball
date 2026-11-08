import { describe, expect, it } from 'vitest';
import { PLAYFIELD } from '@/table/playfield';
import { buildArtworkOps, paintArtwork, type PaintContext } from './artwork';

function fakeContext(): PaintContext & { calls: string[] } {
    const calls: string[] = [];
    const rec = (name: string) => (): void => {
        calls.push(name);
    };
    return {
        calls,
        fillStyle: '',
        strokeStyle: '',
        lineWidth: 0,
        font: '',
        textAlign: 'left',
        textBaseline: 'alphabetic',
        fillRect: rec('fillRect'),
        beginPath: rec('beginPath'),
        arc: rec('arc'),
        moveTo: rec('moveTo'),
        lineTo: rec('lineTo'),
        closePath: rec('closePath'),
        fill: rec('fill'),
        stroke: rec('stroke'),
        fillText: rec('fillText'),
    };
}

describe('playfield artwork', () => {
    const ops = buildArtworkOps(PLAYFIELD);

    it('fills the whole playfield first', () => {
        expect(ops[0]).toMatchObject({
            kind: 'rect',
            x: 0,
            y: 0,
            w: PLAYFIELD.bounds.width,
            h: PLAYFIELD.bounds.height,
        });
    });

    it('draws an insert socket aligned to every lamp', () => {
        for (const lamp of PLAYFIELD.lamps) {
            const socket = ops.find(
                op =>
                    op.kind === 'circle' &&
                    op.x === lamp.pos.x &&
                    op.y === lamp.pos.y &&
                    op.stroke === lamp.color
            );
            expect(socket, lamp.id).toBeDefined();
        }
    });

    it('draws arrows for lanes and scripted paths, and the title', () => {
        const arrows = ops.filter(op => op.kind === 'arrow').length;
        expect(arrows).toBe(PLAYFIELD.lanes.length + PLAYFIELD.paths.length);
        expect(ops.some(op => op.kind === 'text' && op.text === 'NEON KNIGHT')).toBe(true);
    });

    it('keeps all art inside the playfield bounds', () => {
        const { width, height } = PLAYFIELD.bounds;
        for (const op of ops) {
            if (op.kind === 'circle' || op.kind === 'arrow' || op.kind === 'text') {
                expect(op.x).toBeGreaterThanOrEqual(0);
                expect(op.x).toBeLessThanOrEqual(width);
                expect(op.y).toBeGreaterThanOrEqual(0);
                expect(op.y).toBeLessThanOrEqual(height);
            }
        }
    });

    it('paints every op onto a context', () => {
        const ctx = fakeContext();
        paintArtwork(ctx, ops, 100);
        expect(ctx.calls).toContain('fillRect');
        expect(ctx.calls).toContain('arc');
        expect(ctx.calls).toContain('fillText');
        expect(ctx.calls.filter(c => c === 'stroke').length).toBeGreaterThan(10);
    });
});
