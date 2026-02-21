/**
 * Prevents the mobile virtual keyboard from squishing the game canvas.
 * Uses the Visual Viewport API to detect keyboard open/close events and
 * locks the #app element height so Phaser's ScaleManager never sees the
 * parent shrink. Also prevents pinch-to-zoom on iOS Safari where the
 * viewport meta tag's user-scalable=no is ignored.
 */
export class MobileKeyboardManager {
    private appEl: HTMLElement;
    private lockedHeight: number | null = null;

    // Gesture/touch listener references for cleanup
    private gestureStartHandler: (e: Event) => void;
    private gestureChangeHandler: (e: Event) => void;
    private gestureEndHandler: (e: Event) => void;
    private touchMoveHandler: (e: TouchEvent) => void;
    private viewportResizeHandler: (() => void) | null = null;

    constructor(appEl: HTMLElement) {
        this.appEl = appEl;

        // Set up visualViewport resize listener to detect keyboard open/close
        if (window.visualViewport) {
            this.viewportResizeHandler = this.onVisualViewportResize;
            window.visualViewport.addEventListener('resize', this.viewportResizeHandler);
        }

        // Set up pinch-zoom prevention for iOS Safari
        this.gestureStartHandler = (e: Event) => e.preventDefault();
        this.gestureChangeHandler = (e: Event) => e.preventDefault();
        this.gestureEndHandler = (e: Event) => e.preventDefault();
        this.touchMoveHandler = (e: TouchEvent) => {
            if (e.touches.length > 1) e.preventDefault();
        };

        this.preventPinchZoom();
    }

    /**
     * Detect keyboard open/close via visualViewport height changes.
     * When the keyboard opens, lock #app height to the full window height
     * so Phaser's ScaleManager doesn't resize the canvas.
     */
    private onVisualViewportResize = (): void => {
        const vv = window.visualViewport;
        if (!vv) return;

        // Mobile keyboards typically consume 40%+ of screen height
        const keyboardOpen = vv.height < window.innerHeight * 0.75;

        if (keyboardOpen && this.lockedHeight === null) {
            // Keyboard just opened -- lock to FULL height (not reduced height)
            this.lockedHeight = window.innerHeight;
            this.appEl.style.height = `${this.lockedHeight}px`;
            this.appEl.style.overflow = 'hidden';
        } else if (!keyboardOpen && this.lockedHeight !== null) {
            // Keyboard just closed -- restore to CSS dvh
            this.lockedHeight = null;
            this.appEl.style.height = '';
            this.appEl.style.overflow = '';
        }
    };

    /**
     * Prevent pinch-to-zoom on iOS Safari.
     * iOS 10+ ignores user-scalable=no in the viewport meta tag,
     * so we must intercept gesture and multi-touch events directly.
     */
    private preventPinchZoom(): void {
        document.addEventListener('gesturestart', this.gestureStartHandler, { passive: false });
        document.addEventListener('gesturechange', this.gestureChangeHandler, { passive: false });
        document.addEventListener('gestureend', this.gestureEndHandler, { passive: false });
        document.addEventListener('touchmove', this.touchMoveHandler, { passive: false });
    }

    /**
     * Remove all event listeners. Call when the game is fully torn down.
     */
    destroy(): void {
        if (this.viewportResizeHandler && window.visualViewport) {
            window.visualViewport.removeEventListener('resize', this.viewportResizeHandler);
        }
        document.removeEventListener('gesturestart', this.gestureStartHandler);
        document.removeEventListener('gesturechange', this.gestureChangeHandler);
        document.removeEventListener('gestureend', this.gestureEndHandler);
        document.removeEventListener('touchmove', this.touchMoveHandler);
    }
}

/**
 * Detect whether the current device is a mobile/touch device.
 * Uses user-agent sniffing + pointer media query for reliable detection.
 */
export function isMobile(): boolean {
    return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
        || window.matchMedia('(pointer: coarse)').matches;
}
