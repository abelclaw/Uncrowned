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

export default new Phaser.Game(config);
