import type { NarratorDisplay } from '../ui/NarratorDisplay';

/**
 * DialogueUI formats dialogue output for the existing NarratorDisplay.
 *
 * This is a lightweight adapter that presents ink dialogue lines with speaker
 * attribution and numbered choices through the same #parser-response element
 * used by the narrator. It does NOT create any DOM elements -- it reuses the
 * NarratorDisplay's typewriter and instant-show capabilities.
 */
export class DialogueUI {
    /** Threshold for choosing typewrite vs instant display (characters) */
    private static readonly TYPEWRITE_THRESHOLD = 50;

    private narratorDisplay: NarratorDisplay;

    constructor(narratorDisplay: NarratorDisplay) {
        this.narratorDisplay = narratorDisplay;
    }

    /**
     * Show a single dialogue line with speaker attribution.
     * Uses typewrite for longer text, instant for short text (<=50 chars),
     * matching the existing narrator display threshold pattern.
     *
     * @param speakerName - Name of the speaking NPC
     * @param text - The dialogue line text
     */
    showDialogueLine(speakerName: string, text: string): void {
        const formatted = `${speakerName}: ${text}`;
        if (formatted.length <= DialogueUI.TYPEWRITE_THRESHOLD) {
            this.narratorDisplay.showInstant(formatted);
        } else {
            this.narratorDisplay.typewrite(formatted);
        }
    }

    /**
     * Show numbered choices instantly in the narrator display.
     * Choices appear immediately (no typewriter) since they need to be
     * readable right away for player selection.
     *
     * @param choices - Array of choice objects with index and text
     */
    showChoices(choices: Array<{ index: number; text: string }>): void {
        const formatted = choices
            .map((choice) => `${choice.index + 1}. ${choice.text}`)
            .join('\n');
        this.narratorDisplay.showInstant(formatted);
    }

    /**
     * Show dialogue lines followed by numbered choices in a single block.
     * Lines are displayed first (joined with newlines), then a blank line
     * separator, then the numbered choices. Uses typewrite for the combined
     * text with onComplete to ensure everything is visible.
     *
     * @param speakerName - Name of the speaking NPC
     * @param lines - Array of dialogue text lines
     * @param choices - Array of choice objects with index and text
     */
    showDialogueWithChoices(
        speakerName: string,
        lines: string[],
        choices: Array<{ index: number; text: string }>,
    ): void {
        const attributedLines = lines.map((line) => `${speakerName}: ${line}`);
        const choiceLines = choices.map(
            (choice) => `${choice.index + 1}. ${choice.text}`,
        );

        const parts: string[] = [];
        if (attributedLines.length > 0) {
            parts.push(attributedLines.join('\n'));
        }
        if (choiceLines.length > 0) {
            parts.push(choiceLines.join('\n'));
        }

        const combined = parts.join('\n\n');

        if (combined.length <= DialogueUI.TYPEWRITE_THRESHOLD) {
            this.narratorDisplay.showInstant(combined);
        } else {
            this.narratorDisplay.typewrite(combined);
        }
    }

    /**
     * Clear the narrator display.
     */
    clearDialogue(): void {
        this.narratorDisplay.showInstant('');
    }

    /**
     * Parse ink tags in #key:value format into a key-value map.
     * Bare tags (no colon) get value 'true'.
     *
     * @param tags - Array of tag strings from ink story
     * @returns Record mapping tag keys to values
     */
    parseTags(tags: string[]): Record<string, string> {
        const result: Record<string, string> = {};
        for (const tag of tags) {
            const colonIndex = tag.indexOf(':');
            if (colonIndex === -1) {
                result[tag.trim()] = 'true';
            } else {
                const key = tag.slice(0, colonIndex).trim();
                const value = tag.slice(colonIndex + 1).trim();
                result[key] = value;
            }
        }
        return result;
    }
}
