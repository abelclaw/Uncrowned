/**
 * Current save format version. Bumped on schema changes.
 * v1 = original (no version field), v2 = added version field.
 */
export const CURRENT_SAVE_VERSION = 3;

/**
 * Serializable game state data structure.
 * Holds all mutable game state: inventory, flags, rooms, and play metrics.
 * Every system reads from and writes to this via the GameState singleton.
 */
export interface GameStateData {
    /** Save schema version for migration support */
    version: number;
    currentRoom: string;
    inventory: string[];
    flags: Record<string, boolean | string>;
    visitedRooms: string[];
    removedItems: Record<string, string[]>;
    playTimeMs: number;
    deathCount: number;
    /** Per-NPC ink story state JSON strings for dialogue persistence */
    dialogueStates: Record<string, string>;
    /** Per-puzzle hint tier tracking (puzzleId -> current tier 0-2) */
    hintTiers: Record<string, number>;
    /** Per-puzzle failed attempt counter (puzzleId -> count) */
    failedAttempts: Record<string, number>;
}

/**
 * Creates a fresh default game state.
 * Used on new game and reset.
 */
export function getDefaultState(): GameStateData {
    return {
        version: CURRENT_SAVE_VERSION,
        currentRoom: 'forest_clearing',
        inventory: [],
        flags: {},
        visitedRooms: [],
        removedItems: {},
        playTimeMs: 0,
        deathCount: 0,
        dialogueStates: {},
        hintTiers: {},
        failedAttempts: {},
    };
}
