import { Scene } from 'phaser';
import { GameState } from '../state/GameState';
import { SaveManager } from '../state/SaveManager';
import { MetaGameState } from '../state/MetaGameState';
import { QualitySettings, type QualityLevel } from '../systems/QualitySettings';

/**
 * Main menu scene -- the game's entry point.
 * Displays the title art background and menu options:
 *   - New Game (always)
 *   - Continue (only when auto-save exists)
 *   - Load Game (slot selection sub-menu)
 */
export class MainMenuScene extends Scene {
    private menuItems: Phaser.GameObjects.Text[] = [];
    private slotItems: Phaser.GameObjects.Text[] = [];
    private menuPanel!: Phaser.GameObjects.Graphics;

    constructor() {
        super('MainMenuScene');
    }

    create(): void {
        this.menuItems = [];
        this.slotItems = [];

        const { width, height } = this.cameras.main;
        const cx = width / 2;

        // ── Background art ──
        this.add.image(cx, height / 2, 'bg-menu').setOrigin(0.5);

        // ── Dark panel behind menu items (covers image's baked-in buttons) ──
        this.menuPanel = this.add.graphics();

        this.showMainMenu();

        // Fade in from black (matches Preloader's fadeOut)
        this.cameras.main.fadeIn(600, 0, 0, 0);
    }

    private showMainMenu(): void {
        this.clearSlotItems();

        let y = 435;

        // New Game -- always visible
        const newGameText = this.createMenuItem('New Game', 480, y, () => {
            GameState.getInstance().reset();
            this.scene.start('RoomScene', { roomId: 'forest_clearing' });
        });
        this.menuItems.push(newGameText);
        y += 34;

        // Continue -- only when auto-save exists
        if (SaveManager.hasAutoSave()) {
            const continueText = this.createMenuItem('Continue', 480, y, () => {
                const state = GameState.getInstance();
                SaveManager.loadAutoSave(state);
                this.scene.start('RoomScene', { roomId: state.getData().currentRoom });
            });
            this.menuItems.push(continueText);
            y += 34;
        }

        // Load Game -- always visible
        const loadText = this.createMenuItem('Load Game', 480, y, () => {
            this.showLoadMenu();
        });
        this.menuItems.push(loadText);
        y += 34;

        // Death Gallery -- only visible when at least 1 death discovered
        if (MetaGameState.getInstance().getDeathsDiscovered().length > 0) {
            const galleryText = this.createMenuItem('Death Gallery', 480, y, () => {
                this.scene.start('DeathGalleryScene', { returnTo: 'MainMenuScene' });
            });
            this.menuItems.push(galleryText);
            y += 34;
        }

        // Endings Gallery -- only visible when at least 1 ending discovered
        if (MetaGameState.getInstance().getEndingsDiscovered().length > 0) {
            const endingsText = this.createMenuItem('Endings Gallery', 480, y, () => {
                this.scene.start('EndingsGalleryScene', { returnTo: 'MainMenuScene' });
            });
            this.menuItems.push(endingsText);
            y += 34;
        }

        // Quality toggle -- cycles through High / Low / Off
        const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
        const qualityLevels: QualityLevel[] = ['high', 'low', 'off'];
        let currentIndex = qualityLevels.indexOf(QualitySettings.getInstance().getLevel());
        if (currentIndex === -1) currentIndex = 0;
        const qualityText = this.createMenuItem(
            `Quality: ${capitalize(qualityLevels[currentIndex])}`,
            480, y, () => {
                currentIndex = (currentIndex + 1) % 3;
                const newLevel = qualityLevels[currentIndex];
                QualitySettings.getInstance().setLevel(newLevel);
                qualityText.setText(`Quality: ${capitalize(newLevel)}`);
            }
        );
        this.menuItems.push(qualityText);

        // Resize the dark panel to fit all menu items
        this.resizeMenuPanel(y);
    }

    private resizeMenuPanel(lastItemY: number): void {
        const { width, height } = this.cameras.main;
        const fadeStart = 345;
        const fadeEnd = 405;
        const solidAlpha = 0.95;
        const panelBottom = Math.max(lastItemY + 20, height);

        this.menuPanel.clear();

        // Gradient fade from transparent to solid
        const steps = 12;
        const stepH = (fadeEnd - fadeStart) / steps;
        for (let i = 0; i < steps; i++) {
            const alpha = solidAlpha * (i / steps);
            this.menuPanel.fillStyle(0x0f0f23, alpha);
            this.menuPanel.fillRect(0, fadeStart + i * stepH, width, stepH + 1);
        }

        // Solid panel below the fade
        this.menuPanel.fillStyle(0x0f0f23, solidAlpha);
        this.menuPanel.fillRect(0, fadeEnd, width, panelBottom - fadeEnd);
    }

    private showLoadMenu(): void {
        this.clearMenuItems();

        const slotInfos = SaveManager.getSlotInfos();
        let y = 450;
        let hasAnySave = false;

        // Title for load sub-menu
        const loadTitle = this.add.text(480, 425, '-- Load Game --', {
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

        // Resize panel to fit load menu
        this.resizeMenuPanel(y);
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
