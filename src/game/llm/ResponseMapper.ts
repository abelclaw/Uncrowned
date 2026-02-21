/**
 * Maps LLM JSON responses to ParseResult via NounResolver noun resolution.
 * Validates verb against the canonical Verb enum and resolves subject/target
 * strings to room entity IDs.
 */

import type { ParseResult, Verb } from '../types/GameAction';
import type { HotspotData, ExitData } from '../types/RoomData';
import { NounResolver } from '../parser/NounResolver';

/**
 * JSON schema used as Ollama's `format` parameter to constrain output structure.
 * Verb enum excludes 'save' and 'load' (meta-commands the LLM should not produce).
 */
export const GAME_ACTION_SCHEMA = {
    type: 'object',
    properties: {
        verb: {
            type: 'string',
            enum: ['look', 'take', 'use', 'go', 'talk', 'open', 'push', 'pull', 'inventory', 'combine'],
        },
        subject: { type: ['string', 'null'] },
        target: { type: ['string', 'null'] },
    },
    required: ['verb', 'subject', 'target'],
} as const;

/** Set of valid verbs the LLM is allowed to produce */
const VALID_VERBS = new Set<string>([
    'look', 'take', 'use', 'go', 'talk', 'open', 'push', 'pull', 'inventory', 'combine',
]);

export class ResponseMapper {
    private nounResolver: NounResolver;

    constructor() {
        this.nounResolver = new NounResolver();
    }

    /**
     * Parse the LLM's JSON response content and map it to a ParseResult.
     * Resolves subject/target strings to entity IDs via NounResolver.
     *
     * @param responseContent - Raw JSON string from LLM message.content
     * @param hotspots - Current room hotspots
     * @param exits - Current room exits
     * @param inventoryItems - Player's inventory items
     * @param rawInput - Original player input string
     */
    map(
        responseContent: string,
        hotspots: HotspotData[],
        exits: ExitData[],
        inventoryItems: Array<{ id: string; name: string }>,
        rawInput: string,
    ): ParseResult {
        // 1. Parse JSON
        let parsed: { verb: string; subject: string | null; target: string | null };
        try {
            parsed = JSON.parse(responseContent);
        } catch {
            return { success: false, error: "I didn't quite understand that." };
        }

        // 2. Validate verb
        if (!parsed.verb || !VALID_VERBS.has(parsed.verb)) {
            return { success: false, error: "I didn't quite understand that." };
        }

        const verb = parsed.verb as Verb;

        // 3. Resolve subject through NounResolver
        let subject: string | null = null;
        if (parsed.subject && parsed.subject.trim()) {
            const resolved = this.nounResolver.resolve(
                parsed.subject,
                hotspots,
                exits,
                inventoryItems,
            );
            subject = resolved.id;
        }

        // 4. Resolve target through NounResolver
        let target: string | null = null;
        if (parsed.target && parsed.target.trim()) {
            const resolved = this.nounResolver.resolve(
                parsed.target,
                hotspots,
                exits,
                inventoryItems,
            );
            target = resolved.id;
        }

        // 5. Return successful ParseResult
        return {
            success: true,
            action: {
                verb,
                subject,
                target,
                rawInput,
            },
        };
    }
}
