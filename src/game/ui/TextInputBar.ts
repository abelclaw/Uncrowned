import EventBus from '../EventBus';

/**
 * HTML-based text input bar for the text parser interface.
 * Renders below the game canvas with a response display area and input field.
 * Emits 'command-submitted' events via EventBus when the player presses Enter.
 * Supports command history navigation with up/down arrow keys.
 */
export class TextInputBar {
    private wrapperEl: HTMLDivElement;
    private responseEl: HTMLDivElement;
    private inputEl: HTMLInputElement;
    private history: string[] = [];
    private historyIndex: number = -1;

    /**
     * Create the text input bar and append it to the given container element.
     * The wrapper is placed after the Phaser canvas inside the container.
     *
     * @param container - The parent HTMLElement (typically #game-container)
     */
    constructor(container: HTMLElement) {
        // Create wrapper div
        this.wrapperEl = document.createElement('div');
        this.wrapperEl.id = 'text-parser-ui';

        // Create response display area
        this.responseEl = document.createElement('div');
        this.responseEl.id = 'parser-response';
        this.responseEl.textContent = 'Type a command to begin your adventure...';

        // Create input field
        this.inputEl = document.createElement('input');
        this.inputEl.id = 'parser-input';
        this.inputEl.type = 'text';
        this.inputEl.placeholder = 'What do you do?';
        this.inputEl.autocomplete = 'off';
        this.inputEl.spellcheck = false;

        // Assemble DOM
        this.wrapperEl.appendChild(this.responseEl);
        this.wrapperEl.appendChild(this.inputEl);
        container.appendChild(this.wrapperEl);

        // Bind event listeners
        this.inputEl.addEventListener('keydown', this.onKeyDown);
    }

    /**
     * Handle keydown events on the input field.
     * Enter submits the command, up/down navigate history.
     */
    private onKeyDown = (e: KeyboardEvent): void => {
        if (e.key === 'Enter') {
            const text = this.inputEl.value.trim();
            if (!text) return;

            // Push to history and reset index
            this.history.push(text);
            this.historyIndex = this.history.length;

            // Clear input
            this.inputEl.value = '';

            // Emit command event
            EventBus.emit('command-submitted', text);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (this.history.length === 0) return;

            if (this.historyIndex > 0) {
                this.historyIndex--;
            }
            this.inputEl.value = this.history[this.historyIndex] ?? '';
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (this.history.length === 0) return;

            if (this.historyIndex < this.history.length - 1) {
                this.historyIndex++;
                this.inputEl.value = this.history[this.historyIndex] ?? '';
            } else {
                // Past the end of history -- clear input
                this.historyIndex = this.history.length;
                this.inputEl.value = '';
            }
        }
    };

    /**
     * Display a response string in the response area.
     */
    showResponse(text: string): void {
        this.responseEl.textContent = text;
    }

    /**
     * Show the text input bar (make visible).
     */
    show(): void {
        this.wrapperEl.style.display = '';
    }

    /**
     * Hide the text input bar.
     */
    hide(): void {
        this.wrapperEl.style.display = 'none';
    }

    /**
     * Give focus to the input field.
     */
    focus(): void {
        this.inputEl.focus();
    }

    /**
     * Remove the wrapper from the DOM and clean up event listeners.
     */
    destroy(): void {
        this.inputEl.removeEventListener('keydown', this.onKeyDown);
        this.wrapperEl.remove();
    }
}
