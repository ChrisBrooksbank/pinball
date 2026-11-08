import type { HighScore } from '@core/highscores';

/** Seconds each attract page stays on the display. */
export const PAGE_SECONDS = 3;
/** Seconds between demo flipper flaps. */
export const FLAP_PERIOD = 1.2;
/** Seconds a demo flap holds the flippers up. */
export const FLAP_HOLD = 0.25;

/** Fit a high-score row into the 20-character display line. */
export function scoreLine(rank: number, entry: HighScore): string {
    return `${rank + 1}. ${entry.initials} ${entry.score.toLocaleString('en-US')}`.slice(0, 20);
}

/**
 * Idle attract-mode sequencer: cycles title and high-score pages for the display and
 * produces a demo flipper flap pattern. Pure state, driven by `update(dt)`.
 */
export class AttractMode {
    private elapsed = 0;

    /** Restart the cycle (call when attract begins). */
    reset(): void {
        this.elapsed = 0;
    }

    update(dt: number): void {
        this.elapsed += dt;
    }

    /** Pages for the current high-score list: title, prompt, then each score. */
    pages(scores: readonly HighScore[]): string[] {
        return ['NEON KNIGHT', 'PRESS START', ...scores.slice(0, 5).map((s, i) => scoreLine(i, s))];
    }

    /** Text for the current page. */
    text(scores: readonly HighScore[]): string {
        const pages = this.pages(scores);
        return pages[Math.floor(this.elapsed / PAGE_SECONDS) % pages.length] ?? '';
    }

    /** True while the demo flippers should be raised. */
    flippersUp(): boolean {
        return this.elapsed % FLAP_PERIOD < FLAP_HOLD;
    }
}
