import type { GameStateData } from './GameStateTypes.ts';
import { getDefaultState } from './GameStateTypes.ts';

/**
 * Singleton game state manager.
 * Holds all mutable game state: inventory, flags, rooms, and play metrics.
 * Every system reads from and writes to this single source of truth.
 */
export class GameState {
    private static instance: GameState;
    private data: GameStateData;

    private constructor() {
        this.data = getDefaultState();
    }

    static getInstance(): GameState {
        if (!GameState.instance) {
            GameState.instance = new GameState();
        }
        return GameState.instance;
    }

    // --- Inventory operations ---

    hasItem(itemId: string): boolean {
        return this.data.inventory.includes(itemId);
    }

    addItem(itemId: string): void {
        if (!this.hasItem(itemId)) {
            this.data.inventory.push(itemId);
        }
    }

    removeItem(itemId: string): void {
        this.data.inventory = this.data.inventory.filter(id => id !== itemId);
    }

    // --- Flag operations ---

    getFlag(key: string): boolean | string | undefined {
        return this.data.flags[key];
    }

    setFlag(key: string, value: boolean | string = true): void {
        this.data.flags[key] = value;
    }

    isFlagSet(key: string): boolean {
        return !!this.data.flags[key];
    }

    // --- Room operations ---

    markRoomVisited(roomId: string): void {
        if (!this.data.visitedRooms.includes(roomId)) {
            this.data.visitedRooms.push(roomId);
        }
    }

    isRoomItemRemoved(roomId: string, itemId: string): boolean {
        return this.data.removedItems[roomId]?.includes(itemId) ?? false;
    }

    markRoomItemRemoved(roomId: string, itemId: string): void {
        if (!this.data.removedItems[roomId]) {
            this.data.removedItems[roomId] = [];
        }
        if (!this.data.removedItems[roomId].includes(itemId)) {
            this.data.removedItems[roomId].push(itemId);
        }
    }

    // --- Serialization ---

    serialize(): string {
        return JSON.stringify(this.data);
    }

    deserialize(json: string): void {
        this.data = JSON.parse(json);
    }

    reset(): void {
        this.data = getDefaultState();
    }

    getData(): Readonly<GameStateData> {
        return this.data;
    }
}
