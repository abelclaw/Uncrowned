import Fuse from 'fuse.js';
import type { HotspotData, ExitData } from '../types/RoomData.ts';
import { NOUN_SYNONYMS } from './NounSynonyms.ts';

/**
 * Result of resolving a raw noun string against room context.
 */
export interface ResolvedNoun {
    /** What kind of thing was matched */
    type: 'hotspot' | 'exit' | 'direction' | 'item' | 'unknown';
    /** The resolved ID (hotspot id, exit id, direction name, or raw string for unknown) */
    id: string;
    /** How confident the match is */
    confidence: 'exact' | 'partial' | 'fuzzy' | 'none';
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
 * Expand a noun phrase by replacing synonym words with their canonical forms.
 * Returns the original plus any expanded variants.
 *
 * Example: "flame" → ["flame", "torch"]
 * Example: "rusty blade" → ["rusty blade", "rusty sword"]
 */
function expandSynonyms(normalized: string): string[] {
    const words = normalized.split(/\s+/);
    const variants = new Set<string>([normalized]);

    for (let i = 0; i < words.length; i++) {
        const canonical = NOUN_SYNONYMS[words[i]];
        if (canonical && canonical !== words[i]) {
            // Replace this word with its canonical form
            const expanded = [...words];
            expanded[i] = canonical;
            variants.add(expanded.join(' '));
            // Also add just the canonical word alone (for single-word inputs)
            if (words.length === 1) {
                variants.add(canonical);
            }
        }
    }

    return [...variants];
}

/**
 * Resolves a raw noun string against the current room's hotspots, items, and exits.
 *
 * Resolution order (first match wins):
 * 1. Exact hotspot ID match
 * 2. Exact hotspot name match (case-insensitive)
 * 3. Exact inventory item ID match
 * 4. Exact inventory item name match (case-insensitive)
 * 4.5. Synonym expansion: re-attempt exact matches with expanded nouns
 * 5. Best partial word match (hotspots AND items scored together; head-noun bonus;
 *    ties broken in favor of items since players reference them more often with verbs)
 * 6. Direction mapping (compass directions)
 * 7. Exit match by direction field
 * 8. Exit match by label or target room
 * 8.5. Fuzzy match via fuse.js (catches typos like "torcch" → "torch")
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

        // 4.5. Synonym expansion: try expanded forms against exact matches
        const synonymVariants = expandSynonyms(normalized);
        for (const variant of synonymVariants) {
            if (variant === normalized) continue; // already tried above

            // Try expanded variant against hotspot names
            for (const h of hotspots) {
                if (h.name.toLowerCase() === variant) {
                    return { type: 'hotspot', id: h.id, confidence: 'exact' };
                }
            }
            // Try expanded variant against item names
            if (inventoryItems) {
                for (const item of inventoryItems) {
                    if (item.name.toLowerCase() === variant) {
                        return { type: 'item', id: item.id, confidence: 'exact' };
                    }
                    if (item.id === variant.replace(/\s+/g, '-')) {
                        return { type: 'item', id: item.id, confidence: 'exact' };
                    }
                }
            }
        }

        // 5. Scored partial matching: check BOTH hotspots and items.
        //    Score = matchCount * 2 + headNounBonus.
        //    Uses both original words AND synonym-expanded words for scoring.
        //    Head-noun bonus: +1 when the last word of the entity name is matched.
        //    On tie, prefer items (players more often reference items with action verbs).
        const allNounWords = new Set<string>();
        for (const variant of synonymVariants) {
            for (const w of variant.split(/\s+/)) {
                allNounWords.add(w);
            }
        }
        const nounWordsArr = [...allNounWords];

        let bestMatch: ResolvedNoun | null = null;
        let bestScore = 0;
        let bestIsItem = false;

        // Score hotspot partial matches
        for (const h of hotspots) {
            const hotspotWords = h.name.toLowerCase().split(/\s+/);
            const matchCount = nounWordsArr.filter(nw => hotspotWords.includes(nw)).length;
            const headBonus = nounWordsArr.includes(hotspotWords[hotspotWords.length - 1]) ? 1 : 0;
            const score = matchCount * 2 + headBonus;
            if (matchCount > 0 && (score > bestScore || (score === bestScore && !bestIsItem))) {
                bestScore = score;
                bestMatch = { type: 'hotspot', id: h.id, confidence: 'partial' };
                bestIsItem = false;
            }
        }

        // Score inventory item partial matches
        if (inventoryItems) {
            for (const item of inventoryItems) {
                const itemWords = item.name.toLowerCase().split(/\s+/);
                const matchCount = nounWordsArr.filter(nw => itemWords.includes(nw)).length;
                const headBonus = nounWordsArr.includes(itemWords[itemWords.length - 1]) ? 1 : 0;
                const score = matchCount * 2 + headBonus;
                // Items win on tie (bestIsItem check: item beats hotspot at same score)
                if (matchCount > 0 && (score > bestScore || (score === bestScore && !bestIsItem))) {
                    bestScore = score;
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

        // 8.5. Fuzzy match via fuse.js (catches typos)
        const fuzzyResult = this.fuzzyMatch(normalized, hotspots, inventoryItems);
        if (fuzzyResult) {
            return fuzzyResult;
        }

        // 9. Unknown -- return raw string
        return { type: 'unknown', id: normalized, confidence: 'none' };
    }

    /**
     * Fuzzy matching via fuse.js for typo tolerance.
     * Only fires as a last resort before "unknown".
     * Uses a strict threshold (0.35) to avoid false positives.
     */
    private fuzzyMatch(
        normalized: string,
        hotspots: HotspotData[],
        inventoryItems?: Array<{ id: string; name: string }>,
    ): ResolvedNoun | null {
        const candidates: Array<{ name: string; type: 'hotspot' | 'item'; id: string }> = [];

        for (const h of hotspots) {
            candidates.push({ name: h.name, type: 'hotspot', id: h.id });
        }
        if (inventoryItems) {
            for (const item of inventoryItems) {
                candidates.push({ name: item.name, type: 'item', id: item.id });
            }
        }

        if (candidates.length === 0) return null;

        const fuse = new Fuse(candidates, {
            keys: ['name'],
            threshold: 0.35,
            includeScore: true,
        });

        const results = fuse.search(normalized);
        if (results.length > 0 && results[0].score !== undefined && results[0].score <= 0.35) {
            const best = results[0].item;
            return { type: best.type, id: best.id, confidence: 'fuzzy' };
        }

        return null;
    }
}
