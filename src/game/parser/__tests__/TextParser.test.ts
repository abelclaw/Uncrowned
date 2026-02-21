import { describe, it, expect, beforeEach } from 'vitest';
import { TextParser } from '../TextParser.ts';
import type { HotspotData, ExitData } from '../../types/RoomData.ts';
import type { ParseResult } from '../../types/GameAction.ts';

// Test fixtures: a room with hotspots and exits for noun resolution
const hotspots: HotspotData[] = [
    {
        id: 'old-stump',
        name: 'Old Tree Stump',
        zone: { x: 100, y: 100, width: 50, height: 50 },
        interactionPoint: { x: 125, y: 125 },
        responses: { look: 'A gnarled old tree stump.' },
    },
    {
        id: 'cave-mouth',
        name: 'Dark Cave Mouth',
        zone: { x: 200, y: 100, width: 60, height: 80 },
        interactionPoint: { x: 230, y: 140 },
    },
    {
        id: 'well',
        name: 'Stone Well',
        zone: { x: 300, y: 100, width: 40, height: 40 },
        interactionPoint: { x: 320, y: 120 },
    },
    {
        id: 'chest',
        name: 'Wooden Chest',
        zone: { x: 400, y: 100, width: 50, height: 40 },
        interactionPoint: { x: 425, y: 120 },
    },
    {
        id: 'lever',
        name: 'Rusty Lever',
        zone: { x: 500, y: 100, width: 30, height: 60 },
        interactionPoint: { x: 515, y: 130 },
    },
    {
        id: 'button',
        name: 'Stone Button',
        zone: { x: 550, y: 100, width: 20, height: 20 },
        interactionPoint: { x: 560, y: 110 },
    },
    {
        id: 'door',
        name: 'Oak Door',
        zone: { x: 600, y: 100, width: 40, height: 80 },
        interactionPoint: { x: 620, y: 140 },
    },
    {
        id: 'wizard',
        name: 'Old Wizard',
        zone: { x: 700, y: 100, width: 40, height: 60 },
        interactionPoint: { x: 720, y: 130 },
    },
];

const exits: ExitData[] = [
    {
        id: 'to-cave',
        zone: { x: 0, y: 350, width: 80, height: 200 },
        targetRoom: 'cave_entrance',
        spawnPoint: { x: 820, y: 430 },
        transition: 'slide-left',
        direction: 'west',
        label: 'cave',
    },
    {
        id: 'to-village',
        zone: { x: 880, y: 350, width: 80, height: 200 },
        targetRoom: 'village_path',
        spawnPoint: { x: 100, y: 430 },
        transition: 'slide-right',
        direction: 'east',
        label: 'village',
    },
];

let parser: TextParser;

beforeEach(() => {
    parser = new TextParser();
});

// Helper to assert successful parse
function expectAction(result: ParseResult, verb: string, subject: string | null, target: string | null): void {
    expect(result.success).toBe(true);
    expect(result.action).toBeDefined();
    expect(result.action!.verb).toBe(verb);
    expect(result.action!.subject).toBe(subject);
    expect(result.action!.target).toBe(target);
}

// Helper to assert failed parse
function expectFailure(result: ParseResult): void {
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.error!.length).toBeGreaterThan(0);
}

describe('TextParser', () => {
    describe('Bare verbs', () => {
        it('parses "look" as bare look command', () => {
            const result = parser.parse('look', hotspots, exits);
            expectAction(result, 'look', null, null);
        });

        it('parses "l" as look shortcut', () => {
            const result = parser.parse('l', hotspots, exits);
            expectAction(result, 'look', null, null);
        });
    });

    describe('Verb + noun (look/examine)', () => {
        it('parses "look at stump" and resolves to hotspot id', () => {
            const result = parser.parse('look at stump', hotspots, exits);
            expectAction(result, 'look', 'old-stump', null);
        });

        it('parses "examine old tree stump" and resolves to hotspot id', () => {
            const result = parser.parse('examine old tree stump', hotspots, exits);
            expectAction(result, 'look', 'old-stump', null);
        });

        it('parses "x stump" shortcut and resolves to hotspot id', () => {
            const result = parser.parse('x stump', hotspots, exits);
            expectAction(result, 'look', 'old-stump', null);
        });

        it('returns unknown subject for unresolved noun', () => {
            const result = parser.parse('take mushroom', hotspots, exits);
            expect(result.success).toBe(true);
            expect(result.action!.verb).toBe('take');
            // Unresolved noun should use raw string as subject
            expect(result.action!.subject).toBe('mushroom');
        });
    });

    describe('Two-noun commands', () => {
        it('parses "use key on door" with subject and target', () => {
            const result = parser.parse('use key on door', hotspots, exits);
            expect(result.success).toBe(true);
            expect(result.action!.verb).toBe('use');
            // key is not a hotspot, so raw string. door resolves to hotspot.
            expect(result.action!.subject).toBe('key');
            expect(result.action!.target).toBe('door');
        });

        it('parses "combine rope and hook" with subject and target', () => {
            const result = parser.parse('combine rope and hook', hotspots, exits);
            expect(result.success).toBe(true);
            expect(result.action!.verb).toBe('combine');
            expect(result.action!.subject).toBe('rope');
            expect(result.action!.target).toBe('hook');
        });
    });

    describe('Go/direction commands', () => {
        it('parses "go east" as direction', () => {
            const result = parser.parse('go east', hotspots, exits);
            expectAction(result, 'go', 'east', null);
        });

        it('parses "go cave" and resolves to exit', () => {
            const result = parser.parse('go cave', hotspots, exits);
            expect(result.success).toBe(true);
            expect(result.action!.verb).toBe('go');
            expect(result.action!.subject).toBe('to-cave');
        });

        it('parses bare "north" as go north', () => {
            const result = parser.parse('north', hotspots, exits);
            expectAction(result, 'go', 'north', null);
        });

        it('parses "n" as go north shortcut', () => {
            const result = parser.parse('n', hotspots, exits);
            expectAction(result, 'go', 'north', null);
        });

        it('parses "s" as go south', () => {
            const result = parser.parse('s', hotspots, exits);
            expectAction(result, 'go', 'south', null);
        });

        it('parses "e" as go east', () => {
            const result = parser.parse('e', hotspots, exits);
            expectAction(result, 'go', 'east', null);
        });

        it('parses "w" as go west', () => {
            const result = parser.parse('w', hotspots, exits);
            expectAction(result, 'go', 'west', null);
        });

        it('parses "enter cave" as go to cave exit', () => {
            const result = parser.parse('enter cave', hotspots, exits);
            expect(result.success).toBe(true);
            expect(result.action!.verb).toBe('go');
            expect(result.action!.subject).toBe('to-cave');
        });
    });

    describe('Article stripping', () => {
        it('strips "the" before noun resolution', () => {
            const result = parser.parse('look at the old stump', hotspots, exits);
            expectAction(result, 'look', 'old-stump', null);
        });

        it('strips "a" before noun resolution', () => {
            const result = parser.parse('take a mushroom', hotspots, exits);
            expect(result.success).toBe(true);
            expect(result.action!.verb).toBe('take');
            expect(result.action!.subject).toBe('mushroom');
        });

        it('strips "an" before noun resolution', () => {
            const result = parser.parse('take an apple', hotspots, exits);
            expect(result.success).toBe(true);
            expect(result.action!.verb).toBe('take');
            expect(result.action!.subject).toBe('apple');
        });

        it('strips "this" and "that" before noun resolution', () => {
            const result = parser.parse('look at this stump', hotspots, exits);
            expectAction(result, 'look', 'old-stump', null);

            const result2 = parser.parse('look at that stump', hotspots, exits);
            expectAction(result2, 'look', 'old-stump', null);
        });
    });

    describe('Unrecognized commands', () => {
        it('returns failure for "xyzzy"', () => {
            const result = parser.parse('xyzzy', hotspots, exits);
            expectFailure(result);
        });

        it('returns failure for empty string', () => {
            const result = parser.parse('', hotspots, exits);
            expectFailure(result);
        });

        it('returns failure for whitespace-only input', () => {
            const result = parser.parse('   ', hotspots, exits);
            expectFailure(result);
        });
    });

    describe('Talk commands', () => {
        it('parses "talk to wizard"', () => {
            const result = parser.parse('talk to wizard', hotspots, exits);
            expectAction(result, 'talk', 'wizard', null);
        });

        it('parses "ask wizard about sword"', () => {
            const result = parser.parse('ask wizard about sword', hotspots, exits);
            expect(result.success).toBe(true);
            expect(result.action!.verb).toBe('talk');
            expect(result.action!.subject).toBe('wizard');
            expect(result.action!.target).toBe('sword');
        });
    });

    describe('Open/push/pull commands', () => {
        it('parses "open chest"', () => {
            const result = parser.parse('open chest', hotspots, exits);
            expectAction(result, 'open', 'chest', null);
        });

        it('parses "open door with key"', () => {
            const result = parser.parse('open door with key', hotspots, exits);
            expect(result.success).toBe(true);
            expect(result.action!.verb).toBe('open');
            expect(result.action!.subject).toBe('door');
            expect(result.action!.target).toBe('key');
        });

        it('parses "push button"', () => {
            const result = parser.parse('push button', hotspots, exits);
            expectAction(result, 'push', 'button', null);
        });

        it('parses "pull lever"', () => {
            const result = parser.parse('pull lever', hotspots, exits);
            expectAction(result, 'pull', 'lever', null);
        });
    });

    describe('Verb synonyms', () => {
        it('maps "examine" to "look"', () => {
            const result = parser.parse('examine well', hotspots, exits);
            expectAction(result, 'look', 'well', null);
        });

        it('maps "inspect" to "look"', () => {
            const result = parser.parse('inspect well', hotspots, exits);
            expectAction(result, 'look', 'well', null);
        });

        it('maps "grab" to "take"', () => {
            const result = parser.parse('grab mushroom', hotspots, exits);
            expect(result.success).toBe(true);
            expect(result.action!.verb).toBe('take');
        });

        it('maps "get" to "take"', () => {
            const result = parser.parse('get mushroom', hotspots, exits);
            expect(result.success).toBe(true);
            expect(result.action!.verb).toBe('take');
        });

        it('maps "walk" to "go"', () => {
            const result = parser.parse('walk east', hotspots, exits);
            expectAction(result, 'go', 'east', null);
        });

        it('maps "speak to" to "talk"', () => {
            const result = parser.parse('speak to wizard', hotspots, exits);
            expectAction(result, 'talk', 'wizard', null);
        });

        it('maps "unlock" to "open"', () => {
            const result = parser.parse('unlock chest', hotspots, exits);
            expectAction(result, 'open', 'chest', null);
        });

        it('maps "press" to "push"', () => {
            const result = parser.parse('press button', hotspots, exits);
            expectAction(result, 'push', 'button', null);
        });

        it('maps "yank" to "pull"', () => {
            const result = parser.parse('yank lever', hotspots, exits);
            expectAction(result, 'pull', 'lever', null);
        });

        it('maps "pick up" to "take"', () => {
            const result = parser.parse('pick up mushroom', hotspots, exits);
            expect(result.success).toBe(true);
            expect(result.action!.verb).toBe('take');
        });
    });

    describe('rawInput preservation', () => {
        it('preserves the original input string', () => {
            const result = parser.parse('look at the old stump', hotspots, exits);
            expect(result.action!.rawInput).toBe('look at the old stump');
        });
    });

    describe('Case insensitivity', () => {
        it('handles uppercase input', () => {
            const result = parser.parse('LOOK AT STUMP', hotspots, exits);
            expectAction(result, 'look', 'old-stump', null);
        });

        it('handles mixed case input', () => {
            const result = parser.parse('Go East', hotspots, exits);
            expectAction(result, 'go', 'east', null);
        });
    });

    describe('All 8 verbs recognized', () => {
        it('recognizes look', () => {
            const r = parser.parse('look', hotspots, exits);
            expect(r.success).toBe(true);
            expect(r.action!.verb).toBe('look');
        });

        it('recognizes take', () => {
            const r = parser.parse('take mushroom', hotspots, exits);
            expect(r.success).toBe(true);
            expect(r.action!.verb).toBe('take');
        });

        it('recognizes use', () => {
            const r = parser.parse('use key', hotspots, exits);
            expect(r.success).toBe(true);
            expect(r.action!.verb).toBe('use');
        });

        it('recognizes go', () => {
            const r = parser.parse('go north', hotspots, exits);
            expect(r.success).toBe(true);
            expect(r.action!.verb).toBe('go');
        });

        it('recognizes talk', () => {
            const r = parser.parse('talk to wizard', hotspots, exits);
            expect(r.success).toBe(true);
            expect(r.action!.verb).toBe('talk');
        });

        it('recognizes open', () => {
            const r = parser.parse('open chest', hotspots, exits);
            expect(r.success).toBe(true);
            expect(r.action!.verb).toBe('open');
        });

        it('recognizes push', () => {
            const r = parser.parse('push button', hotspots, exits);
            expect(r.success).toBe(true);
            expect(r.action!.verb).toBe('push');
        });

        it('recognizes pull', () => {
            const r = parser.parse('pull lever', hotspots, exits);
            expect(r.success).toBe(true);
            expect(r.action!.verb).toBe('pull');
        });
    });
});
