import type { HotspotData, ExitData } from '../types/RoomData.ts';

/**
 * Result of resolving a raw noun string against room context.
 */
export interface ResolvedNoun {
    /** What kind of thing was matched */
    type: 'hotspot' | 'exit' | 'direction' | 'unknown';
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
 * Resolves a raw noun string against the current room's hotspots and exits.
 *
 * Resolution order (first match wins):
 * 1. Exact hotspot ID match
 * 2. Exact hotspot name match (case-insensitive)
 * 3. Partial word match against hotspot names
 * 4. Direction mapping (compass directions)
 * 5. Exit match by direction field
 * 6. Exit match by label or target room
 * 7. Unknown (returns raw string as id for future inventory resolution)
 */
export class NounResolver {
    resolve(
        rawNoun: string,
        hotspots: HotspotData[],
        exits: ExitData[],
    ): ResolvedNoun {
        const cleaned = stripStopWords(rawNoun);
        const normalized = cleaned.toLowerCase().trim();

        if (!normalized) {
            return { type: 'unknown', id: rawNoun.trim(), confidence: 'none' };
        }

        // 1. Exact hotspot ID match
        for (const h of hotspots) {
            if (h.id === normalized) {
                return { type: 'hotspot', id: h.id, confidence: 'exact' };
            }
        }

        // 2. Exact hotspot name match (case-insensitive)
        for (const h of hotspots) {
            if (h.name.toLowerCase() === normalized) {
                return { type: 'hotspot', id: h.id, confidence: 'exact' };
            }
        }

        // 3. Partial match: check if normalized text contains a word from hotspot name,
        //    or if any word in the noun matches any word in the hotspot name
        for (const h of hotspots) {
            const hotspotWords = h.name.toLowerCase().split(/\s+/);
            const nounWords = normalized.split(/\s+/);
            const hasMatch = nounWords.some(nw => hotspotWords.includes(nw));
            if (hasMatch) {
                return { type: 'hotspot', id: h.id, confidence: 'partial' };
            }
        }

        // 4. Direction mapping
        if (normalized in DIRECTIONS) {
            return { type: 'direction', id: DIRECTIONS[normalized], confidence: 'exact' };
        }

        // 5. Exit match by direction field
        for (const ex of exits) {
            if (ex.direction && ex.direction.toLowerCase() === normalized) {
                return { type: 'exit', id: ex.id, confidence: 'exact' };
            }
        }

        // 6. Exit match by label or target room
        for (const ex of exits) {
            if (ex.label && ex.label.toLowerCase() === normalized) {
                return { type: 'exit', id: ex.id, confidence: 'exact' };
            }
            if (ex.targetRoom.toLowerCase().includes(normalized)) {
                return { type: 'exit', id: ex.id, confidence: 'partial' };
            }
        }

        // 7. Unknown -- return raw string for future inventory resolution (Phase 4)
        return { type: 'unknown', id: normalized, confidence: 'none' };
    }
}
