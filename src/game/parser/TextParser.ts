import type { ParseResult, Verb } from '../types/GameAction.ts';
import type { HotspotData, ExitData } from '../types/RoomData.ts';
import { VERB_TABLE, DIRECTION_SHORTCUTS } from './VerbTable.ts';
import { NounResolver, stripStopWords } from './NounResolver.ts';

/**
 * Deterministic text parser that tokenizes player input, matches verbs
 * via a synonym table, resolves nouns against room context, and produces
 * typed GameAction objects.
 *
 * Pipeline:
 * 1. Normalize input (trim, lowercase)
 * 2. Check for direction shortcuts (n/s/e/w etc.)
 * 3. Match verb from synonym table using regex patterns
 * 4. Extract noun phrases from regex capture groups
 * 5. Strip stop words from noun phrases
 * 6. Resolve nouns via NounResolver against room hotspots/exits
 * 7. Return ParseResult with GameAction
 */
export class TextParser {
    private nounResolver = new NounResolver();

    /**
     * Parse raw player input into a structured GameAction.
     *
     * @param input - Raw text typed by the player
     * @param hotspots - Current room's interactive hotspots
     * @param exits - Current room's exits
     * @returns ParseResult with success/failure and optional GameAction or error
     */
    parse(
        input: string,
        hotspots: HotspotData[],
        exits: ExitData[],
        inventoryItems?: Array<{ id: string; name: string }>,
    ): ParseResult {
        const rawInput = input;
        const trimmed = input.trim();

        // Reject empty input
        if (!trimmed) {
            return {
                success: false,
                error: "Please type a command. Try 'look' to see your surroundings.",
            };
        }

        const normalized = trimmed.toLowerCase();

        // Check for exit-listing queries ("where can i go", "exits", etc.)
        if (/^(?:where\s+(?:can|do|should)\s+i\s+go|(?:show|list|check)\s+exits|exits|directions|paths|ways?\s+out)$/.test(normalized)) {
            return {
                success: true,
                action: { verb: 'look', subject: '__exits__', target: null, rawInput },
            };
        }

        // Check for overview queries ("what can i do", "what's here", etc.)
        if (/^(?:what\s+can\s+i\s+do|what(?:'s|\s+is)\s+(?:here|around|available)|what\s+(?:are\s+my\s+)?options)$/.test(normalized)) {
            return {
                success: true,
                action: { verb: 'look', subject: '__overview__', target: null, rawInput },
            };
        }

        // Check for bare direction shortcuts first (n, s, e, w, north, south, etc.)
        if (normalized in DIRECTION_SHORTCUTS) {
            const direction = DIRECTION_SHORTCUTS[normalized];
            return {
                success: true,
                action: {
                    verb: 'go',
                    subject: this.resolveGoSubject(direction, hotspots, exits),
                    target: null,
                    rawInput,
                },
            };
        }

        // Try each verb definition's patterns
        for (const verbDef of VERB_TABLE) {
            for (const pattern of verbDef.patterns) {
                const match = normalized.match(pattern);
                if (match) {
                    return this.buildAction(verbDef.canonical, match, rawInput, hotspots, exits, inventoryItems);
                }
            }
        }

        // No verb matched
        return {
            success: false,
            error: `I don't understand "${trimmed}". Try commands like 'look', 'take', 'go', or 'use'.`,
        };
    }

    /**
     * Build a GameAction from a matched verb and regex capture groups.
     */
    private buildAction(
        verb: Verb,
        match: RegExpMatchArray,
        rawInput: string,
        hotspots: HotspotData[],
        exits: ExitData[],
        inventoryItems?: Array<{ id: string; name: string }>,
    ): ParseResult {
        const rawSubject = match[1]?.trim() || null;
        const rawTarget = match[2]?.trim() || null;

        // For "go" commands, resolve subject as direction/exit
        if (verb === 'go') {
            const subject = rawSubject
                ? this.resolveGoSubject(rawSubject, hotspots, exits)
                : null;
            return {
                success: true,
                action: { verb, subject, target: null, rawInput },
            };
        }

        // Resolve subject noun
        const subject = rawSubject
            ? this.resolveNoun(rawSubject, hotspots, exits, inventoryItems)
            : null;

        // Resolve target noun
        const target = rawTarget
            ? this.resolveNoun(rawTarget, hotspots, exits, inventoryItems)
            : null;

        return {
            success: true,
            action: { verb, subject, target, rawInput },
        };
    }

    /**
     * Resolve a noun phrase to a hotspot ID, exit ID, or raw string.
     * Stop words are stripped before resolution.
     */
    private resolveNoun(
        rawNoun: string,
        hotspots: HotspotData[],
        exits: ExitData[],
        inventoryItems?: Array<{ id: string; name: string }>,
    ): string {
        const cleaned = stripStopWords(rawNoun);
        const resolved = this.nounResolver.resolve(cleaned, hotspots, exits, inventoryItems);
        return resolved.id;
    }

    /**
     * Resolve the subject of a "go" command.
     * Priority: direction shortcuts -> exit direction -> exit label -> exit targetRoom -> general noun.
     * For "go" commands, exits take priority over hotspots to avoid
     * "go cave" matching a hotspot named "Dark Cave Mouth" instead of exit "to-cave".
     */
    private resolveGoSubject(
        rawNoun: string,
        _hotspots: HotspotData[],
        exits: ExitData[],
    ): string {
        const cleaned = stripStopWords(rawNoun).toLowerCase();

        // 1. Check if it's a direction shortcut (n/s/e/w/north/south etc.)
        if (cleaned in DIRECTION_SHORTCUTS) {
            const direction = DIRECTION_SHORTCUTS[cleaned];
            return direction;
        }

        // 2. Check exit direction field
        for (const ex of exits) {
            if (ex.direction && ex.direction.toLowerCase() === cleaned) {
                return ex.id;
            }
        }

        // 3. Check exit label (exact match)
        for (const ex of exits) {
            if (ex.label && ex.label.toLowerCase() === cleaned) {
                return ex.id;
            }
        }

        // 4. Check exit targetRoom (partial match)
        for (const ex of exits) {
            if (ex.targetRoom.toLowerCase().includes(cleaned)) {
                return ex.id;
            }
        }

        // 5. Fall back to general noun resolution (may match hotspot or return raw)
        const resolved = this.nounResolver.resolve(cleaned, [], exits);
        return resolved.id;
    }
}
