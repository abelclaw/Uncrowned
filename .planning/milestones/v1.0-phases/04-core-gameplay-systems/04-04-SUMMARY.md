---
phase: 04-core-gameplay-systems
plan: 04
subsystem: ui
tags: [phaser, scenes, menu, death-screen, overlay, game-flow]

# Dependency graph
requires:
  - phase: 04-01
    provides: GameState singleton and SaveManager for state persistence
provides:
  - MainMenuScene with New Game, Continue, and Load Game options
  - DeathScene overlay with narrator text and auto-save retry
affects: [04-05-scene-wiring, 05-llm-parser]

# Tech tracking
tech-stack:
  added: []
  patterns: [phaser-text-menu-with-hover, overlay-scene-pattern, save-slot-sub-menu]

key-files:
  created:
    - src/game/scenes/MainMenuScene.ts
    - src/game/scenes/DeathScene.ts
  modified: []

key-decisions:
  - "Phaser text objects for menu (not HTML) -- consistent with research recommendation for full-screen scenes"
  - "DeathScene as overlay via scene.launch (not scene.start) -- RoomScene stays loaded underneath"
  - "Direct deathCount mutation via cast rather than adding GameState method -- minimal change, revisit if needed"
  - "Load Game sub-menu destroys main menu items and rebuilds on Back -- simple state management without complexity"

patterns-established:
  - "Menu hover pattern: pointerover/pointerout with color change + setScale(1.05)"
  - "Overlay scene pattern: rectangle with alpha + setInteractive() captures clicks"
  - "Scene data interface pattern: exported interface for create() data argument"

requirements-completed: [UI-05, UI-06, DEATH-05]

# Metrics
duration: 1min
completed: 2026-02-21
---

# Phase 4 Plan 4: MainMenuScene and DeathScene Summary

**MainMenuScene with title/continue/load-game flow and DeathScene overlay with narrator death text, death counter, and auto-save retry**

## Performance

- **Duration:** 1 min
- **Started:** 2026-02-21T05:04:31Z
- **Completed:** 2026-02-21T05:05:54Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- MainMenuScene renders title screen with New Game (always), Continue (when auto-save exists), and Load Game (slot selection sub-menu)
- DeathScene overlays RoomScene with dark background, death title, death count, narrator text, and Try Again button
- Try Again increments death count, loads auto-save, and restarts RoomScene at saved room
- Both scenes ready for registration in main.ts and wiring into RoomScene (Plan 05)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create MainMenuScene with New Game, Continue, and Load options** - `6592c72` (feat)
2. **Task 2: Create DeathScene overlay with narrator text and retry** - `7c5f8b3` (feat)

## Files Created/Modified
- `src/game/scenes/MainMenuScene.ts` - Title screen scene with menu options, hover effects, and save slot sub-menu
- `src/game/scenes/DeathScene.ts` - Death overlay scene with narrator text, death count display, and retry logic

## Decisions Made
- Used Phaser text objects for all menu rendering (not HTML) per research recommendation for full-screen scenes
- DeathScene launched as overlay (scene.launch) so RoomScene stays loaded underneath for visual continuity
- Direct deathCount mutation via type cast rather than adding a new GameState method -- keeps change minimal and focused
- Load Game sub-menu uses destroy/rebuild pattern for simplicity over show/hide

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Removed unused SaveSlotInfo import**
- **Found during:** Task 1 (MainMenuScene)
- **Issue:** Imported SaveSlotInfo type but never referenced it directly, causing TS6133 unused error
- **Fix:** Removed the unused type import
- **Files modified:** src/game/scenes/MainMenuScene.ts
- **Verification:** `npx tsc --noEmit` passes clean
- **Committed in:** 6592c72 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Trivial import cleanup. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Both scenes export correct Phaser scene keys ('MainMenuScene', 'DeathScene')
- Ready for Plan 05 to register in main.ts scene array and wire into RoomScene transitions
- Preloader currently chains to RoomScene directly; Plan 05 will redirect to MainMenuScene

## Self-Check: PASSED

- FOUND: src/game/scenes/MainMenuScene.ts
- FOUND: src/game/scenes/DeathScene.ts
- FOUND: commit 6592c72
- FOUND: commit 7c5f8b3

---
*Phase: 04-core-gameplay-systems*
*Completed: 2026-02-21*
