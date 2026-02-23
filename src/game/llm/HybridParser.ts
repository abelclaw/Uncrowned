/**
 * Orchestrates regex-first, NLP-fallback parsing.
 *
 * Pipeline:
 * 1. Try TextParser (deterministic regex) -- instant, handles well-formed commands.
 * 2. If regex succeeds, return immediately.
 * 3. If regex fails, try CompromiseParser (POS-based NLP fallback).
 * 4. If CompromiseParser succeeds, return its result.
 * 5. If both fail, return the regex error message.
 */

import type { ParseResult } from '../types/GameAction';
import type { HotspotData, ExitData } from '../types/RoomData';
import { TextParser } from '../parser/TextParser';
import { CompromiseParser } from '../parser/CompromiseParser';

export class HybridParser {
    private textParser: TextParser;
    private compromiseParser: CompromiseParser;

    constructor() {
        this.textParser = new TextParser();
        this.compromiseParser = new CompromiseParser();
    }

    /**
     * Parse player input using regex first, then NLP fallback.
     *
     * @param input - Raw text typed by the player
     * @param hotspots - Current room's interactive hotspots
     * @param exits - Current room's exits
     * @param inventoryItems - Player's inventory items (optional)
     * @returns ParseResult with success/failure and optional GameAction or error
     */
    parse(
        input: string,
        hotspots: HotspotData[],
        exits: ExitData[],
        inventoryItems?: Array<{ id: string; name: string }>,
    ): ParseResult {
        // 1. Try regex parser (synchronous, instant)
        const regexResult = this.textParser.parse(input, hotspots, exits, inventoryItems);

        // 2. If regex succeeded, return immediately (fast path)
        if (regexResult.success) {
            return regexResult;
        }

        // 3. Try NLP fallback (compromise.js POS tagging)
        const nlpResult = this.compromiseParser.parse(input, hotspots, exits, inventoryItems);

        // 4. If NLP succeeded, return its result
        if (nlpResult && nlpResult.success) {
            return nlpResult;
        }

        // 5. Both failed -- return regex error message
        return regexResult;
    }
}
