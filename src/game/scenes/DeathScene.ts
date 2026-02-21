import { Scene } from 'phaser';
import { GameState } from '../state/GameState';
import { SaveManager } from '../state/SaveManager';

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

        // Dark overlay -- captures clicks to prevent pass-through to RoomScene
        this.add.rectangle(480, 270, 960, 540, 0x000000, 0.85)
            .setDepth(0)
            .setInteractive();

        // Death title
        this.add.text(480, 130, title, {
            fontFamily: 'monospace',
            fontSize: '28px',
            color: '#cc3333',
        }).setOrigin(0.5).setDepth(1);

        // Discovery counter (replaces old death count)
        if (data.discoveredCount !== undefined && data.totalDeaths) {
            this.add.text(480, 165, `${data.discoveredCount}/${data.totalDeaths} deaths discovered`, {
                fontFamily: 'monospace',
                fontSize: '12px',
                color: '#666666',
            }).setOrigin(0.5).setDepth(1);
        } else {
            // Fallback: show old death count for backward compatibility
            const deathCount = GameState.getInstance().getData().deathCount;
            this.add.text(480, 165, `Deaths: ${deathCount}`, {
                fontFamily: 'monospace',
                fontSize: '12px',
                color: '#666666',
            }).setOrigin(0.5).setDepth(1);
        }

        // "New!" badge for first-time death discovery
        if (data.isNewDeath) {
            const badge = this.add.text(480, 95, 'NEW DEATH DISCOVERED!', {
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
        this.add.text(480, 280, narratorText, {
            fontFamily: 'monospace',
            fontSize: '16px',
            color: '#c8c8d4',
            wordWrap: { width: 700 },
            align: 'center',
            lineSpacing: 8,
        }).setOrigin(0.5).setDepth(1);

        // Try Again button
        const tryAgainText = this.add.text(480, 430, '[ Try Again ]', {
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
