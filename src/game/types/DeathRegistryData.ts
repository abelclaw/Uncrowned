/**
 * A single entry in the death registry.
 * Contains metadata for each discoverable death in the game.
 */
export interface DeathRegistryEntry {
    /** Unique death identifier matching the key in room JSON deaths */
    id: string;
    /** Room ID where this death occurs */
    roomId: string;
    /** Human-readable room name */
    roomName: string;
    /** Death title displayed in DeathScene */
    title: string;
    /** Narrator text displayed in DeathScene */
    narratorText: string;
    /** Thematic category for gallery grouping */
    category: string;
    /** Cryptic teaser hint for undiscovered deaths in the gallery */
    galleryHint: string;
    /** Image ID for the death illustration (maps to death-images/{imageId}.png) */
    imageId?: string;
}

/**
 * Top-level death registry structure loaded from death-registry.json.
 */
export interface DeathRegistry {
    /** Schema version for future migrations */
    version: number;
    /** Total number of deaths (should match deaths.length) */
    totalDeaths: number;
    /** All death entries */
    deaths: DeathRegistryEntry[];
}
