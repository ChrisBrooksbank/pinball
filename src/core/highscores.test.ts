import { describe, expect, it } from 'vitest';
import { HighScores, type StorageLike } from './highscores';

class MemoryStorage implements StorageLike {
    data = new Map<string, string>();
    getItem(key: string): string | null {
        return this.data.get(key) ?? null;
    }
    setItem(key: string, value: string): void {
        this.data.set(key, value);
    }
}

describe('HighScores', () => {
    it('starts empty and persists across instances', () => {
        const storage = new MemoryStorage();
        expect(new HighScores(storage).list()).toEqual([]);
        new HighScores(storage).add('abc', 500);
        expect(new HighScores(storage).list()).toEqual([{ initials: 'ABC', score: 500 }]);
    });

    it('keeps entries sorted and capped at 10', () => {
        const hs = new HighScores(new MemoryStorage());
        for (let i = 1; i <= 12; i++) hs.add('AAA', i * 100);
        const list = hs.list();
        expect(list).toHaveLength(10);
        expect(list[0]?.score).toBe(1200);
        expect(list[9]?.score).toBe(300);
    });

    it('qualifies only scores that beat the tenth place once full', () => {
        const hs = new HighScores(new MemoryStorage());
        expect(hs.qualifies(0)).toBe(false);
        expect(hs.qualifies(1)).toBe(true);
        for (let i = 1; i <= 10; i++) hs.add('AAA', i * 100);
        expect(hs.qualifies(100)).toBe(false);
        expect(hs.qualifies(101)).toBe(true);
        expect(hs.add('ZZZ', 50)).toBe(-1);
        expect(hs.add('ZZZ', 550)).toBe(5);
    });

    it('normalises initials to three upper-case characters', () => {
        const hs = new HighScores(new MemoryStorage());
        hs.add('a', 10);
        hs.add('x!y?zq', 20);
        expect(hs.list().map(e => e.initials)).toEqual(['XYZ', 'A--']);
    });

    it('survives corrupt, malformed, or missing storage', () => {
        const storage = new MemoryStorage();
        storage.setItem('pinball.highscores.v1', '{not json');
        expect(new HighScores(storage).list()).toEqual([]);
        storage.setItem('pinball.highscores.v1', JSON.stringify([{ initials: 1 }, 'x', null]));
        expect(new HighScores(storage).list()).toEqual([]);
        const none = new HighScores(null);
        expect(none.list()).toEqual([]);
        expect(none.add('AAA', 100)).toBe(0);
    });

    it('does not throw when writing fails', () => {
        const hs = new HighScores({
            getItem: () => null,
            setItem: () => {
                throw new Error('quota');
            },
        });
        expect(hs.add('AAA', 100)).toBe(-1);
    });
});
