import type { PuzzleDefinition } from './PuzzleData';
import type { RoomNpcData } from './NpcData';

/**
 * Progressive hint definition for a puzzle.
 * Three tiers of increasingly specific hints.
 */
export interface PuzzleHint {
    puzzleId: string;
    tiers: [string, string, string];
}

/**
 * Weather effect types for room atmosphere.
 */
export type WeatherType = 'rain' | 'snow' | 'fog' | 'dust';

/**
 * Ambient particle effect types for room atmosphere.
 */
export type AmbientType = 'fireflies' | 'dust-motes' | 'falling-leaves' | 'embers';

/**
 * PostFX effect types for mood and atmosphere.
 */
export type PostFXType = 'bloom' | 'glow' | 'desaturate';

/**
 * Transition effect types for room-to-room navigation.
 * Configurable per exit in room JSON data.
 */
export type TransitionType = 'fade' | 'slide-left' | 'slide-right' | 'wipe-left' | 'wipe-right' | 'pixelate' | 'iris';

/**
 * Per-room lighting configuration for ambient tint, brightness, vignette,
 * torch flicker, and camera PostFX effects.
 */
export interface LightingData {
    tint?: string;           // hex color string e.g. "#ff8844" applied as camera tint overlay
    brightness?: number;     // 0.0-1.0, default 1.0 (1.0 = normal, 0.3 = very dark)
    vignette?: number;       // 0.0-1.0 vignette intensity, 0 = none, 0.8 = heavy darkened edges
    torchFlicker?: boolean;  // if true, brightness oscillates to simulate torch light
    postfx?: PostFXType[];   // list of PostFX effects to apply
}

/**
 * Effects configuration for weather, ambient particles, and lighting in a room.
 */
export interface RoomEffectsData {
    weather?: {
        type: WeatherType;
        intensity?: number; // 0.0-1.0, defaults to 0.5
    };
    ambient?: Array<{
        type: AmbientType;
        intensity?: number; // 0.0-1.0, defaults to 0.5
    }>;
    lighting?: LightingData;
}

/**
 * Audio configuration for a room: background music and ambient layers.
 */
export interface RoomAudioData {
    /** Phaser audio key for background music. Rooms sharing the same key skip re-triggering. */
    music?: string;
    /** Ambient loop tracks to layer for atmosphere. */
    ambient?: Array<{ key: string; volume?: number }>;
}

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
    transition: TransitionType;
    /** Compass direction for text parser "go east" commands */
    direction?: string;
    /** Human-readable label for text parser "go to cave" commands */
    label?: string;
    /** Optional conditions that must be met for this exit to be active (e.g. flag-set) */
    conditions?: Array<{ type: string; flag?: string; item?: string }>;
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
    /** Audio configuration: background music and ambient loops */
    audio?: RoomAudioData;
    /** Visual effects configuration: weather and ambient particles */
    effects?: RoomEffectsData;
    /** Progressive hint definitions for puzzles in this room */
    puzzleHints?: PuzzleHint[];
}
