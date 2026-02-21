import type { GameStateData } from '../GameStateTypes.ts';
import { CURRENT_SAVE_VERSION } from '../GameStateTypes.ts';
import { migrateV1toV2 } from './v1-to-v2.ts';
import { migrateV2toV3 } from './v2-to-v3.ts';

export { CURRENT_SAVE_VERSION };

/** A migration function transforms raw save data from version N to N+1. */
type MigrationFn = (data: Record<string, unknown>) => Record<string, unknown>;

/** Registry of migration functions keyed by source version. */
const migrations: Record<number, MigrationFn> = {
    1: migrateV1toV2,
    2: migrateV2toV3,
};

/**
 * Migrate raw save data to the current version.
 * - No version field = v1 (original format).
 * - Already current version = returned as-is.
 * - Future version = throws.
 * - Otherwise, applies migrations sequentially.
 */
export function migrate(raw: Record<string, unknown>): GameStateData {
    let version = (raw.version as number) ?? 1;

    if (version === CURRENT_SAVE_VERSION) {
        return raw as unknown as GameStateData;
    }

    if (version > CURRENT_SAVE_VERSION) {
        throw new Error('Save from newer version');
    }

    let data = { ...raw };
    while (version < CURRENT_SAVE_VERSION) {
        const fn = migrations[version];
        if (!fn) {
            throw new Error(`No migration for version ${version}`);
        }
        data = fn(data);
        version = (data.version as number) ?? version + 1;
    }

    return data as unknown as GameStateData;
}
