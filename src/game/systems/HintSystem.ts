import { GameState } from '../state/GameState';
import type { RoomData, PuzzleHint } from '../types/RoomData';

export type { PuzzleHint };

/**
 * Progressive hint system that selects context-appropriate hints
 * for unsolved puzzles, with tier escalation and auto-escalation
 * from failed attempts.
 */
export class HintSystem {
    private state: GameState;

    constructor() {
        this.state = GameState.getInstance();
    }

    /**
     * Get the next appropriate hint for the current room.
     * Returns null if no unsolved hintable puzzles remain.
     */
    getHint(roomData: RoomData): string | null {
        const puzzleHints = roomData.puzzleHints ?? [];
        if (puzzleHints.length === 0) return null;

        // Filter to unsolved puzzles
        const unsolved = puzzleHints.filter(
            h => !this.state.isFlagSet(`puzzle-solved:${h.puzzleId}`)
        );
        if (unsolved.length === 0) return null;

        // Score by relevance: failed attempts rank higher
        const scored = unsolved.map(h => ({
            hint: h,
            attempts: this.state.getFailedAttempts(h.puzzleId),
        }));
        scored.sort((a, b) => b.attempts - a.attempts);

        const best = scored[0].hint;

        // Determine tier: max of requested tier and auto-escalation from failures
        const requestedTier = this.state.getHintTier(best.puzzleId);
        const attempts = this.state.getFailedAttempts(best.puzzleId);
        const autoTier = attempts >= 5 ? 2 : attempts >= 3 ? 1 : 0;
        const effectiveTier = Math.min(Math.max(requestedTier, autoTier), 2);

        // Advance tier for next request
        this.state.setHintTier(best.puzzleId, Math.min(effectiveTier + 1, 2));

        return best.tiers[effectiveTier];
    }

    /**
     * Record a failed attempt at a puzzle trigger.
     * Called when a command matches a puzzle trigger but conditions fail.
     */
    recordFailedAttempt(puzzleId: string): void {
        this.state.incrementFailedAttempts(puzzleId);
    }
}
