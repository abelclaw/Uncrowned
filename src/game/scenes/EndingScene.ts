import { Scene } from 'phaser';
import { GameState } from '../state/GameState';
import type { EndingEntry, EndingRegistry } from '../types/EndingRegistryData';

/**
 * Data passed when starting the EndingScene.
 * RoomScene constructs this from MetaGameState before scene.start().
 */
export interface EndingSceneData {
    endingId: string;
    isNewEnding: boolean;
    discoveredCount: number;
    totalEndings: number;
}

/**
 * Full-screen ending scene -- started via scene.start() to replace RoomScene entirely.
 * Displays the ending title, subtitle, epilogue text, discovery counter, credits,
 * and navigation buttons (Play Again / Main Menu).
 *
 * Unlike DeathScene (which is an overlay via scene.launch), this scene fully
 * replaces RoomScene because the game is over.
 */
export class EndingScene extends Scene {
    constructor() {
        super('EndingScene');
    }

    create(data: EndingSceneData): void {
        // Load ending data from cache
        const registry = this.cache.json.get('endings-registry') as EndingRegistry | undefined;
        if (!registry) {
            console.error('EndingScene: endings-registry not found in cache');
            this.scene.start('MainMenuScene');
            return;
        }

        const ending: EndingEntry | undefined = registry.endings.find(
            (e: EndingEntry) => e.id === data.endingId
        );
        if (!ending) {
            console.error(`EndingScene: ending "${data.endingId}" not found in registry`);
            this.scene.start('MainMenuScene');
            return;
        }

        // 1. Dark background (full opacity -- this is a replacement scene, not overlay)
        this.add.rectangle(480, 270, 960, 540, 0x000000, 1.0)
            .setDepth(0);

        // 2. "NEW ENDING DISCOVERED!" badge (if new)
        if (data.isNewEnding) {
            const badge = this.add.text(480, 60, 'NEW ENDING DISCOVERED!', {
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

        // 3. Ending title
        this.add.text(480, 100, ending.title, {
            fontFamily: 'monospace',
            fontSize: '26px',
            color: '#c8c8d4',
        }).setOrigin(0.5).setDepth(1);

        // 4. Subtitle
        this.add.text(480, 135, ending.subtitle, {
            fontFamily: 'monospace',
            fontSize: '12px',
            color: '#888888',
        }).setOrigin(0.5).setDepth(1);

        // 5. Epilogue text (centered vertically in available space)
        this.add.text(480, 300, ending.epilogueText, {
            fontFamily: 'monospace',
            fontSize: '13px',
            color: '#c8c8d4',
            wordWrap: { width: 780 },
            align: 'left',
            lineSpacing: 6,
        }).setOrigin(0.5).setDepth(1);

        // 6. "---- THE END ----"
        this.add.text(480, 460, '---- THE END ----', {
            fontFamily: 'monospace',
            fontSize: '14px',
            color: '#666666',
        }).setOrigin(0.5).setDepth(1);

        // 7. Discovery counter
        this.add.text(480, 480, `${data.discoveredCount}/${data.totalEndings} endings discovered`, {
            fontFamily: 'monospace',
            fontSize: '11px',
            color: '#555555',
        }).setOrigin(0.5).setDepth(1);

        // 8. "[ Play Again ]" button
        const playAgainText = this.add.text(340, 510, '[ Play Again ]', {
            fontFamily: 'monospace',
            fontSize: '20px',
            color: '#ffcc00',
        }).setOrigin(0.5).setDepth(1);

        playAgainText.setInteractive({ useHandCursor: true });

        playAgainText.on('pointerover', () => {
            playAgainText.setColor('#ffffff');
            playAgainText.setScale(1.05);
        });

        playAgainText.on('pointerout', () => {
            playAgainText.setColor('#ffcc00');
            playAgainText.setScale(1.0);
        });

        playAgainText.on('pointerdown', () => {
            // Reset GameState and start a fresh game at forest_clearing
            GameState.getInstance().reset();
            this.scene.start('RoomScene', { roomId: 'forest_clearing' });
        });

        // 9. "[ Main Menu ]" button
        const mainMenuText = this.add.text(620, 510, '[ Main Menu ]', {
            fontFamily: 'monospace',
            fontSize: '20px',
            color: '#c8c8d4',
        }).setOrigin(0.5).setDepth(1);

        mainMenuText.setInteractive({ useHandCursor: true });

        mainMenuText.on('pointerover', () => {
            mainMenuText.setColor('#ffffff');
            mainMenuText.setScale(1.05);
        });

        mainMenuText.on('pointerout', () => {
            mainMenuText.setColor('#c8c8d4');
            mainMenuText.setScale(1.0);
        });

        mainMenuText.on('pointerdown', () => {
            this.scene.start('MainMenuScene');
        });
    }
}
