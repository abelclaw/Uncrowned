import type { GameState } from './GameState.ts';
import type { MetaGameState, MetaGameStateData } from './MetaGameState.ts';

const SAVE_PREFIX = 'kqgame';
const AUTO_SAVE_KEY = `${SAVE_PREFIX}-autosave`;
const MANUAL_SAVE_PREFIX = `${SAVE_PREFIX}-save`;
const MAX_SAVE_SLOTS = 5;

/**
 * Metadata for a manual save slot.
 */
export interface SaveSlotInfo {
    slot: number;
    roomId: string;
    timestamp: number;
    playTimeMs: number;
}

/**
 * Handles game state persistence to localStorage.
 * Provides auto-save (on room transitions) and 5 manual save slots.
 * All methods are static -- no instance needed.
 */
export class SaveManager {
    /** Auto-save current game state. Called on room transitions. */
    static autoSave(state: GameState): void {
        try {
            const data = state.serialize();
            localStorage.setItem(AUTO_SAVE_KEY, data);
            localStorage.setItem(`${AUTO_SAVE_KEY}-meta`, JSON.stringify({
                timestamp: Date.now(),
                roomId: state.getData().currentRoom,
            }));
        } catch (e) {
            console.warn('Failed to auto-save:', e);
        }
    }

    /** Load auto-save. Returns true if loaded successfully. */
    static loadAutoSave(state: GameState): boolean {
        try {
            const data = localStorage.getItem(AUTO_SAVE_KEY);
            if (!data) return false;
            state.deserialize(data);
            return true;
        } catch (e) {
            console.warn('Failed to load auto-save:', e);
            return false;
        }
    }

    /** Check if auto-save exists. */
    static hasAutoSave(): boolean {
        try {
            return localStorage.getItem(AUTO_SAVE_KEY) !== null;
        } catch {
            return false;
        }
    }

    /** Save to a numbered slot (1-5). */
    static saveToSlot(state: GameState, slot: number): void {
        try {
            const key = `${MANUAL_SAVE_PREFIX}-${slot}`;
            localStorage.setItem(key, state.serialize());
            localStorage.setItem(`${key}-meta`, JSON.stringify({
                slot,
                timestamp: Date.now(),
                roomId: state.getData().currentRoom,
                playTimeMs: state.getData().playTimeMs,
            } satisfies SaveSlotInfo));
        } catch (e) {
            console.warn(`Failed to save to slot ${slot}:`, e);
        }
    }

    /** Load from a numbered slot. Returns true if loaded. */
    static loadFromSlot(state: GameState, slot: number): boolean {
        try {
            const key = `${MANUAL_SAVE_PREFIX}-${slot}`;
            const data = localStorage.getItem(key);
            if (!data) return false;
            state.deserialize(data);
            return true;
        } catch (e) {
            console.warn(`Failed to load from slot ${slot}:`, e);
            return false;
        }
    }

    /** Get metadata for all save slots. Returns array of 5 entries (null for empty). */
    static getSlotInfos(): (SaveSlotInfo | null)[] {
        const slots: (SaveSlotInfo | null)[] = [];
        for (let i = 1; i <= MAX_SAVE_SLOTS; i++) {
            try {
                const metaStr = localStorage.getItem(`${MANUAL_SAVE_PREFIX}-${i}-meta`);
                if (metaStr) {
                    slots.push(JSON.parse(metaStr) as SaveSlotInfo);
                } else {
                    slots.push(null);
                }
            } catch {
                slots.push(null);
            }
        }
        return slots;
    }

    // --- Export / Import ---

    /**
     * Create export data bundle containing both GameState and MetaGameState.
     * Pure data method -- returns a serializable object. UI triggers actual file download.
     */
    static createExportData(state: GameState, meta: MetaGameState): SaveExportData {
        return {
            format: 'kqgame-save',
            version: 1,
            exportedAt: new Date().toISOString(),
            gameState: JSON.parse(state.serialize()),
            metaState: meta.getData(),
        };
    }

    /**
     * Trigger browser file download of exported save data.
     * Creates a Blob and clicks a temporary <a> element.
     */
    static exportSaveToFile(state: GameState, meta: MetaGameState): void {
        const data = SaveManager.createExportData(state, meta);
        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const date = new Date().toISOString().slice(0, 10);
        const a = document.createElement('a');
        a.href = url;
        a.download = `kqgame-save-${date}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }

    /**
     * Parse and validate an import JSON string.
     * Returns gameState as JSON string (for state.deserialize()) and metaState data.
     * The caller should call state.deserialize(result.gameState) which runs migration automatically.
     */
    static parseImportData(jsonString: string): { gameState: string; metaState: MetaGameStateData } {
        const data = JSON.parse(jsonString);

        if (data.format !== 'kqgame-save') {
            throw new Error('Invalid save file format');
        }
        if (!data.gameState) {
            throw new Error('Save file missing gameState');
        }
        if (!data.metaState) {
            throw new Error('Save file missing metaState');
        }

        return {
            gameState: JSON.stringify(data.gameState),
            metaState: data.metaState as MetaGameStateData,
        };
    }

    /**
     * Open a file picker and import save data from a JSON file.
     * Returns a Promise with parsed gameState and metaState.
     */
    static importSaveFromFile(): Promise<{ gameState: string; metaState: MetaGameStateData }> {
        return new Promise((resolve, reject) => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json';
            input.style.display = 'none';

            input.addEventListener('change', () => {
                const file = input.files?.[0];
                if (!file) {
                    reject(new Error('No file selected'));
                    return;
                }

                const reader = new FileReader();
                reader.onload = () => {
                    try {
                        const result = SaveManager.parseImportData(reader.result as string);
                        resolve(result);
                    } catch (e) {
                        reject(e);
                    }
                };
                reader.onerror = () => reject(new Error('Failed to read file'));
                reader.readAsText(file);
            });

            // Trigger file picker
            document.body.appendChild(input);
            input.click();
            document.body.removeChild(input);
        });
    }
}

/**
 * Shape of an exported save file.
 */
export interface SaveExportData {
    format: 'kqgame-save';
    version: number;
    exportedAt: string;
    gameState: Record<string, unknown>;
    metaState: MetaGameStateData;
}
