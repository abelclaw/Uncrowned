import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { NavigationSystem } from '../systems/NavigationSystem';
import { SceneTransition } from '../systems/SceneTransition';
import { CommandDispatcher } from '../systems/CommandDispatcher';
import { HybridParser } from '../llm/HybridParser';
import { TextInputBar } from '../ui/TextInputBar';
import { NarratorDisplay } from '../ui/NarratorDisplay';
import { InventoryPanel } from '../ui/InventoryPanel';
import { DialogueManager } from '../dialogue/DialogueManager';
import { DialogueUI } from '../dialogue/DialogueUI';
import { AudioManager } from '../systems/AudioManager';
import { GameState } from '../state/GameState';
import type { RoomData, ExitData, HotspotData } from '../types/RoomData';
import type { ItemDefinition } from '../types/ItemData';
import type { NpcDefinition } from '../types/NpcData';
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

    // Phase 7 audio integration
    private audioManager!: AudioManager;

    // Phase 6 dialogue integration
    private dialogueManager!: DialogueManager;
    private dialogueUI!: DialogueUI;
    private inDialogue: boolean = false;
    private activeNpcId: string | null = null;
    private npcDefs: NpcDefinition[] = [];
    private startDialogueHandler!: (npcId: string) => void;

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

    // Phase 9 lazy-loaded sprites
    private itemSprites: Map<string, Phaser.GameObjects.Image> = new Map();
    private npcSprites: Map<string, Phaser.GameObjects.Image> = new Map();

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

        // Load NPC definitions from cache
        const npcsData = this.cache.json.get('npcs');
        this.npcDefs = npcsData?.npcs ?? [];

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
        this.inDialogue = false;
        this.activeNpcId = null;
        this.itemSprites = new Map();
        this.npcSprites = new Map();
    }

    create(): void {
        // 1. Lazy-load room assets (backgrounds, item sprites, NPC sprites)
        const loadingText = this.add.text(480, 270, 'Loading...', {
            fontFamily: 'monospace', fontSize: '14px', color: '#ffffff'
        }).setOrigin(0.5).setScrollFactor(0).setDepth(999);

        this.loadRoomAssets().then(() => {
            loadingText.destroy();

            // Create background layers with parallax scroll factors
            this.roomData.background.layers.forEach((layer, index) => {
                this.add.image(0, 0, layer.key)
                    .setOrigin(0, 0)
                    .setScrollFactor(layer.scrollFactor)
                    .setDepth(index);
            });

            // Render item sprites for items present in the room (not yet taken)
            if (this.roomData.items) {
                for (const item of this.roomData.items) {
                    if (this.gameState.isRoomItemRemoved(this.roomData.id, item.id)) continue;
                    const spriteKey = `item-${item.id}`;
                    if (this.textures.exists(spriteKey)) {
                        const itemSprite = this.add.image(
                            item.zone.x + item.zone.width / 2,
                            item.zone.y + item.zone.height / 2,
                            spriteKey
                        ).setDepth(5);
                        this.itemSprites.set(item.id, itemSprite);
                    }
                }
            }

            // Render NPC sprites for NPCs present in the room
            if (this.roomData.npcs) {
                for (const npc of this.roomData.npcs) {
                    // Check visibility conditions
                    if (npc.conditions && npc.conditions.length > 0) {
                        const visible = npc.conditions.every(cond => {
                            if (cond.type === 'flag-set' && cond.flag) {
                                return this.gameState.isFlagSet(cond.flag);
                            }
                            if (cond.type === 'flag-not-set' && cond.flag) {
                                return !this.gameState.isFlagSet(cond.flag);
                            }
                            return true;
                        });
                        if (!visible) continue;
                    }
                    const spriteKey = `npc-${npc.id}`;
                    if (this.textures.exists(spriteKey)) {
                        const npcSprite = this.add.image(
                            npc.zone.x + npc.zone.width / 2,
                            npc.zone.y + npc.zone.height / 2,
                            spriteKey
                        ).setDepth(5);
                        this.npcSprites.set(npc.id, npcSprite);
                    }
                }
            }
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

        // 5c. NPC zones (render NPCs as clickable zones reusing hotspot pipeline)
        if (this.roomData.npcs) {
            for (const npc of this.roomData.npcs) {
                // Check visibility conditions
                if (npc.conditions && npc.conditions.length > 0) {
                    const visible = npc.conditions.every(cond => {
                        if (cond.type === 'flag-set' && cond.flag) {
                            return this.gameState.isFlagSet(cond.flag);
                        }
                        if (cond.type === 'flag-not-set' && cond.flag) {
                            return !this.gameState.isFlagSet(cond.flag);
                        }
                        return true;
                    });
                    if (!visible) continue;
                }

                const npcDef = this.npcDefs.find(d => d.id === npc.id);
                const npcName = npcDef?.name ?? npc.id;

                const rect = new Phaser.Geom.Rectangle(
                    npc.zone.x, npc.zone.y, npc.zone.width, npc.zone.height
                );
                // Create synthetic hotspot so NPCs are clickable like hotspots
                this.hotspotZones.push({
                    rect,
                    hotspot: {
                        id: npc.id,
                        name: npcName,
                        zone: npc.zone,
                        interactionPoint: npc.interactionPoint,
                        responses: {
                            talk: npcDef?.defaultGreeting ?? `The ${npcName} doesn't seem interested in conversation.`,
                        },
                    },
                });

                if (DEBUG) {
                    const gfx = this.add.graphics();
                    gfx.fillStyle(0x44ffff, 0.15);
                    gfx.fillRect(npc.zone.x, npc.zone.y, npc.zone.width, npc.zone.height);
                    gfx.lineStyle(1, 0x44ffff, 0.4);
                    gfx.strokeRect(npc.zone.x, npc.zone.y, npc.zone.width, npc.zone.height);
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
        this.commandDispatcher = new CommandDispatcher(this.itemDefs, this.npcDefs);

        // Create TextInputBar (Option A: destroy and recreate each scene create)
        const container = document.getElementById('game-container')!;
        this.textInputBar = new TextInputBar(container);

        // Create NarratorDisplay wrapping the TextInputBar's response element
        const responseEl = document.getElementById('parser-response')!;
        this.narratorDisplay = new NarratorDisplay(responseEl);

        // Create InventoryPanel
        this.inventoryPanel = new InventoryPanel(container);

        // Initialize DialogueManager and DialogueUI
        this.dialogueManager = new DialogueManager(this.gameState);
        this.dialogueUI = new DialogueUI(this.narratorDisplay);

        // Restore dialogue states from GameState (for save/load persistence)
        const savedDialogueStates = this.gameState.getDialogueStates();
        if (Object.keys(savedDialogueStates).length > 0) {
            this.dialogueManager.loadDialogueStates(savedDialogueStates);
        }

        // 8a. AudioManager initialization (before EventBus listeners so SFX works from first command)
        this.audioManager = AudioManager.getInstance();
        this.audioManager.init(this);
        this.audioManager.onRoomEnter(this.roomData);

        // Listen for command-submitted events from the input bar
        this.commandSubmittedHandler = async (text: string) => {
            // Dialogue mode: route input to choice selection
            if (this.inDialogue && this.dialogueManager.isActive()) {
                const trimmed = text.trim();
                const choiceNum = parseInt(trimmed, 10);

                if (isNaN(choiceNum) || choiceNum < 1) {
                    this.narratorDisplay.showInstant('Pick a number to choose a response.');
                    return;
                }

                try {
                    this.dialogueManager.choose(choiceNum - 1); // 0-indexed
                    this.advanceDialogue();
                } catch {
                    this.narratorDisplay.showInstant('That\'s not a valid choice. Pick a number.');
                }
                return; // Don't fall through to normal command parsing
            }

            if (this.isTransitioning) return;

            // Show thinking indicator while waiting for parse (may involve LLM)
            this.narratorDisplay.showInstant('...');

            // Get current inventory item info for noun resolution
            const inventoryItems = this.itemDefs
                .filter(item => this.gameState.hasItem(item.id))
                .map(item => ({ id: item.id, name: item.name }));

            // Merge room items (not yet taken) into hotspots for noun resolution
            const roomItemsAsHotspots = (this.roomData.items ?? [])
                .filter(item => !this.gameState.isRoomItemRemoved(this.roomData.id, item.id))
                .map(item => ({ id: item.id, name: item.name, zone: item.zone, interactionPoint: item.interactionPoint, responses: item.responses ?? {} }));
            const allHotspots = [...this.roomData.hotspots, ...roomItemsAsHotspots];

            const parseResult = await this.textParser.parse(
                text,
                allHotspots,
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

            // Sync dialogue states to GameState before dispatch (save commands need current state)
            if (this.dialogueManager) {
                this.gameState.setDialogueStates(this.dialogueManager.getDialogueStates());
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
            // Destroy the item sprite if it exists
            const sprite = this.itemSprites.get(itemId);
            if (sprite) {
                sprite.destroy();
                this.itemSprites.delete(itemId);
            }
        };
        EventBus.on('item-picked-up', this.itemPickedUpHandler);

        // 8c. Start-dialogue event handler (from CommandDispatcher NPC detection)
        this.startDialogueHandler = (npcId: string) => {
            if (this.isTransitioning || this.inDialogue) return;

            // Find dialogue JSON from cache
            const npcDef = this.npcDefs.find(n => n.id === npcId);
            if (!npcDef) return;

            const dialogueJson = this.cache.json.get(npcDef.dialogueKey);
            if (!dialogueJson) {
                // No dialogue file -- show default greeting
                this.narratorDisplay.typewrite(npcDef.defaultGreeting);
                return;
            }

            // Start conversation
            // Story constructor needs a JSON string. Phaser cache auto-parses JSON, so re-stringify.
            this.dialogueManager.startConversation(npcId, JSON.stringify(dialogueJson));
            this.inDialogue = true;
            this.activeNpcId = npcId;

            // Show first dialogue content
            this.advanceDialogue();
        };
        EventBus.on('start-dialogue', this.startDialogueHandler);

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

            // Phase 9 sprite cleanup
            this.itemSprites.forEach(sprite => sprite.destroy());
            this.itemSprites.clear();
            this.npcSprites.forEach(sprite => sprite.destroy());
            this.npcSprites.clear();

            // Phase 7 audio cleanup (remove EventBus listeners, keep audio playing for crossfade)
            this.audioManager.cleanup();

            // Phase 6 dialogue cleanup
            if (this.dialogueManager?.isActive()) {
                this.dialogueManager.endConversation();
                this.gameState.setDialogueStates(this.dialogueManager.getDialogueStates());
            }
            EventBus.off('start-dialogue', this.startDialogueHandler);
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
     * Lazily load room-specific assets (backgrounds, item sprites, NPC sprites).
     * Skips assets already cached in Phaser's texture manager.
     * Returns a promise that resolves when all assets are loaded.
     */
    private loadRoomAssets(): Promise<void> {
        let needsLoad = false;

        // Load background layers
        for (const layer of this.roomData.background.layers) {
            if (!this.textures.exists(layer.key)) {
                let assetPath: string;
                if (layer.key.startsWith('bg-shared-')) {
                    // e.g. bg-shared-act1-sky -> assets/backgrounds/shared/act1-sky.png
                    const rest = layer.key.replace('bg-shared-', '');
                    assetPath = `assets/backgrounds/shared/${rest}.png`;
                } else if (layer.key.startsWith('bg-rooms-')) {
                    // e.g. bg-rooms-forest_clearing -> assets/backgrounds/rooms/forest_clearing.png
                    const rest = layer.key.replace('bg-rooms-', '');
                    assetPath = `assets/backgrounds/rooms/${rest}.png`;
                } else {
                    continue;
                }
                this.load.image(layer.key, assetPath);
                needsLoad = true;
            }
        }

        // Load item sprites for items present in the room (not yet taken)
        if (this.roomData.items) {
            for (const item of this.roomData.items) {
                if (this.gameState.isRoomItemRemoved(this.roomData.id, item.id)) continue;
                const key = `item-${item.id}`;
                if (!this.textures.exists(key)) {
                    this.load.image(key, `assets/sprites/items/${item.id}.png`);
                    needsLoad = true;
                }
            }
        }

        // Load NPC sprites for NPCs present in the room
        if (this.roomData.npcs) {
            for (const npc of this.roomData.npcs) {
                const key = `npc-${npc.id}`;
                if (!this.textures.exists(key)) {
                    this.load.image(key, `assets/sprites/npcs/${npc.id}.png`);
                    needsLoad = true;
                }
            }
        }

        if (!needsLoad) {
            return Promise.resolve();
        }

        return new Promise<void>((resolve) => {
            this.load.once(Phaser.Loader.Events.COMPLETE, () => resolve());
            this.load.start();
        });
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
     * Also runs narrator_history ink for dynamic commentary based on past player actions.
     */
    private showEntryNarration(): void {
        if (this.isFirstVisit) {
            this.narratorDisplay.typewrite(
                this.roomData.description ?? `You look around ${this.roomData.name}.`
            );
        }

        // Run narrator_history ink for dynamic commentary based on past player actions
        const narratorHistoryJson = this.cache.json.get('dialogue-narrator_history');
        if (narratorHistoryJson) {
            // Use a temporary DialogueManager conversation (non-NPC) to run the narrator script
            this.dialogueManager.startConversation('narrator_history', JSON.stringify(narratorHistoryJson));
            const narratorResult = this.dialogueManager.continueAll();
            this.dialogueManager.endConversation();

            // Filter out empty lines and append commentary after room description
            const commentaryLines = narratorResult.lines.filter(l => l.trim().length > 0);
            if (commentaryLines.length > 0) {
                // Append narrator commentary after a short delay so room description shows first
                this.time.delayedCall(1500, () => {
                    if (!this.inDialogue) {
                        this.narratorDisplay.typewrite(commentaryLines.join(' '));
                    }
                });
            }
        }
    }

    /** Get the ID of the NPC currently in dialogue, or null. */
    getActiveNpcId(): string | null {
        return this.activeNpcId;
    }

    /**
     * Advance the active dialogue, displaying lines and choices or ending the conversation.
     */
    private advanceDialogue(): void {
        if (!this.dialogueManager.isActive()) return;

        const result = this.dialogueManager.continueAll();
        const tags = this.dialogueUI.parseTags(result.tags);
        const speakerName = tags.speaker ?? 'Narrator';

        if (result.ended) {
            // Conversation over
            this.dialogueManager.endConversation();
            // Save dialogue states to GameState for persistence
            this.gameState.setDialogueStates(this.dialogueManager.getDialogueStates());
            this.inDialogue = false;
            this.activeNpcId = null;

            if (result.lines.length > 0) {
                this.dialogueUI.showDialogueWithChoices(speakerName, result.lines, []);
            } else {
                this.narratorDisplay.showInstant('The conversation ends.');
            }
            return;
        }

        // Show dialogue lines and choices
        this.dialogueUI.showDialogueWithChoices(speakerName, result.lines, result.choices);
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
