import { describe, it, expect, beforeEach } from 'vitest';
import { GameState } from '../state/GameState.ts';
import { SaveManager } from '../state/SaveManager.ts';
import type { SaveSlotInfo } from '../state/SaveManager.ts';

/**
 * Create a proper localStorage mock that implements the Web Storage API.
 * Node 25's built-in localStorage is incomplete (no clear(), limited API),
 * so we provide our own Map-based implementation.
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

describe('SaveManager', () => {
    let state: GameState;

    beforeEach(() => {
        state = GameState.getInstance();
        state.reset();
        localStorage.clear();
    });

    describe('autoSave / loadAutoSave', () => {
        it('autoSave writes to localStorage key kqgame-autosave', () => {
            state.addItem('key');
            SaveManager.autoSave(state);

            const saved = localStorage.getItem('kqgame-autosave');
            expect(saved).not.toBeNull();
            const parsed = JSON.parse(saved!);
            expect(parsed.inventory).toContain('key');
        });

        it('loadAutoSave restores GameState from localStorage', () => {
            state.addItem('key');
            state.setFlag('door-open', true);
            SaveManager.autoSave(state);

            state.reset();
            expect(state.hasItem('key')).toBe(false);

            const loaded = SaveManager.loadAutoSave(state);
            expect(loaded).toBe(true);
            expect(state.hasItem('key')).toBe(true);
            expect(state.isFlagSet('door-open')).toBe(true);
        });

        it('hasAutoSave returns false when no save exists', () => {
            expect(SaveManager.hasAutoSave()).toBe(false);
        });

        it('hasAutoSave returns true after autoSave', () => {
            SaveManager.autoSave(state);
            expect(SaveManager.hasAutoSave()).toBe(true);
        });

        it('loadAutoSave returns false when no save exists', () => {
            const loaded = SaveManager.loadAutoSave(state);
            expect(loaded).toBe(false);
        });
    });

    describe('saveToSlot / loadFromSlot', () => {
        it('saveToSlot(1) writes to kqgame-save-1', () => {
            state.addItem('sword');
            SaveManager.saveToSlot(state, 1);

            const saved = localStorage.getItem('kqgame-save-1');
            expect(saved).not.toBeNull();
            const parsed = JSON.parse(saved!);
            expect(parsed.inventory).toContain('sword');
        });

        it('loadFromSlot(1) restores state', () => {
            state.addItem('sword');
            state.setFlag('armed', true);
            SaveManager.saveToSlot(state, 1);

            state.reset();
            expect(state.hasItem('sword')).toBe(false);

            const loaded = SaveManager.loadFromSlot(state, 1);
            expect(loaded).toBe(true);
            expect(state.hasItem('sword')).toBe(true);
            expect(state.isFlagSet('armed')).toBe(true);
        });

        it('loadFromSlot returns false for empty slot', () => {
            const loaded = SaveManager.loadFromSlot(state, 3);
            expect(loaded).toBe(false);
        });
    });

    describe('getSlotInfos', () => {
        it('returns array of 5 entries', () => {
            const infos = SaveManager.getSlotInfos();
            expect(infos).toHaveLength(5);
        });

        it('returns null for empty slots', () => {
            const infos = SaveManager.getSlotInfos();
            expect(infos[0]).toBeNull();
            expect(infos[4]).toBeNull();
        });

        it('returns SaveSlotInfo for filled slots', () => {
            SaveManager.saveToSlot(state, 2);
            const infos = SaveManager.getSlotInfos();
            expect(infos[0]).toBeNull(); // slot 1 empty
            expect(infos[1]).not.toBeNull(); // slot 2 filled
            const info = infos[1] as SaveSlotInfo;
            expect(info.slot).toBe(2);
            expect(info.roomId).toBe('forest_clearing');
            expect(typeof info.timestamp).toBe('number');
            expect(typeof info.playTimeMs).toBe('number');
        });

        it('multiple saves produce correct slot info', () => {
            SaveManager.saveToSlot(state, 1);
            SaveManager.saveToSlot(state, 5);
            const infos = SaveManager.getSlotInfos();
            expect(infos[0]).not.toBeNull();
            expect(infos[1]).toBeNull();
            expect(infos[2]).toBeNull();
            expect(infos[3]).toBeNull();
            expect(infos[4]).not.toBeNull();
        });
    });
});
