---
status: resolved
trigger: "Player enters the cave and the game keeps going in and out -- a scene transition loop or flicker at the cave entrance."
created: 2026-02-21T00:00:00Z
updated: 2026-02-21T00:05:00Z
---

## Current Focus

hypothesis: CONFIRMED -- Player spawns inside an exit zone when arriving at cave_entrance, causing update() overlap check to immediately trigger a transition back
test: Compare spawn points from neighboring rooms to exit zone rectangles in cave_entrance.json
expecting: Spawn point coordinates fall within an exit zone rectangle
next_action: Fix applied and verified -- archiving session

## Symptoms

expected: Player walks to cave entrance exit, transitions to cave room, stays in cave room
actual: Game keeps bouncing in and out of the cave -- repeated transitions creating a loop/flicker
errors: Unknown -- user reported visual bug behavior
reproduction: Go to the cave entrance area and try to enter the cave
started: Reported during v2.0 testing after all phases (9-13) complete

## Eliminated

(No wrong hypotheses -- first hypothesis was correct based on coordinate analysis)

## Evidence

- timestamp: 2026-02-21T00:01:00Z
  checked: RoomScene.ts update() method (line 678-689)
  found: Every frame, update() checks if player position overlaps ANY exit zone and triggers handleExitReached() immediately
  implication: If a player spawns inside an exit zone, they will transition out on the very first frame

- timestamp: 2026-02-21T00:02:00Z
  checked: cave_entrance.json exit zones and spawn points from neighboring rooms
  found: |
    cave_entrance exits:
      to-forest: zone {x:0, y:350, w:80, h:200} => rect covers x:0-80, y:350-550
      to-village: zone {x:880, y:350, w:80, h:200} => rect covers x:880-960, y:350-550
      to-depths: zone {x:480, y:360, w:60, h:80} => rect covers x:480-540, y:360-440

    Spawn points INTO cave_entrance from other rooms:
      From village_path (to-cave exit): spawnPoint {x:820, y:430}  -- NOT in any exit zone. OK.
      From forest_clearing (to-cave exit): spawnPoint {x:100, y:430} -- NOT in any exit zone. OK.
      From cave_depths (to-cave-entrance exit): spawnPoint {x:510, y:430} -- OVERLAP with to-depths zone (x:480-540, y:360-440)
  implication: When returning from cave_depths to cave_entrance, player spawns at (510, 430) which is INSIDE the to-depths exit zone. Immediate re-transition.

- timestamp: 2026-02-21T00:02:30Z
  checked: Reverse direction -- cave_entrance to-depths spawns at (480, 430) into cave_depths
  found: cave_depths to-cave-entrance exit zone is {x:440-520, y:350-430}. Spawn (480, 430) hits boundary.
  implication: Both directions spawn inside each other's exit zones -- confirmed ping-pong loop.

- timestamp: 2026-02-21T00:03:00Z
  checked: ExitData conditions support in RoomScene.ts and RoomData.ts
  found: ExitData type has no conditions field. Exit zone creation in RoomScene does not check conditions. The to-depths exit has JSON conditions (flag-set: door-unlocked) but they are never evaluated.
  implication: Secondary bug -- to-depths exit zone is active even when door is locked. Player walking to cave center would trigger transition to cave_depths without unlocking the door.

## Resolution

root_cause: |
  Two issues:
  1. PRIMARY: cave_depths exit "to-cave-entrance" sets spawnPoint {x:510, y:430} which lands inside cave_entrance's "to-depths" exit zone (x:480-540, y:360-440). Similarly, cave_entrance's "to-depths" sets spawnPoint {x:480, y:430} which lands on the boundary of cave_depths' "to-cave-entrance" zone (x:440-520, y:350-430). The update() method checks exit overlap every frame with no spawn grace period, so the player immediately bounces back.
  2. SECONDARY: Exit conditions from room JSON are never evaluated -- ExitData type lacked a conditions field and RoomScene never filtered exits by conditions. The to-depths exit (requiring door-unlocked flag) was always active.

fix: |
  Three-layer fix:
  1. SYSTEMIC: Added exitDetectionEnabled flag to RoomScene. Exit overlap detection is disabled on scene entry and only activates once the player is confirmed outside ALL exit zones. This prevents spawn-inside-exit loops for any room, present or future.
  2. EXIT CONDITIONS: Added conditions field to ExitData type. RoomScene now evaluates exit conditions during zone creation -- exits with unmet conditions are skipped (not added to exitZones array).
  3. DATA FIX: Moved spawn points to be safely outside exit zones as defense-in-depth:
     - cave_depths to-cave-entrance spawnPoint: {x:510, y:430} -> {x:510, y:460}
     - cave_entrance to-depths spawnPoint: {x:480, y:430} -> {x:480, y:460}

verification: |
  - TypeScript compilation: npx tsc --noEmit passes with zero errors
  - Production build: npx vite build succeeds
  - Logic review: exitDetectionEnabled starts false, update() returns early until player is outside all exit zones, then enables detection permanently for the scene lifetime

files_changed:
  - src/game/scenes/RoomScene.ts (exitDetectionEnabled flag + exit conditions filtering)
  - src/game/types/RoomData.ts (added conditions field to ExitData)
  - public/assets/data/rooms/cave_depths.json (moved spawn point y:430 -> y:460)
  - public/assets/data/rooms/cave_entrance.json (moved spawn point y:430 -> y:460)
