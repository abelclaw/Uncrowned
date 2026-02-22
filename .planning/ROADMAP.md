# Roadmap: Uncrowned

## Milestones

- **v1.0 MVP** (Phases 1-8, 22 plans) -- SHIPPED 2026-02-21 -- [Archive](milestones/v1.0-ROADMAP.md)
- **v2.0 Art & Polish** (Phases 9-13, 12 plans) -- SHIPPED 2026-02-21 -- [Archive](milestones/v2.0-ROADMAP.md)
- **v2.1 Art & Effects** (Phases 14-18) -- IN PROGRESS

## Phases

<details>
<summary>v1.0 MVP (Phases 1-8) -- SHIPPED 2026-02-21</summary>

- [x] Phase 1: Foundation (2/2 plans)
- [x] Phase 2: Room & Navigation (3/3 plans)
- [x] Phase 3: Parser & Commands (3/3 plans)
- [x] Phase 4: Inventory & Puzzles (3/3 plans)
- [x] Phase 5: NPC & Dialogue (3/3 plans)
- [x] Phase 6: Death & Save (2/2 plans)
- [x] Phase 7: Audio & Polish (3/3 plans)
- [x] Phase 8: Content & Integration (3/3 plans)

</details>

<details>
<summary>v2.0 Art & Polish (Phases 9-13) -- SHIPPED 2026-02-21</summary>

- [x] Phase 9: Art Pipeline & Schema Foundation (3/3 plans)
- [x] Phase 10: Death Gallery (2/2 plans)
- [x] Phase 11: Progressive Hints (2/2 plans)
- [x] Phase 12: Multiple Endings (3/3 plans)
- [x] Phase 13: Mobile Responsive (2/2 plans)

</details>

### v2.1 Art & Effects (In Progress)

**Milestone Goal:** Generate all pixel art assets via local ComfyUI + Flux, replace 91 placeholders, and add visual effects (transitions, lighting, weather, particles) that bring the world to life.

- [ ] **Phase 14: Art Pipeline Tuning** - Fix generation resolution, calibrate LoRA per asset type, add sprite background removal
- [ ] **Phase 15: Batch Art Generation** - Generate all 91 assets with tuned pipeline and validate quality
- [ ] **Phase 16: VFX Foundation & Weather** - Build EffectsManager, weather particles, and ambient atmosphere effects
- [ ] **Phase 17: Lighting & Transitions** - Add per-room lighting, PostFX mood effects, and cinematic scene transitions
- [ ] **Phase 18: Effects Rollout & Polish** - Configure effects for all 36 rooms, performance tuning, quality toggle

## Phase Details

### Phase 14: Art Pipeline Tuning
**Goal**: The Flux art pipeline produces correctly composed, correctly sized assets for every asset type (backgrounds, sprites, parallax)
**Depends on**: Phase 13 (v2.0 complete -- existing art pipeline infrastructure)
**Requirements**: ARTX-01, ARTX-02, ARTX-04
**Success Criteria** (what must be TRUE):
  1. Running the pipeline on a test room produces a 16:9 background image where the subject fills the frame without destructive cropping
  2. LoRA strength settings are documented per asset type and test generations for 3 rooms per act show consistent pixel art style
  3. Generated sprite images have clean transparent backgrounds with no white halos or color fringe artifacts
  4. Test generations at the tuned settings produce visually acceptable results across forest, cave, and twilight environments
**Plans:** 2 plans
Plans:
- [ ] 14-01-PLAN.md -- Per-asset-type config system, 16:9 resolution fix, and sprite background removal
- [ ] 14-02-PLAN.md -- LoRA strength test matrix CLI and empirical calibration

### Phase 15: Batch Art Generation
**Goal**: All 91 placeholder assets are replaced with Flux-generated pixel art that looks consistent across the entire game
**Depends on**: Phase 14 (tuned pipeline parameters)
**Requirements**: ARTX-03, ARTX-05, ARTX-06, ARTX-07, ARTX-08, ARTX-09
**Success Criteria** (what must be TRUE):
  1. The batch pipeline can generate all 91 assets with automatic retry on failure and resume from where it left off after interruption
  2. All 36 room backgrounds display at 960x540 with pixel art style and act-appropriate color palettes
  3. All 37 item sprites render at 32x32 with transparent backgrounds and are visually recognizable at game scale
  4. All 11 NPC sprites and the player spritesheet display correctly in-game with proper transparency and proportions
  5. All 6 shared parallax layers match their act's color palette and create convincing depth when scrolling
**Plans**: TBD

### Phase 16: VFX Foundation & Weather
**Goal**: Rooms can display weather and ambient particle effects that enhance atmosphere without prescribing specific room configurations
**Depends on**: Phase 14 (effects are more meaningful with real art, but technically independent -- can start after pipeline is tuned)
**Requirements**: WTHR-01, WTHR-02, WTHR-03, WTHR-04
**Success Criteria** (what must be TRUE):
  1. A room configured with rain, snow, fog, or dust weather shows the corresponding particle effect layered over the scene
  2. Ambient particles (fireflies, dust motes, falling leaves, embers) animate continuously in rooms where they are configured
  3. Interacting with a hotspot triggers a visible particle burst (sparkle, glow) as feedback
  4. Weather and particle effects are configured entirely through the room JSON effects field with no code changes per room
**Plans**: TBD

### Phase 17: Lighting & Transitions
**Goal**: Every room can have distinct ambient lighting and mood effects, and moving between rooms feels cinematic instead of jarring
**Depends on**: Phase 16 (EffectsManager architecture established)
**Requirements**: LITE-01, LITE-02, LITE-03, LITE-04, TRNS-01, TRNS-02, TRNS-03
**Success Criteria** (what must be TRUE):
  1. Rooms display configurable ambient lighting (tint color, brightness level, vignette darkening) that sets a distinct mood per scene
  2. Cave and dungeon rooms have visible darkness with flickering torch-light effects that create atmosphere
  3. PostFX effects (bloom, glow, desaturation) visibly alter room mood when configured
  4. Walking through a room exit triggers a themed transition effect (fade, wipe, pixelate, iris) instead of a hard cut
  5. Crossing an act boundary plays a longer, more dramatic transition that signals narrative progression
**Plans**: TBD

### Phase 18: Effects Rollout & Polish
**Goal**: All 36 rooms have appropriate effects configured, visual quality degrades gracefully on weaker devices, and players can control effects quality
**Depends on**: Phase 15 (real art assets), Phase 16 (weather system), Phase 17 (lighting and transitions)
**Requirements**: PERF-01, PERF-02, PERF-03, ARTX-10
**Success Criteria** (what must be TRUE):
  1. All 36 rooms have effects configurations (lighting, weather, transitions) that match their narrative context -- no room feels bare
  2. On a Canvas-only fallback browser (no WebGL), the game remains fully playable with effects gracefully disabled
  3. On mobile devices, particle counts are reduced and effects simplified so gameplay maintains 30+ FPS
  4. The settings menu has a quality toggle (high/low/off) that visibly changes effects intensity
  5. Walking through all 36 rooms in sequence shows no jarring art style breaks between adjacent rooms
**Plans**: TBD

## Progress

**Execution Order:** 14 -> 15 -> 16 -> 17 -> 18
(Phase 16 can begin after Phase 14 if Phase 15 batch generation is running on hardware separately)

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 14. Art Pipeline Tuning | v2.1 | 0/2 | Planning complete | - |
| 15. Batch Art Generation | v2.1 | 0/TBD | Not started | - |
| 16. VFX Foundation & Weather | v2.1 | 0/TBD | Not started | - |
| 17. Lighting & Transitions | v2.1 | 0/TBD | Not started | - |
| 18. Effects Rollout & Polish | v2.1 | 0/TBD | Not started | - |

---
*Roadmap created: 2026-02-21*
*Last updated: 2026-02-21*
