# Uncrowned — A King's Quest-Inspired Adventure

## Current State

**Version:** v2.0 (shipped 2026-02-21)
**Status:** Feature-complete adventure game with progressive hints, death gallery, multiple endings, and mobile support. Art assets pending Flux generation.

### What's Built
- Browser-based HTML5 Canvas adventure game (Phaser 3 + TypeScript + Vite)
- Pixel art rendering at 960x540 with per-room lazy-loaded backgrounds and 3-layer parallax
- Point-and-click movement with navmesh pathfinding
- Natural language text parser (deterministic regex + Ollama LLM fallback via qwen2.5:3b)
- Inventory system with item combination puzzles
- PuzzleEngine with JSON-defined condition/action pairs
- Death system with sardonic narrator commentary, instant auto-save reset, and 43-death gallery
- Progressive hint system with 3-tier escalation (41 hint chains, 123 texts) and auto-escalation
- 4 distinct endings via 2x2 flag matrix with EndingScene epilogues and EndingsGalleryScene
- NPC dialogue via inkjs with branching conversations
- AudioManager with SFX, music crossfade, and ambient layers
- 36 rooms across 4 acts, 37 items, 11 NPCs, 12 ink dialogue scripts
- Save/load with auto-save, 5 manual slots, schema migration (v1->v2->v3), and JSON export/import
- MetaGameState for cross-playthrough persistence (deaths, endings)
- Mobile responsive with VerbBar (6 touch verbs), MobileKeyboardManager, dvh layout
- ComfyUI + Flux art pipeline (scripts, manifest, style guide) ready for generation
- 152 automated tests

### What Needs Real Hardware
- Flux art generation (ComfyUI + GPU) to replace 91 placeholder PNGs with pixel art
- iOS Safari real-device testing for keyboard behavior and pinch-zoom

## Core Value

The text parser must feel magical — players type natural language commands and the game understands them, creating that classic adventure game feeling of conversing with a world. Everything else (graphics, puzzles, story) builds on this foundation.

## Context

**Genre heritage:** Sierra's King's Quest series (1984-1998) pioneered the graphic adventure genre — players explored fantasy worlds, typed commands, solved inventory puzzles, and died in creative ways.

**Modern twist:** Instead of a keyword parser that only understands "GET LAMP", this game uses a local LLM to understand natural language. "Maybe I should try picking up that shiny thing" and "GET LAMP" should both work.

**Tone:** The narrator is sardonic and self-aware. Deaths are morbidly funny, not frustrating. Think Monkey Island meets Dark Souls death messages.

## Constraints

- **Tech stack**: Browser-based (HTML5 Canvas + TypeScript), Ollama for LLM, local Flux for art generation
- **LLM dependency**: Game gracefully handles Ollama being unavailable (fallback to keyword matching)
- **Performance**: Text parsing under 2 seconds for LLM path, instant for regex
- **Self-contained**: No external API dependencies at runtime — everything runs locally

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Browser (HTML5 Canvas) over desktop | Maximum accessibility, easy to share, no install | Validated v1.0 |
| Ollama for text parsing over cloud APIs | No API costs, works offline, player privacy | Validated v1.0 |
| Dark comedy tone | Distinctive voice, matches adventure game death tradition | Validated v1.0 |
| Features-before-content approach | Build engine with placeholders, validate fun, then scale | Validated v1.0 |
| Deterministic parser before LLM | Proves gameplay works without AI dependency | Validated v1.0 |
| Flux art deferred to build-time pipeline | Focus v1 on gameplay, art pipeline needs GPU hardware | Pipeline built v2.0, art pending |
| MetaGameState separate from save slots | Cross-playthrough data (deaths, endings) survives new-game | Validated v2.0 |
| Save migration chain (v1->v2->v3) | Forward-compatible save format evolution | Validated v2.0 |
| 2x2 flag matrix for endings | 4 endings from 2 binary choices — simple, testable, replayable | Validated v2.0 |
| 3-tier hint escalation | Vague->medium->explicit prevents spoiling while helping stuck players | Validated v2.0 |
| VerbBar for mobile input | 6 touch buttons cover all verbs without typing | Validated v2.0 |
| localStorage key preservation | Kept `kqgame-*` keys despite rename to Uncrowned — backward compat | Validated v2.0 |
| Spawn-outside-exit guard | Prevents transition loops when player spawns near exit zones | Added v2.0 (bug fix) |

<details>
<summary>v1.0 Original Project Brief</summary>

**What This Is:** A browser-based point-and-click adventure game in the spirit of Sierra's King's Quest series. The player navigates pixel art scenes, interacts with objects and NPCs through natural language text commands parsed by a local LLM (Ollama), solves puzzles, and experiences a ~5-hour fantasy adventure filled with dark comedy death scenes and a sardonic narrator.

**Art pipeline:** Scene backgrounds will be generated using a local Flux/Stable Diffusion model, then touched up for pixel art consistency. Character sprites and UI elements will be simpler programmatic pixel art.

**LLM integration:** Ollama running locally provides the text parser. The game sends the current scene context + player input to the LLM, which returns structured actions the game engine can execute.

**Content scope:** ~5 hours of gameplay means substantial content authoring — story, puzzles, scenes, dialogue, death scenes all need to be designed in detail.
</details>

---
*Last updated: 2026-02-21 after v2.0 milestone completed*
