import type { HotspotData, ExitData } from '../types/RoomData.ts';

/**
 * Result of resolving a raw noun string against room context.
 */
export interface ResolvedNoun {
    /** What kind of thing was matched */
    type: 'hotspot' | 'exit' | 'direction' | 'item' | 'unknown';
    /** The resolved ID (hotspot id, exit id, direction name, or raw string for unknown) */
    id: string;
    /** How confident the match is */
    confidence: 'exact' | 'partial' | 'none';
}

/**
 * Direction name map for compass directions and their abbreviations.
 */
const DIRECTIONS: Record<string, string> = {
    'north': 'north', 'n': 'north',
    'south': 'south', 's': 'south',
    'east': 'east', 'e': 'east',
    'west': 'west', 'w': 'west',
    'up': 'up', 'u': 'up',
    'down': 'down', 'd': 'down',
};

/**
 * Stop words stripped from noun phrases before resolution.
 * Includes articles, prepositions, and filler words.
 */
const STOP_WORDS = new Set([
    'the', 'a', 'an', 'this', 'that', 'those', 'these', 'some', 'my',
]);

/**
 * Strips articles and filler words from a noun phrase.
 * Preserves the word order of remaining words.
 */
export function stripStopWords(text: string): string {
    return text
        .split(/\s+/)
        .filter(word => !STOP_WORDS.has(word.toLowerCase()))
        .join(' ')
        .trim();
}

/**
 * Resolves a raw noun string against the current room's hotspots, items, and exits.
 *
 * Resolution order (first match wins):
 * 1. Exact hotspot ID match
 * 2. Exact hotspot name match (case-insensitive)
 * 3. Exact inventory item ID match
 * 4. Exact inventory item name match (case-insensitive)
 * 5. Best partial word match (hotspots AND items scored together; most matching words wins;
 *    ties broken in favor of items since players reference them more often with verbs)
 * 6. Direction mapping (compass directions)
 * 7. Exit match by direction field
 * 8. Exit match by label or target room
 * 9. Unknown (returns raw string as id)
 */
export class NounResolver {
    resolve(
        rawNoun: string,
        hotspots: HotspotData[],
        exits: ExitData[],
        inventoryItems?: Array<{ id: string; name: string }>,
    ): ResolvedNoun {
        const cleaned = stripStopWords(rawNoun);
        const normalized = cleaned.toLowerCase().trim();

        if (!normalized) {
            return { type: 'unknown', id: rawNoun.trim(), confidence: 'none' };
        }

        // 1. Exact hotspot ID match (normalize hyphens/underscores)
        const normalizedId = normalized.replace(/-/g, '_');
        for (const h of hotspots) {
            if (h.id === normalized || h.id === normalizedId) {
                return { type: 'hotspot', id: h.id, confidence: 'exact' };
            }
        }

        // 2. Exact hotspot name match (case-insensitive)
        for (const h of hotspots) {
            if (h.name.toLowerCase() === normalized) {
                return { type: 'hotspot', id: h.id, confidence: 'exact' };
            }
        }

        // 3. Exact inventory item ID match
        if (inventoryItems) {
            for (const item of inventoryItems) {
                if (item.id === normalized || item.id === normalized.replace(/\s+/g, '-')) {
                    return { type: 'item', id: item.id, confidence: 'exact' };
                }
            }
            // 4. Exact inventory item name match (case-insensitive)
            for (const item of inventoryItems) {
                if (item.name.toLowerCase() === normalized) {
                    return { type: 'item', id: item.id, confidence: 'exact' };
                }
            }
        }

        // 5. Scored partial matching: check BOTH hotspots and items,
        //    prefer the match with the most overlapping words.
        //    On tie, prefer items (players more often reference items with action verbs).
        const nounWords = normalized.split(/\s+/);
        let bestMatch: ResolvedNoun | null = null;
        let bestScore = 0;
        let bestIsItem = false;

        // Score hotspot partial matches
        for (const h of hotspots) {
            const hotspotWords = h.name.toLowerCase().split(/\s+/);
            const matchCount = nounWords.filter(nw => hotspotWords.includes(nw)).length;
            if (matchCount > 0 && (matchCount > bestScore || (matchCount === bestScore && !bestIsItem))) {
                bestScore = matchCount;
                bestMatch = { type: 'hotspot', id: h.id, confidence: 'partial' };
                bestIsItem = false;
            }
        }

        // Score inventory item partial matches
        if (inventoryItems) {
            for (const item of inventoryItems) {
                const itemWords = item.name.toLowerCase().split(/\s+/);
                const matchCount = nounWords.filter(nw => itemWords.includes(nw)).length;
                // Items win on tie (bestIsItem check: item beats hotspot at same score)
                if (matchCount > 0 && (matchCount > bestScore || (matchCount === bestScore && !bestIsItem))) {
                    bestScore = matchCount;
                    bestMatch = { type: 'item', id: item.id, confidence: 'partial' };
                    bestIsItem = true;
                }
            }
        }

        if (bestMatch) {
            return bestMatch;
        }

        // 6. Direction mapping
        if (normalized in DIRECTIONS) {
            return { type: 'direction', id: DIRECTIONS[normalized], confidence: 'exact' };
        }

        // 7. Exit match by direction field
        for (const ex of exits) {
            if (ex.direction && ex.direction.toLowerCase() === normalized) {
                return { type: 'exit', id: ex.id, confidence: 'exact' };
            }
        }

        // 8. Exit match by label or target room
        for (const ex of exits) {
            if (ex.label && ex.label.toLowerCase() === normalized) {
                return { type: 'exit', id: ex.id, confidence: 'exact' };
            }
            if (ex.targetRoom.toLowerCase().includes(normalized)) {
                return { type: 'exit', id: ex.id, confidence: 'partial' };
            }
        }

        // 9. Unknown -- return raw string
        return { type: 'unknown', id: normalized, confidence: 'none' };
    }
}
