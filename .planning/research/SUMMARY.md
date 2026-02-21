# Project Research Summary

**Project:** KQGame v2.0 "Art & Polish"
**Domain:** Browser-based adventure game — Flux art pipeline, progressive hints, death gallery, mobile responsiveness, multiple endings
**Researched:** 2026-02-21
**Confidence:** MEDIUM-HIGH

## Executive Summary

KQGame v2.0 adds five feature areas to a validated v1.0 engine (Phaser 3, TypeScript, Vite, inkjs, Ollama, navmesh). The defining architectural insight from research is that **none of the five v2.0 features require rewriting existing systems**. The codebase's data-driven patterns — EventBus decoupling, GameState singleton, JSON room schemas, and scene-based rendering — provide clean extension points for every feature. The only new npm dependency is `sharp` (image post-processing) as a dev dependency for the offline art pipeline. Everything else builds on what already exists.

The Flux art pipeline is the highest-risk, highest-effort, and longest lead-time feature. It is an offline, build-time tool that generates static PNG assets consumed by the existing Preloader — it does not touch the runtime engine. However, it introduces two serious integration risks that must be addressed before bulk generation begins: generated art will likely have different spatial composition than placeholder backgrounds, requiring per-room coordinate re-authoring in all 36 room JSONs; and the current eager Preloader strategy becomes untenable with real per-room art (potentially 20-50 MB initial load). A `MetaGameState` class (separate localStorage key, never reset on new game) is a cross-cutting prerequisite that must also exist before death gallery, hints, or endings are implemented.

The four runtime features are all low-to-medium risk additions. Death gallery and hints integrate via existing EventBus and GameState patterns with minimal modification. Multiple endings leverage inkjs's existing conditional branching and the flag system proven across 36 rooms. Mobile layout is the second-highest-risk feature: the critical pitfall is the virtual keyboard destroying the canvas layout, and the fundamental UX challenge is that text input is hostile to mobile users — a verb-button system must be the primary mobile input, not a workaround. Schema versioning and migration for `GameStateData` is a cross-cutting concern that must be addressed before any other v2.0 feature modifies game state.

## Key Findings

### Recommended Stack

The existing stack requires only one new npm dependency. The Flux art pipeline uses external tooling — ComfyUI (local server), Flux.1 Dev GGUF-quantized model, and the Flux-2D-Game-Assets-LoRA — all installed separately from npm. The `sharp` library (`^0.34.5`) is the only npm addition, used in the post-processing pipeline script to resize and convert generated images. ComfyUI's REST API (`POST /prompt`, `GET /history/{id}`, `GET /view`) is simple enough that plain `fetch()` in a build script suffices — no npm client wrapper is needed. All runtime features use existing Phaser, inkjs, and browser APIs.

**Core technology additions:**
- **ComfyUI + Flux.1 Dev GGUF (Q5):** Local image generation server and model — runs on Apple Silicon (16GB+), ~1-5 min per image; build-time only, not runtime
- **Flux-2D-Game-Assets-LoRA (gokaygokay, Apache 2.0):** Pixel art game asset style consistency; trigger word `GRPZA`; designed for game assets with white backgrounds for easy sprite extraction
- **sharp (`^0.34.5`, devDependency):** Batch image post-processing (resize 1024x1024 → 960x540, WebP conversion); the only new npm dependency
- **Phaser ScaleManager (built-in):** Already configured as `Scale.FIT`; handles mobile canvas scaling without additional libraries
- **CSS media queries (native):** Mobile layout adaptation — no CSS framework needed (the game has exactly 3 styled UI elements)
- **inkjs conditional branching (existing):** Multiple endings use `{ flag: -> ending_knot }` — ink was designed for exactly this use case

**What to explicitly avoid:** phaser3-rex-plugins (not needed for any v2.0 feature), any CSS framework, Capacitor/Cordova, state management libraries, WebGL shaders, and any runtime AI/ML (Flux runs at build time only).

See [STACK.md](.planning/research/STACK.md) for full alternatives analysis.

### Expected Features

The five v2.0 feature areas have different complexity profiles and dependencies. Art pipeline is the longest critical path (generation hours plus pipeline validation). Death gallery is the fastest win. Hints and mobile layout are parallel tracks. Multiple endings should come last because it references puzzle flags that should stabilize after hints are added.

**Must have (table stakes for v2.0):**
- Consistent pixel art style across all 36 rooms — visual coherence is the whole point of the art milestone
- Parallax-compatible layer output — rooms use 4-layer parallax; monolithic images will not work
- Per-puzzle tiered hints (3-4 levels, vague to explicit) — the Universal Hint System model since 1988
- Death tracking persistence across sessions — 43 deaths already exist with titles; tracking needs one schema addition
- Gallery UI showing discovered vs. undiscovered deaths (silhouette/???) — core discovery loop
- Touch-to-move plus verb button input on mobile — text input alone is not viable on phones
- At least 3 distinct endings (bad/normal/good) determined by accumulated flags — player agency must feel real

**Should have (differentiators):**
- Diegetic hint delivery through the sardonic narrator voice — "Oh, must I? Fine." aligns with game tone
- Context-aware hint targeting based on current room, inventory, and partial puzzle progress
- Death completionist secret ending (all 43 deaths found → unlocks secret ending) — ties gallery to story payoff
- Narrator-personalized ending monologues referencing specific player choices via ink conditionals
- Command suggestion verb buttons as primary mobile input — handles 80% of interactions without typing
- Post-game stats screen (play time, deaths, hints used, rooms visited)
- Death scene illustrations generated via Flux pipeline (43 vignettes, deferred from day-one)

**Defer to post-v2.0:**
- Drag-and-drop inventory on mobile (requires visual item icons and complex touch handling)
- "Replay Death" from gallery (complex save snapshot management for marginal benefit)
- In-canvas virtual keyboard (over-engineered; verb buttons solve the problem)
- 10+ endings (diminishing returns; 3-4 is the right number)
- Real-time in-game Flux generation (85-145 seconds per image; not feasible at runtime)

See [FEATURES.md](.planning/research/FEATURES.md) for the full feature dependency map.

### Architecture Approach

The existing architecture has well-defined extension points that each v2.0 feature slots into cleanly. New systems follow the AudioManager pattern: singleton, EventBus-driven, per-scene `init()`/`cleanup()`. GameStateData extensions are purely additive (new fields with defaults). New Phaser scenes follow existing patterns (DeathScene, MainMenuScene). The most invasive change is to `RoomScene.ts`, which wires three new systems (HintManager, DeathGallery, mobile controls) using the same boilerplate pattern three times. The one architectural decision requiring special care is death gallery persistence: it must live in a separate `MetaGameState` (its own localStorage key) that never resets when the player starts a new game.

**Major new components:**
1. **`scripts/generate-art.ts`** (offline, not bundled) — ComfyUI API caller, reads art manifest, post-processes via sharp, outputs to `public/assets/`
2. **`tools/art-pipeline/manifest.json`** — maps room IDs to prompts, dimensions, seeds; the reproducibility artifact for the pipeline
3. **`src/game/systems/HintManager.ts`** — singleton, EventBus-driven; tracks hint attempts per puzzle, delivers tiered hints through NarratorDisplay
4. **`src/game/systems/DeathGallery.ts`** — singleton; records discovered deaths to MetaGameState (separate localStorage key, never reset on new game)
5. **`src/game/scenes/DeathGalleryScene.ts`** — grid UI of all 43 deaths; discovered vs. silhouette; accessible from DeathScene and MainMenu
6. **`src/game/scenes/EndingScene.ts`** — data-driven ending sequences with narrator text, ending-specific art, and epilogue
7. **`src/game/ui/MobileControls.ts`** — verb button bar (Look/Take/Use/Go/Talk); constructs `{verb, subject, target}` without requiring text parser
8. **`src/game/ui/ResponsiveLayout.ts`** — detects viewport, coordinates HTML overlay positioning with Phaser canvas resize events

**Modifications to existing components (impact summary):**

| File | Changes | Risk |
|------|---------|------|
| `GameStateData` interface | Add `schemaVersion`, `hintAttempts`, `endingReached?` | NONE — additive |
| `PuzzleAction` / `PuzzleCondition` types | One new union member each | LOW |
| `PuzzleEngine.ts` | Handle `trigger-ending` action (one switch case) | LOW |
| `CommandDispatcher.ts` | Emit `hint-opportunity` on failure; add "hint" verb | LOW (3-5 lines) |
| `DeathScene.ts` | Gallery count, "new!" badge, Gallery button | MEDIUM |
| `RoomScene.ts` | Wire HintManager, DeathGallery, ending handler, mobile input | MEDIUM (bulk, not complexity) |
| `Preloader.ts` | Lazy loading by room area + new registry files | MEDIUM (significant refactor) |
| `style.css` | Mobile breakpoints, verb bar, 16px font-size fixes | MEDIUM |

See [ARCHITECTURE.md](.planning/research/ARCHITECTURE.md) for full component dependency map and data flow diagrams.

### Critical Pitfalls

1. **Flux art breaks hotspot and walkable area alignment** — Generated backgrounds will have different spatial composition than placeholders. Every hotspot zone, exit zone, and walkable area polygon across all 36 rooms will be misaligned. Prevention: generate art constrained to spatial templates (composition grid in prompt or ControlNet reference); use the existing `DEBUG = true` overlay to visually verify zones against new backgrounds; budget 15-30 minutes per room for coordinate re-authoring (36 rooms = 9-18 hours total). Validate on 3 test rooms before bulk generation.

2. **Pixel art style drift across 36 rooms** — Flux without a LoRA produces inconsistent pixel grid sizes, color temperatures, and outline styles across four distinct environment types. Prevention: use Flux-2D-Game-Assets-LoRA; enforce a strict 16-32 color palette via palette quantization post-processing on every generated image; generate all rooms for one act in a single batch session with identical settings and seed ranges.

3. **Mobile virtual keyboard destroys canvas layout** — When the virtual keyboard opens, `window.innerHeight` shrinks, Phaser's `Scale.FIT` re-fits the canvas to a tiny strip above the keyboard, and the text input may be hidden behind the keyboard. Prevention: intercept ScaleManager resize when the input is focused (check `document.activeElement`); use `visualViewport` API instead of `window.innerHeight`; make verb buttons the primary mobile input so the keyboard is only needed for complex commands.

4. **Save state schema change breaks v1.0 saves** — The current `GameStateData` has no `schemaVersion` and `deserialize()` does a blind `JSON.parse()`. Adding new fields without migration causes TypeErrors on all existing saves. Prevention: add `schemaVersion: number` to GameStateData immediately as the first v2.0 code change; implement migration in `deserialize()`; store MetaGameState (death gallery, endings) in a separate localStorage key outside save slots.

5. **Multiple endings create untestable state space** — With boolean flags per decision, 10 branching points produces 2^10 possible combinations, most of them invalid. Prevention: use score accumulators (`mercyScore`, `justiceScore`, etc.) instead of individual boolean flags; limit ending-critical decision points to 5-8 across the entire game; build automated playthrough scripts to verify each ending is reachable.

6. **Preloader balloons to 20-50 MB with real art** — The current eager Preloader loads all assets upfront. With per-room Flux backgrounds (36 rooms x 4 layers x ~200-500 KB), initial load becomes unacceptable on mobile cellular. Prevention: implement lazy loading of room backgrounds during scene transitions; only eager-load shared assets and adjacent rooms.

See [PITFALLS.md](.planning/research/PITFALLS.md) for the full pitfall analysis including moderate and minor pitfalls.

## Implications for Roadmap

Based on dependency analysis and risk assessment across all four research files, the recommended build order has five phases. Art pipeline and schema hardening go first because they are prerequisites for everything else. Death gallery comes second, validating the MetaGameState pattern with low risk. Hints come third. Endings come fourth after hints stabilize puzzle design. Mobile comes last because it touches the entire UI layer and benefits from all features being stable.

### Phase 1: Art Pipeline + Schema Foundation

**Rationale:** The art pipeline has the longest wall-clock time (generation is hours) and must start immediately as a parallel track. Schema versioning is a cross-cutting prerequisite — if any other feature modifies `GameStateData` before migration exists, existing saves are permanently broken. These are grouped as foundational infrastructure, not visible features.

**Delivers:** Build-time art generation script (`scripts/generate-art.ts`), `tools/art-pipeline/manifest.json` with prompts and seeds for all 36 rooms, validated pipeline producing consistent pixel art for 3 test rooms (one per environment type), `schemaVersion` on `GameStateData`, `deserialize()` migration function, `MetaGameState` class in its own localStorage key, lazy loading in Preloader (loads current-area rooms only), WebP variants of backgrounds.

**Addresses:** Art pipeline table stakes (consistent pixel art, correct resolution, reproducible pipeline), schema safety for all subsequent features.

**Avoids:** Pitfall 1 (hotspot misalignment — validate spatial composition on 3 test rooms before bulk generation), Pitfall 2 (style drift — validate LoRA and post-processing pipeline before bulk generation), Pitfall 4 (schema breaks — versioning before any other feature), Pitfall 10 (Preloader bloat — lazy loading built alongside art integration).

**Research flag:** Needs deeper research during planning. The LoRA selection, ComfyUI workflow JSON structure, parallax layer strategy (shared backdrop layers per act vs. per-room layers), and palette quantization tooling all need iterative validation on test rooms before committing to the full 36. Budget 1-2 weeks for pipeline development before any final art is generated.

### Phase 2: Death Gallery

**Rationale:** Lowest complexity, highest reward relative to effort. All 43 death IDs already exist in room JSONs with titles and narrator text. The death tracking infrastructure is nearly complete — a surgical 20-line change to `DeathScene.handleRetry()` records which specific death occurred. The gallery UI is one new scene following established patterns. This phase also validates the MetaGameState architecture (from Phase 1) with a concrete consumer before hints and endings depend on it.

**Delivers:** `DeathGallery.ts` singleton, `DeathGalleryScene.ts` (grid of 43 deaths, discovered vs. silhouette), `public/assets/data/death-registry.json` (master list with titles, categories, rarity, cryptic hints for undiscovered), MetaGameState population on death trigger, gallery link in DeathScene and MainMenuScene, completion percentage display, achievement threshold unlocks (First Blood at 1, Serial Victim at 10, Completionist of Doom at 43).

**Addresses:** Persistent death tracking, gallery UI, sardonic narrator gallery descriptions, discovery gamification.

**Avoids:** Pitfall 7 (death gallery data conflicts with save system — MetaGameState pattern keeps it independent of save slots, never reset on new game).

**Research flag:** Standard patterns — well-documented collectible gallery UX. No deeper research needed. Content authoring (gallery-specific quip per death) is the main writing effort.

### Phase 3: Progressive Hint System

**Rationale:** Depends on Phase 1 (extended GameState for `hintAttempts`) and benefits from Phase 2 being complete (the most common stuck point for players is immediately after a death; hint availability during retry improves the loop). This phase is primarily content work (authoring ~100-150 hint chains across 36 rooms) with straightforward engineering. It must precede multiple endings because hints help players reach all the flag states that determine endings.

**Delivers:** `HintManager.ts` singleton, `public/assets/data/hints.json` registry, "hint" verb in VerbTable and CommandDispatcher, `hint-opportunity` EventBus event wired from CommandDispatcher failure path, 3-tier hints for all puzzles across all 36 rooms, sardonic narrator delivery through existing NarratorDisplay.

**Addresses:** Multi-tier hint escalation, per-puzzle hint sets, player-initiated access, context-aware targeting (detects most relevant unsolved puzzle based on room and partial prerequisites), diegetic narrator delivery.

**Avoids:** Pitfall 6 (hints too spoilery or useless — player-initiated only, narrator voice, 3-4 tiers, validated against players who have not seen the puzzle).

**Research flag:** Standard patterns for hint architecture. Content authoring (100-150 hint chains) is the main effort — no engineering research needed, but budget significant writing time.

### Phase 4: Multiple Endings

**Rationale:** Comes after hints because puzzle balance should be stable before defining which flag states determine endings. With hints in place, players can reach all areas, reducing the risk that an ending flag is effectively inaccessible due to obscured puzzles. This phase is primarily narrative design and content work — the flag system and inkjs conditional branching already support it fully.

**Delivers:** 3-4 ending definitions in `public/assets/data/endings.json`, `EndingScene.ts`, flag-based ending determination function (score accumulators, not per-decision booleans), 5-8 ending-critical decision points identified and confirmed in room JSONs, ink ending scripts with narrator commentary personalized via flag conditionals, post-game stats screen (time/deaths/hints/rooms), death completionist secret ending (checks `MetaGameState.discoveredDeaths.length === 43`).

**Addresses:** Distinct endings, endings determined by player choices throughout the game, replayability signal, King's Quest VI short-path/long-path model (optional puzzles unlock better ending).

**Avoids:** Pitfall 5 (state space explosion — score accumulators instead of per-decision booleans, 5-8 critical decision points max, automated playthrough tests verify all endings reachable), Pitfall 13 (hint-ending ambiguity — design endings to diverge late in Act 3, hints focus on shared objectives).

**Research flag:** Narrative design (which existing puzzle flags are ending-relevant, where to add optional paths) needs documented design decisions before implementation. No technical research needed — inkjs conditional branching is well-understood from v1.0.

### Phase 5: Mobile Responsive Layout

**Rationale:** Last because it affects the entire UI layer and is easiest to implement and test when all features are stable. Every surface that Phase 5 must make mobile-friendly — death gallery, hint button, ending scenes, inventory panel — needs to exist first. Mobile layout also benefits from art being finalized (art must look good at 480px wide).

**Delivers:** `MobileControls.ts` verb button bar (Look/Take/Use/Go/Talk), `ResponsiveLayout.ts` layout coordinator, CSS media queries for all breakpoints (480px, 768px), font-size 16px fix on all inputs (prevents iOS auto-zoom), `visualViewport` API integration to prevent canvas collapse on keyboard open, programmatic touch target expansion to 48px minimum on all hotspot zones, death gallery and hint UI mobile-friendly layouts.

**Addresses:** Touch-to-move (already works via Phaser's unified pointer system), responsive canvas scaling, text input on mobile, readable text at mobile sizes, inventory touch access, portrait orientation handling.

**Avoids:** Pitfall 3 (virtual keyboard destroys layout — `visualViewport` intercept plus verb buttons reduce keyboard dependency to complex commands only), Pitfall 8 (touch targets too small — programmatic expansion at runtime, no JSON changes needed), Pitfall 9 (text input wrong UX on mobile — verb grid is primary, text is optional advanced input), Pitfall 14 (CSS overlay misalignment — responsive CSS plus canvas-size-synchronized overlay widths).

**Research flag:** Needs real-device testing throughout — browser emulators do not simulate virtual keyboard viewport changes. The `visualViewport` API keyboard intercept pattern needs verification on iOS Safari and Android Chrome before finalizing the mobile architecture. Budget significant QA time.

### Phase Ordering Rationale

- Schema hardening (Phase 1) is a prerequisite for every feature that modifies `GameStateData`. Doing it first prevents save-breaking bugs from being baked into shipped code.
- Art pipeline (Phase 1) starts immediately for wall-clock reasons — generation is hours and runs as a parallel track throughout all subsequent phases. Art integration (swapping Preloader references) happens incrementally.
- Death gallery (Phase 2) validates the MetaGameState architecture before hints and endings depend on it.
- Hints (Phase 3) before endings (Phase 4) because puzzle flag stability is a prerequisite for confident ending design.
- Mobile (Phase 5) last because all UI surfaces must exist before responsive layout can be applied and tested holistically.

### Research Flags

Phases needing deeper research during planning:
- **Phase 1 (Art Pipeline):** LoRA evaluation, parallax layer decomposition strategy, ComfyUI workflow JSON structure, and palette quantization tooling all need iterative validation on 3 test rooms. Plan for 1-2 weeks of pipeline development before bulk generation.
- **Phase 5 (Mobile):** Real-device testing matrix and `visualViewport` keyboard intercept behavior on iOS Safari and Android Chrome need verification before finalizing the mobile architecture.

Phases with standard patterns (no additional research needed):
- **Phase 2 (Death Gallery):** Collectible gallery pattern is well-documented. Architecture research is complete and highly confident.
- **Phase 3 (Hints):** EventBus integration pattern is proven in the codebase. Hint tier model (UHS) is well-established since 1988. Effort is content authoring, not architecture.
- **Phase 4 (Endings):** Flag accumulation plus inkjs conditional branching is the proven pattern. Design work (which flags matter) is the main decision, not engineering.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | One new npm dependency (sharp). All other tools are external or existing. Sources are official docs (ComfyUI, Phaser, inkjs, HuggingFace model pages). Alternatives thoroughly analyzed and rejected with clear rationale. |
| Features | MEDIUM-HIGH | Well-established patterns (UHS hints, Sierra death collection, KQ6 endings). Feature complexity estimates grounded in direct codebase analysis. Flux generation time benchmarks are MEDIUM confidence (community-sourced for Apple Silicon). |
| Architecture | HIGH for runtime features, MEDIUM for art pipeline | Runtime feature integration is HIGH confidence based on direct codebase analysis (extension points identified by file and line number). Art pipeline architecture (ComfyUI workflow quality, parallax layer strategy) is MEDIUM and requires iterative validation on test rooms. |
| Pitfalls | HIGH for integration pitfalls, MEDIUM for Flux-specific | Integration pitfalls (schema break, keyboard layout, touch targets) are HIGH confidence from Phaser forum, MDN, and codebase analysis. Flux pixel art consistency pitfalls are MEDIUM confidence from community sources. |

**Overall confidence:** MEDIUM-HIGH

### Gaps to Address

- **Parallax layer decomposition strategy:** Generating 4 separate transparent layers per room vs. shared backdrop layers per act vs. full scene compositing is unresolved. Option C (shared backdrop layers per act + unique ground layer per room) is recommended but needs validation with a test batch in Phase 1.
- **Flux generation time on developer hardware:** Benchmarks are community-sourced for M3/M4 Max (85-145 seconds per image). The developer's actual hardware may differ significantly. Run a timing test on 3 rooms immediately in Phase 1 to calibrate the timeline.
- **iOS Safari `visualViewport` behavior:** The `interactive-widget=resizes-visual` viewport meta tag (Chrome 108+, Safari 16+) and `visualViewport` API behavior on iOS Safari need real-device verification before finalizing Phase 5 architecture.
- **LoRA trigger word and strength calibration:** The `GRPZA` trigger word for Flux-2D-Game-Assets-LoRA is confirmed from the HuggingFace model card, but the effective LoRA weight (strength 0.7-1.0 range) and interaction with the game's specific environment prompts needs empirical testing in Phase 1.
- **Death completionist secret ending feasibility:** The secret ending requires `MetaGameState.discoveredDeaths.length === 43`. Whether players will realistically find all 43 deaths and whether this is a satisfying completion mechanic needs design validation — potentially playtest after Phase 2 ships.

## Sources

### Primary (HIGH confidence)
- [ComfyUI REST API Documentation](https://docs.comfy.org/development/comfyui-server/comms_routes) — POST /prompt, GET /history, GET /view endpoints
- [ComfyUI macOS Desktop Installation](https://docs.comfy.org/installation/desktop/macos) — Apple Silicon setup, MPS acceleration
- [ComfyUI-GGUF GitHub (city96)](https://github.com/city96/ComfyUI-GGUF) — GGUF model loader custom node
- [Flux.1 Dev GGUF on HuggingFace (city96)](https://huggingface.co/city96/FLUX.1-dev-gguf) — Model variants, quantization levels, VRAM requirements
- [Flux-2D-Game-Assets-LoRA on HuggingFace (gokaygokay)](https://huggingface.co/gokaygokay/Flux-2D-Game-Assets-LoRA) — Trigger word GRPZA, Apache 2.0, example outputs
- [sharp npm (v0.34.5)](https://www.npmjs.com/package/sharp) — Image processing API, Node 18.17+ compatibility
- [Phaser ScaleManager Documentation](https://docs.phaser.io/api-documentation/class/scale-scalemanager) — FIT mode, resize events, orientation events
- [Phaser Scale Events](https://docs.phaser.io/api-documentation/event/scale-events) — ORIENTATION_CHANGE, RESIZE
- [inkjs GitHub](https://github.com/y-lohse/inkjs) — Conditional branching, variable support
- [ink Writing Documentation](https://github.com/inkle/ink/blob/master/Documentation/WritingWithInk.md) — Conditional diverts, variables, knots
- [Phaser Forum: ScaleManager Ignore Virtual Keyboard](https://phaser.discourse.group/t/scalemanager-ignore-virtual-keyboard/1361) — Canvas resize on mobile keyboard open (community-verified)
- [Phaser Forum: Force Mobile Keyboard](https://phaser.discourse.group/t/how-to-force-mobile-keyboard-to-appear/11477) — HTML input overlay approach
- [MDN: Mobile Touch Controls](https://developer.mozilla.org/en-US/docs/Games/Techniques/Control_mechanisms/Mobile_touch) — Touch input patterns
- [Universal Hint System Wikipedia](https://en.wikipedia.org/wiki/Universal_Hint_System) — UHS tiered hint structure
- [Thimbleweed Park Hint System Forum](https://forums.thimbleweedpark.com/t/hint-system-tech/3139) — In-world hint delivery (Ron Gilbert's team)
- [King's Quest VI Endings (Fandom)](https://kingsquest.fandom.com/wiki/Possible_Endings_for_King's_Quest_VI) — Short-path/long-path model
- [The 14 Deadly Sins of Graphic-Adventure Design](https://www.filfre.net/2015/07/the-14-deadly-sins-of-graphic-adventure-design/) — Ron Gilbert anti-patterns
- [Standard Patterns in Choice-Based Games](https://heterogenoustasks.wordpress.com/2015/01/26/standard-patterns-in-choice-based-games/) — Branch and bottleneck narrative structure
- [MDN: Storage Quotas and Eviction Criteria](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria) — localStorage limits for MetaGameState sizing

### Secondary (MEDIUM confidence)
- [Flux Apple Silicon Performance Guide 2025](https://apatero.com/blog/flux-apple-silicon-m1-m2-m3-m4-complete-performance-guide-2025) — M-series generation benchmarks (85-145 seconds per image)
- [Running Flux on 6-8GB VRAM with ComfyUI](https://civitai.com/articles/6846/running-flux-on-68-gb-vram-using-comfyui) — GGUF quantization levels mapped to VRAM
- [Flux Dev vs Schnell Comparison](https://pxz.ai/blog/flux-dev-vs-schnell) — Quality vs. speed tradeoffs; Dev recommended for final assets
- [Pixel Art ComfyUI Workflow Guide](https://inzaniak.github.io/blog/articles/the-pixel-art-comfyui-workflow-guide.html) — Resolution, LoRA, sampler settings
- [Retro Diffusion: Authentic Pixel Art with AI at Scale](https://runware.ai/blog/retro-diffusion-creating-authentic-pixel-art-with-ai-at-scale) — Consistency challenges, post-processing pipeline recommendations
- [How and Why to Write Low Spoiler Hints](https://www.gamedeveloper.com/design/how-and-why-to-write-low-spoiler-hints-for-adventure-games-) — Progressive hint authoring best practices
- [Multiple Endings in Games — GameDeveloper](https://www.gamedeveloper.com/design/multiple-endings-in-games) — Ending design patterns and pitfalls
- [How to Execute Multiple Game Endings Well](https://indiecator.org/2021/05/08/multiple-game-endings/) — Quality over quantity analysis
- [Designing Memorable Achievements — RetroAchievements](https://docs.retroachievements.org/developer-docs/achievement-design.html) — Achievement design principles
- [FLUX.1 Kontext (arXiv)](https://arxiv.org/html/2506.15742v2) — Multi-reference consistency approach for style coherence

---
*Research completed: 2026-02-21*
*Ready for roadmap: yes*
