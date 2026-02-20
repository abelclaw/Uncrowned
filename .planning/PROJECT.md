# KQGame — A King's Quest-Inspired Adventure

## What This Is

A browser-based point-and-click adventure game in the spirit of Sierra's King's Quest series. The player navigates pixel art scenes, interacts with objects and NPCs through natural language text commands parsed by a local LLM (Ollama), solves puzzles, and experiences a ~5-hour fantasy adventure filled with dark comedy death scenes and a sardonic narrator. Built as an HTML5 Canvas game that runs entirely in the browser (with a local Ollama backend for text parsing).

## Core Value

The text parser must feel magical — players type natural language commands and the game understands them, creating that classic adventure game feeling of conversing with a world. Everything else (graphics, puzzles, story) builds on this foundation.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Browser-based HTML5 Canvas adventure game engine
- [ ] Pixel art scene rendering with animated player character
- [ ] Natural language text command input parsed by local LLM (Ollama)
- [ ] Inventory system with item combination puzzles
- [ ] Logic and environmental puzzles
- [ ] Conversation-based puzzles with NPCs
- [ ] ~5 hours of gameplay content across a complete fantasy adventure
- [ ] Frequent, funny death scenes with dark comedy narrator
- [ ] Instant death reset — player can never get permanently stuck
- [ ] Scene art generation pipeline using local Flux model
- [ ] Point-and-click movement within scenes
- [ ] Save/load game state
- [ ] Complete story with beginning, middle, and end

### Out of Scope

- Mobile-native app — browser-first, mobile can come later
- Multiplayer — single-player adventure
- Voice acting — text and narrator only
- Cloud LLM APIs — local Ollama only, no API keys needed
- Procedural/random content — hand-crafted adventure, deterministic puzzles
- Combat system — puzzles and exploration, not fighting

## Context

**Genre heritage:** Sierra's King's Quest series (1984-1998) pioneered the graphic adventure genre — players explored fantasy worlds, typed commands, solved inventory puzzles, and died in creative ways. The games were known for their fairy-tale settings, challenging puzzles, and frequent (often unfair) deaths.

**Modern twist:** Instead of a keyword parser that only understands "GET LAMP" and "USE KEY ON DOOR", this game uses a local LLM to understand natural language. "Maybe I should try picking up that shiny thing" and "GET LAMP" should both work. This is the key differentiator.

**Art pipeline:** Scene backgrounds will be generated using a local Flux/Stable Diffusion model, then touched up for pixel art consistency. Character sprites and UI elements will be simpler programmatic pixel art.

**LLM integration:** Ollama running locally provides the text parser. The game sends the current scene context + player input to the LLM, which returns structured actions the game engine can execute. This needs to be fast enough to feel responsive (sub-2-second parsing).

**Tone:** The narrator is sardonic and self-aware. Deaths are morbidly funny, not frustrating. The game winks at adventure game conventions while still being a genuinely good adventure. Think Monkey Island meets Dark Souls death messages.

## Constraints

- **Tech stack**: Browser-based (HTML5 Canvas + JavaScript/TypeScript), Ollama for LLM, local Flux for art generation
- **LLM dependency**: Game must gracefully handle Ollama being unavailable (fallback to keyword matching)
- **Performance**: Text parsing must feel responsive — sub-2-second round trip to local LLM
- **Content scope**: ~5 hours of gameplay means substantial content authoring — story, puzzles, scenes, dialogue, death scenes all need to be designed in detail
- **Self-contained**: No external API dependencies at runtime — everything runs locally

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Browser (HTML5 Canvas) over desktop/terminal | Maximum accessibility, easy to share, no install | — Pending |
| Ollama for text parsing over cloud APIs | No API costs, works offline, player privacy | — Pending |
| Local Flux for scene art over asset packs | Unique art style, no licensing issues, fits pixel art aesthetic | — Pending |
| Dark comedy tone over slapstick/serious | Distinctive voice, matches adventure game death tradition | — Pending |
| All three puzzle types (inventory, logic, conversation) | Variety prevents fatigue over 5-hour playtime | — Pending |
| Story-first design over screen-count targets | Let the narrative drive scope, not arbitrary metrics | — Pending |

---
*Last updated: 2026-02-20 after initialization*
