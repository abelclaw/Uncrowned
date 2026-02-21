import { describe, it, expect, beforeEach } from 'vitest';
import { GameState } from '../state/GameState.ts';
import { SaveManager } from '../state/SaveManager.ts';
import type { SaveSlotInfo } from '../state/SaveManager.ts';
import { MetaGameState } from '../state/MetaGameState.ts';

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

    describe('createExportData', () => {
        it('returns object with correct format, version, exportedAt, gameState, metaState', () => {
            MetaGameState.resetInstance();
            const meta = MetaGameState.getInstance();
            state.addItem('key');

            const exportData = SaveManager.createExportData(state, meta);

            expect(exportData.format).toBe('kqgame-save');
            expect(exportData.version).toBe(1);
            expect(typeof exportData.exportedAt).toBe('string');
            expect(exportData.gameState).toBeDefined();
            expect(exportData.metaState).toBeDefined();
        });

        it('export data gameState contains all current GameState fields including version: 2', () => {
            MetaGameState.resetInstance();
            const meta = MetaGameState.getInstance();
            state.addItem('sword');
            state.setFlag('armed', true);

            const exportData = SaveManager.createExportData(state, meta);

            expect(exportData.gameState.version).toBe(2);
            expect(exportData.gameState.inventory).toContain('sword');
            expect((exportData.gameState.flags as Record<string, boolean>)['armed']).toBe(true);
            expect(exportData.gameState.currentRoom).toBe('forest_clearing');
        });

        it('export data metaState contains MetaGameState data', () => {
            MetaGameState.resetInstance();
            const meta = MetaGameState.getInstance();
            meta.recordDeath('death-1');
            meta.recordEnding('ending-1');

            const exportData = SaveManager.createExportData(state, meta);

            expect(exportData.metaState.deathsDiscovered).toContain('death-1');
            expect(exportData.metaState.endingsDiscovered).toContain('ending-1');
        });
    });

    describe('parseImportData', () => {
        it('returns parsed { gameState, metaState } on valid data', () => {
            MetaGameState.resetInstance();
            const meta = MetaGameState.getInstance();
            const exportData = SaveManager.createExportData(state, meta);
            const jsonString = JSON.stringify(exportData);

            const result = SaveManager.parseImportData(jsonString);

            expect(result.gameState).toBeDefined();
            expect(typeof result.gameState).toBe('string');
            expect(result.metaState).toBeDefined();
        });

        it('throws on invalid JSON', () => {
            expect(() => SaveManager.parseImportData('not json {')).toThrow();
        });

        it('throws on JSON missing "format" field', () => {
            const data = JSON.stringify({ version: 1, gameState: {}, metaState: {} });
            expect(() => SaveManager.parseImportData(data)).toThrow();
        });

        it('throws on JSON with wrong format value', () => {
            const data = JSON.stringify({ format: 'wrong-format', version: 1, gameState: {}, metaState: {} });
            expect(() => SaveManager.parseImportData(data)).toThrow();
        });

        it('throws on JSON missing gameState or metaState', () => {
            const data1 = JSON.stringify({ format: 'kqgame-save', version: 1, metaState: {} });
            expect(() => SaveManager.parseImportData(data1)).toThrow();

            const data2 = JSON.stringify({ format: 'kqgame-save', version: 1, gameState: {} });
            expect(() => SaveManager.parseImportData(data2)).toThrow();
        });

        it('parsed gameState from import runs through migration (v1 data gets version: 2 after load)', () => {
            // Create a v1-format export (no version field in gameState)
            const v1Export = {
                format: 'kqgame-save',
                version: 1,
                exportedAt: new Date().toISOString(),
                gameState: {
                    currentRoom: 'cave_entrance',
                    inventory: ['key'],
                    flags: { 'door-open': true },
                    visitedRooms: ['forest_clearing'],
                    removedItems: {},
                    playTimeMs: 5000,
                    deathCount: 2,
                    dialogueStates: {},
                },
                metaState: { version: 1, deathsDiscovered: [], endingsDiscovered: [] },
            };

            const result = SaveManager.parseImportData(JSON.stringify(v1Export));
            // parseImportData returns gameState as JSON string, caller uses state.deserialize() which runs migration
            state.deserialize(result.gameState);
            expect(state.getData().version).toBe(2);
            expect(state.getData().currentRoom).toBe('cave_entrance');
            expect(state.hasItem('key')).toBe(true);
        });
    });

    describe('Migration-aware loads', () => {
        it('loadAutoSave on v1-format save succeeds and resulting state has version: 2', () => {
            // Manually write a v1 save (no version field) to localStorage
            const v1Save = JSON.stringify({
                currentRoom: 'cave_entrance',
                inventory: ['torch'],
                flags: {},
                visitedRooms: [],
                removedItems: {},
                playTimeMs: 0,
                deathCount: 0,
                dialogueStates: {},
            });
            localStorage.setItem('kqgame-autosave', v1Save);

            const loaded = SaveManager.loadAutoSave(state);
            expect(loaded).toBe(true);
            expect(state.getData().version).toBe(2);
            expect(state.hasItem('torch')).toBe(true);
        });

        it('loadFromSlot on v1-format save succeeds and resulting state has version: 2', () => {
            // Manually write a v1 save (no version field) to slot 1
            const v1Save = JSON.stringify({
                currentRoom: 'village_path',
                inventory: ['sword'],
                flags: { quest: true },
                visitedRooms: ['forest_clearing'],
                removedItems: {},
                playTimeMs: 10000,
                deathCount: 1,
                dialogueStates: {},
            });
            localStorage.setItem('kqgame-save-1', v1Save);

            const loaded = SaveManager.loadFromSlot(state, 1);
            expect(loaded).toBe(true);
            expect(state.getData().version).toBe(2);
            expect(state.hasItem('sword')).toBe(true);
            expect(state.getData().currentRoom).toBe('village_path');
        });
    });
});
