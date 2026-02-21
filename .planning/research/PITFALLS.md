# Domain Pitfalls: v2.0 Art & Polish

**Domain:** Adding Flux art pipeline, progressive hints, death gallery, mobile layout, and multiple endings to existing Phaser 3 adventure game
**Researched:** 2026-02-21
**Confidence:** HIGH for integration pitfalls (based on codebase analysis), MEDIUM for Flux-specific pitfalls (based on community sources)

**Note:** This document covers pitfalls specific to ADDING v2.0 features to the existing v1.0 engine. For foundational pitfalls (LLM latency, unwinnable states, canvas rendering, etc.), see the [v1.0 pitfalls archive](.planning/research/PITFALLS-v1.md).

---

## Critical Pitfalls

Mistakes that cause rewrites, break the stable v1.0 engine, or fundamentally compromise the player experience.

### Pitfall 1: Flux Art Breaks Hotspot and Walkable Area Alignment

**What goes wrong:**
Generated Flux backgrounds look beautiful but have completely different spatial composition than the placeholder art. The throne that was at pixel coordinates (450, 340) in the placeholder is now at (600, 280) in the Flux-generated image. Every hotspot zone, walkable area polygon, interaction point, exit zone, and item placement in the room JSON becomes misaligned. Players click on visually obvious objects and nothing happens. They walk through walls or get stuck on invisible barriers.

**Why it happens:**
The v1.0 system has 36 room JSON files, each with pixel-precise coordinates for walkable areas, hotspots, exits, items, NPC zones, and interaction points. These coordinates were authored against placeholder backgrounds. When Flux generates a new background with different perspective, object placement, or spatial layout, NONE of these coordinates transfer. The room JSON and the visual art are tightly coupled but authored independently. Developers generate the art, see it looks good in isolation, and forget that every coordinate in the room JSON assumed specific visual landmarks.

Specific code at risk -- every room JSON contains structures like:
```json
{
  "walkableArea": [{"x": 50, "y": 385}, {"x": 910, "y": 385}, ...],
  "hotspots": [{"zone": {"x": 450, "y": 340, "width": 80, "height": 80}}],
  "exits": [{"zone": {"x": 0, "y": 350, "width": 80, "height": 200}}]
}
```

**Consequences:**
- All 36 rooms need coordinate re-authoring after art replacement (massive manual effort)
- Interaction points no longer match where NPCs/items visually appear
- Walkable area polygons clip through or float above the visual floor
- Exit zones don't align with visual doorways/paths
- Player spawns in wrong location relative to visual scene

**Prevention:**
- Generate Flux backgrounds CONSTRAINED to match existing spatial layout. Create a composition template image (wireframe showing floor line, hotspot positions, exit locations) and use it as an img2img reference or ControlNet input
- Alternatively, generate art FIRST, then re-author room JSONs to match. Budget 15-30 minutes per room for coordinate realignment (36 rooms = 9-18 hours)
- Build a visual debug overlay tool (already partially exists with `DEBUG = true` in RoomScene) that renders hotspot rects, walkable area, and exit zones on top of the new backgrounds for rapid visual verification
- Establish a spatial contract: floor line always at y=385-520, exits always at screen edges, hotspots positioned within the walkable area
- Consider generating backgrounds with a composition grid baked into the prompt: "pixel art scene with floor at bottom third, main object center-left, doorway on left edge"

**Detection:**
- Hotspot click areas visibly misaligned with background objects
- Player walking above or below the visual floor
- Playtesters clicking on objects and getting no response
- Exit zones that don't correspond to any visual door/path

**Phase to address:**
Art Pipeline phase (must be first v2.0 phase). Solve the art-to-coordinate pipeline for 3 test rooms before committing to batch generation of all 36.

---

### Pitfall 2: Flux Pixel Art Style Drift Across 36 Rooms

**What goes wrong:**
Room 1 looks like a 16-color retro masterpiece. Room 5 looks like a watercolor painting that someone pixelated in Photoshop. Room 12 has anti-aliased gradients that violate pixel art grid rules. Room 20 uses a completely different color temperature. The game looks like 36 different artists contributed one scene each.

**Why it happens:**
Standard diffusion models (including Flux) produce "varying pixel sizes, inconsistent outlines, blurry effects, and random noise patterns" that violate pixel art constraints. Even with careful prompting, Flux generates at its native resolution and must be downscaled, and "even with all attention to detail and training, the models still have trouble being specifically limited to a set number of colors." The 960x540 target resolution is unusual -- Flux typically trains at 512x512 or 1024x1024, and non-standard aspect ratios compound inconsistency.

The project needs backgrounds for 4 distinct acts (forest/village, castle, caverns, climax locations), each with different environments. Maintaining style consistency across diverse settings is the hardest variant of this problem.

**Consequences:**
- Game feels like a collage instead of a cohesive world
- Scene transitions are jarring as art style changes
- Player immersion breaks repeatedly
- Extensive manual touchup required per image, potentially negating the speed benefit of AI generation

**Prevention:**
- Train a custom LoRA on 10-20 hand-crafted or hand-curated reference images that establish the exact pixel art style. Do NOT rely on prompt engineering alone -- Retro Diffusion's research confirms that prompt-only approaches produce inconsistent grid alignment
- Establish and enforce a strict color palette (16-32 colors max) applied as post-processing to every generated image. Use palette quantization algorithms, not manual color correction
- Generate all rooms in batches per act (all forest rooms together, all cave rooms together) using identical settings, seed ranges, and prompt templates
- Build an automated post-processing pipeline: Flux output -> downscale to 960x540 -> palette quantization -> grid alignment correction -> manual review
- Use FLUX.1 Kontext or similar multi-reference system to feed reference images alongside the prompt, maintaining consistency across generations
- Keep prompts "short and style-focused" (5-15 tokens for style, separate from scene content) -- "over-detailed prompts may yield non-pixel textures"
- Create 3 reference rooms (one per environment type) first and use them as style anchors for all subsequent generations

**Detection:**
- Place any two room backgrounds side-by-side -- they should look like they belong in the same game
- Zoom to 200-400% -- pixel grid should be uniform across all images
- Run a color histogram -- palette should match the defined color set within tolerance
- Transition between adjacent rooms -- art style should not "jump"

**Phase to address:**
Art Pipeline phase. The LoRA training and post-processing pipeline MUST be validated on a test batch before mass production. Budget 1-2 weeks for pipeline development before generating any final art.

---

### Pitfall 3: Mobile Virtual Keyboard Destroys Game Layout

**What goes wrong:**
On mobile, the player taps the text input field. The virtual keyboard slides up, covering half the screen. Phaser's Scale Manager (set to `Phaser.Scale.FIT`) detects the viewport change and SHRINKS the game canvas to fit the remaining space above the keyboard. The game is now rendered in a tiny strip at the top of the screen, with the text input barely visible. When the keyboard dismisses, the canvas snaps back to full size. This resize-shrink-restore cycle happens every time the player types a command.

**Why it happens:**
The current config uses `Phaser.Scale.FIT` with `Phaser.Scale.CENTER_BOTH`:
```typescript
scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
}
```
When the virtual keyboard opens, `window.innerHeight` shrinks. Phaser's ScaleManager responds by re-fitting the canvas to the new dimensions. This is documented behavior -- "when the virtual keyboard opens, the height of the canvas shrinks to the remaining space above the keyboard." The TextInputBar is an HTML element BELOW the canvas, so the keyboard may push it off-screen entirely.

Additionally, the current TextInputBar uses a standard `<input>` element that requires the virtual keyboard. On mobile, this creates a feedback loop: tap input -> keyboard opens -> layout shifts -> input loses focus -> keyboard closes -> layout shifts back.

**Consequences:**
- Game canvas resizes violently every time text input is focused
- Text input may be hidden behind the keyboard
- Player cannot see the game while typing commands
- The game is effectively unplayable on phones and tablets
- iOS Safari has additional quirks with viewport-fit and PWA mode

**Prevention:**
- Intercept Scale Manager resize when a text input has focus. Check `document.activeElement` -- if it is the input element, prevent canvas resize. Re-apply normal scaling only when the keyboard dismisses
- Use CSS `overflow-y: auto` on the body when keyboard is open to allow scrolling to the input field rather than shrinking the canvas
- Consider a FIXED canvas size on mobile that does not respond to keyboard events (set `scale.mode` to `Phaser.Scale.NONE` on mobile, handle sizing manually)
- Move the text input INSIDE the game canvas as a Phaser DOM element, or position it as a fixed overlay that stays visible above the keyboard
- The strongest solution: provide an alternative input method on mobile (verb buttons + tap-on-object) that does not require the virtual keyboard at all. Reserve free-text input for an optional expandable text field
- Use `visualViewport` API (widely supported since 2020) instead of `window.innerHeight` to detect actual visible area vs. keyboard coverage

**Detection:**
- Test on a real phone (not browser emulator -- emulators do not simulate virtual keyboard viewport changes)
- Open the game on iOS Safari and Android Chrome
- Tap the text input and observe whether the canvas shrinks
- Type a command and verify you can see both the game and the input simultaneously

**Phase to address:**
Mobile Layout phase. This must be solved before any other mobile features are built. The input paradigm decision (text vs. verb buttons vs. hybrid) is a prerequisite for all mobile work.

---

### Pitfall 4: Save State Schema Change Breaks Existing v1.0 Saves

**What goes wrong:**
v2.0 adds new fields to GameStateData: ending path tracking, death gallery unlocks, hint usage history, multiple ending flags. The `deserialize()` method does a raw `JSON.parse()` -- when it loads a v1.0 save that lacks these new fields, the game crashes or silently has undefined values for critical v2.0 features. Worse: the death gallery needs cross-playthrough persistence, which requires a SEPARATE storage mechanism from per-save game state.

**Why it happens:**
The current `GameStateData` interface has no schema version field:
```typescript
interface GameStateData {
    currentRoom: string;
    inventory: string[];
    flags: Record<string, boolean | string>;
    visitedRooms: string[];
    removedItems: Record<string, string[]>;
    playTimeMs: number;
    deathCount: number;
    dialogueStates: Record<string, string>;
}
```

The `deserialize()` method does a blind `JSON.parse()`:
```typescript
deserialize(json: string): void {
    this.data = JSON.parse(json);
}
```

No validation, no versioning, no migration. A v1.0 save loaded by v2.0 code will have `undefined` for any new fields (endingPath, deathGallery, hintHistory, etc.). Code that accesses `this.data.deathGallery.unlocked` will throw a TypeError.

**Consequences:**
- All existing v1.0 saves become incompatible (or silently broken)
- Players who played v1.0 lose their progress
- Death gallery data (which must persist across playthroughs) has no storage mechanism
- Cross-playthrough data and per-save data get conflated into one structure

**Prevention:**
- Add a `schemaVersion: number` field to GameStateData immediately. Set v1.0 saves to version 1, v2.0 saves to version 2
- Implement migration in `deserialize()`: detect version, apply migration functions, add missing fields with defaults
- Separate concerns: per-save state (inventory, flags, room) vs. meta-game state (death gallery, achievements, ending completion). Store meta-game state in a separate localStorage key that persists even when saves are deleted
- Validate parsed JSON against expected schema before accepting it. Use a type guard function
- Add try/catch around deserialization with a user-friendly "save incompatible" message and option to start fresh

```typescript
// Migration pattern
deserialize(json: string): void {
    const raw = JSON.parse(json);
    if (!raw.schemaVersion || raw.schemaVersion < 2) {
        raw.schemaVersion = 2;
        raw.endingPath = raw.endingPath ?? [];
        raw.hintHistory = raw.hintHistory ?? {};
        // ... other new fields
    }
    this.data = raw as GameStateData;
}
```

**Detection:**
- Attempt to load a v1.0 save in v2.0 code -- does it crash?
- Check if death gallery data survives starting a new game
- Verify meta-game data persists after clearing a save slot

**Phase to address:**
First v2.0 phase (before any new features are implemented). Schema versioning is a prerequisite for ALL v2.0 features that modify game state.

---

### Pitfall 5: Multiple Endings Create Untestable State Space Explosion

**What goes wrong:**
v1.0 has a single linear path through 36 rooms with branching puzzles but one conclusion. Adding multiple endings means tracking which choices lead to which ending throughout the game. The number of possible game states explodes combinatorially. Testing all paths becomes infeasible. Players hit edge cases where they have ending-path flags from one branch but are trying to reach a different ending, creating incoherent narrative states. Save/load across ending paths produces contradictory flag combinations.

**Why it happens:**
The current PuzzleEngine evaluates conditions against a flat `flags: Record<string, boolean | string>` map. Adding ending-path tracking means adding flags like `path_mercy`, `path_justice`, `path_cunning` that accumulate throughout gameplay. With 3 endings and 10 branching decisions, there are theoretically 3^10 = 59,049 possible flag combinations. Most are invalid, but the system has no way to enforce valid combinations.

The existing puzzle JSON structure has no concept of ending paths or mutually exclusive flag groups. A puzzle that sets `path_mercy` doesn't know it should clear `path_justice`. Designers can easily create contradictory states.

**Consequences:**
- Ending selection logic encounters unexpected flag combinations and chooses the wrong ending or crashes
- Players feel railroaded if too few choices matter, or lost if too many choices have opaque effects
- Testing all ending paths manually requires multiple complete playthroughs
- Save files from mid-game become unreliable as ending-critical flags shift during development
- Puzzle conditions that check ending flags create maintenance nightmares as more flags are added

**Prevention:**
- Use a "branch and bottleneck" structure: choices accumulate points/affinity rather than setting individual flags. Three numeric counters (`mercyScore`, `justiceScore`, `cunningScore`) are much easier to reason about than dozens of boolean flags
- The ending is determined by which score is highest at the final scene, NOT by individual flag checks throughout the game. This collapses the state space dramatically
- Add ending-path validation: define which flag combinations are valid, and log warnings when impossible states are detected during testing
- Build automated ending-reachability tests: from a set of scripted playthroughs, verify that each ending is achievable and that the correct ending triggers for each path
- Limit the number of "ending-critical" decision points to 5-8 across the entire game. Mark these explicitly in the puzzle JSON so they are auditable
- Keep endings as variations on a shared climax rather than completely divergent storylines. This reduces the content multiplication problem from 3x to 1.3x

**Detection:**
- Create a spreadsheet of every ending-critical decision point and trace all paths
- Run automated playthrough scripts that make different choices and verify ending assignment
- Playtest each ending path start-to-finish (minimum 3 full playthroughs)
- Search room JSONs for ending-related flags and verify consistency

**Phase to address:**
Multiple Endings design phase (should come AFTER core v2.0 features). Requires careful narrative design before any implementation. The scoring system must be designed on paper and validated before code.

---

## Moderate Pitfalls

### Pitfall 6: Progressive Hints Spoil Puzzles or Break Immersion

**What goes wrong:**
The hint system either gives away solutions too quickly (making puzzles trivial) or is so vague that stuck players remain stuck. Hints that reference game mechanics ("try using the COMBINE command") break the narrator's voice. Hints that trigger based on time alone annoy players who are thinking, not stuck. Hint text accidentally reveals the existence of items or NPCs the player hasn't discovered yet, spoiling exploration.

**Why it happens:**
Writing good progressive hints is harder than writing puzzles. The hint author knows the solution and unconsciously writes from that perspective. A hint saying "Have you tried the throne room?" tells the player both WHERE to go and THAT the throne room is important -- two spoilers in one sentence. Time-based triggers assume all players think at the same speed. The existing narrator voice (sardonic, fourth-wall-breaking) makes it tempting to write hints as comedic asides, but comedy and helpful guidance pull in opposite directions.

Additionally, the current PuzzleEngine has no concept of "player progress toward a puzzle" -- it only tracks solved/unsolved via `puzzle-solved:${puzzle.id}` flags. There is no infrastructure for detecting that a player is stuck.

**Consequences:**
- Players either find hints useless or overpowered, with no middle ground
- Immersion breaks when hint text doesn't match narrator voice
- Unsolicited hints annoy players who want to figure things out themselves
- Hint text accidentally spoils puzzle existence, item locations, or NPC encounters

**Prevention:**
- Structure hints in 3-4 tiers per puzzle, following the Universal Hint System model:
  1. Gentle nudge: "The narrator suspects you might have overlooked something in this room." (No specifics)
  2. Direction: "Perhaps examining the furniture more carefully would be wise." (Points to area)
  3. Specific: "The throne has seen better days. And worse sitters." (Names the object)
  4. Solution: "Using [item] on [target] might produce interesting results." (Gives the answer)
- Make hints ALWAYS player-initiated (a "hint" command or button), NEVER automatic. Respect player agency
- Track "hint request count" per puzzle, not time spent. Escalate tier on each request
- Write ALL hint text in the narrator voice. The narrator reluctantly helping is both in-character and useful: "Oh, must I? Fine. You might want to look at the banners. I'm not saying why. Work it out."
- Never reference game mechanics in hints. "Try the COMBINE command" breaks immersion. Instead: "The narrator wonders what would happen if those two items were brought together."
- Test hints by giving them to someone who has NOT seen the puzzle. Can they solve it from the hint alone (too spoilery) or are they still lost (too vague)?
- Hints must only reference things the player has ALREADY seen. Check visited rooms and discovered items before generating hint text

**Detection:**
- Playtesters solve puzzles immediately after first hint (hints too strong)
- Playtesters request all hint tiers and are still stuck (hints too weak)
- Hint text references rooms/items/NPCs the player hasn't encountered
- Hint text uses game-mechanic language ("try the USE verb")

**Phase to address:**
Hint System phase (should come after art pipeline but before multiple endings, since hints help players reach endings).

---

### Pitfall 7: Death Gallery Data Architecture Conflicts with Save System

**What goes wrong:**
The death gallery tracks which death scenes a player has discovered across ALL playthroughs. But the current save system stores everything per-save-slot. When a player starts a new game, their death gallery progress is lost because it was stored inside the save data that just got reset. Alternatively, if death gallery data is stored separately, it gets out of sync with save data -- a player loads an old save where they hadn't discovered a death, but the gallery still shows it as unlocked.

**Why it happens:**
The current `GameState` singleton resets ALL data on new game:
```typescript
reset(): void {
    this.data = getDefaultState(); // Wipes everything
}
```

And the `SaveManager` stores the entire `GameState.serialize()` output per slot. There is no concept of "meta-game data" that persists across saves and new games. The `deathCount` field is per-save, tracking deaths in the current playthrough.

The death gallery needs a fundamentally different persistence model: data that only accumulates, never resets, and persists independently of save slots.

**Consequences:**
- Death gallery progress lost on new game
- Death gallery shows deaths from a playthrough the player abandoned
- Gallery unlock state contradicts current save state (confusing UX)
- localStorage space wasted storing duplicate gallery data in every save slot

**Prevention:**
- Create a separate `MetaGameState` class that manages cross-playthrough data: death gallery unlocks, ending completions, total playthroughs, achievement flags
- Store meta-game data in a separate localStorage key (`kqgame-metagame`) that is NEVER reset by `GameState.reset()`
- MetaGameState is write-only for unlocks: once a death is discovered, it stays discovered forever, regardless of save/load/new-game
- When a death triggers (in `DeathScene.handleRetry()`), record it in MetaGameState BEFORE loading the auto-save
- The death gallery UI reads from MetaGameState, NOT from the current save's GameState
- Keep MetaGameState lightweight: just a set of death IDs, ending IDs, and timestamps. Estimated size: < 5 KB even with all deaths unlocked

```typescript
interface MetaGameData {
    schemaVersion: number;
    discoveredDeaths: string[];       // death IDs across all playthroughs
    completedEndings: string[];       // ending IDs
    totalPlaythroughs: number;
    totalDeathCount: number;
    firstPlayDate: number;
}
```

**Detection:**
- Start a new game after discovering deaths -- are they still in the gallery?
- Load an old save -- does the gallery reflect deaths from other saves?
- Clear a save slot -- does gallery data persist?
- Open the game in a new browser profile -- gallery should be empty (tied to localStorage origin)

**Phase to address:**
Death Gallery phase. MetaGameState architecture should be designed and implemented BEFORE the gallery UI, since it changes how death events are recorded (modifying the existing `DeathScene`).

---

### Pitfall 8: Mobile Touch Targets Too Small for Hotspot Interaction

**What goes wrong:**
Hotspot zones designed for mouse precision become impossible to tap on mobile. The Royal Seal in the throne room has a zone of 30x25 pixels at 960x540. On a phone screen, this is approximately 4mm x 3mm -- far below the recommended 48x48px (7mm) minimum touch target. Players tap repeatedly on objects and miss. The game feels broken.

**Why it happens:**
All 36 room JSONs were authored with mouse interaction in mind. The hotspot and item zones are sized to visually match the objects in the placeholder art:
```json
{"id": "royal-seal", "zone": {"x": 550, "y": 400, "width": 30, "height": 25}}
```

The game canvas is 960x540 but is CSS-scaled to fit the device screen. On a 375px-wide phone, the canvas is scaled to ~0.39x, making that 30x25 zone effectively 12x10 CSS pixels. Fingers are much less precise than mouse cursors.

**Consequences:**
- Mobile players cannot interact with small items
- Players tap in the general area of an object but hit the walkable area instead, walking to the wrong location
- Frustrating trial-and-error tapping replaces deliberate interaction
- Accessibility failure for players with motor difficulties

**Prevention:**
- Implement touch target expansion on mobile: when the device is detected as touch-capable, expand all hotspot zones to a minimum of 48x48 logical pixels (before canvas scaling)
- Add a "hotspot highlight" mode for mobile: tap anywhere to show all interactive areas with visual indicators, then tap the specific one. This replaces precision with a two-tap interaction pattern
- Consider a "look" mode vs. "interact" mode toggle on mobile: in look mode, tapping shows object names; in interact mode, tapping triggers the interaction
- For the text parser: provide verb buttons that auto-complete with the nearest hotspot. Tapping near an object + tapping "LOOK" executes "look at [nearest object]"
- Do NOT resize the room JSON zones themselves (this would break mouse interaction on desktop). Apply the expansion programmatically at runtime based on input device
- Use `navigator.maxTouchPoints > 0` to detect touch capability (more reliable than screen size)

**Detection:**
- Test on a real phone (6-inch screen)
- Can you tap the smallest item in the game on the first try?
- Track tap miss rates during mobile playtesting (taps on walkable area when hotspots were the likely target)
- Measure the CSS-pixel size of every hotspot on the smallest supported screen

**Phase to address:**
Mobile Layout phase. Touch target expansion is part of the fundamental mobile interaction model, not a polish item.

---

### Pitfall 9: Text Input on Mobile is Fundamentally Wrong UX

**What goes wrong:**
The core game mechanic -- typing natural language commands -- is hostile to mobile users. The virtual keyboard covers half the screen. Typing "examine the faded banners in the throne room" on a phone keyboard is slow, error-prone, and tedious. Players abandon the game because the primary interaction method is fighting against the device rather than playing.

**Why it happens:**
The game was designed as a keyboard-first experience: `TextInputBar` creates an HTML `<input>` element, listens for `keydown` events, and supports command history with arrow keys. This works beautifully on desktop. On mobile, text input is the lowest-common-denominator interaction -- it works, but it is the worst possible UX for a game. Adventure games on mobile (like Thimbleweed Park, Broken Sword) universally use tap-to-interact with verb wheels or contextual menus, not text input.

**Consequences:**
- Mobile players cannot effectively play the game
- The "magical" text parser (the game's core value proposition) becomes a frustration engine on mobile
- Mobile players miss the LLM-powered natural language understanding entirely
- The game's primary innovation (natural language input) is invisible on its largest potential platform

**Prevention:**
- Design a DUAL input system: text input on desktop, verb-grid + tap-target on mobile
- Mobile verb grid: persistent buttons for LOOK, TAKE, USE, TALK, GO. Tapping a verb then tapping an object executes the command. This preserves the adventure game feel without requiring typing
- Keep the text input available on mobile as an OPTIONAL expandable field for players who want to type complex commands (e.g., "use royal seal on blank decree")
- The command pipeline already supports structured commands via `CommandDispatcher` -- the verb grid just constructs the same `{verb, subject, target}` structure without the text parser
- Implement tap-on-object to auto-generate a "look at [object]" command as the default mobile interaction
- The LLM parser remains available for complex commands; the verb grid handles the 80% case

**Detection:**
- Give the game to someone on a phone who has never seen it. Watch them try to play. How long before they give up on typing?
- Compare command input rate on desktop (commands per minute) vs. mobile
- Track which commands mobile users attempt vs. abandon

**Phase to address:**
Mobile Layout phase (first mobile task). The input paradigm must be decided before building any other mobile features.

---

### Pitfall 10: Preloader Asset Loading Becomes Untenable with Real Art

**What goes wrong:**
The Preloader currently loads ALL 36 room JSONs, ALL dialogue files, ALL audio, and ALL background images in a single `preload()` call. With placeholder art (4 simple parallax layers shared across rooms), this is fast. With 36 unique Flux-generated backgrounds at 960x540 (each ~200-500 KB as optimized PNG), plus potential per-room parallax layers, the initial load balloons to 20-50 MB. Mobile users on cellular connections wait 30+ seconds before seeing the title screen. Some abandon the page.

**Why it happens:**
The current Preloader loads everything eagerly:
```typescript
// Loads ALL 36 rooms, ALL dialogue, ALL audio upfront
this.load.json('room-forest_clearing', 'assets/data/rooms/forest_clearing.json');
// ... 35 more room loads
this.load.image('bg-sky', 'assets/backgrounds/sky.png');
// ... shared backgrounds
```

This worked when backgrounds were 4 shared images. With per-room unique backgrounds, each room needs its own set of images. 36 rooms x 4 layers x ~200 KB = ~29 MB of background images alone.

**Consequences:**
- Initial load time unacceptable on mobile/slow connections
- Memory usage spikes as all assets load simultaneously
- Players bounce before the game starts
- Mobile browsers may kill the tab due to memory pressure

**Prevention:**
- Implement lazy asset loading: only load assets for the current room and adjacent rooms (rooms reachable via exits)
- Keep the Preloader for critical shared assets: player spritesheet, UI elements, audio, item definitions, NPC registry
- Load room-specific backgrounds on demand during scene transitions. Use the transition animation (fade/slide) to mask load time
- Implement a room asset manifest that maps room IDs to their required assets, loaded from a lightweight JSON index
- Add asset unloading: when leaving a room, unload backgrounds that are not needed by any adjacent room
- Compress images aggressively: use WebP (95% browser support) instead of PNG for backgrounds. WebP at quality 80 produces ~40% smaller files than optimized PNG with minimal visual difference for pixel art
- Consider using a texture atlas for smaller per-room elements (items, NPCs) to reduce HTTP requests

**Detection:**
- Measure initial load time on a throttled connection (3G simulation in DevTools)
- Monitor memory usage across 10+ room transitions
- Profile Phaser's texture cache size after loading all rooms

**Phase to address:**
Art Pipeline phase (when real art is first integrated). The lazy loading system must be built alongside the art pipeline, not retrofitted after all art is loaded eagerly.

---

## Minor Pitfalls

### Pitfall 11: Death Gallery UI Disrupts Game Flow

**What goes wrong:**
The death gallery is accessible from the main menu but players discover it at an awkward time -- after dying, they want to retry, not browse a gallery. Or the gallery becomes a spoiler source where players see death titles for scenes they haven't reached yet, revealing future locations.

**Prevention:**
- Show only discovered deaths in the gallery (already planned, but ensure death titles don't reveal room names the player hasn't visited)
- Add a "new death discovered!" notification on the death screen itself, with a subtle indicator of gallery progress (e.g., "Deaths discovered: 7/24")
- Use silhouettes or "???" for undiscovered deaths to create curiosity without spoiling
- Make the gallery viewable from both the death screen ("View Gallery" button) and the main menu
- Deaths should have short, memorable titles (the existing format is good: "Death by Ambition (Seated Edition)") that are entertaining to browse

---

### Pitfall 12: Flux Generation Pipeline Has No Reproducibility

**What goes wrong:**
An art asset needs to be regenerated (bug found, coordinate adjustment needed, style guide updated). The developer cannot reproduce the original generation because they did not save the seed, prompt, model version, LoRA weights, or generation parameters. The regenerated image looks different, requiring another round of coordinate adjustments and post-processing.

**Prevention:**
- Store generation metadata alongside every asset: prompt, seed, model ID, LoRA version, CFG scale, steps, resolution, post-processing pipeline version
- Use a generation manifest file (JSON) that maps each asset to its generation parameters
- Implement the generation pipeline as a script (not manual API calls) so it can be re-run deterministically
- Version control the generation script, prompt templates, and post-processing pipeline
- Keep the LoRA weights and model checkpoint pinned to specific versions
- Store both the raw Flux output and the post-processed final asset

---

### Pitfall 13: Multiple Endings Make the Hint System Ambiguous

**What goes wrong:**
The progressive hint system was designed for a single path through the game. With multiple endings, a hint that says "you need to find the royal seal" may only be correct for one ending path. Players on a different path receive misleading guidance.

**Prevention:**
- Make the hint system aware of the player's current ending path (if detectable from flags/scores)
- For shared puzzles (required by all paths), hints are universal
- For path-specific puzzles, hints should be gated by the same conditions that unlock the puzzle
- If a player is in a state where multiple paths are still viable, hints should focus on shared objectives, not path-specific ones
- Design endings so they share a common middle-game and diverge only in the final act, minimizing the hint-ambiguity window

---

### Pitfall 14: CSS Scaling Breaks HTML Overlay Positioning on Mobile

**What goes wrong:**
The TextInputBar, NarratorDisplay, InventoryPanel, and DialogueUI are all HTML elements positioned relative to the `#game-container`. When Phaser's Scale Manager resizes the canvas for different screen sizes, these HTML elements do not scale proportionally. The text input bar overflows the screen edge, the inventory panel overlaps the game, or the narrator text is too small to read.

**Prevention:**
- Use CSS relative units (%, vw, vh) for HTML overlay sizing, not fixed pixel widths
- The current `max-width: 960px` on `#text-parser-ui` is correct for desktop but needs a responsive override for mobile
- Match HTML overlay width to the actual rendered canvas width (not the logical 960px). Listen to Phaser's `scale.on('resize')` event and update CSS accordingly
- Consider moving ALL UI into Phaser's scene graph (as Phaser text/sprites) to eliminate the HTML-Canvas coordination problem entirely, though this sacrifices text input capabilities
- Test on screens from 375px (iPhone SE) to 2560px (ultrawide) width
- Add CSS media queries for common breakpoints: `@media (max-width: 768px)` for tablets, `@media (max-width: 480px)` for phones

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Art Pipeline | #1 (Hotspot misalignment) | Generate art constrained to spatial templates; build visual debug overlay; budget time for coordinate re-authoring |
| Art Pipeline | #2 (Style drift) | Train LoRA first; establish palette and post-processing pipeline before mass generation |
| Art Pipeline | #10 (Preloader bloat) | Implement lazy loading alongside art pipeline, not after |
| Art Pipeline | #12 (No reproducibility) | Script the entire generation pipeline; store metadata per asset |
| Mobile Layout | #3 (Keyboard shrinks canvas) | Intercept Scale Manager during keyboard; consider SCALE.NONE on mobile |
| Mobile Layout | #8 (Touch targets too small) | Expand hotspot zones programmatically on touch devices |
| Mobile Layout | #9 (Text input wrong UX) | Build verb-grid as primary mobile input; text as optional |
| Mobile Layout | #14 (CSS overlay misalignment) | Responsive CSS; sync HTML overlay width to canvas width |
| Save/State | #4 (Schema breaks) | Add schema version; implement migration; separate meta-game state |
| Save/State | #7 (Death gallery storage) | MetaGameState in separate localStorage key; never reset |
| Hint System | #6 (Spoils or useless) | 3-4 tier progressive hints; player-initiated only; narrator voice |
| Hint System | #13 (Ambiguous with multiple endings) | Path-aware hints; shared puzzles get universal hints |
| Multiple Endings | #5 (State explosion) | Score-based ending selection; limit decision points; automated path testing |
| Multiple Endings | #13 (Hint ambiguity) | Design endings to diverge late; hints focus on shared objectives |

## Integration Risk Matrix

How each v2.0 feature interacts with the existing v1.0 codebase.

| Feature | Files Modified | Risk Level | Notes |
|---------|---------------|------------|-------|
| Flux Art Pipeline | Preloader.ts, room JSONs (all 36), new assets | HIGH | Every room JSON may need coordinate updates; Preloader needs lazy loading |
| Progressive Hints | PuzzleEngine.ts, RoomScene.ts, new HintSystem, room JSONs | MEDIUM | New system but integrates via existing EventBus pattern; room JSONs need hint data |
| Death Gallery | DeathScene.ts, GameStateTypes.ts, new MetaGameState, new GalleryScene | MEDIUM | Modifies death flow; adds new scene; needs separate storage |
| Mobile Layout | main.ts (scale config), style.css, TextInputBar.ts, RoomScene.ts | HIGH | Touches core rendering config and primary input system; every HTML overlay affected |
| Multiple Endings | GameStateTypes.ts, PuzzleEngine.ts, room JSONs (ending rooms), new EndingScene | MEDIUM-HIGH | Modifies state schema; adds ending-specific puzzles and conditions |

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| #1 Hotspot misalignment | HIGH (manual per-room) | Visual debug overlay + manual coordinate correction for each room |
| #2 Style drift | MEDIUM | Re-generate with stricter LoRA/pipeline; post-process batch |
| #3 Keyboard resize | LOW-MEDIUM | Add resize intercept code; test on real devices |
| #4 Schema break | LOW if caught early | Add versioning and migration; backfill existing saves |
| #5 State explosion | HIGH | Redesign ending system to score-based; audit all ending flags |
| #6 Bad hints | MEDIUM | Rewrite hint text; adjust tier thresholds; playtest |
| #7 Gallery storage | LOW | Extract to MetaGameState; migrate existing death count |
| #8 Small touch targets | LOW | Programmatic expansion; no JSON changes needed |
| #9 Text input on mobile | MEDIUM-HIGH | Build verb-grid system; significant new UI work |
| #10 Preloader bloat | MEDIUM | Refactor to lazy loading; asset manifest system |

## Sources

- [Retro Diffusion: Creating authentic pixel art with AI at scale](https://runware.ai/blog/retro-diffusion-creating-authentic-pixel-art-with-ai-at-scale) -- Flux pixel art consistency challenges and post-processing pipeline (MEDIUM confidence)
- [Train FLUX LoRA for Pixel Art Characters](https://www.milliyin.dev/flux-pixel-art-characters-lora/) -- LoRA training specifics, prompt length pitfalls (MEDIUM confidence)
- [Phaser ScaleManager: Ignore Virtual Keyboard](https://phaser.discourse.group/t/scalemanager-ignore-virtual-keyboard/1361) -- Canvas resize on mobile keyboard open (HIGH confidence, community-verified)
- [Phaser Scale Manager docs](https://docs.phaser.io/phaser/concepts/scale-manager) -- Official Scale.FIT behavior (HIGH confidence)
- [How to force mobile keyboard to appear - Phaser 3](https://phaser.discourse.group/t/how-to-force-mobile-keyboard-to-appear/11477) -- Mobile text input challenges (HIGH confidence)
- [How and why to write low spoiler hints for adventure games](https://www.gamedeveloper.com/design/how-and-why-to-write-low-spoiler-hints-for-adventure-games-) -- Progressive hint design principles (HIGH confidence)
- [Multiple Endings in Games - Gamedeveloper.com](https://www.gamedeveloper.com/design/multiple-endings-in-games) -- Ending design pitfalls and patterns (HIGH confidence)
- [The 14 Deadly Sins of Graphic-Adventure Design](https://www.filfre.net/2015/07/the-14-deadly-sins-of-graphic-adventure-design/) -- Ron Gilbert's adventure game design anti-patterns (HIGH confidence)
- [MDN: Storage quotas and eviction criteria](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria) -- localStorage limits (HIGH confidence)
- [Naninovel: Unlockable Items](https://naninovel.com/guide/unlockable-items) -- Cross-playthrough persistent unlock pattern (MEDIUM confidence)
- [Standard Patterns in Choice-Based Games](https://heterogenoustasks.wordpress.com/2015/01/26/standard-patterns-in-choice-based-games/) -- Branch and bottleneck narrative structure (HIGH confidence)
- [Flux Pixel Art LoRA](https://flux1.ai/flux-pixel-art) -- Flux pixel art generation capabilities (MEDIUM confidence)
- [FLUX.1 Kontext](https://arxiv.org/html/2506.15742v2) -- Multi-reference consistency system (MEDIUM confidence)

---
*Pitfalls research for: v2.0 Art & Polish features on existing KQGame engine*
*Researched: 2026-02-21*
