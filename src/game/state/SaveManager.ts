import type { GameState } from './GameState.ts';

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
}
