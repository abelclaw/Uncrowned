# Phase 5: LLM Integration - Research

**Researched:** 2026-02-21
**Domain:** Ollama local LLM integration for natural language command parsing in browser-based adventure game
**Confidence:** HIGH

## Summary

Phase 5 layers an LLM-powered natural language parser on top of the existing deterministic TextParser (Phase 3). The architecture is a HybridParser that tries regex first (instant), falls back to Ollama when regex fails (sub-2s), and degrades to the keyword parser error message if Ollama is unavailable. The key integration point is Ollama's REST API at `http://localhost:11434/api/chat` with the `format` parameter for structured JSON output, which constrains the LLM to return valid `GameAction`-compatible JSON matching the existing `Verb` type enum.

The existing codebase is well-prepared for this. `TextParser.parse()` already returns `ParseResult` with `success: boolean`. When `success` is false, the input was not understood by regex -- this is exactly the trigger point for LLM escalation. The `GameAction` interface (`verb`, `subject`, `target`, `rawInput`) is the universal contract between any parser and the game systems, meaning the LLM just needs to produce values matching this interface. The `CommandDispatcher` is already wired to consume `GameAction` objects regardless of their source.

**Primary recommendation:** Use raw `fetch()` against Ollama's `/api/chat` endpoint with `stream: false` and `format` set to a JSON schema constraining output to the `Verb` enum and nullable subject/target strings. Do NOT use the `ollama` npm package -- it adds 15KB+ of unnecessary abstraction over a single fetch call. Implement a `HybridParser` class that wraps `TextParser` and `OllamaClient`, with `AbortSignal.timeout(2000)` for the 2-second latency requirement, and availability detection via a lightweight GET to `http://localhost:11434/`.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| PARSE-03 | LLM parser (Ollama) interprets ambiguous/complex natural language into structured game actions | OllamaClient with structured output JSON schema constraining to Verb enum; PromptBuilder provides scene context; ResponseMapper validates and resolves nouns |
| PARSE-04 | Hybrid parser uses regex for simple commands and LLM for complex/ambiguous input | HybridParser tries TextParser.parse() first; only escalates to Ollama when regex returns success:false; deterministic path is instant |
| PARSE-05 | LLM prompt includes current scene context, inventory, and nearby objects | PromptBuilder assembles system prompt with room name, description, hotspot names/IDs, exit directions, inventory items, and valid verb list |
| PARSE-06 | Parser response time under 2 seconds for LLM, instant for regex | AbortSignal.timeout(2000) on fetch; stream:false for single response; keep_alive parameter keeps model warm; regex path has zero async overhead |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Native `fetch` | Browser built-in | HTTP client for Ollama REST API | Zero dependency; Ollama API is a single POST endpoint; no library wrapper needed |
| `AbortSignal.timeout()` | Browser built-in | 2-second timeout enforcement | Native API, supported in all modern browsers; cleaner than manual AbortController+setTimeout |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `zod` | 3.x | Schema validation for LLM response | Optional -- only if runtime validation of LLM JSON responses is desired beyond TypeScript types |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Raw `fetch` | `ollama` npm package (v0.6.3) | Adds 15KB+ bundle size for wrapping a single fetch call; browser import (`ollama/browser`) works but is overkill for one endpoint; raw fetch is simpler and easier to debug |
| `zod` validation | Manual `typeof` checks | Zod is heavier but safer; for a constrained enum + two nullable strings, manual validation is sufficient and avoids a new dependency |
| `AbortSignal.timeout(2000)` | Manual `AbortController` + `setTimeout` | `AbortSignal.timeout()` is cleaner; supported in Safari 16+, Chrome 103+, Firefox 100+ (all modern) |

### NOT Adding
| Library | Reason |
|---------|--------|
| `ollama` npm | One-endpoint integration does not justify a dependency; raw fetch is 15 lines |
| `zod` / `zod-to-json-schema` | Schema is static and simple (one enum + two strings); hardcoded JSON schema object is clearer |
| `langchain` / `instructor` | Massive over-engineering for a single structured output call |

**Installation:**
```bash
# No new dependencies needed -- using native fetch and AbortSignal
```

## Architecture Patterns

### Recommended Project Structure
```
src/game/
├── llm/                      # NEW: LLM integration layer (isolated)
│   ├── OllamaClient.ts       # Raw fetch wrapper for /api/chat
│   ├── PromptBuilder.ts       # Context-aware prompt construction
│   ├── ResponseMapper.ts      # JSON response -> ParseResult mapping + noun resolution
│   └── HybridParser.ts        # Orchestrator: regex-first, LLM-fallback
├── parser/                    # EXISTING: deterministic parser (unchanged)
│   ├── TextParser.ts          # Regex/keyword parser
│   ├── VerbTable.ts           # Verb synonyms and patterns
│   └── NounResolver.ts        # Noun matching
├── types/
│   └── GameAction.ts          # EXISTING: Verb, GameAction, ParseResult (unchanged)
└── scenes/
    └── RoomScene.ts           # MODIFIED: wire HybridParser instead of TextParser
```

### Pattern 1: HybridParser (Regex-First, LLM-Fallback)
**What:** A parser that tries the fast deterministic path first, then escalates to the LLM only when regex fails. This is the core architectural pattern for Phase 5.
**When to use:** Every player text command flows through this.
**Example:**
```typescript
// Source: Custom architecture based on existing TextParser contract
export class HybridParser {
    private textParser: TextParser;
    private ollamaClient: OllamaClient;
    private promptBuilder: PromptBuilder;
    private responseMapper: ResponseMapper;

    async parse(
        input: string,
        hotspots: HotspotData[],
        exits: ExitData[],
        inventoryItems?: Array<{ id: string; name: string }>,
        roomContext?: { name: string; description: string },
    ): Promise<ParseResult> {
        // 1. Try deterministic parser first (instant, zero latency)
        const regexResult = this.textParser.parse(input, hotspots, exits, inventoryItems);
        if (regexResult.success) {
            return regexResult;
        }

        // 2. Regex failed -- try LLM if available
        if (!this.ollamaClient.isAvailable()) {
            return regexResult; // Return regex error message as fallback
        }

        try {
            const prompt = this.promptBuilder.build(input, hotspots, exits, inventoryItems, roomContext);
            const llmResponse = await this.ollamaClient.chat(prompt);
            return this.responseMapper.map(llmResponse, hotspots, exits, inventoryItems, input);
        } catch (err) {
            // Timeout, network error, invalid response -- fall back silently
            console.warn('LLM parse failed, using regex fallback:', err);
            return regexResult;
        }
    }
}
```

### Pattern 2: Structured Output via JSON Schema
**What:** Ollama's `format` parameter constrains the LLM to produce valid JSON matching a strict schema. The schema uses `enum` for the verb field to guarantee only valid `Verb` values are returned.
**When to use:** Every Ollama API call.
**Example:**
```typescript
// Source: https://ollama.com/blog/structured-outputs
// Source: https://docs.ollama.com/capabilities/structured-outputs
const GAME_ACTION_SCHEMA = {
    type: "object",
    properties: {
        verb: {
            type: "string",
            enum: ["look", "take", "use", "go", "talk", "open", "push", "pull",
                   "inventory", "save", "load", "combine"]
        },
        subject: {
            type: ["string", "null"]
        },
        target: {
            type: ["string", "null"]
        }
    },
    required: ["verb", "subject", "target"]
};
```

### Pattern 3: Context-Aware Prompt Construction
**What:** The system prompt tells the LLM it is a text adventure parser. The user message includes the player's input along with structured context about the current scene. This grounds the LLM's interpretation in the actual game state.
**When to use:** Every LLM call.
**Example:**
```typescript
// Source: Architecture research, LLM text adventure patterns
const systemPrompt = `You are a text adventure game parser. Your job is to interpret the player's natural language input and convert it into a structured game action.

You MUST respond with a JSON object containing:
- "verb": one of the valid verbs listed below
- "subject": the primary object/target of the action (use the ID if possible, or name), or null
- "target": for two-object commands like "use X on Y", the secondary target, or null

Valid verbs: look, take, use, go, talk, open, push, pull, inventory, combine

Rules:
- Match the player's intent to the closest valid verb
- Use object IDs from the context when possible
- For movement, use exit directions or IDs
- If the player wants to examine something, use "look"
- If the player expresses desire to pick something up, use "take"
- If the player wants to combine or use one thing with another, use "use" with both subject and target`;

function buildUserMessage(
    input: string,
    roomName: string,
    roomDescription: string,
    hotspots: Array<{ id: string; name: string }>,
    exits: Array<{ id: string; direction?: string; label?: string }>,
    inventory: Array<{ id: string; name: string }>,
): string {
    return `Current room: ${roomName}
Description: ${roomDescription}

Objects in room:
${hotspots.map(h => `- ${h.name} (id: ${h.id})`).join('\n')}

Exits:
${exits.map(e => `- ${e.direction || e.label || e.id} (id: ${e.id})`).join('\n')}

Player inventory:
${inventory.length > 0 ? inventory.map(i => `- ${i.name} (id: ${i.id})`).join('\n') : '(empty)'}

Player says: "${input}"`;
}
```

### Pattern 4: Availability Detection with Warm-Ping
**What:** On game startup, ping Ollama to check availability. Cache the result. Re-check periodically or on failure. Use `keep_alive` parameter to keep model loaded in memory.
**When to use:** Game initialization and after any Ollama failure.
**Example:**
```typescript
// Source: https://github.com/ollama/ollama/issues/1378
// GET http://localhost:11434/ returns "Ollama is running" with 200 OK
export class OllamaClient {
    private available: boolean | null = null; // null = unchecked
    private readonly baseUrl = 'http://localhost:11434';
    private readonly model = 'qwen2.5:3b'; // Fast, good at structured output

    async checkAvailability(): Promise<boolean> {
        try {
            const res = await fetch(this.baseUrl, {
                signal: AbortSignal.timeout(1000)
            });
            this.available = res.ok;
        } catch {
            this.available = false;
        }
        return this.available;
    }

    isAvailable(): boolean {
        return this.available === true;
    }
}
```

### Pattern 5: Asynchronous Parse with "Thinking" Indicator
**What:** The LLM call is async. While waiting, show a thinking indicator in the narrator display. The game loop never blocks.
**When to use:** Whenever the LLM path is triggered.
**Anti-pattern:** Never `await` the LLM call inside the Phaser update loop. Always dispatch results via EventBus.

### Anti-Patterns to Avoid
- **Blocking the game loop:** Never await Ollama inside `update()`. Use async handlers triggered by EventBus events, show "thinking" animation while waiting.
- **Using the ollama npm package in browser:** Adds unnecessary bundle size. Raw fetch with `stream: false` is 15 lines of code.
- **Sending raw input without context:** The LLM cannot resolve "that shiny thing" without knowing what objects are in the room. Always include scene context.
- **Trusting LLM output blindly:** Always validate the response JSON. The `format` parameter constrains structure but the LLM might still return nonsensical subject/target strings. Use NounResolver to map LLM-returned strings to actual game IDs.
- **Cold model on first use:** The first Ollama call after model load takes 2-10 seconds. Send a warm-up ping during game initialization (Preloader scene) to pre-load the model.
- **Streaming for parser output:** Stream mode adds complexity for no benefit here. The complete response is a tiny JSON object (< 100 tokens). Use `stream: false` for simplicity.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| JSON schema validation | Custom schema validator | Ollama `format` parameter | Ollama enforces schema at token generation level via constrained decoding -- more reliable than post-hoc validation |
| HTTP timeout | Manual setTimeout + abort | `AbortSignal.timeout(2000)` | Browser-native, handles cleanup, differentiates timeout from user abort |
| Noun resolution for LLM output | New noun resolver | Existing `NounResolver` class | Already handles exact/partial matching against hotspots, exits, inventory; reuse it for LLM-returned subject/target strings |
| Prompt templating | Template engine | String concatenation | Prompt is a single template with ~5 variables; no need for Handlebars/Mustache |
| Retry logic | Exponential backoff library | Single attempt + fallback to regex | Sub-2s requirement means no time for retries; regex fallback is instant and always available |

**Key insight:** The existing parser infrastructure (TextParser, NounResolver, VerbTable, ParseResult, GameAction) is the foundation. The LLM layer is a thin wrapper that produces the same `ParseResult` output. No existing code needs to change its interface.

## Common Pitfalls

### Pitfall 1: CORS Blocking Browser-to-Ollama Requests
**What goes wrong:** Browser fetch to `http://localhost:11434` fails with CORS error because Ollama's default config does not include browser origins.
**Why it happens:** Ollama only allows same-origin requests by default. A Vite dev server on `http://localhost:5173` is a different origin.
**How to avoid:** Set `OLLAMA_ORIGINS="*"` environment variable on macOS:
```bash
launchctl setenv OLLAMA_ORIGINS "*"
# Then restart Ollama (quit and reopen the app)
```
**Warning signs:** `Access-Control-Allow-Origin` error in browser console. Fetch fails but curl works.
**Verification:** `curl -X OPTIONS http://localhost:11434 -H "Origin: http://localhost:5173" -H "Access-Control-Request-Method: POST" -I` should return `204 No Content` with CORS headers.

### Pitfall 2: Cold Model Load Causing First-Request Timeout
**What goes wrong:** First LLM call takes 5-15 seconds because Ollama needs to load the model into GPU/memory.
**Why it happens:** Ollama lazily loads models on first request. After 5 minutes idle (default `keep_alive`), the model is unloaded.
**How to avoid:** Send a warm-up request during the Preloader scene (before gameplay starts). Use `keep_alive: "30m"` in API calls to keep the model loaded longer.
```typescript
// During Preloader scene, fire-and-forget:
ollamaClient.warmUp(); // sends a trivial prompt to force model load
```
**Warning signs:** First command after game load takes 5+ seconds. Subsequent commands are fast.

### Pitfall 3: LLM Returning Natural Language Names Instead of IDs
**What goes wrong:** LLM returns `{ verb: "take", subject: "the shiny golden key" }` but the game expects `subject: "golden-key"` (the hotspot ID).
**Why it happens:** Even with context listing IDs, the LLM may prefer descriptive names.
**How to avoid:** The ResponseMapper must run LLM-returned subject/target through the existing NounResolver to map natural language strings to actual game entity IDs.
```typescript
// ResponseMapper.map():
const resolvedSubject = nounResolver.resolve(
    llmResponse.subject, hotspots, exits, inventoryItems
);
```
**Warning signs:** Commands parsed by LLM never match any hotspot/exit/item.

### Pitfall 4: LLM Returning Invalid Verbs Despite Schema Constraint
**What goes wrong:** Rarely, the LLM might return a verb outside the enum or a malformed JSON despite the `format` constraint.
**Why it happens:** Schema enforcement is grammar-based constraint but not 100% foolproof on all models, especially very small ones.
**How to avoid:** Always validate the parsed JSON: check verb is in Verb type, subject and target are strings or null. If validation fails, fall back to regex result.
**Warning signs:** `TypeError` or unexpected behavior in CommandDispatcher.

### Pitfall 5: Overloading the Prompt with Too Much Context
**What goes wrong:** Sending entire room JSON (puzzles, death triggers, walkable areas) makes the prompt too large, increasing latency and confusing the model.
**Why it happens:** Developer tries to be thorough and dumps everything.
**How to avoid:** Only include what the LLM needs for parsing: room name, description, hotspot names+IDs, exit directions+IDs, inventory item names+IDs. Never include puzzle logic, zone coordinates, or death triggers.
**Warning signs:** LLM latency exceeds 2 seconds consistently; model starts referencing puzzle solutions.

### Pitfall 6: Race Condition on Rapid Input
**What goes wrong:** Player types two commands quickly. First LLM call is still pending when second arrives. Both resolve and dispatch, causing double-execution.
**Why it happens:** Async LLM calls can overlap.
**How to avoid:** Implement a simple guard: if an LLM call is in-flight, either queue the new input or abort the pending call and start fresh. The simplest approach is to abort the previous call using AbortController.
**Warning signs:** Player sees two narrator responses for one command, or game state changes unexpectedly.

## Code Examples

### OllamaClient: Minimal Fetch Wrapper
```typescript
// Source: https://github.com/ollama/ollama/blob/main/docs/api.md
// Source: https://docs.ollama.com/capabilities/structured-outputs

interface OllamaChatRequest {
    model: string;
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
    format: object;
    stream: false;
    options?: { temperature?: number };
    keep_alive?: string;
}

interface OllamaChatResponse {
    message: { role: string; content: string };
    done: boolean;
    total_duration: number;
    eval_count: number;
}

export class OllamaClient {
    private available: boolean | null = null;
    private readonly baseUrl: string;
    private readonly model: string;
    private readonly timeoutMs: number;
    private pendingController: AbortController | null = null;

    constructor(
        baseUrl = 'http://localhost:11434',
        model = 'qwen2.5:3b',
        timeoutMs = 2000,
    ) {
        this.baseUrl = baseUrl;
        this.model = model;
        this.timeoutMs = timeoutMs;
    }

    async checkAvailability(): Promise<boolean> {
        try {
            const res = await fetch(this.baseUrl, {
                signal: AbortSignal.timeout(1000),
            });
            this.available = res.ok;
        } catch {
            this.available = false;
        }
        return this.available;
    }

    isAvailable(): boolean {
        return this.available === true;
    }

    async chat(
        systemPrompt: string,
        userMessage: string,
        schema: object,
    ): Promise<OllamaChatResponse> {
        // Abort any pending request
        if (this.pendingController) {
            this.pendingController.abort();
        }
        this.pendingController = new AbortController();

        const timeoutSignal = AbortSignal.timeout(this.timeoutMs);
        const combinedSignal = AbortSignal.any([
            this.pendingController.signal,
            timeoutSignal,
        ]);

        const body: OllamaChatRequest = {
            model: this.model,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userMessage },
            ],
            format: schema,
            stream: false,
            options: { temperature: 0 },
            keep_alive: '30m',
        };

        const res = await fetch(`${this.baseUrl}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
            signal: combinedSignal,
        });

        if (!res.ok) {
            throw new Error(`Ollama returned ${res.status}`);
        }

        this.pendingController = null;
        return res.json();
    }

    async warmUp(): Promise<void> {
        try {
            await fetch(`${this.baseUrl}/api/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: this.model,
                    messages: [{ role: 'user', content: 'hi' }],
                    stream: false,
                    keep_alive: '30m',
                }),
                signal: AbortSignal.timeout(15000), // Allow longer for model load
            });
        } catch {
            // Warm-up failure is non-critical
        }
    }
}
```

### PromptBuilder: Context Assembly
```typescript
// Source: Architecture research, LLM text adventure integration patterns

export class PromptBuilder {
    private static readonly SYSTEM_PROMPT = `You are a text adventure game command parser. Convert the player's natural language input into a structured game action JSON.

Valid verbs: look, take, use, go, talk, open, push, pull, inventory, combine

Rules:
- Match the player's intent to the closest valid verb
- For the "subject" field, use the object ID from the context when possible
- For the "target" field (two-object commands like "use X on Y"), use the object ID
- For movement commands, use exit direction or ID as the subject
- If the player wants to examine something, use verb "look"
- If the player expresses wanting to pick something up, use verb "take"
- If the input is about combining or using one item with another, use verb "use" with both subject and target
- Return null for subject/target when not applicable

Respond ONLY with the JSON object. No explanation.`;

    build(
        input: string,
        hotspots: Array<{ id: string; name: string }>,
        exits: Array<{ id: string; direction?: string; label?: string }>,
        inventoryItems: Array<{ id: string; name: string }>,
        roomContext: { name: string; description?: string },
    ): { systemPrompt: string; userMessage: string } {
        const objects = hotspots.map(h => `  - "${h.name}" (id: ${h.id})`).join('\n');
        const exitList = exits.map(e => {
            const label = e.direction || e.label || e.id;
            return `  - ${label} (id: ${e.id})`;
        }).join('\n');
        const inv = inventoryItems.length > 0
            ? inventoryItems.map(i => `  - "${i.name}" (id: ${i.id})`).join('\n')
            : '  (empty)';

        const userMessage = `Room: ${roomContext.name}
${roomContext.description ? `Description: ${roomContext.description}\n` : ''}
Objects here:
${objects || '  (none)'}

Exits:
${exitList || '  (none)'}

Inventory:
${inv}

Player input: "${input}"`;

        return {
            systemPrompt: PromptBuilder.SYSTEM_PROMPT,
            userMessage,
        };
    }
}
```

### ResponseMapper: LLM JSON to ParseResult
```typescript
// Source: Custom mapping using existing NounResolver

import type { ParseResult, Verb, GameAction } from '../types/GameAction.ts';
import type { HotspotData, ExitData } from '../types/RoomData.ts';
import { NounResolver } from '../parser/NounResolver.ts';

const VALID_VERBS: Set<string> = new Set([
    'look', 'take', 'use', 'go', 'talk', 'open', 'push', 'pull',
    'inventory', 'save', 'load', 'combine',
]);

interface LLMParsedAction {
    verb: string;
    subject: string | null;
    target: string | null;
}

export class ResponseMapper {
    private nounResolver = new NounResolver();

    map(
        responseContent: string,
        hotspots: HotspotData[],
        exits: ExitData[],
        inventoryItems: Array<{ id: string; name: string }>,
        rawInput: string,
    ): ParseResult {
        let parsed: LLMParsedAction;
        try {
            parsed = JSON.parse(responseContent);
        } catch {
            return { success: false, error: "I didn't quite understand that." };
        }

        // Validate verb
        if (!parsed.verb || !VALID_VERBS.has(parsed.verb)) {
            return { success: false, error: "I didn't quite understand that." };
        }

        const verb = parsed.verb as Verb;

        // Resolve subject through NounResolver (maps natural language to game IDs)
        const subject = parsed.subject
            ? this.nounResolver.resolve(parsed.subject, hotspots, exits, inventoryItems).id
            : null;

        // Resolve target through NounResolver
        const target = parsed.target
            ? this.nounResolver.resolve(parsed.target, hotspots, exits, inventoryItems).id
            : null;

        const action: GameAction = { verb, subject, target, rawInput };
        return { success: true, action };
    }
}
```

### JSON Schema for Ollama Format Parameter
```typescript
// Source: https://docs.ollama.com/capabilities/structured-outputs

export const GAME_ACTION_SCHEMA = {
    type: "object",
    properties: {
        verb: {
            type: "string",
            enum: [
                "look", "take", "use", "go", "talk",
                "open", "push", "pull", "inventory", "combine"
            ]
        },
        subject: {
            type: ["string", "null"]
        },
        target: {
            type: ["string", "null"]
        }
    },
    required: ["verb", "subject", "target"]
} as const;
```

### RoomScene Integration Point
```typescript
// MODIFIED command-submitted handler in RoomScene.create()
// The key change: TextParser -> HybridParser, sync -> async

this.commandSubmittedHandler = async (text: string) => {
    if (this.isTransitioning) return;

    const inventoryItems = this.itemDefs
        .filter(item => this.gameState.hasItem(item.id))
        .map(item => ({ id: item.id, name: item.name }));

    // Show thinking indicator for potentially slow LLM path
    this.narratorDisplay.showInstant('...');

    const parseResult = await this.hybridParser.parse(
        text,
        this.roomData.hotspots,
        this.roomData.exits,
        inventoryItems,
        { name: this.roomData.name, description: this.roomData.description },
    );

    if (!parseResult.success || !parseResult.action) {
        this.narratorDisplay.typewrite(
            parseResult.error ?? `I don't understand "${text}".`
        );
        return;
    }

    const result = this.commandDispatcher.dispatch(parseResult.action, this.roomData);
    // ... rest of dispatch handling unchanged
};
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `format: "json"` (unstructured) | `format: { type: "object", properties: {...} }` (JSON schema) | Ollama 0.5+ (late 2024) | LLM output is constrained at token-generation level via grammar-based decoding; dramatically more reliable than hoping the model produces valid JSON |
| Manual AbortController + setTimeout | `AbortSignal.timeout(ms)` | Chrome 103, Firefox 100, Safari 16 (2022-2023) | Cleaner timeout handling with automatic cleanup |
| `AbortController` only | `AbortSignal.any([...])` for combining signals | Chrome 124, Firefox 124, Safari 17.4 (2024) | Combine user-abort and timeout signals cleanly |
| Large models (13B+) for structured output | Small models (3B-7B) with constrained decoding | 2024-2025 | Grammar-based constraint means even small models produce perfect JSON; speed matters more than model size for a parser task |

**Model recommendations for structured output parsing:**

| Model | Size | Speed (Apple Silicon) | Quality | Recommended |
|-------|------|----------------------|---------|-------------|
| `qwen2.5:3b` | 3B | ~100+ tok/s, <500ms response | Good for simple parsing | Best default -- fastest with good accuracy |
| `qwen2.5:7b` | 7B | ~50-80 tok/s, <1s response | Very good | Upgrade if 3B struggles with ambiguous input |
| `phi4-mini` | 3.8B | ~80-100 tok/s | Good, strong reasoning | Alternative to qwen2.5:3b |
| `gemma2:2b` | 2B | ~120+ tok/s | Adequate | Fastest option if accuracy is sufficient |
| `llama3.2:3b` | 3B | ~100+ tok/s | Good | Another solid 3B option |

**Note:** Response time for a sub-100-token structured output (our use case) is dominated by time-to-first-token + small generation. On Apple Silicon with a 3B model, expect 200-800ms total. On CPU-only, expect 500-2000ms.

## Open Questions

1. **Exact model choice**
   - What we know: 3B-7B models with Ollama structured output work well for command parsing. qwen2.5:3b is the leading candidate.
   - What's unclear: Actual latency on the developer's specific hardware. Whether 3B accuracy is sufficient for highly ambiguous inputs.
   - Recommendation: Default to `qwen2.5:3b`. Make the model configurable. Test during implementation and upgrade to 7B if needed.

2. **CORS already configured?**
   - What we know: CORS must be set via `launchctl setenv OLLAMA_ORIGINS "*"` on macOS for browser fetch to work.
   - What's unclear: Whether the developer's Ollama instance already has CORS configured.
   - Recommendation: Include CORS setup as a prerequisite step in the plan. Verify with curl OPTIONS check.

3. **Warm-up timing**
   - What we know: Cold model load takes 5-15 seconds. Must happen before first player command.
   - What's unclear: Whether to warm up in Preloader scene or in RoomScene create().
   - Recommendation: Fire warm-up request in Preloader scene (after assets load, before scene transition). It's fire-and-forget; if it fails, the game still works via regex fallback.

## Sources

### Primary (HIGH confidence)
- [Ollama API Documentation](https://github.com/ollama/ollama/blob/main/docs/api.md) - /api/chat endpoint spec, format parameter, stream, keep_alive
- [Ollama Structured Outputs Docs](https://docs.ollama.com/capabilities/structured-outputs) - JSON schema format parameter, best practices (temperature 0, include JSON instruction in prompt)
- [Ollama Structured Outputs Blog](https://ollama.com/blog/structured-outputs) - curl examples, Zod integration, schema definition patterns
- [Ollama FAQ](https://docs.ollama.com/faq) - keep_alive default (5m), model loading behavior
- [MDN AbortSignal.timeout()](https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal/timeout_static) - Browser-native timeout API
- [Ollama CORS Configuration](https://objectgraph.com/blog/ollama-cors/) - macOS launchctl setup, verification with curl

### Secondary (MEDIUM confidence)
- [ollama-js GitHub](https://github.com/ollama/ollama-js) - Official JS library; v0.6.3; browser import `ollama/browser`; confirmed we don't need it for our use case
- [Ollama GitHub Issue #1378](https://github.com/ollama/ollama/issues/1378) - Health check: GET / returns "Ollama is running" with 200 OK
- [Small Language Models 2026 Guide](https://localaimaster.com/blog/small-language-models-guide-2026) - Model recommendations: qwen2.5, phi4-mini, gemma2
- [Best Ollama Models 2025](https://collabnix.com/best-ollama-models-in-2025-complete-performance-comparison/) - Performance benchmarks: 7B at 107+ tok/s, 3B at 100+ tok/s on GPU
- [Ollama Models Library](https://ollama.com/library) - Available models and sizes

### Tertiary (LOW confidence)
- [LLM Text Adventure Integration Patterns](https://machinelearningmastery.com/you-see-an-llm-here-integrating-language-models-text-adventure-games/) - General patterns for LLM in text adventures (could not access full article)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Using native fetch + Ollama REST API; well-documented, verified endpoints
- Architecture: HIGH - HybridParser pattern maps directly to existing TextParser/ParseResult contract; no interface changes needed
- Pitfalls: HIGH - CORS, cold start, noun resolution, and timeout are well-documented issues with known solutions
- Model selection: MEDIUM - Model performance depends on specific hardware; qwen2.5:3b is a strong default but may need adjustment

**Research date:** 2026-02-21
**Valid until:** 2026-03-21 (Ollama API is stable; model recommendations may shift as new models release)
