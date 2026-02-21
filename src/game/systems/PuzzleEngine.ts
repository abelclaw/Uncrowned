import type { PuzzleCondition, PuzzleAction, PuzzleDefinition } from '../types/PuzzleData.ts';
import { GameState } from '../state/GameState.ts';
import EventBus from '../EventBus.ts';

/**
 * Evaluates data-driven puzzle conditions against GameState and executes actions.
 * All puzzle logic is defined in JSON data; this engine is the generic evaluator.
 */
export class PuzzleEngine {
    private state: GameState;

    constructor() {
        this.state = GameState.getInstance();
    }

    /** Check if all conditions are met. Empty conditions array returns true. */
    evaluateConditions(conditions: PuzzleCondition[]): boolean {
        return conditions.every(cond => this.evaluateCondition(cond));
    }

    private evaluateCondition(cond: PuzzleCondition): boolean {
        switch (cond.type) {
            case 'has-item':
                return this.state.hasItem(cond.item);
            case 'not-has-item':
                return !this.state.hasItem(cond.item);
            case 'flag-set':
                return this.state.isFlagSet(cond.flag);
            case 'flag-not-set':
                return !this.state.isFlagSet(cond.flag);
            case 'in-room':
                return this.state.getData().currentRoom === cond.room;
            case 'item-not-taken':
                return !this.state.isRoomItemRemoved(
                    this.state.getData().currentRoom,
                    cond.item,
                );
            default:
                return false;
        }
    }

    /** Execute an array of puzzle actions. Returns the combined response text. */
    executeActions(actions: PuzzleAction[]): string {
        const messages: string[] = [];
        for (const action of actions) {
            const msg = this.executeAction(action);
            if (msg) messages.push(msg);
        }
        return messages.join(' ');
    }

    private executeAction(action: PuzzleAction): string | null {
        switch (action.type) {
            case 'add-item':
                this.state.addItem(action.item);
                return null;
            case 'remove-item':
                this.state.removeItem(action.item);
                return null;
            case 'set-flag':
                this.state.setFlag(action.flag, action.value ?? true);
                return null;
            case 'remove-flag':
                this.state.setFlag(action.flag, false);
                return null;
            case 'show-message':
            case 'narrator-say':
                return action.text;
            case 'trigger-death':
                EventBus.emit('trigger-death', action.deathId);
                return null;
            case 'remove-hotspot':
            case 'add-hotspot':
            case 'open-exit':
                EventBus.emit('room-update', action);
                return null;
            default:
                return null;
        }
    }

    /**
     * Find and execute the first matching puzzle for a given action.
     * Returns the response text and match status, or null if no puzzle matched.
     */
    tryPuzzle(
        verb: string,
        subject: string | null,
        target: string | null,
        puzzles: PuzzleDefinition[],
    ): { response: string; matched: boolean } | null {
        for (const puzzle of puzzles) {
            if (this.matchesTrigger(puzzle, verb, subject, target)) {
                if (this.evaluateConditions(puzzle.conditions)) {
                    const response = this.executeActions(puzzle.actions);
                    if (puzzle.once) {
                        this.state.setFlag(`puzzle-solved:${puzzle.id}`, true);
                    }
                    return { response, matched: true };
                }
            }
        }
        return null;
    }

    private matchesTrigger(
        puzzle: PuzzleDefinition,
        verb: string,
        subject: string | null,
        target: string | null,
    ): boolean {
        if (puzzle.trigger.verb !== verb) return false;
        if (puzzle.trigger.subject && puzzle.trigger.subject !== subject) return false;
        if (puzzle.trigger.target && puzzle.trigger.target !== target) return false;
        if (puzzle.once && this.state.isFlagSet(`puzzle-solved:${puzzle.id}`)) return false;
        return true;
    }
}
