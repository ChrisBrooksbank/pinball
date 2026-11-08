type LampMode = 'off' | 'on' | 'flash';

interface LampState {
    mode: LampMode;
    /** Full on+off cycle length in seconds (flash mode only). */
    period: number;
    /** Time into the current flash cycle. */
    phase: number;
}

const DEFAULT_FLASH_PERIOD = 0.5;

/** Pure lamp state keyed by id: on, off or flashing. Advance with `update(dt)`; read with `lit(id)`. */
export class LampBank {
    private readonly lamps = new Map<string, LampState>();

    constructor(ids: Iterable<string>) {
        for (const id of ids)
            this.lamps.set(id, { mode: 'off', period: DEFAULT_FLASH_PERIOD, phase: 0 });
    }

    get ids(): string[] {
        return [...this.lamps.keys()];
    }

    on(id: string): void {
        this.set(id, 'on');
    }

    off(id: string): void {
        this.set(id, 'off');
    }

    /** Flash with a full cycle of `period` seconds, starting lit. Restarts the cycle. */
    flash(id: string, period = DEFAULT_FLASH_PERIOD): void {
        const lamp = this.get(id);
        lamp.mode = 'flash';
        lamp.period = Math.max(period, 1e-3);
        lamp.phase = 0;
    }

    mode(id: string): LampMode {
        return this.get(id).mode;
    }

    lit(id: string): boolean {
        const lamp = this.get(id);
        if (lamp.mode === 'flash') return lamp.phase < lamp.period / 2;
        return lamp.mode === 'on';
    }

    update(dt: number): void {
        for (const lamp of this.lamps.values()) {
            if (lamp.mode === 'flash') lamp.phase = (lamp.phase + dt) % lamp.period;
        }
    }

    private set(id: string, mode: LampMode): void {
        this.get(id).mode = mode;
    }

    private get(id: string): LampState {
        const lamp = this.lamps.get(id);
        if (!lamp) throw new Error(`Unknown lamp: ${id}`);
        return lamp;
    }
}
