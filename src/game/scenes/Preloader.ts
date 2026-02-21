import { Scene } from 'phaser';

export class Preloader extends Scene {
    constructor() {
        super('Preloader');
    }

    preload() {
        // Placeholder -- full progress bar implementation in Task 2
    }

    create() {
        this.scene.start('Game');
    }
}
