import { Scene } from 'phaser';

export class Boot extends Scene {
    constructor() {
        super('Boot');
    }

    preload() {
        // Boot scene loads only assets needed for the loading screen.
        // Using graphics primitives for progress bar, so nothing needed here.
    }

    create() {
        this.scene.start('Preloader');
    }
}
