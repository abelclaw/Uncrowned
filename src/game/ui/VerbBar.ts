import EventBus from '../EventBus';

/**
 * Quick-tap verb buttons for mobile players.
 * Renders below the game canvas, hidden on desktop and visible on mobile.
 * Emits 'command-submitted' events via EventBus when a verb button is tapped,
 * identical to how TextInputBar emits typed commands.
 */

const VERBS = [
    { label: 'Look', command: 'look' },
    { label: 'Take', command: 'take' },
    { label: 'Use', command: 'use' },
    { label: 'Go', command: 'go' },
    { label: 'Talk', command: 'talk' },
    { label: 'Inventory', command: 'inventory' },
] as const;

export class VerbBar {
    private wrapperEl: HTMLDivElement;

    /**
     * Create the verb bar and append it to the given container element.
     *
     * @param container - The parent HTMLElement (typically #game-container)
     */
    constructor(container: HTMLElement) {
        this.wrapperEl = document.createElement('div');
        this.wrapperEl.id = 'verb-bar';

        for (const verb of VERBS) {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'verb-btn';
            btn.textContent = verb.label;
            btn.addEventListener('click', () => {
                EventBus.emit('command-submitted', verb.command);
            });
            this.wrapperEl.appendChild(btn);
        }

        container.appendChild(this.wrapperEl);
    }

    /** Show the verb bar (make visible). */
    show(): void {
        this.wrapperEl.style.display = 'flex';
    }

    /** Hide the verb bar. */
    hide(): void {
        this.wrapperEl.style.display = 'none';
    }

    /** Remove the verb bar from the DOM. */
    destroy(): void {
        this.wrapperEl.remove();
    }
}
