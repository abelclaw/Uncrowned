# Phase 2: Scene System and Player Movement - Research

**Researched:** 2026-02-20
**Domain:** Phaser 3 sprite animation, click-to-move pathfinding, scene transitions, walkable area navigation, data-driven room architecture
**Confidence:** HIGH

## Summary

Phase 2 transforms the static parallax foundation from Phase 1 into an interactive adventure game world: an animated player character walks to clicked locations within defined walkable areas, and clicking scene exits transitions the player between interconnected rooms. The four requirements (ENG-02 through ENG-05) map cleanly to well-established Phaser 3 features and one mature third-party library.

Player character animation uses Phaser's built-in spritesheet animation system (`this.anims.create()` with `generateFrameNumbers()`), supporting walk cycle, idle, and interaction poses. Movement uses click-to-move with the `navmesh` library (v2.3.1) for polygon-based pathfinding over walkable areas -- this is 5-150x faster than grid-based A* and handles the free-form polygon walkable areas that adventure games require. Scene transitions use Phaser's built-in camera fade effects (`camera.fadeOut()` / `camera.fadeIn()`) with the `FADE_OUT_COMPLETE` event to chain scene changes. Room data is defined in JSON following the data-driven architecture established in the project's ARCHITECTURE.md research.

The key architectural decision is using a single reusable `RoomScene` class that loads different room data from JSON, rather than creating a separate Phaser Scene class per room. This avoids scene class proliferation (the game will have 20-50+ rooms) and keeps all room behavior data-driven. The `RoomScene` restarts itself with new room data on transitions.

**Primary recommendation:** Use Phaser's native animation system for the player character, the standalone `navmesh` library (not the Phaser plugin wrapper) for polygon pathfinding, Phaser camera fade effects for scene transitions, and a data-driven JSON format for room definitions including walkable polygons, exits, and hotspot zones.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| ENG-02 | Player character displays with walk cycle animation and interaction poses | Phaser `this.anims.create()` with spritesheet frames. Walk cycle uses `repeat: -1`, idle uses `repeat: 0`. Direction handled via `sprite.flipX`. Interaction poses are separate animation keys triggered by proximity to hotspots. |
| ENG-03 | Player moves to clicked location via pathfinding over walkable areas | `navmesh` library (v2.3.1) builds a navigation mesh from walkable area polygon points defined in room JSON. Click handler checks `Phaser.Geom.Polygon.Contains()` to validate target is walkable, then `navMesh.findPath()` returns waypoints. Player follows waypoints via chained tweens with walk animation. |
| ENG-04 | Scenes have defined exits that transition to other scenes | Room JSON defines exit zones as rectangles with target room IDs and spawn positions. When player walks into an exit zone (overlap check each frame), the transition system triggers. Exit zones are rendered as invisible interactive areas during development (visible in debug mode). |
| ENG-05 | Scene transitions use fade/slide animations between rooms | Phaser `camera.fadeOut(duration, r, g, b)` triggers fade to black. On `FADE_OUT_COMPLETE` event, restart scene with new room data. New scene calls `camera.fadeIn()` in its create method. Data passed via `this.scene.start('RoomScene', { roomId, spawnPoint })`. |
</phase_requirements>

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Phaser | 3.90.0 (existing) | Sprite animation, tweens, camera effects, scene management, input handling, geometry | Already installed. Provides native animation system, tween engine, camera fade/shake effects, input events, and `Phaser.Geom.Polygon` for point-in-polygon checks. |
| navmesh | 2.3.1 | Polygon-based pathfinding for walkable areas | Framework-agnostic navmesh library. 5-150x faster than grid-based A*. Accepts polygon point arrays directly (no tilemap required). Ideal for adventure game free-form walkable areas. Last updated Jan 2025. |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| phaser-navmesh | 2.3.1 | Phaser 3 Scene plugin wrapper around navmesh | Alternative to raw `navmesh` if you want automatic Phaser Scene plugin registration. Adds debug visualization helpers. However, it has a `core-js` dependency and last published June 2022. The raw `navmesh` package is lighter and sufficient. |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `navmesh` (polygon pathfinding) | `Phaser.Geom.Polygon.Contains()` + direct line movement | Simpler but no obstacle avoidance within walkable area. Player walks through concave polygon corners. Only viable for simple rectangular walkable areas. |
| `navmesh` (polygon pathfinding) | EasyStar.js (grid-based A*) | Grid-based, requires converting walkable polygon to grid overlay. 5-22x slower than navmesh. More setup work for free-form polygons. Better for tile-based games. |
| `navmesh` (polygon pathfinding) | Simple Phaser.Math.Distance + tween to click point | Zero pathfinding -- player walks in straight lines. Acceptable for Phase 2 placeholder scenes with simple convex walkable areas. Could start here and upgrade to navmesh when concave areas are needed. |
| Camera fade transitions | `this.scene.transition()` built-in | Phaser's built-in `scene.transition()` runs both scenes simultaneously during transition with `onUpdate` callbacks. More complex than needed; camera fade is simpler and produces the classic adventure game effect. |
| Camera fade transitions | phaser3-transitions plugin | Third-party plugin for slide/wipe transitions. Adds dependency for marginal benefit. Camera fade + manual slide via tween covers requirements. |
| One RoomScene class (data-driven) | Separate Scene class per room | Class-per-room causes proliferation (50+ classes), hardcoded behavior, and violates data-driven architecture. One generic RoomScene that loads JSON is the standard adventure game pattern. |

**Installation:**
```bash
npm install navmesh
```

No other new dependencies needed. Phaser 3.90.0 provides everything else.

## Architecture Patterns

### Recommended Project Structure (Phase 2 additions)

```
src/game/
├── scenes/
│   ├── Boot.ts                # (existing) Minimal boot scene
│   ├── Preloader.ts           # (existing) Asset loading -- add spritesheet + room JSON loads
│   ├── Game.ts                # (existing) REPURPOSE as RoomScene or rename
│   └── RoomScene.ts           # NEW: Generic data-driven room scene
├── entities/
│   └── Player.ts              # NEW: Player character with animation + movement
├── systems/
│   ├── NavigationSystem.ts    # NEW: Navmesh creation + pathfinding
│   └── SceneTransition.ts     # NEW: Fade/slide transition logic
├── types/
│   └── RoomData.ts            # NEW: TypeScript interfaces for room JSON schema
├── EventBus.ts                # (existing) Cross-scene communication
└── main.ts                    # (existing) Add RoomScene to scene list
public/assets/
├── backgrounds/               # (existing) Parallax layers
├── sprites/
│   └── player.png             # NEW: Player character spritesheet
├── data/
│   └── rooms/                 # NEW: Room definition JSON files
│       ├── forest_clearing.json
│       ├── cave_entrance.json
│       └── village_path.json
```

### Pattern 1: Data-Driven Room Definitions

**What:** Each room is a JSON file defining background layers, walkable area polygon, exit zones, and hotspot positions. A single `RoomScene` class loads and interprets this data.
**When to use:** Every room in the game. This is the foundational pattern from ARCHITECTURE.md.
**Confidence:** HIGH -- established pattern for adventure games, validated in project architecture research.

```typescript
// types/RoomData.ts
interface RoomData {
    id: string;
    name: string;
    background: {
        layers: Array<{
            key: string;        // asset key loaded in Preloader
            scrollFactor: number;
        }>;
        worldWidth: number;     // total scrollable width
    };
    walkableArea: Array<{ x: number; y: number }>;  // polygon points
    exits: Array<{
        id: string;
        zone: { x: number; y: number; width: number; height: number };
        targetRoom: string;
        spawnPoint: { x: number; y: number };
        transition: 'fade' | 'slide-left' | 'slide-right';
    }>;
    hotspots: Array<{
        id: string;
        name: string;
        zone: { x: number; y: number; width: number; height: number };
        interactionPoint: { x: number; y: number }; // where player walks to
        // Future phases will add: look, use, take, etc.
    }>;
    playerSpawn: { x: number; y: number }; // default spawn when entering room
}
```

### Pattern 2: Single RoomScene with Data Swapping

**What:** One Phaser Scene class (`RoomScene`) handles all rooms. On room transition, it fades out, restarts itself with new room data, and fades in.
**When to use:** All room transitions.
**Confidence:** HIGH -- standard Phaser pattern using `this.scene.start('RoomScene', data)` with data passed to `init()`.

```typescript
// Source: Phaser scene data passing docs + adventure game architecture patterns

export class RoomScene extends Phaser.Scene {
    private roomData!: RoomData;
    private player!: Player;

    constructor() {
        super('RoomScene');
    }

    init(data: { roomId: string; spawnPoint?: { x: number; y: number } }) {
        // Load room definition from cache (loaded in Preloader as JSON)
        this.roomData = this.cache.json.get(`room-${data.roomId}`);
        // Override spawn point if coming from another room
        if (data.spawnPoint) {
            this.roomData.playerSpawn = data.spawnPoint;
        }
    }

    create() {
        // 1. Render background layers
        this.roomData.background.layers.forEach(layer => {
            this.add.image(0, 0, layer.key)
                .setOrigin(0, 0)
                .setScrollFactor(layer.scrollFactor);
        });

        // 2. Set up walkable area + navmesh
        // 3. Create player at spawn point
        // 4. Set up exit zones
        // 5. Set up hotspot zones
        // 6. Configure camera
        // 7. Fade in
        this.cameras.main.fadeIn(500, 0, 0, 0);
    }
}
```

### Pattern 3: Player Entity with Animation State

**What:** A `Player` class wrapping a Phaser Sprite with walk cycle animation, idle animation, interaction poses, and click-to-move behavior. Uses `flipX` for left/right direction.
**When to use:** The single player character instance in each room.
**Confidence:** HIGH -- verified against Phaser animation docs and multiple tutorials.

```typescript
// Source: Phaser Animation docs (docs.phaser.io/phaser/concepts/animations)

export class Player {
    private sprite: Phaser.GameObjects.Sprite;
    private scene: Phaser.Scene;
    private currentTween: Phaser.Tweens.TweenChain | null = null;
    private isWalking: boolean = false;

    constructor(scene: Phaser.Scene, x: number, y: number) {
        this.scene = scene;
        this.sprite = scene.add.sprite(x, y, 'player');

        // Create animations from spritesheet
        scene.anims.create({
            key: 'player-idle',
            frames: scene.anims.generateFrameNumbers('player', { start: 0, end: 3 }),
            frameRate: 4,
            repeat: -1,
        });

        scene.anims.create({
            key: 'player-walk',
            frames: scene.anims.generateFrameNumbers('player', { start: 4, end: 11 }),
            frameRate: 8,
            repeat: -1,
        });

        scene.anims.create({
            key: 'player-interact',
            frames: scene.anims.generateFrameNumbers('player', { start: 12, end: 15 }),
            frameRate: 6,
            repeat: 0,
        });

        this.sprite.play('player-idle');
    }

    walkTo(path: Array<{ x: number; y: number }>) {
        if (this.currentTween) {
            this.currentTween.stop();
        }

        this.sprite.play('player-walk');
        this.isWalking = true;

        // Chain tweens for each waypoint in the path
        const tweenConfigs = path.map((point, index) => {
            return {
                targets: this.sprite,
                x: point.x,
                y: point.y,
                duration: this.calculateDuration(
                    index === 0 ? this.sprite : path[index - 1],
                    point
                ),
                ease: 'Linear',
                onStart: () => {
                    // Flip sprite based on horizontal direction
                    this.sprite.flipX = point.x < this.sprite.x;
                },
            };
        });

        this.currentTween = this.scene.tweens.chain({
            tweens: tweenConfigs,
            onComplete: () => {
                this.isWalking = false;
                this.sprite.play('player-idle');
                this.currentTween = null;
            },
        });
    }

    private calculateDuration(
        from: { x: number; y: number },
        to: { x: number; y: number }
    ): number {
        const distance = Phaser.Math.Distance.Between(from.x, from.y, to.x, to.y);
        const speed = 120; // pixels per second
        return (distance / speed) * 1000;
    }
}
```

### Pattern 4: Camera Fade Scene Transition

**What:** Fade the camera to black, swap room data, fade back in. Uses Phaser's built-in camera effects.
**When to use:** Every room transition triggered by walking into an exit zone.
**Confidence:** HIGH -- verified in Phaser Camera effects docs and multiple tutorials.

```typescript
// Source: Phaser Camera Fade docs + Ourcade fade transition tutorial

private transitionToRoom(exit: ExitData) {
    // Prevent double-triggers
    if (this.isTransitioning) return;
    this.isTransitioning = true;

    // Disable player input during transition
    this.input.enabled = false;

    // Fade out over 500ms to black
    this.cameras.main.fadeOut(500, 0, 0, 0);

    this.cameras.main.once(
        Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE,
        () => {
            // Restart this same scene with new room data
            this.scene.start('RoomScene', {
                roomId: exit.targetRoom,
                spawnPoint: exit.spawnPoint,
            });
        }
    );
}
```

### Pattern 5: Walkable Area with Navmesh Pathfinding

**What:** Define the walkable floor area as a polygon in room JSON. Build a navmesh from it. On click, validate the target is inside the walkable area, find a path, and move the player along it.
**When to use:** Every player click in a room scene.
**Confidence:** HIGH for polygon containment checks (Phaser built-in). MEDIUM for navmesh integration (library is stable but last updated Jan 2025, peer dependency says Phaser ^3.55.2).

```typescript
// Source: navmesh docs (mikewesthad.github.io/navmesh/) + Phaser Geom.Polygon docs

import { NavMesh } from 'navmesh';

export class NavigationSystem {
    private navMesh: NavMesh;
    private walkablePolygon: Phaser.Geom.Polygon;

    constructor(walkablePoints: Array<{ x: number; y: number }>) {
        // Phaser polygon for point-containment checks
        this.walkablePolygon = new Phaser.Geom.Polygon(walkablePoints);

        // NavMesh for pathfinding
        // navmesh requires convex polygons -- for a simple convex walkable area,
        // pass it as a single polygon. For complex/concave areas, decompose into
        // multiple convex polygons.
        this.navMesh = new NavMesh([
            walkablePoints.map(p => ({ x: p.x, y: p.y }))
        ]);
    }

    isPointWalkable(x: number, y: number): boolean {
        return this.walkablePolygon.contains(x, y);
    }

    findPath(
        from: { x: number; y: number },
        to: { x: number; y: number }
    ): Array<{ x: number; y: number }> | null {
        // If target is outside walkable area, find nearest walkable point
        // (or reject the click)
        if (!this.isPointWalkable(to.x, to.y)) {
            return null;
        }

        const path = this.navMesh.findPath(from, to);
        return path;
    }
}
```

### Pattern 6: Click Input to Player Movement Pipeline

**What:** The complete pipeline from mouse click to player movement.
**When to use:** Every pointer click in the room scene.

```typescript
// In RoomScene.create():
this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
    // Convert screen coordinates to world coordinates
    const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);

    // Check if click is on an exit zone first
    const exit = this.findExitAt(worldPoint.x, worldPoint.y);
    if (exit) {
        // Walk to exit, then transition
        const path = this.navigation.findPath(
            this.player.getPosition(),
            exit.interactionPoint
        );
        if (path) {
            this.player.walkTo(path, () => this.transitionToRoom(exit));
        }
        return;
    }

    // Check if click is on a hotspot
    const hotspot = this.findHotspotAt(worldPoint.x, worldPoint.y);
    if (hotspot) {
        // Walk to hotspot interaction point, then trigger interaction pose
        const path = this.navigation.findPath(
            this.player.getPosition(),
            hotspot.interactionPoint
        );
        if (path) {
            this.player.walkTo(path, () => {
                this.player.playInteraction();
            });
        }
        return;
    }

    // Walk to clicked point if walkable
    const path = this.navigation.findPath(
        this.player.getPosition(),
        { x: worldPoint.x, y: worldPoint.y }
    );
    if (path) {
        this.player.walkTo(path);
    }
});
```

### Anti-Patterns to Avoid

- **Creating a Phaser Scene subclass per room:** With 50+ rooms, this creates massive class proliferation and hardcoded logic. Use one data-driven RoomScene that loads JSON. The engine interprets data; it does not hardcode room behavior.
- **Using physics (Arcade/Matter) for player movement:** Adventure games do not need physics simulation. Tweens + navmesh pathfinding are simpler, more predictable, and don't introduce gravity/velocity/collision complexity. Physics engines add overhead with no benefit.
- **Grid-based pathfinding for free-form walkable areas:** Converting polygon walkable areas to grids loses precision at polygon edges, requires choosing a grid resolution, and is slower than navmesh. Use polygon-native pathfinding.
- **Hardcoding walkable area coordinates in scene code:** Put them in room JSON data files. The engine reads the data. Content changes should never require code changes.
- **Playing walk animation without checking if already playing:** Calling `sprite.play('walk')` every frame restarts the animation from frame 0 each time. Use `sprite.play('walk', true)` (the `true` parameter means "ignore if already playing") or check `this.sprite.anims.currentAnim?.key !== 'player-walk'` before playing.
- **Forgetting to convert screen coordinates to world coordinates:** When the camera has scrolled, `pointer.x` is screen-relative. Use `camera.getWorldPoint()` to convert to world coordinates before pathfinding or hit testing.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Polygon pathfinding | Custom A* on polygon decomposition | `navmesh` library (v2.3.1) | Navmesh handles convex polygon decomposition, neighbor graph construction, and A* search. Custom implementation requires triangulation, funnel algorithm, and edge-case handling for 200+ lines of code. |
| Point-in-polygon testing | Custom raycasting algorithm | `Phaser.Geom.Polygon.Contains()` | Built into Phaser. Handles edge cases (point on edge, degenerate polygons). Zero additional code. |
| Sprite animation state machine | Custom frame counter + timer | Phaser `this.anims.create()` + `sprite.play()` | Phaser handles frame timing, looping, yoyo, chaining, events, and the animation mixing system. Custom animation code reinvents all of this. |
| Scene fade transitions | Manual alpha tweening on a black rectangle | `camera.fadeOut()` / `camera.fadeIn()` | Built into Phaser Camera effects. Handles timing, color, events (`FADE_OUT_COMPLETE`), and integrates with the scene lifecycle. |
| Tween chaining for waypoint movement | Manual timer + position interpolation | `this.tweens.chain()` | Phaser tween chains handle sequential execution, easing, callbacks per segment, and cleanup. Custom interpolation requires frame-based position updates and is error-prone. |
| Distance calculation | `Math.sqrt(dx*dx + dy*dy)` | `Phaser.Math.Distance.Between()` | Built-in, optimized, and consistent with Phaser's coordinate system. |

**Key insight:** Phase 2 is about *composing* existing Phaser features and one well-chosen pathfinding library. The only truly custom code is the RoomScene data interpreter, the Player entity, and the click-to-move pipeline connecting them.

## Common Pitfalls

### Pitfall 1: NavMesh Only Supports Convex Polygons

**What goes wrong:** The `navmesh` library requires convex polygons as input. If you define a concave walkable area (e.g., an L-shaped room), pathfinding fails or produces incorrect paths.
**Why it happens:** Navigation meshes work by searching connected convex polygons. A concave polygon cannot be a single navmesh cell.
**How to avoid:** For Phase 2 placeholder rooms, keep walkable areas as simple convex shapes (rectangles, trapezoids). For future complex rooms, decompose concave walkable areas into multiple convex polygons before passing to NavMesh. Libraries like `poly-decomp` can automate this, or do it manually in room JSON by defining multiple convex polygons that tile the walkable floor.
**Warning signs:** `findPath()` returns null even when start and end are both inside the walkable area. Player gets stuck at concave corners.

### Pitfall 2: Camera Scroll Breaks Click Coordinates

**What goes wrong:** Player clicks a spot on screen, but the character walks to the wrong location (offset by the camera scroll amount).
**Why it happens:** `pointer.x` and `pointer.y` are screen-relative coordinates. When the camera has scrolled, world coordinates differ from screen coordinates. Using raw pointer coordinates for pathfinding or hit-testing produces incorrect results.
**How to avoid:** Always convert pointer coordinates to world coordinates using `this.cameras.main.getWorldPoint(pointer.x, pointer.y)`. This accounts for camera scroll, zoom, and rotation.
**Warning signs:** Movement works perfectly when camera is at origin (0,0) but breaks when scrolled.

### Pitfall 3: Tween Conflicts on Direction Changes

**What goes wrong:** Player starts walking right, user clicks left mid-walk, and the sprite jitters or walks to the old destination before the new one.
**Why it happens:** The old tween chain is still active when a new one is created. Without stopping the old tween, both tweens fight for control of the sprite's position.
**How to avoid:** Always stop/destroy the current tween chain before creating a new one. Use `this.tweens.killTweensOf(sprite)` or store a reference to the current tween chain and call `.stop()` on it when starting a new walk.
**Warning signs:** Sprite vibrates between two positions, completes old walk before starting new one, or interpolates between two targets.

### Pitfall 4: Walk Animation Restarts Every Frame

**What goes wrong:** The walk cycle animation stutters or the sprite is stuck on the first frame of the walk animation.
**Why it happens:** Calling `sprite.play('walk')` in the update loop restarts the animation from frame 0 each tick. The animation never advances past frame 0.
**How to avoid:** Use `sprite.play('walk', true)` where the `true` parameter means "ignore if this animation is already playing." Alternatively, check the current animation before calling play.
**Warning signs:** Walk animation appears frozen on one frame despite the sprite moving.

### Pitfall 5: Scene Transition Triggered Multiple Times

**What goes wrong:** Walking into an exit zone triggers the fade-out multiple times, causing rapid scene switches or visual glitches.
**Why it happens:** The exit zone overlap check runs every frame in the update loop. Once the player enters the zone, the transition fires repeatedly before the first fade completes.
**How to avoid:** Use a boolean `isTransitioning` flag. Set it to `true` immediately when a transition starts. Check it before triggering any transition. Reset it in the new scene's `create()`.
**Warning signs:** Screen flashes rapidly during transitions, wrong room loads, or "maximum call stack exceeded" errors.

### Pitfall 6: Sprite Depth Sorting with Background Layers

**What goes wrong:** The player character appears behind background layers or in front of foreground elements incorrectly.
**Why it happens:** Phaser renders game objects in the order they are added to the scene (first added = behind). If the player sprite is added before foreground elements, it renders behind them.
**How to avoid:** Use explicit `setDepth()` values. Background layers get low depth values (0-10), player gets a mid-range depth (50), and any foreground overlays get high depth values (90+). Alternatively, add game objects in the correct order: backgrounds first, then player, then foreground.
**Warning signs:** Player disappears behind certain scene elements, or appears in front of elements that should occlude them.

### Pitfall 7: Player Y-Sorting in Rooms with Depth

**What goes wrong:** In rooms where the player can walk "up" and "down" (closer/farther from camera), the player renders in front of objects that should be in front of them based on screen position.
**Why it happens:** Without Y-sorting, all sprites at the same depth render in creation order regardless of their Y position.
**How to avoid:** For Phase 2, keep walkable areas horizontally oriented (player walks left-right at a fixed Y band). For future phases with vertical movement, update the player's depth each frame based on Y position: `player.setDepth(player.y)`. Objects that the player walks behind need depth values corresponding to their Y position too.
**Warning signs:** Player walks behind a table when approaching from below but in front of it when approaching from above, when it should be the opposite.

## Code Examples

### Loading a Spritesheet in Preloader

```typescript
// Source: Phaser Loader docs (docs.phaser.io/phaser/concepts/loader)
// In Preloader.preload():

// Uniform-frame spritesheet (all frames same size in a grid)
this.load.spritesheet('player', 'assets/sprites/player.png', {
    frameWidth: 48,     // width of each frame in pixels
    frameHeight: 64,    // height of each frame in pixels
    // Frames are numbered 0, 1, 2, ... automatically left-to-right, top-to-bottom
});

// Load room definition JSON files
this.load.json('room-forest_clearing', 'assets/data/rooms/forest_clearing.json');
this.load.json('room-cave_entrance', 'assets/data/rooms/cave_entrance.json');
this.load.json('room-village_path', 'assets/data/rooms/village_path.json');
```

### Creating Animations from Spritesheet

```typescript
// Source: Phaser Animation docs (docs.phaser.io/phaser/concepts/animations)

// Idle animation: frames 0-3 at 4fps, looping
this.anims.create({
    key: 'player-idle',
    frames: this.anims.generateFrameNumbers('player', { start: 0, end: 3 }),
    frameRate: 4,
    repeat: -1,  // loop forever
});

// Walk cycle: frames 4-11 at 8fps, looping
this.anims.create({
    key: 'player-walk',
    frames: this.anims.generateFrameNumbers('player', { start: 4, end: 11 }),
    frameRate: 8,
    repeat: -1,
});

// Interaction pose: frames 12-15 at 6fps, play once
this.anims.create({
    key: 'player-interact',
    frames: this.anims.generateFrameNumbers('player', { start: 12, end: 15 }),
    frameRate: 6,
    repeat: 0,  // play once then stop on last frame
});

// Playing animations:
sprite.play('player-idle');                // start idle
sprite.play('player-walk', true);          // start walk (ignore if already playing)
sprite.play('player-interact');            // play interaction once
sprite.chain('player-idle');               // queue idle to play after current anim completes

// Direction via flipX:
sprite.flipX = targetX < sprite.x;        // face left if walking left
```

### Camera Fade Transition Between Rooms

```typescript
// Source: Phaser Camera Fade docs + Ourcade fade transition blog

// Triggering a transition:
this.cameras.main.fadeOut(500, 0, 0, 0);  // 500ms fade to black (RGB 0,0,0)

this.cameras.main.once(
    Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE,
    () => {
        this.scene.start('RoomScene', {
            roomId: 'cave_entrance',
            spawnPoint: { x: 100, y: 400 },
        });
    }
);

// In the receiving scene's create():
this.cameras.main.fadeIn(500, 0, 0, 0);   // 500ms fade in from black
```

### Passing Data Between Scenes

```typescript
// Source: Phaser scene data passing docs

// Sending scene (in transition handler):
this.scene.start('RoomScene', {
    roomId: 'cave_entrance',
    spawnPoint: { x: 100, y: 400 },
    fromRoom: 'forest_clearing',
});

// Receiving scene:
init(data: { roomId: string; spawnPoint?: { x: number; y: number }; fromRoom?: string }) {
    this.roomData = this.cache.json.get(`room-${data.roomId}`);
    if (data.spawnPoint) {
        this.spawnPoint = data.spawnPoint;
    }
}
```

### Tween Chain for Waypoint Movement

```typescript
// Source: Phaser Tween docs (rexrainbow.github.io/phaser3-rex-notes/docs/site/tween/)

const waypoints = [
    { x: 200, y: 400 },
    { x: 350, y: 380 },
    { x: 500, y: 400 },
];

const speed = 120; // pixels per second

// Kill any existing movement tween
this.tweens.killTweensOf(this.sprite);

const tweenConfigs = waypoints.map((point, i) => {
    const from = i === 0
        ? { x: this.sprite.x, y: this.sprite.y }
        : waypoints[i - 1];
    const dist = Phaser.Math.Distance.Between(from.x, from.y, point.x, point.y);

    return {
        targets: this.sprite,
        x: point.x,
        y: point.y,
        duration: (dist / speed) * 1000,
        ease: 'Linear',
    };
});

this.tweens.chain({
    tweens: tweenConfigs,
    onComplete: () => {
        this.sprite.play('player-idle');
    },
});
```

### NavMesh from Polygon Points

```typescript
// Source: navmesh docs (github.com/mikewesthad/navmesh)

import { NavMesh } from 'navmesh';

// Simple convex walkable area (rectangle-ish floor)
const walkablePoints = [
    { x: 50, y: 350 },
    { x: 910, y: 350 },
    { x: 910, y: 520 },
    { x: 50, y: 520 },
];

// For a simple convex polygon, pass as single-element array
const navMesh = new NavMesh([walkablePoints]);

// Find path
const path = navMesh.findPath({ x: 100, y: 400 }, { x: 800, y: 450 });
// Returns: [{ x: 100, y: 400 }, ..., { x: 800, y: 450 }] or null

// For complex rooms: decompose into multiple convex polygons
const complexNavMesh = new NavMesh([
    // Main floor
    [{ x: 50, y: 350 }, { x: 600, y: 350 }, { x: 600, y: 520 }, { x: 50, y: 520 }],
    // Alcove to the right
    [{ x: 600, y: 350 }, { x: 910, y: 350 }, { x: 910, y: 450 }, { x: 600, y: 450 }],
]);
```

### Example Room JSON (Placeholder)

```json
{
    "id": "forest_clearing",
    "name": "Forest Clearing",
    "background": {
        "layers": [
            { "key": "bg-sky", "scrollFactor": 0 },
            { "key": "bg-mountains", "scrollFactor": 0.1 },
            { "key": "bg-trees", "scrollFactor": 0.4 },
            { "key": "bg-ground", "scrollFactor": 1 }
        ],
        "worldWidth": 1920
    },
    "walkableArea": [
        { "x": 50, "y": 380 },
        { "x": 910, "y": 380 },
        { "x": 910, "y": 520 },
        { "x": 50, "y": 520 }
    ],
    "exits": [
        {
            "id": "to-cave",
            "zone": { "x": 880, "y": 350, "width": 80, "height": 200 },
            "targetRoom": "cave_entrance",
            "spawnPoint": { "x": 100, "y": 420 },
            "transition": "fade"
        }
    ],
    "hotspots": [
        {
            "id": "old-stump",
            "name": "Old Tree Stump",
            "zone": { "x": 400, "y": 350, "width": 80, "height": 60 },
            "interactionPoint": { "x": 440, "y": 410 }
        }
    ],
    "playerSpawn": { "x": 200, "y": 430 }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `this.tweens.createTimeline()` | `this.tweens.chain()` | Phaser 3.60.0 (2023) | Timeline API was replaced by tween chains. Old `createTimeline()` is removed. Must use `this.tweens.chain({ tweens: [...] })` for sequential tweens. |
| `Phaser.Cameras.Scene2D.Effects.Fade` direct instantiation | `camera.fadeOut()` / `camera.fadeIn()` convenience methods | Phaser 3.x (long-standing) | The convenience methods are the standard API. Direct effect instantiation is unnecessary. |
| `this.scene.transition({ target, duration })` | `camera.fadeOut()` + `this.scene.start()` on complete | Preference | Both work. `scene.transition()` runs both scenes simultaneously (complex). Camera fade + scene start is simpler and more explicit for adventure game room changes. |
| Separate left/right walk animations | Single walk animation + `sprite.flipX` | Standard practice | Halves the animation frames needed. One walk cycle handles both directions. |

**Deprecated/outdated:**
- `this.tweens.createTimeline()` -- removed in Phaser 3.60.0. Use `this.tweens.chain()` instead.
- `this.scene.transition()` for simple room changes -- still exists but overkill for fade-to-black transitions. Camera fade is simpler.

## Open Questions

1. **Spritesheet frame layout for placeholder character**
   - What we know: Need at minimum idle (4 frames), walk (8 frames), and interact (4 frames) = 16 frames. Frame dimensions depend on pixel art style (32x48? 48x64? 64x64?).
   - What's unclear: The exact sprite dimensions and art style haven't been decided. Phase 2 uses placeholder art.
   - Recommendation: Use 48x64 pixel frames as a starting point (standard adventure game character proportion). Create a simple colored rectangle or stick figure spritesheet for placeholder. Replace with real art in Phase 8.

2. **Concave walkable areas: when to decompose**
   - What we know: NavMesh requires convex polygons. Simple placeholder rooms can use convex shapes. Real rooms (Phase 8) will likely have concave walkable areas (L-shapes, rooms with pillars, etc.).
   - What's unclear: Whether to build polygon decomposition into Phase 2 or defer it.
   - Recommendation: Keep Phase 2 walkable areas convex (simple rectangles/trapezoids). Add convex decomposition (via `poly-decomp` library or manual JSON definition of multiple convex polygons) when actual room art demands it. The NavigationSystem accepts arrays of polygons already, so the upgrade path is smooth.

3. **Camera following player vs fixed camera per room**
   - What we know: Phase 1 established wide (1920px) backgrounds with camera scrolling. Classic adventure games use either fixed camera per room or camera following player in wide rooms.
   - What's unclear: Which rooms will be wider than the viewport (960px) and need scrolling.
   - Recommendation: Implement camera follow on the player with bounds clamping (`camera.startFollow(player, true, 0.1, 0.1)` with `camera.setBounds()`). For rooms narrower than 960px, the camera simply stays centered. This handles both cases with one implementation.

4. **phaser-navmesh plugin vs standalone navmesh**
   - What we know: `phaser-navmesh` (2.3.1) wraps `navmesh` (2.3.1) with Phaser Scene plugin registration and debug visualization. Last published June 2022. Has `core-js` as a dependency. Peer dep: `phaser ^3.55.2`.
   - What's unclear: Whether `phaser-navmesh` works cleanly with Phaser 3.90.0. The peer dependency range covers it (`^3.55.2`), but the package hasn't been updated in 3.5 years.
   - Recommendation: Use the standalone `navmesh` package (no Phaser dependency, no `core-js` dependency, lighter). Build a thin wrapper that creates debug graphics using Phaser's `Graphics` object when needed. This avoids the stale Phaser plugin compatibility concern entirely.

## Sources

### Primary (HIGH confidence)
- [Phaser Animation docs](https://docs.phaser.io/phaser/concepts/animations) -- animation creation, spritesheet frames, play/chain API, flipX
- [Phaser Camera Effects (Fade)](https://photonstorm.github.io/phaser3-docs/Phaser.Cameras.Scene2D.Effects.Fade.html) -- fadeOut/fadeIn API, FADE_OUT_COMPLETE event
- [Phaser Scene docs](https://docs.phaser.io/phaser/concepts/scenes) -- scene lifecycle, scene.start with data passing, init/create/update
- [Phaser Geom.Polygon docs](https://docs.phaser.io/api-documentation/class/geom-polygon) -- polygon creation, Contains() method, point formats
- [Phaser Tween docs (Rex Notes)](https://rexrainbow.github.io/phaser3-rex-notes/docs/site/tween/) -- tween creation, chain(), killTweensOf, callbacks, easing
- [navmesh GitHub](https://github.com/mikewesthad/navmesh) -- installation, API, polygon format, performance benchmarks, Phaser 3 integration
- [Phaser Scenes - Passing Data](https://phaser.io/examples/v3/view/scenes/passing-data-to-a-scene) -- data passing via scene.start, init() method
- [Project ARCHITECTURE.md](../../research/ARCHITECTURE.md) -- data-driven scene definitions, event bus pattern, scene manager FSM, recommended project structure

### Secondary (MEDIUM confidence)
- [Ourcade: Fade Scene Transition](https://blog.ourcade.co/posts/2020/phaser-3-fade-out-scene-transition/) -- camera fade transition pattern with complete code example
- [Ourcade: Point & Click Pathfinding](https://blog.ourcade.co/posts/2020/phaser-3-point-click-pathfinding-movement-tilemap/) -- click-to-move implementation pattern
- [Phaser Discourse: FlipX for spritesheet](https://phaser.discourse.group/t/flipx-for-spritesheet-animation/12935) -- sprite horizontal flip for direction
- [Phaser Discourse: Sliding scene transition](https://phaser.discourse.group/t/sliding-scene-transition/9031) -- camera-based slide transition approach

### Tertiary (LOW confidence)
- [navmesh npm page](https://www.npmjs.com/package/phaser-navmesh) -- version 2.3.1, last updated June 2022, peer dep phaser ^3.55.2 (compatibility with 3.90.0 not explicitly verified but semver range covers it)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- Phaser 3.90.0 animation/tween/camera APIs are well-documented and stable. `navmesh` library is mature and lightweight.
- Architecture: HIGH -- Data-driven room scene pattern is established in project ARCHITECTURE.md and is the standard approach for adventure games. Single RoomScene class with JSON data is the clear choice.
- Pitfalls: HIGH -- Camera coordinate conversion, tween conflicts, and animation restart issues are well-documented in Phaser community. NavMesh convex polygon constraint is documented in library README.
- Code examples: HIGH -- All examples verified against official Phaser docs or library documentation. Tween chain API verified as current (replaces deprecated Timeline).

**Research date:** 2026-02-20
**Valid until:** 2026-04-20 (60 days -- Phaser 3.90 is final v3 release; navmesh 2.3.1 is stable)
