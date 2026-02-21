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
}

/**
 * Complete room definition loaded from JSON.
 * Defines background layers, walkable area, exits, hotspots, and player spawn.
 */
export interface RoomData {
    id: string;
    name: string;
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
}
