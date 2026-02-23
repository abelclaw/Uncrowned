import Phaser from 'phaser';
import EventBus from '../EventBus';
import type { RoomAudioData } from '../types/RoomData';

/**
 * Singleton audio system managing three independent layers:
 * - SFX: one-shot sounds triggered by EventBus events
 * - Music: looping background tracks with crossfade transitions
 * - Ambient: layered environmental loops per room
 *
 * Wraps Phaser's global Sound Manager. Call init() from RoomScene.create()
 * to bind to the current scene's tween manager.
 */
export class AudioManager {
    private static instance: AudioManager;

    private scene!: Phaser.Scene;
    private currentMusic: Phaser.Sound.WebAudioSound | null = null;
    private currentMusicKey: string | null = null;
    private ambientSounds: Map<string, Phaser.Sound.WebAudioSound> = new Map();

    /** Volume levels */
    private sfxVolume: number = 0.4;
    private musicVolume: number = 0.5;
    private ambientVolume: number = 0.25;

    /** Event-to-SFX key mappings loaded from audio-registry.json */
    private sfxEventMap: Record<string, string> = {};

    /** Stored handler references for cleanup */
    private eventHandlers: Map<string, Function> = new Map();

    private initialized: boolean = false;

    private constructor() {}

    static getInstance(): AudioManager {
        if (!AudioManager.instance) {
            AudioManager.instance = new AudioManager();
        }
        return AudioManager.instance;
    }

    /**
     * Bind to a scene's sound/tween managers. Call once per RoomScene.create().
     * Loads SFX event map from the audio-registry JSON cache and registers
     * EventBus listeners for automatic SFX playback.
     */
    init(scene: Phaser.Scene): void {
        this.scene = scene;

        // Load SFX event map from cached JSON
        const registry = scene.cache.json.get('audio-registry');
        if (registry?.sfxEvents) {
            this.sfxEventMap = registry.sfxEvents;
        }

        this.registerEventListeners();
        this.initialized = true;

        // Handle audio unlock for browsers that block autoplay
        if (scene.sound.locked) {
            scene.sound.once(Phaser.Sound.Events.UNLOCKED, () => {
                // Audio context is now ready -- any queued actions can proceed
            });
        }
    }

    /**
     * Register EventBus listeners that map game events to SFX playback.
     * Stores handler references for cleanup.
     */
    private registerEventListeners(): void {
        // Clean up any existing handlers first
        this.removeEventListeners();

        for (const [eventName, sfxKey] of Object.entries(this.sfxEventMap)) {
            const handler = () => this.playSfx(sfxKey);
            EventBus.on(eventName, handler);
            this.eventHandlers.set(eventName, handler);
        }
    }

    /**
     * Remove all registered EventBus listeners.
     */
    private removeEventListeners(): void {
        this.eventHandlers.forEach((handler, eventName) => {
            EventBus.off(eventName, handler as (...args: unknown[]) => void);
        });
        this.eventHandlers.clear();
    }

    /**
     * Play a one-shot sound effect. Fire-and-forget -- Phaser auto-destroys.
     */
    playSfx(key: string): void {
        if (!this.initialized || this.scene.sound.locked) return;
        this.scene.sound.play(key, { volume: this.sfxVolume });
    }

    /**
     * Crossfade to a new music track. No-op if the same track is already playing.
     * Creates a new looping sound at volume 0, fades it in, and fades out the old track.
     */
    playMusic(key: string, fadeDuration: number = 1000): void {
        if (this.currentMusicKey === key) return;

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

    /**
     * Replace all ambient sounds with new ones. Fades out existing, fades in new.
     * Pass an empty array to clear all ambient audio.
     */
    setAmbient(keys: Array<{ key: string; volume?: number }>): void {
        // Fade out and destroy existing ambient sounds
        this.ambientSounds.forEach((sound) => {
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
            const targetVolume = (amb.volume ?? 1.0) * this.ambientVolume;
            const sound = this.scene.sound.add(amb.key, {
                loop: true,
                volume: 0,
            }) as Phaser.Sound.WebAudioSound;
            sound.play();

            this.scene.tweens.add({
                targets: sound,
                volume: targetVolume,
                duration: 800,
            });

            this.ambientSounds.set(amb.key, sound);
        }
    }

    /**
     * Stop and destroy all active audio (music + ambient). Resets state.
     */
    stopAll(): void {
        if (this.currentMusic) {
            this.currentMusic.stop();
            this.currentMusic.destroy();
            this.currentMusic = null;
            this.currentMusicKey = null;
        }

        this.ambientSounds.forEach((sound) => {
            sound.stop();
            sound.destroy();
        });
        this.ambientSounds.clear();
    }

    /**
     * Convenience method for room transitions. Reads audio config from RoomData
     * and sets music/ambient accordingly.
     */
    onRoomEnter(roomData: { audio?: RoomAudioData }): void {
        if (roomData.audio?.music) {
            this.playMusic(roomData.audio.music);
        }

        if (roomData.audio?.ambient) {
            this.setAmbient(roomData.audio.ambient);
        } else {
            // No ambient defined for this room -- clear existing
            this.setAmbient([]);
        }
    }

    /**
     * Remove all EventBus listeners. Does NOT stop audio (audio persists
     * across scene restarts). Call from scene shutdown.
     */
    cleanup(): void {
        this.removeEventListeners();
        this.initialized = false;
    }
}
