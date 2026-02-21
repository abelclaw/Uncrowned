/**
 * Canonical verb types recognized by the text parser.
 * Both the deterministic parser (Phase 3) and future LLM parser (Phase 5)
 * produce actions using these same verbs.
 */
export type Verb = 'look' | 'take' | 'use' | 'go' | 'talk' | 'open' | 'push' | 'pull'
    | 'inventory' | 'save' | 'load' | 'combine' | 'hint';

/**
 * A structured game action produced by parsing player input.
 * This is the universal interface between any parser and the game systems.
 */
export interface GameAction {
    /** The canonical verb for this action */
    verb: Verb;
    /** Resolved ID of the primary target (hotspot, exit, direction, item), or null */
    subject: string | null;
    /** For two-noun commands ("use X on Y"), the secondary target. Null for single-noun commands. */
    target: string | null;
    /** Original player input, preserved for narrator/debug reference */
    rawInput: string;
}

/**
 * Result of parsing player input. Either a successful parse with a GameAction,
 * or a failure with an error message.
 */
export interface ParseResult {
    /** Whether the input was successfully parsed into a game action */
    success: boolean;
    /** The parsed action (present when success is true) */
    action?: GameAction;
    /** Descriptive error message (present when success is false) */
    error?: string;
}
