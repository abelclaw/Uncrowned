import type { PuzzleDefinition } from './PuzzleData';
import type { RoomNpcData } from './NpcData';

/**
 * Background layer definition for parallax rendering.
 */
export interface BackgroundLayer {
    /** Phaser asset key loaded in Preloader */
    key: string;
    /** Parallax scroll factor (0 = fixed, 1 = moves with camera) */
    scrollFactor: number;
}

/**
 * Exit zone that transitions the player to another room.
 */
export interface ExitData {
    id: string;
    /** Rectangle zone that triggers the exit */
    zone: { x: number; y: number; width: number; height: number };
    /** Room ID to transition to */
    targetRoom: string;
    /** Where the player spawns in the target room */
    spawnPoint: { x: number; y: number };
    /** Transition animation type */
    transition: 'fade' | 'slide-left' | 'slide-right';
    /** Compass direction for text parser "go east" commands */
    direction?: string;
    /** Human-readable label for text parser "go to cave" commands */
    label?: string;
}

/**
 * Verb-specific text responses for a hotspot.
 * The CommandDispatcher looks up responses by verb when the player interacts.
 */
export interface HotspotResponses {
    look?: string;
    take?: string;
    use?: string;
    talk?: string;
    open?: string;
    push?: string;
    pull?: string;
    /** Fallback response for verbs without a specific entry */
    default?: string;
}

/**
 * Interactive hotspot that the player can examine or interact with.
 */
export interface HotspotData {
    id: string;
    /** Display name shown to the player */
    name: string;
    /** Rectangle zone that defines the hotspot area */
    zone: { x: number; y: number; width: number; height: number };
    /** Where the player walks to before interacting */
    interactionPoint: { x: number; y: number };
    /** Verb-specific text responses for this hotspot */
    responses?: HotspotResponses;
}

/**
 * Item placed in a room that can be picked up / interacted with.
 * Must have a matching entry in items.json.
 */
export interface RoomItemData {
    id: string;
    /** Display name */
    name: string;
    /** Rectangle zone that defines the item area */
    zone: { x: number; y: number; width: number; height: number };
    /** Where the player walks to before interacting */
    interactionPoint: { x: number; y: number };
    /** Verb-specific text responses (same structure as hotspot responses) */
    responses?: HotspotResponses;
}

/**
 * A death scenario definition. Referenced by deathId from trigger-death actions.
 */
export interface DeathDefinition {
    title: string;
    narratorText: string;
}

/**
 * Complete room definition loaded from JSON.
 * Defines background layers, walkable area, exits, hotspots, items, puzzles,
 * death triggers, death definitions, and player spawn.
 */
export interface RoomData {
    id: string;
    name: string;
    /** Room description returned by bare "look" command */
    description?: string;
    background: {
        layers: BackgroundLayer[];
        worldWidth: number;
    };
    /** Convex polygon points defining the walkable floor area */
    walkableArea: Array<{ x: number; y: number }>;
    exits: ExitData[];
    hotspots: HotspotData[];
    /** Default spawn position when entering the room */
    playerSpawn: { x: number; y: number };
    /** Takeable/interactable items placed in the room */
    items?: RoomItemData[];
    /** Puzzle definitions evaluated by PuzzleEngine on player commands */
    puzzles?: PuzzleDefinition[];
    /** Death trigger definitions checked after puzzles */
    deathTriggers?: PuzzleDefinition[];
    /** Death scenario definitions referenced by trigger-death actions */
    deaths?: Record<string, DeathDefinition>;
    /** Dynamic description overrides based on flags: { flagName: description } */
    dynamicDescriptions?: Record<string, string>;
    /** NPC placement data for this room */
    npcs?: RoomNpcData[];
}
