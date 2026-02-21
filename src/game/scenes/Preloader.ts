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

        // Room data JSON files -- Demo Chapter (Act 1a)
        this.load.json('room-forest_clearing', 'assets/data/rooms/forest_clearing.json');
        this.load.json('room-cave_entrance', 'assets/data/rooms/cave_entrance.json');
        this.load.json('room-village_path', 'assets/data/rooms/village_path.json');
        this.load.json('room-cave_depths', 'assets/data/rooms/cave_depths.json');
        this.load.json('room-underground_pool', 'assets/data/rooms/underground_pool.json');
        this.load.json('room-village_square', 'assets/data/rooms/village_square.json');
        this.load.json('room-old_watchtower', 'assets/data/rooms/old_watchtower.json');

        // Room data JSON files -- Act 1b (The Royal Mess)
        this.load.json('room-forest_bridge', 'assets/data/rooms/forest_bridge.json');
        this.load.json('room-castle_courtyard', 'assets/data/rooms/castle_courtyard.json');
        this.load.json('room-castle_hallway', 'assets/data/rooms/castle_hallway.json');
        this.load.json('room-throne_room', 'assets/data/rooms/throne_room.json');
        this.load.json('room-royal_kitchen', 'assets/data/rooms/royal_kitchen.json');
        this.load.json('room-castle_garden', 'assets/data/rooms/castle_garden.json');
        this.load.json('room-servants_quarters', 'assets/data/rooms/servants_quarters.json');

        // Room data JSON files -- Act 2 (The Screaming Caverns)
        this.load.json('room-cavern_entrance_hall', 'assets/data/rooms/cavern_entrance_hall.json');
        this.load.json('room-cavern_library', 'assets/data/rooms/cavern_library.json');
        this.load.json('room-filing_room', 'assets/data/rooms/filing_room.json');
        this.load.json('room-waiting_room', 'assets/data/rooms/waiting_room.json');
        this.load.json('room-cavern_west_wing', 'assets/data/rooms/cavern_west_wing.json');
        this.load.json('room-crystal_chamber', 'assets/data/rooms/crystal_chamber.json');
        this.load.json('room-cavern_balcony', 'assets/data/rooms/cavern_balcony.json');
        this.load.json('room-echo_chamber', 'assets/data/rooms/echo_chamber.json');
        this.load.json('room-cavern_east_wing', 'assets/data/rooms/cavern_east_wing.json');
        this.load.json('room-underground_river', 'assets/data/rooms/underground_river.json');
        this.load.json('room-forge_chamber', 'assets/data/rooms/forge_chamber.json');
        this.load.json('room-guardian_chamber', 'assets/data/rooms/guardian_chamber.json');

        // Item definitions registry
        this.load.json('items', 'assets/data/items.json');

        // NPC registry
        this.load.json('npcs', 'assets/data/npcs/npcs.json');

        // NPC dialogue compiled ink JSON files -- Demo Chapter (Act 1a)
        this.load.json('dialogue-old_man', 'assets/data/dialogue/old_man.ink.json');
        this.load.json('dialogue-stone_merchant', 'assets/data/dialogue/stone_merchant.ink.json');
        this.load.json('dialogue-narrator_history', 'assets/data/dialogue/narrator_history.ink.json');

        // NPC dialogue compiled ink JSON files -- Act 1b (The Royal Mess)
        this.load.json('dialogue-bridge_troll', 'assets/data/dialogue/bridge_troll.ink.json');
        this.load.json('dialogue-ghost_king', 'assets/data/dialogue/ghost_king.ink.json');
        this.load.json('dialogue-castle_cook', 'assets/data/dialogue/castle_cook.ink.json');

        // NPC dialogue compiled ink JSON files -- Act 2 (The Screaming Caverns)
        this.load.json('dialogue-the_clerk', 'assets/data/dialogue/the_clerk.ink.json');
        this.load.json('dialogue-queue_ghost', 'assets/data/dialogue/queue_ghost.ink.json');
        this.load.json('dialogue-dwarven_spirit', 'assets/data/dialogue/dwarven_spirit.ink.json');

        // Audio registry (event-to-SFX mapping)
        this.load.json('audio-registry', 'assets/data/audio-registry.json');

        // Sound effects
        this.load.audio('sfx-item-pickup', 'assets/audio/sfx/item-pickup.wav');
        this.load.audio('sfx-door-transition', 'assets/audio/sfx/door-transition.wav');
        this.load.audio('sfx-death-sting', 'assets/audio/sfx/death-sting.wav');
        this.load.audio('sfx-dialogue-start', 'assets/audio/sfx/dialogue-start.wav');
        this.load.audio('sfx-command-blip', 'assets/audio/sfx/command-blip.wav');

        // Background music
        this.load.audio('music-forest', 'assets/audio/music/forest.wav');
        this.load.audio('music-cave', 'assets/audio/music/cave.wav');
        this.load.audio('music-village', 'assets/audio/music/village.wav');
        this.load.audio('music-menu', 'assets/audio/music/menu.wav');

        // Ambient loops
        this.load.audio('amb-forest-birds', 'assets/audio/ambient/forest-birds.wav');
        this.load.audio('amb-cave-drips', 'assets/audio/ambient/cave-drips.wav');
        this.load.audio('amb-wind-light', 'assets/audio/ambient/wind-light.wav');
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
