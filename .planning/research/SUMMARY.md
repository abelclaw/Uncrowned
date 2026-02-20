# Project Research Summary

**Project:** KQGame -- A King's Quest-Inspired Adventure
**Domain:** Browser-based graphic adventure game with LLM text parsing and local AI image generation
**Researched:** 2026-02-20
**Confidence:** MEDIUM-HIGH

## Executive Summary

KQGame is a browser-based graphic adventure game in the King's Quest tradition, differentiated by a local LLM-powered natural language parser (Ollama) that replaces the rigid keyword parsers of the 1980s. The expert consensus is clear: build this with Phaser 3 as the game engine, TypeScript for safety, inkjs for narrative scripting, and a data-driven architecture where all game content (scenes, puzzles, items, dialogue) lives in JSON files interpreted by a generic engine. The rendering layer, game logic, and LLM integration must be cleanly separated. The LLM is an enhancement layer over a deterministic fallback parser -- never the sole path to game actions.

The recommended approach is features-before-content: build the complete engine with 3-5 placeholder scenes, validate that the core loop (type command, LLM parses, game responds, narrator comments) is fun and responsive, then scale to full content. The art pipeline (Flux/ComfyUI) generates pixel art scene backgrounds at build time, not runtime. The architecture follows five established patterns: data-driven scene definitions, event bus for system communication, LLM-as-a-service with structured output, scene manager as finite state machine, and condition/action puzzle system. These patterns are well-documented in game development literature and directly applicable.

The three highest risks are: (1) LLM response latency destroying game flow -- mitigated by streaming responses, model preloading, common-command caching, and a regex fallback parser; (2) content scope explosion -- 5 hours of adventure game content is massive, requiring disciplined phasing from a 30-minute demo to full game; and (3) unwinnable game states (the classic Sierra "dead man walking" problem) -- mitigated by structural design rules, automated puzzle dependency graph testing, and the project's own requirement that players can never get permanently stuck. Every critical pitfall has a known prevention strategy; none require novel engineering.

## Key Findings

### Recommended Stack

The stack centers on Phaser 3.90.0 (the final stable v3 release), chosen over Phaser 4 RC6 for ecosystem maturity, plugin support (RexUI for in-canvas UI components), and production stability. Phaser 4 is pre-release with sparse documentation and no RexUI port. The LLM integration uses the official `ollama` npm package with its browser export, targeting Llama 3.1 8B for sub-2-second response times on consumer hardware. All tooling is Vite 7 for dev/build and Vitest 4 for testing.

**Core technologies:**
- **Phaser 3.90.0:** 2D game engine -- batteries-included (scene management, physics, input, tweens, audio, Aseprite sprite import); dominant HTML5 game framework with massive ecosystem
- **TypeScript 5.7:** Type safety -- catches bugs in complex game state (inventory, puzzles, save/load); Phaser ships full type definitions
- **Vite 7:** Dev server and bundler -- official Phaser template, instant HMR, pre-configured for canvas/WebGL
- **ollama (npm) 0.6.x:** LLM client -- browser export for local Ollama server; chat, generate, streaming, and structured output APIs
- **inkjs 2.4.x:** Narrative scripting -- zero-dependency ink runtime for branching dialogue and story state
- **ComfyUI + Flux.1 Schnell:** Build-time scene art generation -- REST API workflow for batch pixel art creation (NOT runtime)
- **localforage 1.10.x:** Save/load persistence -- async IndexedDB wrapper with localStorage fallback
- **phaser3-rex-plugins 1.80.x:** In-canvas UI -- text input, dialog boxes, and panels without DOM overlay hacking

### Expected Features

**Must have (table stakes):**
- Scene rendering with pixel art backgrounds (40-60 scenes at full scope)
- Animated player character with walk cycle and interaction poses
- Text input parser powered by LLM (the core innovation)
- Inventory system with take, examine, use, and combine
- Room/scene navigation with clear exits
- Scene descriptions and "look" command
- Object interaction (examine, take, use on)
- NPC dialogue with authored knowledge and LLM delivery
- Save/load with auto-save per room transition
- Death sequences with humorous narrator and safe instant reset
- Complete story arc with beginning, middle, and end
- Narrator text output with dark comedy personality
- Sound effects, ambient audio, and background music

**Should have (differentiators):**
- LLM-powered natural language parser (THE differentiator -- "pick up that shiny thing" works)
- Dynamic narrator personality that reacts to player behavior patterns
- Death collection gallery (transform deaths into collectibles)
- Inventory combination puzzles
- Contextual narrator roasts for wrong actions ("You try to eat the door. The door is unimpressed.")
- Adaptive hint system via narrator (escalating hints in-character)
- Flux-generated scene art pipeline for unique visual identity

**Defer (v2+):**
- Full 5-hour story (ship 30-60 minute demo first)
- Conversation puzzles (hardest LLM feature -- get basic NPC dialogue right first)
- Easter eggs and hidden interactions
- Multiple save slots
- Full scene art consistency pass

**Rejected anti-features:** Fully procedural story (LLM narratives are incoherent over long sessions), multiplayer (destroys pacing), voice acting (TTS undermines dark comedy; text is the narrator's voice), combat system (antithetical to puzzle-solving), branching storylines (multiplies content exponentially), real-time/timed puzzles (hostile with text input + LLM latency), point-and-click alongside text parser (undermines the LLM differentiator).

### Architecture Approach

The architecture is a layered system with four clean boundaries: presentation (canvas renderer + HTML/CSS UI overlay + audio), game logic (scene manager FSM, player controller, puzzle engine, inventory, death system, all communicating via typed event bus), LLM integration (input sanitizer, Ollama client, response mapper producing typed GameAction structs, with regex fallback), and data (JSON scene/puzzle/item definitions, game state store, asset registry). The critical design principle is that the LLM layer is fully isolated -- the game engine never knows an LLM was involved; it receives a typed GameAction and validates it against game state. UI is HTML/CSS overlaying the canvas, NOT drawn on canvas (canvas handles only the game world).

**Major components:**
1. **Scene Manager (FSM):** Each room is a state; handles transitions, enter/exit hooks, pushdown stack for overlays (inventory, death screen)
2. **Puzzle Engine:** Data-driven condition/action system -- evaluates JSON puzzle definitions against game state, executes outcomes; all puzzles authored in JSON, zero code per puzzle
3. **Text Parser Service:** Three-layer parser -- deterministic keyword/regex (always works, instant), LLM-enhanced (Ollama, adds natural language understanding), graceful "I don't understand" fallback
4. **Event Bus:** Typed pub/sub for all inter-system communication; systems never directly reference each other
5. **Game State Store:** Single source of truth with structured sections (inventory, flags, scene, position, puzzle state); serialized to localforage for save/load
6. **Narrator Engine:** Text generation with typing effect, death quips, personality system, hint escalation

### Critical Pitfalls

1. **LLM response latency destroying game flow** -- Set `keep_alive: "2h"`, use streaming responses, cap output with `num_predict`, preload model on game start, cache common commands ("look", "inventory") to bypass LLM entirely, always show "thinking" animation
2. **Unwinnable game states (dead man walking)** -- Build puzzle dependency graph as first-class data structure, run automated graph traversal tests on every content change, ensure all key items remain reachable, follow Ron Gilbert's design rules
3. **LLM output nondeterminism breaking game logic** -- Never trust raw LLM output; validate against JSON schema, implement layered parsing (JSON parse -> regex extraction -> keyword match -> "I don't understand"), use Ollama's `format: "json"` mode, log every response
4. **Content scope explosion** -- 5 hours = massive scope; ship engine first with 3-5 scenes, expand content only after engine is proven; scope by scenes and puzzles not hours; ship Chapter 1 (30-60 min) as MVP
5. **AI-generated art style inconsistency** -- Establish strict style guide before generating art, use consistent seeds/prompts/LoRA, post-process through standardized pipeline (palette reduction, resolution normalization), validate on 3-5 test scenes before mass production
6. **Pixel art rendering destroyed by browser scaling** -- Set `image-rendering: pixelated`, disable `imageSmoothingEnabled`, render at native resolution and CSS-scale up, always use integer coordinates (`Math.floor()`); must be solved at canvas setup before any art is rendered

## Implications for Roadmap

Based on research, the architecture has a clear dependency chain that dictates build order. The golden rule from both architecture and pitfalls research: **features before content**. Build the complete engine, validate it works, then create content within the proven engine.

### Phase 1: Foundation and Rendering Engine
**Rationale:** Every system depends on the game loop, event bus, canvas renderer, and asset loader. Pixel art rendering must be correct from day one (Pitfall 6). Audio architecture must account for autoplay policy (Pitfall 7).
**Delivers:** Working game loop, event bus, canvas with pixel-perfect rendering, asset preloader, input manager, basic HTML/CSS UI shell, audio system with autoplay handling
**Addresses:** Scene rendering (table stakes), foundational infrastructure
**Avoids:** Pixel art rendering blur (Pitfall 6), audio autoplay issues (Pitfall 7), memory leaks from improper resource lifecycle (Pitfall 10)

### Phase 2: Scene System and Player Movement
**Rationale:** Scenes and player movement are prerequisites for all gameplay. The scene manager FSM and data-driven scene definitions must exist before puzzles, inventory, or NPC systems can operate.
**Delivers:** Scene manager FSM with transitions, player character with walk cycle and pathfinding on walkable areas, hotspot system, scene navigation between rooms, scene data JSON schema, 2-3 placeholder scenes
**Addresses:** Scene navigation, animated player character, room transitions (table stakes)
**Avoids:** Hardcoded scene logic anti-pattern -- data-driven from the start

### Phase 3: Core Game Systems
**Rationale:** The gameplay loop requires inventory, puzzle engine, text parser, narrator, and save/load. The fallback regex parser is built FIRST so the game is fully playable without LLM -- this validates the entire puzzle/interaction system without LLM latency concerns.
**Delivers:** Inventory manager, puzzle engine (condition/action JSON system), fallback regex text parser, narrator engine with typing effect, save/load with versioned schema, death system with auto-save and instant reset, game state store
**Addresses:** Inventory system, object interaction, save/load, death sequences, narrator voice, text parser (table stakes)
**Avoids:** Unwinnable game states (Pitfall 2 -- puzzle dependency graph built here), save corruption (Pitfall 8 -- versioned from day one), god object state anti-pattern

### Phase 4: LLM Integration
**Rationale:** LLM parsing is the key differentiator but architecturally it is an enhancement layer, not a dependency. The game must work without it (Phase 3 proves this). Isolating LLM integration lets you focus on latency, nondeterminism, and prompt engineering without blocking core gameplay.
**Delivers:** Ollama client with streaming, prompt builder with scene context injection, response mapper (JSON -> GameAction), parser switching (LLM with fallback), model preloading, common-command caching, "thinking" animation
**Addresses:** LLM-powered natural language parser (the differentiator), contextual narrator responses
**Avoids:** LLM latency destroying game flow (Pitfall 1), LLM nondeterminism breaking logic (Pitfall 3), synchronous LLM calls blocking game loop (Anti-pattern 4), prompt injection (Pitfall 9 -- design narrator to handle it with humor)

### Phase 5: Content MVP (Demo Chapter)
**Rationale:** Only begin content production after the engine is proven. A 30-60 minute demo chapter (3-5 scenes, 5-8 puzzles, one complete puzzle chain, multiple death scenarios) validates the full experience without committing to 5 hours of content.
**Delivers:** 3-5 fully authored scenes with art, complete puzzle chain, NPC dialogue for 2-3 characters, multiple death sequences with narrator quips, playable demo from start to mini-conclusion
**Addresses:** Story arc (phased), NPC dialogue, inventory combination puzzles, death gallery
**Avoids:** Content scope explosion (Pitfall 4 -- small scope validates before scaling), puzzle logic bias (Pitfall 11 -- blind playtest this demo)

### Phase 6: Art Pipeline and Polish
**Rationale:** The Flux/ComfyUI art pipeline should be validated on 3-5 scenes before mass production. Audio, visual polish, and UX improvements are layered in after gameplay is proven.
**Delivers:** Validated art generation pipeline (ComfyUI workflow, style guide, post-processing), sound effects and ambient audio per scene, background music, UI polish (inventory panel, dialog boxes), scene transitions (fades, cuts), hint system
**Addresses:** Scene art pipeline (differentiator), sound/music (table stakes), adaptive hint system
**Avoids:** AI art style inconsistency (Pitfall 5 -- style guide and pipeline validated before mass production), narrator repetition (Pitfall 14)

### Phase 7: Full Content Production
**Rationale:** With proven engine, validated art pipeline, and playtested demo chapter, scale to full game content. This is the longest phase -- pure content authoring, not engineering.
**Delivers:** Full 5-hour game with 15-25+ scenes, complete story arc, all puzzles, all death scenarios, conversation puzzles, easter eggs, examine-everything depth
**Addresses:** Complete story, conversation puzzles (v2 feature), easter eggs, full scope
**Avoids:** Content scope explosion (Pitfall 4 -- tracked via content spreadsheet), unwinnable states (automated graph tests run on every content addition)

### Phase Ordering Rationale

- **Phases 1-2 before Phase 3:** Game systems operate on scenes and hotspots; the scene system must exist first.
- **Phase 3 before Phase 4:** Building the fallback parser first validates the entire gameplay loop without LLM complexity. If the game is fun with regex parsing, the LLM will only make it better. If it is not fun without the LLM, the LLM will not save it.
- **Phase 4 before Phase 5:** LLM integration should be working before content production begins, so content authors can write for the natural language parser rather than the regex fallback.
- **Phase 5 before Phases 6-7:** A small content demo validates the full vertical slice before investing in art pipeline optimization or mass content production.
- **Sound/music is independent** and can be layered in at Phase 5 or 6 without blocking anything.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 4 (LLM Integration):** Ollama prompt engineering for game parsing is not well-documented; the structured output schema and context injection strategy will need experimentation. Latency benchmarks on target hardware are essential.
- **Phase 6 (Art Pipeline):** ComfyUI workflow design, LoRA selection for pixel art style, and post-processing pipeline need hands-on validation. The Flux model choice (Schnell vs Dev) depends on available VRAM.
- **Phase 5/7 (Content):** Puzzle dependency graph design and automated validation tooling need research during planning.

Phases with standard patterns (skip research-phase):
- **Phase 1 (Foundation):** Well-documented HTML5 Canvas game loop, event bus, and asset loading patterns. Phaser handles most of this.
- **Phase 2 (Scene System):** FSM scene management and A* pathfinding are textbook game development patterns. Phaser's scene system provides the foundation.
- **Phase 3 (Game Systems):** Inventory, puzzle engines, and save/load are well-established adventure game patterns with extensive documentation.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | MEDIUM-HIGH | Phaser 3, TypeScript, Vite are proven and well-documented. Ollama browser integration has good official docs but fewer production examples in games specifically. ComfyUI API is documented but art pipeline consistency is unproven for this use case. |
| Features | HIGH | Adventure game feature expectations are extremely well-documented across 40 years of the genre. The competitor analysis (King's Quest, Thimbleweed Park, AI Dungeon) provides clear differentiation guidance. Anti-feature decisions are well-reasoned. |
| Architecture | HIGH | Layered game architecture, FSM scene management, event bus, and data-driven content are textbook patterns with extensive documentation. The LLM integration layer design is sound but less battle-tested (MEDIUM for that specific component). |
| Pitfalls | HIGH | Every critical pitfall has multiple authoritative sources. Ron Gilbert's adventure game design rules, MDN Canvas/Audio documentation, and Ollama API docs provide concrete prevention strategies. LLM nondeterminism research is thorough. |

**Overall confidence:** MEDIUM-HIGH

### Gaps to Address

- **LLM parsing quality at game-speed:** No research found benchmarking Llama 3.1 8B specifically for structured game command extraction. The sub-2-second target is theoretically achievable but needs hardware-specific validation early in Phase 4.
- **Flux pixel art consistency with LoRA:** No validated LoRA model identified for the specific pixel art style needed. The art pipeline phase must include LoRA evaluation or training on reference scenes.
- **inkjs integration with LLM-driven dialogue:** inkjs handles branching narrative, but the interaction pattern between ink story state and LLM-generated NPC responses is not documented. This hybrid approach needs design during Phase 3/4.
- **Phaser 3 + HTML/CSS UI overlay pattern:** The architecture recommends HTML/CSS for UI over Phaser canvas, but most Phaser examples use either full-canvas UI (via RexUI) or full-DOM UI. The hybrid approach (Phaser canvas for game world, HTML/CSS for text input and panels) needs validation. RexUI may be sufficient and simpler.
- **Save data migration across development versions:** The strategy is clear (versioned schema + migration functions) but no template or library was identified for this in a Phaser/browser game context. Will need custom implementation.

## Sources

### Primary (HIGH confidence)
- [Phaser GitHub releases](https://github.com/phaserjs/phaser/releases) -- v3.90.0 stable confirmed
- [ollama-js GitHub](https://github.com/ollama/ollama-js) -- browser export, API methods, streaming
- [Ollama API docs](https://github.com/ollama/ollama/blob/main/docs/api.md) -- REST endpoints, structured output, keep_alive
- [inkjs GitHub](https://github.com/y-lohse/inkjs) -- runtime compatibility, TypeScript types
- [MDN: Canvas optimization](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Optimizing_canvas) -- rendering performance
- [MDN: Crisp pixel art look](https://developer.mozilla.org/en-US/docs/Games/Techniques/Crisp_pixel_art_look) -- pixel art rendering
- [Chrome: Web Audio Autoplay Policy](https://developer.chrome.com/blog/web-audio-autoplay) -- audio restrictions
- [localforage GitHub](https://github.com/localForage/localForage) -- IndexedDB wrapper, fallback chain
- [ComfyUI docs](https://docs.comfy.org/get_started/first_generation) -- API workflow
- [Ron Gilbert, "Why Adventure Games Suck" (1989)](https://grumpygamer.com/why_adventure_games_suck/) -- foundational design principles

### Secondary (MEDIUM confidence)
- [Phaser v4 RC6 announcement](https://phaser.io/news/2025/12/phaser-v4-release-candidate-6-is-out) -- pre-release status
- [Ollama blog: LLM-powered web apps](https://ollama.com/blog/building-llm-powered-web-apps) -- browser integration patterns
- [Flux vs SD comparison 2026](https://pxz.ai/blog/flux-vs-stable-diffusion) -- model specs, VRAM requirements
- [Intra: LLM-driven text adventure design notes](https://ianbicking.org/blog/2025/07/intra-llm-text-adventure) -- LLM game design patterns
- [FlowHunt: Defeating Non-Determinism in LLMs](https://www.flowhunt.io/blog/defeating-non-determinism-in-llms/) -- LLM reproducibility
- [Thimbleweed Park Blog: Dialog Puzzles](https://blog.thimbleweedpark.com/dialog_puzzles.html) -- puzzle design by Ron Gilbert
- [Game Programming Patterns: State](https://gameprogrammingpatterns.com/state.html) -- FSM patterns

### Tertiary (LOW confidence)
- [Ollama models comparison 2025](https://collabnix.com/best-ollama-models-in-2025-complete-performance-comparison/) -- Llama 3.1 8B benchmarks (needs hardware-specific validation)
- [Wayline: Scope Creep in Indie Games](https://www.wayline.io/blog/scope-creep-indie-games-avoiding-development-hell) -- scope management (general, not adventure-game-specific)

---
*Research completed: 2026-02-20*
*Ready for roadmap: yes*
