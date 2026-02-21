import type { GameAction } from '../types/GameAction';
import type { RoomData, ExitData, HotspotData } from '../types/RoomData';
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
 * Routes GameActions to game responses using room data.
 * Each verb has a handler that checks hotspots, exits, and room state
 * to produce in-character responses.
 *
 * The narrator voice is sardonic dark comedy (Stanley Parable / Sierra death screens).
 */
export class CommandDispatcher {
    /**
     * Dispatch a parsed GameAction against the current room data.
     * Returns a response string and whether the command was handled.
     */
    dispatch(action: GameAction, roomData: RoomData): DispatchResult {
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

    /**
     * Handle "look" commands.
     * No subject -> room description. Subject is hotspot -> hotspot look response.
     * Subject is exit -> path description. Otherwise -> "don't see that."
     */
    private handleLook(action: GameAction, roomData: RoomData): DispatchResult {
        // Bare "look" -> room description
        if (!action.subject) {
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
     * Subject is hotspot -> hotspot take response or default "can't take."
     * No match -> "don't see that."
     */
    private handleTake(action: GameAction, roomData: RoomData): DispatchResult {
        if (!action.subject) {
            return { response: 'Take what?', handled: false };
        }

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
     * Subject is hotspot -> use response. Two-noun -> "using X on Y doesn't work."
     */
    private handleUse(action: GameAction, roomData: RoomData): DispatchResult {
        if (!action.subject) {
            return { response: 'Use what?', handled: false };
        }

        // Two-noun: "use X on Y"
        if (action.target) {
            const subjectHotspot = this.findHotspot(action.subject, roomData);
            const targetHotspot = this.findHotspot(action.target, roomData);
            const subjectName = subjectHotspot?.name ?? action.subject;
            const targetName = targetHotspot?.name ?? action.target;
            return {
                response: `Using ${subjectName} on ${targetName} doesn't seem to do anything.`,
                handled: true,
            };
        }

        const hotspot = this.findHotspot(action.subject, roomData);
        if (hotspot) {
            const response = hotspot.responses?.use
                ?? "You can't figure out how to use that.";
            return { response, handled: true };
        }

        return {
            response: "You don't see that here.",
            handled: false,
        };
    }

    /**
     * Handle "talk" commands.
     * Subject is hotspot -> talk response or default "doesn't respond."
     */
    private handleTalk(action: GameAction, roomData: RoomData): DispatchResult {
        if (!action.subject) {
            return { response: 'Talk to whom?', handled: false };
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
