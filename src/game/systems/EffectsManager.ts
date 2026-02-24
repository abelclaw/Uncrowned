import Phaser from 'phaser';
import type { RoomEffectsData, WeatherType, AmbientType, LightingData } from '../types/RoomData';
import { QualitySettings } from './QualitySettings';

/**
 * Game viewport constants matching canvas size.
 * Used for positioning particle emitters relative to the camera.
 */
const GAME_WIDTH = 960;
const GAME_HEIGHT = 540;

/** Particle texture key created procedurally */
const PARTICLE_TEXTURE = 'particle-white';

/** Depth constants for layering */
const LIGHTING_DEPTH = 70;
const AMBIENT_DEPTH = 75;
const WEATHER_DEPTH = 80;

/**
 * Helper to create a typed random emit zone from a Phaser Rectangle.
 * Works around Phaser 3.90 type definition gaps for EmitZoneData.
 */
function randomZone(rect: Phaser.Geom.Rectangle) {
    return { type: 'random' as const, source: rect } as Phaser.Types.GameObjects.Particles.ParticleEmitterConfig['emitZone'];
}

/**
 * Singleton VFX system managing weather and ambient particle effects.
 *
 * Follows the AudioManager pattern: call init() from RoomScene.create()
 * to bind to the current scene, and cleanup() from scene shutdown.
 *
 * Particle presets:
 * - Weather (depth 80): rain, snow, fog, dust
 * - Ambient (depth 75): fireflies, dust-motes, falling-leaves, embers
 *
 * Effects are data-driven via the `effects` field on RoomData JSON.
 */
export class EffectsManager {
    private static instance: EffectsManager;

    private scene!: Phaser.Scene;
    private weatherEmitter: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
    private ambientEmitters: Phaser.GameObjects.Particles.ParticleEmitter[] = [];
    private initialized: boolean = false;

    // Lighting state
    private lightingOverlay: Phaser.GameObjects.Rectangle | null = null;
    private flickerTimer: Phaser.Time.TimerEvent | null = null;
    private postFXActive: boolean = false;
    private baseOverlayAlpha: number = 0;

    private constructor() {}

    /**
     * Compute the quality multiplier for particle counts.
     * Returns 0 (skip all effects), 0.5 (half particles), or 1.0 (full).
     *
     * Rules:
     * - Quality 'off' => 0
     * - Canvas renderer => 0 (no WebGL = no particles / PostFX)
     * - Quality 'low' OR (quality 'high' + mobile device) => 0.5
     * - Quality 'high' + desktop + WebGL => 1.0
     */
    private getQualityMultiplier(): number {
        const quality = QualitySettings.getInstance().getLevel();
        if (quality === 'off') return 0;
        if (this.scene?.game && QualitySettings.isCanvasRenderer(this.scene.game)) return 0;
        if (quality === 'low') return 0.5;
        if (QualitySettings.isMobileDevice()) return 0.5;
        return 1.0;
    }

    static getInstance(): EffectsManager {
        if (!EffectsManager.instance) {
            EffectsManager.instance = new EffectsManager();
        }
        return EffectsManager.instance;
    }

    /**
     * Bind to a scene. Creates the procedural particle texture if it doesn't exist.
     * Call once per RoomScene.create().
     */
    init(scene: Phaser.Scene): void {
        this.scene = scene;
        this.ensureParticleTexture();
        this.initialized = true;
    }

    /**
     * Create the 2x2 white pixel texture used by all particle emitters.
     * Only creates it once -- subsequent calls are no-ops.
     */
    private ensureParticleTexture(): void {
        if (this.scene.textures.exists(PARTICLE_TEXTURE)) return;

        const gfx = this.scene.add.graphics();
        gfx.fillStyle(0xffffff, 1);
        gfx.fillRect(0, 0, 2, 2);
        gfx.generateTexture(PARTICLE_TEXTURE, 2, 2);
        gfx.destroy();
    }

    /**
     * Handle room entry: clear existing effects, create new ones from room data.
     */
    onRoomEnter(roomData: { effects?: RoomEffectsData }): void {
        if (!this.initialized) return;

        this.clearAll();

        const multiplier = this.getQualityMultiplier();

        // When quality is 'off' or Canvas renderer: skip all effect creation
        if (multiplier === 0) {
            // Still apply lighting overlay (Rectangle works on Canvas) but skip PostFX
            if (roomData.effects?.lighting) {
                this.applyLighting(roomData.effects.lighting);
            }
            return;
        }

        if (roomData.effects?.weather) {
            const intensity = Math.max(0.1, Math.min(1.0, roomData.effects.weather.intensity ?? 0.5));
            this.createWeatherEmitter(roomData.effects.weather.type, intensity);
        }

        if (roomData.effects?.ambient) {
            for (const amb of roomData.effects.ambient) {
                const intensity = Math.max(0.1, Math.min(1.0, amb.intensity ?? 0.5));
                this.createAmbientEmitter(amb.type, intensity);
            }
        }

        if (roomData.effects?.lighting) {
            this.applyLighting(roomData.effects.lighting);
        }
    }

    /**
     * Destroy all active particle emitters, lighting, and null references.
     */
    private clearAll(): void {
        if (this.weatherEmitter) {
            this.weatherEmitter.destroy();
            this.weatherEmitter = null;
        }

        for (const emitter of this.ambientEmitters) {
            emitter.destroy();
        }
        this.ambientEmitters = [];

        this.clearLighting();
    }

    /**
     * Create a weather particle emitter based on type and intensity.
     * Weather effects are camera-relative (scrollFactor 0) at depth 80.
     */
    private createWeatherEmitter(type: WeatherType, intensity: number): void {
        const multiplier = this.getQualityMultiplier();
        if (multiplier === 0) return;

        let config: Phaser.Types.GameObjects.Particles.ParticleEmitterConfig;

        switch (type) {
            case 'rain':
                config = this.getRainConfig(intensity);
                break;
            case 'snow':
                config = this.getSnowConfig(intensity);
                break;
            case 'fog':
                config = this.getFogConfig(intensity);
                break;
            case 'dust':
                config = this.getDustConfig(intensity);
                break;
            default:
                return;
        }

        // Scale particle quantity by quality multiplier
        if (typeof config.quantity === 'number') {
            config.quantity = Math.max(1, Math.round(config.quantity * multiplier));
        }

        this.weatherEmitter = this.scene.add.particles(0, 0, PARTICLE_TEXTURE, config);
        this.weatherEmitter.setDepth(WEATHER_DEPTH);
        this.weatherEmitter.setScrollFactor(0);
    }

    /**
     * Rain: vertical streaks falling from top of screen.
     * Higher intensity = more droplets, denser rain.
     */
    private getRainConfig(intensity: number): Phaser.Types.GameObjects.Particles.ParticleEmitterConfig {
        return {
            emitZone: randomZone(new Phaser.Geom.Rectangle(0, -20, GAME_WIDTH, 10)),
            quantity: Math.round(3 + 5 * intensity),
            frequency: 0,
            speed: { min: 300, max: 500 },
            angle: { min: 85, max: 95 },
            lifespan: 800,
            scaleX: 0.5,
            scaleY: 3,
            alpha: { start: 0.4, end: 0.1 },
            tint: 0x8888cc,
        };
    }

    /**
     * Snow: slow-falling flakes with horizontal drift.
     * Higher intensity = more flakes.
     */
    private getSnowConfig(intensity: number): Phaser.Types.GameObjects.Particles.ParticleEmitterConfig {
        return {
            emitZone: randomZone(new Phaser.Geom.Rectangle(0, -20, GAME_WIDTH, 10)),
            quantity: Math.round(1 + 3 * intensity),
            frequency: 0,
            speed: { min: 30, max: 80 },
            angle: { min: 80, max: 100 },
            lifespan: 4000,
            scale: { min: 0.5, max: 2 },
            alpha: { start: 0.8, end: 0.2 },
            tint: 0xeeeeff,
            accelerationX: { min: -20, max: 20 },
        };
    }

    /**
     * Fog: large, slow-drifting translucent blobs in the lower half.
     * Higher intensity = more frequent fog patches.
     */
    private getFogConfig(intensity: number): Phaser.Types.GameObjects.Particles.ParticleEmitterConfig {
        return {
            emitZone: randomZone(new Phaser.Geom.Rectangle(0, GAME_HEIGHT * 0.5, GAME_WIDTH, GAME_HEIGHT * 0.5)),
            quantity: 1,
            frequency: Math.round(500 / intensity),
            speed: { min: 10, max: 30 },
            angle: 180,
            lifespan: 6000,
            scale: { start: 3, end: 6 },
            alpha: { start: 0.15, end: 0 },
            tint: 0xcccccc,
        };
    }

    /**
     * Dust: sparse motes drifting in random directions.
     * Higher intensity = more frequent dust particles.
     */
    private getDustConfig(intensity: number): Phaser.Types.GameObjects.Particles.ParticleEmitterConfig {
        return {
            emitZone: randomZone(new Phaser.Geom.Rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT)),
            quantity: 1,
            frequency: Math.round(200 / intensity),
            speed: { min: 5, max: 20 },
            angle: { min: 0, max: 360 },
            lifespan: 3000,
            scale: { min: 0.5, max: 1.5 },
            alpha: { start: 0.3, end: 0 },
            tint: 0xddbb88,
        };
    }

    /**
     * Create an ambient particle emitter based on type and intensity.
     * Ambient effects are camera-relative (scrollFactor 0) at depth 75.
     */
    private createAmbientEmitter(type: AmbientType, intensity: number): void {
        const multiplier = this.getQualityMultiplier();
        if (multiplier === 0) return;

        let config: Phaser.Types.GameObjects.Particles.ParticleEmitterConfig;

        switch (type) {
            case 'fireflies':
                config = this.getFirefliesConfig(intensity);
                break;
            case 'dust-motes':
                config = this.getDustMotesConfig(intensity);
                break;
            case 'falling-leaves':
                config = this.getFallingLeavesConfig(intensity);
                break;
            case 'embers':
                config = this.getEmbersConfig(intensity);
                break;
            default:
                return;
        }

        // Scale particle quantity by quality multiplier
        if (typeof config.quantity === 'number') {
            config.quantity = Math.max(1, Math.round(config.quantity * multiplier));
        }

        const emitter = this.scene.add.particles(0, 0, PARTICLE_TEXTURE, config);
        emitter.setDepth(AMBIENT_DEPTH);
        emitter.setScrollFactor(0);
        this.ambientEmitters.push(emitter);
    }

    /**
     * Fireflies: pulsing warm yellow dots floating in the lower 60%.
     * Uses color interpolation for a flickering glow effect.
     */
    private getFirefliesConfig(intensity: number): Phaser.Types.GameObjects.Particles.ParticleEmitterConfig {
        return {
            emitZone: randomZone(new Phaser.Geom.Rectangle(0, GAME_HEIGHT * 0.4, GAME_WIDTH, GAME_HEIGHT * 0.6)),
            quantity: 1,
            frequency: Math.round(800 / intensity),
            speed: { min: 5, max: 15 },
            angle: { min: 0, max: 360 },
            lifespan: 3000,
            scale: { min: 1, max: 2.5 },
            alpha: [0, 0.8, 0.3, 0.9, 0],
            tint: 0xffee44,
        };
    }

    /**
     * Dust motes: pale yellow-white specks drifting slowly upward.
     */
    private getDustMotesConfig(intensity: number): Phaser.Types.GameObjects.Particles.ParticleEmitterConfig {
        return {
            emitZone: randomZone(new Phaser.Geom.Rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT)),
            quantity: 1,
            frequency: Math.round(400 / intensity),
            speed: { min: 2, max: 8 },
            angle: { min: 0, max: 360 },
            lifespan: 5000,
            scale: { min: 0.3, max: 1 },
            alpha: { start: 0.2, end: 0 },
            tint: 0xffffdd,
            gravityY: -5,
        };
    }

    /**
     * Falling leaves: autumn-colored particles tumbling from above.
     * Uses random tint selection from autumn palette.
     */
    private getFallingLeavesConfig(intensity: number): Phaser.Types.GameObjects.Particles.ParticleEmitterConfig {
        const leafColors = [0xcc8844, 0xdd9933, 0x886622, 0xbb7733];
        const tint = leafColors[Math.floor(Math.random() * leafColors.length)];

        return {
            emitZone: randomZone(new Phaser.Geom.Rectangle(0, -10, GAME_WIDTH, 10)),
            quantity: 1,
            frequency: Math.round(600 / intensity),
            speed: { min: 20, max: 60 },
            angle: { min: 70, max: 110 },
            lifespan: 4000,
            scale: { min: 1, max: 3 },
            alpha: { start: 0.7, end: 0.2 },
            tint: tint,
            rotate: { min: -180, max: 180 },
            accelerationX: { min: -30, max: 30 },
        };
    }

    /**
     * Embers: bright fire-colored particles rising from the bottom.
     * Uses random tint from fire palette.
     */
    private getEmbersConfig(intensity: number): Phaser.Types.GameObjects.Particles.ParticleEmitterConfig {
        const fireColors = [0xff4400, 0xff6600, 0xffaa00];
        const tint = fireColors[Math.floor(Math.random() * fireColors.length)];

        return {
            emitZone: randomZone(new Phaser.Geom.Rectangle(0, GAME_HEIGHT * 0.7, GAME_WIDTH, GAME_HEIGHT * 0.3)),
            quantity: 1,
            frequency: Math.round(300 / intensity),
            speed: { min: 30, max: 80 },
            angle: { min: -100, max: -80 },
            lifespan: 2000,
            scale: { min: 0.5, max: 1.5 },
            alpha: { start: 0.9, end: 0 },
            tint: tint,
        };
    }

    /**
     * Apply per-room lighting: tint overlay, vignette, torch flicker, and PostFX.
     * Lighting overlay sits at depth 70 (below ambient 75 and weather 80)
     * so particles float above the tint, which looks correct.
     */
    private applyLighting(config: LightingData): void {
        const quality = QualitySettings.getInstance().getLevel();
        const isCanvas = this.scene?.game
            ? QualitySettings.isCanvasRenderer(this.scene.game)
            : false;
        const skipPostFX = quality === 'off' || isCanvas;

        // Tint + Brightness overlay (Rectangle works on Canvas -- always apply)
        const tintColor = config.tint
            ? parseInt(config.tint.replace('#', ''), 16)
            : 0x000000;
        const brightness = Math.max(0, Math.min(1, config.brightness ?? 1.0));
        this.baseOverlayAlpha = 1 - brightness;

        if (this.baseOverlayAlpha > 0 || config.tint) {
            this.lightingOverlay = this.scene.add.rectangle(
                0, 0, GAME_WIDTH, GAME_HEIGHT, tintColor, this.baseOverlayAlpha
            );
            this.lightingOverlay.setOrigin(0, 0);
            this.lightingOverlay.setScrollFactor(0);
            this.lightingOverlay.setDepth(LIGHTING_DEPTH);
        }

        // Skip all PostFX and timer-based effects when quality is off or Canvas
        if (skipPostFX) return;

        // Vignette via PostFX
        if (config.vignette && config.vignette > 0) {
            this.scene.cameras.main.postFX.addVignette(0.5, 0.5, 0.5, config.vignette);
            this.postFXActive = true;
        }

        // Torch flicker: oscillate lighting overlay alpha on a timer
        if (config.torchFlicker && this.lightingOverlay) {
            this.flickerTimer = this.scene.time.addEvent({
                delay: 150,
                callback: () => {
                    if (this.lightingOverlay) {
                        const flicker = (Math.random() - 0.5) * 0.12;
                        this.lightingOverlay.setAlpha(
                            Math.max(0, Math.min(1, this.baseOverlayAlpha + flicker))
                        );
                    }
                },
                loop: true,
            });
        }

        // PostFX effects
        if (config.postfx) {
            for (const fx of config.postfx) {
                switch (fx) {
                    case 'bloom':
                        this.scene.cameras.main.postFX.addBloom(0xffffff, 1, 1, 1, 1.2);
                        this.postFXActive = true;
                        break;
                    case 'glow':
                        this.scene.cameras.main.postFX.addGlow(0xffff88, 2, 0, false, 0.1, 10);
                        this.postFXActive = true;
                        break;
                    case 'desaturate': {
                        const colorMatrix = this.scene.cameras.main.postFX.addColorMatrix();
                        colorMatrix.grayscale();
                        this.postFXActive = true;
                        break;
                    }
                }
            }
        }
    }

    /**
     * Remove all lighting effects: overlay, flicker timer, and PostFX.
     */
    private clearLighting(): void {
        if (this.lightingOverlay) {
            this.lightingOverlay.destroy();
            this.lightingOverlay = null;
        }

        if (this.flickerTimer) {
            this.flickerTimer.remove(false);
            this.flickerTimer = null;
        }

        // Clear all PostFX from camera (removes vignette, bloom, glow, color matrix)
        if (this.postFXActive && this.scene?.cameras?.main?.postFX) {
            this.scene.cameras.main.postFX.clear();
        }
        this.postFXActive = false;
        this.baseOverlayAlpha = 0;
    }

    /**
     * Play a one-shot sparkle burst at the given world position.
     * Used for hotspot interaction feedback (click, command, item pickup).
     * Depth 85: above weather/ambient, visible over room objects.
     */
    playInteractionBurst(worldX: number, worldY: number): void {
        if (!this.initialized) return;

        const multiplier = this.getQualityMultiplier();
        if (multiplier === 0) return;

        const burstCount = Math.max(1, Math.round(12 * multiplier));
        const emitter = this.scene.add.particles(0, 0, PARTICLE_TEXTURE, {
            x: worldX,
            y: worldY,
            quantity: burstCount,
            speed: { min: 40, max: 120 },
            angle: { min: 0, max: 360 },
            lifespan: 600,
            scale: { start: 1.5, end: 0 },
            alpha: { start: 1, end: 0 },
            tint: 0xffdd44,
            emitting: false,
        });
        emitter.setDepth(85);
        // World-positioned: do NOT setScrollFactor(0)
        emitter.explode(burstCount, worldX, worldY);
        this.scene.time.delayedCall(1000, () => emitter.destroy());
    }

    /**
     * Remove all effects. Call from RoomScene shutdown.
     * Does NOT destroy the singleton -- only clears active emitters.
     */
    cleanup(): void {
        this.clearAll();
        this.initialized = false;
    }
}
