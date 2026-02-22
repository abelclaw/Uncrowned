# Uncrowned

A King's Quest-inspired browser adventure game with a natural language text parser. Type commands like "take the rusty key" or "talk to the bridge troll" to explore a fantasy world across 36 rooms, solve puzzles, and claim the throne.

Built with Phaser 3, TypeScript, and Vite. Uses a local Ollama LLM as an optional fallback for creative text input.

## Quick Start

```bash
git clone https://github.com/abelclaw/Uncrowned.git
cd Uncrowned
npm install
npm run dev
```

Open http://localhost:5173 in your browser.

## Requirements

- **Node.js** 18+ ([download](https://nodejs.org))
- A modern browser (Chrome, Firefox, Safari, Edge)

## Optional: Ollama LLM Parser

The game has a deterministic regex parser that handles all standard commands. For more creative input ("smash the vase with the hammer" instead of "use hammer on vase"), you can run a local LLM:

```bash
brew install ollama          # macOS
ollama pull qwen2.5:3b       # ~2GB download
ollama serve                 # runs on localhost:11434
```

The game auto-detects Ollama and falls back to regex-only if unavailable.

## How to Play

Type commands in the text box at the bottom of the screen. Common verbs:

| Command | Example |
|---------|---------|
| **look** | `look around`, `look at throne` |
| **take** | `take rusty key`, `pick up lantern` |
| **use** | `use key on door`, `use lantern` |
| **go** | `go north`, `go to cave` |
| **talk** | `talk to bridge troll` |
| **give** | `give coin to troll` |
| **combine** | `combine seal with decree` |
| **open** | `open chest` |

You can also click on objects in the scene and use the verb bar (mobile) or arrow keys to move.

## Features

- 36 rooms across 3 acts with interconnected puzzles
- Natural language text parser with LLM fallback
- 43 unique death scenes with a Death Gallery
- 4 multiple endings based on player choices
- Progressive hint system (3-tier escalation)
- Weather, lighting, and particle effects per room
- Scene transitions (fade, wipe, pixelate, iris)
- Quality settings (High/Low/Off) for performance scaling
- Mobile responsive with touch controls
- Save/load system with localStorage persistence

## Development

```bash
npm run dev       # dev server with hot reload
npm run build     # production build to dist/
npm run preview   # preview production build
```

## Project Structure

```
src/game/
  scenes/         # Phaser scenes (Boot, Preloader, MainMenu, Room, Death, Endings)
  systems/        # Core systems (AudioManager, EffectsManager, PuzzleEngine, etc.)
  parser/         # Text parser (VerbTable regex + Ollama LLM fallback)
  llm/            # Ollama client wrapper
  types/          # TypeScript interfaces (RoomData, GameState, etc.)
public/assets/
  data/rooms/     # 36 room JSON definitions (puzzles, exits, effects)
  backgrounds/    # Room background images
  sprites/        # Player, NPC, and item sprites
  audio/          # Music, SFX, and ambient audio
scripts/          # Art generation pipeline (ComfyUI + Flux)
```

## Art Generation

Art assets are generated locally via ComfyUI + Flux with a pixel art LoRA. This requires a GPU and is not needed to play the game.

```bash
# Generate all 91 assets (requires ComfyUI running at localhost:8188)
npx tsx scripts/generate-art.ts --type all

# Dry run to see what would be generated
npx tsx scripts/generate-art.ts --dry-run --type all
```

## License

All rights reserved.
