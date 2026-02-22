import Phaser from 'phaser';
import { isMobile } from './MobileKeyboardManager';

/**
 * Quality level for visual effects.
 * - 'high': Full particles, full PostFX
 * - 'low': Half particles, no PostFX on mobile
 * - 'off': No particles, no PostFX
 */
export type QualityLevel = 'high' | 'low' | 'off';

const STORAGE_KEY = 'kqgame-quality';
const VALID_LEVELS: QualityLevel[] = ['high', 'low', 'off'];

/**
 * Singleton managing the player's chosen visual quality level.
 *
 * Persists the setting to localStorage under `kqgame-quality`.
 * Provides static helpers to detect Canvas renderer and mobile devices
 * so EffectsManager can degrade gracefully.
 */
export class QualitySettings {
    private static instance: QualitySettings;

    private level: QualityLevel;

    private constructor() {
        this.level = 'high';
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored && VALID_LEVELS.includes(stored as QualityLevel)) {
                this.level = stored as QualityLevel;
            }
        } catch {
            // localStorage unavailable (incognito, SSR) -- keep default
        }
    }

    static getInstance(): QualitySettings {
        if (!QualitySettings.instance) {
            QualitySettings.instance = new QualitySettings();
        }
        return QualitySettings.instance;
    }

    /** Reset the singleton (for testing). */
    static resetInstance(): void {
        QualitySettings.instance = undefined as unknown as QualitySettings;
    }

    getLevel(): QualityLevel {
        return this.level;
    }

    setLevel(level: QualityLevel): void {
        this.level = level;
        try {
            localStorage.setItem(STORAGE_KEY, level);
        } catch {
            // localStorage unavailable -- setting is in-memory only
        }
    }

    /**
     * Check if the Phaser game is using the Canvas renderer (no WebGL).
     * Canvas renderer cannot use PostFX (bloom, glow, vignette, color matrix).
     */
    static isCanvasRenderer(game: Phaser.Game): boolean {
        return game.renderer.type === Phaser.CANVAS;
    }

    /**
     * Detect whether the current device is mobile/touch.
     * Delegates to the shared isMobile() utility in MobileKeyboardManager.
     */
    static isMobileDevice(): boolean {
        return isMobile();
    }
}
