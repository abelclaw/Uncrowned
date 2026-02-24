# How Uncrowned Was Built

A complete reference for recreating this workflow on a different game. Covers project setup, AI-assisted development, art generation, audio synthesis, text parsing, and deployment.

## Overview

**Uncrowned** is a King's Quest-style browser adventure game with a natural language text parser. It was built almost entirely through AI-assisted development (Claude Code), with local AI image generation (ComfyUI + Flux) for art assets and Python synthesis for audio. The entire project — 255 commits, 36 rooms, 91 art assets, 43 death scenes, 4 endings — was built in a series of structured phases.

**Stack:** Phaser 3 + TypeScript + Vite, deployed to GitHub Pages.

---

## 1. Project Structure

```
src/game/
  scenes/          # Phaser scenes (Boot, Preloader, MainMenu, Room, Death, Endings)
  systems/         # AudioManager, EffectsManager, PuzzleEngine, SaveSystem, etc.
  parser/          # TextParser, NounResolver, NounSynonyms, VerbTable
  types/           # TypeScript interfaces (RoomData, GameState, etc.)
public/assets/
  data/rooms/      # 36 room JSON definitions (puzzles, exits, hotspots, effects)
  backgrounds/
    shared/        # 6 parallax layers (sky + mid per act, 1920x540)
    rooms/         # 37 unique room ground layers (960x540)
  sprites/
    player-static.png   # Player character (45x106)
    npcs/               # 11 NPC sprites (48x64, scaled to zone height in-engine)
    items/              # 38 item sprites (various sizes)
  audio/
    music/         # 4 music tracks (forest, cave, village, menu-ensemble)
    sfx/           # 5 sound effects
    ambient/       # 3 ambient loops
scripts/
  generate-art.ts          # Main art generation pipeline (ComfyUI API)
  generate-midi-themes.py  # Menu music — MIDI + FluidSynth (current version)
  generate-fugue-theme.py  # Menu music — 4-voice fugue (pure Python, earlier version)
  generate-menu-theme.py   # Menu music — sine-wave synthesis (pure Python, original)
  generate-sfx.py          # SFX (Python numpy synthesis)
  comfyui-workflow.json    # ComfyUI node graph template
  style-guide.json         # Art generation parameters (LoRA strengths, prompts, etc.)
  art-manifest.json        # Per-asset prompts, seeds, and output paths
  midi/                    # Generated MIDI files (intermediate output)
  soundfonts/              # FluidR3_GM.sf2 General MIDI SoundFont
```

## 2. Development Approach

### Phase-Based AI-Assisted Development

The project was planned and built in 18 phases using a structured research-plan-implement-verify cycle. Each phase produced:
- `RESEARCH.md` — background research on the tech/approach
- `PLAN.md` — detailed implementation plan with task breakdown
- `SUMMARY.md` — what was actually built
- `VERIFICATION.md` — confirmation that the phase goal was met

Phase order:
1. Foundation & Rendering (Phaser scaffold, parallax backgrounds)
2. Scene System & Player Movement (room data, navmesh pathfinding, click-to-move)
3. Text Parser (deterministic regex + noun resolution)
4. Core Gameplay (puzzle engine, inventory, save/load, flags)
5. LLM Integration (Ollama — later replaced by compromise.js)
6. NPCs and Dialogue (Ink scripting, NPC rendering)
7. Audio and Polish (music, SFX, ambient, transitions)
8. Content Production (36 rooms, puzzles, story, deaths)
9. Art Pipeline & Schema Foundation (ComfyUI integration)
10. Death Gallery
11. Progressive Hints (3-tier escalation)
12. Multiple Endings (4 endings based on player choices)
13. Mobile Responsive (touch controls, virtual keyboard handling)
14. Art Pipeline Tuning (LoRA strength calibration)
16-18. VFX, Lighting, Effects Rollout (weather, particles, scene transitions)

### Key Lesson

Plan phases around deliverables, not features. "Add NPCs" is vague — "NPCs render in rooms, respond to look/talk, and have dialogue trees" is testable.

---

## 3. Art Generation Pipeline

All 91 art assets were generated locally using ComfyUI with the Flux model and a pixel art LoRA. No cloud APIs needed. This was the most complex tooling in the project.

### Prerequisites

- **ComfyUI** running locally at `http://127.0.0.1:8188`
- **Flux model:** `flux1-dev-Q5_0.gguf` (GGUF-quantized Flux.1-dev) — loaded via `UnetLoaderGGUF` node
- **CLIP models:** `clip_l.safetensors` + `t5xxl_fp16.safetensors` (dual CLIP for Flux)
- **VAE:** `ae.safetensors`
- **LoRA:** `Flux-2D-Game-Assets-LoRA.safetensors` (trigger word: `GRPZA`)
- **Node.js packages:** `sharp` (image post-processing), `tsx` (TypeScript execution)

### Workflow (comfyui-workflow.json)

A 15-node Flux API-format workflow:

```
UnetLoaderGGUF → LoraLoaderModelOnly → ModelSamplingFlux → BasicGuider
DualCLIPLoaderGGUF → CLIPTextEncode → FluxGuidance ────────────────↗
                                            KSamplerSelect → SamplerCustomAdvanced → VAEDecode → SaveImage
                                BasicScheduler ──────────────↗
                          RandomNoise ───────────────────────↗
                    EmptySD3LatentImage ─────────────────────↗
                                                  VAELoader ─────────↗
```

Key parameters:
- **Sampler:** euler, scheduler: simple, 20 steps, denoise: 1.0
- **Flux guidance:** 3.5
- **ModelSamplingFlux:** max_shift=1.15, base_shift=0.5

### Generation Settings (style-guide.json)

| Asset Type | Gen Resolution | Output Resolution | LoRA Strength |
|-----------|---------------|-------------------|--------------|
| Room background | 1024x576 | 960x540 | 0.7 |
| Shared parallax (sky/mid) | 1024x576 | 1920x540 (wide) | 0.7 |
| Player/NPC sprite | 512x512 | varies | 0.7 |
| Item sprite | 512x512 | varies | 0.9 |

### Prompt Structure

**Backgrounds:**
```
GRPZA, pixel art game background, 2D side-scrolling adventure game,
[room-specific description], [act palette hint],
detailed pixel art, retro game aesthetic, clean lines, vibrant colors
```

**Sprites:**
```
GRPZA, pixel art game sprite, 2D character,
[character description],
white background, game asset, clean pixel art, transparent background ready
```

**Items:**
```
GRPZA, pixel art game item icon, 2D,
[item description],
white background, game asset, clean pixel art, centered, small object
```

### Art Manifest (art-manifest.json)

Every asset has a fixed seed for reproducibility:
```json
{
  "forest_clearing": {
    "prompt": "sunlit forest clearing with old tree stump...",
    "seed": 200001,
    "output": "public/assets/backgrounds/rooms/forest_clearing.png"
  }
}
```

### Running the Pipeline

```bash
# Generate everything (requires ComfyUI running)
npx tsx scripts/generate-art.ts --type all

# Generate specific types
npx tsx scripts/generate-art.ts --type backgrounds --room forest_clearing
npx tsx scripts/generate-art.ts --type shared

# Dry run (shows what would generate without doing it)
npx tsx scripts/generate-art.ts --dry-run --type all

# Force regeneration (ignore existing files)
npx tsx scripts/generate-art.ts --type backgrounds --force
```

The script:
1. Reads `art-manifest.json` for prompts/seeds
2. Reads `style-guide.json` for generation parameters
3. Patches `comfyui-workflow.json` with the prompt, seed, resolution, and LoRA strength
4. POSTs the workflow to ComfyUI's `/prompt` API
5. Polls `/history/{prompt_id}` until generation completes
6. Downloads the result image from `/view`
7. Post-processes with `sharp`: resize to output dimensions, background removal for sprites (threshold: 240, defringe: true)

### LoRA Strength Calibration

LoRA strength was calibrated via a 27-image test matrix: 9 rooms x 3 strengths (0.6, 0.7, 0.8). The parallel test script (`generate-lora-parallel.ts`) submitted all jobs at once and processed results concurrently. 0.7 was selected for backgrounds — lower values lost the pixel art style, higher values became too stylized.

### Sprite Post-Processing

NPC sprites required extra work: the raw 512x512 outputs had large transparent borders. A Python script using PIL was used to:
1. Crop to content bounding box (non-transparent pixels)
2. Rescale to fill 97% of the target canvas height (62px in a 64px canvas)
3. Pad to final dimensions, keeping the character bottom-anchored

This was necessary because Phaser scales sprites by zone height — if the sprite is 50% transparent padding, a 106px zone only shows 53px of visible character.

---

## 4. Audio Generation

All audio was generated via Python synthesis — no external audio libraries or AI music tools. The menu theme went through three iterations before landing on MIDI-rendered orchestral instruments.

### Menu Theme Evolution

The menu music progressed through three approaches, each solving problems with the previous one:

**v1: Pure Sine-Wave Synthesis** (`generate-menu-theme.py`) — The original approach. Pure Python using only `wave`, `struct`, and `math` (no numpy). 5 voices (lead, chorus, bass, chord pad, harp arpeggio) built from sine/triangle waveforms with ADSR envelopes. Worked but sounded thin and electronic — recognizably synthetic even with overtones and delay effects.

**v2: 4-Voice Fugue** (`generate-fugue-theme.py`) — Same pure-Python synthesis but with a proper Baroque fugue structure. 4 voices (soprano/warm_lead, alto/triangle, tenor/soft_square, bass/sine) entering in staggered imitation. D minor, 92 BPM, 24 bars (~63s). Musically more sophisticated but still limited by the raw waveform timbres — sine waves can't convincingly imitate real instruments no matter how you layer them.

**v3: MIDI + FluidSynth** (`generate-midi-themes.py`) — **The current version.** Writes the same melody as MIDI, then renders it through FluidSynth with the FluidR3_GM General MIDI SoundFont. Real sampled instrument timbres instead of synthesized waveforms. Night-and-day difference in quality.

### Current Pipeline: MIDI/FluidSynth (generate-midi-themes.py)

Generates a MIDI file programmatically with MIDIUtil, then renders to WAV via FluidSynth using a General MIDI SoundFont for realistic sampled instruments.

**Prerequisites:**
```bash
pip install MIDIUtil midi2audio
brew install fluid-synth
# Download FluidR3_GM.sf2 into scripts/soundfonts/
```

**4 voices (General MIDI instruments):**
| Voice | GM Program | Number | Volume | Role |
|-------|-----------|--------|--------|------|
| Lead melody | Recorder | 74 | 105 | Warm medieval lead |
| Bass | Cello | 42 | 85 | Foundation |
| Chord pad | String Ensemble 1 | 48 | 55 | Harmonic bed |
| Arpeggio | Orchestral Harp | 46 | 60 | Rhythmic texture |

**Key: D minor | Tempo: 112 BPM**

**Structure:** Intro (2 bars rest) → Theme A (8 bars, ascending D minor arpeggio melody) → Theme B (8 bars, Bb major opening, broader intervals) → Outro (4 bars, resolution to D)

**How it works:**
1. MIDIUtil builds a 4-track MIDI file with note sequences, program changes, and tempo
2. Notes are written at 95% of their beat duration (5% gap for articulation)
3. Harp arpeggios are generated by cycling through chord tones at half-beat intervals
4. The MIDI file is written to `scripts/midi/menu-ensemble.mid`
5. FluidSynth renders it to WAV using the FluidR3_GM.sf2 SoundFont:
   ```
   fluidsynth -ni -F output.wav -T wav -r 44100 -g 1.0 -R 1 -C 1 soundfont.sf2 input.mid
   ```
   - `-ni`: non-interactive mode
   - `-R 1`: reverb on (adds room ambience)
   - `-C 1`: chorus on (adds width)
   - `-r 44100`: 44.1 kHz sample rate

**Output:** `public/assets/audio/music/menu-ensemble.wav` (~10.5 MB, mono 16-bit WAV at 44100 Hz)

```bash
python3 scripts/generate-midi-themes.py
# Requires: FluidR3_GM.sf2 in scripts/soundfonts/
# Output: public/assets/audio/music/menu-ensemble.wav
```

### Earlier Versions (kept as references)

**Sine-wave version** (`generate-menu-theme.py`): Pure Python, no dependencies beyond stdlib. 51s, D minor, 112 BPM, 5 voices with delay effects. Good for understanding audio synthesis from scratch.

```bash
python3 scripts/generate-menu-theme.py
# Output: public/assets/audio/music/menu.wav (51.4s, ~4.4 MB)
```

**Fugue version** (`generate-fugue-theme.py`): Pure Python, 4-voice fugue. 63s, D minor, 92 BPM. Demonstrates Baroque counterpoint structure (subject, answer at the 5th, stretto, episodes). Useful as a composition template.

```bash
python3 scripts/generate-fugue-theme.py
# Output: public/assets/audio/music/menu-fugue.wav (~5.3 MB)
```

All three versions are loaded at startup; `menu-ensemble` (the MIDI version) plays by default.

### Sound Effects (generate-sfx.py)

Uses `numpy` and `scipy` for more complex synthesis. Generates 5 effects:

| SFX | Duration | Technique |
|-----|----------|-----------|
| command-blip.wav | 0.12s | Two ascending tones (880→1320 Hz) |
| item-pickup.wav | 0.4s | Ascending arpeggio (C5, E5, G5) with harmonics |
| door-transition.wav | 0.6s | Filtered noise sweep (200→2000 Hz) + 80 Hz rumble |
| dialogue-start.wav | 0.35s | Bell chime at 1200 Hz with inharmonic partials |
| death-sting.wav | 1.2s | Descending D minor chord with pitch drop + distortion |

```bash
python3 scripts/generate-sfx.py
# Output: public/assets/audio/sfx/*.wav
```

### Ambient & Music Tracks

The area music tracks (forest.wav, cave.wav, village.wav) and ambient loops (forest-birds.wav, cave-drips.wav, wind-light.wav) were generated separately. The same synthesis approach works — define waveforms, compose note sequences, render, mix, normalize.

---

## 5. Text Parser System

The parser evolved through three iterations:
1. **v1:** Regex-only deterministic parser (Phase 3)
2. **v2:** Ollama LLM fallback for creative inputs (Phase 5)
3. **v3:** Replaced LLM with compromise.js NLP + fuse.js fuzzy matching (final)

The final version is fully deterministic — no network calls, no LLM, runs offline.

### Pipeline (TextParser.ts)

1. **Normalize** — trim, lowercase
2. **Special commands** — "exits", "where can i go", "wait", "xyzzy", etc.
3. **Direction shortcuts** — bare `n/s/e/w` → `{ verb: 'go', subject: <exit> }`
4. **Verb matching** — regex patterns from VerbTable (first match wins)
5. **Noun extraction** — capture groups provide subject and target
6. **Stop word stripping** — removes: the, a, an, this, that, my, etc.
7. **Noun resolution** — delegates to NounResolver

### Noun Resolution (NounResolver.ts)

9-level cascade (first match wins):

1. Exact hotspot ID match
2. Exact hotspot name match
3. Exact inventory item ID match
4. Exact inventory item name match
5. Synonym expansion (NounSynonyms.ts) → re-attempt exact matching
6. Scored partial matching (word overlap + head-noun bonus)
7. Direction mapping (compass words → exit IDs)
8. Exit matching (by direction field → label → targetRoom)
9. Fuzzy matching via fuse.js (threshold 0.35, last resort)

### Noun Synonyms (NounSynonyms.ts)

~250 entries mapping player words to canonical game words:
```typescript
export const NOUN_SYNONYMS: Record<string, string> = {
    'flame': 'torch',
    'fire': 'torch',
    'lantern': 'torch',
    'lamp': 'torch',
    'light': 'torch',
    // ... ~250 total
};
```

This is the secret sauce — players type "lantern", "lamp", "flame" and it all resolves to the game's "torch" object. Add synonyms generously for any interactable.

### Dependencies

| Package | Purpose |
|---------|---------|
| compromise (^14.14.5) | NLP library for part-of-speech tagging |
| fuse.js (^7.1.0) | Fuzzy string matching (typo tolerance) |

---

## 6. Room Data Format

All game content is data-driven via JSON files in `public/assets/data/rooms/`. The engine is a generic evaluator — changing rooms, puzzles, and dialogue requires zero code changes.

### Room JSON Schema

```json
{
  "id": "forest_clearing",
  "name": "Forest Clearing",
  "description": "Narrator description shown on entry...",
  "background": {
    "layers": [
      { "key": "bg-act1-sky", "scrollFactor": 0 },
      { "key": "bg-act1-mid", "scrollFactor": 0.3 },
      { "key": "bg-forest_clearing", "scrollFactor": 1 }
    ],
    "worldWidth": 1920
  },
  "walkableArea": [
    { "x": 0, "y": 360 }, { "x": 960, "y": 360 },
    { "x": 960, "y": 540 }, { "x": 0, "y": 540 }
  ],
  "exits": [{
    "id": "to-cave",
    "zone": { "x": 880, "y": 300, "width": 80, "height": 200 },
    "targetRoom": "cave_entrance",
    "spawnPoint": { "x": 100, "y": 460 },
    "transition": "fade",
    "direction": "east",
    "label": "cave"
  }],
  "hotspots": [{
    "id": "ancient-oak",
    "name": "Ancient Oak Tree",
    "zone": { "x": 400, "y": 200, "width": 160, "height": 200 },
    "interactionPoint": { "x": 480, "y": 400 },
    "responses": {
      "look": "A massive oak. It's seen better centuries.",
      "talk": "You speak to the tree. The tree does not respond. Unsurprising.",
      "use": "You push the tree. It remains a tree.",
      "default": "The oak ignores you with arboreal indifference."
    }
  }],
  "items": [{
    "id": "rusty-key",
    "name": "Rusty Key",
    "zone": { "x": 600, "y": 420, "width": 30, "height": 30 },
    "interactionPoint": { "x": 615, "y": 440 },
    "responses": {
      "look": "A rusty key half-buried in the dirt.",
      "take": "Handled by puzzle system.",
      "use": "Use it on what, exactly?"
    }
  }],
  "puzzles": [{
    "id": "take-rusty-key",
    "trigger": { "verb": "take", "subject": "rusty-key" },
    "conditions": [{ "type": "not-has-item", "item": "rusty-key" }],
    "actions": [
      { "type": "add-item", "item": "rusty-key" },
      { "type": "set-flag", "flag": "rusty-key-taken" },
      { "type": "narrator-say", "text": "You pocket the key. It's yours now." }
    ],
    "once": true
  }],
  "deathTriggers": [{
    "id": "bee-death",
    "trigger": { "verb": "use", "subject": "beehive" },
    "conditions": [],
    "actions": [{ "type": "trigger-death", "deathId": "bee-death" }]
  }],
  "deaths": {
    "bee-death": {
      "title": "Death by Bees",
      "narratorText": "You disturbed the beehive. The bees had opinions about this."
    }
  },
  "dynamicDescriptions": {
    "rusty-key-taken": "The clearing looks emptier now."
  },
  "audio": {
    "music": "music-forest",
    "ambient": [{ "key": "ambient-forest-birds", "volume": 0.3 }]
  },
  "effects": {
    "ambient": [{ "type": "leaves", "intensity": 0.3 }]
  },
  "puzzleHints": [{
    "puzzleId": "take-rusty-key",
    "tiers": [
      "Something glints in the grass...",
      "There's a key near the old stump.",
      "Type 'take key' to pick up the rusty key."
    ]
  }],
  "playerSpawn": { "x": 480, "y": 460 }
}
```

### NPCs in Room JSON

```json
{
  "npcs": [{
    "id": "old_man",
    "name": "Old Man",
    "zone": { "x": 300, "y": 354, "width": 64, "height": 106 },
    "interactionPoint": { "x": 340, "y": 460 },
    "sprite": "npc-old_man",
    "responses": {
      "look": "An old man sits on a rock...",
      "talk": "The old man peers at you...",
      "default": "The old man ignores you."
    }
  }]
}
```

NPC sprites are rendered at `zone.height / texture.height` scale with bottom-center origin.

---

## 7. Game Engine Details

### Phaser Config

```typescript
{
  type: Phaser.AUTO,        // WebGL with Canvas fallback
  width: 960, height: 540,
  render: { pixelArt: true },  // Nearest-neighbor scaling
  scale: { mode: Phaser.Scale.NONE },  // Manual CSS scaling
  fps: { target: 60, smoothStep: true }
}
```

No physics engine — pathfinding uses the `navmesh` library over polygon walkable areas.

### Scene Flow

```
Boot → Preloader → MainMenuScene → RoomScene ↔ DeathScene
                                       ↕
                              EndingScene / DeathGalleryScene / EndingsGalleryScene
```

### Key Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| phaser | ^3.90.0 | Game framework |
| compromise | ^14.14.5 | NLP (part-of-speech tagging) |
| fuse.js | ^7.1.0 | Fuzzy text matching |
| inkjs | ^2.4.0 | Ink dialogue scripting runtime |
| navmesh | ^2.3.1 | Polygon pathfinding |
| vite | ^6.3.1 | Build tool / dev server |
| sharp | ^0.34.5 | Image post-processing (art pipeline) |
| playwright | ^1.58.2 | Browser testing |

**Python tools (music/SFX generation):**

| Tool | Purpose |
|------|---------|
| MIDIUtil (pip) | Programmatic MIDI file generation |
| FluidSynth (brew) | MIDI-to-WAV rendering via SoundFont |
| FluidR3_GM.sf2 | General MIDI SoundFont (sampled instruments) |
| numpy + scipy (pip) | SFX synthesis |

---

## 8. Deployment

### GitHub Pages

```bash
npm run build                  # Production build to dist/
npx gh-pages -d dist           # Deploy dist/ to gh-pages branch
```

The game is a static site — no server needed. All game logic runs client-side.

### Development

```bash
npm install
npm run dev       # Dev server at http://localhost:5173
npm run build     # Production build
```

---

## 9. Playtesting & Discoverability Debugging

The most important phase of development wasn't building features — it was playing the game as a user would and systematically fixing every place where the experience broke down. This produced more commits than any single feature phase.

### The Process

1. **Play through every room.** Read the narrator description carefully. For every noun mentioned in the text — every fountain, tree, sign, crack, NPC — try `look`, `talk`, `take`, `use`, `push`, `pull`, and `open` on it.
2. **Note every silence.** If you type a command and get no response, that's a bug. Players interpret silence as "the game is broken," not "this isn't interactable." Every object that exists in the scene text needs at minimum a `look` and `default` response.
3. **Follow the player's logic, not the designer's.** If the narrator says "a crack runs through the old stump," players will type `look crack` — not `look stump`. The game needs to handle both. This is what noun synonyms are for.
4. **Test every NPC with look and talk.** If an NPC is visible in the room, players will try to interact with them. An NPC that doesn't respond to `talk` feels broken. Even if the NPC has no plot-relevant dialogue, give them a personality line.
5. **Check every death for fairness.** If `use fountain` kills you with no prior warning, that's unfair. The `look fountain` response should hint at danger *before* the player tries it.

### The Discoverability Audit

After the core game was built, a full audit of all 36 rooms uncovered systematic problems across 8 categories:

**Category 1: Progression Blockers**
- An exit that bypassed a key puzzle because it had no flag condition
- A riddle that required `use candle` but "candle" was the *answer* to a riddle, not an inventory item
- NPCs that needed to be talked to for plot progression but had no `talk` handler

**Category 2: Silent NPCs**
- 9 NPCs with sprites and zones but no `look`, `talk`, or `default` responses. Every one needed dialogue added — even the stone merchant who can't talk back (the response text *is* the joke: "He does not respond. This is the most successful sales interaction you've ever had.").

**Category 3: False Inventory Claims**
- Hotspot `take` responses that said things like "You pick a flower" or "you snap off a branch" but didn't actually add anything to inventory. Players would then wonder where their flower went. Fix: reword to make it clear the attempt *failed* — "You reach for a flower, but it wilts at your touch before you can pluck it."

**Category 4: Unreachable Flavor Text**
- ~15 hotspots where a death trigger and a hotspot response both fired on the same verb+subject. The death trigger always wins, so the hotspot text was dead code. Example: `use pool-surface` had a response "you wade in cautiously" but also a death trigger. The player never sees the cautious wading — they just die. Fix: remove the hotspot `use` response and move the warning to `look` ("Several skeletons on the bottom suggest others thought so too.").

**Category 5: Inconsistent Verb Lethality**
- `take nightshade` = warning, `use nightshade` = death (correct — take means pick up, use means eat)
- `push parapet` = safe flavor text, `use parapet` = death (confusing — push and use feel similar enough that one killing you feels arbitrary). Fix: make the safe `push` response clearly warn about the danger.

**Category 6: Duplicate Hotspots**
- Some rooms had two hotspots for the same thing (e.g., `hallway-carpet` and `faded-carpet` both covering the carpet). This happens when scenery hotspots are added in bulk without checking what already exists. Fix: merge the best responses into one and delete the duplicate.

**Category 7: Wrong/Missing Cross-Room Hints**
- A coin described as "near the well" but actually located in the village square (not near the well)
- A cave with no warning that it's dark inside (players need a torch but aren't told)
- The `combine` verb never being taught to the player — added a hint in a mushroom's `use` response when holding a stick

**Category 8: Things Mentioned But Not Interactable**
- A "CERTAIN DEATH" sign mentioned in text but with no hotspot (fixed by adding a synonym to the existing signpost)
- Cave carvings mentioned after lighting a torch but not targetable (added to cave-walls dynamic description)
- A diary on a desk (added as a synonym for the desk hotspot)

### Making the Parser More Robust

Each playtest round surfaced new words that players would naturally type but the parser couldn't resolve. The fix was always the same loop:

1. **Player types something reasonable** — `look at the flame`, `examine the lantern`, `check the fire`
2. **Parser returns "I don't understand"** — because the hotspot is called `makeshift-torch`
3. **Add synonyms** — `flame → torch`, `lantern → torch`, `fire → torch`, `light → torch`
4. **Test again** — confirm all variations now resolve

This produced ~250 synonym entries. The key insight: **you can't predict what players will type, but you can predict what they'll type *about*.** For every interactable object, brainstorm 3-5 alternate names. Common patterns:

| Pattern | Example |
|---------|---------|
| Material vs. object | "stone" for "stone-flowers", "iron" for "iron-gate" |
| Informal names | "guy" for "merchant", "dude" for "old_man" |
| Part vs. whole | "blade" for "sword", "handle" for "door" |
| Sensory descriptions | "glow" for "crystal", "stench" for "mushroom" |
| Generic categories | "weapon" for "sword", "food" for "bread", "drink" for "chalice" |

### Stress Testing the Parser

A dedicated stress test script (`scripts/stress-test-parser.ts`) threw hundreds of adversarial inputs at the parser:
- Multi-word noun phrases: "the old rusty iron key"
- Preposition chains: "look at the thing on the shelf near the wall"
- Gibberish: "xyzzy plugh", "asdf"
- Ambiguous verbs: "get" (take or go?), "check" (look or use?)
- Bare nouns with no verb: "key", "torch", "door"

Each failure was either fixed in the parser logic or by adding synonyms. The fuzzy matching layer (fuse.js, threshold 0.35) catches typos as a last resort — "torsh" matches "torch", "beehve" matches "beehive" — but synonyms handle the vast majority of cases.

### Key Debugging Techniques

**Browser console inspection:** Temporarily exposed the Phaser game instance via `(window as any).__game = game` to query sprite positions, scene state, and texture dimensions from the browser console. Critical for diagnosing visual bugs (e.g., NPC sprites appearing small despite correct zone heights — turned out to be transparent padding in the sprite images, not a scaling bug).

**Direct scene jumping:** Used `game.scene.start('RoomScene', { roomId: 'throne_room' })` from the console to skip to specific rooms without playing through the whole game. Essential when testing rooms deep in the puzzle chain.

**Command logging:** Added a command logger that records every player input and parser result. Downloadable as a JSON file from the main menu. This captures the exact sequence of commands a player tried, making it easy to spot patterns like "5 players typed `look crack` and got nothing."

**JSON validation through build:** Room JSONs are loaded at build time — a malformed JSON immediately fails the build. This catches typos in room data (missing commas, unclosed quotes) before they reach the browser.

### The Debugging Mindset

The fundamental principle: **if a player tries something reasonable and gets no response, that's the game's fault, not the player's.** The narrator's sardonic tone helps here — even a "that doesn't work" response can be entertaining if it's written with personality. Silence is never acceptable.

Specific rules that emerged:
- Every noun in room description text must be interactable (hotspot or synonym)
- Every NPC must respond to `look`, `talk`, and `default`
- Every `take` response must either add to inventory or clearly explain why not
- Every death must be preceded by a warning visible via `look`
- If two verbs feel similar (`push`/`use`, `take`/`get`), they should produce the same result
- If a puzzle requires a specific verb, nearby text should teach that verb

---

## 10. Lessons Learned

### Art Generation
- **LoRA strength matters.** Test a matrix of values before committing. 0.7 was right for backgrounds, 0.9 for items. Too low = generic, too high = artifacts.
- **Sprite transparent padding is a real problem.** AI-generated sprites come with unpredictable amounts of empty space. Always crop to content bounds and re-pad to a standard canvas size.
- **Fixed seeds = reproducibility.** Store every seed in your manifest. You'll need to regenerate.
- **Background removal threshold (240) with defringe** works well for white-background sprites generated with "white background" in the prompt.

### Audio
- **MIDI + SoundFont beats raw waveform synthesis for melody.** Pure Python wave synthesis (sine, triangle, square) works for SFX and ambient, but for music with recognizable instruments, rendering MIDI through a General MIDI SoundFont (FluidR3_GM.sf2 via FluidSynth) produces dramatically better results. The same melody that sounds thin as sine waves sounds like a real recorder/cello/harp ensemble via SoundFont rendering.
- **MIDIUtil is the sweet spot for programmatic music.** It generates standard MIDI files from Python note sequences — no DAW needed, fully scriptable, deterministic output. Pair it with FluidSynth for rendering.
- **Pure Python wave synthesis is still good for SFX.** No external audio libraries needed — just `wave`, `struct`, and `math`. Where raw waveforms fall short for melody, they're perfectly adequate for blips, stings, and ambient noise.
- **The `pluck` waveform overtones can sound tinny.** Keep harmonics to 2nd and 3rd at most, decay them quickly, and use moderate volumes. Higher harmonics (4th+) at high frequencies sound metallic.
- **numpy synthesis** (generate-sfx.py) is faster and more expressive for short SFX. Use it for anything needing filtered noise, pitch sweeps, or distortion.
- **Keep all versions of your music scripts.** The evolution from sine-wave → fugue → MIDI was iterative. Each version taught something about composition and synthesis that informed the next. The fugue script is a good template for counterpoint structure even though the final version uses MIDI rendering.

### Text Parser
- **Synonyms are more important than fuzzy matching.** 250 hand-curated synonyms cover 95% of player vocabulary. Fuzzy matching (fuse.js) catches typos for the remaining 5%.
- **The LLM fallback was ultimately unnecessary.** A good synonym table + regex verb patterns + fuzzy matching handles all reasonable player input. We removed Ollama entirely.
- **Head-noun scoring** (bonus for matching the last word of a multi-word name) dramatically improves resolution accuracy for things like "old rusty key" matching "Rusty Key" over "Old Stump".

### Game Design
- **Data-driven rooms are essential.** All 36 rooms, 43 deaths, and 4 endings are defined in JSON. Zero code changes to add content.
- **Every mentioned thing needs a response.** If the narrator says "a fountain stands in the square," players WILL type `look fountain`. Add hotspot responses for everything described in room text.
- **Death triggers and hotspot responses can conflict.** If both fire on the same verb+subject, the death wins and the hotspot text is unreachable dead code. Either remove the hotspot response or move it to a different verb (like `look`) as a warning.
- **Progressive hints (3-tier)** prevent softlocks without spoiling puzzles: vague → medium → explicit.

### Process
- **Phase-based development** prevents scope creep. Each phase has a clear goal, a plan, and a verification step.
- **Commit atomically per task**, not per session. Makes debugging and rollback tractable.
- **Test in the browser, not just in unit tests.** Phaser rendering, sprite scaling, and input handling behave differently in the real canvas than in a test harness.

---

## 11. Reproducing This for a New Game

1. **Scaffold:** Copy the Phaser + Vite + TypeScript setup. The parser, puzzle engine, and room system are generic.
2. **Plan your rooms:** Create a room map, write the story, define puzzle dependencies. Do this before any code.
3. **Write room JSONs:** Follow the schema above. Start with 3-4 rooms to test the loop.
4. **Set up ComfyUI:** Install Flux GGUF + your preferred LoRA. Create a style guide with prompt templates. Run a LoRA strength test matrix.
5. **Generate art:** Write your art manifest (prompts + seeds per asset). Run the pipeline.
6. **Generate audio:** For music, write note sequences in Python and render via MIDI + FluidSynth (`pip install MIDIUtil`, `brew install fluid-synth`, download FluidR3_GM.sf2). For SFX, use numpy waveform synthesis. Change the key, tempo, instruments, and melodies to fit your game's mood.
7. **Add synonyms:** For every interactable, think of 3-5 words players might use and add them to NounSynonyms.ts.
8. **Playtest relentlessly.** Type everything you can think of. If you get silence, add a response. If you get killed unfairly, add a warning.
