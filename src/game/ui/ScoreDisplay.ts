/**
 * Compact score badge displayed in the top-right corner during gameplay.
 * Shows "current / max" score, styled to match the mute/inventory buttons.
 */
export class ScoreDisplay {
    private el: HTMLDivElement;
    private currentEl: HTMLSpanElement;
    private maxEl: HTMLSpanElement;

    constructor(container: HTMLElement) {
        this.el = document.createElement('div');
        this.el.id = 'score-display';
        Object.assign(this.el.style, {
            position: 'absolute',
            top: '8px',
            right: '8px',
            zIndex: '30',
            background: 'rgba(15, 15, 35, 0.7)',
            border: '1px solid #4a4a6a',
            borderRadius: '4px',
            padding: '4px 10px',
            fontFamily: "'Courier New', Courier, monospace",
            fontSize: '13px',
            pointerEvents: 'none',
            userSelect: 'none',
            whiteSpace: 'nowrap',
        });

        this.currentEl = document.createElement('span');
        this.currentEl.style.color = '#c4a46c';
        this.currentEl.textContent = '0';

        this.maxEl = document.createElement('span');
        this.maxEl.style.color = '#888';
        this.maxEl.textContent = ' / 0';

        this.el.appendChild(this.currentEl);
        this.el.appendChild(this.maxEl);
        container.appendChild(this.el);
    }

    update(current: number, max: number): void {
        this.currentEl.textContent = String(current);
        this.maxEl.textContent = ` / ${max}`;
    }

    show(): void {
        this.el.style.display = '';
    }

    hide(): void {
        this.el.style.display = 'none';
    }

    destroy(): void {
        this.el.remove();
    }
}
