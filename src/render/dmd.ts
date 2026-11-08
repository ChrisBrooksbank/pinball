import { DataTexture, NearestFilter, RGBAFormat, SRGBColorSpace } from 'three';
import {
    type DmdAnimationKind,
    animationDuration,
    animationForText,
    animationFrame,
    drawAnimationFrame,
} from './dmd-animations';
import { GLYPH_WIDTH, glyphFor } from './dmd-font';

export const DMD_COLUMNS = 128;
export const DMD_ROWS = 32;

/** Screen pixels per dot; 3x3 lit pixels with a 1px gap give the classic round-ish dot look. */
const DOT_PX = 4;
/** Unlit rows above and below the display so the texture matches the backglass panel's aspect ratio. */
const PANEL_PAD_ROWS = 22;
const CHAR_ADVANCE = GLYPH_WIDTH + 1;

const LIT = [255, 150, 30] as const;
const UNLIT = [38, 14, 8] as const;
const PANEL = [10, 6, 12] as const;

/** On/off dot framebuffer with bitmap text drawing. Pure data, so it is unit testable headless. */
export class DotMatrix {
    readonly dots = new Uint8Array(DMD_COLUMNS * DMD_ROWS);

    clear(): void {
        this.dots.fill(0);
    }

    get(x: number, y: number): boolean {
        if (x < 0 || y < 0 || x >= DMD_COLUMNS || y >= DMD_ROWS) return false;
        return this.dots[y * DMD_COLUMNS + x] === 1;
    }

    set(x: number, y: number, on = true): void {
        if (x < 0 || y < 0 || x >= DMD_COLUMNS || y >= DMD_ROWS) return;
        this.dots[y * DMD_COLUMNS + x] = on ? 1 : 0;
    }

    /** Pixel width of `text` when drawn. */
    static textWidth(text: string): number {
        return text.length === 0 ? 0 : text.length * CHAR_ADVANCE - 1;
    }

    /** Draw text with its top-left corner at (x, y); anything off the display is clipped. */
    drawText(text: string, x: number, y: number): void {
        let cursor = x;
        for (const char of text) {
            glyphFor(char).forEach((bits, row) => {
                for (let col = 0; col < GLYPH_WIDTH; col++) {
                    if (bits & (1 << (GLYPH_WIDTH - 1 - col))) this.set(cursor + col, y + row);
                }
            });
            cursor += CHAR_ADVANCE;
        }
    }

    drawTextCentered(text: string, y: number): void {
        this.drawText(text, Math.floor((DMD_COLUMNS - DotMatrix.textWidth(text)) / 2), y);
    }

    drawTextRight(text: string, y: number): void {
        this.drawText(text, DMD_COLUMNS - DotMatrix.textWidth(text) - 1, y);
    }
}

/** What the display shows; mirrors what the rules expose to the driver. */
interface DmdState {
    score: number;
    ball: number;
    text: string;
}

/** Group digits with commas, e.g. 1234567 -> "1,234,567". */
export function formatScore(score: number): string {
    return Math.max(0, Math.floor(score))
        .toString()
        .replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/** Lay out score, ball number and message text onto the matrix. */
export function drawDmdState(matrix: DotMatrix, state: DmdState): void {
    matrix.clear();
    if (state.ball > 0) matrix.drawText(`BALL ${state.ball}`, 1, 1);
    matrix.drawTextCentered(state.text.slice(0, 20), 12);
    matrix.drawTextRight(formatScore(state.score), 23);
}

/** Dot-matrix display that renders into a texture suitable for the backglass material. */
export class DmdDisplay {
    readonly matrix = new DotMatrix();
    readonly texture: DataTexture;
    private readonly width = DMD_COLUMNS * DOT_PX;
    private readonly height = (DMD_ROWS + PANEL_PAD_ROWS * 2) * DOT_PX;
    private readonly pixels: Uint8Array<ArrayBuffer>;
    private lastKey = '';
    private lastText = '';
    private animation: { kind: DmdAnimationKind; text: string; elapsed: number } | null = null;

    constructor() {
        this.pixels = new Uint8Array(this.width * this.height * 4);
        this.texture = new DataTexture(this.pixels, this.width, this.height, RGBAFormat);
        this.texture.colorSpace = SRGBColorSpace;
        this.texture.magFilter = NearestFilter;
        this.draw();
    }

    /** Kind of the animation currently playing, if any. */
    get activeAnimation(): DmdAnimationKind | null {
        return this.animation?.kind ?? null;
    }

    /**
     * Redraw the texture if the state (or animation frame) changed since the last call. `dt` is the
     * seconds elapsed since the previous call and advances any running animation. A new message that
     * maps to an animation (jackpot, multiball, extra ball) starts it. Returns true when redrawn.
     */
    update(state: DmdState, dt = 0): boolean {
        if (state.text !== this.lastText) {
            this.lastText = state.text;
            const kind = animationForText(state.text);
            this.animation = kind ? { kind, text: state.text, elapsed: 0 } : null;
        } else if (this.animation) {
            this.animation.elapsed += dt;
        }
        const anim = this.animation;
        if (anim && anim.elapsed >= animationDuration(anim.kind)) this.animation = null;

        const active = this.animation;
        const frame = active ? animationFrame(active.elapsed) : -1;
        const key = `${state.ball}|${state.score}|${state.text}|${active?.kind ?? ''}|${frame}`;
        if (key === this.lastKey) return false;
        this.lastKey = key;
        if (active) drawAnimationFrame(this.matrix, active.kind, frame, active.text);
        else drawDmdState(this.matrix, state);
        this.draw();
        return true;
    }

    private draw(): void {
        const { width, height, pixels } = this;
        const padPx = PANEL_PAD_ROWS * DOT_PX;
        for (let py = 0; py < height; py++) {
            for (let px = 0; px < width; px++) {
                const inPanel = py >= padPx && py < height - padPx;
                let color: readonly number[] = PANEL;
                if (inPanel) {
                    const dx = px % DOT_PX;
                    const dy = (py - padPx) % DOT_PX;
                    if (dx < DOT_PX - 1 && dy < DOT_PX - 1) {
                        const lit = this.matrix.get(
                            Math.floor(px / DOT_PX),
                            Math.floor((py - padPx) / DOT_PX)
                        );
                        color = lit ? LIT : UNLIT;
                    } else {
                        color = PANEL;
                    }
                }
                // DataTexture rows run bottom-up, so flip y.
                const i = ((height - 1 - py) * width + px) * 4;
                pixels[i] = color[0]!;
                pixels[i + 1] = color[1]!;
                pixels[i + 2] = color[2]!;
                pixels[i + 3] = 255;
            }
        }
        this.texture.needsUpdate = true;
    }
}
