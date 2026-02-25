---
phase: 06-npcs-and-dialogue
plan: 01
subsystem: dialogue
tags: [inkjs, ink, dialogue, npc, narrative, typewriter]

# Dependency graph
requires:
  - phase: 04-puzzle-engine-and-game-loop
    provides: GameState singleton, NarratorDisplay, save/load system
provides:
  - NpcDefinition and RoomNpcData type interfaces
  - DialogueManager with inkjs Story lifecycle and EXTERNAL function binding
  - DialogueUI for speaker-attributed lines and numbered choices via NarratorDisplay
  - GameStateData.dialogueStates for dialogue persistence across save/load
affects: [06-npcs-and-dialogue, 08-demo-chapter]

# Tech tracking
tech-stack:
  added: [inkjs@2.4.0]
  patterns: [ink-story-per-npc, external-function-binding, state-save-restore]

key-files:
  created:
    - src/game/types/NpcData.ts
    - src/game/dialogue/DialogueManager.ts
    - src/game/dialogue/DialogueUI.ts
  modified:
    - src/game/state/GameStateTypes.ts
    - src/game/state/GameState.ts
    - package.json

key-decisions:
  - "Named import { Story } from 'inkjs' -- verified constructor is available as named export"
  - "Map<string,string> for internal npcStoryStates, Record<string,string> for serialization interface -- Map for runtime, plain object for JSON"
  - "DialogueUI reuses NarratorDisplay with 50-char typewrite threshold -- matches existing RoomScene pattern"

patterns-established:
  - "EXTERNAL function binding pattern: bind all ink external functions before first Continue() call"
  - "Per-NPC state save/restore: Story.state.toJson() / Story.state.LoadJson() keyed by NPC id"
  - "DialogueUI adapter pattern: format dialogue for NarratorDisplay without creating new DOM elements"

requirements-completed: [NPC-01, NPC-03, NARR-07]

# Metrics
duration: 2min
completed: 2026-02-21
---

# Phase 6 Plan 01: Dialogue Engine Foundation Summary

**inkjs integration with DialogueManager bridging ink Story instances to GameState via 7 EXTERNAL functions, DialogueUI for speaker-attributed text and numbered choices through NarratorDisplay**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-21T14:17:52Z
- **Completed:** 2026-02-21T14:20:08Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- Installed inkjs@2.4.0 and created NpcDefinition/RoomNpcData type interfaces for NPC data
- Built DialogueManager with per-NPC Story lifecycle, EXTERNAL function binding (hasItem, hasFlag, setFlag, addItem, removeItem, visitedRoom, getDeathCount), and state save/restore
- Extended GameStateData with dialogueStates field for dialogue persistence across save/load
- Created DialogueUI adapter that formats speaker-attributed dialogue lines and numbered choices through existing NarratorDisplay

## Task Commits

Each task was committed atomically:

1. **Task 1: Install inkjs and create NPC types and DialogueManager** - `a98ff8b` (feat)
2. **Task 2: Extend GameStateData for dialogue persistence and create DialogueUI** - `39f3bcb` (feat)

## Files Created/Modified
- `src/game/types/NpcData.ts` - NpcDefinition and RoomNpcData interfaces for NPC data structures
- `src/game/dialogue/DialogueManager.ts` - inkjs Story management with EXTERNAL function binding and per-NPC state save/restore
- `src/game/dialogue/DialogueUI.ts` - Dialogue formatting adapter for NarratorDisplay (speaker lines, choices, tag parsing)
- `src/game/state/GameStateTypes.ts` - Added dialogueStates field to GameStateData interface and default
- `src/game/state/GameState.ts` - Added getDialogueStates/setDialogueStates methods
- `package.json` - Added inkjs@2.4.0 dependency

## Decisions Made
- Used named import `{ Story } from 'inkjs'` after verifying constructor is available (not types-only import)
- Internal Map<string,string> for npcStoryStates with Record<string,string> serialization interface for JSON compatibility
- DialogueUI reuses existing NarratorDisplay 50-char threshold for typewrite vs instant display

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- DialogueManager ready for NPC sprite integration (06-02)
- DialogueUI ready to be connected to player input for choice selection (06-02/06-03)
- EXTERNAL function bindings provide full ink-to-GameState bridge for authoring NPC dialogue scripts
- GameStateData persistence ready for save/load integration

## Self-Check: PASSED

- All 5 source files verified present
- Both task commits (a98ff8b, 39f3bcb) verified in git log
- dialogueStates field confirmed in GameStateTypes.ts (2 occurrences: interface + default)

---
*Phase: 06-npcs-and-dialogue*
*Completed: 2026-02-21*
