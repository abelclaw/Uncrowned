/**
 * Context-aware prompt construction for the LLM parser.
 * Assembles system prompt (verb rules) and user message (scene context + player input)
 * for structured JSON output from Ollama.
 */

export class PromptBuilder {
    /**
     * System prompt that instructs the LLM how to parse commands.
     * Kept static -- only the user message changes per request.
     */
    static readonly SYSTEM_PROMPT = `You are a text adventure game command parser. Your job is to interpret the player's natural language input and respond with a JSON object containing:
- "verb": one of the valid verbs listed below
- "subject": the primary object/target of the action (use object IDs from context when possible), or null
- "target": the secondary object for two-noun commands, or null

Valid verbs: look, take, use, go, talk, open, push, pull, inventory, combine

Rules:
- "examine", "inspect", "check", "read" -> verb "look"
- "pick up", "grab", "get" -> verb "take"
- "move", "walk", "head", "enter" + a direction or place -> verb "go" with the exit/direction as subject
- "use X on Y", "apply X to Y" -> verb "use" with X as subject and Y as target
- "combine X with Y", "mix X and Y" -> verb "combine" with X as subject and Y as target
- "speak", "ask", "chat" -> verb "talk"
- "push", "shove" -> verb "push"
- "pull", "yank", "tug" -> verb "pull"
- "open", "unlock" -> verb "open"
- "inventory", "i", "items" -> verb "inventory" with null subject and null target
- Use the object IDs from the context when they match what the player is referring to
- Return null for subject/target when not applicable`;

    /**
     * Build the system prompt and user message for a given player input and scene context.
     */
    build(
        input: string,
        hotspots: Array<{ id: string; name: string }>,
        exits: Array<{ id: string; direction?: string; label?: string }>,
        inventoryItems: Array<{ id: string; name: string }>,
        roomContext: { name: string; description?: string },
    ): { systemPrompt: string; userMessage: string } {
        const lines: string[] = [];

        lines.push(`Room: ${roomContext.name}`);
        if (roomContext.description) {
            lines.push(`Description: ${roomContext.description}`);
        }

        lines.push('');
        lines.push('Objects here:');
        if (hotspots.length > 0) {
            for (const h of hotspots) {
                lines.push(`  - "${h.name}" (id: ${h.id})`);
            }
        } else {
            lines.push('  (none)');
        }

        lines.push('');
        lines.push('Exits:');
        if (exits.length > 0) {
            for (const ex of exits) {
                const label = ex.direction || ex.label || ex.id;
                lines.push(`  - ${label} (id: ${ex.id})`);
            }
        } else {
            lines.push('  (none)');
        }

        lines.push('');
        lines.push('Inventory:');
        if (inventoryItems.length > 0) {
            for (const item of inventoryItems) {
                lines.push(`  - "${item.name}" (id: ${item.id})`);
            }
        } else {
            lines.push('  (empty)');
        }

        lines.push('');
        lines.push(`Player input: "${input}"`);

        return {
            systemPrompt: PromptBuilder.SYSTEM_PROMPT,
            userMessage: lines.join('\n'),
        };
    }
}
