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
import { AudioManager } from './systems/AudioManager';

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
        mode: Phaser.Scale.NONE,
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

// Create mute toggle button with inline styles for reliability
const muteBtn = document.createElement('button');
muteBtn.id = 'mute-btn';
muteBtn.innerHTML = '\u{1F50A}';
muteBtn.title = 'Toggle sound';
Object.assign(muteBtn.style, {
    position: 'absolute',
    top: '8px',
    left: '8px',
    zIndex: '30',
    width: '36px',
    height: '36px',
    background: 'rgba(15, 15, 35, 0.7)',
    border: '1px solid #4a4a6a',
    borderRadius: '4px',
    fontSize: '18px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0',
    lineHeight: '1',
});
document.getElementById('game-container')?.appendChild(muteBtn);
muteBtn.addEventListener('click', () => {
    const muted = AudioManager.getInstance().toggleMute();
    muteBtn.innerHTML = muted ? '\u{1F507}' : '\u{1F50A}';
});

// Responsive scaling: scale the entire game container (canvas + text UI) as a unit
function fitGameContainer() {
    const container = document.getElementById('game-container');
    if (!container) return;

    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // Reset transform so we can measure natural size
    container.style.transform = '';
    const naturalWidth = container.scrollWidth;
    const naturalHeight = container.scrollHeight;

    const scaleX = vw / naturalWidth;
    const scaleY = vh / naturalHeight;
    const scale = Math.min(scaleX, scaleY, 1); // never upscale past 1

    container.style.transform = `scale(${scale})`;
}

window.addEventListener('resize', fitGameContainer);
// Run once after Phaser has created the canvas
game.events.once('ready', () => requestAnimationFrame(fitGameContainer));
// Also run on DOM ready as a fallback
requestAnimationFrame(fitGameContainer);

export default game;
