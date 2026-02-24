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

        // ── Fixed layout zones ──
        // Header: title + counter at top; Footer: buttons pinned to bottom
        // Content: narrator text fills the space between, anchored at top
        const headerTop = hasImage ? 30 : 30;
        const tryAgainY = 485;
        const galleryY = 515;

        let nextY = headerTop;

        // Death image (if available)
        if (hasImage) {
            const imageSize = 120;
            const imageY = nextY + imageSize / 2;
            const img = this.add.image(480, imageY, textureKey)
                .setDepth(1);

            const scale = imageSize / Math.max(img.width, img.height);
            img.setScale(scale);

            this.add.rectangle(480, imageY, imageSize + 4, imageSize + 4, 0x000000, 0)
                .setStrokeStyle(2, 0x661111)
                .setDepth(0.5);

            img.setAlpha(0);
            this.tweens.add({
                targets: img,
                alpha: 1,
                duration: 600,
                ease: 'Power2',
            });

            nextY += imageSize + 10;
        }

        // "New!" badge for first-time death discovery
        if (data.isNewDeath) {
            const badge = this.add.text(480, nextY, 'NEW DEATH DISCOVERED!', {
                fontFamily: 'monospace',
                fontSize: '14px',
                color: '#ffcc00',
            }).setOrigin(0.5, 0).setAlpha(0).setDepth(1);

            this.tweens.add({
                targets: badge,
                alpha: 1,
                y: badge.y - 5,
                duration: 500,
                ease: 'Back.easeOut',
            });
            nextY += 22;
        }

        // Death title
        this.add.text(480, nextY, title, {
            fontFamily: 'monospace',
            fontSize: '28px',
            color: '#cc3333',
        }).setOrigin(0.5, 0).setDepth(1);
        nextY += 38;

        // Discovery counter
        if (data.discoveredCount !== undefined && data.totalDeaths) {
            this.add.text(480, nextY, `${data.discoveredCount}/${data.totalDeaths} deaths discovered`, {
                fontFamily: 'monospace',
                fontSize: '12px',
                color: '#666666',
            }).setOrigin(0.5, 0).setDepth(1);
        } else {
            const deathCount = GameState.getInstance().getData().deathCount;
            this.add.text(480, nextY, `Deaths: ${deathCount}`, {
                fontFamily: 'monospace',
                fontSize: '12px',
                color: '#666666',
            }).setOrigin(0.5, 0).setDepth(1);
        }
        nextY += 24;

        // ── Narrator text — fills remaining space between header and footer ──
        const textTop = nextY + 8;
        const textMaxHeight = tryAgainY - 30 - textTop;

        // Try normal size first; shrink if it overflows
        let fontSize = 14;
        const narratorTextObj = this.add.text(480, textTop, narratorText, {
            fontFamily: 'monospace',
            fontSize: `${fontSize}px`,
            color: '#c8c8d4',
            wordWrap: { width: 680 },
            align: 'center',
            lineSpacing: 6,
        }).setOrigin(0.5, 0).setDepth(1);

        // Shrink font if text overflows the available space
        while (narratorTextObj.height > textMaxHeight && fontSize > 10) {
            fontSize--;
            narratorTextObj.setFontSize(fontSize);
        }

        // Try Again button (pinned to bottom)
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
