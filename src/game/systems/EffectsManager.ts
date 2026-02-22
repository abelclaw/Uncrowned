import Phaser from 'phaser';
import type { RoomEffectsData, WeatherType, AmbientType } from '../types/RoomData';

/**
 * Game viewport constants matching canvas size.
 * Used for positioning particle emitters relative to the camera.
 */
const GAME_WIDTH = 960;
const GAME_HEIGHT = 540;

/** Particle texture key created procedurally */
const PARTICLE_TEXTURE = 'particle-white';

/** Depth constants for layering */
const WEATHER_DEPTH = 80;
const AMBIENT_DEPTH = 75;

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

    private constructor() {}

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
    }

    /**
     * Destroy all active particle emitters and null references.
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
    }

    /**
     * Create a weather particle emitter based on type and intensity.
     * Weather effects are camera-relative (scrollFactor 0) at depth 80.
     */
    private createWeatherEmitter(type: WeatherType, intensity: number): void {
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
     * Remove all effects. Call from RoomScene shutdown.
     * Does NOT destroy the singleton -- only clears active emitters.
     */
    cleanup(): void {
        this.clearAll();
        this.initialized = false;
    }
}
