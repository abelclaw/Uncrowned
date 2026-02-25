---
phase: 07-audio-and-polish
verified: 2026-02-21T15:30:00Z
status: human_needed
score: 7/7 must-haves verified
human_verification:
  - test: "Sound effects fire on player interactions"
    expected: "Submitting a command plays sfx-command-blip; taking an item plays sfx-item-pickup; transitioning rooms plays sfx-door-transition; triggering death plays sfx-death-sting; starting dialogue plays sfx-dialogue-start"
    why_human: "EventBus event firing + browser AudioContext unlock + Phaser sound.play() cannot be confirmed without running the game in a browser; also requires the browser autoplay policy to have been satisfied by a prior user click"
  - test: "Background music plays per room and loops"
    expected: "Entering Forest Clearing plays music-forest on loop; entering Cave Entrance crossfades to music-cave; entering Village Path crossfades to music-village; re-entering a room with the same music key does NOT restart the track"
    why_human: "Crossfade correctness and same-key deduplication (currentMusicKey guard) require runtime Phaser tween behavior; WAV loop flag set programmatically, not static; only verifiable in browser"
  - test: "Ambient audio creates atmosphere and changes between rooms"
    expected: "Forest Clearing plays amb-forest-birds (0.8) and amb-wind-light (0.3); Cave Entrance plays amb-cave-drips (0.7); Village Path plays amb-forest-birds (0.5) and amb-wind-light (0.2); transitioning rooms fades old ambient out and new ambient in"
    why_human: "Volume levels, fade behavior, and layered ambient correctness require audio playback in browser; ambient on/off timing during transitions is Phaser tween-dependent"
  - test: "No browser console audio errors"
    expected: "No 'AudioContext was not allowed to start' errors; no 'audio key not found' errors; no 'Cannot read properties of null' on sound objects"
    why_human: "Runtime browser console state cannot be checked statically"
---

# Phase 7: Audio and Polish Verification Report

**Phase Goal:** The game world feels alive with sound and the experience is polished for players
**Verified:** 2026-02-21T15:30:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | AudioManager singleton exists with playSfx, playMusic, setAmbient, and stopAll methods | VERIFIED | `src/game/systems/AudioManager.ts` L37-221: class with all 4 required methods plus `onRoomEnter`, `init`, `cleanup`, `getInstance` |
| 2 | RoomData interface includes optional audio field with music and ambient sub-fields | VERIFIED | `src/game/types/RoomData.ts` L7-12 declares `RoomAudioData` interface; L131 adds `audio?: RoomAudioData` to `RoomData` |
| 3 | Audio registry JSON maps EventBus event names to SFX asset keys | VERIFIED | `public/assets/data/audio-registry.json` maps 5 events: item-picked-up, go-command, trigger-death, start-dialogue, command-submitted |
| 4 | Placeholder audio files exist in all three audio categories | VERIFIED | 5 SFX WAV (4KB-44KB), 4 music WAV (264KB-352KB), 3 ambient WAV (176KB-264KB) — all non-empty |
| 5 | Player hears SFX on interactions (item pickup, door, death, dialogue, commands) | ? NEEDS HUMAN | EventBus wiring is correct; AudioManager registers listeners from registry; `playSfx` calls `scene.sound.play` — runtime verification required |
| 6 | Background music plays per room and crossfades on room transitions | ? NEEDS HUMAN | `playMusic` crossfade logic implemented with Phaser tweens; same-key deduplication via `currentMusicKey` guard — runtime verification required |
| 7 | Ambient audio creates atmosphere in each scene | ? NEEDS HUMAN | `setAmbient` fades in/out layers; all 3 room JSONs declare ambient config — runtime verification required |

**Score:** 7/7 truths verified at infrastructure level; 3/7 require human runtime confirmation

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/game/systems/AudioManager.ts` | Singleton with SFX/music/ambient management, min 80 lines | VERIFIED | 221 lines; exports `AudioManager`; all required methods present |
| `src/game/types/RoomData.ts` | RoomAudioData interface and audio field on RoomData | VERIFIED | `RoomAudioData` at L7; `audio?: RoomAudioData` at L131 |
| `public/assets/data/audio-registry.json` | Event-to-SFX mappings including "item-picked-up" | VERIFIED | Valid JSON; `sfxEvents` with 5 mappings; contains "item-picked-up" |
| `src/game/scenes/Preloader.ts` | load.audio() for all audio assets | VERIFIED | 12 `this.load.audio()` calls: 5 SFX, 4 music, 3 ambient; plus audio-registry.json load |
| `src/game/scenes/RoomScene.ts` | AudioManager import, init, onRoomEnter, cleanup | VERIFIED | Import at L12; `audioManager` property at L48; init+onRoomEnter at L331-333; cleanup at L540 |
| `public/assets/data/rooms/forest_clearing.json` | audio field with music-forest + ambient | VERIFIED | `"audio": {"music": "music-forest", "ambient": [{"key": "amb-forest-birds", "volume": 0.8}, {"key": "amb-wind-light", "volume": 0.3}]}` |
| `public/assets/data/rooms/cave_entrance.json` | audio field with music-cave + ambient | VERIFIED | `"audio": {"music": "music-cave", "ambient": [{"key": "amb-cave-drips", "volume": 0.7}]}` |
| `public/assets/data/rooms/village_path.json` | audio field with music-village + ambient | VERIFIED | `"audio": {"music": "music-village", "ambient": [{"key": "amb-forest-birds", "volume": 0.5}, {"key": "amb-wind-light", "volume": 0.2}]}` |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/game/systems/AudioManager.ts` | `src/game/EventBus.ts` | `EventBus.on()` in `registerEventListeners()` | VERIFIED | L79: `EventBus.on(eventName, handler)` iterates all sfxEventMap entries; cleanup calls `EventBus.off` |
| `src/game/systems/AudioManager.ts` | Phaser Sound Manager | `scene.sound.play` and `scene.sound.add` | VERIFIED | L99: `this.scene.sound.play(key, ...)` in playSfx; L109: `this.scene.sound.add(key, {...})` in playMusic; L162: `this.scene.sound.add` in setAmbient |
| `src/game/scenes/Preloader.ts` | `public/assets/audio/` | `this.load.audio()` registering all keys | VERIFIED | All 12 audio keys registered with .wav extension matching actual files; audio-registry.json loaded as 'audio-registry' |
| `src/game/scenes/RoomScene.ts` | `src/game/systems/AudioManager.ts` | `AudioManager.getInstance().init(this)` in create() | VERIFIED | L331-333: `AudioManager.getInstance()`, `.init(this)`, `.onRoomEnter(this.roomData)` — all three calls present before EventBus listeners |
| `src/game/systems/AudioManager.ts` | Room JSON audio config | `onRoomEnter` reads `roomData.audio` | VERIFIED | L201: `roomData.audio?.music` and L205: `roomData.audio?.ambient` — optional chaining handles rooms without audio config |
| Audio cache key `'audio-registry'` | AudioManager.init() | `scene.cache.json.get('audio-registry')` | VERIFIED | Preloader registers as `'audio-registry'`; AudioManager retrieves with exact same key at L53 |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| AUD-01 | 07-01, 07-02 | Sound effects play for player interactions (item pickup, door open, etc.) | SATISFIED (needs human) | EventBus registry maps 5 events to SFX keys; AudioManager registers listeners; Preloader loads all SFX files; runtime sound output requires human verification |
| AUD-02 | 07-01, 07-02 | Background music plays per scene or area | SATISFIED (needs human) | `playMusic` implemented with loop flag; all 3 rooms declare music keys matching Preloader-registered keys; runtime playback requires human verification |
| AUD-03 | 07-01, 07-02 | Ambient audio creates atmosphere (forest sounds, wind, etc.) | SATISFIED (needs human) | `setAmbient` with fade-in/out; 3 ambient files cover forest-birds, cave-drips, wind-light; room JSONs layer them at tuned volumes; runtime verification required |
| AUD-04 | 07-01, 07-02 | Music transitions smoothly between scenes | SATISFIED (needs human) | `playMusic` crossfade uses Phaser tweens (fade in new at 1000ms, fade out old with onComplete stop+destroy); same-key deduplication prevents restart; runtime crossfade quality requires human verification |

No orphaned requirements — all 4 AUD-xx requirements are claimed by both plans and fully traced. REQUIREMENTS.md traceability table shows all 4 as "Phase 7 / Complete".

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| None | — | — | — | — |

No TODOs, FIXMEs, empty returns, placeholder comments, or stub handlers found in any phase-7 files.

### Human Verification Required

#### 1. SFX Fires on Game Events

**Test:** Run `npm run dev`, open the game in browser, click "New Game". In Forest Clearing:
- Type `look` and press Enter — expect command-blip SFX
- Type `take rusty key` — expect item-pickup SFX
- Type `go east` to Cave Entrance — expect door-transition SFX on transition
- Trigger a death (type `push beehive`) — expect death-sting SFX

**Expected:** Each interaction produces a brief audible sound. No console errors about audio keys not found.

**Why human:** Browser AudioContext requires a prior user gesture (the "New Game" click satisfies this). Phaser's `sound.play` outcome requires runtime execution; cannot verify by static analysis.

#### 2. Background Music Plays Per Room and Crossfades

**Test:** Continue from test 1, monitoring audio during room transitions:
- Entering Forest Clearing: forest loop audible within ~1 second
- Transitioning to Cave Entrance via `go east`: music crossfades (forest fades out, cave fades in over 1 second)
- Returning to Forest Clearing via `go west`: crossfades back to forest theme
- Re-entering Cave Entrance: music continues from where it was, does NOT restart

**Expected:** Smooth crossfade (no abrupt cut), no double-playing of same track on re-entry.

**Why human:** Crossfade relies on Phaser tween manager behavior with `targets: sound` and `volume` property — correct at code level but only audibly verifiable at runtime. Same-key deduplication logic is a single if-guard that requires runtime confirmation.

#### 3. Ambient Audio Layers and Changes Between Rooms

**Test:** In each room, listen for ambient layers distinct from music:
- Forest Clearing: birds chirping (high volume) + light wind (lower volume)
- Cave Entrance: dripping sounds only
- Village Path: birds at lower volume + wind at lower volume than forest

**Expected:** Ambient layers are audible, layer count matches room JSON config, volume differences are perceivable between rooms.

**Why human:** WAV placeholder files are synthetic tones generated by Python `wave` module — the forest-birds file uses burst patterns at 2000Hz, cave-drips uses 200Hz bursts. Whether these are actually distinguishable as "atmosphere" vs just beeps requires a human ear.

#### 4. No Browser Audio Console Errors

**Test:** Open browser DevTools console during all the above tests.

**Expected:** No `AudioContext was not allowed to start`, no `Uncaught (in promise)`, no `The key 'X' was not found in the Sound Manager`, no volume/tween errors.

**Why human:** Console errors are runtime-only artifacts.

### Infrastructure Assessment

All automated verification checks pass:

- TypeScript compiles without errors (`tsc --noEmit` exits 0)
- All 4 documented commit hashes exist in git log (124a829, e4198d6, 3d9a453, ee3b9f1)
- AudioManager is a complete, non-stub implementation (221 lines; all 8 methods implemented with real Phaser API calls, not placeholders)
- Audio key alignment is exact: Preloader registers `'audio-registry'` / AudioManager retrieves `'audio-registry'`; SFX keys in registry (`sfx-item-pickup`, etc.) match Preloader keys exactly; room JSON music/ambient keys match Preloader keys exactly
- All audio files are non-empty WAV files (largest: music tracks at 352KB for 4-second loops)
- AudioManager.init() is placed before EventBus listener registration in RoomScene.create() at L330-333, ensuring SFX works from the first command
- cleanup() in shutdown does NOT call stopAll() — intentional for crossfade behavior

The audio system infrastructure is complete and correctly wired. The only open question is runtime playback quality — whether the placeholder WAV tones are audibly useful and whether the crossfade/ambient timing feels polished in the browser.

---

_Verified: 2026-02-21T15:30:00Z_
_Verifier: Claude (gsd-verifier)_
