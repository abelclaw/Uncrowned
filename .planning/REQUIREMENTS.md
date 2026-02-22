# Requirements: Uncrowned v2.1 Art & Effects

**Defined:** 2026-02-21
**Core Value:** The text parser must feel magical -- players type natural language commands and the game understands them.

## v2.1 Requirements

Requirements for the Art & Effects milestone. Each maps to roadmap phases.

### Art Pipeline

- [ ] **ARTX-01**: Art generation workflow produces 16:9 images (1024x576) without composition-destroying crop
- [ ] **ARTX-02**: LoRA strength is calibrated per asset type (backgrounds vs sprites) with test generation on 3 rooms per act
- [ ] **ARTX-03**: Batch generation pipeline has retry logic, progress tracking, and resume capability for 91 assets
- [ ] **ARTX-04**: Sprite background removal produces clean alpha transparency for all item, NPC, and player sprites
- [ ] **ARTX-05**: All 36 room backgrounds are Flux-generated pixel art at 960x540 with consistent style per act
- [ ] **ARTX-06**: All 6 shared parallax layers (2 per act) are generated with matching act palettes at 1920x540
- [ ] **ARTX-07**: All 37 item sprites are generated with transparent backgrounds at 32x32
- [ ] **ARTX-08**: All 11 NPC sprites are generated with transparent backgrounds at 48x64
- [ ] **ARTX-09**: Player character spritesheet (idle, walk, interact frames) is generated or hand-assembled at 768x64
- [ ] **ARTX-10**: Style consistency validated across all 36 rooms — no jarring style breaks between adjacent rooms

### Scene Transitions

- [ ] **TRNS-01**: Room transitions use themed effects (fade, wipe, pixelate, iris) instead of hard cuts
- [ ] **TRNS-02**: Act changes use cinematic transitions (longer duration, distinct effect) to mark narrative progression
- [ ] **TRNS-03**: Transition type is configurable per exit in room JSON data

### Lighting & Atmosphere

- [ ] **LITE-01**: Each room has configurable ambient lighting (tint, brightness, vignette intensity)
- [ ] **LITE-02**: Cave and dungeon rooms have darkness/torch-flicker lighting effects
- [ ] **LITE-03**: PostFX effects (bloom, glow, desaturation) can be applied per room for mood
- [ ] **LITE-04**: Lighting configuration is data-driven via room JSON effects field

### Weather & Particles

- [ ] **WTHR-01**: Particle-based weather effects (rain, snow, fog, dust) can be assigned per room
- [ ] **WTHR-02**: Ambient particle effects (fireflies, dust motes, falling leaves, embers) enhance room atmosphere
- [ ] **WTHR-03**: Interactive particle effects trigger on hotspot interaction (sparkle, glow burst)
- [ ] **WTHR-04**: Weather and particle configs are data-driven via room JSON effects field

### Performance & Mobile

- [ ] **PERF-01**: Visual effects degrade gracefully on Canvas fallback (no WebGL) — game remains playable
- [ ] **PERF-02**: Mobile devices use reduced particle counts and simplified effects to maintain 30+ FPS
- [ ] **PERF-03**: Effects system has global quality toggle (high/low/off) accessible from settings

## Future Requirements

Deferred beyond v2.1. Tracked but not in current roadmap.

### Enhanced Art
- **EART-01**: Custom-trained LoRA on curated pixel art dataset for tighter style consistency
- **EART-02**: NPC portrait art for dialogue scenes
- **EART-03**: Death scene unique illustrations per death type

### Accessibility
- **ACCS-01**: Screen reader support for narrator text and commands
- **ACCS-02**: High contrast mode for UI elements
- **ACCS-03**: Configurable text size for narrator display

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Real-time AI art generation at runtime | Art is build-time only; no GPU dependency at play time |
| CRT/scanline shader effects | Fights the pixel art aesthetic; pixelArt:true is correct |
| Dynamic day/night cycle | Too complex for current scope; per-room lighting is sufficient |
| Procedural art generation | Flux pipeline with fixed seeds provides reproducible results |
| Cloud GPU integration | User has local GPU; cloud adds unnecessary complexity |
| Art style transfer / img2img | Direct txt2img with LoRA is simpler and more controllable |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| ARTX-01 | Phase 14 | Pending |
| ARTX-02 | Phase 14 | Pending |
| ARTX-03 | Phase 15 | Pending |
| ARTX-04 | Phase 14 | Pending |
| ARTX-05 | Phase 15 | Pending |
| ARTX-06 | Phase 15 | Pending |
| ARTX-07 | Phase 15 | Pending |
| ARTX-08 | Phase 15 | Pending |
| ARTX-09 | Phase 15 | Pending |
| ARTX-10 | Phase 18 | Pending |
| TRNS-01 | Phase 17 | Pending |
| TRNS-02 | Phase 17 | Pending |
| TRNS-03 | Phase 17 | Pending |
| LITE-01 | Phase 17 | Pending |
| LITE-02 | Phase 17 | Pending |
| LITE-03 | Phase 17 | Pending |
| LITE-04 | Phase 17 | Pending |
| WTHR-01 | Phase 16 | Pending |
| WTHR-02 | Phase 16 | Pending |
| WTHR-03 | Phase 16 | Pending |
| WTHR-04 | Phase 16 | Pending |
| PERF-01 | Phase 18 | Pending |
| PERF-02 | Phase 18 | Pending |
| PERF-03 | Phase 18 | Pending |

**Coverage:**
- v2.1 requirements: 24 total
- Mapped to phases: 24
- Unmapped: 0

---
*Requirements defined: 2026-02-21*
*Last updated: 2026-02-21 after roadmap creation*
