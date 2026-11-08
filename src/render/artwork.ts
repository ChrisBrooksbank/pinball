import { CanvasTexture, SRGBColorSpace, type Texture } from 'three';
import type { TableDef } from '@/table/types';
import { PALETTE } from './palette';

/** Pixels of artwork texture per metre of playfield. */
const PIXELS_PER_METRE = 768;

const hex = (c: number): string => `#${c.toString(16).padStart(6, '0')}`;

interface Stop {
    at: number;
    color: string;
}

interface Glow {
    /** Shadow colour and blur radius (metres) giving the neon bleed. */
    glow?: { color: string; blur: number };
}

/** A resolution-independent drawing op in table coordinates (metres); testable without a canvas. */
type ArtOp =
    | { kind: 'rect'; x: number; y: number; w: number; h: number; fill: string }
    | { kind: 'vgrad'; x: number; y: number; w: number; h: number; stops: Stop[] }
    | { kind: 'radial'; x: number; y: number; r: number; stops: Stop[] }
    | ({
          kind: 'circle';
          x: number;
          y: number;
          r: number;
          fill?: string;
          stroke?: string;
          width?: number;
      } & Glow)
    | ({
          kind: 'line';
          ax: number;
          ay: number;
          bx: number;
          by: number;
          stroke: string;
          width: number;
      } & Glow)
    | ({
          kind: 'poly';
          points: readonly (readonly [number, number])[];
          fill?: string;
          stroke?: string;
          width?: number;
      } & Glow)
    | { kind: 'arrow'; x: number; y: number; size: number; angle: number; fill: string }
    | ({
          kind: 'text';
          x: number;
          y: number;
          size: number;
          text: string;
          fill: string;
          outline?: string;
      } & Glow);

/** Minimal Canvas2D surface used by the painter (lets tests supply a recording fake). */
export interface PaintContext {
    fillStyle: string | CanvasGradient | CanvasPattern;
    strokeStyle: string | CanvasGradient | CanvasPattern;
    lineWidth: number;
    lineJoin: CanvasLineJoin;
    lineCap: CanvasLineCap;
    shadowColor: string;
    shadowBlur: number;
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
    strokeText(text: string, x: number, y: number): void;
    createLinearGradient(x0: number, y0: number, x1: number, y1: number): CanvasGradient;
    createRadialGradient(
        x0: number,
        y0: number,
        r0: number,
        x1: number,
        y1: number,
        r1: number
    ): CanvasGradient;
}

/** Deterministic pseudo-random sequence so the star field is identical every load. */
function lcg(seed: number): () => number {
    let s = seed;
    return () => {
        s = (s * 1664525 + 1013904223) % 4294967296;
        return s / 4294967296;
    };
}

/** Compute the playfield illustration (original "Neon Knight" theme) from the table definition. */
export function buildArtworkOps(table: TableDef): ArtOp[] {
    const { width, height } = table.bounds;
    const ops: ArtOp[] = [];
    const magenta = hex(PALETTE.magenta);
    const cyan = hex(PALETTE.cyan);
    const gold = hex(PALETTE.gold);
    const red = '#ff3b30';
    const glow = (color: string, blur: number): Glow => ({ glow: { color, blur } });

    // Base: deep night violet at the top rising to a hot magenta horizon, then dark floor.
    ops.push({ kind: 'rect', x: 0, y: 0, w: width, h: height, fill: hex(PALETTE.playfield) });
    ops.push({
        kind: 'vgrad',
        x: 0,
        y: 0,
        w: width,
        h: height,
        stops: [
            { at: 0, color: '#06021a' },
            { at: 0.3, color: '#1b0a47' },
            { at: 0.52, color: '#4a1169' },
            { at: 0.62, color: '#2a0c48' },
            { at: 1, color: '#0a0420' },
        ],
    });

    // Stars across the sky.
    const rand = lcg(7);
    for (let i = 0; i < 140; i++) {
        const y = rand() * height * 0.55;
        ops.push({
            kind: 'circle',
            x: 0.05 + rand() * (width - 0.1),
            y,
            r: 0.0015 + rand() * 0.003,
            fill: rand() > 0.7 ? cyan : '#ffffff',
        });
    }

    // The moon behind the bumper cluster, with a soft halo.
    const bumperCx =
        table.bumpers.reduce((s, b) => s + b.center.x, 0) / (table.bumpers.length || 1);
    const bumperCy =
        table.bumpers.reduce((s, b) => s + b.center.y, 0) / (table.bumpers.length || 1);
    ops.push({
        kind: 'radial',
        x: bumperCx,
        y: bumperCy,
        r: 0.42,
        stops: [
            { at: 0, color: 'rgba(255,120,220,0.55)' },
            { at: 0.5, color: 'rgba(160,60,200,0.22)' },
            { at: 1, color: 'rgba(60,10,120,0)' },
        ],
    });
    ops.push({
        kind: 'radial',
        x: bumperCx,
        y: bumperCy,
        r: 0.25,
        stops: [
            { at: 0, color: '#ffe9ff' },
            { at: 0.85, color: '#ffa3e8' },
            { at: 1, color: '#d44fb4' },
        ],
    });
    for (const [r, color] of [
        [0.3, magenta],
        [0.36, cyan],
    ] as const) {
        ops.push({
            kind: 'circle',
            x: bumperCx,
            y: bumperCy,
            r,
            stroke: color,
            width: 0.004,
            ...glow(color, 0.02),
        });
    }

    // Castle skyline across the horizon of the upper playfield.
    const baseY = height * 0.5;
    const skyline: [number, number][] = [[0.02, baseY]];
    let x = 0.02;
    const towers = [0.08, 0.14, 0.1, 0.2, 0.09, 0.16, 0.12];
    const heights = [0.1, 0.22, 0.12, 0.3, 0.14, 0.24, 0.11];
    towers.forEach((w, i) => {
        const h = heights[i] ?? 0.1;
        skyline.push([x, baseY - h], [x + w * 0.2, baseY - h], [x + w * 0.2, baseY - h - 0.025]);
        skyline.push([x + w * 0.4, baseY - h - 0.025], [x + w * 0.4, baseY - h]);
        skyline.push([x + w * 0.6, baseY - h], [x + w * 0.6, baseY - h - 0.025]);
        skyline.push([x + w * 0.8, baseY - h - 0.025], [x + w * 0.8, baseY - h]);
        x += w * 1.3;
        skyline.push([x - w * 0.3, baseY - h], [x - w * 0.3, baseY]);
    });
    skyline.push([0.86, baseY], [0.86, baseY + 0.03], [0.02, baseY + 0.03]);
    ops.push({
        kind: 'poly',
        points: skyline.map(([px, py]) => [Math.min(px, 0.86), py] as const),
        fill: '#0a0420',
        stroke: magenta,
        width: 0.003,
        ...glow(magenta, 0.015),
    });

    // Synthwave floor grid converging on a vanishing point below the horizon.
    const vanishY = baseY + 0.03;
    for (let i = -8; i <= 8; i++) {
        ops.push({
            kind: 'line',
            ax: 0.44 + i * 0.015,
            ay: vanishY,
            bx: 0.44 + i * 0.16,
            by: height,
            stroke: 'rgba(255,61,165,0.28)',
            width: 0.0025,
        });
    }
    for (let i = 1; i <= 14; i++) {
        const t = (i / 14) ** 2;
        const y = vanishY + (height - vanishY) * t;
        ops.push({
            kind: 'line',
            ax: 0.02,
            ay: y,
            bx: 0.86,
            by: y,
            stroke: 'rgba(53,240,255,0.22)',
            width: 0.0025,
        });
    }

    // Knight crest: shield with a helm slit and plume, set low between the slingshots.
    const crestY = height * 0.755;
    const k = 0.62;
    const pt = (dx: number, dy: number): readonly [number, number] => [
        0.44 + dx * k,
        crestY + dy * k,
    ];
    ops.push({
        kind: 'poly',
        points: [pt(-0.17, -0.17), pt(0.17, -0.17), pt(0.17, 0.04), pt(0, 0.2), pt(-0.17, 0.04)],
        fill: 'rgba(20,6,50,0.8)',
        stroke: gold,
        width: 0.005,
        ...glow(gold, 0.015),
    });
    ops.push({
        kind: 'poly',
        points: [
            pt(-0.09, -0.1),
            pt(0, -0.14),
            pt(0.09, -0.1),
            pt(0.08, 0.07),
            pt(0, 0.12),
            pt(-0.08, 0.07),
        ],
        fill: '#7d8aa6',
        stroke: cyan,
        width: 0.003,
    });
    ops.push({
        kind: 'poly',
        points: [pt(-0.075, -0.03), pt(0.075, -0.03), pt(0.075, 0), pt(-0.075, 0)],
        fill: '#0b0620',
    });
    ops.push({
        kind: 'poly',
        points: [pt(-0.02, -0.14), pt(0.03, -0.24), pt(0.1, -0.2), pt(0.04, -0.13)],
        fill: magenta,
        ...glow(magenta, 0.015),
    });

    // Title lettering.
    ops.push({
        kind: 'text',
        x: 0.44,
        y: height * 0.603,
        size: 0.085,
        text: 'NEON KNIGHT',
        fill: '#ffffff',
        outline: magenta,
        ...glow(magenta, 0.03),
    });

    // Lane graphics: guide lines and a direction arrow above each lane trigger.
    for (const lane of table.lanes) {
        const mx = (lane.a.x + lane.b.x) / 2;
        const color = { inlane: gold, outlane: red, rollover: cyan }[lane.kind];
        ops.push({
            kind: 'line',
            ax: lane.a.x,
            ay: lane.a.y,
            bx: lane.b.x,
            by: lane.b.y,
            stroke: color,
            width: 0.006,
            ...glow(color, 0.012),
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
        const px = (path.entry.a.x + path.entry.b.x) / 2;
        const py = (path.entry.a.y + path.entry.b.y) / 2;
        const angle = Math.atan2(path.entryDirection.y, path.entryDirection.x);
        ops.push({
            kind: 'arrow',
            x: px,
            y: py,
            size: 0.035,
            angle,
            fill: path.kind === 'ramp' ? magenta : cyan,
        });
        // Faint track painted along the scripted route so players can read the shot.
        for (let i = 0; i + 1 < path.points.length; i++) {
            const a = path.points[i]!;
            const b = path.points[i + 1]!;
            ops.push({
                kind: 'line',
                ax: a.x,
                ay: a.y,
                bx: b.x,
                by: b.y,
                stroke: path.kind === 'ramp' ? 'rgba(255,61,165,0.35)' : 'rgba(53,240,255,0.3)',
                width: 0.012,
            });
        }
    }

    // Pop bumper skirts: double ring with a dark disc.
    for (const b of table.bumpers) {
        ops.push({
            kind: 'circle',
            x: b.center.x,
            y: b.center.y,
            r: b.radius * 1.9,
            fill: 'rgba(10,4,32,0.55)',
            stroke: magenta,
            width: 0.004,
            ...glow(magenta, 0.02),
        });
        ops.push({
            kind: 'circle',
            x: b.center.x,
            y: b.center.y,
            r: b.radius * 1.45,
            stroke: cyan,
            width: 0.003,
        });
    }
    for (const s of table.saucers ?? []) {
        ops.push({
            kind: 'circle',
            x: s.center.x,
            y: s.center.y,
            r: s.radius * 1.6,
            fill: '#030108',
            stroke: gold,
            width: 0.005,
            ...glow(gold, 0.02),
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
            ...glow(cyan, 0.02),
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
            ...glow(magenta, 0.02),
        });
    }

    // Glowing rim just inside the rails.
    ops.push({
        kind: 'poly',
        points: [
            [0.03, 0.03],
            [width - 0.03, 0.03],
            [width - 0.03, height - 0.03],
            [0.03, height - 0.03],
        ],
        stroke: 'rgba(53,240,255,0.5)',
        width: 0.003,
        ...glow(cyan, 0.015),
    });

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
            ...glow(lamp.color, 0.01),
        });
    }

    return ops;
}

function applyGlow(ctx: PaintContext, op: Glow, scale: number): void {
    ctx.shadowColor = op.glow?.color ?? 'transparent';
    ctx.shadowBlur = (op.glow?.blur ?? 0) * scale;
}

function gradientStops(g: CanvasGradient, stops: readonly Stop[]): CanvasGradient {
    for (const s of stops) g.addColorStop(s.at, s.color);
    return g;
}

/** Paint ops onto a canvas context at `scale` pixels per metre. */
export function paintArtwork(ctx: PaintContext, ops: readonly ArtOp[], scale: number): void {
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    for (const op of ops) {
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        switch (op.kind) {
            case 'rect':
                ctx.fillStyle = op.fill;
                ctx.fillRect(op.x * scale, op.y * scale, op.w * scale, op.h * scale);
                break;
            case 'vgrad':
                ctx.fillStyle = gradientStops(
                    ctx.createLinearGradient(0, op.y * scale, 0, (op.y + op.h) * scale),
                    op.stops
                );
                ctx.fillRect(op.x * scale, op.y * scale, op.w * scale, op.h * scale);
                break;
            case 'radial':
                ctx.fillStyle = gradientStops(
                    ctx.createRadialGradient(
                        op.x * scale,
                        op.y * scale,
                        0,
                        op.x * scale,
                        op.y * scale,
                        op.r * scale
                    ),
                    op.stops
                );
                ctx.beginPath();
                ctx.arc(op.x * scale, op.y * scale, op.r * scale, 0, Math.PI * 2);
                ctx.fill();
                break;
            case 'circle':
                applyGlow(ctx, op, scale);
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
                applyGlow(ctx, op, scale);
                ctx.beginPath();
                ctx.moveTo(op.ax * scale, op.ay * scale);
                ctx.lineTo(op.bx * scale, op.by * scale);
                ctx.strokeStyle = op.stroke;
                ctx.lineWidth = op.width * scale;
                ctx.stroke();
                break;
            case 'poly': {
                applyGlow(ctx, op, scale);
                ctx.beginPath();
                op.points.forEach(([px, py], i) => {
                    if (i === 0) ctx.moveTo(px * scale, py * scale);
                    else ctx.lineTo(px * scale, py * scale);
                });
                ctx.closePath();
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
            }
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
                applyGlow(ctx, op, scale);
                ctx.font = `italic 900 ${op.size * scale}px "Arial Black", Impact, sans-serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                if (op.outline) {
                    ctx.strokeStyle = op.outline;
                    ctx.lineWidth = op.size * scale * 0.12;
                    ctx.strokeText(op.text, op.x * scale, op.y * scale);
                }
                ctx.fillStyle = op.fill;
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
    texture.anisotropy = 8;
    return texture;
}
