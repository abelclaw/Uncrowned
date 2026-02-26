import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { NavigationSystem } from '../systems/NavigationSystem';
import { SceneTransition } from '../systems/SceneTransition';
import { CommandDispatcher } from '../systems/CommandDispatcher';
import { CommandLogger } from '../systems/CommandLogger';
import { HybridParser } from '../llm/HybridParser';
import { TextInputBar } from '../ui/TextInputBar';
import { VerbBar } from '../ui/VerbBar';
import { NarratorDisplay } from '../ui/NarratorDisplay';
import { InventoryPanel } from '../ui/InventoryPanel';
import { ScoreDisplay } from '../ui/ScoreDisplay';
import { calculateScore, MAX_SCORE } from '../scoring/ScoringTable';
import { DialogueManager } from '../dialogue/DialogueManager';
import { DialogueUI } from '../dialogue/DialogueUI';
import { AudioManager } from '../systems/AudioManager';
import { EffectsManager } from '../systems/EffectsManager';
import { GameState } from '../state/GameState';
import { MetaGameState } from '../state/MetaGameState';
import type { RoomData, ExitData, HotspotData } from '../types/RoomData';
import type { DeathSceneData } from './DeathScene';
import type { EndingSceneData } from './EndingScene';
import type { ItemDefinition } from '../types/ItemData';
import type { NpcDefinition } from '../types/NpcData';
import type { PuzzleDefinition } from '../types/PuzzleData';
import EventBus from '../EventBus';

/** Set to true during development to draw debug rectangles for exits and hotspots. */
const DEBUG = false;

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
    private transitionSafetyTimer: ReturnType<typeof setTimeout> | null = null;
    private exitZones: Array<{ rect: Phaser.Geom.Rectangle; exit: ExitData }> = [];
    private hotspotZones: Array<{ rect: Phaser.Geom.Rectangle; hotspot: HotspotData }> = [];
    private spawnOverride?: { x: number; y: number };
    private transitionFrom?: string;

    // Phase 4 integrations
    private gameState!: GameState;
    private narratorDisplay!: NarratorDisplay;
    private inventoryPanel!: InventoryPanel;
    private scoreDisplay!: ScoreDisplay;
    private itemDefs: ItemDefinition[] = [];
    private isFirstVisit: boolean = false;

    // Phase 7 audio integration
    private audioManager!: AudioManager;

    // Phase 16 effects integration
    private effectsManager!: EffectsManager;

    // Phase 6 dialogue integration
    private dialogueManager!: DialogueManager;
    private dialogueUI!: DialogueUI;
    private inDialogue: boolean = false;
    private activeNpcId: string | null = null;
    private npcDefs: NpcDefinition[] = [];
    private startDialogueHandler!: (npcId: string) => void;

    // Text parser integration
    private textInputBar!: TextInputBar;
    private verbBar!: VerbBar;
    private textParser!: HybridParser;
    private commandDispatcher!: CommandDispatcher;
    private commandSubmittedHandler!: (text: string) => void;
    private goCommandHandler!: (exit: ExitData) => void;

    // Phase 4 event handlers
    private triggerDeathHandler!: (deathId: string) => void;
    private triggerEndingHandler!: (endingId: string) => void;
    private inventoryToggleHandler!: () => void;
    private loadGameHandler!: (data: { roomId: string }) => void;
    private roomUpdateHandler!: (action: any) => void;
    private itemPickedUpHandler!: (itemId: string) => void;
    private inventoryBtnHandler?: () => void;
    private flushLogHandler?: () => void;

    // Arrow key direct movement (disabled in static scene mode)
    // private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;

    // Phase 9 lazy-loaded sprites
    private itemSprites: Map<string, Phaser.GameObjects.Image> = new Map();
    private npcSprites: Map<string, Phaser.GameObjects.Image> = new Map();
    private hotspotSprites: Map<string, Phaser.GameObjects.Image> = new Map();
    // Dynamic background layer images (for flag-based swaps)
    private bgLayerImages: Map<string, Phaser.GameObjects.Image> = new Map();
    // Player static image reference (for hat sprite swap)
    private playerImg: Phaser.GameObjects.Image | null = null;

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

        // Track first visit BEFORE marking as visited (markRoomVisited deferred to showEntryNarration
        // so narrator_history ink doesn't see the current room as already visited)
        this.isFirstVisit = !this.gameState.getData().visitedRooms.includes(data.roomId);

        // Update GameState current room (visited marking deferred to showEntryNarration)
        (this.gameState.getData() as { currentRoom: string }).currentRoom = data.roomId;

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
        this.hotspotSprites = new Map();
    }

    create(): void {
        // Start scene fully black — playTransitionIn() will reveal it
        this.cameras.main.setAlpha(0);

        // 1. Lazy-load room assets (backgrounds, item sprites, NPC sprites)
        const loadingText = this.add.text(480, 270, 'Loading...', {
            fontFamily: 'monospace', fontSize: '14px', color: '#ffffff'
        }).setOrigin(0.5).setScrollFactor(0).setDepth(999);

        this.loadRoomAssets().then(() => {
            loadingText.destroy();

            // Create background layers with parallax scroll factors
            // Resolve dynamic background swaps based on current game flags
            this.roomData.background.layers.forEach((layer, index) => {
                let resolvedKey = layer.key;
                if (this.roomData.dynamicBackgrounds) {
                    for (const [flag, swap] of Object.entries(this.roomData.dynamicBackgrounds)) {
                        if (swap.from === layer.key && this.gameState.isFlagSet(flag)) {
                            resolvedKey = swap.to;
                        }
                    }
                }
                const img = this.add.image(0, 0, resolvedKey)
                    .setOrigin(0, 0)
                    .setScrollFactor(layer.scrollFactor)
                    .setDepth(index);
                this.bgLayerImages.set(layer.key, img);
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
                        ).setDisplaySize(item.zone.width, item.zone.height).setDepth(5);
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
                        const tex = this.textures.get(spriteKey).getSourceImage();
                        // Scale to fit zone height, maintain aspect ratio, anchor at bottom-center
                        const scale = npc.zone.height / tex.height;
                        const npcSprite = this.add.image(
                            npc.zone.x + npc.zone.width / 2,
                            npc.zone.y + npc.zone.height,
                            spriteKey
                        ).setOrigin(0.5, 1).setScale(scale).setDepth(5);
                        this.npcSprites.set(npc.id, npcSprite);
                    }
                }
            }

            // Render hotspot sprites (must be after load completes so textures exist)
            for (const hotspot of this.roomData.hotspots) {
                if (hotspot.spriteId) {
                    // Skip hotspots whose conditions are not met
                    if (hotspot.conditions && hotspot.conditions.length > 0) {
                        const visible = hotspot.conditions.every(cond => {
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
                    const spriteKey = `hotspot-${hotspot.spriteId}`;
                    if (this.textures.exists(spriteKey)) {
                        const sprite = this.add.image(
                            hotspot.zone.x + hotspot.zone.width / 2,
                            hotspot.zone.y + hotspot.zone.height,
                            spriteKey
                        ).setOrigin(0.5, 1).setDepth(5);
                        const tex = this.textures.get(spriteKey).getSourceImage();
                        const scale = hotspot.zone.height / tex.height;
                        sprite.setScale(scale);
                        this.hotspotSprites.set(hotspot.id, sprite);
                    }
                }
            }
        });

        // 2. Navigation system from walkable area polygon
        this.navigation = new NavigationSystem(this.roomData.walkableArea);

        // 3. Player (static image -- single standing pose, no animation)
        const spawnX = this.spawnOverride?.x ?? this.roomData.playerSpawn.x;
        const spawnY = this.spawnOverride?.y ?? this.roomData.playerSpawn.y;
        this.player = new Player(this, spawnX, spawnY);
        this.player.getSprite().setVisible(false); // hide spritesheet-based player

        // Show static player image with subtle idle animation
        // Use hat variant if player has purchased the hat
        const playerSpriteKey = this.gameState.isFlagSet('has_hat') && this.textures.exists('player-with-hat')
            ? 'player-with-hat' : 'player-static';
        if (this.textures.exists(playerSpriteKey)) {
            this.playerImg = this.add.image(spawnX, spawnY, playerSpriteKey)
                .setOrigin(0.5, 1)
                .setDepth(50);

            // Gentle breathing: slight vertical squash-stretch
            this.tweens.add({
                targets: this.playerImg,
                scaleY: this.playerImg.scaleY * 1.015,
                scaleX: this.playerImg.scaleX * 0.99,
                duration: 2000,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut',
            });

            // Subtle hair sway: tiny rotation oscillation
            this.tweens.add({
                targets: this.playerImg,
                angle: { from: -0.8, to: 0.8 },
                duration: 3000,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut',
            });
        }

        // 4. Exit zones (skip exits whose conditions are not met)
        for (const exit of this.roomData.exits) {
            if (exit.conditions && exit.conditions.length > 0) {
                const conditionsMet = exit.conditions.every(cond => {
                    if (cond.type === 'flag-set' && cond.flag) {
                        return this.gameState.isFlagSet(cond.flag);
                    }
                    if (cond.type === 'flag-not-set' && cond.flag) {
                        return !this.gameState.isFlagSet(cond.flag);
                    }
                    if (cond.type === 'has-item' && cond.item) {
                        return this.gameState.hasItem(cond.item);
                    }
                    return true;
                });
                if (!conditionsMet) {
                    if (DEBUG) {
                        // Draw inactive exits in grey for debugging visibility
                        const gfx = this.add.graphics();
                        gfx.fillStyle(0x888888, 0.1);
                        gfx.fillRect(exit.zone.x, exit.zone.y, exit.zone.width, exit.zone.height);
                        gfx.lineStyle(1, 0x888888, 0.3);
                        gfx.strokeRect(exit.zone.x, exit.zone.y, exit.zone.width, exit.zone.height);
                        gfx.setDepth(100);
                    }
                    continue;
                }
            }

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

        // 5. Hotspot zones (respecting visibility conditions)
        for (const hotspot of this.roomData.hotspots) {
            // Skip hotspots whose conditions are not met
            if (hotspot.conditions && hotspot.conditions.length > 0) {
                const visible = hotspot.conditions.every(cond => {
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

        // 6. Camera setup (static scene mode -- no scrolling, room bg fills viewport)
        this.cameras.main.setBounds(0, 0, this.roomData.background.worldWidth, 540);
        this.cameras.main.setRoundPixels(true);
        this.cameras.main.setScroll(0, 0);

        // 7. Click handler (blur text input on canvas click)
        this.input.on('pointerdown', () => {
            if (document.activeElement instanceof HTMLElement) {
                document.activeElement.blur();
            }
        });

        // 8. Text parser integration
        this.textParser = new HybridParser();

        // Extract global combine recipes from all rooms so combine works regardless of current room
        const globalCombines = this.extractGlobalCombines();
        this.commandDispatcher = new CommandDispatcher(this.itemDefs, this.npcDefs, globalCombines);

        // Create TextInputBar (Option A: destroy and recreate each scene create)
        const container = document.getElementById('game-container')!;
        this.textInputBar = new TextInputBar(container);

        // Create VerbBar (appended after TextInputBar: canvas -> text parser -> verb bar)
        this.verbBar = new VerbBar(container);

        // Create NarratorDisplay wrapping the TextInputBar's response element
        const responseEl = document.getElementById('parser-response')!;
        this.narratorDisplay = new NarratorDisplay(responseEl);

        // Create InventoryPanel
        this.inventoryPanel = new InventoryPanel(container);

        // Create ScoreDisplay (top-right score badge)
        this.scoreDisplay = new ScoreDisplay(container);
        this.updateScoreDisplay();

        // Show inventory button and wire click handler
        const invBtn = document.getElementById('inventory-btn');
        if (invBtn) {
            invBtn.style.display = 'flex';
            this.inventoryBtnHandler = () => {
                this.updateInventoryPanel();
                this.inventoryPanel.toggle();
            };
            invBtn.addEventListener('click', this.inventoryBtnHandler);
        }

        // Auto-close inventory when text input gets focus (prevents overlay blocking input)
        const inputEl = document.getElementById('parser-input');
        if (inputEl) {
            inputEl.addEventListener('focus', () => {
                if (this.inventoryPanel.isVisible()) {
                    this.inventoryPanel.hide();
                }
            });
        }

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

        // Phase 16 effects integration
        this.effectsManager = EffectsManager.getInstance();
        this.effectsManager.init(this);
        this.effectsManager.onRoomEnter(this.roomData);
        if (this.game.renderer.type === Phaser.CANVAS) {
            console.log('[RoomScene] Canvas renderer detected, effects reduced');
        }

        // Ghost passage shimmer: activate if flag already set on room entry
        if (this.roomData.id === 'throne_room' && this.gameState.isFlagSet('ghost_approved_decree')) {
            this.effectsManager.createGhostPassage(560, 282, 80, 200);
        }

        // Listen for command-submitted events from the input bar
        this.commandSubmittedHandler = async (text: string) => {
            // Dialogue mode: route input to choice selection
            if (this.inDialogue && this.dialogueManager.isActive()) {
                const trimmed = text.trim();

                // Allow movement commands to exit dialogue and navigate away
                const movePattern = /^(go\s+)?(north|south|east|west|n|s|e|w|up|down|leave|exit|back)$/i;
                if (movePattern.test(trimmed)) {
                    this.dialogueManager.endConversation();
                    this.gameState.setDialogueStates(this.dialogueManager.getDialogueStates());
                    this.inDialogue = false;
                    this.activeNpcId = null;
                    this.updateScoreDisplay();
                    // Fall through to normal command processing below
                } else {
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
            }

            if (this.isTransitioning) return;

            // "save log" meta-command: download command log as JSON
            if (text.trim().toLowerCase() === 'save log') {
                const entries = CommandLogger.getInstance().export();
                const blob = new Blob([JSON.stringify(entries, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `command-log-${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}.json`;
                a.click();
                URL.revokeObjectURL(url);
                this.narratorDisplay.showInstant(`Log saved — ${entries.length} commands exported.`);
                return;
            }

            // Show thinking indicator while waiting for parse (may involve LLM)
            this.narratorDisplay.showInstant('...');

            // Get current inventory item info for noun resolution
            const inventoryItems = this.itemDefs
                .filter(item => this.gameState.hasItem(item.id))
                .map(item => ({ id: item.id, name: item.name, aliases: item.aliases }));

            // Merge room items (not yet taken) into hotspots for noun resolution
            const roomItemsAsHotspots = (this.roomData.items ?? [])
                .filter(item => !this.gameState.isRoomItemRemoved(this.roomData.id, item.id))
                .map(item => ({ id: item.id, name: item.name, zone: item.zone, interactionPoint: item.interactionPoint, responses: item.responses ?? {}, aliases: item.aliases }));
            // Merge NPCs into hotspots so text parser can resolve NPC names
            // NPCs go FIRST so they win tie-breaks (e.g. "talk to man by the well"
            // should resolve to the old_man NPC, not the well hotspot)
            const npcAsHotspots = (this.roomData.npcs ?? [])
                .map(npc => {
                    const def = this.npcDefs.find(d => d.id === npc.id);
                    return { id: npc.id, name: def?.name ?? npc.id.replace(/_/g, ' '), zone: npc.zone, interactionPoint: npc.interactionPoint, aliases: npc.aliases, responses: {} };
                });
            const allHotspots = [...npcAsHotspots, ...roomItemsAsHotspots, ...this.roomData.hotspots];

            const parseResult = this.textParser.parse(
                text,
                allHotspots,
                this.roomData.exits,
                inventoryItems,
            );

            if (!parseResult.success || !parseResult.action) {
                CommandLogger.getInstance().log({
                    timestamp: Date.now(), room: this.roomData.id, rawInput: text,
                    parsed: false, verb: null, subject: null, target: null,
                });
                this.narratorDisplay.typewrite(
                    parseResult.error ?? `I don't understand "${text}". Try commands like 'look', 'take', 'go', or 'use'.`
                );
                return;
            }

            // Sync dialogue states to GameState before dispatch (save commands need current state)
            if (this.dialogueManager) {
                this.gameState.setDialogueStates(this.dialogueManager.getDialogueStates());
            }

            CommandLogger.getInstance().log({
                timestamp: Date.now(), room: this.roomData.id, rawInput: text,
                parsed: true, verb: parseResult.action.verb, subject: parseResult.action.subject,
                target: parseResult.action.target,
            });

            const result = this.commandDispatcher.dispatch(parseResult.action, this.roomData);

            // Phase 16: sparkle burst on successful non-look commands at the hotspot interaction point
            if (parseResult.action.verb !== 'look' && parseResult.action.subject) {
                const matchedHotspot = this.hotspotZones.find(z => z.hotspot.id === parseResult.action!.subject);
                if (matchedHotspot) {
                    this.effectsManager.playInteractionBurst(
                        matchedHotspot.hotspot.interactionPoint.x,
                        matchedHotspot.hotspot.interactionPoint.y
                    );
                }
            }

            // Use typewriter for narrator-style responses, instant for short system messages.
            // Skip when response is empty (e.g. NPC dialogue handled via EventBus).
            if (result.response.length > 50) {
                this.narratorDisplay.typewrite(result.response);
            } else if (result.response.length > 0) {
                this.narratorDisplay.showInstant(result.response);
            }

            // Update score and inventory after each command (flags/items may have changed)
            this.updateScoreDisplay();
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
            this.isTransitioning = true;
            this.startTransitionSafetyTimer();

            const deathData = this.roomData.deaths?.[deathId];
            if (!deathData) {
                console.warn(`Death ID "${deathId}" not found in room data`);
                this.isTransitioning = false;
                return;
            }

            // Record death in MetaGameState BEFORE launching death scene
            const meta = MetaGameState.getInstance();
            const isNewDeath = meta.recordDeath(deathId);
            const discoveredCount = meta.getDeathsDiscovered().length;

            // Look up imageId from death registry
            const deathRegistry = this.cache.json.get('death-registry') as
                { deaths: Array<{ id: string; imageId?: string }> } | undefined;
            const registryEntry = deathRegistry?.deaths.find(d => d.id === deathId);
            const imageId = registryEntry?.imageId;

            // Pre-load death image if needed, then launch death scene
            const launchDeath = () => {
                this.scene.pause();
                this.textInputBar.hide();
                this.inventoryPanel.hide();
                this.scoreDisplay.hide();
                this.scene.launch('DeathScene', {
                    title: deathData.title,
                    narratorText: deathData.narratorText,
                    deathId: deathId,
                    isNewDeath: isNewDeath,
                    discoveredCount: discoveredCount,
                    totalDeaths: 43,
                    imageId: imageId,
                } as DeathSceneData);
            };

            if (imageId) {
                const textureKey = `death-img-${imageId}`;
                if (!this.textures.exists(textureKey)) {
                    this.load.image(textureKey, `assets/death-images/${imageId}.png`);
                    this.load.once(Phaser.Loader.Events.COMPLETE, launchDeath);
                    this.load.once(Phaser.Loader.Events.FILE_LOAD_ERROR, launchDeath);
                    this.load.start();
                    return;
                }
            }
            launchDeath();
        };
        EventBus.on('trigger-death', this.triggerDeathHandler);

        // Ending trigger handler
        this.triggerEndingHandler = (endingId: string) => {
            if (this.isTransitioning) return;
            this.isTransitioning = true;
            this.startTransitionSafetyTimer();

            // Record ending BEFORE starting EndingScene (same pattern as death recording)
            const meta = MetaGameState.getInstance();
            const isNewEnding = meta.recordEnding(endingId);
            const discoveredCount = meta.getEndingsDiscovered().length;

            // Hide UI elements
            this.textInputBar.hide();
            this.inventoryPanel.hide();
            this.scoreDisplay.hide();

            // Fade out then start EndingScene (full replacement, not overlay)
            this.cameras.main.fadeOut(1500, 0, 0, 0);
            this.cameras.main.once(
                Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE,
                () => {
                    this.scene.start('EndingScene', {
                        endingId,
                        isNewEnding,
                        discoveredCount,
                        totalEndings: 4,
                    } as EndingSceneData);
                }
            );
        };
        EventBus.on('trigger-ending', this.triggerEndingHandler);

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

        // Room update handler (from PuzzleEngine actions like open-exit, set-flag)
        this.roomUpdateHandler = (action: any) => {
            // Swap background layers when a flag triggers a dynamic background change
            if (action.type === 'set-flag' && this.roomData.dynamicBackgrounds) {
                const swap = this.roomData.dynamicBackgrounds[action.flag];
                if (swap) {
                    const img = this.bgLayerImages.get(swap.from);
                    if (img && this.textures.exists(swap.to)) {
                        img.setTexture(swap.to);
                    }
                }
            }

            // Ghost passage shimmer: activate when ghost approves decree
            if (action.type === 'set-flag' && action.flag === 'ghost_approved_decree' && this.roomData.id === 'throne_room') {
                this.effectsManager.createGhostPassage(560, 282, 80, 200);
            }

            // open-exit: register the exit zone mid-scene so the player can walk through immediately
            if (action.type === 'open-exit' && action.exit) {
                const exit = this.roomData.exits.find(e => e.id === action.exit);
                if (exit) {
                    const alreadyOpen = this.exitZones.some(ez => ez.exit.id === exit.id);
                    if (!alreadyOpen) {
                        this.exitZones.push({
                            rect: new Phaser.Geom.Rectangle(
                                exit.zone.x, exit.zone.y, exit.zone.width, exit.zone.height
                            ),
                            exit,
                        });
                    }
                }
            }

            // Swap player sprite when hat is purchased
            if (action.type === 'set-flag' && action.flag === 'has_hat' && this.playerImg) {
                if (this.textures.exists('player-with-hat')) {
                    this.playerImg.setTexture('player-with-hat');
                }
            }

            // Hide/show hotspot sprites and register/remove click zones when flag changes
            if (action.type === 'set-flag') {
                for (const hotspot of this.roomData.hotspots) {
                    if (!hotspot.conditions?.length) continue;
                    const visible = hotspot.conditions.every(cond => {
                        if (cond.type === 'flag-set' && cond.flag) {
                            return this.gameState.isFlagSet(cond.flag);
                        }
                        if (cond.type === 'flag-not-set' && cond.flag) {
                            return !this.gameState.isFlagSet(cond.flag);
                        }
                        return true;
                    });
                    // Toggle sprite visibility if hotspot has a sprite
                    const sprite = this.hotspotSprites.get(hotspot.id);
                    if (sprite) {
                        sprite.setVisible(visible);
                    }
                    // Register click zone if hotspot just became visible
                    if (visible) {
                        const alreadyRegistered = this.hotspotZones.some(hz => hz.hotspot.id === hotspot.id);
                        if (!alreadyRegistered) {
                            this.hotspotZones.push({
                                rect: new Phaser.Geom.Rectangle(
                                    hotspot.zone.x, hotspot.zone.y, hotspot.zone.width, hotspot.zone.height
                                ),
                                hotspot,
                            });
                        }
                    }
                }

                // Also re-evaluate NPC visibility when flags change
                if (this.roomData.npcs) {
                    for (const npc of this.roomData.npcs) {
                        if (!npc.conditions?.length) continue;
                        const visible = npc.conditions.every(cond => {
                            if (cond.type === 'flag-set' && cond.flag) {
                                return this.gameState.isFlagSet(cond.flag);
                            }
                            if (cond.type === 'flag-not-set' && cond.flag) {
                                return !this.gameState.isFlagSet(cond.flag);
                            }
                            return true;
                        });
                        const existing = this.npcSprites.get(npc.id);
                        if (visible && !existing) {
                            // Create NPC sprite on first visibility
                            const spriteKey = `npc-${npc.id}`;
                            if (this.textures.exists(spriteKey)) {
                                const tex = this.textures.get(spriteKey).getSourceImage();
                                const scale = npc.zone.height / tex.height;
                                const npcSprite = this.add.image(
                                    npc.zone.x + npc.zone.width / 2,
                                    npc.zone.y + npc.zone.height,
                                    spriteKey
                                ).setOrigin(0.5, 1).setScale(scale).setDepth(5);
                                this.npcSprites.set(npc.id, npcSprite);
                            }
                            // Also register click zone if not already present
                            const alreadyRegistered = this.hotspotZones.some(hz => hz.hotspot.id === npc.id);
                            if (!alreadyRegistered) {
                                const npcDef = this.npcDefs.find(d => d.id === npc.id);
                                const npcName = npcDef?.name ?? npc.id;
                                this.hotspotZones.push({
                                    rect: new Phaser.Geom.Rectangle(
                                        npc.zone.x, npc.zone.y, npc.zone.width, npc.zone.height
                                    ),
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
                            }
                        } else if (existing) {
                            existing.setVisible(visible);
                        }
                    }
                }
            }
        };
        EventBus.on('room-update', this.roomUpdateHandler);

        // Item picked up handler (from PuzzleEngine add-item action)
        this.itemPickedUpHandler = (itemId: string) => {
            this.gameState.markRoomItemRemoved(this.roomData.id, itemId);
            // Phase 16: sparkle burst at item position before destroying sprite
            const sprite = this.itemSprites.get(itemId);
            if (sprite) {
                this.effectsManager.playInteractionBurst(sprite.x, sprite.y);
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

        // 9. Transition-in effect (matches the exit transition used to arrive here)
        // Block commands until the transition-in animation completes to prevent
        // camera fade conflicts (e.g. fadeOut during fadeIn swallowing the complete event)
        this.isTransitioning = true;
        this.playTransitionIn();

        // 10. EventBus scene-ready
        EventBus.emit('scene-ready', { sceneKey: 'RoomScene', roomId: this.roomData.id });

        // 11. Flush command log on page unload
        this.flushLogHandler = () => CommandLogger.getInstance().flush();
        window.addEventListener('beforeunload', this.flushLogHandler);

        // 12. Shutdown cleanup
        this.events.on(Phaser.Scenes.Events.SHUTDOWN, () => {
            // Existing cleanup
            this.player.destroy();
            this.navigation.destroy();
            this.textInputBar.destroy();
            this.verbBar.destroy();
            EventBus.off('command-submitted', this.commandSubmittedHandler);
            EventBus.off('go-command', this.goCommandHandler);
            EventBus.removeAllListeners('scene-ready');

            // Hide inventory button and remove listener
            const invBtn = document.getElementById('inventory-btn');
            if (invBtn) {
                invBtn.style.display = 'none';
                if (this.inventoryBtnHandler) {
                    invBtn.removeEventListener('click', this.inventoryBtnHandler);
                }
            }

            // Phase 4 cleanup
            this.narratorDisplay.destroy();
            this.inventoryPanel.destroy();
            this.scoreDisplay.destroy();
            EventBus.off('trigger-death', this.triggerDeathHandler);
            EventBus.off('trigger-ending', this.triggerEndingHandler);
            EventBus.off('inventory-toggle', this.inventoryToggleHandler);
            EventBus.off('load-game', this.loadGameHandler);
            EventBus.off('room-update', this.roomUpdateHandler);
            EventBus.off('item-picked-up', this.itemPickedUpHandler);

            // Phase 9 sprite cleanup
            this.itemSprites.forEach(sprite => sprite.destroy());
            this.itemSprites.clear();
            this.npcSprites.forEach(sprite => sprite.destroy());
            this.npcSprites.clear();
            this.hotspotSprites.forEach(sprite => sprite.destroy());
            this.hotspotSprites.clear();

            // Command log flush cleanup
            if (this.flushLogHandler) {
                window.removeEventListener('beforeunload', this.flushLogHandler);
            }
            CommandLogger.getInstance().flush();

            // Phase 16 effects cleanup
            this.effectsManager.cleanup();

            // Phase 7 audio cleanup (remove EventBus listeners, keep audio playing for crossfade)
            this.audioManager.cleanup();

            // Transition safety timer cleanup
            if (this.transitionSafetyTimer) {
                clearTimeout(this.transitionSafetyTimer);
                this.transitionSafetyTimer = null;
            }

            // Phase 6 dialogue cleanup
            if (this.dialogueManager?.isActive()) {
                this.dialogueManager.endConversation();
                this.gameState.setDialogueStates(this.dialogueManager.getDialogueStates());
            }
            EventBus.off('start-dialogue', this.startDialogueHandler);
        });
    }

    update(_time: number, _delta: number): void {
        // Static scene mode: no player movement or exit overlap detection.
        // Room transitions are handled via text commands ("go east", "go cave") through CommandDispatcher.
    }

    /**
     * Lazily load room-specific assets (backgrounds, item sprites, NPC sprites).
     * Skips assets already cached in Phaser's texture manager.
     * Returns a promise that resolves when all assets are loaded.
     */
    private loadRoomAssets(): Promise<void> {
        let needsLoad = false;

        // Load background layers
        const bgKeysToLoad = new Set<string>();
        for (const layer of this.roomData.background.layers) {
            bgKeysToLoad.add(layer.key);
        }
        // Also preload dynamic background swap targets
        if (this.roomData.dynamicBackgrounds) {
            for (const swap of Object.values(this.roomData.dynamicBackgrounds)) {
                bgKeysToLoad.add(swap.from);
                bgKeysToLoad.add(swap.to);
            }
        }
        for (const key of bgKeysToLoad) {
            if (!this.textures.exists(key)) {
                let assetPath: string;
                if (key.startsWith('bg-shared-')) {
                    const rest = key.replace('bg-shared-', '');
                    assetPath = `assets/backgrounds/shared/${rest}.png`;
                } else if (key.startsWith('bg-rooms-')) {
                    const rest = key.replace('bg-rooms-', '');
                    assetPath = `assets/backgrounds/rooms/${rest}.png`;
                } else {
                    continue;
                }
                this.load.image(key, assetPath);
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

        // Load hotspot sprites (for hotspots with spriteId)
        for (const hotspot of this.roomData.hotspots) {
            if (hotspot.spriteId) {
                const key = `hotspot-${hotspot.spriteId}`;
                if (!this.textures.exists(key)) {
                    this.load.image(key, `assets/sprites/hotspots/${hotspot.spriteId}.png`);
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
     * Extract all combine-type puzzles from every loaded room JSON.
     * These are inventory-only operations that should work regardless of current room.
     */
    private extractGlobalCombines(): PuzzleDefinition[] {
        const combines: PuzzleDefinition[] = [];
        const roomKeys = (this.cache.json as Phaser.Cache.BaseCache).getKeys().filter((k: string) => k.startsWith('room-'));
        for (const key of roomKeys) {
            const room = this.cache.json.get(key);
            if (!room?.puzzles) continue;
            for (const puzzle of room.puzzles) {
                if (puzzle.trigger?.verb === 'combine') {
                    combines.push(puzzle as PuzzleDefinition);
                }
            }
        }
        return combines;
    }

    /**
     * Handle player reaching an exit zone. Triggers the appropriate transition.
     */
    private handleExitReached(exit: ExitData): void {
        if (this.isTransitioning) return;
        this.isTransitioning = true;
        this.startTransitionSafetyTimer();

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
     * Start a safety timer that resets isTransitioning after 5 seconds.
     * Prevents permanent lockout if a scene transition fails to complete
     * (e.g., camera fade conflict with transition-in animation).
     */
    private startTransitionSafetyTimer(): void {
        if (this.transitionSafetyTimer) {
            clearTimeout(this.transitionSafetyTimer);
        }
        this.transitionSafetyTimer = setTimeout(() => {
            if (this.isTransitioning) {
                console.warn('[RoomScene] Transition safety timeout — resetting isTransitioning');
                this.isTransitioning = false;
                this.input.enabled = true;
            }
        }, 5000);
    }

    /**
     * Play the transition-in animation matching how we arrived at this room.
     * Handles all 7 transition types: fade, slide-left/right, wipe-left/right, pixelate, iris.
     */
    private playTransitionIn(): void {
        // Restore camera visibility (was set to 0 in create() to prevent flashes)
        this.cameras.main.setAlpha(1);

        const onTransitionComplete = () => {
            this.isTransitioning = false;
            this.textInputBar.focus();
            this.showEntryNarration();
        };

        switch (this.transitionFrom) {
            case 'slide-left':
            case 'slide-right': {
                // Fade out a black overlay to reveal the new scene
                const rect = this.add.rectangle(480, 270, 960, 540, 0x000000)
                    .setDepth(1000)
                    .setScrollFactor(0)
                    .setAlpha(1);
                this.tweens.add({
                    targets: rect,
                    alpha: 0,
                    ease: 'Cubic.easeOut',
                    duration: 500,
                    onComplete: () => {
                        rect.destroy();
                        onTransitionComplete();
                    },
                });
                break;
            }

            case 'wipe-left':
            case 'wipe-right': {
                // Reveal by shrinking a full-screen black rect
                const rect = this.add.rectangle(0, 0, 960, 540, 0x000000)
                    .setDepth(1000)
                    .setScrollFactor(0)
                    .setOrigin(0, 0);

                if (this.transitionFrom === 'wipe-right') {
                    // Wipe-right entry: rect shrinks from right edge (reveals left to right)
                    rect.setPosition(0, 0);
                } else {
                    // Wipe-left entry: rect shrinks from left edge (reveals right to left)
                    rect.setPosition(960, 0).setOrigin(1, 0);
                }

                this.tweens.add({
                    targets: rect,
                    width: 0,
                    ease: 'Linear',
                    duration: 500,
                    onComplete: () => {
                        rect.destroy();
                        onTransitionComplete();
                    },
                });
                break;
            }

            case 'pixelate': {
                // Start pixelated and de-pixelate to reveal
                const fx = this.cameras.main.postFX.addPixelate(20);
                this.tweens.add({
                    targets: fx,
                    amount: 1,
                    ease: 'Power2',
                    duration: 500,
                    onComplete: () => {
                        this.cameras.main.postFX.remove(fx);
                        onTransitionComplete();
                    },
                });
                break;
            }

            case 'iris': {
                // Iris-open: vignette starts at full strength (black) and fades to clear
                const fx = this.cameras.main.postFX.addVignette(0.5, 0.5, 0.0, 1.0);
                fx.strength = 1.0;
                // Use longer duration for act-change entries (detected by iris type itself)
                const irisDuration = 700;
                this.tweens.add({
                    targets: fx,
                    strength: 0,
                    ease: 'Cubic.easeOut',
                    duration: irisDuration,
                    onComplete: () => {
                        this.cameras.main.postFX.remove(fx);
                        onTransitionComplete();
                    },
                });
                break;
            }

            default: {
                // Default: fade in
                this.cameras.main.fadeIn(500, 0, 0, 0);
                this.cameras.main.once(
                    Phaser.Cameras.Scene2D.Events.FADE_IN_COMPLETE,
                    onTransitionComplete
                );
                break;
            }
        }
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

        this.gameState.markRoomVisited(this.roomData.id);
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
            this.updateScoreDisplay();

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

    /**
     * Recalculate and display the current score from GameState flags.
     */
    private updateScoreDisplay(): void {
        const score = calculateScore(
            this.gameState.getData().flags as Record<string, boolean | string>,
        );
        this.scoreDisplay.update(score, MAX_SCORE);
    }
}
