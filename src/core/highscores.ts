/** Minimal slice of `Storage` so tests can inject a fake. */
export interface StorageLike {
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
}

export interface HighScore {
    initials: string;
    score: number;
}

const KEY = 'pinball.highscores.v1';
const MAX_ENTRIES = 10;

const normaliseInitials = (raw: string): string => {
    const cleaned = raw.toUpperCase().replace(/[^A-Z0-9]/g, '');
    return (cleaned + '---').slice(0, 3);
};

const isEntry = (value: unknown): value is HighScore => {
    if (typeof value !== 'object' || value === null) return false;
    const v = value as Record<string, unknown>;
    return (
        typeof v.initials === 'string' && typeof v.score === 'number' && Number.isFinite(v.score)
    );
};

/** Top-10 local high-score table persisted as JSON; tolerant of missing or corrupt storage. */
export class HighScores {
    constructor(private readonly storage: StorageLike | null) {}

    list(): HighScore[] {
        if (!this.storage) return [];
        try {
            const parsed: unknown = JSON.parse(this.storage.getItem(KEY) ?? '[]');
            if (!Array.isArray(parsed)) return [];
            return parsed
                .filter(isEntry)
                .sort((a, b) => b.score - a.score)
                .slice(0, MAX_ENTRIES);
        } catch {
            return [];
        }
    }

    /** True if `score` would earn a place on the table. */
    qualifies(score: number): boolean {
        if (score <= 0) return false;
        const entries = this.list();
        return entries.length < MAX_ENTRIES || score > (entries[entries.length - 1]?.score ?? 0);
    }

    /** Insert a score (ties rank below existing entries); returns the 0-based rank or -1. */
    add(initials: string, score: number): number {
        if (!this.qualifies(score)) return -1;
        const entries = this.list();
        let rank = entries.findIndex(e => score > e.score);
        if (rank < 0) rank = entries.length;
        entries.splice(rank, 0, {
            initials: normaliseInitials(initials),
            score: Math.floor(score),
        });
        try {
            this.storage?.setItem(KEY, JSON.stringify(entries.slice(0, MAX_ENTRIES)));
        } catch {
            return -1; // quota or private mode: scores simply do not persist
        }
        return rank;
    }
}
