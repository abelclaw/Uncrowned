import Phaser from 'phaser';
import { Boot } from './scenes/Boot';
import { Preloader } from './scenes/Preloader';
import { MainMenuScene } from './scenes/MainMenuScene';
import { Game } from './scenes/Game';
import { RoomScene } from './scenes/RoomScene';
import { DeathScene } from './scenes/DeathScene';
import { DeathGalleryScene } from './scenes/DeathGalleryScene';
import { EndingScene } from './scenes/EndingScene';
import { EndingsGalleryScene } from './scenes/EndingsGalleryScene';
import { MobileKeyboardManager } from './systems/MobileKeyboardManager';

const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    width: 960,
    height: 540,
    parent: 'game-container',
    backgroundColor: '#1a1a2e',

    render: {
        pixelArt: true,
    },

    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
    },

    fps: {
        target: 60,
        smoothStep: true,
    },

    scene: [Boot, Preloader, MainMenuScene, Game, RoomScene, DeathScene, DeathGalleryScene, EndingScene, EndingsGalleryScene],
};

const game = new Phaser.Game(config);

// Fire-and-forget: MobileKeyboardManager lives for the entire app lifetime.
// It prevents the virtual keyboard from squishing the canvas on mobile devices.
const appEl = document.getElementById('app');
if (appEl) {
    new MobileKeyboardManager(appEl);
}

export default game;
