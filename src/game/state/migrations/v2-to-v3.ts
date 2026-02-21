/**
 * Migrates a v2 save to v3 format.
 * Adds hintTiers and failedAttempts for progressive hint tracking.
 */
export function migrateV2toV3(data: Record<string, unknown>): Record<string, unknown> {
    return {
        ...data,
        version: 3,
        hintTiers: {},
        failedAttempts: {},
    };
}
