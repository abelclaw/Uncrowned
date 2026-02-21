# KQGame — A King's Quest-Inspired Adventure

## Current State

**Version:** v1.0 (shipped 2026-02-21)
**Status:** MVP complete -- full adventure game engine with 5-hour fantasy adventure playable start to finish

### What's Built
- Browser-based HTML5 Canvas adventure game (Phaser 3 + TypeScript + Vite)
- Pixel art rendering at 960x540 with parallax scrolling
- Point-and-click movement with navmesh pathfinding
- Natural language text parser (deterministic regex + Ollama LLM fallback)
- Inventory system with item combination puzzles
- PuzzleEngine with JSON-defined condition/action pairs
- Death system with sardonic narrator commentary and instant auto-save reset
- NPC dialogue via inkjs with branching conversations
- AudioManager with SFX, music crossfade, and ambient layers
- 36 rooms across 4 acts, 37 items, 11 NPCs, 12 ink dialogue scripts
- Save/load with auto-save and 5 manual slots
- 50+ automated tests

### What's Not Built Yet
- Real pixel art assets (using placeholders)
- Flux art generation pipeline
- Progressive hint system
- Death gallery achievements
- Mobile-responsive layout
- Multiple endings

## Core Value

The text parser must feel magical — players type natural language commands and the game understands them, creating that classic adventure game feeling of conversing with a world. Everything else (graphics, puzzles, story) builds on this foundation.

## Next Milestone Goals

Not yet defined. Run `/gsd:new-milestone` to start v1.1 or v2.0 planning.

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
| Browser (HTML5 Canvas) over desktop | Maximum accessibility, easy to share, no install | Validated in v1.0 |
| Ollama for text parsing over cloud APIs | No API costs, works offline, player privacy | Validated in v1.0 |
| Dark comedy tone | Distinctive voice, matches adventure game death tradition | Validated in v1.0 |
| Features-before-content approach | Build engine with placeholders, validate fun, then scale | Validated in v1.0 |
| Deterministic parser before LLM | Proves gameplay works without AI dependency | Validated in v1.0 |
| Demo chapter before full game | Validate experience at small scale before 5-hour commitment | Validated in v1.0 |
| Flux art deferred to v2 | Focus v1 on gameplay, art pipeline needs separate validation | Pending for v2 |

<details>
<summary>v1.0 Original Project Brief</summary>

**What This Is:** A browser-based point-and-click adventure game in the spirit of Sierra's King's Quest series. The player navigates pixel art scenes, interacts with objects and NPCs through natural language text commands parsed by a local LLM (Ollama), solves puzzles, and experiences a ~5-hour fantasy adventure filled with dark comedy death scenes and a sardonic narrator.

**Art pipeline:** Scene backgrounds will be generated using a local Flux/Stable Diffusion model, then touched up for pixel art consistency. Character sprites and UI elements will be simpler programmatic pixel art.

**LLM integration:** Ollama running locally provides the text parser. The game sends the current scene context + player input to the LLM, which returns structured actions the game engine can execute.

**Content scope:** ~5 hours of gameplay means substantial content authoring — story, puzzles, scenes, dialogue, death scenes all need to be designed in detail.
</details>

---
*Last updated: 2026-02-21 after v1.0 milestone completion*
