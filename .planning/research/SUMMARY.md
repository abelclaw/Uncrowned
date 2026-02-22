# Research Summary: Flux Art Generation & Visual Effects

**Domain:** AI art pipeline at scale + runtime visual effects for pixel art adventure game
**Researched:** 2026-02-21
**Overall confidence:** MEDIUM-HIGH

## Executive Summary

This milestone adds two independent capability domains to Uncrowned: (1) running the existing Flux art generation pipeline at scale to replace all 91 placeholder assets with real pixel art, and (2) adding runtime visual effects (scene transitions, lighting, weather particles, ambient animations) using Phaser 3.90's built-in systems. These domains share no code and no runtime dependencies -- the art pipeline produces static PNGs at build time, while visual effects are new runtime modules.

The art pipeline infrastructure already exists (`generate-art.ts`, `comfyui-workflow.json`, `art-manifest.json`, `style-guide.json`). The work here is tuning it for production quality: LoRA strength per asset type, prompt engineering for composition control, non-square generation resolution to avoid aspect ratio cropping, batch orchestration with retry/resume logic, and quality validation. The highest-risk area is style consistency across 36 rooms spanning three radically different environments (forest, caves, cursed twilight world).

For visual effects, Phaser 3.90 provides everything needed natively: `ParticleEmitter` for weather/atmosphere, `LightsPlugin` / PostFX for lighting and mood, camera effects for transitions, and the `preFX`/`postFX` pipeline for per-object and per-camera shader effects (vignette, bloom, glow, wipe, pixelate). No new npm dependencies are needed. The architecture follows the project's existing data-driven pattern: effects are configured per-room in the room JSON files and orchestrated by a new `EffectsManager` system that mirrors the `AudioManager` lifecycle.

**Zero new npm dependencies.** All improvements use existing tools (sharp, ComfyUI, Phaser built-ins) or are pure TypeScript code.

## Key Findings

**Stack:** No new npm dependencies. Art generation tuning improves existing pipeline parameters (LoRA strength, prompt templates, workflow nodes). Visual effects use Phaser 3.90 built-ins (ParticleEmitter, LightsPlugin, PostFX, Camera effects).

**Architecture:** Data-driven room effects via JSON extension of existing `RoomData` type. New `EffectsManager` singleton follows the `AudioManager` pattern (init/cleanup per scene). Art pipeline enhanced with batch orchestration, per-asset-type LoRA strength, and quality validation.

**Critical pitfall #1:** The 1024x1024 square generation resolution cropped to 960x540 (16:9) destroys 44% of vertical composition. Must generate at 1024x576 or prompt-engineer for horizontal compositions before any batch generation.

**Critical pitfall #2:** The sprite pipeline (`processSprite()`) adds an alpha channel but does NOT remove the white/colored background Flux generates. All 48 sprite assets (37 items + 11 NPCs + 1 player) will be unusable until background removal is added (ComfyUI RemBG node or sharp-based color keying).

## Implications for Roadmap

Based on research, suggested phase structure:

1. **Art Pipeline Tuning & Test Generation** - Resolve generation resolution, test LoRA strengths on 3 rooms per act, establish per-asset-type generation parameters
   - Addresses: Generation resolution fix, LoRA strength calibration, prompt template improvements
   - Avoids: Pitfall #1 (crop composition), Pitfall #2 (LoRA mismatch for backgrounds), Pitfall #6 (style inconsistency)

2. **Batch Art Generation** - Generate all 91 assets with tuned pipeline, validate quality, integrate into game
   - Addresses: Room backgrounds (36), shared parallax layers (6), item sprites (37), NPC sprites (11), player sprite (1)
   - Avoids: Pitfall #4 (batch failure), Pitfall #7 (illegible items), Pitfall #10 (seed fragility)

3. **Visual Effects Foundation** - Build EffectsManager, WeatherSystem, particle presets, wire into RoomScene
   - Addresses: Weather particles, dust motes, fireflies, atmospheric effects
   - Avoids: Pitfall #5 (mobile FPS) by establishing performance budget from the start

4. **Lighting & Enhanced Transitions** - Add Light2D/PostFX lighting, vignette, bloom, wipe/pixelate transitions
   - Addresses: Per-room ambient lighting, torch flicker, act transition cinematics, camera effects
   - Avoids: Pitfall #14 (parallax interaction with camera effects)

5. **Effects Rollout & Polish** - Add effects configs to all 36 rooms, mobile performance testing, tuning
   - Addresses: Room-by-room effects configuration, mobile particle budgets, visual consistency
   - Avoids: Pitfall #11 (transition state bugs) via thorough cleanup testing

**Phase ordering rationale:**
- Art pipeline tuning MUST come before batch generation (can't generate 91 assets with wrong settings)
- Batch generation before VFX because real backgrounds make lighting and particles meaningful
- VFX foundation before lighting because particles are simpler and validate the EffectsManager architecture
- Lighting before rollout because the system must be built before it can be configured per-room
- Effects rollout last as it's content work (room JSON editing) that depends on all systems being built

**Research flags for phases:**
- Phase 1: Needs deeper research -- LoRA strength per asset type requires empirical testing; generation at 1024x576 needs quality verification; negative prompt effectiveness on Flux is uncertain
- Phase 2: Needs human review gates -- style consistency across acts can only be validated visually
- Phase 3-4: Standard Phaser patterns, low research risk
- Phase 5: Mobile performance testing needed on real devices

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Zero new dependencies. All capabilities verified in Phaser 3.90 source code and existing codebase. |
| Features | MEDIUM-HIGH | Feature list well-defined. Art generation quality outcomes are inherently uncertain (Flux/LoRA behavior). |
| Architecture | HIGH | EffectsManager follows proven AudioManager pattern. Data-driven effects follow established room JSON pattern. |
| Pitfalls | HIGH for integration, MEDIUM for Flux-specific | Integration pitfalls from direct code analysis. Flux pitfalls from training data (no web search available). |

## Gaps to Address

- **LoRA strength per asset type:** Recommended values (0.65 backgrounds, 0.85 sprites) are starting points that need empirical testing in Phase 1
- **Non-square generation quality:** Flux Dev at 1024x576 needs quality verification before committing to batch generation
- **Negative prompt effectiveness on Flux:** Mixed community reports; may have minimal effect compared to SD1.5/SDXL
- **Mobile particle performance budget:** Specific FPS impact of Phaser ParticleEmitter on mid-range phones needs real-device profiling
- **WebGL fallback behavior:** PostFX and Light2D require WebGL; Canvas fallback behavior needs testing to ensure graceful degradation
- **Player spritesheet generation:** Flux cannot generate coherent multi-frame spritesheets; individual pose generation + programmatic assembly needs testing; hand-drawing may be the pragmatic fallback

## Sources

All source verification was conducted against the local codebase and Phaser 3.90 source code in `node_modules/`. WebSearch and WebFetch were unavailable for this research session, so external sources are drawn from training data and prior research (`.planning/phases/09-art-pipeline-schema-foundation/09-RESEARCH.md`). Confidence levels are adjusted accordingly.

---
*Research completed: 2026-02-21*
*Ready for roadmap: yes*
