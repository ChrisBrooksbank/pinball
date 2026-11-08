import { CanvasTexture, SRGBColorSpace, type Texture } from 'three';
import type { TableDef } from '@/table/types';
import { PALETTE } from './palette';

/** Pixels of artwork texture per metre of playfield. */
const PIXELS_PER_METRE = 640;

const hex = (c: number): string => `#${c.toString(16).padStart(6, '0')}`;

/** A resolution-independent drawing op in table coordinates (metres); testable without a canvas. */
type ArtOp =
    | { kind: 'rect'; x: number; y: number; w: number; h: number; fill: string }
    | {
          kind: 'circle';
          x: number;
          y: number;
          r: number;
          fill?: string;
          stroke?: string;
          width?: number;
      }
    | {
          kind: 'line';
          ax: number;
          ay: number;
          bx: number;
          by: number;
          stroke: string;
          width: number;
      }
    | { kind: 'arrow'; x: number; y: number; size: number; angle: number; fill: string }
    | { kind: 'text'; x: number; y: number; size: number; text: string; fill: string };

/** Minimal Canvas2D surface used by the painter (lets tests supply a recording fake). */
export interface PaintContext {
    fillStyle: string | CanvasGradient | CanvasPattern;
    strokeStyle: string | CanvasGradient | CanvasPattern;
    lineWidth: number;
    font: string;
    textAlign: CanvasTextAlign;
    textBaseline: CanvasTextBaseline;
    fillRect(x: number, y: number, w: number, h: number): void;
    beginPath(): void;
    arc(x: number, y: number, r: number, a0: number, a1: number): void;
    moveTo(x: number, y: number): void;
    lineTo(x: number, y: number): void;
    closePath(): void;
    fill(): void;
    stroke(): void;
    fillText(text: string, x: number, y: number): void;
}

/** Compute the playfield illustration (original "Neon Knight" theme) from the table definition. */
export function buildArtworkOps(table: TableDef): ArtOp[] {
    const { width, height } = table.bounds;
    const ops: ArtOp[] = [];
    const cx = width / 2;
    const magenta = hex(PALETTE.magenta);
    const cyan = hex(PALETTE.cyan);
    const gold = hex(PALETTE.gold);

    ops.push({ kind: 'rect', x: 0, y: 0, w: width, h: height, fill: hex(PALETTE.playfield) });

    // Sunburst rays behind the bumper cluster, then concentric rings: the "moon over the keep".
    const bumperCx =
        table.bumpers.reduce((s, b) => s + b.center.x, 0) / (table.bumpers.length || 1);
    const bumperCy =
        table.bumpers.reduce((s, b) => s + b.center.y, 0) / (table.bumpers.length || 1);
    for (let i = 0; i < 16; i++) {
        const angle = (i * Math.PI * 2) / 16;
        ops.push({
            kind: 'line',
            ax: bumperCx,
            ay: bumperCy,
            bx: bumperCx + Math.cos(angle) * width,
            by: bumperCy + Math.sin(angle) * width,
            stroke: i % 2 === 0 ? '#1a0f3d' : '#140a30',
            width: 0.03,
        });
    }
    for (const [r, color] of [
        [0.26, magenta],
        [0.2, cyan],
        [0.14, gold],
    ] as const) {
        ops.push({ kind: 'circle', x: bumperCx, y: bumperCy, r, stroke: color, width: 0.004 });
    }

    // Title banner across the mid playfield.
    ops.push({
        kind: 'text',
        x: cx,
        y: height * 0.46,
        size: 0.075,
        text: 'NEON KNIGHT',
        fill: magenta,
    });

    // Lane graphics: guide lines and a direction arrow above each lane trigger.
    for (const lane of table.lanes) {
        const mx = (lane.a.x + lane.b.x) / 2;
        const color = { inlane: gold, outlane: hex(0xff3b30), rollover: cyan }[lane.kind];
        ops.push({
            kind: 'line',
            ax: lane.a.x,
            ay: lane.a.y,
            bx: lane.b.x,
            by: lane.b.y,
            stroke: color,
            width: 0.006,
        });
        ops.push({
            kind: 'arrow',
            x: mx,
            y: lane.a.y - 0.05,
            size: 0.025,
            angle: Math.PI / 2,
            fill: color,
        });
    }

    // Shot arrows at orbit/ramp entries, aimed along the entry direction.
    for (const path of table.paths) {
        const x = (path.entry.a.x + path.entry.b.x) / 2;
        const y = (path.entry.a.y + path.entry.b.y) / 2;
        const angle = Math.atan2(path.entryDirection.y, path.entryDirection.x);
        ops.push({
            kind: 'arrow',
            x,
            y,
            size: 0.035,
            angle,
            fill: path.kind === 'ramp' ? magenta : cyan,
        });
    }

    // Pop bumper skirts, saucer and spinner emblems.
    for (const b of table.bumpers) {
        ops.push({
            kind: 'circle',
            x: b.center.x,
            y: b.center.y,
            r: b.radius * 1.9,
            stroke: magenta,
            width: 0.004,
        });
    }
    for (const s of table.saucers ?? []) {
        ops.push({
            kind: 'circle',
            x: s.center.x,
            y: s.center.y,
            r: s.radius * 1.6,
            stroke: gold,
            width: 0.005,
        });
    }
    for (const s of table.spinners) {
        ops.push({
            kind: 'line',
            ax: s.a.x,
            ay: s.a.y,
            bx: s.b.x,
            by: s.b.y,
            stroke: cyan,
            width: 0.02,
        });
    }

    // Rubber/plastic slingshot panels.
    for (const s of table.slingshots) {
        ops.push({
            kind: 'line',
            ax: s.a.x,
            ay: s.a.y,
            bx: s.b.x,
            by: s.b.y,
            stroke: magenta,
            width: 0.03,
        });
    }

    // Insert graphics: a dark socket plus coloured ring under every lamp, aligned to lamp positions.
    for (const lamp of table.lamps) {
        ops.push({
            kind: 'circle',
            x: lamp.pos.x,
            y: lamp.pos.y,
            r: 0.02,
            fill: '#05020f',
            stroke: lamp.color,
            width: 0.003,
        });
    }

    return ops;
}

/** Paint ops onto a canvas context at `scale` pixels per metre. */
export function paintArtwork(ctx: PaintContext, ops: readonly ArtOp[], scale: number): void {
    for (const op of ops) {
        switch (op.kind) {
            case 'rect':
                ctx.fillStyle = op.fill;
                ctx.fillRect(op.x * scale, op.y * scale, op.w * scale, op.h * scale);
                break;
            case 'circle':
                ctx.beginPath();
                ctx.arc(op.x * scale, op.y * scale, op.r * scale, 0, Math.PI * 2);
                if (op.fill) {
                    ctx.fillStyle = op.fill;
                    ctx.fill();
                }
                if (op.stroke) {
                    ctx.strokeStyle = op.stroke;
                    ctx.lineWidth = (op.width ?? 0.003) * scale;
                    ctx.stroke();
                }
                break;
            case 'line':
                ctx.beginPath();
                ctx.moveTo(op.ax * scale, op.ay * scale);
                ctx.lineTo(op.bx * scale, op.by * scale);
                ctx.strokeStyle = op.stroke;
                ctx.lineWidth = op.width * scale;
                ctx.stroke();
                break;
            case 'arrow': {
                const tip = (a: number, d: number): [number, number] => [
                    (op.x + Math.cos(op.angle + a) * op.size * d) * scale,
                    (op.y + Math.sin(op.angle + a) * op.size * d) * scale,
                ];
                const [x0, y0] = tip(0, 1);
                const [x1, y1] = tip(Math.PI * 0.8, 0.8);
                const [x2, y2] = tip(-Math.PI * 0.8, 0.8);
                ctx.beginPath();
                ctx.moveTo(x0, y0);
                ctx.lineTo(x1, y1);
                ctx.lineTo(x2, y2);
                ctx.closePath();
                ctx.fillStyle = op.fill;
                ctx.fill();
                break;
            }
            case 'text':
                ctx.fillStyle = op.fill;
                ctx.font = `bold ${op.size * scale}px monospace`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(op.text, op.x * scale, op.y * scale);
                break;
        }
    }
}

/** Generate the playfield texture, or `undefined` where no DOM canvas exists (headless tests). */
export function createPlayfieldTexture(table: TableDef): Texture | undefined {
    if (typeof document === 'undefined') return undefined;
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(table.bounds.width * PIXELS_PER_METRE);
    canvas.height = Math.round(table.bounds.height * PIXELS_PER_METRE);
    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;
    paintArtwork(ctx, buildArtworkOps(table), PIXELS_PER_METRE);
    const texture = new CanvasTexture(canvas);
    texture.colorSpace = SRGBColorSpace;
    texture.anisotropy = 4;
    return texture;
}
