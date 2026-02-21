/**
 * Static NPC definition. Loaded once, immutable during gameplay.
 * The dialogueKey references compiled ink JSON in the Phaser cache.
 */
export interface NpcDefinition {
    id: string;
    name: string;
    /** Personality summary for narrator/LLM context */
    personality: string;
    /** Topics this NPC knows about */
    knowledge: string[];
    /** Phaser cache key for compiled ink JSON */
    dialogueKey: string;
    /** Fallback greeting when no ink state */
    defaultGreeting: string;
}

/**
 * Per-room NPC placement data. Embedded in room JSON files.
 * References an NpcDefinition by id.
 */
export interface RoomNpcData {
    /** References NpcDefinition.id */
    id: string;
    /** NPC sprite position in the room */
    position: { x: number; y: number };
    /** Where the player walks to before interacting */
    interactionPoint: { x: number; y: number };
    /** Rectangle zone that defines the NPC clickable area */
    zone: { x: number; y: number; width: number; height: number };
    /** Optional conditions that control NPC visibility/availability */
    conditions?: Array<{ type: string; flag?: string; [key: string]: unknown }>;
}
