---
phase: 07-audio-and-polish
plan: 01
subsystem: audio
tags: [phaser-audio, web-audio, sfx, music-crossfade, ambient, eventbus, singleton]

# Dependency graph
requires:
  - phase: 02-scene-player
    provides: RoomData types and scene system
  - phase: 06-npcs-dialogue
    provides: EventBus events for SFX triggers
provides:
  - AudioManager singleton with SFX, music crossfade, and ambient layers
  - RoomAudioData interface on RoomData for per-room audio config
  - Audio registry JSON mapping EventBus events to SFX keys
  - Placeholder audio files (5 SFX, 4 music, 3 ambient)
affects: [07-02, 08-content]

# Tech tracking
tech-stack:
  added: []
  patterns: [AudioManager singleton wrapping Phaser global Sound Manager, data-driven SFX via EventBus event registry, crossfade music with Phaser tweens, layered ambient with fade in/out]

key-files:
  created:
    - src/game/systems/AudioManager.ts
    - public/assets/data/audio-registry.json
    - scripts/generate-placeholder-audio.py
    - public/assets/audio/sfx/*.wav
    - public/assets/audio/music/*.wav
    - public/assets/audio/ambient/*.wav
  modified:
    - src/game/types/RoomData.ts

key-decisions:
  - "WAV format for placeholder audio instead of MP3 -- Phaser supports WAV natively, avoids ffmpeg dependency for generation"
  - "Python wave module for audio generation -- standard library, no npm dependency, reproducible via script"

patterns-established:
  - "AudioManager singleton pattern: init(scene) per RoomScene.create(), cleanup() on shutdown, stopAll() for full reset"
  - "Data-driven SFX: audio-registry.json maps EventBus event names to Phaser audio cache keys"
  - "Room audio config: RoomData.audio.music and RoomData.audio.ambient drive per-room soundscapes"

requirements-completed: [AUD-01, AUD-02, AUD-03, AUD-04]

# Metrics
duration: 3min
completed: 2026-02-21
---

# Phase 7 Plan 1: Audio Infrastructure Summary

**AudioManager singleton with EventBus-driven SFX, crossfading music, and layered ambient audio plus 12 placeholder WAV files**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-21T14:52:41Z
- **Completed:** 2026-02-21T14:55:21Z
- **Tasks:** 2
- **Files modified:** 16

## Accomplishments
- AudioManager singleton with init, playSfx, playMusic, setAmbient, stopAll, onRoomEnter, and cleanup methods
- RoomData type extended with optional RoomAudioData (music + ambient fields)
- Audio registry JSON mapping 5 EventBus events to SFX Phaser cache keys
- 12 placeholder WAV audio files generated: 5 SFX, 4 music loops, 3 ambient loops

## Task Commits

Each task was committed atomically:

1. **Task 1: Create AudioManager singleton and extend RoomData types** - `124a829` (feat)
2. **Task 2: Create audio registry and placeholder audio files** - `e4198d6` (feat)

## Files Created/Modified
- `src/game/systems/AudioManager.ts` - Singleton audio system with three independent layers (SFX, music, ambient)
- `src/game/types/RoomData.ts` - Added RoomAudioData interface and audio field on RoomData
- `public/assets/data/audio-registry.json` - Maps 5 EventBus events to SFX asset keys
- `scripts/generate-placeholder-audio.py` - Python script generating all placeholder WAV files
- `public/assets/audio/sfx/*.wav` - 5 SFX placeholder files (item-pickup, door-transition, death-sting, dialogue-start, command-blip)
- `public/assets/audio/music/*.wav` - 4 music placeholder files (forest, cave, village, menu)
- `public/assets/audio/ambient/*.wav` - 3 ambient placeholder files (forest-birds, cave-drips, wind-light)

## Decisions Made
- WAV format for placeholder audio instead of MP3 -- Phaser's `this.load.audio()` supports WAV natively, avoids requiring ffmpeg for encoding during generation
- Python `wave` module for audio generation -- standard library with zero dependencies, reproducible via committed script
- EventBus handler cleanup via stored Map references -- prevents duplicate handlers on scene restart

## Deviations from Plan

None - plan executed exactly as written. The only minor adaptation was using .wav extension instead of .mp3 for placeholder files, which the plan explicitly noted as an acceptable fallback.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- AudioManager ready for integration in Plan 02 (wiring into Preloader, RoomScene, and room JSONs)
- All placeholder audio files in place for Preloader registration
- audio-registry.json ready for cache loading in Preloader

## Self-Check: PASSED

All files verified present. Both commit hashes (124a829, e4198d6) confirmed in git log.

---
*Phase: 07-audio-and-polish*
*Completed: 2026-02-21*
