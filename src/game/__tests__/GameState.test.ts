import { describe, it, expect, beforeEach } from 'vitest';
import { GameState } from '../state/GameState.ts';
import { CURRENT_SAVE_VERSION } from '../state/GameStateTypes.ts';

describe('GameState', () => {
    let state: GameState;

    beforeEach(() => {
        state = GameState.getInstance();
        state.reset();
    });

    describe('Singleton', () => {
        it('getInstance() returns the same instance', () => {
            const a = GameState.getInstance();
            const b = GameState.getInstance();
            expect(a).toBe(b);
        });
    });

    describe('reset()', () => {
        it('returns state to defaults', () => {
            state.addItem('key');
            state.setFlag('door-open', true);
            state.markRoomVisited('cave');

            state.reset();

            const data = state.getData();
            expect(data.currentRoom).toBe('forest_clearing');
            expect(data.inventory).toEqual([]);
            expect(data.flags).toEqual({});
            expect(data.visitedRooms).toEqual([]);
            expect(data.removedItems).toEqual({});
            expect(data.playTimeMs).toBe(0);
            expect(data.deathCount).toBe(0);
        });
    });

    describe('Inventory', () => {
        it('addItem then hasItem returns true', () => {
            state.addItem('key');
            expect(state.hasItem('key')).toBe(true);
        });

        it('removeItem then hasItem returns false', () => {
            state.addItem('key');
            state.removeItem('key');
            expect(state.hasItem('key')).toBe(false);
        });

        it('addItem is idempotent (no duplicates)', () => {
            state.addItem('key');
            state.addItem('key');
            expect(state.getData().inventory).toEqual(['key']);
        });

        it('hasItem returns false for items not in inventory', () => {
            expect(state.hasItem('sword')).toBe(false);
        });
    });

    describe('Flags', () => {
        it('setFlag(true) then isFlagSet returns true', () => {
            state.setFlag('door-open', true);
            expect(state.isFlagSet('door-open')).toBe(true);
        });

        it('setFlag(false) then isFlagSet returns false', () => {
            state.setFlag('door-open', true);
            state.setFlag('door-open', false);
            expect(state.isFlagSet('door-open')).toBe(false);
        });

        it('getFlag returns the flag value', () => {
            state.setFlag('npc-mood', 'angry');
            expect(state.getFlag('npc-mood')).toBe('angry');
        });

        it('getFlag returns undefined for unset flags', () => {
            expect(state.getFlag('nonexistent')).toBeUndefined();
        });
    });

    describe('Room tracking', () => {
        it('markRoomVisited adds to visitedRooms', () => {
            state.markRoomVisited('cave');
            expect(state.getData().visitedRooms).toContain('cave');
        });

        it('markRoomVisited is idempotent (no duplicates)', () => {
            state.markRoomVisited('cave');
            state.markRoomVisited('cave');
            expect(state.getData().visitedRooms).toEqual(['cave']);
        });
    });

    describe('Removed items', () => {
        it('markRoomItemRemoved then isRoomItemRemoved returns true', () => {
            state.markRoomItemRemoved('forest', 'key');
            expect(state.isRoomItemRemoved('forest', 'key')).toBe(true);
        });

        it('isRoomItemRemoved returns false for items not removed', () => {
            expect(state.isRoomItemRemoved('forest', 'key')).toBe(false);
        });
    });

    describe('Serialization', () => {
        it('serialize returns valid JSON string', () => {
            state.addItem('key');
            state.setFlag('door-open', true);

            const json = state.serialize();
            expect(() => JSON.parse(json)).not.toThrow();

            const parsed = JSON.parse(json);
            expect(parsed.inventory).toContain('key');
            expect(parsed.flags['door-open']).toBe(true);
        });

        it('deserialize restores state from JSON', () => {
            state.addItem('key');
            state.setFlag('door-open', true);
            state.markRoomVisited('cave');

            const json = state.serialize();

            state.reset();
            expect(state.hasItem('key')).toBe(false);

            state.deserialize(json);
            expect(state.hasItem('key')).toBe(true);
            expect(state.isFlagSet('door-open')).toBe(true);
            expect(state.getData().visitedRooms).toContain('cave');
        });
    });

    describe('getData()', () => {
        it('returns readonly snapshot of state', () => {
            state.addItem('key');
            const data = state.getData();
            expect(data.inventory).toContain('key');
            expect(data.currentRoom).toBe('forest_clearing');
        });

        it('getData().version equals CURRENT_SAVE_VERSION', () => {
            expect(state.getData().version).toBe(CURRENT_SAVE_VERSION);
        });
    });

    describe('Version-aware serialization', () => {
        it('serialize() output includes version: 2', () => {
            const json = state.serialize();
            const parsed = JSON.parse(json);
            expect(parsed.version).toBe(2);
        });

        it('deserialize() on v1 JSON (no version field) succeeds and state has version: 2', () => {
            const v1Json = JSON.stringify({
                currentRoom: 'cave_entrance',
                inventory: ['key'],
                flags: { 'door-open': true },
                visitedRooms: ['forest_clearing'],
                removedItems: {},
                playTimeMs: 1000,
                deathCount: 1,
                dialogueStates: {},
            });

            state.deserialize(v1Json);

            expect(state.getData().version).toBe(2);
            expect(state.getData().currentRoom).toBe('cave_entrance');
            expect(state.hasItem('key')).toBe(true);
        });

        it('deserialize() on v2 JSON works normally', () => {
            const v2Json = JSON.stringify({
                version: 2,
                currentRoom: 'cave_entrance',
                inventory: ['sword'],
                flags: {},
                visitedRooms: [],
                removedItems: {},
                playTimeMs: 0,
                deathCount: 0,
                dialogueStates: {},
            });

            state.deserialize(v2Json);

            expect(state.getData().version).toBe(2);
            expect(state.hasItem('sword')).toBe(true);
        });

        it('reset() produces state with version: 2', () => {
            state.addItem('key');
            state.reset();
            expect(state.getData().version).toBe(CURRENT_SAVE_VERSION);
        });
    });
});
