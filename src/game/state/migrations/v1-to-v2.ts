/**
 * Migrates a v1 save (no version field) to v2 format.
 * Adds version: 2 and fills defaults for any missing optional fields.
 */
export function migrateV1toV2(data: Record<string, unknown>): Record<string, unknown> {
    return {
        version: 2,
        currentRoom: (data.currentRoom as string) ?? 'forest_clearing',
        inventory: (data.inventory as string[]) ?? [],
        flags: (data.flags as Record<string, boolean | string>) ?? {},
        visitedRooms: (data.visitedRooms as string[]) ?? [],
        removedItems: (data.removedItems as Record<string, string[]>) ?? {},
        playTimeMs: (data.playTimeMs as number) ?? 0,
        deathCount: (data.deathCount as number) ?? 0,
        dialogueStates: (data.dialogueStates as Record<string, string>) ?? {},
    };
}
