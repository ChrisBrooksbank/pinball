import { DMD_COLUMNS, DMD_ROWS, DotMatrix } from './dmd';

export type DmdAnimationKind = 'jackpot' | 'multiball' | 'extraBall';

/** Frames per second the animations advance at; the display only redraws when the frame index changes. */
const ANIMATION_FPS = 12;

const DURATION: Record<DmdAnimationKind, number> = {
    jackpot: 2.5,
    multiball: 3,
    extraBall: 2.5,
};

const TRIGGER_TEXT: Record<string, DmdAnimationKind> = {
    JACKPOT: 'jackpot',
    'SUPER JACKPOT': 'jackpot',
    MULTIBALL: 'multiball',
    'EXTRA BALL': 'extraBall',
};

/** Which animation (if any) a rules display message should trigger. */
export function animationForText(text: string): DmdAnimationKind | null {
    return TRIGGER_TEXT[text] ?? null;
}

export function animationDuration(kind: DmdAnimationKind): number {
    return DURATION[kind];
}

/** Frame index for an elapsed time. */
export function animationFrame(elapsed: number): number {
    return Math.floor(elapsed * ANIMATION_FPS);
}

function drawBorder(m: DotMatrix, inset: number): void {
    for (let x = inset; x < DMD_COLUMNS - inset; x++) {
        m.set(x, inset);
        m.set(x, DMD_ROWS - 1 - inset);
    }
    for (let y = inset; y < DMD_ROWS - inset; y++) {
        m.set(inset, y);
        m.set(DMD_COLUMNS - 1 - inset, y);
    }
}

function drawDisc(m: DotMatrix, cx: number, cy: number, r: number): void {
    for (let y = -r; y <= r; y++) {
        for (let x = -r; x <= r; x++) {
            if (x * x + y * y <= r * r + r / 2) m.set(cx + x, cy + y);
        }
    }
}

/** Triangle wave in [0, 1] with the given period (in frames). */
function pingPong(frame: number, period: number): number {
    const p = (frame % period) / period;
    return p < 0.5 ? p * 2 : 2 - p * 2;
}

function drawJackpot(m: DotMatrix, frame: number, text: string): void {
    // Chasing double border, text blinking on alternate frames.
    drawBorder(m, frame % 2 === 0 ? 0 : 2);
    if (frame % 4 < 3) m.drawTextCentered(text, 12);
}

function drawMultiball(m: DotMatrix, frame: number): void {
    // Three balls bouncing across the display at different phases.
    for (let i = 0; i < 3; i++) {
        const x = 12 + Math.round(pingPong(frame + i * 5, 24) * (DMD_COLUMNS - 24));
        const y = 6 + Math.round(pingPong(frame * 2 + i * 7, 14) * 12);
        drawDisc(m, x, y, 3);
    }
    m.drawTextCentered('MULTIBALL', 24);
}

function drawExtraBall(m: DotMatrix, frame: number): void {
    const line1 = 'EXTRA';
    const line2 = 'BALL';
    const slideFrames = 8;
    const targetX1 = Math.floor((DMD_COLUMNS - DotMatrix.textWidth(line1)) / 2);
    const targetX2 = Math.floor((DMD_COLUMNS - DotMatrix.textWidth(line2)) / 2);
    if (frame < slideFrames) {
        // Words slide in from opposite sides.
        const k = 1 - frame / slideFrames;
        m.drawText(line1, Math.round(targetX1 - k * DMD_COLUMNS), 6);
        m.drawText(line2, Math.round(targetX2 + k * DMD_COLUMNS), 17);
        return;
    }
    if ((frame >> 1) % 2 === 0) {
        m.drawText(line1, targetX1, 6);
        m.drawText(line2, targetX2, 17);
    }
    // Sparkles orbiting the corners.
    const s = frame % 4;
    for (const [x, y] of [
        [2, 2],
        [DMD_COLUMNS - 3, 2],
        [2, DMD_ROWS - 3],
        [DMD_COLUMNS - 3, DMD_ROWS - 3],
    ] as const) {
        m.set(x, y);
        if (s < 2) {
            m.set(x - 1, y);
            m.set(x + 1, y);
            m.set(x, y - 1);
            m.set(x, y + 1);
        }
    }
}

/** Draw one animation frame onto a cleared matrix. `text` is the message that triggered it. */
export function drawAnimationFrame(
    m: DotMatrix,
    kind: DmdAnimationKind,
    frame: number,
    text: string
): void {
    m.clear();
    if (kind === 'jackpot') drawJackpot(m, frame, text);
    else if (kind === 'multiball') drawMultiball(m, frame);
    else drawExtraBall(m, frame);
}
