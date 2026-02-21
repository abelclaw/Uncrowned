# Phase 7: Audio and Polish - Research

**Researched:** 2026-02-21
**Domain:** Phaser 3 Web Audio, game sound design, music crossfading
**Confidence:** HIGH

## Summary

Phaser 3.90.0 (the version installed in this project) includes a full-featured global Sound Manager that uses the Web Audio API by default with automatic HTML5 Audio fallback. The Sound Manager is a **game-level singleton** -- `this.sound` in any scene references the same global manager. This is critical for the crossfade requirement: music started in one scene persists across scene transitions unless explicitly stopped, making crossfading between rooms straightforward.

The core architecture for this phase is an **AudioManager system class** that wraps Phaser's global Sound Manager, providing: (1) an SFX layer that plays one-shot sounds in response to EventBus events, (2) a music layer that loops background tracks per room/area with crossfade transitions, and (3) an ambient layer for looping environmental audio per room. All audio configuration should be data-driven via the existing room JSON format (adding `audio` fields) and a global audio registry JSON.

**Primary recommendation:** Build an AudioManager singleton system that listens to EventBus events for SFX triggers, reads music/ambient keys from RoomData, and uses Phaser tweens for crossfading. No external plugins needed -- Phaser's built-in tween system handles volume fading cleanly.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| AUD-01 | Sound effects play for player interactions (item pickup, door open, etc.) | AudioManager listens to existing EventBus events (`item-picked-up`, `go-command`, `trigger-death`, `start-dialogue`, `command-submitted`). Play one-shot SFX via `this.sound.play(key)`. Map events to SFX keys in a data-driven registry. |
| AUD-02 | Background music plays per scene or area | Add `music` field to RoomData. AudioManager reads `roomData.audio.music` on room entry. Use `this.sound.add(key, { loop: true })` for looping playback. Support area-based grouping so rooms sharing the same music key skip re-triggering. |
| AUD-03 | Ambient audio creates atmosphere (forest sounds, wind, etc.) | Add `ambient` field to RoomData. AudioManager plays/stops ambient loops on room transitions. Multiple ambient tracks can layer (e.g., wind + birds) using separate sound instances at different volumes. |
| AUD-04 | Music transitions smoothly between scenes | Use Phaser tweens to crossfade: `scene.tweens.add({ targets: oldMusic, volume: 0, duration: 1000, onComplete: () => oldMusic.stop() })` while simultaneously fading in new music. Since Sound Manager is global, both tracks play during the overlap. |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Phaser 3 Sound Manager | 3.90.0 (built-in) | Audio playback, looping, volume control | Built into Phaser, no external dependency needed. WebAudioSoundManager is the default. |
| Phaser Tweens | 3.90.0 (built-in) | Volume fading/crossfading | Tweens can target any object property including `sound.volume`. No plugin needed for fades. |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| audiosprite (npm) | latest | Bundle SFX into single audio sprite file | Optional optimization if individual SFX loading becomes slow. Not needed for initial implementation. |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Phaser tweens for fading | phaser3-rex-plugins SoundFade | Adds dependency for one simple feature; tweens work fine |
| Individual SFX files | Audio sprites (single bundled file) | Audio sprites reduce HTTP requests but complicate development workflow; individual files are fine for <30 SFX |
| Custom AudioManager | Per-scene audio setup | Per-scene is fragile -- music bleeds between scenes, ambient tracks restart on every room change |

**Installation:**
```bash
# No additional packages needed -- Phaser 3 built-in audio is sufficient
# Audio files go in public/assets/audio/
```

## Architecture Patterns

### Recommended Project Structure
```
src/game/
  systems/
    AudioManager.ts       # Singleton audio system (SFX, music, ambient)
  types/
    AudioData.ts          # TypeScript types for audio configuration
public/assets/
  audio/
    sfx/                  # Sound effect files (ogg + mp3)
      item-pickup.ogg
      door-open.ogg
      death.ogg
      ...
    music/                # Background music tracks (ogg + mp3)
      forest.ogg
      cave.ogg
      village.ogg
      menu.ogg
      ...
    ambient/              # Ambient loop tracks (ogg + mp3)
      forest-birds.ogg
      cave-drips.ogg
      wind.ogg
      ...
  data/
    audio-registry.json   # Global SFX event mappings
    rooms/*.json          # Extended with audio fields
```

### Pattern 1: AudioManager Singleton
**What:** A single AudioManager class that owns all audio playback, listens to EventBus events, and manages three independent layers (SFX, music, ambient).
**When to use:** Always -- audio must persist across scene transitions and be centrally controlled.
**Example:**
```typescript
// Source: Phaser 3 official audio docs + codebase EventBus pattern
export class AudioManager {
    private static instance: AudioManager;
    private scene: Phaser.Scene;

    // Active audio references
    private currentMusic: Phaser.Sound.WebAudioSound | null = null;
    private currentMusicKey: string | null = null;
    private ambientSounds: Map<string, Phaser.Sound.WebAudioSound> = new Map();

    // Volume levels (user-configurable)
    private sfxVolume: number = 1.0;
    private musicVolume: number = 0.5;
    private ambientVolume: number = 0.4;

    static getInstance(): AudioManager {
        if (!AudioManager.instance) {
            AudioManager.instance = new AudioManager();
        }
        return AudioManager.instance;
    }

    /** Bind to a scene's sound manager. Call once from RoomScene.create(). */
    init(scene: Phaser.Scene): void {
        this.scene = scene;
        this.registerEventListeners();
    }

    /** Play a one-shot SFX. */
    playSfx(key: string): void {
        if (this.scene.sound.locked) return;
        this.scene.sound.play(key, { volume: this.sfxVolume });
    }

    /** Crossfade to new music track. No-op if same track is already playing. */
    playMusic(key: string, fadeDuration: number = 1000): void {
        if (this.currentMusicKey === key) return; // Same track, skip

        const newMusic = this.scene.sound.add(key, {
            loop: true,
            volume: 0,
        }) as Phaser.Sound.WebAudioSound;
        newMusic.play();

        // Fade in new track
        this.scene.tweens.add({
            targets: newMusic,
            volume: this.musicVolume,
            duration: fadeDuration,
        });

        // Fade out old track
        if (this.currentMusic?.isPlaying) {
            const oldMusic = this.currentMusic;
            this.scene.tweens.add({
                targets: oldMusic,
                volume: 0,
                duration: fadeDuration,
                onComplete: () => {
                    oldMusic.stop();
                    oldMusic.destroy();
                },
            });
        }

        this.currentMusic = newMusic;
        this.currentMusicKey = key;
    }

    /** Stop all ambient, start new ambient tracks for a room. */
    setAmbient(keys: Array<{ key: string; volume?: number }>): void {
        // Fade out existing ambient
        this.ambientSounds.forEach((sound, key) => {
            this.scene.tweens.add({
                targets: sound,
                volume: 0,
                duration: 500,
                onComplete: () => {
                    sound.stop();
                    sound.destroy();
                },
            });
        });
        this.ambientSounds.clear();

        // Start new ambient tracks
        for (const amb of keys) {
            const vol = (amb.volume ?? 1.0) * this.ambientVolume;
            const sound = this.scene.sound.add(amb.key, {
                loop: true,
                volume: 0,
            }) as Phaser.Sound.WebAudioSound;
            sound.play();
            this.scene.tweens.add({
                targets: sound,
                volume: vol,
                duration: 800,
            });
            this.ambientSounds.set(amb.key, sound);
        }
    }
}
```

### Pattern 2: Data-Driven Audio in RoomData
**What:** Extend RoomData JSON with an `audio` object that declares music and ambient tracks per room.
**When to use:** For AUD-02 and AUD-03 -- rooms define their own soundscape.
**Example:**
```json
{
    "id": "forest_clearing",
    "name": "Forest Clearing",
    "audio": {
        "music": "music-forest",
        "ambient": [
            { "key": "amb-forest-birds", "volume": 0.8 },
            { "key": "amb-wind-light", "volume": 0.3 }
        ]
    }
}
```

### Pattern 3: EventBus-Driven SFX
**What:** Map existing EventBus events to SFX keys in a registry, so sound effects play automatically when game events fire.
**When to use:** For AUD-01 -- sounds triggered by gameplay interactions.
**Example:**
```typescript
// SFX event mapping -- AudioManager listens to these
private registerEventListeners(): void {
    EventBus.on('item-picked-up', () => this.playSfx('sfx-item-pickup'));
    EventBus.on('go-command', () => this.playSfx('sfx-door-open'));
    EventBus.on('trigger-death', () => this.playSfx('sfx-death'));
    EventBus.on('start-dialogue', () => this.playSfx('sfx-dialogue-start'));
    EventBus.on('command-submitted', () => this.playSfx('sfx-command-blip'));
    EventBus.on('scene-ready', (data: { roomId: string }) => {
        this.onRoomEnter(data.roomId);
    });
}
```

### Pattern 4: Audio Unlock Handling
**What:** Handle browser autoplay policy by checking `this.sound.locked` before playing and listening for the `UNLOCKED` event.
**When to use:** Always -- browsers block audio until user interaction.
**Example:**
```typescript
// Source: Phaser 3 official docs + Ourcade best practices
initAudio(scene: Phaser.Scene): void {
    if (!scene.sound.locked) {
        // Audio context already unlocked (user interacted with page)
        this.startBackgroundAudio();
    } else {
        scene.sound.once(Phaser.Sound.Events.UNLOCKED, () => {
            this.startBackgroundAudio();
        });
    }
}
```

### Anti-Patterns to Avoid
- **Creating sounds in scene.create() without storing references:** Leads to orphaned sounds that can never be stopped. Always store references in AudioManager.
- **Using scene.sound.stopAll() for room transitions:** This stops ALL sounds globally, including the music that should crossfade. Stop specific sounds by reference instead.
- **Playing audio in scene.init():** The sound manager may not be ready. Always play audio in create() or later.
- **Not cleaning up EventBus listeners:** AudioManager must unregister listeners on scene shutdown to prevent duplicate handlers.
- **Loading audio as WAV:** WAV files are huge. Use OGG (best compression) with MP3 fallback for Safari.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Volume fading | Custom requestAnimationFrame loop | `scene.tweens.add({ targets: sound, volume: x })` | Tweens handle easing, cancellation, completion callbacks automatically |
| Audio format detection | Browser codec sniffing | `this.load.audio(key, ['file.ogg', 'file.mp3'])` | Phaser loader auto-detects supported format from array |
| Audio unlock | Custom touch/click listener | `this.sound.locked` + `Phaser.Sound.Events.UNLOCKED` | Phaser handles cross-browser unlock automatically |
| Global audio state | Custom global variable | Phaser's built-in global Sound Manager (`this.sound`) | Already a game-level singleton, persists across scenes |

**Key insight:** Phaser's Sound Manager is already global and persistent. The main thing we're building is the coordination layer (AudioManager) that maps game events to audio actions and manages the three audio layers. The actual audio playback mechanics are all built into Phaser.

## Common Pitfalls

### Pitfall 1: Browser Autoplay Policy
**What goes wrong:** Music doesn't play on page load. Console shows "The AudioContext was not allowed to start."
**Why it happens:** All modern browsers require a user gesture (click/tap/key) before allowing audio playback.
**How to avoid:** The game already has a MainMenuScene where the user clicks "New Game" or "Continue" -- this satisfies the gesture requirement. Check `this.sound.locked` before playing in RoomScene; if locked, listen for `UNLOCKED` event.
**Warning signs:** Silent game on first load, Chrome console warning about AudioContext.

### Pitfall 2: Sound Manager is Global -- Music Bleeds
**What goes wrong:** Entering a new room starts new music but old music keeps playing (two tracks overlap without fading).
**Why it happens:** `this.sound` is the same global manager in every scene. Starting a new scene does NOT stop sounds from the previous scene.
**How to avoid:** AudioManager tracks `currentMusic` reference and explicitly fades/stops old track before starting new one. The `currentMusicKey` check prevents restarting the same track.
**Warning signs:** Multiple music tracks audible simultaneously, increasing sound count over time.

### Pitfall 3: Orphaned Sound Objects on Scene Restart
**What goes wrong:** Memory grows as player moves between rooms. Eventually audio glitches or crashes.
**Why it happens:** Each `scene.sound.add()` creates a new sound object. If you don't destroy old ones, they accumulate.
**How to avoid:** AudioManager's crossfade pattern explicitly calls `oldMusic.destroy()` after fade-out completes. Ambient sounds are cleaned up in `setAmbient()` before creating new ones.
**Warning signs:** `this.sound.getAll().length` grows continuously, memory usage climbs.

### Pitfall 4: Tweens Die on Scene Shutdown
**What goes wrong:** Crossfade tween is interrupted when scene restarts (RoomScene shutdown), leaving audio at partial volume.
**Why it happens:** Phaser tweens belong to a scene's tween manager, which is destroyed on scene shutdown.
**How to avoid:** Use `this.game.tweens` (game-level tween manager) instead of `this.tweens` (scene-level) for audio fades that span scene transitions. Alternatively, handle the edge case by setting volume directly in the AudioManager init when re-binding to a new scene.
**Warning signs:** Music volume "jumps" between rooms instead of smooth transition.

### Pitfall 5: Loading Audio in Wrong Lifecycle Phase
**What goes wrong:** Audio keys don't exist when AudioManager tries to play them.
**Why it happens:** Audio files must be loaded in Preloader.preload(), but developer tries to reference them before Preloader completes.
**How to avoid:** All audio loading goes in Preloader.preload(). AudioManager.init() is called in RoomScene.create(), well after loading is complete.
**Warning signs:** Console error "No audio loaded for key: 'music-forest'".

### Pitfall 6: Safari/iOS Audio Quirks
**What goes wrong:** Audio works in Chrome/Firefox but is silent in Safari or only plays after multiple taps on iOS.
**Why it happens:** Safari's Web Audio implementation is stricter about the AudioContext resume timing.
**How to avoid:** Provide both OGG and MP3 formats (Safari doesn't support OGG). Rely on Phaser's built-in unlock mechanism. The MainMenuScene click provides the user gesture.
**Warning signs:** Works everywhere except Safari/iOS.

## Code Examples

Verified patterns from official sources:

### Loading Audio Files (Preloader)
```typescript
// Source: Phaser 3 official docs - audio loading
// In Preloader.preload()
preload() {
    // Music tracks (provide ogg + mp3 for cross-browser)
    this.load.audio('music-forest', [
        'assets/audio/music/forest.ogg',
        'assets/audio/music/forest.mp3'
    ]);
    this.load.audio('music-cave', [
        'assets/audio/music/cave.ogg',
        'assets/audio/music/cave.mp3'
    ]);

    // Sound effects
    this.load.audio('sfx-item-pickup', [
        'assets/audio/sfx/item-pickup.ogg',
        'assets/audio/sfx/item-pickup.mp3'
    ]);
    this.load.audio('sfx-door-transition', [
        'assets/audio/sfx/door-transition.ogg',
        'assets/audio/sfx/door-transition.mp3'
    ]);

    // Ambient loops
    this.load.audio('amb-forest-birds', [
        'assets/audio/ambient/forest-birds.ogg',
        'assets/audio/ambient/forest-birds.mp3'
    ]);
}
```

### Playing One-Shot SFX
```typescript
// Source: Phaser 3 official docs - this.sound.play
// Fire-and-forget: Phaser creates, plays, and auto-destroys
this.sound.play('sfx-item-pickup', { volume: 0.8 });
```

### Crossfading Music with Tweens
```typescript
// Source: Phaser 3 forum solution + official tween docs
crossfadeMusic(newKey: string, duration: number = 1000): void {
    // Create new music at zero volume and start playing
    const newMusic = this.scene.sound.add(newKey, {
        loop: true,
        volume: 0,
    }) as Phaser.Sound.WebAudioSound;
    newMusic.play();

    // Fade in new
    this.scene.tweens.add({
        targets: newMusic,
        volume: this.musicVolume,
        ease: 'Linear',
        duration: duration,
    });

    // Fade out old
    if (this.currentMusic?.isPlaying) {
        const dying = this.currentMusic;
        this.scene.tweens.add({
            targets: dying,
            volume: 0,
            ease: 'Linear',
            duration: duration,
            onComplete: () => {
                dying.stop();
                dying.destroy();
            },
        });
    }

    this.currentMusic = newMusic;
    this.currentMusicKey = newKey;
}
```

### RoomData Audio Extension
```typescript
// Source: Existing RoomData.ts pattern in codebase
export interface RoomAudioData {
    /** Phaser audio key for background music. Rooms sharing the same key
     *  won't restart the music on transition. */
    music?: string;
    /** Ambient loop tracks to layer for atmosphere. */
    ambient?: Array<{
        key: string;
        volume?: number; // 0-1, relative to ambient master volume
    }>;
}

// Extended in RoomData interface:
export interface RoomData {
    // ... existing fields ...
    audio?: RoomAudioData;
}
```

### Audio Unlock Pattern
```typescript
// Source: Phaser 3 official docs + Ourcade blog
private handleAudioUnlock(scene: Phaser.Scene): void {
    if (!scene.sound.locked) {
        this.onAudioReady();
        return;
    }
    scene.sound.once(Phaser.Sound.Events.UNLOCKED, () => {
        this.onAudioReady();
    });
}
```

### Volume Settings Persistence
```typescript
// Source: GameState pattern in codebase
// Add to GameStateData interface:
export interface GameStateData {
    // ... existing fields ...
    audioSettings: {
        masterVolume: number;
        musicVolume: number;
        sfxVolume: number;
        ambientVolume: number;
        muted: boolean;
    };
}

// Default values:
audioSettings: {
    masterVolume: 1.0,
    musicVolume: 0.5,
    sfxVolume: 1.0,
    ambientVolume: 0.4,
    muted: false,
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| HTML5 Audio tag | Web Audio API (Phaser default) | Phaser 3.0+ | Better latency, mixing, spatial audio |
| Per-scene sound management | Global Sound Manager | Phaser 3.0+ | Music persists across scenes by default |
| Rex SoundFade plugin | Built-in Phaser tweens on volume | Always available | No external dependency needed |
| WAV format for SFX | OGG + MP3 dual format | Browser support matured | OGG is smaller; MP3 is Safari fallback |
| Manual AudioContext.resume() | Phaser automatic unlock | Phaser 3.x | `this.sound.locked` + UNLOCKED event handles it |

**Deprecated/outdated:**
- `HTML5AudioSoundManager`: Only used as automatic fallback for ancient browsers. Don't target it explicitly.
- Rex SoundFade plugin: Unnecessary since Phaser tweens do the same thing natively with `{ targets: sound, volume: x }`.

## Open Questions

1. **Placeholder Audio Content**
   - What we know: The project uses a features-before-content approach. Placeholder audio files are needed.
   - What's unclear: Whether to generate simple placeholder tones programmatically or use free CC0 sound packs.
   - Recommendation: Use a small set of free CC0 retro SFX from OpenGameArt.org (512 Sound Effects pack) for placeholders, and simple looping tone files for music/ambient. This provides realistic testing without blocking on content creation.

2. **Audio Settings UI**
   - What we know: MainMenuScene has a settings option implied but not yet implemented.
   - What's unclear: Whether volume sliders belong in this phase or a separate polish pass.
   - Recommendation: Include basic volume controls (master, music, SFX, ambient) as part of this phase since they're essential for testing and user experience. Can be minimal sliders in a settings overlay.

3. **Scene-Level vs Game-Level Tweens for Crossfade**
   - What we know: Scene tweens are destroyed on scene shutdown. Game-level tweens (`this.game.tweens`) persist.
   - What's unclear: Whether the crossfade duration overlaps with scene shutdown timing in the current SceneTransition implementation.
   - Recommendation: Start with scene-level tweens and test. If crossfade is interrupted by scene restart (500ms transition vs 1000ms crossfade), switch to game-level tweens or reduce crossfade duration to match transition duration.

## Sources

### Primary (HIGH confidence)
- [Phaser 3 Audio Concepts](https://docs.phaser.io/phaser/concepts/audio) - Official Phaser docs on audio system, loading, playback, spatial audio, events
- [Phaser 3 WebAudioSound API](https://docs.phaser.io/api-documentation/class/sound-webaudiosound) - setVolume, setLoop, play, stop, setPan methods confirmed
- [Phaser 3 BaseSoundManager API](https://docs.phaser.io/api-documentation/class/sound-basesoundmanager) - Global volume, mute, stopAll, pauseAll methods confirmed
- Installed Phaser version 3.90.0 confirmed via package.json and node_modules

### Secondary (MEDIUM confidence)
- [Ourcade Web Audio Best Practices](https://blog.ourcade.co/posts/2020/phaser-3-web-audio-best-practices-games/) - Unlock pattern, focus handling, pauseOnBlur
- [Phaser Forum: Fade Out Sound](https://phaser.discourse.group/t/solved-fade-out-sound/3289) - Tween-based volume fading confirmed working
- [Phaser Forum: Sound Between Scenes](https://phaser.discourse.group/t/sound-problem-on-changing-scenes/10264) - Global Sound Manager behavior across scenes
- [Rex Notes: Audio](https://rexrainbow.github.io/phaser3-rex-notes/docs/site/audio/) - Comprehensive API reference cross-verification

### Tertiary (LOW confidence)
- [OpenGameArt.org 512 Sound Effects](https://opengameart.org/content/512-sound-effects-8-bit-style) - CC0 placeholder SFX source (not verified for quality/fit)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Phaser 3 built-in audio is well-documented and verified on official docs
- Architecture: HIGH - AudioManager singleton pattern is standard in Phaser games; EventBus integration follows existing codebase patterns exactly
- Pitfalls: HIGH - Browser autoplay, global sound manager behavior, and orphaned sounds are well-documented issues with clear solutions
- Code examples: HIGH - Crossfade with tweens verified on official forum; audio loading API verified on official docs
- Audio format: HIGH - OGG+MP3 dual format is standard practice, verified on Phaser docs

**Research date:** 2026-02-21
**Valid until:** 2026-04-21 (stable domain -- Phaser 3 audio API is mature and unlikely to change)
