/**
 * Orchestrates regex-first, LLM-fallback parsing.
 *
 * Pipeline:
 * 1. Try TextParser (deterministic regex) -- instant, handles well-formed commands.
 * 2. If regex succeeds, return immediately.
 * 3. If regex fails and Ollama is unavailable, return the regex error (graceful fallback).
 * 4. If regex fails and Ollama is available, try the LLM path:
 *    a. Build prompt with scene context
 *    b. Send to Ollama via OllamaClient
 *    c. Map response to ParseResult via ResponseMapper
 * 5. If LLM path throws (timeout, network, abort, invalid), fall back to regex error.
 */

import type { ParseResult } from '../types/GameAction';
import type { HotspotData, ExitData } from '../types/RoomData';
import { TextParser } from '../parser/TextParser';
import { OllamaClient } from './OllamaClient';
import { PromptBuilder } from './PromptBuilder';
import { ResponseMapper, GAME_ACTION_SCHEMA } from './ResponseMapper';

export class HybridParser {
    private textParser: TextParser;
    private ollamaClient: OllamaClient;
    private promptBuilder: PromptBuilder;
    private responseMapper: ResponseMapper;

    constructor() {
        this.textParser = new TextParser();
        this.ollamaClient = new OllamaClient();
        this.promptBuilder = new PromptBuilder();
        this.responseMapper = new ResponseMapper();

        // Fire-and-forget availability check so it's known by first command
        this.ollamaClient.checkAvailability();
    }

    /**
     * Parse player input using regex first, then LLM fallback if available.
     *
     * @param input - Raw text typed by the player
     * @param hotspots - Current room's interactive hotspots
     * @param exits - Current room's exits
     * @param inventoryItems - Player's inventory items (optional)
     * @param roomContext - Current room name and description (optional)
     * @returns ParseResult with success/failure and optional GameAction or error
     */
    async parse(
        input: string,
        hotspots: HotspotData[],
        exits: ExitData[],
        inventoryItems?: Array<{ id: string; name: string }>,
        roomContext?: { name: string; description?: string },
    ): Promise<ParseResult> {
        // 1. Try regex parser (synchronous, instant)
        const regexResult = this.textParser.parse(input, hotspots, exits, inventoryItems);

        // 2. If regex succeeded, return immediately (fast path)
        if (regexResult.success) {
            return regexResult;
        }

        // 3. If Ollama is not available, return the regex error (graceful fallback)
        if (!this.ollamaClient.isAvailable()) {
            return regexResult;
        }

        // 4. Try the LLM path
        try {
            const prompt = this.promptBuilder.build(
                input,
                hotspots.map(h => ({ id: h.id, name: h.name })),
                exits.map(ex => ({ id: ex.id, direction: ex.direction, label: ex.label })),
                inventoryItems ?? [],
                roomContext ?? { name: 'unknown' },
            );

            const response = await this.ollamaClient.chat(
                prompt.systemPrompt,
                prompt.userMessage,
                GAME_ACTION_SCHEMA,
            );

            const mapped = this.responseMapper.map(
                response.content,
                hotspots,
                exits,
                inventoryItems ?? [],
                input,
            );

            return mapped;
        } catch (err) {
            // 5. LLM path failed -- fall back to regex error
            console.warn('LLM parse failed, using regex fallback:', err);
            return regexResult;
        }
    }
}
