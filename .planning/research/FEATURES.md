# Feature Landscape: v2.0 Art & Polish

**Domain:** Browser-based adventure game -- art pipeline, hint system, death gallery, mobile responsive, multiple endings
**Researched:** 2026-02-21
**Overall confidence:** MEDIUM-HIGH (well-established patterns with some implementation-specific unknowns)

> This document replaces the v1.0 feature research. v1.0 features are shipped. This covers only v2.0 new features.

---

## Feature Area 1: Flux Art Generation Pipeline

### Table Stakes

Features that must work for the art pipeline to be usable.

| Feature | Why Expected | Complexity | Dependencies on v1.0 |
|---------|-------------|------------|---------------------|
| Consistent pixel art style across all 36 rooms | Placeholder art is currently uniform; new art must maintain visual coherence room-to-room | High | Background layer system (`bg-sky`, `bg-mountains`, `bg-trees`, `bg-ground` keys in RoomData) |
| Parallax-compatible layer output | Rooms use 4-layer parallax backgrounds at different scroll factors. Art must be generated as separate layers, not monolithic images | High | `BackgroundLayer[]` in RoomData with scrollFactor values (0, 0.1, 0.4, 1.0) |
| Correct resolution output (960x540 base, up to 1920px worldWidth) | Game renders at 960x540 with `pixelArt: true`. Wide rooms go up to 1920px. Art must match exactly | Medium | Phaser config `width: 960, height: 540`, worldWidth varies per room JSON |
| Transparent layer support | Background layers other than sky need transparency for parallax compositing | Medium | Phaser image rendering with scrollFactor-based layering |
| Reproducible prompt-to-art pipeline | Must regenerate or iterate on individual rooms without manual intervention. Pipeline should be scriptable | Medium | None (new system) |
| Item sprite generation | 37 items need sprites for inventory panel display. Currently text-only | Medium | `ItemDefinition` type, `InventoryPanel` component |
| Character sprite generation | Player and 11 NPCs need sprite art. Player spritesheet is 16 frames (idle/walk/interact) | High | Player spritesheet format: 48x64px per frame, 16 frames |

### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|------------------|------------|-------|
| LoRA-fine-tuned style consistency | Using a pixel-art LoRA (e.g., Flux-2D-Game-Assets-LoRA or Retro-Pixel-Flux-LoRA) produces much more consistent results than raw Flux | Medium | gokaygokay/Flux-2D-Game-Assets-LoRA on HuggingFace generates clean pixel art with white backgrounds. HIGH confidence -- verified on HuggingFace |
| Batch pipeline with ComfyUI API | Script all 36 rooms as a batch job instead of manual one-by-one generation. ComfyUI has a queue/API for automation | Medium | ComfyUI workflow JSON can be templated and batch-submitted |
| Death scene illustration | Each of the 43 unique death scenarios gets a small illustration or vignette displayed on the DeathScene overlay | High | 43 unique `deathId` values across 36 rooms. Integrates with `DeathScene.create()` |
| NPC portrait art | Show character portraits during dialogue sequences. Adds personality beyond text | Medium | `DialogueUI` component, ink tag system already parses `#speaker:` tags |

### Anti-Features

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Real-time in-game Flux generation | Generation takes 85-145 seconds per image on Apple Silicon. Players cannot wait | Pre-generate all art offline, bundle as static assets |
| Full photorealistic art style | Clashes with pixel art aesthetic, larger file sizes, inconsistent with game tone | Use pixel-art LoRA, target 16-32px palette-limited style |
| AI-generated animations | Flux animation support is experimental/unreleased. Frame-by-frame generation has consistency issues | Hand-craft sprite animations or use simple programmatic tweens |
| Cloud API for generation | Project constraint: "No external API dependencies at runtime -- everything runs locally" | Use local Flux via ComfyUI. GGUF Q8 model runs on 8GB+ VRAM, Q6 on Apple Silicon 16GB+ |

### Complexity Assessment

**Overall: HIGH.** This is the largest workload in v2.0. 36 rooms x 4 layers = 144 background images minimum. Plus 37 item sprites, 12+ character sprites, and optionally 43 death vignettes. The pipeline design (prompt templates, LoRA selection, batch automation) must be validated before bulk generation begins.

**Key risk:** Parallax layer decomposition. Generating a room as 4 separate transparent layers with matching style is non-trivial. Options: (a) generate full scene, then manually split into layers; (b) generate each layer separately with careful prompting; (c) generate full scene for ground layer and simpler/generic layers for sky/mountains/trees. Option (c) is recommended -- sky and mountain layers can be shared across rooms within an act, reducing generation to ~36 ground layers + 8-12 shared backdrop layers.

**VRAM/performance reality check (MEDIUM confidence):**
- Apple Silicon M3/M4 Max (32GB+): ~85-145 seconds per 1024x1024 image with Flux Dev GGUF
- NVIDIA 12GB: comfortable with GGUF Q8
- NVIDIA 8GB: use Q6 quantization, ~90 seconds per image
- Full pipeline for 36 rooms (ground layer only + shared backdrops): ~2-3 hours minimum generation time
- Full pipeline including all layers, items, characters: ~8-12 hours of generation time

---

## Feature Area 2: Progressive Hint System

### Table Stakes

| Feature | Why Expected | Complexity | Dependencies on v1.0 |
|---------|-------------|------------|---------------------|
| Multi-tier hint escalation | Players expect to get nudged, then directed, then told the answer -- never just the answer directly. UHS/Invisiclues standard since 1988 | Medium | PuzzleEngine puzzle definitions in room JSONs |
| Per-puzzle hint sets | Each solvable puzzle needs its own hint chain. Generic "explore more" hints feel worthless | Medium-High | 36 rooms of puzzles, each with unique `PuzzleDefinition` entries |
| Stuck detection or voluntary access | System must either detect when player is stuck (time/failed-attempts) or let player explicitly request hints | Low-Medium | `GameState.playTimeMs`, `deathCount`, could track failed commands |
| No accidental spoilers | Requesting a hint for Puzzle A must never reveal information about Puzzle B. Hint navigation must be puzzle-scoped | Medium | Room-based puzzle isolation already exists in room JSONs |
| Hint availability awareness | System should know which puzzles are currently solvable (have all prerequisites) vs. not-yet-accessible | Medium | PuzzleEngine condition evaluation (`evaluateConditions`) already does this |

### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|------------------|------------|-------|
| Diegetic hint delivery via narrator | Instead of a UI menu, deliver hints through the sardonic narrator voice. "TYPE HINT" command triggers escalating sass | Low | Aligns with game tone. TextParser already handles commands. NarratorDisplay handles typewriter output |
| Context-aware hint targeting | System auto-detects which puzzle the player is likely stuck on based on current room, inventory, and flags | Medium | Check which room puzzles have unmet conditions where player has partial prerequisites |
| Thimbleweed Park-style in-world access | Integrate hints into the game world (e.g., a hint book item, or the narrator breaks fourth wall) | Medium | Thimbleweed Park used in-game phones dialing "4468" (HINT). This game could use a narrator aside or "hint" command |
| Narrator commentary on hint usage | Narrator roasts the player progressively harder for using more hints. "Oh, we're doing THIS now, are we?" | Low | Pure content work, fits existing narrator voice perfectly |

### Anti-Features

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Full walkthrough mode | Removes all gameplay. Players who want a walkthrough will find one online | Provide hints only, never auto-solve |
| Real-time LLM-generated hints | Ollama is a fallback parser, not always available. Hints must work offline | Author all hints as static data in puzzle/room JSONs |
| Hint currency or limited hint tokens | Artificial friction. Browser game with no monetization | Free hints, unlimited access, but with escalating narrator judgment |
| Auto-triggering hint popups | Interrupts flow, feels patronizing, breaks immersion | Player must explicitly request via "hint" command or UI button |
| Hint usage penalizing endings | Punishing players for using accessibility features is bad design | Narrator can comment on hint usage but it must not affect ending quality |

### Implementation Pattern (Recommended)

The proven UHS/Invisiclues model adapted for this game's sardonic narrator:

```
Hint data structure per puzzle:
{
  "puzzleId": "use-key-on-door",
  "hints": [
    "The door looks like it might yield to the right persuasion.",
    "You've seen something rusty that might fit that keyhole.",
    "Use the rusty key on the locked door in the cave entrance."
  ],
  "narratorCommentary": [
    "A gentle nudge in the right direction. You're welcome.",
    "Getting warmer. The narrator believes in you. Mostly.",
    "Fine. Here's the answer. The narrator is trying not to judge."
  ]
}
```

**Delivery mechanism:** Add "hint" as a recognized verb in VerbTable/TextParser. When player types "hint" or "help", CommandDispatcher routes to a HintSystem. HintSystem checks current room puzzles, identifies the most relevant unsolved puzzle (one where player has partial prerequisites), and delivers the next tier of hint for that puzzle.

### Complexity Assessment

**Overall: MEDIUM.** The system design is straightforward (tiered data + delivery mechanism). The bulk of work is content authoring: writing 3 tiers of hints for every puzzle across 36 rooms. The hint data can live alongside puzzle definitions in room JSONs or in a parallel hints JSON registry. Estimated: ~100-150 hint chains needed for all puzzles.

---

## Feature Area 3: Death Gallery Achievements

### Table Stakes

| Feature | Why Expected | Complexity | Dependencies on v1.0 |
|---------|-------------|------------|---------------------|
| Persistent death tracking | Track which of the 43 unique deaths the player has discovered, persisted across sessions | Low | `GameState.flags` can store `death-seen:${deathId}` flags. SaveManager already persists all flags |
| Gallery UI showing discovered vs. undiscovered deaths | Grid or list view. Discovered deaths show title + narrator text. Undiscovered show silhouette or question mark | Medium | New scene or overlay. 43 entries to display |
| Death count per type | Show how many times each death has been triggered, not just discovered or not | Low | Add `deathCounts: Record<string, number>` to `GameStateData` |
| Total death counter (already exists) | `deathCount` is already tracked in GameState and displayed on DeathScene | Already built | `GameState.getData().deathCount` on death overlay |
| Accessible from main menu or pause | Player should browse gallery without being in active gameplay | Low | New menu option in MainMenuScene or accessible via command |

### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|------------------|------------|-------|
| Sardonic narrator gallery descriptions | Gallery entries feature unique narrator commentary beyond the death screen text. "Ah yes, the classic 'drink the mystery liquid' approach" | Low-Medium | Content authoring. Reuse existing `DeathDefinition.narratorText` plus add gallery-specific quip |
| Death scene illustrations (cross-feature) | Each gallery entry shows a small pixel art vignette of the death. Ties into Flux art pipeline | High | 43 unique illustrations needed. Depends on art pipeline |
| Completion percentage and milestones | "You've discovered 23 of 43 ways to die. The narrator is... impressed?" | Low | Simple count / total calculation |
| Achievement unlocks at thresholds | "First Blood" (1 death), "Serial Victim" (10 unique), "Completionist of Doom" (all 43) | Low | Flag-based triggers on death count thresholds |
| Room-grouped organization | Group deaths by room or act for navigation. Player can see which areas they have not fully explored death-wise | Low-Medium | Death IDs already map to rooms via `deathTriggers` in room JSONs |

### Anti-Features

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| "Replay Death" button from gallery | Jumping to a save state near a death requires complex save snapshot management | Let player naturally re-encounter deaths through replay. Provide room name as a hint |
| Deaths that require grinding | Deaths should be discoverable through exploration and curiosity, not repetitive actions | Each death has unique trigger conditions already -- no farming needed |
| Social sharing or leaderboards | Over-engineering for a single-player browser game | Local gallery only, completion percentage |
| Gallery spoiling undiscovered death triggers | Showing HOW to trigger undiscovered deaths reveals puzzle info | Undiscovered = locked icon + "???" only. No location or trigger hints |
| Deaths gated behind payment | Browser game, no monetization, deaths are the comedy core | All deaths visible once discovered, all free |

### Existing Code Touchpoints

The current `DeathScene.handleRetry()` (line 83-101 in `DeathScene.ts`) increments `deathCount` but does NOT record which specific death occurred. The fix is surgical:

1. `DeathSceneData` interface already has `title` and `narratorText` -- add `deathId: string`
2. The `trigger-death` EventBus event already carries the `deathId` string
3. In the death trigger handler (RoomScene line 418-437), pass `deathId` in launch data
4. In `handleRetry()`, record `deathId` to `deathsSeen[]` and increment `deathCounts[deathId]`

The data flows are already there -- they just need to be captured and persisted.

### State Schema Extension

```typescript
// Add to GameStateData:
deathsSeen: string[];                    // unique death IDs discovered
deathCounts: Record<string, number>;     // per-death-type count
```

### Death Inventory (verified from codebase)

43 unique death IDs across 36 rooms:
- Act 1a (7 rooms): bee-death, poison-death, dark-death, lost-death, drown-death, fall-death, stone-touch
- Act 1b (7 rooms): troll-rage, guard-arrest, portrait-curse, throne-collapse, ghost-wrath, kitchen-fire, poison-herb, rat-swarm
- Act 2 (12 rooms): clerk-stamped, boredom-death, mushroom-poison, barrier-zap, balcony-fall, echo-scream, stalactite-fall, dark-water, drown-river, waterfall-death, forge-burn, guardian-smash, guardian-wrong, shelf-collapse, filed-away, paper-cut
- Act 3 (10 rooms): petrify-touch, petrify-slow, rite-fail, archive-collapse, wizard-trap, wizard-explosion, clock-crush, clock-fall, dungeon-pit, mirror-shatter, rooftop-fall, treasury-trap

Rooms with multiple deaths: clock_tower (3), wizard_tower (2), echo_chamber (2), filing_room (2), underground_river (2), guardian_chamber (2), throne_room (2).

### Complexity Assessment

**Overall: LOW-MEDIUM.** The death tracking infrastructure is nearly there already. Main work: (a) gallery UI scene with grid/list layout, (b) content authoring for gallery-specific text per death, (c) state schema extension (2 new fields), and (d) optionally death illustrations (which is part of the art pipeline). This is the lowest-risk, highest-reward feature in v2.0.

---

## Feature Area 4: Mobile-Responsive Layout

### Table Stakes

| Feature | Why Expected | Complexity | Dependencies on v1.0 |
|---------|-------------|------------|---------------------|
| Touch-to-move (tap = click) | Point-and-click already works with mouse. Phaser handles pointer events for both mouse and touch. Must verify it works | Low | `pointerdown` events already used in RoomScene. Phaser auto-bridges touch and mouse |
| Responsive canvas scaling | Game must fill mobile viewport without distortion. Currently uses `Phaser.Scale.FIT` with `CENTER_BOTH` | Low | Already configured in `main.ts`. FIT mode scales to fit container. Likely works on mobile already |
| Text input on mobile | The DOM-based `TextInputBar` uses a standard HTML `<input>` element. Tapping it must raise the virtual keyboard | Medium | `TextInputBar` is a DOM input. Mobile browsers auto-show keyboard on focus. But canvas resize when keyboard opens is the hard problem |
| Readable text at mobile sizes | Narrator text, dialogue, death messages must be legible on phone screens (320-430px wide) | Medium | Current font sizes (14-16px monospace) may be too small at scaled-down resolutions |
| Inventory accessible via touch | `InventoryPanel` toggle must be touch-friendly with no hover-dependent interactions | Low-Medium | Current toggle via EventBus `inventory-toggle` event. Need a visible touch-friendly button |
| Portrait orientation handling | Many mobile users hold phone in portrait. Game is 16:9 landscape (960x540). Must handle gracefully | Medium | Options: force landscape, reflow layout for portrait, or show rotation prompt |

### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|------------------|------------|-------|
| Command suggestion buttons | Show common verb buttons (Look, Take, Use, Go, Talk) above text input. Tap verb, then tap hotspot. Avoids typing entirely for 80% of commands | Medium | Alternative to text input for mobile. Key UX innovation for touch play |
| Quick-action radial menu | Tap-and-hold on hotspot shows radial menu with context-appropriate verbs | Medium-High | More sophisticated than buttons but higher engineering cost |
| Swipe for room navigation | Swipe left/right at screen edges to traverse exits | Low-Medium | Map swipe direction to exit zone detection |
| Touch-friendly inventory panel | Drag-and-drop items onto game world for "use X on Y" | Medium | Current inventory is text-list. Would need visual item icons (ties to art pipeline) |

### Anti-Features

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Separate mobile app build | Unnecessary complexity. Browser game should be one codebase | Responsive design within single web app |
| Removing text parser on mobile | Text parser IS the core value proposition | Keep text input, supplement with touch shortcuts |
| Complex gesture system | Adventure game players want to explore, not learn gestures | Simple tap-to-move, tap-to-interact, optional verb buttons |
| Native mobile keyboard as primary input | Virtual keyboard covers 40-50% of screen, resizes canvas, breaks immersion | Command suggestion buttons as primary mobile input, keyboard as fallback for complex commands |
| In-canvas virtual keyboard | Massive engineering effort for marginal benefit over button-based input | Use command suggestion buttons instead |

### Key Technical Challenge: Virtual Keyboard + Canvas

When the OS virtual keyboard opens on mobile:
1. Browser viewport shrinks by 40-50%
2. Phaser's `Scale.FIT` recalculates, squishing the canvas
3. Game becomes hard to see during text input

**Recommended solution (in priority order):**

1. **Command suggestion buttons (primary):** Show verb buttons above text input. Most commands are `look [thing]`, `take [thing]`, `use [item] on [thing]`, `go [direction]`. Buttons handle 80% of interactions with zero typing. Only complex commands need the keyboard.

2. **Fixed viewport meta tag:** Use `<meta name="viewport" content="width=device-width, initial-scale=1.0, interactive-widget=resizes-visual">` (Chrome 108+, Safari 16+). Canvas stays fixed size; keyboard overlays bottom of page rather than resizing the viewport.

3. **Dynamic viewport units:** Replace `100vh` with `100dvh` in CSS for iOS Safari compatibility. Current `style.css` uses `100vh` on `#app` which is unreliable on mobile (includes browser chrome).

### CSS Changes Needed

Current `style.css` issues for mobile:
- `overflow: hidden` on body -- correct, keep
- `100vh` on #app -- replace with `100dvh` or JS-calculated height
- `max-width: 960px` on game-container -- fine, FIT mode handles downscaling
- Text parser UI at bottom -- needs to be positioned relative to visible viewport, not full viewport
- No media queries for small screens -- add font size adjustments

### Complexity Assessment

**Overall: MEDIUM.** Basic tap-to-move and canvas scaling very likely work already (Phaser handles this automatically). The hard part is text input on mobile. The command suggestion buttons approach is the pragmatic solution: it preserves the text parser for complex commands while making 80% of interactions tap-only on mobile. Estimated breakdown: ~20% effort on responsive CSS, ~50% on command suggestion buttons, ~30% on testing and edge cases (keyboard, orientation, small screens).

---

## Feature Area 5: Multiple Story Endings

### Table Stakes

| Feature | Why Expected | Complexity | Dependencies on v1.0 |
|---------|-------------|------------|---------------------|
| At least 3 distinct endings | One "bad" ending, one "normal/good" ending, and one "secret/best" ending. Players expect meaningful variation | Medium-High | Story content authoring + new ending scenes |
| Ending determined by player choices | Endings must feel earned. Choices throughout the game should visibly or subtly steer toward different outcomes | Medium | `GameState.flags` already tracks decisions. Need to define which flags matter |
| Replayability signal | After completing the game, player should know other endings exist and have motivation to replay | Low | Post-credits screen showing "Ending 1 of 3" or similar |
| Ending-specific content | Each ending needs unique narrator monologue, scene description, and thematic resolution. Not just a different final sentence | Medium | New ending scenes or variations of final room interactions |
| Save compatibility | Existing saves must still work. Ending system reads flags that were set throughout the game | Low | Flags already in `GameStateData`. New ending logic reads existing flag patterns |

### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|------------------|------------|-------|
| King's Quest VI "short path / long path" model | Optional puzzles unlock the better ending. Completionists get rewarded; casual players still finish | Medium | KQ6 had roughly half optional puzzles with a more satisfying ending for completing them. Proven pattern for the genre |
| Narrator-aware ending commentary | Narrator's final monologue references specific player choices. "Remember that time you drank the cave potion? The narrator certainly does" | Medium | Ink script for ending can use flags to gate text variants. Already have the `narrator_history` ink pattern doing exactly this |
| Death count affects ending tone | Players who died many times get different narrator commentary. "You died 47 times. The narrator lost count at 30" | Low | `deathCount` already tracked. Simple conditional in ending ink script |
| Secret ending for death completionists | Finding all 43 deaths unlocks a special meta ending. Ties death gallery to story payoff | Medium | Cross-feature with death gallery. Check `deathsSeen.length === 43` |
| Post-game stats screen | Show play time, deaths, hints used, puzzles solved, rooms visited. Contextualize the journey | Low | All metrics already tracked in GameState |

### Anti-Features

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| 10+ endings | Diminishing returns. Content explosion without proportional player value | 3-4 endings maximum (bad, normal, good, secret) |
| Endings requiring full replays of identical content | Player should not need to replay 4 hours of identical content for a different 5-minute ending | Divergence points in mid-to-late game; post-game hints at what would change |
| Visible morality meter (good/evil) | Feels mechanical and gamey. Bioshock's binary moral choice is widely criticized as reductive | Organic flag accumulation from puzzle choices, no visible meter |
| Telltale-style false choices | "Your choices don't matter" is the worst outcome. Every ending-relevant decision must create real consequences | Fewer but meaningful decision points (5-8) rather than many cosmetic ones |
| Endings locked behind difficulty modes | No difficulty modes exist and adding them would split the experience | All endings accessible in single playthrough |
| Punishing hint usage in endings | Penalizing accessibility features alienates the players who need them most | Narrator may comment on hints used, but it must not gate ending quality |

### Implementation Pattern (Recommended)

**Flag-based ending determination** using existing `GameState.flags`:

1. **Define ending-relevant flags:** Identify 5-8 key decision points across Acts 1-3 where player choices set meaningful flags:
   - Optional puzzle completions (e.g., `helped-ghost-king`, `freed-dwarven-spirit`)
   - Moral-ish choices (e.g., `spared-the-troll`, `returned-stolen-item`)
   - Thoroughness markers (e.g., `explored-all-caverns`, `read-all-archives`)

2. **Ending determination function:**
```typescript
function determineEnding(state: GameStateData): 'bad' | 'normal' | 'good' | 'secret' {
  const endingFlags = [
    'helped-ghost-king', 'freed-dwarven-spirit', 'spared-the-troll',
    'completed-archive-quest', 'reunited-mirror-spirits'
  ];
  const completed = endingFlags.filter(f => state.flags[f]).length;

  if (state.deathsSeen?.length === 43) return 'secret';  // Death completionist
  if (completed >= 4) return 'good';
  if (completed >= 2) return 'normal';
  return 'bad';
}
```

3. **Ending scenes:** 3-4 ending ink scripts with narrator monologues. Use ink conditional text (`{flag_name: text if true | text if false}`) to reference specific player flags for personalized commentary. The `narrator_history` ink pattern already demonstrates this exact technique.

4. **Post-game screen:** Show ending name, completion percentage, deaths discovered, hints used, and cryptic hints at other endings to encourage replay.

### Complexity Assessment

**Overall: MEDIUM.** The flag infrastructure exists. The `narrator_history` ink script already demonstrates flag-conditional narration. Main work: (a) identify which existing puzzle flags matter for endings, (b) add a few new optional puzzle paths and choices where needed, (c) write 3-4 ending scenes with personalized narrator content, and (d) build ending determination logic and post-game screen. This is primarily a content and design challenge, not an engineering one.

---

## Feature Dependencies Map

```
Art Pipeline ---------> Death Scene Illustrations (optional enhancement)
                             |
                             v
Death Gallery <--------- Death Tracking State Extension
     |
     v
Multiple Endings (secret ending for death completionist -- soft dependency)

Progressive Hints ------- independent (reads existing puzzle data)

Mobile Responsive ------- independent (adapts existing UI/input)

Art Pipeline ------------ independent (offline tool, outputs static assets)
```

**Critical path:** Art Pipeline has the longest wall-clock time (generation alone is hours). Start first.

**Zero dependencies:** Progressive Hints and Mobile Responsive have no dependencies on other v2.0 features. Build in parallel with anything.

**Soft dependency:** Death Gallery benefits from art pipeline (death illustrations) but ships fine without them (text-only gallery is still good).

**Cross-feature:** Multiple Endings has a soft dependency on Death Gallery (secret ending checks death completionism) but can use a simple death count check without gallery UI.

## Feature Interactions

| Feature A | Feature B | Interaction | Priority |
|-----------|-----------|-------------|----------|
| Art Pipeline | Death Gallery | Death illustrations populate gallery entries | Nice-to-have |
| Death Gallery | Multiple Endings | Death completionism unlocks secret ending | Design decision -- keep |
| Progressive Hints | Multiple Endings | Hint usage could affect ending (penalty?) | AVOID -- punishing hint use is bad design |
| Mobile Responsive | Progressive Hints | Hint button must be touch-friendly on mobile | Table stakes |
| Mobile Responsive | Death Gallery | Gallery UI must work on mobile screens | Table stakes |
| Mobile Responsive | Text Parser | Command suggestion buttons reduce typing need | Key differentiator for mobile |
| Art Pipeline | Mobile Responsive | Generated art must look good at mobile scales (480px wide) | Design constraint on art pipeline |

---

## MVP Recommendation for v2.0

### Build First (lowest risk, highest reward, or longest lead time)

1. **Art Pipeline** -- longest lead time due to generation hours. Validate pipeline with 3 test rooms before bulk generation. Start here because everything else can proceed in parallel.

2. **Death Gallery** -- lowest complexity, highest reward relative to effort. 43 deaths already exist with titles and narrator text. State tracking is a 20-line change. Gallery UI is a single new scene. Ships independently.

3. **Progressive Hints** -- medium complexity, significant accessibility win. Author hints alongside existing puzzle review. Content-heavy but no architectural risk.

### Build Second (higher complexity or depends on first batch)

4. **Mobile Responsive** -- medium-high complexity due to the text input challenge. Command suggestion buttons are the key deliverable. Benefits from all UI being finalized first.

5. **Multiple Endings** -- medium complexity, primarily content work. Best done last because ending flags reference specific puzzles, and puzzle balance should be finalized after hints are added.

### Defer to Post-v2.0

- **Death scene illustrations:** Only after room backgrounds prove the pipeline works. 43 vignettes are a luxury, not a requirement.
- **In-canvas virtual keyboard:** Over-engineered. Command suggestion buttons solve 80% of mobile input.
- **"Replay Death" from gallery:** Requires complex save state management for marginal benefit.
- **Pinch-to-zoom on wide rooms:** Nice but not essential for point-and-click.
- **Drag-and-drop inventory on mobile:** Requires visual item icons (art pipeline dependency) and complex touch handling.

---

## Sources

### Art Pipeline
- [Flux-2D-Game-Assets-LoRA on HuggingFace](https://huggingface.co/gokaygokay/Flux-2D-Game-Assets-LoRA) -- pixel art LoRA for Flux (HIGH confidence)
- [Retro Diffusion pixel art with AI](https://runware.ai/blog/retro-diffusion-creating-authentic-pixel-art-with-ai-at-scale) -- pixel art generation at scale (MEDIUM confidence)
- [Flux Apple Silicon Performance Guide 2025](https://apatero.com/blog/flux-apple-silicon-m1-m2-m3-m4-complete-performance-guide-2025) -- M-series generation benchmarks (MEDIUM confidence)
- [Low VRAM Flux Dev GGUF Guide](https://www.nextdiffusion.ai/tutorials/how-to-run-flux-dev-gguf-in-comfyui-low-vram-guide) -- GGUF setup for local generation (MEDIUM confidence)
- [ComfyUI Flux workflow guide](https://comfyui-wiki.com/en/tutorial/advanced/image/flux/flux-1-dev-t2i) -- workflow setup and LoRA integration (MEDIUM confidence)
- [Pixel game assets Flux LoRA on Civitai](https://civitai.com/models/945266/pixel-game-assets-flux-by-dever) -- alternative pixel art LoRA (MEDIUM confidence)

### Progressive Hints
- [How and Why to Write Low Spoiler Hints (Gamedeveloper)](https://www.gamedeveloper.com/design/how-and-why-to-write-low-spoiler-hints-for-adventure-games-) -- incremental hint authoring best practices (HIGH confidence)
- [UHS-Hints -- How Game Guides Were Meant to Be](https://kinglink-reviews.com/2021/03/16/uhs-hints-how-game-guides-were-meant-to-be/) -- UHS model analysis (MEDIUM confidence)
- [Thimbleweed Park Hint System Forum Discussion](https://forums.thimbleweedpark.com/t/hint-system-tech/3139) -- in-world hint delivery via phone (HIGH confidence -- Ron Gilbert's team)
- [Universal Hint System Wikipedia](https://en.wikipedia.org/wiki/Universal_Hint_System) -- UHS history and structure (HIGH confidence)

### Death Gallery
- [Designing Memorable Achievements (RetroAchievements)](https://docs.retroachievements.org/developer-docs/achievement-design.html) -- achievement design principles (MEDIUM confidence)
- [Collectible Achievements Design Pattern](https://ui-patterns.com/patterns/CollectibleAchievements) -- UI pattern for collectible systems (MEDIUM confidence)
- [Space Quest Deaths Wiki](https://spacequest.fandom.com/wiki/Category:Deaths) -- Sierra death collection precedent (HIGH confidence)
- [Game UI Database -- Codex and Journal](https://www.gameuidatabase.com/index.php?scrn=92&set=1&tag=7) -- gallery/journal UI references (MEDIUM confidence)

### Mobile Responsive
- [Phaser 3 ScaleManager and Virtual Keyboard](https://phaser.discourse.group/t/scalemanager-ignore-virtual-keyboard/1361) -- keyboard resize issue (HIGH confidence -- Phaser forum)
- [MDN Mobile Touch Controls](https://developer.mozilla.org/en-US/docs/Games/Techniques/Control_mechanisms/Mobile_touch) -- touch control patterns (HIGH confidence)
- [Phaser 3 Touch Events reference](https://rexrainbow.github.io/phaser3-rex-notes/docs/site/touchevents/) -- Phaser touch API (HIGH confidence)

### Multiple Endings
- [Multiple Endings in Games (Gamedeveloper)](https://www.gamedeveloper.com/design/multiple-endings-in-games) -- ending design patterns (MEDIUM confidence)
- [How to Execute Multiple Game Endings Well (Indiecator)](https://indiecator.org/2021/05/08/multiple-game-endings/) -- quality over quantity analysis (MEDIUM confidence)
- [King's Quest VI Endings (Fandom)](https://kingsquest.fandom.com/wiki/Possible_Endings_for_King's_Quest_VI) -- Sierra short-path/long-path model (HIGH confidence)
- [King's Quest Multiple Endings (Fandom)](https://kingsquest.fandom.com/wiki/Multiple_Endings) -- series-wide ending patterns (HIGH confidence)
