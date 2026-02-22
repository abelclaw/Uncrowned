# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-21)

**Core value:** The text parser must feel magical -- players type natural language commands and the game understands them.
**Current focus:** v2.1 Art & Effects -- Milestone complete

## Current Position

Milestone: v2.1 Art & Effects
Phase: 18 of 18 (Effects Rollout & Polish) -- Complete (3/3 plans done)
Current Plan: 3 of 3 (complete)
**Status:** Milestone complete
Last activity: 2026-02-22 -- Completed 18-03 (Act 2 & Act 3 Effects Rollout)

**Progress:** [██████████] 100%

## Performance Metrics

**v1.0 Totals (archived):**
- Phases: 8, Plans: 22, Commits: 95, Files: 207, LOC: 35,394

**v2.0 Totals (archived):**
- Phases: 5 (Phases 9-13), Plans: 12, Commits: 58
- Files: 209 changed, 23,793 insertions, 3,946 deletions
- Requirements: 27/32 complete (5 art requirements pending ComfyUI hardware)

**v2.1:**
- Total plans completed: 8
- Phases: 5 (Phases 14-18), Requirements: 24

| Phase | Plan | Duration | Tasks | Files |
|-------|------|----------|-------|-------|
| 14 | 01 | 3min | 2 | 2 |
| 14 | 02 | 2min | 1 (1 deferred) | 1 |
| 16 | 01 | 7min | 2 | 2 |
| 16 | 02 | 3min | 2 | 6 |
| 17 | 01 | 3min | 2 | 4 |
| 17 | 02 | 3min | 2 | 5 |
| 18 | 02 | 2min | 2 | 13 |
| 18 | 03 | 2min | 2 | 18 |

## Accumulated Context

### Decisions

All v1.0 decisions archived in .planning/milestones/v1.0-ROADMAP.md
All v2.0 decisions archived in .planning/milestones/v2.0-ROADMAP.md

- [14-01] Runtime workflow injection: inject per-type config into deep-cloned workflow at runtime, keep comfyui-workflow.json stable
- [14-01] Sharp threshold for bg removal: raw pixel threshold + defringe over AI matting library
- [14-01] 512x512 for items: reduces compute, improves subject centering for 32x32 final assets
- [14-02] Fixed seed per room for deterministic LoRA comparison across strengths
- [14-02] 3 rooms per act (9 total) covers all environment types (forest, cave, twilight)
- [16-01] Procedural 2x2 white pixel texture for all particles (no asset dependency)
- [16-01] Weather depth 80, ambient depth 75 (above player at 50, below UI at 100)
- [16-01] EffectsManager lifecycle: init/onRoomEnter/cleanup matching AudioManager pattern
- [16-02] Sparkle burst depth 85: above weather/ambient, visible over room objects
- [16-02] No sparkle on look commands (passive observation, no visual feedback)
- [16-02] Item pickup burst fires at sprite world position before destroy
- [17-01] grayscale() for desaturate PostFX: Phaser 3.90 ColorMatrix lacks desaturate(), grayscale() achieves same effect
- [17-01] Boolean postFX tracking instead of Controller[] array (FX.ColorMatrix not assignable to FX.Controller)
- [17-01] Lighting overlay depth 70: below ambient (75) and weather (80) so particles float above tint
- [17-02] Vignette PostFX for iris effect: simpler than Graphics mask, tween strength 0->1 for iris-close
- [17-02] Act-boundary override always uses iris+1500ms regardless of exit JSON transition
- [17-02] Entry animation durations: 500ms for wipe/pixelate, 700ms for iris-open
- [18-02] Effects field placement: after audio, before puzzleHints/playerSpawn in room JSONs
- [18-02] Cave brightness gradient: cave_entrance 0.4 -> cave_depths 0.25 (natural depth darkening)
- [18-02] Castle interior gradient: courtyard 0.85 -> hallway 0.75 -> servants_quarters 0.65
- [18-02] Petrified forest: desaturate PostFX for cursed grey-stone atmosphere (intentional mood break)
- [18-02] Wizard tower: glow PostFX + purple #8866bb tint for arcane magical atmosphere
- [18-03] Atmospheric arc: Act 1 (bright, warm) -> Act 2 (dark, underground) -> Act 3 (dark, cold, cursed)
- [18-03] Bioluminescent areas use fireflies + glow/bloom PostFX (cavern_west_wing, crystal_chamber)
- [18-03] Cursed areas use desaturate PostFX (castle_courtyard_act3)
- [18-03] Throne room has heaviest effects as climax room (dust weather + embers + bloom)

### Gameplay Bugs Fixed (walkthrough session)

9 bugs found and fixed during full game walkthrough (commit fd21a29):
1. "combine X Y" without connector word not recognized — added VerbTable pattern
2. Inventory panel overlay blocks text input — added position:relative + auto-close on focus
3. "talk NPC" without "to" not recognized — added VerbTable pattern
4. NPCs invisible to text parser (not in noun resolution) — merged NPCs into hotspot list
5. Hyphen/underscore mismatch in NPC IDs — added normalization in NounResolver
6. `go west` from cavern_entrance_hall went to wrong room — exit conditions not checked in text commands
7. Room-bound combine recipes unreachable from other rooms — added global combines extraction
8. Echo chamber exit direction wrong (south→north) — fixed in room JSON
9. Arrow key movement added for direct player control

### Pending Todos

- LoRA strength calibration (14-02 Task 2) — run `npx tsx scripts/generate-art.ts --test-lora` when ComfyUI available

### Blockers/Concerns

- Flux art generation requires ComfyUI + GPU hardware (user has local GPU)
- Art style target: between classic 16-bit and modern pixel art
- RESOLVED: Backgrounds now generate at 1024x576 natively (14-01)
- RESOLVED: Sprite background removal implemented with threshold + defringe (14-01)
- LoRA strength values (bg=0.7, sprite=0.85, item=0.9, npc=0.85) are starting estimates needing empirical testing
- Player spritesheet may need hand-assembly — Flux cannot generate coherent multi-frame sheets

## Session Continuity

Last session: 2026-02-22
Stopped at: Completed 18-03-PLAN.md (Act 2 & Act 3 Effects Rollout) -- Phase 18 complete, Milestone v2.1 complete
Resume file: None
