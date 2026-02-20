# Stack Research

**Domain:** Browser-based graphic adventure game with LLM text parsing and local AI image generation
**Researched:** 2026-02-20
**Confidence:** MEDIUM-HIGH

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Phaser | 3.90.0 (stable) | 2D game engine / renderer | The dominant HTML5 game framework. Batteries-included: scene management, physics, input, tweens, audio, tilemaps, and native Aseprite sprite import. Phaser 4 (RC6) exists but is still pre-release as of Feb 2026 -- use stable v3 to avoid chasing breaking changes on a content-heavy project. |
| TypeScript | ~5.7 | Language / type safety | Catches bugs before runtime in a game with complex state (inventory, puzzles, save/load). Phaser 3 ships full type definitions. Every Phaser + Vite template defaults to TS. |
| Vite | 7.x | Dev server + bundler | Official Phaser template uses Vite. Instant HMR during scene iteration, pre-configured for canvas/WebGL, handles asset imports. Vite 7 is latest stable (Node 20.19+). |
| ollama (npm) | 0.6.x | LLM text parsing client | Official Ollama JS library with dedicated browser export (`ollama/browser`). Provides chat, generate, streaming, and structured output APIs over HTTP to local Ollama server on port 11434. |
| ComfyUI | latest | Local image generation backend | Node-based workflow engine for Flux/SD models. Exposes REST API (`/prompt` endpoint) and WebSocket progress updates. Workflows are exportable JSON -- perfect for programmatic scene art generation. |
| inkjs | 2.4.x | Narrative scripting runtime | JavaScript port of inkle's ink language. Zero dependencies, browser-compatible, full TypeScript types. Handles branching dialogue, narrator text, and story state. Used in 80 Days, Heaven's Vault, and hundreds of indie games. |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| phaser3-rex-plugins | 1.80.x | UI components (text input, textbox, dialogs) | Text input field for player commands. RexUI provides InputText, TextBox, and TextAreaInput components that work within the Phaser canvas -- no DOM overlay hacking needed. |
| localforage | 1.10.x | Save/load game state | Wraps IndexedDB with localStorage fallback. Async API prevents main thread blocking. Stores complex JS objects (inventory, puzzle state, scene progress) beyond localStorage's 5MB limit. |
| howler.js | 2.2.x | Audio (music, SFX, narrator voice) | Phaser has built-in audio, but Howler provides sprite-based audio, spatial audio, and better cross-browser WebAudio fallback if Phaser's audio proves insufficient. Start with Phaser audio; reach for Howler only if needed. |
| Aseprite | 1.3.x | Pixel art creation + animation | Industry standard for pixel art sprites. Exports PNG + JSON spritesheets that Phaser imports natively via `this.load.aseprite()`. Tags map directly to Phaser animation names. |
| Tiled | 1.11.x | Scene/room layout editor | Free tilemap editor. Exports JSON that Phaser loads via `this.load.tilemapTiledJSON()`. Multi-layer support for backgrounds, walkable areas, and interactive hotspots. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| Vitest | Unit/integration testing | 4.x stable. Native Vite integration -- shares config, transforms, and resolve. Test game logic (parser, inventory, puzzle state) without touching the renderer. |
| ESLint + Prettier | Code quality | Standard tooling. Use `@typescript-eslint` for TS-aware linting. |
| Ollama (server) | Local LLM runtime | Runs models like Llama 3.1 8B or Mistral 7B locally. Requires 8-16GB RAM depending on model. Set `OLLAMA_ORIGINS` to allow browser CORS from Vite dev server. |
| ComfyUI Desktop | Image generation UI | Pipeline for generating scene art with Flux.1 Dev/Schnell models. Export workflow as JSON, call via API from build scripts. Requires 16-24GB VRAM for Flux Dev (FP8), or 8GB for Schnell. |

## Phaser 3 vs Phaser 4 Decision

**Recommendation: Use Phaser 3.90.0 (final stable v3 release)**

| Factor | Phaser 3 | Phaser 4 RC6 |
|--------|----------|--------------|
| Stability | Production-proven, used in thousands of shipped games | Pre-release (RC6, Dec 2025). "No further RCs anticipated" but not GA. |
| Ecosystem | Massive plugin ecosystem (RexUI, Tiled integration, community) | Plugins need migration. RexUI not yet ported. |
| Documentation | Comprehensive docs, tutorials, examples | Sparse docs, migration guides in progress |
| TypeScript | Full type definitions, community TS templates | Native TypeScript (ported from JS), but less battle-tested |
| Aseprite support | `this.load.aseprite()` -- built-in since v3.50 | Should carry forward but unverified in RC6 |
| Risk | None -- final v3 release, will receive security patches | Breaking changes still possible before GA |

**Rationale:** This project is content-heavy (~5 hours of gameplay). Stability and ecosystem maturity matter more than bleeding-edge features. Phaser 4's main benefit (native TypeScript) is achievable with Phaser 3 + TS definitions. If Phaser 4 reaches GA during development, migration is documented as straightforward since v4 is not an API rewrite.

## LLM Model Recommendation for Text Parsing

**Primary: Llama 3.1 8B via Ollama**

| Model | Size | Speed | Quality | Use Case |
|-------|------|-------|---------|----------|
| Llama 3.1 8B | ~4.7GB | 40-70 tok/s on modern GPU | Good for structured extraction | Primary text parser -- extract verb/noun/target from player input |
| Mistral 7B | ~4.1GB | 50+ tok/s | Strong general reasoning | Alternative if Llama quality is insufficient |
| Llama 3.3 8B | ~4.7GB | 40-70 tok/s | Improved over 3.1 | Upgrade path if available in Ollama library |

**Why 8B models:** Player expects near-instant response (<1-2 seconds). Larger models (70B) drop to 10-15 tok/s, creating unacceptable latency in a game loop. 8B models fit in 8GB RAM and respond fast enough for interactive parsing.

**Structured output approach:** Use Ollama's JSON mode to extract structured commands:
```typescript
// Prompt template for text parsing
const systemPrompt = `You are a text adventure parser. Given player input, extract:
- action: the verb (look, take, use, talk, go, open, etc.)
- target: the noun/object
- modifier: optional secondary object (e.g., "use key on door" -> modifier: "door")
Respond ONLY in JSON format.`;
```

## Image Generation Pipeline

**ComfyUI + Flux.1 Schnell for scene art generation**

This is a build-time tool, NOT runtime. Scene art is pre-generated during development and bundled as static assets.

| Component | Choice | Rationale |
|-----------|--------|-----------|
| Backend | ComfyUI | REST API, workflow-as-JSON, supports any model. More flexible than Automatic1111. |
| Model | Flux.1 Schnell | 4-step generation, Apache 2.0 license (free for commercial use), runs on 8GB VRAM. Use Flux.1 Dev for higher quality hero scenes. |
| Style enforcement | Pixel art LoRA | Load a pixel art LoRA into the ComfyUI workflow for consistent style across all generated scenes. |
| Output format | PNG 512x512 or 640x480 | Classic adventure game resolution. Upscale in Aseprite for pixel-perfect consistency. |
| Automation | Node.js build script | Script calls ComfyUI API with scene descriptions, downloads outputs to `assets/scenes/`. |

## Installation

```bash
# Initialize project from Phaser + Vite + TS template
npm create vite@latest kqgame -- --template vanilla-ts
cd kqgame

# Core game engine
npm install phaser@3.90.0

# LLM integration
npm install ollama

# Narrative engine
npm install inkjs

# UI components for Phaser
npm install phaser3-rex-plugins

# Persistent storage
npm install localforage

# Dev dependencies
npm install -D typescript vitest @vitest/coverage-v8 vite @types/node

# Optional: audio (only if Phaser audio is insufficient)
# npm install howler @types/howler
```

### External Tools (installed separately)

```bash
# Ollama LLM server (macOS)
brew install ollama
ollama pull llama3.1:8b

# Configure CORS for browser access
launchctl setenv OLLAMA_ORIGINS "http://localhost:5173"

# ComfyUI (for scene art generation pipeline)
# Follow: https://docs.comfy.org/get_started/first_generation
# Install Flux.1 Schnell model into comfyui/models/unet/
```

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Phaser 3.90 | PixiJS v8 | If you need maximum rendering performance and want to build your own game framework on top of a renderer. PixiJS is 3x smaller and 2x faster at pure rendering, but lacks scene management, physics, input handling, audio, tilemaps, and Aseprite support. Too much custom work for an adventure game. |
| Phaser 3.90 | Phaser 4 RC6 | If Phaser 4 reaches GA before significant development starts. Migration is documented as non-breaking for most APIs. |
| Phaser 3.90 | Godot (HTML5 export) | If you need a full game editor with visual scene composition. Heavier runtime, less web-native, and HTML5 export has known audio/input quirks. |
| ollama (npm) | Direct fetch() to Ollama API | If the ollama npm package causes issues. The Ollama API is simple REST -- `POST http://localhost:11434/api/chat` with JSON body. The npm package is a thin wrapper over fetch. |
| inkjs | Yarn Spinner (web) | If you need a visual dialogue editor. ink is more writer-friendly and has better web/JS support. Yarn Spinner is Unity-focused. |
| inkjs | Custom JSON dialogue trees | If dialogue is simple (no variables, no branching conditions). ink handles complex state tracking that custom JSON would require manual implementation for. |
| localforage | Raw localStorage | If save data is guaranteed under 5MB and you accept synchronous main-thread blocking. localforage is async and handles larger data. |
| ComfyUI | Automatic1111 (SDXL WebUI) | If you prefer a simpler UI for one-off generation. ComfyUI's API and workflow system is far superior for batch/scripted generation. |
| Flux.1 Schnell | Stable Diffusion 3.5 | If you have limited VRAM (<8GB). SD 3.5 runs on less hardware. Flux generally produces higher quality with better text rendering. |
| Vite 7 | Webpack 5 | Never for a new project in 2026. Vite is faster, simpler, and the standard for Phaser development. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Phaser 4 RC6 (for now) | Pre-release. RexUI plugin not ported. Documentation incomplete. Risk of breaking changes before GA. | Phaser 3.90.0 |
| Canvas API (raw) | No scene management, no asset loading, no animation system, no input handling. You would rebuild half of Phaser. | Phaser 3 |
| React/Vue for game rendering | DOM-based rendering is too slow for 60fps game loops with sprite animation. React state model conflicts with game loop patterns. | Phaser for game, DOM overlay for menus if needed |
| Kaboom.js / Kaplay | Simpler but less capable. No Aseprite support, smaller ecosystem, fewer plugins. Fine for game jams, not for a 5-hour content game. | Phaser 3 |
| OpenAI / Cloud LLM APIs | Violates the "must work entirely locally" requirement. Adds latency, cost, and internet dependency. | Ollama + local models |
| Electron wrapper | Unnecessary complexity. The game runs in any browser. Electron adds 100MB+ to distribution for no benefit. | Plain browser, or Tauri if desktop packaging is needed later |
| Redux for game state | Overkill for a single-player game without React. Adds boilerplate. | Plain TypeScript classes with serialization to localforage. Phaser's scene data + a simple game state manager is sufficient. |
| Webpack | Slower dev server, more complex config, no native HMR for Phaser. The Phaser community has moved to Vite. | Vite 7 |
| Twine / Inform | Text-only engines. Cannot render pixel art scenes, handle sprite animation, or manage a canvas-based game. | Phaser + inkjs |

## Stack Patterns by Variant

**If the LLM parsing latency is unacceptable (<2s target):**
- Use a smaller model: Mistral 7B or Phi-3 Mini (3.8B)
- Pre-compute common commands with a regex/keyword fallback parser
- Only invoke the LLM for ambiguous or complex inputs
- Because: Hybrid parsing gives instant responses for "look", "take sword", "go north" while LLM handles "rummage through the old man's pockets while he's not looking"

**If scene art generation quality is inconsistent:**
- Use Flux.1 Dev instead of Schnell (higher quality, needs 16GB+ VRAM)
- Add img2img refinement pass in ComfyUI workflow
- Manual touch-up in Aseprite for consistency
- Because: Generated art is a starting point. Final pixel art should be hand-polished for visual coherence across scenes.

**If targeting mobile browsers:**
- Phaser handles mobile well (touch input, responsive canvas)
- Use Phaser's scale manager for responsive layout
- Audio requires user interaction to start (browser autoplay policy)
- Because: Adventure games work well on mobile if text input UX is adapted (virtual keyboard, suggestion chips)

**If save files need to work across devices:**
- Add optional export/import of save JSON (download/upload file)
- No server needed -- just serialize game state to JSON blob
- Because: localforage is device-local. Cross-device sync would require a server, violating the local-only constraint.

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| phaser@3.90.0 | vite@7.x | Official template confirmed working. Use `@phaserjs/template-vite-ts` as starting point. |
| phaser@3.90.0 | phaser3-rex-plugins@1.80.x | RexUI tracks Phaser 3 releases. Check RexUI changelog if Phaser version changes. |
| phaser@3.90.0 | typescript@5.x | Full type definitions included in Phaser package. |
| ollama@0.6.x | Ollama server 0.5+ | The npm package calls Ollama's REST API. Server must be running separately. CORS must be configured. |
| vite@7.x | vitest@4.x | Share config via `vitest.config.ts` extending `vite.config.ts`. |
| inkjs@2.4.x | ink compiler 1.x | inkjs runtime is compatible with ink stories compiled by inky editor or inklecate CLI. |
| localforage@1.10.x | All modern browsers | Falls back gracefully: IndexedDB -> WebSQL -> localStorage. |

## Architecture Decision: No Framework, Just Phaser + TypeScript

This project does NOT need React, Vue, Svelte, or any UI framework. Reasons:

1. **Phaser owns the canvas** -- it handles rendering, input, scenes, and game loop
2. **UI elements** (inventory panel, text input, dialogue boxes) are rendered in Phaser via RexUI or custom game objects
3. **State management** is game state (player position, inventory, puzzle flags) -- not UI state. A plain TypeScript class serialized to localforage is simpler than any state library.
4. **The HTML page** is just a canvas element and maybe a thin DOM overlay for accessibility

Adding React would create a "two rendering systems" problem: React managing DOM and Phaser managing canvas, with complex synchronization between them. This is a common pitfall in browser game development.

## Sources

- [Phaser official site](https://phaser.io/) -- framework features, Aseprite support (MEDIUM confidence, 403 on fetch but cross-referenced with GitHub releases)
- [Phaser GitHub releases](https://github.com/phaserjs/phaser/releases) -- v3.90.0 stable, v4.0.0-RC6 pre-release confirmed (HIGH confidence)
- [Phaser v4 RC6 announcement](https://phaser.io/news/2025/12/phaser-v4-release-candidate-6-is-out) -- "no further RCs anticipated" (MEDIUM confidence)
- [Phaser + Vite + TypeScript template](https://phaser.io/news/2024/01/phaser-vite-typescript-template) -- official starter template (HIGH confidence)
- [ollama-js GitHub](https://github.com/ollama/ollama-js) -- v0.6.3, browser export path, API methods (HIGH confidence)
- [Ollama CORS FAQ](https://docs.ollama.com/faq) -- OLLAMA_ORIGINS environment variable (HIGH confidence)
- [Ollama blog: LLM-powered web apps](https://ollama.com/blog/building-llm-powered-web-apps) -- browser integration patterns (MEDIUM confidence)
- [ComfyUI docs](https://docs.comfy.org/get_started/first_generation) -- API workflow, /prompt endpoint (HIGH confidence)
- [ComfyUI programmatic API guide](https://comfyui.org/en/programmatic-image-generation-api-workflow) -- REST + WebSocket methods (MEDIUM confidence)
- [Flux vs SD comparison 2026](https://pxz.ai/blog/flux-vs-stable-diffusion:-technical-&-real-world-comparison-2026) -- Flux.1 Schnell specs, VRAM requirements (MEDIUM confidence)
- [inkjs GitHub](https://github.com/y-lohse/inkjs) -- v2.4.x, zero dependencies, TypeScript types (HIGH confidence)
- [ink official site](https://www.inklestudios.com/ink/) -- narrative scripting language design (HIGH confidence)
- [phaser3-rex-plugins npm](https://www.npmjs.com/package/phaser3-rex-plugins) -- v1.80.18, UI components (HIGH confidence)
- [localforage GitHub](https://github.com/localForage/localForage) -- async IndexedDB wrapper, fallback chain (HIGH confidence)
- [Vite releases](https://vite.dev/releases) -- v7.3.1 stable (HIGH confidence)
- [Vitest 4.0 announcement](https://www.infoq.com/news/2025/12/vitest-4-browser-mode/) -- stable browser mode (MEDIUM confidence)
- [Phaser vs PixiJS 2025](https://generalistprogrammer.com/comparisons/phaser-vs-pixijs) -- performance comparison, feature matrix (MEDIUM confidence)
- [Ollama models comparison 2025](https://collabnix.com/best-ollama-models-in-2025-complete-performance-comparison/) -- Llama 3.1 8B performance metrics (MEDIUM confidence)
- [Aseprite docs: sprite sheet export](https://www.aseprite.org/docs/sprite-sheet/) -- JSON + PNG export format (HIGH confidence)
- [W3C Games on Web: Data Storage](https://w3c.github.io/web-roadmaps/games/storage.html) -- IndexedDB vs localStorage for games (HIGH confidence)
- [LLM text adventure implementations](https://machinelearningmastery.com/you-see-an-llm-here-integrating-language-models-text-adventure-games/) -- design patterns for LLM game parsing (MEDIUM confidence)

---
*Stack research for: Browser-based King's Quest-style adventure game with LLM text parsing*
*Researched: 2026-02-20*
