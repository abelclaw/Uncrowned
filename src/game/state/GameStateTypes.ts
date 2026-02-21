/**
 * Serializable game state data structure.
 * Holds all mutable game state: inventory, flags, rooms, and play metrics.
 * Every system reads from and writes to this via the GameState singleton.
 */
export interface GameStateData {
    currentRoom: string;
    inventory: string[];
    flags: Record<string, boolean | string>;
    visitedRooms: string[];
    removedItems: Record<string, string[]>;
    playTimeMs: number;
    deathCount: number;
}

/**
 * Creates a fresh default game state.
 * Used on new game and reset.
 */
export function getDefaultState(): GameStateData {
    return {
        currentRoom: 'forest_clearing',
        inventory: [],
        flags: {},
        visitedRooms: [],
        removedItems: {},
        playTimeMs: 0,
        deathCount: 0,
    };
}
