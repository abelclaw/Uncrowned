import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock EventBus before importing PuzzleEngine (which imports EventBus internally)
vi.mock('../EventBus.ts', () => ({
    default: { emit: vi.fn() },
}));

import { GameState } from '../state/GameState.ts';
import { PuzzleEngine } from '../systems/PuzzleEngine.ts';
import type { PuzzleCondition, PuzzleAction, PuzzleDefinition } from '../types/PuzzleData.ts';
import EventBus from '../EventBus.ts';

describe('PuzzleEngine', () => {
    let engine: PuzzleEngine;
    let state: GameState;

    beforeEach(() => {
        state = GameState.getInstance();
        state.reset();
        engine = new PuzzleEngine();
    });

    describe('evaluateConditions', () => {
        it('has-item returns false when inventory is empty', () => {
            const conditions: PuzzleCondition[] = [{ type: 'has-item', item: 'key' }];
            expect(engine.evaluateConditions(conditions)).toBe(false);
        });

        it('has-item returns true after adding item to GameState', () => {
            state.addItem('key');
            const conditions: PuzzleCondition[] = [{ type: 'has-item', item: 'key' }];
            expect(engine.evaluateConditions(conditions)).toBe(true);
        });

        it('multiple conditions returns true only when ALL pass', () => {
            state.addItem('key');
            // flag not set yet
            const conditions: PuzzleCondition[] = [
                { type: 'has-item', item: 'key' },
                { type: 'flag-set', flag: 'door-open' },
            ];
            expect(engine.evaluateConditions(conditions)).toBe(false);

            state.setFlag('door-open', true);
            expect(engine.evaluateConditions(conditions)).toBe(true);
        });

        it('flag-set checks GameState flags', () => {
            state.setFlag('puzzle-complete', true);
            const conditions: PuzzleCondition[] = [{ type: 'flag-set', flag: 'puzzle-complete' }];
            expect(engine.evaluateConditions(conditions)).toBe(true);
        });

        it('flag-not-set returns true when flag is not set', () => {
            const conditions: PuzzleCondition[] = [{ type: 'flag-not-set', flag: 'some-flag' }];
            expect(engine.evaluateConditions(conditions)).toBe(true);
        });

        it('not-has-item returns true when item not in inventory', () => {
            const conditions: PuzzleCondition[] = [{ type: 'not-has-item', item: 'sword' }];
            expect(engine.evaluateConditions(conditions)).toBe(true);
        });

        it('not-has-item returns false when item IS in inventory', () => {
            state.addItem('sword');
            const conditions: PuzzleCondition[] = [{ type: 'not-has-item', item: 'sword' }];
            expect(engine.evaluateConditions(conditions)).toBe(false);
        });

        it('item-not-taken checks removedItems in GameState', () => {
            // item-not-taken checks that a room item has NOT been picked up
            const conditions: PuzzleCondition[] = [{ type: 'item-not-taken', item: 'rusty-key' }];
            expect(engine.evaluateConditions(conditions)).toBe(true);

            state.markRoomItemRemoved(state.getData().currentRoom, 'rusty-key');
            expect(engine.evaluateConditions(conditions)).toBe(false);
        });

        it('in-room checks current room', () => {
            const conditions: PuzzleCondition[] = [{ type: 'in-room', room: 'forest_clearing' }];
            expect(engine.evaluateConditions(conditions)).toBe(true);

            const conditions2: PuzzleCondition[] = [{ type: 'in-room', room: 'cave' }];
            expect(engine.evaluateConditions(conditions2)).toBe(false);
        });

        it('empty conditions array returns true', () => {
            expect(engine.evaluateConditions([])).toBe(true);
        });
    });

    describe('executeActions', () => {
        it('add-item adds item to GameState inventory', () => {
            const actions: PuzzleAction[] = [{ type: 'add-item', item: 'sword' }];
            engine.executeActions(actions);
            expect(state.hasItem('sword')).toBe(true);
        });

        it('remove-item removes item from GameState inventory', () => {
            state.addItem('key');
            const actions: PuzzleAction[] = [{ type: 'remove-item', item: 'key' }];
            engine.executeActions(actions);
            expect(state.hasItem('key')).toBe(false);
        });

        it('set-flag sets flag in GameState', () => {
            const actions: PuzzleAction[] = [{ type: 'set-flag', flag: 'door-open' }];
            engine.executeActions(actions);
            expect(state.isFlagSet('door-open')).toBe(true);
        });

        it('remove-flag clears flag in GameState', () => {
            state.setFlag('door-open', true);
            const actions: PuzzleAction[] = [{ type: 'remove-flag', flag: 'door-open' }];
            engine.executeActions(actions);
            expect(state.isFlagSet('door-open')).toBe(false);
        });

        it('narrator-say returns the text string', () => {
            const actions: PuzzleAction[] = [
                { type: 'narrator-say', text: 'You found a hidden passage.' },
            ];
            const result = engine.executeActions(actions);
            expect(result).toBe('You found a hidden passage.');
        });

        it('show-message returns the text string', () => {
            const actions: PuzzleAction[] = [
                { type: 'show-message', text: 'The door creaks open.' },
            ];
            const result = engine.executeActions(actions);
            expect(result).toBe('The door creaks open.');
        });

        it('trigger-death emits EventBus event', () => {
            const spy = vi.spyOn(EventBus, 'emit');
            const actions: PuzzleAction[] = [
                { type: 'trigger-death', deathId: 'poison-death' },
            ];
            engine.executeActions(actions);
            expect(spy).toHaveBeenCalledWith('trigger-death', 'poison-death');
            spy.mockRestore();
        });

        it('remove-hotspot emits room-update event', () => {
            const spy = vi.spyOn(EventBus, 'emit');
            const action: PuzzleAction = { type: 'remove-hotspot', hotspot: 'old-sign' };
            engine.executeActions([action]);
            expect(spy).toHaveBeenCalledWith('room-update', action);
            spy.mockRestore();
        });

        it('open-exit emits room-update event', () => {
            const spy = vi.spyOn(EventBus, 'emit');
            const action: PuzzleAction = { type: 'open-exit', exit: 'to-dungeon' };
            engine.executeActions([action]);
            expect(spy).toHaveBeenCalledWith('room-update', action);
            spy.mockRestore();
        });

        it('multiple actions execute in order and concatenate messages', () => {
            const actions: PuzzleAction[] = [
                { type: 'add-item', item: 'sword' },
                { type: 'set-flag', flag: 'armed' },
                { type: 'narrator-say', text: 'You draw the sword.' },
                { type: 'show-message', text: 'It gleams brightly.' },
            ];
            const result = engine.executeActions(actions);
            expect(state.hasItem('sword')).toBe(true);
            expect(state.isFlagSet('armed')).toBe(true);
            expect(result).toBe('You draw the sword. It gleams brightly.');
        });
    });

    describe('tryPuzzle', () => {
        const puzzles: PuzzleDefinition[] = [
            {
                id: 'take-key',
                trigger: { verb: 'take', subject: 'key' },
                conditions: [{ type: 'item-not-taken', item: 'key' }],
                actions: [
                    { type: 'add-item', item: 'key' },
                    { type: 'narrator-say', text: 'You pocket the key.' },
                ],
                once: true,
            },
            {
                id: 'use-key-on-door',
                trigger: { verb: 'use', subject: 'key', target: 'door' },
                conditions: [
                    { type: 'has-item', item: 'key' },
                    { type: 'flag-not-set', flag: 'door-unlocked' },
                ],
                actions: [
                    { type: 'set-flag', flag: 'door-unlocked' },
                    { type: 'remove-item', item: 'key' },
                    { type: 'narrator-say', text: 'The door swings open.' },
                ],
                once: true,
            },
        ];

        it('matches trigger and executes when conditions pass', () => {
            const result = engine.tryPuzzle('take', 'key', null, puzzles);
            expect(result).not.toBeNull();
            expect(result!.matched).toBe(true);
            expect(result!.response).toBe('You pocket the key.');
            expect(state.hasItem('key')).toBe(true);
        });

        it('returns null when no puzzle matches', () => {
            const result = engine.tryPuzzle('take', 'sword', null, puzzles);
            expect(result).toBeNull();
        });

        it('returns null when trigger matches but conditions fail', () => {
            // use key on door requires has-item 'key', but inventory is empty
            const result = engine.tryPuzzle('use', 'key', 'door', puzzles);
            expect(result).toBeNull();
        });

        it('once:true marks puzzle solved, second call returns null', () => {
            // First call succeeds
            const result1 = engine.tryPuzzle('take', 'key', null, puzzles);
            expect(result1).not.toBeNull();
            expect(result1!.matched).toBe(true);

            // Puzzle is now marked solved
            expect(state.isFlagSet('puzzle-solved:take-key')).toBe(true);

            // Second call returns null (puzzle already solved)
            const result2 = engine.tryPuzzle('take', 'key', null, puzzles);
            expect(result2).toBeNull();
        });

        it('two-noun puzzle matches verb+subject+target', () => {
            state.addItem('key');
            const result = engine.tryPuzzle('use', 'key', 'door', puzzles);
            expect(result).not.toBeNull();
            expect(result!.response).toBe('The door swings open.');
            expect(state.isFlagSet('door-unlocked')).toBe(true);
            expect(state.hasItem('key')).toBe(false);
        });
    });
});
