import type { GameAction } from '../types/GameAction';
import type { RoomData, ExitData, HotspotData, RoomItemData } from '../types/RoomData';
import type { ItemDefinition } from '../types/ItemData';
import type { NpcDefinition } from '../types/NpcData';
import { PuzzleEngine } from './PuzzleEngine';
import { GameState } from '../state/GameState';
import { SaveManager } from '../state/SaveManager';
import EventBus from '../EventBus';

/**
 * Result of dispatching a command against room data.
 */
export interface DispatchResult {
    /** Response text to display to the player */
    response: string;
    /** Whether the command was meaningfully handled */
    handled: boolean;
}

/**
 * Routes GameActions to game responses using room data and game state.
 *
 * Evaluation order (CRITICAL for correctness):
 * 1. Meta-commands (inventory, save, load, combine) -- no room interaction
 * 2. Puzzles (solutions) -- checked first so solutions always succeed
 * 3. Death triggers -- only if no puzzle matched, prevents dying with correct solution
 * 4. Standard verb handlers -- static hotspot/exit responses
 *
 * The narrator voice is sardonic dark comedy (Stanley Parable / Sierra death screens).
 */
export class CommandDispatcher {
    private puzzleEngine: PuzzleEngine;
    private state: GameState;
    private itemDefs: ItemDefinition[];
    private npcDefs: NpcDefinition[];

    constructor(itemDefs: ItemDefinition[] = [], npcDefs: NpcDefinition[] = []) {
        this.puzzleEngine = new PuzzleEngine();
        this.state = GameState.getInstance();
        this.itemDefs = itemDefs;
        this.npcDefs = npcDefs;
    }

    /**
     * Dispatch a parsed GameAction against the current room data.
     * Returns a response string and whether the command was handled.
     */
    dispatch(action: GameAction, roomData: RoomData): DispatchResult {
        // 1. Meta-commands first (no room interaction needed)
        switch (action.verb) {
            case 'inventory':
                return this.handleInventory();
            case 'save':
                return this.handleSave(action);
            case 'load':
                return this.handleLoad(action);
            case 'combine':
                return this.handleCombine(action, roomData);
        }

        // 2. Check puzzles (solutions checked first so correct actions always succeed)
        if (roomData.puzzles && roomData.puzzles.length > 0) {
            const puzzleResult = this.puzzleEngine.tryPuzzle(
                action.verb,
                action.subject,
                action.target,
                roomData.puzzles,
            );
            if (puzzleResult?.matched) {
                return { response: puzzleResult.response, handled: true };
            }
        }

        // 3. Check death triggers (only if no puzzle matched)
        if (roomData.deathTriggers && roomData.deathTriggers.length > 0) {
            const deathResult = this.puzzleEngine.tryPuzzle(
                action.verb,
                action.subject,
                action.target,
                roomData.deathTriggers,
            );
            if (deathResult?.matched) {
                return { response: deathResult.response, handled: true };
            }
        }

        // 4. Standard verb handlers (static responses)
        switch (action.verb) {
            case 'look':
                return this.handleLook(action, roomData);
            case 'go':
                return this.handleGo(action, roomData);
            case 'take':
                return this.handleTake(action, roomData);
            case 'use':
                return this.handleUse(action, roomData);
            case 'talk':
                return this.handleTalk(action, roomData);
            case 'open':
                return this.handleOpen(action, roomData);
            case 'push':
                return this.handlePush(action, roomData);
            case 'pull':
                return this.handlePull(action, roomData);
            default:
                return {
                    response: `I don't understand what you mean by '${action.rawInput}'. Try something like 'look at stump' or 'go east'.`,
                    handled: false,
                };
        }
    }

    // --- Meta-command handlers ---

    /**
     * Handle "inventory" command.
     * Lists all items in inventory. Emits inventory-toggle event for UI panel.
     */
    private handleInventory(): DispatchResult {
        EventBus.emit('inventory-toggle');

        const inventory = this.state.getData().inventory;
        if (inventory.length === 0) {
            return {
                response: 'Your pockets are empty. How tragic.',
                handled: true,
            };
        }

        const itemNames = inventory.map(id => {
            const def = this.findItemDef(id);
            return def ? def.name : id;
        });

        return {
            response: `You are carrying: ${itemNames.join(', ')}.`,
            handled: true,
        };
    }

    /**
     * Handle "save" command.
     * Saves game state to a numbered slot (1-5).
     */
    private handleSave(action: GameAction): DispatchResult {
        const slot = action.subject ? parseInt(action.subject, 10) : NaN;
        if (isNaN(slot) || slot < 1 || slot > 5) {
            return {
                response: 'Save to which slot? (1-5)',
                handled: false,
            };
        }

        SaveManager.saveToSlot(this.state, slot);
        return {
            response: `Game saved to slot ${slot}.`,
            handled: true,
        };
    }

    /**
     * Handle "load" command.
     * Loads game state from a numbered slot. Emits load-game event for scene transition.
     */
    private handleLoad(action: GameAction): DispatchResult {
        const slot = action.subject ? parseInt(action.subject, 10) : NaN;
        if (isNaN(slot) || slot < 1 || slot > 5) {
            // List available slots
            const slots = SaveManager.getSlotInfos();
            const lines = slots.map((info, i) => {
                if (info) {
                    const date = new Date(info.timestamp).toLocaleString();
                    return `  Slot ${i + 1}: ${info.roomId} (${date})`;
                }
                return `  Slot ${i + 1}: [empty]`;
            });
            return {
                response: `Load from which slot? (1-5)\n${lines.join('\n')}`,
                handled: false,
            };
        }

        const loaded = SaveManager.loadFromSlot(this.state, slot);
        if (loaded) {
            const roomId = this.state.getData().currentRoom;
            EventBus.emit('load-game', { roomId });
            return {
                response: 'Game loaded.',
                handled: true,
            };
        }

        return {
            response: `No save in slot ${slot}.`,
            handled: false,
        };
    }

    /**
     * Handle "combine" command.
     * Checks both items are in inventory, then looks for a matching combination puzzle.
     */
    private handleCombine(action: GameAction, roomData: RoomData): DispatchResult {
        if (!action.subject) {
            return { response: 'Combine what?', handled: false };
        }
        if (!action.target) {
            return { response: 'Combine it with what?', handled: false };
        }

        // Both items must be in inventory
        const hasSubject = this.state.hasItem(action.subject);
        const hasTarget = this.state.hasItem(action.target);

        if (!hasSubject && !hasTarget) {
            return {
                response: "You don't have either of those.",
                handled: false,
            };
        }
        if (!hasSubject) {
            const name = this.findItemDef(action.subject)?.name ?? action.subject;
            return {
                response: `You don't have ${name}.`,
                handled: false,
            };
        }
        if (!hasTarget) {
            const name = this.findItemDef(action.target)?.name ?? action.target;
            return {
                response: `You don't have ${name}.`,
                handled: false,
            };
        }

        // Check room puzzles for a combine match
        if (roomData.puzzles && roomData.puzzles.length > 0) {
            const result = this.puzzleEngine.tryPuzzle(
                'combine',
                action.subject,
                action.target,
                roomData.puzzles,
            );
            if (result?.matched) {
                return { response: result.response, handled: true };
            }

            // Try reversed order
            const reversed = this.puzzleEngine.tryPuzzle(
                'combine',
                action.target,
                action.subject,
                roomData.puzzles,
            );
            if (reversed?.matched) {
                return { response: reversed.response, handled: true };
            }
        }

        return {
            response: "Those don't go together.",
            handled: true,
        };
    }

    // --- Enhanced verb handlers ---

    /**
     * Handle "look" commands.
     * No subject -> check dynamic descriptions, then room description.
     * Subject -> check hotspots, room items, inventory items, then exits.
     */
    private handleLook(action: GameAction, roomData: RoomData): DispatchResult {
        // Bare "look" -> check dynamic descriptions based on game flags
        if (!action.subject) {
            // Check dynamic descriptions
            if (roomData.dynamicDescriptions) {
                for (const [flagName, description] of Object.entries(roomData.dynamicDescriptions)) {
                    if (this.state.isFlagSet(flagName)) {
                        return { response: description, handled: true };
                    }
                }
            }

            return {
                response: roomData.description ?? `You look around ${roomData.name}. It's a place. You're in it.`,
                handled: true,
            };
        }

        // Check hotspots
        const hotspot = this.findHotspot(action.subject, roomData);
        if (hotspot) {
            const response = hotspot.responses?.look
                ?? `Nothing special about the ${hotspot.name}.`;
            return { response, handled: true };
        }

        // Check room items (items placed in the room)
        const roomItem = this.findRoomItem(action.subject, roomData);
        if (roomItem && !this.state.isRoomItemRemoved(roomData.id, roomItem.id)) {
            const response = roomItem.responses?.look
                ?? `You see ${roomItem.name}.`;
            return { response, handled: true };
        }

        // Check inventory items (items the player is carrying)
        const invItemDef = this.findItemBySubject(action.subject);
        if (invItemDef && this.state.hasItem(invItemDef.id)) {
            return { response: invItemDef.description, handled: true };
        }

        // Check exits
        const exit = this.findExit(action.subject, roomData);
        if (exit) {
            const dir = exit.direction ?? 'that way';
            return {
                response: `You see a path leading ${dir}.`,
                handled: true,
            };
        }

        return {
            response: "You don't see that here.",
            handled: false,
        };
    }

    /**
     * Handle "go" commands.
     * Subject is exit (by direction, label, or ID) -> emit go-command and respond.
     * Direction with no exit -> "can't go that way." No subject -> "go where?"
     */
    private handleGo(action: GameAction, roomData: RoomData): DispatchResult {
        if (!action.subject) {
            return { response: 'Go where?', handled: false };
        }

        // Try to find a matching exit
        const exit = this.findExit(action.subject, roomData);
        if (exit) {
            const dir = exit.direction ?? exit.label ?? 'onward';
            EventBus.emit('go-command', exit);
            return {
                response: `You head ${dir}.`,
                handled: true,
            };
        }

        // Subject looks like a direction but no matching exit
        return {
            response: "You can't go that way.",
            handled: false,
        };
    }

    /**
     * Handle "take" commands.
     * Check room items first (pickable items), then hotspots for static responses.
     */
    private handleTake(action: GameAction, roomData: RoomData): DispatchResult {
        if (!action.subject) {
            return { response: 'Take what?', handled: false };
        }

        // Check if player already has this item
        if (this.state.hasItem(action.subject)) {
            const def = this.findItemDef(action.subject);
            const name = def ? def.name : action.subject;
            return {
                response: `You already have the ${name}.`,
                handled: true,
            };
        }

        // Check room items for matching takeable item
        const roomItem = this.findRoomItem(action.subject, roomData);
        if (roomItem && !this.state.isRoomItemRemoved(roomData.id, roomItem.id)) {
            // Item is in the room and not yet taken -- the puzzle system should
            // have handled this in step 2 of dispatch(). If we're here, there's
            // no puzzle defined for this take action, so do a simple add.
            this.state.addItem(roomItem.id);
            this.state.markRoomItemRemoved(roomData.id, roomItem.id);
            return {
                response: `You pick up the ${roomItem.name}.`,
                handled: true,
            };
        }

        // Check hotspots for static take responses
        const hotspot = this.findHotspot(action.subject, roomData);
        if (hotspot) {
            const response = hotspot.responses?.take
                ?? `You can't take the ${hotspot.name}.`;
            return { response, handled: true };
        }

        return {
            response: "You don't see that here.",
            handled: false,
        };
    }

    /**
     * Handle "use" commands.
     * For "use X on Y": X resolves inventory-first, Y resolves room-first.
     * For "use X": check hotspots first, then inventory items.
     */
    private handleUse(action: GameAction, roomData: RoomData): DispatchResult {
        if (!action.subject) {
            return { response: 'Use what?', handled: false };
        }

        // Two-noun: "use X on Y" -- puzzle system already checked in dispatch()
        // If we reach here, no puzzle matched. Give descriptive fallback.
        if (action.target) {
            const subjectHotspot = this.findHotspot(action.subject, roomData);
            const targetHotspot = this.findHotspot(action.target, roomData);
            const subjectDef = this.findItemBySubject(action.subject);
            const targetDef = this.findItemBySubject(action.target);
            const subjectName = subjectHotspot?.name ?? subjectDef?.name ?? action.subject;
            const targetName = targetHotspot?.name ?? targetDef?.name ?? action.target;
            return {
                response: `Using ${subjectName} on ${targetName} doesn't seem to do anything.`,
                handled: true,
            };
        }

        // Single-noun "use X" -- check hotspots first (room things)
        const hotspot = this.findHotspot(action.subject, roomData);
        if (hotspot) {
            const response = hotspot.responses?.use
                ?? "You can't figure out how to use that.";
            return { response, handled: true };
        }

        // Check inventory items
        const invItem = this.findItemBySubject(action.subject);
        if (invItem && this.state.hasItem(invItem.id)) {
            return {
                response: `You hold up the ${invItem.name} and wonder what to use it on.`,
                handled: true,
            };
        }

        return {
            response: "You don't see that here.",
            handled: false,
        };
    }

    /**
     * Handle "talk" commands.
     * NPC check first (triggers dialogue mode), then hotspot fallback.
     */
    private handleTalk(action: GameAction, roomData: RoomData): DispatchResult {
        if (!action.subject) {
            return { response: 'Talk to whom?', handled: false };
        }

        // Check NPCs first -- triggers dialogue mode via EventBus
        const npcId = this.findNpc(action.subject, roomData);
        if (npcId) {
            EventBus.emit('start-dialogue', npcId);
            return { response: '', handled: true };
        }

        const hotspot = this.findHotspot(action.subject, roomData);
        if (hotspot) {
            const response = hotspot.responses?.talk
                ?? `You talk to the ${hotspot.name}. It doesn't respond.`;
            return { response, handled: true };
        }

        return {
            response: "There's nobody here by that name. You're talking to the air. Again.",
            handled: false,
        };
    }

    /**
     * Find an NPC by subject in the room's npcs array.
     * Uses triple-resolution: exact ID, name via npcDefs lookup, partial word match.
     * Respects visibility conditions (flag-set, flag-not-set).
     */
    private findNpc(subject: string, roomData: RoomData): string | undefined {
        if (!roomData.npcs) return undefined;
        const lower = subject.toLowerCase();

        for (const npc of roomData.npcs) {
            // Check visibility conditions
            if (npc.conditions && npc.conditions.length > 0) {
                const visible = npc.conditions.every(cond => {
                    if (cond.type === 'flag-set' && cond.flag) {
                        return this.state.isFlagSet(cond.flag);
                    }
                    if (cond.type === 'flag-not-set' && cond.flag) {
                        return !this.state.isFlagSet(cond.flag);
                    }
                    return true;
                });
                if (!visible) continue;
            }

            // Exact ID match
            if (npc.id === lower || npc.id === subject) return npc.id;

            // Name match via npcDefs lookup
            const def = this.npcDefs.find(d => d.id === npc.id);
            if (def && def.name.toLowerCase() === lower) return npc.id;

            // Partial word match against npcDef name
            if (def) {
                const words = lower.split(/\s+/);
                const nameWords = def.name.toLowerCase().split(/\s+/);
                if (words.some(w => nameWords.includes(w))) return npc.id;
            }
        }

        return undefined;
    }

    /**
     * Handle "open" commands.
     * Subject is hotspot -> open response or default "doesn't open."
     */
    private handleOpen(action: GameAction, roomData: RoomData): DispatchResult {
        if (!action.subject) {
            return { response: 'Open what?', handled: false };
        }

        const hotspot = this.findHotspot(action.subject, roomData);
        if (hotspot) {
            const response = hotspot.responses?.open
                ?? "It doesn't open.";
            return { response, handled: true };
        }

        return {
            response: "You don't see that here.",
            handled: false,
        };
    }

    /**
     * Handle "push" commands.
     */
    private handlePush(action: GameAction, roomData: RoomData): DispatchResult {
        if (!action.subject) {
            return { response: 'Push what?', handled: false };
        }

        const hotspot = this.findHotspot(action.subject, roomData);
        if (hotspot) {
            const response = hotspot.responses?.push
                ?? 'Nothing happens.';
            return { response, handled: true };
        }

        return {
            response: "You don't see that here.",
            handled: false,
        };
    }

    /**
     * Handle "pull" commands.
     */
    private handlePull(action: GameAction, roomData: RoomData): DispatchResult {
        if (!action.subject) {
            return { response: 'Pull what?', handled: false };
        }

        const hotspot = this.findHotspot(action.subject, roomData);
        if (hotspot) {
            const response = hotspot.responses?.pull
                ?? 'Nothing happens.';
            return { response, handled: true };
        }

        return {
            response: "You don't see that here.",
            handled: false,
        };
    }

    // --- Lookup helpers ---

    /**
     * Find a hotspot by ID or name match.
     * The subject may be a hotspot ID (from noun resolver) or a raw string.
     */
    private findHotspot(subject: string, roomData: RoomData): HotspotData | undefined {
        const lower = subject.toLowerCase();

        // Exact ID match
        const byId = roomData.hotspots.find(h => h.id === lower || h.id === subject);
        if (byId) return byId;

        // Name match (case-insensitive)
        const byName = roomData.hotspots.find(h => h.name.toLowerCase() === lower);
        if (byName) return byName;

        // Partial name match (any word)
        const words = lower.split(/\s+/);
        const byPartial = roomData.hotspots.find(h => {
            const hotspotWords = h.name.toLowerCase().split(/\s+/);
            return words.some(w => hotspotWords.includes(w));
        });
        if (byPartial) return byPartial;

        return undefined;
    }

    /**
     * Find a room item by ID or name match.
     * Uses the same triple-resolution pattern as findHotspot.
     */
    private findRoomItem(subject: string, roomData: RoomData): RoomItemData | undefined {
        if (!roomData.items) return undefined;
        const lower = subject.toLowerCase();

        // Exact ID match
        const byId = roomData.items.find(i => i.id === lower || i.id === subject);
        if (byId) return byId;

        // Name match (case-insensitive)
        const byName = roomData.items.find(i => i.name.toLowerCase() === lower);
        if (byName) return byName;

        // Partial name match (any word)
        const words = lower.split(/\s+/);
        const byPartial = roomData.items.find(i => {
            const itemWords = i.name.toLowerCase().split(/\s+/);
            return words.some(w => itemWords.includes(w));
        });
        if (byPartial) return byPartial;

        return undefined;
    }

    /**
     * Find an item definition by ID or name match from the master item registry.
     */
    private findItemBySubject(subject: string): ItemDefinition | undefined {
        const lower = subject.toLowerCase();

        // Exact ID match
        const byId = this.itemDefs.find(i => i.id === lower || i.id === subject);
        if (byId) return byId;

        // Name match (case-insensitive)
        const byName = this.itemDefs.find(i => i.name.toLowerCase() === lower);
        if (byName) return byName;

        // Partial name match (any word)
        const words = lower.split(/\s+/);
        const byPartial = this.itemDefs.find(i => {
            const itemWords = i.name.toLowerCase().split(/\s+/);
            return words.some(w => itemWords.includes(w));
        });
        if (byPartial) return byPartial;

        return undefined;
    }

    /**
     * Find an item definition by exact ID.
     */
    private findItemDef(itemId: string): ItemDefinition | undefined {
        return this.itemDefs.find(i => i.id === itemId);
    }

    /**
     * Find an exit by ID, direction, or label.
     * The subject may be an exit ID (from noun resolver), a direction string,
     * or a label string.
     */
    private findExit(subject: string, roomData: RoomData): ExitData | undefined {
        const lower = subject.toLowerCase();

        // Exact ID match
        const byId = roomData.exits.find(e => e.id === lower || e.id === subject);
        if (byId) return byId;

        // Direction match
        const byDir = roomData.exits.find(
            e => e.direction && e.direction.toLowerCase() === lower
        );
        if (byDir) return byDir;

        // Label match
        const byLabel = roomData.exits.find(
            e => e.label && e.label.toLowerCase() === lower
        );
        if (byLabel) return byLabel;

        // Target room partial match
        const byRoom = roomData.exits.find(
            e => e.targetRoom.toLowerCase().includes(lower)
        );
        if (byRoom) return byRoom;

        return undefined;
    }
}
