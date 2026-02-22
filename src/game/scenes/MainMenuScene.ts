import { Scene } from 'phaser';
import { GameState } from '../state/GameState';
import { SaveManager } from '../state/SaveManager';
import { MetaGameState } from '../state/MetaGameState';
import { QualitySettings, type QualityLevel } from '../systems/QualitySettings';

interface Star {
    gfx: Phaser.GameObjects.Arc;
    baseAlpha: number;
    speed: number;
    phase: number;
}

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
    private stars: Star[] = [];

    constructor() {
        super('MainMenuScene');
    }

    create(): void {
        this.menuItems = [];
        this.slotItems = [];
        this.stars = [];

        const { width, height } = this.cameras.main;
        const cx = width / 2;

        // ── Background ──
        this.add.rectangle(cx, height / 2, width, height, 0x1a1a2e);

        // ── Starfield ──
        this.createStarfield(width, height);

        // ── Crown decoration ──
        this.drawCrown(cx, 100);

        // ── Title ──
        this.add.text(cx, 148, 'Uncrowned', {
            fontFamily: 'monospace',
            fontSize: '32px',
            color: '#c8c8d4',
            shadow: {
                offsetX: 2,
                offsetY: 2,
                color: '#000000',
                blur: 4,
                fill: true,
            },
        }).setOrigin(0.5);

        // ── Subtitle ──
        this.add.text(cx, 180, 'A Royal Adventure', {
            fontFamily: 'monospace',
            fontSize: '13px',
            color: '#666680',
        }).setOrigin(0.5);

        this.showMainMenu();

        // Fade in from black (matches Preloader's fadeOut)
        this.cameras.main.fadeIn(600, 0, 0, 0);
    }

    update(time: number): void {
        for (const star of this.stars) {
            const alpha = star.baseAlpha + Math.sin(time * star.speed + star.phase) * (star.baseAlpha * 0.5);
            star.gfx.setAlpha(Phaser.Math.Clamp(alpha, 0.03, 1));
        }
    }

    private showMainMenu(): void {
        this.clearSlotItems();

        let y = 260;

        // New Game -- always visible
        const newGameText = this.createMenuItem('New Game', 480, y, () => {
            GameState.getInstance().reset();
            this.scene.start('RoomScene', { roomId: 'forest_clearing' });
        });
        this.menuItems.push(newGameText);
        y += 44;

        // Continue -- only when auto-save exists
        if (SaveManager.hasAutoSave()) {
            const continueText = this.createMenuItem('Continue', 480, y, () => {
                const state = GameState.getInstance();
                SaveManager.loadAutoSave(state);
                this.scene.start('RoomScene', { roomId: state.getData().currentRoom });
            });
            this.menuItems.push(continueText);
            y += 44;
        }

        // Load Game -- always visible
        const loadText = this.createMenuItem('Load Game', 480, y, () => {
            this.showLoadMenu();
        });
        this.menuItems.push(loadText);
        y += 44;

        // Death Gallery -- only visible when at least 1 death discovered
        if (MetaGameState.getInstance().getDeathsDiscovered().length > 0) {
            const galleryText = this.createMenuItem('Death Gallery', 480, y, () => {
                this.scene.start('DeathGalleryScene', { returnTo: 'MainMenuScene' });
            });
            this.menuItems.push(galleryText);
            y += 44;
        }

        // Endings Gallery -- only visible when at least 1 ending discovered
        if (MetaGameState.getInstance().getEndingsDiscovered().length > 0) {
            const endingsText = this.createMenuItem('Endings Gallery', 480, y, () => {
                this.scene.start('EndingsGalleryScene', { returnTo: 'MainMenuScene' });
            });
            this.menuItems.push(endingsText);
            y += 44;
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

    private createStarfield(width: number, height: number): void {
        const count = 100;
        for (let i = 0; i < count; i++) {
            const x = Phaser.Math.Between(0, width);
            const y = Phaser.Math.Between(0, height);
            const layer = Math.random();

            let radius: number, baseAlpha: number, speed: number;
            if (layer < 0.6) {
                radius = 1;
                baseAlpha = Phaser.Math.FloatBetween(0.1, 0.3);
                speed = Phaser.Math.FloatBetween(0.0005, 0.001);
            } else if (layer < 0.9) {
                radius = 1.5;
                baseAlpha = Phaser.Math.FloatBetween(0.3, 0.5);
                speed = Phaser.Math.FloatBetween(0.001, 0.002);
            } else {
                radius = 2;
                baseAlpha = Phaser.Math.FloatBetween(0.5, 0.8);
                speed = Phaser.Math.FloatBetween(0.002, 0.004);
            }

            const gfx = this.add.circle(x, y, radius, 0xc8c8d4, baseAlpha);
            this.stars.push({ gfx, baseAlpha, speed, phase: Math.random() * Math.PI * 2 });
        }
    }

    private drawCrown(cx: number, cy: number): void {
        const g = this.add.graphics();
        const w = 70;
        const h = 30;
        const baseY = cy + h / 2;
        const topY = cy - h / 2;
        const midY = cy + 4;

        // Crown outline
        g.lineStyle(2, 0xd4a847, 1);
        g.beginPath();
        g.moveTo(cx - w / 2, baseY);
        g.lineTo(cx - w / 2 + 5, topY + 4);
        g.lineTo(cx - w / 4, midY);
        g.lineTo(cx, topY - 4);
        g.lineTo(cx + w / 4, midY);
        g.lineTo(cx + w / 2 - 5, topY + 4);
        g.lineTo(cx + w / 2, baseY);
        g.closePath();
        g.strokePath();

        // Base band
        g.lineStyle(2, 0xd4a847, 1);
        g.strokeRect(cx - w / 2, baseY, w, 6);

        // Jewels at each peak
        g.fillStyle(0xd4a847, 1);
        g.fillCircle(cx - w / 2 + 5, topY + 4, 2.5);
        g.fillCircle(cx, topY - 4, 3);
        g.fillCircle(cx + w / 2 - 5, topY + 4, 2.5);
    }
}
