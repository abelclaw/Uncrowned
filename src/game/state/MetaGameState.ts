/**
 * Cross-playthrough persistence data.
 * Stored independently from GameState save slots in its own localStorage key.
 */
export interface MetaGameStateData {
    version: number;
    deathsDiscovered: string[];
    endingsDiscovered: string[];
}

const META_KEY = 'kqgame-meta';
const META_VERSION = 1;

function getDefaultMetaState(): MetaGameStateData {
    return {
        version: META_VERSION,
        deathsDiscovered: [],
        endingsDiscovered: [],
    };
}

/**
 * Singleton for cross-playthrough state (death gallery, endings discovered).
 * Persists in its own localStorage key independently from GameState save slots.
 * Survives new-game reset and save slot loads.
 */
export class MetaGameState {
    private static instance: MetaGameState;
    private data: MetaGameStateData;

    private constructor() {
        this.data = this.loadFromStorage();
    }

    static getInstance(): MetaGameState {
        if (!MetaGameState.instance) {
            MetaGameState.instance = new MetaGameState();
        }
        return MetaGameState.instance;
    }

    /** Reset singleton instance (for testing). */
    static resetInstance(): void {
        MetaGameState.instance = undefined as unknown as MetaGameState;
    }

    // --- Death tracking ---

    /**
     * Record a discovered death. Returns true if new, false if already recorded.
     * Auto-saves after recording.
     */
    recordDeath(deathId: string): boolean {
        if (this.data.deathsDiscovered.includes(deathId)) {
            return false;
        }
        this.data.deathsDiscovered.push(deathId);
        this.save();
        return true;
    }

    getDeathsDiscovered(): readonly string[] {
        return this.data.deathsDiscovered;
    }

    // --- Ending tracking ---

    /**
     * Record a discovered ending. Returns true if new, false if already recorded.
     * Auto-saves after recording.
     */
    recordEnding(endingId: string): boolean {
        if (this.data.endingsDiscovered.includes(endingId)) {
            return false;
        }
        this.data.endingsDiscovered.push(endingId);
        this.save();
        return true;
    }

    getEndingsDiscovered(): readonly string[] {
        return this.data.endingsDiscovered;
    }

    // --- Data access ---

    getData(): Readonly<MetaGameStateData> {
        return this.data;
    }

    // --- Persistence ---

    save(): void {
        try {
            localStorage.setItem(META_KEY, JSON.stringify(this.data));
        } catch (e) {
            console.warn('Failed to save MetaGameState:', e);
        }
    }

    reset(): void {
        this.data = getDefaultMetaState();
        this.save();
    }

    private loadFromStorage(): MetaGameStateData {
        try {
            const stored = localStorage.getItem(META_KEY);
            if (stored) {
                return JSON.parse(stored) as MetaGameStateData;
            }
        } catch (e) {
            console.warn('Failed to load MetaGameState:', e);
        }
        return getDefaultMetaState();
    }
}
