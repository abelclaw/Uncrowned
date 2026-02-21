import { Scene } from 'phaser';
import { OllamaClient } from '../llm/OllamaClient';

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

        // Parallax background layers
        this.load.image('bg-sky', 'assets/backgrounds/sky.png');
        this.load.image('bg-mountains', 'assets/backgrounds/mountains.png');
        this.load.image('bg-trees', 'assets/backgrounds/trees.png');
        this.load.image('bg-ground', 'assets/backgrounds/ground.png');

        // Player spritesheet (16 frames: idle 0-3, walk 4-11, interact 12-15)
        this.load.spritesheet('player', 'assets/sprites/player.png', {
            frameWidth: 48,
            frameHeight: 64,
        });

        // Room data JSON files
        this.load.json('room-forest_clearing', 'assets/data/rooms/forest_clearing.json');
        this.load.json('room-cave_entrance', 'assets/data/rooms/cave_entrance.json');
        this.load.json('room-village_path', 'assets/data/rooms/village_path.json');

        // Item definitions registry
        this.load.json('items', 'assets/data/items.json');
    }

    create() {
        // Warm up Ollama LLM model (fire-and-forget, non-blocking)
        // This pre-loads the model into GPU memory so first player command is fast
        const ollamaClient = new OllamaClient();
        ollamaClient.checkAvailability().then(available => {
            if (available) {
                ollamaClient.warmUp(); // Fire-and-forget, catches errors internally
            }
        });
        // Proceed to MainMenu immediately -- warm-up runs in background
        this.scene.start('MainMenuScene');
    }
}
