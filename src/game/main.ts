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

    input: {
        keyboard: {
            // Prevent Phaser from calling preventDefault on space so it works
            // in the HTML text input. Arrow keys are still captured for game use.
            capture: [
                Phaser.Input.Keyboard.KeyCodes.UP,
                Phaser.Input.Keyboard.KeyCodes.DOWN,
                Phaser.Input.Keyboard.KeyCodes.LEFT,
                Phaser.Input.Keyboard.KeyCodes.RIGHT,
            ],
        },
    },

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
muteBtn.title = 'Toggle sound';

const speakerSvg = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#c4a46c" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>';

muteBtn.innerHTML = speakerSvg;
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
    overflow: 'hidden',
});
document.getElementById('game-container')?.appendChild(muteBtn);

// Red slash overlay for muted state
const slashOverlay = document.createElement('div');
Object.assign(slashOverlay.style, {
    position: 'absolute',
    top: '0',
    left: '0',
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
    display: 'none',
});
slashOverlay.innerHTML = '<svg viewBox="0 0 36 36" width="36" height="36"><line x1="4" y1="4" x2="32" y2="32" stroke="#cc3333" stroke-width="2.5" stroke-linecap="round"/></svg>';
muteBtn.appendChild(slashOverlay);

muteBtn.addEventListener('click', () => {
    const muted = AudioManager.getInstance().toggleMute();
    slashOverlay.style.display = muted ? 'block' : 'none';
});

// Create inventory toggle button (hidden until gameplay starts)
const invBtn = document.createElement('button');
invBtn.id = 'inventory-btn';
invBtn.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#c4a46c" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M7 9v7c0 3 2 5 5 5s5-2 5-5V9"/><path d="M7 9c0-1 2.5-2 5-2s5 1 5 2"/><path d="M10 7l-1.5-4M14 7l1.5-4"/></svg>';
invBtn.title = 'Inventory';
Object.assign(invBtn.style, {
    position: 'absolute',
    top: '8px',
    left: '48px',
    zIndex: '30',
    width: '36px',
    height: '36px',
    background: 'rgba(15, 15, 35, 0.7)',
    border: '1px solid #4a4a6a',
    borderRadius: '4px',
    fontSize: '18px',
    cursor: 'pointer',
    display: 'none',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0',
    lineHeight: '1',
});
document.getElementById('game-container')?.appendChild(invBtn);

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
