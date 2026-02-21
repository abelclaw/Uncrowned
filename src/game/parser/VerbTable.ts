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
    {
        canonical: 'look',
        synonyms: ['look', 'examine', 'inspect', 'check', 'study', 'read', 'l', 'x'],
        patterns: [
            /^(?:look|examine|inspect|check|study|read|l|x)\s+(?:at\s+)?(.+)$/i,
            /^(?:look|l)$/i,
        ],
    },
    {
        canonical: 'take',
        synonyms: ['take', 'get', 'grab', 'pick', 'collect', 'acquire'],
        patterns: [
            /^pick\s+up\s+(.+)$/i,
            /^pick\s+(.+?)\s+up$/i,
            /^(?:take|get|grab|collect|acquire)\s+(.+)$/i,
        ],
    },
    {
        canonical: 'use',
        synonyms: ['use', 'apply', 'combine'],
        patterns: [
            /^(?:use|apply)\s+(.+?)\s+(?:on|with)\s+(.+)$/i,
            /^combine\s+(.+?)\s+(?:and|with)\s+(.+)$/i,
            /^(?:use|apply)\s+(.+)$/i,
        ],
    },
    {
        canonical: 'go',
        synonyms: ['go', 'walk', 'move', 'enter', 'exit', 'leave', 'head'],
        patterns: [
            /^(?:go|walk|move|head)\s+(?:to\s+)?(.+)$/i,
            /^(?:enter|exit|leave)\s+(.+)$/i,
            /^(?:enter|exit|leave)$/i,
        ],
    },
    {
        canonical: 'talk',
        synonyms: ['talk', 'speak', 'say', 'ask', 'chat', 'greet', 'hello'],
        patterns: [
            /^(?:ask)\s+(.+?)\s+(?:about)\s+(.+)$/i,
            /^(?:talk|speak|chat)\s+(?:to|with)\s+(.+)$/i,
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
