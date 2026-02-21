# Phase 10: Death Gallery - Research

**Researched:** 2026-02-21
**Domain:** Collectible gallery UI, meta-progression persistence, Phaser scene rendering
**Confidence:** HIGH

## Summary

Phase 10 implements a death collection gallery -- a meta-progression system where players discover and browse all 43 unique deaths across playthroughs. The foundation is already strong: MetaGameState (from Phase 9) provides `recordDeath(deathId): boolean` and `getDeathsDiscovered(): readonly string[]` with independent localStorage persistence (`kqgame-meta`). All 43 deaths already exist in room JSONs with `title` and `narratorText` fields. The main work is: (1) creating a death registry JSON with gallery metadata (categories, hints), (2) building a DeathGalleryScene with a scrollable grid, (3) modifying DeathScene to show discovery counter and "New!" badge, (4) wiring MetaGameState.recordDeath() into the death trigger flow, and (5) adding navigation from MainMenuScene and DeathScene to the gallery.

No new npm dependencies are needed. The entire phase uses existing Phaser 3 scene rendering (text, rectangles, containers) and the MetaGameState singleton. The 43 deaths fit in a 7x7 grid (with 6 empty cells) or a paginated/scrollable layout within the 960x540 canvas. The codebase already has established patterns for overlay scenes (DeathScene), menu items (MainMenuScene), and EventBus communication.

**Primary recommendation:** Build a static death-registry.json first (maps all 43 death IDs to categories, gallery hints, and room names), then create DeathGalleryScene, then modify DeathScene and MainMenuScene for navigation and counter display.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| GALR-01 | Each unique death discovered is recorded in MetaGameState permanently | MetaGameState.recordDeath(deathId) already exists and auto-saves. RoomScene's `triggerDeathHandler` currently does NOT call recordDeath() -- this wiring must be added. The method returns `true` for new deaths (enables "New!" badge). |
| GALR-02 | Death Gallery scene displays grid of all 43 possible deaths (discovered vs locked) | 43 deaths verified across 36 room JSONs. A death-registry.json provides the master list. DeathGalleryScene renders a grid with discovered entries showing title/details and locked entries showing "?" with hint text. Phaser text + rectangle rendering handles this without plugins. |
| GALR-03 | Death Gallery accessible from main menu and death scene | MainMenuScene.createMenuItem() pattern exists. DeathScene needs a "Death Gallery" button alongside "Try Again". Both scenes launch DeathGalleryScene. main.ts needs the scene registered. |
| GALR-04 | Each discovered death entry shows title, narrator text, room name, and category | Death title and narratorText already exist in room JSON DeathDefinition. Room name is in room JSON `name` field. Category must be authored in death-registry.json (not present in existing data). |
| GALR-05 | Locked deaths show cryptic hint about how to discover them | Hints must be authored per death in death-registry.json. Pattern: "Something in the cave entrance is not meant to be consumed..." -- teases without spoiling. 43 hints needed. |
| GALR-06 | Death scene shows "X/43 deaths discovered" counter and "New!" badge for first discoveries | DeathScene.create() currently receives `{ title, narratorText }`. Must be extended to receive deathId for MetaGameState recording. Counter reads MetaGameState.getDeathsDiscovered().length. "New!" badge shown when recordDeath() returns true. |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Phaser | 3.90.0 | Scene rendering, text, rectangles, tweens, input | Already locked in project; all UI built with Phaser scenes |
| MetaGameState | (existing) | Cross-playthrough death persistence | Already implemented in Phase 9 with recordDeath/getDeathsDiscovered |

### Supporting (already in project)
| Library | Version | Purpose | Role in Phase 10 |
|---------|---------|---------|-----------------|
| TypeScript | ~5.7.2 | Type system | DeathRegistryEntry interface, scene data types |
| Vitest | ^4.0.18 | Testing | Death registry loading tests, gallery data logic tests |
| EventBus | (existing) | Cross-scene communication | trigger-death event already wired; may use new death-recorded event |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Pure Phaser text grid | rexUI GridTable plugin | rexUI adds ~200KB bundle for one scene; 43-item grid fits without scrolling in a compact layout; not justified |
| Static death-registry.json | Extract from room JSONs at build time | Build-time extraction avoids data duplication but misses gallery-specific fields (category, hint); a hand-authored registry is better |
| Separate DeathGalleryScene | Modal overlay on MainMenuScene | Dedicated scene is cleaner, follows DeathScene overlay pattern, easier to navigate from multiple entry points |

**Installation:**
```bash
# No new dependencies needed
```

## Architecture Patterns

### Recommended Project Structure
```
public/assets/data/
  death-registry.json        # Master list of all 43 deaths with gallery metadata

src/game/
  scenes/
    DeathGalleryScene.ts     # NEW: Full-screen gallery scene
    DeathScene.ts            # MODIFIED: add counter, "New!" badge, gallery button
    MainMenuScene.ts         # MODIFIED: add "Death Gallery" menu item
  main.ts                    # MODIFIED: register DeathGalleryScene
  scenes/RoomScene.ts        # MODIFIED: call MetaGameState.recordDeath() in death handler
```

### Pattern 1: Death Registry JSON (Static Data)
**What:** A JSON file mapping all 43 death IDs to gallery metadata not present in room JSONs.
**When to use:** When room JSON DeathDefinition has only `title` and `narratorText` but gallery needs `category`, `roomId`, `roomName`, and `galleryHint`.
**Why separate file:** The room JSONs define runtime death behavior (trigger conditions, narrator text). The registry defines gallery presentation (category, hint for locked entries). Different concerns, different files.

```typescript
// Type definition for death-registry.json
interface DeathRegistryEntry {
    id: string;              // Matches deathId in room JSON (e.g., "bee-death")
    roomId: string;          // Room where this death occurs (e.g., "forest_clearing")
    roomName: string;        // Human-readable room name (e.g., "Forest Clearing")
    title: string;           // Duplicated from room JSON for gallery-only access (e.g., "Death by Enthusiasm")
    narratorText: string;    // Duplicated from room JSON for gallery display
    category: string;        // Gallery grouping (e.g., "Nature", "Bureaucracy", "Gravity")
    galleryHint: string;     // Cryptic hint shown when locked (e.g., "Insects have opinions about property rights...")
}

interface DeathRegistry {
    version: 1;
    totalDeaths: number;     // Pre-computed: 43
    deaths: DeathRegistryEntry[];
}
```

**Data duplication rationale:** The gallery scene loads death-registry.json without needing all 36 room JSONs. This is intentional -- the gallery should work from the main menu before any room data is loaded.

### Pattern 2: DeathGalleryScene Layout
**What:** A full-screen Phaser scene showing a grid of death entries.
**When to use:** Launched from MainMenuScene or DeathScene.

```
+--------------------------------------------------+
|          DEATH GALLERY  (12/43 Discovered)        |
+--------------------------------------------------+
|                                                    |
|  [Death by    ] [Death by    ] [Death by    ]     |
|  [Enthusiasm  ] [Curiosity   ] [  ???????   ]     |
|  [forest_clr  ] [cave_entr   ] [hint text   ]     |
|                                                    |
|  [Death by    ] [  ???????   ] [  ???????   ]     |
|  [Poor Nav    ] [hint text   ] [hint text   ]     |
|  [village_pth ] [            ] [            ]     |
|                                                    |
|  ... (scrollable or paginated) ...                |
|                                                    |
+--------------------------------------------------+
|  [ < Page 1 of 5 > ]            [ Back ]          |
+--------------------------------------------------+
```

**Grid math for 960x540 canvas:**
- Card size: ~180x90 pixels (fits title + room name + category)
- Grid: 5 columns x 5 rows = 25 cards per page (2 pages for 43 deaths)
- Alternative: 4 columns x 4 rows = 16 per page (3 pages, more readable)
- Or: 3 columns with scrolling for a detail-card layout showing more text per entry

**Recommendation:** Use a **paginated** approach with 9-12 cards per page (3 columns x 3-4 rows). This gives enough space per card to show title + room name, fits within 960x540 without scrolling complexity, and avoids needing rexUI scroll plugins. Arrow navigation for pages.

### Pattern 3: DeathScene Modification (Counter + Badge)
**What:** Extend DeathScene.create() to show discovery progress and first-discovery animation.
**When to use:** Every time DeathScene launches.

```typescript
// In RoomScene.ts triggerDeathHandler (BEFORE launching DeathScene):
const meta = MetaGameState.getInstance();
const isNewDeath = meta.recordDeath(deathId);  // Record + auto-save
const discovered = meta.getDeathsDiscovered().length;

this.scene.launch('DeathScene', {
    title: deathData.title,
    narratorText: deathData.narratorText,
    deathId: deathId,
    isNewDeath: isNewDeath,
    discoveredCount: discovered,
    totalDeaths: 43,  // Or load from registry
});
```

```typescript
// Extended DeathSceneData interface
export interface DeathSceneData {
    title: string;
    narratorText: string;
    deathId: string;
    isNewDeath: boolean;
    discoveredCount: number;
    totalDeaths: number;
}
```

### Pattern 4: Entry Point Navigation
**What:** DeathGalleryScene is accessible from two places.
**From MainMenuScene:** Add "Death Gallery" as a new menu item between "Load Game" and any future items. Only visible if at least 1 death has been discovered (prevents confusion for brand-new players).
**From DeathScene:** Add a "[ Death Gallery ]" button alongside "[ Try Again ]".

```typescript
// MainMenuScene addition
if (MetaGameState.getInstance().getDeathsDiscovered().length > 0) {
    const galleryText = this.createMenuItem('Death Gallery', 480, y, () => {
        this.scene.start('DeathGalleryScene');
    });
    this.menuItems.push(galleryText);
    y += 50;
}
```

### Anti-Patterns to Avoid
- **Loading all room JSONs for gallery data:** The gallery should not require loading 36 room JSON files. Use a separate death-registry.json that contains all needed display data.
- **Storing death data in GameState save slots:** Deaths are meta-progression (cross-playthrough). MetaGameState already handles this correctly with its own localStorage key. Never store deathsDiscovered in GameStateData.
- **Hard-coding 43 as the total:** Use `deathRegistry.totalDeaths` from the JSON. Future content additions should only need to update the registry file.
- **Complex scroll mechanics:** At 43 items, pagination (2-3 pages) is simpler and more reliable than drag-to-scroll within a Phaser scene. Save scroll complexity for when it is genuinely needed.
- **Canvas-rendered text for long narrator passages:** Death narrator text can be long (40-80 words). If a detail view is needed, keep text within word-wrapped Phaser text objects using the existing monospace font style.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Cross-playthrough persistence | Custom localStorage wrapper | MetaGameState (already exists) | Already tested with 11 tests, handles save/load/reset |
| Grid layout in Phaser | Manual x/y pixel math | Computed grid positions from column/row indices | `x = startX + col * cellWidth`, `y = startY + row * cellHeight` is simple enough without a layout engine |
| Death ID validation | Runtime validation against room JSONs | death-registry.json as single source of truth | Compile-time data, not runtime discovery |
| Menu item hover/click | Custom input handling | Existing `createMenuItem()` pattern from MainMenuScene | Already handles hover color, scale, and click events |

**Key insight:** This phase is primarily a data-authoring and UI-rendering task. The persistence infrastructure (MetaGameState) already exists. The death trigger flow (EventBus + PuzzleEngine) already exists. The gap is: (1) connecting the trigger to MetaGameState.recordDeath(), (2) authoring gallery metadata, and (3) rendering the gallery UI.

## Common Pitfalls

### Pitfall 1: Forgetting to Record Death Before DeathScene Launch
**What goes wrong:** If `recordDeath(deathId)` is called inside DeathScene instead of RoomScene, and the player closes the browser during the death screen, the death is never recorded.
**Why it happens:** It seems logical to record the death where it is displayed.
**How to avoid:** Record the death in RoomScene's `triggerDeathHandler` BEFORE launching DeathScene. This ensures persistence even if the scene never fully renders.
**Warning signs:** Deaths not appearing in gallery after browser crash during death screen.

### Pitfall 2: DeathSceneData Interface Breaking Change
**What goes wrong:** Adding required fields to DeathSceneData breaks any code path that launches DeathScene without the new fields.
**Why it happens:** DeathScene.create() receives untyped `data` parameter from Phaser.
**How to avoid:** Make new fields optional with sensible defaults: `isNewDeath?: boolean`, `discoveredCount?: number`. The scene gracefully degrades if launched without gallery data.
**Warning signs:** TypeScript errors at launch points, or undefined values in DeathScene rendering.

### Pitfall 3: Total Death Count Hardcoded
**What goes wrong:** Hardcoding `43` means adding new deaths requires code changes in multiple places.
**Why it happens:** Quick shortcut during initial implementation.
**How to avoid:** Load total from death-registry.json's `totalDeaths` field. The Preloader loads this JSON once; the value is read from the cache.
**Warning signs:** Gallery showing "X/43" when the actual count has changed.

### Pitfall 4: Gallery Text Overflow
**What goes wrong:** Long death titles or narrator text overflows the grid cell boundaries.
**Why it happens:** Death titles vary from 14 chars ("Death by Irony") to 40 chars ("Death by Gravity (Assisted by Water)").
**How to avoid:** Use Phaser text's `wordWrap` with a fixed width matching cell size. Truncate titles in grid view; show full text in detail view. Measure the longest title and size cells accordingly.
**Warning signs:** Text overlapping adjacent cells, or text running off-screen.

### Pitfall 5: MetaGameState Not Initialized
**What goes wrong:** Calling `MetaGameState.getInstance()` before localStorage is available throws or returns empty data.
**Why it happens:** In test environments or SSR contexts, localStorage may not exist.
**How to avoid:** MetaGameState already handles this gracefully with try/catch in `loadFromStorage()`. Tests already mock localStorage (see MetaGameState.test.ts pattern). No additional work needed, but be aware when writing tests.
**Warning signs:** Gallery always showing 0 deaths in test environment.

### Pitfall 6: Death Registry Out of Sync with Room JSONs
**What goes wrong:** A death ID exists in room JSON but not in death-registry.json (or vice versa).
**Why it happens:** Death content authored in Phase 8 (room JSONs) is separate from gallery metadata authored in Phase 10 (registry).
**How to avoid:** Write a validation script or test that cross-references death IDs between room JSONs and death-registry.json. All 43 IDs must appear in both.
**Warning signs:** Gallery showing unknown deaths, or room deaths not appearing in gallery.

## Code Examples

### Example 1: Death Registry JSON Structure

```json
{
    "version": 1,
    "totalDeaths": 43,
    "deaths": [
        {
            "id": "bee-death",
            "roomId": "forest_clearing",
            "roomName": "Forest Clearing",
            "title": "Death by Enthusiasm",
            "narratorText": "You shove the beehive because... why? What possible good outcome did you envision?...",
            "category": "Nature",
            "galleryHint": "The forest clearing buzzes with potential consequences..."
        },
        {
            "id": "poison-death",
            "roomId": "cave_entrance",
            "roomName": "Cave Entrance",
            "title": "Death by Curiosity",
            "narratorText": "...",
            "category": "Poison",
            "galleryHint": "A mysterious bottle raises the age-old question: to drink, or not to drink?"
        }
    ]
}
```

### Example 2: DeathGalleryScene Paginated Grid

```typescript
// Source: Follows established MainMenuScene / DeathScene patterns
export class DeathGalleryScene extends Phaser.Scene {
    private currentPage: number = 0;
    private readonly COLS = 3;
    private readonly ROWS = 4;
    private readonly PER_PAGE = 12;  // 3 x 4

    constructor() {
        super('DeathGalleryScene');
    }

    create(): void {
        const registry: DeathRegistry = this.cache.json.get('death-registry');
        const discovered = MetaGameState.getInstance().getDeathsDiscovered();

        // Background
        this.add.rectangle(480, 270, 960, 540, 0x1a1a2e);

        // Title with counter
        this.add.text(480, 30, 'DEATH GALLERY', {
            fontFamily: 'monospace', fontSize: '24px', color: '#cc3333',
        }).setOrigin(0.5);

        this.add.text(480, 55, `${discovered.length}/${registry.totalDeaths} Discovered`, {
            fontFamily: 'monospace', fontSize: '14px', color: '#888888',
        }).setOrigin(0.5);

        this.renderPage(registry, discovered);
    }

    private renderPage(registry: DeathRegistry, discovered: readonly string[]): void {
        const startIdx = this.currentPage * this.PER_PAGE;
        const pageDeaths = registry.deaths.slice(startIdx, startIdx + this.PER_PAGE);

        const startX = 100;
        const startY = 90;
        const cellW = 280;
        const cellH = 100;

        pageDeaths.forEach((death, i) => {
            const col = i % this.COLS;
            const row = Math.floor(i / this.COLS);
            const x = startX + col * cellW;
            const y = startY + row * cellH;
            const isDiscovered = discovered.includes(death.id);

            // Cell background
            this.add.rectangle(x + cellW / 2, y + cellH / 2, cellW - 10, cellH - 10,
                isDiscovered ? 0x2a2a3e : 0x1e1e2e).setStrokeStyle(1, 0x444444);

            if (isDiscovered) {
                // Title
                this.add.text(x + 10, y + 10, death.title, {
                    fontFamily: 'monospace', fontSize: '13px', color: '#cc3333',
                    wordWrap: { width: cellW - 30 },
                });
                // Room name + category
                this.add.text(x + 10, y + cellH - 25, `${death.roomName} | ${death.category}`, {
                    fontFamily: 'monospace', fontSize: '10px', color: '#666666',
                });
            } else {
                // Locked: question mark + hint
                this.add.text(x + cellW / 2 - 5, y + 15, '?', {
                    fontFamily: 'monospace', fontSize: '28px', color: '#333333',
                }).setOrigin(0.5, 0);
                this.add.text(x + 10, y + 50, death.galleryHint, {
                    fontFamily: 'monospace', fontSize: '9px', color: '#444444',
                    wordWrap: { width: cellW - 30 },
                });
            }
        });
    }
}
```

### Example 3: RoomScene Death Recording Integration

```typescript
// In RoomScene.ts triggerDeathHandler (modification of existing code):
this.triggerDeathHandler = (deathId: string) => {
    if (this.isTransitioning) return;
    this.isTransitioning = true;

    const deathData = this.roomData.deaths?.[deathId];
    if (!deathData) {
        console.warn(`Death ID "${deathId}" not found in room data`);
        this.isTransitioning = false;
        return;
    }

    // Record death in MetaGameState BEFORE launching death scene
    const meta = MetaGameState.getInstance();
    const isNewDeath = meta.recordDeath(deathId);
    const discoveredCount = meta.getDeathsDiscovered().length;

    // Pause this scene and launch DeathScene as overlay
    this.scene.pause();
    this.textInputBar.hide();
    this.inventoryPanel.hide();
    this.scene.launch('DeathScene', {
        title: deathData.title,
        narratorText: deathData.narratorText,
        deathId: deathId,
        isNewDeath: isNewDeath,
        discoveredCount: discoveredCount,
        totalDeaths: 43,
    } as DeathSceneData);
};
```

### Example 4: "New!" Badge Tween Animation

```typescript
// In DeathScene.create(), after title and narrator text:
if (data.isNewDeath) {
    const badge = this.add.text(480, 95, 'NEW DEATH DISCOVERED!', {
        fontFamily: 'monospace', fontSize: '14px', color: '#ffcc00',
    }).setOrigin(0.5).setAlpha(0).setDepth(1);

    this.tweens.add({
        targets: badge,
        alpha: 1,
        y: badge.y - 10,
        duration: 500,
        ease: 'Back.easeOut',
    });
}

// Discovery counter
if (data.discoveredCount !== undefined) {
    this.add.text(480, 165, `${data.discoveredCount}/${data.totalDeaths} deaths discovered`, {
        fontFamily: 'monospace', fontSize: '12px', color: '#666666',
    }).setOrigin(0.5).setDepth(1);
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Death count only (`deathCount` in GameState) | Death ID tracking (`deathsDiscovered[]` in MetaGameState) | Phase 9 (v2.0) | Enables per-death gallery instead of just a counter |
| Deaths stored in save slots | Deaths in MetaGameState (separate localStorage) | Phase 9 (v2.0) | Deaths persist across new games and save loads |
| No gallery UI | DeathGalleryScene (this phase) | Phase 10 (v2.0) | Players can browse and collect deaths as achievements |

**Already implemented (Phase 9):**
- MetaGameState singleton with `recordDeath()`, `getDeathsDiscovered()`, auto-save
- Separate `kqgame-meta` localStorage key
- Export/import includes MetaGameState data
- 11 passing tests for MetaGameState

**Not yet implemented (this phase):**
- RoomScene calling `MetaGameState.recordDeath()` (wiring gap)
- death-registry.json (gallery metadata authoring)
- DeathGalleryScene (gallery UI)
- DeathScene counter and "New!" badge
- MainMenuScene gallery link

## Death Data Inventory

All 43 deaths verified across 36 room JSONs:

| Act | Deaths | Room Count | Death IDs |
|-----|--------|-----------|-----------|
| 1a (Demo Chapter) | 7 | 7 | bee-death, poison-death, lost-death, drown-death, fall-death, dark-death, stone-touch |
| 1b (The Royal Mess) | 8 | 7 | troll-rage, guard-arrest, portrait-curse, throne-collapse, kitchen-fire, poison-herb, rat-swarm, ghost-wrath |
| 2 (Screaming Caverns) | 16 | 12 | clerk-stamped, mushroom-poison, shelf-collapse, filed-away, boredom-death, drown-river, waterfall-death, forge-burn, guardian-smash, guardian-wrong, echo-scream, stalactite-fall, barrier-zap, balcony-fall, dark-water, paper-cut |
| 3 (Rite of Admin Closure) | 12 | 10 | petrify-touch, petrify-slow, archive-collapse, wizard-trap, wizard-explosion, clock-crush, clock-fall, dungeon-pit, mirror-shatter, rooftop-fall, treasury-trap, rite-fail |

**Suggested death categories** (for gallery grouping, approximately 7-9 categories):

| Category | Deaths | Description |
|----------|--------|-------------|
| Nature | bee-death, mushroom-poison, dark-water, rat-swarm | Antagonizing wildlife or eating things |
| Gravity | fall-death, balcony-fall, rooftop-fall, clock-fall, waterfall-death | Falls from heights or into water |
| Poison | poison-death, poison-herb | Consuming toxic substances |
| Bureaucracy | clerk-stamped, filed-away, boredom-death, paper-cut, rite-fail | Death by paperwork and process |
| Petrification | stone-touch, petrify-touch, petrify-slow | The curse catches up |
| Violence | troll-rage, guard-arrest, ghost-wrath, guardian-smash, guardian-wrong | Provoking powerful beings |
| Recklessness | dark-death, drown-death, drown-river, forge-burn, barrier-zap, kitchen-fire, wizard-explosion | Ignoring obvious danger signs |
| Curiosity | portrait-curse, throne-collapse, shelf-collapse, archive-collapse, wizard-trap, treasury-trap, dungeon-pit, mirror-shatter | Touching/taking things you shouldn't |
| Engineering | clock-crush, echo-scream, stalactite-fall, lost-death | Structural and environmental hazards |

## Testing Strategy

### Unit Tests (Vitest)
- Death registry JSON schema validation (all 43 entries present, no duplicates)
- Cross-reference: every death ID in room JSONs appears in death-registry.json
- MetaGameState.recordDeath() + getDeathsDiscovered() (already tested)
- Gallery data logic: pagination math, discovered/locked filtering

### Integration Points to Verify
- RoomScene triggerDeathHandler calls MetaGameState.recordDeath() before scene launch
- DeathScene renders counter and "New!" badge when data is provided
- DeathScene gracefully handles missing gallery data (backward compatibility)
- DeathGalleryScene loads death-registry.json from Phaser cache
- MainMenuScene shows "Death Gallery" only when deaths > 0

## Open Questions

1. **Detail View for Individual Deaths**
   - What we know: Grid cells can show title + room name. Full narrator text (40-80 words) doesn't fit in a grid cell.
   - What's unclear: Should clicking a discovered death open a detail overlay showing full narrator text? Or is the grid sufficient?
   - Recommendation: Implement a simple detail overlay (dark panel with full text) triggered by clicking a discovered death card. Low effort, high payoff for readability.

2. **Death Category Authoring**
   - What we know: Deaths don't have categories in room JSONs. Categories must be authored.
   - What's unclear: Exact category assignments (the suggested list above is a reasonable starting point).
   - Recommendation: Author categories during death-registry.json creation. The 7-9 categories suggested are thematically coherent with the story bible.

3. **Gallery Sound Effects**
   - What we know: The game has an AudioManager and death sting SFX.
   - What's unclear: Should the gallery have its own ambient sound or card-reveal sound?
   - Recommendation: Reuse `sfx-command-blip` for card selection. No new audio assets needed.

## Sources

### Primary (HIGH confidence)
- MetaGameState.ts (source code) -- recordDeath(), getDeathsDiscovered(), singleton pattern, kqgame-meta key
- DeathScene.ts (source code) -- Current overlay pattern, DeathSceneData interface, Try Again button flow
- MainMenuScene.ts (source code) -- createMenuItem() pattern, menu layout, slot sub-menu pattern
- RoomScene.ts (source code) -- triggerDeathHandler, DeathScene launch flow, EventBus wiring
- RoomData.ts (source code) -- DeathDefinition { title, narratorText }, deaths field on RoomData
- All 36 room JSONs -- 43 deaths verified with titles and narrator text
- Story Bible (story-bible.md) -- Death catalog with all 43 deaths, triggers, acts, narrator themes

### Secondary (MEDIUM confidence)
- Architecture research (ARCHITECTURE.md) -- Death gallery component architecture, anti-patterns
- Stack research (STACK.md) -- No new dependencies needed, pure Phaser + existing systems
- [Phaser 3 RexUI Grid Table](https://rexrainbow.github.io/phaser3-rex-notes/docs/site/ui-gridtable/) -- Reference for scrollable grid patterns (not recommended for this use case due to bundle size)
- [Phaser 3 Scrollable Panel](https://rexrainbow.github.io/phaser3-rex-notes/docs/site/ui-scrollablepanel/) -- Reference for scroll behavior (pagination preferred over scroll for 43 items)

### Tertiary (LOW confidence)
- None -- all findings verified against source code

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- No new dependencies; all patterns exist in codebase
- Architecture: HIGH -- Direct extension of existing DeathScene + MetaGameState patterns
- Pitfalls: HIGH -- Identified from source code analysis of actual integration points
- Data authoring (43 hints + categories): MEDIUM -- Content quality depends on authoring effort

**Research date:** 2026-02-21
**Valid until:** Indefinite (no external dependency version concerns)
