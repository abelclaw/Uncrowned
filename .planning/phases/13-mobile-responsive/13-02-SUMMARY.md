---
phase: 13-mobile-responsive
plan: 02
subsystem: ui
tags: [mobile, keyboard, viewport, touch, pinch-zoom, verb-bar, focus-guard]

# Dependency graph
requires:
  - phase: 13-mobile-responsive
    provides: Mobile CSS foundation, VerbBar component, viewport meta, dvh layout
  - phase: 03-text-parser
    provides: TextInputBar pattern and parser CSS styles
provides:
  - MobileKeyboardManager locking #app height when virtual keyboard opens (MOBI-03)
  - Pinch-to-zoom prevention via JavaScript gesture listeners (MOBI-06)
  - isMobile() utility function for touch device detection
  - VerbBar wired into RoomScene lifecycle (create + destroy)
  - Mobile focus guard preventing keyboard auto-open on scene transitions
  - Touch-to-move via existing Phaser pointerdown handler (MOBI-04)
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns: [visualviewport-keyboard-detection, gesture-event-pinch-prevention, mobile-focus-guard]

key-files:
  created:
    - src/game/systems/MobileKeyboardManager.ts
  modified:
    - src/game/main.ts
    - src/game/ui/TextInputBar.ts
    - src/game/scenes/RoomScene.ts

key-decisions:
  - "MobileKeyboardManager locks to window.innerHeight (not vv.height) when keyboard opens to prevent canvas resize"
  - "0.75 threshold for keyboard detection (mobile keyboards are typically 40%+ of screen)"
  - "isMobile() uses UA sniffing + pointer:coarse media query for reliable detection"
  - "TextInputBar.focus() gates HTMLElement.focus() behind isMobile() check to prevent keyboard auto-open"

patterns-established:
  - "VisualViewport API for keyboard detection: resize event + height comparison against window.innerHeight"
  - "Gesture event prevention for iOS pinch-zoom: gesturestart/change/end + multi-touch touchmove"
  - "Mobile focus guard: skip auto-focus on touch devices, let user tap to open keyboard"

requirements-completed: [MOBI-03, MOBI-04]

# Metrics
duration: 2min
completed: 2026-02-21
---

# Phase 13 Plan 02: Mobile Runtime Wiring Summary

**MobileKeyboardManager with visualViewport keyboard lock, pinch-zoom prevention, VerbBar in RoomScene lifecycle, and mobile focus guard on TextInputBar**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-21T23:05:56Z
- **Completed:** 2026-02-21T23:08:11Z
- **Tasks:** 3 (2 auto + 1 checkpoint auto-approved)
- **Files modified:** 4

## Accomplishments
- Created MobileKeyboardManager that locks #app height when virtual keyboard opens, preventing Phaser ScaleManager from resizing the canvas
- Added pinch-to-zoom prevention via gesture event and multi-touch touchmove listeners for iOS Safari
- Wired VerbBar into RoomScene lifecycle (instantiate in create(), destroy on SHUTDOWN)
- Added isMobile() focus guard to TextInputBar preventing keyboard auto-open on scene transitions

## Task Commits

Each task was committed atomically:

1. **Task 1: Create MobileKeyboardManager with visualViewport listener and pinch-zoom prevention** - `857f06e` (feat)
2. **Task 2: Wire VerbBar into RoomScene lifecycle and add mobile focus guard to TextInputBar** - `d4f491e` (feat)
3. **Task 3: Verify mobile experience** - auto-approved (checkpoint)

## Files Created/Modified
- `src/game/systems/MobileKeyboardManager.ts` - MobileKeyboardManager class with visualViewport resize listener, pinch-zoom prevention, and isMobile() helper
- `src/game/main.ts` - Instantiate MobileKeyboardManager after Phaser game init
- `src/game/ui/TextInputBar.ts` - Import isMobile, gate focus() to skip auto-focus on mobile
- `src/game/scenes/RoomScene.ts` - Import and instantiate VerbBar, add destroy() to SHUTDOWN cleanup

## Decisions Made
- MobileKeyboardManager locks to window.innerHeight (not visualViewport height) when keyboard opens -- this keeps the app at full screen height so the canvas stays the same size and the keyboard simply covers the bottom portion
- Used 0.75 threshold for keyboard detection (not 0.8) to be slightly more aggressive -- mobile keyboards are typically 40%+ of screen height
- isMobile() combines UA regex (/Android|iPhone|iPad|iPod/) with pointer:coarse media query for reliable cross-browser detection
- TextInputBar.focus() uses isMobile() guard rather than removing focus entirely -- desktop users still get auto-focus on scene transitions
- Touch-to-move required no changes -- Phaser's Input system treats mouse clicks and touch taps identically via pointerdown events

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All MOBI requirements now complete (MOBI-01 through MOBI-06 across Plans 01 and 02)
- Phase 13 is fully complete -- all mobile responsive features implemented
- iOS Safari visualViewport keyboard behavior still needs real-device verification (documented in STATE.md blockers)
- The mobile experience is feature-complete pending real-device testing

## Self-Check: PASSED

All files exist: src/game/systems/MobileKeyboardManager.ts, src/game/main.ts, src/game/ui/TextInputBar.ts, src/game/scenes/RoomScene.ts
All commits exist: 857f06e, d4f491e

---
*Phase: 13-mobile-responsive*
*Completed: 2026-02-21*
