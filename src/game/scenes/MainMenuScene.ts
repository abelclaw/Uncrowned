import { Scene } from 'phaser';
import { GameState } from '../state/GameState';
import { SaveManager } from '../state/SaveManager';
import { MetaGameState } from '../state/MetaGameState';
import { AudioManager } from '../systems/AudioManager';

/**
 * Main menu scene -- the game's entry point.
 * The background image has baked-in "NEW GAME", "LOAD GAME", and "CONTINUE"
 * buttons. We place invisible hit zones over them instead of overlaying text.
 */
export class MainMenuScene extends Scene {
    /** Invisible hit zones + hover highlights for the image buttons */
    private hitZones: Phaser.GameObjects.Zone[] = [];
    private highlights: Phaser.GameObjects.Rectangle[] = [];

    /** Text items used by the load sub-menu and conditional extras */
    private slotItems: Phaser.GameObjects.GameObject[] = [];
    private loadPanel?: Phaser.GameObjects.Graphics;

    /** Music toggle: cycles through 4 themes */
    private musicIndex = 0;
    private static readonly MUSIC_KEYS = ['music-menu', 'music-menu-fugue', 'music-menu-ensemble', 'music-menu-melodic-fugue'];
    private static readonly MUSIC_COLORS = ['#8a8a9e', '#c4a46c', '#6ca4c4', '#b48ac4'];

    constructor() {
        super('MainMenuScene');
    }

    create(): void {
        this.hitZones = [];
        this.highlights = [];
        this.slotItems = [];

        const { width, height } = this.cameras.main;
        const cx = width / 2;

        // ── Background art (contains baked-in buttons) ──
        this.add.image(cx, height / 2, 'bg-menu').setOrigin(0.5);

        this.showMainMenu();

        // Start menu music
        const audio = AudioManager.getInstance();
        audio.init(this);
        audio.playMusic('music-menu');

        // ── Music toggle icon (top-right) ──
        const noteIcon = this.add.text(width - 30, 20, '\u266B', {
            fontFamily: 'serif',
            fontSize: '28px',
            color: '#8a8a9e',
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        noteIcon.on('pointerover', () => noteIcon.setScale(1.2));
        noteIcon.on('pointerout', () => noteIcon.setScale(1.0));
        noteIcon.on('pointerdown', () => {
            this.musicIndex = (this.musicIndex + 1) % MainMenuScene.MUSIC_KEYS.length;
            noteIcon.setColor(MainMenuScene.MUSIC_COLORS[this.musicIndex]);
            AudioManager.getInstance().playMusic(MainMenuScene.MUSIC_KEYS[this.musicIndex]);
        });

        // Fade in from black (matches Preloader's fadeOut)
        this.cameras.main.fadeIn(600, 0, 0, 0);
    }

    private showMainMenu(): void {
        this.clearSlotItems();

        // ── Hit zones over baked-in image buttons ──
        // Positions measured from pixel analysis of the background image (1344x768 → 960x540)
        const btnW = 180;
        const btnH = 34;

        // NEW GAME button (text center at game y≈416)
        this.createImageButton(480, 416, btnW, btnH, () => {
            GameState.getInstance().reset();
            this.scene.start('RoomScene', { roomId: 'forest_clearing' });
        });

        // LOAD GAME button (text center at game y≈458)
        this.createImageButton(480, 458, btnW, btnH, () => {
            this.showLoadMenu();
        });

        // CONTINUE button (text center at game y≈502)
        this.createImageButton(480, 502, btnW, btnH, () => {
            if (SaveManager.hasAutoSave()) {
                const state = GameState.getInstance();
                SaveManager.loadAutoSave(state);
                this.scene.start('RoomScene', { roomId: state.getData().currentRoom });
            }
        });

        // ── Conditional extras below the image buttons ──
        let extraY = 530;

        // Death Gallery
        if (MetaGameState.getInstance().getDeathsDiscovered().length > 0) {
            this.createExtraItem('Death Gallery', 480, extraY, () => {
                this.scene.start('DeathGalleryScene', { returnTo: 'MainMenuScene' });
            });
            extraY += 26;
        }

        // Endings Gallery
        if (MetaGameState.getInstance().getEndingsDiscovered().length > 0) {
            this.createExtraItem('Endings Gallery', 480, extraY, () => {
                this.scene.start('EndingsGalleryScene', { returnTo: 'MainMenuScene' });
            });
        }
    }

    /**
     * Create an invisible interactive zone over a baked-in image button,
     * with a subtle gold highlight on hover.
     */
    private createImageButton(
        x: number, y: number, w: number, h: number, onClick: () => void,
    ): void {
        // Hover highlight (hidden by default)
        const highlight = this.add.rectangle(x, y, w, h, 0xd4a847, 0)
            .setOrigin(0.5);
        this.highlights.push(highlight);

        // Invisible interactive zone
        const zone = this.add.zone(x, y, w, h)
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: true });

        zone.on('pointerover', () => highlight.setAlpha(0.15));
        zone.on('pointerout', () => highlight.setAlpha(0));
        zone.on('pointerdown', onClick);

        this.hitZones.push(zone);
    }

    /**
     * Small text link for conditional items (Continue, galleries) below the image buttons.
     */
    private createExtraItem(label: string, x: number, y: number, onClick: () => void): void {
        const text = this.add.text(x, y, label, {
            fontFamily: 'monospace',
            fontSize: '14px',
            color: '#8a8a9e',
        }).setOrigin(0.5);

        text.setInteractive({ useHandCursor: true });
        text.on('pointerover', () => text.setColor('#c4a46c'));
        text.on('pointerout', () => text.setColor('#8a8a9e'));
        text.on('pointerdown', onClick);

        this.hitZones.push(text as any); // track for cleanup
    }

    private showLoadMenu(): void {
        this.clearMainMenu();

        // Dark panel for load sub-menu readability
        this.loadPanel = this.add.graphics();
        const { width, height } = this.cameras.main;
        const fadeStart = 345;
        const fadeEnd = 405;
        const solidAlpha = 0.95;
        const steps = 12;
        const stepH = (fadeEnd - fadeStart) / steps;
        for (let i = 0; i < steps; i++) {
            const alpha = solidAlpha * (i / steps);
            this.loadPanel.fillStyle(0x0f0f23, alpha);
            this.loadPanel.fillRect(0, fadeStart + i * stepH, width, stepH + 1);
        }
        this.loadPanel.fillStyle(0x0f0f23, solidAlpha);
        this.loadPanel.fillRect(0, fadeEnd, width, height - fadeEnd);

        const slotInfos = SaveManager.getSlotInfos();
        const hasAnySave = slotInfos.some(s => s !== null);
        let y = 420;

        const loadTitle = this.add.text(480, 395, '-- Load Game --', {
            fontFamily: 'monospace',
            fontSize: '20px',
            color: '#c8c8d4',
        }).setOrigin(0.5);
        this.slotItems.push(loadTitle);

        if (hasAnySave) {
            for (let i = 0; i < slotInfos.length; i++) {
                const info = slotInfos[i];
                if (info) {
                    const label = `Slot ${info.slot} - ${info.roomId}`;
                    const slotText = this.createSlotItem(label, 480, y, info.slot);
                    this.slotItems.push(slotText);
                } else {
                    const emptyText = this.add.text(480, y, `Slot ${i + 1} - Empty`, {
                        fontFamily: 'monospace',
                        fontSize: '16px',
                        color: '#555555',
                    }).setOrigin(0.5);
                    this.slotItems.push(emptyText);
                }
                y += 22;
            }
        } else {
            const noSavesText = this.add.text(480, y, 'No saved games found.', {
                fontFamily: 'monospace',
                fontSize: '14px',
                color: '#888888',
            }).setOrigin(0.5);
            this.slotItems.push(noSavesText);
            y += 30;
        }

        // Back button
        y += 8;
        const backText = this.add.text(480, Math.min(y, 520), 'Back', {
            fontFamily: 'monospace',
            fontSize: '20px',
            color: '#c8c8d4',
        }).setOrigin(0.5);
        backText.setInteractive({ useHandCursor: true });
        backText.on('pointerover', () => { backText.setColor('#ffffff'); backText.setScale(1.05); });
        backText.on('pointerout', () => { backText.setColor('#c8c8d4'); backText.setScale(1.0); });
        backText.on('pointerdown', () => {
            this.clearSlotItems();
            this.showMainMenu();
        });
        this.slotItems.push(backText);
    }

    private createSlotItem(label: string, x: number, y: number, slot: number): Phaser.GameObjects.Text {
        const text = this.add.text(x, y, label, {
            fontFamily: 'monospace',
            fontSize: '18px',
            color: '#c8c8d4',
        }).setOrigin(0.5);

        text.setInteractive({ useHandCursor: true });
        text.on('pointerover', () => { text.setColor('#ffffff'); text.setScale(1.05); });
        text.on('pointerout', () => { text.setColor('#c8c8d4'); text.setScale(1.0); });
        text.on('pointerdown', () => {
            const state = GameState.getInstance();
            const loaded = SaveManager.loadFromSlot(state, slot);
            if (loaded) {
                this.scene.start('RoomScene', { roomId: state.getData().currentRoom });
            }
        });

        return text;
    }

    private clearMainMenu(): void {
        for (const zone of this.hitZones) zone.destroy();
        this.hitZones = [];
        for (const hl of this.highlights) hl.destroy();
        this.highlights = [];
    }

    private clearSlotItems(): void {
        for (const item of this.slotItems) item.destroy();
        this.slotItems = [];
        if (this.loadPanel) {
            this.loadPanel.destroy();
            this.loadPanel = undefined;
        }
    }
}
