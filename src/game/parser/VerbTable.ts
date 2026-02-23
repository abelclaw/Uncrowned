import type { Verb } from '../types/GameAction.ts';

/**
 * Defines a canonical verb with its synonyms and sentence pattern regexes.
 * Patterns are ordered most-specific-first; the parser tests them in order.
 */
export interface VerbDefinition {
    /** Internal canonical verb name */
    canonical: Verb;
    /** All words that map to this verb (includes the canonical name) */
    synonyms: string[];
    /**
     * Regex patterns for matching sentences with this verb.
     * Capture groups extract noun phrases:
     *   - Group 1 = subject noun
     *   - Group 2 = target noun (for two-noun commands)
     * Patterns are tested in order; first match wins.
     */
    patterns: RegExp[];
}

/**
 * The verb synonym table defines all recognized verbs, their synonyms,
 * and regex patterns for extracting noun phrases from player input.
 *
 * Design notes:
 * - Patterns are case-insensitive (the /i flag)
 * - More specific patterns come first to avoid greedy matching
 * - "use X on Y" patterns capture both subject and target
 * - Bare verb patterns (no noun) come last
 */
export const VERB_TABLE: VerbDefinition[] = [
    // Inventory must come before look since "check" is a synonym for both
    {
        canonical: 'inventory',
        synonyms: ['inventory', 'i', 'items', 'bag', 'pockets'],
        patterns: [
            /^(?:inventory|items|bag|pockets|i)$/i,
            /^(?:check|show|view)\s+(?:my\s+)?(?:inventory|items|bag|pockets)$/i,
        ],
    },
    {
        canonical: 'look',
        synonyms: ['look', 'examine', 'inspect', 'check', 'study', 'read', 'l', 'x'],
        patterns: [
            /^(?:look|l)\s+(?:around|here|room)$/i,
            /^(?:look|examine|inspect|check|study|read|l|x)\s+(?:at\s+)?(.+)$/i,
            /^(?:look|l)$/i,
        ],
    },
    {
        canonical: 'take',
        synonyms: ['take', 'get', 'grab', 'pick', 'collect', 'acquire', 'snag', 'snatch', 'pluck', 'fetch'],
        patterns: [
            /^pick\s+up\s+(.+)$/i,
            /^pick\s+(.+?)\s+up$/i,
            // "pluck/snatch X from Y" → take X (ignore "from Y")
            /^(?:pluck|snatch)\s+(.+?)\s+(?:from|off|out\s+of)\s+.+$/i,
            /^(?:take|get|grab|collect|acquire|snag|snatch|pluck|fetch)\s+(.+)$/i,
            /^(?:take|get|grab|collect|acquire)$/i,
        ],
    },
    {
        canonical: 'use',
        synonyms: ['use', 'apply', 'give', 'show', 'offer', 'hand', 'pour', 'fill', 'set', 'place', 'put', 'drink', 'eat', 'consume', 'light', 'stamp'],
        patterns: [
            // "give/show/offer/hand X to Y" → use X on Y
            /^(?:give|show|offer|hand)\s+(.+?)\s+(?:to)\s+(.+)$/i,
            // "pour/fill X on/into/with/from Y" → use X on Y
            /^(?:pour|fill)\s+(.+?)\s+(?:on|onto|into|with|from|in)\s+(.+)$/i,
            // "set/place/put X on/near/by/in Y" → use X on Y
            /^(?:set|place|put)\s+(.+?)\s+(?:on|near|by|in|at|next\s+to)\s+(.+)$/i,
            // "stamp X with Y" → use X on Y
            /^stamp\s+(.+?)\s+(?:with|on)\s+(.+)$/i,
            // Standard "use/apply X on/with Y"
            /^(?:use|apply)\s+(.+?)\s+(?:on|with)\s+(.+)$/i,
            // Bare verb + subject: "drink bottle", "light torch", "pour brew" etc.
            // Excludes give/show/offer/hand (need a target: "give X to Y")
            /^(?:use|apply|pour|fill|drink|eat|consume|light|place|put)\s+(.+)$/i,
            /^(?:use|apply)$/i,
        ],
    },
    {
        canonical: 'go',
        synonyms: ['go', 'walk', 'move', 'enter', 'exit', 'leave', 'head', 'travel', 'proceed', 'run', 'climb'],
        patterns: [
            // "head/proceed north to the hallway" → go north (extract direction, ignore "to X")
            /^(?:go|walk|move|head|travel|proceed|run)\s+(north|south|east|west|up|down|n|s|e|w)\b/i,
            /^(?:go|walk|move|head|travel|proceed|run)\s+(?:to\s+)?(.+)$/i,
            /^(?:enter|exit|leave|climb)\s+(?:to\s+)?(.+)$/i,
            /^(?:go|walk|move|head|enter|exit|leave|travel|proceed|run|climb)$/i,
        ],
    },
    {
        canonical: 'talk',
        synonyms: ['talk', 'speak', 'say', 'ask', 'chat', 'greet', 'hello'],
        patterns: [
            /^(?:ask)\s+(.+?)\s+(?:about)\s+(.+)$/i,
            /^(?:talk|speak|chat)\s+(?:to|with)\s+(.+)$/i,
            /^(?:talk|speak|chat)\s+(.+)$/i,
            /^(?:ask)\s+(.+)$/i,
            /^(?:say|greet|hello)\s+(.+)$/i,
        ],
    },
    {
        canonical: 'open',
        synonyms: ['open', 'unlock', 'close', 'shut', 'lock'],
        patterns: [
            /^(?:open|unlock)\s+(.+?)\s+(?:with)\s+(.+)$/i,
            /^(?:open|unlock|close|shut|lock)\s+(.+)$/i,
        ],
    },
    {
        canonical: 'push',
        synonyms: ['push', 'press', 'shove'],
        patterns: [
            /^(?:push|press|shove)\s+(.+)$/i,
        ],
    },
    {
        canonical: 'pull',
        synonyms: ['pull', 'yank', 'tug', 'drag'],
        patterns: [
            /^(?:pull|yank|tug|drag)\s+(.+)$/i,
        ],
    },

    // Phase 4 verbs: save/load, item combination
    {
        canonical: 'combine',
        synonyms: ['combine', 'merge', 'mix', 'attach', 'connect', 'join'],
        patterns: [
            /^(?:combine|merge|mix|attach|connect|join)\s+(.+?)\s+(?:and|with|to|together\s+with)\s+(.+)$/i,
            /^(?:combine|merge|mix|attach|connect|join)\s+(\S+)\s+(\S+)$/i,
        ],
    },
    {
        canonical: 'hint',
        synonyms: ['hint', 'help', 'stuck', 'clue'],
        patterns: [
            /^(?:hint|help|stuck|clue)$/i,
            /^(?:give\s+me\s+a\s+)?(?:hint|help|clue)$/i,
            /^(?:i'?m?\s+)?stuck$/i,
            /^what\s+(?:do\s+i\s+do|should\s+i\s+do|now)$/i,
        ],
    },
    {
        canonical: 'save',
        synonyms: ['save', 'savegame'],
        patterns: [
            /^save\s+(?:game\s+)?(\d+)$/i,
            /^save(?:\s+game)?$/i,
        ],
    },
    {
        canonical: 'load',
        synonyms: ['load', 'restore', 'loadgame'],
        patterns: [
            /^(?:load|restore)\s+(?:game\s+)?(\d+)$/i,
            /^(?:load|restore)(?:\s+game)?$/i,
        ],
    },
];

/**
 * Direction shortcut map. Single letters and full words that represent
 * compass directions. These are handled as implicit "go" commands.
 */
export const DIRECTION_SHORTCUTS: Record<string, string> = {
    'north': 'north', 'n': 'north',
    'south': 'south', 's': 'south',
    'east': 'east', 'e': 'east',
    'west': 'west', 'w': 'west',
    'up': 'up', 'u': 'up',
    'down': 'down', 'd': 'down',
};
