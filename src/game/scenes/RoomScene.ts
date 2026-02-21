import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { NavigationSystem } from '../systems/NavigationSystem';
import { SceneTransition } from '../systems/SceneTransition';
import type { RoomData, ExitData, HotspotData } from '../types/RoomData';
import EventBus from '../EventBus';

/** Set to true during development to draw debug rectangles for exits and hotspots. */
const DEBUG = true;

/**
 * Data-driven room scene that loads room JSON, sets up parallax backgrounds,
 * player, navmesh, exits, hotspots, camera, and the click-to-move pipeline.
 */
export class RoomScene extends Phaser.Scene {
    private roomData!: RoomData;
    private player!: Player;
    private navigation!: NavigationSystem;
    private isTransitioning: boolean = false;
    private exitZones: Array<{ rect: Phaser.Geom.Rectangle; exit: ExitData }> = [];
    private hotspotZones: Array<{ rect: Phaser.Geom.Rectangle; hotspot: HotspotData }> = [];
    private spawnOverride?: { x: number; y: number };
    private transitionFrom?: string;

    constructor() {
        super('RoomScene');
    }

    init(data: {
        roomId: string;
        spawnPoint?: { x: number; y: number };
        transitionFrom?: string;
    }): void {
        // Load room data from Phaser cache
        this.roomData = this.cache.json.get('room-' + data.roomId);

        // Store spawn override if provided
        this.spawnOverride = data.spawnPoint;

        // Store transition origin for slide-in effects
        this.transitionFrom = data.transitionFrom;

        // Reset state for scene restart
        this.isTransitioning = false;
        this.exitZones = [];
        this.hotspotZones = [];
    }

    create(): void {
        // 1. Background layers with parallax scroll factors
        this.roomData.background.layers.forEach((layer, index) => {
            this.add.image(0, 0, layer.key)
                .setOrigin(0, 0)
                .setScrollFactor(layer.scrollFactor)
                .setDepth(index);
        });

        // 2. Navigation system from walkable area polygon
        this.navigation = new NavigationSystem(this.roomData.walkableArea);

        // 3. Player at spawn point (override or default)
        const spawnX = this.spawnOverride?.x ?? this.roomData.playerSpawn.x;
        const spawnY = this.spawnOverride?.y ?? this.roomData.playerSpawn.y;
        this.player = new Player(this, spawnX, spawnY);

        // 4. Exit zones
        for (const exit of this.roomData.exits) {
            const rect = new Phaser.Geom.Rectangle(
                exit.zone.x,
                exit.zone.y,
                exit.zone.width,
                exit.zone.height
            );
            this.exitZones.push({ rect, exit });

            if (DEBUG) {
                const gfx = this.add.graphics();
                gfx.fillStyle(0xff4444, 0.15);
                gfx.fillRect(exit.zone.x, exit.zone.y, exit.zone.width, exit.zone.height);
                gfx.lineStyle(1, 0xff4444, 0.4);
                gfx.strokeRect(exit.zone.x, exit.zone.y, exit.zone.width, exit.zone.height);
                gfx.setDepth(100);
            }
        }

        // 5. Hotspot zones
        for (const hotspot of this.roomData.hotspots) {
            const rect = new Phaser.Geom.Rectangle(
                hotspot.zone.x,
                hotspot.zone.y,
                hotspot.zone.width,
                hotspot.zone.height
            );
            this.hotspotZones.push({ rect, hotspot });

            if (DEBUG) {
                const gfx = this.add.graphics();
                gfx.fillStyle(0xffff00, 0.15);
                gfx.fillRect(hotspot.zone.x, hotspot.zone.y, hotspot.zone.width, hotspot.zone.height);
                gfx.lineStyle(1, 0xffff00, 0.4);
                gfx.strokeRect(hotspot.zone.x, hotspot.zone.y, hotspot.zone.width, hotspot.zone.height);
                gfx.setDepth(100);
            }
        }

        // 6. Camera setup
        this.cameras.main.setBounds(0, 0, this.roomData.background.worldWidth, 540);
        this.cameras.main.setRoundPixels(true);
        this.cameras.main.startFollow(this.player.getSprite(), true, 0.1, 0.1);

        // 7. Click-to-move handler
        this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            if (this.isTransitioning) return;

            const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);

            // Check hotspots first (more specific interaction)
            for (const zone of this.hotspotZones) {
                if (Phaser.Geom.Rectangle.Contains(zone.rect, worldPoint.x, worldPoint.y)) {
                    const from = this.player.getPosition();
                    const to = zone.hotspot.interactionPoint;
                    const path = this.navigation.findPath(from, to);
                    if (path) {
                        this.player.walkTo(path, () => this.player.playInteraction());
                    }
                    return;
                }
            }

            // Check exit zones -- walk toward exit, update() detects overlap
            for (const zone of this.exitZones) {
                if (Phaser.Geom.Rectangle.Contains(zone.rect, worldPoint.x, worldPoint.y)) {
                    // Walk toward the clicked point; clamp to walkable area
                    const from = this.player.getPosition();
                    // Try the clicked point directly (exit zones should overlap walkable edge)
                    let path = this.navigation.findPath(from, { x: worldPoint.x, y: worldPoint.y });
                    if (!path) {
                        // Fallback: walk toward center-x of exit zone at player's y
                        const fallbackX = zone.exit.zone.x + zone.exit.zone.width / 2;
                        const fallbackY = from.y;
                        path = this.navigation.findPath(from, { x: fallbackX, y: fallbackY });
                    }
                    if (path) {
                        this.player.walkTo(path);
                    }
                    return;
                }
            }

            // Default: walk to clicked point if walkable
            const from = this.player.getPosition();
            const path = this.navigation.findPath(from, { x: worldPoint.x, y: worldPoint.y });
            if (path) {
                this.player.walkTo(path);
            }
        });

        // 8. Transition-in effect
        if (this.transitionFrom === 'slide-left' || this.transitionFrom === 'slide-right') {
            // Slide-in from the opposite direction
            const camera = this.cameras.main;
            const offset = camera.width;
            // If we slid right to exit (slide-right), new scene slides in from left
            // If we slid left to exit (slide-left), new scene slides in from right
            const startOffsetX = this.transitionFrom === 'slide-right' ? -offset : offset;
            const originalScrollX = camera.scrollX;
            camera.scrollX = originalScrollX + startOffsetX;
            this.tweens.add({
                targets: camera,
                scrollX: originalScrollX,
                ease: 'Cubic.easeOut',
                duration: 500,
            });
        } else {
            // Default: fade in
            this.cameras.main.fadeIn(500, 0, 0, 0);
        }

        // 9. EventBus scene-ready
        EventBus.emit('scene-ready', { sceneKey: 'RoomScene', roomId: this.roomData.id });

        // 10. Shutdown cleanup
        this.events.on(Phaser.Scenes.Events.SHUTDOWN, () => {
            this.player.destroy();
            this.navigation.destroy();
            EventBus.removeAllListeners('scene-ready');
        });
    }

    update(): void {
        if (this.isTransitioning) return;

        // Check if player overlaps any exit zone
        const pos = this.player.getPosition();
        for (const zone of this.exitZones) {
            if (Phaser.Geom.Rectangle.Contains(zone.rect, pos.x, pos.y)) {
                this.handleExitReached(zone.exit);
                return;
            }
        }
    }

    /**
     * Handle player reaching an exit zone. Triggers the appropriate transition.
     */
    private handleExitReached(exit: ExitData): void {
        if (this.isTransitioning) return;
        this.isTransitioning = true;

        // Stop player movement during transition
        this.player.stopMovement();

        // Use the exit's transition type (fade, slide-left, slide-right)
        SceneTransition.transitionToRoom(
            this,
            exit.targetRoom,
            exit.spawnPoint,
            exit.transition
        );
    }
}
