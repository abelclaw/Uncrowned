# Phase 1: Foundation and Rendering - Research

**Researched:** 2026-02-20
**Domain:** HTML5 Canvas game rendering, pixel art display, asset loading, parallax scrolling, game loop architecture (Phaser 3)
**Confidence:** HIGH

## Summary

Phase 1 establishes the technical foundation every subsequent phase builds on: a Phaser 3 game running in the browser with pixel-perfect rendering, a stable game loop, asset preloading with a visible loading screen, and parallax scrolling backgrounds. This is a well-trodden path -- Phaser 3.90.0 provides batteries-included solutions for all four requirements. The primary risk is not "can we do it" but "can we configure it correctly" -- pixel art rendering in particular requires specific config flags and texture constraints that are easy to miss.

The project scaffolding uses the official `phaserjs/template-vite-ts` template (Phaser 3.90.0 + Vite + TypeScript 5.7), which provides hot-reload, asset handling, and production builds out of the box. The game loop is managed entirely by Phaser's `TimeStep` class using `requestAnimationFrame` with delta smoothing. Pixel-perfect rendering requires setting `pixelArt: true` in the game config (which cascades to `antialias: false`, `roundPixels: true`, and nearest-neighbor texture filtering). Asset preloading uses Phaser's built-in Loader with `progress` events to drive a visual loading bar. Parallax scrolling uses either `setScrollFactor()` on image layers or `TileSprite` objects with manually updated `tilePositionX` in the `update()` loop.

**Primary recommendation:** Use the official Phaser Vite TypeScript template as the starting point. Configure `pixelArt: true` in game config from the very first line of code. Establish a Boot scene (loads minimal assets for the loading bar) and a Preloader scene (loads all game assets with progress display) before any game scene. Build an EventBus singleton for cross-scene communication from the start.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| ENG-01 | Game renders pixel art scene backgrounds on HTML5 Canvas at consistent resolution | Phaser `pixelArt: true` config disables anti-aliasing and enables nearest-neighbor filtering. Scale Manager `FIT` mode with `autoCenter: CENTER_BOTH` handles responsive display. CSS `image-rendering: pixelated` on the canvas element ensures crisp upscaling. Camera `roundPixels` prevents sub-pixel shimmer. |
| ENG-06 | Assets preload with a loading screen before gameplay starts | Phaser's Loader fires `progress` (0-1 value) and `complete` events. A Boot scene loads the loading bar graphic, then the Preloader scene loads all game assets while displaying progress via `this.add.graphics()`. Scene transitions via `this.scene.start()` move to gameplay when complete. |
| ENG-07 | Scenes support parallax scrolling backgrounds for depth | Two approaches: (1) Multiple image layers with `setScrollFactor(0.0 to 1.0)` move at different rates relative to camera; (2) TileSprite objects with `scrollFactor(0)` and manual `tilePositionX` updates in `update()`. TileSprite textures MUST be power-of-two dimensions to avoid blurring. |
| ENG-08 | Game loop runs at consistent frame rate via requestAnimationFrame | Phaser's TimeStep class manages the game loop using `requestAnimationFrame` with delta smoothing (`smoothStep: true`, `deltaHistory: 10`). The `fps.target` defaults to 60. Scene `update(time, delta)` receives smoothed delta for frame-rate-independent logic. |
</phase_requirements>

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Phaser | 3.90.0 | 2D game engine -- game loop, rendering, scenes, input, asset loading, cameras, tweens | Dominant HTML5 game framework. Handles ALL four ENG requirements natively. Official Vite+TS template available. Final stable v3 release. |
| TypeScript | 5.7.x | Type safety, IDE support | Phaser ships full type definitions. Catches config errors at compile time. Every Phaser template defaults to TS. |
| Vite | 6.3+ / 7.x | Dev server, bundler, HMR | Official Phaser template uses Vite. Instant hot-reload during scene iteration. Handles asset imports and production builds. |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| (none for Phase 1) | -- | -- | Phase 1 uses only Phaser core. No additional libraries are needed for rendering, loading, parallax, or game loop. |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Phaser 3.90 (full engine) | Raw Canvas API | No scene management, no asset loader, no camera system, no parallax helpers. Would rebuild 80% of Phaser. Never for this project. |
| Phaser 3.90 | Phaser 4 RC6 | Pre-release, sparse docs, RexUI not ported. Risk of breaking changes. Not worth it for Phase 1 foundations. |
| Phaser Scale Manager FIT | Manual CSS scaling | Phaser handles responsive sizing, centering, and DPR automatically. Manual approach is error-prone. |
| Phaser Loader | Custom fetch-based loader | Phaser Loader handles progress events, file types, caching, and error handling. Custom loader reinvents the wheel. |

**Installation:**
```bash
# Clone official template
git clone https://github.com/phaserjs/template-vite-ts.git kqgame
cd kqgame
npm install

# Verify: Phaser 3.90.0, Vite 6.3.1, TypeScript 5.7.2 in package.json
npm run dev
```

## Architecture Patterns

### Recommended Project Structure (Phase 1 scope)

```
src/
├── main.ts                 # Entry point (from template)
├── game/
│   ├── main.ts             # Phaser.Game config and initialization
│   ├── EventBus.ts         # Singleton EventEmitter for cross-scene communication
│   └── scenes/
│       ├── Boot.ts         # Minimal scene: loads loading bar assets only
│       ├── Preloader.ts    # Loads all game assets, displays progress bar
│       └── Game.ts         # Main game scene: renders background, parallax layers
public/
├── assets/
│   ├── ui/                 # Loading bar graphics, fonts
│   └── backgrounds/        # Scene background images, parallax layers
├── style.css               # Canvas styling (image-rendering: pixelated)
└── index.html              # Game container
```

**Structure rationale:**
- `Boot` and `Preloader` are separate scenes because Boot must load the loading bar graphic before Preloader can display it. This is the standard Phaser pattern.
- `EventBus.ts` is created in Phase 1 even though it is lightly used -- later phases depend on it heavily, and retrofitting is harder than starting with it.
- Assets live in `public/assets/` (static serving) rather than using Vite imports, because Phaser's Loader expects URL paths, not ES module imports. The template supports both approaches.

### Pattern 1: Phaser Game Config for Pixel Art

**What:** A single config object passed to `new Phaser.Game()` that controls rendering, scaling, and scene registration.
**When to use:** Once, at application startup. This is the foundation of every Phaser game.
**Confidence:** HIGH -- verified across official docs, Rex Notes, and Phaser examples.

```typescript
// Source: Phaser official docs (docs.phaser.io/api-documentation/class/core-config)
// + Rex Notes (rexrainbow.github.io/phaser3-rex-notes/docs/site/game/)
import Phaser from 'phaser';
import { Boot } from './scenes/Boot';
import { Preloader } from './scenes/Preloader';
import { Game } from './scenes/Game';

const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,           // WebGL preferred, Canvas fallback
    width: 960,                   // Logical game width (pixel art native * scale)
    height: 540,                  // Logical game height (16:9 aspect ratio)
    parent: 'game-container',     // DOM element ID
    backgroundColor: '#000000',

    render: {
        pixelArt: true,           // CRITICAL: enables nearest-neighbor filtering,
                                  // disables antialias, sets roundPixels true
    },

    scale: {
        mode: Phaser.Scale.FIT,        // Fit canvas to parent while preserving aspect ratio
        autoCenter: Phaser.Scale.CENTER_BOTH,  // Center in viewport
    },

    fps: {
        target: 60,              // Target 60 FPS
        smoothStep: true,        // Smooth delta averaging (default: true)
    },

    scene: [Boot, Preloader, Game],
};

export default new Phaser.Game(config);
```

**Key detail:** Setting `pixelArt: true` in the render config is equivalent to setting `antialias: false`, `roundPixels: true`, and nearest-neighbor texture filtering on all textures. This is a convenience flag that sets all pixel-art-relevant options at once. It was verified in Phaser docs: "Prevents pixel art from becoming blurred when scaled -- it will remain crisp."

### Pattern 2: Boot + Preloader Scene Chain

**What:** A two-scene loading sequence. Boot loads only the assets needed to display a loading screen (background color, progress bar image or graphics instructions). Preloader loads all game assets while displaying loading progress.
**When to use:** Always. Every Phaser game with non-trivial assets should use this pattern.
**Confidence:** HIGH -- this is the canonical Phaser loading pattern documented everywhere.

```typescript
// Source: Phaser official docs (docs.phaser.io/phaser/concepts/loader)
// + GameDev Academy preloader tutorial

// scenes/Boot.ts
export class Boot extends Phaser.Scene {
    constructor() {
        super('Boot');
    }

    preload() {
        // Load ONLY what the loading screen needs
        // For a graphics-only progress bar, nothing needed here
        // If using an image-based loading bar:
        // this.load.image('loading-bar-bg', 'assets/ui/loading-bar-bg.png');
    }

    create() {
        this.scene.start('Preloader');
    }
}

// scenes/Preloader.ts
export class Preloader extends Phaser.Scene {
    constructor() {
        super('Preloader');
    }

    preload() {
        // Draw progress bar using graphics (no image dependency)
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        const progressBar = this.add.graphics();
        const progressBox = this.add.graphics();
        progressBox.fillStyle(0x222222, 0.8);
        progressBox.fillRect(width / 2 - 160, height / 2 - 25, 320, 50);

        const loadingText = this.add.text(width / 2, height / 2 - 50, 'Loading...', {
            fontSize: '20px',
            color: '#ffffff',
        }).setOrigin(0.5);

        // Progress event: value is 0 to 1
        this.load.on('progress', (value: number) => {
            progressBar.clear();
            progressBar.fillStyle(0xffffff, 1);
            progressBar.fillRect(width / 2 - 150, height / 2 - 15, 300 * value, 30);
        });

        this.load.on('complete', () => {
            progressBar.destroy();
            progressBox.destroy();
            loadingText.destroy();
        });

        // Load ALL game assets here
        this.load.image('bg-sky', 'assets/backgrounds/sky.png');
        this.load.image('bg-mountains', 'assets/backgrounds/mountains.png');
        this.load.image('bg-trees', 'assets/backgrounds/trees.png');
        this.load.image('bg-ground', 'assets/backgrounds/ground.png');
        // ... all scene backgrounds, sprites, audio, data files
    }

    create() {
        this.scene.start('Game');
    }
}
```

**Key detail:** Phaser's `preload()` method is special -- the Loader starts automatically when `preload()` returns, and `create()` is called only after all assets finish loading. The `progress` event fires with a value from 0 to 1 representing overall loading progress. The `complete` event fires when everything is loaded.

### Pattern 3: Parallax Scrolling via ScrollFactor

**What:** Multiple background image layers each with a different `scrollFactor` value. When the camera moves, each layer moves at its own rate, creating a depth illusion.
**When to use:** For non-tiling background layers (unique scene art at different depths).
**Confidence:** HIGH -- verified in Phaser docs and multiple tutorials.

```typescript
// Source: Ourcade blog (blog.ourcade.co/posts/2020/add-pizazz-parallax-scrolling-phaser-3/)
// + Phaser ScrollFactor docs

// scenes/Game.ts (create method)
create() {
    // Layer order matters: back to front
    // Sky: doesn't move at all (fixed background)
    this.add.image(0, 0, 'bg-sky')
        .setOrigin(0, 0)
        .setScrollFactor(0);

    // Mountains: moves very slowly
    this.add.image(0, 0, 'bg-mountains')
        .setOrigin(0, 0)
        .setScrollFactor(0.1);

    // Trees: moves at medium speed
    this.add.image(0, 0, 'bg-trees')
        .setOrigin(0, 0)
        .setScrollFactor(0.4);

    // Ground: moves with camera (foreground)
    this.add.image(0, 0, 'bg-ground')
        .setOrigin(0, 0)
        .setScrollFactor(1);

    // Set world bounds wider than viewport for scrolling
    this.cameras.main.setBounds(0, 0, 3840, 540);
    this.cameras.main.setRoundPixels(true);
}
```

### Pattern 4: Parallax Scrolling via TileSprite (for repeating textures)

**What:** TileSprite objects with `scrollFactor(0)` (fixed on screen) and manually updated `tilePositionX` based on camera position.
**When to use:** For repeating/tiling background textures (e.g., a sky gradient, cloud pattern, repeating mountain silhouette).
**Confidence:** HIGH -- verified in official Phaser docs and TileSprite API.

```typescript
// Source: Phaser TileSprite docs (docs.phaser.io/phaser/concepts/gameobjects/tile-sprite)
// + Phaser parallax scrolling tutorial

private bgSky!: Phaser.GameObjects.TileSprite;
private bgMountains!: Phaser.GameObjects.TileSprite;

create() {
    const { width, height } = this.cameras.main;

    // TileSprites: sized to viewport, scroll factor 0 (don't move with camera)
    this.bgSky = this.add.tileSprite(0, 0, width, height, 'bg-sky-tile')
        .setOrigin(0, 0)
        .setScrollFactor(0);

    this.bgMountains = this.add.tileSprite(0, 0, width, height, 'bg-mountains-tile')
        .setOrigin(0, 0)
        .setScrollFactor(0);

    // Set camera bounds for the game world
    this.cameras.main.setBounds(0, 0, 3840, height);
}

update() {
    const cam = this.cameras.main;

    // Manually scroll each layer at different rates
    this.bgSky.tilePositionX = cam.scrollX * 0.05;
    this.bgMountains.tilePositionX = cam.scrollX * 0.2;
}
```

**CRITICAL:** TileSprite textures MUST have power-of-two dimensions (e.g., 128x128, 256x256, 512x256) in WebGL mode. Non-POT textures are internally upscaled to POT then downscaled during rendering, causing anti-aliasing blur that destroys pixel art crispness. This is a WebGL GL_REPEAT limitation. If your parallax textures are not POT, pad them to the nearest POT size.

### Pattern 5: EventBus Singleton

**What:** A shared `Phaser.Events.EventEmitter` instance used for cross-scene and cross-system communication.
**When to use:** All inter-scene communication. Do NOT use `this.game.events` (risk of colliding with Phaser's internal events).
**Confidence:** HIGH -- recommended pattern in Phaser official docs and Ourcade blog.

```typescript
// Source: Ourcade blog (blog.ourcade.co/posts/2020/phaser3-how-to-communicate-between-scenes/)
// + Phaser Events docs (docs.phaser.io/phaser/concepts/events)

// game/EventBus.ts
import Phaser from 'phaser';

const EventBus = new Phaser.Events.EventEmitter();
export default EventBus;

// Usage in any scene:
import EventBus from '../EventBus';

// Emit
EventBus.emit('scene-ready', { sceneKey: this.scene.key });

// Listen (in create())
EventBus.on('scene-ready', this.handleSceneReady, this);

// CRITICAL: Clean up on scene shutdown to prevent memory leaks
this.events.on(Phaser.Scenes.Events.SHUTDOWN, () => {
    EventBus.off('scene-ready', this.handleSceneReady, this);
});
```

### Anti-Patterns to Avoid

- **Missing `pixelArt: true` in game config:** Everything renders blurry. This is the #1 beginner mistake with pixel art in Phaser. Must be set from the very first config.
- **Using `this.game.events` as event bus:** Risks colliding with Phaser's internal event names (`step`, `boot`, `ready`, etc.), causing undefined behavior. Always use a dedicated EventEmitter singleton.
- **Non-POT textures for TileSprites:** Causes anti-aliasing blur on pixel art. Always ensure tiling textures are power-of-two dimensions.
- **Loading assets without a Preloader scene:** Results in blank screen during load, then content popping in. Always use the Boot -> Preloader -> Game scene chain.
- **Forgetting to clean up EventBus listeners on scene shutdown:** Causes memory leaks and duplicate event handling. Always remove listeners in the `SHUTDOWN` event handler.
- **Creating TileSprites larger than the canvas:** Documentation explicitly warns: "You shouldn't ever create a TileSprite any larger than your actual canvas size." Use `tilePosition` for scrolling instead of oversized sprites.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Game loop with requestAnimationFrame | Custom rAF loop with delta tracking | Phaser's built-in TimeStep | TimeStep handles delta smoothing, tab-unfocus recovery (panicMax), FPS capping, and browser compatibility. Custom loops miss edge cases (tab backgrounding, high-DPI timing). |
| Pixel art rendering pipeline | Manual Canvas imageSmoothingEnabled + CSS | Phaser `pixelArt: true` config flag | One flag sets antialias, roundPixels, and texture filtering correctly across both WebGL and Canvas renderers. Manual approach requires setting multiple properties and misses WebGL-specific settings. |
| Asset preloading with progress | Custom fetch() with Promise.all | Phaser's Loader plugin (`this.load`) | Phaser Loader handles file type detection, caching, texture creation, progress events, error recovery, and integration with the scene lifecycle. Custom loaders miss texture registration. |
| Responsive canvas scaling | Manual window.resize listener + canvas sizing | Phaser Scale Manager (FIT mode) | Scale Manager handles aspect ratio, centering, DPR, fullscreen, and orientation. Manual approach is 100+ lines to do correctly. |
| Cross-scene event communication | Custom pub/sub system | Phaser.Events.EventEmitter singleton | Phaser's EventEmitter is built-in, zero-dependency, and well-tested. Custom pub/sub adds unnecessary complexity. |
| Camera scrolling with bounds | Manual viewport offset tracking | Phaser Camera `setBounds` + `scrollX/scrollY` | Camera handles bounds clamping, smooth follow, deadzone, round pixels, and effects (fade, shake). Manual tracking requires reimplementing all of this. |

**Key insight:** Phase 1 is entirely about configuring Phaser correctly, not writing custom rendering code. Every requirement maps to a built-in Phaser feature. The risk is misconfiguration, not missing capability.

## Common Pitfalls

### Pitfall 1: Pixel Art Appears Blurry Despite pixelArt Config

**What goes wrong:** `pixelArt: true` is set in game config, but pixel art still appears blurred or has soft edges. Especially noticeable on Retina/HiDPI displays or when the browser window is not at a clean integer multiple of the game resolution.
**Why it happens:** Three common causes: (1) The CSS `image-rendering` property is not set on the canvas element; (2) The game resolution does not divide evenly into the display resolution, causing fractional scaling; (3) TileSprite textures have non-POT dimensions, triggering WebGL's internal upscale/downscale.
**How to avoid:**
- Set `image-rendering: pixelated` on the canvas in CSS (the template's `style.css`)
- Choose a game resolution that scales cleanly (e.g., 480x270 scales 2x to 960x540, 4x to 1920x1080)
- Ensure ALL TileSprite textures are power-of-two dimensions
- Test on both standard and HiDPI displays
- Use `this.cameras.main.setRoundPixels(true)` (should be automatic with `pixelArt: true`, but verify)
**Warning signs:** Art looks "soft", sprites have color bleeding at edges, different appearance on different displays.
**Confidence:** HIGH -- verified in MDN pixel art guide and Phaser docs.

### Pitfall 2: Loading Screen Shows Blank White Screen

**What goes wrong:** The Preloader scene needs to display a progress bar image, but that image itself hasn't been loaded yet. Result: white screen during loading.
**Why it happens:** The Preloader scene's `preload()` queues both the loading bar graphic AND all game assets. But the loading bar can't display until it's loaded, which is part of the same loading batch.
**How to avoid:** Use the Boot -> Preloader two-scene chain. Boot loads ONLY the loading screen assets (or use Phaser graphics primitives that need no assets). Preloader then has access to those assets to display while loading everything else.
**Warning signs:** Blank screen for several seconds before content appears. Progress bar only appears when loading is nearly complete.
**Confidence:** HIGH -- standard Phaser pattern.

### Pitfall 3: TileSprite Parallax Looks Blurry in WebGL

**What goes wrong:** Parallax TileSprite layers look anti-aliased/blurry even with `pixelArt: true` enabled globally.
**Why it happens:** TileSprite uses GL_REPEAT for seamless wrapping, which requires power-of-two texture dimensions. Non-POT textures are internally upscaled to POT, rendered, then downscaled back -- this process introduces bilinear interpolation that blurs pixel art.
**How to avoid:** Ensure ALL TileSprite textures have power-of-two dimensions (e.g., 256x128, 512x256). Pad textures to the nearest POT size if needed. Alternatively, use regular Image objects with `setScrollFactor()` instead of TileSprite for non-repeating parallax layers.
**Warning signs:** TileSprite layers look softer than regular Image layers in the same scene.
**Confidence:** HIGH -- verified in official Phaser TileSprite docs: "If you provide a NPOT texture to a TileSprite, it will generate a POT sized canvas and draw your texture to it, scaled up to the POT size."

### Pitfall 4: Frame Rate Drops When Tab Loses Focus

**What goes wrong:** When the player switches browser tabs and comes back, the game stutters or attempts to "catch up" with a huge delta spike.
**Why it happens:** `requestAnimationFrame` is throttled or paused when the tab is backgrounded. When the tab regains focus, the accumulated delta can be enormous, causing physics and animations to jump forward.
**How to avoid:** Phaser handles this via the `fps.panicMax` config (default: 120). After a large delta spike (like returning from background), Phaser discards the spike and resumes smoothly. The `smoothStep: true` config (default) also helps by averaging deltas over `deltaHistory` frames. No custom code needed -- just verify these defaults are not overridden.
**Warning signs:** Jerky movement after alt-tabbing back to the game.
**Confidence:** HIGH -- Phaser handles this automatically with default config.

### Pitfall 5: Memory Leaks from Undestroyed Scene Resources

**What goes wrong:** Transitioning between scenes (e.g., restarting from Preloader) without properly cleaning up leaves orphaned event listeners, graphics objects, and textures in memory.
**Why it happens:** Phaser scenes can be started, stopped, restarted, and run in parallel. Each scene lifecycle creates graphics objects, event listeners, and references. If listeners on shared objects (like EventBus) are not removed on shutdown, they accumulate.
**How to avoid:**
- Always listen for `Phaser.Scenes.Events.SHUTDOWN` and remove all custom event listeners
- Destroy graphics objects in cleanup
- Use `this.events.on()` for scene-scoped events (auto-cleaned) vs `EventBus.on()` (must be manually cleaned)
**Warning signs:** Console warnings about duplicate listeners. Memory usage climbing after scene restarts.
**Confidence:** HIGH -- verified in Phaser Events docs and Ourcade event bus tutorial.

### Pitfall 6: Wrong Game Resolution for Pixel Art

**What goes wrong:** The game is configured at 1920x1080 (full HD) but the pixel art is designed for 320x180 or 480x270. Result: either tiny sprites on a huge canvas, or art that must be pre-scaled (losing the pixel art aesthetic).
**Why it happens:** Developers think in display resolution rather than "native pixel art resolution scaled up."
**How to avoid:** Choose a game resolution that matches the intended pixel art native resolution. For this project, recommended approach:
- **Option A (recommended):** Set game size to the native pixel art resolution (e.g., 480x270 or 320x180) and let the Scale Manager upscale to fill the screen. This keeps all coordinates in pixel-art-native space.
- **Option B:** Set game size to a multiple of native resolution (e.g., 960x540 = 2x of 480x270) and render art at 2x scale.
- Use `Phaser.Scale.FIT` with `autoCenter: CENTER_BOTH` to fill the viewport while preserving aspect ratio.
**Warning signs:** Art looks tiny, coordinates feel wrong, mixing high-res and low-res assets looks jarring.
**Confidence:** HIGH -- standard pixel art game development practice.

## Code Examples

### Complete Game Config for Pixel Art Adventure Game

```typescript
// Source: Phaser Config docs + Rex Notes + MDN pixel art guide
// Verified against: docs.phaser.io/api-documentation/class/core-config,
//   rexrainbow.github.io/phaser3-rex-notes/docs/site/game/

import Phaser from 'phaser';
import { Boot } from './scenes/Boot';
import { Preloader } from './scenes/Preloader';
import { Game } from './scenes/Game';

const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,

    // Native pixel art resolution (will be upscaled by Scale Manager)
    width: 960,
    height: 540,

    parent: 'game-container',
    backgroundColor: '#1a1a2e',

    render: {
        pixelArt: true,       // Sets antialias:false, roundPixels:true,
                              // nearest-neighbor texture filtering
    },

    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
    },

    fps: {
        target: 60,
        smoothStep: true,     // Delta smoothing for consistent game speed
        // panicMax: 120,     // Default: recover from tab-backgrounding
        // deltaHistory: 10,  // Default: smooth over 10 frames
    },

    scene: [Boot, Preloader, Game],
};

export default new Phaser.Game(config);
```

### Complete Preloader Scene with Progress Bar

```typescript
// Source: Phaser Loader docs (docs.phaser.io/phaser/concepts/loader)
// + GameDev Academy preloader tutorial

export class Preloader extends Phaser.Scene {
    constructor() {
        super('Preloader');
    }

    preload() {
        const { width, height } = this.cameras.main;

        // Background box for progress bar
        const progressBox = this.add.graphics();
        progressBox.fillStyle(0x333333, 0.8);
        progressBox.fillRect(width / 2 - 160, height / 2 - 25, 320, 50);

        // Progress bar (fills as loading progresses)
        const progressBar = this.add.graphics();

        // Loading text
        const loadingText = this.add.text(width / 2, height / 2 - 50, 'Loading...', {
            fontFamily: 'monospace',
            fontSize: '16px',
            color: '#ffffff',
        }).setOrigin(0.5);

        // Percentage text
        const percentText = this.add.text(width / 2, height / 2, '0%', {
            fontFamily: 'monospace',
            fontSize: '14px',
            color: '#ffffff',
        }).setOrigin(0.5);

        // Update progress bar on each file loaded
        this.load.on('progress', (value: number) => {
            progressBar.clear();
            progressBar.fillStyle(0xffffff, 1);
            progressBar.fillRect(width / 2 - 150, height / 2 - 15, 300 * value, 30);
            percentText.setText(`${Math.round(value * 100)}%`);
        });

        // Clean up when loading complete
        this.load.on('complete', () => {
            progressBar.destroy();
            progressBox.destroy();
            loadingText.destroy();
            percentText.destroy();
        });

        // --- Queue ALL game assets below ---
        this.load.image('bg-sky', 'assets/backgrounds/sky.png');
        this.load.image('bg-mountains', 'assets/backgrounds/mountains.png');
        this.load.image('bg-trees', 'assets/backgrounds/trees.png');
        this.load.image('bg-ground', 'assets/backgrounds/ground.png');
        // Placeholder for future phases:
        // this.load.spritesheet('player', 'assets/sprites/player.png', { frameWidth: 32, frameHeight: 48 });
        // this.load.json('scene-data', 'assets/data/scenes/dark_forest.json');
    }

    create() {
        // Transition to the main game scene
        this.scene.start('Game');
    }
}
```

### Complete Parallax Scrolling Scene

```typescript
// Source: Ourcade parallax tutorial + Phaser Camera/ScrollFactor docs
// Two approaches shown: Image-based (non-repeating) and TileSprite-based (repeating)

export class Game extends Phaser.Scene {
    private bgSkyTile!: Phaser.GameObjects.TileSprite;
    private bgCloudsTile!: Phaser.GameObjects.TileSprite;

    constructor() {
        super('Game');
    }

    create() {
        const { width, height } = this.cameras.main;
        const worldWidth = 3840; // World is wider than viewport for scrolling

        // --- APPROACH 1: Image layers with scrollFactor (non-repeating art) ---
        // Background sky (fixed, doesn't scroll)
        this.add.image(0, 0, 'bg-sky')
            .setOrigin(0, 0)
            .setScrollFactor(0);

        // Distant mountains (very slow parallax)
        this.add.image(0, 0, 'bg-mountains')
            .setOrigin(0, 0)
            .setScrollFactor(0.1);

        // Mid-ground trees (medium parallax)
        this.add.image(0, 0, 'bg-trees')
            .setOrigin(0, 0)
            .setScrollFactor(0.4);

        // Foreground ground (moves with camera)
        this.add.image(0, 0, 'bg-ground')
            .setOrigin(0, 0)
            .setScrollFactor(1);

        // --- APPROACH 2: TileSprite for repeating textures ---
        // Note: Textures MUST be power-of-two dimensions!
        // this.bgSkyTile = this.add.tileSprite(0, 0, width, height, 'bg-sky-tile')
        //     .setOrigin(0, 0)
        //     .setScrollFactor(0);
        // this.bgCloudsTile = this.add.tileSprite(0, 0, width, height, 'bg-clouds-tile')
        //     .setOrigin(0, 0)
        //     .setScrollFactor(0);

        // Camera setup
        this.cameras.main.setBounds(0, 0, worldWidth, height);
        this.cameras.main.setRoundPixels(true);

        // Temporary: keyboard-driven camera scroll for testing
        this.input.keyboard?.on('keydown', (event: KeyboardEvent) => {
            if (event.key === 'ArrowRight') {
                this.cameras.main.scrollX += 4;
            } else if (event.key === 'ArrowLeft') {
                this.cameras.main.scrollX = Math.max(0, this.cameras.main.scrollX - 4);
            }
        });
    }

    update(_time: number, _delta: number) {
        // For TileSprite approach: manually scroll based on camera position
        // if (this.bgSkyTile) {
        //     this.bgSkyTile.tilePositionX = this.cameras.main.scrollX * 0.05;
        // }
        // if (this.bgCloudsTile) {
        //     this.bgCloudsTile.tilePositionX = this.cameras.main.scrollX * 0.15;
        // }
    }
}
```

### CSS for Pixel-Perfect Canvas Display

```css
/* Source: MDN Crisp pixel art look guide
   (developer.mozilla.org/en-US/docs/Games/Techniques/Crisp_pixel_art_look) */

#game-container {
    width: 100vw;
    height: 100vh;
    display: flex;
    justify-content: center;
    align-items: center;
    background: #000;
    overflow: hidden;
}

#game-container canvas {
    /* CRITICAL for pixel art: prevent browser smoothing */
    image-rendering: pixelated;
    image-rendering: crisp-edges;  /* Firefox fallback */
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `roundPixels: false` default | `roundPixels: true` default | Phaser v3.70.0 (2024) | Pixel art games no longer need to manually set roundPixels -- it's on by default. But `pixelArt: true` should still be set for the full suite of pixel art settings. |
| Manual rAF loop in scene update | Phaser TimeStep with smoothDelta | Phaser v3.60.0 (2023) | Delta smoothing (`smoothStep`) was added/improved, reducing frame jitter. The `fps.limit` config was also added for capping frame rate. |
| Separate config for Canvas vs WebGL pixel art | Single `pixelArt: true` flag | Phaser v3.x (long-standing) | One flag handles both renderers correctly. No need to write renderer-specific code. |
| Custom preloader with manual XMLHttpRequest | Phaser Loader with `progress`/`complete` events | Phaser v3.0+ | Built-in loader handles all file types, progress tracking, caching, and scene integration. |

**Deprecated/outdated:**
- Phaser v2 `game.stage.disableVisibilityChange` -- replaced by automatic pause/resume in v3
- Manual `window.devicePixelRatio` handling in game config -- Phaser Scale Manager handles this automatically in FIT mode
- `antialias: false` as the primary pixel art setting -- use `pixelArt: true` instead (it sets antialias and more)

## Open Questions

1. **Optimal native resolution for pixel art adventure game**
   - What we know: Classic adventure games used 320x200 or 320x240. Modern pixel art games often use 480x270 (scales exactly to 1920x1080) or 384x216. The game width needs to be wide enough for parallax scrolling scenes.
   - What's unclear: The exact native resolution depends on the pixel art style and scene composition, which will be determined during art pipeline work.
   - Recommendation: Start with 960x540 as the game config resolution (2x of 480x270). This gives clean 2x scaling to 1920x1080 and 4x would be 3840x2160 (4K). Pixel art assets should be authored at 480x270 native and loaded at that resolution. Can be adjusted before significant art production in Phase 8.

2. **WebGL vs Canvas renderer for pixel art**
   - What we know: `Phaser.AUTO` prefers WebGL. WebGL is faster but has the TileSprite POT texture requirement. Canvas mode avoids the POT issue but is slower.
   - What's unclear: Whether the adventure game will be complex enough for WebGL to matter. Scene backgrounds are static; there's no intensive particle system or physics.
   - Recommendation: Use `Phaser.AUTO` (WebGL preferred). The POT constraint is manageable with discipline. If WebGL causes unexpected issues, `Phaser.CANVAS` is a safe fallback with no code changes needed.

3. **How many parallax layers are appropriate**
   - What we know: 3-5 layers is standard. The Ourcade tutorial uses 5 layers. More layers = more depth but more art production and more draw calls.
   - What's unclear: The exact number depends on art style and scene composition.
   - Recommendation: Plan for 3-4 parallax layers per scene (sky, distant, mid-ground, foreground). Implement the system to support any number of layers data-driven from scene definitions.

## Sources

### Primary (HIGH confidence)
- [Phaser Config API docs](https://docs.phaser.io/api-documentation/class/core-config) -- pixelArt, antialias, roundPixels, render config
- [Phaser TimeStep docs](https://docs.phaser.io/api-documentation/class/core-timestep) -- game loop, delta smoothing, fps config
- [Phaser Loader docs](https://docs.phaser.io/phaser/concepts/loader) -- asset loading, progress events, scene lifecycle
- [Phaser Scene docs](https://docs.phaser.io/phaser/concepts/scenes) -- scene lifecycle, states, multi-scene architecture
- [Phaser Camera docs](https://docs.phaser.io/phaser/concepts/cameras) -- setBounds, scrolling, roundPixels, startFollow
- [Phaser TileSprite docs](https://docs.phaser.io/phaser/concepts/gameobjects/tile-sprite) -- TileSprite creation, tilePosition, POT requirement
- [Phaser Scale Manager docs](https://docs.phaser.io/phaser/concepts/scale-manager) -- FIT mode, autoCenter, responsive scaling
- [Phaser Events docs](https://docs.phaser.io/phaser/concepts/events) -- EventEmitter API, cleanup practices
- [Phaser ScrollFactor docs](https://photonstorm.github.io/phaser3-docs/Phaser.GameObjects.Components.ScrollFactor.html) -- scroll factor values and behavior
- [MDN: Crisp pixel art look](https://developer.mozilla.org/en-US/docs/Games/Techniques/Crisp_pixel_art_look) -- CSS image-rendering, canvas scaling
- [Phaser template-vite-ts](https://github.com/phaserjs/template-vite-ts) -- official project template structure
- [Rex Notes: Game config](https://rexrainbow.github.io/phaser3-rex-notes/docs/site/game/) -- comprehensive config property reference

### Secondary (MEDIUM confidence)
- [Ourcade: Parallax Scrolling in Phaser 3](https://blog.ourcade.co/posts/2020/add-pizazz-parallax-scrolling-phaser-3/) -- parallax implementation pattern with scroll factor
- [Ourcade: Cross-Scene Communication](https://blog.ourcade.co/posts/2020/phaser3-how-to-communicate-between-scenes/) -- EventBus singleton pattern
- [GameDev Academy: Preloading Screen](https://gamedevacademy.org/creating-a-preloading-screen-in-phaser-3/) -- progress bar implementation
- [Phaser Discourse: TileSprites with pixelArt](https://phaser.discourse.group/t/tilesprites-still-smooth-with-pixelart-true/4212) -- POT texture requirement for TileSprites
- [Phaser Discourse: Scale Manager for pixel art](https://phaser.discourse.group/t/help-with-scaling-for-pixel-art/4782) -- pixel art scaling approaches

### Prior Project Research (HIGH confidence)
- `.planning/research/STACK.md` -- Phaser 3.90.0, TypeScript 5.7, Vite 7, official template recommended
- `.planning/research/ARCHITECTURE.md` -- 5-layer architecture, event bus pattern, data-driven scenes, Boot/Preloader scene chain
- `.planning/research/PITFALLS.md` -- Canvas pixel art rendering (Pitfall 6), memory leaks from scene transitions (Pitfall 10), audio autoplay (Pitfall 7)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- Phaser 3.90.0, TypeScript, Vite are verified and well-documented; the official template exists
- Architecture: HIGH -- Boot/Preloader/Game scene chain, EventBus singleton, and parallax scroll factor are canonical Phaser patterns
- Pitfalls: HIGH -- Pixel art rendering, TileSprite POT requirement, and event listener cleanup are documented in official Phaser docs and MDN

**Research date:** 2026-02-20
**Valid until:** 2026-04-20 (60 days -- Phaser 3.90 is the final v3 release; patterns are stable)
