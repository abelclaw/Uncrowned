import { describe, it, expect, beforeEach } from 'vitest';
import { MetaGameState } from '../state/MetaGameState.ts';

/**
 * Create a proper localStorage mock that implements the Web Storage API.
 */
function createLocalStorageMock(): Storage {
    const store = new Map<string, string>();
    return {
        getItem(key: string): string | null {
            return store.get(key) ?? null;
        },
        setItem(key: string, value: string): void {
            store.set(key, String(value));
        },
        removeItem(key: string): void {
            store.delete(key);
        },
        clear(): void {
            store.clear();
        },
        get length(): number {
            return store.size;
        },
        key(index: number): string | null {
            const keys = Array.from(store.keys());
            return keys[index] ?? null;
        },
    };
}

// Replace global localStorage with our mock before any tests run
const mockStorage = createLocalStorageMock();
Object.defineProperty(globalThis, 'localStorage', {
    value: mockStorage,
    writable: true,
    configurable: true,
});

describe('MetaGameState', () => {
    beforeEach(() => {
        localStorage.clear();
        MetaGameState.resetInstance();
    });

    describe('Singleton', () => {
        it('getInstance() returns the same instance', () => {
            const a = MetaGameState.getInstance();
            const b = MetaGameState.getInstance();
            expect(a).toBe(b);
        });
    });

    describe('recordDeath()', () => {
        it('returns true on first call (new death)', () => {
            const meta = MetaGameState.getInstance();
            expect(meta.recordDeath('death-1')).toBe(true);
        });

        it('returns false on second call (idempotent)', () => {
            const meta = MetaGameState.getInstance();
            meta.recordDeath('death-1');
            expect(meta.recordDeath('death-1')).toBe(false);
        });
    });

    describe('getDeathsDiscovered()', () => {
        it('returns previously recorded deaths', () => {
            const meta = MetaGameState.getInstance();
            meta.recordDeath('death-1');
            meta.recordDeath('death-2');
            expect(meta.getDeathsDiscovered()).toEqual(['death-1', 'death-2']);
        });
    });

    describe('recordEnding()', () => {
        it('returns true on first call (new ending)', () => {
            const meta = MetaGameState.getInstance();
            expect(meta.recordEnding('ending-1')).toBe(true);
        });

        it('returns false on second call (idempotent)', () => {
            const meta = MetaGameState.getInstance();
            meta.recordEnding('ending-1');
            expect(meta.recordEnding('ending-1')).toBe(false);
        });
    });

    describe('getEndingsDiscovered()', () => {
        it('returns previously recorded endings', () => {
            const meta = MetaGameState.getInstance();
            meta.recordEnding('ending-1');
            meta.recordEnding('ending-2');
            expect(meta.getEndingsDiscovered()).toEqual(['ending-1', 'ending-2']);
        });
    });

    describe('getData()', () => {
        it('returns full MetaGameStateData object', () => {
            const meta = MetaGameState.getInstance();
            meta.recordDeath('death-1');
            meta.recordEnding('ending-1');
            const data = meta.getData();
            expect(data).toEqual({
                version: 1,
                deathsDiscovered: ['death-1'],
                endingsDiscovered: ['ending-1'],
            });
        });
    });

    describe('Persistence', () => {
        it('save() persists to localStorage key kqgame-meta', () => {
            const meta = MetaGameState.getInstance();
            meta.recordDeath('death-1');
            // recordDeath auto-saves, but let's verify via explicit save too
            meta.save();
            const stored = localStorage.getItem('kqgame-meta');
            expect(stored).not.toBeNull();
            const parsed = JSON.parse(stored!);
            expect(parsed.deathsDiscovered).toContain('death-1');
        });

        it('new instance loads persisted data after save', () => {
            const meta = MetaGameState.getInstance();
            meta.recordDeath('death-1');
            meta.recordEnding('ending-1');
            meta.save();

            // Reset singleton to force fresh load from localStorage
            MetaGameState.resetInstance();

            const meta2 = MetaGameState.getInstance();
            expect(meta2.getDeathsDiscovered()).toEqual(['death-1']);
            expect(meta2.getEndingsDiscovered()).toEqual(['ending-1']);
        });
    });

    describe('reset()', () => {
        it('clears all data but keeps version', () => {
            const meta = MetaGameState.getInstance();
            meta.recordDeath('death-1');
            meta.recordEnding('ending-1');

            meta.reset();

            expect(meta.getDeathsDiscovered()).toEqual([]);
            expect(meta.getEndingsDiscovered()).toEqual([]);
            expect(meta.getData().version).toBe(1);
        });
    });
});
