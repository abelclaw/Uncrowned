import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { NavigationSystem } from '../systems/NavigationSystem';
import { SceneTransition } from '../systems/SceneTransition';
import { CommandDispatcher } from '../systems/CommandDispatcher';
import { HybridParser } from '../llm/HybridParser';
import { TextInputBar } from '../ui/TextInputBar';
import { NarratorDisplay } from '../ui/NarratorDisplay';
import { InventoryPanel } from '../ui/InventoryPanel';
import { GameState } from '../state/GameState';
import type { RoomData, ExitData, HotspotData } from '../types/RoomData';
import type { ItemDefinition } from '../types/ItemData';
import EventBus from '../EventBus';

/** Set to true during development to draw debug rectangles for exits and hotspots. */
const DEBUG = true;

/**
 * Data-driven room scene that loads room JSON, sets up parallax backgrounds,
 * player, navmesh, exits, hotspots, camera, and the click-to-move pipeline.
 * Integrates all Phase 4 systems: GameState tracking, PuzzleEngine evaluation
 * via CommandDispatcher, NarratorDisplay typewriter effect, InventoryPanel toggle,
 * death scene launching, auto-save on transitions, item pickup tracking, and
 * inventory-aware noun resolution.
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

    // Phase 4 integrations
    private gameState!: GameState;
    private narratorDisplay!: NarratorDisplay;
    private inventoryPanel!: InventoryPanel;
    private itemDefs: ItemDefinition[] = [];
    private isFirstVisit: boolean = false;

    // Text parser integration
    private textInputBar!: TextInputBar;
    private textParser!: HybridParser;
    private commandDispatcher!: CommandDispatcher;
    private commandSubmittedHandler!: (text: string) => void;
    private goCommandHandler!: (exit: ExitData) => void;

    // Phase 4 event handlers
    private triggerDeathHandler!: (deathId: string) => void;
    private inventoryToggleHandler!: () => void;
    private loadGameHandler!: (data: { roomId: string }) => void;
    private roomUpdateHandler!: (action: any) => void;
    private itemPickedUpHandler!: (itemId: string) => void;

    constructor() {
        super('RoomScene');
    }

    init(data: {
        roomId: string;
        spawnPoint?: { x: number; y: number };
        transitionFrom?: string;
    }): void {
        // Get GameState instance
        this.gameState = GameState.getInstance();

        // Load item definitions from cache
        const itemsData = this.cache.json.get('items');
        this.itemDefs = itemsData?.items ?? [];

        // Track first visit BEFORE marking as visited
        this.isFirstVisit = !this.gameState.getData().visitedRooms.includes(data.roomId);

        // Update GameState current room and mark visited
        (this.gameState.getData() as { currentRoom: string }).currentRoom = data.roomId;
        this.gameState.markRoomVisited(data.roomId);

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

        // 5b. Room item zones (filter out items already taken)
        if (this.roomData.items) {
            for (const item of this.roomData.items) {
                // Skip items already taken by the player
                if (this.gameState.isRoomItemRemoved(this.roomData.id, item.id)) continue;

                const rect = new Phaser.Geom.Rectangle(
                    item.zone.x, item.zone.y, item.zone.width, item.zone.height
                );
                // Treat room items like hotspots for click detection
                this.hotspotZones.push({
                    rect,
                    hotspot: {
                        id: item.id,
                        name: item.name,
                        zone: item.zone,
                        interactionPoint: item.interactionPoint,
                        responses: item.responses,
                    },
                });

                if (DEBUG) {
                    const gfx = this.add.graphics();
                    gfx.fillStyle(0x44ff44, 0.15);
                    gfx.fillRect(item.zone.x, item.zone.y, item.zone.width, item.zone.height);
                    gfx.lineStyle(1, 0x44ff44, 0.4);
                    gfx.strokeRect(item.zone.x, item.zone.y, item.zone.width, item.zone.height);
                    gfx.setDepth(100);
                }
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

        // 8. Text parser integration
        this.textParser = new HybridParser();
        this.commandDispatcher = new CommandDispatcher(this.itemDefs);

        // Create TextInputBar (Option A: destroy and recreate each scene create)
        const container = document.getElementById('game-container')!;
        this.textInputBar = new TextInputBar(container);

        // Create NarratorDisplay wrapping the TextInputBar's response element
        const responseEl = document.getElementById('parser-response')!;
        this.narratorDisplay = new NarratorDisplay(responseEl);

        // Create InventoryPanel
        this.inventoryPanel = new InventoryPanel(container);

        // Listen for command-submitted events from the input bar
        this.commandSubmittedHandler = async (text: string) => {
            if (this.isTransitioning) return;

            // Show thinking indicator while waiting for parse (may involve LLM)
            this.narratorDisplay.showInstant('...');

            // Get current inventory item info for noun resolution
            const inventoryItems = this.itemDefs
                .filter(item => this.gameState.hasItem(item.id))
                .map(item => ({ id: item.id, name: item.name }));

            const parseResult = await this.textParser.parse(
                text,
                this.roomData.hotspots,
                this.roomData.exits,
                inventoryItems,
                { name: this.roomData.name, description: this.roomData.description },
            );

            // Scene may have changed during async wait
            if (this.isTransitioning) return;

            if (!parseResult.success || !parseResult.action) {
                this.narratorDisplay.typewrite(
                    parseResult.error ?? `I don't understand "${text}". Try commands like 'look', 'take', 'go', or 'use'.`
                );
                return;
            }

            const result = this.commandDispatcher.dispatch(parseResult.action, this.roomData);

            // Use typewriter for narrator-style responses, instant for short system messages
            if (result.response.length > 50) {
                this.narratorDisplay.typewrite(result.response);
            } else {
                this.narratorDisplay.showInstant(result.response);
            }

            // Update inventory panel after each command (items may have changed)
            this.updateInventoryPanel();
        };
        EventBus.on('command-submitted', this.commandSubmittedHandler);

        // Listen for go-command events from the dispatcher
        this.goCommandHandler = (exit: ExitData) => {
            this.handleExitReached(exit);
        };
        EventBus.on('go-command', this.goCommandHandler);

        // 8b. Phase 4 event listeners

        // Death trigger handler
        this.triggerDeathHandler = (deathId: string) => {
            if (this.isTransitioning) return;
            this.isTransitioning = true; // Prevent further input

            const deathData = this.roomData.deaths?.[deathId];
            if (!deathData) {
                console.warn(`Death ID "${deathId}" not found in room data`);
                this.isTransitioning = false;
                return;
            }

            // Pause this scene and launch DeathScene as overlay
            this.scene.pause();
            this.textInputBar.hide();
            this.inventoryPanel.hide();
            this.scene.launch('DeathScene', {
                title: deathData.title,
                narratorText: deathData.narratorText,
            });
        };
        EventBus.on('trigger-death', this.triggerDeathHandler);

        // Inventory toggle handler
        this.inventoryToggleHandler = () => {
            this.updateInventoryPanel();
            this.inventoryPanel.toggle();
        };
        EventBus.on('inventory-toggle', this.inventoryToggleHandler);

        // Load game handler (from CommandDispatcher save/load)
        this.loadGameHandler = (data: { roomId: string }) => {
            this.scene.start('RoomScene', { roomId: data.roomId });
        };
        EventBus.on('load-game', this.loadGameHandler);

        // Room update handler (from PuzzleEngine actions like open-exit, remove-hotspot)
        this.roomUpdateHandler = (_action: any) => {
            // Handle dynamic room changes from puzzle actions
            // Future: handle remove-hotspot, add-hotspot, open-exit for visual updates
        };
        EventBus.on('room-update', this.roomUpdateHandler);

        // Item picked up handler (from PuzzleEngine add-item action)
        this.itemPickedUpHandler = (itemId: string) => {
            this.gameState.markRoomItemRemoved(this.roomData.id, itemId);
        };
        EventBus.on('item-picked-up', this.itemPickedUpHandler);

        // 9. Transition-in effect
        if (this.transitionFrom === 'slide-left' || this.transitionFrom === 'slide-right') {
            // Slide-in from the opposite direction
            const camera = this.cameras.main;
            const offset = camera.width;
            const startOffsetX = this.transitionFrom === 'slide-right' ? -offset : offset;
            const originalScrollX = camera.scrollX;
            camera.scrollX = originalScrollX + startOffsetX;
            this.tweens.add({
                targets: camera,
                scrollX: originalScrollX,
                ease: 'Cubic.easeOut',
                duration: 500,
                onComplete: () => {
                    this.textInputBar.focus();
                    this.showEntryNarration();
                },
            });
        } else {
            // Default: fade in
            this.cameras.main.fadeIn(500, 0, 0, 0);
            // Focus input after fade-in completes
            this.cameras.main.once(
                Phaser.Cameras.Scene2D.Events.FADE_IN_COMPLETE,
                () => {
                    this.textInputBar.focus();
                    this.showEntryNarration();
                }
            );
        }

        // 10. EventBus scene-ready
        EventBus.emit('scene-ready', { sceneKey: 'RoomScene', roomId: this.roomData.id });

        // 11. Shutdown cleanup
        this.events.on(Phaser.Scenes.Events.SHUTDOWN, () => {
            // Existing cleanup
            this.player.destroy();
            this.navigation.destroy();
            this.textInputBar.destroy();
            EventBus.off('command-submitted', this.commandSubmittedHandler);
            EventBus.off('go-command', this.goCommandHandler);
            EventBus.removeAllListeners('scene-ready');

            // Phase 4 cleanup
            this.narratorDisplay.destroy();
            this.inventoryPanel.destroy();
            EventBus.off('trigger-death', this.triggerDeathHandler);
            EventBus.off('inventory-toggle', this.inventoryToggleHandler);
            EventBus.off('load-game', this.loadGameHandler);
            EventBus.off('room-update', this.roomUpdateHandler);
            EventBus.off('item-picked-up', this.itemPickedUpHandler);
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

    /**
     * Show initial room description with typewriter on first visit,
     * or a short "you return to..." on revisit.
     */
    private showEntryNarration(): void {
        if (this.isFirstVisit) {
            this.narratorDisplay.typewrite(
                this.roomData.description ?? `You look around ${this.roomData.name}.`
            );
        }
    }

    /**
     * Update the inventory panel with current items from GameState.
     */
    private updateInventoryPanel(): void {
        const items = this.itemDefs
            .filter(item => this.gameState.hasItem(item.id))
            .map(item => ({ id: item.id, name: item.name }));
        this.inventoryPanel.update(items);
    }
}
