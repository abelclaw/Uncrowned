import { Scene } from 'phaser';
import EventBus from '../EventBus';

export class Game extends Scene {
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;

    constructor() {
        super('Game');
    }

    create() {
        const worldWidth = 1920;

        // Add parallax layers back-to-front with different scroll factors
        // Sky: fixed background, never moves
        this.add.image(0, 0, 'bg-sky').setOrigin(0, 0).setScrollFactor(0);

        // Mountains: very slow parallax (distant)
        this.add.image(0, 0, 'bg-mountains').setOrigin(0, 0).setScrollFactor(0.1);

        // Trees: medium parallax (mid-ground)
        this.add.image(0, 0, 'bg-trees').setOrigin(0, 0).setScrollFactor(0.4);

        // Ground: moves with camera (foreground)
        this.add.image(0, 0, 'bg-ground').setOrigin(0, 0).setScrollFactor(1);

        // Set camera bounds to match world width
        this.cameras.main.setBounds(0, 0, worldWidth, 540);

        // Pixel-perfect camera rendering
        this.cameras.main.setRoundPixels(true);

        // Keyboard controls for testing parallax scrolling
        this.cursors = this.input.keyboard!.createCursorKeys();

        // Info text fixed to camera (scroll factor 0)
        this.add.text(10, 10, 'Arrow keys to scroll | Phase 1 Foundation', {
            fontFamily: 'monospace',
            fontSize: '14px',
            color: '#ffffff',
        }).setScrollFactor(0);

        // Emit scene-ready event on EventBus for cross-scene communication
        EventBus.emit('scene-ready', { sceneKey: 'Game' });

        // Clean up EventBus listeners on scene shutdown to prevent memory leaks
        this.events.on(Phaser.Scenes.Events.SHUTDOWN, () => {
            EventBus.removeAllListeners('scene-ready');
        });
    }

    update(_time: number, _delta: number) {
        // Scroll camera with arrow keys
        if (this.cursors.right.isDown) {
            this.cameras.main.scrollX += 3;
        }
        if (this.cursors.left.isDown) {
            this.cameras.main.scrollX -= 3;
        }
    }
}
