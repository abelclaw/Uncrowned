import { Scene } from 'phaser';
import { GameState } from '../state/GameState';
import { SaveManager } from '../state/SaveManager';
import { AudioManager } from '../systems/AudioManager';

/**
 * Data passed when launching the DeathScene overlay.
 * The gallery-related fields (deathId, isNewDeath, discoveredCount, totalDeaths)
 * are optional for backward compatibility with older callers.
 */
export interface DeathSceneData {
    title: string;
    narratorText: string;
    deathId?: string;
    isNewDeath?: boolean;
    discoveredCount?: number;
    totalDeaths?: number;
    imageId?: string;
}

/**
 * Death overlay scene -- launched on top of RoomScene.
 * Shows a dark overlay with the death title, death count, narrator text,
 * and a "Try Again" button that restores from auto-save.
 *
 * This scene captures all input to prevent click-through to the paused RoomScene.
 */
export class DeathScene extends Scene {
    constructor() {
        super('DeathScene');
    }

    create(data: DeathSceneData): void {
        const title = data.title || 'You Died';
        const narratorText = data.narratorText || 'Perhaps that was not the wisest course of action.';
        const imageId = data.imageId;
        const textureKey = imageId ? `death-img-${imageId}` : undefined;

        // Dark overlay -- captures clicks to prevent pass-through to RoomScene
        this.add.rectangle(480, 270, 960, 540, 0x000000, 0.85)
            .setDepth(0)
            .setInteractive();

        // Death theme — play once (non-looping), crossfade from room music
        const audio = AudioManager.getInstance();
        audio.init(this);
        audio.setAmbient([]);  // Silence ambient sounds
        audio.playMusic('music-death', 1000, false);

        // Check if we have a death image to display
        const hasImage = textureKey !== undefined && this.textures.exists(textureKey);

        // Layout shifts when image is present
        const imageSize = 160;
        const imageY = 100;
        const titleY = hasImage ? imageY + imageSize / 2 + 20 : 130;
        const counterY = titleY + 35;
        const badgeY = titleY - 35;
        const textY = hasImage ? 330 : 280;
        const tryAgainY = hasImage ? 460 : 430;
        const galleryY = tryAgainY + 40;

        // Death image (if available)
        if (hasImage) {
            const img = this.add.image(480, imageY, textureKey)
                .setDepth(1);

            // Scale to display size
            const scale = imageSize / Math.max(img.width, img.height);
            img.setScale(scale);

            // Subtle red border
            this.add.rectangle(480, imageY, imageSize + 4, imageSize + 4, 0x000000, 0)
                .setStrokeStyle(2, 0x661111)
                .setDepth(0.5);

            // Fade in the image
            img.setAlpha(0);
            this.tweens.add({
                targets: img,
                alpha: 1,
                duration: 600,
                ease: 'Power2',
            });
        }

        // Death title
        this.add.text(480, titleY, title, {
            fontFamily: 'monospace',
            fontSize: '28px',
            color: '#cc3333',
        }).setOrigin(0.5).setDepth(1);

        // Discovery counter (replaces old death count)
        if (data.discoveredCount !== undefined && data.totalDeaths) {
            this.add.text(480, counterY, `${data.discoveredCount}/${data.totalDeaths} deaths discovered`, {
                fontFamily: 'monospace',
                fontSize: '12px',
                color: '#666666',
            }).setOrigin(0.5).setDepth(1);
        } else {
            // Fallback: show old death count for backward compatibility
            const deathCount = GameState.getInstance().getData().deathCount;
            this.add.text(480, counterY, `Deaths: ${deathCount}`, {
                fontFamily: 'monospace',
                fontSize: '12px',
                color: '#666666',
            }).setOrigin(0.5).setDepth(1);
        }

        // "New!" badge for first-time death discovery
        if (data.isNewDeath) {
            const badge = this.add.text(480, badgeY, 'NEW DEATH DISCOVERED!', {
                fontFamily: 'monospace',
                fontSize: '14px',
                color: '#ffcc00',
            }).setOrigin(0.5).setAlpha(0).setDepth(1);

            this.tweens.add({
                targets: badge,
                alpha: 1,
                y: badge.y - 10,
                duration: 500,
                ease: 'Back.easeOut',
            });
        }

        // Narrator text
        this.add.text(480, textY, narratorText, {
            fontFamily: 'monospace',
            fontSize: '16px',
            color: '#c8c8d4',
            wordWrap: { width: 700 },
            align: 'center',
            lineSpacing: 8,
        }).setOrigin(0.5).setDepth(1);

        // Try Again button
        const tryAgainText = this.add.text(480, tryAgainY, '[ Try Again ]', {
            fontFamily: 'monospace',
            fontSize: '22px',
            color: '#ffcc00',
        }).setOrigin(0.5).setDepth(1);

        tryAgainText.setInteractive({ useHandCursor: true });

        tryAgainText.on('pointerover', () => {
            tryAgainText.setColor('#ffffff');
            tryAgainText.setScale(1.05);
        });

        tryAgainText.on('pointerout', () => {
            tryAgainText.setColor('#ffcc00');
            tryAgainText.setScale(1.0);
        });

        tryAgainText.on('pointerdown', () => {
            this.handleRetry();
        });

        // Death Gallery button (secondary, below Try Again)
        const galleryText = this.add.text(480, galleryY, '[ Death Gallery ]', {
            fontFamily: 'monospace',
            fontSize: '16px',
            color: '#888888',
        }).setOrigin(0.5).setDepth(1);

        galleryText.setInteractive({ useHandCursor: true });

        galleryText.on('pointerover', () => {
            galleryText.setColor('#ffffff');
            galleryText.setScale(1.05);
        });

        galleryText.on('pointerout', () => {
            galleryText.setColor('#888888');
            galleryText.setScale(1.0);
        });

        galleryText.on('pointerdown', () => {
            // Stop both DeathScene and RoomScene, start gallery
            this.scene.stop('DeathScene');
            this.scene.stop('RoomScene');
            this.scene.start('DeathGalleryScene', { returnTo: 'MainMenuScene' });
        });

        // Pre-load death image for next time if not yet cached
        if (textureKey && !this.textures.exists(textureKey) && imageId) {
            this.load.image(textureKey, `assets/death-images/${imageId}.png`);
            this.load.start();
        }
    }

    private handleRetry(): void {
        const state = GameState.getInstance();

        // Increment death count (direct mutation on singleton data is acceptable;
        // getData() returns Readonly<> type but the singleton owns the data)
        (state.getData() as { deathCount: number }).deathCount++;

        // Load the auto-save to restore state to room-entry snapshot
        SaveManager.loadAutoSave(state);

        // Get the room to restart in
        const roomId = state.getData().currentRoom;

        // Stop this overlay scene
        this.scene.stop('DeathScene');

        // Restart RoomScene with restored room
        this.scene.start('RoomScene', { roomId });
    }
}
