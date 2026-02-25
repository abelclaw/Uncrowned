# Phase 13: Mobile Responsive - Research

**Researched:** 2026-02-21
**Domain:** Mobile browser layout, Phaser 3 ScaleManager, iOS Safari virtual keyboard, touch input, HTML overlay UI
**Confidence:** HIGH (core stack verified via official docs + community), MEDIUM (iOS keyboard behavior -- real-device verification required)

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| MOBI-01 | Game canvas scales correctly on mobile viewports (portrait and landscape) | Phaser 3 `Scale.FIT` already configured; CSS parent fix + viewport meta update needed |
| MOBI-02 | Quick verb buttons (Look, Take, Use, Go, Talk, Inventory) appear on mobile for tap-based interaction | New HTML UI component below canvas; `VerbBar` class pattern; media query shows/hides it |
| MOBI-03 | Text input triggers native mobile keyboard and game layout adjusts without canvas squishing | `visualViewport` resize listener locks canvas height; `position:absolute` layout below canvas |
| MOBI-04 | Touch-to-move works for player navigation (tap location = walk target) | Phaser `pointerdown` already wired in `RoomScene`; needs no new Phaser code; canvas `touch-action:none` required |
| MOBI-05 | Input font size is 16px+ on mobile to prevent iOS auto-zoom | `@media (max-width: 768px)` rule sets `font-size: 16px` on `#parser-input` |
| MOBI-06 | Viewport meta tag includes maximum-scale=1.0, user-scalable=no, viewport-fit=cover | Replace current `<meta name="viewport">` in `index.html` |
</phase_requirements>

---

## Summary

Phase 13 is a CSS/HTML layout phase with one JavaScript touch-prevention hook. The Phaser canvas itself already scales correctly via `Scale.FIT` mode -- the game config is already correct. The core problems are all outside the canvas:

1. The `#app` container uses `100vh` which breaks on iOS Safari when the browser chrome collapses and when the virtual keyboard appears. The fix is `100dvh` for modern browsers plus a `visualViewport` resize listener as a fallback.
2. Mobile users have no verb input mechanism. The text parser input bar must be supplemented with a `VerbBar` HTML component (6 buttons: Look, Take, Use, Go, Talk, Inventory) that is visible only on narrow viewports and emits the same `command-submitted` EventBus events.
3. The virtual keyboard on mobile squishes the page, which causes Phaser's ScaleManager to detect a smaller parent and re-scale the canvas downward. The fix is to freeze the canvas container height before focus on the input, and restore it on blur -- using the `visualViewport.height` value at that moment.
4. iOS Safari ignores `user-scalable=no` since iOS 10 (it re-enabled pinch-to-zoom as an accessibility feature). To prevent accidental zoom on the canvas, use `touch-action: none` on the canvas element plus JavaScript prevention of `gesturestart` events.
5. The current `font-size: 14px` on `#parser-input` triggers iOS Safari's auto-zoom. A media query to 16px on mobile prevents this.

**Primary recommendation:** This phase is 80% CSS/HTML work in `style.css` and `index.html`, 10% a new `VerbBar.ts` UI class, and 10% a `MobileKeyboardManager.ts` utility to handle the visualViewport resize problem.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Phaser 3 ScaleManager | 3.90.0 (existing) | Canvas FIT scaling | Already integrated; no changes needed to Phaser config |
| `window.visualViewport` API | Browser built-in | Detecting keyboard open/close on iOS | Only reliable cross-browser way to get true visible height |
| CSS `dvh` unit | Modern browsers | Dynamic viewport height accounting for browser chrome | Resolves iOS 100vh bug cleanly |
| CSS `env(safe-area-inset-*)` | iOS 11+ / Modern | Notch/home-indicator padding | Required with `viewport-fit=cover` |
| CSS `touch-action: none` | All modern browsers | Prevent browser scroll/zoom on canvas element | Required for Phaser pointer events to work correctly |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| CSS `@media (max-width: 768px)` | CSS3 | Show/hide verb bar, adjust font sizes | All mobile-specific overrides |
| CSS `@media (orientation: portrait)` | CSS3 | Portrait-specific layout adjustments | When landscape and portrait need different layouts |
| `gesturestart` event listener | Browser built-in | Prevent iOS pinch-to-zoom | Required because `user-scalable=no` is ignored on iOS 10+ |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `dvh` unit | `window.innerHeight` JavaScript | JS approach is more complex; `dvh` is cleaner but needs a fallback for older browsers |
| `visualViewport` listener | CSS `interactive-widget=resizes-content` | `interactive-widget` is Chrome/Firefox only; Safari does NOT support it as of early 2026 |
| HTML VerbBar overlay | Phaser canvas UI buttons | HTML overlay is simpler to style, doesn't need coordinate transforms, and works with the existing event system |
| CSS-only zoom prevention | Full JS touch handler | `touch-action: none` alone doesn't prevent gesturestart zoom; need both |

**Installation:** No new npm packages required. All tools are built-in browser APIs and CSS.

---

## Architecture Patterns

### Recommended Project Structure Changes
```
src/game/
├── ui/
│   ├── TextInputBar.ts       # existing -- add mobile attribute (font-size enforcement)
│   ├── InventoryPanel.ts     # existing -- no changes needed
│   └── VerbBar.ts            # NEW: quick verb buttons for mobile
├── systems/
│   └── MobileKeyboardManager.ts  # NEW: visualViewport listener, keyboard open/close
public/
└── style.css                 # MODIFY: dvh, media queries, touch-action, safe-area
index.html                    # MODIFY: viewport meta tag
```

### Pattern 1: VerbBar HTML Component
**What:** An HTML `<div>` with 6 `<button>` elements that emits `command-submitted` EventBus events identical to typing commands. Hidden by default on desktop; shown on mobile via media query.
**When to use:** Mobile-only (CSS `display: none` on desktop, `display: flex` on mobile via media query).

```typescript
// Source: Pattern follows TextInputBar.ts in this codebase
import EventBus from '../EventBus';

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

    constructor(container: HTMLElement) {
        this.wrapperEl = document.createElement('div');
        this.wrapperEl.id = 'verb-bar';

        for (const verb of VERBS) {
            const btn = document.createElement('button');
            btn.className = 'verb-btn';
            btn.textContent = verb.label;
            btn.setAttribute('type', 'button');
            btn.addEventListener('click', () => {
                EventBus.emit('command-submitted', verb.command);
            });
            this.wrapperEl.appendChild(btn);
        }

        container.appendChild(this.wrapperEl);
    }

    show(): void { this.wrapperEl.style.display = 'flex'; }
    hide(): void { this.wrapperEl.style.display = 'none'; }
    destroy(): void { this.wrapperEl.remove(); }
}
```

### Pattern 2: MobileKeyboardManager (visualViewport)
**What:** A utility class that listens for `window.visualViewport.resize` events. When the keyboard opens, it records the visible height and locks the `#app` container to that height so Phaser's ScaleManager doesn't see a shrinking parent.
**When to use:** Mount once at app init in `main.ts`. The class is a no-op on desktop (no `visualViewport` resize events fired).

```typescript
// Source: Based on MDN VisualViewport API + Phaser community pattern
// https://phaser.discourse.group/t/scalemanager-ignore-virtual-keyboard/1361
export class MobileKeyboardManager {
    private appEl: HTMLElement;
    private lockedHeight: number | null = null;

    constructor(appEl: HTMLElement) {
        this.appEl = appEl;
        if (!window.visualViewport) return;

        window.visualViewport.addEventListener('resize', this.onVisualViewportResize);
    }

    private onVisualViewportResize = (): void => {
        const vv = window.visualViewport!;
        // If visual viewport height < window inner height, keyboard is likely open
        const keyboardOpen = vv.height < window.innerHeight * 0.8;

        if (keyboardOpen && this.lockedHeight === null) {
            // Lock the app container to the current visual viewport height
            this.lockedHeight = vv.height;
            this.appEl.style.height = `${this.lockedHeight}px`;
            this.appEl.style.overflow = 'hidden';
        } else if (!keyboardOpen && this.lockedHeight !== null) {
            // Restore dynamic height
            this.lockedHeight = null;
            this.appEl.style.height = '';
            this.appEl.style.overflow = '';
        }
    };

    destroy(): void {
        if (window.visualViewport) {
            window.visualViewport.removeEventListener('resize', this.onVisualViewportResize);
        }
    }
}
```

### Pattern 3: CSS Mobile Layout
**What:** Media queries + new CSS rules added to `style.css`.
**When to use:** Applied globally via stylesheet; no JavaScript needed for layout behavior.

```css
/* Source: Based on MDN, CSS-Tricks, and web.dev viewport units docs */

/* Fix: Use dvh (dynamic viewport height) to account for mobile browser chrome */
#app {
    height: 100vh;          /* fallback for older browsers */
    height: 100dvh;         /* modern: shrinks/grows with browser chrome */
}

/* Safe area padding for notched iPhones (required when viewport-fit=cover) */
#game-container {
    padding-bottom: env(safe-area-inset-bottom, 0px);
}

/* Prevent browser pinch-zoom and scroll on canvas */
#game-container canvas {
    touch-action: none;
}

/* Mobile font size fix: prevents iOS auto-zoom on input focus */
@media (max-width: 768px) {
    #parser-input {
        font-size: 16px;    /* iOS zooms if < 16px */
    }

    #parser-response {
        font-size: 14px;
    }
}

/* Verb bar: hidden on desktop, visible on mobile */
#verb-bar {
    display: none;
    width: 100%;
    max-width: 960px;
    flex-direction: row;
    flex-wrap: nowrap;
    background: #1a1a2e;
    border-top: 1px solid #16213e;
    box-sizing: border-box;
    padding-bottom: env(safe-area-inset-bottom, 0px);
}

@media (max-width: 768px) {
    #verb-bar {
        display: flex;
    }
}

.verb-btn {
    flex: 1;
    min-height: 44px;       /* WCAG touch target minimum */
    background: #2a2a3e;
    border: none;
    border-right: 1px solid #16213e;
    color: #c8c8d4;
    font-family: 'Courier New', Courier, monospace;
    font-size: 12px;
    cursor: pointer;
    padding: 8px 4px;
    touch-action: manipulation; /* Prevents double-tap zoom on buttons */
    -webkit-tap-highlight-color: transparent;
}

.verb-btn:last-child {
    border-right: none;
}

.verb-btn:active {
    background: #3a3a5e;
}
```

### Pattern 4: Viewport Meta Tag
**What:** Replace the existing viewport meta tag in `index.html`.
**When to use:** One-time change; affects all mobile browsers.

```html
<!-- Replaces: <meta name="viewport" content="width=device-width, initial-scale=1.0" /> -->
<!-- Source: MOBI-06 requirement; viewport-fit=cover for notch handling -->
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
```

**IMPORTANT CAVEAT:** `user-scalable=no` is ignored by iOS Safari since iOS 10 (it's treated as an accessibility override). The viewport tag alone will NOT prevent pinch-to-zoom. Requires the JavaScript `gesturestart` prevention in `MobileKeyboardManager` or a separate init block.

### Pattern 5: Pinch-to-Zoom Prevention (JavaScript)
**What:** Event listeners to block pinch zoom since iOS ignores the viewport meta tag.

```typescript
// Source: MDN touch events + iOS Safari behavior research
// Mount once in main.ts after game init
function preventIosPinchZoom(): void {
    document.addEventListener('gesturestart', (e) => e.preventDefault(), { passive: false });
    document.addEventListener('gesturechange', (e) => e.preventDefault(), { passive: false });
    document.addEventListener('gestureend', (e) => e.preventDefault(), { passive: false });

    // For older iOS that uses touchstart events for pinch detection
    document.addEventListener('touchmove', (e) => {
        if (e.touches.length > 1) e.preventDefault();
    }, { passive: false });
}
```

### Anti-Patterns to Avoid
- **Using `interactive-widget=resizes-content` as primary keyboard fix:** Safari does not support it as of early 2026. Chrome and Firefox only.
- **Using `height: 100vh` without fallback:** On iOS Safari, `100vh` includes the browser chrome height (before chrome collapses), causing content overflow or canvas over-sizing.
- **Relying on Phaser resize event for keyboard detection:** Phaser's `scale.on('resize')` fires when the canvas parent changes size, but this happens AFTER the keyboard has already squished the layout. You need to lock the height BEFORE or AT the moment of resize, not after.
- **Auto-focusing the text input on mobile:** On mobile, calling `this.inputEl.focus()` in `textInputBar.focus()` after scene transition will immediately open the keyboard. The `textInputBar.focus()` calls in `RoomScene` at end of transitions need to be gated with a mobile check.
- **Setting `touch-action: none` on `body`:** This breaks scrolling if any other part of the page needs to scroll. Apply only to `canvas` and the verb buttons.
- **Overlapping touch areas:** The canvas already handles `pointerdown` in Phaser. The VerbBar buttons must sit below the canvas in DOM order, not on top of it, to prevent touch event conflicts.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Canvas scaling on mobile | Custom canvas resize logic | Phaser 3 `Scale.FIT` (already configured) | Phaser handles letterboxing, centering, and device pixel ratio |
| Touch coordinate mapping | Manual pageX/pageY transform | Phaser's built-in pointer system | Phaser's `InputManager` already handles canvas offset and scale transforms |
| Verb recognition after verb button tap | Custom command parser for button events | EventBus `command-submitted` event (existing) | VerbBar emits the same event as keyboard input; parser reuses existing logic |
| Orientation lock | Custom orientation detection | `scene.scale.isPortrait` + CSS `@media (orientation)` | Phaser has built-in orientation detection; CSS handles layout |

**Key insight:** The Phaser canvas and click-to-move pipeline are already mobile-compatible. Touch events fire `pointerdown` in Phaser, camera coordinate transforms are automatic, and `Scale.FIT` handles letterboxing. All work is CSS + one new HTML component + one keyboard manager utility.

---

## Common Pitfalls

### Pitfall 1: iOS 100vh Bug
**What goes wrong:** `height: 100vh` on `#app` includes the space behind the collapsing browser address bar on iOS Safari. This means on load the canvas is too small, and when the user scrolls and the bar collapses, layout jumps.
**Why it happens:** iOS Safari defines `100vh` as the total screen height including the collapsible browser chrome, not the initial visible area.
**How to avoid:** Use `height: 100dvh` (dynamic viewport height) with `height: 100vh` as a fallback for older browsers. `dvh` updates in real-time as chrome collapses.
**Warning signs:** Canvas appears smaller than screen on iOS; layout jumps when user scrolls.

### Pitfall 2: Virtual Keyboard Squishing the Canvas
**What goes wrong:** When the user taps `#parser-input`, the mobile keyboard opens. This shrinks the visual viewport. Phaser's ScaleManager sees the parent `#game-container` shrink and re-scales the canvas to be smaller.
**Why it happens:** Phaser listens to parent size changes and rescales the canvas to fit. This is the correct desktop behavior but wrong for mobile keyboard.
**How to avoid:** Use `MobileKeyboardManager` (Pattern 2 above) to lock `#app` height when keyboard opens. Prevents ScaleManager from seeing a size change.
**Warning signs:** Canvas visibly shrinks when text input is tapped on mobile.

### Pitfall 3: iOS Input Auto-Zoom
**What goes wrong:** Tapping `#parser-input` causes iOS Safari to zoom the entire viewport to make the input readable, because the current `font-size: 14px` is below the 16px threshold.
**Why it happens:** iOS Safari zooms automatically when any text input's rendered font size is below 16px CSS pixels. This is a feature, not a bug.
**How to avoid:** Set `font-size: 16px` on `#parser-input` via a media query (`@media (max-width: 768px)`). The desktop can keep 14px.
**Warning signs:** Page zooms in when user taps the text input on iPhone.

### Pitfall 4: Pinch-to-Zoom Not Blocked by Meta Tag
**What goes wrong:** Despite setting `user-scalable=no, maximum-scale=1.0` in the viewport meta tag, iOS users can still pinch-to-zoom the game, which scales the entire page.
**Why it happens:** iOS 10+ intentionally ignores `user-scalable=no` as an accessibility measure. The meta tag value is stored but not enforced.
**How to avoid:** Add JavaScript `gesturestart` + `gesturechange` + `gestureend` event listeners with `{ passive: false }` and call `preventDefault()`. Additionally handle `touchmove` with multiple touches.
**Warning signs:** Users can zoom the page on iOS despite the viewport meta tag.

### Pitfall 5: Focus Stealing the Keyboard on Scene Transition
**What goes wrong:** `textInputBar.focus()` is called at the end of every scene transition in `RoomScene`. On mobile, this immediately triggers the keyboard to open, which is jarring (especially on first load).
**Why it happens:** `HTMLInputElement.focus()` on mobile is treated as a user-initiated focus and opens the keyboard.
**How to avoid:** Gate the `focus()` call with an `isMobile()` helper. On mobile, skip auto-focus so the keyboard only opens when the user taps the input or a verb button.
**Warning signs:** Keyboard opens immediately on mobile when entering a room.

### Pitfall 6: Verb Buttons Too Small on Small Phones
**What goes wrong:** 6 verb buttons in a row on a 375px-wide iPhone SE become ~62px wide each. Fitting readable text and hitting the 44px height minimum is tight.
**Why it happens:** `flex: 1` divides available width equally among all 6 buttons. On narrow phones, button labels get truncated or overlap.
**How to avoid:** Use `font-size: 11px` for verb buttons, allow `overflow: hidden; text-overflow: ellipsis` on labels, ensure `min-height: 44px`. On portrait orientation, optionally wrap to two rows (3+3) with a media query for very narrow screens.
**Warning signs:** Labels visually truncated; buttons feel too small to tap accurately.

### Pitfall 7: Canvas `pointerdown` and VerbBar button `click` Conflict
**What goes wrong:** If the VerbBar is rendered overlapping the canvas (via `position: absolute` or z-index conflict), Phaser may receive the touch as a canvas click in addition to the button firing.
**Why it happens:** Touch events can propagate to the canvas if DOM structure and z-index are not set correctly.
**How to avoid:** VerbBar must be appended AFTER the canvas in the `#game-container` DOM (it follows TextInputBar), not positioned over the canvas. Keep `position: relative` layout flow so buttons are physically below the canvas, not on top of it.
**Warning signs:** Clicking a verb button also causes the player to walk to a canvas location.

---

## Code Examples

Verified patterns from official sources and this codebase:

### Phaser 3 Pointer Coordinates (already working for touch)
```typescript
// Source: Phaser 3 Input docs + existing RoomScene.ts line 322-325
// Phaser's pointerdown event works identically for mouse clicks and touch taps.
// The camera.getWorldPoint() transform is canvas-scale-aware automatically.
this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
    const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    // pointer.x/y are already in canvas-local coordinates after Phaser's transform
    // No additional coordinate transform needed for touch vs mouse
});
```

### Orientation Change Handling
```typescript
// Source: Phaser 3 ScaleManager docs
// https://docs.phaser.io/phaser/concepts/scale-manager
this.scale.on('orientationchange', (orientation: string) => {
    if (orientation === Phaser.Scale.LANDSCAPE) {
        // Landscape: game has full width, less height
        // VerbBar may be unnecessary -- user has keyboard access more easily
    } else {
        // Portrait: game is narrower, VerbBar is essential
    }
});
```

### visualViewport Keyboard Detection
```typescript
// Source: MDN VisualViewport API
// https://developer.mozilla.org/en-US/docs/Web/API/VisualViewport
if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', () => {
        const vv = window.visualViewport!;
        // vv.height reflects the visible area excluding the keyboard
        // window.innerHeight remains the full height
        const keyboardHeight = window.innerHeight - vv.height;
        const keyboardOpen = keyboardHeight > 100; // threshold
    });
}
```

### CSS: Viewport Meta Tag (index.html)
```html
<!-- Source: MOBI-06 requirement; MDN viewport meta tag docs -->
<meta name="viewport"
      content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
```

### CSS: dvh + safe-area (style.css)
```css
/* Source: web.dev viewport units guide, webkit.org notch guide */
#app {
    height: 100vh;
    height: 100dvh; /* overrides above in supporting browsers */
    padding-top: env(safe-area-inset-top, 0px);
    padding-bottom: env(safe-area-inset-bottom, 0px);
}
```

### isMobile() Helper
```typescript
// Source: Standard browser feature detection pattern
export function isMobile(): boolean {
    return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
        || window.matchMedia('(pointer: coarse)').matches;
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `height: 100vh` | `height: 100dvh` with vh fallback | CSS spec 2022, Chrome 108 / Safari 15.4 / Firefox 101 | Eliminates mobile browser chrome overlap bug |
| `user-scalable=no` in meta (sufficient) | Meta tag + JS `gesturestart` prevention | iOS 10 (2016) | Meta tag alone no longer prevents pinch zoom on iOS |
| Listening to `window.resize` for keyboard | `window.visualViewport.resize` | ~2020 (wide support) | `window.resize` does not fire when iOS keyboard opens; visualViewport does |
| `touch-action: none` not set | `touch-action: none` on canvas | Best practice established ~2018 | Required to let Phaser receive all touch events without browser interference |
| `interactive-widget=resizes-content` (proposed) | Not usable yet for this game | Chrome 108+ / Firefox 132+ -- Safari NOT supported | Cannot use as primary solution; `visualViewport` approach is cross-browser |

**Deprecated/outdated:**
- `event.scale` detection on touch events: WebKit-only, not cross-browser
- `document.body.webkitRequestFullscreen()` for fullscreen: Requires user gesture; complicates mobile flow unnecessarily for this game

---

## Open Questions

1. **iOS Safari keyboard behavior on real device**
   - What we know: `visualViewport.resize` is the correct event; keyboard open threshold at ~80% of `window.innerHeight` is a heuristic
   - What's unclear: Whether iOS 26 Safari (mentioned in one forum post) has changed behavior; exact threshold value may vary by device
   - Recommendation: The `MobileKeyboardManager` implementation should be tested on actual iPhone hardware. Use 150px as the keyboard-open threshold (most keyboards are 250px+).

2. **Portrait-only vs. both orientations for verb bar**
   - What we know: Both orientations are required (MOBI-01). Landscape on phone gives more horizontal space; verb bar may take too much vertical space.
   - What's unclear: Whether to hide the verb bar in landscape and rely on keyboard only, or keep it in both orientations in a slimmer format.
   - Recommendation: Show verb bar in both orientations; landscape buttons are wider but shorter (min-height: 36px may suffice in landscape).

3. **Touch-to-move conflict with verb button taps**
   - What we know: Phaser `pointerdown` on canvas fires for touch. VerbBar buttons fire `click` events. DOM structure should prevent overlap.
   - What's unclear: Whether any existing Phaser input event listener on `this.input` (scene-level) would receive touch events from VerbBar buttons if they're in the same container.
   - Recommendation: Verify VerbBar buttons call `e.stopPropagation()` in click handler if Phaser input conflict is observed during testing.

---

## Sources

### Primary (HIGH confidence)
- Phaser 3 ScaleManager official docs - https://docs.phaser.io/phaser/concepts/scale-manager
- Phaser 3 ScaleManager API - https://docs.phaser.io/api-documentation/class/scale-scalemanager
- Phaser 3 Input concepts - https://docs.phaser.io/phaser/concepts/input
- MDN VisualViewport API - https://developer.mozilla.org/en-US/docs/Web/API/VisualViewport
- MDN viewport meta tag - https://developer.mozilla.org/en-US/docs/Web/HTML/Viewport_meta_tag
- MDN touch-action CSS - https://developer.mozilla.org/en-US/docs/Web/CSS/touch-action
- web.dev viewport units (dvh/svh/lvh) - https://web.dev/blog/viewport-units
- webkit.org notch/safe-area design guide - https://webkit.org/blog/7929/designing-websites-for-iphone-x/
- CSS-Tricks 16px input zoom prevention - https://css-tricks.com/16px-or-larger-text-prevents-ios-form-zoom/

### Secondary (MEDIUM confidence)
- Phaser community: ScaleManager keyboard resize issue - https://phaser.discourse.group/t/scalemanager-ignore-virtual-keyboard/1361
- Rex Rainbow Phaser3 notes (ScaleManager) - https://rexrainbow.github.io/phaser3-rex-notes/docs/site/scalemanager/
- HTMHell: `interactive-widget` viewport control (2024) - https://www.htmhell.dev/adventcalendar/2024/4/
- Martijn Hols: iOS Safari keyboard height article - https://martijnhols.nl/blog/how-to-get-document-height-ios-safari-osk
- Defensive CSS: input zoom on iOS Safari - https://defensivecss.dev/tip/input-zoom-safari/
- Smashing Magazine: accessible tap target sizes - https://www.smashingmagazine.com/2023/04/accessible-tap-target-sizes-rage-taps-clicks/

### Tertiary (LOW confidence -- verify on device)
- iOS 26 Safari VisualViewport behavior thread (Apple Developer Forums) - https://developer.apple.com/forums/thread/800125
- Various WebKit bug reports on `user-scalable=no` behavior

---

## Metadata

**Confidence breakdown:**
- Standard stack (Phaser FIT, CSS dvh, visualViewport): HIGH -- verified via official docs
- Architecture patterns (VerbBar, MobileKeyboardManager): HIGH -- pattern follows existing codebase conventions
- iOS Safari keyboard behavior: MEDIUM -- documented behavior but real-device testing required for edge cases
- Pinch-zoom prevention: MEDIUM -- gesturestart approach verified via WebSearch, but iOS behavior changes between major versions
- Touch-to-move (existing Phaser pointerdown): HIGH -- already implemented and working; no changes needed

**Research date:** 2026-02-21
**Valid until:** 2026-08-21 (stable domain; iOS Safari behavior is the fastest-moving component)
