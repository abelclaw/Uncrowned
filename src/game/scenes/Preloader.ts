import { Scene } from 'phaser';

interface Star {
    gfx: Phaser.GameObjects.Arc;
    baseAlpha: number;
    speed: number;
    phase: number;
}

export class Preloader extends Scene {
    private stars: Star[] = [];
    private progressFill!: Phaser.GameObjects.Graphics;
    private shimmerGfx!: Phaser.GameObjects.Graphics;
    private progressValue: number = 0;
    private flavorText!: Phaser.GameObjects.Text;
    private flavorIndex: number = 0;
    private flavorTimer: number = 0;

    private static readonly BAR_X = 480 - 180;
    private static readonly BAR_Y = 290;
    private static readonly BAR_W = 360;
    private static readonly BAR_H = 22;
    private static readonly FLAVOR_INTERVAL = 2200;

    private static readonly FLAVOR_MESSAGES = [
        'Sharpening quills...',
        'Consulting the royal archives...',
        'Polishing the throne...',
        'Summoning the court jester...',
        'Mapping the caverns...',
        'Brewing suspicious potions...',
        'Dusting the scepter...',
        'Rehearsing the coronation...',
        'Negotiating with bridge trolls...',
        'Filing bureaucratic scrolls...',
        'Winding the clock tower...',
        'Interrogating the mirror...',
    ];

    constructor() {
        super('Preloader');
    }

    preload() {
        const { width, height } = this.cameras.main;
        const cx = width / 2;

        // ── Background ──
        this.add.rectangle(cx, height / 2, width, height, 0x1a1a2e);

        // ── Starfield ──
        this.createStarfield(width, height);

        // ── Crown decoration ──
        this.drawCrown(cx, 130);

        // ── Title ──
        this.add.text(cx, 178, 'Uncrowned', {
            fontFamily: 'monospace',
            fontSize: '32px',
            color: '#c8c8d4',
            shadow: {
                offsetX: 2,
                offsetY: 2,
                color: '#000000',
                blur: 4,
                fill: true,
            },
        }).setOrigin(0.5);

        // ── Subtitle ──
        this.add.text(cx, 210, 'A Royal Adventure', {
            fontFamily: 'monospace',
            fontSize: '13px',
            color: '#666680',
        }).setOrigin(0.5);

        // ── Progress bar ──
        const { BAR_X, BAR_Y, BAR_W, BAR_H } = Preloader;
        const pad = 5;

        // Outer frame
        const frame = this.add.graphics();
        frame.lineStyle(2, 0xd4a847, 1);
        frame.strokeRect(BAR_X - pad, BAR_Y - pad, BAR_W + pad * 2, BAR_H + pad * 2);

        // Corner diamonds
        frame.fillStyle(0xd4a847, 1);
        const corners = [
            [BAR_X - pad, BAR_Y - pad],
            [BAR_X + BAR_W + pad, BAR_Y - pad],
            [BAR_X - pad, BAR_Y + BAR_H + pad],
            [BAR_X + BAR_W + pad, BAR_Y + BAR_H + pad],
        ];
        for (const [dx, dy] of corners) {
            frame.fillTriangle(dx, dy - 4, dx + 4, dy, dx, dy + 4);
            frame.fillTriangle(dx, dy - 4, dx - 4, dy, dx, dy + 4);
        }

        // Dark inner background
        const innerBg = this.add.graphics();
        innerBg.fillStyle(0x0f0f23, 1);
        innerBg.fillRect(BAR_X, BAR_Y, BAR_W, BAR_H);

        // Progress fill (updated on 'progress' event)
        this.progressFill = this.add.graphics();

        // Shimmer overlay (drawn in update)
        this.shimmerGfx = this.add.graphics();

        // Percentage text
        const percentText = this.add.text(cx, BAR_Y + BAR_H / 2, '0%', {
            fontFamily: 'monospace',
            fontSize: '11px',
            color: '#1a1a2e',
        }).setOrigin(0.5);

        // ── Flavor text ──
        this.flavorIndex = Phaser.Math.Between(0, Preloader.FLAVOR_MESSAGES.length - 1);
        this.flavorText = this.add.text(cx, BAR_Y + BAR_H + 28, Preloader.FLAVOR_MESSAGES[this.flavorIndex], {
            fontFamily: 'monospace',
            fontSize: '12px',
            color: '#7a7a8e',
        }).setOrigin(0.5);

        // ── Progress event handlers ──
        this.load.on('progress', (value: number) => {
            this.progressValue = value;
            this.progressFill.clear();
            this.progressFill.fillStyle(0xd4a847, 1);
            this.progressFill.fillRect(BAR_X, BAR_Y, BAR_W * value, BAR_H);

            const pct = Math.round(value * 100);
            percentText.setText(`${pct}%`);
            // Switch text color for readability once bar is filled past center
            percentText.setColor(value > 0.45 ? '#1a1a2e' : '#c8c8d4');
        });

        this.load.on('complete', () => {
            percentText.setText('100%');
            percentText.setColor('#1a1a2e');
        });

        // ── Asset loading ──

        // Main menu background
        this.load.image('bg-menu', 'assets/backgrounds/uncrowned-newloadcontinue.png');

        // Shared parallax layers for starting act (Act 1)
        this.load.image('bg-shared-act1-sky', 'assets/backgrounds/shared/act1-sky.png');
        this.load.image('bg-shared-act1-mid', 'assets/backgrounds/shared/act1-mid.png');

        // Starting room ground layer (lazy loader handles all others)
        this.load.image('bg-rooms-forest_clearing', 'assets/backgrounds/rooms/forest_clearing.png');

        // Player static sprite (single standing pose, displayed in scenes)
        this.load.image('player-static', 'assets/sprites/player-static.png');

        // Legacy spritesheet (needed by Player class internals)
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

        // Room data JSON files -- Act 3 (The Rite of Administrative Closure)
        this.load.json('room-petrified_forest', 'assets/data/rooms/petrified_forest.json');
        this.load.json('room-castle_courtyard_act3', 'assets/data/rooms/castle_courtyard_act3.json');
        this.load.json('room-throne_room_act3', 'assets/data/rooms/throne_room_act3.json');
        this.load.json('room-royal_archive', 'assets/data/rooms/royal_archive.json');
        this.load.json('room-wizard_tower', 'assets/data/rooms/wizard_tower.json');
        this.load.json('room-clock_tower', 'assets/data/rooms/clock_tower.json');
        this.load.json('room-dungeon', 'assets/data/rooms/dungeon.json');
        this.load.json('room-mirror_hall', 'assets/data/rooms/mirror_hall.json');
        this.load.json('room-rooftop', 'assets/data/rooms/rooftop.json');
        this.load.json('room-treasury', 'assets/data/rooms/treasury.json');

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

        // NPC dialogue compiled ink JSON files -- Act 3 (The Rite of Administrative Closure)
        this.load.json('dialogue-petrified_guard', 'assets/data/dialogue/petrified_guard.ink.json');
        this.load.json('dialogue-mirror_spirit', 'assets/data/dialogue/mirror_spirit.ink.json');
        this.load.json('dialogue-wizard_ghost', 'assets/data/dialogue/wizard_ghost.ink.json');

        // Death registry for gallery
        this.load.json('death-registry', 'assets/data/death-registry.json');

        // Endings registry for EndingScene
        this.load.json('endings-registry', 'assets/data/endings-registry.json');

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
        this.load.audio('music-menu-fugue', 'assets/audio/music/menu-fugue.wav');
        this.load.audio('music-menu-ensemble', 'assets/audio/music/menu-ensemble.wav');
        this.load.audio('music-menu-melodic-fugue', 'assets/audio/music/menu-melodic-fugue.wav');

        // Ambient loops
        this.load.audio('amb-forest-birds', 'assets/audio/ambient/forest-birds.wav');
        this.load.audio('amb-cave-drips', 'assets/audio/ambient/cave-drips.wav');
        this.load.audio('amb-wind-light', 'assets/audio/ambient/wind-light.wav');
    }

    create() {
        const { width } = this.cameras.main;
        const cx = width / 2;

        // Hide the loading flavor text
        this.tweens.add({ targets: this.flavorText, alpha: 0, duration: 300 });

        // Show clickable "Ready" text after a brief pause at 100%
        this.time.delayedCall(400, () => {
            const ready = this.add.text(cx, Preloader.BAR_Y + Preloader.BAR_H + 58, '▶  Ready', {
                fontFamily: 'monospace',
                fontSize: '18px',
                color: '#d4a847',
            }).setOrigin(0.5).setAlpha(0);

            // Fade in with a gentle pulse
            this.tweens.add({
                targets: ready,
                alpha: 1,
                duration: 500,
                onComplete: () => {
                    this.tweens.add({
                        targets: ready,
                        alpha: 0.5,
                        duration: 800,
                        yoyo: true,
                        repeat: -1,
                        ease: 'Sine.easeInOut',
                    });
                },
            });

            ready.setInteractive({ useHandCursor: true });
            ready.on('pointerover', () => ready.setColor('#ffffff'));
            ready.on('pointerout', () => ready.setColor('#d4a847'));
            ready.on('pointerdown', () => {
                ready.disableInteractive();
                this.cameras.main.fadeOut(800, 0, 0, 0);
                this.cameras.main.once(
                    Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE,
                    () => {
                        this.scene.start('MainMenuScene');
                    },
                );
            });
        });
    }

    update(time: number, delta: number): void {
        // ── Twinkle stars ──
        for (const star of this.stars) {
            const alpha = star.baseAlpha + Math.sin(time * star.speed + star.phase) * (star.baseAlpha * 0.5);
            star.gfx.setAlpha(Phaser.Math.Clamp(alpha, 0.03, 1));
        }

        // ── Shimmer on progress bar ──
        if (this.progressValue > 0.01) {
            const { BAR_X, BAR_Y, BAR_W, BAR_H } = Preloader;
            const fillW = BAR_W * this.progressValue;
            const shimmerW = 30;
            const shimmerPos = ((time * 0.08) % (fillW + shimmerW * 2)) - shimmerW;

            this.shimmerGfx.clear();
            this.shimmerGfx.fillStyle(0xffffff, 0.18);
            this.shimmerGfx.beginPath();

            const skew = 8;
            const x1 = Phaser.Math.Clamp(BAR_X + shimmerPos, BAR_X, BAR_X + fillW);
            const x2 = Phaser.Math.Clamp(BAR_X + shimmerPos + shimmerW, BAR_X, BAR_X + fillW);
            const x3 = Phaser.Math.Clamp(BAR_X + shimmerPos + shimmerW - skew, BAR_X, BAR_X + fillW);
            const x4 = Phaser.Math.Clamp(BAR_X + shimmerPos - skew, BAR_X, BAR_X + fillW);

            this.shimmerGfx.moveTo(x1, BAR_Y);
            this.shimmerGfx.lineTo(x2, BAR_Y);
            this.shimmerGfx.lineTo(x3, BAR_Y + BAR_H);
            this.shimmerGfx.lineTo(x4, BAR_Y + BAR_H);
            this.shimmerGfx.closePath();
            this.shimmerGfx.fillPath();
        }

        // ── Rotate flavor text ──
        this.flavorTimer += delta;
        if (this.flavorTimer >= Preloader.FLAVOR_INTERVAL) {
            this.flavorTimer = 0;
            this.flavorIndex = (this.flavorIndex + 1) % Preloader.FLAVOR_MESSAGES.length;

            this.tweens.add({
                targets: this.flavorText,
                alpha: 0,
                duration: 200,
                onComplete: () => {
                    this.flavorText.setText(Preloader.FLAVOR_MESSAGES[this.flavorIndex]);
                    this.tweens.add({
                        targets: this.flavorText,
                        alpha: 1,
                        duration: 200,
                    });
                },
            });
        }
    }

    // ── Private helpers ──

    private createStarfield(width: number, height: number): void {
        const count = 100;
        for (let i = 0; i < count; i++) {
            const x = Phaser.Math.Between(0, width);
            const y = Phaser.Math.Between(0, height);
            const layer = Math.random();

            let radius: number, baseAlpha: number, speed: number;
            if (layer < 0.6) {
                radius = 1;
                baseAlpha = Phaser.Math.FloatBetween(0.1, 0.3);
                speed = Phaser.Math.FloatBetween(0.0005, 0.001);
            } else if (layer < 0.9) {
                radius = 1.5;
                baseAlpha = Phaser.Math.FloatBetween(0.3, 0.5);
                speed = Phaser.Math.FloatBetween(0.001, 0.002);
            } else {
                radius = 2;
                baseAlpha = Phaser.Math.FloatBetween(0.5, 0.8);
                speed = Phaser.Math.FloatBetween(0.002, 0.004);
            }

            const gfx = this.add.circle(x, y, radius, 0xc8c8d4, baseAlpha);
            this.stars.push({ gfx, baseAlpha, speed, phase: Math.random() * Math.PI * 2 });
        }
    }

    private drawCrown(cx: number, cy: number): void {
        const g = this.add.graphics();
        const w = 70;
        const h = 30;
        const baseY = cy + h / 2;
        const topY = cy - h / 2;
        const midY = cy + 4;

        // Crown outline
        g.lineStyle(2, 0xd4a847, 1);
        g.beginPath();
        g.moveTo(cx - w / 2, baseY);
        g.lineTo(cx - w / 2 + 5, topY + 4);
        g.lineTo(cx - w / 4, midY);
        g.lineTo(cx, topY - 4);
        g.lineTo(cx + w / 4, midY);
        g.lineTo(cx + w / 2 - 5, topY + 4);
        g.lineTo(cx + w / 2, baseY);
        g.closePath();
        g.strokePath();

        // Base band
        g.lineStyle(2, 0xd4a847, 1);
        g.strokeRect(cx - w / 2, baseY, w, 6);

        // Jewels at each peak
        g.fillStyle(0xd4a847, 1);
        g.fillCircle(cx - w / 2 + 5, topY + 4, 2.5);
        g.fillCircle(cx, topY - 4, 3);
        g.fillCircle(cx + w / 2 - 5, topY + 4, 2.5);
    }
}
