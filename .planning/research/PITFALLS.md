# Domain Pitfalls: Flux Art Generation at Scale & Phaser 3 Visual Effects

**Domain:** Replacing 91 placeholder assets with Flux-generated pixel art via ComfyUI, adding visual effects to existing Phaser 3 adventure game
**Researched:** 2026-02-21
**Overall confidence:** MEDIUM (training data only -- WebSearch and WebFetch unavailable; Flux ecosystem moves fast)

**Scope:** This document covers pitfalls specific to the ART GENERATION and VISUAL EFFECTS milestone. It builds on the existing art pipeline infrastructure (Phase 9: `generate-art.ts`, `art-manifest.json`, `comfyui-workflow.json`, `style-guide.json`, lazy loading in `RoomScene.ts`). The pipeline scaffold exists; the pitfalls here are about running it at scale and adding runtime visual effects.

**Asset inventory:**
- 36 room backgrounds (960x540, some 1920x540 wide)
- 6 shared parallax layers (1920x540)
- 37 item sprites (32x32)
- 11 NPC sprites (48x64)
- 1 player spritesheet (768x64, 16 frames at 48x64 each)
- **Total: 91 assets** to replace placeholders

---

## Critical Pitfalls

Mistakes that cause full batch re-generation, break the existing game, or produce an unshippable visual result.

### Pitfall 1: 1024x1024 Generation Squashed to 960x540 Destroys Composition

**What goes wrong:**
The ComfyUI workflow generates at 1024x1024 (square). The post-processing pipeline uses `sharp.resize(960, 540, { fit: 'cover' })` to crop to the target aspect ratio. This crops 44% of the vertical content. A cave scene generated with important ceiling details loses the top half. A village scene with a prominent sky loses most of the sky. The composition that Flux "designed" for 1:1 aspect ratio is fundamentally incompatible with the 16:9 target.

**Why it happens:**
The existing workflow in `comfyui-workflow.json` has `EmptySD3LatentImage` set to `width: 1024, height: 1024`. Flux Dev was primarily trained on square and mildly rectangular resolutions. The style guide specifies `generationResolution: { width: 1024, height: 1024 }` but `outputResolution: { width: 960, height: 540 }` -- a dramatic 1.78:1 crop from a 1:1 generation. The `fit: 'cover'` option in sharp centers the crop, which may cut off critical elements placed near edges.

Specific code at risk in `generate-art.ts` line 203:
```typescript
await sharp(input)
    .resize(width, height, { fit: 'cover' })
    .png({ compressionLevel: 9 })
    .toFile(fullPath);
```

**Consequences:**
- Every background has its composition destroyed by the crop
- Ceiling details, sky elements, and ground details are arbitrarily removed
- Hotspot-relevant visual elements (doorways at edges, items on high shelves) get cropped out
- Entire batch of 36 backgrounds must be regenerated if the aspect ratio problem is discovered late
- For wide rooms (1920x540), the problem is even worse -- a 1024x1024 source cropped to 3.55:1 loses 71% of vertical content

**Prevention:**
- Change `EmptySD3LatentImage` to generate at the target aspect ratio directly. Flux Dev handles non-square resolutions, though quality may vary. Use 1024x576 (closest to 960x540 at 16:9 that Flux handles well) or 1152x640 for higher detail. Update `comfyui-workflow.json` node "11" accordingly
- For wide rooms (1920x540), generate at 1024x288 (very narrow, may cause quality issues) OR generate two 1024x576 halves with overlapping prompts and stitch with sharp. The stitching approach needs careful seam handling
- Alternatively, generate at 1024x1024 but use prompts that explicitly place all important content in the horizontal center band (the 56% that survives the crop). Add prompt suffix: "wide panoramic composition, horizon at center, important details in middle band"
- Test the crop on 3 rooms BEFORE committing to the full batch. Visually verify that the cropped output matches the room's spatial requirements (hotspot positions, exit locations, walkable area)
- Consider generating at a higher resolution (1536x864 or 2048x1152) and downscaling rather than cropping. Flux Dev supports arbitrary resolutions via `ModelSamplingFlux` but quality degrades at non-standard sizes

**Detection:**
- Compare the 1024x1024 raw output with the cropped 960x540 -- are critical scene elements missing?
- Overlay the room JSON's hotspot and exit zones on the cropped image -- do they still align with visual elements?
- Check wide rooms especially -- the horizontal crop from 1024px to 1920px requires UPSCALING, not cropping, which is a completely different problem

**Phase to address:** First art generation plan. Resolve the generation resolution BEFORE generating any assets. This is a workflow change, not a code change.

---

### Pitfall 2: LoRA Trigger Word Inconsistency Across Asset Categories

**What goes wrong:**
The `Flux-2D-Game-Assets-LoRA` was trained for "2D game assets" on white backgrounds. The style guide uses the trigger word `GRPZA` with different prompt templates for backgrounds, sprites, and items. Backgrounds get photorealistic landscape compositions instead of pixel art because the LoRA was trained primarily on isolated game assets (characters, items, UI elements) -- not on full scene backgrounds. Meanwhile, item sprites get pixel art style correctly because they match the LoRA's training data.

**Why it happens:**
The LoRA's HuggingFace page shows examples of isolated game assets (characters, items, icons) on white/transparent backgrounds. The trigger word `GRPZA` steers the model toward this style. But backgrounds are fundamentally different -- they are full-scene compositions, not isolated assets. The LoRA's influence on backgrounds is weaker and less predictable than on sprites. The style guide applies the same `loraStrength: 0.8` across all asset types, but backgrounds may need different strength or a different LoRA entirely.

Current prompt templates in `style-guide.json`:
```json
"promptPrefix": "GRPZA, pixel art game background, 2D side-scrolling adventure game,",
"spritePromptPrefix": "GRPZA, pixel art game sprite, 2D character,",
"itemPromptPrefix": "GRPZA, pixel art game item icon, 2D,"
```

**Consequences:**
- Backgrounds look like "painted landscapes that someone applied a pixel filter to" rather than authentic pixel art
- Items and NPCs look correct (isolated assets on white backgrounds match LoRA training data)
- The mismatch between background style and sprite style creates visual dissonance
- Players see crisp pixel art characters walking on blurry, non-pixel-art backgrounds
- The inconsistency undermines the entire "pixel art retro game" aesthetic

**Prevention:**
- Test the LoRA on 3 backgrounds BEFORE committing to the batch. Compare: (a) LoRA at 0.8, (b) LoRA at 1.0, (c) LoRA at 0.5, (d) no LoRA with strong pixel art prompting
- Consider using a DIFFERENT LoRA for backgrounds vs. sprites. The current LoRA is good for isolated assets. A pixel art landscape/scenery LoRA may produce better backgrounds. Search CivitAI for "pixel art background" or "pixel art scenery" LoRAs trained on Flux
- If the game-assets LoRA produces bad backgrounds, train a custom LoRA on 15-20 reference images of pixel art adventure game backgrounds (King's Quest, Quest for Glory, Monkey Island pixel art era). This is 1-2 hours of fine-tuning with Kohya_ss on a local GPU
- Alternatively, generate backgrounds WITHOUT the LoRA (pure Flux Dev with strong pixel art prompting) and apply pixel art post-processing: downscale to 480x270 (half-resolution) with nearest-neighbor interpolation, then upscale back to 960x540 with nearest-neighbor. This forces a pixel grid
- Add a post-processing step in `generate-art.ts` that applies palette quantization (reduce to 32-64 colors) after generation, ensuring consistent color counts across all assets
- Adjust LoRA strength per asset category in `art-manifest.json`: backgrounds at 0.4-0.6, sprites at 0.8-1.0, items at 0.8-1.0

**Detection:**
- View a generated background at 400% zoom -- does it have a visible pixel grid?
- Place a generated NPC sprite on a generated background -- do they look like they belong in the same game?
- Compare color histogram of background vs. sprite -- are they using the same palette range?
- Run all 36 backgrounds through a color count analysis -- wide variation in unique color count indicates inconsistency

**Phase to address:** First art generation plan. The LoRA validation on backgrounds must happen before any batch generation. Budget 2-4 hours for LoRA testing with different strengths and prompt variations on 3 test rooms.

---

### Pitfall 3: Flux Cannot Generate Coherent Sprite Sheets

**What goes wrong:**
The player spritesheet requires 16 frames (idle 0-3, walk 4-11, interact 12-15) at 48x64 each, arranged in a 768x64 horizontal strip. Flux generates a single image. It cannot produce a correctly formatted sprite sheet with consistent character proportions, pixel-aligned frames, and animation-ready pose sequences. The generated "spritesheet" has:
- Characters at different sizes across frames
- Inconsistent pixel grid alignment between frames
- Missing or wrong poses
- No clear frame boundaries

**Why it happens:**
Diffusion models generate holistic images; they have no concept of "frames" or "animation sequences." Even with a prompt like "sprite sheet, 16 frames, idle walk interact poses," the model produces something that vaguely resembles multiple characters but fails on the precise requirements: identical character size across all frames, consistent style, specific poses in specific frame positions, and pixel-perfect grid alignment.

The current art manifest expects:
```json
"playerSprite": {
    "dimensions": { "width": 768, "height": 64 },
    "spriteConfig": { "frameWidth": 48, "frameHeight": 64, "frameCount": 16 }
}
```

**Consequences:**
- Player animations break: walk cycle jitters, idle pose changes size, interact pose is wrong
- The existing `Player.ts` animation definitions reference specific frame ranges that must correspond to specific poses
- The spritesheet is the single most visible asset -- every player sees it in every room
- Regenerating and manually fixing the spritesheet could take longer than hand-drawing it

**Prevention:**
- Do NOT generate the player spritesheet as a single image. Generate each pose INDIVIDUALLY as a separate 48x64 (or 128x128 downscaled to 48x64) image with a fixed seed and character reference
- Use a consistent character reference image (generated once, then used as img2img reference or IP-Adapter input) for every frame to maintain character consistency
- After generating individual pose images, assemble the spritesheet programmatically with sharp: `sharp().composite()` to place each frame at its grid position
- For walk cycle animation, generate 2-3 key poses and use frame interpolation or generate intermediate frames with small prompt variations + consistent seed
- Alternatively, hand-draw the player sprite. At 48x64 pixels, a 16-frame spritesheet can be hand-drawn in 2-4 hours by someone with basic pixel art skills. This avoids the hardest Flux generation problem entirely
- If using Flux for individual poses, add to `generate-art.ts` a `processPlayerSpritesheet()` function that takes N individual frame images and composites them into the strip format

**Detection:**
- Load the generated spritesheet into Phaser and play the walk animation. Does the character's head bob up and down? Does the body change size? Does the art style shift between frames?
- Overlay frames 0-3 (idle) at 50% opacity -- the character silhouette should be nearly identical
- Check that the pixel grid is consistent across all 16 frames (no sub-pixel shifts)

**Phase to address:** Player sprite should be generated in a dedicated plan, not batched with backgrounds. Consider the hand-drawn fallback from the start.

---

### Pitfall 4: Batch Generation Takes 15+ Hours and Fails Midway

**What goes wrong:**
91 assets at ~2-5 minutes each on a local GPU = 3-7.5 hours of generation time. But the `generate-art.ts` script processes sequentially with no retry logic. At asset 47, ComfyUI crashes (OOM, GPU timeout, model unloaded by OS) or the script hits a network timeout. The first 46 assets are saved but the remaining 45 need to be regenerated. The developer re-runs the script, but the `--force` flag is not set, so it skips existing files. However, the file that was mid-generation when the crash happened is either missing or corrupted (0 bytes).

**Why it happens:**
The current `generate-art.ts` has a 10-minute timeout per image (`GENERATION_TIMEOUT_MS = 10 * 60 * 1000`) and catches errors per-entry, but:
- No retry logic -- a transient GPU failure fails permanently
- No validation that the output file is a valid PNG (a 0-byte file passes the `fs.existsSync()` skip check)
- No queue management -- if ComfyUI's internal queue backs up, the polling loop may never see completion
- The `--force` flag regenerates ALL files, including successfully generated ones -- there is no "regenerate failures only" mode
- macOS will throttle or thermal-limit the GPU during long generation runs, causing later generations to be slower or fail

Specific code risk in `generate-art.ts` lines 590-624:
```typescript
for (let i = 0; i < entries.length; i++) {
    // ...
    try {
        const rawImage = await generateImage(entry.fullPrompt, entry.seed, workflow);
        // ... process and save
    } catch (err) {
        failed++;  // No retry, just count failure
    }
}
```

**Consequences:**
- Half the assets generated, half missing, no easy way to resume
- Corrupted/zero-byte files cause the script to skip them on re-run (it checks existence, not validity)
- Developer must manually track which assets succeeded and which failed
- On Apple Silicon with 16GB, thermal throttling after 30+ minutes of sustained GPU load causes generation quality to degrade (more noise, fewer steps completed before timeout)
- Total wall-clock time could exceed 12 hours with failures and restarts

**Prevention:**
- Add retry logic to `generateImage()`: retry each failed generation 2-3 times with increasing backoff. Many failures are transient (GPU mem pressure, ComfyUI busy)
- Validate output before marking success: check that the file exists, is > 0 bytes, and is a valid PNG (sharp can verify: `sharp(buffer).metadata()` throws on corrupt data)
- Add a `--retry-failed` mode that re-processes entries where the output file is missing OR has metadata validation failures
- Split generation into batches by category: run `--type shared` first (6 images, ~15 min), then `--type backgrounds` (36 images, ~2 hours), then `--type items` (37 images, ~2 hours), then `--type npcs` (11 images, ~30 min). This provides natural checkpoints
- Add a generation log file (JSON) that records: asset ID, status (success/failed/pending), timestamp, prompt used, seed used. This enables resume from the exact point of failure
- Between batches, clear ComfyUI's VRAM by calling the ComfyUI `/free` endpoint (POST to free memory) or by restarting ComfyUI
- On Apple Silicon, monitor GPU temperature and add a cooldown delay (30s) every 10 generations to prevent thermal throttling

**Detection:**
- After a full batch run, count output files vs. expected. Do they match?
- Check file sizes: any 0-byte or suspiciously small (< 1KB) PNG files?
- Run `sharp(file).metadata()` on every output to validate PNG integrity
- Compare generation time of first vs. last batch -- significant slowdown indicates thermal throttling

**Phase to address:** First batch generation plan. Add retry logic and validation BEFORE running the first full batch.

---

### Pitfall 5: Visual Effects Tank Mobile Frame Rate

**What goes wrong:**
The developer adds beautiful particle effects: torch flicker in caves, dust motes in sunbeams, crystal sparkle in the cavern, rain on the rooftop, mist in the petrified forest. Each effect looks great on desktop (60 FPS). On a mid-range phone, the frame rate drops to 15-20 FPS. The game becomes a stuttery slideshow. The text input becomes laggy, the player movement jerks, and scene transitions stutter.

**Why it happens:**
Phaser 3.90.0's `ParticleEmitter` (rewritten in 3.60) is significantly more efficient than earlier versions, but mobile GPUs are 5-10x weaker than desktop GPUs. Each particle is a textured quad drawn in the WebGL batch renderer. With 200+ active particles across multiple emitters, the draw call overhead exceeds mobile GPU capacity. Additionally:
- The game already has parallax layers (3 per room), player sprite, hotspot debug overlays, and UI elements consuming GPU budget
- `pixelArt: true` in the Phaser config forces nearest-neighbor filtering, which is cheap, but does not help with particle overdraw
- The game targets 60 FPS (`fps: { target: 60 }`) -- dropping below 30 on mobile creates visible stutter
- Mobile browsers also have stricter power management that throttles WebGL performance when the tab is not in foreground

Phaser config already at the limit:
```typescript
render: { pixelArt: true },
fps: { target: 60, smoothStep: true },
```

**Consequences:**
- Mobile users experience unacceptable frame rates
- Battery drain increases significantly with particle effects
- The game may be force-throttled by mobile Safari's power management
- Removing effects after they are designed and integrated requires ripping out code across multiple rooms
- The "Phase 13: Mobile Responsive" work (VerbBar, MobileKeyboardManager) is undermined by poor performance

**Prevention:**
- Budget particles per room: MAXIMUM 50 active particles on mobile, 200 on desktop. Use `isMobile()` from `MobileKeyboardManager.ts` to select the budget at room entry
- Create two particle configurations per effect: a rich version for desktop (high particle count, complex behaviors) and a lite version for mobile (fewer particles, simpler movement, no alpha blending)
- Use `emitter.setFrequency()` and `emitter.setQuantity()` to dynamically adjust based on detected performance. If FPS drops below 30 for 3 consecutive frames, reduce particle count by 50%
- Prefer static visual effects over particles where possible: tinted overlay sprites for "mist," animated tile sprites for "water ripple," shader-free color cycling for "crystal glow." These are cheaper than hundreds of individual particles
- Never use particles for effects that cover the full screen (rain, snow, fog). Use a tinted rectangle or a pre-rendered animated sprite instead
- Profile BEFORE adding effects: measure baseline FPS on target mobile devices (iPhone SE 2020, Samsung Galaxy A series). If baseline is already below 50 FPS, there is no headroom for particles
- Use Phaser's built-in performance monitoring: `this.game.loop.actualFps` to track real FPS and gate effects accordingly
- For scene transitions, DISABLE all particle emitters before the transition animation starts. Particles running during a fade-out or slide transition waste GPU cycles on invisible content

**Detection:**
- Test on a real mid-range phone, not desktop browser dev tools (dev tools throttling does not accurately simulate mobile GPU limitations)
- Monitor `game.loop.actualFps` during gameplay with effects active
- Compare FPS with effects vs. without (toggle effects off in a debug flag)
- Watch for battery temperature increase during extended play sessions

**Phase to address:** Visual effects should be added in a SEPARATE plan from art replacement, with mobile performance testing as a gate before merging. Every effect must have a mobile-off fallback.

---

### Pitfall 6: Art Style Inconsistency Across Acts Creates Visual Whiplash

**What goes wrong:**
Act 1 rooms (forest, castle) look like a warm, painterly pixel art game. Act 2 rooms (caverns) look like a dark, atmospheric realistic cave with pixel art "applied as a filter." Act 3 rooms (petrified world) look like abstract art with heavy purple tinting. Walking from the last Act 1 room to the first Act 2 room feels like loading a completely different game. The style guide defined per-act palettes, but the palette influence is overwhelmed by the completely different scene content driving Flux's generation in different directions.

**Why it happens:**
The style guide defines act palettes:
```json
"act1": { "palette": "Warm greens, golden sunlight, mossy grays, amber accents..." },
"act2": { "palette": "Deep blues, glowing crystals, dark purples, bioluminescent teal..." },
"act3": { "palette": "Twilight purples, corrupted golds, petrified grays, magical aurora greens..." }
```

These palettes are injected as text into the prompt via `paletteHint`:
```typescript
const paletteHint = actInfo ? ` ${actInfo.palette.split('.')[0]}.` : '';
```

But Flux gives more weight to the scene description ("underground cavern with filing cabinets") than to the style hint ("deep blues, glowing crystals"). The scene content itself determines 80% of the visual style. A forest scene and a cavern scene will ALWAYS look fundamentally different regardless of palette guidance, because the semantic content drives the model's interpretation.

Additionally, the 36 rooms span 3 radically different environments: outdoor forest, indoor castle, underground cavern, and petrified/cursed world. Even a human pixel artist would struggle to maintain style consistency across these.

**Consequences:**
- Game feels like a visual collage, not a cohesive world
- Act transitions are jarring rather than dramatic
- Some rooms may look "AI-generated" while others look hand-crafted, creating uncanny valley inconsistency
- Players notice quality variance between rooms and associate lower-quality rooms with less developer care

**Prevention:**
- Generate ALL rooms with a single, STRONG style anchor that overrides scene content. The prompt prefix must carry more weight than the scene description. Use a prefix like: "GRPZA, 16-bit pixel art, 320x180 resolution look, limited color palette, dithered shading, consistent retro adventure game style," which forces pixel art aesthetics regardless of scene content
- Generate rooms in DISPLAY ORDER (the order a player encounters them), not by act. This makes adjacent rooms more likely to be visually consistent because they are generated in sequence with similar model state
- After generating all backgrounds, create a visual comparison grid: arrange all 36 backgrounds in a 6x6 grid and review them simultaneously. Inconsistent rooms will stand out immediately. Regenerate outliers
- Apply uniform post-processing to ALL backgrounds: (1) downscale to 480x270 nearest-neighbor (forces pixel grid), (2) quantize to a shared 64-color master palette, (3) upscale back to 960x540 nearest-neighbor. This normalizes style regardless of what Flux produced
- Create 3 "anchor" rooms first (one per act) and manually approve them. Then generate remaining rooms with the anchor rooms as style references (using Flux IP-Adapter or img2img with low denoising on the anchor room as a base)
- Use consistent generation parameters across ALL rooms: same steps, same guidance, same LoRA strength, same sampler, same scheduler. Variation in generation parameters causes style variation

**Detection:**
- The "6x6 grid test": arrange all backgrounds and squint. Do they look like one game or six?
- Transition test: play through rooms in order. Does any transition feel like switching between different games?
- Color analysis: extract the top 16 colors from each background. The sets should overlap significantly
- Contrast test: if backgrounds from different acts are indistinguishable without the palette hint, the style is consistent (good). If removing the palette hint makes them look radically different, the style is inconsistent (bad)

**Phase to address:** Art generation must include a "style validation" step after generating the first 3-5 rooms but before generating all 36. Full batch generation without style validation is the highest-risk action in this milestone.

---

## Moderate Pitfalls

### Pitfall 7: Item Sprites Do Not Read as Objects at 32x32 Pixels

**What goes wrong:**
Flux generates beautiful, detailed item images at 1024x1024. After downscaling to 32x32 with sharp, the result is an unrecognizable blob of pixels. The "ornate golden key with jeweled handle" becomes a yellow-brown smudge. Players cannot tell what items are from their sprites. The inventory panel becomes a grid of illegible thumbnails.

**Why it happens:**
32x32 pixels is extremely small. At this resolution, an item must be readable from its silhouette and 2-3 dominant colors alone. Flux generates photorealistic detail that cannot survive a 32x downscale. The `processSprite()` function uses `fit: 'contain'` which preserves aspect ratio but may leave the item occupying even fewer than 32x32 actual pixels.

The `style-guide.json` item prefix does include "small object, centered" but does not account for the extreme resolution reduction:
```json
"itemPromptPrefix": "GRPZA, pixel art game item icon, 2D,",
"itemPromptSuffix": ", white background, game asset, clean pixel art, centered, small object"
```

**Consequences:**
- Inventory items are unrecognizable visual noise
- Players cannot distinguish items from each other
- The inventory panel becomes useless without reading item names
- Visual identity of key items (royal seal, crystal, decree) is lost

**Prevention:**
- Generate items at a resolution much closer to the target: 128x128 or 256x256, NOT 1024x1024. This forces Flux to produce simpler compositions that survive the downscale to 32x32
- Alternatively, generate at 1024x1024 but add an aggressive post-processing step: downscale to 32x32 with nearest-neighbor (NOT bicubic), which preserves hard pixel edges instead of blurring
- Emphasize silhouette in prompts: "bold silhouette, clear shape, minimal detail, high contrast, icon style"
- After generation, test each item at ACTUAL display size: view the 32x32 sprite at 1x zoom on screen. If you cannot identify the item in 2 seconds, regenerate it
- Consider generating items at 64x64 and displaying at 64x64 in the game (doubling current size). The room JSON item zones are already larger than 32x32 in most cases -- the sprite just needs to fit within the zone
- Hand-draw a few critical items (royal seal, skeleton key, crystal) that must be immediately recognizable. Use Flux for less critical items (generic coins, papers, rope)

**Detection:**
- The "squint test": view all 37 item sprites at 1x size on a phone screen. Can you identify each one?
- Show sprites to someone unfamiliar with the game. Can they guess what each item is?
- Compare against placeholder sprites (which have text labels) -- are the generated sprites more or less readable?

---

### Pitfall 8: Shared Parallax Layers Create Visible Seams at Act Transitions

**What goes wrong:**
The parallax system uses 2 shared layers per act (sky and mid) plus 1 unique layer per room. When the player transitions from the last Act 1 room to the first Act 2 room, the shared sky and mid layers change abruptly. The sky goes from warm golden to dark cavern ceiling. The mid layer goes from green hills to purple rock walls. Even with a fade transition, this creates a visible "pop" as the parallax layers swap.

**Why it happens:**
The style guide defines separate shared layers per act:
```json
"parallaxLayers": {
    "shared": {
        "description": "2 shared layers per act: sky and mid-ground."
    }
}
```

Act transitions happen in `SceneTransition.transitionToRoom()` which does a 500ms fade or slide. During a fade, the old scene fades out and the new scene fades in. The parallax layers change during the black gap between scenes. For a slide transition, the old room's parallax scrolls off and the new room's parallax scrolls in -- but the SHARED layers are different, causing the sky to "jump" during the slide.

**Consequences:**
- Act transitions are visually jarring
- Slide transitions look broken when parallax sky changes mid-slide
- The illusion of a continuous world is broken at act boundaries

**Prevention:**
- Use ONLY fade transitions at act boundaries (never slide). The fade-to-black masks the parallax layer swap. Update room JSON exit data for act-boundary exits to force `"transition": "fade"`
- Create transitional rooms at act boundaries that use a blended sky/mid (e.g., a room at the cave entrance that uses Act 1 sky with Act 2 mid, or a unique set of layers). This provides a visual bridge
- Pre-load the next act's shared layers during the transition animation. Start loading Act 2 sky/mid in the background while the Act 1 final room's fade-out is playing
- For the cave entrance specifically (Act 1 outdoor to Act 1 underground, then Act 2 caverns), the transition from sky to underground is narratively appropriate -- use a longer fade (1000ms instead of 500ms) and a different transition color (dark grey instead of black) to signal the environment change

**Detection:**
- Play through act-boundary transitions and observe. Is the sky/mid change visible?
- Test slide transitions at act boundaries specifically
- Compare fade duration vs. parallax layer load time -- if loading takes longer than the fade, the player sees a blank sky flash

---

### Pitfall 9: NPC Sprites Blend Into or Clash With Generated Backgrounds

**What goes wrong:**
NPC sprites are generated with "white background, transparent background ready" prompt suffix and then composited onto room backgrounds at specific zone positions. The NPC's color palette, shading direction, and pixel density do not match the background. The bridge troll looks like a paper cutout pasted onto a painting. The ghost king's semi-transparent ectoplasm effect does not blend with the throne room's lighting.

**Why it happens:**
Sprites and backgrounds are generated independently with different prompt templates, potentially different effective LoRA strengths, and fundamentally different composition requirements (isolated character vs. full scene). Even if both use the GRPZA trigger word, the model interprets "pixel art game sprite on white background" very differently from "pixel art game background." The shading direction (light source) in the background may come from the left, while the NPC was generated with front-facing lighting.

NPC sprites are placed via absolute coordinates in room JSONs:
```json
{ "zone": { "x": 450, "y": 350, "width": 48, "height": 64 } }
```

**Consequences:**
- NPCs look "pasted on" rather than integrated into the scene
- Light direction mismatch makes NPCs look flat against the background
- Pixel density mismatch (NPC pixels vs. background pixels at different scales) creates visual dissonance
- Ghost/translucent NPCs (ghost_king, queue_ghost, dwarven_spirit, wizard_ghost) need alpha blending that Flux cannot easily produce

**Prevention:**
- Generate NPC sprites with lighting direction hints that match their rooms: "lit from the left" for rooms with left-side windows, "front-lit" for rooms with ambient light
- Add a "ground shadow" sprite beneath each NPC to help integrate them into the scene (a simple elliptical dark shape at alpha 0.3)
- For ghost NPCs, generate a solid character and apply transparency as post-processing in sharp or at runtime in Phaser (set alpha on the sprite: `npcSprite.setAlpha(0.6)`)
- Ensure NPC sprite pixel density matches backgrounds: if backgrounds are "2x" (480x270 upscaled to 960x540), NPC sprites should be drawn at equivalent pixel density (24x32 upscaled to 48x64)
- Add an outline or slight drop shadow to NPCs in post-processing to visually separate them from the background, a common technique in 2D games
- Test each NPC in their specific room context, not in isolation. A sprite that looks great on white background may look terrible against a dark cave background

**Detection:**
- Place each NPC sprite on its room background at the correct position. Does it look integrated or pasted?
- Check light direction: does the NPC's shading match the room's light source?
- View at 1x game scale: at 960x540, does the NPC read as part of the scene?

---

### Pitfall 10: Seed Reproducibility is Fragile Across ComfyUI Versions

**What goes wrong:**
The art manifest stores fixed seeds for reproducibility (`"seed": 200001`). The developer generates all 91 assets, approves them, and ships. Three weeks later, a bug is found in room 12's background (hotspot misalignment). The developer updates ComfyUI (a new version was released), re-runs generation for just room 12 with the same seed and prompt, and gets a COMPLETELY DIFFERENT image. The style doesn't match the other 35 rooms, and the coordinates need re-authoring.

**Why it happens:**
Seed reproducibility in diffusion models depends on: (1) the exact model weights (GGUF quantization level), (2) the exact scheduler implementation, (3) the exact sampler implementation, (4) the exact CLIP text encoder weights, (5) the GPU hardware and driver version, and (6) the ComfyUI version's internal random number generation. Changing ANY of these breaks seed reproducibility. ComfyUI updates frequently, and custom nodes (like ComfyUI-GGUF) update independently.

The style guide acknowledges this: `"seedStrategy": "Each room gets a fixed seed for reproducibility."` But this is aspirational -- seeds are reproducible only within the exact same software stack.

**Consequences:**
- Cannot regenerate individual assets without style mismatch
- ComfyUI updates break the entire regeneration pipeline
- Fixing one room's art requires regenerating adjacent rooms to maintain consistency
- The "store seed for reproducibility" strategy gives false confidence

**Prevention:**
- Pin ComfyUI to an exact version (git commit hash) and document it. Do NOT update ComfyUI between the start and end of art generation
- Pin all custom nodes (ComfyUI-GGUF) to exact versions
- Pin the model file (flux1-dev-Q5_0.gguf) by storing its SHA256 hash in the style guide
- Store the RAW output from Flux (pre-post-processing) alongside the processed output. If regeneration is needed, compare the raw output to verify same-seed reproduction before applying post-processing
- After generating all assets, create a "version lock" file recording: ComfyUI commit hash, custom node versions, model file hashes, Python version, CUDA/Metal version. Store this in the repository
- If an individual asset needs regeneration and the stack has changed, generate 5-10 variants with different seeds and manually select the one that best matches the existing style. Do not rely on seed matching

**Detection:**
- Generate the same asset twice with identical parameters. Are the outputs byte-identical? (They should be, if the stack is stable)
- After a ComfyUI update, regenerate one test asset. Does it match the original?
- Store raw output hashes in the generation log for comparison

---

### Pitfall 11: Scene Transition Visual Effects Create State Bugs

**What goes wrong:**
The developer adds visual effects to scene transitions: particle trails during slide transitions, camera shake on death, color tint effects on the petrification curse scenes. During a slide-right transition with a particle trail, the user's command-submitted event fires (queued before the transition started). The event handler runs against the OLD room data while the NEW room is loading. The particle system references a destroyed texture. The game throws an unhandled exception and freezes.

**Why it happens:**
The existing transition system is well-guarded with `this.isTransitioning` flag, but visual effects add new asynchronous behaviors:
- Tweens that outlive the scene (a 1000ms camera tween running when the scene shuts down at 500ms)
- Particle emitters that reference textures destroyed during scene cleanup
- Delayed calls (`this.time.delayedCall`) that fire after the scene has been replaced
- EventBus listeners that fire during the transition window

The shutdown cleanup in RoomScene (lines 669-704) destroys everything but does not cancel pending tweens or delayed calls:
```typescript
this.events.on(Phaser.Scenes.Events.SHUTDOWN, () => {
    this.player.destroy();
    this.navigation.destroy();
    // ... but no tween.killAll(), no time.removeAllEvents()
});
```

**Consequences:**
- Transition effects cause null reference errors as they touch destroyed objects
- Delayed calls from the old scene fire in the new scene
- Particle emitters hold references to freed textures
- The game appears to "glitch" during transitions with visual effects

**Prevention:**
- In the SHUTDOWN handler, add explicit cleanup for all transient effects:
  ```typescript
  this.tweens.killAll();
  this.time.removeAllEvents();
  // Destroy any active particle emitters
  ```
- Never start a tween or particle effect that outlives its scene. If the transition duration is 500ms, all transition effects must complete within 500ms or be designed to be interrupted
- Use Phaser's scene lifecycle events correctly: effects that should persist across scenes go in the TRANSITION scene (a dedicated overlay scene), not in the departing RoomScene
- For transition effects (particle trails, screen flashes), consider creating a dedicated `TransitionEffectsScene` that runs as an overlay during transitions and is independent of the room scenes' lifecycles
- Gate ALL visual effect creation behind `if (!this.isTransitioning)` checks

**Detection:**
- Rapidly transition between rooms (click exit, immediately click another exit in the new room)
- Watch for console errors during transitions, especially "Cannot read properties of null"
- Profile memory during transitions -- are textures being freed correctly?
- Test death transitions specifically (scene pause + overlay launch) with active particle effects

---

## Minor Pitfalls

### Pitfall 12: PNG File Size Bloat Exceeds Lazy Loading Budget

**What goes wrong:**
Flux generates detailed images that, even after PNG compression, are 300-800KB each. 36 room backgrounds at 500KB average = 18MB. The lazy loading system (loading 1-2 images per room entry) takes 1-3 seconds on mobile LTE, which exceeds the 500ms transition mask. Players see "Loading..." text on every room entry, breaking flow.

**Prevention:**
- Set a strict file size budget: 100KB per room background, 200KB for wide rooms, 5KB per item sprite, 10KB per NPC sprite
- Use `sharp.png({ compressionLevel: 9, palette: true })` (indexed color PNG) for backgrounds where 64-256 colors is sufficient. This can reduce file size by 60-80% compared to full-color PNG
- Consider WebP format: `sharp.webp({ quality: 80 })` produces 40-60% smaller files than PNG for equivalent visual quality. WebP support is >96% of browsers
- Pre-load adjacent rooms: when entering room A, also lazy-load backgrounds for rooms reachable from A's exits. This hides load time behind gameplay
- Add a size validation step to the generation pipeline: after processing, check file size and warn if it exceeds budget

---

### Pitfall 13: White Background Removal Fails on Item Sprites

**What goes wrong:**
The LoRA generates items on white backgrounds (as trained). The `processSprite()` function preserves whatever alpha Flux outputs. But Flux does NOT generate transparent backgrounds -- it generates white backgrounds. The "white background" is baked into the RGB pixels. Items displayed in the game have visible white rectangles around them instead of transparency.

**Prevention:**
- Add a white-background-to-alpha conversion step in `processSprite()`: any pixel close to pure white (within threshold, e.g., RGB all > 240) becomes fully transparent
- Use sharp's `removeAlpha()` then `ensureAlpha()` pipeline with a color-key approach: extract alpha from luminance of the background color
- Better: use `sharp.trim()` to auto-detect and remove the background, then place the trimmed result on a transparent canvas
- Even better: generate with prompt "transparent background, no background, PNG transparency" and use Flux's native alpha channel output if available (Flux 1.0 does NOT natively support alpha; this requires a separate background removal model like `rembg`)
- Add `rembg` (Python background removal) as a post-processing step for sprites: `rembg input.png output.png`. This is more reliable than color-key thresholding for complex items
- Validate in the generation pipeline: after processing, check that the PNG has an alpha channel and that the corners are transparent

---

### Pitfall 14: Camera Effects (Shake, Flash, Tint) Interact Badly with Parallax

**What goes wrong:**
Adding camera shake on death, color tinting for curse rooms, or flash effects on item pickup causes the parallax layers to behave unexpectedly. Camera shake moves the camera position, which causes parallax layers with scrollFactor < 1 to shift at different rates, creating a nauseating swimming effect. Camera flash (white overlay) renders behind parallax layers with scrollFactor 0, so the sky layer does not flash.

**Prevention:**
- For camera shake: use Phaser's `cameras.main.shake()` which applies as a post-render effect and does NOT change the camera's logical scroll position. This avoids parallax jitter
- For color tinting: use a full-screen rectangle at high depth (above all parallax layers) with alpha blending, not `cameras.main.setTint()` which tints individual game objects inconsistently
- For flash effects: same approach -- a white rectangle at maximum depth with a quick alpha tween (0 -> 0.8 -> 0, 300ms)
- Test EVERY camera effect with 3-layer parallax active. The interaction between camera effects and scrollFactor is the primary source of bugs
- For death scenes specifically, the existing `cameras.main.fadeOut(1500)` works correctly with parallax. Do not replace this with a custom tween on camera scroll

---

### Pitfall 15: ComfyUI Desktop vs. Server Mode Behavioral Differences

**What goes wrong:**
The developer tests the pipeline with ComfyUI Desktop app (which bundles its own Python environment). Everything works. They try to run it on a different machine using ComfyUI from source (Python + `main.py`) and the workflow fails: nodes are missing, models are in different paths, the GGUF loader custom node is not installed.

**Prevention:**
- Document the EXACT ComfyUI setup required in the style guide or a dedicated setup document: ComfyUI version, custom nodes required (ComfyUI-GGUF), model file locations, Python version
- The `generate-art.ts` script already checks ComfyUI availability at startup. Add a workflow validation step: submit the workflow with a test prompt and verify all nodes resolve correctly before starting the batch
- Store the ComfyUI-GGUF custom node version alongside the workflow
- If using ComfyUI Desktop, note that its internal Python environment and model paths differ from a manual installation. The REST API is the same, but model loading behavior may differ

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Resolution & Workflow Setup | #1 (1024x1024 crop destroys composition) | Test non-square generation FIRST; establish generation resolution before any batch work |
| LoRA Testing | #2 (LoRA mismatch for backgrounds) | Generate 3 test backgrounds at different LoRA strengths; compare before committing |
| Player Sprite | #3 (Sprite sheets impossible) | Generate individual poses; assemble programmatically; have hand-drawn fallback |
| Batch Generation | #4 (15+ hour run fails midway) | Add retry logic, output validation, batch-by-category, generation log |
| Visual Effects | #5 (Mobile FPS tank) | Budget particles by platform; profile on real devices; have mobile-off fallback |
| Style Consistency | #6 (Act transition visual whiplash) | Unified post-processing pipeline; anchor rooms; 6x6 grid review |
| Item Sprites | #7 (32x32 illegible) | Generate at lower resolution; nearest-neighbor downscale; test at actual display size |
| Parallax at Act Boundaries | #8 (Sky layer pops) | Force fade transitions at act boundaries; transitional rooms |
| NPC Integration | #9 (Paper cutout effect) | Match lighting, add shadows, test in room context |
| Reproducibility | #10 (Seed breaks on update) | Pin all versions; store raw outputs; version lock file |
| Transition Effects | #11 (State bugs during transitions) | Kill tweens on shutdown; dedicated transition overlay scene |
| File Size | #12 (PNG bloat) | Size budget; indexed PNG; WebP; pre-load adjacent rooms |
| Alpha Channels | #13 (White backgrounds not removed) | Color-key threshold or rembg post-processing; validate alpha |
| Camera Effects + Parallax | #14 (Shake/tint misfire) | Use post-render shake; full-screen overlay for tints |
| ComfyUI Setup | #15 (Desktop vs. server differences) | Document exact setup; validate workflow before batch |

## Integration Risk Matrix

How each feature in this milestone interacts with the existing codebase.

| Feature | Files Modified | Risk Level | Notes |
|---------|---------------|------------|-------|
| Background generation (36 rooms) | art-manifest.json, comfyui-workflow.json, generate-art.ts, all 36 room JSONs (coordinate re-authoring) | HIGH | Every room JSON may need walkable area/hotspot updates |
| Shared parallax generation (6 layers) | art-manifest.json, Preloader.ts (shared layer preload) | LOW | Drop-in replacement, same dimensions and keys |
| Item sprite generation (37 items) | generate-art.ts (alpha processing), art-manifest.json | MEDIUM | Alpha channel handling is the main risk |
| NPC sprite generation (11 NPCs) | generate-art.ts, art-manifest.json | MEDIUM | Visual integration with backgrounds is the main risk |
| Player spritesheet | generate-art.ts (composite logic), Player.ts (frame verification) | HIGH | Incorrect frames break all player animations |
| Particle visual effects | RoomScene.ts, new effect systems, room JSONs (effect config) | MEDIUM-HIGH | Mobile performance risk; transition state bugs |
| Scene transition effects | SceneTransition.ts, RoomScene.ts shutdown handler | MEDIUM | Must not break existing transition system |
| Camera effects (shake, tint, flash) | RoomScene.ts, DeathScene.ts, EndingScene.ts | LOW-MEDIUM | Parallax interaction must be tested |

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| #1 Crop composition | MEDIUM | Change workflow resolution; regenerate full batch (3-7 hours) |
| #2 LoRA mismatch | HIGH | Find or train different LoRA; regenerate backgrounds (potentially all) |
| #3 Spritesheet failure | LOW | Hand-draw the 16-frame spritesheet (2-4 hours) |
| #4 Batch failure | LOW | Fix retry logic; re-run failed entries only |
| #5 Mobile FPS | MEDIUM | Reduce/remove effects on mobile; may need to redesign effect approach |
| #6 Style inconsistency | HIGH | Re-generate all backgrounds with unified post-processing; 4-8 hours |
| #7 Illegible items | LOW | Regenerate at lower input resolution; 2-3 hours |
| #8 Parallax seams | LOW | Force fade transitions at act boundaries; update room JSONs |
| #9 NPC cutout effect | MEDIUM | Add post-processing shadows/outlines; regenerate with lighting hints |
| #10 Seed reproduction | LOW | Accept manual selection from variants; do not rely on exact seed match |
| #11 Transition bugs | LOW-MEDIUM | Add cleanup to shutdown handler; dedicate 2-3 hours debugging |
| #12 File bloat | LOW | Switch to indexed PNG or WebP; re-process existing outputs |
| #13 White backgrounds | LOW | Add rembg or color-key step; re-process existing sprites |

## Confidence Assessment

| Area | Confidence | Reason |
|------|------------|--------|
| Flux generation resolution issue (#1) | HIGH | Based on direct analysis of existing workflow JSON and sharp processing code |
| LoRA behavior on backgrounds (#2) | MEDIUM | Based on training data knowledge of Flux-2D-Game-Assets-LoRA; specific behavior with backgrounds unverified online |
| Spritesheet impossibility (#3) | HIGH | Well-established limitation of all diffusion models |
| Batch reliability (#4) | HIGH | Direct analysis of generate-art.ts code showing no retry logic |
| Mobile particle performance (#5) | MEDIUM | Based on general WebGL/mobile GPU knowledge; Phaser 3.90 specifics unverified |
| Style consistency (#6) | HIGH | Fundamental challenge of diffusion models at scale; widely documented |
| Item readability at 32x32 (#7) | HIGH | Resolution math is unambiguous; 1024->32 is a 32x downscale |
| Parallax transition (#8) | MEDIUM | Based on code analysis of SceneTransition.ts and parallax scroll factors |
| Seed reproducibility (#10) | HIGH | Well-documented fragility of diffusion model seed reproducibility |
| Transition effect bugs (#11) | HIGH | Direct analysis of RoomScene shutdown handler missing tween/timer cleanup |

## Sources

### Primary (HIGH confidence -- direct codebase analysis)
- `/Users/abel/Claude/KQGame/scripts/generate-art.ts` -- Art generation pipeline code, no retry logic, sharp processing
- `/Users/abel/Claude/KQGame/scripts/comfyui-workflow.json` -- 1024x1024 generation resolution, Flux GGUF node chain
- `/Users/abel/Claude/KQGame/scripts/art-manifest.json` -- 91 asset entries with seeds, dimensions, prompts
- `/Users/abel/Claude/KQGame/scripts/style-guide.json` -- LoRA config, prompt templates, act palettes
- `/Users/abel/Claude/KQGame/src/game/scenes/RoomScene.ts` -- Lazy loading, parallax rendering, shutdown cleanup
- `/Users/abel/Claude/KQGame/src/game/systems/SceneTransition.ts` -- Fade/slide transitions, 500ms duration
- `/Users/abel/Claude/KQGame/src/game/main.ts` -- Phaser config: 960x540, pixelArt: true, Scale.FIT
- `/Users/abel/Claude/KQGame/src/game/systems/MobileKeyboardManager.ts` -- Mobile detection, viewport lock

### Secondary (MEDIUM confidence -- training data, general domain knowledge)
- Flux Dev model capabilities: generates at arbitrary resolutions but quality degrades at non-standard aspect ratios (training data)
- Flux-2D-Game-Assets-LoRA: trained on isolated game assets, trigger word GRPZA, optimized for white backgrounds (HuggingFace page, via v2.0 research)
- Phaser 3.60 ParticleEmitter rewrite: simplified API, better performance, direct display list objects (Phaser 3.60 changelog, read from node_modules)
- Diffusion model seed reproducibility: depends on exact model weights, sampler, scheduler, hardware (well-established domain knowledge)
- Mobile GPU performance: 5-10x weaker than desktop for WebGL workloads (general knowledge)

### Flagged for Validation (LOW confidence)
- Specific LoRA strength recommendations for backgrounds vs. sprites (needs empirical testing)
- Exact mobile FPS impact of Phaser particle emitters (needs real-device profiling)
- Whether Flux Dev handles 1024x576 generation well or produces artifacts (needs testing)
- rembg effectiveness on Flux-generated sprites (needs testing)
- ComfyUI Desktop vs. server mode behavioral differences (needs testing on both)

---

*Pitfalls research for: Flux art generation at scale and Phaser 3 visual effects on Uncrowned (KQGame)*
*Researched: 2026-02-21*
*Web search unavailable -- findings based on codebase analysis and training data*
