import { Scene } from 'phaser';
import { GameState } from '../state/GameState';
import { SaveManager } from '../state/SaveManager';

/**
 * Main menu scene -- the game's entry point.
 * Displays title, subtitle, and menu options:
 *   - New Game (always)
 *   - Continue (only when auto-save exists)
 *   - Load Game (slot selection sub-menu)
 */
export class MainMenuScene extends Scene {
    private menuItems: Phaser.GameObjects.Text[] = [];
    private slotItems: Phaser.GameObjects.Text[] = [];

    constructor() {
        super('MainMenuScene');
    }

    create(): void {
        this.menuItems = [];
        this.slotItems = [];

        // Background
        this.add.rectangle(480, 270, 960, 540, 0x1a1a2e);

        // Title
        this.add.text(480, 140, "Uncrowned", {
            fontFamily: 'monospace',
            fontSize: '36px',
            color: '#c8c8d4',
            shadow: {
                offsetX: 2,
                offsetY: 2,
                color: '#000000',
                blur: 4,
                fill: true,
            },
        }).setOrigin(0.5);

        // Subtitle
        this.add.text(480, 180, 'A Text Adventure', {
            fontFamily: 'monospace',
            fontSize: '14px',
            color: '#888888',
        }).setOrigin(0.5);

        this.showMainMenu();
    }

    private showMainMenu(): void {
        this.clearSlotItems();

        let y = 300;

        // New Game -- always visible
        const newGameText = this.createMenuItem('New Game', 480, y, () => {
            GameState.getInstance().reset();
            this.scene.start('RoomScene', { roomId: 'forest_clearing' });
        });
        this.menuItems.push(newGameText);
        y += 50;

        // Continue -- only when auto-save exists
        if (SaveManager.hasAutoSave()) {
            const continueText = this.createMenuItem('Continue', 480, y, () => {
                const state = GameState.getInstance();
                SaveManager.loadAutoSave(state);
                this.scene.start('RoomScene', { roomId: state.getData().currentRoom });
            });
            this.menuItems.push(continueText);
            y += 50;
        }

        // Load Game -- always visible
        const loadText = this.createMenuItem('Load Game', 480, y, () => {
            this.showLoadMenu();
        });
        this.menuItems.push(loadText);
    }

    private showLoadMenu(): void {
        this.clearMenuItems();

        const slotInfos = SaveManager.getSlotInfos();
        let y = 240;
        let hasAnySave = false;

        // Title for load sub-menu
        const loadTitle = this.add.text(480, 190, '-- Load Game --', {
            fontFamily: 'monospace',
            fontSize: '22px',
            color: '#c8c8d4',
        }).setOrigin(0.5);
        this.slotItems.push(loadTitle);

        for (let i = 0; i < slotInfos.length; i++) {
            const info = slotInfos[i];
            if (info) {
                hasAnySave = true;
                const label = `Slot ${info.slot} - ${info.roomId}`;
                const slotText = this.createSlotItem(label, 480, y, info.slot);
                this.slotItems.push(slotText);
            } else {
                const emptyText = this.add.text(480, y, `Slot ${i + 1} - Empty`, {
                    fontFamily: 'monospace',
                    fontSize: '18px',
                    color: '#555555',
                }).setOrigin(0.5);
                this.slotItems.push(emptyText);
            }
            y += 40;
        }

        if (!hasAnySave) {
            const noSavesText = this.add.text(480, y + 10, 'No saved games found.', {
                fontFamily: 'monospace',
                fontSize: '16px',
                color: '#888888',
            }).setOrigin(0.5);
            this.slotItems.push(noSavesText);
        }

        // Back button
        y += 50;
        const backText = this.createMenuItem('Back', 480, y, () => {
            this.clearSlotItems();
            this.showMainMenu();
        });
        this.slotItems.push(backText);
    }

    private createMenuItem(label: string, x: number, y: number, onClick: () => void): Phaser.GameObjects.Text {
        const text = this.add.text(x, y, label, {
            fontFamily: 'monospace',
            fontSize: '20px',
            color: '#c8c8d4',
        }).setOrigin(0.5);

        text.setInteractive({ useHandCursor: true });

        text.on('pointerover', () => {
            text.setColor('#ffffff');
            text.setScale(1.05);
        });

        text.on('pointerout', () => {
            text.setColor('#c8c8d4');
            text.setScale(1.0);
        });

        text.on('pointerdown', onClick);

        return text;
    }

    private createSlotItem(label: string, x: number, y: number, slot: number): Phaser.GameObjects.Text {
        const text = this.add.text(x, y, label, {
            fontFamily: 'monospace',
            fontSize: '18px',
            color: '#c8c8d4',
        }).setOrigin(0.5);

        text.setInteractive({ useHandCursor: true });

        text.on('pointerover', () => {
            text.setColor('#ffffff');
            text.setScale(1.05);
        });

        text.on('pointerout', () => {
            text.setColor('#c8c8d4');
            text.setScale(1.0);
        });

        text.on('pointerdown', () => {
            const state = GameState.getInstance();
            const loaded = SaveManager.loadFromSlot(state, slot);
            if (loaded) {
                this.scene.start('RoomScene', { roomId: state.getData().currentRoom });
            }
        });

        return text;
    }

    private clearMenuItems(): void {
        for (const item of this.menuItems) {
            item.destroy();
        }
        this.menuItems = [];
    }

    private clearSlotItems(): void {
        for (const item of this.slotItems) {
            item.destroy();
        }
        this.slotItems = [];
    }
}
