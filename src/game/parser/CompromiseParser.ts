/**
 * POS-based fallback parser using compromise.js.
 *
 * When VerbTable regex patterns miss, this parser uses part-of-speech
 * tagging to extract verb and noun phrases from natural language input,
 * then maps them against the existing verb synonym table and NounResolver.
 *
 * Examples of inputs this catches that regex misses:
 *   "have a word with the ghost king" → talk ghost_king
 *   "set fire to the curtains" → use fire on curtains
 *   "take a look around" → look
 */

import nlp from 'compromise';
import type { ParseResult, Verb } from '../types/GameAction.ts';
import type { HotspotData, ExitData } from '../types/RoomData.ts';
import { VERB_TABLE, DIRECTION_SHORTCUTS } from './VerbTable.ts';
import { NounResolver, stripStopWords } from './NounResolver.ts';

/**
 * Phrase-level verb mappings that regex can't easily catch.
 * Maps multi-word idioms to canonical verbs.
 */
const PHRASE_VERBS: Array<{ phrase: RegExp; verb: Verb }> = [
    { phrase: /\bhave a (?:word|chat|talk)\b/i, verb: 'talk' },
    { phrase: /\btake a (?:look|peek|gander)\b/i, verb: 'look' },
    { phrase: /\bhave a (?:look|peek|gander)\b/i, verb: 'look' },
    { phrase: /\bset fire to\b/i, verb: 'use' },
    { phrase: /\bpick up\b/i, verb: 'take' },
    { phrase: /\bget rid of\b/i, verb: 'use' },
    { phrase: /\blet go of\b/i, verb: 'use' },
    { phrase: /\bbreak (?:open|into)\b/i, verb: 'open' },
];

/**
 * Build a reverse-lookup from synonym → canonical verb.
 * Used to map compromise-extracted verbs back to game verbs.
 */
function buildVerbLookup(): Map<string, Verb> {
    const map = new Map<string, Verb>();
    for (const def of VERB_TABLE) {
        for (const syn of def.synonyms) {
            map.set(syn.toLowerCase(), def.canonical);
        }
    }
    // Additional informal verbs compromise might extract
    map.set('have', 'talk');      // "have a word with"
    map.set('speak', 'talk');
    map.set('chat', 'talk');
    map.set('peek', 'look');
    map.set('gaze', 'look');
    map.set('stare', 'look');
    map.set('glance', 'look');
    map.set('search', 'look');
    map.set('find', 'look');
    map.set('pick', 'take');
    map.set('steal', 'take');
    map.set('swipe', 'take');
    map.set('carry', 'take');
    map.set('throw', 'use');
    map.set('toss', 'use');
    map.set('drop', 'use');
    map.set('destroy', 'use');
    map.set('break', 'open');
    map.set('smash', 'open');
    map.set('bash', 'open');
    map.set('kick', 'push');
    map.set('hit', 'push');
    map.set('strike', 'push');
    map.set('knock', 'push');
    map.set('slide', 'push');
    map.set('ascend', 'go');
    map.set('descend', 'go');
    map.set('return', 'go');
    map.set('visit', 'go');
    map.set('approach', 'go');
    map.set('flee', 'go');
    map.set('escape', 'go');
    return map;
}

const VERB_LOOKUP = buildVerbLookup();

/**
 * Prepositions that separate subject from target in two-noun commands.
 */
const TARGET_PREPS = new Set([
    'to', 'on', 'onto', 'with', 'into', 'at', 'from', 'near', 'by',
    'in', 'upon', 'against', 'inside', 'through',
]);

/**
 * Prepositions that should be ignored (not marking a target noun).
 */
const FILLER_PREPS = new Set(['a', 'an', 'the', 'some', 'around', 'about', 'up']);

export class CompromiseParser {
    private nounResolver = new NounResolver();

    /**
     * Attempt to parse input using compromise.js POS tagging.
     * Returns null if parsing fails (caller should use regex error).
     */
    parse(
        input: string,
        hotspots: HotspotData[],
        exits: ExitData[],
        inventoryItems?: Array<{ id: string; name: string }>,
    ): ParseResult | null {
        const trimmed = input.trim();
        if (!trimmed) return null;

        const normalized = trimmed.toLowerCase();

        // 1. Check phrase verbs first (multi-word idioms)
        for (const pv of PHRASE_VERBS) {
            if (pv.phrase.test(normalized)) {
                const nouns = this.extractNounsAfterPhrase(normalized, pv.phrase);
                return this.buildResult(pv.verb, nouns, hotspots, exits, inventoryItems, trimmed);
            }
        }

        // 2. POS-tag with compromise
        const doc = nlp(trimmed);

        // 3. Extract the verb (first verb in sentence)
        const verbs = doc.verbs().toInfinitive().out('array') as string[];
        let verb: Verb | null = null;

        if (verbs.length > 0) {
            // Try each extracted verb against our lookup
            for (const v of verbs) {
                const canonical = VERB_LOOKUP.get(v.toLowerCase());
                if (canonical) {
                    verb = canonical;
                    break;
                }
            }
        }

        // If no verb found via POS, try the first word as a verb
        let verbFromFirstWord = false;
        if (!verb) {
            const firstWord = normalized.split(/\s+/)[0];
            verb = VERB_LOOKUP.get(firstWord) ?? null;
            if (verb) verbFromFirstWord = true;
        }

        if (!verb) return null;

        // 4. Extract noun phrases
        // When the verb was found via first-word fallback (not POS tagging),
        // strip the first word before extracting nouns so it doesn't appear as a noun.
        // e.g. "destroy the banner" → compromise sees "destroy" as a noun, but we used
        // it as the verb, so extract nouns from "the banner" only.
        const nounInput = verbFromFirstWord
            ? normalized.replace(/^\S+\s*/, '')
            : normalized;
        const nounDoc = verbFromFirstWord ? nlp(nounInput) : doc;
        const nouns = this.extractNouns(nounDoc, nounInput);

        // 5. Build result
        return this.buildResult(verb, nouns, hotspots, exits, inventoryItems, trimmed);
    }

    /**
     * Extract noun phrases from the compromise document.
     * Returns [subject, target] where either may be null.
     */
    private extractNouns(
        doc: ReturnType<typeof nlp>,
        normalized: string,
    ): { subject: string | null; target: string | null } {
        // Get all noun phrases
        const nounPhrases = doc.nouns().out('array') as string[];

        if (nounPhrases.length === 0) {
            // Fallback: split on prepositions and take non-verb tokens
            return this.extractNounsByPrep(normalized);
        }

        if (nounPhrases.length === 1) {
            return { subject: nounPhrases[0], target: null };
        }

        // Two or more nouns: check if a target-marking preposition separates them
        // Use the raw text to find preposition boundaries
        return this.splitByPreposition(normalized, nounPhrases);
    }

    /**
     * Split nouns by preposition to identify subject vs target.
     */
    private splitByPreposition(
        normalized: string,
        nounPhrases: string[],
    ): { subject: string | null; target: string | null } {
        // Find target-marking preposition in the text
        const words = normalized.split(/\s+/);
        let prepIndex = -1;

        for (let i = 1; i < words.length; i++) {
            if (TARGET_PREPS.has(words[i]) && !FILLER_PREPS.has(words[i])) {
                prepIndex = i;
                break;
            }
        }

        if (prepIndex > 0 && nounPhrases.length >= 2) {
            return { subject: nounPhrases[0], target: nounPhrases[1] };
        }

        return { subject: nounPhrases[0], target: nounPhrases.length > 1 ? nounPhrases[1] : null };
    }

    /**
     * Fallback noun extraction by splitting on prepositions.
     */
    private extractNounsByPrep(
        normalized: string,
    ): { subject: string | null; target: string | null } {
        const words = normalized.split(/\s+/);

        // Skip the first word (verb)
        let subject: string[] = [];
        let target: string[] = [];
        let inTarget = false;

        for (let i = 1; i < words.length; i++) {
            const w = words[i];
            if (FILLER_PREPS.has(w)) continue;
            if (TARGET_PREPS.has(w)) {
                inTarget = true;
                continue;
            }
            if (inTarget) {
                target.push(w);
            } else {
                subject.push(w);
            }
        }

        return {
            subject: subject.length > 0 ? subject.join(' ') : null,
            target: target.length > 0 ? target.join(' ') : null,
        };
    }

    /**
     * Extract nouns from text after removing a matched phrase verb.
     */
    private extractNounsAfterPhrase(
        normalized: string,
        phrasePattern: RegExp,
    ): { subject: string | null; target: string | null } {
        let remaining = normalized.replace(phrasePattern, '').trim();
        if (!remaining) return { subject: null, target: null };

        // Strip leading prepositions left over from the phrase
        // e.g. "have a word with the beehive" → remaining = "with the beehive"
        const words = remaining.split(/\s+/);
        if (words.length > 0 && (TARGET_PREPS.has(words[0]) || FILLER_PREPS.has(words[0]))) {
            words.shift();
            remaining = words.join(' ').trim();
        }
        if (!remaining) return { subject: null, target: null };

        // Everything remaining is the subject noun phrase
        // Strip articles/filler
        const cleaned = remaining.split(/\s+/).filter(w => !FILLER_PREPS.has(w)).join(' ');
        return { subject: cleaned || null, target: null };
    }

    /**
     * Build a ParseResult from extracted verb and nouns.
     */
    private buildResult(
        verb: Verb,
        nouns: { subject: string | null; target: string | null },
        hotspots: HotspotData[],
        exits: ExitData[],
        inventoryItems?: Array<{ id: string; name: string }>,
        rawInput: string = '',
    ): ParseResult {
        // For "go" commands, resolve subject as direction/exit
        if (verb === 'go' && nouns.subject) {
            const cleaned = stripStopWords(nouns.subject).toLowerCase();
            if (cleaned in DIRECTION_SHORTCUTS) {
                return {
                    success: true,
                    action: { verb, subject: DIRECTION_SHORTCUTS[cleaned], target: null, rawInput },
                };
            }
            // Try exit match
            const resolved = this.nounResolver.resolve(cleaned, [], exits);
            return {
                success: true,
                action: { verb, subject: resolved.id, target: null, rawInput },
            };
        }

        // Resolve subject
        const subject = nouns.subject
            ? this.nounResolver.resolve(
                  stripStopWords(nouns.subject),
                  hotspots,
                  exits,
                  inventoryItems,
              ).id
            : null;

        // Resolve target
        const target = nouns.target
            ? this.nounResolver.resolve(
                  stripStopWords(nouns.target),
                  hotspots,
                  exits,
                  inventoryItems,
              ).id
            : null;

        return {
            success: true,
            action: { verb, subject, target, rawInput },
        };
    }
}
