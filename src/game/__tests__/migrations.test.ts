import { describe, it, expect } from 'vitest';

// These imports will fail until GREEN phase implementation
import { migrate } from '../state/migrations/index.ts';
import { migrateV1toV2 } from '../state/migrations/v1-to-v2.ts';
import { CURRENT_SAVE_VERSION } from '../state/GameStateTypes.ts';

describe('Migration chain', () => {
    describe('migrate()', () => {
        it('migrates v1 save (no version field) to current version with all fields preserved', () => {
            const v1Save = {
                currentRoom: 'cave_entrance',
                inventory: ['key', 'torch'],
                flags: { 'door-open': true },
                visitedRooms: ['forest_clearing', 'cave_entrance'],
                removedItems: { forest_clearing: ['key'] },
                playTimeMs: 12345,
                deathCount: 3,
                dialogueStates: { npc1: '{"state":"done"}' },
            };

            const migrated = migrate(v1Save);

            expect(migrated.version).toBe(CURRENT_SAVE_VERSION);
            expect(migrated.currentRoom).toBe('cave_entrance');
            expect(migrated.inventory).toEqual(['key', 'torch']);
            expect(migrated.flags).toEqual({ 'door-open': true });
            expect(migrated.visitedRooms).toEqual(['forest_clearing', 'cave_entrance']);
            expect(migrated.removedItems).toEqual({ forest_clearing: ['key'] });
            expect(migrated.playTimeMs).toBe(12345);
            expect(migrated.deathCount).toBe(3);
            expect(migrated.dialogueStates).toEqual({ npc1: '{"state":"done"}' });
        });

        it('fills defaults for missing optional fields in v1 save', () => {
            const v1Save = {
                currentRoom: 'forest_clearing',
            };

            const migrated = migrate(v1Save);

            expect(migrated.version).toBe(CURRENT_SAVE_VERSION);
            expect(migrated.currentRoom).toBe('forest_clearing');
            expect(migrated.inventory).toEqual([]);
            expect(migrated.flags).toEqual({});
            expect(migrated.visitedRooms).toEqual([]);
            expect(migrated.removedItems).toEqual({});
            expect(migrated.playTimeMs).toBe(0);
            expect(migrated.deathCount).toBe(0);
            expect(migrated.dialogueStates).toEqual({});
        });

        it('returns v2 save unchanged (no-op)', () => {
            const v2Save = {
                version: 2,
                currentRoom: 'cave_entrance',
                inventory: ['key'],
                flags: { 'door-open': true },
                visitedRooms: ['forest_clearing'],
                removedItems: {},
                playTimeMs: 5000,
                deathCount: 1,
                dialogueStates: {},
            };

            const migrated = migrate(v2Save);

            expect(migrated).toEqual(v2Save);
        });

        it('throws on unknown future version', () => {
            const futureSave = {
                version: 99,
                currentRoom: 'forest_clearing',
            };

            expect(() => migrate(futureSave)).toThrow('Save from newer version');
        });
    });

    describe('migrateV1toV2()', () => {
        it('adds version: 2 and preserves all existing fields', () => {
            const v1Data: Record<string, unknown> = {
                currentRoom: 'cave_entrance',
                inventory: ['key', 'torch'],
                flags: { 'door-open': true, 'npc-talked': 'yes' },
                visitedRooms: ['forest_clearing', 'cave_entrance'],
                removedItems: { forest_clearing: ['key'] },
                playTimeMs: 99999,
                deathCount: 7,
                dialogueStates: { guard: '{"knots":["start"]}' },
            };

            const result = migrateV1toV2(v1Data);

            expect(result.version).toBe(2);
            expect(result.currentRoom).toBe('cave_entrance');
            expect(result.inventory).toEqual(['key', 'torch']);
            expect(result.flags).toEqual({ 'door-open': true, 'npc-talked': 'yes' });
            expect(result.visitedRooms).toEqual(['forest_clearing', 'cave_entrance']);
            expect(result.removedItems).toEqual({ forest_clearing: ['key'] });
            expect(result.playTimeMs).toBe(99999);
            expect(result.deathCount).toBe(7);
            expect(result.dialogueStates).toEqual({ guard: '{"knots":["start"]}' });
        });

        it('fills defaults for missing fields', () => {
            const v1Data: Record<string, unknown> = {};

            const result = migrateV1toV2(v1Data);

            expect(result.version).toBe(2);
            expect(result.currentRoom).toBe('forest_clearing');
            expect(result.inventory).toEqual([]);
            expect(result.flags).toEqual({});
            expect(result.visitedRooms).toEqual([]);
            expect(result.removedItems).toEqual({});
            expect(result.playTimeMs).toBe(0);
            expect(result.deathCount).toBe(0);
            expect(result.dialogueStates).toEqual({});
        });
    });
});
