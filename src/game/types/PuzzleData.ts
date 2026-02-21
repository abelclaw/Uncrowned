/**
 * A single condition that must be true for a puzzle/trigger to fire.
 * Conditions are evaluated against GameState.
 */
export type PuzzleCondition =
    | { type: 'has-item'; item: string }
    | { type: 'not-has-item'; item: string }
    | { type: 'flag-set'; flag: string }
    | { type: 'flag-not-set'; flag: string }
    | { type: 'in-room'; room: string }
    | { type: 'item-not-taken'; item: string };

/**
 * A single action to execute when all conditions are met.
 * Actions mutate GameState or emit events.
 */
export type PuzzleAction =
    | { type: 'add-item'; item: string }
    | { type: 'remove-item'; item: string }
    | { type: 'set-flag'; flag: string; value?: boolean | string }
    | { type: 'remove-flag'; flag: string }
    | { type: 'show-message'; text: string }
    | { type: 'narrator-say'; text: string }
    | { type: 'trigger-death'; deathId: string }
    | { type: 'remove-hotspot'; hotspot: string }
    | { type: 'add-hotspot'; hotspot: string }
    | { type: 'open-exit'; exit: string };

/**
 * A complete puzzle/interaction definition.
 * Evaluated by PuzzleEngine when the player performs a matching verb+subject+target.
 */
export interface PuzzleDefinition {
    id: string;
    /** What verb+subject+target triggers evaluation (null/undefined = any) */
    trigger: {
        verb: string;
        subject?: string;
        target?: string;
    };
    /** All conditions must be true for actions to execute */
    conditions: PuzzleCondition[];
    /** Actions to execute when all conditions are met */
    actions: PuzzleAction[];
    /** Whether this puzzle can only fire once */
    once?: boolean;
}
