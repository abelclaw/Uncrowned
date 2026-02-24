import { Scene } from 'phaser';
import { MetaGameState } from '../state/MetaGameState';
import type { DeathRegistry, DeathRegistryEntry } from '../types/DeathRegistryData';

const PER_PAGE = 9;
const GRID_COLS = 3;
const CELL_W = 280;
const CELL_H = 120;
const GRID_START_X = 60;
const GRID_START_Y = 80;
const COL_GAP = 290;
const ROW_GAP = 130;
const THUMB_SIZE = 80;

/**
 * Death Gallery scene -- displays a paginated grid of all 43 deaths.
 * Discovered deaths show a thumbnail image (if available), title, room name, and category;
 * clicking opens a detail overlay with a larger image.
 * Locked deaths show "?" and a cryptic gallery hint.
 */
export class DeathGalleryScene extends Scene {
    private currentPage = 0;
    private totalPages = 1;
    private deathRegistry!: DeathRegistry;
    private discoveredIds: readonly string[] = [];
    private gridObjects: Phaser.GameObjects.GameObject[] = [];
    private overlayObjects: Phaser.GameObjects.GameObject[] = [];
    private paginationObjects: Phaser.GameObjects.GameObject[] = [];
    private returnTo = 'MainMenuScene';

    constructor() {
        super('DeathGalleryScene');
    }

    create(data?: { returnTo?: string }): void {
        this.returnTo = data?.returnTo ?? 'MainMenuScene';
        this.currentPage = 0;
        this.gridObjects = [];
        this.overlayObjects = [];
        this.paginationObjects = [];

        // Load data sources
        this.deathRegistry = this.cache.json.get('death-registry') as DeathRegistry;
        this.discoveredIds = MetaGameState.getInstance().getDeathsDiscovered();

        this.totalPages = Math.ceil(this.deathRegistry.totalDeaths / PER_PAGE);

        // Background
        this.add.rectangle(480, 270, 960, 540, 0x1a1a2e);

        // Title
        this.add.text(480, 30, 'DEATH GALLERY', {
            fontFamily: 'monospace',
            fontSize: '24px',
            color: '#cc3333',
        }).setOrigin(0.5);

        // Counter
        this.add.text(480, 55, `${this.discoveredIds.length}/${this.deathRegistry.totalDeaths} Discovered`, {
            fontFamily: 'monospace',
            fontSize: '14px',
            color: '#888888',
        }).setOrigin(0.5);

        // Back button
        const backText = this.add.text(880, 490, '[ Back ]', {
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

        // Load images for current page then render
        this.loadPageImages(() => {
            this.renderPage();
            this.renderPagination();
        });
    }

    private getTextureKey(imageId: string): string {
        return `death-img-${imageId}`;
    }

    private loadPageImages(callback: () => void): void {
        const startIndex = this.currentPage * PER_PAGE;
        const deaths = this.deathRegistry.deaths;
        let needsLoad = false;

        for (let i = 0; i < PER_PAGE; i++) {
            const deathIndex = startIndex + i;
            if (deathIndex >= deaths.length) break;

            const entry = deaths[deathIndex];
            const isDiscovered = this.discoveredIds.includes(entry.id);
            if (!isDiscovered || !entry.imageId) continue;

            const textureKey = this.getTextureKey(entry.imageId);
            if (!this.textures.exists(textureKey)) {
                this.load.image(textureKey, `assets/death-images/${entry.imageId}.png`);
                needsLoad = true;
            }
        }

        if (!needsLoad) {
            callback();
            return;
        }

        this.load.once(Phaser.Loader.Events.COMPLETE, callback);
        // If images fail to load (not generated yet), still render the page
        this.load.once(Phaser.Loader.Events.FILE_LOAD_ERROR, () => {
            // Continue rendering even if some images fail
        });
        this.load.start();
    }

    private renderPage(): void {
        // Clear previous grid objects
        for (const obj of this.gridObjects) {
            obj.destroy();
        }
        this.gridObjects = [];

        const startIndex = this.currentPage * PER_PAGE;
        const deaths = this.deathRegistry.deaths;

        for (let i = 0; i < PER_PAGE; i++) {
            const deathIndex = startIndex + i;
            if (deathIndex >= deaths.length) break;

            const entry = deaths[deathIndex];
            const col = i % GRID_COLS;
            const row = Math.floor(i / GRID_COLS);
            const x = GRID_START_X + col * COL_GAP;
            const y = GRID_START_Y + row * ROW_GAP;

            const isDiscovered = this.discoveredIds.includes(entry.id);
            this.renderCard(entry, x, y, isDiscovered);
        }
    }

    private renderCard(entry: DeathRegistryEntry, x: number, y: number, isDiscovered: boolean): void {
        const centerX = x + CELL_W / 2;
        const centerY = y + CELL_H / 2;

        // Card background
        const fillColor = isDiscovered ? 0x2a2a3e : 0x1e1e2e;
        const strokeColor = isDiscovered ? 0x555555 : 0x333333;
        const bg = this.add.rectangle(centerX, centerY, CELL_W, CELL_H, fillColor)
            .setStrokeStyle(1, strokeColor);
        this.gridObjects.push(bg);

        if (isDiscovered) {
            const textureKey = entry.imageId ? this.getTextureKey(entry.imageId) : undefined;
            const hasImage = textureKey !== undefined && this.textures.exists(textureKey);

            // Text offset shifts right when thumbnail is present
            const textOffsetX = hasImage ? THUMB_SIZE + 10 : 0;

            // Thumbnail image
            if (hasImage) {
                const thumbX = x + 8 + THUMB_SIZE / 2;
                const thumbY = centerY;
                const img = this.add.image(thumbX, thumbY, textureKey);

                // Scale to fit thumbnail size
                const scale = (THUMB_SIZE - 4) / Math.max(img.width, img.height);
                img.setScale(scale);
                this.gridObjects.push(img);

                // Subtle border
                const border = this.add.rectangle(thumbX, thumbY, THUMB_SIZE, THUMB_SIZE, 0x000000, 0)
                    .setStrokeStyle(1, 0x444444);
                this.gridObjects.push(border);
            }

            // Discovered card content
            const titleText = this.add.text(x + 15 + textOffsetX, y + 12, entry.title, {
                fontFamily: 'monospace',
                fontSize: '13px',
                color: '#cc3333',
                wordWrap: { width: CELL_W - 30 - textOffsetX },
            });
            this.gridObjects.push(titleText);

            // Truncate title to 2 lines if needed
            if (titleText.height > 34) {
                const metrics = titleText.getTextMetrics();
                const maxChars = Math.floor((CELL_W - 30 - textOffsetX) / (metrics.fontSize * 0.6)) * 2;
                const truncated = entry.title.substring(0, maxChars - 3) + '...';
                titleText.setText(truncated);
            }

            // Room name + category at bottom
            const infoText = this.add.text(x + 15 + textOffsetX, y + CELL_H - 22, `${entry.roomName} | ${entry.category}`, {
                fontFamily: 'monospace',
                fontSize: '10px',
                color: '#666666',
            });
            this.gridObjects.push(infoText);

            // Make card interactive
            bg.setInteractive({ useHandCursor: true });

            bg.on('pointerover', () => {
                bg.setFillStyle(0x3a3a4e);
            });

            bg.on('pointerout', () => {
                bg.setFillStyle(0x2a2a3e);
            });

            bg.on('pointerdown', () => {
                this.showDetailOverlay(entry);
            });
        } else {
            // Locked card content
            const questionMark = this.add.text(centerX, centerY - 12, '?', {
                fontFamily: 'monospace',
                fontSize: '28px',
                color: '#444444',
            }).setOrigin(0.5);
            this.gridObjects.push(questionMark);

            const hintText = this.add.text(centerX, centerY + 22, entry.galleryHint, {
                fontFamily: 'monospace',
                fontSize: '9px',
                color: '#555555',
                wordWrap: { width: CELL_W - 30 },
                align: 'center',
            }).setOrigin(0.5, 0);
            this.gridObjects.push(hintText);
        }
    }

    private renderPagination(): void {
        // Clear previous pagination objects
        for (const obj of this.paginationObjects) {
            obj.destroy();
        }
        this.paginationObjects = [];

        const pageLabel = this.add.text(480, 490, `Page ${this.currentPage + 1} of ${this.totalPages}`, {
            fontFamily: 'monospace',
            fontSize: '14px',
            color: '#888888',
        }).setOrigin(0.5);
        this.paginationObjects.push(pageLabel);

        // Previous arrow
        if (this.currentPage > 0) {
            const prevArrow = this.add.text(400, 490, '<', {
                fontFamily: 'monospace',
                fontSize: '18px',
                color: '#c8c8d4',
            }).setOrigin(0.5).setInteractive({ useHandCursor: true });

            prevArrow.on('pointerover', () => prevArrow.setColor('#ffffff'));
            prevArrow.on('pointerout', () => prevArrow.setColor('#c8c8d4'));
            prevArrow.on('pointerdown', () => {
                this.currentPage--;
                this.loadPageImages(() => {
                    this.renderPage();
                    this.renderPagination();
                });
            });
            this.paginationObjects.push(prevArrow);
        }

        // Next arrow
        if (this.currentPage < this.totalPages - 1) {
            const nextArrow = this.add.text(560, 490, '>', {
                fontFamily: 'monospace',
                fontSize: '18px',
                color: '#c8c8d4',
            }).setOrigin(0.5).setInteractive({ useHandCursor: true });

            nextArrow.on('pointerover', () => nextArrow.setColor('#ffffff'));
            nextArrow.on('pointerout', () => nextArrow.setColor('#c8c8d4'));
            nextArrow.on('pointerdown', () => {
                this.currentPage++;
                this.loadPageImages(() => {
                    this.renderPage();
                    this.renderPagination();
                });
            });
            this.paginationObjects.push(nextArrow);
        }
    }

    private showDetailOverlay(entry: DeathRegistryEntry): void {
        // Clear any existing overlay
        this.destroyOverlay();

        // Dark overlay background capturing all input
        const overlayBg = this.add.rectangle(480, 270, 960, 540, 0x000000, 0.9)
            .setDepth(10)
            .setInteractive();
        this.overlayObjects.push(overlayBg);

        const textureKey = entry.imageId ? this.getTextureKey(entry.imageId) : undefined;
        const hasImage = textureKey !== undefined && this.textures.exists(textureKey);

        // Layout shifts when image is present
        const detailImageSize = 180;
        const imageY = 100;
        const titleY = hasImage ? imageY + detailImageSize / 2 + 15 : 120;
        const infoY = titleY + 30;
        const textY = hasImage ? 330 : 300;

        // Death image in detail view
        if (hasImage) {
            const img = this.add.image(480, imageY, textureKey)
                .setDepth(11);

            const scale = detailImageSize / Math.max(img.width, img.height);
            img.setScale(scale);
            this.overlayObjects.push(img);

            // Border
            const border = this.add.rectangle(480, imageY, detailImageSize + 4, detailImageSize + 4, 0x000000, 0)
                .setStrokeStyle(2, 0x661111)
                .setDepth(10.5);
            this.overlayObjects.push(border);
        }

        // Death title
        const titleText = this.add.text(480, titleY, entry.title, {
            fontFamily: 'monospace',
            fontSize: '22px',
            color: '#cc3333',
        }).setOrigin(0.5).setDepth(11);
        this.overlayObjects.push(titleText);

        // Room name and category
        const infoText = this.add.text(480, infoY, `${entry.roomName} | ${entry.category}`, {
            fontFamily: 'monospace',
            fontSize: '14px',
            color: '#888888',
        }).setOrigin(0.5).setDepth(11);
        this.overlayObjects.push(infoText);

        // Narrator text
        const narratorText = this.add.text(480, textY, entry.narratorText, {
            fontFamily: 'monospace',
            fontSize: '14px',
            color: '#c8c8d4',
            wordWrap: { width: 700 },
            align: 'center',
            lineSpacing: 6,
        }).setOrigin(0.5).setDepth(11);
        this.overlayObjects.push(narratorText);

        // Close button
        const closeText = this.add.text(480, 480, '[ Close ]', {
            fontFamily: 'monospace',
            fontSize: '18px',
            color: '#ffcc00',
        }).setOrigin(0.5).setDepth(11).setInteractive({ useHandCursor: true });

        closeText.on('pointerover', () => {
            closeText.setColor('#ffffff');
            closeText.setScale(1.05);
        });
        closeText.on('pointerout', () => {
            closeText.setColor('#ffcc00');
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
