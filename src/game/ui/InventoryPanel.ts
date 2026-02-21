/**
 * HTML-based inventory panel that displays the player's carried items.
 * Follows the same pattern as TextInputBar: an HTML overlay appended to
 * the game container, styled to match the dark theme.
 *
 * The panel can be toggled visible/hidden and updates its item list
 * when the inventory changes.
 */
export class InventoryPanel {
    private panelEl: HTMLDivElement;
    private headerEl: HTMLDivElement;
    private itemsEl: HTMLDivElement;
    private closeBtn: HTMLSpanElement;
    private visible: boolean = false;

    /**
     * Create the inventory panel and append it to the given container.
     *
     * @param container - The parent HTMLElement (typically #game-container)
     */
    constructor(container: HTMLElement) {
        // Create panel wrapper
        this.panelEl = document.createElement('div');
        this.panelEl.id = 'inventory-panel';
        Object.assign(this.panelEl.style, {
            display: 'none',
            position: 'absolute',
            bottom: '80px',
            left: '0',
            width: '100%',
            boxSizing: 'border-box',
            background: 'rgba(26, 26, 46, 0.95)',
            border: '1px solid #444',
            borderRadius: '4px',
            padding: '12px',
            zIndex: '20',
        });

        // Create close button
        this.closeBtn = document.createElement('span');
        this.closeBtn.className = 'inventory-close';
        this.closeBtn.textContent = 'X';
        Object.assign(this.closeBtn.style, {
            position: 'absolute',
            top: '8px',
            right: '12px',
            cursor: 'pointer',
            color: '#888',
            fontFamily: 'monospace',
            fontSize: '14px',
            fontWeight: 'bold',
            lineHeight: '1',
        });
        this.closeBtn.addEventListener('mouseenter', () => {
            this.closeBtn.style.color = '#fff';
        });
        this.closeBtn.addEventListener('mouseleave', () => {
            this.closeBtn.style.color = '#888';
        });
        this.closeBtn.addEventListener('click', () => this.hide());

        // Create header
        this.headerEl = document.createElement('div');
        this.headerEl.id = 'inventory-header';
        this.headerEl.textContent = 'Inventory';
        Object.assign(this.headerEl.style, {
            color: '#c8c8d4',
            fontFamily: 'monospace',
            fontSize: '14px',
            fontWeight: 'bold',
            marginBottom: '8px',
        });

        // Create items container
        this.itemsEl = document.createElement('div');
        this.itemsEl.id = 'inventory-items';
        Object.assign(this.itemsEl.style, {
            display: 'flex',
            flexWrap: 'wrap',
            gap: '8px',
        });

        // Assemble DOM
        this.panelEl.appendChild(this.closeBtn);
        this.panelEl.appendChild(this.headerEl);
        this.panelEl.appendChild(this.itemsEl);
        container.appendChild(this.panelEl);

        // Show empty state initially
        this.showEmptyState();
    }

    /**
     * Update the displayed inventory items.
     * Clears current items and rebuilds the list.
     *
     * @param items - Array of item objects with id and display name
     */
    update(items: Array<{ id: string; name: string }>): void {
        this.itemsEl.innerHTML = '';

        if (items.length === 0) {
            this.showEmptyState();
            return;
        }

        for (const item of items) {
            const itemEl = document.createElement('div');
            itemEl.className = 'inventory-item';
            itemEl.textContent = item.name;
            itemEl.dataset.itemId = item.id;
            Object.assign(itemEl.style, {
                background: '#2a2a3e',
                border: '1px solid #555',
                borderRadius: '3px',
                padding: '6px 10px',
                color: '#c8c8d4',
                fontFamily: 'monospace',
                fontSize: '12px',
                cursor: 'pointer',
            });
            this.itemsEl.appendChild(itemEl);
        }
    }

    /**
     * Toggle the panel visibility.
     */
    toggle(): void {
        if (this.visible) {
            this.hide();
        } else {
            this.show();
        }
    }

    /**
     * Show the inventory panel.
     */
    show(): void {
        this.visible = true;
        this.panelEl.style.display = 'block';
    }

    /**
     * Hide the inventory panel.
     */
    hide(): void {
        this.visible = false;
        this.panelEl.style.display = 'none';
    }

    /**
     * Check whether the panel is currently visible.
     */
    isVisible(): boolean {
        return this.visible;
    }

    /**
     * Remove the panel from the DOM.
     */
    destroy(): void {
        this.panelEl.remove();
    }

    /**
     * Display the empty state message when no items are in inventory.
     */
    private showEmptyState(): void {
        this.itemsEl.innerHTML = '';
        const emptyEl = document.createElement('div');
        emptyEl.textContent = 'Your pockets are empty. How tragic.';
        Object.assign(emptyEl.style, {
            color: '#888',
            fontFamily: 'monospace',
            fontSize: '12px',
            fontStyle: 'italic',
        });
        this.itemsEl.appendChild(emptyEl);
    }
}
