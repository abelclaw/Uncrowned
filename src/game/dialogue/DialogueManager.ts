import { Story } from 'inkjs';
import type { GameState } from '../state/GameState';
import EventBus from '../EventBus';

/**
 * Result returned from continueAll() after advancing the ink story.
 * Contains all text lines, tags from the last line, available choices,
 * and whether the conversation has ended.
 */
export interface DialogueContinueResult {
    lines: string[];
    tags: string[];
    choices: Array<{ index: number; text: string }>;
    ended: boolean;
}

/**
 * DialogueManager bridges inkjs Story instances with the game's state system.
 *
 * Each NPC gets its own Story instance created from compiled ink JSON.
 * EXTERNAL functions are bound before any Continue() call, allowing ink
 * scripts to query and mutate game state (inventory, flags, rooms, deaths).
 *
 * Per-NPC story state is saved/restored so conversations persist across
 * multiple interactions and survive save/load cycles.
 */
export class DialogueManager {
    private state: GameState;
    private activeStory: Story | null = null;
    private activeNpcId: string | null = null;
    private npcStoryStates: Map<string, string> = new Map();

    constructor(state: GameState) {
        this.state = state;
    }

    /**
     * Start a conversation with an NPC.
     * Creates a new Story from compiled ink JSON, restores saved state if
     * available, and binds all EXTERNAL functions before any Continue call.
     *
     * @param npcId - Unique NPC identifier for state tracking
     * @param compiledJsonString - Compiled ink JSON as a string (not parsed object)
     */
    startConversation(npcId: string, compiledJsonString: string): void {
        this.activeStory = new Story(compiledJsonString);
        this.activeNpcId = npcId;

        // Bind EXTERNAL functions BEFORE any Continue() call
        this.bindExternalFunctions();

        // Restore saved state if we have one for this NPC
        const savedState = this.npcStoryStates.get(npcId);
        if (savedState) {
            this.activeStory.state.LoadJson(savedState);
        }

        // Navigate to an entry knot. Ink files define knots (greeting/start/room_commentary)
        // but lack root-level diversions, so the root flow is just a "done" instruction.
        // Saved states at END also need re-navigation. We skip only if the restored state
        // already has choices available (player left mid-conversation).
        if ((this.activeStory.currentChoices ?? []).length === 0) {
            for (const knot of ['greeting', 'start', 'room_commentary']) {
                try {
                    this.activeStory.ChoosePathString(knot);
                    break;
                } catch {
                    // Knot doesn't exist, try next
                }
            }
        }
    }

    /**
     * Advance the story, collecting all available text lines, tags, and choices.
     * Drains the canContinue loop, then reads currentChoices.
     * If nothing can continue and no choices remain, the conversation has ended.
     */
    continueAll(): DialogueContinueResult {
        if (!this.activeStory) {
            return { lines: [], tags: [], choices: [], ended: true };
        }

        const lines: string[] = [];
        const tags: string[] = [];

        // Drain all available text
        while (this.activeStory.canContinue) {
            const line = this.activeStory.Continue();
            if (line && line.trim()) {
                lines.push(line.trim());
            }
            // Accumulate tags from all lines (earlier lines may have #speaker tags
            // that later tagless lines shouldn't overwrite)
            for (const t of this.activeStory.currentTags ?? []) {
                if (!tags.includes(t)) {
                    tags.push(t);
                }
            }
        }

        // Read available choices
        const choices = (this.activeStory.currentChoices ?? []).map((choice, index) => ({
            index,
            text: choice.text,
        }));

        // Ended if nothing to continue and no choices
        const ended = !this.activeStory.canContinue && choices.length === 0;

        return { lines, tags, choices, ended };
    }

    /**
     * Select a choice by index and advance the story.
     * @param index - Zero-based choice index from currentChoices
     */
    choose(index: number): void {
        if (!this.activeStory) return;
        this.activeStory.ChooseChoiceIndex(index);
    }

    /**
     * End the current conversation.
     * Saves the story state for later restoration and clears the active story.
     */
    endConversation(): void {
        if (this.activeStory && this.activeNpcId) {
            const stateJson = this.activeStory.state.toJson();
            this.npcStoryStates.set(this.activeNpcId, stateJson);
        }
        this.activeStory = null;
        this.activeNpcId = null;
    }

    /**
     * Whether a conversation is currently active.
     */
    isActive(): boolean {
        return this.activeStory !== null;
    }

    /**
     * Get the NPC ID of the current active conversation, or null.
     */
    getActiveNpcId(): string | null {
        return this.activeNpcId;
    }

    /**
     * Export all saved NPC story states as a plain object for serialization.
     * Called by the save system to persist dialogue progress.
     */
    getDialogueStates(): Record<string, string> {
        const result: Record<string, string> = {};
        this.npcStoryStates.forEach((value, key) => {
            result[key] = value;
        });
        return result;
    }

    /**
     * Import saved NPC story states from a deserialized game state.
     * Called by the load system to restore dialogue progress.
     */
    loadDialogueStates(states: Record<string, string>): void {
        this.npcStoryStates.clear();
        for (const [key, value] of Object.entries(states)) {
            this.npcStoryStates.set(key, value);
        }
    }

    /**
     * Bind all EXTERNAL functions that ink scripts can call.
     * MUST be called before any Continue() on the story.
     */
    private bindExternalFunctions(): void {
        if (!this.activeStory) return;

        this.activeStory.BindExternalFunction('hasItem', (itemId: string) => {
            return this.state.hasItem(itemId);
        });

        this.activeStory.BindExternalFunction('hasFlag', (flagName: string) => {
            return this.state.isFlagSet(flagName);
        });

        this.activeStory.BindExternalFunction('setFlag', (flagName: string) => {
            this.state.setFlag(flagName, true);
            EventBus.emit('room-update', { type: 'set-flag', flag: flagName });
        });

        this.activeStory.BindExternalFunction('addItem', (itemId: string) => {
            this.state.addItem(itemId);
        });

        this.activeStory.BindExternalFunction('removeItem', (itemId: string) => {
            this.state.removeItem(itemId);
        });

        this.activeStory.BindExternalFunction('visitedRoom', (roomId: string) => {
            return this.state.getData().visitedRooms.includes(roomId);
        });

        this.activeStory.BindExternalFunction('getDeathCount', () => {
            return this.state.getData().deathCount;
        });
    }
}
