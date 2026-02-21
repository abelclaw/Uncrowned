import { describe, it, expect, beforeEach } from 'vitest';
import { GameState } from '../state/GameState.ts';
import { HintSystem } from '../systems/HintSystem.ts';
import type { RoomData } from '../types/RoomData.ts';

describe('HintSystem', () => {
    let hintSystem: HintSystem;
    let state: GameState;

    const mockRoom = {
        id: 'test-room',
        puzzleHints: [
            {
                puzzleId: 'test-puzzle',
                tiers: ['Vague hint.', 'Medium hint.', 'Explicit hint.'] as [string, string, string],
            },
        ],
    } as RoomData;

    const mockRoomTwoPuzzles = {
        id: 'test-room-2',
        puzzleHints: [
            {
                puzzleId: 'puzzle-a',
                tiers: ['A vague.', 'A medium.', 'A explicit.'] as [string, string, string],
            },
            {
                puzzleId: 'puzzle-b',
                tiers: ['B vague.', 'B medium.', 'B explicit.'] as [string, string, string],
            },
        ],
    } as RoomData;

    beforeEach(() => {
        state = GameState.getInstance();
        state.reset();
        hintSystem = new HintSystem();
    });

    describe('getHint()', () => {
        it('returns tier 0 hint on first request', () => {
            const hint = hintSystem.getHint(mockRoom);
            expect(hint).toBe('Vague hint.');
        });

        it('returns tier 1 hint on second request (same puzzle)', () => {
            hintSystem.getHint(mockRoom); // tier 0
            const hint = hintSystem.getHint(mockRoom);
            expect(hint).toBe('Medium hint.');
        });

        it('returns tier 2 hint on third request (caps at tier 2)', () => {
            hintSystem.getHint(mockRoom); // tier 0
            hintSystem.getHint(mockRoom); // tier 1
            const hint = hintSystem.getHint(mockRoom);
            expect(hint).toBe('Explicit hint.');
        });

        it('stays at tier 2 on fourth request (does not exceed max)', () => {
            hintSystem.getHint(mockRoom); // tier 0
            hintSystem.getHint(mockRoom); // tier 1
            hintSystem.getHint(mockRoom); // tier 2
            const hint = hintSystem.getHint(mockRoom);
            expect(hint).toBe('Explicit hint.');
        });

        it('returns null when no puzzleHints exist on room', () => {
            const emptyRoom = { id: 'empty' } as RoomData;
            const hint = hintSystem.getHint(emptyRoom);
            expect(hint).toBeNull();
        });

        it('returns null when all puzzles are solved', () => {
            state.setFlag('puzzle-solved:test-puzzle', true);
            const hint = hintSystem.getHint(mockRoom);
            expect(hint).toBeNull();
        });

        it('skips solved puzzles and returns hint for unsolved puzzle', () => {
            state.setFlag('puzzle-solved:puzzle-a', true);
            const hint = hintSystem.getHint(mockRoomTwoPuzzles);
            expect(hint).toBe('B vague.');
        });

        it('prioritizes puzzle with more failed attempts', () => {
            // Give puzzle-b more failed attempts
            state.incrementFailedAttempts('puzzle-b');
            state.incrementFailedAttempts('puzzle-b');
            state.incrementFailedAttempts('puzzle-a');

            const hint = hintSystem.getHint(mockRoomTwoPuzzles);
            expect(hint).toBe('B vague.');
        });

        it('auto-escalates to tier 1 when failedAttempts >= 3', () => {
            // 3 failed attempts should auto-escalate to tier 1
            state.incrementFailedAttempts('test-puzzle');
            state.incrementFailedAttempts('test-puzzle');
            state.incrementFailedAttempts('test-puzzle');

            const hint = hintSystem.getHint(mockRoom);
            expect(hint).toBe('Medium hint.');
        });

        it('auto-escalates to tier 2 when failedAttempts >= 5', () => {
            // 5 failed attempts should auto-escalate to tier 2
            for (let i = 0; i < 5; i++) {
                state.incrementFailedAttempts('test-puzzle');
            }

            const hint = hintSystem.getHint(mockRoom);
            expect(hint).toBe('Explicit hint.');
        });
    });

    describe('recordFailedAttempt()', () => {
        it('increments the failed attempt counter', () => {
            expect(state.getFailedAttempts('test-puzzle')).toBe(0);
            hintSystem.recordFailedAttempt('test-puzzle');
            expect(state.getFailedAttempts('test-puzzle')).toBe(1);
            hintSystem.recordFailedAttempt('test-puzzle');
            expect(state.getFailedAttempts('test-puzzle')).toBe(2);
        });
    });
});
