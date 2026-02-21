/**
 * A single entry in the endings registry.
 * Contains metadata and display data for each discoverable ending.
 */
export interface EndingEntry {
    /** Unique ending identifier, e.g., "ending-redemption" */
    id: string;
    /** Display title for the ending, e.g., "The Tinker's Farewell" */
    title: string;
    /** Subtitle summarizing the conditions, e.g., "The Clerk Remembers / Pip Walks Away" */
    subtitle: string;
    /** ~150-250 word narrator epilogue displayed in EndingScene */
    epilogueText: string;
    /** Teaser hint for undiscovered endings in the gallery */
    galleryHint: string;
}

/**
 * Top-level endings registry structure loaded from endings-registry.json.
 */
export interface EndingRegistry {
    /** Schema version for future migrations */
    version: number;
    /** Total number of endings (should match endings.length) */
    totalEndings: number;
    /** All ending entries */
    endings: EndingEntry[];
}
