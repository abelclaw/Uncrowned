import { Scene } from 'phaser';
import EventBus from '../EventBus';

export class Game extends Scene {
    constructor() {
        super('Game');
    }

    create() {
        const { width, height } = this.cameras.main;

        // Confirm the scene loaded with centered text
        this.add.text(width / 2, height / 2, 'KQGame - Phase 1', {
            fontFamily: 'monospace',
            fontSize: '24px',
            color: '#ffffff',
        }).setOrigin(0.5);

        // Emit scene-ready event on EventBus for cross-scene communication
        EventBus.emit('scene-ready', { sceneKey: 'Game' });

        console.log('Game scene ready');

        // Clean up EventBus listeners on scene shutdown to prevent memory leaks
        this.events.on(Phaser.Scenes.Events.SHUTDOWN, () => {
            EventBus.removeAllListeners('scene-ready');
        });
    }

    update(_time: number, _delta: number) {
        // Empty for now -- will be used by parallax in Plan 01-02
    }
}
