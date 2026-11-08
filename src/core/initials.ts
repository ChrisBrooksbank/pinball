const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const SLOTS = 3;

/**
 * Arcade-style three-letter initials entry. Flippers cycle the current letter, start confirms it
 * and moves on; confirming the last slot finishes. Pure state so it can be tested headless.
 */
export class InitialsEntry {
    private readonly indices: number[] = Array.from({ length: SLOTS }, () => 0);
    private slot = 0;
    private finished = false;

    /** Cycle the current letter: -1 = previous (left flipper), +1 = next (right flipper). */
    cycle(direction: -1 | 1): void {
        if (this.finished) return;
        const i = this.indices[this.slot] ?? 0;
        this.indices[this.slot] = (i + direction + ALPHABET.length) % ALPHABET.length;
    }

    /** Lock in the current letter; returns true once all letters are entered. */
    confirm(): boolean {
        if (this.finished) return true;
        this.slot += 1;
        if (this.slot >= SLOTS) {
            this.slot = SLOTS - 1;
            this.finished = true;
        }
        return this.finished;
    }

    get done(): boolean {
        return this.finished;
    }

    get value(): string {
        return this.indices.map(i => ALPHABET[i]).join('');
    }

    /** Display text with the active slot bracketed; `_` marks slots not yet reached. */
    get display(): string {
        return this.indices
            .map((i, n) => {
                const letter = ALPHABET[i] ?? 'A';
                if (this.finished || n < this.slot) return ` ${letter} `;
                return n === this.slot ? `[${letter}]` : ' _ ';
            })
            .join('');
    }
}
