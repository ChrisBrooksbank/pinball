import { Mesh } from 'three';
import { describe, expect, it } from 'vitest';
import { TableSim } from '@physics/table-sim';
import { PLAYFIELD } from '@/table/playfield';
import { chooseRenderQuality } from './quality';
import { buildTableScene } from './scene';

describe('chooseRenderQuality', () => {
    it('caps pixel ratio lower on mobile than desktop', () => {
        expect(chooseRenderQuality({ devicePixelRatio: 3, coarsePointer: false }).pixelRatio).toBe(
            2
        );
        expect(chooseRenderQuality({ devicePixelRatio: 3, coarsePointer: true }).pixelRatio).toBe(
            1.5
        );
    });

    it('never goes below 1x and keeps low-density screens native', () => {
        expect(
            chooseRenderQuality({ devicePixelRatio: 0.5, coarsePointer: false }).pixelRatio
        ).toBe(1);
        expect(chooseRenderQuality({ devicePixelRatio: 1, coarsePointer: true }).pixelRatio).toBe(
            1
        );
    });

    it('shrinks bloom buffers on mobile', () => {
        const mobile = chooseRenderQuality({ devicePixelRatio: 2, coarsePointer: true });
        const desktop = chooseRenderQuality({ devicePixelRatio: 2, coarsePointer: false });
        expect(mobile.bloomScale).toBeLessThan(desktop.bloomScale);
    });
});

describe('draw-call budget', () => {
    it('keeps the table scene within a mesh (draw call) budget', () => {
        const { root } = buildTableScene(new TableSim(PLAYFIELD));
        let meshes = 0;
        root.traverse(o => {
            if (o instanceof Mesh) meshes++;
        });
        expect(meshes).toBeLessThanOrEqual(60);
    });
});
