import { Scene } from 'phaser';
import { MetaGameState } from '../state/MetaGameState';
import type { EndingEntry, EndingRegistry } from '../types/EndingRegistryData';

interface EndingsGalleryData {
    returnTo?: string;
}

/**
 * Endings Gallery scene -- displays a vertical list of all 4 endings.
 * Discovered endings show title, subtitle, and clicking opens a detail overlay with full epilogue.
 * Locked endings show "???" and a cryptic gallery hint.
 */
export class EndingsGalleryScene extends Scene {
    private endingRegistry!: EndingRegistry;
    private discoveredIds: readonly string[] = [];
    private overlayObjects: Phaser.GameObjects.GameObject[] = [];
    private returnTo = 'MainMenuScene';

    constructor() {
        super('EndingsGalleryScene');
    }

    create(data?: EndingsGalleryData): void {
        this.returnTo = data?.returnTo ?? 'MainMenuScene';
        this.overlayObjects = [];

        // Load data sources
        this.endingRegistry = this.cache.json.get('endings-registry') as EndingRegistry;
        this.discoveredIds = MetaGameState.getInstance().getEndingsDiscovered();

        // Background
        this.add.rectangle(480, 270, 960, 540, 0x1a1a2e);

        // Title
        this.add.text(480, 60, 'Endings Gallery', {
            fontFamily: 'monospace',
            fontSize: '26px',
            color: '#c8c8d4',
        }).setOrigin(0.5);

        // Subtitle: X/Y endings discovered
        this.add.text(480, 90, `${this.discoveredIds.length}/${this.endingRegistry.totalEndings} endings discovered`, {
            fontFamily: 'monospace',
            fontSize: '12px',
            color: '#888888',
        }).setOrigin(0.5);

        // Render 4 ending cards vertically
        const endings = this.endingRegistry.endings;
        const yPositions = [150, 230, 310, 390];

        for (let i = 0; i < endings.length; i++) {
            const entry = endings[i];
            const y = yPositions[i];
            const isDiscovered = this.discoveredIds.includes(entry.id);
            this.renderEndingCard(entry, y, isDiscovered);
        }

        // Back button
        const backText = this.add.text(480, 470, '[ Back ]', {
            fontFamily: 'monospace',
            fontSize: '18px',
            color: '#c8c8d4',
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        backText.on('pointerover', () => {
            backText.setColor('#ffffff');
            backText.setScale(1.05);
        });
        backText.on('pointerout', () => {
            backText.setColor('#c8c8d4');
            backText.setScale(1.0);
        });
        backText.on('pointerdown', () => {
            this.scene.start(this.returnTo);
        });
    }

    private renderEndingCard(entry: EndingEntry, y: number, isDiscovered: boolean): void {
        if (isDiscovered) {
            // Discovered ending: title + subtitle, clickable
            const titleText = this.add.text(480, y, entry.title, {
                fontFamily: 'monospace',
                fontSize: '18px',
                color: '#c8c8d4',
            }).setOrigin(0.5);

            const subtitleText = this.add.text(480, y + 24, entry.subtitle, {
                fontFamily: 'monospace',
                fontSize: '11px',
                color: '#888888',
            }).setOrigin(0.5);

            // Make title interactive
            titleText.setInteractive({ useHandCursor: true });

            titleText.on('pointerover', () => {
                titleText.setColor('#ffffff');
                titleText.setScale(1.05);
                subtitleText.setColor('#aaaaaa');
            });

            titleText.on('pointerout', () => {
                titleText.setColor('#c8c8d4');
                titleText.setScale(1.0);
                subtitleText.setColor('#888888');
            });

            titleText.on('pointerdown', () => {
                this.showDetailOverlay(entry);
            });
        } else {
            // Locked ending: ??? and hint
            this.add.text(480, y, '???', {
                fontFamily: 'monospace',
                fontSize: '18px',
                color: '#555555',
            }).setOrigin(0.5);

            this.add.text(480, y + 24, entry.galleryHint, {
                fontFamily: 'monospace',
                fontSize: '11px',
                color: '#555555',
                wordWrap: { width: 700 },
                align: 'center',
            }).setOrigin(0.5);
        }
    }

    private showDetailOverlay(entry: EndingEntry): void {
        // Clear any existing overlay
        this.destroyOverlay();

        // Dark overlay background capturing all input
        const overlayBg = this.add.rectangle(480, 270, 960, 540, 0x000000, 0.9)
            .setDepth(10)
            .setInteractive();
        this.overlayObjects.push(overlayBg);

        // Ending title
        const titleText = this.add.text(480, 80, entry.title, {
            fontFamily: 'monospace',
            fontSize: '22px',
            color: '#c8c8d4',
        }).setOrigin(0.5).setDepth(11);
        this.overlayObjects.push(titleText);

        // Subtitle
        const subtitleText = this.add.text(480, 110, entry.subtitle, {
            fontFamily: 'monospace',
            fontSize: '12px',
            color: '#888888',
        }).setOrigin(0.5).setDepth(11);
        this.overlayObjects.push(subtitleText);

        // Full epilogue text
        const epilogueText = this.add.text(480, 300, entry.epilogueText, {
            fontFamily: 'monospace',
            fontSize: '12px',
            color: '#c8c8d4',
            wordWrap: { width: 780 },
            align: 'center',
            lineSpacing: 5,
        }).setOrigin(0.5).setDepth(11);
        this.overlayObjects.push(epilogueText);

        // Back button
        const closeText = this.add.text(480, 490, '[ Back ]', {
            fontFamily: 'monospace',
            fontSize: '18px',
            color: '#c8c8d4',
        }).setOrigin(0.5).setDepth(11).setInteractive({ useHandCursor: true });

        closeText.on('pointerover', () => {
            closeText.setColor('#ffffff');
            closeText.setScale(1.05);
        });
        closeText.on('pointerout', () => {
            closeText.setColor('#c8c8d4');
            closeText.setScale(1.0);
        });
        closeText.on('pointerdown', () => {
            this.destroyOverlay();
        });
        this.overlayObjects.push(closeText);
    }

    private destroyOverlay(): void {
        for (const obj of this.overlayObjects) {
            obj.destroy();
        }
        this.overlayObjects = [];
    }
}
