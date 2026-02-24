/**
 * NarratorDisplay wraps an existing HTMLElement and provides a typewriter
 * text reveal effect. Characters appear one at a time via setInterval.
 * Players can click the element or press a key to skip to the end.
 *
 * Usage: Pass the existing #parser-response element (from TextInputBar)
 * to enhance it with typewriter behavior.
 */
export class NarratorDisplay {
    private element: HTMLElement;
    private fullText: string = '';
    private charIndex: number = 0;
    private timer: ReturnType<typeof setInterval> | null = null;
    private onComplete: (() => void) | undefined;
    private clickListener: () => void;
    private keyListener: (e: KeyboardEvent) => void;

    /**
     * Create a NarratorDisplay that enhances the given element with typewriter behavior.
     * Adds click-to-skip on the element and keyboard skip on document.
     *
     * @param element - The HTMLElement to render typewriter text into
     */
    constructor(element: HTMLElement) {
        this.element = element;

        // Click-to-skip: clicking the element finishes the typewriter immediately
        this.clickListener = () => this.skipToEnd();
        this.element.addEventListener('click', this.clickListener);

        // Keyboard skip: printable keys, Enter, or Space skip the typewriter.
        // Arrow keys are excluded (they navigate command history).
        this.keyListener = (e: KeyboardEvent) => {
            if (this.timer === null) return; // only skip when typewriter is active

            // Allow Enter to skip typewriter even from the input field (when empty)
            const tag = (e.target as HTMLElement)?.tagName;
            if (tag === 'INPUT' || tag === 'TEXTAREA') {
                if (e.key === 'Enter' && (e.target as HTMLInputElement).value.trim() === '') {
                    this.skipToEnd();
                }
                return;
            }

            const isArrow = e.key.startsWith('Arrow');
            const isModifier = ['Shift', 'Control', 'Alt', 'Meta', 'Tab', 'Escape',
                'CapsLock', 'NumLock', 'ScrollLock', 'Fn', 'FnLock'].includes(e.key);

            if (!isArrow && !isModifier) {
                this.skipToEnd();
            }
        };
        document.addEventListener('keydown', this.keyListener);
    }

    /**
     * Begin typewriter reveal of the given text. Stops any existing animation.
     * Characters are appended one at a time at the given speed (ms per character).
     *
     * @param text - The full text to reveal
     * @param speed - Milliseconds between each character (default 30)
     * @param onComplete - Optional callback when reveal finishes (or is skipped)
     */
    typewrite(text: string, speed: number = 30, onComplete?: () => void): void {
        this.stop();
        this.fullText = text;
        this.charIndex = 0;
        this.onComplete = onComplete;
        this.element.textContent = '';

        this.timer = setInterval(() => {
            this.charIndex++;
            this.element.textContent = this.fullText.slice(0, this.charIndex);
            this.element.scrollTop = this.element.scrollHeight;

            if (this.charIndex >= this.fullText.length) {
                this.stop();
                this.onComplete?.();
            }
        }, speed);
    }

    /**
     * Immediately show the full text, stopping any active animation.
     * Calls onComplete if a typewriter was in progress.
     */
    skipToEnd(): void {
        if (this.timer === null) return;
        this.stop();
        this.element.textContent = this.fullText;
        this.element.scrollTop = this.element.scrollHeight;
        this.onComplete?.();
    }

    /**
     * Instantly display text without typewriter animation.
     * Stops any active animation without calling onComplete.
     */
    showInstant(text: string): void {
        this.stop();
        this.fullText = text;
        this.element.textContent = text;
        this.element.scrollTop = this.element.scrollHeight;
    }

    /**
     * Stop the typewriter interval timer if one is running.
     */
    private stop(): void {
        if (this.timer !== null) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }

    /**
     * Clean up: stop animation and remove event listeners.
     */
    destroy(): void {
        this.stop();
        this.element.removeEventListener('click', this.clickListener);
        document.removeEventListener('keydown', this.keyListener);
    }
}
