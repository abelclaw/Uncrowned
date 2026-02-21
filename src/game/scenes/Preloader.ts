import { Scene } from 'phaser';

export class Preloader extends Scene {
    constructor() {
        super('Preloader');
    }

    preload() {
        const { width, height } = this.cameras.main;

        // Background box for progress bar
        const progressBox = this.add.graphics();
        progressBox.fillStyle(0x333333, 0.8);
        progressBox.fillRect(width / 2 - 160, height / 2 - 25, 320, 50);

        // Progress bar (fills as loading progresses)
        const progressBar = this.add.graphics();

        // "Loading..." text above the bar
        const loadingText = this.add.text(width / 2, height / 2 - 50, 'Loading...', {
            fontFamily: 'monospace',
            fontSize: '16px',
            color: '#ffffff',
        }).setOrigin(0.5);

        // Percentage text centered on the bar
        const percentText = this.add.text(width / 2, height / 2, '0%', {
            fontFamily: 'monospace',
            fontSize: '14px',
            color: '#ffffff',
        }).setOrigin(0.5);

        // Update progress bar on each file loaded
        this.load.on('progress', (value: number) => {
            progressBar.clear();
            progressBar.fillStyle(0xffffff, 1);
            progressBar.fillRect(width / 2 - 150, height / 2 - 15, 300 * value, 30);
            percentText.setText(`${Math.round(value * 100)}%`);
        });

        // Clean up when loading complete
        this.load.on('complete', () => {
            progressBar.destroy();
            progressBox.destroy();
            loadingText.destroy();
            percentText.destroy();
        });

        // No game assets to load yet -- the progress bar will complete instantly.
        // Plan 01-02 adds the real parallax background assets.
    }

    create() {
        this.scene.start('Game');
    }
}
